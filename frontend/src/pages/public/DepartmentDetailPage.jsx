import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import DoctorCard from '../../components/doctors/DoctorCard';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';
import { DEMO_DEPARTMENTS, DEMO_DOCTORS } from '../../data/hospitalData';

/**
 * Hospital Platform — Department Details Page (Phase 3)
 * Full clinical department profile covering services, OPD schedules, contact details,
 * associated doctors preview, department-specific FAQs, and appointment CTA.
 */
export function DepartmentDetailPage() {
  const { slug } = useParams();

  // State for department FAQ accordion
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (id) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  // Find department by slug
  const department = DEMO_DEPARTMENTS.find(
    (d) => d.slug.toLowerCase() === (slug || '').toLowerCase()
  );

  // Fallback if department slug does not exist
  if (!department) {
    return (
      <Container className="py-5">
        <EmptyState
          title="Clinical Department Not Found"
          message={`No clinical department with the identifier "${slug}" was located in the hospital registry.`}
          action={
            <Link to="/departments">
              <Button variant="primary" size="md">
                Browse All Departments
              </Button>
            </Link>
          }
        />
      </Container>
    );
  }

  // Lookup associated doctors with database fallback
  const [associatedDoctors, setAssociatedDoctors] = useState(() =>
    (department.doctorIds || [])
      .map((id) => DEMO_DOCTORS.find((doc) => doc.id === id && doc.status === 'active'))
      .filter(Boolean)
  );

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
        if (matches.length > 0) {
          setAssociatedDoctors(matches);
        }
      }
    }).catch((err) => console.warn('Could not fetch doctors for department:', err));

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
    <div className="department-detail-page">
      <Container>
        {/* ====================================================================
            1. Page Header & Breadcrumb
            ==================================================================== */}
        <PageHeader
          title={department.name}
          description={`Clinical Specialty: ${department.specialty}`}
          breadcrumbs={breadcrumbs}
        >
          <div className="d-flex flex-wrap gap-2">
            <Link to="/appointments/book">
              <Button variant="secondary" size="md">
                Book Consultation
              </Button>
            </Link>
            <Link to="/departments">
              <Button variant="outline" size="md">
                All Departments
              </Button>
            </Link>
          </div>
        </PageHeader>

        {/* ====================================================================
            2. Department Overview & Clinical Description
            ==================================================================== */}
        <div className="row g-4 mb-5">
          <div className="col-12 col-lg-8">
            <div className="hospital-card p-4 p-md-5 h-100">
              <span className="dept-card-specialty mb-2">{department.specialty}</span>
              <h2 className="hospital-section-title mb-3">Department Overview</h2>
              <p className="hospital-body lead text-dark mb-4">
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
            <div className="hospital-card p-4 h-100 bg-light border">
              <h3 className="h6 fw-bold text-primary mb-3">Department Information</h3>
              <div className="mb-3 pb-2 border-bottom">
                <div className="small text-muted">Clinic Location</div>
                <div className="fw-semibold text-dark">{department.contact?.location}</div>
              </div>
              <div className="mb-3 pb-2 border-bottom">
                <div className="small text-muted">OPD Timing Summary</div>
                <div className="fw-semibold text-dark">{department.opdHours}</div>
              </div>
              <div className="mb-3 pb-2 border-bottom">
                <div className="small text-muted">Department Direct Line</div>
                <div className="fw-semibold text-dark">
                  {department.contact?.phone}{' '}
                  <span className="small text-muted">({department.contact?.extension})</span>
                </div>
              </div>
              <div className="mb-3">
                <div className="small text-muted">Department Email</div>
                <div className="fw-semibold text-dark small">{department.contact?.email}</div>
              </div>

              <div className="pt-2">
                <Link to="/appointments/book" className="w-100 d-block">
                  <Button variant="primary" size="sm" className="w-100">
                    Book Appointment in this Department
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            3. Clinical Services Section (Grid layout, NO checkmarks)
            ==================================================================== */}
        <section className="mb-5" aria-label="Department Services">
          <div className="border-bottom pb-2 mb-4">
            <span className="text-uppercase small fw-bold text-primary">Procedures & Care</span>
            <h2 className="hospital-section-title mb-1">Services Provided</h2>
            <p className="hospital-text-supporting mb-0">
              Diagnostic assessments, outpatient treatments, and continuous specialized care.
            </p>
          </div>

          <div className="row g-3">
            {(department.services || []).map((service, index) => (
              <div key={index} className="col-12 col-md-6">
                <div className="dept-service-item d-flex align-items-start">
                  <span
                    className="badge bg-secondary text-white me-3 mt-1"
                    style={{ minWidth: '1.75rem', textAlign: 'center' }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="h6 fw-semibold mb-1 text-dark">{service}</h3>
                    <p className="small text-muted mb-0">
                      Standard clinical protocol delivered by department specialists and nursing staff.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ====================================================================
            4. Consultation Timings (Structured Schedule Table)
            ==================================================================== */}
        <section className="mb-5" aria-label="Consultation Timings">
          <div className="border-bottom pb-2 mb-4">
            <span className="text-uppercase small fw-bold text-primary">Clinic Hours</span>
            <h2 className="hospital-section-title mb-1">Outpatient (OPD) Consultation Timings</h2>
            <p className="hospital-text-supporting mb-0">
              Weekly outpatient clinic hours. Emergency cases are received 24/7 at the trauma department.
            </p>
          </div>

          <div className="table-responsive hospital-card p-0 overflow-hidden">
            <table className="dept-schedule-table table table-hover mb-0">
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
                      <td className="fw-semibold text-dark">{slot.day}</td>
                      <td>{slot.timing}</td>
                      <td>
                        <span
                          className={`hospital-badge ${
                            isClosed ? 'hospital-badge-cancelled' : 'hospital-badge-confirmed'
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

        {/* ====================================================================
            5. Associated Doctors Preview
            ==================================================================== */}
        <section className="mb-5" aria-label="Department Specialists">
          <div className="border-bottom pb-2 mb-4">
            <span className="text-uppercase small fw-bold text-primary">Department Faculty</span>
            <h2 className="hospital-section-title mb-1">Attending Consultant Specialists</h2>
            <p className="hospital-text-supporting mb-0">
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
            <div className="hospital-card p-4 text-center text-muted">
              Consultant roster for this department is being scheduled for the upcoming clinical term.
            </div>
          )}
        </section>

        {/* ====================================================================
            6. Department FAQs
            ==================================================================== */}
        {(department.faqs || []).length > 0 && (
          <section className="mb-5" aria-label="Department Questions">
            <div className="border-bottom pb-2 mb-4">
              <span className="text-uppercase small fw-bold text-primary">Patient Guidance</span>
              <h2 className="hospital-section-title mb-1">Frequently Asked Questions</h2>
              <p className="hospital-text-supporting mb-0">
                Common inquiries regarding preparations, reports, and follow-ups in this department.
              </p>
            </div>

            <div className="mx-auto" style={{ maxWidth: '880px' }}>
              {department.faqs.map((faq) => {
                const isOpen = openFaq === faq.id;

                return (
                  <div key={faq.id} className="hospital-faq-item">
                    <button
                      type="button"
                      className="hospital-faq-trigger"
                      onClick={() => toggleFaq(faq.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${faq.id}-body`}
                    >
                      <span>{faq.question}</span>
                      <span className="ms-2 fw-bold" aria-hidden="true">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>

                    {isOpen && (
                      <div id={`${faq.id}-body`} className="hospital-faq-body">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ====================================================================
            7. Department Appointment Call to Action
            ==================================================================== */}
        <section className="mb-5" aria-label="Book Department Consultation">
          <div className="hospital-card p-5 bg-white border text-center">
            <h2 className="hospital-section-title mb-2">
              Book a Consultation in {department.name}
            </h2>
            <p className="hospital-body text-muted mb-4 mx-auto" style={{ maxWidth: '600px' }}>
              Schedule your outpatient visit with attending specialists. Our clinic reception
              confirms slot allocations and room details upon appointment reservation.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link to="/appointments/book">
                <Button variant="secondary" size="lg">
                  Book Appointment Now
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg">
                  Contact Department Desk
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}

export default DepartmentDetailPage;
