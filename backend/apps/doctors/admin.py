from datetime import time
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


@admin.action(description="Generate Mon-Fri 09:00-13:00 OPD schedule for selected doctors")
def generate_standard_weekday_schedule(modeladmin, request, queryset):
    created_count = 0
    weekdays = [
        DoctorSchedule.DayOfWeek.MONDAY,
        DoctorSchedule.DayOfWeek.TUESDAY,
        DoctorSchedule.DayOfWeek.WEDNESDAY,
        DoctorSchedule.DayOfWeek.THURSDAY,
        DoctorSchedule.DayOfWeek.FRIDAY,
    ]
    for doctor in queryset:
        duration = doctor.consultation_duration_minutes or 30
        for day in weekdays:
            _, created = DoctorSchedule.objects.get_or_create(
                doctor=doctor,
                day_of_week=day,
                defaults={
                    'start_time': time(9, 0),
                    'end_time': time(13, 0),
                    'slot_duration_minutes': duration,
                    'capacity': 1,
                    'timezone': 'Asia/Kolkata',
                    'is_working_day': True,
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
    total_selected = len(queryset)
    modeladmin.message_user(
        request,
        f"Generated standard weekday schedule for {total_selected} doctor(s) ({created_count} new shifts created)."
    )


@admin.action(description="Mark selected doctors as active")
def activate_doctors(modeladmin, request, queryset):
    updated = queryset.update(is_active=True)
    modeladmin.message_user(request, f"{updated} doctor(s) marked active.")


@admin.action(description="Mark selected doctors as inactive")
def deactivate_doctors(modeladmin, request, queryset):
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f"{updated} doctor(s) marked inactive.")


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
    list_select_related = ('department', 'specialty')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [DoctorScheduleInline]
    actions = [generate_standard_weekday_schedule, activate_doctors, deactivate_doctors]
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
