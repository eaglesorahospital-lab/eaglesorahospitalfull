import React from 'react';
import { User, Phone, Mail, MapPin, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * Hospital Platform — Patient Details Form
 * Neumorphic intake form with inset inputs and clean validation.
 */
export function PatientDetailsForm({ patient, onChangeField, errors = {} }) {
  return (
    <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
      <h3 className="h5 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
        <User size={18} />
        <span>Patient Information</span>
      </h3>
      <p className="text-muted small mb-3">
        Please provide the patient details for this clinical consultation file.
      </p>

      {/* Clinical notice */}
      <div className="p-3 mb-4 neu-inset rounded-3 small text-muted d-flex align-items-center gap-2">
        <ShieldCheck size={16} className="text-primary flex-shrink-0" />
        <span>
          Patient details provided here are used solely for outpatient consultation scheduling
          and clinical identification at hospital reception.
        </span>
      </div>

      <div className="row g-3">
        {/* Full Name */}
        <div className="col-12 col-md-6">
          <label htmlFor="patient-full-name" className="hospital-form-label mb-1">
            Full Name <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-full-name"
              type="text"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder="e.g. Ramesh Chandra Sharma"
              value={patient.fullName}
              onChange={(e) => onChangeField('fullName', e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.fullName}
            />
          </div>
          {errors.fullName && (
            <div className="text-danger small mt-1 d-flex align-items-center gap-1" role="alert">
              <AlertTriangle size={12} />
              <span>{errors.fullName}</span>
            </div>
          )}
        </div>

        {/* Date of Birth */}
        <div className="col-12 col-sm-6 col-md-3">
          <label htmlFor="patient-dob" className="hospital-form-label mb-1">
            Date of Birth <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-dob"
              type="date"
              className="form-control bg-transparent border-0 shadow-none"
              value={patient.dateOfBirth}
              onChange={(e) => onChangeField('dateOfBirth', e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.dateOfBirth}
            />
          </div>
          {errors.dateOfBirth && (
            <div className="text-danger small mt-1 d-flex align-items-center gap-1" role="alert">
              <AlertTriangle size={12} />
              <span>{errors.dateOfBirth}</span>
            </div>
          )}
        </div>

        {/* Gender */}
        <div className="col-12 col-sm-6 col-md-3">
          <label htmlFor="patient-gender" className="hospital-form-label mb-1">
            Gender <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <select
              id="patient-gender"
              className="form-select bg-transparent border-0 shadow-none"
              value={patient.gender}
              onChange={(e) => onChangeField('gender', e.target.value)}
              aria-required="true"
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          {errors.gender && (
            <div className="text-danger small mt-1 d-flex align-items-center gap-1" role="alert">
              <AlertTriangle size={12} />
              <span>{errors.gender}</span>
            </div>
          )}
        </div>

        {/* Mobile Number */}
        <div className="col-12 col-md-6">
          <label htmlFor="patient-mobile" className="hospital-form-label mb-1">
            Mobile Number <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-mobile"
              type="tel"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder="e.g. 9876543210"
              value={patient.mobile}
              onChange={(e) => onChangeField('mobile', e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.mobile}
            />
          </div>
          <div className="form-text small text-muted">10-digit primary mobile number for appointment notifications.</div>
          {errors.mobile && (
            <div className="text-danger small mt-1 d-flex align-items-center gap-1" role="alert">
              <AlertTriangle size={12} />
              <span>{errors.mobile}</span>
            </div>
          )}
        </div>

        {/* Email Address */}
        <div className="col-12 col-md-6">
          <label htmlFor="patient-email" className="hospital-form-label mb-1">
            Email Address <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-email"
              type="email"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder="e.g. ramesh.sharma@example.com"
              value={patient.email}
              onChange={(e) => onChangeField('email', e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.email}
            />
          </div>
          <div className="form-text small text-muted">For digital consultation slips and scheduling updates.</div>
          {errors.email && (
            <div className="text-danger small mt-1 d-flex align-items-center gap-1" role="alert">
              <AlertTriangle size={12} />
              <span>{errors.email}</span>
            </div>
          )}
        </div>

        {/* Residential Address */}
        <div className="col-12">
          <label htmlFor="patient-address" className="hospital-form-label mb-1">
            Residential Address (Optional)
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-address"
              type="text"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder="e.g. 45 Green Park Avenue, Mumbai"
              value={patient.address}
              onChange={(e) => onChangeField('address', e.target.value)}
            />
          </div>
        </div>

        {/* Reason for Visit */}
        <div className="col-12">
          <label htmlFor="patient-reason" className="hospital-form-label mb-1">
            Primary Reason for Consultation <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <textarea
              id="patient-reason"
              rows="3"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder="Briefly describe symptoms, follow-up purpose, or diagnostic referral details..."
              value={patient.reasonForVisit}
              onChange={(e) => onChangeField('reasonForVisit', e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.reasonForVisit}
            />
          </div>
          {errors.reasonForVisit && (
            <div className="text-danger small mt-1 d-flex align-items-center gap-1" role="alert">
              <AlertTriangle size={12} />
              <span>{errors.reasonForVisit}</span>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="col-12">
          <label htmlFor="patient-emergency" className="hospital-form-label mb-1">
            Emergency Contact Name & Phone (Optional)
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-emergency"
              type="text"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder="e.g. Sunita Sharma (+91 9876543211) - Spouse"
              value={patient.emergencyContact}
              onChange={(e) => onChangeField('emergencyContact', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientDetailsForm;
