import React from 'react';

/**
 * Hospital Platform — Patient Details Form (Phase 6)
 * Accessible intake form collecting essential patient identity and consultation details.
 * Contains field-level client-side validation and adheres to data minimization.
 */
export function PatientDetailsForm({ patient, onChangeField, errors = {} }) {
  return (
    <div className="hospital-card p-4 bg-white mb-4">
      <h3 className="h5 fw-bold text-primary mb-1">Patient Information</h3>
      <p className="hospital-text-supporting mb-3">
        Please provide the patient details for this clinical consultation file.
      </p>

      {/* Clinical notice */}
      <div className="p-2 mb-3 bg-light border border-light rounded small text-muted">
        Patient details provided here are used solely for outpatient consultation scheduling
        and clinical identification at the hospital reception.
      </div>

      <div className="row g-3">
        {/* Full Name */}
        <div className="col-12 col-md-6">
          <label htmlFor="patient-full-name" className="hospital-form-label">
            Full Name <span className="text-danger">*</span>
          </label>
          <input
            id="patient-full-name"
            type="text"
            className={`hospital-form-control ${errors.fullName ? 'is-invalid' : ''}`}
            placeholder="e.g. Ramesh Chandra Sharma"
            value={patient.fullName}
            onChange={(e) => onChangeField('fullName', e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <div className="text-danger small mt-1" role="alert">
              {errors.fullName}
            </div>
          )}
        </div>

        {/* Date of Birth */}
        <div className="col-12 col-sm-6 col-md-3">
          <label htmlFor="patient-dob" className="hospital-form-label">
            Date of Birth <span className="text-danger">*</span>
          </label>
          <input
            id="patient-dob"
            type="date"
            className={`hospital-form-control ${errors.dateOfBirth ? 'is-invalid' : ''}`}
            value={patient.dateOfBirth}
            onChange={(e) => onChangeField('dateOfBirth', e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.dateOfBirth}
          />
          {errors.dateOfBirth && (
            <div className="text-danger small mt-1" role="alert">
              {errors.dateOfBirth}
            </div>
          )}
        </div>

        {/* Gender */}
        <div className="col-12 col-sm-6 col-md-3">
          <label htmlFor="patient-gender" className="hospital-form-label">
            Gender <span className="text-danger">*</span>
          </label>
          <select
            id="patient-gender"
            className={`hospital-form-select ${errors.gender ? 'is-invalid' : ''}`}
            value={patient.gender}
            onChange={(e) => onChangeField('gender', e.target.value)}
            aria-required="true"
          >
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          {errors.gender && (
            <div className="text-danger small mt-1" role="alert">
              {errors.gender}
            </div>
          )}
        </div>

        {/* Mobile Number */}
        <div className="col-12 col-md-6">
          <label htmlFor="patient-mobile" className="hospital-form-label">
            Mobile Number <span className="text-danger">*</span>
          </label>
          <input
            id="patient-mobile"
            type="tel"
            className={`hospital-form-control ${errors.mobile ? 'is-invalid' : ''}`}
            placeholder="e.g. 9876543210"
            value={patient.mobile}
            onChange={(e) => onChangeField('mobile', e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.mobile}
          />
          <div className="form-text small text-muted">10-digit primary mobile number for appointment notifications.</div>
          {errors.mobile && (
            <div className="text-danger small mt-1" role="alert">
              {errors.mobile}
            </div>
          )}
        </div>

        {/* Email Address */}
        <div className="col-12 col-md-6">
          <label htmlFor="patient-email" className="hospital-form-label">
            Email Address <span className="text-danger">*</span>
          </label>
          <input
            id="patient-email"
            type="email"
            className={`hospital-form-control ${errors.email ? 'is-invalid' : ''}`}
            placeholder="e.g. ramesh.sharma@example.com"
            value={patient.email}
            onChange={(e) => onChangeField('email', e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.email}
          />
          <div className="form-text small text-muted">For digital consultation slips and scheduling updates.</div>
          {errors.email && (
            <div className="text-danger small mt-1" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        {/* Residential Address (Optional) */}
        <div className="col-12">
          <label htmlFor="patient-address" className="hospital-form-label">
            Residential Address (Optional)
          </label>
          <input
            id="patient-address"
            type="text"
            className="hospital-form-control"
            placeholder="e.g. 45 Green Park Avenue, Mumbai"
            value={patient.address}
            onChange={(e) => onChangeField('address', e.target.value)}
          />
        </div>

        {/* Reason for Visit */}
        <div className="col-12">
          <label htmlFor="patient-reason" className="hospital-form-label">
            Primary Reason for Consultation <span className="text-danger">*</span>
          </label>
          <textarea
            id="patient-reason"
            rows="3"
            className={`hospital-form-control ${errors.reasonForVisit ? 'is-invalid' : ''}`}
            placeholder="Briefly describe symptoms, follow-up purpose, or diagnostic referral details..."
            value={patient.reasonForVisit}
            onChange={(e) => onChangeField('reasonForVisit', e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.reasonForVisit}
          />
          {errors.reasonForVisit && (
            <div className="text-danger small mt-1" role="alert">
              {errors.reasonForVisit}
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="col-12">
          <label htmlFor="patient-emergency" className="hospital-form-label">
            Emergency Contact Name & Phone (Optional)
          </label>
          <input
            id="patient-emergency"
            type="text"
            className="hospital-form-control"
            placeholder="e.g. Sunita Sharma (+91 9876543211) - Spouse"
            value={patient.emergencyContact}
            onChange={(e) => onChangeField('emergencyContact', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default PatientDetailsForm;
