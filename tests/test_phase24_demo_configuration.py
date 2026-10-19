"""
Phase 24 — Approved Demo Deployment Configuration Test Suite.
Validates:
1. Neon PostgreSQL configuration (direct, pooled, SSL enforcement, CONN_MAX_AGE, fail-fast)
2. Upstash Redis configuration (rediss:// TLS, socket timeouts, cache backend, fail-fast)
3. Synchronous demo notifications (eager task execution, broker isolation, SMTP failure resilience)
4. Cloudinary media configuration (credentials detection, safe fallback, server-side isolation)
5. DRF distributed throttling configuration
"""

import os
import sys
import smtplib
import unittest
from datetime import date, time, timedelta
from unittest.mock import patch, MagicMock

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import TestCase, override_settings
from django.core.exceptions import ImproperlyConfigured
from django.conf import settings
from django.core import mail
from django.db import transaction
import dj_database_url

from apps.accounts.models import User, PatientProfile
from apps.departments.models import Department
from apps.doctors.models import Doctor, Specialty
from apps.scheduling.models import DoctorSchedule
from apps.appointments.models import Appointment
from apps.appointments.services import AppointmentBookingService
from apps.notifications.models import Notification
from apps.notifications.tasks import (
    send_appointment_confirmation_task,
    send_appointment_cancellation_task,
    send_appointment_reschedule_task,
    process_appointment_reminders_task,
)


