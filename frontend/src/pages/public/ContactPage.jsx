import React, { useState } from 'react';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import FormField from '../../components/common/FormField';
import SEO from '../../components/common/SEO';
import { HOSPITAL_METADATA } from '../../data/navigation';
import { PhoneCall, Mail, Clock, MapPin, AlertTriangle, Send, CheckCircle2, Building2 } from 'lucide-react';

/**
 * Hospital Platform — Contact & Location Page
 * Institutional contact details, 24/7 emergency desk, accessible inquiry form,
 * and hospital location guide with Neumorphic design.
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
    <div className="py-4">
      <SEO
        title="Contact EgleSora Hospital | Emergency & Help Desk"
        description="Contact EgleSora Hospital reception, emergency trauma services, visiting hours, and campus directions."
        canonicalUrl="/contact"
      />
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
            <div className="neu-raised neu-surface p-4 rounded-4 h-100 border-start border-4 border-danger">
              <span className="neu-badge neu-badge-danger mb-2 d-inline-flex align-items-center gap-1">
                <AlertTriangle size={12} />
                Immediate Trauma & EMS
              </span>
              <h2 className="h5 fw-bold text-body mt-1 mb-2">24/7 Emergency Desk</h2>
              <p className="small text-muted mb-3">
                For acute trauma, cardiac events, or sudden medical emergencies. No appointment required.
              </p>
              <div className="p-3 neu-inset rounded-3 mb-3">
                <div className="small text-muted mb-1">Direct Emergency Line:</div>
                <a
                  href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^+\d]/g, '')}`}
                  className="h5 fw-bold text-danger mb-0 d-flex align-items-center gap-2 text-decoration-none"
                  aria-label={`Call Emergency Desk at ${HOSPITAL_METADATA.emergencyPhone}`}
                >
                  <PhoneCall size={18} />
                  <span>{HOSPITAL_METADATA.emergencyPhone}</span>
                </a>
              </div>
              <div className="small text-muted">
                Trauma bay entrance located on the East Gate of the medical campus.
              </div>
            </div>
          </div>

          {/* General Inquiries */}
          <div className="col-12 col-md-4">
            <div className="neu-raised neu-surface p-4 rounded-4 h-100">
              <span className="neu-badge neu-badge-primary mb-2 d-inline-flex align-items-center gap-1">
                <Building2 size={12} />
                Hospital Reception
              </span>
              <h2 className="h5 fw-bold text-body mt-1 mb-2">General Desk & Help</h2>
              <p className="small text-muted mb-3">
                For outpatient appointment schedules, hospital directions, and admission information.
              </p>
              <div className="mb-2 small">
                <strong className="text-body">Telephone:</strong>{' '}
                <a href={`tel:${HOSPITAL_METADATA.generalPhone}`} className="text-decoration-none text-body fw-medium">
                  {HOSPITAL_METADATA.generalPhone}
                </a>
              </div>
              <div className="mb-3 small">
                <strong className="text-body">Email:</strong>{' '}
                <a href={`mailto:${HOSPITAL_METADATA.email}`} className="text-decoration-none text-primary fw-medium">
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
            <div className="neu-raised neu-surface p-4 rounded-4 h-100">
              <span className="neu-badge neu-badge-secondary mb-2 d-inline-flex align-items-center gap-1">
                <Clock size={12} />
                Inpatient Guidelines
              </span>
              <h2 className="h5 fw-bold text-body mt-1 mb-2">Visiting Hours & Rules</h2>
              <p className="small text-muted mb-3">
                To safeguard patient rest, infection control, and clinical rounds:
              </p>
              <div className="mb-2 small text-muted">
                <strong className="text-body">Visiting Hours:</strong> {HOSPITAL_METADATA.visitingHours}
              </div>
              <div className="mb-2 small text-muted">
                <strong className="text-body">ICU Visiting:</strong> 05:00 PM - 06:00 PM (1 visitor only)
              </div>
              <div className="small text-muted">
                Children below 12 years are restricted from inpatient wards for clinical safety.
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry Form & Campus Location Map */}
        <div className="row g-4 g-lg-5">
          {/* Inquiry Form Column */}
          <div className="col-12 col-lg-7">
            <div className="neu-raised neu-surface p-4 p-md-5 rounded-4">
              <h2 className="hospital-section-title mb-2">Patient Inquiry & Feedback</h2>
              <p className="text-muted mb-4">
                Have a question regarding clinical departments, visiting hours, or general hospital procedures?
                Submit your inquiry below.
              </p>

              {submitted ? (
                <div className="p-4 neu-inset rounded-4 text-center" role="alert">
                  <div className="neu-badge neu-badge-success mb-2 p-2 rounded-circle d-inline-flex align-items-center justify-content-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="h5 fw-bold text-body mb-2">Inquiry Recorded</h3>
                  <p className="small text-muted mb-3">
                    Thank you, <strong>{formData.fullName}</strong>. Your message has been received and directed to the hospital help desk.
                  </p>
                  <button type="button" className="neu-btn neu-btn-outline" onClick={handleReset}>
                    Send Another Inquiry
                  </button>
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

                    <div className="col-12 pt-2 d-flex flex-wrap align-items-center gap-3">
                      <button type="submit" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2 py-2 px-4">
                        <Send size={15} />
                        <span>Submit Inquiry</span>
                      </button>
                      <span className="small text-muted">
                        Responses typically provided within 12 business hours.
                      </span>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Campus Location & Directions */}
          <div className="col-12 col-lg-5">
            <div className="neu-raised neu-surface p-4 rounded-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <h2 className="hospital-section-title mb-2">Hospital Campus Location</h2>
                <div className="mb-3 d-flex align-items-start gap-2">
                  <MapPin size={18} className="text-primary flex-shrink-0 mt-1" />
                  <div>
                    <strong className="text-body d-block">Campus Address:</strong>
                    <div className="text-muted small">{HOSPITAL_METADATA.address}</div>
                  </div>
                </div>

                <div className="mb-3">
                  <strong className="text-body d-block mb-1">How to Reach Us:</strong>
                  <ul className="small text-muted ps-3 mb-0">
                    <li className="mb-2"><strong>Metro Station:</strong> Medical District Metro (Exit Gate 2, 400m)</li>
                    <li className="mb-2"><strong>Bus Depot:</strong> Central Hospital Bus Terminus (Routes 14, 28, 42)</li>
                    <li className="mb-2"><strong>Parking:</strong> On-campus multi-level parking available for outpatient visitors</li>
                  </ul>
                </div>
              </div>

              {/* Campus Location Map Card */}
              <div className="neu-inset p-3 rounded-4 mt-3 text-center">
                <MapPin size={28} className="text-primary mb-2" />
                <div className="fw-semibold text-body mb-1">EgleSora Hospital Campus Map</div>
                <div className="small text-muted mb-2">{HOSPITAL_METADATA.address}</div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(HOSPITAL_METADATA.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neu-btn neu-btn-outline btn-sm d-inline-flex align-items-center gap-1"
                >
                  <span>Open in Maps</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default ContactPage;
