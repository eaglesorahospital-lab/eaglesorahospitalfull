"""
Test Suite: Custom React Admin Dashboard Completion & RBAC Regression.
Validates:
1. Safe outpatient profile soft-deactivation (preserves relational integrity and Appointment FK).
2. Outpatient active/archived status toggling.
3. Patient profile editing via PATCH/PUT.
4. Hospital profile updates by HOSPITAL_ADMIN and read-only public access.
5. Notification log access and filtering for administrative staff.
6. Audit log access for HOSPITAL_ADMIN and rejection of unprivileged patient accounts.
"""

import os
import sys
from pathlib import Path
from datetime import date, time

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
from apps.notifications.models import Notification, AuditLog

User = get_user_model()


class CustomAdminDashboardCompletionTests(TestCase):
    """
    Verifies backend APIs supporting the React Admin Dashboard completion.
    """

    def setUp(self):
        self.client = APIClient()

        # 1. Hospital Admin
        self.hospital_admin = User.objects.create_user(
            email="hospadmin.test@eglesora.org",
            password="HospAdminPass123!",
            first_name="Hospital",
            last_name="Administrator",
            role=User.Role.HOSPITAL_ADMIN,
            is_staff=True,
        )

        # 2. Patient User & Profile
        self.patient_user = User.objects.create_user(
            email="john.doe.test@eglesora.org",
            password="PatientPass123!",
            first_name="John",
            last_name="Doe",
            role=User.Role.PATIENT,
        )
        self.patient_profile = PatientProfile.objects.create(
            user=self.patient_user,
            mrn="MRN-TEST-1001",
            first_name="John",
            last_name="Doe",
            date_of_birth=date(1990, 5, 15),
            gender="MALE",
            phone="+91-9876543210",
            email="john.doe.test@eglesora.org",
            address="123 Health Ave, Pune",
            blood_group="B+",
            is_active=True,
        )

        # 3. Department, Specialty & Doctor
        self.dept = Department.objects.create(
            name="Cardiology Test",
            slug="cardiology-test",
            specialty="Cardiovascular Care",
            short_description="Department of Cardiology",
            full_description="Department of Cardiology test description",
            location="Wing A, 2nd Floor",
        )
        self.specialty = Specialty.objects.create(
            name="Interventional Cardiology Test",
            slug="interventional-cardiology-test",
            description="Cardiology sub-specialty",
        )
        self.doctor_user = User.objects.create_user(
            email="doctor.test@eglesora.org",
            password="DoctorPass123!",
            first_name="Sarah",
            last_name="Smith",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            name="Dr. Sarah Smith",
            slug="dr-sarah-smith",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS, MD (Cardiology)",
            experience_years=8,
            bio="Experienced clinical cardiologist specializing in interventions.",
            consultation_location="Wing A, Room 101",
            is_active=True,
        )

        # 4. Hospital Profile
        self.hospital = HospitalProfile.objects.create(
            name="EgleSora Super Speciality Hospital",
            legal_name="EgleSora Healthcare Services Pvt Ltd",
            tagline="Excellence in Patient-Centric Care",
            overview="Tertiary care hospital offering specialized clinical care.",
            contact_phone="+91-20-4100-8000",
            emergency_phone="+91-20-4100-8999",
            contact_email="care@eglesora.org",
            address="Plot 42, Health City, Pune, Maharashtra 411001",
            visiting_hours="Mon-Sat: 08:00 AM - 08:00 PM",
            emergency_info="24/7 Trauma and emergency services available.",
            is_active=True,
        )

        # 5. Linked Appointment (CRITICAL to verify relational integrity / on_delete=PROTECT)
        self.appointment = Appointment.objects.create(
            patient=self.patient_profile,
            doctor=self.doctor,
            department=self.dept,
            appointment_date=date.today(),
            start_time=time(10, 0),
            end_time=time(10, 30),
            status=Appointment.Status.CONFIRMED,
            reason_for_visit="Routine Cardiac Checkup",
        )

        # 6. Notification Record
        self.notification = Notification.objects.create(
            recipient="john.doe.test@eglesora.org",
            recipient_user=self.patient_user,
            appointment=self.appointment,
            notification_type="APPOINTMENT_CONFIRMED",
            channel="EMAIL",
            subject="Appointment Confirmed",
            message="Your appointment has been confirmed.",
            status="SENT",
        )

        # 7. Audit Log Record
        self.audit_log = AuditLog.objects.create(
            actor=self.hospital_admin,
            actor_name="Hospital Administrator",
            role="HOSPITAL_ADMIN",
            action="APPOINTMENT_CONFIRMED",
            resource_type="APPOINTMENT",
            resource_id="APT-TEST-0001",
            details="Confirmed appointment APT-TEST-0001 via administrative dashboard.",
            ip_address="127.0.0.1",
            result="SUCCESS",
        )

    def _auth(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_patient_soft_deactivation_preserves_relational_integrity(self):
        """
        DELETE /api/patients/:id/ must NOT perform a destructive SQL DELETE.
        Must soft-deactivate (is_active=False) and preserve linked appointment.
        """
        self._auth(self.hospital_admin)
        url = f"/api/patients/{self.patient_profile.id}/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get('is_active'))

        # Verify DB state
        self.patient_profile.refresh_from_db()
        self.assertFalse(self.patient_profile.is_active)
        self.patient_user.refresh_from_db()
        self.assertFalse(self.patient_user.is_active)

        # Verify linked appointment was NOT deleted or corrupted
        self.assertTrue(Appointment.objects.filter(id=self.appointment.id).exists())
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.patient.id, self.patient_profile.id)

    def test_patient_toggle_status_action(self):
        """
        POST /api/patients/:id/toggle-status/ toggles is_active between True and False.
        """
        self._auth(self.hospital_admin)
        url = f"/api/patients/{self.patient_profile.id}/toggle-status/"

        # 1st toggle: True -> False
        resp1 = self.client.post(url)
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertFalse(resp1.data.get('is_active'))
        self.patient_profile.refresh_from_db()
        self.assertFalse(self.patient_profile.is_active)

        # 2nd toggle: False -> True
        resp2 = self.client.post(url)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data.get('is_active'))
        self.patient_profile.refresh_from_db()
        self.assertTrue(self.patient_profile.is_active)

    def test_patient_update_via_patch(self):
        """
        PATCH /api/patients/:id/ updates patient clinical and contact details.
        """
        self._auth(self.hospital_admin)
        url = f"/api/patients/{self.patient_profile.id}/"
        payload = {
            "blood_group": "AB+",
            "address": "456 Wellness Blvd, Mumbai",
            "emergency_contact": "Jane Doe (+91-9111122222)",
        }
        response = self.client.patch(url, data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.patient_profile.refresh_from_db()
        self.assertEqual(self.patient_profile.blood_group, "AB+")
        self.assertEqual(self.patient_profile.address, "456 Wellness Blvd, Mumbai")
        self.assertEqual(self.patient_profile.emergency_contact, "Jane Doe (+91-9111122222)")

    def test_hospital_profile_update_by_hospital_admin(self):
        """
        PATCH /api/hospital/:id/ updates institutional information when called by HOSPITAL_ADMIN.
        """
        self._auth(self.hospital_admin)
        url = f"/api/hospital/{self.hospital.id}/"
        payload = {
            "emergency_phone": "+91-20-9999-0000",
            "tagline": "World-Class Multi-Speciality Excellence",
            "visiting_hours": "Mon-Sun: 24x7 Emergency / OPD 08:00 AM - 09:00 PM",
        }
        response = self.client.patch(url, data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.hospital.refresh_from_db()
        self.assertEqual(self.hospital.emergency_phone, "+91-20-9999-0000")
        self.assertEqual(self.hospital.tagline, "World-Class Multi-Speciality Excellence")

    def test_hospital_profile_public_current_endpoint(self):
        """
        GET /api/hospital/current/ is publicly accessible without credentials.
        """
        self.client.credentials()  # Clear auth
        response = self.client.get("/api/hospital/current/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('name'), "EgleSora Super Speciality Hospital")

    def test_notifications_endpoint_accessible_and_filterable_by_admin(self):
        """
        GET /api/notifications/ returns communication logs for HOSPITAL_ADMIN.
        Supports filtering by status and notification_type.
        """
        self._auth(self.hospital_admin)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data.get('results', [])), 1)

        # Filter by status
        filter_resp = self.client.get("/api/notifications/?status=SENT")
        self.assertEqual(filter_resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(filter_resp.data.get('results', [])), 1)

    def test_audit_logs_accessible_by_hospital_admin(self):
        """
        GET /api/audit/ returns forensic audit trail for HOSPITAL_ADMIN.
        """
        self._auth(self.hospital_admin)
        response = self.client.get("/api/audit/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data.get('results', [])), 1)
        record = response.data['results'][0]
        self.assertEqual(record['action'], "APPOINTMENT_CONFIRMED")
        self.assertEqual(record['actor_name'], "Hospital Administrator")

    def test_audit_logs_forbidden_for_patient_account(self):
        """
        GET /api/audit/ returns 403 Forbidden for PATIENT accounts.
        """
        self._auth(self.patient_user)
        response = self.client.get("/api/audit/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
