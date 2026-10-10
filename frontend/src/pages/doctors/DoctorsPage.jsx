import React, { useState, useMemo, useEffect } from 'react';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import DoctorCard from '../../components/doctors/DoctorCard';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';

/**
 * Hospital Platform — Doctor Discovery & Directory (Phase 4 & Persistence Fix)
 * Public-facing directory for searching consultant physicians, surgeons, and specialists
 * backed authoritatively by PostgreSQL database and Django REST Framework.
 * Strictly excludes inactive doctors from public discovery per hospital business rules.
 */
export function DoctorsPage() {
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Doctors Directory' },
  ];

  // Authoritative data state synced with PostgreSQL
  const [doctorsList, setDoctorsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Client-side search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  const fetchDirectory = () => {
    setIsLoading(true);
    setApiError(null);

    const doctorsPromise = doctorService
      .getDoctors({ is_active: true, page_size: 100 })
      .then((res) => {
        const list = res?.results || [];
        // Strictly exclude inactive doctors from public view
        const activeOnly = list.filter(
          (d) => d.is_active !== false && String(d.status).toLowerCase() !== 'inactive'
        );
        setDoctorsList(activeOnly);
      });

    const departmentsPromise = departmentService
      .getDepartments()
      .then((res) => {
        if (res && res.length > 0) {
          setDepartmentsList(res);
        }
      })
      .catch((err) => {
        console.warn('Could not load departments from API:', err);
      });

    Promise.allSettled([doctorsPromise, departmentsPromise])
      .then(([docResult]) => {
        if (docResult.status === 'rejected') {
          console.error('Doctor API error:', docResult.reason);
          setApiError(docResult.reason?.message || 'Failed to load doctors from backend API.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  // Extract unique specialties from authoritative doctors list
  const specialties = useMemo(() => {
    const list = new Set(doctorsList.map((d) => d.specialty).filter(Boolean));
    return ['ALL', ...Array.from(list)];
  }, [doctorsList]);

  // Filter doctors based on criteria
  const filteredDoctors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return doctorsList.filter((doctor) => {
      // 1. Ensure active only
      if (doctor.is_active === false || String(doctor.status).toLowerCase() === 'inactive') {
        return false;
      }

      // 2. Specialty Filter
      if (selectedSpecialty !== 'ALL' && doctor.specialty !== selectedSpecialty) {
        return false;
      }

      // 3. Department Filter
      if (selectedDepartment !== 'ALL') {
        const deptId = String(doctor.departmentId || doctor.departmentSlug || doctor.department || '');
        if (deptId !== String(selectedDepartment)) return false;
      }

      // 4. Text Search (Doctor name, specialty, department, qualification, expertise)
      if (!query) return true;

      const nameMatch = (doctor.name || '').toLowerCase().includes(query);
      const specialtyMatch = (doctor.specialty || '').toLowerCase().includes(query);
      const deptMatch = (doctor.departmentName || doctor.department || '')
        .toLowerCase()
        .includes(query);

      const qualList = Array.isArray(doctor.qualification)
        ? doctor.qualification
        : (typeof doctor.qualification === 'string' && doctor.qualification ? [doctor.qualification] : []);
      const qualMatch =
        qualList.some((q) => q.toLowerCase().includes(query)) ||
        (doctor.credentials || '').toLowerCase().includes(query);

      const expList = Array.isArray(doctor.expertise)
        ? doctor.expertise
        : (typeof doctor.expertise === 'string' && doctor.expertise ? [doctor.expertise] : []);
      const expMatch = expList.some((e) => e.toLowerCase().includes(query));

      return nameMatch || specialtyMatch || deptMatch || qualMatch || expMatch;
    });
  }, [doctorsList, searchQuery, selectedSpecialty, selectedDepartment]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('ALL');
    setSelectedDepartment('ALL');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSpecialty !== 'ALL' ||
    selectedDepartment !== 'ALL';

  return (
    <div className="doctors-directory-page">
      <Container>
        <PageHeader
          title="Find a Medical Specialist"
          description="Search attending consultant physicians, surgeons, and clinical specialists across all outpatient hospital divisions."
          breadcrumbs={breadcrumbs}
        />

        {/* Visible API Error Banner with Retry */}
        {apiError && (
          <div
            className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border border-danger-subtle"
            role="alert"
          >
            <div className="d-flex align-items-center gap-2 mb-2 mb-sm-0">
              <span className="fs-5" aria-hidden="true">&#9888;</span>
              <div>
                <strong>Medical Directory API Unavailable:</strong> {apiError}
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={fetchDirectory}>
              Retry Connection
            </Button>
          </div>
        )}

        {/* Introduction Panel */}
        <div className="hospital-card p-4 mb-4 bg-white">
          <h2 className="h5 fw-bold text-primary mb-2">
            Attending Medical Faculty & Consultants
          </h2>
          <p className="hospital-body mb-0 text-muted">
            All attending specialists at EgleSora Hospital hold recognized post-graduate
            qualifications and adhere to rigorous evidence-based clinical protocols.
            Filter by clinical discipline or outpatient department to inspect credentials,
            consultation hours, and schedule availability.
          </p>
        </div>

        {/* Search & Filter Control Bar */}
        <section
          className="hospital-card p-4 mb-4 bg-white"
          aria-label="Doctor search and filter controls"
        >
          <div className="row g-3">
            {/* Search Input */}
            <div className="col-12 col-lg-5">
              <label htmlFor="doctor-search-input" className="hospital-form-label mb-1">
                Search Doctor or Expertise
              </label>
              <div className="d-flex gap-2">
                <input
                  id="doctor-search-input"
                  type="text"
                  className="hospital-form-control"
                  placeholder="Search by doctor name, specialty, qualification, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search doctors by name, specialty, or clinical focus"
                />
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search input"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Specialty Filter Dropdown */}
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="specialty-filter" className="hospital-form-label mb-1">
                Filter by Specialty
              </label>
              <select
                id="specialty-filter"
                className="hospital-form-select"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec === 'ALL' ? 'All Specialties' : spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter Dropdown */}
            <div className="col-12 col-sm-6 col-lg-4">
              <label htmlFor="dept-filter" className="hospital-form-label mb-1">
                Department
              </label>
              <select
                id="dept-filter"
                className="hospital-form-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departmentsList.map((dept) => (
                  <option key={dept.id} value={dept.id || dept.slug}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result Count and Clear Filters Action */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-3 border-top border-light">
            <div className="small text-muted" role="status" aria-live="polite">
              Showing <strong>{filteredDoctors.length}</strong> of{' '}
              <strong>{doctorsList.length}</strong> active medical consultants
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                aria-label="Reset all search filters"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        </section>

        {/* Doctor Results Grid, Loading Spinner or Empty State */}
        {isLoading ? (
          <div className="py-5 text-center my-4" aria-live="polite">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading doctors directory...</span>
            </div>
            <p className="mt-3 text-muted">Retrieving attending medical consultants from hospital directory...</p>
          </div>
        ) : filteredDoctors.length > 0 ? (
          <section aria-label="Doctors Directory Listing" className="mb-5">
            <div className="row g-4">
              {filteredDoctors.map((doctor) => (
                <div key={doctor.id} className="col-12 col-md-6 col-lg-4">
                  <DoctorCard doctor={doctor} />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="mb-5">
            <EmptyState
              title="No Medical Specialists Found"
              message="No consultant physicians matched your specified search keywords or filter criteria. Try broadening your specialty or department selection."
              action={
                <Button variant="primary" size="sm" onClick={handleResetFilters}>
                  Clear All Filters
                </Button>
              }
            />
          </div>
        )}
      </Container>
    </div>
  );
}

export default DoctorsPage;
