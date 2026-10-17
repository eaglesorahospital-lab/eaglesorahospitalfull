"""
Authentication API Views for Hospital Platform.
Handles Login, Public Registration, Profile Inspection (/me), and Logout.
"""

from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenRefreshView

from config.throttling import LoginRateThrottle, RegisterRateThrottle, TokenRefreshRateThrottle
from .serializers import (
    LoginSerializer,
    RegisterPatientSerializer,
    CurrentUserSerializer,
    LogoutSerializer,
    ChangePasswordSerializer,
    SetupPasswordSerializer,
)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticates user and returns JWT access and refresh token pair.
    Throttled by client IP to defend against brute-force attacks.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        refresh = RefreshToken.for_user(user)
        # Add custom role claim to token payload
        refresh['role'] = user.role
        refresh['email'] = user.email

        doc = getattr(user, 'doctor_profile', None)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name() or user.email,
                "role": user.role,
                "must_change_password": getattr(user, 'must_change_password', False),
                "doctor_slug": doc.slug if doc else None,
                "doctor_id": doc.id if doc else None,
            }
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Updates user password for authenticated user.
    If must_change_password is True, marks it False upon success.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        new_password = serializer.validated_data['new_password']
        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=['password', 'must_change_password', 'updated_at'])

        # Generate fresh tokens
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email

        return Response({
            "message": "Password updated successfully.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "must_change_password": False,
        }, status=status.HTTP_200_OK)


class SetupPasswordView(APIView):
    """
    POST /api/auth/setup-password/
    One-time password setup via secure expiring link (token + uid).
    Validates token, sets new password, clears must_change_password,
    and returns authenticated JWT credentials.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SetupPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        new_password = serializer.validated_data['new_password']

        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=['password', 'must_change_password', 'updated_at'])

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email

        doc = getattr(user, 'doctor_profile', None)

        return Response({
            "message": "Password established successfully. Account activated.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name() or user.email,
                "role": user.role,
                "must_change_password": False,
                "doctor_slug": doc.slug if doc else None,
                "doctor_id": doc.id if doc else None,
            }
        }, status=status.HTTP_200_OK)


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Registers a new outpatient account.
    Strictly assigns PATIENT role; client cannot select privileged roles.
    Throttled by client IP to defend against automated registration spam.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterPatientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email

        profile = getattr(user, 'patient_profile', None)

        return Response({
            "message": "Registration successful.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name() or user.email,
                "role": user.role,
                "mrn": profile.mrn if profile else None,
            }
        }, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Returns sanitized identity and demographic data for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the supplied refresh token for authenticated logout.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data['refresh']

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except TokenError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class TokenRefreshWithThrottleView(TokenRefreshView):
    """
    POST /api/auth/refresh/
    Exchanges a valid refresh token for a new access token.
    Throttled to protect against token cycling abuse.
    """
    throttle_classes = [TokenRefreshRateThrottle]

