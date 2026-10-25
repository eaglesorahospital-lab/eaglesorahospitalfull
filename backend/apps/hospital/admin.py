from django.contrib import admin
from .models import HospitalProfile, HospitalFacility, HospitalAnnouncement, HospitalFAQ


@admin.register(HospitalProfile)
class HospitalProfileAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'legal_name',
        'contact_phone',
        'emergency_phone',
        'contact_email',
        'is_active',
        'updated_at',
    )
    list_editable = ('is_active',)
    search_fields = ('name', 'legal_name', 'contact_email', 'address')
    readonly_fields = ('created_at', 'updated_at', 'logo_url')
    fieldsets = (
        ('Institutional Governance', {
            'fields': ('name', 'legal_name', 'tagline', 'overview', 'is_active')
        }),
        ('Contact & Emergency Triage', {
            'fields': (
                'contact_phone',
                'emergency_phone',
                'contact_email',
                'address',
                'visiting_hours',
                'emergency_info',
            )
        }),
        ('Branding & Media', {
            'fields': ('logo', 'logo_public_id', 'logo_url')
        }),
        ('Audit Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(HospitalFacility)
class HospitalFacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'order', 'is_active', 'created_at')
    list_editable = ('order', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('order', 'name')


@admin.register(HospitalAnnouncement)
class HospitalAnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_published', 'published_at', 'created_at')
    list_filter = ('category', 'is_published')
    search_fields = ('title', 'summary', 'content')
    prepopulated_fields = {'slug': ('title',)}
    ordering = ('-published_at', '-created_at')


@admin.register(HospitalFAQ)
class HospitalFAQAdmin(admin.ModelAdmin):
    list_display = ('question', 'order', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('question', 'answer')
    ordering = ('order', 'id')
