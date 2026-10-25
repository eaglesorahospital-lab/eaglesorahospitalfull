/**
 * Hospital Platform — Department API Service
 * Authoritative integration with Django REST Framework (/api/departments/).
 */

import authService from './authService';
import { getApiBaseUrl } from './api';

export function normalizeDepartment(dept) {
  if (!dept) return null;
  return {
    ...dept,
    id: dept.slug || String(dept.id),
    dbId: dept.id,
    name: dept.name,
    slug: dept.slug,
    specialty: dept.specialty,
    shortDescription: dept.short_description || dept.shortDescription || '',
    fullDescription: dept.full_description || dept.fullDescription || '',
    opdHours: dept.opd_hours || dept.opdHours || 'Mon - Sat: 09:00 AM - 04:00 PM',
    location: dept.location || 'Hospital Campus',
    contactPhone: dept.contact_phone || dept.contactPhone || '+91 (0) 22 0000 2222',
    contactEmail: dept.contact_email || dept.contactEmail || 'desk@eglesorahospital.org',
    image: dept.image_url || dept.image || null,
    status: dept.is_active ? 'Active' : 'Inactive',
    is_active: dept.is_active !== undefined ? dept.is_active : true,
  };
}

export const departmentService = {
  async getDepartments() {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/departments/?page_size=50`);
      if (!res.ok) {
        throw new Error(`Failed to fetch departments: HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('API returned non-JSON response.');
      }
      const data = await res.json();
      const rawList = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      return rawList.map(normalizeDepartment);
    } catch (err) {
      console.warn('API error in getDepartments:', err);
      return [];
    }
  },

  async getDepartment(slug) {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/departments/${slug}/`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to fetch department: HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('API returned non-JSON response.');
      }
      const data = await res.json();
      return normalizeDepartment(data);
    } catch (err) {
      console.warn(`API error in getDepartment(${slug}):`, err);
      return null;
    }
  },

  async createDepartment(payload) {
    const token = authService.getAccessToken();
    if (!token) throw new Error('Authentication required to create departments.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/departments/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: payload.name,
        specialty: payload.specialty || payload.name,
        short_description: payload.shortDescription || payload.short_description || '',
        full_description: payload.fullDescription || payload.full_description || '',
        opd_hours: payload.opdHours || payload.opd_hours || 'Mon - Sat: 09:00 AM - 04:00 PM',
        location: payload.location || 'Hospital Campus',
        contact_phone: payload.phone || payload.contactPhone || '+91 (0) 22 0000 2200',
        contact_email: payload.email || payload.contactEmail || 'desk@eglesorahospital.org',
        is_active: payload.is_active !== undefined ? payload.is_active : true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to create department.');
    }
    return normalizeDepartment(data);
  },

  async updateDepartment(slugOrId, payload) {
    const token = authService.getAccessToken();
    if (!token) throw new Error('Authentication required to update departments.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/departments/${slugOrId}/`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update department.');
    }
    return normalizeDepartment(data);
  },
};

export default departmentService;
