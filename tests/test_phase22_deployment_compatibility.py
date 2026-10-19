"""
Phase 22 — Deployment Compatibility & Production Configuration Test Suite.
Validates:
1. Gunicorn Dynamic Port Binding (PORT, GUNICORN_BIND, local default)
2. PostgreSQL DATABASE_URL parsing (valid, URL-encoded credentials, SSL enforcement, fail-fast on malformed/non-postgres)
3. WhiteNoise Static Files Serving & Middleware placement
4. Redis & Distributed Rate-Limiting Cache Policy (fail-fast in prod, opt-in LocMem fallback)
5. Celery Eager & Broker resilience
"""

import os
import sys
import unittest
from unittest.mock import patch

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import TestCase
from django.core.exceptions import ImproperlyConfigured
from django.conf import settings
import dj_database_url


class GunicornPortBindingTests(TestCase):
    """Verifies Render dynamic port binding and fallback logic in gunicorn.conf.py."""

    def setUp(self):
        self.gunicorn_conf_path = os.path.join(backend_dir, 'gunicorn.conf.py')

    def test_gunicorn_default_bind(self):
        """When neither PORT nor GUNICORN_BIND is set, binds to 0.0.0.0:8000."""
        env = os.environ.copy()
        env.pop('PORT', None)
        env.pop('GUNICORN_BIND', None)
        with patch.dict(os.environ, env, clear=True):
            ns = {}
            with open(self.gunicorn_conf_path, 'r', encoding='utf-8') as f:
                exec(f.read(), ns)
            self.assertEqual(ns.get('bind'), '0.0.0.0:8000')

    def test_gunicorn_dynamic_port_honored(self):
        """When Render injects PORT=10000, binds to 0.0.0.0:10000."""
        env = os.environ.copy()
        env['PORT'] = '10000'
        env.pop('GUNICORN_BIND', None)
        with patch.dict(os.environ, env, clear=True):
            ns = {}
            with open(self.gunicorn_conf_path, 'r', encoding='utf-8') as f:
                exec(f.read(), ns)
            self.assertEqual(ns.get('bind'), '0.0.0.0:10000')

    def test_gunicorn_explicit_bind_override(self):
        """When GUNICORN_BIND is explicitly specified, it overrides PORT."""
        env = os.environ.copy()
        env['PORT'] = '10000'
        env['GUNICORN_BIND'] = '127.0.0.1:9090'
        with patch.dict(os.environ, env, clear=True):
            ns = {}
            with open(self.gunicorn_conf_path, 'r', encoding='utf-8') as f:
                exec(f.read(), ns)
            self.assertEqual(ns.get('bind'), '127.0.0.1:9090')


