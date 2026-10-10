/**
 * Hospital Platform — Department API Service
 * Authoritative integration with Django REST Framework (/api/departments/).
 */

import authService from './authService';
import { DEMO_DEPARTMENTS } from '../data/hospitalData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
      const res = await fetch(`${API_BASE_URL}/api/departments/?page_size=50`);
      if (!res.ok) {
        throw new Error(`Failed to fetch departments: ${res.status}`);
      }
      const data = await res.json();
      const rawList = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
      if (rawList.length === 0) {
        return DEMO_DEPARTMENTS.map(normalizeDepartment);
      }
      return rawList.map(normalizeDepartment);
    } catch (err) {
      console.warn('API error in getDepartments, using fallback:', err);
      return DEMO_DEPARTMENTS.map(normalizeDepartment);
    }
  },

  async getDepartment(slug) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/departments/${slug}/`);
      if (!res.ok) {
        throw new Error(`Failed to fetch department: ${res.status}`);
      }
      const data = await res.json();
      return normalizeDepartment(data);
    } catch (err) {
      console.warn(`API error in getDepartment(${slug}), using fallback:`, err);
      const fallback = DEMO_DEPARTMENTS.find((d) => d.slug === slug || d.id === slug);
      return fallback ? normalizeDepartment(fallback) : null;
    }
  },

  async createDepartment(payload) {
    const token = authService.getAccessToken();
    if (!token) throw new Error('Authentication required to create departments.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const res = await fetch(`${API_BASE_URL}/api/departments/`, {
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

    const res = await fetch(`${API_BASE_URL}/api/departments/${slugOrId}/`, {
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
