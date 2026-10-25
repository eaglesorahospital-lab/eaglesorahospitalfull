"""
Management command to idempotently import hospital profile, departments,
specialties, doctors, and schedules from a validated JSON configuration file.

Ensures strict validation before modifying database records:
- Validates field types, required fields, and time constraints (end_time > start_time).
- Validates relational foreign keys (doctor -> department, doctor -> specialty).
- Rejects placeholder text in production unless --allow-placeholders is explicitly passed.
- Idempotent: repeated runs safely update existing records without creating duplicates.
- Never touches existing patient profiles, users, or appointments.
"""

import json
import os
import re
from datetime import time, datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.hospital.models import HospitalProfile, HospitalFacility, HospitalAnnouncement, HospitalFAQ
from apps.departments.models import Department, DepartmentService, DepartmentFAQ
from apps.doctors.models import Specialty, Doctor
from apps.scheduling.models import DoctorSchedule, ScheduleBreak


PLACEHOLDER_PATTERNS = [
    r'\[REPLACE',
    r'TODO',
    r'EXAMPLE\.COM',
    r'0000[\s\-]?0000',
    r'YOUR[\s_]HOSPITAL',
]


STANDARD_SPECIALTIES = [
    {
        "name": "Cardiology",
        "slug": "cardiology",
        "description": "Comprehensive diagnostic, preventive, and interventional cardiovascular medicine.",
    },
    {
        "name": "Clinical Oncology",
        "slug": "oncology",
        "description": "Medical oncology, chemotherapy administration, and precision targeted cancer therapies.",
    },
    {
        "name": "Dermatology",
        "slug": "dermatology",
        "description": "Clinical and procedural dermatological care for skin, hair, and nail conditions.",
    },
    {
        "name": "Emergency Medicine",
        "slug": "emergency-medicine",
        "description": "24/7 acute trauma resuscitation, triage protocols, and emergency medical response.",
    },
    {
        "name": "Endocrinology & Diabetology",
        "slug": "endocrinology",
        "description": "Specialized management of diabetes, metabolic health, thyroid, and hormonal disorders.",
    },
    {
        "name": "Gastroenterology & Hepatology",
        "slug": "gastroenterology",
        "description": "Digestive tract health, diagnostic and therapeutic endoscopy, and clinical hepatology.",
    },
    {
        "name": "General & Laparoscopic Surgery",
        "slug": "general-surgery",
        "description": "Elective, emergency, and minimally invasive laparoscopic abdominal surgical care.",
    },
    {
        "name": "Internal Medicine",
        "slug": "internal-medicine",
        "description": "Comprehensive diagnosis, multisystem disease management, and adult outpatient medicine.",
    },
    {
        "name": "Nephrology & Dialysis",
        "slug": "nephrology",
        "description": "Renal care, hemodialysis supervision, chronic kidney disease, and hypertension.",
    },
    {
        "name": "Neurology & Stroke Care",
        "slug": "neurology",
        "description": "Comprehensive stroke management, epilepsy diagnosis, and neuromuscular healthcare.",
    },
    {
        "name": "Neurosurgery",
        "slug": "neurosurgery",
        "description": "Cranial microsurgery, spine reconstruction, and neuro-trauma surgical interventions.",
    },
    {
        "name": "Obstetrics & Gynaecology",
        "slug": "obstetrics-gynaecology",
        "description": "Maternal-fetal medicine, antenatal and postpartum care, and gynaecological health.",
    },
    {
        "name": "Ophthalmology",
        "slug": "ophthalmology",
        "description": "Comprehensive vision diagnostics, cataract extraction, and medical eye management.",
    },
    {
        "name": "Orthopaedics & Joint Replacement",
        "slug": "orthopaedics",
        "description": "Joint arthroplasty, arthroscopy, spine care, and musculoskeletal trauma management.",
    },
    {
        "name": "Otolaryngology (ENT)",
        "slug": "ent",
        "description": "Medical and surgical management of ear, nose, throat, and head-and-neck disorders.",
    },
    {
        "name": "Paediatrics & Neonatology",
        "slug": "paediatrics",
        "description": "Specialized infant, child, and adolescent healthcare, newborn care, and immunisations.",
    },
    {
        "name": "Psychiatry & Behavioral Health",
        "slug": "psychiatry",
        "description": "Clinical psychiatric evaluation, psychotherapy, and evidence-based mental health care.",
    },
    {
        "name": "Pulmonology & Respiratory Medicine",
        "slug": "pulmonology",
        "description": "Diagnosis and management of asthma, COPD, interstitial lung disease, and sleep disorders.",
    },
    {
        "name": "Radiology & Diagnostic Imaging",
        "slug": "radiology",
        "description": "Multimodality cross-sectional imaging, diagnostic ultrasound, and interventional radiology.",
    },
    {
        "name": "Urology & Andrology",
        "slug": "urology",
        "description": "Surgical and medical management of urinary tract disorders, stone disease, and andrology.",
    },
]


