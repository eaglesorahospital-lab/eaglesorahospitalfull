import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

/**
 * Hospital Platform — Admin Filter & Search Bar
 * Neumorphic search and filter layout for administrative tables and listings.
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
      <div className="row g-3 g-md-4 align-items-center">
        {onSearchChange && (
          <div className="col-12 col-md-4">
            <div className="position-relative">
              <input
                type="text"
                className="neu-input ps-5"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label={searchPlaceholder}
                style={{ width: '100%' }}
              />
              <Search 
                size={17} 
                className="position-absolute" 
                style={{ 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--hospital-text-muted)',
                  pointerEvents: 'none'
                }} 
              />
            </div>
          </div>
        )}

        {children}

        {hasActiveFilters && onClear && (
          <div className="col-auto ms-auto">
            <button
              type="button"
              className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-1"
              onClick={onClear}
            >
              <RotateCcw size={14} />
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminFilterBar;