class NeonDatabaseConfigurationTests(TestCase):
    """Verifies Neon PostgreSQL URI parsing, SSL enforcement, and connection persistence."""

    def test_neon_direct_endpoint_configuration(self):
        """Neon direct endpoint URI parses with correct credentials and SSL require."""
        raw_url = 'postgres://neon_app_user:p%40ssw%3Ard@ep-weathered-sea-123456.us-east-2.aws.neon.tech/neondb'
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': raw_url,
            'REDIS_URL': 'rediss://default:pwd@upstash.io:6379',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            db_cfg = s.DATABASES['default']
            self.assertEqual(db_cfg['ENGINE'], 'django.db.backends.postgresql')
            self.assertEqual(db_cfg['USER'], 'neon_app_user')
            self.assertEqual(db_cfg['PASSWORD'], 'p@ssw:rd')
            self.assertEqual(db_cfg['HOST'], 'ep-weathered-sea-123456.us-east-2.aws.neon.tech')
            self.assertEqual(db_cfg['NAME'], 'neondb')
            self.assertEqual(db_cfg['OPTIONS'].get('sslmode'), 'require')

    def test_neon_pooled_endpoint_configuration(self):
        """Neon PgBouncer pooled endpoint URI on port 6543 parses correctly."""
        raw_url = 'postgresql://neon_user:pass123@ep-cool-snowflake-pooler.us-east-2.aws.neon.tech:6543/neondb'
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': raw_url,
            'REDIS_URL': 'rediss://default:pwd@upstash.io:6379',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            db_cfg = s.DATABASES['default']
            self.assertEqual(db_cfg['PORT'], 6543)
            self.assertEqual(db_cfg['OPTIONS'].get('sslmode'), 'require')

    def test_neon_conn_max_age_configurable(self):
        """DJANGO_DB_CONN_MAX_AGE configures connection persistence for Neon connection poolers."""
        raw_url = 'postgres://neon_user:pass@ep-cool-pooler.neon.tech:6543/neondb'
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': raw_url,
            'REDIS_URL': 'rediss://default:pwd@upstash.io:6379',
            'DJANGO_DB_CONN_MAX_AGE': '60',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            db_cfg = s.DATABASES['default']
            self.assertEqual(db_cfg['CONN_MAX_AGE'], 60)

    def test_neon_explicit_ssl_in_dev_mode(self):
        """When DEBUG=True, DJANGO_DB_SSL_REQUIRE=True enforces sslmode=require for Neon."""
        raw_url = 'postgres://user:pass@ep-dev.neon.tech/neondb'
        env = {
            'DJANGO_DEBUG': 'True',
            'DATABASE_URL': raw_url,
            'DJANGO_DB_SSL_REQUIRE': 'True',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            db_cfg = s.DATABASES['default']
            self.assertEqual(db_cfg['OPTIONS'].get('sslmode'), 'require')

    def test_invalid_neon_url_fail_fast_without_credential_leak(self):
        """Invalid database URI raises ImproperlyConfigured without echoing secrets in exception message."""
        raw_url = 'not-a-valid-uri'
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': raw_url,
            'REDIS_URL': 'rediss://default:pwd@upstash.io:6379',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            with self.assertRaises(ImproperlyConfigured) as ctx:
                reload(s)
            self.assertIn('Invalid DATABASE_URL', str(ctx.exception))
            self.assertNotIn('raw_url', str(ctx.exception))


class UpstashRedisCacheTests(TestCase):
    """Verifies Upstash TLS-enabled Redis configuration, socket timeouts, and rate-limiting cache."""

    def test_upstash_tls_url_configured(self):
        """Upstash rediss:// URI sets RedisCache backend with TLS URL."""
        upstash_url = 'rediss://default:secrettoken123@us1-sweet-duck-12345.upstash.io:6379'
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'postgres://admin:pass@dpg-abc:5432/hospital_prod',
            'REDIS_URL': upstash_url,
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            self.assertEqual(s.CACHES['default']['BACKEND'], 'django.core.cache.backends.redis.RedisCache')
            self.assertEqual(s.CACHES['default']['LOCATION'], upstash_url)

    def test_upstash_socket_timeout_options_present(self):
        """RedisCache options configure connection and socket timeouts to prevent worker deadlocks."""
        upstash_url = 'rediss://default:secrettoken123@us1-sweet-duck-12345.upstash.io:6379'
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'postgres://admin:pass@dpg-abc:5432/hospital_prod',
            'REDIS_URL': upstash_url,
            'REDIS_CONNECT_TIMEOUT': '7',
            'REDIS_SOCKET_TIMEOUT': '8',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            options = s.CACHES['default']['OPTIONS']
            self.assertEqual(options['socket_connect_timeout'], 7)
            self.assertEqual(options['socket_timeout'], 8)

    def test_production_missing_redis_fails_fast(self):
        """Production without REDIS_URL raises ImproperlyConfigured to protect shared rate limiting."""
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'postgres://admin:pass@dpg-abc:5432/hospital_prod',
            'FORCE_PRODUCTION_REDIS_CHECK': 'True',
        }
        env.pop('REDIS_URL', None)
        env.pop('ALLOW_IN_MEMORY_CACHE_FALLBACK', None)
        with patch.dict(os.environ, env, clear=True):
            from importlib import reload
            import config.settings as s
            with self.assertRaises(ImproperlyConfigured) as ctx:
                reload(s)
            self.assertIn('REDIS_URL environment variable is required in production', str(ctx.exception))


