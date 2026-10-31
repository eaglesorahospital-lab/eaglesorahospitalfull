import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Clock, 
  Search, 
  Filter, 
  RotateCw, 
  Eye, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Phone, 
  Mail, 
  FileText 
} from 'lucide-react';
import appointmentService from '../../services/appointmentService';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';

export function DoctorAppointmentsPage() {
  const { doctorProfile } = useOutletContext() || {};
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [consultationNote, setConsultationNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const fetchAppointments = () => {
    setIsLoading(true);
    setActionError(null);
    appointmentService
      .getAppointments({ page_size: 150 })
      .then((data) => {
        setAppointments(data || []);
      })
      .catch((err) => {
        setActionError(`Failed to load consultant appointments: ${err.message}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Lock body scroll and listen for Escape key when consultation modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedAppointment) {
        setSelectedAppointment(null);
      }
    };
    if (selectedAppointment) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAppointment]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchSearch =
        searchTerm === '' ||
        apt.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apt.reasonForVisit || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (apt.status && apt.status.toUpperCase() === statusFilter.toUpperCase());

      return matchSearch && matchStatus;
    });
  }, [appointments, searchTerm, statusFilter]);

  const handleOpenAppointment = (apt) => {
    setSelectedAppointment(apt);
    setConsultationNote(apt.notes || '');
  };

  const handleUpdateStatus = async (reference, newStatus) => {
    setActionError(null);
    setActionNotice(null);
    try {
      await appointmentService.updateAppointmentStatus(reference, newStatus);
      setActionNotice(`Appointment ${reference} status updated to ${newStatus}.`);
      fetchAppointments();
      if (selectedAppointment?.reference === reference) {
        setSelectedAppointment((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setActionError(`Could not update appointment status: ${err.message}`);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedAppointment) return;
    setActionError(null);
    setIsSavingNote(true);
    try {
      await appointmentService.updateAppointmentStatus(
        selectedAppointment.reference,
        null,
        consultationNote
      );
      setActionNotice(`Clinical note saved for ${selectedAppointment.reference}.`);
      setSelectedAppointment((prev) => ({ ...prev, notes: consultationNote }));
      setAppointments((prev) =>
        prev.map((apt) => (apt.reference === selectedAppointment.reference ? { ...apt, notes: consultationNote } : apt))
      );
    } catch (err) {
      setActionError(`Could not save clinical note: ${err.message}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="doctor-appointments-view">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h4 fw-bold text-body mb-0.5">My Consultations & Appointments</h1>
          <p className="text-muted small mb-0">
            Authoritative clinical appointments roster assigned to your practice.
          </p>
        </div>
        <button
          type="button"
          className="neu-btn neu-btn-outline neu-btn-sm d-flex align-items-center gap-1.5"
          onClick={fetchAppointments}
          disabled={isLoading}
        >
          <RotateCw size={14} className={isLoading ? 'spin-anim' : ''} />
          <span>Refresh</span>
        </button>
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

      {/* Filter Bar */}
      <div className="neu-card rounded-4 p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="position-relative">
              <Search size={16} className="position-absolute start-0 top-50 translate-middle-y ms-3 text-muted" />
              <input
                type="text"
                className="neu-input ps-5 w-100"
                style={{ fontSize: '16px', minHeight: '44px' }}
                placeholder="Search by patient name, reference code, or symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <select
              className="neu-select w-100"
              style={{ fontSize: '16px', minHeight: '44px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Consultation Statuses</option>
              <option value="REQUESTED">Pending Request (REQUESTED)</option>
              <option value="CONFIRMED">Confirmed Slots (CONFIRMED)</option>
              <option value="COMPLETED">Completed Consultations (COMPLETED)</option>
              <option value="CANCELLED">Cancelled Bookings (CANCELLED)</option>
            </select>
          </div>
          <div className="col-12 col-md-2 text-md-end text-muted small">
            <span>Showing <strong>{filteredAppointments.length}</strong> cases</span>
          </div>
        </div>
      </div>

      {/* Table & Responsive Cards */}
      <div className="neu-card rounded-4 p-0 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-5 text-muted">
            <RotateCw size={24} className="spin-anim mb-2 text-primary" />
            <div>Loading appointments...</div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-5 text-muted p-4">
            <AlertCircle size={28} className="mb-2 text-muted" />
            <div className="fw-semibold">No appointments found matching filter criteria.</div>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="table-responsive d-none d-md-block">
              <table className="neu-table w-100 mb-0">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Patient Details</th>
                    <th>Consultation Date & Slot</th>
                    <th>Type</th>
                    <th>Reason / Chief Complaint</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.reference}>
                      <td>
                        <span className="small font-monospace px-2.5 py-1 rounded neu-inset text-primary fw-bold">
                          {apt.reference}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold text-body">{apt.patientName}</div>
                        <div className="small text-muted">{apt.patientContact || 'Outpatient'}</div>
                      </td>
                      <td>
                        <div className="small fw-bold text-body">{apt.date}</div>
                        <div className="small text-muted font-monospace">{apt.time || apt.startTime?.slice(0, 5)} ({apt.duration || '30m'})</div>
                      </td>
                      <td>
                        <span className="small text-muted">{apt.type || 'In-Person OPD'}</span>
                      </td>
                      <td className="small text-muted" style={{ maxWidth: '250px' }}>
                        <div className="text-truncate">{apt.reasonForVisit || 'General Clinical Consultation'}</div>
                      </td>
                      <td>
                        <AdminStatusBadge status={apt.status} />
                      </td>
                      <td className="text-end text-nowrap">
                        <div className="d-inline-flex gap-1.5">
                          <button
                            type="button"
                            className="neu-btn neu-btn-outline neu-btn-sm"
                            onClick={() => handleOpenAppointment(apt)}
                            title="Open consultation dossier"
                          >
                            <Eye size={12} className="me-1" />
                            View
                          </button>
                          {apt.status === 'REQUESTED' && (
                            <button
                              type="button"
                              className="neu-btn neu-btn-primary neu-btn-sm"
                              style={{ background: '#0D47A1', borderColor: '#0D47A1', color: '#fff' }}
                              onClick={() => handleUpdateStatus(apt.reference, 'CONFIRMED')}
                              title="Confirm appointment"
                            >
                              <Check size={12} className="me-1" />
                              Confirm
                            </button>
                          )}
                          {apt.status === 'CONFIRMED' && (
                            <>
                              <button
                                type="button"
                                className="neu-btn neu-btn-outline neu-btn-sm text-primary"
                                onClick={() => handleUpdateStatus(apt.reference, 'CHECKED_IN')}
                                title="Mark checked in at desk"
                              >
                                <Check size={12} className="me-1" />
                                Check In
                              </button>
                              <button
                                type="button"
                                className="neu-btn neu-btn-outline neu-btn-sm text-warning"
                                onClick={() => handleUpdateStatus(apt.reference, 'NO_SHOW')}
                                title="Mark patient as no-show"
                              >
                                No Show
                              </button>
                            </>
                          )}
                          {apt.status === 'CHECKED_IN' && (
                            <button
                              type="button"
                              className="neu-btn neu-btn-primary neu-btn-sm"
                              style={{ background: '#16845B', borderColor: '#16845B', color: '#fff' }}
                              onClick={() => handleUpdateStatus(apt.reference, 'COMPLETED')}
                              title="Complete consultation"
                            >
                              <Check size={12} className="me-1" />
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Glass Cards (< 768px) */}
            <div className="d-md-none p-3 d-flex flex-column gap-3">
              {filteredAppointments.map((apt) => (
                <div key={apt.reference} className="doctor-mobile-card neu-inset p-3 rounded-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small font-monospace px-2.5 py-1 rounded neu-inset text-primary fw-bold">
                      {apt.reference}
                    </span>
                    <AdminStatusBadge status={apt.status} />
                  </div>
                  <div className="fw-bold text-body fs-6">{apt.patientName}</div>
                  <div className="small text-muted mb-2">{apt.patientContact || 'Outpatient'} • {apt.type || 'In-Person OPD'}</div>
                  <div className="d-flex align-items-center gap-2 small text-body mb-2">
                    <Calendar size={13} className="text-primary flex-shrink-0" />
                    <span className="fw-semibold">{apt.date}</span>
                    <span className="text-muted font-monospace">{apt.time || apt.startTime?.slice(0, 5)}</span>
                  </div>
                  <div className="small text-body-secondary p-2 rounded-2 neu-inset mb-3" style={{ fontSize: '0.8rem' }}>
                    {apt.reasonForVisit || 'General Clinical Consultation'}
                  </div>
                  <div className="d-flex flex-wrap gap-2 pt-1 border-top">
                    <button
                      type="button"
                      className="neu-btn neu-btn-outline neu-btn-sm flex-fill"
                      onClick={() => handleOpenAppointment(apt)}
                      title="Open consultation dossier"
                    >
                      <Eye size={14} className="me-1" />
                      View Dossier
                    </button>
                    {apt.status === 'REQUESTED' && (
                      <button
                        type="button"
                        className="neu-btn neu-btn-primary neu-btn-sm flex-fill"
                        style={{ background: '#0D47A1', borderColor: '#0D47A1', color: '#fff' }}
                        onClick={() => handleUpdateStatus(apt.reference, 'CONFIRMED')}
                      >
                        <Check size={14} className="me-1" />
                        Confirm
                      </button>
                    )}
                    {apt.status === 'CONFIRMED' && (
                      <>
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm text-primary flex-fill"
                          onClick={() => handleUpdateStatus(apt.reference, 'CHECKED_IN')}
                        >
                          <Check size={14} className="me-1" />
                          Check In
                        </button>
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm text-warning flex-fill"
                          onClick={() => handleUpdateStatus(apt.reference, 'NO_SHOW')}
                        >
                          No Show
                        </button>
                      </>
                    )}
                    {apt.status === 'CHECKED_IN' && (
                      <button
                        type="button"
                        className="neu-btn neu-btn-primary neu-btn-sm flex-fill"
                        style={{ background: '#16845B', borderColor: '#16845B', color: '#fff' }}
                        onClick={() => handleUpdateStatus(apt.reference, 'COMPLETED')}
                      >
                        <Check size={14} className="me-1" />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedAppointment && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(10, 25, 47, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAppointment(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content neu-raised neu-surface rounded-4 p-0 border-0 overflow-hidden shadow-lg">
              <div className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fs-6 fw-bold mb-0">Consultation File: {selectedAppointment.reference}</h5>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-2 d-flex align-items-center justify-content-center"
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
                  onClick={() => setSelectedAppointment(null)}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body p-4">
                <div className="neu-inset p-3 rounded-3 mb-3">
                  <div className="small text-muted mb-0.5">Patient Details</div>
                  <div className="fs-6 fw-bold text-body">{selectedAppointment.patientName}</div>
                  <div className="small text-muted mt-1 d-flex flex-wrap gap-3">
                    <span>Contact: {selectedAppointment.patientContact || 'N/A'}</span>
                    {selectedAppointment.patientEmail && <span>Email: {selectedAppointment.patientEmail}</span>}
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <div className="neu-inset p-2.5 rounded-3">
                      <div className="small text-muted" style={{ fontSize: '0.72rem' }}>Appointment Date</div>
                      <div className="fw-bold text-body">{selectedAppointment.date}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="neu-inset p-2.5 rounded-3">
                      <div className="small text-muted" style={{ fontSize: '0.72rem' }}>Time Slot</div>
                      <div className="fw-bold text-primary font-monospace">{selectedAppointment.time} ({selectedAppointment.duration || '30m'})</div>
                    </div>
                  </div>
                </div>

                <div className="neu-inset p-3 rounded-3 mb-3">
                  <div className="small text-muted mb-1" style={{ fontSize: '0.75rem' }}>Reason for Consultation</div>
                  <div className="small text-body">{selectedAppointment.reasonForVisit || 'Routine Consultation'}</div>
                </div>

                {/* Clinical Notes Editor */}
                <div className="neu-inset p-3 rounded-3 mb-3">
                  <div className="small text-muted mb-1 d-flex justify-content-between align-items-center" style={{ fontSize: '0.75rem' }}>
                    <span className="fw-semibold">Clinical & Administrative Remarks</span>
                    <span className="text-muted">Stored in appointment record</span>
                  </div>
                  <textarea
                    className="neu-input small font-monospace mt-1 w-100"
                    style={{ fontSize: '16px', minHeight: '80px' }}
                    rows="3"
                    placeholder="Enter clinical observations, triage notes, or consultation summary..."
                    value={consultationNote}
                    onChange={(e) => setConsultationNote(e.target.value)}
                  />
                  <div className="d-flex justify-content-end mt-2">
                    <button
                      type="button"
                      className="neu-btn neu-btn-outline neu-btn-sm"
                      style={{ minHeight: '44px' }}
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                    >
                      {isSavingNote ? 'Saving...' : 'Save Clinical Note'}
                    </button>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-between pt-2">
                  <span className="small text-muted">Current Status:</span>
                  <AdminStatusBadge status={selectedAppointment.status} />
                </div>
              </div>
              <div className="modal-footer px-4 py-3 border-top d-flex justify-content-between">
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
                  style={{ minHeight: '44px', minWidth: '90px' }}
                  onClick={() => setSelectedAppointment(null)}
                >
                  Close
                </button>
                <div className="d-flex flex-wrap gap-2">
                  {selectedAppointment.status === 'REQUESTED' && (
                    <button
                      type="button"
                      className="neu-btn neu-btn-primary neu-btn-sm"
                      style={{ minHeight: '44px' }}
                      onClick={() => handleUpdateStatus(selectedAppointment.reference, 'CONFIRMED')}
                    >
                      Confirm
                    </button>
                  )}
                  {selectedAppointment.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm text-primary"
                        style={{ minHeight: '44px' }}
                        onClick={() => handleUpdateStatus(selectedAppointment.reference, 'CHECKED_IN')}
                      >
                        Mark Checked In
                      </button>
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm text-warning"
                        style={{ minHeight: '44px' }}
                        onClick={() => handleUpdateStatus(selectedAppointment.reference, 'NO_SHOW')}
                      >
                        Mark No-Show
                      </button>
                    </>
                  )}
                  {selectedAppointment.status === 'CHECKED_IN' && (
                    <button
                      type="button"
                      className="neu-btn neu-btn-primary neu-btn-sm"
                      style={{ background: '#16845B', borderColor: '#16845B', color: '#fff', minHeight: '44px' }}
                      onClick={() => handleUpdateStatus(selectedAppointment.reference, 'COMPLETED')}
                    >
                      Mark Completed
                    </button>
                  )}
                  {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && selectedAppointment.status !== 'NO_SHOW' && (
                    <button
                      type="button"
                      className="neu-btn neu-btn-danger neu-btn-sm"
                      style={{ minHeight: '44px' }}
                      onClick={() => handleUpdateStatus(selectedAppointment.reference, 'CANCELLED')}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorAppointmentsPage;
