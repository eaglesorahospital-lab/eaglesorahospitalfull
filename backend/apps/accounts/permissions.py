"""
Role-Based Access Control (RBAC) Permissions for Hospital Platform.
Supports SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR_STAFF, and PATIENT roles.
"""

from rest_framework import permissions
from .models import User


class IsSuperAdmin(permissions.BasePermission):
    """Allows access only to Super Admin users."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == User.Role.SUPER_ADMIN or request.user.is_superuser)
        )


class IsHospitalAdmin(permissions.BasePermission):
    """Allows access to Hospital Admin users."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.HOSPITAL_ADMIN
        )


class IsDoctorStaff(permissions.BasePermission):
    """Allows access to Doctor / Medical Staff users."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.DOCTOR_STAFF
        )


class IsPatient(permissions.BasePermission):
    """Allows access to Patient users."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.PATIENT
        )


class IsAdminOrHospitalAdmin(permissions.BasePermission):
    """Allows access strictly to Super Admins or Hospital Admins."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role in [User.Role.DOCTOR_STAFF, User.Role.PATIENT]:
            return False
        return bool(
            request.user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN]
            or request.user.is_superuser
        )


class IsStaffOrAdmin(permissions.BasePermission):
    """Allows access to Super Admins, Hospital Admins, or Doctor/Medical Staff."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN, User.Role.DOCTOR_STAFF]
            or request.user.is_staff
            or request.user.is_superuser
        )


class IsAdminUserOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access (GET, HEAD, OPTIONS) to any client.
    Write operations (POST, PUT, PATCH, DELETE) require administrative privileges.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN]
                or request.user.is_superuser
                or request.user.is_staff
            )
        )


class EnforcePasswordChange(permissions.BasePermission):
    """
    Backend-enforced first-login/password-change requirement.
    Blocks normal operational access if the authenticated user has must_change_password=True.
    Requires the user to set a new password before accessing normal portal features.
    """
    message = "Password change required before accessing platform features."
    code = "PASSWORD_CHANGE_REQUIRED"

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return True
        if getattr(request.user, 'must_change_password', False):
            # Exempt auth endpoints so user can set/change password, inspect profile, or logout
            if request.path.startswith('/api/auth/'):
                return True
            return False
        return True


class IsPatientOwnerOrStaff(permissions.BasePermission):
    """
    Object-level permission allowing:
    - Patients to view and update only their own profile / appointments
    - Super Admins and Hospital Admins full operational access
    - Doctor staff strictly access to their own assigned appointments and patients who have seen them
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        # Super Admins and Hospital Admins have full operational access
        if (
            request.user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN]
            or request.user.is_superuser
        ):
            return True

        # Doctor staff restricted strictly to their assigned records
        if request.user.role == User.Role.DOCTOR_STAFF:
            # Check if obj is Appointment
            if hasattr(obj, 'doctor'):
                return bool(obj.doctor and obj.doctor.user == request.user)
            # Check if obj is PatientProfile
            if hasattr(obj, 'appointments'):
                if hasattr(request.user, 'doctor_profile') and request.user.doctor_profile:
                    return obj.appointments.filter(doctor=request.user.doctor_profile).exists()
                return False
            return False

        # Check if obj is PatientProfile
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # Check if obj is Appointment
        if hasattr(obj, 'patient'):
            return obj.patient.user == request.user

        return False


class IsDoctorScheduleOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission for Doctor Schedules, Breaks, Leaves, and Overrides:
    - Super Admins and Hospital Admins have full access.
    - Doctor Staff can ONLY view, create, update, or delete records for their own Doctor profile.
    - Public read-only for safe methods.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN, User.Role.DOCTOR_STAFF]
            or request.user.is_staff
            or request.user.is_superuser
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False
        if (
            request.user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN]
            or request.user.is_superuser
        ):
            return True
        if request.user.role == User.Role.DOCTOR_STAFF:
            doc = getattr(obj, 'doctor', None)
            if not doc and hasattr(obj, 'schedule'):
                doc = getattr(obj.schedule, 'doctor', None)
            return bool(doc and doc.user == request.user)
        return False


class CanManageDoctorMedia(permissions.BasePermission):
    """
    Object-level permission for Doctor profile photo management:
    - Super Admins and Hospital Admins can upload/replace/delete any doctor's photo.
    - Doctor Staff can upload/replace/delete ONLY their own doctor profile photo (object ownership).
    - Patients and unauthenticated users are strictly forbidden (401/403).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN, User.Role.DOCTOR_STAFF]
            or request.user.is_superuser
            or request.user.is_staff
        )

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        # Full administrative management
        if (
            request.user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN]
            or request.user.is_superuser
            or request.user.is_staff
        ):
            return True
        # Doctor staff restricted to their own linked doctor profile
        if request.user.role == User.Role.DOCTOR_STAFF:
            return bool(obj.user and obj.user == request.user)
        return False