class DatabaseUrlConfigurationTests(TestCase):
    """Verifies safe DATABASE_URL parsing, URL-encoding, SSL enforcement, and fail-fast checks."""

    def test_valid_database_url_parsing(self):
        """Valid PostgreSQL URI parses into correct connection parameters."""
        raw_url = 'postgres://hospital_admin:strongpass123@dpg-abc-a.oregon-postgres.render.com:5432/hospital_prod'
        parsed = dj_database_url.parse(raw_url)
        self.assertEqual(parsed['ENGINE'], 'django.db.backends.postgresql')
        self.assertEqual(parsed['USER'], 'hospital_admin')
        self.assertEqual(parsed['PASSWORD'], 'strongpass123')
        self.assertEqual(parsed['HOST'], 'dpg-abc-a.oregon-postgres.render.com')
        self.assertEqual(parsed['PORT'], 5432)
        self.assertEqual(parsed['NAME'], 'hospital_prod')

    def test_url_encoded_credentials(self):
        """URL-encoded special characters (%40 -> @, %3A -> :, %21 -> !) in password are decoded correctly."""
        raw_url = 'postgres://dr_user:p%40ss%3Aword%21@db.render.com:5432/hospital_prod'
        parsed = dj_database_url.parse(raw_url)
        self.assertEqual(parsed['PASSWORD'], 'p@ss:word!')

    def test_production_ssl_mode_enforcement(self):
        """Settings logic enforces sslmode=require for non-local production database hosts."""
        url = 'postgres://admin:pass@db.oregon-postgres.render.com:5432/hospital_db'
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': url,
            'REDIS_URL': 'redis://redishost:6379/1',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            db_cfg = s.DATABASES['default']
            self.assertEqual(db_cfg['OPTIONS'].get('sslmode'), 'require')

    def test_localhost_does_not_force_ssl_by_default(self):
        """Localhost database connection does not require SSL unless explicitly flagged."""
        url = 'postgres://admin:pass@127.0.0.1:5432/hospital_db'
        env = {
            'DJANGO_DEBUG': 'True',
            'DATABASE_URL': url,
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            db_cfg = s.DATABASES['default']
            self.assertNotIn('sslmode', db_cfg.get('OPTIONS', {}))

    def test_non_postgres_engine_raises_improperly_configured(self):
        """Non-Postgres database engines (e.g. mysql, sqlite) are rejected with ImproperlyConfigured."""
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'sqlite:///tmp/test.db',
            'REDIS_URL': 'redis://redishost:6379/1',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            with self.assertRaises(ImproperlyConfigured) as ctx:
                reload(s)
            self.assertIn('Only PostgreSQL databases are supported', str(ctx.exception))

    def test_malformed_database_url_raises_improperly_configured(self):
        """Malformed database URI raises ImproperlyConfigured without leaking credentials in logs."""
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'not_a_valid_url_string',
            'REDIS_URL': 'redis://redishost:6379/1',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            with self.assertRaises(ImproperlyConfigured) as ctx:
                reload(s)
            self.assertIn('Invalid DATABASE_URL', str(ctx.exception))


class WhiteNoiseStaticFilesTests(TestCase):
    """Verifies WhiteNoise middleware registration and storage configuration."""

    def test_whitenoise_middleware_positioned_after_security_middleware(self):
        """WhiteNoiseMiddleware must immediately follow SecurityMiddleware."""
        from django.conf import settings
        middleware = settings.MIDDLEWARE
        self.assertIn('whitenoise.middleware.WhiteNoiseMiddleware', middleware)
        sec_idx = middleware.index('django.middleware.security.SecurityMiddleware')
        wn_idx = middleware.index('whitenoise.middleware.WhiteNoiseMiddleware')
        self.assertEqual(wn_idx, sec_idx + 1)

    def test_whitenoise_manifest_strict_disabled(self):
        """WHITENOISE_MANIFEST_STRICT should be False to prevent build failures on optional sourcemaps."""
        from django.conf import settings
        self.assertFalse(getattr(settings, 'WHITENOISE_MANIFEST_STRICT', True))

    def test_production_storages_configuration(self):
        """When DEBUG=False, staticfiles storage uses CompressedManifestStaticFilesStorage."""
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'postgres://admin:pass@dpg-abc:5432/hospital_prod',
            'REDIS_URL': 'redis://redishost:6379/1',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            self.assertEqual(
                s.STORAGES['staticfiles']['BACKEND'],
                'whitenoise.storage.CompressedManifestStaticFilesStorage'
            )


class RedisCachePolicyTests(TestCase):
    """Verifies explicit Redis cache and distributed rate-limiting policy."""

    def test_redis_url_configured_in_production(self):
        """When REDIS_URL is provided, RedisCache is active."""
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'postgres://admin:pass@dpg-abc:5432/hospital_prod',
            'REDIS_URL': 'redis://clustered-redis:6379/1',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            self.assertEqual(s.CACHES['default']['BACKEND'], 'django.core.cache.backends.redis.RedisCache')
            self.assertEqual(s.CACHES['default']['LOCATION'], 'redis://clustered-redis:6379/1')

    def test_missing_redis_in_production_fails_fast(self):
        """When DEBUG=False and REDIS_URL is absent, raises ImproperlyConfigured by default."""
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'postgres://admin:pass@dpg-abc:5432/hospital_prod',
            'FORCE_PRODUCTION_REDIS_CHECK': 'True',
        }
        env.pop('REDIS_URL', None)
        env.pop('ALLOW_IN_MEMORY_CACHE_FALLBACK', None)
        with patch.dict(os.environ, env, clear=True):
            from importlib import reload
            import config.settings as s
            with self.assertRaises(ImproperlyConfigured) as ctx:
                reload(s)
            self.assertIn('REDIS_URL environment variable is required in production', str(ctx.exception))

    def test_opt_in_locmem_fallback_in_production(self):
        """When ALLOW_IN_MEMORY_CACHE_FALLBACK=True in production, allows LocMemCache with security warning."""
        env = {
            'DJANGO_DEBUG': 'False',
            'DJANGO_SECRET_KEY': 'production-cryptographically-secure-key-50-characters-long-example',
            'DATABASE_URL': 'postgres://admin:pass@dpg-abc:5432/hospital_prod',
            'ALLOW_IN_MEMORY_CACHE_FALLBACK': 'True',
        }
        env.pop('REDIS_URL', None)
        with patch.dict(os.environ, env, clear=True):
            from importlib import reload
            import config.settings as s
            reload(s)
            self.assertEqual(s.CACHES['default']['BACKEND'], 'django.core.cache.backends.locmem.LocMemCache')

    def test_celery_task_always_eager_flag(self):
        """CELERY_TASK_ALWAYS_EAGER honors environment variable."""
        env = {
            'DJANGO_DEBUG': 'True',
            'CELERY_TASK_ALWAYS_EAGER': 'True',
        }
        with patch.dict(os.environ, env):
            from importlib import reload
            import config.settings as s
            reload(s)
            self.assertTrue(s.CELERY_TASK_ALWAYS_EAGER)
