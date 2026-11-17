from rest_framework import serializers
from .models import HospitalProfile, HospitalFacility, HospitalAnnouncement, HospitalFAQ, PatientFeedback


class HospitalProfileSerializer(serializers.ModelSerializer):
    """
    Hospital institutional governance and contact profile serializer.
    """
    logo_url = serializers.SerializerMethodField()
    logo_public_id = serializers.CharField(read_only=True)

    class Meta:
        model = HospitalProfile
        fields = [
            'id',
            'name',
            'legal_name',
            'tagline',
            'overview',
            'contact_phone',
            'emergency_phone',
            'contact_email',
            'address',
            'visiting_hours',
            'emergency_info',
            'logo',
            'logo_url',
            'logo_public_id',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'logo_url', 'logo_public_id', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        val = str(obj.logo)
        if val.startswith('http://') or val.startswith('https://'):
            return val
        try:
            return obj.logo.url
        except Exception:
            return val


class HospitalFacilitySerializer(serializers.ModelSerializer):
    """
    Hospital clinical infrastructure and amenities serializer.
    """
    image_url = serializers.SerializerMethodField()
    image_public_id = serializers.CharField(read_only=True)

    class Meta:
        model = HospitalFacility
        fields = [
            'id',
            'name',
            'description',
            'image',
            'image_url',
            'image_public_id',
            'order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'image_url', 'image_public_id', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        val = str(obj.image)
        if val.startswith('http://') or val.startswith('https://'):
            return val
        try:
            return obj.image.url
        except Exception:
            return val


class HospitalAnnouncementSerializer(serializers.ModelSerializer):
    """
    Public health announcements, clinic advisories, and hospital news serializer.
    """
    image_url = serializers.SerializerMethodField()
    image_public_id = serializers.CharField(read_only=True)

    class Meta:
        model = HospitalAnnouncement
        fields = [
            'id',
            'title',
            'slug',
            'category',
            'summary',
            'content',
            'image',
            'image_url',
            'image_public_id',
            'is_published',
            'published_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'image_url', 'image_public_id', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        val = str(obj.image)
        if val.startswith('http://') or val.startswith('https://'):
            return val
        try:
            return obj.image.url
        except Exception:
            return val


class HospitalFAQSerializer(serializers.ModelSerializer):
    """
    General hospital patient guidance FAQ serializer.
    """
    class Meta:
        model = HospitalFAQ
        fields = [
            'id',
            'question',
            'answer',
            'order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PatientFeedbackCreateSerializer(serializers.ModelSerializer):
    """
    Public and outpatient feedback submission serializer.
    Validates required contact details, category, 1-5 satisfaction score, and message.
    """
    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = PatientFeedback
        fields = [
            'id',
            'patient_name',
            'email',
            'phone',
            'category',
            'rating',
            'message',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_patient_name(self, value):
        name = value.strip()
        if len(name) < 2:
            raise serializers.ValidationError("Patient or visitor name must contain at least 2 characters.")
        return name

    def validate_message(self, value):
        msg = value.strip()
        if len(msg) < 5:
            raise serializers.ValidationError("Feedback message must contain at least 5 characters.")
        return msg


class PatientFeedbackAdminSerializer(serializers.ModelSerializer):
    """
    Authoritative administrative serializer for reviewing, updating, and auditing patient feedback.
    """
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PatientFeedback
        fields = [
            'id',
            'patient_name',
            'email',
            'phone',
            'category',
            'category_display',
            'rating',
            'message',
            'status',
            'status_display',
            'admin_notes',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'patient_name',
            'email',
            'phone',
            'category',
            'category_display',
            'rating',
            'message',
            'status_display',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            name = f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip()
            return name or obj.reviewed_by.email
        return None
