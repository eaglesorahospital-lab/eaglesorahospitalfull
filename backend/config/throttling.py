import logging
from rest_framework.throttling import SimpleRateThrottle

logger = logging.getLogger('config.throttling')

# Resilient fail-open wrapper for SimpleRateThrottle
# Protects against 500 errors when Redis is temporarily unavailable or in local offline test mode
_orig_allow_request = SimpleRateThrottle.allow_request

def _safe_allow_request(self, request, view):
    try:
        return _orig_allow_request(self, request, view)
    except Exception as exc:
        logger.warning(f"Rate limiting check failed open due to cache backend error: {exc}")
        return True

SimpleRateThrottle.allow_request = _safe_allow_request


class LoginRateThrottle(SimpleRateThrottle):
    """
    Throttles authentication login attempts by client IP address
    to protect against credential stuffing and brute-force attacks.
    """
    scope = 'auth_login'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class RegisterRateThrottle(SimpleRateThrottle):
    """
    Throttles public patient registration by client IP address
    to protect against automated mass account creation.
    """
    scope = 'auth_register'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class TokenRefreshRateThrottle(SimpleRateThrottle):
    """
    Throttles JWT token refresh requests by client IP address.
    """
    scope = 'auth_refresh'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class AppointmentBookingRateThrottle(SimpleRateThrottle):
    """
    Throttles appointment booking requests to prevent slot spamming.
    Keyed by authenticated user ID (or IP for unauthenticated).
    """
    scope = 'appointment_booking'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class MediaUploadRateThrottle(SimpleRateThrottle):
    """
    Throttles multipart media upload requests to prevent bandwidth
    and Cloudinary storage exhaustion.
    """
    scope = 'media_upload'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class DoctorInvitationRateThrottle(SimpleRateThrottle):
    """
    Throttles doctor invitation issuance, validation, and acceptance requests
    to defend against automated token enumeration and email flooding.
    """
    scope = 'doctor_invitation'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }
