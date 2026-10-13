import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from '../../components/common/Container';
import DoctorCard from '../../components/doctors/DoctorCard';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';
import {
  DEMO_DEPARTMENTS,
  DEMO_DOCTORS,
  DEMO_SERVICES,
  DEMO_FACILITIES,
  DEMO_FAQS,
} from '../../data/hospitalData';
import { HOSPITAL_METADATA } from '../../data/navigation';
import {
  Search,
  Calendar,
  PhoneCall,
  Clock,
  MapPin,
  Stethoscope,
  HeartPulse,
  Building2,
  FileText,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Plus,
  Minus,
  Sparkles,
  Users,
} from 'lucide-react';

/**
 * Hospital Platform — Home Page
 * Dignified, patient-first healthcare landing page using Neumorphism / Soft UI:
 * - Soft raised consultation booking card with inset search fields
 * - Clean medical hero with campus photography and 24/7 OPD desk status
 * - Uniform raised quick-care pathway cards
 * - Centers of excellence & medical faculty
 * - 24/7 Verified emergency trauma response indicators
 */
export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search widget state
  const [searchDoctorQuery, setSearchDoctorQuery] = useState('');
  const [selectedDeptSlug, setSelectedDeptSlug] = useState('');

  // Authoritative data state synced with backend API
  const [doctors, setDoctors] = useState(() => DEMO_DOCTORS.filter((d) => d.status === 'active'));
  const [departments, setDepartments] = useState(() => DEMO_DEPARTMENTS);

  useEffect(() => {
    let isMounted = true;
    doctorService
      .getDoctors({ is_active: true, page_size: 10 })
      .then((res) => {
        if (isMounted && res?.results && res.results.length > 0) {
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
          1. Hero Section: Soft Neumorphic Healthcare Layout
          ====================================================================== */}
      <section className="hospital-hero-light py-5" aria-label="Hospital Overview and Consultation Booking">
        <Container>
          <div className="row align-items-center g-4 g-xl-5">
            {/* Left Column: Heading, Booking Form & Patient Entry */}
            <div className="col-12 col-lg-7">
              <div className="d-inline-flex flex-wrap align-items-center gap-2 px-3 py-1 rounded-pill neu-raised mb-3">
                <span className="neu-badge neu-badge-primary">Tertiary Care</span>
                <span className="small fw-semibold text-primary d-inline-flex align-items-center gap-1">
                  <ShieldCheck size={14} />
                  {HOSPITAL_METADATA.legalName}
                </span>
              </div>

              <h1 className="display-6 fw-bold mb-3" style={{ lineHeight: '1.2' }}>
                {t('hero.title')}
              </h1>

              <p className="lead text-muted mb-4 fs-6" style={{ lineHeight: '1.6', maxWidth: '680px' }}>
                {t('hero.lead')}
              </p>

              {/* Neumorphic Quick Search & Booking Widget */}
              <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <span className="fw-bold fs-6 d-flex align-items-center gap-2">
                    <Calendar size={18} className="text-primary" />
                    {t('hero.quickWidgetTitle')}
                  </span>
                  <Link to="/appointments/book" className="small text-primary text-decoration-none fw-semibold d-inline-flex align-items-center gap-1">
                    <span>Direct Booking</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>

                <form onSubmit={handleHeroSearch}>
                  <div className="row g-3 align-items-center">
                    <div className="col-12 col-sm-6">
                      <label htmlFor="hero-doctor-search" className="visually-hidden">
                        {t('hero.searchDoctorPlaceholder')}
                      </label>
                      <div className="input-group neu-inset rounded-3 p-1">
                        <span className="input-group-text bg-transparent border-0 text-muted ps-2">
                          <Search size={16} />
                        </span>
                        <input
                          id="hero-doctor-search"
                          type="text"
                          className="form-control bg-transparent border-0 shadow-none ps-1"
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
                      <div className="neu-inset rounded-3 p-1">
                        <select
                          id="hero-dept-select"
                          className="form-select bg-transparent border-0 shadow-none"
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
                    </div>

                    <div className="col-12 d-flex flex-column flex-sm-row gap-2 mt-2">
                      <button
                        type="submit"
                        className="neu-btn neu-btn-primary flex-grow-1 justify-content-center d-flex align-items-center gap-2 py-2"
                      >
                        <Search size={16} />
                        <span>{t('hero.searchDoctorsBtn')}</span>
                      </button>
                      <Link
                        to="/appointments/book"
                        className="neu-btn neu-btn-secondary justify-content-center d-flex align-items-center gap-2 py-2"
                      >
                        <Calendar size={16} />
                        <span>{t('hero.bookAppointment')}</span>
                      </Link>
                    </div>
                  </div>
                </form>
              </div>

              {/* Verified Emergency Desk Line */}
              <div className="d-flex align-items-center gap-2 small text-muted">
                <span className="neu-badge neu-badge-danger d-inline-flex align-items-center gap-1">
                  <AlertTriangle size={12} />
                  Emergency
                </span>
                <span>24/7 Trauma Desk:</span>
                <a
                  href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                  className="fw-bold text-body text-decoration-none d-inline-flex align-items-center gap-1"
                >
                  <PhoneCall size={14} className="text-danger" />
                  {HOSPITAL_METADATA.emergencyPhone}
                </a>
              </div>
            </div>

            {/* Right Column: Hospital Facility Image & Clean Summary Card */}
            <div className="col-12 col-lg-5">
              <div className="neu-raised neu-surface rounded-4 overflow-hidden p-2">
                <div className="rounded-3 overflow-hidden position-relative">
                  <img
                    src="/hospital-facade.jpg"
                    alt="Eagle Sora Multi-Specialty Hospital Modern Medical Campus"
                    className="img-fluid w-100 object-fit-cover"
                    style={{ maxHeight: '280px', objectFit: 'cover' }}
                  />
                  <div className="position-absolute top-0 end-0 m-3">
                    <span className="neu-badge neu-badge-success d-inline-flex align-items-center gap-1">
                      <span className="pulse-dot"></span>
                      Open 24/7
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="small fw-bold text-body d-flex align-items-center gap-1">
                      <Clock size={14} className="text-primary" />
                      {t('hero.hoursTitle')}
                    </span>
                    <span className="small text-muted">Tertiary Campus</span>
                  </div>
                  <div className="small text-muted mb-1 d-flex align-items-start gap-2">
                    <strong className="text-body text-nowrap">OPD Hours:</strong>
                    <span>{HOSPITAL_METADATA.visitingHours}</span>
                  </div>
                  <div className="small text-muted mb-3 d-flex align-items-start gap-2">
                    <MapPin size={14} className="text-primary flex-shrink-0 mt-1" />
                    <span>{HOSPITAL_METADATA.address}</span>
                  </div>
                  <div className="pt-1">
                    <Link to="/contact" className="neu-btn neu-btn-outline w-100 text-center justify-content-center d-flex align-items-center gap-1">
                      <span>{t('hero.directionsLink')}</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ======================================================================
          2. Quick Actions Pathway Tiles (Neumorphic Raised Cards)
          ====================================================================== */}
      <section className="py-4" aria-label="Key Hospital Care Portals">
        <Container>
          <div className="row g-3">
            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/appointments/book" className="text-decoration-none text-body h-100 d-block">
                <div className="neu-raised neu-surface p-3 rounded-4 h-100 transition-all hover-lift">
                  <div className="d-flex align-items-center gap-3">
                    <div className="neu-inset p-3 rounded-3 text-primary d-flex align-items-center justify-content-center flex-shrink-0">
                      <Calendar size={22} />
                    </div>
                    <div>
                      <h3 className="h6 fw-bold mb-1 text-body">{t('quickActions.bookAppointment')}</h3>
                      <p className="small text-muted mb-0">{t('quickActions.bookAppointmentSub')}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/doctors" className="text-decoration-none text-body h-100 d-block">
                <div className="neu-raised neu-surface p-3 rounded-4 h-100 transition-all hover-lift">
                  <div className="d-flex align-items-center gap-3">
                    <div className="neu-inset p-3 rounded-3 text-info d-flex align-items-center justify-content-center flex-shrink-0">
                      <Users size={22} />
                    </div>
                    <div>
                      <h3 className="h6 fw-bold mb-1 text-body">{t('quickActions.findDoctor')}</h3>
                      <p className="small text-muted mb-0">{t('quickActions.findDoctorSub')}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/my-appointments" className="text-decoration-none text-body h-100 d-block">
                <div className="neu-raised neu-surface p-3 rounded-4 h-100 transition-all hover-lift">
                  <div className="d-flex align-items-center gap-3">
                    <div className="neu-inset p-3 rounded-3 text-success d-flex align-items-center justify-content-center flex-shrink-0">
                      <FileText size={22} />
                    </div>
                    <div>
                      <h3 className="h6 fw-bold mb-1 text-body">{t('quickActions.patientPortal')}</h3>
                      <p className="small text-muted mb-0">{t('quickActions.patientPortalSub')}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <a
                href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                className="text-decoration-none text-body h-100 d-block"
              >
                <div className="neu-raised neu-surface p-3 rounded-4 h-100 transition-all hover-lift border-start border-4 border-danger">
                  <div className="d-flex align-items-center gap-3">
                    <div className="neu-inset p-3 rounded-3 text-danger d-flex align-items-center justify-content-center flex-shrink-0">
                      <PhoneCall size={22} />
                    </div>
                    <div>
                      <h3 className="h6 fw-bold mb-1 text-danger">{t('quickActions.emergency')}</h3>
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
              <span className="neu-eyebrow text-uppercase fw-bold text-primary">Specialized Divisions</span>
              <h2 className="hospital-section-title mb-1 fs-3">{t('departments.title')}</h2>
              <p className="hospital-text-supporting mb-0 text-muted">
                {t('departments.subtitle')}
              </p>
            </div>
            <div className="mt-3 mt-md-0">
              <Link to="/departments" className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-1">
                <span>{t('departments.viewAll')}</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="row g-4">
            {departments.slice(0, 6).map((dept) => (
              <div key={dept.id} className="col-12 col-md-6 col-lg-4">
                <div className="neu-raised neu-surface h-100 d-flex flex-column justify-content-between p-4 rounded-4 transition-all hover-lift">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h3 className="hospital-subsection-title mb-0 fs-5 fw-bold text-body">{dept.name}</h3>
                      <span className="neu-badge neu-badge-primary">{dept.code}</span>
                    </div>
                    <p className="small text-muted mb-3">{dept.shortDescription}</p>
                    <div className="small text-muted mb-3 d-flex align-items-center gap-1">
                      <Clock size={13} className="text-primary flex-shrink-0" />
                      <span><strong className="text-body">OPD Timing:</strong> {dept.opdHours}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-top">
                    <Link
                      to={`/departments/${dept.slug}`}
                      className="text-primary fw-semibold small text-decoration-none d-inline-flex align-items-center gap-1"
                    >
                      <span>{t('departments.exploreDepartment')}</span>
                      <ChevronRight size={14} />
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
      <section className="hospital-section py-5" aria-label="Featured Specialists">
        <Container>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4">
            <div>
              <span className="neu-eyebrow text-uppercase fw-bold text-primary">Medical Faculty</span>
              <h2 className="hospital-section-title mb-1 fs-3">{t('doctors.title')}</h2>
              <p className="hospital-text-supporting mb-0 text-muted">
                {t('doctors.subtitle')}
              </p>
            </div>
            <div className="mt-3 mt-md-0">
              <Link to="/doctors" className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-1">
                <span>{t('doctors.viewAll')}</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="row g-4">
            {doctors.slice(0, 6).map((doc) => (
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
          <div className="text-center mb-5">
            <span className="neu-eyebrow text-uppercase fw-bold text-primary">Comprehensive Care</span>
            <h2 className="hospital-section-title mb-2 fs-3">{t('services.title')}</h2>
            <p className="hospital-text-supporting text-muted mx-auto mb-0" style={{ maxWidth: '640px' }}>
              {t('services.subtitle')}
            </p>
          </div>

          <div className="row g-4">
            {DEMO_SERVICES.map((service) => (
              <div key={service.code} className="col-12 col-md-6 col-lg-4">
                <div className="neu-raised neu-surface p-4 h-100 rounded-4 transition-all hover-lift">
                  <span className="neu-badge neu-badge-primary mb-3 d-inline-block">
                    {service.badge}
                  </span>
                  <h3 className="hospital-subsection-title mb-2 fs-5 fw-bold text-body">{service.title}</h3>
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
      <section className="hospital-section py-5" aria-label="Book Consultation">
        <Container>
          <div className="neu-raised neu-surface p-4 p-md-5 rounded-4 position-relative overflow-hidden">
            <div className="row align-items-center g-4">
              <div className="col-12 col-lg-8">
                <span className="neu-eyebrow text-uppercase fw-bold text-primary">
                  {t('booking.title')}
                </span>
                <h2 className="hospital-section-title mt-1 mb-2 fs-3">
                  {t('booking.subtitle')}
                </h2>
                <p className="text-muted mb-0" style={{ maxWidth: '600px' }}>
                  Choose your required clinical department, review available consultant doctors,
                  and select an open clinic slot for your visit.
                </p>
              </div>
              <div className="col-12 col-lg-4 d-flex flex-column flex-sm-row flex-lg-column gap-2 justify-content-lg-end">
                <Link to="/appointments/book" className="w-100">
                  <button className="neu-btn neu-btn-primary w-100 justify-content-center py-2 d-flex align-items-center gap-2">
                    <Calendar size={18} />
                    <span>{t('nav.bookConsultation')}</span>
                  </button>
                </Link>
                <Link to="/doctors" className="w-100">
                  <button className="neu-btn neu-btn-outline w-100 justify-content-center py-2 d-flex align-items-center gap-2">
                    <Users size={18} />
                    <span>{t('nav.doctors')}</span>
                  </button>
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
          <div className="text-center mb-5">
            <span className="neu-eyebrow text-uppercase fw-bold text-primary">Help & Clarifications</span>
            <h2 className="hospital-section-title mb-2 fs-3">Frequently Asked Questions</h2>
            <p className="hospital-text-supporting text-muted mx-auto mb-0" style={{ maxWidth: '640px' }}>
              Common questions regarding outpatient appointments, emergency procedures, and visiting hours.
            </p>
          </div>

          <div className="mx-auto" style={{ maxWidth: '840px' }}>
            {DEMO_FAQS.map((faq) => {
              const isOpen = openFaq === faq.id;

              return (
                <div key={faq.id} className="neu-raised neu-surface mb-3 rounded-4 overflow-hidden transition-all">
                  <button
                    type="button"
                    className="w-100 text-start p-3 bg-transparent border-0 d-flex justify-content-between align-items-center fw-semibold text-body"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`${faq.id}-body`}
                  >
                    <span className="pe-2">{faq.question}</span>
                    <span className="neu-inset p-1 rounded-circle text-muted d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '28px', height: '28px' }} aria-hidden="true">
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div id={`${faq.id}-body`} className="p-3 pt-0 text-muted small border-top neu-inset m-2 rounded-3">
                      <div className="p-2">{faq.answer}</div>
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
