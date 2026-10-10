import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Hospital Platform — Doctor Directory Card (Phase 4)
 * Professional presentation of medical consultant credentials, affiliated clinical division,
 * areas of expertise, and OPD consultation locations.
 */
export function DoctorCard({ doctor }) {
  if (!doctor) return null;

  const slug = doctor.slug || doctor.id;
  const deptId = doctor.departmentId || doctor.departmentSlug;
  const deptName = doctor.departmentName || doctor.department;
  const qualifications = Array.isArray(doctor.qualification)
    ? doctor.qualification.join(', ')
    : (typeof doctor.qualification === 'string' && doctor.qualification
        ? doctor.qualification
        : doctor.credentials || '');
  const experienceYears = doctor.experience ?? doctor.experienceYears;
  const isActive = doctor.is_active !== false && String(doctor.status).toLowerCase() !== 'inactive';
  const topExpertise = Array.isArray(doctor.expertise)
    ? doctor.expertise.slice(0, 3)
    : (typeof doctor.expertise === 'string' && doctor.expertise
        ? doctor.expertise.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3)
        : []);
  const photoUrl = doctor.photo || doctor.photo_url || doctor.image_url || doctor.image || null;

  return (
    <article className="doctor-directory-card" aria-label={`Doctor profile for ${doctor.name}`}>
      {/* Header: Avatar, Identity & Status */}
      <div className="d-flex align-items-start gap-3 mb-3">
        <div className="doctor-avatar-box" aria-hidden="true">
          {photoUrl ? (
            <img src={photoUrl} alt={doctor.name} />
          ) : (
            <span>{doctor.initials || 'DR'}</span>
          )}
        </div>

        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
            <span
              className={`hospital-badge ${
                isActive ? 'hospital-badge-confirmed' : 'hospital-badge-pending'
              }`}
            >
              {isActive ? 'Active Consultant' : 'On Leave / Inactive'}
            </span>
          </div>

          <h3 className="h6 fw-bold mb-1 text-dark">
            <Link
              to={`/doctors/${slug}`}
              className="text-decoration-none text-dark"
            >
              {doctor.name}
            </Link>
          </h3>

          <div className="small fw-semibold text-primary mb-1">
            {doctor.specialty}
          </div>

          {qualifications && (
            <div className="small text-muted text-truncate" title={qualifications}>
              {qualifications}
            </div>
          )}
        </div>
      </div>

      {/* Affiliation & Experience Metadata */}
      <div className="pt-2 border-top border-light mb-3 small">
        <div className="mb-1 text-secondary">
          <span className="fw-semibold text-dark">Department: </span>
          {deptId ? (
            <Link
              to={`/departments/${deptId}`}
              className="text-decoration-none text-secondary"
            >
              {deptName}
            </Link>
          ) : (
            <span>{deptName}</span>
          )}
        </div>

        {experienceYears !== undefined && (
          <div className="text-muted">
            <span className="fw-semibold text-dark">Clinical Experience: </span>
            {experienceYears} years
          </div>
        )}

        {doctor.consultation && (
          <div className="text-muted mt-1">
            <span className="fw-semibold text-dark">Consultation: </span>
            {doctor.consultation.type} ({doctor.consultation.duration})
          </div>
        )}

        {doctor.consultation?.location && (
          <div className="text-muted mt-1 text-truncate" title={doctor.consultation.location}>
            <span className="fw-semibold text-dark">Location: </span>
            {doctor.consultation.location}
          </div>
        )}
      </div>

      {/* Clinical Expertise Pills */}
      {topExpertise.length > 0 && (
        <div className="mb-3">
          <div className="small fw-semibold text-dark mb-1">Key Focus Areas:</div>
          <div>
            {topExpertise.map((item, idx) => (
              <span key={idx} className="doctor-expertise-tag">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto pt-3 border-top border-light d-flex flex-column gap-2">
        <Link
          to={`/doctors/${slug}`}
          className="hospital-btn hospital-btn-primary hospital-btn-sm text-center text-decoration-none"
        >
          View Doctor Profile
        </Link>
        <Link
          to={`/doctors/${slug}/availability`}
          className="hospital-btn hospital-btn-outline hospital-btn-sm text-center text-decoration-none"
        >
          Check OPD Schedule
        </Link>
      </div>
    </article>
  );
}

export default DoctorCard;
