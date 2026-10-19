"""
Django settings for Hospital Platform project (Phase 0 — Foundation).

Configured for:
- PostgreSQL database
- Redis cache & message broker
- Celery asynchronous processing
- Django REST Framework + SimpleJWT
- CORS headers
- Static / Media files with Cloudinary compatibility
- SMTP / Transactional Email
"""

import logging
import os
import sys
from datetime import timedelta
from pathlib import Path
import dj_database_url

logger = logging.getLogger('config.settings')
BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR.parent / '.env')
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

from django.core.exceptions import ImproperlyConfigured

# ==============================================================================
# Security & Debug Settings
# ==============================================================================
DEV_INSECURE_SECRET = 'django-insecure-hospital-platform-phase0-foundation-key-must-change-in-prod'
KNOWN_INSECURE_SECRETS = {
    DEV_INSECURE_SECRET,
    'phase0-foundation-secret-key-replace-in-env',
    'django-insecure-placeholder',
    'django-insecure-default',
    'change-me-in-production',
    'secret',
    'password',
}

# Determine DEBUG mode:
# Defaults to True in local development environments if unspecified.
# In production (e.g. docker-compose.prod.yml, Kubernetes, live servers), DJANGO_DEBUG must be 'False' or '0'.
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

_raw_secret = os.environ.get('DJANGO_SECRET_KEY')

if DEBUG:
    # Development mode: permit local development using DEV_INSECURE_SECRET if no custom secret is provided
    SECRET_KEY = _raw_secret.strip() if (_raw_secret and _raw_secret.strip()) else DEV_INSECURE_SECRET
else:
    # Production mode: strict fail-fast validation. No placeholder or empty keys permitted.
    if not _raw_secret or not _raw_secret.strip():
        raise ImproperlyConfigured(
            "CRITICAL SECURITY CONFIGURATION ERROR: DJANGO_SECRET_KEY environment variable "
            "is missing or empty. A strong, unpredictable production secret key is required when DEBUG=False."
        )
    if _raw_secret.strip() in KNOWN_INSECURE_SECRETS:
        raise ImproperlyConfigured(
            "CRITICAL SECURITY CONFIGURATION ERROR: DJANGO_SECRET_KEY is configured with an insecure "
            "known development placeholder. A distinct, cryptographically strong secret key is mandatory when DEBUG=False."
        )
    SECRET_KEY = _raw_secret.strip()

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        'DJANGO_ALLOWED_HOSTS',
        'localhost,127.0.0.1,backend,nginx,testserver'
    ).split(',')
    if host.strip()
]
if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

# ==============================================================================
# Application Definition
# ==============================================================================
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_celery_beat',
    'django_filters',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.hospital',
    'apps.departments',
    'apps.doctors',
    'apps.scheduling',
    'apps.appointments',
    'apps.notifications',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ==============================================================================
# Middleware Configuration
# ==============================================================================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ==============================================================================
# Database Configuration (PostgreSQL) — Phase 22 Deployment Compatibility
# ==============================================================================
# PostgreSQL is the mandatory platform database. SQLite is explicitly prohibited.
_raw_db_url = os.environ.get('DATABASE_URL', '').strip()

if _raw_db_url:
    try:
        _parsed_db = dj_database_url.parse(_raw_db_url)
        if not _parsed_db or not _parsed_db.get('ENGINE'):
            raise ValueError("Parsed database configuration is empty or missing ENGINE.")

        if 'postgresql' not in _parsed_db.get('ENGINE', ''):
            raise ImproperlyConfigured(
                "CRITICAL DATABASE CONFIGURATION ERROR: Only PostgreSQL databases are supported. "
                "The engine specified in DATABASE_URL is not PostgreSQL."
            )

        _db_host = (_parsed_db.get('HOST') or '').lower()
        _is_local_host = _db_host in ('localhost', '127.0.0.1', 'db', 'backend', 'postgres', '')

        # Enforce SSL for non-local production connections or when explicitly requested
        _ssl_required = os.environ.get(
            'DJANGO_DB_SSL_REQUIRE',
            str(not DEBUG and not _is_local_host)
        ).lower() in ('true', '1', 'yes')

        if _ssl_required:
            _parsed_db.setdefault('OPTIONS', {})['sslmode'] = 'require'

        # Optional connection age for persistent/pooled connections (e.g. Neon PgBouncer)
        _conn_max_age = int(os.environ.get('DJANGO_DB_CONN_MAX_AGE', '0'))
        _parsed_db['CONN_MAX_AGE'] = _conn_max_age

        DATABASES = {'default': _parsed_db}
    except ImproperlyConfigured:
        raise
    except Exception as exc:
        raise ImproperlyConfigured(
            f"CRITICAL DATABASE CONFIGURATION ERROR: Invalid DATABASE_URL connection URI ({type(exc).__name__}). "
            "Verify that the database connection string is properly formatted and encoded."
        ) from None
