import hashlib
import secrets
from datetime import timedelta
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify
from django.conf import settings
try:
    from django.test.testcases import DatabaseOperationForbidden
except ImportError:
    class DatabaseOperationForbidden(Exception):
        pass


class Specialty(models.Model):
    """
    Medical specialty categorization (e.g. Cardiology, Neurology, Orthopedics).
    """
    name = models.CharField(_('specialty name'), max_length=150, unique=True)
    slug = models.SlugField(_('url slug'), max_length=150, unique=True, db_index=True)
    description = models.TextField(_('description'), blank=True)
    is_active = models.BooleanField(_('active status'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('specialty')
        verbose_name_plural = _('specialties')
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(str(self.name))
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return str(self.name)


class Doctor(models.Model):
    """
    Doctor / Consultant profile with clinical qualifications, departmental privileges,
    and consultation parameters.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='doctor_profile',
        null=True,
        blank=True,
        help_text=_('Associated staff user account for platform login.'),
    )
    name = models.CharField(_('full name with title'), max_length=200)
    slug = models.SlugField(_('url slug'), max_length=200, unique=True, db_index=True)
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='doctors',
        help_text=_('Primary clinical department.'),
    )
    specialty = models.ForeignKey(
        Specialty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctors',
        help_text=_('Primary clinical specialty area.'),
    )
    specialty_name = models.CharField(
        _('specialty display text'),
        max_length=150,
        blank=True,
        help_text=_('Denormalized or custom specialty label, e.g. Cardiology.'),
    )
    qualification = models.CharField(
        _('academic qualifications'),
        max_length=300,
        help_text=_('e.g. MBBS, MD (General Medicine), DM (Cardiology)'),
    )
    experience_years = models.PositiveIntegerField(
        _('years of hospital experience'),
        default=5,
    )
    bio = models.TextField(_('professional biography'))
    expertise = models.TextField(
        _('clinical areas of expertise'),
        blank=True,
        help_text=_('Comma-separated or multiline list of core clinical proficiencies.'),
    )
    consultation_type = models.CharField(
        _('consultation modality'),
        max_length=100,
        default='In-person Consultation',
    )
    consultation_duration_minutes = models.PositiveIntegerField(
        _('standard slot duration (minutes)'),
        default=30,
    )
    consultation_location = models.CharField(
        _('OPD suite / consulting room location'),
        max_length=200,
        help_text=_('e.g. Cardiology OPD, Wing B, 2nd Floor, Suite 204'),
    )
    image = models.ImageField(
        _('profile photograph'),
        upload_to='doctors/',
        null=True,
        blank=True,
        help_text=_('Media storage image compatible with Cloudinary.'),
    )
    image_public_id = models.CharField(
        _('cloudinary public id'),
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Cloudinary asset public ID for secure deletion and replacement.'),
    )
    is_active = models.BooleanField(_('active status'), default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def photo_url(self):
        if not self.image:
            return None
        val = str(self.image)
        if val.startswith('http://') or val.startswith('https://'):
            return val
        try:
            return self.image.url
        except Exception:
            return val

    @property
    def latest_invitation(self):
        return self.invitations.order_by('-created_at').first()

    @property
    def invitation_status(self):
        inv = self.latest_invitation
        if not inv:
            return 'NONE'
        if inv.status == DoctorInvitation.Status.PENDING and inv.is_expired:
            return 'EXPIRED'
        return inv.status

    @property
    def account_lifecycle_status(self):
        if not self.is_active:
            return 'DEACTIVATED'
        if not self.user or not self.user.is_active:
            inv_stat = self.invitation_status
            if inv_stat in ['PENDING', 'NONE', 'EXPIRED', 'REVOKED']:
                return 'INVITATION_PENDING'
            return 'INACTIVE'
        return 'ACTIVE'

    class Meta:
        verbose_name = _('doctor')
        verbose_name_plural = _('doctors')
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or 'doctor'
            slug = base_slug
            counter = 1
            try:
                while Doctor.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
            except DatabaseOperationForbidden:
                # SimpleTestCase explicitly disallows database queries during offline unit tests
                pass
            self.slug = slug
        if self.specialty and not self.specialty_name:
            self.specialty_name = self.specialty.name
        super().save(*args, **kwargs)

    def __str__(self):
        try:
            dept_str = f" - {self.department.name}" if getattr(self, 'department_id', None) and self.department else ""
        except Exception:
            dept_str = ""
        return f"{self.name} ({self.specialty_name or 'General'}){dept_str}"


class DoctorInvitation(models.Model):
    """
    Cryptographically secure, single-use doctor onboarding invitation.
    Stores only the SHA-256 hash of the token in the database.
    The raw token is delivered strictly via secure email or direct admin provision,
    never stored in database records or application logs.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        ACCEPTED = 'ACCEPTED', _('Accepted')
        EXPIRED = 'EXPIRED', _('Expired')
        REVOKED = 'REVOKED', _('Revoked')

    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='invitations',
        help_text=_('Doctor profile associated with this invitation.'),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_invitations',
        help_text=_('User account associated with this doctor profile.'),
    )
    email = models.EmailField(_('invited email address'), db_index=True)
    token_hash = models.CharField(
        _('sha-256 token hash'),
        max_length=64,
        unique=True,
        db_index=True,
        help_text=_('Cryptographic SHA-256 digest of the raw invitation token.'),
    )
    status = models.CharField(
        _('invitation status'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    expires_at = models.DateTimeField(_('expiry timestamp'), db_index=True)
    accepted_at = models.DateTimeField(_('accepted timestamp'), null=True, blank=True)
    revoked_at = models.DateTimeField(_('revoked timestamp'), null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issued_doctor_invitations',
        help_text=_('Administrator who issued this invitation.'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('doctor invitation')
        verbose_name_plural = _('doctor invitations')
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation for {self.email} ({self.status}) - expires {self.expires_at}"

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_active(self):
        return self.status == self.Status.PENDING and not self.is_expired

    @classmethod
    def hash_token(cls, raw_token: str) -> str:
        """Computes deterministic SHA-256 hex digest of raw token."""
        return hashlib.sha256(raw_token.strip().encode('utf-8')).hexdigest()

    @classmethod
    def create_invitation(cls, doctor, created_by=None, expiry_hours=None):
        """
        Atomically revokes any existing PENDING invitations for this doctor,
        generates an unpredictable cryptographic token, stores its SHA-256 hash,
        and returns the (invitation_instance, raw_token) tuple.
        """
        from django.conf import settings
        from django.db import transaction

        if expiry_hours is None:
            expiry_hours = getattr(settings, 'DOCTOR_INVITATION_EXPIRY_HOURS', 48)

        now = timezone.now()
        with transaction.atomic():
            cls.objects.filter(
                doctor=doctor,
                status=cls.Status.PENDING
            ).update(
                status=cls.Status.REVOKED,
                revoked_at=now,
                updated_at=now,
            )

            raw_token = secrets.token_urlsafe(32)
            token_hash = cls.hash_token(raw_token)
            expires_at = now + timedelta(hours=expiry_hours)

            invitation = cls.objects.create(
                doctor=doctor,
                user=doctor.user,
                email=doctor.user.email if doctor.user else '',
                token_hash=token_hash,
                status=cls.Status.PENDING,
                expires_at=expires_at,
                created_by=created_by,
            )

        return invitation, raw_token
