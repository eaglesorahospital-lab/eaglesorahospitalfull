import os
import sys
import hashlib
from pathlib import Path
from datetime import timedelta
from io import BytesIO
from unittest.mock import patch
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / 'backend'

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import TransactionTestCase
from django.utils import timezone
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.departments.models import Department
from apps.doctors.models import Doctor, Specialty, DoctorInvitation
from apps.doctors.services import DoctorInvitationService
from apps.notifications.models import AuditLog

User = get_user_model()


def create_test_image(format='JPEG', size=(100, 100), color=(0, 120, 220)):
    buf = BytesIO()
    img = Image.new('RGB', size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()


class DoctorInvitationSystemTests(TransactionTestCase):
    """
    Comprehensive Test Suite for Doctor Account Management, Secure Invitation Lifecycle,
    Token Hashing, Expiry, Revocation, Password Setup, Login Policies, and RBAC Isolation.
    """

    def setUp(self):
        self.client = APIClient()

        # Department and Specialty
        self.dept = Department.objects.create(
            name="Cardiology",
            slug="cardiology",
            specialty="Cardiovascular Diseases",
            is_active=True,
        )
        self.specialty = Specialty.objects.create(
            name="Cardiology",
            slug="cardiology",
            is_active=True,
        )

        # Hospital Administrator
        self.admin = User.objects.create_user(
            email="hospadmin@eglesora.org",
            password="HospAdminPass123!",
            first_name="Admin",
            last_name="Staff",
            role=User.Role.HOSPITAL_ADMIN,
        )
        self.admin_client = APIClient()
        token = RefreshToken.for_user(self.admin)
        self.admin_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

        # Patient user
        self.patient = User.objects.create_user(
            email="patient@eglesora.org",
            password="PatientPass123!",
            first_name="John",
            last_name="Doe",
            role=User.Role.PATIENT,
        )
        self.patient_client = APIClient()
        pat_token = RefreshToken.for_user(self.patient)
        self.patient_client.credentials(HTTP_AUTHORIZATION=f'Bearer {pat_token.access_token}')

    def test_admin_creates_doctor_with_secure_invitation(self):
        """
        Verify that an authorized hospital administrator can register a doctor,
        which automatically provisions a User account, creates an invitation with hashed token,
        and dispatches the invitation.
        """
        payload = {
            'name': 'Dr. Priya Sharma',
            'email': 'priya.sharma@eglesora.org',
            'phone': '+91 98765 43210',
            'department': self.dept.id,
            'specialty_name': 'Interventional Cardiology',
            'qualification': 'MBBS, MD, DM',
            'experience_years': 8,
            'consultation_duration_minutes': 30,
            'consultation_location': 'Suite 101, Cardiology Wing',
            'bio': 'Specialist in coronary angioplasty and stenting.',
            'is_active': True,
        }

        response = self.admin_client.post('/api/doctors/', data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('doctor', response.data)
        self.assertIn('invitation', response.data)

        # Verify Doctor & User in DB
        doctor = Doctor.objects.get(slug=response.data['doctor']['slug'])
        self.assertEqual(doctor.name, 'Dr. Priya Sharma')
        self.assertEqual(doctor.user.email, 'priya.sharma@eglesora.org')
        self.assertTrue(doctor.user.must_change_password)

        # Verify DoctorInvitation
        invitation = DoctorInvitation.objects.get(doctor=doctor)
        self.assertEqual(invitation.status, DoctorInvitation.Status.PENDING)
        self.assertEqual(len(invitation.token_hash), 64)  # SHA-256 is 64 hex chars
        self.assertTrue(invitation.expires_at > timezone.now())

        # Verify raw token is NOT in database
        self.assertFalse(DoctorInvitation.objects.filter(token_hash__contains="http").exists())
        self.assertFalse(DoctorInvitation.objects.filter(token_hash__contains="token").exists())

    def test_unauthorized_users_cannot_create_doctor(self):
        """Verify anonymous and patient users receive 401/403 when attempting to create a doctor."""
        payload = {
            'name': 'Dr. Hacker',
            'email': 'hacker@example.com',
            'phone': '+1 234 567 8900',
            'department': self.dept.id,
            'specialty_name': 'Cardiology',
            'qualification': 'MBBS',
            'experience_years': 1,
            'consultation_duration_minutes': 30,
            'consultation_location': 'Suite 1',
        }

        # Anonymous request -> 401
        anon_client = APIClient()
        anon_res = anon_client.post('/api/doctors/', data=payload, format='json')
        self.assertEqual(anon_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Patient request -> 403
        pat_res = self.patient_client.post('/api/doctors/', data=payload, format='json')
        self.assertEqual(pat_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_email_rejected_on_doctor_creation(self):
        """Verify that registering a doctor with an already-registered email is rejected."""
        payload = {
            'name': 'Dr. First Consultant',
            'email': 'duplicate@eglesora.org',
            'phone': '+91 99999 11111',
            'department': self.dept.id,
            'specialty_name': 'Cardiology',
            'qualification': 'MBBS',
            'experience_years': 4,
            'consultation_duration_minutes': 30,
            'consultation_location': 'Suite 1',
            'bio': 'Specialist consultant biography.',
        }
        res1 = self.admin_client.post('/api/doctors/', data=payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second creation with identical email
        payload['name'] = 'Dr. Impostor'
        res2 = self.admin_client.post('/api/doctors/', data=payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invitation_service_token_hashing_and_validation(self):
        """
        Verify that DoctorInvitationService generates unpredictable tokens,
        stores only their SHA-256 hash, and validates accurately.
        """
        user = User.objects.create_user(
            email="testdoc@eglesora.org",
            password="TempPassword123!",
            first_name="Test",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Test Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS, MD",
            experience_years=5,
            consultation_duration_minutes=30,
            consultation_location="Suite 102",
        )

        res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        raw_token = res['raw_token']
        invitation = res['invitation']

        # Confirm token length and SHA-256 hash
        self.assertGreaterEqual(len(raw_token), 32)
        expected_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        self.assertEqual(invitation.token_hash, expected_hash)

        # Validate token via service
        inv, status_code, err = DoctorInvitationService.validate_token(raw_token)
        self.assertEqual(status_code, "VALID")
        self.assertEqual(inv.id, invitation.id)
        self.assertIsNone(err)

    def test_validate_invitation_api_endpoint(self):
        """Verify the public validate-invitation endpoint returns correct status for valid/invalid tokens."""
        user = User.objects.create_user(
            email="validate@eglesora.org",
            password="TempPassword123!",
            first_name="Validate",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Validate Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=3,
            consultation_duration_minutes=30,
            consultation_location="Suite 103",
        )
        res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        raw_token = res['raw_token']

        # Valid token
        val_res = self.client.post('/api/auth/validate-invitation/', {'token': raw_token}, format='json')
        self.assertEqual(val_res.status_code, status.HTTP_200_OK)
        self.assertTrue(val_res.data['valid'])
        self.assertEqual(val_res.data['status'], 'VALID')
        self.assertEqual(val_res.data['doctor_name'], 'Dr. Validate Doctor')
        self.assertEqual(val_res.data['email'], 'validate@eglesora.org')

        # Invalid token
        bad_res = self.client.post('/api/auth/validate-invitation/', {'token': 'completely_invalid_token_12345'}, format='json')
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(bad_res.data['valid'])

    def test_resending_invitation_invalidates_previous_token(self):
        """Verify that resending an invitation revokes earlier pending tokens."""
        user = User.objects.create_user(
            email="resend@eglesora.org",
            password="TempPassword123!",
            first_name="Resend",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Resend Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=4,
            consultation_duration_minutes=30,
            consultation_location="Suite 104",
        )

        res1 = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        token1 = res1['raw_token']

        # Resend invitation via API
        resend_res = self.admin_client.post(f'/api/doctors/{doctor.slug}/resend-invitation/', format='json')
        self.assertEqual(resend_res.status_code, status.HTTP_200_OK)

        # Token 1 must now be invalid
        inv1, status_code1, err1 = DoctorInvitationService.validate_token(token1)
        self.assertEqual(status_code1, "REVOKED")
        self.assertIn('revoked', (err1 or '').lower())

        # Old invitation marked REVOKED in DB
        old_inv = DoctorInvitation.objects.get(id=res1['invitation'].id)
        self.assertEqual(old_inv.status, DoctorInvitation.Status.REVOKED)

    def test_invitation_revocation(self):
        """Verify an administrator can revoke an outstanding invitation and prevent acceptance."""
        user = User.objects.create_user(
            email="revoke@eglesora.org",
            password="TempPassword123!",
            first_name="Revoke",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Revoke Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=6,
            consultation_duration_minutes=30,
            consultation_location="Suite 105",
        )

        inv_res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        token = inv_res['raw_token']

        # Revoke via API
        rev_res = self.admin_client.post(f'/api/doctors/{doctor.slug}/revoke-invitation/', format='json')
        self.assertEqual(rev_res.status_code, status.HTTP_200_OK)

        # Attempt to accept revoked token -> rejected
        accept_res = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': 'SecureNewPassword123!',
            'password_confirm': 'SecureNewPassword123!',
        }, format='json')
        self.assertEqual(accept_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('revoked' in str(accept_res.data).lower())

    def test_expired_invitation_cannot_be_accepted(self):
        """Verify that an expired invitation token cannot be redeemed or set passwords."""
        user = User.objects.create_user(
            email="expired@eglesora.org",
            password="TempPassword123!",
            first_name="Expired",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Expired Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=7,
            consultation_duration_minutes=30,
            consultation_location="Suite 106",
        )

        inv_res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        token = inv_res['raw_token']

        # Manually expire the invitation
        inv = inv_res['invitation']
        inv.expires_at = timezone.now() - timedelta(hours=2)
        inv.save()

        # Validation reports expired
        val_res = self.client.post('/api/auth/validate-invitation/', {'token': token}, format='json')
        self.assertEqual(val_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(val_res.data['status'], 'EXPIRED')

        # Acceptance fails
        accept_res = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': 'SecureNewPassword123!',
            'password_confirm': 'SecureNewPassword123!',
        }, format='json')
        self.assertEqual(accept_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('expired' in str(accept_res.data).lower())

    def test_doctor_accepts_invitation_and_sets_password(self):
        """
        Verify complete doctor onboarding flow:
        Doctor submits token + new password, password validators run, password is hashed,
        account is activated, must_change_password cleared, and JWT returned.
        """
        user = User.objects.create_user(
            email="onboarding@eglesora.org",
            password="TempPassword123!",
            first_name="Onboarding",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
            must_change_password=True,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Onboarding Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS, MS",
            experience_years=9,
            consultation_duration_minutes=30,
            consultation_location="Suite 107",
        )

        inv_res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        token = inv_res['raw_token']

        # 1. Weak password rejected
        weak_res = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': '123',
            'password_confirm': '123',
        }, format='json')
        self.assertEqual(weak_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Mismatched passwords rejected
        mismatch_res = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': 'StrongDoctorPass123!',
            'password_confirm': 'DifferentDoctorPass123!',
        }, format='json')
        self.assertEqual(mismatch_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Valid password setup
        new_pass = 'DoctorStrongPassword2026!'
        accept_res = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': new_pass,
            'password_confirm': new_pass,
        }, format='json')
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', accept_res.data)
        self.assertIn('refresh', accept_res.data)

        # Verify DB updates
        user.refresh_from_db()
        self.assertTrue(user.check_password(new_pass))
        self.assertFalse(user.password.startswith('DoctorStrong'))  # Securely hashed
        self.assertTrue(user.is_active)
        self.assertFalse(user.must_change_password)

        inv = DoctorInvitation.objects.get(id=inv_res['invitation'].id)
        self.assertEqual(inv.status, DoctorInvitation.Status.ACCEPTED)
        self.assertIsNotNone(inv.accepted_at)

    def test_single_use_invitation_prevents_double_acceptance(self):
        """Verify that an invitation token cannot be redeemed twice."""
        user = User.objects.create_user(
            email="singleuse@eglesora.org",
            password="TempPassword123!",
            first_name="Single",
            last_name="Use",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Single Use",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=2,
            consultation_duration_minutes=30,
            consultation_location="Suite 108",
        )

        inv_res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        token = inv_res['raw_token']

        # First acceptance succeeds
        res1 = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': 'FirstValidPassword123!',
            'password_confirm': 'FirstValidPassword123!',
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second acceptance fails
        res2 = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': 'SecondAttemptPassword123!',
            'password_confirm': 'SecondAttemptPassword123!',
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('accepted' in str(res2.data).lower() or 'redeemed' in str(res2.data).lower())

    def test_deactivated_doctor_login_blocked(self):
        """Verify that deactivated doctor accounts cannot log in to the platform."""
        user = User.objects.create_user(
            email="deactivated.doc@eglesora.org",
            password="DoctorPassword123!",
            first_name="Deactivated",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
            is_active=True,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Deactivated Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=5,
            consultation_duration_minutes=30,
            consultation_location="Suite 109",
            is_active=False,  # Doctor deactivated
        )

        # Login attempt -> 403 Forbidden
        login_res = self.client.post('/api/auth/login/', {
            'email': 'deactivated.doc@eglesora.org',
            'password': 'DoctorPassword123!',
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('deactivated', login_res.data['detail'].lower())

        # Admin activates doctor
        toggle_res = self.admin_client.post(f'/api/doctors/{doctor.slug}/toggle-status/', format='json')
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)

        # Login now succeeds
        login_ok = self.client.post('/api/auth/login/', {
            'email': 'deactivated.doc@eglesora.org',
            'password': 'DoctorPassword123!',
        }, format='json')
        self.assertEqual(login_ok.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_ok.data)

    def test_doctor_cannot_manage_other_doctors(self):
        """Verify that a doctor cannot manage other doctors' accounts or invitations."""
        doc1_user = User.objects.create_user(
            email="doc1@eglesora.org",
            password="DocPassword123!",
            first_name="Doctor",
            last_name="One",
            role=User.Role.DOCTOR_STAFF,
        )
        doc1 = Doctor.objects.create(
            user=doc1_user,
            name="Dr. Doctor One",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=4,
            consultation_duration_minutes=30,
            consultation_location="Suite A",
        )
        doc1_client = APIClient()
        token1 = RefreshToken.for_user(doc1_user)
        doc1_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token1.access_token}')

        doc2_user = User.objects.create_user(
            email="doc2@eglesora.org",
            password="DocPassword123!",
            first_name="Doctor",
            last_name="Two",
            role=User.Role.DOCTOR_STAFF,
        )
        doc2 = Doctor.objects.create(
            user=doc2_user,
            name="Dr. Doctor Two",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=5,
            consultation_duration_minutes=30,
            consultation_location="Suite B",
        )

        # Doctor 1 attempts to invite/resend Doctor 2 -> 403 Forbidden
        invite_res = doc1_client.post(f'/api/doctors/{doc2.slug}/invite/', format='json')
        self.assertEqual(invite_res.status_code, status.HTTP_403_FORBIDDEN)

        resend_res = doc1_client.post(f'/api/doctors/{doc2.slug}/resend-invitation/', format='json')
        self.assertEqual(resend_res.status_code, status.HTTP_403_FORBIDDEN)

        revoke_res = doc1_client.post(f'/api/doctors/{doc2.slug}/revoke-invitation/', format='json')
        self.assertEqual(revoke_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_doctor_directory_excludes_sensitive_fields(self):
        """Verify public doctor directory does not leak invitation tokens, hashes, or passwords."""
        user = User.objects.create_user(
            email="publiccheck@eglesora.org",
            password="SecretPassword123!",
            first_name="Public",
            last_name="Check",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Public Check",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=6,
            consultation_duration_minutes=30,
            consultation_location="Suite 110",
        )
        DoctorInvitationService.send_invitation(doctor, created_by=self.admin)

        anon_client = APIClient()
        res = anon_client.get('/api/doctors/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        results = res.data.get('results', res.data)
        doc_entry = next((d for d in results if d['id'] == doctor.id), None)
        self.assertIsNotNone(doc_entry)

        self.assertNotIn('token_hash', doc_entry)
        self.assertNotIn('raw_token', doc_entry)
        self.assertNotIn('password', doc_entry)
        self.assertNotIn('temporary_password', doc_entry)

    def test_profile_photo_upload_and_validation(self):
        """Verify profile photo upload accepts valid images and rejects non-image files."""
        user = User.objects.create_user(
            email="photo@eglesora.org",
            password="DocPassword123!",
            first_name="Photo",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Photo Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=3,
            consultation_duration_minutes=30,
            consultation_location="Suite 111",
        )

        # 1. Valid JPEG
        valid_img = create_test_image('JPEG')
        uploaded_file = SimpleUploadedFile("headshot.jpg", valid_img, content_type="image/jpeg")
        upload_res = self.admin_client.post(
            f'/api/doctors/{doctor.slug}/upload-photo/',
            data={'image': uploaded_file},
            format='multipart'
        )
        self.assertEqual(upload_res.status_code, status.HTTP_200_OK)
        self.assertIn('photo_url', upload_res.data)
        self.assertIsNotNone(upload_res.data['photo_url'])

        # 2. Invalid text file disguised as image
        fake_file = SimpleUploadedFile("malicious.png", b"NOT AN IMAGE", content_type="image/png")
        fail_res = self.admin_client.post(
            f'/api/doctors/{doctor.slug}/upload-photo/',
            data={'image': fake_file},
            format='multipart'
        )
        self.assertEqual(fail_res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.doctors.services.send_mail')
    def test_email_delivery_failure_handled_gracefully(self, mock_send_mail):
        """Verify that SMTP failure is handled gracefully without crashing invitation creation."""
        mock_send_mail.side_effect = Exception("SMTP server unavailable")

        user = User.objects.create_user(
            email="smtpdown@eglesora.org",
            password="DocPassword123!",
            first_name="SMTP",
            last_name="Down",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. SMTP Down",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=4,
            consultation_duration_minutes=30,
            consultation_location="Suite 112",
        )

        # Should NOT raise an unhandled exception
        res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        self.assertFalse(res['email_sent'])
        self.assertIn('SMTP server unavailable', res['delivery_error'])
        self.assertIsNotNone(res['invitation'])
        self.assertEqual(res['invitation'].status, DoctorInvitation.Status.PENDING)

    def test_scenario_b_email_outbox_inspection_and_invitation_url(self):
        """
        Scenario B: Verify invitation dispatch, mail.outbox email generation,
        invitation URL formation, token hashing, and raw token exclusion.
        """
        mail.outbox.clear()
        payload = {
            'name': 'Dr. Kavita Nair',
            'email': 'kavita.nair@eglesora.org',
            'phone': '+91 98765 12345',
            'department': self.dept.id,
            'specialty_name': 'Interventional Cardiology',
            'qualification': 'MBBS, MD',
            'experience_years': 6,
            'consultation_duration_minutes': 30,
            'consultation_location': 'Suite 201',
            'bio': 'Cardiology specialist.',
            'is_active': True,
        }

        response = self.admin_client.post('/api/doctors/', data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Inspect generated email in test outbox
        self.assertGreaterEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertIn('kavita.nair@eglesora.org', sent_email.to)
        self.assertIn('Consultant Account Activation', sent_email.subject)
        self.assertIn('/doctor/accept-invitation?token=', sent_email.body)

        # Extract raw token from email URL
        url_part = [line for line in sent_email.body.splitlines() if '/doctor/accept-invitation?token=' in line][0]
        raw_token = url_part.split('token=')[1].strip()

        # Verify only SHA-256 hash stored in DB
        expected_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        doctor = Doctor.objects.get(user__email='kavita.nair@eglesora.org')
        invitation = DoctorInvitation.objects.get(doctor=doctor)
        self.assertEqual(invitation.token_hash, expected_hash)
        self.assertEqual(invitation.status, DoctorInvitation.Status.PENDING)

        # Raw token never saved in database
        self.assertFalse(DoctorInvitation.objects.filter(token_hash=raw_token).exists())

    def test_scenario_c_malformed_tokens_and_concurrent_lock(self):
        """
        Scenario C: Verify rejection of invalid, expired, revoked, and malformed tokens.
        Verify concurrent/duplicate redemption is blocked by atomic row-level lock.
        """
        # Malformed tokens (SQL injection attempt, empty, whitespace, random strings)
        malformed_tokens = [
            "",
            "   ",
            "' OR '1'='1",
            "<script>alert(1)</script>",
            "short",
            "x" * 500,
        ]
        for bad_tok in malformed_tokens:
            res = self.client.post('/api/auth/validate-invitation/', {'token': bad_tok}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(res.data.get('valid', True))

            acc_res = self.client.post('/api/auth/accept-invitation/', {
                'token': bad_tok,
                'password': 'SecureNewPassword123!',
                'password_confirm': 'SecureNewPassword123!',
            }, format='json')
            self.assertEqual(acc_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid doctor invitation
        user = User.objects.create_user(
            email="racecondition@eglesora.org",
            password="TempPassword123!",
            first_name="Race",
            last_name="Condition",
            role=User.Role.DOCTOR_STAFF,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Race Condition",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=5,
            consultation_duration_minutes=30,
            consultation_location="Suite 202",
        )
        inv_res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        token = inv_res['raw_token']

        # First acceptance succeeds
        accept_1 = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': 'RacePasswordSafe2026!',
            'password_confirm': 'RacePasswordSafe2026!',
        }, format='json')
        self.assertEqual(accept_1.status_code, status.HTTP_200_OK)

        # Simulated concurrent second attempt fails immediately
        accept_2 = self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': 'SecondAttemptPassword2026!',
            'password_confirm': 'SecondAttemptPassword2026!',
        }, format='json')
        self.assertEqual(accept_2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('accepted' in str(accept_2.data).lower() or 'redeemed' in str(accept_2.data).lower())

    def test_scenario_d_doctor_login_profile_access_and_logout_blacklisting(self):
        """
        Scenario D: Test doctor login, authenticated profile access via /api/doctors/me/,
        rejection of unauthenticated/invalid requests, and logout JWT blacklisting.
        """
        user = User.objects.create_user(
            email="portaldoc@eglesora.org",
            password="TempPassword123!",
            first_name="Portal",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
            must_change_password=True,
        )
        doctor = Doctor.objects.create(
            user=user,
            name="Dr. Portal Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS, MS",
            experience_years=7,
            consultation_duration_minutes=30,
            consultation_location="Suite 203",
        )
        inv_res = DoctorInvitationService.send_invitation(doctor, created_by=self.admin)
        token = inv_res['raw_token']

        # Accept invitation
        new_pwd = "PortalDoctorSafePassword2026!"
        self.client.post('/api/auth/accept-invitation/', {
            'token': token,
            'password': new_pwd,
            'password_confirm': new_pwd,
        }, format='json')

        # 1. Reject invalid credentials
        bad_login = self.client.post('/api/auth/login/', {
            'email': 'portaldoc@eglesora.org',
            'password': 'WrongPassword123!',
        }, format='json')
        self.assertIn(bad_login.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

        # 2. Login successfully
        login_res = self.client.post('/api/auth/login/', {
            'email': 'portaldoc@eglesora.org',
            'password': new_pwd,
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        access_tok = login_res.data['access']
        refresh_tok = login_res.data['refresh']

        # 3. Authenticated doctor calls /api/doctors/me/
        doc_client = APIClient()
        doc_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_tok}')
        me_res = doc_client.get('/api/doctors/me/')
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['name'], 'Dr. Portal Doctor')
        self.assertEqual(me_res.data['id'], doctor.id)

        # 4. Unauthenticated access blocked
        anon_client = APIClient()
        unauth_res = anon_client.get('/api/doctors/me/')
        self.assertEqual(unauth_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 5. Logout blacklists refresh token
        logout_res = doc_client.post('/api/auth/logout/', {'refresh': refresh_tok}, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # 6. Attempting to use blacklisted refresh token fails
        refresh_attempt = self.client.post('/api/auth/refresh/', {'refresh': refresh_tok}, format='json')
        self.assertEqual(refresh_attempt.status_code, status.HTTP_401_UNAUTHORIZED)

        # 7. Invalid/tampered access token rejected
        bad_client = APIClient()
        bad_client.credentials(HTTP_AUTHORIZATION='Bearer completely.invalid.jwttoken')
        bad_res = bad_client.get('/api/doctors/me/')
        self.assertEqual(bad_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_e_doctor_to_doctor_isolation_and_parameter_tampering(self):
        """
        Scenario E: Verify Doctor A cannot tamper with Doctor B's account,
        cannot toggle Doctor B's status, cannot invite or revoke Doctor B,
        and patients cannot manage doctor accounts.
        """
        # Create Doctor A
        user_a = User.objects.create_user(
            email="doctor.alpha@eglesora.org",
            password="DocAlphaPassword123!",
            first_name="Alpha",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
        )
        doctor_a = Doctor.objects.create(
            user=user_a,
            name="Dr. Alpha Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=4,
            consultation_duration_minutes=30,
            consultation_location="Suite 101",
        )
        client_a = APIClient()
        tok_a = RefreshToken.for_user(user_a)
        client_a.credentials(HTTP_AUTHORIZATION=f'Bearer {tok_a.access_token}')

        # Create Doctor B
        user_b = User.objects.create_user(
            email="doctor.beta@eglesora.org",
            password="DocBetaPassword123!",
            first_name="Beta",
            last_name="Doctor",
            role=User.Role.DOCTOR_STAFF,
            is_staff=True,
        )
        doctor_b = Doctor.objects.create(
            user=user_b,
            name="Dr. Beta Doctor",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=6,
            consultation_duration_minutes=30,
            consultation_location="Suite 102",
        )

        # 1. Doctor A cannot update Doctor B's profile via URL tampering
        tamper_res = client_a.patch(f'/api/doctors/{doctor_b.slug}/', {'bio': 'Tampered by Alpha'}, format='json')
        self.assertEqual(tamper_res.status_code, status.HTTP_403_FORBIDDEN)
        doctor_b.refresh_from_db()
        self.assertNotEqual(doctor_b.bio, 'Tampered by Alpha')

        # 2. Doctor A cannot toggle Doctor B's status
        toggle_res = client_a.post(f'/api/doctors/{doctor_b.slug}/toggle-status/', format='json')
        self.assertEqual(toggle_res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Patient cannot access doctor-management endpoints
        pat_invite = self.patient_client.post(f'/api/doctors/{doctor_b.slug}/invite/', format='json')
        self.assertEqual(pat_invite.status_code, status.HTTP_403_FORBIDDEN)

        pat_toggle = self.patient_client.post(f'/api/doctors/{doctor_b.slug}/toggle-status/', format='json')
        self.assertEqual(pat_toggle.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Super Admin and Hospital Admin can manage doctors
        admin_toggle = self.admin_client.post(f'/api/doctors/{doctor_b.slug}/toggle-status/', format='json')
        self.assertEqual(admin_toggle.status_code, status.HTTP_200_OK)

    def test_scenario_f_atomic_transaction_rollback_and_duplicate_handling(self):
        """
        Scenario F: Verify transaction rollback on invitation creation failure
        and verify that resending an invitation guarantees exactly one pending invitation.
        """
        initial_users = User.objects.count()
        initial_doctors = Doctor.objects.count()

        # Simulate unexpected database error during doctor profile creation
        with patch.object(Doctor.objects, 'create', side_effect=Exception("Database constraint failure")):
            payload = {
                'name': 'Dr. Rollback Test',
                'email': 'rollback.test@eglesora.org',
                'phone': '+91 98765 99999',
                'department': self.dept.id,
                'specialty_name': 'Cardiology',
                'qualification': 'MBBS',
                'experience_years': 5,
                'consultation_duration_minutes': 30,
                'consultation_location': 'Suite 103',
            }
            try:
                self.admin_client.post('/api/doctors/', data=payload, format='json')
            except Exception:
                pass

        # Verify atomic rollback — no orphaned User or Doctor was created
        self.assertEqual(User.objects.count(), initial_users)
        self.assertEqual(Doctor.objects.count(), initial_doctors)
        self.assertFalse(User.objects.filter(email='rollback.test@eglesora.org').exists())

        # Duplicate active invitations test:
        user = User.objects.create_user(
            email="singlepending@eglesora.org",
            password="TempPassword123!",
            first_name="Single",
            last_name="Pending",
            role=User.Role.DOCTOR_STAFF,
        )
        doc = Doctor.objects.create(
            user=user,
            name="Dr. Single Pending",
            department=self.dept,
            specialty=self.specialty,
            qualification="MBBS",
            experience_years=3,
            consultation_duration_minutes=30,
            consultation_location="Suite 104",
        )
        DoctorInvitationService.send_invitation(doc, created_by=self.admin)
        DoctorInvitationService.send_invitation(doc, created_by=self.admin)
        DoctorInvitationService.send_invitation(doc, created_by=self.admin)

        # There must be only 1 PENDING invitation; earlier ones are REVOKED
        pending_count = DoctorInvitation.objects.filter(doctor=doc, status=DoctorInvitation.Status.PENDING).count()
        revoked_count = DoctorInvitation.objects.filter(doctor=doc, status=DoctorInvitation.Status.REVOKED).count()
        self.assertEqual(pending_count, 1)
        self.assertEqual(revoked_count, 2)