else:
    # Discrete environment variables (Local Docker Compose or development fallback)
    _db_name = os.environ.get('POSTGRES_DB') or os.environ.get('DB_NAME', 'hospital_db')
    _db_user = os.environ.get('POSTGRES_USER') or os.environ.get('DB_USER', 'postgres')
    _db_password = os.environ.get('POSTGRES_PASSWORD') or os.environ.get('DB_PASSWORD', 'postgres')
    _db_host = os.environ.get('POSTGRES_HOST') or os.environ.get('DB_HOST', 'localhost')
    _db_port = os.environ.get('POSTGRES_PORT') or os.environ.get('DB_PORT', '5432')

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': _db_name,
            'USER': _db_user,
            'PASSWORD': _db_password,
            'HOST': _db_host,
            'PORT': _db_port,
        }
    }

# ==============================================================================
# Authentication & Custom User Model
# ==============================================================================
AUTH_USER_MODEL = 'accounts.User'

# ==============================================================================
# Password Validation
# ==============================================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ==============================================================================
# Internationalization
# ==============================================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ==============================================================================
# Static and Media Files (Phase 22 — WhiteNoise & Cloudinary Compatibility)
# ==============================================================================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = []

# WhiteNoise production settings
# Avoid strict build breakages on optional third-party sourcemaps while pre-compressing
WHITENOISE_MANIFEST_STRICT = False

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': CLOUDINARY_CLOUD_NAME,
        'API_KEY': CLOUDINARY_API_KEY,
        'API_SECRET': CLOUDINARY_API_SECRET,
    }
    _media_storage_backend = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    try:
        import cloudinary
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )
    except ImportError:
        pass
else:
    _media_storage_backend = 'django.core.files.storage.FileSystemStorage'
    if not DEBUG:
        logger.warning(
            "MEDIA STORAGE NOTICE: Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, "
            "CLOUDINARY_API_SECRET) not fully configured. Using local FileSystemStorage. "
            "Uploaded media (doctor photos, hospital banners) will not persist across Render container restarts."
        )

# Django 5.1 STORAGES framework:
# - Production staticfiles use WhiteNoise with compression and hashed caching
# - Development staticfiles use standard Django StaticFilesStorage to avoid manifest generation overhead
# - Media storage defaults to local FileSystemStorage in dev, or Cloudinary if credentials are provided
if not DEBUG:
    _staticfiles_backend = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
else:
    _staticfiles_backend = 'django.contrib.staticfiles.storage.StaticFilesStorage'

STORAGES = {
    "default": {
        "BACKEND": _media_storage_backend,
    },
    "staticfiles": {
        "BACKEND": _staticfiles_backend,
    },
}

# ==============================================================================
# Default Primary Key Field Type
# ==============================================================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==============================================================================
# Django REST Framework & SimpleJWT
# ==============================================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'EXCEPTION_HANDLER': 'config.exceptions.custom_exception_handler',
    'NUM_PROXIES': int(os.environ.get('REST_FRAMEWORK_NUM_PROXIES', 1)),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/minute',
        'user': '1200/minute',
        'auth_login': '15/minute',
        'auth_register': '10/minute',
        'auth_refresh': '30/minute',
        'appointment_booking': '30/minute',
        'media_upload': '30/minute',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.environ.get('JWT_ACCESS_MINUTES', 15))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.environ.get('JWT_REFRESH_DAYS', 7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ==============================================================================
# CORS & CSRF Configuration
# ==============================================================================
CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://127.0.0.1,https://eglesorahospital.netlify.app',
    ).split(',')
    if origin.strip()
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CSRF_TRUSTED_ORIGINS',
        'http://localhost,http://127.0.0.1,http://localhost:80,http://localhost:3000,http://localhost:5173'
    ).split(',')
    if origin.strip()
]

# ==============================================================================
# Security Hardening & HTTP Headers (Phase 16 & 17)
# ==============================================================================
# Reverse Proxy SSL Header & Host forwarding (Phase 17 — Nginx / Gunicorn)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# Clickjacking & Content-Type sniffing protection (safe for both dev & prod)
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'

# SSL & Session Cookie Security (activated in production or via explicit environment flags)
SECURE_SSL_REDIRECT = os.environ.get('DJANGO_SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1', 'yes')
SESSION_COOKIE_SECURE = os.environ.get('DJANGO_SESSION_COOKIE_SECURE', str(not DEBUG and SECURE_SSL_REDIRECT)).lower() in ('true', '1', 'yes')
CSRF_COOKIE_SECURE = os.environ.get('DJANGO_CSRF_COOKIE_SECURE', str(not DEBUG and SECURE_SSL_REDIRECT)).lower() in ('true', '1', 'yes')
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False

