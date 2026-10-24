from django.urls import path
from .views_auth import (
    LoginView,
    PatientLoginView,
    RegisterView,
    CurrentUserView,
    LogoutView,
    TokenRefreshWithThrottleView,
    ChangePasswordView,
    SetupPasswordView,
    ValidateInvitationView,
    AcceptInvitationView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('patient-login/', PatientLoginView.as_view(), name='auth_patient_login'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('refresh/', TokenRefreshWithThrottleView.as_view(), name='auth_refresh'),
    path('me/', CurrentUserView.as_view(), name='auth_me'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('setup-password/', SetupPasswordView.as_view(), name='auth_setup_password'),
    path('validate-invitation/', ValidateInvitationView.as_view(), name='auth_validate_invitation'),
    path('accept-invitation/', AcceptInvitationView.as_view(), name='auth_accept_invitation'),
    path('invitation/validate/', ValidateInvitationView.as_view(), name='auth_invitation_validate'),
    path('invitation/accept/', AcceptInvitationView.as_view(), name='auth_invitation_accept'),
]
