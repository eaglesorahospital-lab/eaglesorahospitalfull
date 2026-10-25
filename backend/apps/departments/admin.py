from django.contrib import admin
from .models import Department, DepartmentService, DepartmentFAQ


class DepartmentServiceInline(admin.TabularInline):
    model = DepartmentService
    extra = 1
    fields = ('name', 'description', 'order', 'is_active')


class DepartmentFAQInline(admin.StackedInline):
    model = DepartmentFAQ
    extra = 0
    fields = ('question', 'answer', 'order', 'is_active')


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'slug',
        'specialty',
        'location',
        'opd_hours',
        'contact_phone',
        'is_active',
    )
    list_filter = ('is_active', 'specialty')
    search_fields = ('name', 'slug', 'specialty', 'short_description', 'location')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [DepartmentServiceInline, DepartmentFAQInline]
    fieldsets = (
        ('Department Identity', {
            'fields': (
                'name',
                'slug',
                'specialty',
                'short_description',
                'full_description',
                'is_active',
            )
        }),
        ('Location & Operational Hours', {
            'fields': (
                'location',
                'opd_hours',
                'contact_phone',
                'contact_email',
                'extension',
            )
        }),
        ('Media & Visual Assets', {
            'fields': ('image', 'image_public_id')
        }),
    )


@admin.register(DepartmentService)
class DepartmentServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'order', 'is_active')
    list_filter = ('department', 'is_active')
    search_fields = ('name', 'description', 'department__name')
    ordering = ('department', 'order')


@admin.register(DepartmentFAQ)
class DepartmentFAQAdmin(admin.ModelAdmin):
    list_display = ('question', 'department', 'order', 'is_active')
    list_filter = ('department', 'is_active')
    search_fields = ('question', 'answer', 'department__name')
