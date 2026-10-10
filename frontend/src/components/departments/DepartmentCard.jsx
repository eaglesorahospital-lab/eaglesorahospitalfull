import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Hospital Platform — Department Card Component (Phase 3)
 * Professional presentation of a clinical department with key outpatient details.
 */
export function DepartmentCard({ department }) {
  if (!department) return null;

  return (
    <article className="dept-card">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span className="dept-card-specialty">{department.specialty}</span>
        {department.services && (
          <span className="small text-muted">
            {department.services.length} Clinical Services
          </span>
        )}
      </div>

      <h3 className="h5 fw-bold text-dark mb-2">
        <Link
          to={`/departments/${department.slug}`}
          className="text-decoration-none text-dark"
        >
          {department.name}
        </Link>
      </h3>

      <p className="small text-muted mb-3 flex-grow-1">
        {department.shortDescription}
      </p>

      <div className="pt-3 border-top border-light mb-3 small">
        <div className="text-secondary fw-semibold">
          OPD Hours: <span className="text-dark fw-normal">{department.opdHours}</span>
        </div>
        {department.contact && (
          <div className="text-muted mt-1">
            Location: {department.contact.location}
          </div>
        )}
      </div>

      <div>
        <Link
          to={`/departments/${department.slug}`}
          className="hospital-btn hospital-btn-outline hospital-btn-sm w-100"
        >
          View Department Details &rarr;
        </Link>
      </div>
    </article>
  );
}

export default DepartmentCard;
