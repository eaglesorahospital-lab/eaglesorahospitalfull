import React, { useState } from 'react';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { HOSPITAL_METADATA } from '../../data/navigation';

/**
 * Hospital Platform — Contact & Location Page (Phase 2)
 * Institutional contact details, 24/7 emergency desk, accessible frontend-only inquiry form,
 * and hospital location guide.
 */
export function ContactPage() {
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Contact & Location' },
  ];

  // Frontend-only form state (No API submission)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    inquiryType: 'general',
    message: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear field error on change
    if (formErrors[id]) {
      setFormErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Frontend validation
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!formData.phone.trim()) errors.phone = 'Contact telephone is required.';
    if (!formData.message.trim()) errors.message = 'Please enter your message or inquiry.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Set submitted state for frontend confirmation
    setSubmitted(true);
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      department: '',
      inquiryType: 'general',
      message: '',
    });
    setFormErrors({});
    setSubmitted(false);
  };

  return (
    <div>
      <Container>
        <PageHeader
          title="Contact & Location"
          description="Emergency desk lines, hospital reception, departmental inquiries, and location directions."
          breadcrumbs={breadcrumbs}
        />

        {/* Contact Overview Grid */}
        <div className="row g-4 mb-5">
          {/* Emergency Box */}
          <div className="col-12 col-md-4">
            <div className="hospital-card p-4 h-100 border-danger border-opacity-25 bg-white">
              <span className="text-uppercase small fw-bold text-danger">Immediate Trauma & EMS</span>
              <h2 className="h5 fw-bold text-dark mt-1 mb-2">24/7 Emergency Desk</h2>
              <p className="small text-muted mb-3">
                For acute trauma, cardiac events, or sudden medical emergencies. No appointment required.
              </p>
              <div className="p-3 bg-light rounded border border-danger border-opacity-25 mb-3">
                <div className="small text-muted">Direct Emergency Line:</div>
                <div className="h5 fw-bold text-danger mb-0">{HOSPITAL_METADATA.emergencyPhone}</div>
              </div>
              <div className="small text-muted">
                Trauma bay entrance located on the East Gate of the medical campus.
              </div>
            </div>
          </div>

          {/* General Inquiries */}
          <div className="col-12 col-md-4">
            <div className="hospital-card p-4 h-100">
              <span className="text-uppercase small fw-bold text-primary">Hospital Reception</span>
              <h2 className="h5 fw-bold text-dark mt-1 mb-2">General Desk & Help</h2>
              <p className="small text-muted mb-3">
                For outpatient appointment schedules, hospital directions, and admission information.
              </p>
              <div className="mb-2">
                <strong>Telephone:</strong>{' '}
                <a href={`tel:${HOSPITAL_METADATA.generalPhone}`} className="text-decoration-none text-dark">
                  {HOSPITAL_METADATA.generalPhone}
                </a>
              </div>
              <div className="mb-3">
                <strong>Email:</strong>{' '}
                <a href={`mailto:${HOSPITAL_METADATA.email}`} className="text-decoration-none text-primary">
                  {HOSPITAL_METADATA.email}
                </a>
              </div>
              <div className="small text-muted">
                Reception staff available Monday through Saturday from 08:00 AM to 08:00 PM.
              </div>
            </div>
          </div>

          {/* Visiting Guidelines */}
          <div className="col-12 col-md-4">
            <div className="hospital-card p-4 h-100">
              <span className="text-uppercase small fw-bold text-secondary">Inpatient Guidelines</span>
              <h2 className="h5 fw-bold text-dark mt-1 mb-2">Visiting Hours & Rules</h2>
              <p className="small text-muted mb-3">
                To safeguard patient rest, infection control, and clinical rounds:
              </p>
              <div className="mb-2">
                <strong>Visiting Hours:</strong> {HOSPITAL_METADATA.visitingHours}
              </div>
              <div className="mb-2">
                <strong>ICU Visiting:</strong> 05:00 PM - 06:00 PM (1 visitor only)
              </div>
              <div className="small text-muted">
                Children below 12 years are restricted from inpatient wards for clinical safety.
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry Form & Campus Location Map Placeholder */}
        <div className="row g-5">
          {/* Inquiry Form Column */}
          <div className="col-12 col-lg-7">
            <div className="hospital-card p-4 p-md-5">
              <h2 className="hospital-section-title mb-2">Patient Inquiry & Feedback</h2>
              <p className="hospital-body text-muted mb-4">
                Have a question regarding clinical departments, visiting hours, or general hospital procedures?
                Submit your inquiry below.
              </p>

              {submitted ? (
                <div className="p-4 border border-success bg-light rounded text-center" role="alert">
                  <h3 className="h5 fw-bold text-success mb-2">Inquiry Recorded (Demo)</h3>
                  <p className="small text-muted mb-3">
                    Thank you, <strong>{formData.fullName}</strong>. In this demonstration mode, your
                    message has been validated and recorded locally. In future phases, inquiries will be
                    directed to the respective hospital help desk.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Send Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FormField
                        id="fullName"
                        label="Full Patient / Visitor Name"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Sharma"
                        required
                        error={formErrors.fullName}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <FormField
                        id="phone"
                        label="Contact Telephone Number"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        required
                        error={formErrors.phone}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <FormField
                        id="email"
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="patient@example.com"
                        required
                        error={formErrors.email}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <FormField
                        id="department"
                        label="Department Concerned (Optional)"
                        type="select"
                        value={formData.department}
                        onChange={handleChange}
                        placeholder="Select a department"
                        options={[
                          { value: 'cardiology', label: 'Cardiology' },
                          { value: 'neurology', label: 'Neurology' },
                          { value: 'orthopaedics', label: 'Orthopaedics' },
                          { value: 'general-medicine', label: 'General Medicine' },
                          { value: 'paediatrics', label: 'Paediatrics' },
                          { value: 'dermatology', label: 'Dermatology' },
                          { value: 'general-inquiry', label: 'General Desk' },
                        ]}
                      />
                    </div>

                    <div className="col-12">
                      <FormField
                        id="message"
                        label="Inquiry / Message"
                        type="textarea"
                        rows={4}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Please write your questions or feedback..."
                        required
                        error={formErrors.message}
                      />
                    </div>

                    <div className="col-12 pt-2">
                      <Button type="submit" variant="primary" size="md">
                        Submit Inquiry
                      </Button>
                      <span className="ms-3 small text-muted">
                        Frontend demonstration only. No real API submission.
                      </span>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Campus Location & Directions Placeholder */}
          <div className="col-12 col-lg-5">
            <div className="hospital-card p-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <h2 className="hospital-section-title mb-2">Hospital Campus Location</h2>
                <div className="mb-3">
                  <strong>Campus Address:</strong>
                  <div className="text-muted">{HOSPITAL_METADATA.address}</div>
                </div>

                <div className="mb-3">
                  <strong>How to Reach Us:</strong>
                  <ul className="small text-muted ps-3 mb-0">
                    <li className="mb-1"><strong>Metro Station:</strong> Medical District Metro (Exit Gate 2, 400m)</li>
                    <li className="mb-1"><strong>Bus Depot:</strong> Central Hospital Bus Terminus (Routes 14, 28, 42)</li>
                    <li className="mb-1"><strong>Parking:</strong> On-campus multi-level parking available for outpatient visitors</li>
                  </ul>
                </div>
              </div>

              {/* Dignified Map Area Placeholder */}
              <div className="hospital-map-placeholder mt-3">
                <div className="fw-semibold text-secondary mb-1">Hospital Campus Map</div>
                <div className="small text-muted mb-2">{HOSPITAL_METADATA.address}</div>
                <div className="small text-muted fst-italic">
                  (Interactive map integration will be connected with GIS service in later phases)
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default ContactPage;
