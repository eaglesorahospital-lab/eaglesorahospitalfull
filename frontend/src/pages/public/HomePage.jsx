import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from '../../components/common/Container';
import Button from '../../components/common/Button';
import SectionHeader from '../../components/common/SectionHeader';
import DoctorCard from '../../components/doctors/DoctorCard';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';
import {
  DEMO_DEPARTMENTS,
  DEMO_DOCTORS,
  DEMO_SERVICES,
  DEMO_FACILITIES,
  HOSPITAL_VALUES,
  DEMO_FAQS,
} from '../../data/hospitalData';
import { HOSPITAL_METADATA } from '../../data/navigation';

/**
 * Hospital Platform — Home Page
 * Dignified, patient-first healthcare landing page adhering to Apollo & Fortis UX patterns:
 * - Professional light healthcare hero with clinical hospital photography
 * - Prominent, accessible doctor search & appointment booking widget
 * - Compact, uniform quick-care pathway cards
 * - Centers of excellence and medical specialist directory
 * - Verified emergency trauma response indicators
 */
export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search widget state
  const [searchDoctorQuery, setSearchDoctorQuery] = useState('');
  const [selectedDeptSlug, setSelectedDeptSlug] = useState('');

  // Authoritative data state synced with PostgreSQL database
  const [doctors, setDoctors] = useState(() => DEMO_DOCTORS.filter((d) => d.status === 'active'));
  const [departments, setDepartments] = useState(() => DEMO_DEPARTMENTS);

  useEffect(() => {
    let isMounted = true;
    doctorService
      .getDoctors({ is_active: true, page_size: 10 })
      .then((res) => {
        if (isMounted && res?.results && res.results.length > 0) {
          // Strictly filter for active doctors according to hospital business rules
          const activeOnly = res.results.filter((d) => d.status === 'active');
          setDoctors(activeOnly);
        }
      })
      .catch((err) => console.warn('Could not load doctors from API:', err));

    departmentService
      .getDepartments()
      .then((res) => {
        if (isMounted && res && res.length > 0) {
          setDepartments(res);
        }
      })
      .catch((err) => console.warn('Could not load departments from API:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // State for accessible FAQ accordion toggles
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (id) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchDoctorQuery.trim()) {
      params.set('search', searchDoctorQuery.trim());
    }
    if (selectedDeptSlug) {
      params.set('department', selectedDeptSlug);
    }
    navigate(`/doctors${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="hospital-homepage">
      {/* ======================================================================
          1. Hero Section: Light, Balanced Healthcare Layout (Apollo/Fortis Inspired)
          ====================================================================== */}
      <section className="hospital-hero-light py-4 py-lg-5 border-bottom bg-slate-50" aria-label="Hospital Overview and Consultation Booking">
        <Container>
          <div className="row align-items-center g-4 g-xl-5">
            {/* Left Column: Heading, Booking Form & Patient Entry */}
            <div className="col-12 col-lg-7">
              <div className="d-inline-flex flex-wrap align-items-center gap-2 px-2 py-1 rounded bg-white border small fw-semibold text-primary mb-3" style={{ maxWidth: '100%' }}>
                <span className="badge bg-primary text-white" style={{ fontSize: '0.7rem' }}>Tertiary Care</span>
                <span className="text-break">{HOSPITAL_METADATA.legalName}</span>
              </div>

              <h1 className="display-6 fw-bold text-navy mb-3 text-break" style={{ color: '#0f2e59', lineHeight: '1.2' }}>
                {t('hero.title')}
              </h1>

              <p className="lead text-secondary mb-4 fs-6" style={{ lineHeight: '1.6', maxWidth: '720px' }}>
                {t('hero.lead')}
              </p>

              {/* Apollo / Fortis Style Quick Search & Booking Card */}
              <div className="hospital-search-card bg-white p-3 p-sm-4 rounded-3 border shadow-sm mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <span className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {t('hero.quickWidgetTitle')}
                  </span>
                  <Link to="/appointments/book" className="small text-primary text-decoration-none fw-semibold">
                    Direct Booking &rarr;
                  </Link>
                </div>

                <form onSubmit={handleHeroSearch}>
                  <div className="row g-2 align-items-center">
                    <div className="col-12 col-sm-6">
                      <label htmlFor="hero-doctor-search" className="visually-hidden">
                        {t('hero.searchDoctorPlaceholder')}
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-end-0 text-muted">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        </span>
                        <input
                          id="hero-doctor-search"
                          type="text"
                          className="form-control border-start-0 ps-0"
                          placeholder="Search doctor or specialty..."
                          value={searchDoctorQuery}
                          onChange={(e) => setSearchDoctorQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label htmlFor="hero-dept-select" className="visually-hidden">
                        {t('hero.selectDepartment')}
                      </label>
                      <select
                        id="hero-dept-select"
                        className="form-select"
                        value={selectedDeptSlug}
                        onChange={(e) => setSelectedDeptSlug(e.target.value)}
                      >
                        <option value="">{t('hero.allDepartments')}</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.slug}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 d-flex flex-column flex-sm-row gap-2 mt-3">
                      <button
                        type="submit"
                        className="hospital-btn hospital-btn-primary flex-grow-1 justify-content-center"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        {t('hero.searchDoctorsBtn')}
                      </button>
                      <Link
                        to="/appointments/book"
                        className="hospital-btn hospital-btn-secondary justify-content-center"
                      >
                        {t('hero.bookAppointment')} &rarr;
                      </Link>
                    </div>
                  </div>
                </form>
              </div>

              {/* Verified Emergency Desk Line */}
              <div className="d-flex align-items-center gap-2 small text-muted">
                <span className="badge bg-danger text-white">Emergency</span>
                <span>24/7 Trauma Desk:</span>
                <a
                  href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                  className="fw-bold text-dark text-decoration-none"
                >
                  {HOSPITAL_METADATA.emergencyPhone}
                </a>
              </div>
            </div>

            {/* Right Column: Hospital Facility Image & Clean Summary Card */}
            <div className="col-12 col-lg-5">
              <div className="hospital-hero-visual-card position-relative bg-white rounded-3 border shadow-sm overflow-hidden">
                <img
                  src="/hospital-facade.jpg"
                  alt="Eagle Sora Multi-Specialty Hospital Modern Medical Campus"
                  className="img-fluid w-100 object-fit-cover"
                  style={{ maxHeight: '280px', objectFit: 'cover' }}
                />
                <div className="p-3 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="small fw-bold text-dark">{t('hero.hoursTitle')}</span>
                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 small">
                      Open 24/7
                    </span>
                  </div>
                  <div className="small text-muted mb-1">
                    <strong className="text-dark">OPD Visiting Hours:</strong> {HOSPITAL_METADATA.visitingHours}
                  </div>
                  <div className="small text-muted mb-2">
                    <strong className="text-dark">Campus:</strong> {HOSPITAL_METADATA.address}
                  </div>
                  <div className="pt-1">
                    <Link to="/contact" className="small text-primary fw-semibold text-decoration-none">
                      {t('hero.directionsLink')} &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ======================================================================
          2. Quick Actions Pathway Tiles (Apollo / Fortis Uniform Grid)
          ====================================================================== */}
      <section className="py-4 bg-white border-bottom" aria-label="Key Hospital Care Portals">
        <Container>
          <div className="row g-3">
            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/appointments/book" className="text-decoration-none text-dark h-100 d-block">
                <div className="hospital-quick-card p-3 rounded-2 border h-100 bg-white hover-border-primary">
                  <div className="d-flex align-items-center gap-3">
                    <div className="hospital-quick-icon bg-primary bg-opacity-10 text-primary p-2 rounded">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="h6 fw-bold mb-0 text-dark">{t('quickActions.bookAppointment')}</h3>
                      <p className="small text-muted mb-0">{t('quickActions.bookAppointmentSub')}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/doctors" className="text-decoration-none text-dark h-100 d-block">
                <div className="hospital-quick-card p-3 rounded-2 border h-100 bg-white hover-border-primary">
                  <div className="d-flex align-items-center gap-3">
                    <div className="hospital-quick-icon bg-info bg-opacity-10 text-primary p-2 rounded">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="h6 fw-bold mb-0 text-dark">{t('quickActions.findDoctor')}</h3>
                      <p className="small text-muted mb-0">{t('quickActions.findDoctorSub')}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/my-appointments" className="text-decoration-none text-dark h-100 d-block">
                <div className="hospital-quick-card p-3 rounded-2 border h-100 bg-white hover-border-primary">
                  <div className="d-flex align-items-center gap-3">
                    <div className="hospital-quick-icon bg-success bg-opacity-10 text-success p-2 rounded">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="h6 fw-bold mb-0 text-dark">{t('quickActions.patientPortal')}</h3>
                      <p className="small text-muted mb-0">{t('quickActions.patientPortalSub')}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <a
                href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                className="text-decoration-none text-dark h-100 d-block"
              >
                <div className="hospital-quick-card p-3 rounded-2 border border-danger border-opacity-25 h-100 bg-white hover-border-danger">
                  <div className="d-flex align-items-center gap-3">
                    <div className="hospital-quick-icon bg-danger bg-opacity-10 text-danger p-2 rounded">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="h6 fw-bold mb-0 text-danger">{t('quickActions.emergency')}</h3>
                      <p className="small text-muted mb-0">{t('quickActions.emergencySub')}</p>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* ======================================================================
          3. Clinical Departments & Centers of Excellence
          ====================================================================== */}
      <section className="hospital-section py-5" aria-label="Departments Preview">
        <Container>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4">
            <div>
              <span className="text-uppercase small fw-bold text-primary">Specialized Divisions</span>
              <h2 className="hospital-section-title mb-1 fs-3">{t('departments.title')}</h2>
              <p className="hospital-text-supporting mb-0 text-muted">
                {t('departments.subtitle')}
              </p>
            </div>
            <div className="mt-3 mt-md-0">
              <Link to="/departments">
                <Button variant="outline" size="sm">
                  {t('departments.viewAll')} &rarr;
                </Button>
              </Link>
            </div>
          </div>

          <div className="row g-4">
            {departments.slice(0, 6).map((dept) => (
              <div key={dept.id} className="col-12 col-md-6 col-lg-4">
                <div className="hospital-card h-100 d-flex flex-column justify-content-between p-4 bg-white border rounded-3">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h3 className="hospital-subsection-title mb-0 fs-5 fw-bold text-dark">{dept.name}</h3>
                      <span className="badge bg-light text-primary border">{dept.code}</span>
                    </div>
                    <p className="small text-muted mb-3">{dept.shortDescription}</p>
                    <div className="small text-secondary mb-3">
                      <strong>OPD Timing:</strong> {dept.opdHours}
                    </div>
                  </div>
                  <div>
                    <Link
                      to={`/departments/${dept.slug}`}
                      className="text-primary fw-semibold small text-decoration-none d-inline-flex align-items-center gap-1"
                    >
                      {t('departments.exploreDepartment')} &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ======================================================================
          4. Featured Doctors Preview
          ====================================================================== */}
      <section className="hospital-section py-5 bg-slate-50 border-top border-bottom" aria-label="Featured Specialists">
        <Container>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4">
            <div>
              <span className="text-uppercase small fw-bold text-primary">Medical Faculty</span>
              <h2 className="hospital-section-title mb-1 fs-3">{t('doctors.title')}</h2>
              <p className="hospital-text-supporting mb-0 text-muted">
                {t('doctors.subtitle')}
              </p>
            </div>
            <div className="mt-3 mt-md-0">
              <Link to="/doctors">
                <Button variant="outline" size="sm">
                  {t('doctors.viewAll')} &rarr;
                </Button>
              </Link>
            </div>
          </div>

          <div className="row g-4">
            {doctors
              .slice(0, 6)
              .map((doc) => (
                <div key={doc.id} className="col-12 col-md-6 col-lg-4">
                  <DoctorCard doctor={doc} />
                </div>
              ))}
          </div>
        </Container>
      </section>

      {/* ======================================================================
          5. Hospital Services & Patient Facilities
          ====================================================================== */}
      <section className="hospital-section py-5" aria-label="Clinical Services">
        <Container>
          <SectionHeader
            title={t('services.title')}
            subtitle={t('services.subtitle')}
          />

          <div className="row g-4">
            {DEMO_SERVICES.map((service) => (
              <div key={service.code} className="col-12 col-md-6 col-lg-4">
                <div className="hospital-service-box p-4 h-100 bg-white border rounded-3">
                  <span className="hospital-service-badge mb-2 d-inline-block text-uppercase fw-bold text-primary small">
                    {service.badge}
                  </span>
                  <h3 className="hospital-subsection-title mb-2 fs-5 fw-bold text-dark">{service.title}</h3>
                  <p className="small text-muted mb-0">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ======================================================================
          6. Appointment Booking Direct Call-out
          ====================================================================== */}
      <section className="hospital-section py-5 bg-slate-50 border-top border-bottom" aria-label="Book Consultation">
        <Container>
          <div className="hospital-card p-4 p-md-5 bg-white border rounded-3">
            <div className="row align-items-center g-4">
              <div className="col-12 col-lg-8">
                <span className="text-uppercase small fw-bold text-primary">
                  {t('booking.title')}
                </span>
                <h2 className="hospital-section-title mt-1 mb-2 fs-3">
                  {t('booking.subtitle')}
                </h2>
                <p className="hospital-body text-muted mb-0">
                  Choose your required clinical department, review available consultant doctors,
                  and select an open clinic slot for your visit.
                </p>
              </div>
              <div className="col-12 col-lg-4 d-flex flex-column flex-sm-row flex-lg-column gap-2 justify-content-lg-end">
                <Link to="/appointments/book" className="w-100">
                  <Button variant="primary" size="lg" className="w-100 justify-content-center">
                    {t('nav.bookConsultation')}
                  </Button>
                </Link>
                <Link to="/doctors" className="w-100">
                  <Button variant="outline" size="lg" className="w-100 justify-content-center">
                    {t('nav.doctors')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ======================================================================
          7. Frequently Asked Questions
          ====================================================================== */}
      <section className="hospital-section py-5" aria-label="Frequently Asked Questions">
        <Container>
          <SectionHeader
            title="Frequently Asked Questions"
            subtitle="Common questions regarding outpatient appointments, emergency procedures, and visiting hours."
          />

          <div className="mx-auto" style={{ maxWidth: '840px' }}>
            {DEMO_FAQS.map((faq) => {
              const isOpen = openFaq === faq.id;

              return (
                <div key={faq.id} className="hospital-faq-item mb-2 border rounded bg-white">
                  <button
                    type="button"
                    className="hospital-faq-trigger w-100 text-start p-3 bg-transparent border-0 d-flex justify-content-between align-items-center fw-semibold text-dark"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`${faq.id}-body`}
                  >
                    <span>{faq.question}</span>
                    <span className="ms-2 fw-bold text-muted" aria-hidden="true">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div id={`${faq.id}-body`} className="hospital-faq-body p-3 pt-0 text-muted small border-top">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </div>
  );
}

export default HomePage;
