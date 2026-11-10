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

from django.test import TransactionTestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, PatientProfile
from apps.departments.models import Department
from apps.doctors.models import Doctor, Specialty
from apps.scheduling.models import DoctorSchedule
from apps.appointments.models import Appointment


class BookForSomeoneElseComprehensiveTests(TransactionTestCase):
    """
    Comprehensive verification suite for 'Book for Someone Else' functionality:
    - Self-booking continues to work seamlessly.
    - Booking for a new dependent (Child, Parent, Spouse, etc.) creates independent patient record with user=None.
    - booked_by and relationship_to_patient are stored and returned in the API.
    - Booking for an existing authorized dependent works.
    - Unauthorized access (booking using an unrelated patient's profile ID) is rejected with 403 Forbidden.
    - Cancellation and rescheduling permissions allow the booking requester to manage their dependent's appointment.
    - Unrelated patients cannot cancel or reschedule the appointment.
    """

    def setUp(self):
        # 1. Department and Doctor
        self.dept = Department.objects.create(
            name="General Internal Medicine",
            slug="general-internal-medicine",
            specialty="Internal Medicine",
            short_description="Diagnostic outpatient clinical care.",
            full_description="Diagnostic outpatient clinical care and treatment.",
            location="Wing A, 2nd Floor",
            is_active=True,
        )
        self.specialty = Specialty.objects.create(name="Internal Medicine")
        self.doctor = Doctor.objects.create(
            name="Dr. Sarah Johnson",
            slug="dr-sarah-johnson",
            department=self.dept,
            specialty=self.specialty,
            qualification="MD, Internal Medicine",
            consultation_duration_minutes=30,
            consultation_location="Wing A, Suite 101",
            is_active=True,
        )

        for day in DoctorSchedule.DayOfWeek.values:
            DoctorSchedule.objects.create(
                doctor=self.doctor,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(17, 0),
                slot_duration_minutes=30,
                capacity=1,
                is_active=True,
            )

        # 2. Authenticated Patient Users
        self.user_a = User.objects.create_user(
            email="alice.requester@example.com",
            password="SecurePassword123!",
            first_name="Alice",
            last_name="Requester",
            role=User.Role.PATIENT,
        )
        self.patient_a = PatientProfile.objects.create(
            user=self.user_a,
            first_name="Alice",
            last_name="Requester",
            phone="+919876543210",
            email="alice.requester@example.com",
            blood_group="A+",
            is_active=True,
        )
        self.token_a = str(RefreshToken.for_user(self.user_a).access_token)
        self.client_a = APIClient()
        self.client_a.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_a}")

        self.user_b = User.objects.create_user(
            email="bob.unrelated@example.com",
            password="SecurePassword123!",
            first_name="Bob",
            last_name="Unrelated",
            role=User.Role.PATIENT,
        )
        self.patient_b = PatientProfile.objects.create(
            user=self.user_b,
            first_name="Bob",
            last_name="Unrelated",
            phone="+919876543299",
            email="bob.unrelated@example.com",
            blood_group="B+",
            is_active=True,
        )
        self.token_b = str(RefreshToken.for_user(self.user_b).access_token)
        self.client_b = APIClient()
        self.client_b.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_b}")

        # Future appointment date
        self.future_date = date.today() + timedelta(days=6)

    def test_01_self_booking_preserves_behavior(self):
        """1. Standard self-booking binds to user's own profile and sets relationship to 'Self'."""
        payload = {
            "doctor": self.doctor.id,
            "appointment_date": str(self.future_date),
            "start_time": "09:30:00",
            "end_time": "10:00:00",
            "booking_for": "MYSELF",
            "reason_for_visit": "Annual health checkup",
        }
        res = self.client_a.post('/api/appointments/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        data = res.json()

        self.assertEqual(data['patient']['id'], self.patient_a.id)
        self.assertEqual(data['patient']['mrn'], self.patient_a.mrn)
        self.assertEqual(data['relationship_to_patient'], 'Self')
        self.assertEqual(data['booked_by']['id'], self.user_a.id)

    def test_02_book_for_new_dependent_creates_independent_patient(self):
        """2. Booking for a new person creates an independent PatientProfile (user=None)."""
        payload = {
            "doctor": self.doctor.id,
            "appointment_date": str(self.future_date),
            "start_time": "10:00:00",
            "end_time": "10:30:00",
            "booking_for": "SOMEONE_ELSE",
            "relationship_to_patient": "Child",
            "patient": {
                "fullName": "Leo Requester",
                "dateOfBirth": "2018-05-15",
                "gender": "MALE",
                "bloodGroup": "O+",
                "mobile": "+919876543211",
                "address": "42 Family Lane, Pune",
                "reasonForVisit": "Pediatric fever consultation",
            },
        }
        res = self.client_a.post('/api/appointments/book/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        data = res.json()

        # Patient must be the child, NOT Alice
        self.assertNotEqual(data['patient']['id'], self.patient_a.id)
        self.assertEqual(data['patient']['full_name'], 'Leo Requester')
        self.assertEqual(data['patient']['blood_group'], 'O+')
        self.assertEqual(data['relationship_to_patient'], 'Child')
        self.assertEqual(data['booked_by']['id'], self.user_a.id)

        # Database verification: child profile has user=None
        child_profile = PatientProfile.objects.get(id=data['patient']['id'])
        self.assertIsNone(child_profile.user)
        self.assertEqual(child_profile.first_name, 'Leo')
        self.assertEqual(child_profile.blood_group, 'O+')

    def test_03_booking_for_existing_authorized_dependent_reuses_profile(self):
        """3. Booking again for an existing authorized dependent reuses their profile."""
        # First booking creates Leo
        payload1 = {
            "doctor": self.doctor.id,
            "appointment_date": str(self.future_date),
            "start_time": "10:30:00",
            "end_time": "11:00:00",
            "booking_for": "SOMEONE_ELSE",
            "relationship_to_patient": "Child",
            "patient": {
                "fullName": "Leo Requester",
                "dateOfBirth": "2018-05-15",
                "gender": "MALE",
                "bloodGroup": "O+",
                "mobile": "+919876543211",
            },
        }
        res1 = self.client_a.post('/api/appointments/book/', payload1, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        child_id = res1.json()['patient']['id']

        # Second booking specifies patient_id for Leo
        future_date_2 = self.future_date + timedelta(days=1)
        payload2 = {
            "doctor": self.doctor.id,
            "appointment_date": str(future_date_2),
            "start_time": "11:00:00",
            "end_time": "11:30:00",
            "booking_for": "SOMEONE_ELSE",
            "relationship_to_patient": "Child",
            "patient_id": child_id,
            "reason_for_visit": "Follow-up checkup",
        }
        res2 = self.client_a.post('/api/appointments/book/', payload2, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED, res2.data)
        self.assertEqual(res2.json()['patient']['id'], child_id)
        self.assertEqual(res2.json()['relationship_to_patient'], 'Child')

    def test_04_unauthorized_patient_id_rejected_with_403(self):
        """4. Attempting to book using an unauthorized unrelated patient's profile ID is rejected with 403."""
        # Alice tries to book using Bob's profile ID under 'SOMEONE_ELSE'
        payload = {
            "doctor": self.doctor.id,
            "appointment_date": str(self.future_date),
            "start_time": "11:30:00",
            "end_time": "12:00:00",
            "booking_for": "SOMEONE_ELSE",
            "relationship_to_patient": "Spouse",
            "patient_id": self.patient_b.id,
        }
        res = self.client_a.post('/api/appointments/book/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("not authorized", res.json()['detail'].lower())

    def test_05_dependents_list_endpoint_returns_authorized_dependents(self):
        """5. /api/appointments/dependents/ returns authorized dependents previously booked by the user."""
        # Book for Child Leo
        payload = {
            "doctor": self.doctor.id,
            "appointment_date": str(self.future_date),
            "start_time": "14:00:00",
            "end_time": "14:30:00",
            "booking_for": "SOMEONE_ELSE",
            "relationship_to_patient": "Child",
            "patient": {
                "fullName": "Leo Requester",
                "dateOfBirth": "2018-05-15",
                "gender": "MALE",
                "bloodGroup": "O+",
                "mobile": "+919876543211",
            },
        }
        self.client_a.post('/api/appointments/book/', payload, format='json')

        # Alice checks dependents list
        res = self.client_a.get('/api/appointments/dependents/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        deps = res.json()
        self.assertEqual(len(deps), 1)
        self.assertEqual(deps[0]['full_name'], 'Leo Requester')

        # Bob checks dependents list: Bob has no dependents
        res_bob = self.client_b.get('/api/appointments/dependents/')
        self.assertEqual(res_bob.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_bob.json()), 0)

    def test_06_cancellation_and_rescheduling_by_requester_allowed(self):
        """6. Requester who booked for a dependent can cancel and reschedule the dependent appointment."""
        payload = {
            "doctor": self.doctor.id,
            "appointment_date": str(self.future_date),
            "start_time": "14:30:00",
            "end_time": "15:00:00",
            "booking_for": "SOMEONE_ELSE",
            "relationship_to_patient": "Parent",
            "patient": {
                "fullName": "Senior Requester",
                "dateOfBirth": "1955-08-20",
                "gender": "MALE",
                "bloodGroup": "AB+",
                "mobile": "+919876543212",
            },
        }
        res_book = self.client_a.post('/api/appointments/book/', payload, format='json')
        self.assertEqual(res_book.status_code, status.HTTP_201_CREATED)
        ref = res_book.json()['reference']

        # Alice (requester) reschedules appointment
        res_resched = self.client_a.post(f'/api/appointments/{ref}/reschedule/', {
            "appointment_date": str(self.future_date),
            "start_time": "15:00:00",
            "end_time": "15:30:00",
            "reason": "Parent requested later afternoon slot",
        }, format='json')
        self.assertEqual(res_resched.status_code, status.HTTP_200_OK, res_resched.data)
        new_ref = res_resched.json()['reference']

        # Bob (unrelated) cannot cancel Alice's dependent appointment
        res_bob_cancel = self.client_b.post(f'/api/appointments/{new_ref}/cancel/', {
            "reason": "Malicious cancellation attempt",
        }, format='json')
        self.assertEqual(res_bob_cancel.status_code, status.HTTP_404_NOT_FOUND)

        # Alice (requester) cancels the rescheduled appointment
        res_cancel = self.client_a.post(f'/api/appointments/{new_ref}/cancel/', {
            "reason": "Family travel scheduled",
        }, format='json')
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        self.assertEqual(res_cancel.json()['status'], 'CANCELLED')
