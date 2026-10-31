import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  RotateCw, 
  X, 
  CalendarRange, 
  MapPin, 
  Check 
} from 'lucide-react';
import scheduleService from '../../services/scheduleService';

export function DoctorSchedulePage() {
  const { doctorProfile } = useOutletContext() || {};
  const [schedules, setSchedules] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Leave Form state
  const [leaveForm, setLeaveForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Slot availability inspection
  const [selectedInspectDate, setSelectedInspectDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const doctorIdentifier = doctorProfile?.slug || doctorProfile?.id;

  const loadScheduleData = async () => {
    if (!doctorIdentifier) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const [schedList, leaveList] = await Promise.all([
        scheduleService.getDoctorSchedules(doctorIdentifier),
        scheduleService.getDoctorLeaves(doctorIdentifier),
      ]);
      setSchedules(schedList || []);
      setLeaves(leaveList || []);
    } catch (err) {
      setActionError(`Failed to load schedule data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScheduleData();
  }, [doctorIdentifier]);

  // Load preview slots when selectedInspectDate changes
  useEffect(() => {
    if (!doctorIdentifier || !selectedInspectDate) return;
    setIsLoadingSlots(true);
    scheduleService
      .getAvailability(doctorIdentifier, selectedInspectDate)
      .then((res) => {
        setAvailableSlots(res?.slots || []);
      })
      .catch(() => {
        setAvailableSlots([]);
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });
  }, [doctorIdentifier, selectedInspectDate]);

  // Lock body scroll and listen for Escape key when leave modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showLeaveModal) {
        setShowLeaveModal(false);
      }
    };
    if (showLeaveModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLeaveModal]);

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      setActionError('Please fill in start date, end date, and reason for leave.');
      return;
    }
    if (leaveForm.end_date < leaveForm.start_date) {
      setActionError('Leave end date cannot be earlier than start date.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionNotice(null);

    try {
      await scheduleService.saveLeave({
        doctor: doctorProfile.id,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason,
      });

      setActionNotice('Scheduled leave successfully recorded. Outpatient booking slots during this window are now blocked.');
      setShowLeaveModal(false);
      setLeaveForm({ start_date: '', end_date: '', reason: '' });
      loadScheduleData();
    } catch (err) {
      setActionError(`Failed to record leave: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    setActionError(null);
    setActionNotice(null);
    try {
      await scheduleService.deleteLeave(leaveId);
      setActionNotice('Leave schedule removed. Consultation availability restored.');
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    } catch (err) {
      setActionError(`Failed to cancel leave: ${err.message}`);
    }
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="doctor-schedule-view">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h4 fw-bold text-body mb-0.5">Consultation Schedule & Availability</h1>
          <p className="text-muted small mb-0">
            View active weekly OPD shifts, manage leaves, and preview real-time patient booking slots.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="neu-btn neu-btn-outline neu-btn-sm d-flex align-items-center gap-1.5"
            style={{ minHeight: '44px' }}
            onClick={loadScheduleData}
            disabled={isLoading}
          >
            <RotateCw size={14} className={isLoading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="neu-btn neu-btn-primary neu-btn-sm d-flex align-items-center gap-1.5"
            style={{ minHeight: '44px' }}
            onClick={() => setShowLeaveModal(true)}
          >
            <Plus size={14} />
            <span>Request Leave / Blackout</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-4" role="alert">
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-4" role="alert">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="row g-4 mb-4">
        {/* Weekly Shifts */}
        <div className="col-12 col-xl-7">
          <div className="neu-card rounded-4 p-4 h-100">
            <h2 className="fs-6 fw-bold text-body mb-3 d-flex align-items-center gap-2">
              <Clock size={16} className="text-primary" />
              Standard Weekly OPD Hours
            </h2>

            {isLoading ? (
              <div className="text-center py-4 text-muted">
                <RotateCw size={20} className="spin-anim mb-2 text-primary" />
                <div>Loading consultant schedule...</div>
              </div>
            ) : schedules.length === 0 ? (
              <div className="neu-inset p-4 rounded-3 text-center text-muted">
                <Calendar size={28} className="mb-2 text-muted" />
                <div className="fw-semibold">Standard Outpatient Hours: Mon – Fri (09:00 – 17:00)</div>
                <div className="small text-muted mt-1">Consultation Slot Duration: {doctorProfile?.consultation_duration_minutes || 30} minutes</div>
              </div>
            ) : (
              <>
                {/* Desktop Shifts Table (>= 768px) */}
                <div className="table-responsive d-none d-md-block">
                  <table className="neu-table w-100">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Working Hours</th>
                        <th>Slot Length</th>
                        <th>Capacity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((sch) => (
                        <tr key={sch.id}>
                          <td className="fw-semibold">{sch.day_of_week}</td>
                          <td className="font-monospace text-primary">
                            {sch.start_time?.slice(0, 5)} – {sch.end_time?.slice(0, 5)}
                          </td>
                          <td>{sch.slot_duration_minutes} mins</td>
                          <td>{sch.capacity} patient/slot</td>
                          <td>
                            <span className={`badge ${sch.is_working_day ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.72rem' }}>
                              {sch.is_working_day ? 'Active OPD' : 'Off'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Shift Cards (< 768px) */}
                <div className="d-md-none d-flex flex-column gap-2.5">
                  {schedules.map((sch) => (
                    <div key={sch.id} className="doctor-mobile-card neu-inset p-3 rounded-3">
                      <div className="d-flex justify-content-between align-items-center mb-1.5">
                        <span className="fw-bold text-body fs-6">{sch.day_of_week}</span>
                        <span className={`badge ${sch.is_working_day ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.72rem' }}>
                          {sch.is_working_day ? 'Active OPD' : 'Off'}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-1.5 font-monospace text-primary fw-semibold small mb-1">
                        <Clock size={13} />
                        <span>{sch.start_time?.slice(0, 5)} – {sch.end_time?.slice(0, 5)}</span>
                      </div>
                      <div className="small text-muted d-flex justify-content-between">
                        <span>Slot: {sch.slot_duration_minutes} mins</span>
                        <span>Capacity: {sch.capacity} patient/slot</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Scheduled Leaves */}
        <div className="col-12 col-xl-5">
          <div className="neu-card rounded-4 p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h2 className="fs-6 fw-bold text-body mb-0 d-flex align-items-center gap-2">
                <CalendarRange size={16} className="text-primary" />
                Scheduled Leaves & Blackouts
              </h2>
              <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>{leaves.length} active</span>
            </div>

            {leaves.length === 0 ? (
              <div className="neu-inset p-4 rounded-3 text-center text-muted">
                <div className="fw-medium">No active leaves scheduled.</div>
                <div className="small text-muted mt-1">You are currently fully available during standard OPD hours.</div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2.5">
                {leaves.map((leave) => (
                  <div key={leave.id} className="neu-inset p-3 rounded-3 d-flex align-items-center justify-content-between">
                    <div>
                      <div className="small fw-bold text-body">
                        {leave.start_date} {leave.start_date !== leave.end_date ? `to ${leave.end_date}` : ''}
                      </div>
                      <div className="small text-muted mt-0.5">{leave.reason}</div>
                    </div>
                    <button
                      type="button"
                      className="neu-btn neu-btn-danger neu-btn-sm d-flex align-items-center justify-content-center"
                      style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '10px' }}
                      onClick={() => handleDeleteLeave(leave.id)}
                      title="Cancel this leave"
                      aria-label="Cancel this leave"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Available Slot Preview */}
      <div className="neu-card rounded-4 p-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
          <div>
            <h2 className="fs-6 fw-bold text-body mb-0.5">Live Booking Slots Preview</h2>
            <div className="small text-muted">Check real-time slot generation as seen by patients</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="neu-form-label mb-0 small">Inspect Date:</label>
            <input
              type="date"
              className="neu-input py-1 px-2.5"
              style={{ width: '170px', fontSize: '16px', minHeight: '44px' }}
              value={selectedInspectDate}
              onChange={(e) => setSelectedInspectDate(e.target.value)}
            />
          </div>
        </div>

        {isLoadingSlots ? (
          <div className="text-center py-4 text-muted">
            <RotateCw size={18} className="spin-anim mb-2 text-primary" />
            <div>Calculating availability slots...</div>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-4 text-muted neu-inset rounded-3">
            <div>No available booking slots on {selectedInspectDate}.</div>
            <div className="small text-muted mt-1">Day may be off, fully booked, or covered by scheduled leave.</div>
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-2">
            {availableSlots.map((slot, index) => {
              const isAvailable = slot.is_available !== false && slot.available !== false;
              return (
                <div
                  key={index}
                  className={`px-3 py-2 rounded-3 font-monospace small d-inline-flex align-items-center ${
                    isAvailable ? 'neu-raised text-success fw-bold' : 'neu-inset text-muted'
                  }`}
                  style={{
                    background: isAvailable ? 'rgba(22, 132, 91, 0.08)' : 'var(--hospital-surface)',
                    border: isAvailable ? '1px solid rgba(22, 132, 91, 0.25)' : '1px solid var(--hospital-border)',
                    minHeight: '38px'
                  }}
                >
                  {slot.start_time || slot.time || slot}
                  {!isAvailable && <span className="ms-1 text-danger small">(Booked)</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Leave Modal */}
      {showLeaveModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(10, 25, 47, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLeaveModal(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content neu-raised neu-surface rounded-4 p-0 border-0 overflow-hidden shadow-lg">
              <form onSubmit={handleRequestLeave}>
                <div className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="modal-title fs-6 fw-bold mb-0">Record Leave / Unavailable Period</h5>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-muted p-2 d-flex align-items-center justify-content-center"
                    style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
                    onClick={() => setShowLeaveModal(false)}
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="neu-form-label">
                      Start Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="neu-input w-100"
                      style={{ fontSize: '16px', minHeight: '44px' }}
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">
                      End Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="neu-input w-100"
                      style={{ fontSize: '16px', minHeight: '44px' }}
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">
                      Reason for Absence <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="neu-input w-100"
                      style={{ fontSize: '16px', minHeight: '44px' }}
                      placeholder="e.g. Annual Leave, Medical Conference, Emergency"
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer px-4 py-3 border-top d-flex justify-content-between">
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline neu-btn-sm"
                    style={{ minHeight: '44px', minWidth: '90px' }}
                    onClick={() => setShowLeaveModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="neu-btn neu-btn-primary neu-btn-sm"
                    style={{ minHeight: '44px' }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Recording...' : 'Confirm Leave'}
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

export default DoctorSchedulePage;
