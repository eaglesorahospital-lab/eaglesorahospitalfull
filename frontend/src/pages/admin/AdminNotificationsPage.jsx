import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import { INITIAL_NOTIFICATIONS } from '../../data/adminData';

/**
 * Hospital Platform — Admin Notifications Management Page (Phase 8)
 * Registry of dispatched SMS, Email, and System alerts.
 * Strictly frontend mock presentation. Asynchronous Celery/Redis dispatch occurs in later backend phases.
 */
export function AdminNotificationsPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission: only Super Admin and Hospital Admin can access notification queue
  if (currentRole && (currentRole.id === 'DOCTOR_STAFF' || currentRole.id === 'PATIENT')) {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Notification Dispatch Registry"
        onSwitchRole={setRole}
      />
    );
  }

  // Local state for notifications
  const [notificationsList, setNotificationsList] = useState(INITIAL_NOTIFICATIONS);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & notices
  const [viewNotif, setViewNotif] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Notification Dispatch Registry' },
  ];

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notificationsList.filter((notif) => {
      const matchSearch =
        searchTerm === '' ||
        notif.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notif.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notif.relatedRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType =
        typeFilter === 'ALL' || notif.type.toUpperCase() === typeFilter.toUpperCase();

      const matchStatus =
        statusFilter === 'ALL' || notif.status.toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchType && matchStatus;
    });
  }, [notificationsList, searchTerm, typeFilter, statusFilter]);

  // Handle mock resend
  const handleResend = (notifId) => {
    setNotificationsList((prev) =>
      prev.map((n) =>
        n.id === notifId
          ? {
              ...n,
              status: 'Sent',
              sentAt: 'Just now (Simulated)',
            }
          : n
      )
    );
    setActionNotice(`Notification ${notifId} requeued and dispatched in local simulation state.`);
  };

  return (
    <div>
      <PageHeader
        title="Notification Dispatch Registry"
        description="Outbound SMS, Email, and clinical alert queues. Telemetry logs for appointment notifications."
        breadcrumbs={breadcrumbs}
      />

      {/* Backend Architecture Notice Banner */}
      <div className="alert alert-info py-2 px-3 mb-3 small d-flex flex-wrap justify-content-between align-items-center">
        <span>
          <strong>Asynchronous Queue Architecture:</strong> In production, automated notifications are triggered by
          Django model signals and dispatched via Redis and Celery worker workers. Current view represents simulated logs.
        </span>
        <span className="text-muted">Phase 8 Frontend Only</span>
      </div>

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
        searchPlaceholder="Search recipient, appointment ref, or message..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        hasActiveFilters={searchTerm !== '' || typeFilter !== 'ALL' || statusFilter !== 'ALL'}
        onClear={() => {
          setSearchTerm('');
          setTypeFilter('ALL');
          setStatusFilter('ALL');
        }}
      >
        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="hospital-form-control"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by notification type"
          >
            <option value="ALL">All Event Types</option>
            <option value="APPOINTMENT CONFIRMATION">Appointment Confirmation</option>
            <option value="APPOINTMENT REMINDER">Appointment Reminder</option>
            <option value="CANCELLATION NOTICE">Cancellation Notice</option>
            <option value="RESCHEDULE NOTICE">Reschedule Notice</option>
            <option value="ADMIN SYSTEM ALERT">Admin System Alert</option>
          </select>
        </div>

        <div className="col-12 col-sm-6 col-md-2">
          <select
            className="hospital-form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by dispatch status"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </AdminFilterBar>

      {/* Notifications Table */}
      <div className="hospital-card p-0 mb-4 overflow-hidden">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Notice ID</th>
                <th>Event Type</th>
                <th>Channel</th>
                <th>Recipient Contact</th>
                <th>Related Ref</th>
                <th>Dispatch Time</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    No notification dispatch records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <code>{n.id}</code>
                    </td>
                    <td>
                      <span className="fw-semibold text-primary">{n.type}</span>
                    </td>
                    <td>
                      <span className="small text-muted">{n.channel}</span>
                    </td>
                    <td>
                      <span className="small">{n.recipient}</span>
                    </td>
                    <td>
                      <span className="small">
                        <code>{n.relatedRef}</code>
                      </span>
                    </td>
                    <td>
                      <span className="small text-muted">{n.sentAt}</span>
                    </td>
                    <td>
                      <AdminStatusBadge status={n.status} />
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                        onClick={() => setViewNotif(n)}
                      >
                        Payload
                      </button>
                      {n.status !== 'Sent' && (
                        <button
                          type="button"
                          className="hospital-btn hospital-btn-sm btn-outline-success"
                          onClick={() => handleResend(n.id)}
                        >
                          Retry
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

      {/* View Notification Payload Modal */}
      {viewNotif && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fs-6 fw-bold mb-0">
                    Dispatch Payload: {viewNotif.id}
                  </h5>
                  <span className="small text-muted">{viewNotif.type} • {viewNotif.channel}</span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewNotif(null)}
                />
              </div>
              <div className="modal-body">
                <div className="p-3 bg-light rounded border mb-3">
                  <div className="small"><strong>Recipient:</strong> {viewNotif.recipient}</div>
                  <div className="small"><strong>Channel:</strong> {viewNotif.channel}</div>
                  <div className="small"><strong>Reference:</strong> {viewNotif.relatedRef}</div>
                  <div className="small"><strong>Dispatch Timestamp:</strong> {viewNotif.sentAt}</div>
                  <div className="small mt-1">
                    <strong>Delivery State:</strong> <AdminStatusBadge status={viewNotif.status} />
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="small text-muted fw-bold mb-1">Message Body</div>
                  <p className="small mb-0 text-dark" style={{ fontFamily: 'monospace' }}>
                    {viewNotif.message}
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="hospital-btn hospital-btn-outline hospital-btn-sm"
                  onClick={() => setViewNotif(null)}
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

export default AdminNotificationsPage;
