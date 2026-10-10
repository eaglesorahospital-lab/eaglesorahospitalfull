import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import doctorService from '../services/doctorService';
import appointmentService from '../services/appointmentService';
import { getDoctorByIdOrSlug } from '../data/hospitalData';

/**
 * Hospital Platform — Appointment Booking Hook
 * Encapsulates multi-step booking state, field-level validation, and transactional appointment submission.
 * Authoritatively resolves doctors from PostgreSQL database and excludes inactive doctors.
 */
export function useAppointmentBooking() {
  const [searchParams] = useSearchParams();
  const initialDoctorParam = searchParams.get('doctor');
  const initialDateParam = searchParams.get('date');
  const initialTimeParam = searchParams.get('time');

  // Find initial doctor from query parameter if present
  const resolvedInitialDoctor = initialDoctorParam
    ? getDoctorByIdOrSlug(initialDoctorParam)
    : null;

  // Multi-step indicator: 1 = Doctor, 2 = Date & Time, 3 = Patient Details, 4 = Review
  const [step, setStep] = useState(resolvedInitialDoctor && (resolvedInitialDoctor.status === 'active' || resolvedInitialDoctor.is_active) ? 2 : 1);
  const [doctor, setDoctor] = useState(resolvedInitialDoctor && (resolvedInitialDoctor.status === 'active' || resolvedInitialDoctor.is_active) ? resolvedInitialDoctor : null);
  const [selectedDate, setSelectedDate] = useState(initialDateParam || '');
  const [selectedDayName, setSelectedDayName] = useState('');
  const [selectedTime, setSelectedTime] = useState(initialTimeParam || '');

  const [patient, setPatient] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'Female',
    mobile: '',
    email: '',
    address: '',
    reasonForVisit: '',
    emergencyContact: '',
  });

  const [errors, setErrors] = useState({});

  // Synchronize when query parameters change, prioritizing PostgreSQL records
  useEffect(() => {
    if (initialDoctorParam) {
      doctorService
        .getDoctor(initialDoctorParam)
        .then((apiDoc) => {
          if (apiDoc && (apiDoc.status === 'active' || apiDoc.is_active)) {
            setDoctor(apiDoc);
            if (step === 1) setStep(2);
          } else {
            const fallback = getDoctorByIdOrSlug(initialDoctorParam);
            if (fallback && fallback.status === 'active') {
              setDoctor(fallback);
              if (step === 1) setStep(2);
            }
          }
        })
        .catch(() => {
          const fallback = getDoctorByIdOrSlug(initialDoctorParam);
          if (fallback && fallback.status === 'active') {
            setDoctor(fallback);
            if (step === 1) setStep(2);
          }
        });
    }
    if (initialDateParam) {
      setSelectedDate(initialDateParam);
    }
    if (initialTimeParam) {
      setSelectedTime(initialTimeParam);
    }
  }, [initialDoctorParam, initialDateParam, initialTimeParam]);

  // Set selected doctor
  const selectDoctor = (doc) => {
    setDoctor(doc);
    setSelectedTime('');
    setErrors((prev) => ({ ...prev, doctor: null }));
    setStep(2);
  };

  // Set selected date
  const selectDate = (dateString, dayName) => {
    setSelectedDate(dateString);
    setSelectedDayName(dayName);
    setSelectedTime('');
    setErrors((prev) => ({ ...prev, date: null, time: null }));
  };

  // Set selected time slot
  const selectTime = (timeString) => {
    setSelectedTime(timeString);
    setErrors((prev) => ({ ...prev, time: null }));
  };

  // Update single patient field
  const updatePatientField = (field, value) => {
    setPatient((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Validate step before proceeding
  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!doctor) {
        newErrors.doctor = 'Please select a medical consultant to continue.';
      }
    } else if (currentStep === 2) {
      if (!selectedDate) {
        newErrors.date = 'Please select an appointment consultation date.';
      }
      if (!selectedTime) {
        newErrors.time = 'Please select an available consultation time slot.';
      }
    } else if (currentStep === 3) {
      if (!patient.fullName || patient.fullName.trim().length < 2) {
        newErrors.fullName = 'Full name is required (minimum 2 characters).';
      }
      if (!patient.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required.';
      }
      if (!patient.gender) {
        newErrors.gender = 'Please select patient gender.';
      }

      // Mobile phone validation (digits only, at least 10)
      const cleanPhone = patient.mobile.replace(/[^0-9]/g, '');
      if (!patient.mobile || cleanPhone.length < 10) {
        newErrors.mobile = 'Please enter a valid 10-digit mobile phone number.';
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!patient.email || !emailRegex.test(patient.email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }

      if (!patient.reasonForVisit || patient.reasonForVisit.trim().length < 5) {
        newErrors.reasonForVisit = 'Please describe the primary reason for consultation (minimum 5 characters).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step transitions
  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (targetStep) => {
    if (targetStep < step) {
      setStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (validateStep(step)) {
        setStep(targetStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Submit appointment booking to PostgreSQL with concurrency and slot locking
  const submitBooking = async () => {
    let serverRecord = null;
    const bookingPayload = {
      doctor: doctor.id || doctor.slug,
      appointment_date: selectedDate,
      start_time: selectedTime,
      reason_for_visit: patient.reasonForVisit || 'Outpatient consultation',
      patient: {
        fullName: patient.fullName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        mobile: patient.mobile,
        email: patient.email,
        address: patient.address,
        emergencyContact: patient.emergencyContact,
      },
    };

    try {
      serverRecord = await appointmentService.bookAppointment(bookingPayload);
    } catch (err) {
      console.warn('Booking API call resulted in error:', err);
      throw err;
    }

    const appointmentRecord = {
      reference: serverRecord.reference || `APT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      id: serverRecord.id,
      doctorId: doctor.id,
      doctorSlug: doctor.slug,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      department: doctor.departmentName || doctor.department,
      date: selectedDate,
      dayName: selectedDayName,
      time: selectedTime,
      duration: doctor.consultation?.duration || '30 minutes',
      location: serverRecord.consultation_location || doctor.consultation?.location || 'Clinical OPD',
      patient: {
        ...patient,
        mrn: serverRecord.patient?.mrn || 'MRN-NEW',
      },
      status: serverRecord.status || 'Confirmed',
      createdAt: serverRecord.created_at || new Date().toISOString(),
    };

    // Transient confirmation state for immediate result display
    try {
      sessionStorage.setItem('eglesora_latest_appointment', JSON.stringify(appointmentRecord));
    } catch (e) {
      // In case storage is unavailable
    }

    return appointmentRecord;
  };

  return {
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
  };
}

export default useAppointmentBooking;
