from django.contrib import admin
from .models import DoctorSchedule, ScheduleBreak, DoctorLeave, ScheduleOverride


class ScheduleBreakInline(admin.TabularInline):
    model = ScheduleBreak
    extra = 1
    fields = ('name', 'start_time', 'end_time')


@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    list_display = (
        'doctor',
        'day_of_week',
        'start_time',
        'end_time',
        'slot_duration_minutes',
        'capacity',
        'is_working_day',
        'is_active',
    )
    list_filter = ('day_of_week', 'is_working_day', 'is_active', 'doctor__department')
    search_fields = ('doctor__name',)
    inlines = [ScheduleBreakInline]
    ordering = ('doctor', 'day_of_week')


@admin.register(ScheduleBreak)
class ScheduleBreakAdmin(admin.ModelAdmin):
    list_display = ('schedule', 'name', 'start_time', 'end_time')
    search_fields = ('name', 'schedule__doctor__name')


@admin.register(DoctorLeave)
class DoctorLeaveAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'start_date', 'end_date', 'reason', 'is_active')
    list_filter = ('is_active', 'doctor__department')
    search_fields = ('doctor__name', 'reason')


@admin.register(ScheduleOverride)
class ScheduleOverrideAdmin(admin.ModelAdmin):
    list_display = (
        'doctor',
        'override_date',
        'override_type',
        'is_available',
        'start_time',
        'end_time',
    )
    list_filter = ('override_type', 'is_available', 'doctor__department')
    search_fields = ('doctor__name', 'reason')
