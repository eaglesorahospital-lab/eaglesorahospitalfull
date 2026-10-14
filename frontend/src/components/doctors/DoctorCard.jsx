import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Calendar, Clock, MapPin, Award, ChevronRight } from 'lucide-react';

/**
 * Hospital Platform — Doctor Directory Card
 * Soft UI / Neumorphism medical consultant card.
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
    <article className="doctor-directory-card neu-card p-4 rounded-4 h-100 d-flex flex-column" aria-label={`Doctor profile for ${doctor.name}`}>
      {/* Header: Avatar, Identity & Status */}
      <div className="doctor-card-header d-flex align-items-start gap-3 mb-3">
        <div className="doctor-avatar-box neu-inset flex-shrink-0" aria-hidden="true">
          {photoUrl ? (
            <img src={photoUrl} alt={doctor.name} />
          ) : (
            <span className="fw-bold text-primary">{doctor.initials || 'DR'}</span>
          )}
        </div>

        <div className="doctor-identity flex-grow-1 min-w-0">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
            <span
              className={`neu-badge ${
                isActive ? 'neu-badge-success' : 'neu-badge-warning'
              }`}
            >
              {isActive ? 'Active Consultant' : 'On Leave'}
            </span>
          </div>

          <h3 className="h6 fw-bold mb-1 doctor-name">
            <Link
              to={`/doctors/${slug}`}
              className="text-decoration-none text-body hover-text-primary"
            >
              {doctor.name}
            </Link>
          </h3>

          <div className="small fw-semibold text-primary mb-1 d-flex align-items-center gap-1 doctor-specialty">
            <Stethoscope size={13} className="flex-shrink-0" />
            <span className="doctor-specialty-text">{doctor.specialty}</span>
          </div>

          {qualifications && (
            <div className="doctor-qualifications" title={qualifications}>
              {qualifications}
            </div>
          )}
        </div>
      </div>

      {/* Affiliation & Experience Metadata */}
      <div className="doctor-meta pt-2 border-top mb-3 small flex-grow-1 min-w-0">
        <div className="mb-1 text-secondary d-flex flex-wrap align-items-baseline gap-1 doctor-department">
          <span className="fw-semibold text-body flex-shrink-0">Department: </span>
          {deptId ? (
            <Link
              to={`/departments/${deptId}`}
              className="text-decoration-none text-primary fw-medium doctor-department-link"
            >
              {deptName}
            </Link>
          ) : (
            <span className="doctor-department-text">{deptName}</span>
          )}
        </div>

        {experienceYears !== undefined && (
          <div className="text-muted d-flex align-items-center gap-1 mb-1 doctor-experience">
            <Award size={13} className="text-primary flex-shrink-0" />
            <span><strong className="text-body">{experienceYears}</strong> years clinical exp.</span>
          </div>
        )}

        {doctor.consultation && (
          <div className="text-muted d-flex align-items-start gap-1 mb-1 doctor-consultation-info">
            <Clock size={13} className="text-muted flex-shrink-0" />
            <span>{doctor.consultation.type} ({doctor.consultation.duration})</span>
          </div>
        )}

        {doctor.consultation?.location && (
          <div className="text-muted d-flex align-items-start gap-1 mb-1 doctor-location" title={doctor.consultation.location}>
            <MapPin size={13} className="text-muted flex-shrink-0" />
            <span className="doctor-location-text">{doctor.consultation.location}</span>
          </div>
        )}

        {/* Clinical Expertise Pills */}
        {topExpertise.length > 0 && (
          <div className="mt-2 pt-2 border-top">
            <div className="d-flex flex-wrap gap-1">
              {topExpertise.map((item, idx) => (
                <span key={idx} className="neu-badge neu-badge-neutral" style={{ maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-3 border-top d-flex flex-column gap-2">
        <Link
          to={`/doctors/${slug}`}
          className="neu-btn neu-btn-primary w-100 text-center text-decoration-none d-flex align-items-center justify-content-center gap-1"
        >
          <span>View Profile</span>
          <ChevronRight size={14} />
        </Link>
        <Link
          to={`/doctors/${slug}/availability`}
          className="neu-btn neu-btn-outline w-100 text-center text-decoration-none d-flex align-items-center justify-content-center gap-1"
        >
          <Calendar size={14} />
          <span>Check OPD Schedule</span>
        </Link>
      </div>
    </article>
  );
}

export default DoctorCard;
