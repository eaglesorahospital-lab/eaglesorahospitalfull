import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import AdminStatCard from '../../components/admin/AdminStatCard';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import doctorService from '../../services/doctorService';
import {
  INITIAL_DEMO_APPOINTMENTS,
  INITIAL_DEMO_PATIENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  getAdminDashboardStats,
} from '../../data/adminData';
import { DEMO_DOCTORS, DEMO_DEPARTMENTS } from '../../data/hospitalData';

/**
 * Hospital Platform — Admin Dashboard Page (Phase 8)
 * Operational command center providing clinical roster metrics,
 * daily appointment queues, doctor on-duty status, and recent activity logs.
 */
export function AdminDashboardPage() {
  const { currentRole, setRole, hasAccessToRoute } = useOutletContext() || {};

  // Check role permission
  if (currentRole && currentRole.id === 'PATIENT') {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Administrative Dashboard"
        onSwitchRole={setRole}
      />
    );
  }

  const [doctorsList, setDoctorsList] = useState(DEMO_DOCTORS);

  useEffect(() => {
    doctorService.getDoctors({ page_size: 100 }).then((res) => {
      if (res?.results && res.results.length > 0) {
        setDoctorsList(res.results);
      }
    }).catch((err) => console.warn('Could not load doctors in AdminDashboard:', err));
  }, []);

  const stats = getAdminDashboardStats(
    INITIAL_DEMO_APPOINTMENTS,
    doctorsList,
    INITIAL_DEMO_PATIENTS
  );

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Operations Dashboard' },
  ];

  // Today's appointments (sample filter)
  const todayAppointments = INITIAL_DEMO_APPOINTMENTS.slice(0, 5);

  // Doctors on duty today
  const onDutyDoctors = doctorsList.slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Hospital Operations Overview"
        description="Clinical capacity, OPD patient queues, consultant availability, and administrative telemetry."
        breadcrumbs={breadcrumbs}
      />

      {/* Operational Notice Banner */}
      <div className="alert alert-info py-2 px-3 mb-4 small d-flex flex-wrap justify-content-between align-items-center">
        <span>
          <strong>Operational Simulation Mode:</strong> Displaying mock telemetry for development and evaluation.
          Role: <strong>{currentRole?.label || 'Super Administrator'}</strong>.
        </span>
        <span className="text-muted">Phase 8 Frontend Presentation</span>
      </div>

      {/* Primary Key Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <AdminStatCard
            label="Consultant Roster"
            value={stats.totalDoctors}
            subtext={`${stats.activeDoctors} active on clinical schedule`}
            badgeText="Faculty"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <AdminStatCard
            label="Active Departments"
            value={stats.totalDepartments}
            subtext="Specialty clinical wings"
            badgeText="Clinical"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <AdminStatCard
            label="Today's Appointments"
            value={stats.todayAppointmentsCount}
            subtext={`${stats.pendingRequestsCount} pending triage review`}
            badgeText="OPD Queue"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <AdminStatCard
            label="Registered Patients"
            value={stats.totalPatients}
            subtext="Prototype medical records"
            badgeText="Directory"
          />
        </div>
      </div>

      {/* Secondary Operational Stats Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="hospital-card p-3 text-center">
            <span className="small text-muted d-block">Confirmed OPD Visits</span>
            <span className="fs-4 fw-bold text-success">{stats.confirmedAppointmentsCount}</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="hospital-card p-3 text-center">
            <span className="small text-muted d-block">Pending Requests</span>
            <span className="fs-4 fw-bold text-warning">{stats.pendingRequestsCount}</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="hospital-card p-3 text-center">
            <span className="small text-muted d-block">Concluded Consults</span>
            <span className="fs-4 fw-bold text-primary">{stats.completedAppointmentsCount}</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="hospital-card p-3 text-center">
            <span className="small text-muted d-block">Cancelled Visits</span>
            <span className="fs-4 fw-bold text-danger">{stats.cancelledAppointmentsCount}</span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Today's Appointments & Doctor On-Duty Summary */}
      <div className="row g-4 mb-4">
        {/* Left Column: Today's Clinical Queue */}
        <div className="col-12 col-xl-7">
          <div className="hospital-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 className="fs-6 fw-bold mb-0">Daily Outpatient Queue</h2>
                <span className="small text-muted">Active OPD registrations and consultations</span>
              </div>
              <Link to="/admin/appointments" className="hospital-btn hospital-btn-outline hospital-btn-sm">
                View All Appointments
              </Link>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Patient</th>
                    <th>Consultant</th>
                    <th>Slot</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((apt) => (
                    <tr key={apt.reference}>
                      <td className="fw-semibold">
                        <code>{apt.reference}</code>
                      </td>
                      <td>
                        <div className="fw-semibold">{apt.patientName}</div>
                        <span className="small text-muted">{apt.patientContact}</span>
                      </td>
                      <td>
                        <div className="small fw-semibold">{apt.doctorName}</div>
                        <span className="small text-muted">{apt.specialty}</span>
                      </td>
                      <td>
                        <div className="small fw-semibold">{apt.time}</div>
                        <span className="small text-muted">{apt.date}</span>
                      </td>
                      <td>
                        <AdminStatusBadge status={apt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Doctor Availability Summary */}
        <div className="col-12 col-xl-5">
          <div className="hospital-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 className="fs-6 fw-bold mb-0">Consultant OPD Availability</h2>
                <span className="small text-muted">Active clinics and consulting suites</span>
              </div>
              <Link to="/admin/schedules" className="hospital-btn hospital-btn-outline hospital-btn-sm">
                Roster Detail
              </Link>
            </div>

            <div className="d-flex flex-direction-column flex-column gap-3">
              {onDutyDoctors.map((doc) => (
                <div key={doc.id} className="p-3 border rounded bg-white">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold">{doc.name}</div>
                      <div className="small text-muted">{doc.departmentName}</div>
                    </div>
                    <span className="hospital-badge hospital-badge-confirmed">In Clinic</span>
                  </div>
                  <div className="small text-muted mt-2 d-flex flex-wrap gap-2">
                    <span><strong>Hours:</strong> {doc.schedule.workingHours}</span>
                    <span>•</span>
                    <span><strong>Suite:</strong> {doc.consultation.location.split(',')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Notifications & Recent Audit Activity */}
      <div className="row g-4">
        {/* Recent Notifications Feed */}
        <div className="col-12 col-lg-6">
          <div className="hospital-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="fs-6 fw-bold mb-0">System Dispatch Log (Notifications)</h2>
              <Link to="/admin/notifications" className="hospital-btn hospital-btn-outline hospital-btn-sm">
                View All
              </Link>
            </div>
            <div className="d-flex flex-column gap-2">
              {INITIAL_NOTIFICATIONS.slice(0, 4).map((notif) => (
                <div key={notif.id} className="p-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-center small">
                    <span className="fw-semibold text-primary">{notif.type}</span>
                    <AdminStatusBadge status={notif.status} />
                  </div>
                  <div className="small text-muted mt-1">{notif.message}</div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                    Recipient: {notif.recipient} • {notif.sentAt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="col-12 col-lg-6">
          <div className="hospital-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="fs-6 fw-bold mb-0">Administrative Audit Trail</h2>
              <Link to="/admin/audit" className="hospital-btn hospital-btn-outline hospital-btn-sm">
                Full Audit Log
              </Link>
            </div>
            <div className="d-flex flex-column gap-2">
              {INITIAL_AUDIT_LOGS.slice(0, 4).map((log) => (
                <div key={log.id} className="p-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-center small">
                    <span className="fw-semibold text-dark">
                      <code>{log.action}</code>
                    </span>
                    <AdminStatusBadge status={log.result} />
                  </div>
                  <div className="small text-muted mt-1">{log.details}</div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                    Actor: {log.actor} ({log.role}) • {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
