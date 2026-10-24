/**
 * Hospital Platform — Doctor API Service
 * Authoritative integration with Django REST Framework (/api/doctors/).
 * Persists all Doctor CRUD mutations into PostgreSQL with RBAC token authorization.
 */

import authService from './authService';
import apiClient from './api';
import { DEMO_DOCTORS } from '../data/hospitalData';

/**
 * Normalizes a doctor object from the Django REST API into the shape
 * expected by both frontend public components and admin management tables.
 */
export function normalizeDoctor(doc) {
  if (!doc) return null;

  const isActive = doc.is_active !== undefined ? Boolean(doc.is_active) : (String(doc.status).toLowerCase() === 'active');
  const qualificationList = Array.isArray(doc.qualification)
    ? doc.qualification
    : (typeof doc.qualification === 'string' && doc.qualification
        ? doc.qualification.split(',').map((q) => q.trim()).filter(Boolean)
        : []);

  const expertiseList = Array.isArray(doc.expertise)
    ? doc.expertise
    : (typeof doc.expertise === 'string' && doc.expertise
        ? doc.expertise.split(',').map((e) => e.trim()).filter(Boolean)
        : []);

  const durationMin = doc.consultation_duration_minutes ||
    (typeof doc.consultation?.duration === 'string' ? parseInt(doc.consultation.duration, 10) : 30) || 30;

  const resolvedPhoto = doc.photo || doc.photo_url || doc.image_url || doc.image || null;

  return {
    ...doc,
    id: doc.id,
    slug: doc.slug,
    name: doc.name || '',
    initials: doc.initials || (doc.name ? doc.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'),
    specialty: doc.specialty_name || doc.specialty?.name || doc.specialty || 'General Medicine',
    specialty_name: doc.specialty_name || doc.specialty?.name || doc.specialty || 'General Medicine',
    specialtyId: doc.specialty?.id || doc.specialty,
    department: doc.department?.id || doc.department,
    departmentId: doc.department_slug || (doc.department?.slug) || (doc.department?.id ? String(doc.department.id) : String(doc.department || '')),
    departmentSlug: doc.department_slug || doc.department?.slug || '',
    departmentName: doc.department_name || doc.department?.name || doc.departmentName || 'Clinical Care',
    qualification: qualificationList,
    experience: doc.experience_years || doc.experience || 5,
    experience_years: doc.experience_years || doc.experience || 5,
    bio: doc.bio || `Consultant medical specialist at EgleSora Hospital.`,
    expertise: expertiseList,
    consultation_type: doc.consultation_type || doc.consultation?.type || 'In-person Consultation',
    consultation_duration_minutes: durationMin,
    consultation_location: doc.consultation_location || doc.consultation?.location || 'Consultation Suite, Wing A',
    consultation: {
      type: doc.consultation_type || doc.consultation?.type || 'In-person Consultation',
      duration: `${durationMin} minutes`,
      location: doc.consultation_location || doc.consultation?.location || 'Consultation Suite, Wing A',
    },
    schedule: doc.schedule || {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: '09:00 AM - 01:00 PM',
      breaks: ['01:00 PM - 02:00 PM'],
    },
    leave: doc.leave || [],
    is_active: isActive,
    status: isActive ? 'active' : 'inactive',
    photo: resolvedPhoto,
    photo_url: resolvedPhoto,
    image_url: resolvedPhoto,
    invitation_status: doc.invitation_status || 'NONE',
    account_lifecycle_status: doc.account_lifecycle_status || (isActive ? 'ACTIVE' : 'INACTIVE'),
    latest_invitation_sent_at: doc.latest_invitation_sent_at || null,
    latest_invitation_expires_at: doc.latest_invitation_expires_at || null,
    user_is_active: doc.user_is_active !== undefined ? Boolean(doc.user_is_active) : isActive,
  };
}


export const doctorService = {
  /**
   * Fetch all doctors from Django API with optional query filters.
   */
  async getDoctors(params = {}) {
    const queryParams = {
      page_size: params.pageSize || params.page_size || '100',
    };
    if (params.search) queryParams.search = params.search;
    if (params.department) queryParams.department__slug = params.department;
    if (params.specialty) queryParams.specialty__slug = params.specialty;
    if (params.is_active !== undefined) queryParams.is_active = String(params.is_active);

    const data = await apiClient.get('/api/doctors/', { params: queryParams });
    const rawList = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
    const doctors = rawList.map(normalizeDoctor);
    return {
      results: doctors,
      count: data.count !== undefined ? data.count : doctors.length,
    };
  },

  /**
   * Fetch a single doctor by slug or numeric ID.
   */
  async getDoctor(idOrSlug) {
    try {
      const data = await apiClient.get(`/api/doctors/${idOrSlug}/`);
      return normalizeDoctor(data);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  /**
   * Create a new doctor in PostgreSQL via POST /api/doctors/
   */
  async createDoctor(doctorPayload) {
    let body;
    if (doctorPayload instanceof FormData) {
      body = doctorPayload;
    } else if (doctorPayload.photoFile || doctorPayload.photo || doctorPayload.image) {
      const formData = new FormData();
      Object.entries(doctorPayload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          if (k === 'photoFile' || k === 'photo' || k === 'image') {
            if (v instanceof File || v instanceof Blob) {
              formData.append('image', v);
            }
          } else {
            formData.append(k, v);
          }
        }
      });
      body = formData;
    } else {
      body = {
        name: doctorPayload.name,
        email: doctorPayload.email,
        phone: doctorPayload.phone || doctorPayload.mobile,
        department: doctorPayload.department,
        specialty: doctorPayload.specialty || null,
        specialty_name: doctorPayload.specialty_name || doctorPayload.specialty || '',
        qualification: Array.isArray(doctorPayload.qualification)
          ? doctorPayload.qualification.join(', ')
          : (doctorPayload.qualification || 'MBBS'),
        experience_years: Number(doctorPayload.experience_years || doctorPayload.experience) || 5,
        bio: doctorPayload.bio || `Consultant physician at EgleSora Hospital.`,
        expertise: Array.isArray(doctorPayload.expertise)
          ? doctorPayload.expertise.join(', ')
          : (doctorPayload.expertise || ''),
        consultation_type: doctorPayload.consultation_type || 'In-person Consultation',
        consultation_duration_minutes: Number(doctorPayload.consultation_duration_minutes) || 30,
        consultation_location: doctorPayload.consultation_location || 'Consultation Suite, Wing A',
        is_active: doctorPayload.is_active !== undefined ? Boolean(doctorPayload.is_active) : true,
      };
    }

    const data = await apiClient.post('/api/doctors/', body, { requiresAuth: true });
    const docData = data.doctor || data;
    return {
      doctor: normalizeDoctor(docData),
      credentials: data.credentials || null,
      invitation: data.invitation || null,
    };
  },

  /**
   * Get authenticated doctor's profile via GET /api/doctors/me/
   */
  async getMyDoctorProfile() {
    const data = await apiClient.get('/api/doctors/me/', { requiresAuth: true });
    return normalizeDoctor(data);
  },

  /**
   * Update authenticated doctor's profile via PATCH /api/doctors/me/
   */
  async updateMyDoctorProfile(updatePayload) {
    let body = updatePayload;
    if (updatePayload && (updatePayload.photoFile || updatePayload.photo instanceof File || updatePayload.image instanceof File)) {
      const formData = new FormData();
      Object.entries(updatePayload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          if ((k === 'photoFile' || k === 'photo' || k === 'image') && (v instanceof File || v instanceof Blob)) {
            formData.append('image', v);
          } else {
            formData.append(k, v);
          }
        }
      });
      body = formData;
    }
    const data = await apiClient.patch('/api/doctors/me/', body, { requiresAuth: true });
    return normalizeDoctor(data);
  },

  /**
   * Update doctor details in PostgreSQL via PATCH /api/doctors/<slug_or_id>/
   */
  async updateDoctor(idOrSlug, updatePayload) {
    const payload = {};
    if (updatePayload.name !== undefined) payload.name = updatePayload.name;
    if (updatePayload.department !== undefined) payload.department = updatePayload.department;
    if (updatePayload.specialty_name !== undefined) payload.specialty_name = updatePayload.specialty_name;
    if (updatePayload.qualification !== undefined) {
      payload.qualification = Array.isArray(updatePayload.qualification)
        ? updatePayload.qualification.join(', ')
        : updatePayload.qualification;
    }
    if (updatePayload.experience !== undefined || updatePayload.experience_years !== undefined) {
      payload.experience_years = Number(updatePayload.experience_years || updatePayload.experience);
    }
    if (updatePayload.bio !== undefined) payload.bio = updatePayload.bio;
    if (updatePayload.expertise !== undefined) {
      payload.expertise = Array.isArray(updatePayload.expertise)
        ? updatePayload.expertise.join(', ')
        : updatePayload.expertise;
    }
    if (updatePayload.consultation_type !== undefined) payload.consultation_type = updatePayload.consultation_type;
    if (updatePayload.consultation_duration_minutes !== undefined) {
      payload.consultation_duration_minutes = Number(updatePayload.consultation_duration_minutes);
    }
    if (updatePayload.consultation_location !== undefined) payload.consultation_location = updatePayload.consultation_location;
    if (updatePayload.is_active !== undefined) payload.is_active = Boolean(updatePayload.is_active);

    const data = await apiClient.patch(`/api/doctors/${idOrSlug}/`, payload, { requiresAuth: true });
    return normalizeDoctor(data);
  },

  /**
   * Toggle active/inactive status in PostgreSQL.
   */
  async toggleDoctorStatus(idOrSlug, currentStatus) {
    const nextIsActive = typeof currentStatus === 'boolean'
      ? !currentStatus
      : (String(currentStatus).toUpperCase() !== 'ACTIVE');

    return this.updateDoctor(idOrSlug, { is_active: nextIsActive });
  },

  /**
   * Upload or replace doctor profile photo via POST /api/doctors/<idOrSlug>/upload-photo/
   */
  async uploadDoctorPhoto(idOrSlug, file) {
    const formData = new FormData();
    formData.append('image', file);
    const data = await apiClient.post(`/api/doctors/${idOrSlug}/upload-photo/`, formData, {
      requiresAuth: true,
    });
    return {
      message: data.message,
      photo_url: data.photo_url,
      public_id: data.public_id,
      doctor: normalizeDoctor(data.doctor),
    };
  },

  /**
   * Remove doctor profile photo via DELETE /api/doctors/<idOrSlug>/delete-photo/
   */
  async deleteDoctorPhoto(idOrSlug) {
    const data = await apiClient.delete(`/api/doctors/${idOrSlug}/delete-photo/`, {
      requiresAuth: true,
    });
    return {
      message: data.message,
      photo_url: null,
      doctor: normalizeDoctor(data.doctor),
    };
  },

  /**
   * Send onboarding invitation to doctor via POST /api/doctors/<idOrSlug>/invite/
   */
  async inviteDoctor(idOrSlug) {
    const data = await apiClient.post(`/api/doctors/${idOrSlug}/invite/`, {}, { requiresAuth: true });
    return data;
  },

  /**
   * Resend onboarding invitation to doctor via POST /api/doctors/<idOrSlug>/resend-invitation/
   */
  async resendDoctorInvitation(idOrSlug) {
    const data = await apiClient.post(`/api/doctors/${idOrSlug}/resend-invitation/`, {}, { requiresAuth: true });
    return data;
  },

  /**
   * Revoke active invitation for doctor via POST /api/doctors/<idOrSlug>/revoke-invitation/
   */
  async revokeDoctorInvitation(idOrSlug) {
    const data = await apiClient.post(`/api/doctors/${idOrSlug}/revoke-invitation/`, {}, { requiresAuth: true });
    return data;
  },

  /**
   * Get invitation history for doctor via GET /api/doctors/<idOrSlug>/invitations/
   */
  async getDoctorInvitations(idOrSlug) {
    const data = await apiClient.get(`/api/doctors/${idOrSlug}/invitations/`, { requiresAuth: true });
    return data;
  },

  /**
   * Validate raw invitation token via POST /api/auth/validate-invitation/
   */
  async validateInvitationToken(token) {
    const data = await apiClient.post('/api/auth/validate-invitation/', { token });
    return data;
  },

  /**
   * Accept invitation and set initial password via POST /api/auth/accept-invitation/
   */
  async acceptInvitation({ token, password, passwordConfirm }) {
    const data = await apiClient.post('/api/auth/accept-invitation/', {
      token,
      password,
      password_confirm: passwordConfirm,
    });
    if (data.access && data.refresh) {
      sessionStorage.setItem('eglesora_staff_access', data.access);
      sessionStorage.setItem('eglesora_staff_refresh', data.refresh);
      if (data.user) {
        sessionStorage.setItem('eglesora_staff_user', JSON.stringify(data.user));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('eglesora-session-updated', { detail: { user: data.user } }));
      }
    }
    return data;
  },
};

export default doctorService;
