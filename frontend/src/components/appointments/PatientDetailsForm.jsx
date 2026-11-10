import React, { useState, useEffect } from 'react';
import { User, Users, Phone, Mail, MapPin, FileText, AlertTriangle, ShieldCheck, Heart, UserCheck } from 'lucide-react';
import authService from '../../services/authService';
import { patientService } from '../../services/patientService';
import { appointmentService } from '../../services/appointmentService';

/**
 * Hospital Platform — Patient Details Form
 * Neumorphic intake form with inset inputs, clean validation,
 * support for "Book for Myself" vs "Book for Someone Else", and relationship selection.
 */
export function PatientDetailsForm({
  patient,
  onChangeField,
  onSetBookingType,
  onSelectDependent,
  errors = {},
}) {
  const [staffPatients, setStaffPatients] = useState([]);
  const [savedDependents, setSavedDependents] = useState([]);
  const isStaff = authService.hasRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR_STAFF']);
  const isAuthenticated = authService.isAuthenticated();

  useEffect(() => {
    let isMounted = true;
    if (isStaff) {
      patientService
        .getPatients({ pageSize: 50 })
        .then((res) => {
          if (isMounted && res?.results) {
            setStaffPatients(res.results);
          }
        })
        .catch(() => {});
    }
    if (isAuthenticated) {
      appointmentService
        .getDependents()
        .then((deps) => {
          if (isMounted && Array.isArray(deps)) {
            setSavedDependents(deps);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isStaff, isAuthenticated]);

  const handleSelectExisting = (patientId) => {
    if (!patientId) return;
    const selected = staffPatients.find((p) => String(p.id) === String(patientId));
    if (!selected) return;
    onChangeField('fullName', selected.fullName || selected.name || '');
    onChangeField('dateOfBirth', selected.dateOfBirth || selected.date_of_birth || '');
    onChangeField('gender', selected.gender || 'Female');
    onChangeField('bloodGroup', selected.bloodGroup || selected.blood_group || '');
    onChangeField('mobile', selected.mobile || selected.contact || selected.phone || '');
    onChangeField('email', selected.email || '');
    onChangeField('address', selected.address || '');
    onChangeField('emergencyContact', selected.emergencyContact || selected.emergency_contact || '');
  };

  const isSomeoneElse = patient.bookingFor === 'SOMEONE_ELSE';

  return (
    <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h3 className="h5 fw-bold text-primary mb-0 d-flex align-items-center gap-2">
          {isSomeoneElse ? <Users size={18} /> : <User size={18} />}
          <span>{isSomeoneElse ? 'Patient & Dependent Information' : 'Patient Information'}</span>
        </h3>
        <span
          className={`badge ${isSomeoneElse ? 'bg-primary' : 'bg-secondary'} text-white`}
          style={{ fontSize: '0.75rem' }}
        >
          {isSomeoneElse ? 'Booking for Family / Dependent' : 'Primary Account Holder'}
        </span>
      </div>
      <p className="text-muted small mb-3">
        {isSomeoneElse
          ? 'Provide the actual patient details for whom this clinical consultation is being booked.'
          : 'Please review or update your patient details for this clinical consultation file.'}
      </p>

      {/* Patient Selection Toggle: Book for Myself vs Book for Someone Else */}
      <div className="mb-4 p-1.5 neu-inset rounded-4" style={{ background: 'var(--hospital-surface)' }}>
        <div className="row g-2">
          <div className="col-12 col-sm-6">
            <button
              type="button"
              className={`w-100 py-2.5 px-3 rounded-3 d-flex align-items-center justify-content-center gap-2 border-0 transition-all ${
                !isSomeoneElse
                  ? 'bg-primary text-white fw-bold shadow-sm'
                  : 'bg-transparent text-body fw-medium'
              }`}
              onClick={() => onSetBookingType && onSetBookingType('MYSELF')}
              aria-pressed={!isSomeoneElse}
            >
              <User size={16} />
              <span>Book for Myself</span>
            </button>
          </div>
          <div className="col-12 col-sm-6">
            <button
              type="button"
              className={`w-100 py-2.5 px-3 rounded-3 d-flex align-items-center justify-content-center gap-2 border-0 transition-all ${
                isSomeoneElse
                  ? 'bg-primary text-white fw-bold shadow-sm'
                  : 'bg-transparent text-body fw-medium'
              }`}
              onClick={() => onSetBookingType && onSetBookingType('SOMEONE_ELSE')}
              aria-pressed={isSomeoneElse}
            >
              <Users size={16} />
              <span>Book for Someone Else</span>
            </button>
          </div>
        </div>
      </div>

      {/* Relationship Selector when booking for someone else */}
      {isSomeoneElse && (
        <div className="p-3 mb-4 neu-inset rounded-3 border-start border-4 border-primary">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <label htmlFor="patient-relationship" className="hospital-form-label mb-1">
                Relationship to Patient <span className="text-danger">*</span>
              </label>
              <select
                id="patient-relationship"
                className="form-select bg-transparent border-0 shadow-none fw-semibold"
                value={patient.relationshipToPatient || 'Parent'}
                onChange={(e) => onChangeField('relationshipToPatient', e.target.value)}
                aria-required="true"
                aria-invalid={!!errors.relationshipToPatient}
              >
                <option value="Parent">Parent</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child / Minor</option>
                <option value="Guardian">Legal Guardian</option>
                <option value="Other">Other Relative / Dependent</option>
              </select>
              {errors.relationshipToPatient && (
                <div className="text-danger small mt-1 d-flex align-items-center gap-1" role="alert">
                  <AlertTriangle size={12} />
                  <span>{errors.relationshipToPatient}</span>
                </div>
              )}
            </div>

            {/* Quick selector for previously booked family members / dependents */}
            {savedDependents.length > 0 && (
              <div className="col-12 col-md-6">
                <label htmlFor="saved-dependent-select" className="hospital-form-label mb-1 d-flex justify-content-between align-items-center">
                  <span>Saved Family Members</span>
                  <span className="badge bg-secondary text-white" style={{ fontSize: '0.68rem' }}>Pre-fill</span>
                </label>
                <select
                  id="saved-dependent-select"
                  className="form-select bg-transparent border-0 shadow-none small"
                  defaultValue=""
                  onChange={(e) => {
                    const found = savedDependents.find((d) => String(d.id) === String(e.target.value));
                    if (found && onSelectDependent) {
                      onSelectDependent(found);
                    }
                  }}
                >
                  <option value="">-- Choose saved family member --</option>
                  {savedDependents.map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.full_name || `${dep.first_name || ''} ${dep.last_name || ''}`.trim()} ({dep.gender}, {dep.blood_group || 'Blood: Not Provided'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="form-text small text-muted mt-2">
            The consultation file will be registered under the actual patient's medical records while linked to your account for tracking and appointment management.
          </div>
        </div>
      )}

      {/* Staff registered patient quick selector */}
      {isStaff && staffPatients.length > 0 && (
        <div className="p-3 mb-4 neu-inset rounded-3">
          <label htmlFor="staff-patient-select" className="hospital-form-label mb-1 d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Quick-Select Registered Patient (Staff Only)</span>
            <span className="badge bg-primary text-white" style={{ fontSize: '0.72rem' }}>Staff Portal</span>
          </label>
          <select
            id="staff-patient-select"
            className="form-select bg-transparent border-0 shadow-none"
            defaultValue=""
            onChange={(e) => handleSelectExisting(e.target.value)}
          >
            <option value="">-- Choose registered patient to auto-populate file --</option>
            {staffPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.fullName} ({p.mrn}) &bull; Blood: {p.bloodGroup || p.blood_group || 'Not Provided'} &bull; {p.contact || p.phone}
              </option>
            ))}
          </select>
          <div className="form-text small text-muted">Selecting an existing patient automatically loads their saved demographics and blood group.</div>
        </div>
      )}

      {/* Clinical notice */}
      <div className="p-3 mb-4 neu-inset rounded-3 small text-muted d-flex align-items-center gap-2">
        <ShieldCheck size={16} className="text-primary flex-shrink-0" />
        <span>
          {isSomeoneElse
            ? "Enter the legal name, contact, and medical details of the patient who will attend the consultation."
            : "Patient details provided here are used solely for outpatient consultation scheduling and clinical identification at hospital reception."}
        </span>
      </div>

      <div className="row g-3">
        {/* Full Name */}
        <div className="col-12 col-md-6">
          <label htmlFor="patient-full-name" className="hospital-form-label mb-1">
            {isSomeoneElse ? "Patient's Full Legal Name" : "Full Name"} <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-full-name"
              type="text"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder={isSomeoneElse ? "e.g. Priyanshu Sharma (Dependent)" : "e.g. Ramesh Chandra Sharma"}
              value={patient.fullName || ''}
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

        {/* Blood Group */}
        <div className="col-12 col-md-6">
          <label htmlFor="patient-blood-group" className="hospital-form-label mb-1">
            Blood Group
          </label>
          <div className="neu-inset rounded-3 p-1">
            <select
              id="patient-blood-group"
              className="form-select bg-transparent border-0 shadow-none"
              value={patient.bloodGroup || ''}
              onChange={(e) => onChangeField('bloodGroup', e.target.value)}
              aria-label="Patient Blood Group"
            >
              <option value="">Unknown / Not Provided</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          <div className="form-text small text-muted">Clinical blood type for patient medical record.</div>
        </div>

        {/* Date of Birth */}
        <div className="col-12 col-sm-6 col-md-6">
          <label htmlFor="patient-dob" className="hospital-form-label mb-1">
            Date of Birth <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-dob"
              type="date"
              className="form-control bg-transparent border-0 shadow-none"
              value={patient.dateOfBirth || ''}
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
        <div className="col-12 col-sm-6 col-md-6">
          <label htmlFor="patient-gender" className="hospital-form-label mb-1">
            Gender <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <select
              id="patient-gender"
              className="form-select bg-transparent border-0 shadow-none"
              value={patient.gender || 'Female'}
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
            {isSomeoneElse ? "Patient Contact Phone" : "Mobile Number"} <span className="text-danger">*</span>
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-mobile"
              type="tel"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder="e.g. 9876543210"
              value={patient.mobile || ''}
              onChange={(e) => onChangeField('mobile', e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.mobile}
            />
          </div>
          <div className="form-text small text-muted">
            {isSomeoneElse ? "Primary contact number for this patient or accompanying guardian." : "10-digit primary mobile number for appointment notifications."}
          </div>
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
            Email Address {isSomeoneElse ? <span className="text-muted">(Optional for dependent)</span> : <span className="text-danger">*</span>}
          </label>
          <div className="neu-inset rounded-3 p-1">
            <input
              id="patient-email"
              type="email"
              className="form-control bg-transparent border-0 shadow-none"
              placeholder={isSomeoneElse ? "Optional for dependent" : "e.g. ramesh.sharma@example.com"}
              value={patient.email || ''}
              onChange={(e) => onChangeField('email', e.target.value)}
              aria-required={!isSomeoneElse}
              aria-invalid={!!errors.email}
            />
          </div>
          <div className="form-text small text-muted">
            {isSomeoneElse ? "If left blank, notifications will be routed to your account email." : "For digital consultation slips and scheduling updates."}
          </div>
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
              value={patient.address || ''}
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
              value={patient.reasonForVisit || ''}
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
              value={patient.emergencyContact || ''}
              onChange={(e) => onChangeField('emergencyContact', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientDetailsForm;