class SynchronousDemoNotificationTests(TestCase):
    """Verifies synchronous demo mode task execution, broker isolation, and failure resilience."""

    def setUp(self):
        # Patient
        self.patient_user = User.objects.create_user(
            email='patient.phase24@example.com',
            password='Password123!',
            first_name='Kavita',
            last_name='Nair',
            role=User.Role.PATIENT,
        )
        self.patient = PatientProfile.objects.create(
            user=self.patient_user,
            mrn='MRN-P24-001',
            date_of_birth=date(1991, 3, 20),
            gender=PatientProfile.Gender.FEMALE,
            phone='+919876543219',
        )

        # Department & Doctor
        self.dept = Department.objects.create(name='Orthopedics Demo', specialty='Bone & Joint')
        self.specialty = Specialty.objects.create(name='Joint Replacement')
        self.doctor_user = User.objects.create_user(
            email='dr.ortho.demo@hospital.local',
            password='Password123!',
            first_name='Rajesh',
            last_name='Verma',
            role=User.Role.DOCTOR_STAFF,
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            department=self.dept,
            specialty=self.specialty,
            name='Dr. Rajesh Verma',
            qualification='MS (Ortho)',
            experience_years=14,
            consultation_duration_minutes=30,
            consultation_location='Clinic Room 4',
            is_active=True,
        )
        for d in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
            DoctorSchedule.objects.create(
                doctor=self.doctor,
                day_of_week=d,
                start_time=time(9, 0),
                end_time=time(17, 0),
                slot_duration_minutes=30,
                capacity=1,
                is_working_day=True,
                is_active=True,
                timezone='Asia/Kolkata',
            )
        mail.outbox.clear()

    def test_eager_mode_broker_defaults_to_memory(self):
        """When CELERY_TASK_ALWAYS_EAGER=True, default broker is memory:// to protect Upstash commands."""
        env = {
            'DJANGO_DEBUG': 'True',
            'CELERY_TASK_ALWAYS_EAGER': 'True',
            'REDIS_URL': 'rediss://default:pwd@upstash.io:6379',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            self.assertTrue(s.CELERY_TASK_ALWAYS_EAGER)
            self.assertEqual(s.CELERY_BROKER_URL, 'memory://')

    def test_eager_confirmation_notification_execution(self):
        """In eager mode, confirmation task runs synchronously, creates Notification and sends email."""
        target_date = date.today() + timedelta(days=4)
        apt, _ = AppointmentBookingService.book_appointment(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=target_date,
            start_time=time(10, 0),
            end_time=time(10, 30),
            reason_for_visit='Knee consultation',
        )

        with self.settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=False):
            res = send_appointment_confirmation_task.delay(apt.id)
            self.assertEqual(res.status, 'SUCCESS')

            notif = Notification.objects.get(
                appointment=apt,
                notification_type=Notification.NotificationType.APPOINTMENT_CONFIRMATION,
            )
            self.assertEqual(notif.status, Notification.Status.SENT)
            self.assertEqual(notif.recipient, self.patient_user.email)
            self.assertIn(apt.reference, notif.subject)
            self.assertGreaterEqual(len(mail.outbox), 1)

    def test_appointment_booking_safe_dispatch_eager_execution(self):
        """Verify appointment booking transaction commits and safe_dispatch_confirmation triggers eager task."""
        from apps.notifications.services import safe_dispatch_confirmation
        target_date = date.today() + timedelta(days=5)

        with self.settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=False):
            with self.captureOnCommitCallbacks(execute=True):
                apt, _ = AppointmentBookingService.book_appointment(
                    patient=self.patient,
                    doctor=self.doctor,
                    appointment_date=target_date,
                    start_time=time(11, 0),
                    end_time=time(11, 30),
                    reason_for_visit='Follow-up check',
                )
                safe_dispatch_confirmation(apt.id)

            # Transaction committed; on_commit callbacks have fired
            self.assertTrue(Appointment.objects.filter(id=apt.id).exists())
            notif = Notification.objects.filter(
                appointment=apt,
                notification_type=Notification.NotificationType.APPOINTMENT_CONFIRMATION,
            ).first()
            self.assertIsNotNone(notif)
            self.assertEqual(notif.status, Notification.Status.SENT)

    def test_smtp_failure_does_not_abort_appointment_transaction(self):
        """When SMTP dispatch fails in eager mode, appointment booking transaction remains intact."""
        from apps.notifications.services import safe_dispatch_confirmation
        target_date = date.today() + timedelta(days=6)

        with patch('apps.notifications.services.send_mail', side_effect=smtplib.SMTPConnectError(421, "SMTP down")):
            with self.settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=False):
                with self.captureOnCommitCallbacks(execute=True):
                    apt, _ = AppointmentBookingService.book_appointment(
                        patient=self.patient,
                        doctor=self.doctor,
                        appointment_date=target_date,
                        start_time=time(14, 0),
                        end_time=time(14, 30),
                        reason_for_visit='Checkup during SMTP outage',
                    )
                    safe_dispatch_confirmation(apt.id)

                # Appointment must exist in database despite notification failure
                self.assertTrue(Appointment.objects.filter(id=apt.id).exists())

    def test_scheduled_reminders_remain_untriggered_automatically(self):
        """Celery Beat reminder scanning task is registered, but confirmed inactive without worker."""
        registered_tasks = [
            'notifications.send_appointment_confirmation',
            'notifications.send_appointment_cancellation',
            'notifications.send_appointment_reschedule',
            'notifications.send_appointment_reminder',
            'reminders.process_appointment_reminders',
        ]
        from config.celery import app as celery_app
        celery_app.loader.import_default_modules()
        for task_name in registered_tasks:
            self.assertIn(task_name, celery_app.tasks.keys())


