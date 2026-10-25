import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import SEO from '../../components/common/SEO';
import doctorService from '../../services/doctorService';
import scheduleService from '../../services/scheduleService';
import {
  Calendar,
  Clock,
  Award,
  Stethoscope,
  Building2,
  MapPin,
  ChevronRight,
  AlertTriangle,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

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
 * Hospital Platform — Doctor Profile Page
 * Comprehensive specialist profile in Neumorphism / Soft UI design.
 */
export function DoctorDetailPage() {
  const { slug, id } = useParams();
  const identifier = slug || id;

  const [doctor, setDoctor] = useState(null);
  const [dbSchedules, setDbSchedules] = useState([]);
  const [dbLeaves, setDbLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
          setApiError('Unable to load physician profile from server. Please verify connection and retry.');
        } else {
          setDoctor(null);
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

  if (!doctor) {
    const errorBreadcrumbs = [
      { label: 'Home', to: '/' },
      { label: 'Doctors', to: '/doctors' },
      { label: 'Doctor Not Found' },
    ];

    return (
      <Container className="py-4">
        <SEO
          title="Doctor Not Found | EgleSora Hospital"
          description="The requested medical specialist profile could not be located in our directory."
          noIndex={true}
        />
        <PageHeader
          title="Doctor Not Found"
          description="The requested medical specialist profile could not be located in our directory."
          breadcrumbs={errorBreadcrumbs}
        />
        <div className="py-4">
          <EmptyState
            title={apiError ? 'Unable to Retrieve Doctor Profile' : 'Doctor Record Not Found'}
            message={
              apiError ||
              `We could not locate any physician profile corresponding to "${identifier}". The specialist may have relocated or the address may be typed incorrectly.`
            }
            action={
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                {apiError && (
                  <button
                    type="button"
                    className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1"
                    onClick={loadDoctorProfile}
                  >
                    <RefreshCw size={14} />
                    <span>Retry Connection</span>
                  </button>
                )}
                <Link to="/doctors" className="neu-btn neu-btn-outline">
                  Return to Doctor Directory
                </Link>
              </div>
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

  const activeSchedules = dbSchedules.filter((s) => s.is_working_day && s.is_active);
  const workingDaysList = activeSchedules.length > 0
    ? activeSchedules.map((s) => s.day_of_week)
    : (doctor.schedule?.workingDays || []);
  const workingHoursText = activeSchedules.length > 0 && activeSchedules[0].start_time
    ? `${formatTime12h(activeSchedules[0].start_time)} - ${formatTime12h(activeSchedules[0].end_time)}`
    : (doctor.schedule?.workingHours || '09:00 AM - 01:00 PM');
  
  const rawBreaks = activeSchedules.flatMap((s) => s.breaks || []);
  const breaksText = rawBreaks.length > 0
    ? rawBreaks
        .map((b) => (typeof b === 'object' && b.start_time ? `${formatTime12h(b.start_time)} - ${formatTime12h(b.end_time)}` : (typeof b === 'object' && b.start ? `${b.start} - ${b.end}` : String(b))))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ')
    : (Array.isArray(doctor.schedule?.breaks) && doctor.schedule.breaks.length > 0
        ? doctor.schedule.breaks.map((b) => (typeof b === 'object' && b.start ? `${b.start} - ${b.end}` : String(b))).join(', ')
        : 'No scheduled midday break');

  const activeLeaves = dbLeaves.length > 0
    ? dbLeaves.filter((l) => l.is_active !== false).map((l) => ({ date: l.start_date, reason: l.reason }))
    : (Array.isArray(doctor.leave) ? doctor.leave : []);
  const hasLeave = activeLeaves.length > 0;

  return (
    <div className="doctor-detail-page py-4">
      <SEO
        title={`${doctor.name} | ${doctor.specialty} | EgleSora Hospital`}
        description={`Consultation schedule, qualifications, clinical expertise, and OPD suite for ${doctor.name} at EgleSora Hospital.`}
        canonicalUrl={`/doctors/${doctorIdentifier}`}
      />
      <Container>
        {/* 1. Page Header & Actions */}
        <PageHeader
          title={doctor.name}
          description={`${doctor.specialty} — ${deptName}`}
          breadcrumbs={breadcrumbs}
        >
          <div className="d-flex flex-wrap gap-2">
            {isActive ? (
              <Link to={`/appointments/book?doctor=${doctorIdentifier}`} className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1">
                <Calendar size={15} />
                <span>Book Consultation</span>
              </Link>
            ) : (
              <span className="neu-badge neu-badge-neutral d-flex align-items-center px-3 py-2">
                Inactive / Not Accepting Appointments
              </span>
            )}
            <Link to={`/doctors/${doctorIdentifier}/availability`} className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-1">
              <Clock size={15} />
              <span>Check OPD Schedule</span>
            </Link>
          </div>
        </PageHeader>

        {apiError && (
          <div className="neu-raised neu-surface p-3 mb-4 rounded-4 border-start border-4 border-warning d-flex justify-content-between align-items-center" role="alert">
            <span className="text-muted">{apiError}</span>
            <button type="button" className="neu-btn neu-btn-outline neu-btn-sm" onClick={loadDoctorProfile}>
              Retry
            </button>
          </div>
        )}

        <div className="row g-4 mb-5">
          {/* 2. Left Sidebar: Identity, Affiliation & Consultation Summary */}
          <div className="col-12 col-lg-4">
            {/* Doctor Identity Card */}
            <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="doctor-profile-avatar-lg neu-inset flex-shrink-0" aria-hidden="true">
                  {doctor.photo ? (
                    <img
                      src={doctor.photo}
                      alt={`Portrait of ${doctor.name}`}
                      width="80"
                      height="80"
                      loading="lazy"
                    />
                  ) : (
                    <span className="fw-bold text-primary">{doctor.initials || 'DR'}</span>
                  )}
                </div>
                <div>
                  <h2 className="h5 fw-bold text-body mb-1">{doctor.name}</h2>
                  <div className="small fw-semibold text-primary">{doctor.specialty}</div>
                  <div className="mt-1">
                    <span
                      className={`neu-badge ${
                        isActive ? 'neu-badge-success' : 'neu-badge-warning'
                      }`}
                    >
                      {isActive ? 'Active Attending Faculty' : 'On Leave'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-top pt-3 small">
                <div className="mb-2 d-flex align-items-center gap-1 text-muted">
                  <Award size={14} className="text-primary flex-shrink-0" />
                  <span><strong className="text-body">Clinical Experience:</strong> {doctor.experience} years</span>
                </div>
                <div className="mb-2 text-muted">
                  <span className="fw-semibold text-body">Affiliated Department: </span>
                  <Link
                    to={`/departments/${deptSlug}`}
                    className="text-primary text-decoration-none fw-semibold ms-1 d-inline-flex align-items-center gap-1"
                  >
                    <span>{deptName}</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Consultation Details Card */}
            <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
              <h3 className="h6 fw-bold text-body mb-3 border-bottom pb-2">
                Outpatient Consultation Details
              </h3>
              <div className="small mb-2 text-muted">
                <strong className="text-body">Type: </strong>
                <span>{doctor.consultation?.type || 'In-person'}</span>
              </div>
              <div className="small mb-2 text-muted">
                <strong className="text-body">Slot Duration: </strong>
                <span>{doctor.consultation?.duration || '30 minutes'}</span>
              </div>
              <div className="small mb-3 text-muted">
                <strong className="text-body">OPD Location: </strong>
                <span>{doctor.consultation?.location || 'Clinical OPD'}</span>
              </div>

              <div className="pt-2 border-top">
                <Link
                  to={`/doctors/${doctorIdentifier}/availability`}
                  className="neu-btn neu-btn-outline w-100 text-center justify-content-center d-flex align-items-center gap-1"
                >
                  <Clock size={14} />
                  <span>View Weekly Time Slots</span>
                </Link>
              </div>
            </div>

            {/* Department Quick Link Card */}
            <div className="neu-raised neu-surface p-4 rounded-4">
              <h3 className="h6 fw-bold text-body mb-2 d-flex align-items-center gap-1">
                <Building2 size={16} className="text-primary" />
                <span>Division of {deptName}</span>
              </h3>
              <p className="small text-muted mb-3">
                Learn more about our diagnostic protocols, clinical technologies,
                and comprehensive medical services available within this department.
              </p>
              <Link
                to={`/departments/${deptSlug}`}
                className="neu-btn neu-btn-secondary w-100 text-center justify-content-center"
              >
                View Department Overview
              </Link>
            </div>
          </div>

          {/* 3. Right Main Panel: Bio, Qualifications, Expertise & Schedule */}
          <div className="col-12 col-lg-8">
            {/* Professional Biography */}
            <section className="neu-raised neu-surface p-4 rounded-4 mb-4" aria-labelledby="bio-heading">
              <h3 id="bio-heading" className="h5 fw-bold text-primary mb-3">
                Professional Biography
              </h3>
              <p className="hospital-body text-body mb-0" style={{ lineHeight: '1.7' }}>
                {doctor.bio}
              </p>
            </section>

            {/* Qualifications */}
            <section className="neu-raised neu-surface p-4 rounded-4 mb-4" aria-labelledby="qual-heading">
              <h3 id="qual-heading" className="h5 fw-bold text-primary mb-3">
                Qualifications & Medical Credentials
              </h3>
              <ul className="list-unstyled mb-0">
                {qualifications.map((qual, index) => (
                  <li
                    key={index}
                    className="py-2 border-bottom d-flex align-items-center gap-2 small"
                  >
                    <span className="neu-badge neu-badge-primary">{index + 1}</span>
                    <span className="fw-semibold text-body">{qual}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Areas of Clinical Expertise */}
            <section className="neu-raised neu-surface p-4 rounded-4 mb-4" aria-labelledby="expertise-heading">
              <h3 id="expertise-heading" className="h5 fw-bold text-primary mb-3">
                Areas of Clinical Expertise
              </h3>
              <div className="d-flex flex-wrap gap-2">
                {(doctor.expertise || []).map((exp, idx) => (
                  <span
                    key={idx}
                    className="neu-badge neu-badge-neutral p-2 px-3 fs-6"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </section>

            {/* Outpatient Working Schedule */}
            <section className="neu-raised neu-surface p-4 rounded-4 mb-4" aria-labelledby="schedule-heading">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 id="schedule-heading" className="h5 fw-bold text-primary mb-0">
                  Outpatient (OPD) Working Schedule
                </h3>
                <Link
                  to={`/doctors/${doctorIdentifier}/availability`}
                  className="small text-primary fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
                >
                  <span>Inspect Open Slots</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div className="neu-table-container">
                <table className="neu-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '40%' }}>Consultation Parameter</th>
                      <th scope="col" style={{ width: '60%' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="fw-semibold text-body">Working Days</td>
                      <td>
                        {workingDaysList.length > 0
                          ? workingDaysList.join(', ')
                          : 'No regular OPD sessions currently scheduled'}
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-semibold text-body">OPD Consultation Hours</td>
                      <td>{workingHoursText}</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold text-body">Daily Clinical Breaks</td>
                      <td>{breaksText}</td>
                    </tr>
                    <tr>
                      <td className="fw-semibold text-body">Consultation Location</td>
                      <td>{doctor.consultation?.location || 'Clinical Consultation Suite'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Leave & Unavailability Notices */}
            <section className="neu-raised neu-surface p-4 rounded-4 mb-4" aria-labelledby="leave-heading">
              <h3 id="leave-heading" className="h5 fw-bold text-primary mb-3">
                Leave & Unavailability Notices
              </h3>

              {!isActive ? (
                <div className="neu-inset p-3 rounded-3 border-start border-4 border-warning">
                  <div className="fw-bold mb-1 text-warning">Physician On Academic Sabbatical / Leave</div>
                  <p className="mb-0 small text-muted">
                    This specialist is temporarily unavailable for regular outpatient clinics.
                    For urgent medical guidance, please consult with another attending faculty
                    member in the {deptName} department.
                  </p>
                </div>
              ) : hasLeave ? (
                <div className="d-flex flex-column gap-2">
                  {activeLeaves.map((l, index) => (
                    <div key={index} className="neu-inset p-3 rounded-3 d-flex justify-content-between align-items-center">
                      <div>
                        <strong className="text-body">Scheduled Leave:</strong> {l.date}
                        <div className="small text-muted mt-1">Reason: {l.reason}</div>
                      </div>
                      <span className="neu-badge neu-badge-danger">
                        Clinic Suspended
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="neu-inset p-3 rounded-3 small text-muted">
                  No upcoming planned leaves on institutional record. Standard outpatient clinic
                  roster remains fully active.
                </div>
              )}
            </section>

            {/* Appointment Booking Call-To-Action */}
            <div className="neu-raised neu-surface p-4 rounded-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
              <div>
                <h4 className="h6 fw-bold text-body mb-1">
                  Ready to Schedule a Consultation?
                </h4>
                <p className="small text-muted mb-0">
                  Select an available date and time slot with {doctor.name}.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link to={`/appointments/book?doctor=${doctorIdentifier}`} className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1">
                  <Calendar size={15} />
                  <span>Book Appointment Now</span>
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
