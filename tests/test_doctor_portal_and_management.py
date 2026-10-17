import os
import sys
from pathlib import Path
from datetime import datetime, date, time, timedelta
from io import BytesIO
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / 'backend'

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import TransactionTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, PatientProfile
from apps.departments.models import Department
from apps.doctors.models import Doctor, Specialty
from apps.scheduling.models import DoctorSchedule, DoctorLeave
from apps.appointments.models import Appointment
from apps.notifications.models import AuditLog


def create_test_image(format='JPEG', size=(100, 100), color=(0, 100, 200)):
    buf = BytesIO()
    img = Image.new('RGB', size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()


class DoctorPortalAndManagementTests(TransactionTestCase):
    """
    Comprehensive Test Suite for Doctor Registration, Secure Credentials Flow,
    Doctor Portal Access Control, Schedule Isolation, and Appointment Assignment.
    """

    def setUp(self):
        # 1. Department and Specialty
        self.dept = Department.objects.create(
            name="Neurology",
            slug="neurology",
            specialty="Brain & Spine",
            is_active=True,
        )
        self.specialty = Specialty.objects.create(
            name="Neurology",
            slug="neurology",
            is_active=True,
        )

        # Base doctor for appointments
        self.base_doc_user = User.objects.create_user(
            email="dr.base@eglesora.com",
            password="BasePassword123!",
            first_name="Base",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
        )
        self.base_doctor = Doctor.objects.create(
            user=self.base_doc_user,
            name="Dr. Base Doctor",
            slug="dr-base-doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            is_active=True,
        )

        # 2. Administrator User
        self.admin_user = User.objects.create_user(
            email="admin.doc@eglesora.com",
            password="AdminPassword123!",
            first_name="Hospital",
            last_name="Administrator",
            role=User.Role.HOSPITAL_ADMIN,
            is_staff=True,
        )

        # 3. Patient User & Profile
        self.patient_user_1 = User.objects.create_user(
            email="patient.clara@example.com",
            password="PatientPassword123!",
            first_name="Clara",
            last_name="Oswald",
            role=User.Role.PATIENT,
        )
        self.patient_profile_1 = PatientProfile.objects.create(
            user=self.patient_user_1,
            mrn="MRN-TEST-CLARA",
            first_name="Clara",
            last_name="Oswald",
            email="patient.clara@example.com",
            phone="+919876543220",
            gender=PatientProfile.Gender.FEMALE,
            date_of_birth=date(1995, 5, 20),
            is_active=True,
        )

        self.patient_user_2 = User.objects.create_user(
            email="patient.amy@example.com",
            password="PatientPassword123!",
            first_name="Amy",
            last_name="Pond",
            role=User.Role.PATIENT,
        )
        self.patient_profile_2 = PatientProfile.objects.create(
            user=self.patient_user_2,
            mrn="MRN-TEST-AMY",
            first_name="Amy",
            last_name="Pond",
            email="patient.amy@example.com",
            phone="+919876543221",
            gender=PatientProfile.Gender.FEMALE,
            date_of_birth=date(1990, 8, 15),
            is_active=True,
        )

        self.client = APIClient()

    def _auth(self, user):
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')

    def test_admin_can_register_doctor_with_credentials_and_atomic_user(self):
        """Admin registers a new doctor, creating user account with DOCTOR_STAFF and secure temporary credentials."""
        self._auth(self.admin_user)

        img_bytes = create_test_image()
        photo_file = SimpleUploadedFile("dr_john.jpg", img_bytes, content_type="image/jpeg")

        data = {
            "name": "Dr. John Watson",
            "email": "dr.watson@eglesora.com",
            "phone": "+919876543999",
            "department": str(self.dept.id),
            "specialty_name": "Neurology",
            "qualification": "MBBS, MD (Neurology)",
            "experience_years": 10,
            "consultation_duration_minutes": 30,
            "consultation_location": "OPD Suite 301, Block B",
            "bio": "Expert in neurological diagnostics.",
            "expertise": "Stroke, Epilepsy, Migraine",
            "photo": photo_file,
        }

        res = self.client.post('/api/doctors/', data, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        # Verify doctor profile exists in DB
        doc = Doctor.objects.get(user__email="dr.watson@eglesora.com")
        self.assertEqual(doc.name, "Dr. John Watson")
        self.assertEqual(doc.qualification, "MBBS, MD (Neurology)")
        self.assertEqual(doc.consultation_duration_minutes, 30)
        self.assertIsNotNone(doc.user)

        # Verify linked User account
        user = doc.user
        self.assertEqual(user.email, "dr.watson@eglesora.com")
        self.assertEqual(user.role, User.Role.DOCTOR_STAFF)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.must_change_password)

        # Verify credentials returned in registration response
        self.assertIn("credentials", res.data)
        creds = res.data["credentials"]
        self.assertEqual(creds["email"], "dr.watson@eglesora.com")
        self.assertTrue(len(creds["temporary_password"]) >= 12)
        self.assertIn("setup_url", creds)
        self.assertIn("setup_uid", creds)
        self.assertIn("setup_token", creds)

        # Verify AuditLog recorded
        audit = AuditLog.objects.filter(action="DOCTOR_REGISTERED", resource_type="Doctor").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor, self.admin_user)

    def test_duplicate_doctor_email_rejected_with_atomic_rollback(self):
        """Admin cannot register doctor if email already exists as a User or Doctor, and rollback is atomic."""
        self._auth(self.admin_user)

        # Pre-create user with same email
        User.objects.create_user(
            email="existing.doctor@eglesora.com",
            password="SomePassword123!",
            role=User.Role.DOCTOR_STAFF,
        )

        initial_user_count = User.objects.count()
        initial_doctor_count = Doctor.objects.count()

        data = {
            "name": "Dr. Duplicate",
            "email": "existing.doctor@eglesora.com",
            "phone": "+919876543000",
            "department": str(self.dept.id),
            "qualification": "MBBS",
            "experience_years": 5,
            "consultation_duration_minutes": 30,
            "consultation_location": "Suite 101",
        }

        res = self.client.post('/api/doctors/', data, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", str(res.data))

        # Check counts remain identical
        self.assertEqual(User.objects.count(), initial_user_count)
        self.assertEqual(Doctor.objects.count(), initial_doctor_count)

    def test_invalid_photo_upload_rejected(self):
        """Uploading non-image files or oversized files (>5MB) is strictly rejected by backend."""
        self._auth(self.admin_user)

        # Test non-image file
        bad_file = SimpleUploadedFile("malware.exe", b"MZThisIsNotAnImageFileContent", content_type="application/octet-stream")
        data = {
            "name": "Dr. Bad Upload",
            "email": "bad.upload@eglesora.com",
            "phone": "+919876543111",
            "department": str(self.dept.id),
            "specialty_name": "Neurology",
            "qualification": "MBBS",
            "experience_years": 5,
            "consultation_duration_minutes": 30,
            "consultation_location": "Suite 102",
            "photo": bad_file,
        }

        res = self.client.post('/api/doctors/', data, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue("photo" in res.data or "image" in res.data)

        # Test oversized file (> 5MB)
        huge_bytes = b"0" * (5 * 1024 * 1024 + 1024)
        huge_file = SimpleUploadedFile("huge.jpg", huge_bytes, content_type="image/jpeg")
        data["photo"] = huge_file
        res = self.client.post('/api/doctors/', data, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue("photo" in res.data or "image" in res.data)

    def test_secure_one_time_setup_password_workflow(self):
        """Doctor establishes password via expiring setup token, clearing must_change_password."""
        self._auth(self.admin_user)

        # Register doctor
        data = {
            "name": "Dr. Sarah Adams",
            "email": "dr.sarah@eglesora.com",
            "phone": "+919876543222",
            "department": str(self.dept.id),
            "specialty_name": "Neurology",
            "qualification": "MD",
            "experience_years": 7,
            "consultation_duration_minutes": 30,
            "consultation_location": "Suite 201",
            "bio": "Experienced consultant in clinical neurology.",
        }
        res_create = self.client.post('/api/doctors/', data, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED, res_create.data)
        creds = res_create.data["credentials"]
        uid = creds["setup_uid"]
        token = creds["setup_token"]
        temp_pass = creds["temporary_password"]

        # 1. Confirm temporary password is secure and hashed in DB (never stored plaintext)
        initial_user = User.objects.get(email="dr.sarah@eglesora.com")
        self.assertTrue(initial_user.check_password(temp_pass))
        self.assertNotEqual(initial_user.password, temp_pass)
        self.assertTrue(initial_user.password.startswith("pbkdf2_") or initial_user.password.startswith("argon2"))

        # 2. Confirm temporary password is NEVER in AuditLog text or details
        self.assertEqual(AuditLog.objects.filter(details__icontains=temp_pass).count(), 0)

        # 3. Invalid setup token rejected
        res_invalid = self.client.post('/api/auth/setup-password/', {
            "uid": uid,
            "token": "tampered-token-xyz",
            "new_password": "NewDoctorSecretPass2026!",
            "confirm_password": "NewDoctorSecretPass2026!",
        }, format='json')
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Doctor completes one-time setup
        self.client.credentials()  # Unauthenticated
        setup_payload = {
            "uid": uid,
            "token": token,
            "new_password": "NewDoctorSecretPass2026!",
            "confirm_password": "NewDoctorSecretPass2026!",
        }
        res_setup = self.client.post('/api/auth/setup-password/', setup_payload, format='json')
        self.assertEqual(res_setup.status_code, status.HTTP_200_OK)
        self.assertIn("access", res_setup.data)
        self.assertNotIn(temp_pass, str(res_setup.data))
        self.assertNotIn("NewDoctorSecretPass2026!", str(res_setup.data))
        self.assertNotIn("password_hash", str(res_setup.data))


        # 5. Verify must_change_password is now False, new password works, old temporary password FAILS
        doctor_user = User.objects.get(email="dr.sarah@eglesora.com")
        self.assertFalse(doctor_user.must_change_password)
        self.assertTrue(doctor_user.check_password("NewDoctorSecretPass2026!"))
        self.assertFalse(doctor_user.check_password(temp_pass))

        # 6. Setup token cannot be reused
        res_reuse = self.client.post('/api/auth/setup-password/', setup_payload, format='json')
        self.assertEqual(res_reuse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enforce_password_change_blocks_doctor_portal_endpoints(self):
        """Doctor with must_change_password=True is blocked from portal endpoints until password is changed."""
        # Create doctor user with must_change_password=True
        doc_user = User.objects.create_user(
            email="dr.locked@eglesora.com",
            password="InitialTempPass123!",
            first_name="Locked",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
            must_change_password=True,
        )
        Doctor.objects.create(
            user=doc_user,
            name="Dr. Locked Doctor",
            slug="dr-locked-doctor",
            department=self.dept,
            qualification="MBBS",
            is_active=True,
        )

        self._auth(doc_user)

        # Attempt to access /api/doctors/me/ -> Expect 403 PASSWORD_CHANGE_REQUIRED
        res_me = self.client.get('/api/doctors/me/')
        self.assertEqual(res_me.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("password change required", str(res_me.data).lower())

        # Attempt to access /api/appointments/ -> Expect 403 PASSWORD_CHANGE_REQUIRED
        res_apt = self.client.get('/api/appointments/')
        self.assertEqual(res_apt.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("password change required", str(res_apt.data).lower())

        # Doctor updates password via change-password
        change_payload = {
            "current_password": "InitialTempPass123!",
            "new_password": "BrandNewPass2026!Strong",
            "confirm_password": "BrandNewPass2026!Strong",
        }
        res_change = self.client.post('/api/auth/change-password/', change_payload, format='json')
        self.assertEqual(res_change.status_code, status.HTTP_200_OK)

        # Re-authenticate with new token returned
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res_change.data['access']}")

        # Doctor portal endpoints are now accessible
        res_me_after = self.client.get('/api/doctors/me/')
        self.assertEqual(res_me_after.status_code, status.HTTP_200_OK)
        self.assertEqual(res_me_after.data.get("name"), "Dr. Locked Doctor")

        res_apt_after = self.client.get('/api/appointments/')
        self.assertEqual(res_apt_after.status_code, status.HTTP_200_OK)

    def test_doctor_portal_appointments_and_patient_isolation(self):
        """Doctor A can only view their own appointments and assigned patients, never Doctor B's."""
        # Create Doctor A
        user_a = User.objects.create_user(
            email="doc.a@eglesora.com",
            password="DocPasswordA123!",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
            must_change_password=False,
        )
        doc_a = Doctor.objects.create(
            user=user_a,
            name="Dr. Doctor A",
            slug="dr-doctor-a",
            department=self.dept,
            qualification="MD",
            is_active=True,
        )

        # Create Doctor B
        user_b = User.objects.create_user(
            email="doc.b@eglesora.com",
            password="DocPasswordB123!",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
            must_change_password=False,
        )
        doc_b = Doctor.objects.create(
            user=user_b,
            name="Dr. Doctor B",
            slug="dr-doctor-b",
            department=self.dept,
            qualification="MD",
            is_active=True,
        )

        # Appointment 1 for Doctor A with Patient 1
        apt_a = Appointment.objects.create(
            reference="APT-DOCA-001",
            patient=self.patient_profile_1,
            doctor=doc_a,
            department=self.dept,
            appointment_date=date.today() + timedelta(days=2),
            start_time=time(9, 0),
            end_time=time(9, 30),
            status=Appointment.Status.CONFIRMED,
        )

        # Appointment 2 for Doctor B with Patient 2
        apt_b = Appointment.objects.create(
            reference="APT-DOCB-002",
            patient=self.patient_profile_2,
            doctor=doc_b,
            department=self.dept,
            appointment_date=date.today() + timedelta(days=2),
            start_time=time(10, 0),
            end_time=time(10, 30),
            status=Appointment.Status.CONFIRMED,
        )

        # Test Doctor A perspective
        self._auth(user_a)

        res_apts = self.client.get('/api/appointments/')
        self.assertEqual(res_apts.status_code, status.HTTP_200_OK)
        references = [a["reference"] for a in res_apts.data.get("results", res_apts.data)]
        self.assertIn("APT-DOCA-001", references)
        self.assertNotIn("APT-DOCB-002", references)

        # Doctor A tries to access Doctor B's appointment by reference directly
        res_single = self.client.get(f'/api/appointments/{apt_b.reference}/')
        self.assertEqual(res_single.status_code, status.HTTP_404_NOT_FOUND)

        # Doctor A patient list only includes Patient 1
        res_patients = self.client.get('/api/patients/')
        self.assertEqual(res_patients.status_code, status.HTTP_200_OK)
        patient_mrns = [p["mrn"] for p in res_patients.data.get("results", res_patients.data)]
        self.assertIn(self.patient_profile_1.mrn, patient_mrns)
        self.assertNotIn(self.patient_profile_2.mrn, patient_mrns)

    def test_doctor_schedule_isolation(self):
        """Doctor A cannot modify Doctor B's schedule or leaves."""
        user_a = User.objects.create_user(
            email="doc.sch.a@eglesora.com",
            password="DocPasswordA123!",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
            must_change_password=False,
        )
        doc_a = Doctor.objects.create(
            user=user_a,
            name="Dr. Schedule A",
            slug="dr-schedule-a",
            department=self.dept,
            qualification="MD",
            is_active=True,
        )

        user_b = User.objects.create_user(
            email="doc.sch.b@eglesora.com",
            password="DocPasswordB123!",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
            must_change_password=False,
        )
        doc_b = Doctor.objects.create(
            user=user_b,
            name="Dr. Schedule B",
            slug="dr-schedule-b",
            department=self.dept,
            qualification="MD",
            is_active=True,
        )

        # Schedule for Doctor B
        sch_b = DoctorSchedule.objects.create(
            doctor=doc_b,
            day_of_week=DoctorSchedule.DayOfWeek.MONDAY,
            start_time=time(9, 0),
            end_time=time(17, 0),
            slot_duration_minutes=30,
            is_active=True,
        )

        self._auth(user_a)

        # Doctor A tries to update Doctor B's schedule
        res_patch = self.client.patch(f'/api/schedules/{sch_b.id}/', {"slot_duration_minutes": 45})
        self.assertEqual(res_patch.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_appointment_assignment_and_reassignment(self):
        """Admin can assign/reassign an appointment to a doctor with availability validation and audit logging."""
        user_doc = User.objects.create_user(
            email="doc.assign@eglesora.com",
            password="DocPassword123!",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
            must_change_password=False,
        )
        doc = Doctor.objects.create(
            user=user_doc,
            name="Dr. Available",
            slug="dr-available",
            department=self.dept,
            qualification="MD",
            is_active=True,
        )

        # Initial appointment with base doctor
        apt = Appointment.objects.create(
            reference="APT-TO-ASSIGN-01",
            patient=self.patient_profile_1,
            doctor=self.base_doctor,
            department=self.dept,
            appointment_date=date.today() + timedelta(days=5),
            start_time=time(14, 0),
            end_time=time(14, 30),
            status=Appointment.Status.CONFIRMED,
        )

        # Admin assigns appointment to Dr. Available
        self._auth(self.admin_user)
        assign_payload = {
            "doctor_id": doc.id,
            "reason": "Routine clinical distribution",
        }
        res_assign = self.client.post(f'/api/appointments/{apt.reference}/assign/', assign_payload, format='json')
        self.assertEqual(res_assign.status_code, status.HTTP_200_OK)
        self.assertEqual(res_assign.data["doctor"]["id"], doc.id)

        # Verify DB updated
        apt.refresh_from_db()
        self.assertEqual(apt.doctor, doc)

        # Verify AuditLog created
        audit = AuditLog.objects.filter(resource_id=apt.reference, action="APPOINTMENT_REASSIGNED").first()
        self.assertIsNotNone(audit)

        # Verify Doctor can now see this appointment
        self._auth(user_doc)
        res_doc_apts = self.client.get('/api/appointments/')
        references = [a["reference"] for a in res_doc_apts.data.get("results", res_doc_apts.data)]
        self.assertIn("APT-TO-ASSIGN-01", references)

    def test_admin_assignment_rejects_doctor_leave_or_slot_conflict(self):
        """Assignment fails if target doctor has an approved leave or conflicting appointment at that slot."""
        doc = Doctor.objects.create(
            name="Dr. Busy",
            slug="dr-busy",
            department=self.dept,
            qualification="MD",
            is_active=True,
        )

        target_date = date.today() + timedelta(days=6)

        # Create leave on target date
        DoctorLeave.objects.create(
            doctor=doc,
            start_date=target_date,
            end_date=target_date,
            reason="Conference",
            is_active=True,
        )

        apt = Appointment.objects.create(
            reference="APT-CONFLICT-01",
            patient=self.patient_profile_1,
            doctor=self.base_doctor,
            department=self.dept,
            appointment_date=target_date,
            start_time=time(10, 0),
            end_time=time(10, 30),
            status=Appointment.Status.CONFIRMED,
        )

        self._auth(self.admin_user)
        res = self.client.post(f'/api/appointments/{apt.reference}/assign/', {"doctor_id": doc.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("leave", str(res.data).lower())

    def test_unauthorized_users_cannot_assign_or_register_doctors(self):
        """Patients and unprivileged users cannot register doctors or reassign appointments."""
        # Patient tries to register doctor
        self._auth(self.patient_user_1)
        res_doc = self.client.post('/api/doctors/', {"name": "Hacker Doc"}, format='json')
        self.assertEqual(res_doc.status_code, status.HTTP_403_FORBIDDEN)

        # Patient tries to assign appointment
        apt = Appointment.objects.create(
            reference="APT-UNAUTH-01",
            patient=self.patient_profile_1,
            doctor=self.base_doctor,
            department=self.dept,
            appointment_date=date.today() + timedelta(days=7),
            start_time=time(11, 0),
            end_time=time(11, 30),
            status=Appointment.Status.CONFIRMED,
        )
        res_assign = self.client.post(f'/api/appointments/{apt.reference}/assign/', {"doctor_id": 999}, format='json')
        self.assertEqual(res_assign.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_register_doctor_with_inactive_status(self):
        """Admin can register a consultant with is_active=False and inactive doctors are hidden from public directory."""
        self._auth(self.admin_user)
        payload = {
            "name": "Dr. On Hold",
            "email": "dr.onhold@eglesora.com",
            "phone": "+91 98888 77777",
            "department": self.dept.id,
            "specialty_name": "Neurology",
            "qualification": "MBBS, MD",
            "experience_years": 8,
            "consultation_location": "Suite 401",
            "bio": "Consultant awaiting credentialing.",
            "is_active": False,
        }
        res = self.client.post('/api/doctors/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res.data["doctor"]["is_active"])

        # Public anonymous or patient users cannot see inactive doctor
        self.client.credentials()  # Anonymous
        res_public = self.client.get('/api/doctors/')
        public_names = [d["name"] for d in res_public.data.get("results", res_public.data)]
        self.assertNotIn("Dr. On Hold", public_names)

        # Admin CAN see inactive doctor in admin directory
        self._auth(self.admin_user)
        res_admin = self.client.get('/api/doctors/')
        admin_names = [d["name"] for d in res_admin.data.get("results", res_admin.data)]
        self.assertIn("Dr. On Hold", admin_names)

    def test_doctor_can_update_status_and_clinical_notes(self):
        """Assigned doctor can update appointment status to CHECKED_IN, COMPLETED, and record clinical notes."""
        doc_user = User.objects.create_user(
            email="dr.attending@eglesora.com",
            password="AttendingPassword123!",
            first_name="Attending",
            last_name="Physician",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
            must_change_password=False,
        )
        doc = Doctor.objects.create(
            user=doc_user,
            name="Dr. Attending Physician",
            slug="dr-attending-physician",
            department=self.dept,
            qualification="MD",
            is_active=True,
        )

        apt = Appointment.objects.create(
            reference="APT-CLINICAL-01",
            patient=self.patient_profile_1,
            doctor=doc,
            department=self.dept,
            appointment_date=date.today() + timedelta(days=2),
            start_time=time(9, 0),
            end_time=time(9, 30),
            status=Appointment.Status.CONFIRMED,
        )

        self._auth(doc_user)

        # Doctor updates status to CHECKED_IN and adds notes
        patch_res = self.client.patch(
            f'/api/appointments/{apt.reference}/',
            {"status": "CHECKED_IN", "notes": "Patient checked in, blood pressure 120/80 mmHg."},
            format='json'
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        apt.refresh_from_db()
        self.assertEqual(apt.status, Appointment.Status.CHECKED_IN)
        self.assertIn("blood pressure", apt.notes)

        # Doctor marks COMPLETED
        patch_res2 = self.client.patch(
            f'/api/appointments/{apt.reference}/',
            {"status": "COMPLETED", "notes": "Consultation concluded. Prescribed follow-up in 2 weeks."},
            format='json'
        )
        self.assertEqual(patch_res2.status_code, status.HTTP_200_OK)
        apt.refresh_from_db()
        self.assertEqual(apt.status, Appointment.Status.COMPLETED)
        self.assertIn("follow-up in 2 weeks", apt.notes)

    def test_doctor_registration_with_registration_number(self):
        """Administrator can register a doctor with optional professional registration number."""
        self._auth(self.admin_user)
        payload = {
            "name": "Dr. Registered Consultant",
            "email": "dr.registered@eglesora.com",
            "phone": "+91 99999 88888",
            "department": self.dept.id,
            "specialty_name": "Neurology",
            "qualification": "MBBS, DM (Neurology)",
            "registration_number": "MCI-2022-776655",
            "experience_years": 12,
            "consultation_location": "Suite 505",
            "bio": "Senior neurologist with state council registration.",
            "is_active": True,
        }
        res = self.client.post('/api/doctors/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("MCI-2022-776655", res.data["doctor"]["qualification"])

    def test_doctor_can_create_and_manage_own_schedule_and_leave(self):
        """Doctor staff can create and view their own shift schedule and submit leaves."""
        doc_user = User.objects.create_user(
            email="dr.schedule.owner@eglesora.com",
            password="ScheduleOwnerPass123!",
            first_name="Schedule",
            last_name="Owner",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
            must_change_password=False,
        )
        doc = Doctor.objects.create(
            user=doc_user,
            name="Dr. Schedule Owner",
            slug="dr-schedule-owner",
            department=self.dept,
            qualification="MD",
            is_active=True,
        )

        self._auth(doc_user)

        # 1. Doctor creates shift schedule
        sch_payload = {
            "day_of_week": "Tuesday",
            "start_time": "09:00:00",
            "end_time": "17:00:00",
            "slot_duration_minutes": 30,
            "is_working_day": True,
            "is_active": True,
        }
        res_sch = self.client.post('/api/schedules/', sch_payload, format='json')
        self.assertEqual(res_sch.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_sch.data["doctor"], doc.id)

        # 2. Doctor records a leave
        leave_payload = {
            "start_date": str(date.today() + timedelta(days=10)),
            "end_date": str(date.today() + timedelta(days=12)),
            "reason": "Attending annual neurological symposium",
        }
        res_leave = self.client.post('/api/schedules/leaves/', leave_payload, format='json')
        self.assertEqual(res_leave.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_leave.data["doctor"], doc.id)

        # 3. Doctor lists their own schedule
        res_list = self.client.get('/api/schedules/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        days = [s["day_of_week"] for s in res_list.data.get("results", res_list.data)]
        self.assertIn("Tuesday", days)

    def test_patient_booking_with_doctor_selection_and_double_booking_protection(self):
        """Patients can book an appointment with a specific doctor, and double-booking the slot is prevented."""
        # Active schedule for base doctor on target date's day of week
        target_date = date.today() + timedelta(days=7)
        day_name = target_date.strftime('%A')

        DoctorSchedule.objects.create(
            doctor=self.base_doctor,
            day_of_week=day_name,
            start_time=time(9, 0),
            end_time=time(17, 0),
            slot_duration_minutes=30,
            is_working_day=True,
            is_active=True,
        )

        # Patient 1 books 10:00 - 10:30
        self._auth(self.patient_user_1)
        booking_payload = {
            "doctor": self.base_doctor.id,
            "department": self.dept.id,
            "appointment_date": str(target_date),
            "start_time": "10:00:00",
            "end_time": "10:30:00",
            "appointment_type": "IN_PERSON",
            "reason_for_visit": "Persistent chronic migraine",
        }
        res_book1 = self.client.post('/api/appointments/', booking_payload, format='json')
        self.assertEqual(res_book1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_book1.data["doctor"]["id"], self.base_doctor.id)

        # Patient 2 attempts to book the EXACT SAME doctor, date, and slot
        self._auth(self.patient_user_2)
        conflict_payload = {
            "doctor": self.base_doctor.id,
            "department": self.dept.id,
            "appointment_date": str(target_date),
            "start_time": "10:00:00",
            "end_time": "10:30:00",
            "appointment_type": "IN_PERSON",
            "reason_for_visit": "Routine checkup",
        }
        res_book2 = self.client.post('/api/appointments/', conflict_payload, format='json')
        self.assertEqual(res_book2.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(
            "no longer available" in str(res_book2.data).lower()
            or "already booked" in str(res_book2.data).lower()
        )




