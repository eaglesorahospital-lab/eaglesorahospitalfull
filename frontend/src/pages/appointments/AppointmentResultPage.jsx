import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import appointmentService from '../../services/appointmentService';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Calendar,
  User,
  MapPin,
  Stethoscope,
  Building2,
  FileText,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

/**
 * Hospital Platform — Appointment Result & Confirmation Page
 * Displays the authoritative appointment slip with reference code,
 * clinical consultation details, live status synchronization, and arrival guidelines.
 * Follows Soft UI / Neumorphism design system.
 */
export function AppointmentResultPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryRef = (searchParams.get('ref') || searchParams.get('reference') || '').trim();

  const initialAppointment = useMemo(() => {
    if (location.state?.appointment) {
      if (!queryRef || location.state.appointment.reference?.toLowerCase() === queryRef.toLowerCase()) {
        return location.state.appointment;
      }
    }
    try {
      const stored = sessionStorage.getItem('eglesora_latest_appointment');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!queryRef || parsed.reference?.toLowerCase() === queryRef.toLowerCase()) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }, [location.state, queryRef]);

  const targetReference = queryRef || initialAppointment?.reference;

  const [appointment, setAppointment] = useState(initialAppointment);
  const [isLoading, setIsLoading] = useState(!initialAppointment && !!targetReference);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (initialAppointment && !appointment) {
      setAppointment(initialAppointment);
    }
  }, [initialAppointment, appointment]);

  const refreshStatus = useCallback(
    async (silent = false) => {
      if (!targetReference) return;
      if (!silent) setIsRefreshing(true);

      try {
        const serverApt = await appointmentService.getAppointment(targetReference);
        if (serverApt) {
          setAppointment((prev) => {
            const merged = {
              ...(prev || {}),
              ...serverApt,
              doctorName: serverApt.doctorName || prev?.doctorName,
              specialty: serverApt.specialty || prev?.specialty,
              department: serverApt.department || prev?.department,
              location: serverApt.location || prev?.location,
              date: serverApt.date || prev?.date,
              time: serverApt.time || prev?.time,
              dayName: prev?.dayName || serverApt.dayName,
              duration: prev?.duration || serverApt.duration || '30 minutes',
              status: (serverApt.status || prev?.status || 'REQUESTED').toUpperCase(),
              patient: {
                ...(prev?.patient || {}),
                ...(serverApt.patient || {}),
                fullName: serverApt.patientName || prev?.patient?.fullName,
                dateOfBirth: prev?.patient?.dateOfBirth || serverApt.patient?.dateOfBirth,
                gender: prev?.patient?.gender || serverApt.patient?.gender,
                mobile: serverApt.patientContact || prev?.patient?.mobile,
                email: serverApt.patientEmail || prev?.patient?.email,
                reasonForVisit: serverApt.reasonForVisit || prev?.patient?.reasonForVisit,
              },
            };

            try {
              sessionStorage.setItem('eglesora_latest_appointment', JSON.stringify(merged));
            } catch (e) {}

            return merged;
          });
        }
      } catch (err) {
        console.warn(`Could not refresh appointment status for ${targetReference}:`, err);
      } finally {
        setIsLoading(false);
        if (!silent) setIsRefreshing(false);
      }
    },
    [targetReference]
  );

  useEffect(() => {
    if (targetReference) {
      refreshStatus(false);
    }
  }, [targetReference, refreshStatus]);

  useEffect(() => {
    const handleFocus = () => {
      if (targetReference) {
        refreshStatus(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [targetReference, refreshStatus]);

  useEffect(() => {
    const handleStatusEvent = (e) => {
      const ref = e.detail?.reference;
      if (!ref || ref.toLowerCase() === targetReference?.toLowerCase()) {
        refreshStatus(true);
      }
    };
    window.addEventListener('eglesora-appointment-updated', handleStatusEvent);
    return () => window.removeEventListener('eglesora-appointment-updated', handleStatusEvent);
  }, [targetReference, refreshStatus]);

  useEffect(() => {
    const currentStatus = (appointment?.status || '').toUpperCase();
    if (currentStatus === 'REQUESTED' && targetReference) {
      const interval = setInterval(() => {
        refreshStatus(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [appointment?.status, targetReference, refreshStatus]);

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Appointments', to: '/appointments/book' },
    { label: 'Booking Slip' },
  ];

  if (isLoading && !appointment) {
    return (
      <Container className="py-4">
        <PageHeader
          title="Appointment Confirmation"
          description="Connecting to clinic reservation system..."
          breadcrumbs={breadcrumbs}
        />
        <div className="py-5 text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="text-muted small">Retrieving consultation booking record...</div>
        </div>
      </Container>
    );
  }

  if (!appointment) {
    return (
      <Container className="py-4">
        <PageHeader
          title="Appointment Confirmation"
          description="View your digital outpatient consultation slip."
          breadcrumbs={breadcrumbs}
        />
        <div className="py-4">
          <EmptyState
            title="No Recent Booking Request Found"
            message="No consultation appointment request was found in your current browsing session. You can schedule an appointment with our specialists at any time."
            action={
              <Link to="/appointments/book" className="neu-btn neu-btn-primary">
                Book an Appointment
              </Link>
            }
          />
        </div>
      </Container>
    );
  }

  const statusUpper = (appointment.status || '').toUpperCase();
  const isConfirmed =
    statusUpper === 'CONFIRMED' ||
    statusUpper === 'CHECKED_IN' ||
    statusUpper === 'COMPLETED';
  const isCancelled = statusUpper === 'CANCELLED' || statusUpper === 'NO_SHOW';
  const isRequested = !isConfirmed && !isCancelled;

  const pageTitle = isConfirmed
    ? 'Appointment Confirmed'
    : isCancelled
    ? 'Appointment Cancelled'
    : 'Appointment Request Submitted';

  const pageDescription = isConfirmed
    ? 'Your outpatient consultation has been confirmed. Please view your official booking slip.'
    : isCancelled
    ? 'This consultation appointment has been cancelled.'
    : 'Your consultation request has been submitted and is awaiting administrative approval.';

  return (
    <div className="appointment-result-page py-4">
      <Container>
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          breadcrumbs={breadcrumbs}
        />

        {/* Status Notification Banner */}
        {isConfirmed ? (
          <div className="neu-raised neu-surface p-4 rounded-4 mb-4 border-start border-4 border-success d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="neu-badge neu-badge-success p-2 rounded-circle d-flex align-items-center justify-content-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h5 className="mb-1 fw-bold text-body">Appointment Confirmed</h5>
                <p className="mb-0 small text-muted">
                  Your consultation slot with <strong className="text-body">{appointment.doctorName}</strong> is officially booked under reference{' '}
                  <strong className="text-body font-monospace">{appointment.reference}</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="neu-btn neu-btn-outline neu-btn-sm text-nowrap d-flex align-items-center gap-1"
              onClick={() => refreshStatus(false)}
              disabled={isRefreshing}
              title="Verify live status from server"
            >
              <CheckCircle2 size={13} className="text-success" />
              <span>{isRefreshing ? 'Checking...' : 'Confirmed'}</span>
            </button>
          </div>
        ) : isCancelled ? (
          <div className="neu-raised neu-surface p-4 rounded-4 mb-4 border-start border-4 border-danger d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="neu-badge neu-badge-danger p-2 rounded-circle d-flex align-items-center justify-content-center">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h5 className="mb-1 fw-bold text-body">Appointment Cancelled</h5>
                <p className="mb-0 small text-muted">
                  Your consultation booking under reference{' '}
                  <strong className="text-body font-monospace">{appointment.reference}</strong> has been cancelled.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="neu-raised neu-surface p-4 rounded-4 mb-4 border-start border-4 border-warning d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="neu-badge neu-badge-warning p-2 rounded-circle d-flex align-items-center justify-content-center">
                <Clock size={24} />
              </div>
              <div>
                <h5 className="mb-1 fw-bold text-body">
                  Appointment Request Submitted — Awaiting Admin Approval
                </h5>
                <p className="mb-0 small text-muted">
                  Your appointment request has been submitted under reference{' '}
                  <strong className="text-body font-monospace">{appointment.reference}</strong>. A hospital administrator will review and confirm your slot shortly. You can track this consultation in your patient portal.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="neu-btn neu-btn-outline neu-btn-sm text-nowrap d-flex align-items-center gap-1"
              onClick={() => refreshStatus(false)}
              disabled={isRefreshing}
              title="Check latest status from hospital server"
            >
              <RotateCw size={13} className={isRefreshing ? 'spinner-border spinner-border-sm' : ''} />
              <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
            </button>
          </div>
        )}

        {/* Consultation Summary Slip */}
        <div className="neu-raised neu-surface p-4 p-md-5 rounded-4 mb-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3 mb-4">
            <div>
              <span className="neu-eyebrow text-uppercase fw-bold text-muted">
                {isConfirmed ? 'Booking Reference' : isCancelled ? 'Cancelled Reference' : 'Request Reference'}
              </span>
              <div className="h4 fw-bold text-primary mb-0 font-monospace">{appointment.reference}</div>
            </div>
            <div>
              <span
                className={`neu-badge ${
                  isConfirmed
                    ? 'neu-badge-success'
                    : isCancelled
                    ? 'neu-badge-danger'
                    : 'neu-badge-warning'
                } fs-6 px-3 py-1`}
              >
                {isConfirmed
                  ? 'Confirmed (Slot Booked)'
                  : isCancelled
                  ? 'Cancelled'
                  : 'Requested (Pending Review)'}
              </span>
            </div>
          </div>

          <div className="row g-3 mb-4">
            {/* Consultant & Affiliation */}
            <div className="col-12 col-md-6">
              <div className="neu-inset p-3 rounded-4 h-100">
                <div className="small fw-semibold text-primary mb-1 d-flex align-items-center gap-1">
                  <Stethoscope size={14} />
                  <span>Attending Specialist</span>
                </div>
                <div className="fw-bold text-body fs-6">{appointment.doctorName}</div>
                <div className="small text-muted">{appointment.specialty}</div>
                <div className="small text-muted">{appointment.department}</div>
                <div className="small text-body mt-2 d-flex align-items-center gap-1">
                  <MapPin size={13} className="text-primary" />
                  <strong>Room: </strong> <span>{appointment.location}</span>
                </div>
              </div>
            </div>

            {/* Schedule Details */}
            <div className="col-12 col-md-6">
              <div className="neu-inset p-3 rounded-4 h-100">
                <div className="small fw-semibold text-primary mb-1 d-flex align-items-center gap-1">
                  <Calendar size={14} />
                  <span>Consultation Slot</span>
                </div>
                <div className="fw-bold text-body fs-6">
                  {appointment.dayName ? `${appointment.dayName}, ` : ''}{appointment.date}
                </div>
                <div className="fw-bold text-primary fs-5 my-1">{appointment.time}</div>
                <div className="small text-muted">
                  Duration: {appointment.duration} &bull; In-person OPD
                </div>
              </div>
            </div>

            {/* Patient Information */}
            <div className="col-12">
              <div className="neu-inset p-3 rounded-4">
                <div className="small fw-semibold text-primary mb-2 d-flex align-items-center gap-1">
                  <User size={14} />
                  <span>Patient Profile</span>
                </div>
                <div className="row g-2 small text-muted">
                  <div className="col-12 col-sm-6">
                    <strong className="text-body">Patient Name: </strong>
                    <span>{appointment.patient?.fullName}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <strong className="text-body">Date of Birth: </strong>
                    <span>{appointment.patient?.dateOfBirth} ({appointment.patient?.gender})</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <strong className="text-body">Mobile Contact: </strong>
                    <span>{appointment.patient?.mobile}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <strong className="text-body">Email Address: </strong>
                    <span>{appointment.patient?.email}</span>
                  </div>
                  <div className="col-12 mt-2">
                    <strong className="text-body">Reason for Consultation: </strong>
                    <span>{appointment.patient?.reasonForVisit}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="neu-inset p-4 rounded-4 mb-4">
            <h3 className="h6 fw-bold text-body mb-2">
              {isConfirmed ? 'Hospital Arrival Guidelines' : 'Next Steps & Instructions'}
            </h3>
            {isConfirmed ? (
              <ul className="small text-muted mb-0 ps-3">
                <li className="mb-1">
                  Please report to the {appointment.department} outpatient reception desk 15 minutes before your scheduled slot.
                </li>
                <li className="mb-1">
                  Carry government-issued photo identification along with any past medical discharge summaries, ECGs, or imaging files.
                </li>
                <li>
                  Present your booking reference <strong className="text-body font-monospace">{appointment.reference}</strong> at the reception counter for token issuance.
                </li>
              </ul>
            ) : (
              <ul className="small text-muted mb-0 ps-3">
                <li className="mb-1">
                  Our medical administration staff will review doctor schedule availability and approve your appointment request.
                </li>
                <li className="mb-1">
                  You can track your appointment status at any time in the <Link to="/my-appointments" className="text-primary text-decoration-none fw-semibold">Patient Portal</Link>.
                </li>
                <li>
                  Upon administrator approval, you will receive confirmation and your status will update to <strong className="text-success">Confirmed</strong>.
                </li>
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top">
            <Link to="/my-appointments" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1">
              <span>View My Appointments</span>
              <ChevronRight size={14} />
            </Link>

            <div className="d-flex gap-2">
              <Link to="/appointments/book" className="neu-btn neu-btn-outline">
                Book Another
              </Link>
              <Link to="/" className="neu-btn neu-btn-outline">
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default AppointmentResultPage;
