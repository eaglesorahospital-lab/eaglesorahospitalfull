"""
Doctor Account Onboarding & Secure Invitation Service.
Handles cryptographically secure invitation token generation, SHA-256 storage,
email notification delivery, token validation, revocation, and atomic single-use acceptance.
"""

import logging
import secrets
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from django.db import transaction
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Doctor, DoctorInvitation
from apps.notifications.models import AuditLog

logger = logging.getLogger('hospital.doctors')


class DoctorInvitationService:
    """
    Central business service for doctor onboarding invitations:
    - Token generation (32-byte cryptographic random URL-safe token)
    - Token storage (only SHA-256 hash stored in PostgreSQL)
    - Email delivery with professional branded hospital template
    - Expiration and revocation management
    - Atomic token redemption and account activation
    """

    @classmethod
    def get_frontend_base_url(cls, request=None) -> str:
        """
        Determines the correct public frontend URL from environment settings or request.
        """
        configured_url = getattr(settings, 'FRONTEND_URL', None) or getattr(settings, 'FRONTEND_BASE_URL', None)
        if configured_url:
            return configured_url.rstrip('/')

        if request:
            origin = request.META.get('HTTP_ORIGIN')
            if origin:
                # Validate origin is in CORS_ALLOWED_ORIGINS
                allowed = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
                if origin in allowed:
                    return origin.rstrip('/')

        # Default fallback for local development
        return 'http://localhost:5173'

    @classmethod
    def send_invitation(cls, doctor: Doctor, created_by=None, request=None, expiry_hours=None) -> dict:
        """
        Generates a secure invitation, stores its SHA-256 hash, and sends an invitation email.
        Never persists or logs the raw token.
        """
        if not doctor.user or not doctor.user.email:
            raise ValidationError({"email": "Doctor must have an associated email address to receive an invitation."})

        email = doctor.user.email.strip().lower()

        # Create invitation record (atomically revokes previous pending invitations)
        invitation, raw_token = DoctorInvitation.create_invitation(
            doctor=doctor,
            created_by=created_by,
            expiry_hours=expiry_hours,
        )

        frontend_url = cls.get_frontend_base_url(request)
        setup_url = f"{frontend_url}/doctor/accept-invitation?token={raw_token}"

        # Calculate expiry window string for email
        hours = expiry_hours or getattr(settings, 'DOCTOR_INVITATION_EXPIRY_HOURS', 48)
        expiry_display = f"{hours} hours ({invitation.expires_at.strftime('%Y-%m-%d %H:%M UTC')})"

        # Create email body
        hospital_name = "EgleSora Hospital"
        subject = f"Welcome to {hospital_name} — Consultant Account Activation"

        text_message = (
            f"Dear {doctor.name},\n\n"
            f"You have been invited by hospital administration to activate your consultant staff account at {hospital_name}.\n\n"
            f"Department: {doctor.department.name if doctor.department else 'Clinical Care'}\n"
            f"Specialty: {doctor.specialty_name or 'General Consultant'}\n"
            f"Username / Registered Email: {email}\n\n"
            f"Please use the following secure link to set up your password and access your consultant portal:\n"
            f"{setup_url}\n\n"
            f"Security Notice:\n"
            f"- This single-use invitation link expires in {expiry_display}.\n"
            f"- For security, do not forward this email or share your link.\n"
            f"- If you did not anticipate this invitation, please contact hospital IT security immediately.\n\n"
            f"Warm regards,\n"
            f"{hospital_name} Medical Administration & Information Security"
        )

        html_message = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; color: #1f2937; margin: 0; padding: 24px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }}
    .header {{ background: #0f4c3a; color: #ffffff; padding: 28px 32px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }}
    .body {{ padding: 32px; font-size: 15px; line-height: 1.6; }}
    .card {{ background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 24px; margin: 20px 0; }}
    .card-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }}
    .card-row:last-child {{ margin-bottom: 0; }}
    .card-label {{ color: #6b7280; font-weight: 600; }}
    .btn-container {{ text-align: center; margin: 28px 0; }}
    .btn {{ display: inline-block; background-color: #16845b; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }}
    .security-notice {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #92400e; margin-top: 24px; }}
    .footer {{ background: #f9fafb; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{hospital_name}</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.85; font-size: 13px;">Medical Staff Credentialing & Portal Access</p>
    </div>
    <div class="body">
      <h2 style="font-size: 18px; margin-top: 0; color: #111827;">Consultant Account Activation</h2>
      <p>Dear {doctor.name},</p>
      <p>Hospital Administration has provisioned your consultant staff credentials for the {hospital_name} clinical platform.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">Doctor Name:</span> <span>{doctor.name}</span></div>
        <div class="card-row"><span class="card-label">Department:</span> <span>{doctor.department.name if doctor.department else 'Clinical Care'}</span></div>
        <div class="card-row"><span class="card-label">Specialty:</span> <span>{doctor.specialty_name or 'General Consultant'}</span></div>
        <div class="card-row"><span class="card-label">Registered Email:</span> <span>{email}</span></div>
      </div>
      <p>Please activate your account and establish your secure password using the button below:</p>
      <div class="btn-container">
        <a href="{setup_url}" class="btn" target="_blank" rel="noopener noreferrer">Activate Consultant Account</a>
      </div>
      <p style="font-size: 13px; color: #6b7280;">If the button above does not open, copy and paste this URL into your browser:<br>
      <a href="{setup_url}" style="color: #16845b; word-break: break-all;">{setup_url}</a></p>
      <div class="security-notice">
        <strong>Security Notice:</strong> This invitation is single-use and will expire in <strong>{expiry_display}</strong>. If you did not anticipate this invitation, please report it to hospital security.
      </div>
    </div>
    <div class="footer">
      &copy; {timezone.now().year} {hospital_name}. All rights reserved. Confidential Healthcare Communication.
    </div>
  </div>
</body>
</html>
"""

        email_sent = False
        error_msg = None
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hospitalplatform.local')

        try:
            send_mail(
                subject=subject,
                message=text_message,
                from_email=from_email,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
            email_sent = True
            logger.info(
                f"Doctor invitation email sent successfully to {email} for Doctor ID {doctor.id}."
            )
        except Exception as exc:
            error_msg = str(exc)
            logger.warning(
                f"Doctor invitation email delivery failed for {email} (Doctor ID {doctor.id}): {error_msg}"
            )

        # Record audit log without ever logging raw token
        actor_user = created_by or (request.user if request and request.user.is_authenticated else None)
        AuditLog.objects.create(
            actor=actor_user,
            actor_name=actor_user.get_full_name() or actor_user.email if actor_user else "Hospital Administration",
            role=getattr(actor_user, 'role', 'HOSPITAL_ADMIN'),
            action="DOCTOR_INVITATION_SENT",
            resource_type="DoctorInvitation",
            resource_id=str(invitation.id),
            result=AuditLog.Result.SUCCESS if email_sent else AuditLog.Result.WARNING,
            details=(
                f"Invitation sent to consultant {doctor.name} ({email}). "
                f"Status: {invitation.status}, Delivery: {'Success' if email_sent else 'Failed: ' + str(error_msg)}"
            ),
            metadata={
                "doctor_id": doctor.id,
                "doctor_slug": doctor.slug,
                "email": email,
                "invitation_id": invitation.id,
                "expires_at": invitation.expires_at.isoformat(),
                "email_sent": email_sent,
            },
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
        )

        return {
            "invitation": invitation,
            "raw_token": raw_token,
            "setup_url": setup_url,
            "email_sent": email_sent,
            "delivery_error": error_msg,
        }

    @classmethod
    def resend_invitation(cls, doctor: Doctor, created_by=None, request=None, expiry_hours=None) -> dict:
        """
        Resends an invitation to a doctor:
        Invalidates any earlier pending invitation and creates/sends a fresh token.
        """
        result = cls.send_invitation(
            doctor=doctor,
            created_by=created_by,
            request=request,
            expiry_hours=expiry_hours,
        )

        actor_user = created_by or (request.user if request and request.user.is_authenticated else None)
        AuditLog.objects.create(
            actor=actor_user,
            actor_name=actor_user.get_full_name() or actor_user.email if actor_user else "Hospital Administration",
            role=getattr(actor_user, 'role', 'HOSPITAL_ADMIN'),
            action="DOCTOR_INVITATION_RESENT",
            resource_type="DoctorInvitation",
            resource_id=str(result['invitation'].id),
            result=AuditLog.Result.SUCCESS,
            details=f"Admin resent onboarding invitation for consultant {doctor.name} ({doctor.user.email}).",
            metadata={
                "doctor_id": doctor.id,
                "invitation_id": result['invitation'].id,
            },
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
        )

        return result

    @classmethod
    def revoke_invitation(cls, doctor: Doctor, revoked_by=None, request=None) -> int:
        """
        Revokes any outstanding pending invitation for this doctor.
        """
        now = timezone.now()
        with transaction.atomic():
            pending_invitations = DoctorInvitation.objects.filter(
                doctor=doctor,
                status=DoctorInvitation.Status.PENDING,
            )
            count = pending_invitations.count()
            if count > 0:
                pending_invitations.update(
                    status=DoctorInvitation.Status.REVOKED,
                    revoked_at=now,
                    updated_at=now,
                )

        actor_user = revoked_by or (request.user if request and request.user.is_authenticated else None)
        AuditLog.objects.create(
            actor=actor_user,
            actor_name=actor_user.get_full_name() or actor_user.email if actor_user else "Hospital Administration",
            role=getattr(actor_user, 'role', 'HOSPITAL_ADMIN'),
            action="DOCTOR_INVITATION_REVOKED",
            resource_type="Doctor",
            resource_id=str(doctor.id),
            result=AuditLog.Result.SUCCESS,
            details=f"Revoked {count} pending invitation(s) for doctor {doctor.name}.",
            metadata={"doctor_id": doctor.id, "revoked_count": count},
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
        )

        return count

    @classmethod
    def validate_token(cls, raw_token: str) -> tuple[DoctorInvitation | None, str, str | None]:
        """
        Verifies token validity using constant-time hash comparison:
        Returns (invitation, status_code, message)
        Possible status_code: 'VALID', 'INVALID', 'EXPIRED', 'REVOKED', 'ACCEPTED'
        """
        if not raw_token or not isinstance(raw_token, str):
            return None, "INVALID", "Invalid or missing invitation token."

        token_hash = DoctorInvitation.hash_token(raw_token)
        invitation = DoctorInvitation.objects.select_related('doctor', 'user', 'doctor__department').filter(
            token_hash=token_hash
        ).first()

        if not invitation:
            return None, "INVALID", "Invalid or unverified invitation token."

        # Constant-time comparison to protect against timing attacks
        if not secrets.compare_digest(invitation.token_hash, token_hash):
            return None, "INVALID", "Invalid or unverified invitation token."

        if invitation.status == DoctorInvitation.Status.REVOKED:
            return invitation, "REVOKED", "This invitation has been revoked by hospital administration."

        if invitation.status == DoctorInvitation.Status.ACCEPTED:
            return invitation, "ACCEPTED", "This invitation has already been accepted and redeemed."

        if invitation.is_expired:
            if invitation.status == DoctorInvitation.Status.PENDING:
                invitation.status = DoctorInvitation.Status.EXPIRED
                invitation.save(update_fields=['status', 'updated_at'])
            return invitation, "EXPIRED", "This invitation link has expired. Please contact administration for a new invitation."

        return invitation, "VALID", None

    @classmethod
    def accept_invitation(cls, raw_token: str, password: str, password_confirm: str, request=None) -> dict:
        """
        Redeems an invitation, applies password validation, sets the new password,
        activates the doctor user account, marks the invitation ACCEPTED,
        and returns authenticated JWT tokens.
        Strictly protected against race conditions via database select_for_update.
        """
        if not password or not password_confirm:
            raise ValidationError({"password": "Both password and confirmation password are required."})

        if password != password_confirm:
            raise ValidationError({"password_confirm": "Password fields do not match."})

        invitation, status_code, error_message = cls.validate_token(raw_token)
        if status_code != "VALID" or not invitation:
            raise ValidationError({"token": error_message or "Invalid invitation token."})

        user = invitation.user
        if not user:
            raise ValidationError({"token": "No associated user account found for this invitation."})

        # Validate password against Django configured validators
        try:
            password_validation.validate_password(password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"password": list(exc.messages)})

        now = timezone.now()

        # Atomic transaction with row-level lock (select_for_update) to prevent race condition double redemption
        with transaction.atomic():
            locked_invitation = DoctorInvitation.objects.select_for_update().filter(
                id=invitation.id
            ).first()

            if not locked_invitation or locked_invitation.status != DoctorInvitation.Status.PENDING:
                raise ValidationError({"token": "This invitation has already been redeemed or revoked."})

            if locked_invitation.is_expired:
                locked_invitation.status = DoctorInvitation.Status.EXPIRED
                locked_invitation.save(update_fields=['status', 'updated_at'])
                raise ValidationError({"token": "This invitation link has expired."})

            # Update and activate User
            user.set_password(password)
            user.is_active = True
            user.must_change_password = False
            user.save(update_fields=['password', 'is_active', 'must_change_password', 'updated_at'])

            # Mark doctor profile active if previously inactive
            doctor = locked_invitation.doctor
            if doctor and not doctor.is_active:
                doctor.is_active = True
                doctor.save(update_fields=['is_active', 'updated_at'])

            # Mark invitation ACCEPTED
            locked_invitation.status = DoctorInvitation.Status.ACCEPTED
            locked_invitation.accepted_at = now
            locked_invitation.save(update_fields=['status', 'accepted_at', 'updated_at'])

            # Record AuditLog
            AuditLog.objects.create(
                actor=user,
                actor_name=user.get_full_name() or user.email,
                role=user.role,
                action="DOCTOR_INVITATION_ACCEPTED",
                resource_type="DoctorInvitation",
                resource_id=str(locked_invitation.id),
                result=AuditLog.Result.SUCCESS,
                details=f"Doctor {doctor.name if doctor else user.email} successfully accepted invitation and established password.",
                metadata={
                    "doctor_id": doctor.id if doctor else None,
                    "user_id": user.id,
                    "email": user.email,
                },
                ip_address=request.META.get('REMOTE_ADDR') if request else None,
            )

        # Generate authenticated JWT tokens
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email

        return {
            "message": "Consultant account activated successfully! Welcome to EgleSora Hospital.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name() or user.email,
                "role": user.role,
                "doctor_slug": doctor.slug if doctor else None,
                "doctor_id": doctor.id if doctor else None,
                "must_change_password": False,
            },
            "doctor": {
                "id": doctor.id if doctor else None,
                "slug": doctor.slug if doctor else None,
                "name": doctor.name if doctor else user.get_full_name(),
                "specialty": doctor.specialty_name if doctor else None,
            }
        }
