import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  Globe, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Edit3, 
  Power, 
  Coffee, 
  CalendarCheck, 
  FileText,
  RotateCw,
  Sun,
  ShieldCheck
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import doctorService from '../../services/doctorService';
import scheduleService from '../../services/scheduleService';

/**
 * Hospital Platform — Admin Doctor Scheduling & Roster Page (Neumorphic Redesign)
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

  // Doctors list state
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
      setDbSchedules(schedules || []);
      setDbLeaves(leaves || []);
      setDbOverrides(overrides || []);
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
      setActionNotice(`Updated ${dayName} shift (${nextEnabled ? 'Active OPD' : 'Closed'}) for ${doctor.name} in database.`);
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
      setActionNotice(`Updated ${editShiftDay} shift (${editShiftStart} - ${editShiftEnd}) for ${doctor.name} in database.`);
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
      await doctorService.updateDoctor(doctor.slug || doctor.id, {
        consultation_duration_minutes: Number(newDuration),
      });

      for (const sched of dbSchedules) {
        await scheduleService.saveSchedule({
          id: sched.id,
          slot_duration_minutes: Number(newDuration),
        });
      }

      await loadDoctorSchedules(doctor.id || doctor.slug);
      setActionNotice(`Consultation slot duration for ${doctor.name} updated to ${newDuration} minutes in database.`);
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
      setActionNotice(`Successfully added schedule override on ${newOverrideDate} for ${doctor.name} in database.`);
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
      let badgeClass = dayConfig.enabled ? 'neu-badge-success' : 'neu-badge-secondary';
      let hours = dayConfig.enabled ? `${dayConfig.start} - ${dayConfig.end}` : 'Clinic Closed';

      if (leaveMatch) {
        status = 'On Leave';
        badgeClass = 'neu-badge-danger';
        hours = `Leave: ${leaveMatch.reason}`;
      } else if (overrideMatch) {
        status = `Override (${overrideMatch.type})`;
        badgeClass = 'neu-badge-warning';
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
    <div className="admin-schedules-view">
      <PageHeader
        title="Doctor Scheduling & Roster Management"
        description="Administrative management of recurring clinical shifts, consultation slot intervals, midday breaks, leaves, and schedule overrides."
        breadcrumbs={breadcrumbs}
      />

      {/* Persistence Status & Notification Banners */}
      {actionError && (
        <div 
          className="neu-card p-3 mb-4 d-flex justify-content-between align-items-center"
          style={{ 
            borderRadius: '14px', 
            background: 'var(--hospital-surface)',
            borderLeft: '4px solid var(--neu-error)'
          }}
        >
          <div className="d-flex align-items-center gap-2 small">
            <AlertCircle size={16} color="var(--neu-error)" />
            <span style={{ color: 'var(--neu-error)', fontWeight: 600 }}>{actionError}</span>
          </div>
          <button
            type="button"
            className="neu-btn-icon"
            style={{ width: '28px', height: '28px', padding: 0 }}
            onClick={() => setActionError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {actionNotice && (
        <div 
          className="neu-card p-3 mb-4 d-flex justify-content-between align-items-center"
          style={{ 
            borderRadius: '14px', 
            background: 'var(--hospital-surface)',
            borderLeft: '4px solid var(--neu-success)'
          }}
        >
          <div className="d-flex align-items-center gap-2 small">
            <CheckCircle2 size={16} color="var(--neu-success)" />
            <span style={{ color: 'var(--hospital-primary-navy)', fontWeight: 600 }}>{actionNotice}</span>
          </div>
          <button
            type="button"
            className="neu-btn-icon"
            style={{ width: '28px', height: '28px', padding: 0 }}
            onClick={() => setActionNotice(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isSaving && (
        <div 
          className="neu-card p-3 mb-4 d-flex align-items-center gap-3"
          style={{ borderRadius: '14px', background: 'var(--hospital-surface)' }}
        >
          <RotateCw size={16} className="spin-anim text-primary" />
          <span className="small text-muted fw-semibold">Saving schedule changes to PostgreSQL database...</span>
        </div>
      )}

      {/* Loading or Auth Error */}
      {isLoading && !doctor ? (
        <div className="py-5 text-center my-4">
          <RotateCw size={28} className="spin-anim text-primary mb-2" />
          <p className="mt-2 text-muted">Retrieving doctor rosters and shift allocations from database...</p>
        </div>
      ) : isAuthError ? (
        <div 
          className="neu-card p-5 text-center my-4" 
          style={{ borderRadius: '24px', background: 'var(--hospital-surface)' }}
        >
          <div 
            className="d-inline-flex p-3 rounded-circle mb-3"
            style={{ background: 'var(--hospital-surface)', boxShadow: 'var(--neu-inset)', color: '#B7791F' }}
          >
            <AlertCircle size={32} />
          </div>
          <h3 className="h5 fw-bold mb-2" style={{ color: 'var(--hospital-primary-navy)' }}>
            Administrative Authentication Required
          </h3>
          <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '480px' }}>
            Your staff session has expired or requires authorization to view and manage doctor schedules.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <Link to={`/staff/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="neu-btn neu-btn-primary neu-btn-sm">
              Sign In to Staff Workspace
            </Link>
            <button type="button" className="neu-btn neu-btn-outline neu-btn-sm" onClick={loadDoctors}>
              Retry Connection
            </button>
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
          {/* Doctor Selector & Identity Bar */}
          <section 
            className="neu-card p-4 mb-4" 
            style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
          >
            <div className="row g-3 align-items-center">
              <div className="col-12 col-md-5">
                <label htmlFor="doctor-select" className="neu-form-label mb-1">
                  Select Specialist to Configure Roster:
                </label>
                <select
                  id="doctor-select"
                  className="neu-select"
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
                <div 
                  className="p-3 neu-card-sm d-flex align-items-center gap-3"
                  style={{ borderRadius: '14px', background: 'var(--hospital-surface)' }}
                >
                  <div 
                    className="neu-avatar-box d-flex align-items-center justify-content-center fw-bold"
                    style={{ 
                      width: '46px', 
                      height: '46px', 
                      borderRadius: '12px', 
                      background: 'var(--hospital-surface)', 
                      boxShadow: 'var(--neu-inset)', 
                      color: 'var(--hospital-blue)',
                      fontSize: '1rem',
                      flexShrink: 0
                    }}
                  >
                    {doctor?.initials || 'DR'}
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-bold text-truncate" style={{ color: 'var(--hospital-primary-navy)' }}>
                      {doctor?.name}
                    </div>
                    <div className="small text-muted text-truncate">
                      {doctor?.specialty} &bull; {doctor?.departmentName || doctor?.department}
                    </div>
                    <div className="small text-muted" style={{ fontSize: '0.78rem' }}>
                      OPD Suite: <strong>{doctor?.consultation?.location || 'Clinical Wing'}</strong>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`neu-badge ${
                        doctor?.status?.toLowerCase() === 'active' || doctor?.is_active
                          ? 'neu-badge-success'
                          : 'neu-badge-warning'
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

          {/* Slot Configuration & Shift KPI Cards */}
          <section className="row g-3 mb-4">
            <div className="col-6 col-lg-3">
              <div className="neu-card p-3 h-100" style={{ borderRadius: '16px' }}>
                <span className="small text-muted fw-bold text-uppercase d-block mb-1">Slot Duration</span>
                <div className="d-flex align-items-center justify-content-between mt-1">
                  <span className="fs-4 fw-bold" style={{ color: 'var(--hospital-blue)', fontFamily: 'var(--font-display)' }}>
                    {activeSchedule.slotDuration}m
                  </span>
                  <select
                    aria-label="Change slot duration"
                    className="neu-select py-1 px-2"
                    style={{ width: 'auto', fontSize: '0.8rem' }}
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
                <div className="small text-muted mt-2" style={{ fontSize: '0.75rem' }}>Appointment consultation block</div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="neu-card p-3 h-100" style={{ borderRadius: '16px' }}>
                <span className="small text-muted fw-bold text-uppercase d-block mb-1">Patient Capacity</span>
                <span className="fs-4 fw-bold" style={{ color: 'var(--neu-success)', fontFamily: 'var(--font-display)' }}>
                  {activeSchedule.capacity} / slot
                </span>
                <div className="small text-muted mt-2" style={{ fontSize: '0.75rem' }}>One patient per consultation slot</div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="neu-card p-3 h-100" style={{ borderRadius: '16px' }}>
                <span className="small text-muted fw-bold text-uppercase d-block mb-1">Timezone</span>
                <span className="fs-5 fw-bold d-block text-truncate" style={{ color: 'var(--hospital-primary-navy)' }}>
                  {activeSchedule.timezone}
                </span>
                <div className="small text-muted mt-2" style={{ fontSize: '0.75rem' }}>Indian Standard Time (IST)</div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="neu-card p-3 h-100" style={{ borderRadius: '16px' }}>
                <span className="small text-muted fw-bold text-uppercase d-block mb-1">Active Clinic Days</span>
                <span className="fs-4 fw-bold" style={{ color: 'var(--hospital-cyan)', fontFamily: 'var(--font-display)' }}>
                  {activeDaysCount} of 7 days
                </span>
                <div className="small text-muted mt-2" style={{ fontSize: '0.75rem' }}>Weekly recurring shift assignments</div>
              </div>
            </div>
          </section>

          {/* Weekly Schedule Table */}
          <section 
            className="neu-card p-4 mb-4" 
            style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h3 className="fs-6 fw-bold mb-1" style={{ color: 'var(--hospital-primary-navy)' }}>
                  Weekly Recurring Roster for {doctor?.name}
                </h3>
                <p className="small text-muted mb-0">
                  Standard recurring outpatient shift timings and breaks backed by PostgreSQL database.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  className="neu-btn neu-btn-primary neu-btn-sm d-inline-flex align-items-center gap-1"
                  onClick={() => setShowOverrideModal(true)}
                >
                  <Plus size={14} /> Add Override
                </button>
              </div>
            </div>

            <div className="neu-table-container">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Clinic Status</th>
                    <th>Shift Hours</th>
                    <th>Midday Breaks</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map((day) => {
                    const config = activeSchedule.weeklySchedule?.[day] || { enabled: false, breaks: [] };

                    return (
                      <tr key={day}>
                        <td className="fw-semibold">{day}</td>
                        <td>
                          <span
                            className={`neu-badge ${
                              config.enabled ? 'neu-badge-success' : 'neu-badge-secondary'
                            }`}
                          >
                            {config.enabled ? 'Active OPD' : 'Closed / Off Duty'}
                          </span>
                        </td>
                        <td>
                          {config.enabled ? (
                            <span className="fw-semibold">
                              {config.start} - {config.end}
                            </span>
                          ) : (
                            <span className="text-muted fst-italic">No OPD Scheduled</span>
                          )}
                        </td>
                        <td>
                          {config.enabled && config.breaks && config.breaks.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1">
                              {config.breaks.map((b, bIdx) => (
                                <span 
                                  key={bIdx} 
                                  className="px-2 py-0.5 rounded small"
                                  style={{ 
                                    background: 'var(--hospital-surface)', 
                                    boxShadow: 'var(--neu-inset)',
                                    fontSize: '0.75rem',
                                    color: '#B7791F'
                                  }}
                                  title={b.label}
                                >
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
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="neu-btn neu-btn-outline neu-btn-sm me-1"
                            onClick={() => {
                              setEditShiftDay(day);
                              setEditShiftStart(config.start || '09:00');
                              setEditShiftEnd(config.end || '13:00');
                              setEditShiftEnabled(config.enabled);
                            }}
                          >
                            <Edit3 size={12} className="me-1" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`neu-btn neu-btn-sm ${config.enabled ? 'neu-btn-danger' : 'neu-btn-primary'}`}
                            onClick={() => handleToggleDay(day)}
                          >
                            <Power size={12} className="me-1" />
                            {config.enabled ? 'Mark Off' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card List (< 768px) */}
            <div className="d-md-none p-2 d-flex flex-column gap-3">
              {daysOfWeek.map((day) => {
                const config = activeSchedule.weeklySchedule?.[day] || { enabled: false, breaks: [] };
                return (
                  <div key={day} className="admin-mobile-card">
                    <div className="admin-mobile-card-row">
                      <span className="fw-bold fs-6" style={{ color: 'var(--hospital-primary-navy)' }}>
                        {day}
                      </span>
                      <span
                        className={`neu-badge ${
                          config.enabled ? 'neu-badge-success' : 'neu-badge-secondary'
                        }`}
                      >
                        {config.enabled ? 'Active OPD' : 'Closed / Off Duty'}
                      </span>
                    </div>

                    <div className="mt-2 small">
                      <span className="text-muted">Shift Hours: </span>
                      {config.enabled ? (
                        <strong className="text-body">{config.start} - {config.end}</strong>
                      ) : (
                        <span className="text-muted fst-italic">No OPD Scheduled</span>
                      )}
                    </div>

                    <div className="mt-1 small">
                      <span className="text-muted">Midday Breaks: </span>
                      {config.enabled && config.breaks && config.breaks.length > 0 ? (
                        <span className="fw-semibold">
                          {config.breaks.map((b) => `${b.start}-${b.end} (${b.label})`).join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </div>

                    <div className="admin-mobile-card-actions">
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm"
                        onClick={() => {
                          setEditShiftDay(day);
                          setEditShiftStart(config.start || '09:00');
                          setEditShiftEnd(config.end || '13:00');
                          setEditShiftEnabled(config.enabled);
                        }}
                      >
                        <Edit3 size={14} className="me-1" />
                        Edit Shift
                      </button>
                      <button
                        type="button"
                        className={`neu-btn neu-btn-sm ${config.enabled ? 'neu-btn-danger' : 'neu-btn-primary'}`}
                        onClick={() => handleToggleDay(day)}
                      >
                        <Power size={14} className="me-1" />
                        {config.enabled ? 'Mark Off' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 7-Day Visual Calendar Grid */}
          <section 
            className="neu-card p-4 mb-4" 
            style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
          >
            <h3 className="fs-6 fw-bold mb-1" style={{ color: 'var(--hospital-primary-navy)' }}>
              7-Day Visual Roster Calendar View
            </h3>
            <p className="small text-muted mb-3">
              Consolidated visual matrix incorporating weekly shifts, clinical breaks, scheduled leaves, and active overrides.
            </p>

            <div className="row g-2">
              {representativeCalendar.map((col) => (
                <div key={col.day} className="col-12 col-sm-6 col-md-4 col-lg">
                  <div 
                    className="p-3 neu-card-sm h-100 d-flex flex-column"
                    style={{ 
                      borderRadius: '14px', 
                      background: 'var(--hospital-surface)',
                      borderTop: `3px solid ${col.isLeave ? 'var(--neu-error)' : col.isOverride ? '#B7791F' : col.status === 'Active OPD' ? 'var(--neu-success)' : 'var(--hospital-border)'}`
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold">{col.day.slice(0, 3)}</span>
                      <span className="small text-muted">{col.displayDate}</span>
                    </div>

                    <div className="mb-2">
                      <span className={`neu-badge ${col.badgeClass} w-100 text-center py-1`} style={{ fontSize: '0.7rem' }}>
                        {col.status}
                      </span>
                    </div>

                    <div className="small fw-semibold mt-1 text-truncate" title={col.hours}>
                      {col.hours}
                    </div>

                    {col.breaks.length > 0 && (
                      <div className="small text-muted mt-auto pt-2 border-top" style={{ fontSize: '0.72rem', borderColor: 'var(--hospital-border)' }}>
                        Break: {col.breaks[0].start} - {col.breaks[0].end}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Clinical Break Management */}
          <section 
            className="neu-card p-4 mb-4" 
            style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
          >
            <div className="d-flex align-items-center gap-2 mb-1">
              <Coffee size={18} color="#B7791F" />
              <h3 className="fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                Clinical Break Management
              </h3>
            </div>
            <p className="small text-muted mb-3">
              Structured intervals reserved for documentation, clinical rounds, and handoffs. Break slots are protected from booking.
            </p>

            {allWeeklyBreaks.length > 0 ? (
              <div className="row g-3">
                {allWeeklyBreaks.map((item, idx) => (
                  <div key={idx} className="col-12 col-md-6 col-lg-4">
                    <div 
                      className="p-3 neu-card-sm"
                      style={{ borderRadius: '14px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold">{item.day}</span>
                        <span 
                          className="px-2 py-0.5 rounded small font-monospace"
                          style={{ background: 'var(--hospital-surface)', boxShadow: 'var(--neu-inset)', color: '#B7791F', fontSize: '0.75rem' }}
                        >
                          {item.start} - {item.end}
                        </span>
                      </div>
                      <div className="small text-muted">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 neu-card-sm text-muted small" style={{ borderRadius: '14px' }}>
                No recurring midday clinical breaks are currently logged for this specialist in PostgreSQL.
              </div>
            )}
          </section>

          {/* Leave & Overrides Grid */}
          <div className="row g-4 mb-4">
            {/* Scheduled Leaves Column */}
            <div className="col-12 col-lg-6">
              <section 
                className="neu-card p-4 h-100" 
                style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Scheduled Leaves & Absences
                  </h3>
                  <span className="neu-badge neu-badge-info">{activeSchedule.leaves?.length || 0} Records</span>
                </div>
                <p className="small text-muted mb-3">
                  Approved clinical leaves, conferences, and institutional holiday absences.
                </p>

                {activeSchedule.leaves && activeSchedule.leaves.length > 0 ? (
                  <div className="neu-table-container">
                    <table className="neu-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Reason</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSchedule.leaves.map((l, index) => (
                          <tr key={index}>
                            <td className="fw-semibold text-nowrap">{l.date}</td>
                            <td>{l.reason}</td>
                            <td>
                              <span className="neu-badge neu-badge-danger">
                                {l.status || 'On Leave'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 neu-card-sm text-muted small text-center" style={{ borderRadius: '14px' }}>
                    No scheduled leaves recorded for this specialist in PostgreSQL.
                  </div>
                )}
              </section>
            </div>

            {/* Schedule Overrides Column */}
            <div className="col-12 col-lg-6">
              <section 
                className="neu-card p-4 h-100" 
                style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Schedule Overrides & Special OPDs
                  </h3>
                  <span className="neu-badge neu-badge-info">{activeSchedule.overrides?.length || 0} Records</span>
                </div>
                <p className="small text-muted mb-3">
                  One-off adjustments to recurring hours such as extended clinics, screening camps, or holiday hours.
                </p>

                {activeSchedule.overrides && activeSchedule.overrides.length > 0 ? (
                  <div className="neu-table-container">
                    <table className="neu-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Hours</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSchedule.overrides.map((ov, index) => (
                          <tr key={index}>
                            <td className="fw-semibold text-nowrap">{ov.date}</td>
                            <td>
                              <span className="neu-badge neu-badge-warning">
                                {ov.type}
                              </span>
                            </td>
                            <td className="text-nowrap">
                              {!ov.is_available ? (
                                <span className="small text-muted">Closed</span>
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
                  <div className="p-3 neu-card-sm text-muted small text-center" style={{ borderRadius: '14px' }}>
                    No active schedule overrides logged for this specialist in PostgreSQL.
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {/* Edit Shift Hours Modal */}
      {editShiftDay && (
        <div
          className="modal show d-block glass-modal-backdrop"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content glass-modal neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
            >
              <form onSubmit={handleSaveShift}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Configure Shift: {editShiftDay}
                  </h5>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', padding: 0 }}
                    onClick={() => setEditShiftDay(null)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  <div className="mb-3">
                    <label className="d-flex align-items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editShiftEnabled}
                        onChange={(e) => setEditShiftEnabled(e.target.checked)}
                      />
                      <span className="small fw-semibold">Active OPD on {editShiftDay}</span>
                    </label>
                  </div>

                  {editShiftEnabled && (
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="neu-form-label">Start Time</label>
                        <input
                          type="time"
                          className="neu-input"
                          value={editShiftStart}
                          onChange={(e) => setEditShiftStart(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <label className="neu-form-label">End Time</label>
                        <input
                          type="time"
                          className="neu-input"
                          value={editShiftEnd}
                          onChange={(e) => setEditShiftEnd(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div 
                  className="modal-footer px-4 py-3 border-top"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline neu-btn-sm"
                    onClick={() => setEditShiftDay(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Shift to Database'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Override Modal */}
      {showOverrideModal && (
        <div
          className="modal show d-block glass-modal-backdrop"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content glass-modal neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
            >
              <form onSubmit={handleAddOverride}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Add Schedule Override for {doctor?.name}
                  </h5>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', padding: 0 }}
                    onClick={() => {
                      setShowOverrideModal(false);
                      setModalError(null);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  {modalError && (
                    <div 
                      className="p-3 mb-3 small"
                      style={{ 
                        borderRadius: '12px', 
                        background: 'var(--hospital-surface)', 
                        borderLeft: '4px solid var(--neu-error)',
                        color: 'var(--neu-error)'
                      }}
                    >
                      <strong>Validation Error: </strong> {modalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="neu-form-label">Override Date</label>
                    <input
                      type="date"
                      className="neu-input"
                      value={newOverrideDate}
                      onChange={(e) => {
                        setNewOverrideDate(e.target.value);
                        setModalError(null);
                      }}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="neu-form-label">Override Type</label>
                    <select
                      className="neu-select"
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
                      <option value="CLOSED">Closed All Day</option>
                    </select>
                  </div>

                  {newOverrideType === 'CLOSED' ? (
                    <div className="p-3 mb-3 small text-muted rounded" style={{ background: 'var(--hospital-surface)', boxShadow: 'var(--neu-inset)' }}>
                      Clinic will be marked <strong>Closed</strong> all day on this date. Outpatient appointment bookings will be disabled.
                    </div>
                  ) : (
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="neu-form-label">Start Time</label>
                        <input
                          type="time"
                          className="neu-input"
                          value={newOverrideStart}
                          onChange={(e) => {
                            setNewOverrideStart(e.target.value);
                            setModalError(null);
                          }}
                          required={newOverrideType !== 'CLOSED'}
                        />
                      </div>
                      <div className="col-6">
                        <label className="neu-form-label">End Time</label>
                        <input
                          type="time"
                          className="neu-input"
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
                    <label className="neu-form-label">Clinical Reason</label>
                    <input
                      type="text"
                      className="neu-input"
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

                <div 
                  className="modal-footer px-4 py-3 border-top"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline neu-btn-sm"
                    onClick={() => {
                      setShowOverrideModal(false);
                      setModalError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save to Database'}
                  </button>
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
