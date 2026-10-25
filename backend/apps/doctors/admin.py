from django.contrib import admin
from .models import Specialty, Doctor, DoctorInvitation
from apps.scheduling.models import DoctorSchedule


class DoctorScheduleInline(admin.TabularInline):
    model = DoctorSchedule
    extra = 0
    fields = (
        'day_of_week',
        'start_time',
        'end_time',
        'slot_duration_minutes',
        'capacity',
        'is_working_day',
        'is_active',
    )
    ordering = ('day_of_week',)


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'department',
        'specialty_name',
        'qualification',
        'experience_years',
        'consultation_location',
        'consultation_duration_minutes',
        'is_active',
    )
    list_filter = ('is_active', 'department', 'specialty', 'consultation_type')
    search_fields = ('name', 'qualification', 'expertise', 'bio', 'consultation_location')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [DoctorScheduleInline]
    fieldsets = (
        ('Practitioner Identity', {
            'fields': (
                'name',
                'slug',
                'user',
                'department',
                'specialty',
                'specialty_name',
                'is_active',
            )
        }),
        ('Credentials & Clinical Expertise', {
            'fields': ('qualification', 'experience_years', 'expertise', 'bio')
        }),
        ('Outpatient Consultation Parameters', {
            'fields': (
                'consultation_type',
                'consultation_duration_minutes',
                'consultation_location',
            )
        }),
        ('Profile Media', {
            'fields': ('image', 'image_public_id')
        }),
    )


@admin.register(DoctorInvitation)
class DoctorInvitationAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'email', 'status', 'expires_at', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('email', 'doctor__name')
    readonly_fields = ('token_hash', 'created_at', 'updated_at', 'accepted_at', 'revoked_at')
