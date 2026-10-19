import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import SEO from '../../components/common/SEO';
import doctorService from '../../services/doctorService';
import scheduleService from '../../services/scheduleService';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  RotateCw,
  Building2,
} from 'lucide-react';

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return timeStr;
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Hospital Platform — Doctor Availability & OPD Schedule Page
 * Patient-facing presentation of weekly clinical roster with Neumorphism styling.
 */
export function DoctorAvailabilityPage() {
  const { slug, id } = useParams();
  const identifier = slug || id;

  const [doctor, setDoctor] = useState(null);
  const [dbSchedules, setDbSchedules] = useState([]);
  const [rangeDays, setRangeDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState('');
  const [slotDuration, setSlotDuration] = useState(30);

  const [isLoadingDoctor, setIsLoadingDoctor] = useState(true);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [dayNotice, setDayNotice] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingDoctor(true);
    setApiError(null);

    doctorService
      .getDoctor(identifier)
      .then((data) => {
        if (!isMounted) return;
        setDoctor(data);
      })
      .catch((err) => {
        console.warn(`Could not fetch doctor ${identifier}:`, err);
        if (isMounted) setDoctor(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDoctor(false);
      });

    scheduleService
      .getDoctorSchedules(identifier)
      .then((schedules) => {
        if (!isMounted) return;
        if (Array.isArray(schedules) && schedules.length > 0) {
          setDbSchedules(schedules);
        }
      })
      .catch((err) => console.warn(`Could not fetch schedules for ${identifier}:`, err));

    return () => {
      isMounted = false;
    };
  }, [identifier]);

  const targetDateRange = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateString = getLocalDateString(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ dateString, dayName, displayDate });
    }
    return days;
  }, []);

  const startDateStr = targetDateRange[0]?.dateString;
  const endDateStr = targetDateRange[targetDateRange.length - 1]?.dateString;

  const fetchAvailabilityRange = useCallback(async () => {
    if (!doctor) return;
    setIsLoadingRange(true);
    setApiError(null);

    const docIdentifier = doctor.slug || doctor.id;
    try {
      const data = await scheduleService.getAvailabilityRange(docIdentifier, startDateStr, endDateStr);
      if (Array.isArray(data.dates) && data.dates.length > 0) {
        const mapped = targetDateRange.map((localDay) => {
          const apiDay = data.dates.find((d) => d.date === localDay.dateString);
          if (apiDay) {
            return {
              dateString: localDay.dateString,
              dayName: localDay.dayName,
              displayDate: localDay.displayDate,
              status: apiDay.status,
              statusType: apiDay.status_type,
              isSelectable: Boolean(apiDay.is_selectable),
              openSlotsCount: apiDay.open_slots_count || 0,
              reason: apiDay.reason || null,
              slots: apiDay.available_slots || [],
            };
          }
          return {
            dateString: localDay.dateString,
            dayName: localDay.dayName,
            displayDate: localDay.displayDate,
            status: 'Clinic Closed',
            statusType: 'closed',
            isSelectable: false,
            openSlotsCount: 0,
            reason: 'No schedule configured for this day',
            slots: [],
          };
        });
        setRangeDays(mapped);

        setSelectedDate((prevDate) => {
          const exists = mapped.some((d) => d.dateString === prevDate);
          if (exists) return prevDate;
          const firstOpen = mapped.find((d) => d.isSelectable);
          return firstOpen ? firstOpen.dateString : mapped[0]?.dateString || '';
        });
      }
    } catch (err) {
      console.warn('Could not fetch availability range from backend:', err);
      setApiError('Unable to load clinical schedule from server. Please retry.');
    } finally {
      setIsLoadingRange(false);
    }
  }, [doctor, startDateStr, endDateStr, targetDateRange]);

  useEffect(() => {
    if (doctor) {
      fetchAvailabilityRange();
    }
  }, [doctor, fetchAvailabilityRange]);

  useEffect(() => {
    if (!doctor || !selectedDate) return;
    let isMounted = true;
    setIsLoadingSlots(true);
    setSelectedSlotTime('');
    setDayNotice(null);

    const docIdentifier = doctor.slug || doctor.id;
    scheduleService
      .getAvailability(docIdentifier, selectedDate)
      .then((data) => {
        if (!isMounted) return;
        setSlotDuration(data.slot_duration_minutes || 30);
        setSlots(data.available_slots || []);
        setDayNotice(data.reason || null);
      })
      .catch((err) => {
        console.warn(`Could not fetch slots for ${selectedDate}:`, err);
        if (isMounted) {
          const currentDayObj = rangeDays.find((d) => d.dateString === selectedDate);
          setSlots(currentDayObj?.slots || []);
          setDayNotice(currentDayObj?.reason || null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [doctor, selectedDate, rangeDays]);

  if (isLoadingDoctor) {
    return (
      <Container>
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading doctor schedule...</span>
          </div>
          <p className="mt-3 text-muted">Retrieving doctor roster and OPD schedule from hospital database...</p>
        </div>
      </Container>
    );
  }

  if (!doctor) {
    const errorBreadcrumbs = [
      { label: 'Home', to: '/' },
      { label: 'Doctors', to: '/doctors' },
      { label: 'Doctor Not Found' },
    ];

    return (
      <Container className="py-4">
        <SEO
          title="Doctor Schedule Not Found | EgleSora Hospital"
          description="The requested medical specialist schedule could not be located in our directory."
          noIndex={true}
        />
        <PageHeader
          title="Doctor Not Found"
          description="The requested medical specialist schedule could not be located."
          breadcrumbs={errorBreadcrumbs}
        />
        <div className="py-4">
          <EmptyState
            title="Doctor Profile Not Found"
            message={`No physician schedule was found for identifier "${identifier}".`}
            action={
              <Link to="/doctors" className="neu-btn neu-btn-primary">
                Return to Doctor Directory
              </Link>
            }
          />
        </div>
      </Container>
    );
  }

  const deptName = doctor.departmentName || doctor.department_name || doctor.department || 'Clinical Department';
  const isActive = doctor.is_active !== false && String(doctor.status).toLowerCase() !== 'inactive';
  const doctorIdentifier = doctor.slug || doctor.id || identifier;

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Doctors', to: '/doctors' },
    { label: doctor.name, to: `/doctors/${doctorIdentifier}` },
    { label: 'OPD Schedule & Slots' },
  ];

  const selectedDayObj = rangeDays.find((d) => d.dateString === selectedDate) || {
    dateString: selectedDate,
    dayName: '',
    displayDate: selectedDate,
    status: 'Available',
    statusType: 'available',
    isSelectable: true,
  };

  const isClosedDay = selectedDayObj.statusType === 'closed' || !selectedDayObj.isSelectable;
  const isLeaveDay = selectedDayObj.statusType === 'leave';

  const weeklyShiftMap = {};
  dbSchedules.forEach((s) => {
    weeklyShiftMap[s.day_of_week] = s;
  });

  return (
    <div className="doctor-availability-page py-4">
      <SEO
        title={`Outpatient Schedule: ${doctor.name} | EgleSora Hospital`}
        description={`Weekly OPD consultation slots, timings, and availability for ${doctor.name} (${doctor.specialty || 'Specialist'}) at EgleSora Hospital.`}
        canonicalUrl={`/doctors/${doctorIdentifier}/availability`}
      />
      <Container>
        {/* 1. Page Header */}
        <PageHeader
          title={`Outpatient Schedule: ${doctor.name}`}
          description={`${doctor.specialty || 'Specialist'} — ${deptName}`}
          breadcrumbs={breadcrumbs}
        >
          <div className="d-flex flex-wrap gap-2">
            <Link to={`/doctors/${doctorIdentifier}`} className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-1">
              <User size={14} />
              <span>Full Profile</span>
            </Link>
            {isActive ? (
              <Link to={`/appointments/book?doctor=${doctorIdentifier}`} className="neu-btn neu-btn-primary neu-btn-sm d-inline-flex align-items-center gap-1">
                <Calendar size={14} />
                <span>Book Consultation</span>
              </Link>
            ) : (
              <span className="neu-badge neu-badge-neutral px-3 py-1">
                Consultant Inactive
              </span>
            )}
          </div>
        </PageHeader>

        {/* 2. Doctor Info Card */}
        <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-md-8">
              <div className="d-flex align-items-center gap-3">
                <div className="doctor-avatar-box neu-inset flex-shrink-0" aria-hidden="true">
                  {doctor.photo || doctor.image_url ? (
                    <img src={doctor.photo || doctor.image_url} alt={doctor.name} />
                  ) : (
                    <span className="fw-bold text-primary">{doctor.initials || 'DR'}</span>
                  )}
                </div>
                <div>
                  <h2 className="h5 fw-bold text-body mb-1">{doctor.name}</h2>
                  <div className="small text-muted">
                    {doctor.specialty} &bull; {deptName}
                  </div>
                  <div className="small text-muted mt-1">
                    Location: <strong className="text-body">{doctor.consultation_location || 'Clinical OPD Suite'}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 neu-inset rounded-3 small text-muted">
                <div>
                  <strong className="text-body">Slot Duration: </strong>
                  {slotDuration} minutes
                </div>
                <div className="mt-1">
                  <strong className="text-body">Capacity: </strong>
                  1 patient per slot (Row-locked)
                </div>
                <div className="mt-1">
                  <strong className="text-body">Timezone: </strong>
                  Asia/Kolkata (IST)
                </div>
              </div>
            </div>
          </div>
        </div>

        {apiError && (
          <div className="neu-raised neu-surface p-3 mb-4 rounded-4 border-start border-4 border-warning d-flex justify-content-between align-items-center" role="alert">
            <span className="text-muted small">{apiError}</span>
            <button type="button" className="neu-btn neu-btn-outline neu-btn-sm" onClick={fetchAvailabilityRange}>
              Retry
            </button>
          </div>
        )}

        {/* 3. Date Selection Strip */}
        <section className="mb-4" aria-label="Upcoming Consultation Days">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h6 fw-bold text-body mb-0">
              Select an OPD Date to Preview Live Consultation Slots:
            </h3>
            {isLoadingRange && (
              <span className="small text-muted d-flex align-items-center gap-1">
                <span className="spinner-border spinner-border-sm" role="status" /> Updating...
              </span>
            )}
          </div>

          <div className="row g-2">
            {rangeDays.map((day) => {
              const isSelected = day.dateString === selectedDate;
              let badgeStatus = 'neutral';
              if (day.statusType === 'available') badgeStatus = 'success';
              else if (day.statusType === 'leave') badgeStatus = 'danger';
              else if (day.statusType === 'closed') badgeStatus = 'neutral';

              return (
                <div key={day.dateString} className="col-6 col-sm-4 col-md-3 col-lg">
                  <button
                    type="button"
                    className={`w-100 p-3 rounded-4 border-0 text-center transition-all ${
                      isSelected ? 'neu-inset' : 'neu-raised neu-surface'
                    }`}
                    onClick={() => setSelectedDate(day.dateString)}
                    aria-pressed={isSelected}
                  >
                    <div className="fw-bold text-body">{day.dayName.slice(0, 3)}</div>
                    <div className="small text-muted">{day.displayDate}</div>
                    <div className="mt-2">
                      <span className={`neu-badge neu-badge-${badgeStatus} text-nowrap`} style={{ fontSize: '0.65rem' }}>
                        {day.status}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Slot Details Card */}
        <section
          className="neu-raised neu-surface p-4 rounded-4 mb-4"
          aria-label={`Time slots for ${selectedDayObj.dayName}, ${selectedDayObj.displayDate}`}
        >
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3 mb-4">
            <div>
              <h3 className="h5 fw-bold text-primary mb-1">
                {selectedDayObj.dayName}, {selectedDayObj.displayDate} ({selectedDayObj.dateString})
              </h3>
              <div className="small text-muted">
                Consultation Type: In-person Outpatient Consultation &bull; Slot Duration: {slotDuration} mins
              </div>
            </div>

            <div>
              <span
                className={`neu-badge ${
                  selectedDayObj.isSelectable ? 'neu-badge-success' : 'neu-badge-danger'
                } fs-6 px-3 py-1`}
              >
                Status: {selectedDayObj.status}
              </span>
            </div>
          </div>

          {/* Loading Slots */}
          {isLoadingSlots ? (
            <div className="py-4 text-center">
              <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
              <span className="text-muted small">Loading available consultation slots...</span>
            </div>
          ) : isLeaveDay ? (
            <div className="neu-inset p-4 rounded-3 border-start border-4 border-warning">
              <h4 className="h6 fw-bold text-body mb-1">Clinic Suspended — Physician On Scheduled Leave</h4>
              <p className="mb-2 small text-muted">
                {doctor.name} is on scheduled leave on {selectedDayObj.displayDate}
                {dayNotice ? ` (${dayNotice})` : ''}.
              </p>
              <p className="mb-0 small text-muted">
                Please select another active consultation day from the date selector strip above.
              </p>
            </div>
          ) : isClosedDay ? (
            <div className="p-4 neu-inset rounded-3 text-center">
              <h4 className="h6 fw-bold text-body mb-1">
                No Outpatient Clinic on {selectedDayObj.dayName}s
              </h4>
              <p className="small text-muted mb-2">
                {dayNotice || `${doctor.name} does not hold outpatient OPD sessions on ${selectedDayObj.dayName}s.`}
              </p>
              <p className="small text-muted mb-0">
                Please choose one of the available weekdays from the schedule selector above.
              </p>
            </div>
          ) : slots.length > 0 ? (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="small text-muted fw-semibold">
                  Select a slot below to reserve consultation:
                </span>
                <span className="small text-muted">
                  <strong className="text-success">{slots.filter((s) => s.available).length}</strong> of {slots.length} slots available
                </span>
              </div>

              <div className="row g-3 mb-4">
                {slots.map((slot, index) => {
                  const isAvailable = Boolean(slot.available);
                  const isSelected = selectedSlotTime === slot.start_time;

                  return (
                    <div key={index} className="col-6 col-sm-4 col-md-3">
                      <div
                        className={`p-3 rounded-3 text-center position-relative transition-all ${
                          isSelected
                            ? 'neu-inset border border-2 border-primary'
                            : isAvailable
                            ? 'neu-raised neu-surface cursor-pointer'
                            : 'neu-inset opacity-50'
                        }`}
                        style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedSlotTime(slot.start_time);
                          }
                        }}
                        role="button"
                        tabIndex={isAvailable ? 0 : -1}
                        aria-pressed={isSelected}
                      >
                        <div className="fw-bold text-body">
                          {formatTime12h(slot.start_time)}
                        </div>
                        <div className="small mt-1">
                          <span
                            className={`neu-badge neu-badge-${isAvailable ? 'success' : 'neutral'}`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {isAvailable ? 'Available' : (slot.reason || 'Booked')}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="position-absolute top-0 end-0 p-1 text-primary">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Strip */}
              <div className="p-3 neu-inset rounded-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                <div className="small text-muted">
                  {selectedSlotTime ? (
                    <span>
                      Selected Time: <strong className="text-body">{formatTime12h(selectedSlotTime)}</strong> on {selectedDayObj.displayDate}
                    </span>
                  ) : (
                    <span>Click any available slot above to pre-select your time, or proceed to booking.</span>
                  )}
                </div>

                {isActive ? (
                  <Link
                    to={`/appointments/book?doctor=${doctorIdentifier}&date=${selectedDayObj.dateString}${
                      selectedSlotTime ? `&time=${selectedSlotTime}` : ''
                    }`}
                  >
                    <button type="button" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-1">
                      <span>{selectedSlotTime ? `Book Slot (${formatTime12h(selectedSlotTime)})` : 'Proceed to Booking'}</span>
                      <ChevronRight size={15} />
                    </button>
                  </Link>
                ) : (
                  <span className="neu-badge neu-badge-neutral p-2">
                    Consultant Inactive
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 neu-inset rounded-3 text-center">
              <h4 className="h6 fw-bold text-body mb-1">No Consultation Slots Available</h4>
              <p className="small text-muted mb-0">
                All appointment slots for {selectedDayObj.displayDate} have been reserved. Please pick another date.
              </p>
            </div>
          )}
        </section>

        {/* 5. Weekly OPD Reference Table */}
        <section className="neu-raised neu-surface p-4 rounded-4 mb-5" aria-label="Weekly OPD Reference">
          <h3 className="h6 fw-bold text-primary mb-3">
            Centralized Weekly Outpatient Shift Roster
          </h3>

          <div className="neu-table-container">
            <table className="neu-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '25%' }}>Day of Week</th>
                  <th scope="col" style={{ width: '35%' }}>Shift Hours</th>
                  <th scope="col" style={{ width: '25%' }}>Midday Breaks</th>
                  <th scope="col" style={{ width: '15%' }}>Clinic Status</th>
                </tr>
              </thead>
              <tbody>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                  (dayName) => {
                    const shift = weeklyShiftMap[dayName];
                    const isWorking = shift && shift.is_working_day && shift.is_active && isActive;

                    return (
                      <tr key={dayName}>
                        <td className="fw-semibold text-body">{dayName}</td>
                        <td>
                          {isWorking
                            ? `${formatTime12h(shift.start_time)} - ${formatTime12h(shift.end_time)}`
                            : 'Clinic Closed'}
                        </td>
                        <td>
                          {isWorking && Array.isArray(shift.breaks) && shift.breaks.length > 0
                            ? shift.breaks.map((b) => `${formatTime12h(b.start_time)} - ${formatTime12h(b.end_time)}`).join(', ')
                            : 'None'}
                        </td>
                        <td>
                          <span
                            className={`neu-badge ${
                              isWorking ? 'neu-badge-success' : 'neu-badge-neutral'
                            }`}
                          >
                            {isWorking ? 'Active OPD' : 'Closed'}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </div>
  );
}

export default DoctorAvailabilityPage;
