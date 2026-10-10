import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import doctorService from '../../services/doctorService';
import scheduleService from '../../services/scheduleService';
import { getDoctorByIdOrSlug } from '../../data/hospitalData';

/**
 * Formats 24h time string ("09:00:00" or "09:00") into clean 12h display ("09:00 AM").
 */
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return timeStr;
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Hospital Platform — Doctor Profile Page (Phase 4 & Persistence Fix)
 * Comprehensive specialist profile presenting qualifications, clinical bio,
 * areas of expertise, outpatient consultation timings, breaks, and leaves.
 * Backed by authoritative PostgreSQL database records.
 */
export function DoctorDetailPage() {
  const { slug, id } = useParams();
  const identifier = slug || id;

  const [doctor, setDoctor] = useState(() => getDoctorByIdOrSlug(identifier));
  const [dbSchedules, setDbSchedules] = useState([]);
  const [dbLeaves, setDbLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(!doctor);
  const [apiError, setApiError] = useState(null);

  const loadDoctorProfile = () => {
    setIsLoading(true);
    setApiError(null);

    Promise.allSettled([
      doctorService.getDoctor(identifier),
      scheduleService.getDoctorSchedules(identifier),
      scheduleService.getDoctorLeaves(identifier),
    ])
      .then(([docResult, schedResult, leaveResult]) => {
        if (docResult.status === 'fulfilled' && docResult.value) {
          setDoctor(docResult.value);
        } else if (docResult.status === 'rejected') {
          console.warn(`Could not load doctor ${identifier} from API:`, docResult.reason);
          setApiError('Unable to load physician profile from server. Please retry.');
        }

        if (schedResult.status === 'fulfilled' && Array.isArray(schedResult.value)) {
          setDbSchedules(schedResult.value);
        }

        if (leaveResult.status === 'fulfilled' && Array.isArray(leaveResult.value)) {
          setDbLeaves(leaveResult.value);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadDoctorProfile();
  }, [identifier]);

  if (isLoading) {
    return (
      <Container>
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading doctor profile...</span>
          </div>
          <p className="mt-3 text-muted">Retrieving physician credentials from hospital database...</p>
        </div>
      </Container>
    );
  }

  // Handle Invalid Doctor Slug
  if (!doctor) {
    const errorBreadcrumbs = [
      { label: 'Home', to: '/' },
      { label: 'Doctors', to: '/doctors' },
      { label: 'Doctor Not Found' },
    ];

    return (
      <Container>
        <PageHeader
          title="Doctor Not Found"
          description="The requested medical specialist profile could not be located in our directory."
          breadcrumbs={errorBreadcrumbs}
        />
        <div className="py-4">
          <EmptyState
            title="Doctor Record Not Found"
            message={`We could not locate any physician profile corresponding to "${identifier}". The specialist may have relocated or the address may be typed incorrectly.`}
            action={
              <Link to="/doctors">
                <Button variant="primary" size="md">
                  Return to Doctor Directory
                </Button>
              </Link>
            }
          />
        </div>
      </Container>
    );
  }

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Doctors', to: '/doctors' },
    { label: doctor.name },
  ];

  const deptSlug = doctor.departmentId || doctor.departmentSlug || doctor.department?.slug || doctor.department?.id || '';
  const deptName = doctor.departmentName || doctor.department?.name || doctor.department || 'Clinical Care';
  const qualifications = Array.isArray(doctor.qualification)
    ? doctor.qualification
    : [doctor.credentials || doctor.qualification].filter(Boolean);
  const isActive = doctor.is_active !== false && String(doctor.status).toLowerCase() !== 'inactive';
  const doctorIdentifier = doctor.slug || doctor.id || identifier;

  // Authoritative weekly schedules from PostgreSQL
  const activeSchedules = dbSchedules.filter((s) => s.is_working_day && s.is_active);
  const workingDaysList = activeSchedules.length > 0
    ? activeSchedules.map((s) => s.day_of_week)
    : (doctor.schedule?.workingDays || []);
  const workingHoursText = activeSchedules.length > 0 && activeSchedules[0].start_time
    ? `${formatTime12h(activeSchedules[0].start_time)} - ${formatTime12h(activeSchedules[0].end_time)}`
    : (doctor.schedule?.workingHours || '09:00 AM - 01:00 PM');
  
  // Format midday breaks cleanly
  const rawBreaks = activeSchedules.flatMap((s) => s.breaks || []);
  const breaksText = rawBreaks.length > 0
    ? rawBreaks
        .map((b) => (typeof b === 'object' && b.start_time ? `${formatTime12h(b.start_time)} - ${formatTime12h(b.end_time)}` : (typeof b === 'object' && b.start ? `${b.start} - ${b.end}` : String(b))))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ')
    : (Array.isArray(doctor.schedule?.breaks) && doctor.schedule.breaks.length > 0
        ? doctor.schedule.breaks.map((b) => (typeof b === 'object' && b.start ? `${b.start} - ${b.end}` : String(b))).join(', ')
        : 'No scheduled midday break');

  // Authoritative leaves from PostgreSQL
  const activeLeaves = dbLeaves.length > 0
    ? dbLeaves.filter((l) => l.is_active !== false).map((l) => ({ date: l.start_date, reason: l.reason }))
    : (Array.isArray(doctor.leave) ? doctor.leave : []);
  const hasLeave = activeLeaves.length > 0;

  return (
    <div className="doctor-detail-page">
      <Container>
        {/* ====================================================================
            1. Page Header & Actions
            ==================================================================== */}
        <PageHeader
          title={doctor.name}
          description={`${doctor.specialty} — ${deptName}`}
          breadcrumbs={breadcrumbs}
        >
          <div className="d-flex flex-wrap gap-2">
            {isActive ? (
              <Link to={`/appointments/book?doctor=${doctorIdentifier}`}>
                <Button variant="secondary" size="md">
                  Book Consultation
                </Button>
              </Link>
            ) : (
              <span className="badge bg-secondary d-flex align-items-center px-3 py-2 text-white">
                Inactive / Not Accepting Appointments
              </span>
            )}
            <Link to={`/doctors/${doctorIdentifier}/availability`}>
              <Button variant="outline" size="md">
                Check OPD Schedule
              </Button>
            </Link>
          </div>
        </PageHeader>

        {/* Server notification if API failed */}
        {apiError && (
          <div className="alert alert-warning py-2 px-3 mb-4 small d-flex justify-content-between align-items-center" role="alert">
            <span>{apiError}</span>
            <button type="button" className="btn btn-sm btn-outline-dark ms-2" onClick={loadDoctorProfile}>
              Retry
            </button>
          </div>
        )}

        <div className="row g-4 mb-5">
          {/* ==================================================================
              2. Left Sidebar: Identity, Affiliation & Consultation Summary
              ================================================================== */}
          <div className="col-12 col-lg-4">
            {/* Doctor Identity Card */}
            <div className="doctor-profile-hero mb-4">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="doctor-profile-avatar-lg" aria-hidden="true">
                  {doctor.photo ? (
                    <img src={doctor.photo} alt={doctor.name} />
                  ) : (
                    <span>{doctor.initials || 'DR'}</span>
                  )}
                </div>
                <div>
                  <h2 className="h5 fw-bold text-dark mb-1">{doctor.name}</h2>
                  <div className="small fw-semibold text-primary">{doctor.specialty}</div>
                  <div className="mt-1">
                    <span
                      className={`hospital-badge ${
                        isActive ? 'hospital-badge-confirmed' : 'hospital-badge-pending'
                      }`}
                    >
                      {isActive ? 'Active Attending Faculty' : 'On Leave / Sabbatical'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-top border-light pt-3 small">
                <div className="mb-2">
                  <span className="fw-semibold text-dark">Clinical Experience: </span>
                  <span className="text-muted">{doctor.experience} years</span>
                </div>
                <div className="mb-2">
                  <span className="fw-semibold text-dark">Affiliated Department: </span>
                  <br />
                  <Link
                    to={`/departments/${deptSlug}`}
                    className="text-primary text-decoration-none fw-semibold"
                  >
                    {deptName} &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Consultation Details Card */}
            <div className="hospital-card p-4 mb-4 bg-white">
              <h3 className="h6 fw-bold text-dark mb-3 border-bottom pb-2">
                Outpatient Consultation Details
              </h3>
              <div className="small mb-2">
                <span className="fw-semibold text-dark">Consultation Type: </span>
                <span className="text-muted">{doctor.consultation?.type || 'In-person'}</span>
              </div>
              <div className="small mb-2">
                <span className="fw-semibold text-dark">Slot Duration: </span>
                <span className="text-muted">{doctor.consultation?.duration || '30 minutes'}</span>
              </div>
              <div className="small mb-3">
                <span className="fw-semibold text-dark">OPD Location: </span>
                <span className="text-muted">{doctor.consultation?.location || 'Clinical OPD'}</span>
              </div>

              <div className="pt-2 border-top">
                <Link
                  to={`/doctors/${doctorIdentifier}/availability`}
                  className="hospital-btn hospital-btn-outline hospital-btn-sm w-100 text-center text-decoration-none"
                >
                  View Weekly Time Slots
                </Link>
              </div>
            </div>

            {/* Department Quick Link Card */}
            <div className="hospital-card p-4 bg-white">
              <h3 className="h6 fw-bold text-dark mb-2">
                Division of {deptName}
              </h3>
              <p className="small text-muted mb-3">
                Learn more about our diagnostic protocols, clinical technologies,
                and comprehensive medical services available within this department.
              </p>
              <Link
                to={`/departments/${deptSlug}`}
                className="hospital-btn hospital-btn-secondary hospital-btn-sm w-100 text-center text-decoration-none"
              >
                View Department Overview
              </Link>
            </div>
          </div>

          {/* ==================================================================
              3. Right Main Panel: Bio, Qualifications, Expertise & Schedule
              ================================================================== */}
          <div className="col-12 col-lg-8">
            {/* Professional Biography */}
            <section className="hospital-card p-4 mb-4 bg-white" aria-labelledby="bio-heading">
              <h3 id="bio-heading" className="h5 fw-bold text-primary mb-3">
                Professional Biography
              </h3>
              <p className="hospital-body text-dark mb-0 leading-relaxed">
                {doctor.bio}
              </p>
            </section>

            {/* Academic & Professional Qualifications */}
            <section className="hospital-card p-4 mb-4 bg-white" aria-labelledby="qual-heading">
              <h3 id="qual-heading" className="h5 fw-bold text-primary mb-3">
                Qualifications & Medical Credentials
              </h3>
              <ul className="list-unstyled mb-0">
                {qualifications.map((qual, index) => (
                  <li
                    key={index}
                    className="py-2 border-bottom border-light d-flex align-items-center gap-2 small"
                  >
                    <span className="badge bg-secondary text-white">{index + 1}</span>
                    <span className="fw-semibold text-dark">{qual}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Areas of Clinical Expertise */}
            <section className="hospital-card p-4 mb-4 bg-white" aria-labelledby="expertise-heading">
              <h3 id="expertise-heading" className="h5 fw-bold text-primary mb-3">
                Areas of Clinical Expertise
              </h3>
              <div>
                {(doctor.expertise || []).map((exp, idx) => (
                  <span
                    key={idx}
                    className="doctor-expertise-tag p-2 px-3 fs-6"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </section>

            {/* Outpatient Working Schedule */}
            <section className="hospital-card p-4 mb-4 bg-white" aria-labelledby="schedule-heading">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 id="schedule-heading" className="h5 fw-bold text-primary mb-0">
                  Outpatient (OPD) Working Schedule
                </h3>
                <Link
                  to={`/doctors/${doctorIdentifier}/availability`}
                  className="small text-primary fw-semibold text-decoration-none"
                >
                  Inspect Open Slots &rarr;
                </Link>
              </div>

              <div className="table-responsive border border-light rounded">
                <table className="dept-schedule-table table table-hover mb-0">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '40%' }}>Consultation Parameter</th>
                      <th scope="col" style={{ width: '60%' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="fw-semibold text-dark">Working Days</td>
                      <td>
                        {workingDaysList.length > 0
                          ? workingDaysList.join(', ')
                          : 'No regular OPD sessions currently scheduled'}
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold text-dark">OPD Consultation Hours</td>
                      <td>{workingHoursText}</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold text-dark">Daily Clinical Breaks</td>
                      <td>{breaksText}</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold text-dark">Consultation Location</td>
                      <td>{doctor.consultation?.location || 'Clinical Consultation Suite'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Leave & Unavailability Notices */}
            <section className="hospital-card p-4 mb-4 bg-white" aria-labelledby="leave-heading">
              <h3 id="leave-heading" className="h5 fw-bold text-primary mb-3">
                Leave & Unavailability Notices
              </h3>

              {!isActive ? (
                <div className="doctor-leave-alert">
                  <div className="fw-bold mb-1">Physician On Academic Sabbatical / Leave</div>
                  <p className="mb-0 small">
                    This specialist is temporarily unavailable for regular outpatient clinics.
                    For urgent medical guidance, please consult with another attending faculty
                    member in the {deptName} department.
                  </p>
                </div>
              ) : hasLeave ? (
                <div className="d-flex flex-column gap-2">
                  {activeLeaves.map((l, index) => (
                    <div key={index} className="doctor-leave-alert d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Scheduled Leave Date:</strong> {l.date}
                        <div className="small mt-1">Reason: {l.reason}</div>
                      </div>
                      <span className="hospital-badge hospital-badge-cancelled">
                        Clinic Suspended
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-light border border-light rounded small text-muted">
                  No upcoming planned leaves on institutional record. Standard outpatient clinic
                  roster remains fully active.
                </div>
              )}
            </section>

            {/* Appointment Booking Call-To-Action */}
            <div className="hospital-card p-4 bg-light border border-primary-subtle d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
              <div>
                <h4 className="h6 fw-bold text-dark mb-1">
                  Ready to Schedule a Consultation?
                </h4>
                <p className="small text-muted mb-0">
                  Select an available date and time slot with {doctor.name}.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link to={`/appointments/book?doctor=${doctorIdentifier}`}>
                  <Button variant="secondary" size="md">
                    Book Appointment Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default DoctorDetailPage;
