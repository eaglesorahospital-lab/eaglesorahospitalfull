import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ShieldCheck, 
  UserPlus, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Power, 
  Eye, 
  EyeOff, 
  Lock, 
  Search, 
  Phone, 
  Mail, 
  User 
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import adminService from '../../services/adminService';
import authService from '../../services/authService';

/**
 * Hospital Platform — Hospital Administrator Account Management Page (Neumorphic Redesign)
 * Allows authorized Super Administrators to provision and manage Hospital Administrator accounts.
 * Strictly enforces RBAC:
 * - Only SUPER_ADMIN can view, create, or toggle administrator accounts.
 * - Enforces Django password hashing and email uniqueness.
 * - Automatically assigns HOSPITAL_ADMIN role and 'Hospital Administrators' group permissions.
 */
export function AdminAdministratorsPage() {
  const { currentRole, setRole } = useOutletContext() || {};
  const staffUser = authService.getCurrentUser();

  // Super Admin security guard
  const isSuperAdmin =
    staffUser?.role === 'SUPER_ADMIN' ||
    currentRole?.id === 'SUPER_ADMIN' ||
    staffUser?.is_superuser;

  if (!isSuperAdmin) {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Hospital Administrator Account Management"
        onSwitchRole={setRole}
      />
    );
  }

  // Administrators data state
  const [administrators, setAdministrators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [newAdminForm, setNewAdminForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: '',
  });

  // Toggle Confirm Modal state
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  // Breadcrumbs
  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Administrators' },
  ];

  // Fetch administrator accounts from Django API
  const loadAdministrators = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAdministrators();
      setAdministrators(data || []);
    } catch (err) {
      console.error('Failed to load administrators:', err);
      setError(err.message || 'Unable to retrieve administrator accounts from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdministrators();
  }, []);

  // Filtered list
  const filteredAdmins = useMemo(() => {
    return administrators.filter((admin) => {
      const name = (admin.name || `${admin.first_name || ''} ${admin.last_name || ''}`).toLowerCase();
      const email = (admin.email || '').toLowerCase();
      const phone = (admin.phone || '').toLowerCase();
      const term = searchTerm.toLowerCase().trim();

      const matchesSearch = !term || name.includes(term) || email.includes(term) || phone.includes(term);
      const matchesRole = roleFilter === 'ALL' || admin.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && admin.is_active) ||
        (statusFilter === 'INACTIVE' && !admin.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [administrators, searchTerm, roleFilter, statusFilter]);

  // Form input change handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewAdminForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Create Hospital Administrator
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Client validation
    const errors = {};
    if (!newAdminForm.full_name.trim()) {
      errors.full_name = 'Full name is required.';
    }
    if (!newAdminForm.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(newAdminForm.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!newAdminForm.password) {
      errors.password = 'Password is required.';
    } else if (newAdminForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }
    if (newAdminForm.password !== newAdminForm.password_confirm) {
      errors.password_confirm = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const created = await adminService.createAdministrator(newAdminForm);
      setActionNotice({
        type: 'success',
        message: `Successfully provisioned Hospital Administrator account for ${created.name || created.email}.`,
      });
      setShowAddModal(false);
      setNewAdminForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirm: '',
      });
      await loadAdministrators();
    } catch (err) {
      console.error('Failed to create administrator:', err);
      if (err.fieldErrors) {
        setFormErrors(err.fieldErrors);
      } else {
        setActionNotice({
          type: 'danger',
          message: err.message || 'Failed to create administrator account.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status
  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;

    try {
      setToggling(true);
      const updated = await adminService.toggleAdministratorStatus(toggleTarget.id);
      setActionNotice({
        type: 'success',
        message: `Administrator ${updated.name || updated.email} status updated to ${updated.is_active ? 'Active' : 'Inactive'}.`,
      });
      setToggleTarget(null);
      await loadAdministrators();
    } catch (err) {
      console.error('Status toggle failed:', err);
      setActionNotice({
        type: 'danger',
        message: err.message || 'Failed to update administrator status.',
      });
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="admin-administrators-view">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <PageHeader
          title="Hospital Administrators"
          description="Manage authorized Hospital Administrator accounts, RBAC permissions, and access credentials."
          breadcrumbs={breadcrumbs}
          className="mb-0"
        />
        <button
          type="button"
          className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2"
          onClick={() => {
            setFormErrors({});
            setShowAddModal(true);
          }}
        >
          <UserPlus size={16} />
          Create Administrator
        </button>
      </div>

      {/* Security Governance Notice */}
      <div 
        className="neu-card p-3 mb-4 d-flex align-items-center gap-3" 
        style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
      >
        <div 
          className="d-flex align-items-center justify-content-center"
          style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '12px', 
            background: 'var(--hospital-surface)', 
            boxShadow: 'var(--neu-inset)', 
            color: 'var(--hospital-blue)',
            flexShrink: 0
          }}
        >
          <ShieldCheck size={20} />
        </div>
        <div className="small text-muted flex-grow-1">
          <strong>Security Policy:</strong> Only Super Administrators can provision or deactivate
          administrator accounts. Newly created administrators receive the <code>HOSPITAL_ADMIN</code> role,
          the <code>is_staff</code> flag, and model permissions. Passwords are cryptographically hashed using PBKDF2 SHA256.
        </div>
      </div>

      {/* Alert Notices */}
      {actionNotice && (
        <div 
          className="neu-card p-3 mb-4 d-flex justify-content-between align-items-center"
          style={{ 
            borderRadius: '14px', 
            background: 'var(--hospital-surface)',
            borderLeft: `4px solid ${actionNotice.type === 'danger' ? 'var(--neu-error)' : 'var(--neu-success)'}`
          }}
        >
          <div className="d-flex align-items-center gap-2 small">
            {actionNotice.type === 'danger' ? (
              <AlertCircle size={16} color="var(--neu-error)" />
            ) : (
              <CheckCircle2 size={16} color="var(--neu-success)" />
            )}
            <span style={{ color: 'var(--hospital-primary-navy)', fontWeight: 600 }}>{actionNotice.message}</span>
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
      <div 
        className="neu-card p-3 mb-4" 
        style={{ borderRadius: '18px', background: 'var(--hospital-surface)' }}
      >
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="position-relative">
              <input
                type="text"
                className="neu-input ps-5"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
              <Search 
                size={16} 
                className="position-absolute" 
                style={{ 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--hospital-text-muted)',
                  pointerEvents: 'none'
                }} 
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="neu-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Administrator</option>
              <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="neu-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
          <div className="col-12 col-md-1 text-md-end">
            <button
              type="button"
              className="neu-btn neu-btn-outline w-100 d-flex align-items-center justify-content-center"
              onClick={loadAdministrators}
              title="Refresh list"
            >
              <RotateCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Administrators Table */}
      <div 
        className="neu-card p-0 mb-4 overflow-hidden" 
        style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
      >
        <div className="neu-table-container">
          {loading ? (
            <div className="text-center py-5 text-muted">
              <RotateCw size={24} className="spin-anim mb-2 text-primary" />
              <div>Loading administrator accounts...</div>
            </div>
          ) : error ? (
            <div className="text-center py-5 text-danger">
              <AlertCircle size={28} className="mb-2" />
              <div className="fw-semibold mb-2">Error loading administrators</div>
              <div className="small text-muted mb-3">{error}</div>
              <button type="button" className="neu-btn neu-btn-outline neu-btn-sm" onClick={loadAdministrators}>
                Retry
              </button>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <ShieldCheck size={32} className="mb-2 text-muted" />
              <div className="fw-semibold">No administrator accounts found</div>
              <div className="small text-muted mt-1">
                {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No accounts match your current filters.'
                  : 'Get started by creating a new Hospital Administrator account.'}
              </div>
            </div>
          ) : (
            <table className="neu-table">
              <thead>
                <tr>
                  <th className="col-admin-user">Administrator</th>
                  <th className="col-admin-role">Role</th>
                  <th className="col-admin-staff">Staff Access</th>
                  <th className="col-admin-status">Status</th>
                  <th className="col-admin-joined">Date Joined</th>
                  <th className="col-admin-actions text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => {
                  const isSelf = staffUser && (staffUser.id === admin.id || staffUser.email === admin.email);
                  const isSuper = admin.role === 'SUPER_ADMIN' || admin.is_superuser;
                  const canToggle = !isSelf && !isSuper;

                  return (
                    <tr key={admin.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="d-flex align-items-center justify-content-center fw-bold"
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '12px',
                              background: 'var(--hospital-surface)',
                              boxShadow: 'var(--neu-inset)',
                              color: isSuper ? 'var(--hospital-blue)' : 'var(--hospital-cyan)',
                              fontSize: '0.85rem',
                              flexShrink: 0
                            }}
                          >
                            {(admin.name || admin.email || 'A').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-semibold" style={{ color: 'var(--hospital-primary-navy)' }}>
                              {admin.name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Administrator'}
                              {isSelf && (
                                <span className="neu-badge neu-badge-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div className="small text-muted">{admin.email}</div>
                            {admin.phone && (
                              <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                {admin.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {admin.role === 'SUPER_ADMIN' ? (
                          <span className="neu-badge neu-badge-primary">
                            Super Administrator
                          </span>
                        ) : (
                          <span className="neu-badge neu-badge-info">
                            Hospital Administrator
                          </span>
                        )}
                      </td>

                      <td>
                        {admin.is_staff ? (
                          <span className="neu-badge neu-badge-success">
                            Staff Enabled
                          </span>
                        ) : (
                          <span className="neu-badge neu-badge-secondary">
                            No Staff Access
                          </span>
                        )}
                      </td>

                      <td>
                        <AdminStatusBadge status={admin.is_active ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      <td className="small text-muted">
                        {admin.date_joined
                          ? new Date(admin.date_joined).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>

                      <td className="text-end">
                        <div className="neu-action-btns">
                          {canToggle ? (
                            <button
                              type="button"
                              className={`neu-btn neu-btn-sm ${admin.is_active ? 'neu-btn-danger' : 'neu-btn-primary'}`}
                              onClick={() => setToggleTarget(admin)}
                              title={admin.is_active ? 'Deactivate account' : 'Activate account'}
                            >
                              <Power size={12} className="me-1" />
                              {admin.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          ) : (
                            <span className="text-muted small fst-italic">
                              {isSelf ? 'Self (Protected)' : 'Super Admin (Protected)'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Administrator Modal */}
      {showAddModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
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
                    Provision New Hospital Administrator
                  </h5>
                  <div className="small text-muted">
                    Create authorized staff credentials with Hospital Administrator RBAC permissions.
                  </div>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  {formErrors.detail && (
                    <div 
                      className="p-3 mb-3 small"
                      style={{ 
                        borderRadius: '12px', 
                        background: 'var(--hospital-surface)', 
                        borderLeft: '4px solid var(--neu-error)',
                        color: 'var(--neu-error)'
                      }}
                    >
                      {formErrors.detail}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        className="neu-input"
                        placeholder="e.g. Dr. Sunita Rao"
                        value={newAdminForm.full_name}
                        onChange={handleFormChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.full_name && (
                        <div className="small text-danger mt-1">{formErrors.full_name}</div>
                      )}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Institutional Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        className="neu-input"
                        placeholder="e.g. sunita.rao@eglesorahospital.org"
                        value={newAdminForm.email}
                        onChange={handleFormChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.email && (
                        <div className="small text-danger mt-1">{formErrors.email}</div>
                      )}
                      <div className="small text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                        Must be a unique email address across the organization.
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="neu-form-label">
                        Phone / Extension Number <span className="text-muted fw-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        className="neu-input"
                        placeholder="e.g. +91 (0) 22 0000 3333"
                        value={newAdminForm.phone}
                        onChange={handleFormChange}
                        disabled={submitting}
                      />
                      {formErrors.phone && (
                        <div className="small text-danger mt-1">{formErrors.phone}</div>
                      )}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Password <span className="text-danger">*</span>
                      </label>
                      <div className="position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          className="neu-input pe-5"
                          placeholder="Minimum 8 characters"
                          value={newAdminForm.password}
                          onChange={handleFormChange}
                          disabled={submitting}
                          required
                          style={{ width: '100%' }}
                        />
                        <button
                          type="button"
                          className="position-absolute border-0 bg-transparent"
                          style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--hospital-text-muted)' }}
                          onClick={() => setShowPassword((p) => !p)}
                          tabIndex="-1"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {formErrors.password && (
                        <div className="small text-danger mt-1">{formErrors.password}</div>
                      )}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Confirm Password <span className="text-danger">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password_confirm"
                        className="neu-input"
                        placeholder="Re-enter password"
                        value={newAdminForm.password_confirm}
                        onChange={handleFormChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.password_confirm && (
                        <div className="small text-danger mt-1">{formErrors.password_confirm}</div>
                      )}
                    </div>
                  </div>

                  <div 
                    className="p-3 neu-card-sm mt-4 small text-muted" 
                    style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                  >
                    <div className="fw-bold mb-1" style={{ color: 'var(--hospital-primary-navy)' }}>
                      Assigned Permissions & Security Verification:
                    </div>
                    <ul className="mb-0 ps-3">
                      <li>Role strictly assigned: <strong>Hospital Administrator (HOSPITAL_ADMIN)</strong>.</li>
                      <li>Django <code>is_staff=True</code> enabled for administrative dashboard functions.</li>
                      <li>Added to <code>Hospital Administrators</code> permission group covering clinical management.</li>
                      <li>Password is hashed on the server using Django PBKDF2 authentication; never stored in plaintext.</li>
                    </ul>
                  </div>
                </div>

                <div 
                  className="modal-footer px-4 py-3 border-top"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline neu-btn-sm"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="neu-btn neu-btn-primary neu-btn-sm"
                    disabled={submitting}
                  >
                    {submitting ? 'Provisioning Account...' : 'Provision Administrator'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {toggleTarget && (
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
              <div 
                className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                  {toggleTarget.is_active ? 'Deactivate Administrator' : 'Activate Administrator'}
                </h5>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setToggleTarget(null)}
                  disabled={toggling}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <p className="mb-2">
                  Are you sure you want to {toggleTarget.is_active ? 'deactivate' : 'activate'} the account for{' '}
                  <strong>{toggleTarget.name || toggleTarget.email}</strong>?
                </p>
                {toggleTarget.is_active ? (
                  <div 
                    className="p-3 mb-0 small text-muted rounded"
                    style={{ background: 'var(--hospital-surface)', borderLeft: '4px solid var(--neu-warning)' }}
                  >
                    Deactivating this account will immediately revoke all login and operational privileges for this administrator.
                  </div>
                ) : (
                  <div 
                    className="p-3 mb-0 small text-muted rounded"
                    style={{ background: 'var(--hospital-surface)', borderLeft: '4px solid var(--neu-success)' }}
                  >
                    Activating this account will restore administrative dashboard access for this user.
                  </div>
                )}
              </div>
              <div 
                className="modal-footer px-4 py-3 border-top"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
                  onClick={() => setToggleTarget(null)}
                  disabled={toggling}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`neu-btn neu-btn-sm ${toggleTarget.is_active ? 'neu-btn-danger' : 'neu-btn-primary'}`}
                  onClick={handleConfirmToggle}
                  disabled={toggling}
                >
                  {toggling
                    ? 'Updating...'
                    : toggleTarget.is_active
                    ? 'Confirm Deactivation'
                    : 'Confirm Activation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAdministratorsPage;
