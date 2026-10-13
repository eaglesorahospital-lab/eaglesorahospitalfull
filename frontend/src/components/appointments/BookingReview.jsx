import React from 'react';
import { Stethoscope, Calendar, Clock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Hospital Platform — Booking Review Component
 * Pre-submission review with Neumorphic styling.
 */
export function BookingReview({
  doctor,
  selectedDate,
  selectedDayName,
  selectedTime,
  patient,
  isSubmitting = false,
  onEditDetails,
  onConfirmBooking,
}) {
  return (
    <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
        <h3 className="h5 fw-bold text-primary mb-0 d-flex align-items-center gap-2">
          <CheckCircle2 size={18} />
          <span>Review Consultation Details</span>
        </h3>
        <button type="button" className="neu-btn neu-btn-outline neu-btn-sm" onClick={onEditDetails}>
          Edit Details
        </button>
      </div>

      <div className="row g-4">
        {/* Doctor Affiliation Section */}
        <div className="col-12 col-md-4">
          <div className="neu-inset p-3 rounded-4 h-100">
            <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2">Medical Consultant</div>
            <div className="fw-bold text-body fs-6">{doctor.name}</div>
            <div className="small text-muted">{doctor.specialty}</div>
            <div className="small text-muted mb-2">{doctor.departmentName || doctor.department}</div>
            <div className="small border-top pt-2">
              <strong className="text-body">OPD Room: </strong>
              <span className="text-muted">{doctor.consultation?.location || 'Clinical OPD'}</span>
            </div>
          </div>
        </div>

        {/* Appointment Logistics Section */}
        <div className="col-12 col-md-4">
          <div className="neu-inset p-3 rounded-4 h-100">
            <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2">Appointment Schedule</div>
            <div className="fw-bold text-body fs-6">
              {selectedDayName}, {selectedDate}
            </div>
            <div className="fw-bold text-primary my-1 fs-5">{selectedTime}</div>
            <div className="small text-muted">
              Duration: {doctor.consultation?.duration || '30 minutes'}
            </div>
            <div className="small text-muted">
              Type: {doctor.consultation?.type || 'In-person Consultation'}
            </div>
          </div>
        </div>

        {/* Patient Summary Section */}
        <div className="col-12 col-md-4">
          <div className="neu-inset p-3 rounded-4 h-100">
            <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2">Patient Details</div>
            <div className="fw-bold text-body">{patient.fullName}</div>
            <div className="small text-muted">
              {patient.gender} &bull; DOB: {patient.dateOfBirth}
            </div>
            <div className="small text-muted">Phone: {patient.mobile}</div>
            <div className="small text-muted">Email: {patient.email}</div>
          </div>
        </div>

        {/* Clinical Reason & Emergency Contact */}
        <div className="col-12">
          <div className="neu-inset p-3 rounded-4">
            <div className="small fw-semibold text-body mb-1">Reason for Consultation:</div>
            <div className="small text-muted mb-2">{patient.reasonForVisit}</div>

            {patient.emergencyContact && (
              <div className="small pt-2 border-top">
                <strong className="text-body">Emergency Contact: </strong>
                <span className="text-muted">{patient.emergencyContact}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Call to Action */}
      <div className="mt-4 pt-3 border-top d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
        <div className="small text-muted">
          Please verify that all clinical details and contact numbers are accurate before proceeding.
        </div>

        <div className="d-flex gap-2">
          <button type="button" className="neu-btn neu-btn-outline" onClick={onEditDetails} disabled={isSubmitting}>
            Back / Edit
          </button>
          <button type="button" className="neu-btn neu-btn-primary" onClick={onConfirmBooking} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="d-flex align-items-center gap-1">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span>Confirming...</span>
              </span>
            ) : (
              'Confirm Appointment Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingReview;
