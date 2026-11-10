import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import doctorService from '../services/doctorService';
import appointmentService from '../services/appointmentService';
import { patientService } from '../services/patientService';

const INTAKE_STORAGE_KEY = 'eglesora_booking_intake';

function getInitialPatientState() {
  try {
    const saved = sessionStorage.getItem(INTAKE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          bookingFor: parsed.bookingFor || 'MYSELF',
          relationshipToPatient: parsed.relationshipToPatient || 'Self',
          dependentId: parsed.dependentId || null,
          fullName: parsed.fullName || '',
          dateOfBirth: parsed.dateOfBirth || '',
          gender: parsed.gender || 'Female',
          bloodGroup: parsed.bloodGroup || '',
          mobile: parsed.mobile || '',
          email: parsed.email || '',
          address: parsed.address || '',
          reasonForVisit: parsed.reasonForVisit || '',
          emergencyContact: parsed.emergencyContact || '',
        };
      }
    }
  } catch {
    // Storage access issue or JSON error
  }
  return {
    bookingFor: 'MYSELF',
    relationshipToPatient: 'Self',
    dependentId: null,
    fullName: '',
    dateOfBirth: '',
    gender: 'Female',
    bloodGroup: '',
    mobile: '',
    email: '',
    address: '',
    reasonForVisit: '',
    emergencyContact: '',
  };
}

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

  // Multi-step indicator: 1 = Doctor, 2 = Date & Time, 3 = Patient Details, 4 = Review
  const [step, setStep] = useState(1);
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDateParam || '');
  const [selectedDayName, setSelectedDayName] = useState('');
  const [selectedTime, setSelectedTime] = useState(initialTimeParam || '');

  const [patient, setPatient] = useState(getInitialPatientState);
  const [selfProfile, setSelfProfile] = useState(null);

  const [errors, setErrors] = useState({});

  // Synchronize when query parameters change, prioritizing PostgreSQL records
  useEffect(() => {
    if (initialDoctorParam) {
      doctorService
        .getDoctor(initialDoctorParam)
        .then((apiDoc) => {
          if (apiDoc && (apiDoc.status === 'active' || apiDoc.is_active)) {
            setDoctor(apiDoc);
            setStep((s) => (s === 1 ? 2 : s));
          } else {
            setDoctor(null);
          }
        })
        .catch(() => {
          setDoctor(null);
        });
    }
    if (initialDateParam) {
      setSelectedDate(initialDateParam);
    }
    if (initialTimeParam) {
      setSelectedTime(initialTimeParam);
    }
  }, [initialDoctorParam, initialDateParam, initialTimeParam]);

  // Pre-fill profile data for authenticated outpatient accounts
  useEffect(() => {
    let isMounted = true;
    patientService
      .getMyProfile()
      .then((profile) => {
        if (!isMounted || !profile) return;
        const normalizedSelf = {
          fullName: profile.fullName || profile.name || '',
          dateOfBirth: profile.dateOfBirth || profile.date_of_birth || '',
          gender: profile.gender || 'Female',
          bloodGroup: profile.bloodGroup || profile.blood_group || '',
          mobile: profile.mobile || profile.contact || profile.phone || '',
          email: profile.email || '',
          address: profile.address || '',
          emergencyContact: profile.emergencyContact || profile.emergency_contact || '',
        };
        setSelfProfile(normalizedSelf);
        setPatient((prev) => {
          if (prev.bookingFor === 'SOMEONE_ELSE') {
            return prev;
          }
          const updated = {
            ...prev,
            fullName: prev.fullName || normalizedSelf.fullName,
            dateOfBirth: prev.dateOfBirth || normalizedSelf.dateOfBirth,
            gender: prev.gender && prev.gender !== 'Female' ? prev.gender : normalizedSelf.gender,
            bloodGroup: prev.bloodGroup || normalizedSelf.bloodGroup,
            mobile: prev.mobile || normalizedSelf.mobile,
            email: prev.email || normalizedSelf.email,
            address: prev.address || normalizedSelf.address,
            emergencyContact: prev.emergencyContact || normalizedSelf.emergencyContact,
          };
          try {
            sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // Storage quota or restricted context
          }
          return updated;
        });
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Switch between "Book for Myself" and "Book for Someone Else"
  const setBookingType = (type) => {
    if (type === 'MYSELF') {
      setPatient((prev) => {
        const updated = {
          ...prev,
          bookingFor: 'MYSELF',
          relationshipToPatient: 'Self',
          dependentId: null,
          fullName: selfProfile?.fullName || '',
          dateOfBirth: selfProfile?.dateOfBirth || '',
          gender: selfProfile?.gender || 'Female',
          bloodGroup: selfProfile?.bloodGroup || '',
          mobile: selfProfile?.mobile || '',
          email: selfProfile?.email || '',
          address: selfProfile?.address || '',
          emergencyContact: selfProfile?.emergencyContact || '',
        };
        try {
          sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } else {
      setPatient((prev) => {
        const updated = {
          ...prev,
          bookingFor: 'SOMEONE_ELSE',
          relationshipToPatient: prev.relationshipToPatient && prev.relationshipToPatient !== 'Self' ? prev.relationshipToPatient : 'Parent',
          dependentId: null,
          fullName: '',
          dateOfBirth: '',
          gender: 'Female',
          bloodGroup: '',
          mobile: '',
          email: '',
          address: '',
          emergencyContact: selfProfile?.mobile || prev.emergencyContact || '',
        };
        try {
          sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
    setErrors({});
  };

  // Select an existing authorized dependent
  const selectDependent = (dep) => {
    if (!dep) return;
    setPatient((prev) => {
      const updated = {
        ...prev,
        bookingFor: 'SOMEONE_ELSE',
        dependentId: dep.id,
        fullName: dep.fullName || dep.name || `${dep.first_name || ''} ${dep.last_name || ''}`.trim(),
        dateOfBirth: dep.dateOfBirth || dep.date_of_birth || '',
        gender: dep.gender || 'Female',
        bloodGroup: dep.bloodGroup || dep.blood_group || '',
        mobile: dep.mobile || dep.phone || dep.contact || '',
        email: dep.email || '',
        address: dep.address || '',
        emergencyContact: dep.emergencyContact || dep.emergency_contact || selfProfile?.mobile || '',
      };
      try {
        sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setErrors({});
  };

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
    setPatient((prev) => {
      const updated = { ...prev, [field]: value };
      try {
        sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage quota or restricted context
      }
      return updated;
    });
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

      // Email validation: mandatory for Myself; optional for Someone Else (dependents)
      if (patient.bookingFor === 'SOMEONE_ELSE') {
        if (patient.email && patient.email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(patient.email.trim())) {
            newErrors.email = 'Please enter a valid email address or leave blank for dependent.';
          }
        }
        if (!patient.relationshipToPatient || patient.relationshipToPatient === 'Self') {
          newErrors.relationshipToPatient = 'Please select relationship to patient (e.g. Parent, Spouse, Child, Guardian, Other).';
        }
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!patient.email || !emailRegex.test(patient.email.trim())) {
          newErrors.email = 'Please enter a valid email address.';
        }
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
      booking_for: patient.bookingFor || 'MYSELF',
      relationship_to_patient: patient.bookingFor === 'SOMEONE_ELSE' ? (patient.relationshipToPatient || 'Other') : 'Self',
      patient_id: patient.dependentId || undefined,
      patient: {
        fullName: patient.fullName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup || '',
        blood_group: patient.bloodGroup || '',
        mobile: patient.mobile,
        email: patient.email || '',
        address: patient.address || '',
        emergencyContact: patient.emergencyContact || '',
        reasonForVisit: patient.reasonForVisit || 'Outpatient consultation',
      },
    };

    try {
      serverRecord = await appointmentService.bookAppointment(bookingPayload);
      try {
        sessionStorage.removeItem(INTAKE_STORAGE_KEY);
      } catch {
        // Storage cleanup
      }
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
      relationshipToPatient: serverRecord.relationshipToPatient || (patient.bookingFor === 'SOMEONE_ELSE' ? patient.relationshipToPatient : 'Self'),
      bookedBy: serverRecord.bookedBy || null,
      bookingFor: patient.bookingFor || 'MYSELF',
      patient: {
        ...patient,
        mrn: serverRecord.patient?.mrn || 'MRN-NEW',
        bloodGroup: serverRecord.patient?.blood_group || serverRecord.patient?.bloodGroup || patient.bloodGroup || '',
      },
      status: serverRecord.status || 'REQUESTED',
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
    selfProfile,
    selectDoctor,
    selectDate,
    selectTime,
    updatePatientField,
    setBookingType,
    selectDependent,
    nextStep,
    prevStep,
    goToStep,
    submitBooking,
  };
}

export default useAppointmentBooking;
