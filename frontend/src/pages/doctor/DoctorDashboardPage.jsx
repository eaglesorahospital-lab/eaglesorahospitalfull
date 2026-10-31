import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  CalendarDays, 
  UserCheck, 
  Activity, 
  RotateCw, 
  MapPin, 
  Check, 
  X, 
  Eye, 
  Phone, 
  Mail, 
  Award,
  Stethoscope,
  History,
  Bell,
  User,
  ShieldCheck
} from 'lucide-react';
import appointmentService from '../../services/appointmentService';
import scheduleService from '../../services/scheduleService';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';

export function DoctorDashboardPage() {
  const { doctorProfile, isLoadingProfile } = useOutletContext() || {};
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchDoctorAppointments = () => {
    setIsLoading(true);
    setActionError(null);
    appointmentService
      .getAppointments({ page_size: 100 })
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
    fetchDoctorAppointments();
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

  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  // Today's appointments
  const todayAppointments = useMemo(() => {
    return appointments.filter((apt) => apt.date === todayStr);
  }, [appointments, todayStr]);

  // Upcoming appointments
  const upcomingAppointments = useMemo(() => {
    return appointments.filter((apt) => apt.date > todayStr && apt.status !== 'CANCELLED');
  }, [appointments, todayStr]);

  // Distinct patients count
  const patientCount = useMemo(() => {
    const set = new Set();
    appointments.forEach((apt) => {
      if (apt.patientId) set.add(apt.patientId);
    });
    return set.size;
  }, [appointments]);

  const stats = [
    {
      label: "Today's Consultations",
      value: todayAppointments.length,
      icon: Clock,
      color: '#0D47A1',
      subtext: `${todayAppointments.filter((a) => a.status === 'CONFIRMED').length} confirmed`,
    },
    {
      label: 'Upcoming Bookings',
      value: upcomingAppointments.length,
      icon: Calendar,
      color: '#16845B',
      subtext: 'Next 30 days',
    },
    {
      label: 'Assigned Patients',
      value: patientCount,
      icon: Users,
      color: '#7C3AED',
      subtext: 'Clinical records',
    },
    {
      label: 'Total Completed',
      value: appointments.filter((a) => a.status === 'COMPLETED').length,
      icon: CheckCircle2,
      color: '#0284C7',
      subtext: 'Lifetime OPD cases',
    },
  ];

  const handleUpdateStatus = async (appointment, newStatus) => {
    setActionError(null);
    setActionNotice(null);
    try {
      await appointmentService.updateAppointmentStatus(appointment.reference, newStatus);
      setActionNotice(`Appointment ${appointment.reference} status updated to ${newStatus}.`);
      fetchDoctorAppointments();
      if (selectedAppointment?.reference === appointment.reference) {
        setSelectedAppointment((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setActionError(`Could not update appointment status: ${err.message}`);
    }
  };

  return (
    <div className="doctor-dashboard-view">
      {/* Welcome Banner */}
      <div 
        className="neu-card p-4 rounded-4 mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(13, 71, 161, 0.08) 0%, rgba(22, 132, 91, 0.08) 100%)',
          border: '1px solid var(--hospital-border)',
        }}
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            {doctorProfile?.photo ? (
              <img
                src={doctorProfile.photo}
                alt={`Portrait of ${doctorProfile?.name || 'Doctor'}`}
                width="64"
                height="64"
                className="rounded-circle neu-raised border border-2 border-white"
                style={{ width: '64px', height: '64px', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white fs-4 neu-raised"
                style={{ width: '64px', height: '64px', background: 'var(--hospital-primary-navy)' }}
              >
                {(doctorProfile?.name || 'DR')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div>
              <div className="badge mb-1" style={{ background: '#16845B', fontSize: '0.7rem' }}>
                Consultant Physician Dashboard
              </div>
              <h1 className="h4 fw-bold text-body mb-0.5">
                Welcome back, {doctorProfile?.name || 'Doctor'}
              </h1>
              <div className="small text-muted d-flex flex-wrap align-items-center gap-3">
                <span>
                  <strong>Department:</strong> {doctorProfile?.departmentName || 'Medical Services'}
                </span>
                <span>•</span>
                <span>
                  <strong>Specialty:</strong> {doctorProfile?.specialty || 'Consultant'}
                </span>
                <span>•</span>
                <span className="d-flex align-items-center gap-1">
                  <MapPin size={13} className="text-primary" />
                  {doctorProfile?.consultation_location || 'Consultation Suite'}
                </span>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="neu-btn neu-btn-outline neu-btn-sm d-flex align-items-center gap-1.5"
              onClick={fetchDoctorAppointments}
              disabled={isLoading}
              title="Refresh appointments"
            >
              <RotateCw size={14} className={isLoading ? 'spin-anim' : ''} />
              <span>Refresh</span>
            </button>
            <Link to="/doctor/schedule" className="neu-btn neu-btn-primary neu-btn-sm d-flex align-items-center gap-1.5 text-decoration-none">
              <Calendar size={14} />
              <span>My Schedule</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Stats Grid */}
      <div className="row g-3 mb-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="col-12 col-sm-6 col-xl-3">
              <div className="neu-card p-3 rounded-4 h-100 d-flex flex-column justify-content-between">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small text-muted fw-medium">{stat.label}</span>
                  <div
                    className="p-2 rounded-3 neu-inset"
                    style={{ color: stat.color }}
                  >
                    <Icon size={18} />
                  </div>
                </div>
                <div className="fs-3 fw-bold text-body">{stat.value}</div>
                <div className="small text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                  {stat.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Appointments Section */}
      <div className="neu-card rounded-4 p-4 mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <div>
            <h2 className="fs-6 fw-bold text-body mb-0.5 d-flex align-items-center gap-2">
              <Clock size={16} className="text-primary" />
              Today's Consultation Schedule
            </h2>
            <div className="small text-muted">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <Link to="/doctor/appointments" className="small fw-semibold text-primary text-decoration-none">
            View All ({appointments.length})
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-5 text-muted">
            <RotateCw size={24} className="spin-anim mb-2 text-primary" />
            <div>Loading today's clinical consultations...</div>
          </div>
        ) : todayAppointments.length === 0 ? (
          <div className="text-center py-5 text-muted neu-inset rounded-3">
            <CalendarDays size={32} className="mb-2 text-muted" />
            <div className="fw-semibold">No appointments scheduled for today.</div>
            <div className="small text-muted mt-1">New outpatient bookings will appear here in real time.</div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="neu-table w-100">
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    <th>Patient Name & Contact</th>
                    <th>Reference</th>
                    <th>Reason for Consultation</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((apt) => (
                    <tr key={apt.reference}>
                      <td className="fw-bold text-primary font-monospace" style={{ fontSize: '0.85rem' }}>
                        {apt.time || apt.startTime?.slice(0, 5) || 'OPD'}
                      </td>
                      <td>
                        <div className="fw-semibold text-body">{apt.patientName}</div>
                        <div className="small text-muted">{apt.patientContact || 'Outpatient'}</div>
                      </td>
                      <td>
                        <span className="small font-monospace px-2 py-0.5 rounded neu-inset text-secondary">
                          {apt.reference}
                        </span>
                      </td>
                      <td className="small text-muted" style={{ maxWidth: '240px' }}>
                        <div className="text-truncate">{apt.reasonForVisit || 'General Medical Consultation'}</div>
                      </td>
                      <td>
                        <AdminStatusBadge status={apt.status} />
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1.5">
                          <button
                            type="button"
                            className="neu-btn neu-btn-outline neu-btn-sm"
                            onClick={() => setSelectedAppointment(apt)}
                            title="View clinical details"
                          >
                            <Eye size={12} className="me-1" />
                            Details
                          </button>
                          {apt.status === 'REQUESTED' && (
                            <button
                              type="button"
                              className="neu-btn neu-btn-primary neu-btn-sm"
                              style={{ background: '#0D47A1', borderColor: '#0D47A1', color: '#fff' }}
                              onClick={() => handleUpdateStatus(apt, 'CONFIRMED')}
                              title="Confirm appointment"
                            >
                              <Check size={12} className="me-1" />
                              Confirm
                            </button>
                          )}
                          {apt.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              className="neu-btn neu-btn-outline neu-btn-sm text-primary"
                              onClick={() => handleUpdateStatus(apt, 'CHECKED_IN')}
                              title="Mark patient checked in"
                            >
                              <Check size={12} className="me-1" />
                              Check In
                            </button>
                          )}
                          {apt.status === 'CHECKED_IN' && (
                            <button
                              type="button"
                              className="neu-btn neu-btn-primary neu-btn-sm"
                              style={{ background: '#16845B', borderColor: '#16845B', color: '#fff' }}
                              onClick={() => handleUpdateStatus(apt, 'COMPLETED')}
                              title="Mark consultation completed"
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

            {/* Mobile Stacked Glass Cards View (< 768px) */}
            <div className="d-md-none d-flex flex-column gap-3">
              {todayAppointments.map((apt) => (
                <div key={apt.reference} className="doctor-mobile-card neu-inset p-3 rounded-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-primary font-monospace fs-6">
                      {apt.time || apt.startTime?.slice(0, 5) || 'OPD'}
                    </span>
                    <AdminStatusBadge status={apt.status} />
                  </div>
                  <div className="fw-bold text-body fs-6">{apt.patientName}</div>
                  <div className="small text-muted mb-2">
                    {apt.patientContact || 'Outpatient'} • Ref: <span className="font-monospace text-primary">{apt.reference}</span>
                  </div>
                  <div className="small text-body-secondary p-2 rounded-2 neu-inset mb-3" style={{ fontSize: '0.8rem' }}>
                    {apt.reasonForVisit || 'General Medical Consultation'}
                  </div>
                  <div className="d-flex flex-wrap gap-2 pt-1 border-top">
                    <button
                      type="button"
                      className="neu-btn neu-btn-outline neu-btn-sm flex-fill"
                      onClick={() => setSelectedAppointment(apt)}
                      title="View clinical details"
                    >
                      <Eye size={14} className="me-1" />
                      Details
                    </button>
                    {apt.status === 'REQUESTED' && (
                      <button
                        type="button"
                        className="neu-btn neu-btn-primary neu-btn-sm flex-fill"
                        style={{ background: '#0D47A1', borderColor: '#0D47A1', color: '#fff' }}
                        onClick={() => handleUpdateStatus(apt, 'CONFIRMED')}
                      >
                        <Check size={14} className="me-1" />
                        Confirm
                      </button>
                    )}
                    {apt.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm text-primary flex-fill"
                        onClick={() => handleUpdateStatus(apt, 'CHECKED_IN')}
                      >
                        <Check size={14} className="me-1" />
                        Check In
                      </button>
                    )}
                    {apt.status === 'CHECKED_IN' && (
                      <button
                        type="button"
                        className="neu-btn neu-btn-primary neu-btn-sm flex-fill"
                        style={{ background: '#16845B', borderColor: '#16845B', color: '#fff' }}
                        onClick={() => handleUpdateStatus(apt, 'COMPLETED')}
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

      {/* Upcoming Consultations Preview */}
      <div className="neu-card rounded-4 p-4">
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <h2 className="fs-6 fw-bold text-body mb-0 d-flex align-items-center gap-2">
            <Calendar size={16} className="text-primary" />
            Upcoming Consultations Preview
          </h2>
          <span className="small text-muted">Next active patient bookings</span>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="small text-muted py-3 text-center">No upcoming appointments in the immediate calendar.</div>
        ) : (
          <div className="row g-3">
            {upcomingAppointments.slice(0, 4).map((apt) => (
              <div key={apt.reference} className="col-12 col-md-6 col-xl-3">
                <div className="neu-inset p-3 rounded-3 h-100">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge" style={{ background: 'var(--hospital-primary-navy)', fontSize: '0.7rem' }}>
                      {apt.date}
                    </span>
                    <span className="small fw-bold text-primary font-monospace">{apt.time || 'OPD'}</span>
                  </div>
                  <div className="fw-semibold text-body mb-0.5">{apt.patientName}</div>
                  <div className="small text-muted text-truncate mb-2" style={{ fontSize: '0.78rem' }}>
                    {apt.reasonForVisit || 'Consultation'}
                  </div>
                  <AdminStatusBadge status={apt.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor Workspace Quick Navigation Modules */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-4">
          <Link to="/doctor/appointments" className="neu-card p-3 rounded-4 d-flex align-items-center gap-3 text-decoration-none text-body neu-hover-raised transition-all h-100">
            <div className="p-3 rounded-3 neu-inset text-primary">
              <Clock size={20} />
            </div>
            <div>
              <div className="fw-bold fs-6">My Appointments</div>
              <div className="small text-muted" style={{ fontSize: '0.78rem' }}>Active queue & status transitions</div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <Link to="/doctor/history" className="neu-card p-3 rounded-4 d-flex align-items-center gap-3 text-decoration-none text-body neu-hover-raised transition-all h-100">
            <div className="p-3 rounded-3 neu-inset" style={{ color: '#7C3AED' }}>
              <History size={20} />
            </div>
            <div>
              <div className="fw-bold fs-6">Consultation History</div>
              <div className="small text-muted" style={{ fontSize: '0.78rem' }}>Completed encounters & notes</div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <Link to="/doctor/patients" className="neu-card p-3 rounded-4 d-flex align-items-center gap-3 text-decoration-none text-body neu-hover-raised transition-all h-100">
            <div className="p-3 rounded-3 neu-inset text-success">
              <Users size={20} />
            </div>
            <div>
              <div className="fw-bold fs-6">Patient Details</div>
              <div className="small text-muted" style={{ fontSize: '0.78rem' }}>Assigned patient medical records</div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <Link to="/doctor/schedule" className="neu-card p-3 rounded-4 d-flex align-items-center gap-3 text-decoration-none text-body neu-hover-raised transition-all h-100">
            <div className="p-3 rounded-3 neu-inset" style={{ color: '#0284C7' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div className="fw-bold fs-6">My Schedule</div>
              <div className="small text-muted" style={{ fontSize: '0.78rem' }}>Weekly shifts & leave requests</div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <Link to="/doctor/notifications" className="neu-card p-3 rounded-4 d-flex align-items-center gap-3 text-decoration-none text-body neu-hover-raised transition-all h-100">
            <div className="p-3 rounded-3 neu-inset text-warning">
              <Bell size={20} />
            </div>
            <div>
              <div className="fw-bold fs-6">Notifications</div>
              <div className="small text-muted" style={{ fontSize: '0.78rem' }}>Clinical dispatch alerts & logs</div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <Link to="/doctor/profile" className="neu-card p-3 rounded-4 d-flex align-items-center gap-3 text-decoration-none text-body neu-hover-raised transition-all h-100">
            <div className="p-3 rounded-3 neu-inset text-secondary">
              <User size={20} />
            </div>
            <div>
              <div className="fw-bold fs-6">My Profile</div>
              <div className="small text-muted" style={{ fontSize: '0.78rem' }}>Professional credentials & photo</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Appointment Details Modal */}
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
                  <div className="small text-muted mb-0.5">Patient Full Name</div>
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

                {selectedAppointment.notes && (
                  <div className="neu-inset p-3 rounded-3 mb-3">
                    <div className="small text-muted mb-1" style={{ fontSize: '0.75rem' }}>Clinical & Administrative Notes</div>
                    <div className="small text-body font-monospace" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedAppointment.notes}
                    </div>
                  </div>
                )}

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
                <div className="d-flex gap-2">
                  {selectedAppointment.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      className="neu-btn neu-btn-primary neu-btn-sm"
                      style={{ background: '#16845B', borderColor: '#16845B', color: '#fff', minHeight: '44px' }}
                      onClick={() => handleUpdateStatus(selectedAppointment, 'COMPLETED')}
                    >
                      Mark Completed
                    </button>
                  )}
                  {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      className="neu-btn neu-btn-danger neu-btn-sm"
                      style={{ minHeight: '44px' }}
                      onClick={() => handleUpdateStatus(selectedAppointment, 'CANCELLED')}
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

export default DoctorDashboardPage;
