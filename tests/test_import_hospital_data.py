"""
Unit tests for the import_hospital_data management command.
Validates:
1. Rejection of unresolved placeholder strings in production mode.
2. Data schema validation for required fields, time constraints, and break bounds.
3. Foreign key reference validation (department and specialty linkages).
4. Dry-run execution reporting without database mutations.
5. Idempotent record execution with conflict-safe update_or_create logic.
"""

import json
import os
import sys
import tempfile
from io import StringIO
from unittest.mock import patch, MagicMock

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib import admin
from django.test import SimpleTestCase
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.hospital.management.commands.import_hospital_data import Command as ImportCommand, parse_time_str


class ImportHospitalDataUnitTests(SimpleTestCase):
    def setUp(self):
        self.cmd = ImportCommand()
        self.valid_data = {
            "hospital_profile": {
                "name": "EgleSora Hospital Test",
                "legal_name": "EgleSora Test Healthcare Ltd.",
                "tagline": "Test Tagline",
                "overview": "Tertiary hospital test overview.",
                "contact_phone": "+91 22 1111 2222",
                "emergency_phone": "+91 22 3333 4444",
                "contact_email": "desk@test-hospital.org",
                "address": "123 Medical Road, City",
                "visiting_hours": "08:00 - 20:00",
                "emergency_info": "24/7 emergency trauma care.",
                "is_active": True,
            },
            "specialties": [
                {
                    "name": "Cardiology",
                    "slug": "cardiology",
                    "description": "Cardiovascular medical specialty.",
                    "is_active": True,
                }
            ],
            "departments": [
                {
                    "name": "Department of Cardiology",
                    "slug": "cardiology-dept",
                    "specialty": "Cardiovascular Medicine",
                    "short_description": "Cardiology short overview.",
                    "full_description": "Comprehensive cardiac care.",
                    "location": "Wing B, 2nd Floor",
                    "opd_hours": "09:00 - 17:00",
                    "contact_phone": "+91 22 5555 6666",
                    "contact_email": "cardiology@test-hospital.org",
                    "extension": "201",
                    "services": [
                        {
                            "name": "Echocardiography",
                            "description": "2D Echo procedure.",
                            "order": 1,
                        }
                    ],
                    "faqs": [
                        {
                            "question": "Is appointment required?",
                            "answer": "Yes, prior booking is recommended.",
                            "order": 1,
                        }
                    ],
                }
            ],
            "doctors": [
                {
                    "name": "Dr. Aarav Mehta",
                    "slug": "dr-aarav-mehta",
                    "department_slug": "cardiology-dept",
                    "specialty_slug": "cardiology",
                    "qualification": "MBBS, MD, DM (Cardiology)",
                    "experience_years": 12,
                    "bio": "Senior interventional cardiologist.",
                    "expertise": "Coronary angioplasty, heart failure",
                    "consultation_type": "In-person Consultation",
                    "consultation_duration_minutes": 30,
                    "consultation_location": "Wing B, Suite 204",
                    "schedules": [
                        {
                            "day_of_week": "Monday",
                            "start_time": "09:00",
                            "end_time": "13:00",
                            "slot_duration_minutes": 30,
                            "capacity": 1,
                            "breaks": [
                                {
                                    "name": "Ward Round",
                                    "start_time": "11:00",
                                    "end_time": "11:30",
                                }
                            ],
                        }
                    ],
                }
            ],
        }

    def _write_temp_json(self, data):
        tmp = tempfile.NamedTemporaryFile('w', delete=False, suffix='.json', encoding='utf-8')
        json.dump(data, tmp)
        tmp.close()
        self.addCleanup(os.remove, tmp.name)
        return tmp.name

    def test_parse_time_str(self):
        """Verifies valid and invalid 24-hour time string parsing."""
        t1 = parse_time_str("09:30")
        self.assertEqual(t1.hour, 9)
        self.assertEqual(t1.minute, 30)

        t2 = parse_time_str("18:45:00")
        self.assertEqual(t2.hour, 18)
        self.assertEqual(t2.minute, 45)

        with self.assertRaises(ValueError):
            parse_time_str("invalid-time")

    def test_placeholder_rejection_without_allow_flag(self):
        """Aborts when template placeholder strings like '[REPLACE WITH' are detected."""
        placeholder_data = dict(self.valid_data)
        placeholder_data["hospital_profile"]["name"] = "[REPLACE WITH: Official Name]"

        temp_file = self._write_temp_json(placeholder_data)
        out = StringIO()

        with self.assertRaises(CommandError) as ctx:
            call_command("import_hospital_data", file=temp_file, stdout=out)

        self.assertIn("placeholders", str(ctx.exception).lower())

    def test_validation_passes_on_valid_data(self):
        """Valid data structure produces zero validation errors."""
        errors = self.cmd.validate_data(self.valid_data)
        self.assertEqual(errors, [])

    def test_validation_rejects_missing_doctor_qualification(self):
        """Validation fails if required doctor qualification is missing."""
        invalid_data = dict(self.valid_data)
        invalid_data["doctors"] = [
            {
                "name": "Dr. Incomplete",
                "department_slug": "cardiology-dept",
                "consultation_location": "Room 1",
            }
        ]
        errors = self.cmd.validate_data(invalid_data)
        self.assertTrue(any("qualification is required" in e for e in errors))

    def test_validation_rejects_invalid_shift_hours(self):
        """Validation fails if schedule end_time is earlier than or equal to start_time."""
        invalid_data = dict(self.valid_data)
        invalid_data["doctors"][0]["schedules"][0]["start_time"] = "14:00"
        invalid_data["doctors"][0]["schedules"][0]["end_time"] = "10:00"

        errors = self.cmd.validate_data(invalid_data)
        self.assertTrue(any("must be later than start_time" in e for e in errors))

    def test_validation_rejects_break_outside_shift(self):
        """Validation fails if schedule break falls outside shift hours."""
        invalid_data = dict(self.valid_data)
        invalid_data["doctors"][0]["schedules"][0]["breaks"][0]["end_time"] = "14:00"  # Shift ends at 13:00

        errors = self.cmd.validate_data(invalid_data)
        self.assertTrue(any("must fit strictly within shift hours" in e for e in errors))

    def test_validation_rejects_non_existent_department(self):
        """Validation fails if doctor references a department that does not exist in file or DB."""
        invalid_data = dict(self.valid_data)
        invalid_data["doctors"][0]["department_slug"] = "non-existent-department-slug"

        errors = self.cmd.validate_data(invalid_data)
        self.assertTrue(any("references non-existent department" in e for e in errors))

    def test_validation_rejects_duplicate_schedule_days(self):
        """Validation fails if a doctor has multiple schedules for the same day."""
        invalid_data = dict(self.valid_data)
        invalid_data["doctors"][0]["schedules"].append({
            "day_of_week": "Monday",
            "start_time": "14:00",
            "end_time": "18:00",
        })

        errors = self.cmd.validate_data(invalid_data)
        self.assertTrue(any("duplicate schedule entry for 'Monday'" in e for e in errors))

    @patch("apps.hospital.management.commands.import_hospital_data.HospitalProfile.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.Specialty.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.Department.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.Doctor.objects")
    def test_dry_run_command_execution(self, mock_doc, mock_dept, mock_spec, mock_prof):
        """Dry run passes validation and reports preview without database mutation."""
        mock_prof.filter.return_value.first.return_value = None
        mock_spec.filter.return_value.exists.return_value = False
        mock_dept.filter.return_value.exists.return_value = False
        mock_doc.filter.return_value.exists.return_value = False

        temp_file = self._write_temp_json(self.valid_data)
        out = StringIO()

        call_command("import_hospital_data", file=temp_file, dry_run=True, stdout=out)
        output = out.getvalue()

        self.assertIn("DRY RUN COMPLETE", output)
        self.assertIn("No database records were modified", output)
        self.assertIn("Cardiology (cardiology): NEW (will create)", output)
        self.assertIn("Dr. Aarav Mehta (dr-aarav-mehta): NEW (will create)", output)

    @patch("apps.hospital.management.commands.import_hospital_data.transaction.atomic")
    @patch("apps.hospital.management.commands.import_hospital_data.ScheduleBreak.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.DoctorSchedule.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.Doctor.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.DepartmentFAQ.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.DepartmentService.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.Department.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.Specialty.objects")
    @patch("apps.hospital.management.commands.import_hospital_data.HospitalProfile.objects")
    def test_live_execution_creates_all_entities(
        self,
        mock_prof,
        mock_spec,
        mock_dept,
        mock_svc,
        mock_faq,
        mock_doc,
        mock_sched,
        mock_brk,
        mock_atomic,
    ):
        """Live run invokes update_or_create for each entity within atomic transaction."""
        mock_prof.filter.return_value.first.return_value = None
        mock_spec.update_or_create.return_value = (MagicMock(slug='cardiology'), True)

        dept_mock = MagicMock(slug='cardiology-dept')
        mock_dept.update_or_create.return_value = (dept_mock, True)
        mock_svc.update_or_create.return_value = (MagicMock(), True)
        mock_faq.update_or_create.return_value = (MagicMock(), True)

        doc_mock = MagicMock(slug='dr-aarav-mehta', consultation_duration_minutes=30)
        mock_doc.update_or_create.return_value = (doc_mock, True)

        sched_mock = MagicMock()
        mock_sched.update_or_create.return_value = (sched_mock, True)
        mock_brk.update_or_create.return_value = (MagicMock(), True)

        temp_file = self._write_temp_json(self.valid_data)
        out = StringIO()

        call_command("import_hospital_data", file=temp_file, stdout=out)
        output = out.getvalue()

        self.assertIn("Import Completed Successfully", output)
        self.assertIn("Specialties      : 1 created, 0 updated", output)
        self.assertIn("Departments      : 1 created, 0 updated", output)
        self.assertIn("Doctors          : 1 created, 0 updated", output)
        self.assertIn("Doctor Schedules : 1 created, 0 updated", output)

        mock_spec.update_or_create.assert_called_once()
        mock_dept.update_or_create.assert_called_once()
        mock_doc.update_or_create.assert_called_once()
        mock_sched.update_or_create.assert_called_once()
        mock_brk.update_or_create.assert_called_once()

    @patch("apps.hospital.management.commands.import_hospital_data.os.path.exists")
    @patch("apps.hospital.management.commands.import_hospital_data.Specialty.objects")
    def test_seed_specialties_standalone(self, mock_spec, mock_exists):
        """Calling import_hospital_data --seed-specialties without a file seeds standard specialties."""
        mock_exists.return_value = False
        mock_spec.update_or_create.return_value = (MagicMock(), True)
        out = StringIO()

        call_command("import_hospital_data", seed_specialties=True, stdout=out)
        output = out.getvalue()

        self.assertIn("Standard Medical Specialties Catalog", output)
        self.assertIn("Standard specialties setup finished", output)
        self.assertEqual(mock_spec.update_or_create.call_count, 20)

    @patch("apps.doctors.admin.DoctorSchedule.objects")
    def test_generate_standard_weekday_schedule_action(self, mock_sched):
        """Verifies admin action generates Mon-Fri 09:00-13:00 shifts for doctors."""
        from apps.doctors.admin import generate_standard_weekday_schedule

        mock_sched.get_or_create.return_value = (MagicMock(), True)
        mock_doctor = MagicMock(name="Dr. Test", consultation_duration_minutes=30)
        mock_qs = [mock_doctor]
        mock_admin = MagicMock()
        mock_req = MagicMock()

        generate_standard_weekday_schedule(mock_admin, mock_req, mock_qs)

        # 5 weekdays generated
        self.assertEqual(mock_sched.get_or_create.call_count, 5)
        mock_admin.message_user.assert_called_once()

    @patch("apps.scheduling.admin.DoctorSchedule.objects")
    def test_duplicate_to_remaining_weekdays_action(self, mock_sched):
        """Verifies duplicate_to_remaining_weekdays creates the other 4 weekdays."""
        from apps.scheduling.admin import duplicate_to_remaining_weekdays
        from apps.scheduling.models import DoctorSchedule

        mock_sched.get_or_create.return_value = (MagicMock(), True)
        mock_shift = MagicMock(
            day_of_week=DoctorSchedule.DayOfWeek.MONDAY,
            start_time="09:00",
            end_time="13:00",
            slot_duration_minutes=30,
            capacity=1,
            timezone="Asia/Kolkata",
            is_working_day=True,
            is_active=True,
        )
        mock_admin = MagicMock()
        mock_req = MagicMock()

        duplicate_to_remaining_weekdays(mock_admin, mock_req, [mock_shift])

        # Monday skipped, remaining 4 weekdays created
        self.assertEqual(mock_sched.get_or_create.call_count, 4)
        mock_admin.message_user.assert_called_once()

    @patch("apps.scheduling.admin.DoctorSchedule.objects")
    def test_duplicate_to_mwf_action(self, mock_sched):
        """Verifies duplicate_to_mwf creates Wednesday and Friday when Monday is source."""
        from apps.scheduling.admin import duplicate_to_mwf
        from apps.scheduling.models import DoctorSchedule

        mock_sched.get_or_create.return_value = (MagicMock(), True)
        mock_shift = MagicMock(
            day_of_week=DoctorSchedule.DayOfWeek.MONDAY,
            start_time="09:00",
            end_time="13:00",
            slot_duration_minutes=30,
            capacity=1,
            timezone="Asia/Kolkata",
            is_working_day=True,
            is_active=True,
        )
        mock_admin = MagicMock()
        mock_req = MagicMock()

        duplicate_to_mwf(mock_admin, mock_req, [mock_shift])

        # Monday skipped, Wed and Fri created = 2 calls
        self.assertEqual(mock_sched.get_or_create.call_count, 2)
        mock_admin.message_user.assert_called_once()

    def test_admin_download_template_view(self):
        """Verifies admin download_template_view returns JSON file attachment."""
        from apps.hospital.admin import HospitalProfileAdmin
        from apps.hospital.models import HospitalProfile
        from django.test import RequestFactory

        rf = RequestFactory()
        req = rf.get('/admin/hospital/hospitalprofile/download-template/')
        req.user = MagicMock(is_staff=True, is_active=True)

        admin_instance = HospitalProfileAdmin(HospitalProfile, admin.site)
        resp = admin_instance.download_template_view(req)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/json; charset=utf-8')
        self.assertIn('attachment; filename="hospital_setup.template.json"', resp['Content-Disposition'])

    def test_admin_import_setup_view_get_render(self):
        """Regression test: Verifies import_setup_view GET renders HTTP 200 and import_setup.html has valid tags."""
        from apps.hospital.admin import HospitalProfileAdmin
        from apps.hospital.models import HospitalProfile
        from django.test import RequestFactory
        from django.contrib.auth.models import AnonymousUser

        rf = RequestFactory()
        req = rf.get('/admin/hospital/hospitalprofile/import-setup/')
        mock_user = MagicMock(is_staff=True, is_active=True, is_superuser=True)
        req.user = mock_user

        admin_instance = HospitalProfileAdmin(HospitalProfile, admin.site)
        resp = admin_instance.import_setup_view(req)

        self.assertEqual(resp.status_code, 200)
        content_str = resp.content.decode('utf-8')
        self.assertIn('Automated Hospital Platform Setup', content_str)
        self.assertIn('Download hospital_setup.template.json', content_str)
        self.assertIn('Upload Configuration File', content_str)
        self.assertIn('Dry Run (Safe Validation Mode)', content_str)

    def test_admin_hospital_profile_changelist_render(self):
        """Regression test: Verifies authenticated staff can load HospitalProfile changelist view without 500."""
        from apps.hospital.admin import HospitalProfileAdmin
        from apps.hospital.models import HospitalProfile
        from django.test import RequestFactory
        from django.contrib.messages.storage.fallback import FallbackStorage
        from django.contrib.admin.views.main import ChangeList

        rf = RequestFactory()
        req = rf.get('/admin/hospital/hospitalprofile/')
        mock_user = MagicMock(is_staff=True, is_active=True, is_superuser=True)
        mock_user.has_perm.return_value = True
        mock_user.has_module_perms.return_value = True
        req.user = mock_user
        req.session = {}
        req._messages = FallbackStorage(req)

        mock_profile = HospitalProfile(
            id=1,
            name='EgleSora Hospital',
            legal_name='EgleSora Hospital (academic demo)',
            contact_phone='+91 7232 245100',
            emergency_phone='+91 7232 245108',
            contact_email='eaglesora.hospital@gmail.com',
            is_active=True,
        )

        mock_qs = MagicMock()
        mock_qs.ordered = True
        mock_qs.model = HospitalProfile
        mock_qs._prefetch_related_lookups = ()
        mock_qs._clone.return_value = mock_qs
        mock_qs.count.return_value = 1
        mock_qs.__len__.return_value = 1
        mock_qs.__iter__.return_value = iter([mock_profile])
        mock_qs.__getitem__.side_effect = lambda idx: [mock_profile][idx]
        mock_qs.filter.return_value = mock_qs

        def fake_get_results(cl_self, request):
            cl_self.result_count = 1
            cl_self.full_result_count = 1
            cl_self.result_list = mock_qs
            cl_self.can_show_all = True
            cl_self.multi_page = False
            cl_self.paginator = MagicMock(count=1, num_pages=1)

        with patch.object(ChangeList, 'get_results', fake_get_results):
            admin_instance = HospitalProfileAdmin(HospitalProfile, admin.site)
            resp = admin_instance.changelist_view(req)

        self.assertEqual(resp.status_code, 200)
        if hasattr(resp, 'render'):
            resp.render()
        content_str = resp.content.decode('utf-8')
        self.assertIn('Import Setup JSON', content_str)
        self.assertIn('Download Setup Template', content_str)
        self.assertIn('Select hospital profile to change', content_str)

    def test_custom_500_handler_api_preserves_json(self):
        """Verifies custom_500_handler returns JSON for API requests."""
        from config.urls import custom_500_handler
        from django.test import RequestFactory

        rf = RequestFactory()
        req = rf.get('/api/hospital/profile/')
        with patch('config.urls.logger.error') as mock_log:
            resp = custom_500_handler(req)
            self.assertEqual(resp.status_code, 500)
            self.assertEqual(resp['Content-Type'], 'application/json')
            self.assertIn(b'"status": 500', resp.content)
            self.assertIn(b'"error": "Internal Server Error"', resp.content)
            mock_log.assert_called_once()

    def test_custom_500_handler_admin_returns_html(self):
        """Verifies custom_500_handler preserves HTML error response for /admin/* requests."""
        from config.urls import custom_500_handler
        from django.test import RequestFactory

        rf = RequestFactory()
        req = rf.get('/admin/hospital/hospitalprofile/')
        with patch('config.urls.logger.error') as mock_log:
            resp = custom_500_handler(req)
            self.assertEqual(resp.status_code, 500)
            self.assertTrue(resp['Content-Type'].startswith('text/html'))
            mock_log.assert_called_once()

