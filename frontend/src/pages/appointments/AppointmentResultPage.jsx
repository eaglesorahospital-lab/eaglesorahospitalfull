import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

/**
 * Hospital Platform — Appointment Result & Confirmation Page (Phase 6)
 * Displays the simulated appointment slip with prototype reference code,
 * clinical consultation details, and arrival guidelines.
 */
export function AppointmentResultPage() {
  const location = useLocation();

  // Retrieve appointment from router location state or session storage fallback
  const appointment = useMemo(() => {
    if (location.state?.appointment) {
      return location.state.appointment;
    }
    try {
      const stored = sessionStorage.getItem('eglesora_latest_appointment');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }, [location.state]);

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Appointments', to: '/appointments/book' },
    { label: 'Booking Slip Preview' },
  ];

  if (!appointment) {
    return (
      <Container>
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
              <Link to="/appointments/book">
                <Button variant="primary" size="md">
                  Book an Appointment
                </Button>
              </Link>
            }
          />
        </div>
      </Container>
    );
  }

  return (
    <div className="appointment-result-page">
      <Container>
        <PageHeader
          title="Appointment Request Preview"
          description="Your outpatient consultation request has been recorded in the prototype session."
          breadcrumbs={breadcrumbs}
        />

        {/* Prototype Disclaimer Banner */}
        <div className="schedule-preview-banner mb-4">
          <strong>Frontend Prototype Confirmation:</strong> This consultation slip is generated locally
          for demonstration. Authoritative scheduling, payment, and database persistence will be integrated
          in subsequent backend phases.
        </div>

        {/* Booking Slip Card */}
        <div className="booking-receipt-card mb-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3 mb-4">
            <div>
              <span className="text-uppercase small fw-bold text-muted">Booking Reference</span>
              <div className="h4 fw-bold text-primary mb-0">{appointment.reference}</div>
            </div>
            <div>
              <span className="hospital-badge hospital-badge-confirmed fs-6 px-3 py-1">
                {appointment.status || 'Preview Request'}
              </span>
            </div>
          </div>

          <div className="row g-3 mb-4">
            {/* Consultant & Affiliation */}
            <div className="col-12 col-md-6">
              <div className="p-3 bg-light border border-light rounded h-100">
                <div className="small fw-semibold text-primary mb-1">Attending Specialist</div>
                <div className="fw-bold text-dark">{appointment.doctorName}</div>
                <div className="small text-muted">{appointment.specialty}</div>
                <div className="small text-muted">{appointment.department}</div>
                <div className="small text-dark mt-2">
                  <strong>Room: </strong> {appointment.location}
                </div>
              </div>
            </div>

            {/* Schedule Details */}
            <div className="col-12 col-md-6">
              <div className="p-3 bg-light border border-light rounded h-100">
                <div className="small fw-semibold text-primary mb-1">Consultation Date & Time</div>
                <div className="fw-bold text-dark">
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
              <div className="p-3 bg-light border border-light rounded">
                <div className="small fw-semibold text-primary mb-2">Patient Profile</div>
                <div className="row g-2 small">
                  <div className="col-12 col-sm-6">
                    <span className="fw-semibold text-dark">Patient Name: </span>
                    <span className="text-muted">{appointment.patient?.fullName}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <span className="fw-semibold text-dark">Date of Birth: </span>
                    <span className="text-muted">{appointment.patient?.dateOfBirth} ({appointment.patient?.gender})</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <span className="fw-semibold text-dark">Mobile Contact: </span>
                    <span className="text-muted">{appointment.patient?.mobile}</span>
                  </div>
                  <div className="col-12 col-sm-6">
                    <span className="fw-semibold text-dark">Email Address: </span>
                    <span className="text-muted">{appointment.patient?.email}</span>
                  </div>
                  <div className="col-12 mt-2">
                    <span className="fw-semibold text-dark">Reason for Consultation: </span>
                    <span className="text-muted">{appointment.patient?.reasonForVisit}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Arrival Guidelines */}
          <div className="p-3 border border-light rounded bg-white mb-4">
            <h3 className="h6 fw-bold text-dark mb-2">Hospital Arrival Guidelines</h3>
            <ul className="small text-muted mb-0 ps-3">
              <li className="mb-1">
                Please report to the {appointment.department} outpatient reception desk 15 minutes before your scheduled slot.
              </li>
              <li className="mb-1">
                Carry government-issued photo identification along with any past medical discharge summaries, ECGs, or imaging files.
              </li>
              <li>
                Present your booking reference <strong>{appointment.reference}</strong> at the reception counter for token issuance.
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top">
            <Link to="/my-appointments">
              <Button variant="secondary" size="md">
                View My Appointments
              </Button>
            </Link>

            <div className="d-flex gap-2">
              <Link to="/appointments/book">
                <Button variant="outline" size="md">
                  Book Another
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="md">
                  Return Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default AppointmentResultPage;
