from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        'reference',
        'get_patient',
        'get_doctor',
        'get_department',
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
    date_hierarchy = None
    show_facets = admin.ShowFacets.NEVER

    @admin.display(description='Patient', ordering='patient')
    def get_patient(self, obj):
        try:
            return str(obj.patient) if obj.patient_id else '-'
        except Exception:
            return f"Patient #{obj.patient_id}" if obj.patient_id else '-'

    @admin.display(description='Doctor', ordering='doctor')
    def get_doctor(self, obj):
        try:
            return str(obj.doctor) if obj.doctor_id else '-'
        except Exception:
            return f"Doctor #{obj.doctor_id}" if obj.doctor_id else '-'

    @admin.display(description='Department', ordering='department')
    def get_department(self, obj):
        try:
            return str(obj.department) if obj.department_id else '-'
        except Exception:
            return f"Department #{obj.department_id}" if obj.department_id else '-'
