import logging
import secrets
from django.db import transaction
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Specialty, Doctor, DoctorInvitation
from .serializers import (
    SpecialtySerializer,
    DoctorListSerializer,
    DoctorDetailSerializer,
    DoctorCreateSerializer,
    DoctorInvitationSerializer,
)
from .services import DoctorInvitationService
from config.pagination import StandardResultsSetPagination
from config.media_service import MediaService, CLOUDINARY_FOLDERS
from config.throttling import MediaUploadRateThrottle, DoctorInvitationRateThrottle
from apps.accounts.models import User
from apps.accounts.permissions import (
    IsAdminUserOrReadOnly,
    CanManageDoctorMedia,
    IsAdminOrHospitalAdmin,
    EnforcePasswordChange,
)
from apps.scheduling.services import AvailabilityEngine
from apps.notifications.models import AuditLog

logger = logging.getLogger('hospital.doctors')


class SpecialtyViewSet(viewsets.ReadOnlyModelViewSet):

    """
    Medical clinical specialties directory API.
    Public read-only; administrative mutations.
    """
    queryset = Specialty.objects.filter(is_active=True)
    serializer_class = SpecialtySerializer
    permission_classes = [IsAdminUserOrReadOnly]
    lookup_field = 'slug'
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class DoctorViewSet(viewsets.ModelViewSet):
    """
    Consultant doctor directory and credentialing API.
    Supports filtering by department, specialty, consultation type, and full-text search.
    Public read-only; administrative mutations and media upload actions protected by RBAC.
    """
    queryset = Doctor.objects.all().select_related('department', 'specialty', 'user')
    permission_classes = [IsAdminUserOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'slug'
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'department',
        'department__slug',
        'specialty',
        'specialty__slug',
        'consultation_type',
        'is_active',
    ]
    search_fields = ['name', 'qualification', 'expertise', 'specialty_name', 'department__name', 'user__email']
    ordering_fields = ['name', 'experience_years', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        user = self.request.user
        qs = Doctor.objects.all().select_related('department', 'specialty', 'user')
        # Public anonymous users and non-staff patients should only see active doctors
        if not (user and user.is_authenticated and (user.is_staff or getattr(user, 'role', None) in ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR_STAFF'])):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'toggle_status', 'invite', 'resend_invitation', 'revoke_invitation', 'invitations']:
            return [permissions.IsAuthenticated(), IsAdminOrHospitalAdmin()]
        if self.action in ['upload_photo', 'delete_photo']:
            return [permissions.IsAuthenticated(), CanManageDoctorMedia()]
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), CanManageDoctorMedia()]
        if self.action == 'me':
            return [permissions.IsAuthenticated(), EnforcePasswordChange()]
        return super().get_permissions()

    def get_object(self):
        """
        Supports lookup by string slug, integer ID, or 'me' keyword for authenticated doctor.
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_val = self.kwargs.get(lookup_url_kwarg)

        if lookup_val == 'me':
            user = self.request.user
            if user and user.is_authenticated and hasattr(user, 'doctor_profile') and user.doctor_profile:
                return user.doctor_profile

        qs = self.get_queryset()
        if lookup_val and str(lookup_val).isdigit():
            obj = qs.filter(id=int(lookup_val)).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj
        return super().get_object()

    def get_serializer_class(self):
        if self.action == 'create':
            return DoctorCreateSerializer
        if self.action in ['retrieve', 'update', 'partial_update', 'me']:
            return DoctorDetailSerializer
        return DoctorListSerializer

    def create(self, request, *args, **kwargs):
        """
        Authorized hospital administrators provision a new consultant and secure Doctor account.
        Creates linked User with DOCTOR_STAFF role, random temporary password, and expiring setup link.
        Atomically issues a cryptographic DoctorInvitation record and dispatches an invitation email.
        """
        serializer = DoctorCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        email = validated_data.pop('email').strip().lower()
        phone = validated_data.pop('phone').strip()
        image_file = request.FILES.get('image') or request.FILES.get('photo') or validated_data.get('image') or validated_data.get('photo')
        validated_data.pop('image', None)
        validated_data.pop('photo', None)
        reg_number = validated_data.pop('registration_number', '').strip()
        if reg_number:
            current_qual = validated_data.get('qualification', '')
            if reg_number not in current_qual:
                validated_data['qualification'] = f"{current_qual} (Reg. No: {reg_number})".strip()

        # Generate secure random temporary password (minimum 12 chars, upper, lower, digits, symbol)
        temp_password = secrets.token_urlsafe(10) + "A1!"

        with transaction.atomic():
            # Parse first and last name from full name
            name = validated_data.get('name', '').strip()
            parts = name.split()
            first_name = parts[0] if parts else "Dr."
            last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

            # 1. Create User account with DOCTOR_STAFF role
            user = User.objects.create_user(
                email=email,
                password=temp_password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                role=User.Role.DOCTOR_STAFF,
                is_staff=True,
                must_change_password=True,
            )

            # 2. Upload image via MediaService if provided
            image_url = None
            image_public_id = None
            if image_file:
                upload_res = MediaService.upload_image(
                    file_obj=image_file,
                    folder=CLOUDINARY_FOLDERS['doctors'],
                )
                image_url = upload_res.get('url')
                image_public_id = upload_res.get('public_id')

            # 3. Create Doctor profile linked to user
            doctor = Doctor.objects.create(
                user=user,
                image=image_url,
                image_public_id=image_public_id,
                **validated_data
            )

            # 4. Generate secure expiring setup token (legacy compatibility)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            setup_url = f"/staff/set-password?uid={uid}&token={token}"

            # 5. Record audit log
            AuditLog.objects.create(
                actor=request.user if request.user.is_authenticated else None,
                actor_name=request.user.get_full_name() or request.user.email if request.user.is_authenticated else "Hospital Admin",
                role=getattr(request.user, 'role', 'HOSPITAL_ADMIN'),
                action="DOCTOR_REGISTERED",
                resource_type="Doctor",
                resource_id=str(doctor.id),
                result=AuditLog.Result.SUCCESS,
                details=f"Admin {request.user.email} registered consultant {doctor.name} and provisioned account {user.email}.",
                metadata={
                    "doctor_id": doctor.id,
                    "doctor_slug": doctor.slug,
                    "user_id": user.id,
                    "department_id": doctor.department_id,
                },
                ip_address=request.META.get('REMOTE_ADDR'),
            )

        # 6. Issue secure invitation and send invitation email
        inv_data = None
        try:
            inv_res = DoctorInvitationService.send_invitation(
                doctor=doctor,
                created_by=request.user if request.user.is_authenticated else None,
                request=request
            )
            inv = inv_res['invitation']
            inv_data = {
                "id": inv.id,
                "email": inv.email,
                "status": inv.status,
                "expires_at": inv.expires_at.isoformat(),
                "email_sent": inv_res['email_sent'],
                "setup_url": inv_res['setup_url'],
            }
        except Exception as exc:
            logger.warning(f"Failed to issue DoctorInvitation on registration: {exc}")

        # 7. Safely attempt to send legacy notification email if not already delivered
        if not (inv_data and inv_data.get('email_sent')):
            try:
                subject = "Welcome to EgleSora Hospital — Set Up Your Consultant Portal Password"
                message = (
                    f"Hello {doctor.name},\n\n"
                    f"Your consultant staff account has been registered by hospital administration.\n\n"
                    f"Please set up your secure password using the following link:\n"
                    f"{request.build_absolute_uri(setup_url)}\n\n"
                    f"This setup link is valid for 24 hours.\n\n"
                    f"Warm regards,\n"
                    f"EgleSora Hospital Medical Administration"
                )
                send_mail(
                    subject,
                    message,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hospital.local'),
                    [user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        out_serializer = DoctorDetailSerializer(doctor, context={'request': request})
        response_payload = {
            "message": f"Consultant {doctor.name} registered and doctor staff account provisioned successfully.",
            "doctor": out_serializer.data,
            "credentials": {
                "email": user.email,
                "temporary_password": temp_password,
                "setup_token": token,
                "setup_uid": uid,
                "setup_url": setup_url,
                "must_change_password": True,
                "expires_in": "24 hours",
            }
        }
        if inv_data:
            response_payload["invitation"] = inv_data
        return Response(response_payload, status=status.HTTP_201_CREATED)


    def perform_update(self, serializer):
        image_file = self.request.FILES.get('image') or self.request.FILES.get('photo')
        if image_file:
            doctor = serializer.instance
            upload_res = MediaService.replace_model_image(
                instance=doctor,
                file_obj=image_file,
                image_field_name='image',
                public_id_field_name='image_public_id',
                folder=CLOUDINARY_FOLDERS['doctors'],
            )
            serializer.save(image=upload_res['url'], image_public_id=upload_res['public_id'])
        else:
            serializer.save()

    @action(
        detail=False,
        methods=['get', 'put', 'patch'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='me'
    )
    def me(self, request):
        """
        Retrieves or updates the authenticated doctor staff member's own profile.
        """
        user = request.user
        if user.role != User.Role.DOCTOR_STAFF:
            return Response(
                {"detail": "Authenticated user does not hold the DOCTOR_STAFF role."},
                status=status.HTTP_403_FORBIDDEN,
            )
        doctor = getattr(user, 'doctor_profile', None)
        if not doctor:
            return Response(
                {"detail": "No doctor profile associated with this account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.method == 'GET':
            serializer = DoctorDetailSerializer(doctor, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = DoctorDetailSerializer(doctor, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[CanManageDoctorMedia],
        parser_classes=[MultiPartParser, FormParser],
        throttle_classes=[MediaUploadRateThrottle],
        url_path='upload-photo'
    )
    def upload_photo(self, request, slug=None):
        """
        Secure doctor profile photo upload/replacement endpoint.
        Authorized for Super Admin, Hospital Admin, or the specific Doctor staff owner.
        """
        doctor = self.get_object()
        file_obj = request.FILES.get('image') or request.FILES.get('photo') or request.FILES.get('file')
        if not file_obj:
            return Response(
                {"detail": "No image file provided in request. Expected multipart field 'image' or 'photo'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = MediaService.replace_model_image(
            instance=doctor,
            file_obj=file_obj,
            image_field_name='image',
            public_id_field_name='image_public_id',
            folder=CLOUDINARY_FOLDERS['doctors'],
        )
        doctor.refresh_from_db()
        serializer = DoctorDetailSerializer(doctor, context={'request': request})
        return Response({
            "message": "Doctor photo uploaded successfully.",
            "doctor_id": doctor.id,
            "photo_url": result['url'],
            "public_id": result['public_id'],
            "doctor": serializer.data,
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['delete'],
        permission_classes=[CanManageDoctorMedia],
        url_path='delete-photo'
    )
    def delete_photo(self, request, slug=None):
        """
        Secure doctor profile photo deletion endpoint.
        Clears database reference and destroys Cloudinary asset.
        """
        doctor = self.get_object()
        MediaService.delete_model_image(
            instance=doctor,
            image_field_name='image',
            public_id_field_name='image_public_id',
        )
        doctor.refresh_from_db()
        serializer = DoctorDetailSerializer(doctor, context={'request': request})
        return Response({
            "message": "Doctor photo removed successfully.",
            "doctor_id": doctor.id,
            "photo_url": None,
            "doctor": serializer.data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny], url_path='availability')
    def availability(self, request, slug=None):
        doctor = self.get_object()
        date_str = request.query_params.get('date')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if not date_str and not start_date_str:
            return Response(
                {"detail": "Query parameter 'date' (YYYY-MM-DD) or 'start_date' (YYYY-MM-DD) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if start_date_str:
            data = AvailabilityEngine.get_doctor_availability_range(
                doctor, start_date_str, end_date_str or start_date_str
            )
        else:
            data = AvailabilityEngine.get_doctor_availability(doctor, date_str)
        return Response(data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated, IsAdminOrHospitalAdmin],
        throttle_classes=[DoctorInvitationRateThrottle],
        url_path='invite'
    )
    def invite(self, request, slug=None):
        """
        Sends an onboarding invitation to an uninvited or reinvited doctor.
        """
        doctor = self.get_object()
        res = DoctorInvitationService.send_invitation(doctor, created_by=request.user, request=request)
        return Response({
            "message": f"Invitation issued for {doctor.name} ({doctor.user.email if doctor.user else 'no email'}).",
            "invitation": DoctorInvitationSerializer(res['invitation']).data,
            "email_sent": res['email_sent'],
            "delivery_error": res.get('delivery_error'),
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated, IsAdminOrHospitalAdmin],
        throttle_classes=[DoctorInvitationRateThrottle],
        url_path='resend-invitation'
    )
    def resend_invitation(self, request, slug=None):
        """
        Resends an invitation to a doctor, revoking earlier pending invitations and issuing a fresh token.
        """
        doctor = self.get_object()
        res = DoctorInvitationService.resend_invitation(doctor, created_by=request.user, request=request)
        return Response({
            "message": f"Invitation resent to {doctor.name} ({doctor.user.email if doctor.user else 'no email'}).",
            "invitation": DoctorInvitationSerializer(res['invitation']).data,
            "email_sent": res['email_sent'],
            "delivery_error": res.get('delivery_error'),
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated, IsAdminOrHospitalAdmin],
        url_path='revoke-invitation'
    )
    def revoke_invitation(self, request, slug=None):
        """
        Revokes any active pending invitation for this doctor.
        """
        doctor = self.get_object()
        count = DoctorInvitationService.revoke_invitation(doctor, revoked_by=request.user, request=request)
        return Response({
            "message": f"Outstanding invitation(s) for {doctor.name} revoked successfully.",
            "revoked_count": count,
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated, IsAdminOrHospitalAdmin],
        url_path='invitations'
    )
    def invitations(self, request, slug=None):
        """
        Retrieves complete invitation audit history for this doctor profile.
        """
        doctor = self.get_object()
        invitations_qs = doctor.invitations.all().select_related('created_by')
        serializer = DoctorInvitationSerializer(invitations_qs, many=True)
        return Response({
            "doctor_id": doctor.id,
            "doctor_name": doctor.name,
            "invitations": serializer.data,
            "current_status": doctor.invitation_status,
            "account_status": doctor.account_lifecycle_status,
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated, IsAdminOrHospitalAdmin],
        url_path='toggle-status'
    )
    def toggle_status(self, request, slug=None):
        """
        Toggles is_active status of a Doctor and their linked User account.
        """
        doctor = self.get_object()
        new_status = not doctor.is_active
        doctor.is_active = new_status
        doctor.save(update_fields=['is_active', 'updated_at'])
        if doctor.user:
            doctor.user.is_active = new_status
            doctor.user.save(update_fields=['is_active', 'updated_at'])
        serializer = DoctorDetailSerializer(doctor, context={'request': request})
        return Response({
            "message": f"Doctor {doctor.name} status updated to {'Active' if new_status else 'Inactive'}.",
            "is_active": new_status,
            "doctor": serializer.data,
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated, IsAdminOrHospitalAdmin],
        url_path='toggle_status'
    )
    def toggle_status_alias(self, request, slug=None):
        return self.toggle_status(request, slug=slug)
