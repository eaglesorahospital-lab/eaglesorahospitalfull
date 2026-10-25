import React, { useState, useMemo, useEffect } from 'react';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import DepartmentCard from '../../components/departments/DepartmentCard';
import EmptyState from '../../components/common/EmptyState';
import SEO from '../../components/common/SEO';
import departmentService from '../../services/departmentService';
import { Search, X, Building2, Filter, RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * Hospital Platform — Clinical Departments Directory
 * Full department discovery interface with Neumorphic styling.
 */
export function DepartmentsPage() {
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Clinical Departments' },
  ];

  const [departmentsList, setDepartmentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');

  const fetchDepartments = () => {
    setIsLoading(true);
    setApiError(null);

    let isFinished = false;
    const safetyTimer = setTimeout(() => {
      if (!isFinished) {
        setIsLoading(false);
        setApiError('The departments request timed out. Please click retry to reconnect.');
      }
    }, 15000);

    departmentService
      .getDepartments()
      .then((data) => {
        setDepartmentsList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('Could not load departments:', err);
        setApiError('Unable to load clinical departments from server. Please retry.');
      })
      .finally(() => {
        isFinished = true;
        clearTimeout(safetyTimer);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const specialtyCategories = useMemo(() => {
    const specialties = new Set(departmentsList.map((d) => d.specialty).filter(Boolean));
    return ['ALL', ...Array.from(specialties)];
  }, [departmentsList]);

  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return departmentsList.filter((dept) => {
      const matchesCategory =
        selectedSpecialty === 'ALL' || dept.specialty === selectedSpecialty;

      if (!matchesCategory) return false;
      if (!query) return true;

      const nameMatch = (dept.name || '').toLowerCase().includes(query);
      const specialtyMatch = (dept.specialty || '').toLowerCase().includes(query);
      const shortDescMatch = (dept.shortDescription || '').toLowerCase().includes(query);
      const fullDescMatch = dept.fullDescription
        ? dept.fullDescription.toLowerCase().includes(query)
        : false;

      return nameMatch || specialtyMatch || shortDescMatch || fullDescMatch;
    });
  }, [departmentsList, searchQuery, selectedSpecialty]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('ALL');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedSpecialty !== 'ALL';

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

        {/* API Error Notice Banner */}
        {apiError && departmentsList.length > 0 && (
          <div
            className="neu-raised neu-surface p-3 mb-4 rounded-4 border-start border-4 border-danger d-flex flex-wrap align-items-center justify-content-between gap-2"
            role="alert"
          >
            <div className="d-flex align-items-center gap-2">
              <AlertTriangle size={20} className="text-danger flex-shrink-0" />
              <div>
                <strong className="text-danger">Departments Notice:</strong>{' '}
                <span className="text-muted">{apiError}</span>
              </div>
            </div>
            <button
              type="button"
              className="neu-btn neu-btn-outline neu-btn-sm d-flex align-items-center gap-1"
              onClick={fetchDepartments}
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        )}

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
                  disabled={isLoading}
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
                  disabled={isLoading || specialtyCategories.length <= 1}
                  aria-label="Filter departments by specialty"
                >
                  <option value="ALL">All Departments ({departmentsList.length})</option>
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
                      ? `All (${departmentsList.length})`
                      : spec;

                  return (
                    <button
                      key={spec}
                      type="button"
                      className={`neu-btn neu-btn-sm py-1 px-3 ${
                        isActive ? 'neu-btn-primary' : 'neu-btn-secondary'
                      }`}
                      onClick={() => setSelectedSpecialty(spec)}
                      disabled={isLoading}
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
          <div className="small text-muted" role="status" aria-live="polite">
            {isLoading ? (
              <span>Loading clinical departments...</span>
            ) : (
              <span>
                Showing <strong>{filteredDepartments.length}</strong> of{' '}
                <strong>{departmentsList.length}</strong> clinical departments
                {selectedSpecialty !== 'ALL' && ` in "${selectedSpecialty}"`}
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
            )}
          </div>

          {!isLoading && hasActiveFilters && (
            <button
              type="button"
              className="neu-btn neu-btn-outline neu-btn-sm py-1 px-2"
              onClick={handleResetFilters}
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Department Grid or Loading or Empty Result State */}
        {isLoading ? (
          <div className="py-5 text-center my-4" aria-live="polite">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading departments...</span>
            </div>
            <p className="mt-3 text-muted">Retrieving clinical departments from hospital registry...</p>
          </div>
        ) : apiError && departmentsList.length === 0 ? (
          <div className="my-5">
            <EmptyState
              title="Unable to Retrieve Clinical Departments"
              message={apiError || 'We could not connect to the hospital departments registry. Please check server status and retry.'}
              action={
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  <button
                    type="button"
                    className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1"
                    onClick={fetchDepartments}
                  >
                    <RefreshCw size={14} />
                    <span>Retry Connection</span>
                  </button>
                  <a href="tel:+9102200002222" className="neu-btn neu-btn-outline">
                    Contact Hospital Desk
                  </a>
                </div>
              }
            />
          </div>
        ) : filteredDepartments.length > 0 ? (
          <div className="row g-4 mb-5">
            {filteredDepartments.map((department) => (
              <div key={department.id} className="col-12 col-md-6 col-lg-4">
                <DepartmentCard department={department} />
              </div>
            ))}
          </div>
        ) : departmentsList.length === 0 ? (
          <div className="my-5">
            <EmptyState
              title="Clinical Departments Registry Being Configured"
              message="Hospital clinical divisions, outpatient clinics, and diagnostic centers are currently being registered in the system. Please check back shortly or contact our outpatient registration desk."
              action={
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  <button
                    type="button"
                    className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1"
                    onClick={fetchDepartments}
                  >
                    <RefreshCw size={14} />
                    <span>Refresh Departments</span>
                  </button>
                  <a href="tel:+9102200002222" className="neu-btn neu-btn-outline">
                    Contact Reception Desk
                  </a>
                </div>
              }
            />
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
