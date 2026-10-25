import json
import os
from django.contrib import admin, messages
from django.urls import path
from django.shortcuts import render, redirect
from django.http import HttpResponse

from .models import HospitalProfile, HospitalFacility, HospitalAnnouncement, HospitalFAQ


@admin.register(HospitalProfile)
class HospitalProfileAdmin(admin.ModelAdmin):
    change_list_template = 'admin/hospital/hospitalprofile/change_list.html'

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
    ordering = ('id',)
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

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'import-setup/',
                self.admin_site.admin_view(self.import_setup_view),
                name='hospital_profile_import_setup',
            ),
            path(
                'download-template/',
                self.admin_site.admin_view(self.download_template_view),
                name='hospital_profile_download_template',
            ),
        ]
        return custom_urls + urls

    def download_template_view(self, request):
        """Serves the verified hospital setup template JSON as an attachment."""
        from django.conf import settings
        template_candidates = [
            os.path.join(settings.BASE_DIR, '..', 'database', 'seeds', 'hospital_setup.template.json'),
            os.path.join(settings.BASE_DIR, 'database', 'seeds', 'hospital_setup.template.json'),
        ]
        template_path = next((p for p in template_candidates if os.path.exists(p)), None)
        if not template_path:
            messages.error(request, "Hospital setup template file was not found on the server.")
            return redirect('admin:hospital_hospitalprofile_changelist')

        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()

        response = HttpResponse(content, content_type='application/json; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="hospital_setup.template.json"'
        return response

    def import_setup_view(self, request):
        """Browser-accessible Django admin view to validate and import hospital setup JSON."""
        from apps.hospital.management.commands.import_hospital_data import Command as ImportCommand
        cmd = ImportCommand()

        if request.method == 'POST':
            dry_run = ('dry_run' in request.POST)
            allow_placeholders = ('allow_placeholders' in request.POST)
            seed_specialties_requested = ('seed_specialties' in request.POST)

            uploaded_file = request.FILES.get('json_file')
            json_text = request.POST.get('json_text', '').strip()

            raw_data = None
            if uploaded_file:
                try:
                    raw_data = json.loads(uploaded_file.read().decode('utf-8'))
                except Exception as e:
                    messages.error(request, f"Uploaded file is not valid JSON: {e}")
                    return redirect('admin:hospital_profile_import_setup')
            elif json_text:
                try:
                    raw_data = json.loads(json_text)
                except Exception as e:
                    messages.error(request, f"Pasted text is not valid JSON: {e}")
                    return redirect('admin:hospital_profile_import_setup')
            elif seed_specialties_requested:
                raw_data = {}
            else:
                messages.error(request, "Please select a JSON file to upload or paste JSON text.")
                return redirect('admin:hospital_profile_import_setup')

            # Seed standard medical specialties if requested
            specialties_msg = ""
            if seed_specialties_requested:
                try:
                    spec_stats = cmd.seed_specialties(dry_run=dry_run)
                    specialties_msg = f"Standard Specialties: {spec_stats['created']} created, {spec_stats['updated']} updated. "
                except Exception as e:
                    messages.warning(request, f"Could not seed standard specialties: {e}")

            if raw_data:
                # Placeholder safety check
                if not allow_placeholders:
                    raw_str = json.dumps(raw_data)
                    found = [p for p in ['[REPLACE', 'TODO', 'EXAMPLE.COM', '0000 0000'] if p.lower() in raw_str.lower()]
                    if found:
                        messages.warning(
                            request,
                            f"Detected placeholder markers ({', '.join(found)}). "
                            "Please replace placeholders with genuine hospital details before importing."
                        )
                        if not dry_run:
                            return redirect('admin:hospital_profile_import_setup')

                errors = cmd.validate_data(raw_data)
                if errors:
                    err_summary = " | ".join(errors[:5])
                    if len(errors) > 5:
                        err_summary += f" ... (+{len(errors) - 5} more)"
                    messages.error(request, f"Validation failed ({len(errors)} error(s)): {err_summary}")
                    return redirect('admin:hospital_profile_import_setup')

                if dry_run:
                    messages.info(
                        request,
                        "[DRY RUN SUCCESS] File schema, relationships, and shift timings validated cleanly! "
                        "No database records were modified. You can now uncheck 'Dry Run' and submit to import."
                    )
                else:
                    try:
                        from django.db import transaction
                        with transaction.atomic():
                            stats = cmd.execute_import(raw_data)
                        messages.success(
                            request,
                            f"Import completed successfully! {specialties_msg}"
                            f"Specialties: {stats['specialties_created']} created, {stats['specialties_updated']} updated | "
                            f"Departments: {stats['departments_created']} created, {stats['departments_updated']} updated | "
                            f"Doctors: {stats['doctors_created']} created, {stats['doctors_updated']} updated | "
                            f"Schedules: {stats['schedules_created']} created, {stats['schedules_updated']} updated."
                        )
                        return redirect('admin:hospital_hospitalprofile_changelist')
                    except Exception as e:
                        messages.error(request, f"Database error during import: {e}")
                        return redirect('admin:hospital_profile_import_setup')

        context = {
            **self.admin_site.each_context(request),
            'title': 'Import Hospital Setup JSON',
            'opts': self.model._meta,
        }
        return render(request, 'admin/hospital/import_setup.html', context)


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
