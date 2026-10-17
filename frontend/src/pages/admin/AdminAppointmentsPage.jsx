import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  AlertCircle, 
  X, 
  Eye, 
  Edit3, 
  CalendarClock, 
  Ban, 
  Check, 
  RotateCw,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  UserCheck
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import doctorService from '../../services/doctorService';
import appointmentService from '../../services/appointmentService';
import { DEMO_DEPARTMENTS } from '../../data/hospitalData';

const PDF_STATUSES = [
  'ALL',
  'REQUESTED',
  'CONFIRMED',
  'CHECKED_IN',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED',
];

/**
 * Hospital Platform — Admin Appointments Management Page (Neumorphic Redesign)
 * Clinical Appointment Registry providing queue management,
 * status workflows (REQUESTED -> CONFIRMED), rescheduling, and consultation file viewing.
 */
export function AdminAppointmentsPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission
  if (currentRole && currentRole.id === 'PATIENT') {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Appointments Management"
        onSwitchRole={setRole}
      />
    );
  }

  // Local state for appointments from PostgreSQL
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [doctorFilter, setDoctorFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [doctorsList, setDoctorsList] = useState([]);

  const fetchAppointments = () => {
    setIsLoading(true);
    appointmentService
      .getAppointments({ page_size: 100 })
      .then((serverApts) => {
        setAppointmentsList(serverApts || []);
      })
      .catch((err) => {
        console.warn('Could not load appointments from backend API in AdminAppointmentsPage:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    doctorService
      .getDoctors({ page_size: 100 })
      .then((res) => {
        if (isMounted && res?.results && res.results.length > 0) {
          setDoctorsList(res.results);
        }
      })
      .catch((err) => console.warn('Could not load doctors in AdminAppointmentsPage:', err));

    appointmentService
      .getAppointments({ page_size: 100 })
      .then((serverApts) => {
        if (!isMounted) return;
        setAppointmentsList(serverApts || []);
      })
      .catch((err) => {
        console.warn('Could not load appointments from backend API in AdminAppointmentsPage:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Modals state
  const [viewAppointment, setViewAppointment] = useState(null);
  const [statusModalAppointment, setStatusModalAppointment] = useState(null);
  const [cancelModalAppointment, setCancelModalAppointment] = useState(null);
  const [rescheduleModalAppointment, setRescheduleModalAppointment] = useState(null);
  const [assignModalAppointment, setAssignModalAppointment] = useState(null);
  const [selectedAssignDoctor, setSelectedAssignDoctor] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [assignError, setAssignError] = useState(null);
  const [isAssignSubmitting, setIsAssignSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [processingReference, setProcessingReference] = useState(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  // Status modal form state
  const [newStatus, setNewStatus] = useState('CONFIRMED');
  const [statusNote, setStatusNote] = useState('');

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState('2026-11-20');
  const [rescheduleTime, setRescheduleTime] = useState('11:00 AM');

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Appointment Registry' },
  ];

  // Filtered list with defensive null-safety across all fields
  const filteredAppointments = useMemo(() => {
    return (appointmentsList || []).filter((apt) => {
      if (!apt) return false;
      const term = (searchTerm || '').trim().toLowerCase();
      const ref = String(apt.reference || '').toLowerCase();
      const patientName = String(apt.patientName || '').toLowerCase();
      const patientContact = String(apt.patientContact || '');
      const doctorName = String(apt.doctorName || '').toLowerCase();

      const matchSearch =
        term === '' ||
        ref.includes(term) ||
        patientName.includes(term) ||
        patientContact.toLowerCase().includes(term) ||
        doctorName.includes(term);

      const aptStatus = String(apt.status || '').toUpperCase();
      const matchStatus =
        statusFilter === 'ALL' || aptStatus === statusFilter.toUpperCase();

      const matchDept =
        departmentFilter === 'ALL' || String(apt.department || '') === departmentFilter;

      const matchDoctor =
        doctorFilter === 'ALL' || String(apt.doctorId ?? '') === String(doctorFilter);

      const matchType =
        typeFilter === 'ALL' || String(apt.type || '') === typeFilter;

      return matchSearch && matchStatus && matchDept && matchDoctor && matchType;
    });
  }, [appointmentsList, searchTerm, statusFilter, departmentFilter, doctorFilter, typeFilter]);

  // Handle Quick Approve
  const handleQuickApprove = async (apt) => {
    if (!apt || !apt.reference || processingReference === apt.reference) return;
    setProcessingReference(apt.reference);
    try {
      const updated = await appointmentService.approveAppointment(apt.reference);
      const safeUpdated = updated || {};

      setAppointmentsList((prev) =>
        prev.map((item) => {
          if (item.reference !== apt.reference) return item;
          return {
            ...item,
            ...safeUpdated,
            reference: safeUpdated.reference || item.reference,
            patientName: safeUpdated.patientName || item.patientName,
            patientContact: safeUpdated.patientContact || item.patientContact,
            patientEmail: safeUpdated.patientEmail || item.patientEmail,
            doctorName: safeUpdated.doctorName || item.doctorName,
            specialty: safeUpdated.specialty || item.specialty,
            department: safeUpdated.department || item.department,
            date: safeUpdated.date || item.date,
            time: safeUpdated.time || item.time,
            type: safeUpdated.type || item.type,
            location: safeUpdated.location || item.location,
            status: 'CONFIRMED',
            rawStatus: 'CONFIRMED',
          };
        })
      );

      if (viewAppointment && viewAppointment.reference === apt.reference) {
        setViewAppointment((prev) => ({
          ...prev,
          ...safeUpdated,
          reference: safeUpdated.reference || prev.reference,
          patientName: safeUpdated.patientName || prev.patientName,
          patientContact: safeUpdated.patientContact || prev.patientContact,
          patientEmail: safeUpdated.patientEmail || prev.patientEmail,
          doctorName: safeUpdated.doctorName || prev.doctorName,
          specialty: safeUpdated.specialty || prev.specialty,
          department: safeUpdated.department || prev.department,
          date: safeUpdated.date || prev.date,
          time: safeUpdated.time || prev.time,
          type: safeUpdated.type || prev.type,
          location: safeUpdated.location || prev.location,
          status: 'CONFIRMED',
          rawStatus: 'CONFIRMED',
        }));
      }

      setActionNotice(`Appointment ${apt.reference} successfully approved and confirmed.`);
    } catch (err) {
      setActionNotice(`Approval failed: ${err.message || 'Please verify network or administrator permissions.'}`);
    } finally {
      setProcessingReference(null);
    }
  };

  // Handle Update Status
  const handleApplyStatusChange = async (e) => {
    e.preventDefault();
    if (!statusModalAppointment || isStatusSubmitting) return;

    setIsStatusSubmitting(true);
    const targetRef = statusModalAppointment.reference;

    try {
      const updated = await appointmentService.updateAppointmentStatus(
        targetRef,
        newStatus,
        statusNote
      );
      const safeUpdated = updated || {};

      setAppointmentsList((prev) =>
        prev.map((apt) => {
          if (apt.reference !== targetRef) return apt;
          return {
            ...apt,
            ...safeUpdated,
            reference: safeUpdated.reference || apt.reference,
            patientName: safeUpdated.patientName || apt.patientName,
            patientContact: safeUpdated.patientContact || apt.patientContact,
            doctorName: safeUpdated.doctorName || apt.doctorName,
            department: safeUpdated.department || apt.department,
            date: safeUpdated.date || apt.date,
            time: safeUpdated.time || apt.time,
            status: (safeUpdated.status || newStatus).toUpperCase(),
            rawStatus: safeUpdated.rawStatus || newStatus,
            notes: statusNote
              ? `${apt.notes || ''} [Status note: ${statusNote}]`.trim()
              : safeUpdated.notes || apt.notes,
          };
        })
      );

      if (viewAppointment && viewAppointment.reference === targetRef) {
        setViewAppointment((prev) => ({
          ...prev,
          ...safeUpdated,
          reference: safeUpdated.reference || prev.reference,
          patientName: safeUpdated.patientName || prev.patientName,
          doctorName: safeUpdated.doctorName || prev.doctorName,
          status: (safeUpdated.status || newStatus).toUpperCase(),
          rawStatus: safeUpdated.rawStatus || newStatus,
        }));
      }

      setActionNotice(
        `Appointment ${targetRef} status changed to ${newStatus} in database.`
      );
    } catch (err) {
      setAppointmentsList((prev) =>
        prev.map((apt) =>
          apt.reference === targetRef
            ? {
                ...apt,
                status: newStatus.toUpperCase(),
                rawStatus: newStatus,
                notes: statusNote
                  ? `${apt.notes || ''} [Status note: ${statusNote}]`.trim()
                  : apt.notes,
              }
            : apt
        )
      );
      setActionNotice(
        `Appointment ${targetRef} status changed to ${newStatus} (${err.message || 'Updated locally'}).`
      );
    } finally {
      setIsStatusSubmitting(false);
      setStatusModalAppointment(null);
      setStatusNote('');
    }
  };

  // Handle Cancel Appointment
  const handleConfirmCancel = async () => {
    if (!cancelModalAppointment) return;

    try {
      const updated = await appointmentService.cancelAppointment(
        cancelModalAppointment.reference,
        'Cancelled by hospital administrator in clinical registry.'
      );
      setAppointmentsList((prev) =>
        prev.map((apt) =>
          apt.reference === cancelModalAppointment.reference ? { ...apt, ...updated } : apt
        )
      );
      setActionNotice(
        `Appointment ${cancelModalAppointment.reference} cancelled in database.`
      );
    } catch (err) {
      setAppointmentsList((prev) =>
        prev.map((apt) =>
          apt.reference === cancelModalAppointment.reference
            ? { ...apt, status: 'CANCELLED' }
            : apt
        )
      );
      setActionNotice(
        `Appointment ${cancelModalAppointment.reference} cancelled (${err.message || 'Updated locally'}).`
      );
    }

    setCancelModalAppointment(null);
  };

  // Handle Reschedule
  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleModalAppointment) return;

    try {
      const formattedStart = rescheduleTime.length === 5 ? `${rescheduleTime}:00` : rescheduleTime;
      let formattedEnd = '12:00:00';
      if (rescheduleTime.includes(':')) {
        const [hrStr, minStr] = rescheduleTime.split(':');
        const hr = parseInt(hrStr, 10);
        const min = parseInt(minStr, 10);
        const totalMin = hr * 60 + min + 30;
        const endHr = Math.floor(totalMin / 60) % 24;
        const endMin = totalMin % 60;
        formattedEnd = `${String(endHr).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
      }

      const updated = await appointmentService.rescheduleAppointment(
        rescheduleModalAppointment.reference,
        {
          newDate: rescheduleDate,
          newStartTime: formattedStart,
          newEndTime: formattedEnd,
          reason: `Rescheduled by administration to ${rescheduleDate} at ${rescheduleTime}`,
        }
      );

      setAppointmentsList((prev) =>
        prev.map((apt) =>
          apt.reference === rescheduleModalAppointment.reference ? { ...apt, ...updated } : apt
        )
      );
      setActionNotice(
        `Appointment ${rescheduleModalAppointment.reference} rescheduled to ${rescheduleDate} in database.`
      );
    } catch (err) {
      setAppointmentsList((prev) =>
        prev.map((apt) =>
          apt.reference === rescheduleModalAppointment.reference
            ? {
                ...apt,
                date: rescheduleDate,
                time: rescheduleTime,
                status: 'RESCHEDULED',
                notes: `${apt.notes || ''} [Rescheduled to ${rescheduleDate} at ${rescheduleTime}]`.trim(),
              }
            : apt
        )
      );
      setActionNotice(
        `Appointment ${rescheduleModalAppointment.reference} rescheduled (${err.message || 'Updated locally'}).`
      );
    }

    setRescheduleModalAppointment(null);
  };

  // Handle Doctor Assignment / Reassignment with availability & conflict checks
  const handleAssignDoctor = async (e) => {
    e.preventDefault();
    if (!assignModalAppointment || !selectedAssignDoctor) return;
    setAssignError(null);
    setIsAssignSubmitting(true);
    try {
      const updated = await appointmentService.assignDoctor(
        assignModalAppointment.reference,
        Number(selectedAssignDoctor),
        assignReason
      );
      setAppointmentsList((prev) =>
        prev.map((apt) => (apt.reference === assignModalAppointment.reference ? { ...apt, ...updated } : apt))
      );
      setActionNotice(
        `Appointment ${assignModalAppointment.reference} successfully assigned to ${updated.doctorName || 'consultant'}.`
      );
      setAssignModalAppointment(null);
    } catch (err) {
      setAssignError(err.message || 'Failed to assign appointment to selected doctor.');
    } finally {
      setIsAssignSubmitting(false);
    }
  };

  return (
    <div className="admin-appointments-view">
      <PageHeader
        title="Clinical Appointment Registry"
        description="Outpatient scheduling queue, check-in verification, triage workflows, and consultation management."
        breadcrumbs={breadcrumbs}
      >
        <button
          type="button"
          className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-2"
          onClick={fetchAppointments}
          disabled={isLoading}
        >
          <RotateCw size={14} className={isLoading ? 'spin-anim' : ''} />
          Sync Registry
        </button>
      </PageHeader>

      {/* Action Notice */}
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

      {/* Filter and Search Bar */}
      <AdminFilterBar
        searchPlaceholder="Search reference, patient name, contact, doctor..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        hasActiveFilters={
          searchTerm !== '' ||
          statusFilter !== 'ALL' ||
          departmentFilter !== 'ALL' ||
          doctorFilter !== 'ALL' ||
          typeFilter !== 'ALL'
        }
        onClear={() => {
          setSearchTerm('');
          setStatusFilter('ALL');
          setDepartmentFilter('ALL');
          setDoctorFilter('ALL');
          setTypeFilter('ALL');
        }}
      >
        <div className="col-12 col-sm-6 col-md-2">
          <select
            className="neu-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by appointment status"
          >
            {PDF_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="neu-select"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="ALL">All Departments</option>
            {DEMO_DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="neu-select"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            aria-label="Filter by doctor"
          >
            <option value="ALL">All Doctors</option>
            {doctorsList.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>
      </AdminFilterBar>

      {/* Appointments Table */}
      <div className="neu-table-container">
        <table className="neu-table">
            <thead>
              <tr>
                <th className="col-apt-ref">Reference</th>
                <th className="col-apt-patient">Patient Details</th>
                <th className="col-apt-doctor">Consultant & Specialty</th>
                <th className="col-apt-slot">Date & Slot</th>
                <th className="col-apt-type">Type</th>
                <th className="col-apt-status">Status</th>
                <th className="col-apt-actions text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <RotateCw size={24} className="spin-anim mb-2 text-primary" />
                    <div>Loading clinical appointment registry...</div>
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <AlertCircle size={28} className="mb-2 text-muted" />
                    <div className="fw-semibold">No appointments match the selected filters.</div>
                    <div className="small text-muted mt-1">Try resetting your filters or search keywords.</div>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.reference}>
                    <td className="col-apt-ref">
                      <span 
                        className="px-2.5 py-1 rounded small fw-bold font-monospace d-inline-block mb-1"
                        style={{ 
                          background: 'var(--hospital-surface)', 
                          boxShadow: 'var(--neu-inset)',
                          fontSize: '0.785rem',
                          color: 'var(--hospital-medical-blue)'
                        }}
                      >
                        {apt.reference}
                      </span>
                      <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                        {apt.createdAt ? `Booked ${apt.createdAt}` : 'Online Booking'}
                      </div>
                    </td>
                    <td className="col-apt-patient">
                      <div className="fw-semibold text-truncate" style={{ maxWidth: '190px' }}>
                        {apt.patientName}
                      </div>
                      <div className="small text-muted d-block mt-0.5">{apt.patientContact}</div>
                    </td>
                    <td className="col-apt-doctor">
                      <div className="small fw-semibold text-primary">{apt.doctorName}</div>
                      <span className="small text-muted d-block mt-0.5">{apt.department}</span>
                    </td>
                    <td className="col-apt-slot">
                      <div className="small fw-semibold text-body">{apt.date}</div>
                      <span className="small text-muted d-block mt-0.5">{apt.time} ({apt.duration || '30m'})</span>
                    </td>
                    <td className="col-apt-type">
                      <span className="small text-muted">{apt.type || 'Consultation'}</span>
                    </td>
                    <td className="col-apt-status">
                      <AdminStatusBadge status={apt.status} />
                    </td>
                    <td className="col-apt-actions text-end text-nowrap">
                      <div className="neu-action-btns">
                        {apt.status === 'REQUESTED' && (
                          <button
                            type="button"
                            className="neu-btn neu-btn-primary neu-btn-sm"
                            style={{ 
                              background: '#16845B', 
                              color: '#ffffff',
                              boxShadow: '0 4px 10px rgba(22, 132, 91, 0.3)'
                            }}
                            onClick={() => handleQuickApprove(apt)}
                            disabled={processingReference === apt.reference}
                            title="Confirm slot & approve appointment"
                          >
                            <Check size={13} className="me-1" />
                            {processingReference === apt.reference ? 'Approving...' : 'Approve'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => setViewAppointment(apt)}
                          title="View consultation file"
                        >
                          <Eye size={13} className="me-1" />
                          Details
                        </button>
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => {
                            setStatusModalAppointment(apt);
                            setNewStatus(apt.status);
                          }}
                          title="Change clinical status"
                        >
                          <Edit3 size={13} className="me-1" />
                          Status
                        </button>
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => {
                            setRescheduleModalAppointment(apt);
                            setRescheduleDate(apt.date || '2026-11-20');
                          }}
                          title="Reschedule appointment date/time"
                        >
                          <CalendarClock size={13} className="me-1" />
                          Reschedule
                        </button>
                        {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            className="neu-btn neu-btn-outline neu-btn-sm"
                            onClick={() => {
                              setAssignModalAppointment(apt);
                              setSelectedAssignDoctor(apt.doctorId ? String(apt.doctorId) : '');
                              setAssignReason('');
                              setAssignError(null);
                            }}
                            title="Assign or reassign consultant"
                          >
                            <UserCheck size={13} className="me-1" />
                            Assign
                          </button>
                        )}
                        {apt.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            className="neu-btn neu-btn-danger neu-btn-sm"
                            onClick={() => setCancelModalAppointment(apt)}
                            title="Cancel appointment"
                          >
                            <X size={13} className="me-1" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* View Appointment Details Modal */}
      {viewAppointment && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div 
              className="modal-content neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--hospital-border)' }}
            >
              <div 
                className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <div>
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Appointment File: {viewAppointment.reference}
                  </h5>
                  <span className="small text-muted">Created: {viewAppointment.createdAt || 'Standard Registry Entry'}</span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setViewAppointment(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <User size={16} color="var(--hospital-blue)" />
                        <span className="small text-muted fw-bold text-uppercase">Patient Demographics</span>
                      </div>
                      <div className="small mb-1"><strong>Name:</strong> {viewAppointment.patientName}</div>
                      <div className="small mb-1"><strong>Mobile:</strong> {viewAppointment.patientContact}</div>
                      <div className="small mb-1"><strong>Email:</strong> {viewAppointment.patientEmail || 'Not specified'}</div>
                      <div className="small"><strong>Reason:</strong> {viewAppointment.reasonForVisit || 'General Clinical Consultation'}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <Building2 size={16} color="var(--hospital-cyan)" />
                        <span className="small text-muted fw-bold text-uppercase">Consultation Schedule</span>
                      </div>
                      <div className="small mb-1"><strong>Doctor:</strong> {viewAppointment.doctorName}</div>
                      <div className="small mb-1"><strong>Specialty:</strong> {viewAppointment.specialty || 'General OPD'}</div>
                      <div className="small mb-1"><strong>Department:</strong> {viewAppointment.department}</div>
                      <div className="small mb-1"><strong>Date & Time:</strong> {viewAppointment.date} at {viewAppointment.time}</div>
                      <div className="small"><strong>Location:</strong> {viewAppointment.location || 'EagleSora Outpatient Wing'}</div>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-3 neu-card-sm" 
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted fw-bold text-uppercase">Authoritative Status:</span>
                    <AdminStatusBadge status={viewAppointment.status} />
                  </div>
                  <div className="small text-muted">
                    <strong>Administrative Notes:</strong> {viewAppointment.notes || 'None logged.'}
                  </div>
                </div>
              </div>
              <div 
                className="modal-footer px-4 py-3 border-top"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                {viewAppointment.status === 'REQUESTED' && (
                  <button
                    type="button"
                    className="neu-btn neu-btn-primary neu-btn-sm me-2"
                    style={{ background: '#16845B', color: '#fff' }}
                    onClick={() => handleQuickApprove(viewAppointment)}
                    disabled={processingReference === viewAppointment.reference}
                  >
                    <Check size={14} className="me-1" />
                    {processingReference === viewAppointment.reference ? 'Approving...' : 'Approve Appointment'}
                  </button>
                )}
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
                  onClick={() => setViewAppointment(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusModalAppointment && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--hospital-border)' }}
            >
              <form onSubmit={handleApplyStatusChange}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Update Status: {statusModalAppointment.reference}
                  </h5>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setStatusModalAppointment(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  <div className="mb-3">
                    <label className="neu-form-label">
                      Select Status (Clinical Terminology)
                    </label>
                    <select
                      className="neu-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="REQUESTED">REQUESTED (Pending Review)</option>
                      <option value="CONFIRMED">CONFIRMED (Slot Booked)</option>
                      <option value="CHECKED_IN">CHECKED_IN (Patient at OPD Desk)</option>
                      <option value="COMPLETED">COMPLETED (Consultation Concluded)</option>
                      <option value="CANCELLED">CANCELLED</option>
                      <option value="NO_SHOW">NO_SHOW (Patient Did Not Arrive)</option>
                      <option value="RESCHEDULED">RESCHEDULED</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Administrative Note</label>
                    <textarea
                      rows="3"
                      className="neu-textarea"
                      placeholder="e.g. Vitals checked at reception desk, verified with consultant"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
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
                    onClick={() => setStatusModalAppointment(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="neu-btn neu-btn-primary neu-btn-sm"
                    disabled={isStatusSubmitting}
                  >
                    {isStatusSubmitting ? 'Applying...' : 'Apply Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalAppointment && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--hospital-border)' }}
            >
              <div 
                className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <h5 className="modal-title fs-6 fw-bold text-danger mb-0">Cancel Appointment</h5>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setCancelModalAppointment(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <p className="mb-3">
                  Are you sure you want to cancel appointment{' '}
                  <strong>{cancelModalAppointment.reference}</strong>?
                </p>
                <div 
                  className="p-3 neu-card-sm small mb-3"
                  style={{ borderRadius: '14px', background: 'var(--hospital-surface)' }}
                >
                  <div><strong>Patient:</strong> {cancelModalAppointment.patientName}</div>
                  <div><strong>Doctor:</strong> {cancelModalAppointment.doctorName}</div>
                  <div><strong>Slot:</strong> {cancelModalAppointment.date} at {cancelModalAppointment.time}</div>
                </div>
                <p className="small text-muted mb-0">
                  This action marks the consultation as CANCELLED in database records.
                </p>
              </div>
              <div 
                className="modal-footer px-4 py-3 border-top"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
                  onClick={() => setCancelModalAppointment(null)}
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  className="neu-btn neu-btn-danger neu-btn-sm"
                  onClick={handleConfirmCancel}
                >
                  Cancel Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalAppointment && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--hospital-border)' }}
            >
              <form onSubmit={handleConfirmReschedule}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Reschedule: {rescheduleModalAppointment.reference}
                  </h5>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setRescheduleModalAppointment(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  <div className="mb-3">
                    <label className="neu-form-label">New Consultation Date</label>
                    <input
                      type="date"
                      className="neu-input"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">New Consultation Time</label>
                    <select
                      className="neu-select"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                    >
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                    </select>
                  </div>
                </div>
                <div 
                  className="modal-footer px-4 py-3 border-top"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline neu-btn-sm"
                    onClick={() => setRescheduleModalAppointment(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm">
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign / Reassign Consultant Modal */}
      {assignModalAppointment && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--hospital-border)' }}
            >
              <form onSubmit={handleAssignDoctor}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--hospital-surface)',
                        boxShadow: 'var(--neu-inset)',
                        color: 'var(--hospital-medical-blue)',
                      }}
                    >
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                        Assign Consultant: {assignModalAppointment.reference}
                      </h5>
                      <span className="small text-muted">{assignModalAppointment.patientName} • {assignModalAppointment.date}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setAssignModalAppointment(null)}
                    disabled={isAssignSubmitting}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  {assignError && (
                    <div 
                      className="p-3 mb-3 d-flex align-items-center gap-2 small text-danger neu-card-sm"
                      style={{ borderRadius: '12px', background: 'rgba(229, 62, 62, 0.1)', border: '1px solid rgba(229, 62, 62, 0.2)' }}
                    >
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{assignError}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="neu-form-label">Currently Assigned Doctor</label>
                    <div className="fw-semibold text-muted small p-2 rounded" style={{ background: 'var(--hospital-surface)' }}>
                      {assignModalAppointment.doctorName || 'Unassigned'} ({assignModalAppointment.department || 'General'})
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="neu-form-label">
                      Select Target Consultant <span className="text-danger">*</span>
                    </label>
                    <select
                      className="neu-select"
                      value={selectedAssignDoctor}
                      onChange={(e) => setSelectedAssignDoctor(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Consultant --</option>
                      {doctorsList.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} — {doc.specialty} ({doc.departmentName || 'Clinical Care'})
                        </option>
                      ))}
                    </select>
                    <div className="small text-muted mt-1">
                      Doctor availability, schedule compatibility, and active leaves are verified by backend.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="neu-form-label">Assignment Reason (Optional / Audit Log)</label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="e.g. Clinical reassignment, patient specialty match"
                      value={assignReason}
                      onChange={(e) => setAssignReason(e.target.value)}
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
                    onClick={() => setAssignModalAppointment(null)}
                    disabled={isAssignSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="neu-btn neu-btn-primary neu-btn-sm d-inline-flex align-items-center gap-1"
                    disabled={isAssignSubmitting || !selectedAssignDoctor}
                  >
                    {isAssignSubmitting ? (
                      <>
                        <RotateCw size={13} className="spin-anim" />
                        Validating & Assigning...
                      </>
                    ) : (
                      <>
                        <Check size={13} />
                        Confirm Assignment
                      </>
                    )}
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

export default AdminAppointmentsPage;
