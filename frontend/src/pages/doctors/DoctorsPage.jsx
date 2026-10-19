import React, { useState, useMemo, useEffect } from 'react';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import DoctorCard from '../../components/doctors/DoctorCard';
import EmptyState from '../../components/common/EmptyState';
import SEO from '../../components/common/SEO';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';
import { Search, X, Users, Filter, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Hospital Platform — Doctor Discovery & Directory
 * Public-facing directory for searching consultant physicians with Neumorphism styling.
 */
export function DoctorsPage() {
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Doctors Directory' },
  ];

  const [doctorsList, setDoctorsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

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

  const specialties = useMemo(() => {
    const list = new Set(doctorsList.map((d) => d.specialty).filter(Boolean));
    return ['ALL', ...Array.from(list)];
  }, [doctorsList]);

  const filteredDoctors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return doctorsList.filter((doctor) => {
      if (doctor.is_active === false || String(doctor.status).toLowerCase() === 'inactive') {
        return false;
      }

      if (selectedSpecialty !== 'ALL' && doctor.specialty !== selectedSpecialty) {
        return false;
      }

      if (selectedDepartment !== 'ALL') {
        const deptId = String(doctor.departmentId || doctor.departmentSlug || doctor.department || '');
        if (deptId !== String(selectedDepartment)) return false;
      }

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
    <div className="doctors-directory-page py-4">
      <SEO
        title="Medical Consultants Directory | EgleSora Hospital"
        description="Search and discover attending medical consultants, surgeons, and healthcare specialists across all departments at EgleSora Hospital."
        canonicalUrl="/doctors"
      />
      <Container>
        <PageHeader
          title="Find a Medical Specialist"
          description="Search attending consultant physicians, surgeons, and clinical specialists across all outpatient hospital divisions."
          breadcrumbs={breadcrumbs}
        />

        {/* API Error Banner */}
        {apiError && (
          <div
            className="neu-raised neu-surface p-3 mb-4 rounded-4 border-start border-4 border-danger d-flex flex-wrap align-items-center justify-content-between gap-2"
            role="alert"
          >
            <div className="d-flex align-items-center gap-2">
              <AlertTriangle size={20} className="text-danger flex-shrink-0" />
              <div>
                <strong className="text-danger">Medical Directory API Notice:</strong>{' '}
                <span className="text-muted">{apiError}</span>
              </div>
            </div>
            <button type="button" className="neu-btn neu-btn-outline neu-btn-sm d-flex align-items-center gap-1" onClick={fetchDirectory}>
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Introduction Panel */}
        <div className="neu-raised neu-surface p-4 mb-4 rounded-4">
          <h2 className="h5 fw-bold text-primary mb-2 d-flex align-items-center gap-2">
            <Users size={20} />
            <span>Attending Medical Faculty & Consultants</span>
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
          className="neu-raised neu-surface p-4 mb-4 rounded-4"
          aria-label="Doctor search and filter controls"
        >
          <div className="row g-3">
            {/* Search Input */}
            <div className="col-12 col-lg-5">
              <label htmlFor="doctor-search-input" className="hospital-form-label mb-1">
                Search Doctor or Expertise
              </label>
              <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-2">
                <span className="text-muted ps-2">
                  <Search size={16} />
                </span>
                <input
                  id="doctor-search-input"
                  type="text"
                  className="form-control bg-transparent border-0 shadow-none ps-0"
                  placeholder="Search by name, specialty, qualification..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search doctors by name, specialty, or clinical focus"
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

            {/* Specialty Filter Dropdown */}
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="specialty-filter" className="hospital-form-label mb-1">
                Filter by Specialty
              </label>
              <div className="neu-inset rounded-3 p-1">
                <select
                  id="specialty-filter"
                  className="form-select bg-transparent border-0 shadow-none"
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
            </div>

            {/* Department Filter Dropdown */}
            <div className="col-12 col-sm-6 col-lg-4">
              <label htmlFor="dept-filter" className="hospital-form-label mb-1">
                Department
              </label>
              <div className="neu-inset rounded-3 p-1">
                <select
                  id="dept-filter"
                  className="form-select bg-transparent border-0 shadow-none"
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
          </div>

          {/* Result Count and Clear Filters Action */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-3 border-top">
            <div className="small text-muted" role="status" aria-live="polite">
              Showing <strong className="text-body">{filteredDoctors.length}</strong> of{' '}
              <strong className="text-body">{doctorsList.length}</strong> active medical consultants
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="neu-btn neu-btn-outline neu-btn-sm py-1 px-2"
                onClick={handleResetFilters}
                aria-label="Reset all search filters"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </section>

        {/* Doctor Results Grid or Loading or Empty State */}
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
                <button type="button" className="neu-btn neu-btn-primary" onClick={handleResetFilters}>
                  Clear All Filters
                </button>
              }
            />
          </div>
        )}
      </Container>
    </div>
  );
}

export default DoctorsPage;
