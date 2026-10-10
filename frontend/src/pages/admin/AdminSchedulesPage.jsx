import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import doctorService from '../../services/doctorService';
import scheduleService from '../../services/scheduleService';

/**
 * Hospital Platform — Admin Doctor Scheduling & Roster Page (Phase 5 & Persistence Fix)
 * Administrative interface to inspect and configure doctor shift allocations,
 * consultation slot durations, capacity, midday breaks, leaves, and working days.
 * Backed authoritatively by PostgreSQL database via Django REST Framework.
 */
export function AdminSchedulesPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission
  if (currentRole && currentRole.id === 'PATIENT') {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Clinical Schedule Management"
        onSwitchRole={setRole}
      />
    );
  }

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Doctor Schedules' },
  ];

  // 1. Doctors list state
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [dbSchedules, setDbSchedules] = useState([]);
  const [dbLeaves, setDbLeaves] = useState([]);
  const [dbOverrides, setDbOverrides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthError, setIsAuthError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Edit Shift Modal State
  const [editShiftDay, setEditShiftDay] = useState(null);
  const [editShiftStart, setEditShiftStart] = useState('09:00');
  const [editShiftEnd, setEditShiftEnd] = useState('13:00');
  const [editShiftEnabled, setEditShiftEnabled] = useState(true);

  // Add Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [newOverrideDate, setNewOverrideDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newOverrideType, setNewOverrideType] = useState('SPECIAL_OPD');
  const [newOverrideStart, setNewOverrideStart] = useState('09:00');
  const [newOverrideEnd, setNewOverrideEnd] = useState('13:00');
  const [newOverrideReason, setNewOverrideReason] = useState('Special OPD Camp Review');
  const [modalError, setModalError] = useState(null);

  // Load doctors from PostgreSQL
  const loadDoctors = () => {
    setIsLoading(true);
    setActionError(null);
    setIsAuthError(false);

    doctorService
      .getDoctors({ page_size: 100 })
      .then((res) => {
        const docs = res?.results || [];
        setDoctorsList(docs);
        if (docs.length > 0) {
          setSelectedDoctorId(String(docs[0].id));
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load doctors for schedules page:', err);
        if (err.status === 401 || err.isAuthError || String(err.message).includes('401') || String(err.message).toLowerCase().includes('unauthorized')) {
          setIsAuthError(true);
          setActionError('Administrative authentication required: Your staff session has expired or is unauthorized. Please sign in to staff portal.');
        } else {
          setActionError(`Failed to load doctors: ${err.message}`);
        }
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadDoctors();
  }, []);


  // Selected doctor object (safely resolved)
  const doctor = useMemo(() => {
    if (!doctorsList || doctorsList.length === 0) return null;
    return (
      doctorsList.find((d) => String(d.id) === String(selectedDoctorId) || d.slug === selectedDoctorId) ||
      doctorsList[0] ||
      null
    );
  }, [doctorsList, selectedDoctorId]);

  // Load doctor schedules, leaves, and overrides from PostgreSQL
  const loadDoctorSchedules = async (docIdOrSlug) => {
    if (!docIdOrSlug) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const [schedules, leaves, overrides] = await Promise.all([
        scheduleService.getDoctorSchedules(docIdOrSlug),
        scheduleService.getDoctorLeaves(docIdOrSlug).catch(() => []),
        scheduleService.getDoctorOverrides(docIdOrSlug).catch(() => []),
      ]);
      setDbSchedules(schedules);
      setDbLeaves(leaves);
      setDbOverrides(overrides);
    } catch (err) {
      console.error('Failed to load doctor schedules:', err);
      setActionError(`Failed to load schedules: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (doctor?.id || doctor?.slug) {
      loadDoctorSchedules(doctor.id || doctor.slug);
    }
  }, [doctor]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Active schedule constructed authoritatively from PostgreSQL records
  const activeSchedule = useMemo(() => {
    const weeklySchedule = {};
    daysOfWeek.forEach((day) => {
      const dbSched = dbSchedules.find((s) => s.day_of_week === day);
      if (dbSched) {
        const rawBreaks = Array.isArray(dbSched.breaks) ? dbSched.breaks : [];
        const formattedBreaks = rawBreaks.map((b) => ({
          id: b.id,
          start: b.start_time ? b.start_time.slice(0, 5) : (b.start || '13:00'),
          end: b.end_time ? b.end_time.slice(0, 5) : (b.end || '14:00'),
          label: b.name || b.label || 'Clinical Lunch & Ward Round',
        }));

        weeklySchedule[day] = {
          id: dbSched.id,
          enabled: Boolean(dbSched.is_working_day),
          start: dbSched.start_time ? dbSched.start_time.slice(0, 5) : '09:00',
          end: dbSched.end_time ? dbSched.end_time.slice(0, 5) : '13:00',
          breaks: formattedBreaks,
        };
      } else {
        weeklySchedule[day] = {
          id: null,
          enabled: false,
          start: '09:00',
          end: '13:00',
          breaks: [],
        };
      }
    });

    const slotDuration =
      dbSchedules.find((s) => s.slot_duration_minutes)?.slot_duration_minutes ||
      doctor?.consultation_duration_minutes ||
      30;

    return {
      slotDuration,
      capacity: dbSchedules[0]?.capacity || 1,
      timezone: dbSchedules[0]?.timezone || 'Asia/Kolkata',
      weeklySchedule,
      leaves: dbLeaves.map((l) => ({
        id: l.id,
        date: l.start_date || l.date,
        endDate: l.end_date,
        reason: l.reason || 'Approved Leave',
        status: l.is_active ? 'On Leave' : 'Cancelled',
      })),
      overrides: dbOverrides.map((o) => {
        const typeDisplayMap = {
          SPECIAL_OPD: 'Special OPD',
          EXTENDED_HOURS: 'Extended Hours',
          REDUCED_HOURS: 'Reduced Hours',
          CLOSED: 'Closed',
          UNAVAILABLE: 'Closed',
          SHIFT_ADJUSTMENT: 'Shift Adjustment',
          EMERGENCY_COVER: 'Emergency Cover',
        };
        const displayType =
          o.override_type_display ||
          typeDisplayMap[o.override_type] ||
          o.override_type ||
          'Special OPD';
        const isClosed = !o.is_available || o.override_type === 'CLOSED' || o.override_type === 'UNAVAILABLE';
        return {
          id: o.id,
          date: o.override_date || o.date,
          type: displayType,
          is_available: !isClosed,
          start: isClosed ? '—' : (o.start_time ? o.start_time.slice(0, 5) : '09:00'),
          end: isClosed ? '—' : (o.end_time ? o.end_time.slice(0, 5) : '13:00'),
          reason: o.reason || 'Schedule Override',
        };
      }),
    };
  }, [dbSchedules, dbLeaves, dbOverrides, doctor]);

  // Toggle day enabled state in PostgreSQL database
  const handleToggleDay = async (dayName) => {
    if (!doctor) return;
    setActionError(null);
    setActionNotice(null);
    setIsSaving(true);

    const current = activeSchedule.weeklySchedule[dayName] || {};
    const nextEnabled = !current.enabled;
    const dbSched = dbSchedules.find((s) => s.day_of_week === dayName);

    try {
      await scheduleService.saveSchedule({
        id: dbSched?.id,
        doctor: doctor.id,
        day_of_week: dayName,
        is_working_day: nextEnabled,
        is_active: true,
        start_time: dbSched?.start_time || '09:00:00',
        end_time: dbSched?.end_time || '13:00:00',
        slot_duration_minutes: activeSchedule.slotDuration || 30,
        capacity: 1,
      });

      await loadDoctorSchedules(doctor.id || doctor.slug);
      setActionNotice(`Updated ${dayName} shift (${nextEnabled ? 'Active OPD' : 'Closed'}) for ${doctor.name} in PostgreSQL database.`);
    } catch (err) {
      setActionError(`Failed to save ${dayName} schedule to database: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Save modified shift hours in PostgreSQL
  const handleSaveShift = async (e) => {
    e.preventDefault();
    if (!doctor || !editShiftDay) return;
    setActionError(null);
    setActionNotice(null);
    setIsSaving(true);

    const dbSched = dbSchedules.find((s) => s.day_of_week === editShiftDay);

    try {
      await scheduleService.saveSchedule({
        id: dbSched?.id,
        doctor: doctor.id,
        day_of_week: editShiftDay,
        is_working_day: editShiftEnabled,
        is_active: true,
        start_time: editShiftStart.length === 5 ? `${editShiftStart}:00` : editShiftStart,
        end_time: editShiftEnd.length === 5 ? `${editShiftEnd}:00` : editShiftEnd,
        slot_duration_minutes: activeSchedule.slotDuration || 30,
        capacity: 1,
      });

      setEditShiftDay(null);
      await loadDoctorSchedules(doctor.id || doctor.slug);
      setActionNotice(`Updated ${editShiftDay} shift (${editShiftStart} - ${editShiftEnd}) for ${doctor.name} in PostgreSQL.`);
    } catch (err) {
      setActionError(`Failed to update shift: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Change slot duration in PostgreSQL database
  const handleChangeDuration = async (newDuration) => {
    if (!doctor) return;
    setActionError(null);
    setActionNotice(null);
    setIsSaving(true);

    try {
      // 1. Update doctor profile consultation duration
      await doctorService.updateDoctor(doctor.slug || doctor.id, {
        consultation_duration_minutes: Number(newDuration),
      });

      // 2. Update existing schedules
      for (const sched of dbSchedules) {
        await scheduleService.saveSchedule({
          id: sched.id,
          slot_duration_minutes: Number(newDuration),
        });
      }

      await loadDoctorSchedules(doctor.id || doctor.slug);
      setActionNotice(`Consultation slot duration for ${doctor.name} updated to ${newDuration} minutes in PostgreSQL.`);
    } catch (err) {
      setActionError(`Failed to update slot duration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add schedule override persisted to PostgreSQL
  const handleAddOverride = async (e) => {
    e.preventDefault();
    if (!doctor || !newOverrideDate || !newOverrideReason) return;
    setActionError(null);
    setModalError(null);
    setActionNotice(null);
    setIsSaving(true);

    const isClosed = newOverrideType === 'CLOSED';

    if (!isClosed) {
      if (!newOverrideStart || !newOverrideEnd) {
        setModalError('Start time and end time are required for open clinic overrides.');
        setIsSaving(false);
        return;
      }
      if (newOverrideStart >= newOverrideEnd) {
        setModalError('End time must be later than start time.');
        setIsSaving(false);
        return;
      }
    }

    try {
      await scheduleService.saveOverride({
        doctor: doctor.id,
        override_date: newOverrideDate,
        override_type: newOverrideType,
        start_time: isClosed ? null : (newOverrideStart.length === 5 ? `${newOverrideStart}:00` : newOverrideStart),
        end_time: isClosed ? null : (newOverrideEnd.length === 5 ? `${newOverrideEnd}:00` : newOverrideEnd),
        slot_duration_minutes: activeSchedule.slotDuration || 30,
        capacity: 1,
        reason: newOverrideReason.trim(),
        is_available: !isClosed,
      });

      setShowOverrideModal(false);
      setModalError(null);
      await loadDoctorSchedules(doctor.id || doctor.slug);
      setActionNotice(`Successfully added schedule override on ${newOverrideDate} for ${doctor.name} in PostgreSQL.`);
    } catch (err) {
      const errorMsg = err.message || 'Failed to save schedule override.';
      setModalError(errorMsg);
      setActionError(`Failed to save override: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate active weekly clinic days
  const activeDaysCount = useMemo(() => {
    return Object.values(activeSchedule.weeklySchedule || {}).filter((d) => d.enabled).length;
  }, [activeSchedule]);

  // Aggregate all breaks across the weekly schedule
  const allWeeklyBreaks = useMemo(() => {
    const list = [];
    Object.entries(activeSchedule.weeklySchedule || {}).forEach(([day, config]) => {
      if (config.enabled && config.breaks && config.breaks.length > 0) {
        config.breaks.forEach((b) => {
          list.push({ day, ...b });
        });
      }
    });
    return list;
  }, [activeSchedule]);

  // 7-day upcoming representative calendar view
  const representativeCalendar = useMemo(() => {
    const today = new Date();
    return daysOfWeek.map((day, idx) => {
      const dayConfig = activeSchedule.weeklySchedule?.[day] || { enabled: false };
      const date = new Date(today);
      date.setDate(today.getDate() + idx + 1);
      const dateString = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const leaveMatch = (activeSchedule.leaves || []).find((l) => l.date === dateString);
      const overrideMatch = (activeSchedule.overrides || []).find((o) => o.date === dateString);

      let status = dayConfig.enabled ? 'Active OPD' : 'Closed';
      let badgeClass = dayConfig.enabled ? 'hospital-badge-confirmed' : 'hospital-badge-scheduled';
      let hours = dayConfig.enabled ? `${dayConfig.start} - ${dayConfig.end}` : 'Clinic Closed';

      if (leaveMatch) {
        status = 'On Leave';
        badgeClass = 'hospital-badge-cancelled';
        hours = `Leave: ${leaveMatch.reason}`;
      } else if (overrideMatch) {
        status = `Override (${overrideMatch.type})`;
        badgeClass = 'hospital-badge-pending';
        hours = `${overrideMatch.start} - ${overrideMatch.end}`;
      }

      return {
        day,
        dateString,
        displayDate,
        status,
        badgeClass,
        hours,
        breaks: dayConfig.breaks || [],
        isLeave: !!leaveMatch,
        isOverride: !!overrideMatch,
      };
    });
  }, [activeSchedule]);

  return (
    <div className="admin-schedules-page">
      <PageHeader
        title="Doctor Scheduling & Roster Management"
        description="Administrative management of recurring clinical shifts, consultation slot intervals, midday breaks, leaves, and schedule overrides."
        breadcrumbs={breadcrumbs}
      />

      {/* Persistence Status & Notification Banners */}
      {actionError && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-4 shadow-sm" role="alert">
          <div>
            <strong>Error: </strong> {actionError}
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setActionError(null)}
          />
        </div>
      )}

      {actionNotice && (
        <div className="alert alert-success d-flex align-items-center justify-content-between mb-4 shadow-sm" role="alert">
          <div>
            <strong>Success: </strong> {actionNotice}
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setActionNotice(null)}
          />
        </div>
      )}

      {isSaving && (
        <div className="alert alert-info py-2 mb-4 d-flex align-items-center gap-2">
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
          <span>Saving schedule changes to PostgreSQL database...</span>
        </div>
      )}

      {/* Full Loading State */}
      {isLoading && !doctor ? (
        <div className="py-5 text-center my-4" aria-live="polite">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading doctor schedules...</span>
          </div>
          <p className="mt-3 text-muted">Retrieving doctor rosters and shift allocations from database...</p>
        </div>
      ) : isAuthError ? (
        <div className="card shadow-sm border-warning my-4">
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex p-3 rounded-circle bg-warning bg-opacity-10 text-warning mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="h5 fw-bold text-dark mb-2">Administrative Authentication Required</h3>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '480px' }}>
              Your staff session has expired or requires authorization to view and manage doctor schedules and clinical shifts from PostgreSQL.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <Link to={`/staff/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="btn btn-primary btn-sm">
                Sign In to Staff Workspace
              </Link>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadDoctors}>
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      ) : !doctor ? (
        <div className="my-5">
          <EmptyState
            title="No Medical Specialists Found"
            message="No doctor profiles were found in the hospital database to configure schedules for."
          />
        </div>
      ) : (
        <>
          {/* ====================================================================
              1. Doctor Selector & Identity Bar
              ==================================================================== */}
          <section className="schedule-doctor-picker mb-4" aria-label="Select Doctor">
            <div className="row g-3 align-items-center">
              <div className="col-12 col-md-5">
                <label htmlFor="doctor-select" className="hospital-form-label mb-1">
                  Select Medical Specialist to Manage Schedule:
                </label>
                <select
                  id="doctor-select"
                  className="hospital-form-select"
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    setActionNotice(null);
                    setActionError(null);
                  }}
                >
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} — {doc.specialty} ({doc.departmentName || doc.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-7">
                <div className="d-flex align-items-center gap-3 p-2 bg-light border border-light rounded">
                  <div className="doctor-avatar-box" style={{ width: '3.25rem', height: '3.25rem' }} aria-hidden="true">
                    <span>{doctor?.initials || 'DR'}</span>
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-bold text-dark text-truncate">{doctor?.name}</div>
                    <div className="small text-muted text-truncate">
                      {doctor?.specialty} &bull; {doctor?.departmentName || doctor?.department}
                    </div>
                    <div className="small text-muted">
                      OPD Location: <strong>{doctor?.consultation?.location || 'Clinical Wing'}</strong>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`hospital-badge ${
                        doctor?.status?.toLowerCase() === 'active' || doctor?.is_active
                          ? 'hospital-badge-confirmed'
                          : 'hospital-badge-pending'
                      }`}
                    >
                      {doctor?.status?.toLowerCase() === 'active' || doctor?.is_active
                        ? 'Active Faculty'
                        : 'Inactive / Sabbatical'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ====================================================================
              2. Slot Configuration & Shift KPI Summary Cards
              ==================================================================== */}
          <section className="row g-3 mb-4" aria-label="Slot Configuration Parameters">
            <div className="col-6 col-lg-3">
              <div className="schedule-kpi-card">
                <div className="schedule-kpi-title">Slot Duration</div>
                <div className="d-flex align-items-center justify-content-between mt-1">
                  <div className="schedule-kpi-value">{activeSchedule.slotDuration} min</div>
                  <select
                    aria-label="Change slot duration"
                    className="form-select form-select-sm w-auto"
                    value={activeSchedule.slotDuration}
                    onChange={(e) => handleChangeDuration(e.target.value)}
                  >
                    <option value="15">15 min</option>
                    <option value="20">20 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                </div>
                <div className="small text-muted mt-2">Consultation appointment block</div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="schedule-kpi-card">
                <div className="schedule-kpi-title">Patient Capacity</div>
                <div className="schedule-kpi-value">{activeSchedule.capacity} patient / slot</div>
                <div className="small text-muted mt-2">Single patient per consultation slot</div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="schedule-kpi-card">
                <div className="schedule-kpi-title">Clinical Timezone</div>
                <div className="schedule-kpi-value" style={{ fontSize: '1.05rem' }}>
                  {activeSchedule.timezone}
                </div>
                <div className="small text-muted mt-2">Standard Indian Hospital Time (IST)</div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="schedule-kpi-card">
                <div className="schedule-kpi-title">Active OPD Days</div>
                <div className="schedule-kpi-value">{activeDaysCount} of 7 days</div>
                <div className="small text-muted mt-2">Weekly recurring shifts configured</div>
              </div>
            </div>
          </section>

          {/* ====================================================================
              3. Weekly Schedule Table
              ==================================================================== */}
          <section className="hospital-card p-4 mb-4 bg-white" aria-labelledby="weekly-roster-heading">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h3 id="weekly-roster-heading" className="h5 fw-bold text-primary mb-1">
                  Weekly Recurring Roster for {doctor?.name}
                </h3>
                <p className="hospital-text-supporting mb-0">
                  Standard recurring outpatient shift timings and breaks backed by PostgreSQL database.
                </p>
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverrideModal(true)}
                >
                  + Add Schedule Override
                </Button>
              </div>
            </div>

            <div className="table-responsive border border-light rounded">
              <table className="schedule-admin-table table table-hover mb-0">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '18%' }}>Day</th>
                    <th scope="col" style={{ width: '16%' }}>Clinic Status</th>
                    <th scope="col" style={{ width: '24%' }}>Shift Hours</th>
                    <th scope="col" style={{ width: '24%' }}>Midday Breaks</th>
                    <th scope="col" style={{ width: '18%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map((day) => {
                    const config = activeSchedule.weeklySchedule?.[day] || { enabled: false, breaks: [] };

                    return (
                      <tr key={day}>
                        <td className="fw-semibold text-dark">{day}</td>
                        <td>
                          <span
                            className={`hospital-badge ${
                              config.enabled ? 'hospital-badge-confirmed' : 'hospital-badge-cancelled'
                            }`}
                          >
                            {config.enabled ? 'Active OPD' : 'Closed / Off Duty'}
                          </span>
                        </td>
                        <td>
                          {config.enabled ? (
                            <span className="fw-semibold text-dark">
                              {config.start} - {config.end}
                            </span>
                          ) : (
                            <span className="text-muted fst-italic">No OPD Scheduled</span>
                          )}
                        </td>
                        <td>
                          {config.enabled && config.breaks && config.breaks.length > 0 ? (
                            <div>
                              {config.breaks.map((b, bIdx) => (
                                <span key={bIdx} className="schedule-break-tag" title={b.label}>
                                  {b.start} - {b.end} ({b.label})
                                </span>
                              ))}
                            </div>
                          ) : config.enabled ? (
                            <span className="text-muted small">None</span>
                          ) : (
                            <span className="text-muted small">N/A</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => {
                                setEditShiftDay(day);
                                setEditShiftStart(config.start || '09:00');
                                setEditShiftEnd(config.end || '13:00');
                                setEditShiftEnabled(config.enabled);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${config.enabled ? 'btn-outline-danger' : 'btn-outline-success'} py-0 px-2`}
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => handleToggleDay(day)}
                            >
                              {config.enabled ? 'Mark Off' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ====================================================================
              4. Weekly Calendar / Roster View (Representative 7-Day Grid)
              ==================================================================== */}
          <section className="hospital-card p-4 mb-4 bg-white" aria-labelledby="calendar-view-heading">
            <h3 id="calendar-view-heading" className="h5 fw-bold text-primary mb-1">
              7-Day Visual Roster Calendar View
            </h3>
            <p className="hospital-text-supporting mb-3">
              Consolidated visual matrix incorporating weekly shifts, clinical breaks, scheduled leaves, and active overrides.
            </p>

            <div className="row g-2">
              {representativeCalendar.map((col) => {
                let borderClass = 'active-day';
                if (col.isLeave) borderClass = 'leave-day';
                else if (col.isOverride) borderClass = 'override-day';
                else if (col.status === 'Closed') borderClass = 'disabled-day';

                return (
                  <div key={col.day} className="col-12 col-sm-6 col-md-4 col-lg">
                    <div className={`schedule-calendar-cell ${borderClass}`}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-dark">{col.day.slice(0, 3)}</span>
                        <span className="small text-muted">{col.displayDate}</span>
                      </div>

                      <div className="my-1">
                        <span className={`hospital-badge ${col.badgeClass} w-100 text-center py-1`} style={{ fontSize: '0.65rem' }}>
                          {col.status}
                        </span>
                      </div>

                      <div className="small fw-semibold text-dark mt-1 text-truncate" title={col.hours}>
                        {col.hours}
                      </div>

                      {col.breaks.length > 0 && (
                        <div className="small text-muted mt-auto pt-2 border-top" style={{ fontSize: '0.7rem' }}>
                          Break: {col.breaks[0].start} - {col.breaks[0].end}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ====================================================================
              5. Break Management Breakdown
              ==================================================================== */}
          <section className="hospital-card p-4 mb-4 bg-white" aria-labelledby="breaks-heading">
            <h3 id="breaks-heading" className="h5 fw-bold text-primary mb-2">
              Clinical Break Management
            </h3>
            <p className="hospital-text-supporting mb-3">
              Structured intervals reserved for doctor documentation, case discussions, and surgical handoffs.
              Slots during break hours are automatically protected from appointment booking.
            </p>

            {allWeeklyBreaks.length > 0 ? (
              <div className="row g-3">
                {allWeeklyBreaks.map((item, idx) => (
                  <div key={idx} className="col-12 col-md-6 col-lg-4">
                    <div className="p-3 bg-light border border-light rounded">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-dark">{item.day}</span>
                        <span className="badge bg-warning text-dark py-1 px-2" style={{ fontSize: '0.7rem' }}>
                          {item.start} - {item.end}
                        </span>
                      </div>
                      <div className="small text-muted">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-light border border-light rounded text-muted small">
                No recurring midday clinical breaks are currently logged for this physician in PostgreSQL.
              </div>
            )}
          </section>

          {/* ====================================================================
              6. Leave & Overrides Grid (Two Columns)
              ==================================================================== */}
          <div className="row g-4 mb-5">
            {/* Scheduled Leaves Column */}
            <div className="col-12 col-lg-6">
              <section className="hospital-card p-4 h-100 bg-white" aria-labelledby="leaves-mgmt-heading">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 id="leaves-mgmt-heading" className="h6 fw-bold text-primary mb-0">
                    Scheduled Leaves & Unavailability
                  </h3>
                  <span className="small text-muted">{activeSchedule.leaves?.length || 0} Records</span>
                </div>
                <p className="small text-muted mb-3">
                  Approved clinical leaves, conferences, and institutional holiday absences.
                </p>

                {activeSchedule.leaves && activeSchedule.leaves.length > 0 ? (
                  <div className="table-responsive border border-light rounded">
                    <table className="table table-sm table-hover mb-0 small">
                      <thead>
                        <tr className="bg-light">
                          <th scope="col">Date</th>
                          <th scope="col">Reason</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSchedule.leaves.map((l, index) => (
                          <tr key={index}>
                            <td className="fw-semibold text-dark text-nowrap">{l.date}</td>
                            <td>{l.reason}</td>
                            <td>
                              <span className="hospital-badge hospital-badge-cancelled">
                                {l.status || 'On Leave'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-light border border-light rounded text-muted small text-center">
                    No scheduled leaves recorded for this physician in PostgreSQL.
                  </div>
                )}
              </section>
            </div>

            {/* Schedule Overrides Column */}
            <div className="col-12 col-lg-6">
              <section className="hospital-card p-4 h-100 bg-white" aria-labelledby="overrides-mgmt-heading">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 id="overrides-mgmt-heading" className="h6 fw-bold text-primary mb-0">
                    Schedule Overrides & Special OPDs
                  </h3>
                  <span className="small text-muted">{activeSchedule.overrides?.length || 0} Records</span>
                </div>
                <p className="small text-muted mb-3">
                  One-off adjustments to recurring hours such as extended clinics, screening camps, or holiday hours.
                </p>

                {activeSchedule.overrides && activeSchedule.overrides.length > 0 ? (
                  <div className="table-responsive border border-light rounded">
                    <table className="table table-sm table-hover mb-0 small">
                      <thead>
                        <tr className="bg-light">
                          <th scope="col">Date</th>
                          <th scope="col">Type</th>
                          <th scope="col">Hours</th>
                          <th scope="col">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSchedule.overrides.map((ov, index) => (
                          <tr key={index}>
                            <td className="fw-semibold text-dark text-nowrap">{ov.date}</td>
                            <td>
                              <span className={`schedule-override-tag ${!ov.is_available ? 'bg-secondary text-white border-0' : ''}`}>
                                {ov.type}
                              </span>
                            </td>
                            <td className="text-nowrap">
                              {!ov.is_available ? (
                                <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                                  Closed All Day
                                </span>
                              ) : (
                                `${ov.start} - ${ov.end}`
                              )}
                            </td>
                            <td>{ov.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-light border border-light rounded text-muted small text-center">
                    No active schedule overrides logged for this physician in PostgreSQL.
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {/* ====================================================================
          7. Edit Shift Hours Modal
          ==================================================================== */}
      {editShiftDay && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shift-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSaveShift}>
                <div className="modal-header">
                  <h5 id="shift-modal-title" className="modal-title fw-bold text-primary">
                    Configure Shift: {editShiftDay}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setEditShiftDay(null)}
                  />
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label d-flex align-items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editShiftEnabled}
                        onChange={(e) => setEditShiftEnabled(e.target.checked)}
                      />
                      <span>Active OPD on {editShiftDay}</span>
                    </label>
                  </div>

                  {editShiftEnabled && (
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label htmlFor="shift-start" className="hospital-form-label">
                          Start Time
                        </label>
                        <input
                          id="shift-start"
                          type="time"
                          className="hospital-form-control"
                          value={editShiftStart}
                          onChange={(e) => setEditShiftStart(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <label htmlFor="shift-end" className="hospital-form-label">
                          End Time
                        </label>
                        <input
                          id="shift-end"
                          type="time"
                          className="hospital-form-control"
                          value={editShiftEnd}
                          onChange={(e) => setEditShiftEnd(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditShiftDay(null)}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Shift to Database'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          8. Add Override Modal
          ==================================================================== */}
      {showOverrideModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="override-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAddOverride}>
                <div className="modal-header">
                  <h5 id="override-modal-title" className="modal-title fw-bold text-primary">
                    Add Schedule Override for {doctor?.name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => {
                      setShowOverrideModal(false);
                      setModalError(null);
                    }}
                  />
                </div>

                <div className="modal-body">
                  {modalError && (
                    <div className="alert alert-danger py-2 small mb-3 text-break" role="alert">
                      <strong>Validation Error: </strong> {modalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="modal-date" className="hospital-form-label">
                      Override Date
                    </label>
                    <input
                      id="modal-date"
                      type="date"
                      className="hospital-form-control"
                      value={newOverrideDate}
                      onChange={(e) => {
                        setNewOverrideDate(e.target.value);
                        setModalError(null);
                      }}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="modal-type" className="hospital-form-label">
                      Override Type
                    </label>
                    <select
                      id="modal-type"
                      className="hospital-form-select"
                      value={newOverrideType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewOverrideType(val);
                        setModalError(null);
                        if (val === 'CLOSED') {
                          setNewOverrideStart('');
                          setNewOverrideEnd('');
                        } else if (!newOverrideStart || !newOverrideEnd) {
                          setNewOverrideStart('09:00');
                          setNewOverrideEnd('13:00');
                        }
                      }}
                    >
                      <option value="SPECIAL_OPD">Special OPD</option>
                      <option value="EXTENDED_HOURS">Extended Hours</option>
                      <option value="REDUCED_HOURS">Reduced Hours</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  {newOverrideType === 'CLOSED' ? (
                    <div className="alert alert-secondary py-2 small mb-3">
                      <i className="bi bi-info-circle me-1" />
                      Clinic will be marked <strong>Closed</strong> all day on this date. Outpatient appointment bookings will be disabled.
                    </div>
                  ) : (
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label htmlFor="modal-start" className="hospital-form-label">
                          Start Time
                        </label>
                        <input
                          id="modal-start"
                          type="time"
                          className="hospital-form-control"
                          value={newOverrideStart}
                          onChange={(e) => {
                            setNewOverrideStart(e.target.value);
                            setModalError(null);
                          }}
                          required={newOverrideType !== 'CLOSED'}
                        />
                      </div>
                      <div className="col-6">
                        <label htmlFor="modal-end" className="hospital-form-label">
                          End Time
                        </label>
                        <input
                          id="modal-end"
                          type="time"
                          className="hospital-form-control"
                          value={newOverrideEnd}
                          onChange={(e) => {
                            setNewOverrideEnd(e.target.value);
                            setModalError(null);
                          }}
                          required={newOverrideType !== 'CLOSED'}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="modal-reason" className="hospital-form-label">
                      Clinical Reason
                    </label>
                    <input
                      id="modal-reason"
                      type="text"
                      className="hospital-form-control"
                      placeholder="e.g. Special Screening Camp, Institutional Review"
                      value={newOverrideReason}
                      onChange={(e) => {
                        setNewOverrideReason(e.target.value);
                        setModalError(null);
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowOverrideModal(false);
                      setModalError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save to PostgreSQL'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSchedulesPage;
