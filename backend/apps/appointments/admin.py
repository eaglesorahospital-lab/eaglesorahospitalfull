from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        'reference',
        'patient',
        'doctor',
        'department',
        'appointment_date',
        'start_time',
        'end_time',
        'appointment_type',
        'status',
        'created_at',
    )
    list_filter = ('status', 'appointment_type', 'appointment_date', 'department')
    search_fields = (
        'reference',
        'patient__first_name',
        'patient__last_name',
        'patient__mrn',
        'doctor__name',
        'reason_for_visit',
    )
    readonly_fields = ('reference', 'created_at', 'updated_at', 'idempotency_key')
    list_select_related = ('patient', 'doctor', 'doctor__department', 'department')
    ordering = ('-appointment_date', '-start_time')