def parse_time_str(time_str):
    """Parses HH:MM or HH:MM:SS string into a datetime.time object."""
    if isinstance(time_str, time):
        return time_str
    if not isinstance(time_str, str):
        raise ValueError(f"Invalid time format: {time_str}")
    cleaned = time_str.strip()
    for fmt in ('%H:%M:%S', '%H:%M'):
        try:
            return datetime.strptime(cleaned, fmt).time()
        except ValueError:
            pass
    raise ValueError(f"Invalid time string '{time_str}'. Expected 'HH:MM' (24-hour format).")


class Command(BaseCommand):
    help = "Idempotently imports hospital profile, departments, specialties, doctors, and schedules from a validated JSON file."

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=os.path.join('database', 'seeds', 'hospital_setup.json'),
            help='Path to the JSON file containing hospital setup data.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate file schema and foreign keys without writing any changes to the database.',
        )
        parser.add_argument(
            '--allow-placeholders',
            action='store_true',
            help='Allow import even if placeholder patterns ([REPLACE..., TODO, example.com) are detected.',
        )
        parser.add_argument(
            '--seed-specialties',
            action='store_true',
            help='Pre-populate the 20 standard medical specialties (Cardiology, Neurology, Oncology, etc.) into PostgreSQL.',
        )

    def seed_specialties(self, dry_run=False):
        """Seeds the standard 20 medical specialties into the database safely and idempotently."""
        stats = {'created': 0, 'updated': 0}
        self.stdout.write(self.style.NOTICE("\n--- Standard Medical Specialties Catalog ---"))
        for spec in STANDARD_SPECIALTIES:
            name = spec['name']
            slug = spec['slug']
            desc = spec['description']
            if dry_run:
                exists = self._safe_exists(Specialty, slug=slug)
                state = "EXISTS (will update)" if exists else ("NEW (will create)" if exists is False else "VALID (ready)")
                self.stdout.write(f"  - {name} ({slug}): {state}")
            else:
                _, created = Specialty.objects.update_or_create(
                    slug=slug,
                    defaults={'name': name, 'description': desc, 'is_active': True}
                )
                if created:
                    stats['created'] += 1
                else:
                    stats['updated'] += 1
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Standard Specialties: {stats['created']} created, {stats['updated']} updated."))
        return stats

    def handle(self, *args, **options):
        file_path = options['file']
        dry_run = options['dry_run']
        allow_placeholders = options['allow_placeholders']
        seed_specialties_flag = options.get('seed_specialties', False)

        default_file_rel = os.path.join('database', 'seeds', 'hospital_setup.json')
        is_default_file = (options.get('file') == default_file_rel)

        # Resolve relative file path from project root
        if not os.path.isabs(file_path):
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
            candidate_path = os.path.join(project_root, file_path)
            if os.path.exists(candidate_path):
                file_path = candidate_path

        file_exists = os.path.exists(file_path)

        # If user passed --seed-specialties and the default JSON file is not present, execute specialty seed and exit
        if seed_specialties_flag and not file_exists and is_default_file:
            self.stdout.write(self.style.NOTICE("\n=== EgleSora Hospital Standard Specialties Setup ==="))
            self.stdout.write(f"Execution mode: {'DRY RUN (Validation only)' if dry_run else 'LIVE SEED'}")
            self.seed_specialties(dry_run=dry_run)
            self.stdout.write(self.style.SUCCESS("\n[COMPLETED] Standard specialties setup finished."))
            return

        if not file_exists:
            raise CommandError(f"Import data file not found at: {file_path}")

        self.stdout.write(self.style.NOTICE(f"\n=== EgleSora Hospital Data Importer ==="))
        self.stdout.write(f"Source file: {file_path}")
        self.stdout.write(f"Execution mode: {'DRY RUN (Validation only)' if dry_run else 'LIVE IMPORT'}\n")

        # If seed-specialties is requested alongside a data file, run it
        if seed_specialties_flag:
            self.seed_specialties(dry_run=dry_run)

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON in {file_path}: {e}")

        # Check for placeholder markers unless explicitly allowed
        if not allow_placeholders:
            raw_text = json.dumps(data)
            found_placeholders = []
            for pattern in PLACEHOLDER_PATTERNS:
                matches = re.findall(pattern, raw_text, flags=re.IGNORECASE)
                if matches:
                    found_placeholders.extend(matches)
            if found_placeholders:
                self.stdout.write(self.style.WARNING(
                    f"SAFETY WARNING: Detected {len(found_placeholders)} placeholder token(s) (e.g. {found_placeholders[:3]}).\n"
                    "Please replace placeholders with genuine hospital details before running in production.\n"
                    "If testing with dummy data intentionally, rerun with: --allow-placeholders"
                ))
                if not dry_run:
                    raise CommandError("Aborting import due to unresolved placeholders in source data.")

        # Validation phase
        validation_errors = self.validate_data(data)
        if validation_errors:
            self.stdout.write(self.style.ERROR(f"\nValidation failed with {len(validation_errors)} error(s):"))
            for err in validation_errors:
                self.stdout.write(self.style.ERROR(f"  - {err}"))
            raise CommandError("Import aborted due to validation errors.")

        self.stdout.write(self.style.SUCCESS("[OK] Data validation passed cleanly."))

        # Process import
        if dry_run:
            self.simulate_import(data)
            self.stdout.write(self.style.SUCCESS("\n[DRY RUN COMPLETE] No database records were modified."))
            return

        with transaction.atomic():
            stats = self.execute_import(data)

        self.stdout.write(self.style.SUCCESS("\n=== Import Completed Successfully ==="))
        self.stdout.write(f"Hospital Profile : {'Updated/Created' if stats.get('profile') else 'Skipped'}")
        self.stdout.write(f"Specialties      : {stats.get('specialties_created', 0)} created, {stats.get('specialties_updated', 0)} updated")
        self.stdout.write(f"Departments      : {stats.get('departments_created', 0)} created, {stats.get('departments_updated', 0)} updated")
        self.stdout.write(f"  - Services     : {stats.get('services_created', 0)} created, {stats.get('services_updated', 0)} updated")
        self.stdout.write(f"  - FAQs         : {stats.get('faqs_created', 0)} created, {stats.get('faqs_updated', 0)} updated")
        self.stdout.write(f"Doctors          : {stats.get('doctors_created', 0)} created, {stats.get('doctors_updated', 0)} updated")
        self.stdout.write(f"Doctor Schedules : {stats.get('schedules_created', 0)} created, {stats.get('schedules_updated', 0)} updated")
        self.stdout.write(f"  - Breaks       : {stats.get('breaks_created', 0)} created, {stats.get('breaks_updated', 0)} updated")

    def validate_data(self, data):
        """Validates all records and foreign key relationships before touching the database."""
        errors = []

        if not isinstance(data, dict):
            return ["Root JSON element must be an object/dict."]

        # Validate Hospital Profile
        profile_data = data.get('hospital_profile')
        if profile_data:
            if not isinstance(profile_data, dict):
                errors.append("hospital_profile must be a dictionary object.")
            else:
                if not profile_data.get('name'):
                    errors.append("hospital_profile.name is required.")
                email = profile_data.get('contact_email')
                if email and ('@' not in email or '.' not in email):
                    errors.append(f"hospital_profile.contact_email '{email}' is not a valid email address.")

        # Pre-index defined specialties and departments to validate doctor FKs
        defined_specialties = set()
        specialties_list = data.get('specialties', [])
        if not isinstance(specialties_list, list):
            errors.append("'specialties' must be a list.")
        else:
            for idx, spec in enumerate(specialties_list):
                if not isinstance(spec, dict):
                    errors.append(f"specialties[{idx}] must be an object.")
                    continue
                name = spec.get('name')
                if not name:
                    errors.append(f"specialties[{idx}].name is required.")
                slug = spec.get('slug') or slugify(name or '')
                defined_specialties.add(slug)
                if name:
                    defined_specialties.add(name.lower())

        defined_departments = set()
        departments_list = data.get('departments', [])
        if not isinstance(departments_list, list):
            errors.append("'departments' must be a list.")
        else:
            for idx, dept in enumerate(departments_list):
                if not isinstance(dept, dict):
                    errors.append(f"departments[{idx}] must be an object.")
                    continue
                name = dept.get('name')
                if not name:
                    errors.append(f"departments[{idx}].name is required.")
                if not dept.get('specialty'):
                    errors.append(f"departments[{idx}].specialty (clinical domain text) is required.")
                if not dept.get('short_description'):
                    errors.append(f"departments[{idx}].short_description is required.")
                if not dept.get('location'):
                    errors.append(f"departments[{idx}].location is required.")

                slug = dept.get('slug') or slugify(name or '')
                defined_departments.add(slug)
                if name:
                    defined_departments.add(name.lower())

                # Validate services
                for s_idx, service in enumerate(dept.get('services', [])):
                    if not isinstance(service, dict) or not service.get('name'):
                        errors.append(f"departments[{idx}].services[{s_idx}].name is required.")

                # Validate FAQs
                for f_idx, faq in enumerate(dept.get('faqs', [])):
                    if not isinstance(faq, dict) or not faq.get('question') or not faq.get('answer'):
                        errors.append(f"departments[{idx}].faqs[{f_idx}] requires 'question' and 'answer'.")

        # Validate Doctors and nested schedules
        doctors_list = data.get('doctors', [])
        if not isinstance(doctors_list, list):
            errors.append("'doctors' must be a list.")
        else:
            valid_days = {c.value for c in DoctorSchedule.DayOfWeek}
            doctor_slugs_in_file = set()

            for idx, doc in enumerate(doctors_list):
                if not isinstance(doc, dict):
                    errors.append(f"doctors[{idx}] must be an object.")
                    continue

                name = doc.get('name')
                if not name:
                    errors.append(f"doctors[{idx}].name is required.")

                slug = doc.get('slug') or slugify(name or '')
                if slug in doctor_slugs_in_file:
                    errors.append(f"Duplicate doctor slug/name '{slug}' in doctors[{idx}].")
                doctor_slugs_in_file.add(slug)

                # Validate Department reference
                dept_ref = doc.get('department_slug') or doc.get('department')
                if not dept_ref:
                    errors.append(f"doctors[{idx}] ('{name}') requires 'department_slug' or 'department'.")
                else:
                    dept_ref_str = str(dept_ref).strip()
                    exists_in_file = (dept_ref_str in defined_departments) or (dept_ref_str.lower() in defined_departments)
                    exists_in_db = False
                    if not exists_in_file:
                        try:
                            exists_in_db = Department.objects.filter(slug=dept_ref_str).exists() or Department.objects.filter(name__iexact=dept_ref_str).exists()
                        except Exception:
                            pass
                    if not exists_in_file and not exists_in_db:
                        errors.append(f"doctors[{idx}] ('{name}') references non-existent department '{dept_ref}'.")

                # Validate Specialty reference if given
                spec_ref = doc.get('specialty_slug') or doc.get('specialty')
                if spec_ref:
                    spec_ref_str = str(spec_ref).strip()
                    spec_exists_in_file = (spec_ref_str in defined_specialties) or (spec_ref_str.lower() in defined_specialties)
                    spec_exists_in_db = False
                    if not spec_exists_in_file:
                        try:
                            spec_exists_in_db = Specialty.objects.filter(slug=spec_ref_str).exists() or Specialty.objects.filter(name__iexact=spec_ref_str).exists()
                        except Exception:
                            pass
                    if not spec_exists_in_file and not spec_exists_in_db:
                        errors.append(f"doctors[{idx}] ('{name}') references non-existent specialty '{spec_ref}'.")

                if not doc.get('qualification'):
                    errors.append(f"doctors[{idx}] ('{name}').qualification is required.")
                if not doc.get('consultation_location'):
                    errors.append(f"doctors[{idx}] ('{name}').consultation_location is required.")

                duration = doc.get('consultation_duration_minutes', 30)
                if not isinstance(duration, int) or duration <= 0:
                    errors.append(f"doctors[{idx}] ('{name}').consultation_duration_minutes must be a positive integer.")

                exp = doc.get('experience_years', 5)
                if not isinstance(exp, int) or exp < 0:
                    errors.append(f"doctors[{idx}] ('{name}').experience_years must be non-negative integer.")

                # Validate Doctor Schedules
                schedules = doc.get('schedules', [])
                if not isinstance(schedules, list):
                    errors.append(f"doctors[{idx}] ('{name}').schedules must be a list.")
                else:
                    seen_days = set()
                    for s_idx, sched in enumerate(schedules):
                        if not isinstance(sched, dict):
                            errors.append(f"doctors[{idx}].schedules[{s_idx}] must be an object.")
                            continue

                        day = sched.get('day_of_week')
                        if not day or day not in valid_days:
                            errors.append(f"doctors[{idx}].schedules[{s_idx}].day_of_week '{day}' is invalid. Expected one of: {sorted(list(valid_days))}")
                        elif day in seen_days:
                            errors.append(f"doctors[{idx}] ('{name}') has duplicate schedule entry for '{day}'.")
                        else:
                            seen_days.add(day)

                        start_str = sched.get('start_time')
                        end_str = sched.get('end_time')

                        parsed_start = None
                        parsed_end = None

                        if not start_str or not end_str:
                            errors.append(f"doctors[{idx}].schedules[{s_idx}] requires 'start_time' and 'end_time'.")
                        else:
                            try:
                                parsed_start = parse_time_str(start_str)
                            except ValueError as e:
                                errors.append(f"doctors[{idx}].schedules[{s_idx}] start_time error: {e}")

                            try:
                                parsed_end = parse_time_str(end_str)
                            except ValueError as e:
                                errors.append(f"doctors[{idx}].schedules[{s_idx}] end_time error: {e}")

                            if parsed_start and parsed_end:
                                if parsed_start >= parsed_end:
                                    errors.append(
                                        f"doctors[{idx}].schedules[{s_idx}] on {day}: shift end_time ({end_str}) "
                                        f"must be later than start_time ({start_str})."
                                    )

                        # Validate breaks
                        breaks = sched.get('breaks', [])
                        for b_idx, brk in enumerate(breaks):
                            b_name = brk.get('name', 'Clinical Break')
                            b_start_str = brk.get('start_time')
                            b_end_str = brk.get('end_time')
                            if not b_start_str or not b_end_str:
                                errors.append(f"doctors[{idx}].schedules[{s_idx}].breaks[{b_idx}] requires 'start_time' and 'end_time'.")
                            else:
                                try:
                                    b_start = parse_time_str(b_start_str)
                                    b_end = parse_time_str(b_end_str)
                                    if b_start >= b_end:
                                        errors.append(f"doctors[{idx}].schedules[{s_idx}].breaks[{b_idx}] ('{b_name}'): end_time must be later than start_time.")
                                    if parsed_start and parsed_end:
                                        if b_start < parsed_start or b_end > parsed_end:
                                            errors.append(
                                                f"doctors[{idx}].schedules[{s_idx}].breaks[{b_idx}] ('{b_name}') ({b_start_str}-{b_end_str}) "
                                                f"must fit strictly within shift hours ({start_str}-{end_str})."
                                            )
                                except ValueError as e:
                                    errors.append(f"doctors[{idx}].schedules[{s_idx}].breaks[{b_idx}] time error: {e}")

        return errors

    def _safe_exists(self, model, **kwargs):
        if getattr(self, '_db_available', None) is False:
            return None
        try:
            res = model.objects.filter(**kwargs).exists()
            self._db_available = True
            return res
        except Exception:
            self._db_available = False
            return None

    def simulate_import(self, data):
        """Prints a detailed preview of actions that would be performed in a live run."""
        profile_data = data.get('hospital_profile')
        if profile_data:
            existing = None
            if getattr(self, '_db_available', None) is not False:
                try:
                    existing = HospitalProfile.objects.filter(is_active=True).first() or HospitalProfile.objects.first()
                    self._db_available = True
                except Exception:
                    self._db_available = False
            status = f"Update existing profile (ID: {existing.id})" if existing else "Ready to create/update HospitalProfile"
            self.stdout.write(f"  [PROFILE] {profile_data.get('name')} -> {status}")

        specialties = data.get('specialties', [])
        self.stdout.write(f"\n  [SPECIALTIES] {len(specialties)} items to process:")
        for spec in specialties:
            slug = spec.get('slug') or slugify(spec['name'])
            exists = self._safe_exists(Specialty, slug=slug)
            if exists is None:
                state_str = "VALID (ready to import)"
            elif exists:
                state_str = "EXISTS (will update)"
            else:
                state_str = "NEW (will create)"
            self.stdout.write(f"    - {spec['name']} ({slug}): {state_str}")

        departments = data.get('departments', [])
        self.stdout.write(f"\n  [DEPARTMENTS] {len(departments)} items to process:")
        for dept in departments:
            slug = dept.get('slug') or slugify(dept['name'])
            exists = self._safe_exists(Department, slug=slug)
            if exists is None:
                state_str = "VALID (ready to import)"
            elif exists:
                state_str = "EXISTS (will update)"
            else:
                state_str = "NEW (will create)"
            services_count = len(dept.get('services', []))
            faqs_count = len(dept.get('faqs', []))
            self.stdout.write(
                f"    - {dept['name']} ({slug}): {state_str} "
                f"[{services_count} services, {faqs_count} faqs]"
            )

        doctors = data.get('doctors', [])
        self.stdout.write(f"\n  [DOCTORS] {len(doctors)} items to process:")
        for doc in doctors:
            slug = doc.get('slug') or slugify(doc['name'])
            exists = self._safe_exists(Doctor, slug=slug)
            if exists is None:
                state_str = "VALID (ready to import)"
            elif exists:
                state_str = "EXISTS (will update)"
            else:
                state_str = "NEW (will create)"
            sched_count = len(doc.get('schedules', []))
            self.stdout.write(
                f"    - {doc['name']} ({slug}): {state_str} "
                f"[{sched_count} shift schedules]"
            )

    def execute_import(self, data):
        """Performs idempotent database mutations inside an atomic transaction."""
        stats = {
            'profile': False,
            'specialties_created': 0,
            'specialties_updated': 0,
            'departments_created': 0,
            'departments_updated': 0,
            'services_created': 0,
            'services_updated': 0,
            'faqs_created': 0,
            'faqs_updated': 0,
            'doctors_created': 0,
            'doctors_updated': 0,
            'schedules_created': 0,
            'schedules_updated': 0,
            'breaks_created': 0,
            'breaks_updated': 0,
        }

        # 1. Hospital Profile
        profile_data = data.get('hospital_profile')
        if profile_data:
            existing = HospitalProfile.objects.filter(is_active=True).first() or HospitalProfile.objects.first()
            defaults = {
                'name': profile_data.get('name', 'EgleSora Hospital'),
                'legal_name': profile_data.get('legal_name', 'EgleSora Memorial Hospital & Research Institute'),
                'tagline': profile_data.get('tagline', 'Excellence in Clinical Care & Patient Safety'),
                'overview': profile_data.get('overview', ''),
                'contact_phone': profile_data.get('contact_phone', ''),
                'emergency_phone': profile_data.get('emergency_phone', ''),
                'contact_email': profile_data.get('contact_email', ''),
                'address': profile_data.get('address', ''),
                'visiting_hours': profile_data.get('visiting_hours', 'Monday - Saturday: 08:00 AM - 08:00 PM'),
                'emergency_info': profile_data.get('emergency_info', ''),
                'is_active': profile_data.get('is_active', True),
            }
            if existing:
                for k, v in defaults.items():
                    setattr(existing, k, v)
                existing.save()
            else:
                HospitalProfile.objects.create(**defaults)
            stats['profile'] = True

        # 2. Specialties
        specialty_map = {}
        for spec_data in data.get('specialties', []):
            name = spec_data['name']
            slug = spec_data.get('slug') or slugify(name)
            defaults = {
                'name': name,
                'description': spec_data.get('description', ''),
                'is_active': spec_data.get('is_active', True),
            }
            obj, created = Specialty.objects.update_or_create(slug=slug, defaults=defaults)
            if created:
                stats['specialties_created'] += 1
            else:
                stats['specialties_updated'] += 1
            specialty_map[slug] = obj
            specialty_map[name.lower()] = obj

        # 3. Departments
        department_map = {}
        for dept_data in data.get('departments', []):
            name = dept_data['name']
            slug = dept_data.get('slug') or slugify(name)
            defaults = {
                'name': name,
                'specialty': dept_data.get('specialty', ''),
                'short_description': dept_data.get('short_description', ''),
                'full_description': dept_data.get('full_description', dept_data.get('short_description', '')),
                'opd_hours': dept_data.get('opd_hours', 'Mon - Sat: 09:00 AM - 04:00 PM'),
                'location': dept_data.get('location', ''),
                'contact_phone': dept_data.get('contact_phone', ''),
                'contact_email': dept_data.get('contact_email', ''),
                'extension': dept_data.get('extension', ''),
                'is_active': dept_data.get('is_active', True),
            }
            dept_obj, created = Department.objects.update_or_create(slug=slug, defaults=defaults)
            if created:
                stats['departments_created'] += 1
            else:
                stats['departments_updated'] += 1
            department_map[slug] = dept_obj
            department_map[name.lower()] = dept_obj

            # Sub-services
            for order, s_data in enumerate(dept_data.get('services', [])):
                s_name = s_data['name']
                s_defaults = {
                    'description': s_data.get('description', ''),
                    'order': s_data.get('order', order),
                    'is_active': s_data.get('is_active', True),
                }
                _, s_created = DepartmentService.objects.update_or_create(
                    department=dept_obj,
                    name=s_name,
                    defaults=s_defaults,
                )
                if s_created:
                    stats['services_created'] += 1
                else:
                    stats['services_updated'] += 1

            # Sub-FAQs
            for order, f_data in enumerate(dept_data.get('faqs', [])):
                question = f_data['question']
                f_defaults = {
                    'answer': f_data['answer'],
                    'order': f_data.get('order', order),
                    'is_active': f_data.get('is_active', True),
                }
                _, f_created = DepartmentFAQ.objects.update_or_create(
                    department=dept_obj,
                    question=question,
                    defaults=f_defaults,
                )
                if f_created:
                    stats['faqs_created'] += 1
                else:
                    stats['faqs_updated'] += 1

        # 4. Doctors and Schedules
        for doc_data in data.get('doctors', []):
            name = doc_data['name']
            slug = doc_data.get('slug') or slugify(name)

            # Resolve Department
            dept_ref = doc_data.get('department_slug') or doc_data.get('department')
            dept_obj = department_map.get(str(dept_ref).strip()) or department_map.get(str(dept_ref).strip().lower())
            if not dept_obj:
                dept_obj = Department.objects.filter(slug=dept_ref).first() or Department.objects.filter(name__iexact=dept_ref).first()

            # Resolve Specialty (optional)
            spec_ref = doc_data.get('specialty_slug') or doc_data.get('specialty')
            spec_obj = None
            if spec_ref:
                spec_obj = specialty_map.get(str(spec_ref).strip()) or specialty_map.get(str(spec_ref).strip().lower())
                if not spec_obj:
                    spec_obj = Specialty.objects.filter(slug=spec_ref).first() or Specialty.objects.filter(name__iexact=spec_ref).first()

            defaults = {
                'name': name,
                'department': dept_obj,
                'specialty': spec_obj,
                'specialty_name': doc_data.get('specialty_name', spec_obj.name if spec_obj else ''),
                'qualification': doc_data.get('qualification', ''),
                'experience_years': doc_data.get('experience_years', 5),
                'bio': doc_data.get('bio', ''),
                'expertise': doc_data.get('expertise', ''),
                'consultation_type': doc_data.get('consultation_type', 'In-person Consultation'),
                'consultation_duration_minutes': doc_data.get('consultation_duration_minutes', 30),
                'consultation_location': doc_data.get('consultation_location', ''),
                'is_active': doc_data.get('is_active', True),
            }

            doctor_obj, created = Doctor.objects.update_or_create(slug=slug, defaults=defaults)
            if created:
                stats['doctors_created'] += 1
            else:
                stats['doctors_updated'] += 1

            # Schedules
            for sched_data in doc_data.get('schedules', []):
                day = sched_data['day_of_week']
                start_time_val = parse_time_str(sched_data['start_time'])
                end_time_val = parse_time_str(sched_data['end_time'])
                sched_defaults = {
                    'start_time': start_time_val,
                    'end_time': end_time_val,
                    'slot_duration_minutes': sched_data.get('slot_duration_minutes', doctor_obj.consultation_duration_minutes),
                    'capacity': sched_data.get('capacity', 1),
                    'timezone': sched_data.get('timezone', 'Asia/Kolkata'),
                    'is_working_day': sched_data.get('is_working_day', True),
                    'is_active': sched_data.get('is_active', True),
                }

                sched_obj, s_created = DoctorSchedule.objects.update_or_create(
                    doctor=doctor_obj,
                    day_of_week=day,
                    defaults=sched_defaults,
                )
                if s_created:
                    stats['schedules_created'] += 1
                else:
                    stats['schedules_updated'] += 1

                # Breaks
                for brk_data in sched_data.get('breaks', []):
                    b_name = brk_data.get('name', 'Clinical Break')
                    b_start = parse_time_str(brk_data['start_time'])
                    b_end = parse_time_str(brk_data['end_time'])
                    _, b_created = ScheduleBreak.objects.update_or_create(
                        schedule=sched_obj,
                        name=b_name,
                        defaults={'start_time': b_start, 'end_time': b_end},
                    )
                    if b_created:
                        stats['breaks_created'] += 1
                    else:
                        stats['breaks_updated'] += 1

        return stats
