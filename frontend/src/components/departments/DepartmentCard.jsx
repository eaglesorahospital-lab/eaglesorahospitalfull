import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Clock, MapPin, ChevronRight, Activity } from 'lucide-react';

/**
 * Hospital Platform — Department Card Component
 * Soft UI / Neumorphism clinical department card.
 */
export function DepartmentCard({ department }) {
  if (!department) return null;

  return (
    <article className="neu-raised neu-surface p-4 rounded-4 h-100 d-flex flex-column transition-all hover-lift">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span className="neu-badge neu-badge-primary">{department.specialty}</span>
        {department.services && (
          <span className="small text-muted d-inline-flex align-items-center gap-1">
            <Activity size={12} className="text-primary" />
            {department.services.length} Services
          </span>
        )}
      </div>

      <h3 className="h5 fw-bold text-body mb-2 mt-1">
        <Link
          to={`/departments/${department.slug}`}
          className="text-decoration-none text-body hover-text-primary"
        >
          {department.name}
        </Link>
      </h3>

      <p className="small text-muted mb-3 flex-grow-1">
        {department.shortDescription}
      </p>

      <div className="pt-3 border-top mb-3 small">
        <div className="text-muted d-flex align-items-center gap-1 mb-1">
          <Clock size={13} className="text-primary flex-shrink-0" />
          <span><strong className="text-body">OPD Hours:</strong> {department.opdHours}</span>
        </div>
        {department.contact && (
          <div className="text-muted d-flex align-items-center gap-1">
            <MapPin size={13} className="text-primary flex-shrink-0" />
            <span>{department.contact.location}</span>
          </div>
        )}
      </div>

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
