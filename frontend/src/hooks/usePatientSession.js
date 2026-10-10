import { useState, useEffect, useMemo, useCallback } from 'react';
import appointmentService from '../services/appointmentService';
import patientService from '../services/patientService';
import authService from '../services/authService';

/**
 * Fictional demo patient and appointments for explicit test fixtures or offline showcase only.
 * NEVER used as fallback in production patient sessions.
 */
export const DEMO_FIXTURE_PATIENT = {
  fullName: 'Aarav Mehta',
  mrn: 'MRN-2026-9042',
  dateOfBirth: '1988-04-12',
  gender: 'Male',
  mobile: '9876543210',
  email: 'aarav.mehta@example.com',
  address: 'Flat 402, Sea View Apartments, Worli, Mumbai 400018',
  emergencyContact: 'Pooja Mehta (+91 98765 43219) - Spouse',
};

export const DEMO_FIXTURE_APPOINTMENTS = [];

/**
 * Hospital Platform — Authoritative Patient Session Hook
 * Dynamically synchronizes patient identity, profile, and appointment records with
 * Django REST Framework & PostgreSQL strictly from the authenticated JWT session.
 * Eliminates shared demo fallbacks and guarantees strict user isolation.
 */
export function usePatientSession() {
  const [patientProfile, setPatientProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authVersion, setAuthVersion] = useState(0);

  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  // Fetch current authenticated patient profile from PostgreSQL
  const refreshProfile = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setPatientProfile(null);
      return null;
    }

    try {
      setProfileLoading(true);
      const profile = await patientService.getMyProfile();
      if (profile) {
        setPatientProfile(profile);
        return profile;
      } else {
        // Authenticated user exists but has no full patient profile yet
        const u = authService.getCurrentUser();
        if (u) {
          const fallbackIdentity = {
            id: null,
            mrn: 'Pending Registration',
            fullName: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            firstName: u.first_name || '',
            lastName: u.last_name || '',
            email: u.email || '',
            mobile: u.phone || '',
            gender: 'Other',
            dateOfBirth: '',
            address: '',
            emergencyContact: '',
            isProfileComplete: false,
          };
          setPatientProfile(fallbackIdentity);
          return fallbackIdentity;
        }
        setPatientProfile(null);
        return null;
      }
    } catch (err) {
      console.warn('Could not fetch patient profile from server:', err);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Fetch current authenticated patient appointments from PostgreSQL
  const refreshAppointments = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setAppointments([]);
      return [];
    }

    try {
      setIsLoading(true);
      const serverApts = await appointmentService.getAppointments();
      const list = Array.isArray(serverApts) ? serverApts : [];
      setAppointments(list);
      return list;
    } catch (err) {
      console.warn('Could not fetch server appointments in usePatientSession:', err);
      setAppointments([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchronize on mount and when authentication state changes
  useEffect(() => {
    if (authService.isAuthenticated()) {
      refreshProfile();
      refreshAppointments();
    } else {
      setPatientProfile(null);
      setAppointments([]);
    }
  }, [authVersion, refreshProfile, refreshAppointments]);

  // Listen to global session events for immediate account-switching and logout reactivity
  useEffect(() => {
    const handleSessionUpdated = () => {
      setAuthVersion((v) => v + 1);
    };

    const handleSessionExpired = () => {
      setPatientProfile(null);
      setAppointments([]);
      setAuthVersion((v) => v + 1);
    };

    window.addEventListener('eglesora-session-updated', handleSessionUpdated);
    window.addEventListener('eglesora-session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('eglesora-session-updated', handleSessionUpdated);
      window.removeEventListener('eglesora-session-expired', handleSessionExpired);
    };
  }, []);

  // Update profile with PostgreSQL persistence
  const updateProfile = useCallback(async (newProfileData) => {
    try {
      const saved = await patientService.updateMyProfile(newProfileData);
      setPatientProfile(saved);
      return saved;
    } catch (err) {
      console.error('Failed to update patient profile on server:', err);
      throw err;
    }
  }, []);

  // Cancel an appointment with PostgreSQL backend persistence
  const cancelAppointment = useCallback(async (reference, reason = 'Cancelled by patient.') => {
    // Optimistic UI update
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.reference?.toLowerCase() === reference?.toLowerCase() ? { ...apt, status: 'CANCELLED' } : apt
      )
    );

    try {
      const updated = await appointmentService.cancelAppointment(reference, reason);
      // Re-synchronize after cancellation
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.reference?.toLowerCase() === reference?.toLowerCase() ? updated : apt
        )
      );
      return updated;
    } catch (e) {
      console.error('Backend cancel call failed:', e);
      // Re-fetch to restore accurate state
      refreshAppointments();
      throw e;
    }
  }, [refreshAppointments]);

  // Look up an appointment by reference (only from authenticated list)
  const getAppointmentByReference = useCallback(
    (reference) => {
      if (!reference) return null;
      return appointments.find((a) => a.reference?.toLowerCase() === reference?.toLowerCase()) || null;
    },
    [appointments]
  );

  // Grouped collections
  const upcomingAppointments = useMemo(() => {
    return appointments.filter(
      (a) =>
        a.status === 'Requested' ||
        a.status === 'REQUESTED' ||
        a.status === 'Confirmed' ||
        a.status === 'CONFIRMED' ||
        a.status === 'Checked In' ||
        a.status === 'CHECKED_IN'
    );
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    return appointments.filter(
      (a) =>
        a.status === 'Completed' ||
        a.status === 'COMPLETED' ||
        a.status === 'No Show' ||
        a.status === 'NO_SHOW'
    );
  }, [appointments]);

  const cancelledAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.status === 'Cancelled' || a.status === 'CANCELLED'
    );
  }, [appointments]);

  // Primary next upcoming appointment
  const nextUpcoming = upcomingAppointments[0] || null;

  return {
    patientProfile,
    appointments,
    upcomingAppointments,
    pastAppointments,
    cancelledAppointments,
    nextUpcoming,
    isLoading,
    profileLoading,
    isAuthenticated,
    currentUser,
    refreshProfile,
    refreshAppointments,
    updateProfile,
    cancelAppointment,
    getAppointmentByReference,
  };
}

export default usePatientSession;
