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


class PatientBloodGroupComprehensiveTests(TransactionTestCase):
    """
    Comprehensive verification suite for Patient Blood Group data integrity,
    API serialization, admin views, and appointment booking integration.
    """

    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin_user = User.objects.create_user(
            email="admin.bloodgroup@example.com",
            password="AdminPassword123!",
            first_name="Admin",
            last_name="Staff",
            role=User.Role.HOSPITAL_ADMIN,
            is_staff=True,
        )
        self.admin_token = str(RefreshToken.for_user(self.admin_user).access_token)
        self.admin_client = APIClient()
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")

        # Create Clinical Department & Doctor
        self.dept = Department.objects.create(
            name="General Internal Medicine",
            slug="general-internal-medicine",
            specialty="Internal Medicine",
            short_description="Comprehensive outpatient diagnostic care.",
            full_description="Detailed outpatient diagnostic care and management.",
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

        # Set Doctor schedule for all days
        self.future_date = date.today() + timedelta(days=5)
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

    def test_01_create_patient_with_a_pos(self):
        """1. Create a patient with A+ and verify database and serializer."""
        res = self.admin_client.post('/api/patients/', {
            "first_name": "Arun",
            "last_name": "Kumar",
            "date_of_birth": "1988-03-12",
            "gender": "MALE",
            "phone": "+919876543201",
            "email": "arun.kumar@example.com",
            "blood_group": "A+",
            "address": "12 Lotus Lane, Pune",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['blood_group'], 'A+')

        patient_db = PatientProfile.objects.get(id=res.data['id'])
        self.assertEqual(patient_db.blood_group, 'A+')
        self.assertEqual(patient_db.first_name, 'Arun')

    def test_02_create_patient_with_b_neg(self):
        """2. Create another patient with B- and verify database and serializer."""
        res = self.admin_client.post('/api/patients/', {
            "first_name": "Bhavna",
            "last_name": "Shah",
            "date_of_birth": "1992-07-25",
            "gender": "FEMALE",
            "phone": "+919876543202",
            "email": "bhavna.shah@example.com",
            "blood_group": "B-",
            "address": "45 Park Street, Mumbai",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['blood_group'], 'B-')

        patient_db = PatientProfile.objects.get(id=res.data['id'])
        self.assertEqual(patient_db.blood_group, 'B-')
        self.assertEqual(patient_db.first_name, 'Bhavna')

    def test_03_create_patient_with_o_pos(self):
        """3. Create another patient with O+ and verify database and serializer."""
        res = self.admin_client.post('/api/patients/', {
            "first_name": "Omkar",
            "last_name": "Patil",
            "date_of_birth": "1995-11-05",
            "gender": "MALE",
            "phone": "+919876543203",
            "email": "omkar.patil@example.com",
            "blood_group": "O+",
            "address": "88 Station Road, Nagpur",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['blood_group'], 'O+')

        patient_db = PatientProfile.objects.get(id=res.data['id'])
        self.assertEqual(patient_db.blood_group, 'O+')
        self.assertEqual(patient_db.first_name, 'Omkar')

    def test_04_admin_displays_all_three_distinctly(self):
        """4. Verify that Admin Panel displays all three correctly without hardcoded O+."""
        p1 = PatientProfile.objects.create(
            first_name="Arun",
            last_name="Kumar",
            phone="+919876543201",
            email="arun.kumar@example.com",
            blood_group="A+",
        )
        p2 = PatientProfile.objects.create(
            first_name="Bhavna",
            last_name="Shah",
            phone="+919876543202",
            email="bhavna.shah@example.com",
            blood_group="B-",
        )
        p3 = PatientProfile.objects.create(
            first_name="Omkar",
            last_name="Patil",
            phone="+919876543203",
            email="omkar.patil@example.com",
            blood_group="O+",
        )
        p4 = PatientProfile.objects.create(
            first_name="Dev",
            last_name="Unknown",
            phone="+919876543204",
            email="dev.unknown@example.com",
            blood_group="",  # Not provided
        )

        res = self.admin_client.get('/api/patients/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)

        lookup = {p['id']: p['blood_group'] for p in results}
        self.assertEqual(lookup[p1.id], 'A+')
        self.assertEqual(lookup[p2.id], 'B-')
        self.assertEqual(lookup[p3.id], 'O+')
        self.assertEqual(lookup[p4.id], '')  # Must NOT be falsely forced to 'O+'!

    def test_05_book_appointment_existing_patient_with_saved_blood_group(self):
        """5. Book an appointment for an existing patient and verify their saved blood group appears."""
        patient_user = User.objects.create_user(
            email="priya.sharma@example.com",
            password="SecurePassword123!",
            first_name="Priya",
            last_name="Sharma",
            role=User.Role.PATIENT,
        )
        patient_profile = PatientProfile.objects.create(
            user=patient_user,
            first_name="Priya",
            last_name="Sharma",
            phone="+919876543210",
            email="priya.sharma@example.com",
            blood_group="AB+",
            date_of_birth="1990-04-18",
            gender="FEMALE",
        )

        patient_token = str(RefreshToken.for_user(patient_user).access_token)
        patient_client = APIClient()
        patient_client.credentials(HTTP_AUTHORIZATION=f"Bearer {patient_token}")

        # Book via public/authenticated book endpoint
        res = patient_client.post('/api/appointments/book/', {
            "doctor": self.doctor.id,
            "date": str(self.future_date),
            "start_time": "10:00:00",
            "patient": {
                "fullName": "Priya Sharma",
                "phone": "+919876543210",
                "email": "priya.sharma@example.com",
            },
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        # Verify blood_group in nested patient response
        self.assertIn('patient', res.data)
        self.assertEqual(res.data['patient']['blood_group'], 'AB+')
        self.assertEqual(res.data['patient']['gender'], 'FEMALE')

        # Also verify via Admin appointment detail view
        ref = res.data['reference']
        admin_res = self.admin_client.get(f'/api/appointments/{ref}/')
        self.assertEqual(admin_res.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_res.data['patient']['blood_group'], 'AB+')

    def test_06_update_patient_blood_group_and_verify_persistence(self):
        """6. Update a patient's blood group and verify persistence."""
        patient = PatientProfile.objects.create(
            first_name="Rohan",
            last_name="Mehta",
            phone="+919876543220",
            email="rohan.mehta@example.com",
            blood_group="O-",
        )
        self.assertEqual(patient.blood_group, "O-")

        # Staff updates blood group to A-
        res = self.admin_client.patch(f'/api/patients/{patient.id}/', {
            "blood_group": "A-",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['blood_group'], 'A-')

        # Verify in database
        patient.refresh_from_db()
        self.assertEqual(patient.blood_group, "A-")

        # Patient self-update via /api/patients/me/
        user = User.objects.create_user(
            email="patient.self@example.com",
            password="SecurePassword123!",
            first_name="Self",
            last_name="User",
            role=User.Role.PATIENT,
        )
        patient.user = user
        patient.save(update_fields=['user'])

        user_token = str(RefreshToken.for_user(user).access_token)
        user_client = APIClient()
        user_client.credentials(HTTP_AUTHORIZATION=f"Bearer {user_token}")

        res_self = user_client.patch('/api/patients/me/', {
            "blood_group": "AB-",
        }, format='json')
        self.assertEqual(res_self.status_code, status.HTTP_200_OK, res_self.data)
        self.assertEqual(res_self.data['blood_group'], 'AB-')

        patient.refresh_from_db()
        self.assertEqual(patient.blood_group, "AB-")

    def test_07_invalid_blood_group_rejected_with_400(self):
        """7. Verify invalid blood group (e.g. 'Z+') is rejected with HTTP 400."""
        # A. Via patient create
        res = self.admin_client.post('/api/patients/', {
            "first_name": "Invalid",
            "last_name": "Patient",
            "phone": "+919876543230",
            "email": "invalid@example.com",
            "blood_group": "Z+",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # B. Via appointment booking
        res_booking = self.client.post('/api/appointments/book/', {
            "doctor": self.doctor.id,
            "date": str(self.future_date),
            "start_time": "11:00:00",
            "patient": {
                "fullName": "Test Invalid",
                "phone": "+919876543231",
                "email": "test.invalid@example.com",
                "bloodGroup": "Z+",
            },
        }, format='json')
        self.assertEqual(res_booking.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid blood group", res_booking.data.get("detail", ""))

    def test_08_unauthorized_user_cannot_modify_another_patient(self):
        """8. Verify unauthorized users cannot modify another patient's information."""
        user_a = User.objects.create_user(
            email="patient.a@example.com",
            password="SecurePassword123!",
            role=User.Role.PATIENT,
        )
        patient_a = PatientProfile.objects.create(
            user=user_a,
            first_name="Alice",
            blood_group="A+",
        )

        user_b = User.objects.create_user(
            email="patient.b@example.com",
            password="SecurePassword123!",
            role=User.Role.PATIENT,
        )
        patient_b = PatientProfile.objects.create(
            user=user_b,
            first_name="Bob",
            blood_group="B+",
        )

        token_b = str(RefreshToken.for_user(user_b).access_token)
        client_b = APIClient()
        client_b.credentials(HTTP_AUTHORIZATION=f"Bearer {token_b}")

        # Patient B attempts to update Patient A's blood group
        res = client_b.patch(f'/api/patients/{patient_a.id}/', {
            "blood_group": "O-",
        }, format='json')
        # DRF object-level permission or queryset filtering isolates the patient -> 404 Not Found or 403 Forbidden
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # Verify Patient A's blood group remains untouched
        patient_a.refresh_from_db()
        self.assertEqual(patient_a.blood_group, "A+")

        # Unauthenticated guest attempts to modify via public booking without being authorized
        guest_res = self.client.post('/api/appointments/book/', {
            "doctor": self.doctor.id,
            "date": str(self.future_date),
            "start_time": "14:00:00",
            "patient": {
                "fullName": "Alice Impersonator",
                "phone": "+919876543201",
                "email": user_a.email,  # Attempts to overwrite Patient A
                "bloodGroup": "O-",
            },
        }, format='json')
        # If appointment is created for guest or linked, Patient A's saved blood group must NOT be overwritten by guest!
        patient_a.refresh_from_db()
        self.assertEqual(patient_a.blood_group, "A+")

    def test_09_existing_appointment_booking_still_works(self):
        """9. Verify existing appointment booking works seamlessly with and without blood group."""
        # Booking with standard blood group
        res1 = self.client.post('/api/appointments/book/', {
            "doctor": self.doctor.id,
            "date": str(self.future_date),
            "start_time": "15:00:00",
            "patient": {
                "fullName": "Sunita Verma",
                "phone": "+919876543299",
                "email": "sunita.verma@example.com",
                "gender": "FEMALE",
                "bloodGroup": "O-",
                "reasonForVisit": "Routine cardiac screening",
            },
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED, res1.data)
        self.assertEqual(res1.data['patient']['blood_group'], 'O-')

        # Booking with "Unknown / Not Provided" (empty string)
        res2 = self.client.post('/api/appointments/book/', {
            "doctor": self.doctor.id,
            "date": str(self.future_date),
            "start_time": "15:30:00",
            "patient": {
                "fullName": "Ramesh Unknown",
                "phone": "+919876543298",
                "email": "ramesh.unknown@example.com",
                "gender": "MALE",
                "bloodGroup": "",
                "reasonForVisit": "Follow-up consultation",
            },
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED, res2.data)
        self.assertEqual(res2.data['patient']['blood_group'], '')
