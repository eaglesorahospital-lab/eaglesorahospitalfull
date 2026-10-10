import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import PatientNav from '../../components/patient/PatientNav';
import usePatientSession from '../../hooks/usePatientSession';
import appointmentService from '../../services/appointmentService';

/**
 * Hospital Platform — Appointment Details Page
 * View individual consultation reservation with doctor affiliation, clinic location,
 * timing, intake reason, and accessible cancellation controls.
 * Centered within the standard patient portal container (max-width: 1040px).
 */
export function AppointmentDetailPage() {
  const { t } = useTranslation();
  const { reference } = useParams();
  const navigate = useNavigate();

  const { getAppointmentByReference, cancelAppointment, isAuthenticated } = usePatientSession();
  const sessionAppointment = getAppointmentByReference(reference);
  const [remoteAppointment, setRemoteAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(!sessionAppointment);

  useEffect(() => {
    if (!sessionAppointment && reference && isAuthenticated) {
      let isMounted = true;
      setIsLoading(true);

      appointmentService
        .getAppointment(reference)
        .then((data) => {
          if (isMounted && data) {
            setRemoteAppointment(data);
          }
        })
        .catch((err) => {
          console.warn(`Could not load appointment ${reference} from API:`, err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else if (!isAuthenticated) {
      setIsLoading(false);
    }
  }, [sessionAppointment, reference, isAuthenticated]);

  const appointment = sessionAppointment || remoteAppointment;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

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
          <div className="patient-card bg-white border rounded-3 p-4 p-md-5 text-center shadow-sm">
            <h3 className="fs-5 fw-bold text-dark mb-2">Sign In to View Appointment Details</h3>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '480px' }}>
              Please sign in to verify your identity and view the full details of appointment reference <strong>{reference}</strong>.
            </p>
            <Link to="/patient/login" className="hospital-btn hospital-btn-primary px-4 py-2">
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
                <Link to="/my-appointments">
                  <Button variant="primary" size="sm">
                    Return to Appointments
                  </Button>
                </Link>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = appointment.status === 'Cancelled';
  const isCompleted = appointment.status === 'Completed';
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
        {/* Page Header */}
        <PageHeader
          title={`Appointment: ${appointment.reference}`}
          description={`Consultation file with ${appointment.doctorName} (${appointment.department})`}
          breadcrumbs={breadcrumbs}
          className="mb-3"
        />

        {/* Patient Identity Strip & Tab Navigation */}
        <PatientNav />

        {/* Feedback Alert if Action Performed */}
        {feedbackNotice && (
          <div className="alert alert-success alert-dismissible fade show mb-4 small py-2 px-3" role="alert">
            {feedbackNotice}
            <button
              type="button"
              className="btn-close py-2"
              onClick={() => setFeedbackNotice(null)}
              aria-label="Close"
            />
          </div>
        )}

        {/* Main Details Card */}
        <div className="patient-card bg-white border rounded-3 p-3 p-md-4 mb-5 shadow-sm">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3 mb-4">
            <div>
              <span className="text-uppercase small fw-bold text-muted">Booking Reference</span>
              <div className="h4 fw-bold text-primary mb-0 font-monospace">{appointment.reference}</div>
            </div>

            <div>
              <StatusBadge status={appointment.status} className="fs-6 px-3 py-1" />
            </div>
          </div>

          <div className="row g-3 g-md-4 mb-4">
            {/* Attending Specialist */}
            <div className="col-12 col-md-6">
              <div className="p-3 bg-slate-50 border rounded-2 h-100">
                <div className="text-uppercase small fw-bold text-primary mb-2">
                  {t('patient.doctor')}
                </div>
                <h3 className="h6 fw-bold text-dark mb-1">{appointment.doctorName}</h3>
                <div className="small text-muted">{appointment.specialty}</div>
                <div className="small text-muted mb-2">{appointment.department}</div>

                <div className="small border-top pt-2">
                  <span className="fw-semibold text-dark">{t('patient.location')}: </span>
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
              <div className="p-3 bg-slate-50 border rounded-2 h-100">
                <div className="text-uppercase small fw-bold text-primary mb-2">
                  {t('patient.time')}
                </div>
                <div className="fw-bold text-dark">
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
              <div className="p-3 bg-slate-50 border rounded-2">
                <div className="text-uppercase small fw-bold text-primary mb-2">
                  Patient Intake Record
                </div>
                <div className="row g-2 small">
                  <div className="col-12 col-sm-6">
                    <span className="fw-semibold text-dark">{t('patient.fullName')}: </span>
                    <span className="text-muted">{appointment.patient?.fullName}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <span className="fw-semibold text-dark">{t('patient.mobile')}: </span>
                    <span className="text-muted">{appointment.patient?.mobile}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <span className="fw-semibold text-dark">{t('patient.email')}: </span>
                    <span className="text-muted">{appointment.patient?.email}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <span className="fw-semibold text-dark">{t('patient.reason')}: </span>
                    <span className="text-muted">{appointment.patient?.reasonForVisit}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex flex-column flex-sm-row gap-2 pt-3 border-top justify-content-between align-items-stretch align-items-sm-center">
            <Link to="/my-appointments" className="w-100 w-sm-auto text-decoration-none">
              <Button variant="outline" size="sm" className="w-100 justify-content-center">
                &larr; Back to Dashboard
              </Button>
            </Link>

            {isActionable && (
              <div className="d-flex flex-column flex-sm-row gap-2">
                <Button variant="outline" size="sm" onClick={handleReschedule} className="justify-content-center">
                  {t('patient.reschedule')}
                </Button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
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
            className="modal show d-block"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fs-6 fw-bold text-danger">
                    {t('patient.confirmCancel')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowCancelModal(false)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body p-4">
                  <p className="small text-secondary mb-3">
                    {t('patient.cancelModalText')}
                  </p>
                  <div className="cancel-confirm-box p-3 rounded-2 bg-light border mb-2 small">
                    <div className="mb-1"><strong>Reference: </strong>{appointment.reference}</div>
                    <div className="mb-1"><strong>{t('patient.doctor')}: </strong>{appointment.doctorName}</div>
                    <div><strong>{t('patient.time')}: </strong>{appointment.date} at {appointment.time}</div>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light py-2 px-3">
                  <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
                    {t('patient.keepAppointment')}
                  </Button>
                  <button type="button" className="btn btn-sm btn-danger px-3" onClick={handleConfirmCancel}>
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
