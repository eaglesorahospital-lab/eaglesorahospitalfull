"""
Management command to idempotently seed verified clinical hospital data into PostgreSQL.
Seeds HospitalProfile, Department, Specialty, Doctor, and DoctorSchedule records.
Safe to run repeatedly; does not duplicate records.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
import datetime

from apps.hospital.models import HospitalProfile, HospitalFacility, HospitalAnnouncement, HospitalFAQ
from apps.departments.models import Department, DepartmentService, DepartmentFAQ
from apps.doctors.models import Specialty, Doctor
from apps.scheduling.models import DoctorSchedule, ScheduleBreak

User = get_user_model()


class Command(BaseCommand):
    help = "Idempotently seeds initial clinical departments, specialties, doctors, and schedules into PostgreSQL."

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Explicit confirmation to seed demonstration hospital records into PostgreSQL.',
        )

    def handle(self, *args, **options):
        from django.conf import settings
        is_production = not getattr(settings, 'DEBUG', True)
        if is_production and not options.get('confirm'):
            self.stdout.write(self.style.WARNING(
                "SAFETY ABORT: settings.DEBUG is False. Seeding demonstration hospital records into production "
                "requires the '--confirm' flag to prevent unintended creation of demo doctors in a live database.\n"
                "To proceed, rerun with: python manage.py seed_hospital_data --confirm"
            ))
            return

        self.stdout.write(self.style.NOTICE("=== Seeding Eagle Sora Hospital Clinical Data ==="))

        with transaction.atomic():
            # 1. Hospital Profile
            profile, created = HospitalProfile.objects.get_or_create(
                id=1,
                defaults={
                    'name': 'EgleSora Hospital',
                    'legal_name': 'EgleSora Memorial Hospital & Research Institute',
                    'tagline': 'Excellence in Clinical Care & Patient Safety',
                    'overview': 'Established healthcare institution delivering compassionate outpatient, inpatient, and emergency clinical medical services.',
                    'contact_phone': '+91 (0) 22 0000 2222',
                    'emergency_phone': '+91 (0) 22 0000 1111',
                    'contact_email': 'desk@eglesorahospital.org',
                    'address': '12 Medical District Avenue, City Center',
                    'visiting_hours': 'Monday - Saturday: 08:00 AM - 08:00 PM',
                    'emergency_info': '24/7 dedicated acute trauma triage and emergency ambulance dispatch.',
                    'is_active': True,
                }
            )
            self.stdout.write(f"Hospital Profile: {profile.name} (Created: {created})")

            # 2. Specialties
            specialties_data = [
                ('Cardiology', 'cardiology', 'Diagnostic and interventional cardiovascular medicine and preventive cardiology.'),
                ('Neurology', 'neurology', 'Comprehensive stroke management, epilepsy care, and neuromuscular diagnostics.'),
                ('Orthopaedics', 'orthopaedics', 'Joint reconstruction, spine assessment, arthroscopy, and trauma surgery.'),
                ('Medical Oncology', 'oncology', 'Medical cancer management, precision chemotherapy, and targeted biological therapies.'),
                ('Paediatrics', 'paediatrics', 'General paediatric healthcare, newborn care, developmental surveillance, and immunisation.'),
                ('Emergency Medicine', 'emergency-medicine', 'Acute resuscitation, trauma care, and 24/7 emergency response protocols.'),
                ('Gastroenterology', 'gastroenterology', 'Digestive health, clinical hepatology, and therapeutic endoscopy.'),
                ('Nephrology', 'nephrology', 'Renal medicine, dialysis management, and hypertension assessment.'),
            ]

            spec_map = {}
            for name, slug, desc in specialties_data:
                spec, _ = Specialty.objects.get_or_create(
                    slug=slug,
                    defaults={'name': name, 'description': desc, 'is_active': True}
                )
                spec_map[slug] = spec

            self.stdout.write(f"Specialties seeded: {len(spec_map)}")

            # 3. Clinical Departments
            depts_data = [
                {
                    'name': 'Cardiology & Vascular Medicine',
                    'slug': 'cardiology',
                    'specialty': 'Cardiovascular Care',
                    'short_description': 'Comprehensive diagnostic and interventional cardiac care, cardiovascular prevention, and electrophysiology.',
                    'full_description': 'Dedicated tertiary cardiac care center providing outpatient consultations, non-invasive imaging, and advanced vascular management.',
                    'opd_hours': 'Mon - Sat: 08:30 AM - 05:00 PM',
                    'location': 'Wing B, 2nd Floor, Suite 201-208',
                    'contact_phone': '+91 (0) 22 0000 2201',
                    'contact_email': 'cardiology@eglesorahospital.org',
                },
                {
                    'name': 'Neurology & Neurosurgery',
                    'slug': 'neurology',
                    'specialty': 'Neurosciences',
                    'short_description': 'Specialized management of cerebrovascular diseases, epilepsy, peripheral neuropathy, and neurological emergencies.',
                    'full_description': 'State-of-the-art neurosciences pavilion offering comprehensive stroke management and clinical neurology.',
                    'opd_hours': 'Mon - Fri: 09:00 AM - 04:30 PM',
                    'location': 'Wing A, 3rd Floor, Suite 301-306',
                    'contact_phone': '+91 (0) 22 0000 2202',
                    'contact_email': 'neurology@eglesorahospital.org',
                },
                {
                    'name': 'Orthopaedics & Joint Surgery',
                    'slug': 'orthopaedics',
                    'specialty': 'Musculoskeletal Disorders',
                    'short_description': 'Joint replacement, arthroscopy, sports trauma, spine assessment, and rehabilitation.',
                    'full_description': 'Advanced orthopaedic center for joint reconstruction, arthroscopy, and musculoskeletal trauma.',
                    'opd_hours': 'Mon - Sat: 09:00 AM - 05:00 PM',
                    'location': 'Wing C, 1st Floor, Suite 101-107',
                    'contact_phone': '+91 (0) 22 0000 2203',
                    'contact_email': 'ortho@eglesorahospital.org',
                },
                {
                    'name': 'Medical Oncology',
                    'slug': 'oncology',
                    'specialty': 'Cancer Care',
                    'short_description': 'Multidisciplinary cancer management, precision chemotherapy, and targeted clinical therapies.',
                    'full_description': 'Comprehensive cancer institute providing compassionate oncological care and patient support.',
                    'opd_hours': 'Mon - Fri: 09:00 AM - 04:00 PM',
                    'location': 'Wing D, 4th Floor, Suite 401-410',
                    'contact_phone': '+91 (0) 22 0000 2204',
                    'contact_email': 'oncology@eglesorahospital.org',
                },
                {
                    'name': 'Paediatrics & Neonatology',
                    'slug': 'paediatrics',
                    'specialty': 'Child Health & Newborn Care',
                    'short_description': 'Primary and specialist paediatric consultations, developmental reviews, and immunization schedules.',
                    'full_description': 'Family-centered pediatric and neonatal clinic with child-friendly clinical environments.',
                    'opd_hours': 'Mon - Sat: 08:30 AM - 06:00 PM',
                    'location': 'Wing B, 1st Floor, Suite 111-118',
                    'contact_phone': '+91 (0) 22 0000 2205',
                    'contact_email': 'pediatrics@eglesorahospital.org',
                },
                {
                    'name': 'Emergency & Critical Care Medicine',
                    'slug': 'emergency',
                    'specialty': 'Trauma & Resuscitation',
                    'short_description': '24/7 dedicated acute emergency trauma facility with immediate triage and resuscitation suites.',
                    'full_description': 'Level-1 tertiary emergency facility equipped with dedicated resuscitation suites, point-of-care ultrasound, and rapid-response teams.',
                    'opd_hours': '24/7 Dedicated Emergency Services',
                    'location': 'Ground Floor, Emergency Pavilion',
                    'contact_phone': '+91 (0) 22 0000 1111',
                    'contact_email': 'emergency@eglesorahospital.org',
                },
            ]

            dept_map = {}
            for d in depts_data:
                dept, _ = Department.objects.get_or_create(
                    slug=d['slug'],
                    defaults=d
                )
                dept_map[d['slug']] = dept

            self.stdout.write(f"Departments seeded: {len(dept_map)}")

            # 4. Doctors
            doctor_user = User.objects.filter(email='doctor.varma@eglesorahospital.org').first()

            doctors_data = [
                {
                    'name': 'Dr. Rajesh K. Varma',
                    'slug': 'dr-rajesh-k-varma',
                    'department': dept_map['cardiology'],
                    'specialty': spec_map['cardiology'],
                    'specialty_name': 'Cardiology & Vascular Medicine',
                    'qualification': 'MBBS, MD (General Medicine), DM (Cardiology), FACC',
                    'experience_years': 18,
                    'bio': 'Senior Consultant and Head of Cardiology with 18 years of clinical leadership in diagnostic and interventional cardiovascular medicine.',
                    'expertise': 'Cardiovascular Diagnostics, Coronary Artery Disease, Hypertension, Lipid Management, Clinical Electrophysiology',
                    'consultation_type': 'In-person Consultation',
                    'consultation_duration_minutes': 30,
                    'consultation_location': 'Cardiology OPD, Wing B, 2nd Floor, Suite 204',
                    'is_active': True,
                    'user': doctor_user,
                },
                {
                    'name': 'Dr. Priya Nair',
                    'slug': 'dr-priya-nair',
                    'department': dept_map['neurology'],
                    'specialty': spec_map['neurology'],
                    'specialty_name': 'Neurology & Stroke Care',
                    'qualification': 'MBBS, MD (General Medicine), DM (Neurology)',
                    'experience_years': 14,
                    'bio': 'Consultant Neurologist specializing in comprehensive stroke management, clinical neuro-immunology, and neuromuscular disorders.',
                    'expertise': 'Acute Stroke Management, Headache Disorders, Epilepsy, Peripheral Neuropathy, Multiple Sclerosis',
                    'consultation_type': 'In-person Consultation',
                    'consultation_duration_minutes': 30,
                    'consultation_location': 'Neurology OPD, Wing A, 3rd Floor, Suite 302',
                    'is_active': True,
                },
                {
                    'name': 'Dr. Amitav Ghosh',
                    'slug': 'dr-amitav-ghosh',
                    'department': dept_map['orthopaedics'],
                    'specialty': spec_map['orthopaedics'],
                    'specialty_name': 'Orthopaedics & Joint Surgery',
                    'qualification': 'MBBS, MS (Orthopaedics), MCh (Orth), FAOrthA',
                    'experience_years': 20,
                    'bio': 'Senior Consultant Orthopaedic Surgeon specializing in primary and revision joint arthroplasty and complex trauma reconstruction.',
                    'expertise': 'Total Knee Replacement, Hip Arthroplasty, Arthroscopic Knee Reconstruction, Sports Injuries',
                    'consultation_type': 'In-person Consultation',
                    'consultation_duration_minutes': 30,
                    'consultation_location': 'Orthopaedics OPD, Wing C, 1st Floor, Suite 104',
                    'is_active': True,
                },
                {
                    'name': 'Dr. Sunita Kulkarni',
                    'slug': 'dr-sunita-kulkarni',
                    'department': dept_map['oncology'],
                    'specialty': spec_map['oncology'],
                    'specialty_name': 'Medical Oncology & Cancer Care',
                    'qualification': 'MBBS, MD (Radiotherapy), DM (Medical Oncology), ESMO Certified',
                    'experience_years': 15,
                    'bio': 'Senior Consultant Medical Oncologist with extensive clinical research in targeted molecular therapies and personalized systemic protocols.',
                    'expertise': 'Solid Tumor Oncology, Systemic Chemotherapy, Targeted Biological Therapies, Immuno-oncology',
                    'consultation_type': 'In-person Consultation',
                    'consultation_duration_minutes': 45,
                    'consultation_location': 'Oncology Daycare Wing, 4th Floor, Suite 405',
                    'is_active': True,
                },
                {
                    'name': 'Dr. Rohan Deshmukh',
                    'slug': 'dr-rohan-deshmukh',
                    'department': dept_map['paediatrics'],
                    'specialty': spec_map['paediatrics'],
                    'specialty_name': 'Paediatrics & Neonatology',
                    'qualification': 'MBBS, MD (Paediatrics), DNB (Neonatology)',
                    'experience_years': 12,
                    'bio': 'Consultant Paediatrician committed to comprehensive child wellness, neonatal growth surveillance, and acute pediatric illness management.',
                    'expertise': 'General Paediatrics, Neonatal Care, Developmental Assessment, Childhood Immunisation, Pediatric Asthma',
                    'consultation_type': 'In-person Consultation',
                    'consultation_duration_minutes': 25,
                    'consultation_location': 'Paediatric Clinic, Wing B, 1st Floor, Suite 114',
                    'is_active': True,
                },
                {
                    'name': 'Dr. Farhan Al-Mansoor',
                    'slug': 'dr-farhan-al-mansoor',
                    'department': dept_map['emergency'],
                    'specialty': spec_map['emergency-medicine'],
                    'specialty_name': 'Emergency & Trauma Care',
                    'qualification': 'MBBS, MD (Emergency Medicine), FACEM, MRCEM',
                    'experience_years': 16,
                    'bio': 'Director of Emergency Medicine and Trauma Services with international fellowship training in clinical toxicology and mass-casualty triage.',
                    'expertise': 'Cardiopulmonary Resuscitation, Acute Polytrauma, Toxicological Emergencies, Rapid Airway Management',
                    'consultation_type': 'In-person Consultation',
                    'consultation_duration_minutes': 20,
                    'consultation_location': 'Emergency Resuscitation Unit, Ground Floor',
                    'is_active': True,
                },
                {
                    'name': 'Dr. Meera Sen',
                    'slug': 'dr-meera-sen',
                    'department': dept_map['cardiology'],
                    'specialty': spec_map['cardiology'],
                    'specialty_name': 'Cardiology & Vascular Medicine',
                    'qualification': 'MBBS, MD (Medicine), DM (Cardiology)',
                    'experience_years': 13,
                    'bio': 'Consultant Cardiologist specializing in echocardiography, heart failure management, and preventive clinical cardiology.',
                    'expertise': 'Stress Echocardiography, Congestive Heart Failure, Valvular Heart Disease, Preventive Cardiology',
                    'consultation_type': 'In-person Consultation',
                    'consultation_duration_minutes': 30,
                    'consultation_location': 'Cardiology OPD, Wing B, 2nd Floor, Suite 206',
                    'is_active': True,
                },
                {
                    'name': 'Dr. Vikramaditya Rathore',
                    'slug': 'dr-vikramaditya-rathore',
                    'department': dept_map['neurology'],
                    'specialty': spec_map['neurology'],
                    'specialty_name': 'Neurology & Neuro-Rehabilitation',
                    'qualification': 'MBBS, MD (Medicine), DM (Neurology)',
                    'experience_years': 11,
                    'bio': 'Consultant Neurologist with clinical focus on neuro-rehabilitation, movement disorders, and neuro-cognitive assessments.',
                    'expertise': 'Parkinsonism, Tremor Analysis, Neurological Gait Disorders, Cognitive Impairment Evaluation',
                    'consultation_type': 'In-person Consultation',
                    'consultation_duration_minutes': 30,
                    'consultation_location': 'Neurology OPD, Wing A, 3rd Floor, Suite 305',
                    'is_active': True,
                },
            ]

            seeded_doctors = []
            for doc_info in doctors_data:
                slug = doc_info['slug']
                doc, created = Doctor.objects.get_or_create(
                    slug=slug,
                    defaults=doc_info
                )
                if not created and doc_info.get('user') and not doc.user:
                    doc.user = doc_info['user']
                    doc.save(update_fields=['user'])
                seeded_doctors.append(doc)

            self.stdout.write(f"Doctors seeded: {len(seeded_doctors)}")

            # 5. Weekly Doctor Schedules
            days = [
                DoctorSchedule.DayOfWeek.MONDAY,
                DoctorSchedule.DayOfWeek.TUESDAY,
                DoctorSchedule.DayOfWeek.WEDNESDAY,
                DoctorSchedule.DayOfWeek.THURSDAY,
                DoctorSchedule.DayOfWeek.FRIDAY,
            ]

            total_schedules = 0
            for doctor in seeded_doctors:
                for day in days:
                    schedule, s_created = DoctorSchedule.objects.get_or_create(
                        doctor=doctor,
                        day_of_week=day,
                        defaults={
                            'start_time': datetime.time(9, 0),
                            'end_time': datetime.time(13, 0),
                            'slot_duration_minutes': doctor.consultation_duration_minutes,
                            'capacity': 1,
                            'timezone': 'Asia/Kolkata',
                            'is_working_day': True,
                            'is_active': True,
                        }
                    )
                    total_schedules += 1
                    # Ensure clinical break exists
                    ScheduleBreak.objects.get_or_create(
                        schedule=schedule,
                        start_time=datetime.time(13, 0),
                        end_time=datetime.time(14, 0),
                        defaults={'name': 'Clinical Lunch & Ward Round'}
                    )

            self.stdout.write(f"Doctor schedules verified: {total_schedules}")

            # 6. Hospital Facilities
            facilities_data = [
                {
                    'name': '24/7 Emergency & Acute Trauma Center',
                    'description': 'Level-1 emergency department equipped with advanced resuscitation bays, dedicated trauma team, and direct ambulance ramp access.',
                    'order': 1,
                    'is_active': True,
                },
                {
                    'name': 'Advanced Cardiac Catheterization Laboratory',
                    'description': 'State-of-the-art digital biplane cath lab for primary percutaneous coronary interventions, electrophysiology studies, and device implantations.',
                    'order': 2,
                    'is_active': True,
                },
                {
                    'name': 'Multi-Disciplinary Intensive Care Units (ICU & CCU)',
                    'description': '24-bed critical care facility with continuous invasive hemodynamic monitoring, high-frequency ventilators, and round-the-clock intensivist coverage.',
                    'order': 3,
                    'is_active': True,
                },
                {
                    'name': 'Comprehensive Diagnostic Imaging & Radiology',
                    'description': 'High-resolution 128-slice CT scanner, 3.0 Tesla MRI, digital mammography, 4D Doppler ultrasound, and PACS digital reporting.',
                    'order': 4,
                    'is_active': True,
                },
                {
                    'name': 'Modular Surgical Theatres & Laparoscopy Suites',
                    'description': 'Class-100 laminar airflow operating theatres equipped for complex neurosurgery, joint replacements, and minimally invasive laparoscopic procedures.',
                    'order': 5,
                    'is_active': True,
                },
                {
                    'name': 'Automated Clinical Pathology & Blood Transfusion Bank',
                    'description': 'NABH-accredited laboratory delivering high-throughput biochemical profiles, rapid cross-matching, and 24/7 blood component therapy.',
                    'order': 6,
                    'is_active': True,
                },
            ]
            fac_count = 0
            for fac in facilities_data:
                _, created = HospitalFacility.objects.get_or_create(
                    name=fac['name'],
                    defaults=fac,
                )
                if created:
                    fac_count += 1
            self.stdout.write(f"Hospital Facilities verified: {len(facilities_data)} ({fac_count} created)")

            # 7. Hospital Public Announcements
            now = datetime.datetime.now(datetime.timezone.utc)
            announcements_data = [
                {
                    'title': '24/7 Acute Stroke Triage & Thrombolysis Protocol Activated',
                    'slug': 'acute-stroke-triage-protocol',
                    'category': 'Clinical Advisory',
                    'summary': 'Rapid response protocol for hyperacute ischemic stroke care within the crucial 4.5-hour therapeutic window.',
                    'content': 'EgleSora Hospital has operationalized an ultra-fast acute stroke protocol in partnership with the Department of Neurology and Emergency Medicine. Any suspected stroke presentation triggers immediate Code Stroke activation with instant 3T MRI perfusion sequencing and priority thrombolysis assessment.',
                    'is_published': True,
                    'published_at': now,
                },
                {
                    'title': 'Annual Preventive Cardiovascular Health Screening Initiative',
                    'slug': 'cardiovascular-health-screening',
                    'category': 'Public Health',
                    'summary': 'Comprehensive heart risk evaluations including lipid profiling, resting ECG, and cardiologist consultation.',
                    'content': 'In line with our community preventive mission, the Department of Cardiology is conducting structured outpatient wellness checkups. Packages include non-invasive stress testing, echocardiogram reviews, and individualized dietetic counseling.',
                    'is_published': True,
                    'published_at': now,
                },
                {
                    'title': 'New 128-Slice High-Speed CT Scanner Operational in Diagnostic Wing',
                    'slug': '128-slice-ct-operational',
                    'category': 'Infrastructure',
                    'summary': 'Next-generation low-dose diagnostic imaging with ultra-fast cardiac angiography and pulmonary embolism screening.',
                    'content': 'Our diagnostic radiology unit has completed commissioning and clinical calibration of the new high-resolution 128-slice CT scanner. This equipment reduces patient radiation dosage by up to 60% while providing sub-millimeter anatomical detail in under five seconds.',
                    'is_published': True,
                    'published_at': now,
                },
            ]
            ann_count = 0
            for ann in announcements_data:
                _, created = HospitalAnnouncement.objects.get_or_create(
                    slug=ann['slug'],
                    defaults=ann,
                )
                if created:
                    ann_count += 1
            self.stdout.write(f"Hospital Announcements verified: {len(announcements_data)} ({ann_count} created)")

            # 8. Hospital FAQs
            faqs_data = [
                {
                    'question': 'How do I book an outpatient appointment at EgleSora Hospital?',
                    'answer': 'You can book an appointment online anytime through our website by choosing your specialist doctor, date, and preferred time slot. You can also contact our centralized outpatient appointment desk at +91 (0) 22 0000 2222.',
                    'order': 1,
                    'is_active': True,
                },
                {
                    'question': 'What are the visiting hours for inpatient wards and ICUs?',
                    'answer': 'General inpatient ward visiting hours are Monday to Saturday from 04:30 PM to 07:00 PM, and Sundays from 10:00 AM to 12:00 PM and 04:30 PM to 07:00 PM. To ensure critical patient safety and infection control, ICU visitor access is restricted to designated immediate family members during specific 30-minute intervals.',
                    'order': 2,
                    'is_active': True,
                },
                {
                    'question': 'Are emergency services available 24 hours a day?',
                    'answer': 'Yes. Our Emergency and Acute Trauma Center operates 24 hours a day, 7 days a week, 365 days a year with full triage, dedicated trauma surgeons, critical care intensivists, and continuous radiology and blood bank support.',
                    'order': 3,
                    'is_active': True,
                },
                {
                    'question': 'What documents should I bring for my first consultation?',
                    'answer': 'Please bring a valid government-issued photo ID, any previous medical records, diagnostic scan reports, laboratory test results, current prescription medications, and health insurance policy documents if applicable.',
                    'order': 4,
                    'is_active': True,
                },
                {
                    'question': 'Does EgleSora Hospital support cashless health insurance processing?',
                    'answer': 'Yes. We partner with all leading health insurance providers and Third-Party Administrators (TPAs) to provide seamless cashless hospitalization and direct pre-authorization for eligible planned and emergency admissions.',
                    'order': 5,
                    'is_active': True,
                },
            ]
            faq_count = 0
            for faq in faqs_data:
                _, created = HospitalFAQ.objects.get_or_create(
                    question=faq['question'],
                    defaults=faq,
                )
                if created:
                    faq_count += 1
            self.stdout.write(f"Hospital FAQs verified: {len(faqs_data)} ({faq_count} created)")

            # 9. Department Services and FAQs
            dept_services = {
                'cardiology': [
                    ('Coronary Angiography & Stenting', 'Advanced catheter-based evaluation and stent revascularization.'),
                    ('Transthoracic & Stress Echocardiography', 'High-resolution ultrasound imaging of heart chambers and valves.'),
                    ('Electrophysiology & Pacemaker Clinic', 'Diagnosis of arrhythmias, pacemaker implantations, and CRT therapies.'),
                    ('Preventive Heart Health Checkups', 'Comprehensive risk profiling and clinical cardiovascular prevention.'),
                ],
                'neurology': [
                    ('Hyperacute Stroke Care & Thrombolysis', 'Rapid emergency brain revascularization and neuro-intensive monitoring.'),
                    ('Comprehensive Epilepsy Assessment', 'Digital video EEG monitoring and tailored pharmacological management.'),
                    ('Neuromuscular & EMG Diagnostics', 'Electromyography and nerve conduction studies for peripheral nerve disorders.'),
                    ('Movement Disorders & Parkinson Clinic', 'Specialized assessments for tremors, dystonia, and gait rehabilitation.'),
                ],
                'orthopaedics': [
                    ('Total Knee & Hip Arthroplasty', 'Primary and revision computer-assisted joint replacement surgery.'),
                    ('Arthroscopic Sports Injury Reconstruction', 'Minimally invasive repair for ACL/PCL tears and rotator cuff injuries.'),
                    ('Complex Trauma & Fracture Fixation', '24/7 dedicated surgical management of high-energy polytrauma injuries.'),
                    ('Spine Assessment & Disc Therapy', 'Comprehensive conservative and surgical spinal care.'),
                ],
                'oncology': [
                    ('Precision Systemic Chemotherapy', 'Customized oncological infusion protocols in dedicated daycare suites.'),
                    ('Targeted Biological & Immunotherapy', 'Next-generation molecular tumor-specific biological treatments.'),
                    ('Multidisciplinary Tumor Board Reviews', 'Consensus clinical review by medical, surgical, and radiation specialists.'),
                    ('Palliative Care & Pain Management', 'Holistic symptom management and compassionate patient support.'),
                ],
                'paediatrics': [
                    ('Well-Child & Newborn Care', 'Comprehensive neonatal development checks and pediatric wellness tracking.'),
                    ('Universal Immunization Schedules', 'Routine and recommended vaccination tracking by specialist pediatricians.'),
                    ('Pediatric Asthma & Allergy Management', 'Specialized pulmonary evaluation and allergy immunotherapy protocols.'),
                    ('Pediatric Emergency & Inpatient Triage', 'Dedicated acute care for infant and childhood medical emergencies.'),
                ],
                'emergency': [
                    ('24/7 Resuscitation & Trauma Triage', 'Immediate Level-1 emergency stabilization and trauma team activation.'),
                    ('Point-of-Care Ultrasound & Rapid Diagnostics', 'Instant bedside ultrasonography and rapid laboratory testing.'),
                    ('Acute Toxicology & Overdose Management', 'Immediate gastric decontamination, antidote administration, and ICU monitoring.'),
                    ('Advanced Airway & Mechanical Ventilation', 'Rapid sequence intubation and emergency hemodynamic support.'),
                ],
            }

            for dept_slug, services in dept_services.items():
                dept = dept_map.get(dept_slug)
                if dept:
                    for order_idx, (s_name, s_desc) in enumerate(services, start=1):
                        DepartmentService.objects.get_or_create(
                            department=dept,
                            name=s_name,
                            defaults={'description': s_desc, 'order': order_idx, 'is_active': True}
                        )

            dept_faqs = {
                'cardiology': [
                    ('How do I prepare for a stress echocardiogram?', 'Wear comfortable walking shoes and clothing. Refrain from heavy meals or caffeine for 3 hours before the test, and follow your physician instructions regarding morning beta-blockers.'),
                    ('What is the difference between an ECG and an Echocardiogram?', 'An ECG records electrical impulses of your heart rhythm, whereas an echocardiogram is an ultrasound scan showing live video of heart muscle contractions and valve function.'),
                ],
                'neurology': [
                    ('What are the warning signs of an acute stroke?', 'Remember FAST: Facial drooping, Arm weakness, Speech difficulty, and Time to call emergency hotline +91 (0) 22 0000 1111 immediately.'),
                    ('How should I prepare for an EEG test?', 'Wash your hair the evening before the test and do not apply hair oils, gels, or sprays. Continue routine medications unless advised otherwise by your neurologist.'),
                ],
                'orthopaedics': [
                    ('How long is recovery after a total knee replacement?', 'Most patients begin assisted walking within 24 hours. Full functional recovery typically takes 6 to 12 weeks with structured physical therapy.'),
                    ('Do all ligament tears require surgery?', 'Not all tears require surgery. Partial tears may be successfully treated with physical rehabilitation, bracing, and activity modification.'),
                ],
            }

            for dept_slug, faqs in dept_faqs.items():
                dept = dept_map.get(dept_slug)
                if dept:
                    for order_idx, (q, a) in enumerate(faqs, start=1):
                        DepartmentFAQ.objects.get_or_create(
                            department=dept,
                            question=q,
                            defaults={'answer': a, 'order': order_idx, 'is_active': True}
                        )

        self.stdout.write(self.style.SUCCESS("All hospital clinical data seeded successfully into PostgreSQL!"))
