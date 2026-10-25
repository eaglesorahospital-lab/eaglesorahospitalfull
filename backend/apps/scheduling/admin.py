from django.contrib import admin
from .models import DoctorSchedule, ScheduleBreak, DoctorLeave, ScheduleOverride


class ScheduleBreakInline(admin.TabularInline):
    model = ScheduleBreak
    extra = 1
    fields = ('name', 'start_time', 'end_time')


@admin.action(description="Duplicate selected shift to all remaining weekdays (Mon-Fri)")
def duplicate_to_remaining_weekdays(modeladmin, request, queryset):
    weekdays = [
        DoctorSchedule.DayOfWeek.MONDAY,
        DoctorSchedule.DayOfWeek.TUESDAY,
        DoctorSchedule.DayOfWeek.WEDNESDAY,
        DoctorSchedule.DayOfWeek.THURSDAY,
        DoctorSchedule.DayOfWeek.FRIDAY,
    ]
    created_count = 0
    for sched in queryset:
        for day in weekdays:
            if day == sched.day_of_week:
                continue
            _, created = DoctorSchedule.objects.get_or_create(
                doctor=sched.doctor,
                day_of_week=day,
                defaults={
                    'start_time': sched.start_time,
                    'end_time': sched.end_time,
                    'slot_duration_minutes': sched.slot_duration_minutes,
                    'capacity': sched.capacity,
                    'timezone': sched.timezone,
                    'is_working_day': sched.is_working_day,
                    'is_active': sched.is_active,
                }
            )
            if created:
                created_count += 1
    total_selected = len(queryset)
    modeladmin.message_user(
        request,
        f"Duplicated {total_selected} schedule template(s) across weekdays ({created_count} new shifts created)."
    )


@admin.action(description="Duplicate selected shift to Mon, Wed, Fri (MWF)")
def duplicate_to_mwf(modeladmin, request, queryset):
    days = [
        DoctorSchedule.DayOfWeek.MONDAY,
        DoctorSchedule.DayOfWeek.WEDNESDAY,
        DoctorSchedule.DayOfWeek.FRIDAY,
    ]
    created_count = 0
    for sched in queryset:
        for day in days:
            if day == sched.day_of_week:
                continue
            _, created = DoctorSchedule.objects.get_or_create(
                doctor=sched.doctor,
                day_of_week=day,
                defaults={
                    'start_time': sched.start_time,
                    'end_time': sched.end_time,
                    'slot_duration_minutes': sched.slot_duration_minutes,
                    'capacity': sched.capacity,
                    'timezone': sched.timezone,
                    'is_working_day': sched.is_working_day,
                    'is_active': sched.is_active,
                }
            )
            if created:
                created_count += 1
    modeladmin.message_user(
        request,
        f"Duplicated to Mon/Wed/Fri ({created_count} new shifts created)."
    )


@admin.action(description="Duplicate selected shift to Tue, Thu, Sat (TTS)")
def duplicate_to_tts(modeladmin, request, queryset):
    days = [
        DoctorSchedule.DayOfWeek.TUESDAY,
        DoctorSchedule.DayOfWeek.THURSDAY,
        DoctorSchedule.DayOfWeek.SATURDAY,
    ]
    created_count = 0
    for sched in queryset:
        for day in days:
            if day == sched.day_of_week:
                continue
            _, created = DoctorSchedule.objects.get_or_create(
                doctor=sched.doctor,
                day_of_week=day,
                defaults={
                    'start_time': sched.start_time,
                    'end_time': sched.end_time,
                    'slot_duration_minutes': sched.slot_duration_minutes,
                    'capacity': sched.capacity,
                    'timezone': sched.timezone,
                    'is_working_day': sched.is_working_day,
                    'is_active': sched.is_active,
                }
            )
            if created:
                created_count += 1
    modeladmin.message_user(
        request,
        f"Duplicated to Tue/Thu/Sat ({created_count} new shifts created)."
    )


@admin.action(description="Mark selected shifts as active working days")
def activate_schedules(modeladmin, request, queryset):
    updated = queryset.update(is_active=True, is_working_day=True)
    modeladmin.message_user(request, f"{updated} shift schedule(s) marked active.")


@admin.action(description="Mark selected shifts as off/inactive")
def deactivate_schedules(modeladmin, request, queryset):
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f"{updated} shift schedule(s) marked inactive.")


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
    actions = [
        duplicate_to_remaining_weekdays,
        duplicate_to_mwf,
        duplicate_to_tts,
        activate_schedules,
        deactivate_schedules,
    ]
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
