"""
Unit tests for the setup_staff_accounts management command.
Validates:
1. Hospital Administrator can be provisioned without requiring an INITIAL_DOCTOR_PASSWORD.
2. --admin-only and --skip-doctor flags skip doctor provisioning.
3. Repeated deployments do not reset existing passwords unless --reset-passwords is used.
4. Doctor account is created when a valid INITIAL_DOCTOR_PASSWORD (>= 8 chars) is provided.
5. CommandError is raised when INITIAL_DOCTOR_PASSWORD is too short (< 8 chars).
6. CommandError is raised when --require-doctor is passed but no password is provided.
7. Initial admin provisioning requires an admin password (>= 8 chars).
"""

import os
from io import StringIO
from unittest.mock import patch, MagicMock

from django.test import SimpleTestCase
from django.core.management import call_command
from django.core.management.base import CommandError


class SetupStaffAccountsCommandUnitTests(SimpleTestCase):
    def setUp(self):
        self.admin_email = "test.admin@hospital.org"
        self.doctor_email = "test.doctor@hospital.org"
        self.out = StringIO()

    def _setup_common_mocks(self, mock_group, mock_perm):
        mock_group_obj = MagicMock()
        mock_group.get_or_create.return_value = (mock_group_obj, True)
        mock_perms_qs = MagicMock()
        mock_perms_qs.count.return_value = 12
        mock_perm.filter.return_value = mock_perms_qs

    @patch("django.db.transaction.atomic")
    @patch("django.contrib.auth.models.Permission.objects")
    @patch("django.contrib.auth.models.Group.objects")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_admin_created_without_doctor_password(self, mock_user, mock_group, mock_perm, mock_atomic):
        """Admin is created successfully without failing when INITIAL_DOCTOR_PASSWORD is not set."""
        mock_user.Role.HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
        mock_user.Role.DOCTOR_STAFF = "DOCTOR_STAFF"
        mock_user.objects.filter.return_value.first.return_value = None  # User does not exist

        mock_created_admin = MagicMock()
        mock_created_admin.role = "HOSPITAL_ADMIN"
        mock_user.objects.create_user.return_value = mock_created_admin
        self._setup_common_mocks(mock_group, mock_perm)

        env = {"INITIAL_ADMIN_PASSWORD": "AdminSecurePassword123!"}
        with patch.dict(os.environ, env, clear=True):
            call_command(
                "setup_staff_accounts",
                admin_email=self.admin_email,
                doctor_email=self.doctor_email,
                stdout=self.out,
            )

        # Admin must be created with HOSPITAL_ADMIN role and is_staff=True
        mock_user.objects.create_user.assert_called_once_with(
            email=self.admin_email,
            password="AdminSecurePassword123!",
            first_name="Hospital",
            last_name="Administrator",
            role="HOSPITAL_ADMIN",
            is_staff=True,
            is_active=True,
        )

        output = self.out.getvalue()
        self.assertIn("[CREATED] Administrator account created", output)
        self.assertIn("[SKIPPED] Initial doctor staff account", output)
        self.assertIn("Staff accounts provisioning procedure completed safely", output)

    @patch("django.db.transaction.atomic")
    @patch("django.contrib.auth.models.Permission.objects")
    @patch("django.contrib.auth.models.Group.objects")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_admin_only_flag_skips_doctor(self, mock_user, mock_group, mock_perm, mock_atomic):
        """--admin-only flag explicitly skips doctor provisioning even if doctor password is in env."""
        mock_user.Role.HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
        mock_user.Role.DOCTOR_STAFF = "DOCTOR_STAFF"
        mock_user.objects.filter.return_value.first.return_value = None

        mock_created_admin = MagicMock()
        mock_created_admin.role = "HOSPITAL_ADMIN"
        mock_user.objects.create_user.return_value = mock_created_admin
        self._setup_common_mocks(mock_group, mock_perm)

        env = {
            "INITIAL_ADMIN_PASSWORD": "AdminSecurePassword123!",
            "INITIAL_DOCTOR_PASSWORD": "DoctorPassword123!",
        }
        with patch.dict(os.environ, env, clear=True):
            call_command(
                "setup_staff_accounts",
                admin_email=self.admin_email,
                doctor_email=self.doctor_email,
                admin_only=True,
                stdout=self.out,
            )

        # Only one user created (admin), doctor was not created
        self.assertEqual(mock_user.objects.create_user.call_count, 1)
        self.assertIn("[SKIPPED] Doctor account provisioning skipped", self.out.getvalue())

    @patch("django.db.transaction.atomic")
    @patch("django.contrib.auth.models.Permission.objects")
    @patch("django.contrib.auth.models.Group.objects")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_skip_doctor_flag(self, mock_user, mock_group, mock_perm, mock_atomic):
        """--skip-doctor flag explicitly skips doctor provisioning."""
        mock_user.Role.HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
        mock_user.Role.DOCTOR_STAFF = "DOCTOR_STAFF"
        mock_user.objects.filter.return_value.first.return_value = None

        mock_created_admin = MagicMock()
        mock_created_admin.role = "HOSPITAL_ADMIN"
        mock_user.objects.create_user.return_value = mock_created_admin
        self._setup_common_mocks(mock_group, mock_perm)

        env = {"INITIAL_ADMIN_PASSWORD": "AdminSecurePassword123!"}
        with patch.dict(os.environ, env, clear=True):
            call_command(
                "setup_staff_accounts",
                admin_email=self.admin_email,
                doctor_email=self.doctor_email,
                skip_doctor=True,
                stdout=self.out,
            )

        self.assertEqual(mock_user.objects.create_user.call_count, 1)
        self.assertIn("[SKIPPED] Doctor account provisioning skipped", self.out.getvalue())

    @patch("django.db.transaction.atomic")
    @patch("django.contrib.auth.models.Permission.objects")
    @patch("django.contrib.auth.models.Group.objects")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_repeated_deployment_preserves_existing_password(self, mock_user, mock_group, mock_perm, mock_atomic):
        """Repeated runs preserve existing credentials without unexpectedly resetting password."""
        mock_user.Role.HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
        mock_user.Role.DOCTOR_STAFF = "DOCTOR_STAFF"

        existing_admin = MagicMock()
        existing_admin.role = "HOSPITAL_ADMIN"
        existing_admin.is_staff = True
        mock_user.objects.filter.return_value.first.side_effect = [existing_admin, None]
        self._setup_common_mocks(mock_group, mock_perm)

        env = {"INITIAL_ADMIN_PASSWORD": "NewUnwantedPassword123!"}
        with patch.dict(os.environ, env, clear=True):
            call_command(
                "setup_staff_accounts",
                admin_email=self.admin_email,
                doctor_email=self.doctor_email,
                stdout=self.out,
            )

        # set_password must NOT be called on existing admin when reset_passwords is False
        existing_admin.set_password.assert_not_called()
        self.assertIn("[EXISTS] Administrator account", self.out.getvalue())
        self.assertIn("Preserving existing credentials", self.out.getvalue())

    @patch("django.db.transaction.atomic")
    @patch("django.contrib.auth.models.Permission.objects")
    @patch("django.contrib.auth.models.Group.objects")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_reset_passwords_flag_updates_password(self, mock_user, mock_group, mock_perm, mock_atomic):
        """When --reset-passwords is used, existing admin password is intentionally updated."""
        mock_user.Role.HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
        mock_user.Role.DOCTOR_STAFF = "DOCTOR_STAFF"

        existing_admin = MagicMock()
        existing_admin.role = "HOSPITAL_ADMIN"
        existing_admin.is_staff = True
        mock_user.objects.filter.return_value.first.side_effect = [existing_admin, None]
        self._setup_common_mocks(mock_group, mock_perm)

        env = {"INITIAL_ADMIN_PASSWORD": "NewResetPassword123!"}
        with patch.dict(os.environ, env, clear=True):
            call_command(
                "setup_staff_accounts",
                admin_email=self.admin_email,
                doctor_email=self.doctor_email,
                reset_passwords=True,
                stdout=self.out,
            )

        existing_admin.set_password.assert_called_once_with("NewResetPassword123!")
        existing_admin.save.assert_called_once()
        self.assertIn("[RESET]", self.out.getvalue())

    @patch("apps.doctors.models.Doctor.objects")
    @patch("django.db.transaction.atomic")
    @patch("django.contrib.auth.models.Permission.objects")
    @patch("django.contrib.auth.models.Group.objects")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_doctor_created_when_password_provided(self, mock_user, mock_group, mock_perm, mock_atomic, mock_doc):
        """Doctor is created when INITIAL_DOCTOR_PASSWORD is provided."""
        mock_user.Role.HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
        mock_user.Role.DOCTOR_STAFF = "DOCTOR_STAFF"
        mock_user.objects.filter.return_value.first.return_value = None  # Neither user exists

        mock_admin = MagicMock()
        mock_admin.role = "HOSPITAL_ADMIN"
        mock_doctor = MagicMock()
        mock_doctor.role = "DOCTOR_STAFF"
        mock_user.objects.create_user.side_effect = [mock_admin, mock_doctor]
        self._setup_common_mocks(mock_group, mock_perm)
        mock_doc.filter.return_value.first.return_value = None

        env = {
            "INITIAL_ADMIN_PASSWORD": "AdminSecurePassword123!",
            "INITIAL_DOCTOR_PASSWORD": "DoctorSecurePassword123!",
        }
        with patch.dict(os.environ, env, clear=True):
            call_command(
                "setup_staff_accounts",
                admin_email=self.admin_email,
                doctor_email=self.doctor_email,
                stdout=self.out,
            )

        self.assertEqual(mock_user.objects.create_user.call_count, 2)
        mock_user.objects.create_user.assert_any_call(
            email=self.doctor_email,
            password="DoctorSecurePassword123!",
            first_name="Rajesh",
            last_name="Varma",
            role="DOCTOR_STAFF",
            is_staff=True,
            is_active=True,
        )
        self.assertIn("[CREATED] Doctor staff account created", self.out.getvalue())

    @patch("django.db.transaction.atomic")
    @patch("django.contrib.auth.models.Permission.objects")
    @patch("django.contrib.auth.models.Group.objects")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_doctor_password_too_short_raises_command_error(self, mock_user, mock_group, mock_perm, mock_atomic):
        """When INITIAL_DOCTOR_PASSWORD is provided but too short (<8), raises CommandError."""
        mock_user.Role.HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
        mock_user.Role.DOCTOR_STAFF = "DOCTOR_STAFF"
        mock_user.objects.filter.return_value.first.return_value = None

        mock_admin = MagicMock()
        mock_admin.role = "HOSPITAL_ADMIN"
        mock_user.objects.create_user.return_value = mock_admin
        self._setup_common_mocks(mock_group, mock_perm)

        env = {
            "INITIAL_ADMIN_PASSWORD": "AdminSecurePassword123!",
            "INITIAL_DOCTOR_PASSWORD": "short",
        }
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    "setup_staff_accounts",
                    admin_email=self.admin_email,
                    doctor_email=self.doctor_email,
                    stdout=self.out,
                )
            self.assertIn("Doctor password must be at least 8 characters", str(ctx.exception))

    @patch("django.db.transaction.atomic")
    @patch("django.contrib.auth.models.Permission.objects")
    @patch("django.contrib.auth.models.Group.objects")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_require_doctor_flag_without_password_raises_command_error(self, mock_user, mock_group, mock_perm, mock_atomic):
        """When --require-doctor is set and no doctor password is provided, raises CommandError."""
        mock_user.Role.HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
        mock_user.Role.DOCTOR_STAFF = "DOCTOR_STAFF"
        mock_user.objects.filter.return_value.first.return_value = None

        mock_admin = MagicMock()
        mock_admin.role = "HOSPITAL_ADMIN"
        mock_user.objects.create_user.return_value = mock_admin
        self._setup_common_mocks(mock_group, mock_perm)

        env = {
            "INITIAL_ADMIN_PASSWORD": "AdminSecurePassword123!",
        }
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    "setup_staff_accounts",
                    admin_email=self.admin_email,
                    doctor_email=self.doctor_email,
                    require_doctor=True,
                    stdout=self.out,
                )
            self.assertIn("Set INITIAL_DOCTOR_PASSWORD environment variable", str(ctx.exception))

    @patch("django.db.transaction.atomic")
    @patch("apps.accounts.management.commands.setup_staff_accounts.User")
    def test_missing_admin_password_for_new_admin_raises_command_error(self, mock_user, mock_atomic):
        """When creating a new admin and no password is provided, raises CommandError."""
        mock_user.objects.filter.return_value.first.return_value = None

        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    "setup_staff_accounts",
                    admin_email=self.admin_email,
                    stdout=self.out,
                )
            self.assertIn("Administrator password must be at least 8 characters", str(ctx.exception))
