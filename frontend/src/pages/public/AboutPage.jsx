import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import SEO from '../../components/common/SEO';
import { HOSPITAL_METADATA } from '../../data/navigation';
import { DEMO_FACILITIES, HOSPITAL_VALUES } from '../../data/hospitalData';
import { ShieldCheck, Heart, Award, Building2, PhoneCall, Calendar, ChevronRight } from 'lucide-react';

/**
 * Hospital Platform — About Us Page
 * Institutional background, mission, vision, facilities, and clinical care philosophy
 * presented in a consistent Neumorphism / Soft UI design.
 */
export function AboutPage() {
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'About Us' },
  ];

  return (
    <div className="py-4">
      <SEO
        title="About EgleSora Hospital | Clinical Services & Facilities"
        description="Learn about EgleSora Hospital's clinical departments, medical staff governance, patient care protocols, and diagnostic facilities."
        canonicalUrl="/about"
      />
      <Container>
        <PageHeader
          title={`About ${HOSPITAL_METADATA.name}`}
          description="Clinical departments, patient care protocols, diagnostic facilities, and medical staff governance."
          breadcrumbs={breadcrumbs}
        >
          <Link to="/appointments/book" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1">
            <Calendar size={15} />
            <span>Schedule Consultation</span>
          </Link>
        </PageHeader>
      </Container>

      {/* Institutional Background & Story */}
      <section className="hospital-section pt-2" aria-label="Institutional Story">
        <Container>
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-7">
              <span className="neu-eyebrow text-uppercase fw-bold text-primary">Our Story & Purpose</span>
              <h2 className="hospital-section-title mt-1 mb-3">
                Patient Care & Clinical Practice
              </h2>
              <p className="hospital-body mb-3 text-muted">
                {HOSPITAL_METADATA.legalName} provides medical consultations, diagnostic services,
                and inpatient care for patients and families. The hospital brings together outpatient
                specialties, diagnostic imaging and laboratories, and emergency medical services
                at a single campus.
              </p>
              <p className="hospital-body mb-3 text-muted">
                Clinical care is organized around collaborative medical departments. Attending
                physicians, nursing staff, and diagnostic specialists coordinate treatment plans,
                medication management, and patient follow-up.
              </p>
              <p className="hospital-body mb-0 text-muted">
                All departments maintain standard infection prevention practices, structured clinical
                documentation, and scheduled reviews of outpatient and inpatient cases.
              </p>
            </div>

            <div className="col-12 col-lg-5">
              <div className="neu-raised neu-surface p-4 rounded-4">
                <h3 className="h6 fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                  <Building2 size={18} />
                  <span>Institutional Overview</span>
                </h3>
                <div className="mb-3 pb-2 border-bottom">
                  <div className="small text-muted">Legal Name</div>
                  <div className="fw-semibold text-body">{HOSPITAL_METADATA.legalName}</div>
                </div>
                <div className="mb-3 pb-2 border-bottom">
                  <div className="small text-muted">Core Care Focus</div>
                  <div className="fw-semibold text-body">Multi-Specialty Inpatient, Outpatient & 24/7 Trauma Care</div>
                </div>
                <div className="mb-3 pb-2 border-bottom">
                  <div className="small text-muted">Campus Location</div>
                  <div className="fw-semibold text-body">{HOSPITAL_METADATA.address}</div>
                </div>
                <div>
                  <div className="small text-muted">Helpline & Help Desk</div>
                  <div className="fw-semibold text-body d-flex align-items-center gap-1">
                    <PhoneCall size={14} className="text-primary" />
                    <span>{HOSPITAL_METADATA.generalPhone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Mission & Vision */}
      <section className="hospital-section" aria-label="Mission and Vision">
        <Container>
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <div className="neu-raised neu-surface p-4 rounded-4 h-100">
                <span className="neu-badge neu-badge-secondary mb-2 d-inline-block">Our Purpose</span>
                <h3 className="hospital-subsection-title mt-1 mb-3 text-body">Institutional Mission</h3>
                <p className="hospital-body mb-0 text-muted">
                  To deliver reliable, evidence-based healthcare; to maintain accuracy in diagnostics
                  and therapeutic procedures; and to treat patients and families with respect, clear
                  communication, and professional care.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="neu-raised neu-surface p-4 rounded-4 h-100">
                <span className="neu-badge neu-badge-primary mb-2 d-inline-block">Our Direction</span>
                <h3 className="hospital-subsection-title mt-1 mb-3 text-body">Institutional Vision</h3>
                <p className="hospital-body mb-0 text-muted">
                  To be a dependable center for outpatient and inpatient healthcare, maintaining
                  rigorous patient safety standards, clear clinical communication, and disciplined
                  medical ethics across all departments.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Healthcare Infrastructure & Capabilities */}
      <section className="hospital-section" aria-label="Clinical Infrastructure">
        <Container>
          <div className="mb-4">
            <span className="neu-eyebrow text-uppercase fw-bold text-primary">Campus & Facilities</span>
            <h2 className="hospital-section-title mb-1 fs-3">Diagnostic & Clinical Facilities</h2>
            <p className="hospital-text-supporting text-muted mb-0">
              Dedicated consultation rooms, diagnostic testing areas, and inpatient care wings.
            </p>
          </div>

          <div className="row g-4">
            {DEMO_FACILITIES.map((facility) => (
              <div key={facility.name} className="col-12 col-md-6">
                <div className="neu-raised neu-surface p-4 rounded-4 h-100 transition-all hover-lift">
                  <h3 className="hospital-subsection-title mb-2 fs-5 fw-bold text-body">{facility.name}</h3>
                  <p className="small text-muted mb-0">{facility.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Patient-Focused Care Philosophy */}
      <section className="hospital-section" aria-label="Care Philosophy">
        <Container>
          <div className="mb-4">
            <span className="neu-eyebrow text-uppercase fw-bold text-primary">Ethical Foundations</span>
            <h2 className="hospital-section-title mb-1 fs-3">Patient-Focused Care Philosophy</h2>
            <p className="hospital-text-supporting text-muted mb-0">
              The ethical standards guiding every medical interaction and treatment protocol.
            </p>
          </div>

          <div className="row g-4">
            {HOSPITAL_VALUES.map((val) => (
              <div key={val.title} className="col-12 col-md-6 col-lg-3">
                <div className="neu-raised neu-surface p-4 rounded-4 h-100 transition-all hover-lift">
                  <h3 className="h6 fw-bold text-primary mb-2">{val.title}</h3>
                  <p className="small text-muted mb-0">{val.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Bottom Consultation CTA */}
      <section className="hospital-section" aria-label="Visit Us">
        <Container>
          <div className="neu-raised neu-surface p-4 p-md-5 rounded-4 text-center">
            <h2 className="hospital-section-title mb-2">Need to Consult a Medical Specialist?</h2>
            <p className="hospital-body text-muted mb-4 mx-auto" style={{ maxWidth: '640px' }}>
              Our outpatient departments operate from Monday through Saturday. Browse consultant
              specialties or book an appointment online.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link to="/appointments/book" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2 py-2 px-4">
                <Calendar size={16} />
                <span>Book an Appointment</span>
              </Link>
              <Link to="/contact" className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-2 py-2 px-4">
                <PhoneCall size={16} />
                <span>Contact Help Desk</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default AboutPage;
