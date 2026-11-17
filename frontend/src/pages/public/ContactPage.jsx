import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import FormField from '../../components/common/FormField';
import SEO from '../../components/common/SEO';
import CopyButton from '../../components/common/CopyButton';
import { HOSPITAL_METADATA } from '../../data/navigation';
import {
  PhoneCall,
  Mail,
  Clock,
  MapPin,
  AlertTriangle,
  Send,
  CheckCircle2,
  Building2,
  Star,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import feedbackService from '../../services/feedbackService';

const FEEDBACK_CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'General Hospital Experience' },
  { value: 'CLINICAL_CARE', label: 'Clinical Care & Consultation' },
  { value: 'FACILITY_CLEANLINESS', label: 'Facility & Cleanliness' },
  { value: 'STAFF_BEHAVIOR', label: 'Nursing & Staff Behavior' },
  { value: 'APPOINTMENT_SCHEDULING', label: 'Appointment & Waiting Time' },
  { value: 'BILLING', label: 'Billing & Insurance' },
];

/**
 * Interactive 1 to 5 Star Rating Input
 */
function InteractiveStarRating({ value, onChange, error }) {
  const [hoverRating, setHoverRating] = useState(0);
  const activeRating = hoverRating || value;

  const ratingDescriptions = {
    1: '1.0 — Needs Significant Improvement',
    2: '2.0 — Below Expectations',
    3: '3.0 — Satisfactory / Average',
    4: '4.0 — Good Experience',
    5: '5.0 — Excellent Care & Service',
  };

  return (
    <div className="mb-3">
      <label className="neu-label d-block mb-1 fw-semibold text-body">
        Experience Satisfaction Rating <span className="text-danger">*</span>
      </label>
      <div className="d-flex align-items-center gap-1 mb-1" role="radiogroup" aria-label="Satisfaction rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="neu-btn-icon p-1 border-0 bg-transparent"
            style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => onChange(star)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-checked={value === star}
            role="radio"
          >
            <Star
              size={28}
              style={{
                fill: star <= activeRating ? '#F59E0B' : 'transparent',
                color: star <= activeRating ? '#F59E0B' : 'var(--hospital-border, #CBD5E1)',
                transition: 'fill 0.2s, color 0.2s',
              }}
            />
          </button>
        ))}
        <span className="ms-2 small fw-semibold text-body">
          {ratingDescriptions[activeRating] || `${value}.0 Stars`}
        </span>
      </div>
      {error && <div className="neu-form-error text-danger small mt-1">{error}</div>}
    </div>
  );
}

/**
 * Hospital Platform — Contact & Location Page
 * Institutional contact details, 24/7 emergency desk, accessible inquiry form,
 * interactive patient feedback submission, and campus location guide.
 */
