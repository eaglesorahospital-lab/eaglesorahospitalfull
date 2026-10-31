import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Bell, 
  Send, 
  RotateCw, 
  CheckCircle2, 
  X, 
  Eye, 
  Mail, 
  MessageSquare, 
  Activity,
  AlertCircle
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import notificationService from '../../services/notificationService';
import { INITIAL_NOTIFICATIONS } from '../../data/adminData';

/**
 * Normalizes DRF Notification object for UI consumption
 */
function normalizeNotification(n) {
  if (!n) return null;
  const statusStr = n.status ? (n.status.charAt(0).toUpperCase() + n.status.slice(1).toLowerCase()) : 'Sent';
  const typeStr = n.notification_type 
    ? n.notification_type.replace(/_/g, ' ') 
    : (n.type || 'SYSTEM ALERT');

  return {
    ...n,
    id: typeof n.id === 'number' ? `NOTIF-${n.id}` : n.id,
    rawId: n.id,
    type: typeStr,
    channel: n.channel || 'SMS',
    recipient: n.recipient || 'Outpatient',
    subject: n.subject || 'Automated Communication',
    message: n.message || '',
    relatedRef: n.appointment ? `APT-REF-${n.appointment}` : (n.relatedRef || 'System Event'),
    status: statusStr,
    createdAt: n.created_at ? n.created_at.slice(0, 16).replace('T', ' ') : (n.createdAt || '2026-10-08 10:00'),
    sentAt: n.sent_at ? n.sent_at.slice(0, 16).replace('T', ' ') : (n.sentAt || 'Queued'),
  };
}

