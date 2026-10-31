from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import PatientProfile, User
from .serializers import PatientProfileSerializer, PatientProfileCreateUpdateSerializer
from .permissions import IsPatientOwnerOrStaff, EnforcePasswordChange
from config.pagination import StandardResultsSetPagination


class PatientProfileViewSet(viewsets.ModelViewSet):
    """
    Outpatient demographics API.
    Protected by RBAC:
    - Patients can only view and update their own demographic record.
    - Super Admins and Hospital Admins can access all patient records.
    - Doctor staff access only authorized patients who have appointments with them.
    - Anonymous requests are rejected (401).
    """
    permission_classes = [permissions.IsAuthenticated, EnforcePasswordChange, IsPatientOwnerOrStaff]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['gender', 'blood_group', 'is_active']
    search_fields = ['mrn', 'first_name', 'last_name', 'phone', 'email']
    ordering_fields = ['created_at', 'last_name', 'first_name', 'date_of_birth']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if not (user and user.is_authenticated):
            return PatientProfile.objects.none()

        # Super Admins and Hospital Admins have organization-wide visibility
        if (
            user.role in [User.Role.SUPER_ADMIN, User.Role.HOSPITAL_ADMIN]
            or user.is_superuser
        ):
            return PatientProfile.objects.all().select_related('user')

        # Doctor staff view only patients who have consultations with them
        if user.role == User.Role.DOCTOR_STAFF:
            if hasattr(user, 'doctor_profile') and user.doctor_profile:
                return PatientProfile.objects.filter(appointments__doctor=user.doctor_profile).distinct().select_related('user')
            return PatientProfile.objects.none()

        # Patients are restricted strictly to their own demographic record
        return PatientProfile.objects.filter(user=user).select_related('user')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PatientProfileCreateUpdateSerializer
        return PatientProfileSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            if hasattr(user, 'patient_profile') and user.patient_profile:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"detail": "Patient profile already exists for this account."})
            serializer.save(user=user)
        else:
            serializer.save()

    def destroy(self, request, *args, **kwargs):
        """
        Safe outpatient profile deactivation/archival.
        Never executes a destructive SQL DELETE to preserve relational clinical integrity
        and foreign key constraints (Appointment.patient on_delete=models.PROTECT).
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])

        # Synchronize linked portal account if present
        if instance.user:
            instance.user.is_active = False
            instance.user.save(update_fields=['is_active', 'updated_at'])

        return Response({
            "message": f"Patient {instance.mrn} successfully archived (deactivated).",
            "id": instance.id,
            "mrn": instance.mrn,
            "is_active": False,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """
        Explicit toggle between Active and Archived states.
        Maintains relational integrity and synchronizes portal account state.
        """
        instance = self.get_object()
        instance.is_active = not instance.is_active
        instance.save(update_fields=['is_active', 'updated_at'])

        if instance.user:
            instance.user.is_active = instance.is_active
            instance.user.save(update_fields=['is_active', 'updated_at'])

        status_text = "Active" if instance.is_active else "Archived"
        return Response({
            "message": f"Patient {instance.mrn} status set to {status_text}.",
            "id": instance.id,
            "mrn": instance.mrn,
            "is_active": instance.is_active,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me')
    def me(self, request):
        """
        Retrieve or update the authenticated patient's own profile.
        Strictly derives identity from the validated authentication context (request.user).
        """
        user = request.user
        if not (user and user.is_authenticated):
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        profile = getattr(user, 'patient_profile', None)
        if not profile and user.role == User.Role.PATIENT:
            # Check if an existing unlinked profile matches the user's email
            if user.email:
                profile = PatientProfile.objects.filter(email__iexact=user.email, user__isnull=True).first()
                if profile:
                    profile.user = user
                    profile.save(update_fields=['user'])

        if request.method == 'GET':
            if not profile:
                return Response(
                    {"detail": "No patient profile associated with this account.", "profile": None},
                    status=status.HTTP_404_NOT_FOUND,
                )
            serializer = PatientProfileSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method in ['PUT', 'PATCH']:
            if not profile:
                # First-time profile initialization for authenticated user
                data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
                serializer = PatientProfileCreateUpdateSerializer(data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                profile = serializer.save(user=user)
                return Response(PatientProfileSerializer(profile).data, status=status.HTTP_201_CREATED)
            else:
                serializer = PatientProfileCreateUpdateSerializer(profile, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                profile = serializer.save()
                return Response(PatientProfileSerializer(profile).data, status=status.HTTP_200_OK)

