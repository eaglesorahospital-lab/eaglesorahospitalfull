import React from 'react';

/**
 * Hospital Platform — Admin Filter & Search Bar (Phase 8)
 * Standardized search and filter layout for administrative tables and listings.
 */
export function AdminFilterBar({
  searchPlaceholder = 'Search records...',
  searchValue = '',
  onSearchChange,
  children,
  onClear,
  hasActiveFilters = false,
}) {
  return (
    <div className="admin-filter-bar mb-4">
      <div className="row g-3 align-items-center">
        {onSearchChange && (
          <div className="col-12 col-md-4">
            <div className="position-relative">
              <input
                type="text"
                className="hospital-form-control"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label={searchPlaceholder}
              />
            </div>
          </div>
        )}

        {children}

        {hasActiveFilters && onClear && (
          <div className="col-auto ms-auto">
            <button
              type="button"
              className="hospital-btn hospital-btn-outline hospital-btn-sm"
              onClick={onClear}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminFilterBar;
