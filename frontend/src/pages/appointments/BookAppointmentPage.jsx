import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import SEO from '../../components/common/SEO';
import useAppointmentBooking from '../../hooks/useAppointmentBooking';
import BookingStepIndicator from '../../components/appointments/BookingStepIndicator';
import DoctorBookingSummary from '../../components/appointments/DoctorBookingSummary';
import DateSlotPicker from '../../components/appointments/DateSlotPicker';
import PatientDetailsForm from '../../components/appointments/PatientDetailsForm';
import BookingReview from '../../components/appointments/BookingReview';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';

/**
 * Hospital Platform — Book Appointment Page
 * Complete patient booking flow in Neumorphism / Soft UI design.
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
      const refQuery = record?.reference ? `?reference=${encodeURIComponent(record.reference)}` : '';
      navigate(`/appointments/result${refQuery}`, { state: { appointment: record } });
    } catch (err) {
      setSubmitError(err.message || 'Appointment confirmation failed. The slot may have been booked by another patient. Please choose another slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="book-appointment-page py-4">
      <SEO
        title="Book an Appointment | EgleSora Hospital"
        description="Schedule an outpatient consultation with expert physicians and surgeons across our clinical departments at EgleSora Hospital."
        canonicalUrl="/appointments/book"
      />
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
                <button type="button" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1" onClick={nextStep}>
                  <span>Continue to Date & Time</span>
                  <ArrowRight size={15} />
                </button>
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
              <button type="button" className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-1" onClick={() => goToStep(1)}>
                <ArrowLeft size={15} />
                <span>Back to Doctor</span>
              </button>
              <button type="button" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1" onClick={nextStep}>
                <span>Continue to Patient Details</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PATIENT INTAKE DETAILS */}
        {step === 3 && doctor && (
          <div>
            {/* Quick appointment summary pill */}
            <div className="p-3 mb-4 neu-raised neu-surface rounded-4 d-flex flex-wrap justify-content-between align-items-center gap-2 small">
              <div>
                <strong className="text-body">Physician:</strong> {doctor.name} ({doctor.specialty})
              </div>
              <div>
                <strong className="text-body">Selected Slot:</strong> {selectedDayName}, {selectedDate} at {selectedTime}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-primary text-decoration-none p-0 fw-semibold"
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
              <button type="button" className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-1" onClick={prevStep}>
                <ArrowLeft size={15} />
                <span>Back to Date & Time</span>
              </button>
              <button type="button" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1" onClick={nextStep}>
                <span>Review Appointment</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRMATION */}
        {step === 4 && doctor && (
          <div className="mb-5">
            {submitError && (
              <div className="neu-inset p-3 mb-3 rounded-4 border-start border-4 border-danger small text-danger d-flex justify-content-between align-items-center" role="alert">
                <span className="d-flex align-items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{submitError}</span>
                </span>
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
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
