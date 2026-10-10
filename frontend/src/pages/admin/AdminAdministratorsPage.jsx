import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import adminService from '../../services/adminService';
import authService from '../../services/authService';

/**
 * Hospital Platform — Hospital Administrator Account Management Page
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
      setAdministrators(data);
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
    <div className="hospital-admin-administrators-page">
      {/* Header */}
      <PageHeader
        title="Hospital Administrators"
        subtitle="Manage authorized Hospital Administrator accounts, RBAC permissions, and access credentials."
        breadcrumbs={breadcrumbs}
        action={
          <Button
            variant="primary"
            onClick={() => {
              setFormErrors({});
              setShowAddModal(true);
            }}
          >
            + Create Administrator
          </Button>
        }
      />

      {/* Security Governance Notice */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
        <div className="card-body p-3 d-flex align-items-center gap-3">
          <div className="badge bg-primary rounded-circle p-2 fs-6">
            <span role="img" aria-label="Security">🛡️</span>
          </div>
          <div className="small text-muted flex-grow-1">
            <strong>Security Policy:</strong> Only authorized Super Administrators can provision or deactivate
            administrator accounts. Newly created administrators receive the <code>HOSPITAL_ADMIN</code> role,
            the <code>is_staff</code> flag, and model permissions through the <code>Hospital Administrators</code> group.
            All passwords are cryptographically hashed using PBKDF2 SHA256 and are never stored in plaintext.
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {actionNotice && (
        <div
          className={`alert alert-${actionNotice.type} alert-dismissible fade show d-flex justify-content-between align-items-center mb-4`}
          role="alert"
        >
          <span>{actionNotice.message}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setActionNotice(null)}
            aria-label="Close"
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select"
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
                className="form-select"
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
                className="btn btn-outline-secondary w-100"
                onClick={loadAdministrators}
                title="Refresh list"
              >
                🔄
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
              <div>Loading administrator accounts...</div>
            </div>
          ) : error ? (
            <div className="text-center py-5 text-danger">
              <div className="fw-semibold mb-2">Error loading administrators</div>
              <div className="small text-muted mb-3">{error}</div>
              <Button variant="outline" size="sm" onClick={loadAdministrators}>
                Retry
              </Button>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div className="fs-3 mb-2">👥</div>
              <div className="fw-semibold">No administrator accounts found</div>
              <div className="small text-muted">
                {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No accounts match your current filters.'
                  : 'Get started by creating a new Hospital Administrator account.'}
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th scope="col" className="ps-4">Administrator</th>
                    <th scope="col">Role</th>
                    <th scope="col">Staff Access</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date Joined</th>
                    <th scope="col" className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => {
                    const isSelf = staffUser && (staffUser.id === admin.id || staffUser.email === admin.email);
                    const isSuper = admin.role === 'SUPER_ADMIN' || admin.is_superuser;
                    const canToggle = !isSelf && !isSuper;

                    return (
                      <tr key={admin.id}>
                        {/* Name & Email */}
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                              style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: isSuper ? '#6f42c1' : '#0d6efd',
                                fontSize: '0.85rem',
                              }}
                            >
                              {(admin.name || admin.email || 'A').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-semibold text-dark">
                                {admin.name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Administrator'}
                                {isSelf && (
                                  <span className="badge bg-secondary ms-2 small" style={{ fontSize: '0.65rem' }}>
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="small text-muted">{admin.email}</div>
                              {admin.phone && (
                                <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                  📞 {admin.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          {admin.role === 'SUPER_ADMIN' ? (
                            <span className="badge bg-purple text-white px-2 py-1" style={{ backgroundColor: '#6f42c1' }}>
                              Super Administrator
                            </span>
                          ) : (
                            <span className="badge bg-primary px-2 py-1">
                              Hospital Administrator
                            </span>
                          )}
                        </td>

                        {/* Staff Access */}
                        <td>
                          {admin.is_staff ? (
                            <span className="badge bg-info text-dark px-2 py-1">
                              Staff Enabled
                            </span>
                          ) : (
                            <span className="badge bg-secondary px-2 py-1">
                              No Staff Access
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <AdminStatusBadge status={admin.is_active ? 'ACTIVE' : 'INACTIVE'} />
                        </td>

                        {/* Date Joined */}
                        <td className="small text-muted">
                          {admin.date_joined
                            ? new Date(admin.date_joined).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>

                        {/* Actions */}
                        <td className="text-end pe-4">
                          {canToggle ? (
                            <button
                              type="button"
                              className={`btn btn-sm ${admin.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                              onClick={() => setToggleTarget(admin)}
                              title={admin.is_active ? 'Deactivate account' : 'Activate account'}
                            >
                              {admin.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          ) : (
                            <span className="text-muted small fst-italic">
                              {isSelf ? 'Self (Protected)' : 'Super Admin (Protected)'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Administrator Modal */}
      {showAddModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title fw-bold">Provision New Hospital Administrator</h5>
                  <div className="small text-muted">
                    Create authorized staff credentials with Hospital Administrator RBAC permissions.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                  aria-label="Close"
                  disabled={submitting}
                />
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body p-4">
                  {/* General / Non-field Errors */}
                  {formErrors.detail && (
                    <div className="alert alert-danger mb-3 py-2 small">
                      {formErrors.detail}
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Full Name */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        className={`form-control ${formErrors.full_name ? 'is-invalid' : ''}`}
                        placeholder="e.g. Dr. Sunita Rao"
                        value={newAdminForm.full_name}
                        onChange={handleFormChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.full_name && (
                        <div className="invalid-feedback">{formErrors.full_name}</div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">
                        Institutional Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                        placeholder="e.g. sunita.rao@eglesorahospital.org"
                        value={newAdminForm.email}
                        onChange={handleFormChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.email && (
                        <div className="invalid-feedback">{formErrors.email}</div>
                      )}
                      <div className="form-text" style={{ fontSize: '0.75rem' }}>
                        Must be a unique email address across the organization.
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small">
                        Phone / Extension Number <span className="text-muted fw-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`}
                        placeholder="e.g. +91 (0) 22 0000 3333"
                        value={newAdminForm.phone}
                        onChange={handleFormChange}
                        disabled={submitting}
                      />
                      {formErrors.phone && (
                        <div className="invalid-feedback">{formErrors.phone}</div>
                      )}
                    </div>

                    {/* Temporary Password */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">
                        Password <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                          placeholder="Minimum 8 characters"
                          value={newAdminForm.password}
                          onChange={handleFormChange}
                          disabled={submitting}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPassword((p) => !p)}
                          title={showPassword ? 'Hide password' : 'Show password'}
                          tabIndex="-1"
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                        {formErrors.password && (
                          <div className="invalid-feedback">{formErrors.password}</div>
                        )}
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">
                        Confirm Password <span className="text-danger">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password_confirm"
                        className={`form-control ${formErrors.password_confirm ? 'is-invalid' : ''}`}
                        placeholder="Re-enter password"
                        value={newAdminForm.password_confirm}
                        onChange={handleFormChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.password_confirm && (
                        <div className="invalid-feedback">{formErrors.password_confirm}</div>
                      )}
                    </div>
                  </div>

                  {/* RBAC Permission Guarantee Info */}
                  <div className="p-3 bg-light rounded border mt-4 small text-muted">
                    <div className="fw-bold text-dark mb-1">Assigned Permissions & Security Verification:</div>
                    <ul className="mb-0 ps-3">
                      <li>Role strictly assigned: <strong>Hospital Administrator (HOSPITAL_ADMIN)</strong>.</li>
                      <li>Django <code>is_staff=True</code> enabled for administrative dashboard functions.</li>
                      <li>Added to <code>Hospital Administrators</code> permission group covering doctors, appointments, departments, and scheduling.</li>
                      <li>Password is hashed on the server using Django PBKDF2 authentication; never stored in plaintext.</li>
                    </ul>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Provisioning Account...' : 'Provision Administrator'}
                  </Button>
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {toggleTarget.is_active ? 'Deactivate Administrator' : 'Activate Administrator'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setToggleTarget(null)}
                  disabled={toggling}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body py-3">
                <p className="mb-2">
                  Are you sure you want to {toggleTarget.is_active ? 'deactivate' : 'activate'} the account for{' '}
                  <strong>{toggleTarget.name || toggleTarget.email}</strong>?
                </p>
                {toggleTarget.is_active ? (
                  <div className="alert alert-warning py-2 mb-0 small">
                    Deactivating this account will immediately revoke all login and operational privileges for this administrator.
                  </div>
                ) : (
                  <div className="alert alert-info py-2 mb-0 small">
                    Activating this account will restore administrative dashboard access for this user.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <Button
                  variant="outline"
                  onClick={() => setToggleTarget(null)}
                  disabled={toggling}
                >
                  Cancel
                </Button>
                <Button
                  variant={toggleTarget.is_active ? 'danger' : 'primary'}
                  onClick={handleConfirmToggle}
                  disabled={toggling}
                >
                  {toggling
                    ? 'Updating...'
                    : toggleTarget.is_active
                    ? 'Confirm Deactivation'
                    : 'Confirm Activation'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAdministratorsPage;
