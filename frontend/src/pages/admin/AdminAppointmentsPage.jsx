import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import doctorService from '../../services/doctorService';
import appointmentService from '../../services/appointmentService';
import { INITIAL_DEMO_APPOINTMENTS } from '../../data/adminData';
import { DEMO_DOCTORS, DEMO_DEPARTMENTS } from '../../data/hospitalData';

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
 * Hospital Platform — Admin Appointments Management Page (Phase 8)
 * Operational queue and record tracking for patient consultations.
 * Supports filtering by status, doctor, department, type; status transitions; and local cancellation/rescheduling.
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
  const [actionNotice, setActionNotice] = useState(null);

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

  // Filtered list
  const filteredAppointments = useMemo(() => {
    return appointmentsList.filter((apt) => {
      const matchSearch =
        searchTerm === '' ||
        apt.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patientContact.includes(searchTerm) ||
        apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' || apt.status.toUpperCase() === statusFilter.toUpperCase();

      const matchDept =
        departmentFilter === 'ALL' || apt.department === departmentFilter;

      const matchDoctor =
        doctorFilter === 'ALL' || String(apt.doctorId) === String(doctorFilter);

      const matchType =
        typeFilter === 'ALL' || apt.type === typeFilter;

      return matchSearch && matchStatus && matchDept && matchDoctor && matchType;
    });
  }, [appointmentsList, searchTerm, statusFilter, departmentFilter, doctorFilter, typeFilter]);

  // Handle Update Status
  const handleApplyStatusChange = async (e) => {
    e.preventDefault();
    if (!statusModalAppointment) return;

    try {
      const updated = await appointmentService.updateAppointmentStatus(
        statusModalAppointment.reference,
        newStatus,
        statusNote
      );
      setAppointmentsList((prev) =>
        prev.map((apt) =>
          apt.reference === statusModalAppointment.reference ? { ...apt, ...updated } : apt
        )
      );
      setActionNotice(
        `Appointment ${statusModalAppointment.reference} status changed to ${newStatus} in database.`
      );
    } catch (err) {
      setAppointmentsList((prev) =>
        prev.map((apt) =>
          apt.reference === statusModalAppointment.reference
            ? {
                ...apt,
                status: newStatus,
                notes: statusNote
                  ? `${apt.notes || ''} [Status note: ${statusNote}]`.trim()
                  : apt.notes,
              }
            : apt
        )
      );
      setActionNotice(
        `Appointment ${statusModalAppointment.reference} status changed to ${newStatus} (${err.message || 'Updated locally'}).`
      );
    }

    setStatusModalAppointment(null);
    setStatusNote('');
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

  return (
    <div>
      <PageHeader
        title="Clinical Appointment Registry"
        description="Outpatient scheduling queue, check-in verification, status workflows, and consultation files."
        breadcrumbs={breadcrumbs}
      />

      {/* Action Notice */}
      {actionNotice && (
        <div className="alert alert-success py-2 px-3 mb-3 small d-flex justify-content-between align-items-center">
          <span>{actionNotice}</span>
          <button
            type="button"
            className="btn-close btn-close-sm"
            onClick={() => setActionNotice(null)}
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <AdminFilterBar
        searchPlaceholder="Search reference, patient, mobile, or doctor..."
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
            className="hospital-form-control"
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
            className="hospital-form-control"
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
            className="hospital-form-control"
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
      <div className="hospital-card p-0 mb-4 overflow-hidden">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Patient</th>
                <th>Consultant & Department</th>
                <th>Date & Slot</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No appointments match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.reference}>
                    <td>
                      <div className="fw-bold">
                        <code>{apt.reference}</code>
                      </div>
                      <span className="small text-muted">{apt.createdAt}</span>
                    </td>
                    <td>
                      <div className="fw-semibold">{apt.patientName}</div>
                      <span className="small text-muted">{apt.patientContact}</span>
                    </td>
                    <td>
                      <div className="small fw-semibold">{apt.doctorName}</div>
                      <span className="small text-muted">{apt.department}</span>
                    </td>
                    <td>
                      <div className="small fw-semibold">{apt.date}</div>
                      <span className="small text-muted">{apt.time} ({apt.duration})</span>
                    </td>
                    <td>
                      <span className="small text-muted">{apt.type}</span>
                    </td>
                    <td>
                      <AdminStatusBadge status={apt.status} />
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                        onClick={() => setViewAppointment(apt)}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                        onClick={() => {
                          setStatusModalAppointment(apt);
                          setNewStatus(apt.status);
                        }}
                      >
                        Status
                      </button>
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                        onClick={() => {
                          setRescheduleModalAppointment(apt);
                          setRescheduleDate(apt.date);
                        }}
                      >
                        Reschedule
                      </button>
                      {apt.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          className="hospital-btn hospital-btn-sm btn-outline-danger"
                          onClick={() => setCancelModalAppointment(apt)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Appointment Details Modal */}
      {viewAppointment && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fs-6 fw-bold mb-0">
                    Appointment File: {viewAppointment.reference}
                  </h5>
                  <span className="small text-muted">Created: {viewAppointment.createdAt}</span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewAppointment(null)}
                />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <div className="small text-muted fw-bold mb-2">Patient Demographics</div>
                      <div className="small"><strong>Name:</strong> {viewAppointment.patientName}</div>
                      <div className="small"><strong>Mobile:</strong> {viewAppointment.patientContact}</div>
                      <div className="small"><strong>Email:</strong> {viewAppointment.patientEmail}</div>
                      <div className="small"><strong>Reason for Visit:</strong> {viewAppointment.reasonForVisit}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <div className="small text-muted fw-bold mb-2">Consultation Schedule</div>
                      <div className="small"><strong>Doctor:</strong> {viewAppointment.doctorName}</div>
                      <div className="small"><strong>Specialty:</strong> {viewAppointment.specialty}</div>
                      <div className="small"><strong>Department:</strong> {viewAppointment.department}</div>
                      <div className="small"><strong>Date & Time:</strong> {viewAppointment.date} at {viewAppointment.time}</div>
                      <div className="small"><strong>Location:</strong> {viewAppointment.location}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-light rounded border mb-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small text-muted fw-bold">Current Status:</span>
                    <AdminStatusBadge status={viewAppointment.status} />
                  </div>
                  <div className="small text-muted">
                    <strong>Administrative Notes:</strong> {viewAppointment.notes || 'None logged.'}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="hospital-btn hospital-btn-outline hospital-btn-sm"
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleApplyStatusChange}>
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fw-bold">
                    Update Status: {statusModalAppointment.reference}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setStatusModalAppointment(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label">
                      Select Status (PDF Terminology)
                    </label>
                    <select
                      className="hospital-form-control"
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
                    <label className="hospital-form-label">Administrative Note</label>
                    <textarea
                      rows="2"
                      className="hospital-form-control"
                      placeholder="e.g. Vitals checked at reception desk, verified with consultant"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="hospital-btn hospital-btn-outline hospital-btn-sm"
                    onClick={() => setStatusModalAppointment(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="hospital-btn hospital-btn-primary hospital-btn-sm">
                    Apply Status
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fs-6 fw-bold text-danger">Cancel Appointment</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setCancelModalAppointment(null)}
                />
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to cancel appointment{' '}
                  <strong>{cancelModalAppointment.reference}</strong>?
                </p>
                <div className="p-3 bg-light rounded border small mb-2">
                  <div><strong>Patient:</strong> {cancelModalAppointment.patientName}</div>
                  <div><strong>Doctor:</strong> {cancelModalAppointment.doctorName}</div>
                  <div><strong>Slot:</strong> {cancelModalAppointment.date} at {cancelModalAppointment.time}</div>
                </div>
                <p className="small text-muted mb-0">
                  This action marks the consultation as CANCELLED in local session state.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="hospital-btn hospital-btn-outline hospital-btn-sm"
                  onClick={() => setCancelModalAppointment(null)}
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  className="hospital-btn btn-danger hospital-btn-sm"
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleConfirmReschedule}>
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fw-bold">
                    Reschedule: {rescheduleModalAppointment.reference}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setRescheduleModalAppointment(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label">New Consultation Date</label>
                    <input
                      type="date"
                      className="hospital-form-control"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">New Consultation Time</label>
                    <select
                      className="hospital-form-control"
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
                <div className="modal-footer">
                  <button
                    type="button"
                    className="hospital-btn hospital-btn-outline hospital-btn-sm"
                    onClick={() => setRescheduleModalAppointment(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="hospital-btn hospital-btn-primary hospital-btn-sm">
                    Confirm Reschedule
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
