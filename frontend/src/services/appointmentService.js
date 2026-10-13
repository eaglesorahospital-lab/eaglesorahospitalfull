/**
 * Hospital Platform — Appointment API Service
 * Authoritative integration with Django REST Framework / PostgreSQL (/api/appointments/).
 * Supports outpatient booking with row-level locking, concurrency protection,
 * slot availability validation, status lifecycle updates, cancellation, and rescheduling.
 */

import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Normalizes appointment response from DRF API into uniform shape
 * usable across public results, patient portal, and operations dashboard.
 */
export function normalizeAppointment(apt) {
  if (!apt) return null;
  const patientObj = apt.patient || {};
  const doctorObj = apt.doctor || {};
  const departmentObj = apt.department || {};

  const patientName =
    patientObj.full_name ||
    `${patientObj.first_name || ''} ${patientObj.last_name || ''}`.trim() ||
    'Outpatient';
  const doctorName = doctorObj.name || 'Consultant Physician';
  const deptName = departmentObj.name || 'Clinical Care';

  return {
    ...apt,
    id: apt.id,
    reference: apt.reference,
    patientId: patientObj.id || patientObj.mrn || 'PAT',
    patientName,
    patientContact: patientObj.phone || '',
    patientEmail: patientObj.email || '',
    patient: {
      ...patientObj,
      fullName: patientName,
      mobile: patientObj.phone || '',
      email: patientObj.email || '',
    },
    doctorId: doctorObj.id,
    doctorSlug: doctorObj.slug,
    doctorName,
    specialty: doctorObj.specialty_name || 'General Medicine',
    departmentId: departmentObj.slug || departmentObj.id,
    department: deptName,
    date: apt.appointment_date,
    time: apt.start_time ? apt.start_time.slice(0, 5) : '',
    startTime: apt.start_time,
    endTime: apt.end_time,
    type: apt.appointment_type || 'In-Person OPD',
    location: apt.consultation_location || 'Clinical Suite, OPD',
    status: (apt.status || 'REQUESTED').toUpperCase(),
    rawStatus: apt.status,
    reasonForVisit: apt.reason_for_visit || 'Outpatient Consultation',
    notes: apt.notes || '',
    createdAt: apt.created_at,
    cancelledAt: apt.cancelled_at,
    cancellationReason: apt.cancellation_reason,
  };
}

export const appointmentService = {
  /**
   * Book an outpatient appointment transactionally into PostgreSQL
   */
  async bookAppointment(bookingPayload) {
    const token = authService.getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/appointments/book/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bookingPayload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        data.detail ||
        (Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : null) ||
        'Appointment booking failed.';
      throw new Error(errMsg);
    }

    return normalizeAppointment(data);
  },

  /**
   * Retrieve appointments for authenticated patient/staff with filtering
   */
  async getAppointments(params = {}) {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL(`${API_BASE_URL}/api/appointments/`, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch appointments: HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
    return rawList.map(normalizeAppointment);
  },

  /**
   * Retrieve a single appointment by reference code
   */
  async getAppointment(reference) {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/appointments/${encodeURIComponent(reference)}/`, {
      headers,
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch appointment: HTTP ${res.status}`);
    }

    const data = await res.json();
    return normalizeAppointment(data);
  },

  /**
   * Cancel an appointment via POST /api/appointments/<reference>/cancel/
   */
  async cancelAppointment(reference, reason = '') {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(
      `${API_BASE_URL}/api/appointments/${encodeURIComponent(reference)}/cancel/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.detail || 'Cancellation failed.';
      throw new Error(errMsg);
    }

    const normalized = normalizeAppointment(data);

    try {
      const stored = sessionStorage.getItem('eglesora_latest_appointment');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reference?.toLowerCase() === reference?.toLowerCase()) {
          sessionStorage.setItem(
            'eglesora_latest_appointment',
            JSON.stringify({
              ...parsed,
              ...normalized,
              status: 'CANCELLED',
            })
          );
        }
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eglesora-appointment-updated', {
          detail: { reference, status: 'CANCELLED', appointment: normalized },
        })
      );
    }

    return normalized;
  },

  /**
   * Reschedule an appointment via POST /api/appointments/<reference>/reschedule/
   */
  async rescheduleAppointment(reference, { newDate, newStartTime, newEndTime, reason = '' }) {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(
      `${API_BASE_URL}/api/appointments/${encodeURIComponent(reference)}/reschedule/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          new_appointment_date: newDate,
          new_start_time: newStartTime,
          new_end_time: newEndTime,
          reason,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.detail || 'Rescheduling failed.';
      throw new Error(errMsg);
    }

    const normalized = normalizeAppointment(data);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eglesora-appointment-updated', {
          detail: { reference, status: normalized.status, appointment: normalized },
        })
      );
    }

    return normalized;
  },

  /**
   * Update appointment status or clinical notes via PATCH /api/appointments/<reference>/
   */
  async updateAppointmentStatus(reference, status, notes = '') {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    if (!token) {
      throw new Error('Authentication required for administrative status updates.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const payload = { status };
    if (notes) payload.notes = notes;

    const res = await fetch(`${API_BASE_URL}/api/appointments/${encodeURIComponent(reference)}/`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.detail || 'Status update failed.';
      throw new Error(errMsg);
    }

    const normalized = normalizeAppointment(data);

    try {
      const stored = sessionStorage.getItem('eglesora_latest_appointment');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reference?.toLowerCase() === reference?.toLowerCase()) {
          sessionStorage.setItem(
            'eglesora_latest_appointment',
            JSON.stringify({
              ...parsed,
              ...normalized,
              status: (normalized.status || status).toUpperCase(),
            })
          );
        }
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eglesora-appointment-updated', {
          detail: { reference, status: normalized.status, appointment: normalized },
        })
      );
    }

    return normalized;
  },

  /**
   * Approve a REQUESTED appointment via POST /api/appointments/<reference>/approve/
   */
  async approveAppointment(reference) {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    if (!token) {
      throw new Error('Authentication required for appointment approval.');
    }

    const res = await fetch(`${API_BASE_URL}/api/appointments/${encodeURIComponent(reference)}/approve/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.detail || 'Appointment approval failed.';
      throw new Error(errMsg);
    }

    const normalized = normalizeAppointment(data);

    // Invalidate/refresh session cache if this appointment is in sessionStorage
    try {
      const stored = sessionStorage.getItem('eglesora_latest_appointment');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reference?.toLowerCase() === reference?.toLowerCase()) {
          sessionStorage.setItem(
            'eglesora_latest_appointment',
            JSON.stringify({
              ...parsed,
              ...normalized,
              status: 'CONFIRMED',
            })
          );
        }
      }
    } catch (e) {}

    // Dispatch global event for active tabs/listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eglesora-appointment-updated', {
          detail: { reference, status: 'CONFIRMED', appointment: normalized },
        })
      );
    }

    return normalized;
  },

};

export default appointmentService;
