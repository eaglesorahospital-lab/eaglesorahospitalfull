import React, { useState, useMemo } from 'react';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import DepartmentCard from '../../components/departments/DepartmentCard';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { DEMO_DEPARTMENTS } from '../../data/hospitalData';

/**
 * Hospital Platform — Clinical Departments Directory (Phase 3)
 * Full department discovery interface with client-side real-time search,
 * specialty category filtering, and accessible state management.
 */
export function DepartmentsPage() {
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Clinical Departments' },
  ];

  // Search and filter states (Client-side local mock data)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');

  // Extract unique specialties for filter options
  const specialtyCategories = useMemo(() => {
    const specialties = new Set(DEMO_DEPARTMENTS.map((d) => d.specialty));
    return ['ALL', ...Array.from(specialties)];
  }, []);

  // Filter departments based on search query and category
  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return DEMO_DEPARTMENTS.filter((dept) => {
      const matchesCategory =
        selectedSpecialty === 'ALL' || dept.specialty === selectedSpecialty;

      if (!matchesCategory) return false;
      if (!query) return true;

      const nameMatch = dept.name.toLowerCase().includes(query);
      const specialtyMatch = dept.specialty.toLowerCase().includes(query);
      const shortDescMatch = dept.shortDescription.toLowerCase().includes(query);
      const fullDescMatch = dept.fullDescription
        ? dept.fullDescription.toLowerCase().includes(query)
        : false;

      return nameMatch || specialtyMatch || shortDescMatch || fullDescMatch;
    });
  }, [searchQuery, selectedSpecialty]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('ALL');
  };

  return (
    <div className="departments-page">
      <Container>
        <PageHeader
          title="Clinical Departments & Specialties"
          description="Explore specialized medical disciplines, outpatient consultation timings, diagnostic capabilities, and consultant physician rosters."
          breadcrumbs={breadcrumbs}
        />

        {/* Introduction Panel */}
        <div className="hospital-card p-4 mb-4 bg-white">
          <h2 className="h5 fw-bold text-primary mb-2">
            Outpatient & Inpatient Clinical Services
          </h2>
          <p className="hospital-body mb-0 text-muted">
            Our medical center encompasses acute inpatient divisions, diagnostic laboratories,
            and dedicated outpatient clinics. Select a clinical department to view consultation
            schedules, specialized medical procedures, and attending consultant physicians.
          </p>
        </div>

        {/* Search & Category Filter Control Bar */}
        <div className="dept-filter-bar">
          <div className="row g-3 align-items-center">
            {/* Search Input Column */}
            <div className="col-12 col-md-6 col-lg-5">
              <label htmlFor="dept-search" className="hospital-form-label mb-1">
                Search Departments or Specialties
              </label>
              <div className="d-flex gap-2">
                <input
                  id="dept-search"
                  type="text"
                  className="hospital-form-control"
                  placeholder="e.g. Cardiology, Stroke, Bone, Joint, Skin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search departments by name or clinical keywords"
                />
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    ariaLabel="Clear search input"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Specialty Category Selector Column */}
            <div className="col-12 col-md-6 col-lg-7">
              <label htmlFor="dept-specialty-select" className="hospital-form-label mb-1 d-block">
                Filter by Specialty
              </label>

              {/* Mobile Dropdown View */}
              <div className="d-md-none">
                <select
                  id="dept-specialty-select"
                  className="hospital-form-control"
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  aria-label="Filter departments by specialty"
                >
                  <option value="ALL">All Departments ({DEMO_DEPARTMENTS.length})</option>
                  {specialtyCategories
                    .filter((s) => s !== 'ALL')
                    .map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                </select>
              </div>

              {/* Desktop Pill Buttons View */}
              <div className="dept-category-pills d-none d-md-flex">
                {specialtyCategories.map((spec) => {
                  const isActive = selectedSpecialty === spec;
                  const label =
                    spec === 'ALL'
                      ? `All Departments (${DEMO_DEPARTMENTS.length})`
                      : spec;

                  return (
                    <button
                      key={spec}
                      type="button"
                      className={`dept-category-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedSpecialty(spec)}
                      aria-pressed={isActive}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Results Counter Bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 px-1">
          <div className="small text-muted">
            Showing <strong>{filteredDepartments.length}</strong> of{' '}
            <strong>{DEMO_DEPARTMENTS.length}</strong> clinical departments
            {selectedSpecialty !== 'ALL' && ` in "${selectedSpecialty}"`}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>

          {(searchQuery || selectedSpecialty !== 'ALL') && (
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none text-secondary p-0"
              onClick={handleResetFilters}
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Department Grid or Empty Result State */}
        {filteredDepartments.length > 0 ? (
          <div className="row g-4 mb-5">
            {filteredDepartments.map((department) => (
              <div key={department.id} className="col-12 col-md-6 col-lg-4">
                <DepartmentCard department={department} />
              </div>
            ))}
          </div>
        ) : (
          <div className="my-5">
            <EmptyState
              title="No Departments Match Your Query"
              message={`No clinical departments were found matching your search "${searchQuery}". Please check spelling or select another specialty filter.`}
              action={
                <Button variant="primary" size="sm" onClick={handleResetFilters}>
                  Clear Search & View All Departments
                </Button>
              }
            />
          </div>
        )}
      </Container>
    </div>
  );
}

export default DepartmentsPage;
