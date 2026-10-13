import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  CalendarCheck, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Activity, 
  ShieldCheck, 
  Bell, 
  ChevronRight,
  Stethoscope
} from 'lucide-react';
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
import { DEMO_DOCTORS } from '../../data/hospitalData';

/**
 * Hospital Platform — Admin Dashboard Page (Neumorphic Redesign)
 * Executive command center displaying clinical roster metrics,
 * OPD queues, consultant availability, and administrative telemetry.
 */
export function AdminDashboardPage() {
  const { currentRole, setRole } = useOutletContext() || {};

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
    <div className="admin-dashboard-view">
      <PageHeader
        title="Hospital Operations Overview"
        description="Clinical capacity, OPD patient queues, consultant availability, and administrative telemetry."
        breadcrumbs={breadcrumbs}
      />

      {/* Operational Mode Alert */}
      <div 
        className="neu-card p-3 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
      >
        <div className="d-flex align-items-center gap-3">
          <div 
            className="d-flex align-items-center justify-content-center"
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              boxShadow: 'var(--neu-inset)', 
              color: 'var(--hospital-blue)',
              flexShrink: 0 
            }}
          >
            <Activity size={18} />
          </div>
          <div>
            <div className="fw-bold" style={{ fontSize: '0.875rem', color: 'var(--hospital-primary-navy)' }}>
              Operational Management Console
            </div>
            <div className="small text-muted">
              Active Session: <strong>{currentRole?.label || 'Super Administrator'}</strong> • High-Availability Gateway
            </div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="neu-badge neu-badge-success">System Online</span>
          <span className="neu-badge neu-badge-info">RBAC Active</span>
        </div>
      </div>

      {/* Primary Key Metric Cards */}
      <div className="row g-3 g-xl-4 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <AdminStatCard
            label="Consultant Roster"
            value={stats.totalDoctors}
            subtext={`${stats.activeDoctors} active on clinical schedule`}
            badgeText="Faculty"
            icon={Users}
            iconColor="var(--hospital-medical-blue)"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <AdminStatCard
            label="Active Departments"
            value={stats.totalDepartments}
            subtext="Specialty clinical wings"
            badgeText="Clinical"
            icon={Building2}
            iconColor="var(--hospital-accent-cyan)"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <AdminStatCard
            label="Today's Appointments"
            value={stats.todayAppointmentsCount}
            subtext={`${stats.pendingRequestsCount} pending triage review`}
            badgeText="OPD Queue"
            icon={CalendarCheck}
            iconColor="#B7791F"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <AdminStatCard
            label="Registered Patients"
            value={stats.totalPatients}
            subtext="Verified medical profiles"
            badgeText="Directory"
            icon={UserCheck}
            iconColor="#16845B"
          />
        </div>
      </div>

      {/* Secondary Operational Stats Row */}
      <div className="row g-3 g-xl-4 mb-5">
        <div className="col-6 col-md-3">
          <div className="neu-card p-3 p-md-4 text-center" style={{ borderRadius: '18px' }}>
            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
              <CheckCircle2 size={16} color="var(--neu-success)" />
              <span className="small text-muted fw-bold">Confirmed OPD Visits</span>
            </div>
            <span className="fs-2 fw-bold" style={{ color: 'var(--neu-success)', fontFamily: 'var(--font-display)' }}>
              {stats.confirmedAppointmentsCount}
            </span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="neu-card p-3 p-md-4 text-center" style={{ borderRadius: '18px' }}>
            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
              <Clock size={16} color="var(--neu-warning)" />
              <span className="small text-muted fw-bold">Pending Requests</span>
            </div>
            <span className="fs-2 fw-bold" style={{ color: 'var(--neu-warning)', fontFamily: 'var(--font-display)' }}>
              {stats.pendingRequestsCount}
            </span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="neu-card p-3 p-md-4 text-center" style={{ borderRadius: '18px' }}>
            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
              <Activity size={16} color="var(--hospital-medical-blue)" />
              <span className="small text-muted fw-bold">Concluded Consults</span>
            </div>
            <span className="fs-2 fw-bold" style={{ color: 'var(--hospital-medical-blue)', fontFamily: 'var(--font-display)' }}>
              {stats.completedAppointmentsCount}
            </span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="neu-card p-3 p-md-4 text-center" style={{ borderRadius: '18px' }}>
            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
              <XCircle size={16} color="var(--neu-error)" />
              <span className="small text-muted fw-bold">Cancelled Visits</span>
            </div>
            <span className="fs-2 fw-bold" style={{ color: 'var(--neu-error)', fontFamily: 'var(--font-display)' }}>
              {stats.cancelledAppointmentsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Today's Appointments & Doctor On-Duty Summary */}
      <div className="row g-4 mb-5">
        {/* Left Column: Today's Clinical Queue */}
        <div className="col-12 col-xl-7">
          <div className="neu-card p-4 p-md-5 h-100" style={{ borderRadius: '22px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="fs-5 fw-bold mb-1" style={{ color: 'var(--hospital-primary-navy)' }}>
                  Daily Outpatient Queue
                </h2>
                <span className="small text-muted">Active OPD registrations and consultations for review</span>
              </div>
              <Link to="/admin/appointments" className="neu-btn neu-btn-outline neu-btn-sm">
                View Registry <ChevronRight size={14} className="ms-1" />
              </Link>
            </div>

            <div className="neu-table-container">
              <table className="neu-table" style={{ minWidth: '640px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Ref</th>
                    <th>Patient</th>
                    <th>Consultant</th>
                    <th>Slot</th>
                    <th style={{ width: '120px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((apt) => (
                    <tr key={apt.reference}>
                      <td>
                        <span 
                          className="px-2.5 py-1 rounded small fw-bold font-monospace d-inline-block"
                          style={{ 
                            background: 'var(--hospital-surface)', 
                            boxShadow: 'var(--neu-inset)',
                            fontSize: '0.785rem',
                            color: 'var(--hospital-medical-blue)'
                          }}
                        >
                          {apt.reference}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold text-truncate" style={{ maxWidth: '160px' }}>
                          {apt.patientName}
                        </div>
                        <span className="small text-muted d-block mt-0.5">{apt.patientContact}</span>
                      </td>
                      <td>
                        <div className="small fw-semibold text-body">{apt.doctorName}</div>
                        <span className="small text-muted d-block mt-0.5">{apt.specialty}</span>
                      </td>
                      <td>
                        <div className="small fw-semibold text-body">{apt.time}</div>
                        <span className="small text-muted d-block mt-0.5">{apt.date}</span>
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
          <div className="neu-card p-4 p-md-5 h-100" style={{ borderRadius: '22px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="fs-5 fw-bold mb-1" style={{ color: 'var(--hospital-primary-navy)' }}>
                  Consultant OPD Availability
                </h2>
                <span className="small text-muted">Active clinics and consulting suites</span>
              </div>
              <Link to="/admin/schedules" className="neu-btn neu-btn-outline neu-btn-sm">
                Schedules <ChevronRight size={14} className="ms-1" />
              </Link>
            </div>

            <div className="d-flex flex-column gap-3">
              {onDutyDoctors.map((doc) => (
                <div 
                  key={doc.id} 
                  className="p-3 neu-card-sm d-flex flex-column gap-2"
                  style={{ 
                    borderRadius: '14px', 
                    background: 'var(--hospital-surface)',
                    boxShadow: 'var(--neu-raised-sm)',
                    border: '1px solid var(--hospital-border)'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="d-flex align-items-center gap-2">
                      <div 
                        className="d-flex align-items-center justify-content-center"
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          boxShadow: 'var(--neu-inset)', 
                          color: 'var(--hospital-blue)',
                          flexShrink: 0 
                        }}
                      >
                        <Stethoscope size={16} />
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{doc.name}</div>
                        <div className="small text-muted">{doc.departmentName}</div>
                      </div>
                    </div>
                    <span className="neu-badge neu-badge-success">In Clinic</span>
                  </div>
                  <div className="small text-muted d-flex flex-wrap gap-2 pt-1 border-top" style={{ borderColor: 'var(--hospital-border)' }}>
                    <span><strong>Hours:</strong> {doc.schedule?.workingHours || '09:00 - 17:00'}</span>
                    <span>•</span>
                    <span><strong>Suite:</strong> {doc.consultation?.location?.split(',')[0] || 'OPD Block'}</span>
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
          <div className="neu-card p-4 h-100" style={{ borderRadius: '20px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center gap-2">
                <Bell size={18} color="var(--hospital-blue)" />
                <h2 className="fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                  System Dispatch Log
                </h2>
              </div>
              <Link to="/admin/notifications" className="neu-btn neu-btn-outline neu-btn-sm">
                View All
              </Link>
            </div>
            <div className="d-flex flex-column gap-3">
              {INITIAL_NOTIFICATIONS.slice(0, 4).map((notif) => (
                <div 
                  key={notif.id} 
                  className="p-3 rounded"
                  style={{ 
                    background: 'var(--hospital-surface)', 
                    boxShadow: 'var(--neu-raised-sm)',
                    border: '1px solid var(--hospital-border)' 
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-semibold text-primary small">{notif.type}</span>
                    <AdminStatusBadge status={notif.status} />
                  </div>
                  <div className="small text-muted">{notif.message}</div>
                  <div className="small text-muted mt-2 pt-1 border-top d-flex justify-content-between" style={{ fontSize: '0.75rem', borderColor: 'var(--hospital-border)' }}>
                    <span>To: {notif.recipient}</span>
                    <span>{notif.sentAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="col-12 col-lg-6">
          <div className="neu-card p-4 h-100" style={{ borderRadius: '20px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center gap-2">
                <ShieldCheck size={18} color="#16845B" />
                <h2 className="fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                  Administrative Audit Trail
                </h2>
              </div>
              <Link to="/admin/audit" className="neu-btn neu-btn-outline neu-btn-sm">
                Full Audit Log
              </Link>
            </div>
            <div className="d-flex flex-column gap-3">
              {INITIAL_AUDIT_LOGS.slice(0, 4).map((log) => (
                <div 
                  key={log.id} 
                  className="p-3 rounded"
                  style={{ 
                    background: 'var(--hospital-surface)', 
                    boxShadow: 'var(--neu-raised-sm)',
                    border: '1px solid var(--hospital-border)' 
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span 
                      className="px-2 py-0.5 rounded small font-monospace fw-bold"
                      style={{ 
                        background: 'var(--hospital-surface)', 
                        boxShadow: 'var(--neu-inset)', 
                        fontSize: '0.75rem',
                        color: 'var(--hospital-primary-navy)' 
                      }}
                    >
                      {log.action}
                    </span>
                    <AdminStatusBadge status={log.result} />
                  </div>
                  <div className="small text-muted mt-1">{log.details}</div>
                  <div className="small text-muted mt-2 pt-1 border-top d-flex justify-content-between" style={{ fontSize: '0.75rem', borderColor: 'var(--hospital-border)' }}>
                    <span>Actor: {log.actor} ({log.role})</span>
                    <span>{log.timestamp}</span>
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