export function ContactPage({ defaultTab }) {
  const location = useLocation();
  const isFeedbackRoute = location.pathname.includes('/feedback') || defaultTab === 'feedback';

  const [activeTab, setActiveTab] = useState(isFeedbackRoute ? 'feedback' : 'feedback');

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: activeTab === 'feedback' ? 'Patient Feedback & Experience' : 'Contact & Location' },
  ];

  // Feedback Form State (persisted to backend /api/feedback/)
  const [feedbackData, setFeedbackData] = useState({
    patient_name: '',
    email: '',
    phone: '',
    category: 'GENERAL',
    rating: 5,
    message: '',
  });
  const [feedbackErrors, setFeedbackErrors] = useState({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSuccessData, setFeedbackSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackApiError, setFeedbackApiError] = useState(null);

  // General Inquiry Form State (client-assisted)
  const [inquiryData, setInquiryData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    inquiryType: 'general',
    message: '',
  });
  const [inquiryErrors, setInquiryErrors] = useState({});
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  // Handle Feedback changes
  const handleFeedbackChange = (e) => {
    const { id, value } = e.target;
    setFeedbackData((prev) => ({ ...prev, [id]: value }));
    if (feedbackErrors[id]) {
      setFeedbackErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleRatingChange = (newRating) => {
    setFeedbackData((prev) => ({ ...prev, rating: newRating }));
    if (feedbackErrors.rating) {
      setFeedbackErrors((prev) => ({ ...prev, rating: null }));
    }
  };

  // Submit Feedback to Backend API
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackApiError(null);

    const errors = {};
    if (!feedbackData.patient_name.trim()) {
      errors.patient_name = 'Patient / visitor name is required.';
    }
    if (!feedbackData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(feedbackData.email)) {
      errors.email = 'Please provide a valid email address.';
    }
    if (feedbackData.phone && feedbackData.phone.trim().length > 0 && !/^[\d\s+\-()]{7,25}$/.test(feedbackData.phone.trim())) {
      errors.phone = 'Please enter a valid telephone number.';
    }
    if (!feedbackData.rating || feedbackData.rating < 1 || feedbackData.rating > 5) {
      errors.rating = 'Please select a rating between 1 and 5 stars.';
    }
    if (!feedbackData.message.trim()) {
      errors.message = 'Feedback message is required.';
    } else if (feedbackData.message.trim().length < 10) {
      errors.message = 'Please provide at least 10 characters describing your experience.';
    }

    if (Object.keys(errors).length > 0) {
      setFeedbackErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await feedbackService.submitFeedback({
        patient_name: feedbackData.patient_name.trim(),
        email: feedbackData.email.trim(),
        phone: feedbackData.phone.trim(),
        category: feedbackData.category,
        rating: Number(feedbackData.rating),
        message: feedbackData.message.trim(),
      });
      setFeedbackSuccessData({
        ...result,
        patient_name: feedbackData.patient_name.trim(),
        category: feedbackData.category,
        rating: feedbackData.rating,
        submittedAt: new Date().toISOString(),
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      setFeedbackApiError(err.message || 'Unable to record feedback. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFeedback = () => {
    setFeedbackData({
      patient_name: '',
      email: '',
      phone: '',
      category: 'GENERAL',
      rating: 5,
      message: '',
    });
    setFeedbackErrors({});
    setFeedbackSubmitted(false);
    setFeedbackSuccessData(null);
    setFeedbackApiError(null);
  };

  // Inquiry Form Handlers
  const handleInquiryChange = (e) => {
    const { id, value } = e.target;
    setInquiryData((prev) => ({ ...prev, [id]: value }));
    if (inquiryErrors[id]) {
      setInquiryErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!inquiryData.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!inquiryData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(inquiryData.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!inquiryData.phone.trim()) errors.phone = 'Contact telephone is required.';
    if (!inquiryData.message.trim()) errors.message = 'Please enter your inquiry.';

    if (Object.keys(errors).length > 0) {
      setInquiryErrors(errors);
      return;
    }
    setInquirySubmitted(true);
  };

  const handleResetInquiry = () => {
    setInquiryData({
      fullName: '',
      email: '',
      phone: '',
      department: '',
      inquiryType: 'general',
      message: '',
    });
    setInquiryErrors({});
    setInquirySubmitted(false);
  };

  return (
    <div className="py-4">
      <SEO
        title="Patient Feedback & Contact | EgleSora Hospital"
        description="Share your clinical care feedback, patient experience ratings, or reach EgleSora Hospital emergency reception and help desk."
        canonicalUrl="/contact"
      />
      <Container>
        <PageHeader
          title={activeTab === 'feedback' ? 'Patient Experience & Feedback' : 'Contact & Location'}
          description="Submit your clinical care feedback, hospital experience rating, or reach our emergency and general information desk."
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
                <div className="mt-2">
                  <CopyButton text={HOSPITAL_METADATA.emergencyPhone} label="Copy Emergency Line" showText={true} />
                </div>
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
                <span className="ms-2">
                  <CopyButton text={HOSPITAL_METADATA.generalPhone} size={12} title="Copy phone number" />
                </span>
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

        {/* Interactive Form & Campus Location Map */}
        <div className="row g-4 g-lg-5">
          {/* Form Column */}
          <div className="col-12 col-lg-7">
            <div className="neu-raised neu-surface p-4 p-md-5 rounded-4">
              {/* Form Mode Selector Tabs */}
              <div className="d-flex flex-wrap gap-2 mb-4 p-1 neu-inset rounded-3">
                <button
                  type="button"
                  className={`neu-btn neu-btn-sm flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2 ${
                    activeTab === 'feedback' ? 'neu-btn-primary' : 'neu-btn-outline border-0'
                  }`}
                  onClick={() => setActiveTab('feedback')}
                >
                  <Star size={15} />
                  <span>Patient Feedback & Rating</span>
                </button>
                <button
                  type="button"
                  className={`neu-btn neu-btn-sm flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2 ${
                    activeTab === 'inquiry' ? 'neu-btn-primary' : 'neu-btn-outline border-0'
                  }`}
                  onClick={() => setActiveTab('inquiry')}
                >
                  <MessageSquare size={15} />
                  <span>General Help Desk Inquiry</span>
                </button>
              </div>

              {/* TAB 1: PATIENT FEEDBACK FORM */}
              {activeTab === 'feedback' && (
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h2 className="hospital-section-title mb-0">Share Your Hospital Experience</h2>
                    <span className="neu-badge neu-badge-info d-none d-sm-inline-flex align-items-center gap-1">
                      <ShieldCheck size={13} />
                      Quality Assurance
                    </span>
                  </div>
                  <p className="text-muted small mb-4">
                    Your candid feedback directly guides our medical directors and nursing leadership in maintaining
                    the highest clinical standards and compassionate care.
                  </p>

                  {feedbackApiError && (
                    <div className="p-3 neu-card mb-4 border-start border-4 border-danger rounded-3" role="alert">
                      <div className="d-flex align-items-center gap-2 text-danger small fw-semibold">
                        <AlertCircle size={16} />
                        <span>{feedbackApiError}</span>
                      </div>
                    </div>
                  )}

                  {feedbackSubmitted ? (
                    <div className="p-4 neu-inset rounded-4 text-center" role="alert">
                      <div className="neu-badge neu-badge-success mb-3 p-3 rounded-circle d-inline-flex align-items-center justify-content-center">
                        <CheckCircle2 size={32} />
                      </div>
                      <h3 className="h5 fw-bold text-body mb-2">Thank You for Your Feedback!</h3>
                      <p className="small text-muted mb-3">
                        Thank you, <strong>{feedbackSuccessData?.patient_name}</strong>. Your feedback with a{' '}
                        <strong>{feedbackSuccessData?.rating}.0★ rating</strong> has been securely logged into our
                        hospital management system and forwarded to the clinical audit department.
                      </p>
                      <div className="p-3 neu-surface rounded-3 mb-4 text-start small">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Review Category:</span>
                          <span className="fw-semibold text-body">
                            {FEEDBACK_CATEGORY_OPTIONS.find((c) => c.value === feedbackSuccessData?.category)?.label ||
                              'General Experience'}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Recorded Status:</span>
                          <span className="neu-badge neu-badge-warning py-0 px-2" style={{ fontSize: '11px' }}>
                            Queued for Administrative Review
                          </span>
                        </div>
                      </div>
                      <button type="button" className="neu-btn neu-btn-primary" onClick={handleResetFeedback}>
                        Submit Another Evaluation
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleFeedbackSubmit} noValidate>
                      {/* Star Rating Selector */}
                      <InteractiveStarRating
                        value={feedbackData.rating}
                        onChange={handleRatingChange}
                        error={feedbackErrors.rating}
                      />

                      <div className="row g-3">
                        {/* Category */}
                        <div className="col-12">
                          <FormField
                            id="category"
                            label="Feedback Category"
                            type="select"
                            value={feedbackData.category}
                            onChange={handleFeedbackChange}
                            options={FEEDBACK_CATEGORY_OPTIONS}
                            required
                          />
                        </div>

                        {/* Name */}
                        <div className="col-12 col-md-6">
                          <FormField
                            id="patient_name"
                            label="Patient / Visitor Name"
                            value={feedbackData.patient_name}
                            onChange={handleFeedbackChange}
                            placeholder="e.g. Meera Joshi"
                            required
                            error={feedbackErrors.patient_name}
                          />
                        </div>

                        {/* Email */}
                        <div className="col-12 col-md-6">
                          <FormField
                            id="email"
                            label="Email Address"
                            type="email"
                            value={feedbackData.email}
                            onChange={handleFeedbackChange}
                            placeholder="patient@example.com"
                            required
                            error={feedbackErrors.email}
                          />
                        </div>

                        {/* Phone */}
                        <div className="col-12">
                          <FormField
                            id="phone"
                            label="Contact Telephone (Optional)"
                            type="tel"
                            value={feedbackData.phone}
                            onChange={handleFeedbackChange}
                            placeholder="+91 98765 43210"
                            error={feedbackErrors.phone}
                          />
                        </div>

                        {/* Message */}
                        <div className="col-12">
                          <FormField
                            id="message"
                            label="Your Feedback / Clinical Experience Details"
                            type="textarea"
                            rows={4}
                            value={feedbackData.message}
                            onChange={handleFeedbackChange}
                            placeholder="Please share details regarding your doctor consultation, nursing care, waiting times, or facility cleanliness..."
                            required
                            error={feedbackErrors.message}
                          />
                          <div className="d-flex justify-content-between mt-1 small text-muted">
                            <span>Minimum 10 characters required</span>
                            <span>{feedbackData.message.length} chars</span>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="col-12 pt-2">
                          <div className="d-flex flex-wrap align-items-center gap-3">
                            <button
                              type="submit"
                              className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2 py-2 px-4"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <>
                                  <RotateCw size={15} className="spin-anim" />
                                  <span>Recording Feedback...</span>
                                </>
                              ) : (
                                <>
                                  <Send size={15} />
                                  <span>Submit Feedback</span>
                                </>
                              )}
                            </button>
                            <span className="small text-muted d-flex align-items-center gap-1">
                              <ShieldCheck size={14} className="text-success" />
                              Strictly confidential & reviewed by hospital administration.
                            </span>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: GENERAL DESK INQUIRY FORM */}
              {activeTab === 'inquiry' && (
                <div>
                  <h2 className="hospital-section-title mb-2">Hospital Help Desk Inquiry</h2>
                  <p className="text-muted small mb-4">
                    Have a question regarding clinical departments, visiting hours, or general hospital procedures?
                    Submit your inquiry below.
                  </p>

                  {inquirySubmitted ? (
                    <div className="p-4 neu-inset rounded-4 text-center" role="alert">
                      <div className="neu-badge neu-badge-success mb-2 p-2 rounded-circle d-inline-flex align-items-center justify-content-center">
                        <CheckCircle2 size={24} />
                      </div>
                      <h3 className="h5 fw-bold text-body mb-2">Inquiry Recorded</h3>
                      <p className="small text-muted mb-3">
                        Thank you, <strong>{inquiryData.fullName}</strong>. Your message has been received and directed
                        to the hospital help desk.
                      </p>
                      <button type="button" className="neu-btn neu-btn-outline" onClick={handleResetInquiry}>
                        Send Another Inquiry
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleInquirySubmit} noValidate>
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <FormField
                            id="fullName"
                            label="Full Patient / Visitor Name"
                            value={inquiryData.fullName}
                            onChange={handleInquiryChange}
                            placeholder="e.g. Rahul Sharma"
                            required
                            error={inquiryErrors.fullName}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <FormField
                            id="phone"
                            label="Contact Telephone Number"
                            type="tel"
                            value={inquiryData.phone}
                            onChange={handleInquiryChange}
                            placeholder="+91 98765 43210"
                            required
                            error={inquiryErrors.phone}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <FormField
                            id="email"
                            label="Email Address"
                            type="email"
                            value={inquiryData.email}
                            onChange={handleInquiryChange}
                            placeholder="patient@example.com"
                            required
                            error={inquiryErrors.email}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <FormField
                            id="department"
                            label="Department Concerned (Optional)"
                            type="select"
                            value={inquiryData.department}
                            onChange={handleInquiryChange}
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
                            value={inquiryData.message}
                            onChange={handleInquiryChange}
                            placeholder="Please write your questions or inquiries..."
                            required
                            error={inquiryErrors.message}
                          />
                        </div>

                        <div className="col-12 pt-2 d-flex flex-wrap align-items-center gap-3">
                          <button
                            type="submit"
                            className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2 py-2 px-4"
                          >
                            <Send size={15} />
                            <span>Submit Inquiry</span>
                          </button>
                          <span className="small text-muted">Responses typically provided within 12 business hours.</span>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
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
                    <li className="mb-2">
                      <strong>Metro Station:</strong> Medical District Metro (Exit Gate 2, 400m)
                    </li>
                    <li className="mb-2">
                      <strong>Bus Depot:</strong> Central Hospital Bus Terminus (Routes 14, 28, 42)
                    </li>
                    <li className="mb-2">
                      <strong>Parking:</strong> On-campus multi-level parking available for outpatient visitors
                    </li>
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
