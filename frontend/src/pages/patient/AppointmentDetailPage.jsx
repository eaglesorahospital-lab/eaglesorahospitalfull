import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import PatientNav from '../../components/patient/PatientNav';
import usePatientSession from '../../hooks/usePatientSession';
import appointmentService from '../../services/appointmentService';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Stethoscope,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  X,
} from 'lucide-react';

/**
 * Hospital Platform — Appointment Details Page
 * View individual consultation reservation with Neumorphic design.
 */
export function AppointmentDetailPage() {
  const { t } = useTranslation();
  const { reference } = useParams();
  const navigate = useNavigate();

  const { getAppointmentByReference, cancelAppointment, isAuthenticated } = usePatientSession();
  const sessionAppointment = getAppointmentByReference(reference);
  const [remoteAppointment, setRemoteAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(!sessionAppointment);

  const fetchRemote = React.useCallback(() => {
    if (!reference || !isAuthenticated) {
      setIsLoading(false);
      return;
    }
    appointmentService
      .getAppointment(reference)
      .then((data) => {
        if (data) {
          setRemoteAppointment(data);
        }
      })
      .catch((err) => {
        console.warn(`Could not load appointment ${reference} from API:`, err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reference, isAuthenticated]);

  useEffect(() => {
    fetchRemote();
  }, [fetchRemote]);

  useEffect(() => {
    const handleFocus = () => fetchRemote();
    const handleEvent = (e) => {
      const ref = e.detail?.reference;
      if (!ref || ref.toLowerCase() === reference?.toLowerCase()) {
        fetchRemote();
      }
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('eglesora-appointment-updated', handleEvent);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('eglesora-appointment-updated', handleEvent);
    };
  }, [fetchRemote, reference]);

  const appointment = remoteAppointment || sessionAppointment;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Accessible Escape key and body scroll lock for cancellation modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showCancelModal) {
        setShowCancelModal(false);
      }
    };
    if (showCancelModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showCancelModal]);

  const breadcrumbs = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.patientPortal'), to: '/my-appointments' },
    { label: t('patient.dashboard'), to: '/my-appointments' },
    { label: reference || 'Details' },
  ];

  if (!isAuthenticated) {
    return (
      <div className="patient-dashboard-page py-4">
        <div className="patient-portal-container">
          <PageHeader
            title="Authentication Required"
            description="Consultation appointment details are strictly restricted to the registered patient."
            breadcrumbs={breadcrumbs}
          />
          <PatientNav />
          <div className="neu-raised neu-surface rounded-4 p-4 p-md-5 text-center">
            <h3 className="fs-5 fw-bold text-body mb-2">Sign In to View Appointment Details</h3>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '480px' }}>
              Please sign in to verify your identity and view the full details of appointment reference <strong>{reference}</strong>.
            </p>
            <Link to="/patient/login" className="neu-btn neu-btn-primary px-4 py-2" style={{ minHeight: '44px' }}>
              Sign In to Patient Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="patient-dashboard-page py-4">
        <div className="patient-portal-container">
          <PageHeader
            title="Loading Appointment Record..."
            description="Connecting to clinic reservation system."
            breadcrumbs={breadcrumbs}
          />
          <PatientNav />
          <div className="py-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="patient-dashboard-page py-4">
        <div className="patient-portal-container">
          <PageHeader
            title="Appointment Record Not Found"
            description="The requested appointment reference could not be located in your patient account."
            breadcrumbs={breadcrumbs}
          />
          <PatientNav />
          <div className="py-4">
            <EmptyState
              title="Appointment Not Found or Access Denied"
              message={`We could not locate any consultation booking matching reference "${reference}" associated with your account.`}
              action={
                <Link to="/my-appointments" className="neu-btn neu-btn-primary" style={{ minHeight: '44px' }}>
                  Return to Appointments
                </Link>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const statusUpper = (appointment.status || '').toUpperCase();
  const isCancelled = statusUpper === 'CANCELLED' || statusUpper === 'NO_SHOW';
  const isCompleted = statusUpper === 'COMPLETED';
  const isActionable = !isCancelled && !isCompleted;

  const handleConfirmCancel = () => {
    cancelAppointment(appointment.reference);
    setFeedbackNotice(t('patient.appointmentCancelledSuccess'));
    setShowCancelModal(false);
  };

  const handleReschedule = () => {
    const slug = appointment.doctorSlug || appointment.doctorId;
    navigate(`/appointments/book?doctor=${slug}&date=${appointment.date}`);
  };

  return (
    <div className="appointment-detail-page py-4">
      <div className="patient-portal-container">
        <PageHeader
          title={`Appointment: ${appointment.reference}`}
          description={`Consultation file with ${appointment.doctorName} (${appointment.department})`}
          breadcrumbs={breadcrumbs}
          className="mb-3"
        />

        <PatientNav />

        {feedbackNotice && (
          <div className="neu-inset p-3 rounded-4 mb-4 border-start border-4 border-success small text-success d-flex justify-content-between align-items-center" role="alert">
            <span className="d-flex align-items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{feedbackNotice}</span>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-link text-muted p-0"
              onClick={() => setFeedbackNotice(null)}
              aria-label="Close"
              style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main Details Card */}
        <div className="neu-raised neu-surface rounded-4 p-4 p-md-5 mb-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3 mb-4">
            <div>
              <span className="neu-eyebrow text-uppercase fw-bold text-muted">Booking Reference</span>
              <div className="h4 fw-bold text-primary mb-0 font-monospace">{appointment.reference}</div>
            </div>

            <div>
              <StatusBadge status={appointment.status} className="fs-6 px-3 py-1" />
            </div>
          </div>

          <div className="row g-3 g-md-4 mb-4">
            {/* Attending Specialist */}
            <div className="col-12 col-md-6">
              <div className="neu-inset p-3 rounded-4 h-100">
                <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2 d-flex align-items-center gap-1">
                  <Stethoscope size={14} />
                  <span>{t('patient.doctor')}</span>
                </div>
                <h3 className="h6 fw-bold text-body mb-1">{appointment.doctorName}</h3>
                <div className="small text-muted">{appointment.specialty}</div>
                <div className="small text-muted mb-2">{appointment.department}</div>

                <div className="small border-top pt-2 d-flex align-items-center gap-1">
                  <MapPin size={13} className="text-primary flex-shrink-0" />
                  <strong className="text-body">{t('patient.location')}: </strong>
                  <span className="text-muted">{appointment.location}</span>
                </div>

                {appointment.doctorSlug && (
                  <div className="mt-2">
                    <Link
                      to={`/doctors/${appointment.doctorSlug}`}
                      className="small text-primary text-decoration-none fw-semibold"
                    >
                      {t('doctors.viewProfile')} &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule & Timing */}
            <div className="col-12 col-md-6">
              <div className="neu-inset p-3 rounded-4 h-100">
                <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2 d-flex align-items-center gap-1">
                  <Calendar size={14} />
                  <span>{t('patient.time')}</span>
                </div>
                <div className="fw-bold text-body">
                  {appointment.dayName ? `${appointment.dayName}, ` : ''}{appointment.date}
                </div>
                <div className="fw-bold text-primary fs-5 my-1">{appointment.time}</div>
                <div className="small text-muted mb-2">
                  Duration: {appointment.duration || '30 minutes'} &bull; In-person OPD
                </div>

                <div className="small border-top pt-2 text-muted">
                  Booking Created: {new Date(appointment.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Patient Intake Information */}
            <div className="col-12">
              <div className="neu-inset p-3 rounded-4">
                <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2 d-flex align-items-center gap-1">
                  <User size={14} />
                  <span>Patient Intake Record</span>
                </div>
                <div className="row g-2 small text-muted">
                  <div className="col-12 col-sm-6">
                    <strong className="text-body">{t('patient.fullName')}: </strong>
                    <span>{appointment.patient?.fullName}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <strong className="text-body">{t('patient.mobile')}: </strong>
                    <span>{appointment.patient?.mobile}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <strong className="text-body">{t('patient.email')}: </strong>
                    <span>{appointment.patient?.email}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <strong className="text-body">{t('patient.reason')}: </strong>
                    <span>{appointment.patient?.reasonForVisit}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex flex-column flex-sm-row gap-2 pt-3 border-top justify-content-between align-items-stretch align-items-sm-center">
            <Link to="/my-appointments" className="text-decoration-none">
              <button type="button" className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center justify-content-center gap-1 w-100 w-sm-auto" style={{ minHeight: '44px' }}>
                <ArrowLeft size={14} />
                <span>Back to Dashboard</span>
              </button>
            </Link>

            {isActionable && (
              <div className="d-flex flex-column flex-sm-row gap-2">
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm justify-content-center"
                  style={{ minHeight: '44px' }}
                  onClick={handleReschedule}
                >
                  {t('patient.reschedule')}
                </button>
                <button
                  type="button"
                  className="neu-btn neu-btn-outline text-danger neu-btn-sm justify-content-center"
                  style={{ minHeight: '44px' }}
                  onClick={() => setShowCancelModal(true)}
                >
                  {t('patient.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div
            className="modal show d-block glass-modal-backdrop"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCancelModal(false);
            }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '460px' }}>
              <div className="glass-modal neu-raised neu-surface rounded-4 overflow-hidden border-0 shadow-lg">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="modal-title fs-6 fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                    <AlertTriangle size={18} />
                    <span>{t('patient.confirmCancel')}</span>
                  </h5>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-muted p-0"
                    onClick={() => setShowCancelModal(false)}
                    aria-label="Close"
                    style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-4">
                  <p className="small text-muted mb-3">
                    {t('patient.cancelModalText')}
                  </p>
                  <div className="neu-inset p-3 rounded-3 small text-muted mb-2">
                    <div className="mb-1"><strong className="text-body">Reference: </strong><span className="font-monospace">{appointment.reference}</span></div>
                    <div className="mb-1"><strong className="text-body">{t('patient.doctor')}: </strong>{appointment.doctorName}</div>
                    <div><strong className="text-body">{t('patient.time')}: </strong>{appointment.date} at {appointment.time}</div>
                  </div>
                </div>
                <div className="p-3 border-top d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline neu-btn-sm"
                    style={{ minHeight: '44px' }}
                    onClick={() => setShowCancelModal(false)}
                  >
                    {t('patient.keepAppointment')}
                  </button>
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline text-danger neu-btn-sm px-3"
                    style={{ minHeight: '44px' }}
                    onClick={handleConfirmCancel}
                  >
                    {t('patient.confirmCancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AppointmentDetailPage;
