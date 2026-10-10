import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import { INITIAL_AUDIT_LOGS } from '../../data/adminData';

/**
 * Hospital Platform — Admin Audit Logs Page (Phase 8)
 * Security, compliance, and clinical operational audit trail.
 * Demonstrates immutable event auditing. Pure frontend presentation with fictional demo records.
 */
export function AdminAuditPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission: only Super Admin can view full compliance audit logs
  if (currentRole && currentRole.id !== 'SUPER_ADMIN') {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Administrative Audit Trail & Security Logs"
        onSwitchRole={setRole}
      />
    );
  }

  // Local state
  const [auditLogsList] = useState(INITIAL_AUDIT_LOGS);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');

  // Modal state
  const [viewAuditLog, setViewAuditLog] = useState(null);

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Security & Clinical Audit Logs' },
  ];

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogsList.filter((log) => {
      const matchSearch =
        searchTerm === '' ||
        log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resourceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole =
        roleFilter === 'ALL' || log.role.toUpperCase() === roleFilter.toUpperCase();

      const matchResult =
        resultFilter === 'ALL' || log.result.toUpperCase() === resultFilter.toUpperCase();

      return matchSearch && matchRole && matchResult;
    });
  }, [auditLogsList, searchTerm, roleFilter, resultFilter]);

  return (
    <div>
      <PageHeader
        title="Compliance & Operational Audit Trail"
        description="Immutable administrative activity logs, clinical record accesses, roster modifications, and access reviews."
        breadcrumbs={breadcrumbs}
      />

      {/* Compliance Notice Banner */}
      <div className="alert alert-info py-2 px-3 mb-3 small d-flex flex-wrap justify-content-between align-items-center">
        <span>
          <strong>Healthcare Compliance & Traceability:</strong> In production, audit records are generated via
          PostgreSQL transaction triggers and Django middleware to guarantee non-repudiation. Current view represents simulated entries.
        </span>
        <span className="text-muted">Super Admin Exclusive</span>
      </div>

      {/* Filter and Search Bar */}
      <AdminFilterBar
        searchPlaceholder="Search actor, action, resource, ID, or details..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        hasActiveFilters={searchTerm !== '' || roleFilter !== 'ALL' || resultFilter !== 'ALL'}
        onClear={() => {
          setSearchTerm('');
          setRoleFilter('ALL');
          setResultFilter('ALL');
        }}
      >
        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="hospital-form-control"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by actor role"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="HOSPITAL_ADMIN">Hospital Admin</option>
            <option value="DOCTOR_STAFF">Doctor / Staff</option>
            <option value="SYSTEM">System / Worker</option>
          </select>
        </div>

        <div className="col-12 col-sm-6 col-md-2">
          <select
            className="hospital-form-control"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            aria-label="Filter by audit result"
          >
            <option value="ALL">All Results</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>
      </AdminFilterBar>

      {/* Audit Logs Table */}
      <div className="hospital-card p-0 mb-4 overflow-hidden">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action Code</th>
                <th>Resource Target</th>
                <th>Target Ref</th>
                <th>Result</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    No audit records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="small text-muted font-monospace">{log.timestamp}</span>
                    </td>
                    <td>
                      <div className="fw-semibold">{log.actor}</div>
                    </td>
                    <td>
                      <span className="badge bg-secondary small">{log.role}</span>
                    </td>
                    <td>
                      <code>{log.action}</code>
                    </td>
                    <td>
                      <span className="small">{log.resource}</span>
                    </td>
                    <td>
                      <span className="small font-monospace">{log.resourceId}</span>
                    </td>
                    <td>
                      <AdminStatusBadge status={log.result} />
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm"
                        onClick={() => setViewAuditLog(log)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Audit Log Modal */}
      {viewAuditLog && (
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
                    Audit Entry: {viewAuditLog.id}
                  </h5>
                  <span className="small text-muted">{viewAuditLog.timestamp}</span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewAuditLog(null)}
                />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <div className="small text-muted fw-bold mb-2">Actor Identity</div>
                      <div className="small"><strong>Actor:</strong> {viewAuditLog.actor}</div>
                      <div className="small"><strong>Role:</strong> {viewAuditLog.role}</div>
                      <div className="small"><strong>Client IP:</strong> 192.168.10.42 (Internal LAN)</div>
                      <div className="small"><strong>Session ID:</strong> SES-SIM-99201</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <div className="small text-muted fw-bold mb-2">Action Context</div>
                      <div className="small"><strong>Action Code:</strong> <code>{viewAuditLog.action}</code></div>
                      <div className="small"><strong>Resource Type:</strong> {viewAuditLog.resource}</div>
                      <div className="small"><strong>Resource ID:</strong> {viewAuditLog.resourceId}</div>
                      <div className="small mt-1">
                        <strong>Outcome:</strong> <AdminStatusBadge status={viewAuditLog.result} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="small text-muted fw-bold mb-1">Event Narrative & Payload</div>
                  <p className="small mb-0 text-dark" style={{ fontFamily: 'monospace' }}>
                    {viewAuditLog.details}
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="hospital-btn hospital-btn-outline hospital-btn-sm"
                  onClick={() => setViewAuditLog(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAuditPage;
