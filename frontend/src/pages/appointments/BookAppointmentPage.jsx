import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import useAppointmentBooking from '../../hooks/useAppointmentBooking';
import BookingStepIndicator from '../../components/appointments/BookingStepIndicator';
import DoctorBookingSummary from '../../components/appointments/DoctorBookingSummary';
import DateSlotPicker from '../../components/appointments/DateSlotPicker';
import PatientDetailsForm from '../../components/appointments/PatientDetailsForm';
import BookingReview from '../../components/appointments/BookingReview';

/**
 * Hospital Platform — Book Appointment Page (Phase 6 Complete Flow)
 * Implements the full patient journey: Doctor -> Date & Time -> Patient Details -> Review -> Confirmation.
 * Strictly frontend-only with centralized local mock data.
 */
export function BookAppointmentPage() {
  const navigate = useNavigate();

  const {
    step,
    doctor,
    selectedDate,
    selectedDayName,
    selectedTime,
    patient,
    errors,
    selectDoctor,
    selectDate,
    selectTime,
    updatePatientField,
    nextStep,
    prevStep,
    goToStep,
    submitBooking,
  } = useAppointmentBooking();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Appointments' },
    { label: 'Book Appointment' },
  ];

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const record = await submitBooking();
      navigate('/appointments/result', { state: { appointment: record } });
    } catch (err) {
      setSubmitError(err.message || 'Appointment confirmation failed. The slot may have been booked by another patient. Please choose another slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="book-appointment-page">
      <Container>
        <PageHeader
          title="Schedule an Outpatient Consultation"
          description="Book an in-person clinical consultation with our consultant physicians and surgeons."
          breadcrumbs={breadcrumbs}
        />

        {/* Step Indicator */}
        <BookingStepIndicator currentStep={step} onStepClick={goToStep} />

        {/* STEP 1: DOCTOR SELECTION */}
        {step === 1 && (
          <div>
            <DoctorBookingSummary
              doctor={doctor}
              onSelectDoctor={selectDoctor}
              onChangeDoctor={() => selectDoctor(null)}
            />
            {doctor && (
              <div className="d-flex justify-content-end mb-5">
                <Button variant="primary" size="md" onClick={nextStep}>
                  Continue to Date & Time &rarr;
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: DATE & TIME SELECTION */}
        {step === 2 && doctor && (
          <div>
            <DoctorBookingSummary
              doctor={doctor}
              onSelectDoctor={selectDoctor}
              onChangeDoctor={() => goToStep(1)}
            />

            <DateSlotPicker
              doctor={doctor}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={selectDate}
              onSelectTime={selectTime}
              errors={errors}
            />

            <div className="d-flex justify-content-between align-items-center mb-5">
              <Button variant="outline" size="md" onClick={() => goToStep(1)}>
                &larr; Back to Doctor
              </Button>
              <Button variant="primary" size="md" onClick={nextStep}>
                Continue to Patient Details &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PATIENT INTAKE DETAILS */}
        {step === 3 && doctor && (
          <div>
            {/* Quick appointment summary pill */}
            <div className="p-3 mb-4 bg-light border border-light rounded d-flex flex-wrap justify-content-between align-items-center gap-2 small">
              <div>
                <strong>Physician:</strong> {doctor.name} ({doctor.specialty})
              </div>
              <div>
                <strong>Selected Slot:</strong> {selectedDayName}, {selectedDate} at {selectedTime}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none p-0"
                onClick={() => goToStep(2)}
              >
                Change Date / Time
              </button>
            </div>

            <PatientDetailsForm
              patient={patient}
              onChangeField={updatePatientField}
              errors={errors}
            />

            <div className="d-flex justify-content-between align-items-center mb-5">
              <Button variant="outline" size="md" onClick={prevStep}>
                &larr; Back to Date & Time
              </Button>
              <Button variant="primary" size="md" onClick={nextStep}>
                Review Appointment &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRMATION */}
        {step === 4 && doctor && (
          <div className="mb-5">
            {submitError && (
              <div className="alert alert-danger py-2 px-3 mb-3 small d-flex justify-content-between align-items-center" role="alert">
                <span>{submitError}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => goToStep(2)}
                >
                  Pick Another Slot
                </button>
              </div>
            )}
            <BookingReview
              doctor={doctor}
              selectedDate={selectedDate}
              selectedDayName={selectedDayName}
              selectedTime={selectedTime}
              patient={patient}
              isSubmitting={isSubmitting}
              onEditDetails={() => goToStep(3)}
              onConfirmBooking={handleConfirm}
            />
          </div>
        )}
      </Container>
    </div>
  );
}

export default BookAppointmentPage;
