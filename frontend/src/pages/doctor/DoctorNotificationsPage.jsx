import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Bell,
  Search,
  RotateCw,
  Mail,
  MessageSquare,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  X,
  Filter
} from 'lucide-react';
import apiClient from '../../services/api';

/**
 * Dedicated Doctor Admin Panel — Notifications Registry
 * Displays outbound and operational communication records strictly
 * related to the authenticated doctor's clinical caseload and account.
 */
export function DoctorNotificationsPage() {
  const { doctorProfile } = useOutletContext() || {};
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [error, setError] = useState(null);

  const fetchNotifications = () => {
    setIsLoading(true);
    setError(null);
    apiClient
      .get('/api/notifications/', { requiresAuth: true })
      .then((res) => {
        const list = Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
        setNotifications(list);
      })
      .catch((err) => {
        setError(`Failed to retrieve clinical notifications: ${err.message}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedNotification) {
        setSelectedNotification(null);
      }
    };
    if (selectedNotification) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNotification]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      const matchSearch =
        searchTerm === '' ||
        (notif.recipient || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (notif.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (notif.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(notif.id || '').includes(searchTerm);

      const matchChannel =
        channelFilter === 'ALL' || notif.channel === channelFilter;

      const matchType =
        typeFilter === 'ALL' || notif.notification_type === typeFilter;

      return matchSearch && matchChannel && matchType;
    });
  }, [notifications, searchTerm, channelFilter, typeFilter]);

  const channelIcons = {
    EMAIL: Mail,
    SMS: MessageSquare,
    SYSTEM: Activity,
  };

  return (
    <div className="doctor-notifications-view">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <div className="badge mb-1" style={{ background: '#0D47A1', fontSize: '0.7rem' }}>
            Consultant Clinical Communications
          </div>
          <h1 className="h4 fw-bold text-body mb-0.5">Doctor Notifications & Alerts</h1>
          <p className="text-muted small mb-0">
            Automated appointment confirmations, cancellations, reminders, and alerts for your clinical practice.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="neu-btn neu-btn-outline neu-btn-sm d-flex align-items-center gap-1.5"
            onClick={fetchNotifications}
            disabled={isLoading}
            title="Refresh clinical notifications"
          >
            <RotateCw size={14} className={isLoading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-4" role="alert">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="neu-card rounded-4 p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="position-relative">
              <Search size={16} className="position-absolute start-0 top-50 translate-middle-y ms-3 text-muted" />
              <input
                type="text"
                className="neu-input ps-5 w-100"
                style={{ fontSize: '16px', minHeight: '44px' }}
                placeholder="Search subject, message, recipient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="neu-input w-100"
              style={{ fontSize: '16px', minHeight: '44px' }}
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="ALL">All Channels</option>
              <option value="EMAIL">Email Dispatch</option>
              <option value="SMS">SMS Gateway</option>
              <option value="SYSTEM">System Desk</option>
            </select>
          </div>
          <div className="col-6 col-md-4">
            <select
              className="neu-input w-100"
              style={{ fontSize: '16px', minHeight: '44px' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Notification Types</option>
              <option value="APPOINTMENT_CONFIRMATION">Appointment Confirmation</option>
              <option value="APPOINTMENT_REMINDER">Appointment Reminder</option>
              <option value="APPOINTMENT_CANCELLATION">Appointment Cancellation</option>
              <option value="APPOINTMENT_RESCHEDULE">Appointment Reschedule</option>
              <option value="ADMIN_ALERT">System Alert</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification List Table / Cards */}
      <div className="neu-card rounded-4 p-0 overflow-hidden mb-4">
        {isLoading ? (
          <div className="text-center py-5">
            <RotateCw size={28} className="spin-anim text-primary mb-2" />
            <p className="text-muted small mb-0">Loading your confidential communications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-5 p-4">
            <Bell size={32} className="text-muted mb-2 opacity-50" />
            <h6 className="fw-bold text-body">No notifications found</h6>
            <p className="text-muted small mb-0">
              {searchTerm || channelFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'Try adjusting your filters or search term.'
                : 'No clinical notifications recorded for your appointments yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table (>= 768px) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: 'var(--neu-inset-bg)', fontSize: '0.78rem' }}>
                  <tr>
                    <th className="ps-4 py-3 text-muted text-uppercase fw-semibold">Channel</th>
                    <th className="py-3 text-muted text-uppercase fw-semibold">Subject / Context</th>
                    <th className="py-3 text-muted text-uppercase fw-semibold">Recipient</th>
                    <th className="py-3 text-muted text-uppercase fw-semibold">Status</th>
                    <th className="py-3 text-muted text-uppercase fw-semibold">Date & Time</th>
                    <th className="pe-4 py-3 text-end text-muted text-uppercase fw-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ fontSize: '0.85rem' }}>
                  {filteredNotifications.map((notif) => {
                    const ChannelIcon = channelIcons[notif.channel] || Bell;
                    return (
                      <tr key={notif.id}>
                        <td className="ps-4 py-3">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="p-1.5 rounded-circle neu-inset d-flex align-items-center justify-content-center text-primary"
                              style={{ width: '32px', height: '32px' }}
                            >
                              <ChannelIcon size={16} />
                            </div>
                            <div>
                              <span className="fw-semibold text-body d-block">{notif.channel}</span>
                              <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                                {(notif.notification_type || '').replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="fw-medium text-body">{notif.subject || 'Consultation Alert'}</div>
                          <div className="text-muted small text-truncate" style={{ maxWidth: '280px', fontSize: '0.78rem' }}>
                            {notif.message}
                          </div>
                        </td>
                        <td className="py-3 text-body">
                          <span className="badge neu-inset text-body fw-normal" style={{ fontSize: '0.75rem' }}>
                            {notif.recipient}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`badge ${
                              notif.status === 'SENT'
                                ? 'bg-success-subtle text-success border border-success-subtle'
                                : notif.status === 'FAILED'
                                ? 'bg-danger-subtle text-danger border border-danger-subtle'
                                : 'bg-warning-subtle text-warning border border-warning-subtle'
                            }`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {notif.status || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3 text-muted small" style={{ fontSize: '0.8rem' }}>
                          {notif.created_at
                            ? new Date(notif.created_at).toLocaleString('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : 'Recent'}
                        </td>
                        <td className="pe-4 py-3 text-end">
                          <button
                            type="button"
                            className="neu-btn neu-btn-outline neu-btn-sm py-1 px-2.5 d-inline-flex align-items-center gap-1"
                            style={{ fontSize: '0.78rem' }}
                            onClick={() => setSelectedNotification(notif)}
                            title="View message content"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Notification Cards (< 768px) */}
            <div className="d-md-none p-3 d-flex flex-column gap-3">
              {filteredNotifications.map((notif) => {
                const ChannelIcon = channelIcons[notif.channel] || Bell;
                return (
                  <div key={notif.id} className="doctor-mobile-card neu-inset p-3 rounded-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="p-1 rounded-circle neu-inset d-flex align-items-center justify-content-center text-primary"
                          style={{ width: '28px', height: '28px' }}
                        >
                          <ChannelIcon size={14} />
                        </div>
                        <span className="fw-semibold text-body small">{notif.channel}</span>
                      </div>
                      <span
                        className={`badge ${
                          notif.status === 'SENT'
                            ? 'bg-success-subtle text-success border border-success-subtle'
                            : notif.status === 'FAILED'
                            ? 'bg-danger-subtle text-danger border border-danger-subtle'
                            : 'bg-warning-subtle text-warning border border-warning-subtle'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {notif.status || 'PENDING'}
                      </span>
                    </div>
                    <div className="fw-bold text-body small mb-1">{notif.subject || 'Consultation Alert'}</div>
                    <div className="small text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                      To: <span className="font-monospace text-body">{notif.recipient}</span> • {notif.created_at ? new Date(notif.created_at).toLocaleDateString() : 'Recent'}
                    </div>
                    <div className="small text-body-secondary p-2 rounded-2 neu-inset mb-3 text-truncate" style={{ fontSize: '0.8rem' }}>
                      {notif.message}
                    </div>
                    <button
                      type="button"
                      className="neu-btn neu-btn-outline neu-btn-sm w-100 d-flex align-items-center justify-content-center gap-1.5"
                      style={{ minHeight: '44px' }}
                      onClick={() => setSelectedNotification(notif)}
                    >
                      <Eye size={14} />
                      <span>View Full Dispatch</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedNotification && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(10, 25, 47, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNotification(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
            <div className="modal-content neu-raised neu-surface rounded-4 p-4 border-0 shadow-lg">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 rounded-circle neu-inset text-primary">
                    <Bell size={18} />
                  </div>
                  <h5 className="h5 fw-bold text-body mb-0">Notification Details</h5>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-2 d-flex align-items-center justify-content-center"
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
                  onClick={() => setSelectedNotification(null)}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="neu-inset p-3 rounded-3 mb-3">
                <div className="d-flex justify-content-between mb-2 small">
                  <span className="text-muted">Type:</span>
                  <span className="fw-semibold text-body">{selectedNotification.notification_type}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small">
                  <span className="text-muted">Channel:</span>
                  <span className="fw-semibold text-body">{selectedNotification.channel}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small">
                  <span className="text-muted">Recipient:</span>
                  <span className="fw-semibold text-body">{selectedNotification.recipient}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 small">
                  <span className="text-muted">Status:</span>
                  <span className="badge bg-success-subtle text-success">{selectedNotification.status}</span>
                </div>
                {selectedNotification.appointment && (
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Appointment Ref:</span>
                    <span className="fw-semibold text-primary">{selectedNotification.appointment}</span>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                  Subject
                </label>
                <div className="p-2.5 rounded-3 neu-inset small text-body fw-medium">
                  {selectedNotification.subject || 'Clinical Alert'}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                  Full Dispatch Payload
                </label>
                <div
                  className="p-3 rounded-3 neu-inset small text-body"
                  style={{ whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}
                >
                  {selectedNotification.message}
                </div>
              </div>

              <div className="text-end">
                <button
                  type="button"
                  className="neu-btn neu-btn-primary"
                  style={{ minHeight: '44px', minWidth: '100px' }}
                  onClick={() => setSelectedNotification(null)}
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

export default DoctorNotificationsPage;
