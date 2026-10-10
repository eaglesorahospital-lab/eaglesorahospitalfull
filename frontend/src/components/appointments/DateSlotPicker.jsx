import React, { useState, useEffect, useMemo, useCallback } from 'react';
import scheduleService from '../../services/scheduleService';

/**
 * Formats 24h time string ("09:00:00" or "09:00") into clean 12h display ("09:00 AM").
 */
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Computes calendar date string "YYYY-MM-DD" using local date components.
 * Defends against UTC timezone shifts.
 */
function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Hospital Platform — Date and Time Slot Picker
 * Authoritatively integrated with Django REST Framework / PostgreSQL (/api/schedules/availability/).
 * Respects working days, clinical shifts, breaks, overrides, leaves, and booked appointment capacity.
 */
export function DateSlotPicker({
  doctor,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  errors = {},
}) {
  const [rangeDays, setRangeDays] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotDuration, setSlotDuration] = useState(30);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [dayNotice, setDayNotice] = useState(null);

  // Generate 10 upcoming calendar days
  const targetDateRange = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 1; i <= 10; i++) {
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

  // Fetch 10-day availability range for doctor from PostgreSQL
  const fetchAvailabilityRange = useCallback(async () => {
    if (!doctor || (!doctor.id && !doctor.slug)) return;
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
            };
          }
          return {
            dateString: localDay.dateString,
            dayName: localDay.dayName,
            displayDate: localDay.displayDate,
            status: 'Unavailable',
            statusType: 'closed',
            isSelectable: false,
            openSlotsCount: 0,
            reason: 'No schedule defined',
          };
        });
        setRangeDays(mapped);

        // Auto-select first selectable date if none selected or if selected date is closed
        const currentSelectedValid = mapped.some((d) => d.dateString === selectedDate && d.isSelectable);
        if (!currentSelectedValid) {
          const firstSelectable = mapped.find((d) => d.isSelectable);
          if (firstSelectable && onSelectDate) {
            onSelectDate(firstSelectable.dateString, firstSelectable.dayName);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch availability range from backend:', err);
      setApiError('Unable to load clinic scheduling data from server. Please check connection and retry.');
    } finally {
      setIsLoadingRange(false);
    }
  }, [doctor, startDateStr, endDateStr, targetDateRange, selectedDate, onSelectDate]);

  useEffect(() => {
    fetchAvailabilityRange();
  }, [fetchAvailabilityRange]);

  // Determine active date object
  const activeSelectedDate = selectedDate || rangeDays.find((d) => d.isSelectable)?.dateString;
  const activeDayObj = rangeDays.find((d) => d.dateString === activeSelectedDate) || targetDateRange.find((d) => d.dateString === activeSelectedDate) || targetDateRange[0];

  // Fetch authoritative slots for activeSelectedDate from PostgreSQL
  useEffect(() => {
    if (!doctor || !activeSelectedDate) return;
    let isMounted = true;
    setIsLoadingSlots(true);

    const docIdentifier = doctor.slug || doctor.id;
    scheduleService
      .getAvailability(docIdentifier, activeSelectedDate)
      .then((data) => {
        if (!isMounted) return;
        setSlotDuration(data.slot_duration_minutes || 30);
        setDayNotice(data.reason || null);

        if (Array.isArray(data.available_slots)) {
          const formattedSlots = data.available_slots.map((slot) => {
            const time12 = formatTime12h(slot.start_time);
            const end12 = formatTime12h(slot.end_time);
            return {
              time: time12,
              startTime24: slot.start_time,
              endTime24: slot.end_time,
              endTime12: end12,
              available: Boolean(slot.available),
              status: slot.status || (slot.available ? 'available' : 'unavailable'),
              reason: slot.reason || null,
            };
          });
          setSlots(formattedSlots);
        } else {
          setSlots([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Error fetching slots for date:', activeSelectedDate, err);
        setSlots([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [doctor, activeSelectedDate]);

  const displayDays = rangeDays.length > 0 ? rangeDays : targetDateRange.map((d) => ({
    ...d,
    status: d.dayName === 'Sunday' || d.dayName === 'Saturday' ? 'Clinic Closed' : 'Checking...',
    statusType: d.dayName === 'Sunday' || d.dayName === 'Saturday' ? 'closed' : 'scheduled',
    isSelectable: d.dayName !== 'Sunday' && d.dayName !== 'Saturday',
  }));

  return (
    <div className="hospital-card p-4 bg-white mb-4">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h3 className="h5 fw-bold text-primary mb-0">Select Consultation Date & Time Slot</h3>
        {isLoadingRange && (
          <span className="badge bg-light text-secondary d-flex align-items-center gap-1">
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Syncing roster...
          </span>
        )}
      </div>
      <p className="hospital-text-supporting mb-3">
        Choose a clinical OPD date to inspect verified consultation time slots with {doctor?.name || 'Physician'}.
      </p>

      {apiError && (
        <div className="alert alert-warning py-2 px-3 mb-3 small d-flex justify-content-between align-items-center" role="alert">
          <span>{apiError}</span>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={fetchAvailabilityRange}>
            Retry
          </button>
        </div>
      )}

      {/* Date Selection Strip */}
      <div className="mb-4">
        <label className="hospital-form-label mb-2">1. Select Appointment Date:</label>
        <div className="row g-2">
          {displayDays.map((day) => {
            const isSelected = activeSelectedDate === day.dateString;
            let badgeClass = 'hospital-badge-scheduled';
            if (day.statusType === 'available') badgeClass = 'hospital-badge-confirmed';
            else if (day.statusType === 'override') badgeClass = 'hospital-badge-pending';
            else if (day.statusType === 'leave') badgeClass = 'hospital-badge-cancelled';
            else if (day.statusType === 'closed') badgeClass = 'hospital-badge-scheduled';

            return (
              <div key={day.dateString} className="col-6 col-sm-4 col-md-3 col-lg">
                <button
                  type="button"
                  className={`w-100 day-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectDate(day.dateString, day.dayName)}
                  disabled={!day.isSelectable}
                  aria-pressed={isSelected}
                  style={!day.isSelectable ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
                  title={day.reason || day.status}
                >
                  <div className="fw-bold">{day.dayName.slice(0, 3)}</div>
                  <div className="small">{day.displayDate}</div>
                  <div className="mt-1">
                    <span className={`hospital-badge ${badgeClass} text-nowrap`} style={{ fontSize: '0.65rem' }}>
                      {day.status}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {errors.date && (
          <div className="text-danger small mt-2" role="alert">
            {errors.date}
          </div>
        )}
      </div>

      {/* Time Slot Selection */}
      <div>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className="hospital-form-label mb-0">
            2. Available Consultation Slots for {activeDayObj?.dayName}, {activeDayObj?.displayDate}:
          </label>
          <span className="small text-muted">
            Slot duration: {slotDuration} minutes
          </span>
        </div>

        {dayNotice && (
          <div className={`alert ${activeDayObj?.isSelectable ? 'alert-info' : 'alert-secondary'} py-2 px-3 mb-3 small`} role="alert">
            <strong>Schedule Notice: </strong> {dayNotice}
          </div>
        )}

        {isLoadingSlots ? (
          <div className="py-4 text-center text-muted">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
              <span className="visually-hidden">Loading slots...</span>
            </div>
            Retrieving available time slots from hospital scheduling engine...
          </div>
        ) : activeDayObj?.isSelectable && slots.length > 0 ? (
          <div>
            <div className="row g-2">
              {slots.map((slot, index) => {
                const isSelected = selectedTime === slot.time || selectedTime === slot.startTime24;
                const isBreak = slot.status === 'break';
                const isBooked = slot.status === 'booked';
                const isPast = slot.status === 'past';
                const isAvailable = slot.available;

                return (
                  <div key={index} className="col-6 col-sm-4 col-md-3 col-lg-2">
                    <button
                      type="button"
                      className={`slot-selection-btn ${isSelected ? 'selected' : ''}`}
                      disabled={!isAvailable}
                      onClick={() => onSelectTime(slot.time)}
                      aria-pressed={isSelected}
                      title={slot.reason || (isAvailable ? 'Available for consultation' : 'Slot unavailable')}
                    >
                      <div className="fw-semibold">{slot.time}</div>
                      <div className="small" style={{ fontSize: '0.7rem' }}>
                        {isBreak ? (
                          <span className="text-muted">Break</span>
                        ) : isBooked ? (
                          <span className="text-danger fw-semibold">Booked</span>
                        ) : isPast ? (
                          <span className="text-muted">Past</span>
                        ) : (
                          <span className={isSelected ? 'text-white' : 'text-success fw-bold'}>Open</span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {errors.time && (
              <div className="text-danger small mt-2" role="alert">
                {errors.time}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-light border border-light rounded text-muted small">
            {dayNotice || 'No appointment consultation slots are available for the selected date.'}
          </div>
        )}

        <div className="mt-3 p-2 bg-light border border-light rounded small text-muted d-flex align-items-center gap-2">
          <span className="badge bg-success-subtle text-success border border-success-subtle">Live Sync</span>
          <span>
            Consultation slots are verified in real time against doctor shifts, clinical breaks, and existing patient bookings in PostgreSQL.
          </span>
        </div>
      </div>
    </div>
  );
}

export default DateSlotPicker;