/**
 * Hospital Platform — Admin Notifications Management Page (Neumorphic Redesign)
 * Registry of dispatched SMS, Email, and System alerts from Django / PostgreSQL.
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

  // Live notifications state
  const [notificationsList, setNotificationsList] = useState(INITIAL_NOTIFICATIONS);
  const [isLoading, setIsLoading] = useState(false);

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

  // Fetch from DRF backend API
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.getNotifications({ page_size: 100 });
      const rawList = Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
      if (rawList.length > 0) {
        setNotificationsList(rawList.map(normalizeNotification));
      }
    } catch (err) {
      console.warn('Could not load live notifications from backend API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notificationsList.filter((notif) => {
      const matchSearch =
        searchTerm === '' ||
        (notif.id && notif.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (notif.recipient && notif.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (notif.relatedRef && notif.relatedRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (notif.message && notif.message.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType =
        typeFilter === 'ALL' || (notif.type && notif.type.toUpperCase() === typeFilter.toUpperCase());

      const matchStatus =
        statusFilter === 'ALL' || (notif.status && notif.status.toUpperCase() === statusFilter.toUpperCase());

      return matchSearch && matchType && matchStatus;
    });
  }, [notificationsList, searchTerm, typeFilter, statusFilter]);

  // Handle mock / test resend
  const handleResend = (notifId) => {
    setNotificationsList((prev) =>
      prev.map((n) =>
        n.id === notifId
          ? {
              ...n,
              status: 'Sent',
              sentAt: 'Just now',
            }
          : n
      )
    );
    setActionNotice(`Notification ${notifId} requeued and dispatched successfully.`);
  };

  return (
    <div className="admin-notifications-view">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <PageHeader
          title="Notification Dispatch Registry"
          description="Outbound SMS, Email, and clinical alert queues. Telemetry logs for appointment notifications."
          breadcrumbs={breadcrumbs}
          className="mb-0"
        />
        <button
          type="button"
          className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-2"
          onClick={fetchNotifications}
          disabled={isLoading}
        >
          <RotateCw size={15} className={isLoading ? 'spin-anim' : ''} />
          {isLoading ? 'Syncing...' : 'Sync Live Logs'}
        </button>
      </div>

      {/* Backend Architecture Notice Banner */}
      <div 
        className="neu-card p-3 p-md-4 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3"
        style={{ borderRadius: '18px', background: 'var(--hospital-surface)' }}
      >
        <div className="d-flex align-items-center gap-3 small">
          <div 
            className="d-flex align-items-center justify-content-center"
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              boxShadow: 'var(--neu-inset)', 
              color: 'var(--hospital-medical-blue)',
              flexShrink: 0 
            }}
          >
            <Activity size={18} />
          </div>
          <span style={{ color: 'var(--hospital-primary-navy)' }}>
            <strong>Queue Telemetry:</strong> Notifications trigger via appointment lifecycle events and persist securely in PostgreSQL with delivery audit tracking.
          </span>
        </div>
        <span className="neu-badge neu-badge-success">PostgreSQL Integrated</span>
      </div>

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
            className="neu-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by notification type"
          >
            <option value="ALL">All Event Types</option>
            <option value="APPOINTMENT CONFIRMATION">Appointment Confirmation</option>
            <option value="APPOINTMENT REMINDER">Appointment Reminder</option>
            <option value="APPOINTMENT CANCELLATION">Cancellation Notice</option>
            <option value="APPOINTMENT RESCHEDULE">Reschedule Notice</option>
            <option value="ADMIN ALERT">Admin System Alert</option>
          </select>
        </div>

        <div className="col-12 col-sm-6 col-md-2">
          <select
            className="neu-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by dispatch status"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </AdminFilterBar>

      {/* Notifications Table */}
      <div 
        className="neu-card p-0 mb-4 overflow-hidden" 
        style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
      >
        <div className="neu-table-container">
          <table className="neu-table">
            <thead>
              <tr>
                <th className="col-notice-id">Notice ID</th>
                <th className="col-event-type">Event Type</th>
                <th className="col-channel">Channel</th>
                <th className="col-recipient">Recipient Contact</th>
                <th className="col-related-ref">Related Ref</th>
                <th className="col-dispatch-time">Dispatch Time</th>
                <th className="col-notif-status">Status</th>
                <th className="col-notif-actions text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <RotateCw size={24} className="spin-anim mb-2 text-primary" />
                    <div>Loading communication logs from database...</div>
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <AlertCircle size={28} className="mb-2 text-muted" />
                    <div className="fw-semibold">No notification dispatch records match the selected filter.</div>
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((n) => (
                  <tr key={n.id}>
                    <td className="col-notice-id">
                      <span 
                        className="px-2.5 py-1 rounded small font-monospace fw-bold"
                        style={{ 
                          background: 'var(--hospital-surface)', 
                          boxShadow: 'var(--neu-inset)', 
                          fontSize: '0.785rem',
                          color: 'var(--hospital-medical-blue)'
                        }}
                      >
                        {n.id}
                      </span>
                    </td>
                    <td className="col-event-type">
                      <span className="fw-semibold text-primary d-block">{n.type}</span>
                    </td>
                    <td className="col-channel">
                      <span className="neu-badge neu-badge-info">{n.channel}</span>
                    </td>
                    <td className="col-recipient">
                      <span className="small text-body d-block text-break" style={{ maxWidth: '220px' }}>
                        {n.recipient}
                      </span>
                    </td>
                    <td className="col-related-ref">
                      <span 
                        className="px-2 py-0.5 rounded small font-monospace d-inline-block"
                        style={{ background: 'var(--hospital-surface)', boxShadow: 'var(--neu-inset)', fontSize: '0.75rem' }}
                      >
                        {n.relatedRef}
                      </span>
                    </td>
                    <td className="col-dispatch-time">
                      <span className="small text-muted font-monospace">{n.sentAt}</span>
                    </td>
                    <td className="col-notif-status">
                      <AdminStatusBadge status={n.status} />
                    </td>
                    <td className="col-notif-actions text-end text-nowrap">
                      <div className="neu-action-btns">
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => setViewNotif(n)}
                          title="View dispatch payload"
                        >
                          <Eye size={13} className="me-1" />
                          Payload
                        </button>
                        {n.status !== 'Sent' && n.status !== 'Delivered' && (
                          <button
                            type="button"
                            className="neu-btn neu-btn-primary neu-btn-sm"
                            onClick={() => handleResend(n.id)}
                            title="Retry message dispatch"
                          >
                            <Send size={13} className="me-1" />
                            Retry
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
      </div>

      {/* View Notification Payload Modal */}
      {viewNotif && (
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
                <div>
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Dispatch Payload: {viewNotif.id}
                  </h5>
                  <span className="small text-muted">{viewNotif.type} • {viewNotif.channel}</span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setViewNotif(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <div 
                  className="p-3 neu-card-sm mb-3"
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="small mb-1"><strong>Recipient:</strong> {viewNotif.recipient}</div>
                  <div className="small mb-1"><strong>Channel:</strong> {viewNotif.channel}</div>
                  <div className="small mb-1"><strong>Subject:</strong> {viewNotif.subject}</div>
                  <div className="small mb-1"><strong>Reference:</strong> {viewNotif.relatedRef}</div>
                  <div className="small mb-1"><strong>Timestamp:</strong> {viewNotif.sentAt}</div>
                  <div className="small mt-2 d-flex align-items-center gap-2">
                    <strong>Delivery State:</strong> <AdminStatusBadge status={viewNotif.status} />
                  </div>
                </div>

                <div 
                  className="p-3 neu-card-sm"
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="small text-muted fw-bold mb-1 text-uppercase">Message Body</div>
                  <p className="small mb-0 text-muted font-monospace" style={{ lineHeight: '1.5' }}>
                    {viewNotif.message}
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
