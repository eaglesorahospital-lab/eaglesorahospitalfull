import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ShieldCheck, 
  RotateCw, 
  CheckCircle2, 
  X, 
  Eye, 
  Activity, 
  FileText, 
  Search, 
  Lock 
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import { INITIAL_AUDIT_LOGS } from '../../data/adminData';

/**
 * Hospital Platform — Admin Audit Logs Page (Neumorphic Redesign)
 * Security, compliance, and clinical operational audit trail.
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
    <div className="admin-audit-view">
      <PageHeader
        title="Compliance & Operational Audit Trail"
        description="Immutable administrative activity logs, clinical record accesses, roster modifications, and access reviews."
        breadcrumbs={breadcrumbs}
      />

      {/* Compliance Notice Banner */}
      <div 
        className="neu-card p-3 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
      >
        <div className="d-flex align-items-center gap-2 small">
          <ShieldCheck size={18} color="#16845B" />
          <span style={{ color: 'var(--hospital-primary-navy)' }}>
            <strong>Healthcare Compliance:</strong> Audit records are generated via database transaction triggers and middleware for non-repudiation.
          </span>
        </div>
        <span className="neu-badge neu-badge-primary">Super Admin Exclusive</span>
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
            className="neu-select"
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
            className="neu-select"
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
      <div 
        className="neu-card p-0 mb-4 overflow-hidden" 
        style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
      >
        <div className="neu-table-container">
          <table className="neu-table">
            <thead>
              <tr>
                <th className="col-audit-time">Timestamp</th>
                <th className="col-audit-actor">Actor</th>
                <th className="col-audit-role">Role</th>
                <th className="col-audit-action">Action Code</th>
                <th className="col-audit-resource">Resource Target</th>
                <th className="col-audit-target">Target Ref</th>
                <th className="col-audit-result">Result</th>
                <th className="col-audit-actions text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
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
                      <span className="neu-badge neu-badge-secondary">{log.role}</span>
                    </td>
                    <td>
                      <span 
                        className="px-2 py-0.5 rounded small font-monospace fw-bold"
                        style={{ 
                          background: 'var(--hospital-surface)', 
                          boxShadow: 'var(--neu-inset)',
                          fontSize: '0.72rem',
                          color: 'var(--hospital-blue)'
                        }}
                      >
                        {log.action}
                      </span>
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
                    <td className="text-end">
                      <div className="neu-action-btns">
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => setViewAuditLog(log)}
                          title="Inspect immutable audit entry"
                        >
                          <Eye size={13} className="me-1" />
                          Inspect
                        </button>
                      </div>
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
                    Audit Entry: {viewAuditLog.id}
                  </h5>
                  <span className="small text-muted">{viewAuditLog.timestamp}</span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setViewAuditLog(null)}
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
                      <div className="small text-muted fw-bold mb-2 text-uppercase">Actor Identity</div>
                      <div className="small mb-1"><strong>Actor:</strong> {viewAuditLog.actor}</div>
                      <div className="small mb-1"><strong>Role:</strong> {viewAuditLog.role}</div>
                      <div className="small mb-1"><strong>Client IP:</strong> 192.168.10.42 (Internal LAN)</div>
                      <div className="small"><strong>Session ID:</strong> SES-SIM-99201</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold mb-2 text-uppercase">Action Context</div>
                      <div className="small mb-1"><strong>Action Code:</strong> <code>{viewAuditLog.action}</code></div>
                      <div className="small mb-1"><strong>Resource:</strong> {viewAuditLog.resource}</div>
                      <div className="small mb-1"><strong>Resource ID:</strong> {viewAuditLog.resourceId}</div>
                      <div className="small mt-2 d-flex align-items-center gap-2">
                        <strong>Outcome:</strong> <AdminStatusBadge status={viewAuditLog.result} />
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-3 neu-card-sm" 
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="small text-muted fw-bold mb-1 text-uppercase">Event Narrative & Payload</div>
                  <p className="small mb-0 text-muted font-monospace" style={{ lineHeight: '1.5' }}>
                    {viewAuditLog.details}
                  </p>
                </div>
              </div>
              <div 
                className="modal-footer px-4 py-3 border-top"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
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
