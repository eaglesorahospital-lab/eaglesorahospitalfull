import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import PatientNav from '../../components/patient/PatientNav';
import usePatientSession from '../../hooks/usePatientSession';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RotateCw,
  X,
} from 'lucide-react';

/**
 * Hospital Platform — Patient Dashboard & Appointments Page
 * Neumorphism / Soft UI patient dashboard adhering to healthcare UX standards:
 * - Clear visual hierarchy for upcoming consultations & dedicated action boxes
 * - Dynamic PostgreSQL records filtered strictly to authenticated patient
 */
export function MyAppointmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    patientProfile,
    appointments,
    upcomingAppointments,
    pastAppointments,
    cancelledAppointments,
    nextUpcoming,
    isLoading,
    isAuthenticated,
    currentUser,
    cancelAppointment,
    refreshAppointments,
  } = usePatientSession();

  React.useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) refreshAppointments();
    };
    const handleUpdate = () => {
      if (isAuthenticated) refreshAppointments();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('eglesora-appointment-updated', handleUpdate);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('eglesora-appointment-updated', handleUpdate);
    };
  }, [isAuthenticated, refreshAppointments]);

  const breadcrumbs = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.patientPortal') },
    { label: t('patient.dashboard') },
  ];

  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const displayedAppointments = (() => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingAppointments;
      case 'past':
        return pastAppointments;
      case 'cancelled':
        return cancelledAppointments;
      default:
        return appointments;
    }
  })();

  const handleConfirmCancel = async () => {
    if (!cancellingAppointment) return;
    try {
      setIsCancelling(true);
      setActionError(null);
      await cancelAppointment(cancellingAppointment.reference);
      setFeedbackNotice(t('patient.appointmentCancelledSuccess'));
      setCancellingAppointment(null);
    } catch (err) {
      setActionError(err.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReschedule = (apt) => {
    const slug = apt.doctorSlug || apt.doctorId;
    navigate(`/appointments/book?doctor=${slug}&date=${apt.date}`);
  };

  const welcomeName = patientProfile?.fullName || currentUser?.name || 'Patient';

  return (
    <div className="patient-dashboard-page py-4">
      <div className="patient-portal-container">
        {/* Page Header */}
        <PageHeader
          title={`${t('patient.welcome')}, ${welcomeName}`}
          description="Manage your outpatient consultations, medical appointments, and clinic schedules."
          breadcrumbs={breadcrumbs}
          className="mb-3"
        />

        {/* Patient Identity Strip & Tab Navigation */}
        <PatientNav />

        {/* Action Feedback Banner */}
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
            >
              <X size={16} />
            </button>
          </div>
        )}

        {actionError && (
          <div className="neu-inset p-3 rounded-4 mb-4 border-start border-4 border-danger small text-danger d-flex justify-content-between align-items-center" role="alert">
            <span className="d-flex align-items-center gap-2">
              <AlertTriangle size={16} />
              <span>{actionError}</span>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-link text-muted p-0"
              onClick={() => setActionError(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {!isAuthenticated ? (
          /* Unauthenticated Prompt */
          <div className="neu-raised neu-surface rounded-4 p-4 p-md-5 text-center mb-5">
            <div className="neu-inset rounded-circle d-inline-flex p-3 text-primary mb-3">
              <Calendar size={36} />
            </div>
            <h3 className="fs-5 fw-bold text-body mb-2">Access Your Scheduled Consultations</h3>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '520px' }}>
              To safeguard your health records, outpatient consultations and appointment history are strictly tied to your authenticated patient profile.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link to="/patient/login" className="neu-btn neu-btn-primary px-4 py-2">
                Sign In to View Appointments
              </Link>
              <Link to="/appointments/book" className="neu-btn neu-btn-outline px-4 py-2">
                Book a Consultation
              </Link>
            </div>
          </div>
        ) : isLoading ? (
          <div className="neu-raised neu-surface rounded-4 p-5 text-center mb-5">
            <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
            <div className="text-muted small">Loading your consultation records...</div>
          </div>
        ) : (
          <>
            {/* Primary Upcoming Consultation Highlight */}
            {nextUpcoming && (
              <section className="neu-raised neu-surface rounded-4 p-4 p-md-5 mb-5 border-start border-4 border-primary" aria-label="Next Upcoming Appointment">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 pb-3 border-bottom">
                  <span className="neu-badge neu-badge-primary">
                    Next Upcoming Consultation
                  </span>
                  <StatusBadge status={nextUpcoming.status} />
                </div>

                <div className="row g-4 align-items-center">
                  {/* Doctor & Appointment Details */}
                  <div className="col-12 col-md-8 col-lg-9">
                    <h3 className="h4 fw-bold text-body mb-1">
                      {nextUpcoming.doctorName}
                    </h3>
                    <div className="small text-primary fw-semibold mb-3 d-flex align-items-center gap-1">
                      <Stethoscope size={14} />
                      <span>{nextUpcoming.specialty} &bull; <span className="text-muted">{nextUpcoming.department}</span></span>
                    </div>

                    <div className="p-3 p-md-4 neu-inset rounded-3 mb-0 w-100">
                      <div className="small text-body mb-2 d-flex align-items-center gap-2">
                        <Calendar size={15} className="text-primary flex-shrink-0" />
                        <strong className="text-muted">Slot: </strong>
                        <span className="fw-bold text-body">
                          {nextUpcoming.dayName ? `${nextUpcoming.dayName}, ` : ''}{nextUpcoming.date} at {nextUpcoming.time}
                        </span>
                        <span className="text-muted small"> ({nextUpcoming.duration || '30 mins'})</span>
                      </div>
                      <div className="small text-muted d-flex flex-wrap align-items-center gap-2">
                        <strong className="text-body">OPD Clinic: </strong>
                        <span>{nextUpcoming.location}</span>
                        <span className="ms-2 font-monospace neu-badge neu-badge-neutral">{nextUpcoming.reference}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-12 col-md-4 col-lg-3">
                    <div className="d-flex flex-column gap-2 justify-content-end">
                      <Link to={`/my-appointments/${nextUpcoming.reference}`} className="w-100">
                        <button type="button" className="neu-btn neu-btn-primary w-100 justify-content-center neu-btn-sm py-2">
                          {t('patient.viewDetails')}
                        </button>
                      </Link>
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline w-100 justify-content-center neu-btn-sm py-2"
                        onClick={() => handleReschedule(nextUpcoming)}
                      >
                        {t('patient.reschedule')}
                      </button>
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline text-danger w-100 justify-content-center neu-btn-sm py-2"
                        onClick={() => setCancellingAppointment(nextUpcoming)}
                      >
                        {t('patient.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Appointment History Tabs & Structured Records */}
            <section className="neu-raised neu-surface rounded-4 p-4 p-md-5 mb-5" aria-label="Appointment History">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 border-bottom pb-3 mb-4">
                <div>
                  <h2 className="h5 fw-bold text-body mb-1">
                    {t('patient.appointmentHistory')}
                  </h2>
                  <div className="small text-muted">
                    Filter and review your scheduled clinic appointments
                  </div>
                </div>

                {/* Filter Buttons */}
                <div className="neu-inset p-1.5 rounded-pill d-flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={`neu-btn neu-btn-sm rounded-pill px-3 py-1.5 ${activeTab === 'upcoming' ? 'neu-btn-primary' : 'neu-btn-outline border-0 shadow-none'}`}
                    onClick={() => setActiveTab('upcoming')}
                  >
                    {t('patient.tabUpcoming')} ({upcomingAppointments.length})
                  </button>
                  <button
                    type="button"
                    className={`neu-btn neu-btn-sm rounded-pill px-3 py-1.5 ${activeTab === 'past' ? 'neu-btn-primary' : 'neu-btn-outline border-0 shadow-none'}`}
                    onClick={() => setActiveTab('past')}
                  >
                    {t('patient.tabPast')} ({pastAppointments.length})
                  </button>
                  <button
                    type="button"
                    className={`neu-btn neu-btn-sm rounded-pill px-3 py-1.5 ${activeTab === 'cancelled' ? 'neu-btn-primary' : 'neu-btn-outline border-0 shadow-none'}`}
                    onClick={() => setActiveTab('cancelled')}
                  >
                    {t('patient.tabCancelled')} ({cancelledAppointments.length})
                  </button>
                  <button
                    type="button"
                    className={`neu-btn neu-btn-sm rounded-pill px-3 py-1.5 ${activeTab === 'all' ? 'neu-btn-primary' : 'neu-btn-outline border-0 shadow-none'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    {t('patient.tabAll')} ({appointments.length})
                  </button>
                </div>
              </div>

              {/* List of Appointment Records */}
              {displayedAppointments.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {displayedAppointments.map((apt) => {
                    const isCancelled = apt.status === 'Cancelled' || apt.status === 'CANCELLED';
                    const isCompleted = apt.status === 'Completed' || apt.status === 'COMPLETED';
                    const isActionable = !isCancelled && !isCompleted;

                    return (
                      <article
                        key={apt.reference}
                        className="neu-raised neu-surface p-3 p-md-4 rounded-4 transition-all hover-lift"
                        aria-label={`Appointment reference ${apt.reference}`}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-4">
                          <div className="flex-grow-1 min-w-0">
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                              <span 
                                className="font-monospace px-2.5 py-1 rounded small fw-bold"
                                style={{ 
                                  background: 'var(--hospital-surface)', 
                                  boxShadow: 'var(--neu-inset)',
                                  fontSize: '0.785rem',
                                  color: 'var(--hospital-medical-blue)'
                                }}
                              >
                                {apt.reference}
                              </span>
                              <StatusBadge status={apt.status} />
                              <span className="small text-muted">&bull; {apt.department}</span>
                            </div>

                            <h4 className="fs-5 fw-bold text-body mb-1">
                              <Link
                                to={`/my-appointments/${apt.reference}`}
                                className="text-decoration-none text-body hover-text-primary"
                              >
                                {apt.doctorName}
                              </Link>
                            </h4>
                            <div className="small text-muted mb-2">
                              Specialty: <strong className="text-body">{apt.specialty}</strong> &bull; Clinic: {apt.location}
                            </div>

                            <div className="small mb-3 text-muted">
                              <span>Consultation: </span>
                              <strong className="text-body">{apt.dayName ? `${apt.dayName}, ` : ''}{apt.date}</strong> at <strong className="text-body">{apt.time}</strong> ({apt.duration || '30 mins'})
                            </div>

                            {apt.patient && (
                              <div className="small text-muted neu-inset p-2.5 rounded-3">
                                Patient: <strong className="text-body">{apt.patient.fullName || patientProfile?.fullName}</strong> &bull; Reason: {apt.reasonForVisit || apt.patient.reasonForVisit}
                              </div>
                            )}
                          </div>

                          <div className="d-flex flex-column flex-sm-row flex-md-column gap-2 justify-content-md-end flex-shrink-0" style={{ minWidth: '150px' }}>
                            <Link to={`/my-appointments/${apt.reference}`}>
                              <button type="button" className="neu-btn neu-btn-outline neu-btn-sm w-100 justify-content-center">
                                {t('patient.viewDetails')}
                              </button>
                            </Link>
                            {isActionable && (
                              <>
                                <button
                                  type="button"
                                  className="neu-btn neu-btn-outline neu-btn-sm w-100 justify-content-center"
                                  onClick={() => handleReschedule(apt)}
                                >
                                  {t('patient.reschedule')}
                                </button>
                                <button
                                  type="button"
                                  className="neu-btn neu-btn-outline text-danger neu-btn-sm w-100 justify-content-center"
                                  onClick={() => setCancellingAppointment(apt)}
                                >
                                  {t('patient.cancel')}
                                </button>
                              </>
                            )}
                            {isCancelled && (
                              <span className="small text-danger fst-italic text-center">Cancelled</span>
                            )}
                            {isCompleted && (
                              <span className="small text-success fst-italic text-center">Completed</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4">
                  <EmptyState
                    title={t('patient.noAppointmentsTitle')}
                    message={t('patient.noAppointmentsMsg')}
                    action={
                      <Link to="/doctors" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1">
                        <span>{t('hero.findDoctor')}</span>
                        <ChevronRight size={14} />
                      </Link>
                    }
                  />
                </div>
              )}
            </section>
          </>
        )}

        {/* Cancellation Confirmation Modal */}
        {cancellingAppointment && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
              <div className="neu-raised neu-surface rounded-4 overflow-hidden border-0">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                  <h5 id="cancel-modal-title" className="modal-title fs-6 fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                    <AlertTriangle size={18} />
                    <span>{t('patient.confirmCancel')}</span>
                  </h5>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-muted p-0"
                    aria-label="Close"
                    onClick={() => setCancellingAppointment(null)}
                    disabled={isCancelling}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4">
                  <p className="small text-muted mb-3">
                    {t('patient.cancelModalText')}
                  </p>

                  <div className="neu-inset p-3 rounded-3 mb-3 small text-muted">
                    <div className="mb-1"><strong className="text-body">Ref: </strong><span className="font-monospace">{cancellingAppointment.reference}</span></div>
                    <div className="mb-1"><strong className="text-body">Doctor: </strong>{cancellingAppointment.doctorName}</div>
                    <div className="mb-1"><strong className="text-body">Specialty: </strong>{cancellingAppointment.specialty}</div>
                    <div><strong className="text-body">Slot: </strong>{cancellingAppointment.date} at {cancellingAppointment.time}</div>
                  </div>
                </div>

                <div className="p-3 border-top d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline neu-btn-sm"
                    onClick={() => setCancellingAppointment(null)}
                    disabled={isCancelling}
                  >
                    {t('patient.keepAppointment')}
                  </button>
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline text-danger neu-btn-sm"
                    onClick={handleConfirmCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling...' : t('patient.confirmCancel')}
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

export default MyAppointmentsPage;
