/**
 * Hospital Platform — Department API Service
 * Authoritative integration with Django REST Framework (/api/departments/).
 * Supports slug lookup, alias resolution, robust normalization, and fallback.
 */

import authService from './authService';
import { getApiBaseUrl } from './api';
import { DEMO_DEPARTMENTS } from '../data/hospitalData';

/**
 * Mapping of legacy or alternate slugs/terms to authoritative database slugs
 */
export const DEPARTMENT_SLUG_ALIASES = {
  'cardiology': 'cardiovascular-sciences',
  'cardio': 'cardiovascular-sciences',
  'vascular': 'cardiovascular-sciences',
  'cardiology-vascular': 'cardiovascular-sciences',
  'dermatology': 'dermatology-dept',
  'skin': 'dermatology-dept',
  'ent': 'ent-head-neck',
  'ear-nose-throat': 'ent-head-neck',
  'general-medicine': 'general-medicine-dept',
  'internal-medicine': 'general-medicine-dept',
  'medicine': 'general-medicine-dept',
  'neurology': 'neurology-dept',
  'neuro': 'neurology-dept',
  'neurosciences': 'neurology-dept',
  'orthopaedics': 'orthopaedics-dept',
  'orthopedics': 'orthopaedics-dept',
  'ortho': 'orthopaedics-dept',
  'paediatrics': 'paediatrics-dept',
  'pediatrics': 'paediatrics-dept',
  'child-health': 'paediatrics-dept',
};

/**
 * Normalizes a department object from DRF into the shape expected by UI components
 */
export function normalizeDepartment(dept) {
  if (!dept) return null;

  // Extract contact fields
  const location = dept.location || dept.contact?.location || 'Hospital Campus';
  const phone = dept.contact_phone || dept.contactPhone || dept.contact?.phone || '+91 (0) 22 0000 2222';
  const email = dept.contact_email || dept.contactEmail || dept.contact?.email || 'desk@eglesorahospital.org';
  const extension = dept.extension || dept.contact?.extension || 'Ext. 100';

  // Extract services
  const rawServices = dept.services || [];
  const services = rawServices
    .map((s) => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object') return s.name || s.title || s.description || '';
      return '';
    })
    .filter(Boolean);

  // Extract FAQs
  const rawFaqs = dept.faqs || [];
  const faqs = rawFaqs
    .map((f, idx) => {
      if (typeof f === 'string') return { id: `faq-${idx}`, question: f, answer: '' };
      return {
        id: f.id || `faq-${idx}`,
        question: f.question || '',
        answer: f.answer || '',
      };
    })
    .filter((f) => f.question);

  // Consultation timings
  const opdHours = dept.opd_hours || dept.opdHours || 'Mon - Sat: 09:00 AM - 04:00 PM';
  const consultationTimings =
    Array.isArray(dept.consultationTimings) && dept.consultationTimings.length > 0
      ? dept.consultationTimings
      : [
          { day: 'Monday', timing: opdHours, status: 'Active OPD' },
          { day: 'Tuesday', timing: opdHours, status: 'Active OPD' },
          { day: 'Wednesday', timing: opdHours, status: 'Active OPD' },
          { day: 'Thursday', timing: opdHours, status: 'Active OPD' },
          { day: 'Friday', timing: opdHours, status: 'Active OPD' },
          { day: 'Saturday', timing: opdHours, status: 'Active OPD' },
          { day: 'Sunday', timing: 'Closed (Emergency Trauma Open 24/7)', status: 'Closed' },
        ];

  const doctorCount =
    dept.doctor_count !== undefined && dept.doctor_count !== null
      ? dept.doctor_count
      : dept.doctorCount !== undefined
      ? dept.doctorCount
      : Array.isArray(dept.doctorIds)
      ? dept.doctorIds.length
      : null;

  return {
    ...dept,
    id: dept.slug || String(dept.id),
    dbId: dept.id,
    name: dept.name,
    slug: dept.slug,
    code: dept.code || null,
    specialty: dept.specialty || dept.specialty_name || 'Clinical Care',
    shortDescription: dept.short_description || dept.shortDescription || '',
    fullDescription: dept.full_description || dept.fullDescription || dept.short_description || dept.shortDescription || '',
    opdHours,
    location,
    contact: {
      location,
      phone,
      email,
      extension,
    },
    services,
    faqs,
    consultationTimings,
    doctorCount,
    doctorIds: dept.doctorIds || [],
    image: dept.image_url || dept.image || null,
    status: dept.is_active ? 'Active' : 'Inactive',
    is_active: dept.is_active !== undefined ? dept.is_active : true,
  };
}

export const departmentService = {
  /**
   * Fetch all active departments from backend with fallback
   */
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
      if (rawList.length > 0) {
        return rawList.map(normalizeDepartment);
      }
      // If empty result from backend, return demo departments
      return DEMO_DEPARTMENTS.map(normalizeDepartment);
    } catch (err) {
      console.warn('API error in getDepartments, falling back to local registry:', err);
      return DEMO_DEPARTMENTS.map(normalizeDepartment);
    }
  },

  /**
   * Retrieve a specific department by slug or ID with alias resolution and fallback
   */
  async getDepartment(slugOrId) {
    if (!slugOrId) return null;
    const cleanSlug = String(slugOrId).trim().toLowerCase();
    const canonicalSlug = DEPARTMENT_SLUG_ALIASES[cleanSlug] || cleanSlug;

    try {
      const baseUrl = getApiBaseUrl();
      // Try canonical slug first
      let res = await fetch(`${baseUrl}/api/departments/${encodeURIComponent(canonicalSlug)}/`);

      // If 404 and canonical is different from raw input, try raw input
      if (!res.ok && res.status === 404 && canonicalSlug !== cleanSlug) {
        res = await fetch(`${baseUrl}/api/departments/${encodeURIComponent(cleanSlug)}/`);
      }

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          return normalizeDepartment(data);
        }
      }
    } catch (err) {
      console.warn(`API error in getDepartment(${slugOrId}):`, err);
    }

    // Fallback: search DEMO_DEPARTMENTS by slug, canonical slug, or id
    const match = DEMO_DEPARTMENTS.find(
      (d) =>
        d.slug.toLowerCase() === cleanSlug ||
        d.slug.toLowerCase() === canonicalSlug ||
        String(d.id).toLowerCase() === cleanSlug ||
        String(d.dbId) === cleanSlug
    );

    if (match) {
      return normalizeDepartment(match);
    }

    return null;
  },

  /**
   * Administrative create
   */
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

  /**
   * Administrative update
   */
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