# HTTP Strict Transport Security (HSTS) - enabled when SSL redirect is active in production
SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_SECURE_HSTS_SECONDS', 31536000 if (not DEBUG and SECURE_SSL_REDIRECT) else 0))
SECURE_HSTS_INCLUDE_SUBDOMAINS = bool(SECURE_HSTS_SECONDS > 0)
# Require explicit confirmation before browser-level domain preloading is engaged
SECURE_HSTS_PRELOAD = bool(
    SECURE_HSTS_SECONDS > 0
    and os.environ.get('DJANGO_SECURE_HSTS_PRELOAD', 'False').lower() in ('true', '1', 'yes')
)

# ==============================================================================
# Production Logging Configuration (Phase 17 — Structured Logs to stdout/stderr)
# ==============================================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] [{levelname}] [{name}:{lineno}] {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'gunicorn.error': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ==============================================================================
# Cache & Distributed Rate-Limiting Configuration (Phase 22 — Explicit Redis Policy)
# ==============================================================================
_raw_redis_url = os.environ.get('REDIS_URL', '').strip()
_allow_locmem_fallback = os.environ.get('ALLOW_IN_MEMORY_CACHE_FALLBACK', 'False').lower() in ('true', '1', 'yes')
_is_test_runner = 'pytest' in sys.modules or 'test' in sys.argv or os.environ.get('TESTING') == 'True'
_force_prod_check = os.environ.get('FORCE_PRODUCTION_REDIS_CHECK', 'False').lower() in ('true', '1', 'yes')

if _raw_redis_url:
    REDIS_URL = _raw_redis_url
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'socket_connect_timeout': int(os.environ.get('REDIS_CONNECT_TIMEOUT', 5)),
                'socket_timeout': int(os.environ.get('REDIS_SOCKET_TIMEOUT', 5)),
            },
        }
    }
elif _allow_locmem_fallback:
    logger.warning(
        "SECURITY WARNING: Running without REDIS_URL (ALLOW_IN_MEMORY_CACHE_FALLBACK=True). "
        "Using in-memory LocMemCache. Throttling and rate-limiting will NOT be shared across Gunicorn worker processes."
    )
    REDIS_URL = ''
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'prod-locmem-fallback',
        }
    }
elif (DEBUG or _is_test_runner) and not _force_prod_check:
    # Development mode or test runner: default to local Docker Redis; allow locmem if requested
    _dev_cache = os.environ.get('DJANGO_CACHE_BACKEND', 'redis').lower()
    if _dev_cache == 'locmem':
        CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                'LOCATION': 'dev-locmem-cache',
            }
        }
        REDIS_URL = ''
    else:
        REDIS_URL = 'redis://localhost:6379/1'
        CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.redis.RedisCache',
                'LOCATION': REDIS_URL,
            }
        }
else:
    raise ImproperlyConfigured(
        "CRITICAL SECURITY CONFIGURATION ERROR: REDIS_URL environment variable is required in production (DEBUG=False) "
        "for shared DRF rate-limiting (AnonRateThrottle, UserRateThrottle). "
        "To explicitly permit per-process in-memory caching with reduced rate-limiting guarantees, "
        "set ALLOW_IN_MEMORY_CACHE_FALLBACK=True."
    )

# ==============================================================================
# Celery Asynchronous & Scheduled Task Configuration
# ==============================================================================
CELERY_TASK_ALWAYS_EAGER = os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'False').lower() in ('true', '1', 'yes')
CELERY_TASK_EAGER_PROPAGATES = os.environ.get('CELERY_TASK_EAGER_PROPAGATES', 'False').lower() in ('true', '1', 'yes')

# In synchronous eager demo mode, default broker to in-memory transport to protect Upstash command quotas
if CELERY_TASK_ALWAYS_EAGER:
    _default_broker = 'memory://'
elif REDIS_URL:
    _default_broker = REDIS_URL
elif DEBUG:
    _default_broker = 'redis://localhost:6379/0'
else:
    _default_broker = 'memory://'

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', _default_broker)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', _default_broker)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
CELERY_BEAT_SCHEDULE = {
    'process-appointment-reminders': {
        'task': 'reminders.process_appointment_reminders',
        'schedule': 1800.0,  # Periodic check every 30 minutes
    },
}

# ==============================================================================
# Email / SMTP Configuration
# ==============================================================================
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend' if DEBUG and not os.environ.get('EMAIL_HOST_USER') else 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@hospitalplatform.local')

# Setup verification marker
configured = True
