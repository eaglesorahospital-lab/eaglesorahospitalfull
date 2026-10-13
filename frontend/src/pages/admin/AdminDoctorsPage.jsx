import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  Stethoscope, 
  Plus, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Eye, 
  Edit3, 
  Power, 
  Building2, 
  Clock, 
  MapPin, 
  Award, 
  Briefcase 
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';
import { DEMO_DEPARTMENTS } from '../../data/hospitalData';

/**
 * Hospital Platform — Admin Doctors Management Page (Neumorphic Redesign)
 * Authoritative directory and credentialing table for medical staff.
 * Persists all create, update, and activate/deactivate mutations into PostgreSQL.
 */
export function AdminDoctorsPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission
  if (currentRole && currentRole.id === 'PATIENT') {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Doctors Management"
        onSwitchRole={setRole}
      />
    );
  }

  // Database state
  const [doctorsList, setDoctorsList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthError, setIsAuthError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals and Alerts state
  const [viewDoctor, setViewDoctor] = useState(null);
  const [editDoctor, setEditDoctor] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  // New Doctor form state
  const [newDoctorForm, setNewDoctorForm] = useState({
    name: '',
    specialty: '',
    departmentId: '',
    qualification: '',
    experience: 10,
    consultationDuration: '30 minutes',
    location: '',
  });

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Doctor Directory & Credentialing' },
  ];

  // Fetch doctors and departments on mount
  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    setIsAuthError(false);
    try {
      const [docRes, deptList] = await Promise.all([
        doctorService.getDoctors(),
        departmentService.getDepartments(),
      ]);
      setDoctorsList(docRes.results || []);
      setDepartments(deptList || []);
      if (deptList && deptList.length > 0) {
        setNewDoctorForm((prev) => ({
          ...prev,
          departmentId: prev.departmentId || String(deptList[0].dbId || deptList[0].id),
        }));
      }
    } catch (err) {
      if (err.status === 401 || err.isAuthError || String(err.message).includes('401') || String(err.message).toLowerCase().includes('unauthorized')) {
        setIsAuthError(true);
        setActionError('Administrative authentication required: Your staff session has expired or is unauthorized. Please sign in to staff portal.');
      } else {
        setActionError(`Failed to load medical staff from database: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctorsList.filter((doc) => {
      const matchSearch =
        searchTerm === '' ||
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.departmentName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept =
        selectedDepartment === 'ALL' ||
        String(doc.departmentId) === String(selectedDepartment) ||
        String(doc.departmentSlug) === String(selectedDepartment);

      const matchStatus =
        selectedStatus === 'ALL' ||
        (doc.status && doc.status.toUpperCase() === selectedStatus.toUpperCase()) ||
        (selectedStatus === 'ACTIVE' && doc.is_active) ||
        (selectedStatus === 'INACTIVE' && !doc.is_active);

      return matchSearch && matchDept && matchStatus;
    });
  }, [doctorsList, searchTerm, selectedDepartment, selectedStatus]);

  // Handle Toggle Active/Inactive with PostgreSQL persistence
  const handleToggleStatus = async (doctor) => {
    setActionError(null);
    setActionNotice(null);
    setIsSubmitting(true);
    try {
      const updated = await doctorService.toggleDoctorStatus(doctor.slug || doctor.id, doctor.is_active);
      setDoctorsList((prev) =>
        prev.map((d) => (d.id === doctor.id ? updated : d))
      );
      setActionNotice(`Doctor ${doctor.name} status updated to ${updated.status} in database.`);
    } catch (err) {
      setActionError(`Failed to update status for ${doctor.name}: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Edit with PostgreSQL persistence
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDoctor) return;
    setActionError(null);
    setActionNotice(null);
    setIsSubmitting(true);

    try {
      const updated = await doctorService.updateDoctor(editDoctor.slug || editDoctor.id, {
        name: editDoctor.name,
        specialty_name: editDoctor.specialty,
        consultation_location: editDoctor.consultation?.location,
        experience_years: editDoctor.experience,
      });
      setDoctorsList((prev) =>
        prev.map((d) => (d.id === editDoctor.id ? updated : d))
      );
      setActionNotice(`Doctor profile for ${updated.name} updated in database.`);
      setEditDoctor(null);
    } catch (err) {
      setActionError(`Failed to save doctor changes: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Doctor with PostgreSQL persistence
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!newDoctorForm.name || !newDoctorForm.specialty) return;
    setActionError(null);
    setActionNotice(null);
    setIsSubmitting(true);

    try {
      const selectedDept = departments.find(
        (d) => String(d.id) === String(newDoctorForm.departmentId) || String(d.dbId) === String(newDoctorForm.departmentId)
      ) || departments[0];

      const durationMinutes = parseInt(newDoctorForm.consultationDuration, 10) || 30;

      const created = await doctorService.createDoctor({
        name: newDoctorForm.name,
        specialty_name: newDoctorForm.specialty,
        department: selectedDept ? (selectedDept.dbId || selectedDept.id) : 1,
        qualification: newDoctorForm.qualification,
        experience_years: Number(newDoctorForm.experience) || 5,
        consultation_duration_minutes: durationMinutes,
        consultation_location: newDoctorForm.location || 'Consultation Suite, Wing A',
        is_active: true,
      });

      setDoctorsList((prev) => [created, ...prev]);
      setActionNotice(`Added consultant ${created.name} into database.`);
      setShowAddModal(false);
      setNewDoctorForm({
        name: '',
        specialty: '',
        departmentId: departments[0]?.dbId || departments[0]?.id || '',
        qualification: '',
        experience: 10,
        consultationDuration: '30 minutes',
        location: '',
      });
    } catch (err) {
      setActionError(`Failed to register doctor in database: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-doctors-view">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <PageHeader
          title="Doctor Directory & Credentialing"
          description="Roster management, clinical privileges, departmental assignments, and status controls."
          breadcrumbs={breadcrumbs}
          className="mb-0"
        />
        <div className="d-flex gap-2">
          <button 
            type="button" 
            className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            Add New Consultant
          </button>
        </div>
      </div>

      {/* Action Notice */}
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

      {/* Action Error */}
      {actionError && (
        <div 
          className="neu-card p-3 mb-4 d-flex justify-content-between align-items-center"
          style={{ 
            borderRadius: '14px', 
            background: 'var(--hospital-surface)',
            borderLeft: '4px solid var(--neu-error)'
          }}
        >
          <div className="d-flex align-items-center gap-2 small">
            <AlertCircle size={16} color="var(--neu-error)" />
            <span style={{ color: 'var(--neu-error)', fontWeight: 600 }}>{actionError}</span>
          </div>
          <button
            type="button"
            className="neu-btn-icon"
            style={{ width: '28px', height: '28px', padding: 0 }}
            onClick={() => setActionError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Authentication Required Notice */}
      {isAuthError ? (
        <div 
          className="neu-card p-5 text-center mb-4" 
          style={{ borderRadius: '24px', background: 'var(--hospital-surface)' }}
        >
          <div 
            className="d-inline-flex p-3 rounded-circle mb-3"
            style={{ background: 'var(--hospital-surface)', boxShadow: 'var(--neu-inset)', color: '#B7791F' }}
          >
            <AlertCircle size={32} />
          </div>
          <h3 className="h5 fw-bold mb-2" style={{ color: 'var(--hospital-primary-navy)' }}>
            Administrative Authentication Required
          </h3>
          <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '480px' }}>
            Your staff session has expired or requires authorization to retrieve medical staff and credentialing records from the hospital database.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <Link to={`/staff/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="neu-btn neu-btn-primary neu-btn-sm">
              Sign In to Staff Workspace
            </Link>
            <button type="button" className="neu-btn neu-btn-outline neu-btn-sm" onClick={loadData}>
              Retry Connection
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <AdminFilterBar
            searchPlaceholder="Search by doctor name, specialty, or department..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            hasActiveFilters={searchTerm !== '' || selectedDepartment !== 'ALL' || selectedStatus !== 'ALL'}
            onClear={() => {
              setSearchTerm('');
              setSelectedDepartment('ALL');
              setSelectedStatus('ALL');
            }}
          >
            <div className="col-12 col-sm-6 col-md-3">
              <select
                className="neu-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="ALL">All Departments</option>
                {(departments.length > 0 ? departments : DEMO_DEPARTMENTS).map((dept) => (
                  <option key={dept.slug || dept.id} value={dept.slug || dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <select
                className="neu-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </AdminFilterBar>

          {/* Doctors Table */}
          <div 
            className="neu-card p-0 mb-4 overflow-hidden" 
            style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
          >
            <div className="neu-table-container">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th className="col-doctor">Doctor</th>
                    <th className="col-specialty">Department & Specialty</th>
                    <th className="col-qualification">Qualifications</th>
                    <th className="col-experience">Experience</th>
                    <th className="col-slot-duration">Slot Duration</th>
                    <th className="col-status">Status</th>
                    <th className="col-actions text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <RotateCw size={24} className="spin-anim mb-2 text-primary" />
                        <div>Loading doctor directory...</div>
                      </td>
                    </tr>
                  ) : filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <AlertCircle size={28} className="mb-2 text-muted" />
                        <div className="fw-semibold">No doctor records match the selected criteria.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <tr key={doc.id}>
                        <td className="col-doctor">
                          <div className="d-flex align-items-center gap-3">
                            <div 
                              className="d-flex align-items-center justify-content-center"
                              style={{ 
                                width: '42px', 
                                height: '42px', 
                                borderRadius: '12px', 
                                background: 'var(--hospital-surface)', 
                                boxShadow: 'var(--neu-inset)', 
                                color: 'var(--hospital-medical-blue)',
                                flexShrink: 0
                              }}
                            >
                              <Stethoscope size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="fw-bold fs-6 text-truncate" style={{ color: 'var(--hospital-primary-navy)' }}>
                                {doc.name}
                              </div>
                              <div className="small text-muted d-flex align-items-center gap-1 mt-1">
                                <MapPin size={13} className="flex-shrink-0 text-muted" />
                                <span className="text-truncate">{doc.consultation?.location || 'Clinical Suite, Wing A'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="col-specialty">
                          <div className="fw-semibold text-primary mb-1">{doc.specialty}</div>
                          <div className="small text-muted d-flex align-items-center gap-1">
                            <Building2 size={13} className="flex-shrink-0 text-muted" />
                            <span>{doc.departmentName}</span>
                          </div>
                        </td>
                        <td className="col-qualification">
                          <span className="small text-body d-block lh-base" style={{ maxWidth: '240px' }}>
                            {Array.isArray(doc.qualification) ? doc.qualification.join(', ') : doc.qualification}
                          </span>
                        </td>
                        <td className="col-experience">
                          <span className="neu-badge neu-badge-neutral fw-bold">
                            {doc.experience} Years
                          </span>
                        </td>
                        <td className="col-slot-duration">
                          <span className="small text-muted d-flex align-items-center gap-1">
                            <Clock size={13} className="flex-shrink-0 text-muted" />
                            <span>{doc.consultation?.duration || '30 mins'}</span>
                          </span>
                        </td>
                        <td className="col-status">
                          <AdminStatusBadge status={doc.status} />
                        </td>
                        <td className="col-actions text-end text-nowrap">
                          <div className="neu-action-btns">
                            <button
                              type="button"
                              className="neu-btn neu-btn-outline neu-btn-sm"
                              onClick={() => setViewDoctor(doc)}
                              title="View credentials & clinical profile"
                            >
                              <Eye size={13} className="me-1" />
                              Details
                            </button>
                            <button
                              type="button"
                              className="neu-btn neu-btn-outline neu-btn-sm"
                              onClick={() => setEditDoctor(doc)}
                              title="Edit profile & consultation location"
                            >
                              <Edit3 size={13} className="me-1" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`neu-btn neu-btn-sm ${
                                doc.status === 'Active' || doc.is_active ? 'neu-btn-danger' : 'neu-btn-primary'
                              }`}
                              onClick={() => handleToggleStatus(doc)}
                              disabled={isSubmitting}
                              title={doc.status === 'Active' ? 'Deactivate consultant' : 'Activate consultant'}
                            >
                              <Power size={13} className="me-1" />
                              {doc.status === 'Active' || doc.is_active ? 'Deactivate' : 'Activate'}
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
        </>
      )}

      {/* View Doctor Details Modal */}
      {viewDoctor && (
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
                    {viewDoctor.name}
                  </h5>
                  <span className="small text-muted">{viewDoctor.departmentName}</span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setViewDoctor(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold text-uppercase mb-2">Specialty & Credentials</div>
                      <div className="fw-semibold text-primary">{viewDoctor.specialty}</div>
                      <div className="small text-muted fw-bold mt-3">Qualifications</div>
                      <div className="small">
                        {Array.isArray(viewDoctor.qualification)
                          ? viewDoctor.qualification.join(', ')
                          : viewDoctor.qualification}
                      </div>
                      <div className="small text-muted fw-bold mt-3">Experience</div>
                      <div className="small">{viewDoctor.experience} Years Hospital Practice</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold text-uppercase mb-2">OPD Consultation Suite</div>
                      <div className="small">{viewDoctor.consultation?.location || 'Clinical Suite'}</div>
                      <div className="small text-muted fw-bold mt-3">Clinical Hours</div>
                      <div className="small">
                        {viewDoctor.schedule?.workingDays?.join(', ') || 'Mon - Fri'} (
                        {viewDoctor.schedule?.workingHours || '09:00 - 17:00'})
                      </div>
                      <div className="small text-muted fw-bold mt-3">Slot Duration</div>
                      <div className="small">{viewDoctor.consultation?.duration || '30 mins'}</div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div 
                      className="p-3 neu-card-sm" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold mb-1 text-uppercase">Professional Background</div>
                      <p className="small mb-0 text-muted">{viewDoctor.bio || 'Consultant in active clinical practice at EagleSora Hospital.'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div 
                className="modal-footer px-4 py-3 border-top"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
                  onClick={() => setViewDoctor(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {editDoctor && (
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
              <form onSubmit={handleSaveEdit}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Edit Consultant Profile
                  </h5>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setEditDoctor(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  <div className="mb-3">
                    <label className="neu-form-label">Full Name</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editDoctor.name}
                      onChange={(e) =>
                        setEditDoctor({ ...editDoctor, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Specialty</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editDoctor.specialty}
                      onChange={(e) =>
                        setEditDoctor({ ...editDoctor, specialty: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Consultation Location</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editDoctor.consultation?.location || ''}
                      onChange={(e) =>
                        setEditDoctor({
                          ...editDoctor,
                          consultation: {
                            ...editDoctor.consultation,
                            location: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Experience (Years)</label>
                    <input
                      type="number"
                      className="neu-input"
                      value={editDoctor.experience}
                      onChange={(e) =>
                        setEditDoctor({
                          ...editDoctor,
                          experience: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div 
                  className="modal-footer px-4 py-3 border-top"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <button
                    type="button"
                    className="neu-btn neu-btn-outline neu-btn-sm"
                    onClick={() => setEditDoctor(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add New Doctor Modal */}
      {showAddModal && (
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
              <form onSubmit={handleAddDoctor}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Register New Consultant
                  </h5>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setShowAddModal(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  <div className="mb-3">
                    <label className="neu-form-label">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="e.g. Dr. Priya Raman"
                      value={newDoctorForm.name}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">
                      Department <span className="text-danger">*</span>
                    </label>
                    <select
                      className="neu-select"
                      value={newDoctorForm.departmentId}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, departmentId: e.target.value })
                      }
                    >
                      {(departments.length > 0 ? departments : DEMO_DEPARTMENTS).map((dept) => (
                        <option key={dept.dbId || dept.id} value={dept.dbId || dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">
                      Specialty <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="e.g. Pediatric Cardiology"
                      value={newDoctorForm.specialty}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, specialty: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Qualifications (Comma separated)</label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="MBBS, MD, DM"
                      value={newDoctorForm.qualification}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, qualification: e.target.value })
                      }
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="neu-form-label">Experience (Years)</label>
                      <input
                        type="number"
                        className="neu-input"
                        value={newDoctorForm.experience}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, experience: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-6">
                      <label className="neu-form-label">Consultation Duration</label>
                      <select
                        className="neu-select"
                        value={newDoctorForm.consultationDuration}
                        onChange={(e) =>
                          setNewDoctorForm({
                            ...newDoctorForm,
                            consultationDuration: e.target.value,
                          })
                        }
                      >
                        <option value="15 minutes">15 minutes</option>
                        <option value="30 minutes">30 minutes</option>
                        <option value="45 minutes">45 minutes</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">OPD Suite Location</label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="Wing B, Suite 205"
                      value={newDoctorForm.location}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, location: e.target.value })
                      }
                    />
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
                  >
                    Cancel
                  </button>
                  <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering...' : 'Add Consultant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDoctorsPage;
