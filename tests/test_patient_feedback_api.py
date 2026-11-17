import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.hospital.models import PatientFeedback

User = get_user_model()


class PatientFeedbackApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@eaglesora.test',
            username='admin_test',
            password='Password123!',
            role='SUPER_ADMIN',
            is_staff=True,
        )

        # Create hospital admin user
        self.hospital_admin = User.objects.create_user(
            email='hospadmin@eaglesora.test',
            username='hospadmin_test',
            password='Password123!',
            role='HOSPITAL_ADMIN',
            is_staff=True,
        )

        # Create patient user
        self.patient_user = User.objects.create_user(
            email='patient@eaglesora.test',
            username='patient_test',
            password='Password123!',
            role='PATIENT',
        )

        # Create doctor staff user
        self.doctor_user = User.objects.create_user(
            email='doctor@eaglesora.test',
            username='doctor_test',
            password='Password123!',
            role='DOCTOR_STAFF',
        )

    def test_public_feedback_submission_success(self):
        """Phase 2: Patients and visitors can submit valid feedback anonymously."""
        payload = {
            'patient_name': 'Meera Sen',
            'email': 'meera.sen@example.com',
            'phone': '+91 98221 00001',
            'category': 'CLINICAL_CARE',
            'rating': 5,
            'message': 'Outstanding attention and compassionate care in cardiology.',
        }
        res = self.client.post('/api/feedback/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['patient_name'], 'Meera Sen')
        self.assertEqual(res.data['rating'], 5)

        # Verify database record
        fb = PatientFeedback.objects.get(id=res.data['id'])
        self.assertEqual(fb.status, 'NEW')
        self.assertEqual(fb.category, 'CLINICAL_CARE')

    def test_invalid_rating_rejected(self):
        """Phase 2: Rating outside 1-5 is rejected with 400 Bad Request."""
        payload = {
            'patient_name': 'Aarav Kumar',
            'email': 'aarav@example.com',
            'rating': 6,  # Invalid (> 5)
            'category': 'GENERAL',
            'message': 'Very nice service.',
        }
        res = self.client.post('/api/feedback/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rating', res.data)

        # Negative rating rejected
        payload['rating'] = 0
        res = self.client.post('/api/feedback/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_short_message_rejected(self):
        """Phase 2: Empty or too short message is rejected."""
        payload = {
            'patient_name': 'Aarav Kumar',
            'email': 'aarav@example.com',
            'rating': 4,
            'category': 'GENERAL',
            'message': 'Hi',
        }
        res = self.client.post('/api/feedback/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('message', res.data)

    def test_unauthorized_user_cannot_view_feedback(self):
        """Phase 3: Anonymous and patient users cannot read the feedback registry."""
        # Anonymous GET
        res = self.client.get('/api/feedback/')
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # Patient authenticated GET
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.get('/api/feedback/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Doctor authenticated GET
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.get('/api/feedback/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_and_filter_feedback(self):
        """Phase 3: Administrators can view and filter the feedback registry."""
        # Seed test feedback
        fb1 = PatientFeedback.objects.create(
            patient_name='Patient Alpha',
            email='alpha@example.com',
            category='BILLING',
            rating=2,
            message='Billing process took over 45 minutes.',
            status='NEW',
        )
        fb2 = PatientFeedback.objects.create(
            patient_name='Patient Beta',
            email='beta@example.com',
            category='CLINICAL_CARE',
            rating=5,
            message='Doctor explained everything clearly.',
            status='REVIEWED',
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/feedback/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 2)

        # Filter by status=NEW
        res_new = self.client.get('/api/feedback/?status=NEW')
        self.assertEqual(res_new.status_code, status.HTTP_200_OK)
        self.assertEqual(res_new.data['count'], 1)
        self.assertEqual(res_new.data['results'][0]['patient_name'], 'Patient Alpha')

        # Filter by category=CLINICAL_CARE
        res_cat = self.client.get('/api/feedback/?category=CLINICAL_CARE')
        self.assertEqual(res_cat.status_code, status.HTTP_200_OK)
        self.assertEqual(res_cat.data['count'], 1)
        self.assertEqual(res_cat.data['results'][0]['patient_name'], 'Patient Beta')

    def test_admin_mark_as_reviewed(self):
        """Phase 3 & 4: Admin can mark feedback as reviewed with notes."""
        fb = PatientFeedback.objects.create(
            patient_name='Rahul Verma',
            email='rahul@example.com',
            category='FACILITY_CLEANLINESS',
            rating=3,
            message='Waiting lounge AC was not functioning well.',
            status='NEW',
        )

        self.client.force_authenticate(user=self.hospital_admin)
        res = self.client.post(
            f'/api/feedback/{fb.id}/mark-reviewed/',
            {'admin_notes': 'Maintenance team dispatched to inspect AC unit.'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        fb.refresh_from_db()
        self.assertEqual(fb.status, 'REVIEWED')
        self.assertEqual(fb.reviewed_by, self.hospital_admin)
        self.assertIsNotNone(fb.reviewed_at)
        self.assertEqual(fb.admin_notes, 'Maintenance team dispatched to inspect AC unit.')

    def test_feedback_summary_metrics(self):
        """Phase 3: Summary endpoint provides aggregated metrics."""
        PatientFeedback.objects.create(
            patient_name='P1', email='p1@test.com', category='GENERAL', rating=5, message='Great', status='REVIEWED'
        )
        PatientFeedback.objects.create(
            patient_name='P2', email='p2@test.com', category='GENERAL', rating=3, message='Okay', status='NEW'
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/feedback/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total'], 2)
        self.assertEqual(res.data['new'], 1)
        self.assertEqual(res.data['reviewed'], 1)
        self.assertEqual(res.data['average_rating'], 4.0)
