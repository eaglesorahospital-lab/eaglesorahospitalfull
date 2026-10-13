import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
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
      <Container>
        <PageHeader
          title={`About ${HOSPITAL_METADATA.name}`}
          description="Institutional history, clinical care philosophy, diagnostic facilities, and medical staff governance."
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
                Committed to Compassionate Clinical Excellence
              </h2>
              <p className="hospital-body mb-3 text-muted">
                {HOSPITAL_METADATA.legalName} was founded with the objective of providing accessible,
                rigorous medical care to patients and families. Over decades of clinical service, the hospital
                has evolved into a trusted multi-disciplinary center offering outpatient consultations, advanced
                surgical interventions, and round-the-clock emergency care.
              </p>
              <p className="hospital-body mb-3 text-muted">
                We believe that modern medicine achieves its highest purpose when cutting-edge clinical
                science is paired with deep personal empathy. Every patient walking through our doors receives
                the focused attention of multidisciplinary medical teams who work in close alignment to ensure
                safe and accurate treatment pathways.
              </p>
              <p className="hospital-body mb-0 text-muted">
                Our facilities operate under strict infection control standards, standardized clinical
                documentation, and continuous medical review protocols.
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
                  To provide evidence-based, compassionate healthcare services to all individuals;
                  to maintain absolute clinical integrity in diagnostics and procedures; and to uphold
                  the dignity and emotional well-being of our patients and their loved ones throughout
                  their care journey.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="neu-raised neu-surface p-4 rounded-4 h-100">
                <span className="neu-badge neu-badge-primary mb-2 d-inline-block">Our Direction</span>
                <h3 className="hospital-subsection-title mt-1 mb-3 text-body">Institutional Vision</h3>
                <p className="hospital-body mb-0 text-muted">
                  To serve as a benchmark for patient safety, ethical healthcare delivery, and medical
                  transparency; continually modernizing our clinical infrastructure while sustaining
                  an environment of warmth, medical humility, and respectful community care.
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
            <span className="neu-eyebrow text-uppercase fw-bold text-primary">State of the Art Facilities</span>
            <h2 className="hospital-section-title mb-1 fs-3">Clinical Infrastructure & Medical Capabilities</h2>
            <p className="hospital-text-supporting text-muted mb-0">
              Architected for rapid diagnosis, patient comfort, and sterile surgical environments.
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
