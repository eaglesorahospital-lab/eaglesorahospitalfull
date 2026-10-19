import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  History,
  Search,
  RotateCw,
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Save,
  Filter
} from 'lucide-react';
import appointmentService from '../../services/appointmentService';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';

/**
 * Dedicated Doctor Admin Panel — Consultation History
 * Archives and reviews past attended, completed, and closed clinical encounters.
 */
export function DoctorHistoryPage() {
  const { doctorProfile } = useOutletContext() || {};
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [consultationNote, setConsultationNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchHistory = () => {
    setIsLoading(true);
    setActionError(null);
    appointmentService
      .getAppointments({ page_size: 200 })
      .then((data) => {
        setAppointments(data || []);
      })
      .catch((err) => {
        setActionError(`Failed to load consultation history: ${err.message}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Filter down strictly to history (COMPLETED, CANCELLED, NO_SHOW, or past dates)
  const historyAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const isHistoricalStatus = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status);
      const isPastDate = apt.date && apt.date < todayStr;
      return isHistoricalStatus || isPastDate;
    });
  }, [appointments, todayStr]);

  const filteredHistory = useMemo(() => {
    return historyAppointments.filter((apt) => {
      const matchSearch =
        searchTerm === '' ||
        apt.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apt.reasonForVisit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apt.patientMrn || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (apt.status && apt.status.toUpperCase() === statusFilter.toUpperCase());

      return matchSearch && matchStatus;
    });
  }, [historyAppointments, searchTerm, statusFilter]);

  const handleOpenDetail = (apt) => {
    setSelectedAppointment(apt);
    setConsultationNote(apt.notes || '');
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
      setActionNotice(`Clinical note updated for record ${selectedAppointment.reference}.`);
      setSelectedAppointment((prev) => ({ ...prev, notes: consultationNote }));
      fetchHistory();
    } catch (err) {
      setActionError(`Could not save clinical note: ${err.message}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="doctor-history-view">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <div className="badge mb-1" style={{ background: '#7C3AED', fontSize: '0.7rem' }}>
            Clinical Archive
          </div>
          <h1 className="h4 fw-bold text-body mb-0.5">Consultation History & Records</h1>
          <p className="text-muted small mb-0">
            Archived record of all completed, attended, and past consultations under your care.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="neu-btn neu-btn-outline neu-btn-sm d-flex align-items-center gap-1.5"
            onClick={fetchHistory}
            disabled={isLoading}
            title="Refresh clinical archive"
          >
            <RotateCw size={14} className={isLoading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-4" role="alert">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionNotice && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-4" role="alert">
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <div className="neu-card p-3 rounded-4">
            <div className="text-muted small">Total Completed Consultations</div>
            <div className="h4 fw-bold text-success mb-0 mt-1">
              {historyAppointments.filter((a) => a.status === 'COMPLETED').length}
            </div>
            <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
              Successfully concluded cases
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="neu-card p-3 rounded-4">
            <div className="text-muted small">Cancelled Consultations</div>
            <div className="h4 fw-bold text-danger mb-0 mt-1">
              {historyAppointments.filter((a) => a.status === 'CANCELLED').length}
            </div>
            <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
              Patient or doctor cancellations
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="neu-card p-3 rounded-4">
            <div className="text-muted small">Missed / No-Show Encounters</div>
            <div className="h4 fw-bold text-warning mb-0 mt-1">
              {historyAppointments.filter((a) => a.status === 'NO_SHOW').length}
            </div>
            <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
              Patient did not attend slot
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="neu-card rounded-4 p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-7">
            <div className="position-relative">
              <Search size={16} className="position-absolute start-0 top-50 translate-middle-y ms-3 text-muted" />
              <input
                type="text"
                className="neu-input ps-5"
                placeholder="Search history by patient name, MRN, reference, diagnosis reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-5">
            <select
              className="neu-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Historical Statuses</option>
              <option value="COMPLETED">Completed Consultations</option>
              <option value="CANCELLED">Cancelled Consultations</option>
              <option value="NO_SHOW">No-Show Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="neu-card rounded-4 p-0 overflow-hidden mb-4">
        {isLoading ? (
          <div className="text-center py-5">
            <RotateCw size={28} className="spin-anim text-primary mb-2" />
            <p className="text-muted small mb-0">Retrieving consultation history records...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-5">
            <History size={32} className="text-muted mb-2 opacity-50" />
            <h6 className="fw-bold text-body">No historical records found</h6>
            <p className="text-muted small mb-0">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No past encounters match your search criteria.'
                : 'As you complete consultations, your clinical case history will appear here.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: 'var(--neu-inset-bg)', fontSize: '0.78rem' }}>
                <tr>
                  <th className="ps-4 py-3 text-muted text-uppercase fw-semibold">Reference</th>
                  <th className="py-3 text-muted text-uppercase fw-semibold">Patient Information</th>
                  <th className="py-3 text-muted text-uppercase fw-semibold">Encounter Date & Time</th>
                  <th className="py-3 text-muted text-uppercase fw-semibold">Clinical Reason</th>
                  <th className="py-3 text-muted text-uppercase fw-semibold">Status</th>
                  <th className="pe-4 py-3 text-end text-muted text-uppercase fw-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ fontSize: '0.85rem' }}>
                {filteredHistory.map((apt) => (
                  <tr key={apt.id || apt.reference}>
                    <td className="ps-4 py-3">
                      <span className="fw-bold text-primary">{apt.reference}</span>
                      <span className="d-block text-muted small" style={{ fontSize: '0.72rem' }}>
                        {apt.appointmentType || 'In-Person OPD'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="fw-semibold text-body">{apt.patientName}</div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        MRN: {apt.patientMrn || 'N/A'} • {apt.patientPhone || apt.patientEmail || ''}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="d-flex align-items-center gap-1.5 text-body">
                        <Calendar size={13} className="text-primary" />
                        <span>{apt.date}</span>
                      </div>
                      <div className="d-flex align-items-center gap-1 text-muted small" style={{ fontSize: '0.75rem' }}>
                        <Clock size={12} />
                        <span>{apt.startTime} - {apt.endTime}</span>
                      </div>
                    </td>
                    <td className="py-3 text-body" style={{ maxWidth: '240px' }}>
                      <div className="text-truncate">{apt.reasonForVisit || 'General Clinical Review'}</div>
                      {apt.notes && (
                        <div className="text-muted small text-truncate" style={{ fontSize: '0.75rem' }}>
                          Note: {apt.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <AdminStatusBadge status={apt.status} />
                    </td>
                    <td className="pe-4 py-3 text-end">
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm py-1 px-2.5 d-inline-flex align-items-center gap-1"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => handleOpenDetail(apt)}
                        title="View consultation details and notes"
                      >
                        <Eye size={13} />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Consultation Detail Modal */}
      {selectedAppointment && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content neu-raised neu-surface rounded-4 p-4 border-0">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 rounded-circle neu-inset text-primary">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h5 className="h5 fw-bold text-body mb-0">Consultation Encounter Record</h5>
                    <span className="small text-muted">{selectedAppointment.reference}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-0"
                  onClick={() => setSelectedAppointment(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                  <div className="neu-inset p-3 rounded-3 h-100">
                    <h6 className="fw-bold small text-body mb-2">Patient Demographics</h6>
                    <div className="small text-muted mb-1">
                      <strong>Name:</strong> {selectedAppointment.patientName}
                    </div>
                    <div className="small text-muted mb-1">
                      <strong>MRN:</strong> {selectedAppointment.patientMrn || 'N/A'}
                    </div>
                    <div className="small text-muted mb-1">
                      <strong>Contact Phone:</strong> {selectedAppointment.patientPhone || 'N/A'}
                    </div>
                    <div className="small text-muted">
                      <strong>Email:</strong> {selectedAppointment.patientEmail || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="neu-inset p-3 rounded-3 h-100">
                    <h6 className="fw-bold small text-body mb-2">Encounter Overview</h6>
                    <div className="small text-muted mb-1">
                      <strong>Date:</strong> {selectedAppointment.date} ({selectedAppointment.startTime} - {selectedAppointment.endTime})
                    </div>
                    <div className="small text-muted mb-1">
                      <strong>Status:</strong> <AdminStatusBadge status={selectedAppointment.status} />
                    </div>
                    <div className="small text-muted mb-1">
                      <strong>Consultation Type:</strong> {selectedAppointment.appointmentType || 'In-Person'}
                    </div>
                    <div className="small text-muted">
                      <strong>Reason for Visit:</strong> {selectedAppointment.reasonForVisit || 'Clinical consultation'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Notes Editor */}
              <div className="mb-4">
                <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                  Doctor's Clinical Notes & Diagnoses
                </label>
                <textarea
                  className="neu-input"
                  rows="4"
                  placeholder="Record symptoms, observations, clinical diagnosis, prescriptions, and follow-up guidance..."
                  value={consultationNote}
                  onChange={(e) => setConsultationNote(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="neu-btn neu-btn-outline"
                  onClick={() => setSelectedAppointment(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="neu-btn neu-btn-primary d-flex align-items-center gap-1.5"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                >
                  {isSavingNote ? (
                    <RotateCw size={14} className="spin-anim" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>Save Clinical Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorHistoryPage;
