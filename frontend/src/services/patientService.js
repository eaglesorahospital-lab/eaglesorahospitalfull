/**
 * Hospital Platform — Patient API Service
 * Authoritative integration with Django REST Framework / PostgreSQL (/api/patients/).
 * Supports outpatient demographic retrieval, staff search, profile editing, and safe deactivation.
 */

import authService from './authService';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

export function normalizePatient(patient) {
  if (!patient) return null;
  const fullName =
    patient.full_name ||
    `${patient.first_name || ''} ${patient.last_name || ''}`.trim() ||
    'Outpatient';

  return {
    ...patient,
    id: patient.id,
    mrn: patient.mrn || `MRN-${patient.id}`,
    name: fullName,
    fullName,
    firstName: patient.first_name || '',
    lastName: patient.last_name || '',
    dateOfBirth: patient.date_of_birth || '',
    gender: patient.gender || 'Other',
    contact: patient.phone || '',
    mobile: patient.phone || '',
    email: patient.email || '',
    bloodGroup: patient.blood_group || '',
    address: patient.address || '',
    emergencyContact: patient.emergency_contact || '',
    status: patient.is_active ? 'Active' : 'Inactive',
    createdAt: patient.created_at,
  };
}

export const patientService = {
  /**
   * Fetch patient records from DRF API
   */
  async getPatients(params = {}) {
    const token = authService.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL(`${API_BASE_URL}/api/patients/`, window.location.origin);
    url.searchParams.set('page_size', params.pageSize || params.page_size || '100');

    if (params.search) url.searchParams.set('search', params.search);
    if (params.gender && params.gender !== 'ALL') url.searchParams.set('gender', params.gender);
    if (params.is_active !== undefined) url.searchParams.set('is_active', String(params.is_active));

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch patient records: HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
    return {
      results: rawList.map(normalizePatient),
      count: data.count !== undefined ? data.count : rawList.length,
    };
  },

  /**
   * Fetch single patient profile
   */
  async getPatient(id) {
    const token = authService.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/patients/${id}/`, { headers });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch patient: HTTP ${res.status}`);
    }

    const data = await res.json();
    return normalizePatient(data);
  },

  /**
   * Create an outpatient demographic profile in PostgreSQL
   */
  async createPatient(payload) {
    const token = authService.getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const nameParts = (payload.name || payload.fullName || '').trim().split(' ');
    const firstName = payload.first_name || nameParts[0] || 'Outpatient';
    const lastName = payload.last_name || (nameParts.slice(1).join(' ')) || '';

    const postData = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: payload.date_of_birth || payload.dateOfBirth || null,
      gender: payload.gender || 'OTHER',
      phone: payload.phone || payload.contact || payload.mobile || '',
      email: payload.email || '',
      blood_group: payload.blood_group || payload.bloodGroup || '',
      emergency_contact: payload.emergency_contact || payload.emergencyContact || '',
      address: payload.address || '',
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    };

    const res = await fetch(`${API_BASE_URL}/api/patients/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(postData),
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.detail || (Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : null) || 'Failed to create patient.';
      throw new Error(errMsg);
    }

    return normalizePatient(data);
  },

  /**
   * Update outpatient profile
   */
  async updatePatient(id, payload) {
    const token = authService.getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const patchData = {};
    if (payload.name || payload.fullName) {
      const parts = (payload.name || payload.fullName).trim().split(' ');
      patchData.first_name = parts[0] || '';
      patchData.last_name = parts.slice(1).join(' ') || '';
    }
    if (payload.first_name !== undefined) patchData.first_name = payload.first_name;
    if (payload.last_name !== undefined) patchData.last_name = payload.last_name;
    if (payload.phone !== undefined || payload.contact !== undefined || payload.mobile !== undefined) {
      patchData.phone = payload.phone ?? payload.contact ?? payload.mobile;
    }
    if (payload.email !== undefined) patchData.email = payload.email;
    if (payload.date_of_birth !== undefined || payload.dateOfBirth !== undefined) {
      patchData.date_of_birth = payload.date_of_birth ?? payload.dateOfBirth;
    }
    if (payload.gender !== undefined) patchData.gender = payload.gender;
    if (payload.blood_group !== undefined || payload.bloodGroup !== undefined) {
      patchData.blood_group = payload.blood_group ?? payload.bloodGroup;
    }
    if (payload.emergency_contact !== undefined || payload.emergencyContact !== undefined) {
      patchData.emergency_contact = payload.emergency_contact ?? payload.emergencyContact;
    }
    if (payload.address !== undefined) patchData.address = payload.address;
    if (payload.is_active !== undefined) patchData.is_active = payload.is_active;

    const res = await fetch(`${API_BASE_URL}/api/patients/${id}/`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update patient profile.');
    }

    return normalizePatient(data);
  },

  /**
   * Safe outpatient soft-deactivation (preserves relational clinical history)
   */
  async deactivatePatient(id) {
    const token = authService.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/patients/${id}/`, {
      method: 'DELETE',
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to deactivate patient.');
    }
    return data;
  },

  /**
   * Delete patient alias for safe soft-deactivation
   */
  async deletePatient(id) {
    return this.deactivatePatient(id);
  },

  /**
   * Toggle patient active/archived state
   */
  async togglePatientStatus(id) {
    const token = authService.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/patients/${id}/toggle-status/`, {
      method: 'POST',
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to toggle patient status.');
    }
    return data;
  },

  /**
   * Retrieve the authenticated patient's own profile from /api/patients/me/
   */
  async getMyProfile() {
    const token = await authService.getValidAccessToken();
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}/api/patients/me/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 404) return null;
      throw new Error(`Failed to fetch profile: HTTP ${res.status}`);
    }

    const data = await res.json();
    return normalizePatient(data);
  },

  /**
   * Update the authenticated patient's own profile via PATCH /api/patients/me/
   */
  async updateMyProfile(payload) {
    const token = await authService.getValidAccessToken();
    if (!token) throw new Error('Authentication required.');

    const nameParts = (payload.name || payload.fullName || '').trim().split(' ');
    const firstName = payload.first_name || payload.firstName || nameParts[0] || '';
    const lastName = payload.last_name || payload.lastName || (nameParts.slice(1).join(' ')) || '';

    const patchData = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: payload.date_of_birth || payload.dateOfBirth || null,
      gender: (payload.gender || 'OTHER').toUpperCase(),
      phone: payload.phone || payload.contact || payload.mobile || '',
      email: payload.email || '',
      blood_group: payload.blood_group || payload.bloodGroup || '',
      emergency_contact: payload.emergency_contact || payload.emergencyContact || '',
      address: payload.address || '',
    };

    const res = await fetch(`${API_BASE_URL}/api/patients/me/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(patchData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update patient profile.');
    }

    return normalizePatient(data);
  },
};

export default patientService;
