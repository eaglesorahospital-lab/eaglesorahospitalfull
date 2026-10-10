import React from 'react';
import Button from '../common/Button';

/**
 * Hospital Platform — Booking Review Component (Phase 6)
 * Pre-submission review displaying doctor, appointment timing, and patient information.
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
    <div className="hospital-card p-4 bg-white mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
        <h3 className="h5 fw-bold text-primary mb-0">Review Consultation Details</h3>
        <Button variant="outline" size="sm" onClick={onEditDetails}>
          Edit Details
        </Button>
      </div>

      <div className="row g-4">
        {/* Doctor Affiliation Section */}
        <div className="col-12 col-md-4">
          <div className="p-3 bg-light border border-light rounded h-100">
            <div className="text-uppercase small fw-bold text-primary mb-2">Medical Consultant</div>
            <div className="fw-bold text-dark fs-6">{doctor.name}</div>
            <div className="small text-muted">{doctor.specialty}</div>
            <div className="small text-muted mb-2">{doctor.departmentName || doctor.department}</div>
            <div className="small border-top pt-2">
              <span className="fw-semibold text-dark">OPD Room: </span>
              <span className="text-muted">{doctor.consultation?.location || 'Clinical OPD'}</span>
            </div>
          </div>
        </div>

        {/* Appointment Logistics Section */}
        <div className="col-12 col-md-4">
          <div className="p-3 bg-light border border-light rounded h-100">
            <div className="text-uppercase small fw-bold text-primary mb-2">Appointment Schedule</div>
            <div className="fw-bold text-dark fs-6">
              {selectedDayName}, {selectedDate}
            </div>
            <div className="fw-bold text-primary my-1">{selectedTime}</div>
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
          <div className="p-3 bg-light border border-light rounded h-100">
            <div className="text-uppercase small fw-bold text-primary mb-2">Patient Details</div>
            <div className="fw-bold text-dark">{patient.fullName}</div>
            <div className="small text-muted">
              {patient.gender} &bull; DOB: {patient.dateOfBirth}
            </div>
            <div className="small text-muted">Phone: {patient.mobile}</div>
            <div className="small text-muted">Email: {patient.email}</div>
          </div>
        </div>

        {/* Clinical Reason & Emergency Contact */}
        <div className="col-12">
          <div className="p-3 bg-light border border-light rounded">
            <div className="small fw-semibold text-dark mb-1">Reason for Consultation:</div>
            <div className="small text-muted mb-2">{patient.reasonForVisit}</div>

            {patient.emergencyContact && (
              <div className="small pt-2 border-top">
                <span className="fw-semibold text-dark">Emergency Contact: </span>
                <span className="text-muted">{patient.emergencyContact}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Call to Action */}
      <div className="mt-4 pt-3 border-top border-light d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
        <div className="small text-muted">
          Please verify that all clinical details and contact numbers are accurate before proceeding.
        </div>

        <div className="d-flex gap-2">
          <Button variant="outline" size="md" onClick={onEditDetails} disabled={isSubmitting}>
            Back / Edit
          </Button>
          <Button variant="secondary" size="md" onClick={onConfirmBooking} disabled={isSubmitting}>
            {isSubmitting ? 'Confirming...' : 'Confirm Appointment Request'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BookingReview;
