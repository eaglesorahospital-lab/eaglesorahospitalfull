import re
from rest_framework import serializers
from .models import Specialty, Doctor, DoctorInvitation
from apps.departments.models import Department
from apps.accounts.models import User


class SpecialtySerializer(serializers.ModelSerializer):
    """
    Clinical medical specialty serializer.
    """
    class Meta:
        model = Specialty
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at']


class DoctorDepartmentSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight department serializer for doctor responses.
    """
    class Meta:
        model = Department
        fields = ['id', 'name', 'slug', 'location', 'opd_hours']


class DoctorSpecialtySummarySerializer(serializers.ModelSerializer):
    """
    Lightweight specialty serializer for doctor responses.
    """
    class Meta:
        model = Specialty
        fields = ['id', 'name', 'slug']


class DoctorListSerializer(serializers.ModelSerializer):
    """
    Doctor catalog card summary serializer for listings, search, and directory filters.
    """
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_slug = serializers.CharField(source='department.slug', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    photo_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    image_public_id = serializers.CharField(read_only=True)
    invitation_status = serializers.CharField(read_only=True)
    account_lifecycle_status = serializers.CharField(read_only=True)
    user_is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    latest_invitation_sent_at = serializers.SerializerMethodField()
    latest_invitation_expires_at = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            'id',
            'name',
            'slug',
            'email',
            'phone',
            'department',
            'department_name',
            'department_slug',
            'specialty',
            'specialty_name',
            'qualification',
            'experience_years',
            'consultation_type',
            'consultation_duration_minutes',
            'consultation_location',
            'image',
            'photo_url',
            'image_url',
            'image_public_id',
            'is_active',
            'user_is_active',
            'invitation_status',
            'account_lifecycle_status',
            'latest_invitation_sent_at',
            'latest_invitation_expires_at',
        ]
        read_only_fields = [
            'id',
            'slug',
            'image_public_id',
            'photo_url',
            'image_url',
            'email',
            'phone',
            'user_is_active',
            'invitation_status',
            'account_lifecycle_status',
            'latest_invitation_sent_at',
            'latest_invitation_expires_at',
        ]

    def get_photo_url(self, obj):
        if not obj.image:
            return None
        val = str(obj.image)
        if val.startswith('http://') or val.startswith('https://'):
            return val
        try:
            return obj.image.url
        except Exception:
            return val

    def get_image_url(self, obj):
        return self.get_photo_url(obj)

    def get_latest_invitation_sent_at(self, obj):
        inv = getattr(obj, 'latest_invitation', None)
        return inv.created_at.isoformat() if inv else None

    def get_latest_invitation_expires_at(self, obj):
        inv = getattr(obj, 'latest_invitation', None)
        return inv.expires_at.isoformat() if inv else None


class DoctorDetailSerializer(serializers.ModelSerializer):
    """
    Detailed clinical practitioner biography, credentials, and consultation parameters.
    """
    department_detail = DoctorDepartmentSummarySerializer(source='department', read_only=True)
    specialty_detail = DoctorSpecialtySummarySerializer(source='specialty', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    photo_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    image_public_id = serializers.CharField(read_only=True)
    invitation_status = serializers.CharField(read_only=True)
    account_lifecycle_status = serializers.CharField(read_only=True)
    user_is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    latest_invitation_sent_at = serializers.SerializerMethodField()
    latest_invitation_expires_at = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            'id',
            'name',
            'slug',
            'user_id',
            'email',
            'phone',
            'department',
            'department_detail',
            'specialty',
            'specialty_detail',
            'specialty_name',
            'qualification',
            'experience_years',
            'bio',
            'expertise',
            'consultation_type',
            'consultation_duration_minutes',
            'consultation_location',
            'image',
            'photo_url',
            'image_url',
            'image_public_id',
            'is_active',
            'user_is_active',
            'invitation_status',
            'account_lifecycle_status',
            'latest_invitation_sent_at',
            'latest_invitation_expires_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'slug',
            'user_id',
            'email',
            'phone',
            'image_public_id',
            'photo_url',
            'image_url',
            'user_is_active',
            'invitation_status',
            'account_lifecycle_status',
            'latest_invitation_sent_at',
            'latest_invitation_expires_at',
            'created_at',
            'updated_at',
        ]

    def get_photo_url(self, obj):
        if not obj.image:
            return None
        val = str(obj.image)
        if val.startswith('http://') or val.startswith('https://'):
            return val
        try:
            return obj.image.url
        except Exception:
            return val

    def get_image_url(self, obj):
        return self.get_photo_url(obj)

    def get_latest_invitation_sent_at(self, obj):
        inv = getattr(obj, 'latest_invitation', None)
        return inv.created_at.isoformat() if inv else None

    def get_latest_invitation_expires_at(self, obj):
        inv = getattr(obj, 'latest_invitation', None)
        return inv.expires_at.isoformat() if inv else None



class DoctorCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for registering a new consultant physician by hospital administration.
    Validates required contact details, credentialing fields, and profile image file.
    Enforces email uniqueness against User accounts.
    """
    email = serializers.EmailField(write_only=True, required=True)
    phone = serializers.CharField(write_only=True, required=True, max_length=20)
    image = serializers.ImageField(required=False, allow_null=True)
    photo = serializers.ImageField(source='image', required=False, allow_null=True)
    consultation_duration = serializers.IntegerField(source='consultation_duration_minutes', required=False)
    registration_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Doctor
        fields = [
            'id',
            'name',
            'email',
            'phone',
            'department',
            'specialty',
            'specialty_name',
            'qualification',
            'registration_number',
            'experience_years',
            'consultation_duration',
            'consultation_duration_minutes',
            'consultation_location',
            'consultation_type',
            'bio',
            'expertise',
            'image',
            'photo',
            'is_active',
        ]
        read_only_fields = ['id']

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized

    def validate_phone(self, value):
        val = value.strip()
        cleaned = re.sub(r'[\s\-\(\)\+]', '', val)
        if len(cleaned) < 8 or not cleaned.isdigit():
            raise serializers.ValidationError("Please provide a valid mobile or phone number.")
        return val

    def validate_image(self, value):
        if not value:
            return value
        # Validate max size 5MB
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("Profile photograph must not exceed 5 MB.")
        # Validate file format
        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        content_type = getattr(value, 'content_type', '')
        if content_type and content_type not in allowed_types:
            raise serializers.ValidationError("Unsupported image format. Allowed formats: JPEG, PNG, WebP.")
        return value

    def validate_photo(self, value):
        return self.validate_image(value)

    def validate(self, attrs):
        if not attrs.get('specialty') and not attrs.get('specialty_name'):
            raise serializers.ValidationError({"specialty": "Specialty or specialty name is required."})
        return attrs


class DoctorInvitationSerializer(serializers.ModelSerializer):
    """
    Sanitized doctor onboarding invitation serializer for hospital administrators.
    Excludes cryptographic token hash to avoid internal metadata leakage.
    """
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    doctor_slug = serializers.CharField(source='doctor.slug', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = DoctorInvitation
        fields = [
            'id',
            'doctor',
            'doctor_name',
            'doctor_slug',
            'email',
            'status',
            'is_expired',
            'is_active',
            'expires_at',
            'accepted_at',
            'revoked_at',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class ValidateInvitationTokenSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, trim_whitespace=True)


class AcceptDoctorInvitationSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, trim_whitespace=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True, min_length=8)
