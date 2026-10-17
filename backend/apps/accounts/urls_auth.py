from django.urls import path
from .views_auth import (
    LoginView,
    RegisterView,
    CurrentUserView,
    LogoutView,
    TokenRefreshWithThrottleView,
    ChangePasswordView,
    SetupPasswordView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('refresh/', TokenRefreshWithThrottleView.as_view(), name='auth_refresh'),
    path('me/', CurrentUserView.as_view(), name='auth_me'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('setup-password/', SetupPasswordView.as_view(), name='auth_setup_password'),
]
