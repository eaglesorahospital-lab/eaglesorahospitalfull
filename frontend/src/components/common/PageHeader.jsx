import React from 'react';
import Breadcrumb from './Breadcrumb';

/**
 * Hospital Platform — Page Header Component (Phase 1)
 * Standardizes title, optional subtitle, and breadcrumbs for all inner pages.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  children,
  className = '',
}) {
  return (
    <header className={`hospital-page-header ${className}`.trim()}>
      {breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="hospital-page-title mb-1 text-break">{title}</h1>
          {description && (
            <p className="hospital-text-supporting mb-0 text-break">{description}</p>
          )}
        </div>
        {children && <div className="header-actions">{children}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
