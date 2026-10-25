import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import SEO from '../../components/common/SEO';
import DoctorCard from '../../components/doctors/DoctorCard';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';
import { DEMO_DEPARTMENTS } from '../../data/hospitalData';
import {
  Calendar,
  Clock,
  PhoneCall,
  Mail,
  MapPin,
  Building2,
  ChevronRight,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

/**
 * Hospital Platform — Department Details Page
 * Full clinical department profile in Neumorphism / Soft UI design.
 */
export function DepartmentDetailPage() {
  const { slug } = useParams();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (id) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  const department = DEMO_DEPARTMENTS.find(
    (d) => d.slug.toLowerCase() === (slug || '').toLowerCase()
  );

  if (!department) {
    return (
      <Container className="py-5">
        <SEO
          title="Department Not Found | EgleSora Hospital"
          description="The requested clinical department could not be located in the EgleSora Hospital directory."
          noIndex={true}
        />
        <EmptyState
          title="Clinical Department Not Found"
          message={`No clinical department with the identifier "${slug}" was located in the hospital registry.`}
          action={
            <Link to="/departments" className="neu-btn neu-btn-primary">
              Browse All Departments
            </Link>
          }
        />
      </Container>
    );
  }

  const [associatedDoctors, setAssociatedDoctors] = useState([]);

  useEffect(() => {
    let isMounted = true;
    doctorService.getDoctors({ is_active: true, page_size: 50 }).then((res) => {
      if (isMounted && res?.results) {
        const matches = res.results.filter(
          (doc) =>
            doc.status === 'active' &&
            (doc.departmentSlug === slug ||
              doc.departmentId === slug ||
              (department?.doctorIds || []).includes(doc.id))
        );
        setAssociatedDoctors(matches);
      } else if (isMounted) {
        setAssociatedDoctors([]);
      }
    }).catch((err) => {
      console.warn('Could not fetch doctors for department:', err);
      if (isMounted) setAssociatedDoctors([]);
    });

    return () => {
      isMounted = false;
    };
  }, [slug, department]);

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Departments', to: '/departments' },
    { label: department.name },
  ];

  return (
    <div className="department-detail-page py-4">
      <SEO
        title={`${department.name} | EgleSora Hospital`}
        description={department.shortDescription || `${department.name} clinical services, specialist consultants, and modern diagnostic facilities at EgleSora Hospital.`}
        canonicalUrl={`/departments/${department.slug}`}
      />
      <Container>
        {/* 1. Page Header & Breadcrumb */}
        <PageHeader
          title={department.name}
          description={`Clinical Specialty: ${department.specialty}`}
          breadcrumbs={breadcrumbs}
        >
          <div className="d-flex flex-wrap gap-2">
            <Link to="/appointments/book" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1">
              <Calendar size={15} />
              <span>Book Consultation</span>
            </Link>
            <Link to="/departments" className="neu-btn neu-btn-outline">
              All Departments
            </Link>
          </div>
        </PageHeader>

        {/* 2. Department Overview & Clinical Description */}
        <div className="row g-4 mb-5">
          <div className="col-12 col-lg-8">
            <div className="neu-raised neu-surface p-4 p-md-5 rounded-4 h-100">
              <span className="neu-badge neu-badge-primary mb-3 d-inline-block">{department.specialty}</span>
              <h2 className="hospital-section-title mb-3 fs-3">Department Overview</h2>
              <p className="hospital-body lead text-body mb-4 fs-6">
                {department.shortDescription}
              </p>
              <h3 className="h6 fw-bold text-primary mb-2">Clinical Scope & Approach</h3>
              <p className="hospital-body text-muted mb-0">
                {department.fullDescription}
              </p>
            </div>
          </div>

          {/* Quick Department Information Card */}
          <div className="col-12 col-lg-4">
            <div className="neu-raised neu-surface p-4 rounded-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <h3 className="h6 fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                  <Building2 size={18} />
                  <span>Department Information</span>
                </h3>
                <div className="mb-3 pb-2 border-bottom">
                  <div className="small text-muted">Clinic Location</div>
                  <div className="fw-semibold text-body d-flex align-items-center gap-1 mt-1">
                    <MapPin size={14} className="text-primary flex-shrink-0" />
                    <span>{department.contact?.location}</span>
                  </div>
                </div>
                <div className="mb-3 pb-2 border-bottom">
                  <div className="small text-muted">OPD Timing Summary</div>
                  <div className="fw-semibold text-body d-flex align-items-center gap-1 mt-1">
                    <Clock size={14} className="text-primary flex-shrink-0" />
                    <span>{department.opdHours}</span>
                  </div>
                </div>
                <div className="mb-3 pb-2 border-bottom">
                  <div className="small text-muted">Department Direct Line</div>
                  <div className="fw-semibold text-body d-flex align-items-center gap-1 mt-1">
                    <PhoneCall size={14} className="text-primary flex-shrink-0" />
                    <span>{department.contact?.phone}</span>
                    <span className="small text-muted">({department.contact?.extension})</span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="small text-muted">Department Email</div>
                  <div className="fw-semibold text-body small d-flex align-items-center gap-1 mt-1">
                    <Mail size={14} className="text-primary flex-shrink-0" />
                    <span>{department.contact?.email}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <Link to="/appointments/book" className="neu-btn neu-btn-primary w-100 text-center justify-content-center d-flex align-items-center gap-2 py-2">
                  <Calendar size={15} />
                  <span>Book in this Department</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Clinical Services Section */}
        <section className="mb-5" aria-label="Department Services">
          <div className="mb-4">
            <span className="neu-eyebrow text-uppercase fw-bold text-primary">Procedures & Care</span>
            <h2 className="hospital-section-title mb-1 fs-3">Services Provided</h2>
            <p className="hospital-text-supporting text-muted mb-0">
              Diagnostic assessments, outpatient treatments, and continuous specialized care.
            </p>
          </div>

          <div className="row g-3">
            {(department.services || []).map((service, index) => (
              <div key={index} className="col-12 col-md-6">
                <div className="neu-raised neu-surface p-3 rounded-4 d-flex align-items-start gap-3 transition-all hover-lift">
                  <span
                    className="neu-inset rounded-3 text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: '36px', height: '36px' }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="h6 fw-semibold mb-1 text-body">{service}</h3>
                    <p className="small text-muted mb-0">
                      Standard clinical protocol delivered by department specialists and nursing staff.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Consultation Timings (Structured Schedule Table) */}
        <section className="mb-5" aria-label="Consultation Timings">
          <div className="mb-4">
            <span className="neu-eyebrow text-uppercase fw-bold text-primary">Clinic Hours</span>
            <h2 className="hospital-section-title mb-1 fs-3">Outpatient (OPD) Consultation Timings</h2>
            <p className="hospital-text-supporting text-muted mb-0">
              Weekly outpatient clinic hours. Emergency cases are received 24/7 at the trauma department.
            </p>
          </div>

          <div className="neu-table-container">
            <table className="neu-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '25%' }}>Day</th>
                  <th scope="col" style={{ width: '45%' }}>Consultation Timing</th>
                  <th scope="col" style={{ width: '30%' }}>OPD Status</th>
                </tr>
              </thead>
              <tbody>
                {(department.consultationTimings || []).map((slot) => {
                  const isClosed = slot.status.toLowerCase().includes('closed');

                  return (
                    <tr key={slot.day}>
                      <td className="fw-semibold text-body">{slot.day}</td>
                      <td>{slot.timing}</td>
                      <td>
                        <span
                          className={`neu-badge ${
                            isClosed ? 'neu-badge-danger' : 'neu-badge-success'
                          }`}
                        >
                          {slot.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Associated Doctors Preview */}
        <section className="mb-5" aria-label="Department Specialists">
          <div className="mb-4">
            <span className="neu-eyebrow text-uppercase fw-bold text-primary">Department Faculty</span>
            <h2 className="hospital-section-title mb-1 fs-3">Attending Consultant Specialists</h2>
            <p className="hospital-text-supporting text-muted mb-0">
              Medical specialists and surgeons consulting within this clinical division.
            </p>
          </div>

          {associatedDoctors.length > 0 ? (
            <div className="row g-4">
              {associatedDoctors.map((doc) => (
                <div key={doc.id} className="col-12 col-md-6 col-lg-4">
                  <DoctorCard doctor={doc} />
                </div>
              ))}
            </div>
          ) : (
            <div className="neu-raised neu-surface p-4 rounded-4 text-center text-muted">
              Consultant roster for this department is being scheduled for the upcoming clinical term.
            </div>
          )}
        </section>

        {/* 6. Department FAQs */}
        {(department.faqs || []).length > 0 && (
          <section className="mb-5" aria-label="Department Questions">
            <div className="mb-4">
              <span className="neu-eyebrow text-uppercase fw-bold text-primary">Patient Guidance</span>
              <h2 className="hospital-section-title mb-1 fs-3">Frequently Asked Questions</h2>
              <p className="hospital-text-supporting text-muted mb-0">
                Common inquiries regarding preparations, reports, and follow-ups in this department.
              </p>
            </div>

            <div className="mx-auto" style={{ maxWidth: '880px' }}>
              {department.faqs.map((faq) => {
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
                      <div id={`${faq.id}-body`} className="p-3 pt-0 text-muted small neu-inset m-2 rounded-3">
                        <div className="p-2">{faq.answer}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 7. Department Appointment Call to Action */}
        <section className="mb-5" aria-label="Book Department Consultation">
          <div className="neu-raised neu-surface p-5 rounded-4 text-center">
            <h2 className="hospital-section-title mb-2 fs-3">
              Book a Consultation in {department.name}
            </h2>
            <p className="hospital-body text-muted mb-4 mx-auto" style={{ maxWidth: '600px' }}>
              Schedule your outpatient visit with attending specialists. Our clinic reception
              confirms slot allocations upon appointment reservation.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link to="/appointments/book" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2 py-2 px-4">
                <Calendar size={16} />
                <span>Book Appointment Now</span>
              </Link>
              <Link to="/contact" className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-2 py-2 px-4">
                <PhoneCall size={16} />
                <span>Contact Department Desk</span>
              </Link>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}

export default DepartmentDetailPage;
