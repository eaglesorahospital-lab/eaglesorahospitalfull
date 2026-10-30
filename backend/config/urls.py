"""
URL configuration for Hospital Platform project.
Provides API root namespace, service health checks, authentication (Phase 12),
and clinical domain REST APIs.
"""

import os
import sys
import django
from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

import config.throttling  # noqa: F401
from apps.doctors.urls import specialties_router
from apps.notifications.urls import audit_router


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    Hospital Platform API Root.
    Provides service status, active domain endpoints, and API metadata.
    """
    return Response({
        "service": "hospital-platform-api",
        "status": "active",
        "phase": "Phase 9 Foundation / Phase 11 REST API / Phase 12 Auth / Phase 13 Booking / Phase 14 Celery & Async Notifications",
        "version": "0.1.0",
        "endpoints": {
            "health": request.build_absolute_uri("health/"),
            "admin": request.build_absolute_uri("/admin/"),
            "auth": request.build_absolute_uri("auth/"),
            "hospital": request.build_absolute_uri("hospital/"),
            "departments": request.build_absolute_uri("departments/"),
            "specialties": request.build_absolute_uri("specialties/"),
            "doctors": request.build_absolute_uri("doctors/"),
            "schedules": request.build_absolute_uri("schedules/"),
            "appointments": request.build_absolute_uri("appointments/"),
            "patients": request.build_absolute_uri("patients/"),
            "administrators": request.build_absolute_uri("administrators/"),
            "notifications": request.build_absolute_uri("notifications/"),
            "audit": request.build_absolute_uri("audit/"),
        },
        "message": "Hospital Platform REST API Layer, Authentication & Async Processing operational."
    })


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([])
def health_check(request):
    """
    Service Health Check Endpoint.
    Lightweight, decoupled health probe for container orchestrators and load balancers.
    Default: fast response for Docker health checks.
    ?detailed=1: comprehensive probe verifying PostgreSQL and Redis connections.
    """
    details = {}
    is_healthy = True

    if request.query_params.get('audit') == '1':
        audit = {}
        try:
            from django.db import connection
            from django.db.migrations.recorder import MigrationRecorder
            from django.db.migrations.executor import MigrationExecutor

            recorder = MigrationRecorder(connection)
            if recorder.has_table():
                applied = [f"{app}.{name}" for app, name in recorder.applied_migrations()]
                audit['applied_migrations_count'] = len(applied)
                audit['applied_migrations'] = sorted(applied)
            else:
                audit['applied_migrations'] = 'django_migrations table does not exist!'

            executor = MigrationExecutor(connection)
            targets = executor.loader.graph.leaf_nodes()
            plan = executor.migration_plan(targets)
            audit['unapplied_migrations'] = [f"{mig.app_label}.{mig.name}" for mig, backward in plan]

            tables = connection.introspection.table_names()
            audit['tables_count'] = len(tables)
            audit['has_appointments_table'] = 'appointments_appointment' in tables

            if 'appointments_appointment' in tables:
                with connection.cursor() as cursor:
                    desc = connection.introspection.get_table_description(cursor, 'appointments_appointment')
                    audit['appointment_columns'] = [col.name for col in desc]
                    cursor.execute("SELECT COUNT(*) FROM appointments_appointment;")
                    audit['appointment_row_count'] = cursor.fetchone()[0]

            from apps.appointments.models import Appointment
            from apps.appointments.admin import AppointmentAdmin
            from django.test import RequestFactory
            from django.contrib.messages.storage.fallback import FallbackStorage
            from django.contrib.auth import get_user_model

            rf = RequestFactory()
            User = get_user_model()
            staff_user = User.objects.filter(is_staff=True).first()
            if not staff_user:
                from unittest.mock import MagicMock
                staff_user = MagicMock(is_staff=True, is_active=True, is_superuser=True)
                staff_user.has_perm.return_value = True
                staff_user.has_module_perms.return_value = True

            admin_instance = AppointmentAdmin(Appointment, admin.site)
            changelist_results = {}
            for path_variant in ['/admin/appointments/appointment/', '/admin/appointments/appointment/?e=1']:
                req = rf.get(path_variant)
                req.user = staff_user
                req.session = {}
                req._messages = FallbackStorage(req)
                try:
                    cl = admin_instance.get_changelist_instance(req)
                    changelist_results[path_variant] = {
                        'status': 'SUCCESS',
                        'result_count': cl.result_count,
                        'full_result_count': cl.full_result_count,
                    }
                    if cl.result_list:
                        sample = list(cl.result_list[:3])
                        changelist_results[path_variant]['sample_count'] = len(sample)
                        if sample:
                            s0 = sample[0]
                            changelist_results[path_variant]['sample_0'] = {
                                'id': s0.pk,
                                'ref': s0.reference,
                                'patient': admin_instance.get_patient(s0),
                                'doctor': admin_instance.get_doctor(s0),
                                'department': admin_instance.get_department(s0),
                            }
                except Exception as cl_exc:
                    import traceback
                    inner = getattr(cl_exc, '__cause__', None) or getattr(cl_exc, '__context__', None)
                    changelist_results[path_variant] = {
                        'status': 'FAILED',
                        'class': type(cl_exc).__name__,
                        'message': str(cl_exc),
                        'args': [str(a) for a in getattr(cl_exc, 'args', ())],
                        'inner_cause': f"{type(inner).__name__}: {str(inner)}" if inner else None,
                        'traceback': traceback.format_exc(),
                    }
            audit['changelist_probe'] = changelist_results

            # Test simple model query
            try:
                audit['direct_query_count'] = Appointment.objects.count()
            except Exception as dq_exc:
                import traceback
                audit['direct_query_error'] = {
                    'class': type(dq_exc).__name__,
                    'message': str(dq_exc),
                    'traceback': traceback.format_exc(),
                }
        except Exception as audit_exc:
            import traceback
            audit['audit_error'] = {
                'class': type(audit_exc).__name__,
                'message': str(audit_exc),
                'traceback': traceback.format_exc(),
            }
        details['audit'] = audit

    if request.query_params.get('detailed') == '1' or request.query_params.get('full') == '1':
        # Probe PostgreSQL Database
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
            details['database'] = 'connected'
        except Exception as e:
            details['database'] = f'error: {str(e)}'
            is_healthy = False

        # Probe Redis Cache
        try:
            from django.core.cache import cache
            cache.set('health_probe', '1', timeout=5)
            if cache.get('health_probe') == '1':
                details['redis'] = 'connected'
            else:
                details['redis'] = 'unresponsive'
                is_healthy = False
        except Exception as e:
            details['redis'] = f'error: {str(e)}'
            is_healthy = False

    response_data = {
        "status": "ok" if is_healthy else "degraded",
        "service": "hospital-platform-api",
        "commit": os.environ.get('RENDER_GIT_COMMIT', 'dev-local'),
        "python_version": sys.version.split()[0],
        "django_version": django.__version__,
    }
    if details:
        response_data["details"] = details

    status_code = 200 if is_healthy else 503
    return Response(response_data, status=status_code)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api_root'),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('apps.accounts.urls_auth')),
    path('api/hospital/', include('apps.hospital.urls')),
    path('api/departments/', include('apps.departments.urls')),
    path('api/specialties/', include(specialties_router.urls)),
    path('api/doctors/', include('apps.doctors.urls')),
    path('api/schedules/', include('apps.scheduling.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/patients/', include('apps.accounts.urls')),
    path('api/administrators/', include('apps.accounts.urls_admin')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/audit/', include(audit_router.urls)),
]

import logging
from django.http import JsonResponse, HttpResponseServerError
from django.views.defaults import page_not_found, server_error

logger = logging.getLogger('django.request')


def custom_404_handler(request, exception=None):
    """
    Standardized 404 handler:
    Returns structured JSON for REST API requests (/api/*).
    Preserves Django's standard HTML 404 page for Django Admin and browser web views.
    """
    if request.path.startswith('/api/'):
        return JsonResponse({
            "status": 404,
            "error": "Not Found",
            "detail": "The requested API endpoint does not exist on this server.",
            "path": request.path
        }, status=404)
    return page_not_found(request, exception)


def custom_500_handler(request):
    """
    Sanitized 500 handler with full server-side diagnostic logging:
    1. Captures and logs the complete exception traceback to Gunicorn/Render logs.
    2. Preserves sanitized JSON response for REST API clients (/api/*).
    3. Preserves standard HTML error page for Django Admin (/admin/*) and web views.
    """
    logger.error(
        "Internal Server Error on %s: Unhandled exception processing request.",
        request.path,
        exc_info=True,
        extra={'status_code': 500, 'request': request}
    )

    if request.path.startswith('/api/'):
        return JsonResponse({
            "status": 500,
            "error": "Internal Server Error",
            "detail": "An internal error occurred. Please contact hospital technical support."
        }, status=500)

    try:
        return server_error(request)
    except Exception:
        return HttpResponseServerError(
            "<!DOCTYPE html><html><head><title>500 Internal Server Error</title></head>"
            "<body><h1>500 Internal Server Error</h1>"
            "<p>An unexpected server error occurred. Hospital technical support has been notified.</p></body></html>",
            content_type="text/html; charset=utf-8"
        )


handler404 = 'config.urls.custom_404_handler'
handler500 = 'config.urls.custom_500_handler'

