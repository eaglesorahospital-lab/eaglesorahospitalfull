import React, { useState, useMemo } from 'react';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import DepartmentCard from '../../components/departments/DepartmentCard';
import EmptyState from '../../components/common/EmptyState';
import SEO from '../../components/common/SEO';
import { DEMO_DEPARTMENTS } from '../../data/hospitalData';
import { Search, X, Building2, Filter } from 'lucide-react';

/**
 * Hospital Platform — Clinical Departments Directory
 * Full department discovery interface with Neumorphic styling.
 */
export function DepartmentsPage() {
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Clinical Departments' },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');

  const specialtyCategories = useMemo(() => {
    const specialties = new Set(DEMO_DEPARTMENTS.map((d) => d.specialty));
    return ['ALL', ...Array.from(specialties)];
  }, []);

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
    <div className="departments-page py-4">
      <SEO
        title="Hospital Departments | EgleSora Hospital"
        description="Explore clinical departments at EgleSora Hospital, including Cardiology, Neurology, Orthopaedics, Oncology, Paediatrics, and 24/7 Emergency Care."
        canonicalUrl="/departments"
      />
      <Container>
        <PageHeader
          title="Clinical Departments & Specialties"
          description="Explore specialized medical disciplines, outpatient consultation timings, diagnostic capabilities, and consultant physician rosters."
          breadcrumbs={breadcrumbs}
        />

        {/* Introduction Panel */}
        <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
          <h2 className="h5 fw-bold text-primary mb-2 d-flex align-items-center gap-2">
            <Building2 size={20} />
            <span>Outpatient & Inpatient Clinical Services</span>
          </h2>
          <p className="hospital-body mb-0 text-muted">
            Our medical center encompasses acute inpatient divisions, diagnostic laboratories,
            and dedicated outpatient clinics. Select a clinical department to view consultation
            schedules, specialized medical procedures, and attending consultant physicians.
          </p>
        </div>

        {/* Search & Category Filter Control Bar */}
        <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
          <div className="row g-3 align-items-center">
            {/* Search Input Column */}
            <div className="col-12 col-md-6 col-lg-5">
              <label htmlFor="dept-search" className="hospital-form-label mb-1">
                Search Departments or Specialties
              </label>
              <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-2">
                <span className="text-muted ps-2">
                  <Search size={16} />
                </span>
                <input
                  id="dept-search"
                  type="text"
                  className="form-control bg-transparent border-0 shadow-none ps-0"
                  placeholder="e.g. Cardiology, Bone, Skin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search departments by name or clinical keywords"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-muted p-1 me-1"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search input"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Specialty Category Selector Column */}
            <div className="col-12 col-md-6 col-lg-7">
              <label htmlFor="dept-specialty-select" className="hospital-form-label mb-1 d-block">
                Filter by Specialty
              </label>

              {/* Mobile Dropdown View */}
              <div className="d-md-none neu-inset rounded-3 p-1">
                <select
                  id="dept-specialty-select"
                  className="form-select bg-transparent border-0 shadow-none"
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
              <div className="d-none d-md-flex flex-wrap gap-2">
                {specialtyCategories.map((spec) => {
                  const isActive = selectedSpecialty === spec;
                  const label =
                    spec === 'ALL'
                      ? `All (${DEMO_DEPARTMENTS.length})`
                      : spec;

                  return (
                    <button
                      key={spec}
                      type="button"
                      className={`neu-btn neu-btn-sm py-1 px-3 ${
                        isActive ? 'neu-btn-primary' : 'neu-btn-secondary'
                      }`}
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
              className="neu-btn neu-btn-outline neu-btn-sm py-1 px-2"
              onClick={handleResetFilters}
            >
              Reset filters
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
                <button type="button" className="neu-btn neu-btn-primary" onClick={handleResetFilters}>
                  Clear Search & View All Departments
                </button>
              }
            />
          </div>
        )}
      </Container>
    </div>
  );
}

export default DepartmentsPage;
