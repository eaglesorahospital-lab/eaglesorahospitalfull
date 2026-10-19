import os
import sys
from pathlib import Path
from datetime import datetime, date, time, timedelta

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / 'backend'

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import TransactionTestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, PatientProfile
from apps.departments.models import Department
from apps.doctors.models import Doctor, Specialty
from apps.scheduling.models import DoctorSchedule, DoctorLeave
from apps.appointments.models import Appointment
from apps.notifications.models import Notification, AuditLog


class DoctorAdminPanelIsolationTests(TransactionTestCase):
    """
    Comprehensive regression tests for the dedicated Doctor Admin Panel:
    - Independent data and permissions for each doctor.
    - Two doctor accounts (Doctor A and Doctor B) tested side-by-side.
    - Appointment isolation: Doctor A sees only Doctor A's appointments.
    - Patient records isolation: Doctor A sees only patients with Doctor A consultations.
    - Notification isolation: Doctor A sees only Doctor A's appointment notifications.
    - Super Admin panel protection: Super Admin and Hospital Admin workflows unchanged.
    - Doctors blocked from accessing Super Admin endpoints (/api/administrators/, /api/audit/).
    - Permitted lifecycle status transitions and clinical notes management.
    """

    def setUp(self):
        # 1. Departments and Specialties
        self.dept = Department.objects.create(
            name="Cardiology",
            slug="cardiology",
            specialty="Heart & Vascular",
            is_active=True,
        )
        self.specialty = Specialty.objects.create(
            name="Cardiology",
            slug="cardiology",
            is_active=True,
        )

        # 2. Super Admin User
        self.super_admin_user = User.objects.create_superuser(
            email="superadmin@eglesora.local",
            password="AdminPassword123!",
            first_name="Super",
            last_name="Admin",
            role=User.Role.SUPER_ADMIN,
        )

        # 3. Doctor A Account & Profile
        self.doctor_a_user = User.objects.create_user(
            email="doctor.a@eglesora.local",
            password="DoctorPass123!",
            first_name="Alice",
            last_name="Sharma",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
        )
        self.doctor_a = Doctor.objects.create(
            user=self.doctor_a_user,
            name="Dr. Alice Sharma",
            slug="dr-alice-sharma",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS, MD Cardiology",
            experience_years=12,
            consultation_location="Suite 101, Cardio Wing",
            consultation_duration_minutes=30,
            is_active=True,
        )

        # 4. Doctor B Account & Profile
        self.doctor_b_user = User.objects.create_user(
            email="doctor.b@eglesora.local",
            password="DoctorPass123!",
            first_name="Bob",
            last_name="Verma",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
        )
        self.doctor_b = Doctor.objects.create(
            user=self.doctor_b_user,
            name="Dr. Bob Verma",
            slug="dr-bob-verma",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS, MS Cardiology",
            experience_years=8,
            consultation_location="Suite 102, Cardio Wing",
            consultation_duration_minutes=30,
            is_active=True,
        )

        # 5. Patients
        self.patient_1_user = User.objects.create_user(
            email="patient.one@eglesora.local",
            password="PatientPass123!",
            first_name="John",
            last_name="Doe",
            role=User.Role.PATIENT,
        )
        self.patient_1 = PatientProfile.objects.create(
            user=self.patient_1_user,
            first_name="John",
            last_name="Doe",
            email="patient.one@eglesora.local",
            phone="9876543210",
            gender=PatientProfile.Gender.MALE,
            is_active=True,
        )

        self.patient_2_user = User.objects.create_user(
            email="patient.two@eglesora.local",
            password="PatientPass123!",
            first_name="Jane",
            last_name="Smith",
            role=User.Role.PATIENT,
        )
        self.patient_2 = PatientProfile.objects.create(
            user=self.patient_2_user,
            first_name="Jane",
            last_name="Smith",
            email="patient.two@eglesora.local",
            phone="9876543211",
            gender=PatientProfile.Gender.FEMALE,
            is_active=True,
        )

        # 6. Appointments:
        # Appointment 1 is assigned to Doctor A with Patient 1
        target_date = date.today() + timedelta(days=2)
        self.apt_doctor_a = Appointment.objects.create(
            patient=self.patient_1,
            doctor=self.doctor_a,
            department=self.dept,
            appointment_date=target_date,
            start_time=time(10, 0),
            end_time=time(10, 30),
            status=Appointment.Status.REQUESTED,
            reason_for_visit="Hypertension evaluation",
            consultation_location=self.doctor_a.consultation_location,
        )

        # Appointment 2 is assigned to Doctor B with Patient 2
        self.apt_doctor_b = Appointment.objects.create(
            patient=self.patient_2,
            doctor=self.doctor_b,
            department=self.dept,
            appointment_date=target_date,
            start_time=time(11, 0),
            end_time=time(11, 30),
            status=Appointment.Status.CONFIRMED,
            reason_for_visit="Palpitations follow-up",
            consultation_location=self.doctor_b.consultation_location,
        )

        # 7. Notifications
        self.notif_doc_a = Notification.objects.create(
            recipient=self.doctor_a_user.email,
            recipient_user=self.doctor_a_user,
            appointment=self.apt_doctor_a,
            notification_type=Notification.NotificationType.APPOINTMENT_CONFIRMATION,
            channel=Notification.Channel.EMAIL,
            status=Notification.Status.SENT,
            subject="New appointment booked with Dr. Alice",
            message="Appointment with John Doe on " + str(target_date),
        )

        self.notif_doc_b = Notification.objects.create(
            recipient=self.doctor_b_user.email,
            recipient_user=self.doctor_b_user,
            appointment=self.apt_doctor_b,
            notification_type=Notification.NotificationType.APPOINTMENT_CONFIRMATION,
            channel=Notification.Channel.EMAIL,
            status=Notification.Status.SENT,
            subject="New appointment booked with Dr. Bob",
            message="Appointment with Jane Smith on " + str(target_date),
        )

        # 8. Clients
        self.client_doc_a = APIClient()
        token_doc_a = str(RefreshToken.for_user(self.doctor_a_user).access_token)
        self.client_doc_a.credentials(HTTP_AUTHORIZATION=f'Bearer {token_doc_a}')

        self.client_doc_b = APIClient()
        token_doc_b = str(RefreshToken.for_user(self.doctor_b_user).access_token)
        self.client_doc_b.credentials(HTTP_AUTHORIZATION=f'Bearer {token_doc_b}')

        self.client_admin = APIClient()
        token_admin = str(RefreshToken.for_user(self.super_admin_user).access_token)
        self.client_admin.credentials(HTTP_AUTHORIZATION=f'Bearer {token_admin}')

    def test_doctor_a_sees_only_own_appointments(self):
        """Doctor A's appointment listing contains only appointments assigned to Doctor A."""
        res = self.client_doc_a.get('/api/appointments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data['results'] if 'results' in res.data else res.data
        refs = [apt['reference'] for apt in results]

        self.assertIn(self.apt_doctor_a.reference, refs)
        self.assertNotIn(self.apt_doctor_b.reference, refs)

    def test_doctor_b_sees_only_own_appointments(self):
        """Doctor B's appointment listing contains only appointments assigned to Doctor B."""
        res = self.client_doc_b.get('/api/appointments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data['results'] if 'results' in res.data else res.data
        refs = [apt['reference'] for apt in results]

        self.assertIn(self.apt_doctor_b.reference, refs)
        self.assertNotIn(self.apt_doctor_a.reference, refs)

    def test_doctor_a_cannot_access_doctor_b_appointment_directly(self):
        """Direct object access to another doctor's appointment returns 404 Not Found."""
        res = self.client_doc_a.get(f'/api/appointments/{self.apt_doctor_b.reference}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_doctor_a_sees_only_assigned_patients(self):
        """Doctor A's patient roster lists Patient 1 and does NOT include Patient 2."""
        res = self.client_doc_a.get('/api/patients/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data['results'] if 'results' in res.data else res.data
        patient_mrns = [p['mrn'] for p in results]

        self.assertIn(self.patient_1.mrn, patient_mrns)
        self.assertNotIn(self.patient_2.mrn, patient_mrns)

    def test_doctor_a_cannot_access_doctor_b_patient_record(self):
        """Direct access by Doctor A to Patient 2 demographics returns 404 Not Found."""
        res = self.client_doc_a.get(f'/api/patients/{self.patient_2.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_doctor_a_sees_only_own_notifications(self):
        """Doctor A's notifications list contains only Doctor A notifications."""
        res = self.client_doc_a.get('/api/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data['results'] if 'results' in res.data else res.data
        notif_ids = [n['id'] for n in results]

        self.assertIn(self.notif_doc_a.id, notif_ids)
        self.assertNotIn(self.notif_doc_b.id, notif_ids)

    def test_doctor_b_sees_only_own_notifications(self):
        """Doctor B's notifications list contains only Doctor B notifications."""
        res = self.client_doc_b.get('/api/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data['results'] if 'results' in res.data else res.data
        notif_ids = [n['id'] for n in results]

        self.assertIn(self.notif_doc_b.id, notif_ids)
        self.assertNotIn(self.notif_doc_a.id, notif_ids)

    def test_doctor_cannot_access_super_admin_endpoints(self):
        """Doctor accounts receive 403 Forbidden on Super Admin endpoints."""
        res_admin = self.client_doc_a.get('/api/administrators/')
        self.assertEqual(res_admin.status_code, status.HTTP_403_FORBIDDEN)

        res_audit = self.client_doc_a.get('/api/audit/')
        self.assertEqual(res_audit.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_retains_full_visibility_across_doctors(self):
        """Super Admin retains full system visibility across all doctors, appointments, and notifications."""
        res_apts = self.client_admin.get('/api/appointments/')
        self.assertEqual(res_apts.status_code, status.HTTP_200_OK)
        apts = res_apts.data['results'] if 'results' in res_apts.data else res_apts.data
        refs = [a['reference'] for a in apts]
        self.assertIn(self.apt_doctor_a.reference, refs)
        self.assertIn(self.apt_doctor_b.reference, refs)

        res_notifs = self.client_admin.get('/api/notifications/')
        self.assertEqual(res_notifs.status_code, status.HTTP_200_OK)
        notifs = res_notifs.data['results'] if 'results' in res_notifs.data else res_notifs.data
        notif_ids = [n['id'] for n in notifs]
        self.assertIn(self.notif_doc_a.id, notif_ids)
        self.assertIn(self.notif_doc_b.id, notif_ids)

    def test_doctor_a_can_update_own_appointment_status(self):
        """Doctor A can advance their own appointment status (REQUESTED -> CONFIRMED)."""
        res = self.client_doc_a.patch(
            f'/api/appointments/{self.apt_doctor_a.reference}/',
            {'status': Appointment.Status.CONFIRMED},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.apt_doctor_a.refresh_from_db()
        self.assertEqual(self.apt_doctor_a.status, Appointment.Status.CONFIRMED)

    def test_doctor_a_cannot_update_doctor_b_appointment_status(self):
        """Doctor A cannot modify the status of Doctor B's appointment (404 Not Found)."""
        res = self.client_doc_a.patch(
            f'/api/appointments/{self.apt_doctor_b.reference}/',
            {'status': Appointment.Status.CHECKED_IN},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.apt_doctor_b.refresh_from_db()
        self.assertEqual(self.apt_doctor_b.status, Appointment.Status.CONFIRMED)

    def test_doctor_a_can_save_clinical_consultation_notes(self):
        """Doctor A can add and update clinical notes on their own consultation record."""
        clinical_note = "Patient presented with BP 145/95. Initiated lifestyle counseling and follow-up."
        res = self.client_doc_a.patch(
            f'/api/appointments/{self.apt_doctor_a.reference}/',
            {'notes': clinical_note},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.apt_doctor_a.refresh_from_db()
        self.assertEqual(self.apt_doctor_a.notes, clinical_note)

    def test_doctor_me_endpoint_returns_authenticated_doctor_profile(self):
        """GET /api/doctors/me/ strictly returns the authenticated doctor's profile."""
        res_a = self.client_doc_a.get('/api/doctors/me/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        self.assertEqual(res_a.data['name'], self.doctor_a.name)
        self.assertEqual(res_a.data['slug'], self.doctor_a.slug)

        res_b = self.client_doc_b.get('/api/doctors/me/')
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        self.assertEqual(res_b.data['name'], self.doctor_b.name)
        self.assertEqual(res_b.data['slug'], self.doctor_b.slug)
