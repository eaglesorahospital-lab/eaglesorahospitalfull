import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import PatientNav from '../../components/patient/PatientNav';
import usePatientSession from '../../hooks/usePatientSession';

/**
 * Hospital Platform — Patient Dashboard & Appointments Page
 * Centered, balanced patient dashboard adhering to Apollo / Fortis healthcare UX standards:
 * - Clean centered layout container (max-width: 1040px)
 * - Clear visual hierarchy for upcoming consultations & dedicated action boxes
 * - Dynamic PostgreSQL records filtered strictly to authenticated patient
 * - No mock patient fallbacks; unauthenticated visitors are prompted to sign in
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
  } = usePatientSession();

  const breadcrumbs = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.patientPortal') },
    { label: t('patient.dashboard') },
  ];

  // Tab filter state: 'upcoming' | 'past' | 'cancelled' | 'all'
  const [activeTab, setActiveTab] = useState('upcoming');

  // Cancel confirmation state
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Compute displayed appointments based on active tab
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
        {/* ====================================================================
            1. Page Header (Clean, No Duplicate Buttons)
            ==================================================================== */}
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

        {actionError && (
          <div className="alert alert-danger alert-dismissible fade show mb-4 small py-2 px-3" role="alert">
            {actionError}
            <button
              type="button"
              className="btn-close py-2"
              onClick={() => setActionError(null)}
              aria-label="Close"
            />
          </div>
        )}

        {!isAuthenticated ? (
          /* Unauthenticated Prompt */
          <div className="patient-card bg-white border rounded-3 p-4 p-md-5 text-center shadow-sm mb-5">
            <div className="mb-3 text-primary">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="fs-5 fw-bold text-dark mb-2">Access Your Scheduled Consultations</h3>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '520px' }}>
              To safeguard your health records, outpatient consultations and appointment history are strictly tied to your authenticated patient profile.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link to="/patient/login" className="hospital-btn hospital-btn-primary px-4 py-2">
                Sign In to View Appointments
              </Link>
              <Link to="/appointments/book" className="btn btn-outline-secondary px-4 py-2">
                Book a Consultation
              </Link>
            </div>
          </div>
        ) : isLoading ? (
          <div className="patient-card bg-white border rounded-3 p-5 text-center shadow-sm mb-5">
            <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
            <div className="text-muted small">Loading your consultation records...</div>
          </div>
        ) : (
          <>
            {/* ====================================================================
                2. Primary Upcoming Consultation Highlight (Clean Hierarchy)
                ==================================================================== */}
            {nextUpcoming && (
              <section className="upcoming-consultation-card bg-white border border-primary border-opacity-25 rounded-3 p-3 p-md-4 mb-4 shadow-sm" aria-label="Next Upcoming Appointment">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
                  <span className="badge bg-primary bg-opacity-10 text-primary fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                    Next Upcoming Consultation
                  </span>
                  <StatusBadge status={nextUpcoming.status} />
                </div>

                <div className="row g-3 align-items-center">
                  {/* Doctor & Appointment Details */}
                  <div className="col-12 col-md-8 col-lg-9">
                    <h3 className="h5 fw-bold text-dark mb-1 lh-sm">
                      {nextUpcoming.doctorName}
                    </h3>
                    <div className="small text-primary fw-semibold mb-2">
                      {nextUpcoming.specialty} &bull; <span className="text-muted">{nextUpcoming.department}</span>
                    </div>

                    <div className="p-2-5 bg-slate-50 border rounded-2 mb-2 d-inline-block w-100">
                      <div className="small text-dark mb-1">
                        <strong className="text-secondary">Consultation Slot: </strong>
                        <span className="fw-bold text-dark">
                          {nextUpcoming.dayName ? `${nextUpcoming.dayName}, ` : ''}{nextUpcoming.date} at {nextUpcoming.time}
                        </span>
                        <span className="text-muted small"> ({nextUpcoming.duration || '30 mins'})</span>
                      </div>
                      <div className="small text-muted">
                        <strong className="text-secondary">OPD Clinic: </strong>
                        {nextUpcoming.location} &bull; Ref: <strong className="text-dark">{nextUpcoming.reference}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Compact Action Area */}
                  <div className="col-12 col-md-4 col-lg-3">
                    <div className="d-flex flex-column flex-sm-row flex-md-column gap-2 justify-content-end">
                      <Link to={`/my-appointments/${nextUpcoming.reference}`} className="w-100">
                        <Button variant="primary" size="sm" className="w-100 justify-content-center">
                          {t('patient.viewDetails')}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-100 justify-content-center"
                        onClick={() => handleReschedule(nextUpcoming)}
                      >
                        {t('patient.reschedule')}
                      </Button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger w-100"
                        onClick={() => setCancellingAppointment(nextUpcoming)}
                      >
                        {t('patient.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ====================================================================
                3. Appointment History Tabs & Structured Records
                ==================================================================== */}
            <section className="appointment-history-card bg-white border rounded-3 p-3 p-md-4 mb-5 shadow-sm" aria-label="Appointment History">
              {/* Header Row: Title on Left, Filter Tabs on Right */}
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 border-bottom pb-3 mb-4">
                <div>
                  <h2 className="h6 fw-bold text-dark mb-1">
                    {t('patient.appointmentHistory')}
                  </h2>
                  <div className="small text-muted">
                    Filter and review your scheduled clinic appointments
                  </div>
                </div>

                {/* Filter Buttons */}
                <div className="d-flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
                    onClick={() => setActiveTab('upcoming')}
                  >
                    {t('patient.tabUpcoming')} ({upcomingAppointments.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'past' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
                    onClick={() => setActiveTab('past')}
                  >
                    {t('patient.tabPast')} ({pastAppointments.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'cancelled' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
                    onClick={() => setActiveTab('cancelled')}
                  >
                    {t('patient.tabCancelled')} ({cancelledAppointments.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
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
                        className="appointment-record-row p-3 rounded-2 border bg-white hover-border-primary transition-all"
                        aria-label={`Appointment reference ${apt.reference}`}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                          {/* Left: Consultation Record Information */}
                          <div className="flex-grow-1 min-w-0">
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                              <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.8rem' }}>
                                {apt.reference}
                              </span>
                              <StatusBadge status={apt.status} />
                              <span className="small text-muted">&bull; {apt.department}</span>
                            </div>

                            <h4 className="fs-6 fw-bold text-primary mb-1">
                              <Link
                                to={`/my-appointments/${apt.reference}`}
                                className="text-decoration-none text-primary"
                              >
                                {apt.doctorName}
                              </Link>
                            </h4>
                            <div className="small text-muted mb-2">
                              Specialty: <strong className="text-dark">{apt.specialty}</strong> &bull; Clinic: {apt.location}
                            </div>

                            <div className="small mb-2">
                              <span className="text-secondary fw-semibold">Consultation: </span>
                              <strong className="text-dark">{apt.dayName ? `${apt.dayName}, ` : ''}{apt.date}</strong> at <strong className="text-dark">{apt.time}</strong> ({apt.duration || '30 mins'})
                            </div>

                            {apt.patient && (
                              <div className="small text-muted bg-slate-50 p-2 rounded border border-light">
                                Patient: <strong className="text-dark">{apt.patient.fullName || patientProfile?.fullName}</strong> &bull; Clinical Reason: {apt.reasonForVisit || apt.patient.reasonForVisit}
                              </div>
                            )}
                          </div>

                          {/* Right: Compact Proportional Action Area */}
                          <div className="appointment-action-box d-flex flex-column flex-sm-row flex-md-column gap-2 justify-content-md-end">
                            <Link to={`/my-appointments/${apt.reference}`} className="w-100">
                              <Button variant="outline" size="sm" className="w-100 justify-content-center">
                                {t('patient.viewDetails')}
                              </Button>
                            </Link>
                            {isActionable && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-100 justify-content-center"
                                  onClick={() => handleReschedule(apt)}
                                >
                                  {t('patient.reschedule')}
                                </Button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger w-100"
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
                      <Link to="/doctors">
                        <Button variant="primary" size="sm">
                          {t('hero.findDoctor')} &rarr;
                        </Button>
                      </Link>
                    }
                  />
                </div>
              )}
            </section>
          </>
        )}

        {/* ====================================================================
            4. In-Place Cancel Confirmation Modal
            ==================================================================== */}
        {cancellingAppointment && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom">
                  <h5 id="cancel-modal-title" className="modal-title fs-6 fw-bold text-danger">
                    {t('patient.confirmCancel')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setCancellingAppointment(null)}
                    disabled={isCancelling}
                  />
                </div>

                <div className="modal-body p-4">
                  <p className="small text-secondary mb-3">
                    {t('patient.cancelModalText')}
                  </p>

                  <div className="cancel-confirm-box p-3 rounded-2 bg-light border mb-3 small">
                    <div className="mb-1"><strong>Ref: </strong>{cancellingAppointment.reference}</div>
                    <div className="mb-1"><strong>Doctor: </strong>{cancellingAppointment.doctorName}</div>
                    <div className="mb-1"><strong>Specialty: </strong>{cancellingAppointment.specialty}</div>
                    <div><strong>Slot: </strong>{cancellingAppointment.date} at {cancellingAppointment.time}</div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light py-2 px-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancellingAppointment(null)}
                    disabled={isCancelling}
                  >
                    {t('patient.keepAppointment')}
                  </Button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger px-3"
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
