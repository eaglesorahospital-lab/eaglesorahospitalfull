"""
Regression Test Suite: Patient Login & Admin Authorization Protection.
Validates the resolution of the critical authorization bug:
- Patient login endpoint strictly accepts PATIENT accounts only.
- Privileged accounts (SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR_STAFF) are rejected with HTTP 403.
- No session tokens or patient credentials issued to unauthorized roles on patient portal.
- Patients and doctors cannot access administrative endpoints or escalate privileges.
- Cryptographically signed JWT claims prevent client-side role tampering.
- Cross-patient object isolation is strictly maintained.
- Valid admin and staff accounts retain authorized access.
"""

import os
import sys
from pathlib import Path
from datetime import date, time, timedelta

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / 'backend'

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import PatientProfile
from apps.hospital.models import HospitalProfile
from apps.departments.models import Department
from apps.doctors.models import Doctor, Specialty
from apps.appointments.models import Appointment

User = get_user_model()


class PatientLoginAdminProtectionTests(TestCase):
    """
    Test suite for Patient Login portal isolation, Admin Dashboard authorization,
    and RBAC boundary enforcement.
    """

    def setUp(self):
        self.client = APIClient()

        # 1. Super Admin Persona
        self.super_admin = User.objects.create_superuser(
            email="superadmin.portal@eglesora.org",
            password="AdminSecretPass123!",
            first_name="Super",
            last_name="Administrator",
        )

        # 2. Hospital Admin Persona
        self.hospital_admin = User.objects.create_user(
            email="hospadmin.portal@eglesora.org",
            password="HospAdminPass123!",
            first_name="Hospital",
            last_name="Director",
            role=User.Role.HOSPITAL_ADMIN,
        )

        # 3. Doctor / Medical Staff Persona
        self.doctor_user = User.objects.create_user(
            email="dr.roberts.portal@eglesora.org",
            password="DoctorSecret123!",
            first_name="Dr. Gregory",
            last_name="Roberts",
            role=User.Role.DOCTOR_STAFF,
        )

        # 4. Patient Personas (Alice and Bob)
        self.patient_user_1 = User.objects.create_user(
            email="alice.patient@example.com",
            password="PatientSecret123!",
            first_name="Alice",
            last_name="Cooper",
            role=User.Role.PATIENT,
        )
        self.patient_profile_1 = PatientProfile.objects.create(
            user=self.patient_user_1,
            mrn="MRN-TEST-ALICE",
            first_name="Alice",
            last_name="Cooper",
            date_of_birth=date(1990, 5, 15),
            gender=PatientProfile.Gender.FEMALE,
            phone="+919876543201",
            email="alice.patient@example.com",
            is_active=True,
        )

        self.patient_user_2 = User.objects.create_user(
            email="bob.patient@example.com",
            password="PatientSecret123!",
            first_name="Bob",
            last_name="Marley",
            role=User.Role.PATIENT,
        )
        self.patient_profile_2 = PatientProfile.objects.create(
            user=self.patient_user_2,
            mrn="MRN-TEST-BOB",
            first_name="Bob",
            last_name="Marley",
            date_of_birth=date(1982, 8, 20),
            gender=PatientProfile.Gender.MALE,
            phone="+919876543202",
            email="bob.patient@example.com",
            is_active=True,
        )

        # Domain metadata
        self.dept = Department.objects.create(
            name="Neurology",
            slug="neurology",
            specialty="Neuro Care",
            is_active=True,
        )
        self.specialty = Specialty.objects.create(
            name="Neurology",
            slug="neurology",
            is_active=True,
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            name="Dr. Gregory Roberts",
            slug="dr-gregory-roberts",
            department=self.dept,
            specialty=self.specialty,
            qualification="MD Neurology",
            is_active=True,
        )

        # Appointments
        self.appointment_1 = Appointment.objects.create(
            reference="APT-2026-ALICE-NEURO",
            patient=self.patient_profile_1,
            doctor=self.doctor,
            department=self.dept,
            appointment_date=date.today() + timedelta(days=2),
            start_time=time(10, 0),
            end_time=time(10, 30),
            status=Appointment.Status.CONFIRMED,
        )
        self.appointment_2 = Appointment.objects.create(
            reference="APT-2026-BOB-NEURO",
            patient=self.patient_profile_2,
            doctor=self.doctor,
            department=self.dept,
            appointment_date=date.today() + timedelta(days=3),
            start_time=time(11, 0),
            end_time=time(11, 30),
            status=Appointment.Status.CONFIRMED,
        )

    def _get_token(self, user):
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email
        return str(refresh.access_token), str(refresh)

    def _authenticate(self, user):
        access_token, _ = self._get_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    # -------------------------------------------------------------------------
    # 1. A PATIENT can log in through Patient Login
    # -------------------------------------------------------------------------
    def test_01_patient_can_log_in_through_patient_login_endpoint(self):
        """A valid PATIENT account logs in successfully via /api/auth/patient-login/."""
        payload = {
            "email": "alice.patient@example.com",
            "password": "PatientSecret123!",
        }
        res = self.client.post('/api/auth/patient-login/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)
        self.assertEqual(data['user']['role'], User.Role.PATIENT)
        self.assertEqual(data['user']['email'], "alice.patient@example.com")
        self.assertEqual(data['user']['mrn'], "MRN-TEST-ALICE")

    def test_01b_patient_can_log_in_through_general_login_with_patient_portal(self):
        """A valid PATIENT account logs in successfully via /api/auth/login/ with portal='patient'."""
        payload = {
            "email": "alice.patient@example.com",
            "password": "PatientSecret123!",
            "portal": "patient",
        }
        res = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['user']['role'], User.Role.PATIENT)
        self.assertIn('access', data)

    # -------------------------------------------------------------------------
    # 2. A PATIENT cannot access admin APIs
    # -------------------------------------------------------------------------
    def test_02_patient_cannot_access_admin_apis(self):
        """Authenticated PATIENT receives HTTP 403 on administrative endpoints."""
        self._authenticate(self.patient_user_1)

        # Audit logs endpoint
        res_audit = self.client.get('/api/audit/')
        self.assertEqual(res_audit.status_code, status.HTTP_403_FORBIDDEN)

        # Administrators management endpoint
        res_admin = self.client.get('/api/administrators/')
        self.assertEqual(res_admin.status_code, status.HTTP_403_FORBIDDEN)

        # Doctor leave configuration
        res_leave = self.client.post('/api/schedules/leaves/', {"doctor": self.doctor.id}, format='json')
        self.assertEqual(res_leave.status_code, status.HTTP_403_FORBIDDEN)

        # Department creation
        res_dept = self.client.post('/api/departments/', {"name": "Hacked Dept", "slug": "hacked"}, format='json')
        self.assertEqual(res_dept.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------------------
    # 3. A PATIENT cannot access the admin dashboard or escalation endpoints
    # -------------------------------------------------------------------------
    def test_03_patient_cannot_escalate_role(self):
        """A PATIENT cannot modify their own role or grant themselves privileged access."""
        self._authenticate(self.patient_user_1)

        # Attempt to change role via /api/auth/me/
        res_patch = self.client.patch('/api/auth/me/', {"role": "SUPER_ADMIN"}, format='json')
        # Even if 200/405, role in database MUST NOT change
        self.patient_user_1.refresh_from_db()
        self.assertEqual(self.patient_user_1.role, User.Role.PATIENT)
        self.assertFalse(self.patient_user_1.is_staff)
        self.assertFalse(self.patient_user_1.is_superuser)

    # -------------------------------------------------------------------------
    # 4. A HOSPITAL_ADMIN cannot use the Patient Login endpoint
    # -------------------------------------------------------------------------
    def test_04_hospital_admin_cannot_use_patient_login(self):
        """HOSPITAL_ADMIN attempting Patient Login is rejected with HTTP 403 Forbidden."""
        payload = {
            "email": "hospadmin.portal@eglesora.org",
            "password": "HospAdminPass123!",
        }
        res = self.client.post('/api/auth/patient-login/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', res.json())
        self.assertNotIn('refresh', res.json())
        self.assertIn("Patient portal is restricted to patient accounts", res.json().get('detail', ''))

        # Also via general login with portal='patient'
        payload['portal'] = 'patient'
        res2 = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', res2.json())

    # -------------------------------------------------------------------------
    # 5. A SUPER_ADMIN cannot use the Patient Login endpoint
    # -------------------------------------------------------------------------
    def test_05_super_admin_cannot_use_patient_login(self):
        """SUPER_ADMIN attempting Patient Login is rejected with HTTP 403 Forbidden."""
        payload = {
            "email": "superadmin.portal@eglesora.org",
            "password": "AdminSecretPass123!",
        }
        res = self.client.post('/api/auth/patient-login/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', res.json())
        self.assertNotIn('refresh', res.json())
        self.assertIn("Patient portal is restricted to patient accounts", res.json().get('detail', ''))

        # Also via general login with portal='patient'
        payload['portal'] = 'patient'
        res2 = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', res2.json())

    # -------------------------------------------------------------------------
    # 6. A DOCTOR_STAFF account cannot use the Patient Login endpoint
    # -------------------------------------------------------------------------
    def test_06_doctor_staff_cannot_use_patient_login(self):
        """DOCTOR_STAFF attempting Patient Login is rejected with HTTP 403 Forbidden."""
        payload = {
            "email": "dr.roberts.portal@eglesora.org",
            "password": "DoctorSecret123!",
        }
        res = self.client.post('/api/auth/patient-login/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', res.json())
        self.assertNotIn('refresh', res.json())
        self.assertIn("Patient portal is restricted to patient accounts", res.json().get('detail', ''))

        # Also via general login with portal='patient'
        payload['portal'] = 'patient'
        res2 = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', res2.json())

    # -------------------------------------------------------------------------
    # 7. Patient accounts cannot use Staff Login endpoint
    # -------------------------------------------------------------------------
    def test_07_patient_cannot_use_staff_login(self):
        """PATIENT attempting Staff Login is rejected with HTTP 403 Forbidden."""
        payload = {
            "email": "alice.patient@example.com",
            "password": "PatientSecret123!",
            "portal": "staff",
        }
        res = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', res.json())
        self.assertIn("Patient accounts cannot log in to the staff portal", res.json().get('detail', ''))

    # -------------------------------------------------------------------------
    # 8. Modifying frontend token payload without signature is rejected (401)
    # -------------------------------------------------------------------------
    def test_08_tampered_jwt_token_rejected_with_401(self):
        """A forged JWT with modified role claims and invalid HMAC signature is rejected."""
        valid_access, _ = self._get_token(self.patient_user_1)
        # Tamper with token by flipping characters
        tampered_token = valid_access[:-5] + "XXXXX"

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tampered_token}')
        res = self.client.get('/api/appointments/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------------------
    # 9. Invalid, expired, or missing JWT tokens are rejected appropriately
    # -------------------------------------------------------------------------
    def test_09_invalid_expired_missing_jwt_tokens(self):
        """Missing or garbage tokens receive HTTP 401."""
        # Anonymous / missing token
        self.client.credentials()
        self.assertEqual(self.client.get('/api/appointments/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, status.HTTP_401_UNAUTHORIZED)

        # Malformed header
        self.client.credentials(HTTP_AUTHORIZATION='Bearer NOT_A_VALID_TOKEN')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------------------
    # 10. Valid admin accounts retain authorized access
    # -------------------------------------------------------------------------
    def test_10_valid_admin_accounts_retain_authorized_access(self):
        """Super Admin and Hospital Admin retain operational access to administrative resources."""
        self._authenticate(self.super_admin)
        res_admin = self.client.get('/api/administrators/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)

        res_audit = self.client.get('/api/audit/')
        self.assertEqual(res_audit.status_code, status.HTTP_200_OK)

        self._authenticate(self.hospital_admin)
        res_hosp_apt = self.client.get('/api/appointments/')
        self.assertEqual(res_hosp_apt.status_code, status.HTTP_200_OK)

    # -------------------------------------------------------------------------
    # 11. Valid doctor/staff accounts retain authorized access to their own portal
    # -------------------------------------------------------------------------
    def test_11_valid_doctor_staff_retains_authorized_access(self):
        """Doctor staff can access appointments and doctor schedules."""
        self._authenticate(self.doctor_user)
        res = self.client.get('/api/appointments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # But Doctor Staff cannot access Super Admin administrators list
        res_adm = self.client.get('/api/administrators/')
        self.assertEqual(res_adm.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------------------
    # 12. Patients cannot access other patients' records or appointments
    # -------------------------------------------------------------------------
    def test_12_patients_cannot_access_other_patients_records(self):
        """Patient 1 cannot view or modify Patient 2's appointments or profile."""
        self._authenticate(self.patient_user_1)

        # Alice cannot access Bob's appointment by reference
        res = self.client.get(f'/api/appointments/{self.appointment_2.reference}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Alice cannot access Bob's patient profile
        res_prof = self.client.get(f'/api/patients/{self.patient_profile_2.id}/')
        self.assertEqual(res_prof.status_code, status.HTTP_404_NOT_FOUND)

    # -------------------------------------------------------------------------
    # 13. Wrong credentials on patient login returns 400 Bad Request
    # -------------------------------------------------------------------------
    def test_13_wrong_credentials_on_patient_login_rejected(self):
        """Invalid credentials return generic bad request without credential enumeration."""
        payload = {
            "email": "alice.patient@example.com",
            "password": "WrongPassword123!",
        }
        res = self.client.post('/api/auth/patient-login/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', res.json())
