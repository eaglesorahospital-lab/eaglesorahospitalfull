import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Clock, MapPin, ChevronRight, Activity, Users } from 'lucide-react';

/**
 * Hospital Platform — Department Card Component
 * Soft UI / Neumorphism clinical department card.
 */
export function DepartmentCard({ department }) {
  if (!department) return null;

  const doctorCount =
    department.doctorCount !== undefined && department.doctorCount !== null
      ? department.doctorCount
      : department.doctor_count !== undefined && department.doctor_count !== null
      ? department.doctor_count
      : null;

  const servicesCount = Array.isArray(department.services) ? department.services.length : 0;
  const locationText = department.contact?.location || department.location || 'Hospital Campus';
  const opdTiming = department.opdHours || department.opd_hours || 'Mon - Sat: 09:00 AM - 04:00 PM';

  return (
    <article className="neu-raised neu-surface p-4 rounded-4 h-100 d-flex flex-column transition-all hover-lift">
      {/* Badge header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-1 mb-2">
        <span className="neu-badge neu-badge-primary">{department.specialty}</span>
        <div className="d-flex align-items-center gap-2">
          {doctorCount !== null && doctorCount > 0 && (
            <span className="small text-muted d-inline-flex align-items-center gap-1" title="Attending Specialists">
              <Users size={13} className="text-primary" />
              <span>{doctorCount} Specialists</span>
            </span>
          )}
          {servicesCount > 0 && (
            <span className="small text-muted d-inline-flex align-items-center gap-1" title="Services provided">
              <Activity size={12} className="text-primary" />
              <span>{servicesCount} Services</span>
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="h5 fw-bold text-body mb-2 mt-1">
        <Link
          to={`/departments/${department.slug}`}
          className="text-decoration-none text-body hover-text-primary"
        >
          {department.name}
        </Link>
      </h3>

      {/* Description */}
      <p className="small text-muted mb-3 flex-grow-1" style={{ lineHeight: 1.5 }}>
        {department.shortDescription || department.short_description || department.fullDescription}
      </p>

      {/* Location & Timings */}
      <div className="pt-3 border-top mb-3 small">
        <div className="text-muted d-flex align-items-center gap-1 mb-1">
          <Clock size={13} className="text-primary flex-shrink-0" />
          <span>
            <strong className="text-body">OPD Hours:</strong> {opdTiming}
          </span>
        </div>
        {locationText && (
          <div className="text-muted d-flex align-items-center gap-1">
            <MapPin size={13} className="text-primary flex-shrink-0" />
            <span>{locationText}</span>
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="mt-auto">
        <Link
          to={`/departments/${department.slug}`}
          className="neu-btn neu-btn-outline w-100 text-center justify-content-center d-flex align-items-center gap-1"
        >
          <span>View Department Details</span>
          <ChevronRight size={14} />
        </Link>
      </div>
    </article>
  );
}

export default DepartmentCard;