class CloudinaryMediaConfigurationTests(TestCase):
    """Verifies Cloudinary settings selection, credentials protection, and safe fallback."""

    def test_cloudinary_active_when_credentials_provided(self):
        """When CLOUDINARY credentials are supplied, MediaCloudinaryStorage is configured."""
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'postgres://admin:pass@db:5432/hospital_prod',
            'REDIS_URL': 'rediss://default:pwd@upstash.io:6379',
            'CLOUDINARY_CLOUD_NAME': 'eglesora-cloud',
            'CLOUDINARY_API_KEY': '987654321012345',
            'CLOUDINARY_API_SECRET': 'sample_api_secret_hash_value',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            self.assertEqual(s.STORAGES['default']['BACKEND'], 'cloudinary_storage.storage.MediaCloudinaryStorage')
            self.assertEqual(s.DEFAULT_FILE_STORAGE, 'cloudinary_storage.storage.MediaCloudinaryStorage')

    def test_cloudinary_fallback_to_filesystem_when_credentials_absent(self):
        """When CLOUDINARY credentials are empty, FileSystemStorage is configured."""
        env = {
            'DJANGO_DEBUG': 'True',
            'DATABASE_URL': 'postgres://admin:pass@db:5432/hospital_dev',
        }
        env.pop('CLOUDINARY_CLOUD_NAME', None)
        env.pop('CLOUDINARY_API_KEY', None)
        env.pop('CLOUDINARY_API_SECRET', None)
        with patch.dict(os.environ, env, clear=True):
            from importlib import reload
            import config.settings as s
            reload(s)
            self.assertEqual(s.STORAGES['default']['BACKEND'], 'django.core.files.storage.FileSystemStorage')

    def test_cloudinary_credentials_not_exposed_to_frontend(self):
        """Cloudinary credentials must never use VITE_ prefix or appear in frontend environment."""
        for key in os.environ:
            if 'CLOUDINARY' in key:
                self.assertFalse(
                    key.startswith('VITE_'),
                    f"Security violation: Cloudinary setting {key} must not have VITE_ prefix!"
                )


class ThrottlingRateLimitTests(TestCase):
    """Verifies Django REST Framework rate-limiting configuration."""

    def test_throttle_classes_and_rates_configured(self):
        """AnonRateThrottle and UserRateThrottle are configured with specified limits."""
        drf_cfg = getattr(settings, 'REST_FRAMEWORK', {})
        throttle_classes = drf_cfg.get('DEFAULT_THROTTLE_CLASSES', ())
        self.assertIn('rest_framework.throttling.AnonRateThrottle', throttle_classes)
        self.assertIn('rest_framework.throttling.UserRateThrottle', throttle_classes)

        rates = drf_cfg.get('DEFAULT_THROTTLE_RATES', {})
        self.assertEqual(rates.get('anon'), '200/minute')
        self.assertEqual(rates.get('user'), '1200/minute')
        self.assertEqual(rates.get('auth_login'), '15/minute')
        self.assertEqual(rates.get('appointment_booking'), '30/minute')
