import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';
import { DEMO_DOCTORS, DEMO_DEPARTMENTS } from '../../data/hospitalData';

/**
 * Hospital Platform — Admin Doctors Management Page (Phase 8 & Persistence Fix)
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
      setDoctorsList(docRes.results);
      setDepartments(deptList);
      if (deptList.length > 0) {
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
        doc.status.toUpperCase() === selectedStatus.toUpperCase() ||
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
      setActionNotice(`Doctor ${doctor.name} status updated to ${updated.status} in PostgreSQL database.`);
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
      setActionNotice(`Doctor profile for ${updated.name} updated in PostgreSQL database.`);
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
      setActionNotice(`Added consultant ${created.name} into PostgreSQL database.`);
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
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <PageHeader
          title="Doctor Directory & Credentialing"
          description="Roster management, clinical privileges, departmental assignments, and status controls."
          breadcrumbs={breadcrumbs}
          className="mb-0"
        />
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
          + Add New Consultant
        </Button>
      </div>

      {/* Action Notice */}
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

      {/* Action Error */}
      {actionError && (
        <div className="alert alert-danger py-2 px-3 mb-3 small d-flex justify-content-between align-items-center">
          <span>{actionError}</span>
          <button
            type="button"
            className="btn-close btn-close-sm"
            onClick={() => setActionError(null)}
          />
        </div>
      )}

      {/* Authentication Required Notice */}
      {isAuthError ? (
        <div className="card shadow-sm border-warning mb-4">
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex p-3 rounded-circle bg-warning bg-opacity-10 text-warning mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="h5 fw-bold text-dark mb-2">Administrative Authentication Required</h3>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '480px' }}>
              Your staff session has expired or requires authorization to retrieve medical staff and credentialing records from the hospital database.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <Link to={`/staff/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="btn btn-primary btn-sm">
                Sign In to Staff Workspace
              </Link>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadData}>
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <AdminFilterBar
            searchPlaceholder="Search by name, specialty, or department..."
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
                className="hospital-form-control"
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
                className="hospital-form-control"
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
          <div className="hospital-card p-0 mb-4 overflow-hidden">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Department & Specialty</th>
                    <th>Qualifications</th>
                    <th>Experience</th>
                    <th>Slot Duration</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No doctor records match the selected search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div className="fw-bold">{doc.name}</div>
                          <div className="small text-muted">{doc.consultation?.location || 'Clinical Suite'}</div>
                        </td>
                        <td>
                          <div className="fw-semibold text-primary">{doc.specialty}</div>
                          <div className="small text-muted">{doc.departmentName}</div>
                        </td>
                        <td>
                          <span className="small text-muted">
                            {Array.isArray(doc.qualification) ? doc.qualification.join(', ') : doc.qualification}
                          </span>
                        </td>
                        <td>
                          <span className="small fw-semibold">{doc.experience} Years</span>
                        </td>
                        <td>
                          <span className="small text-muted">{doc.consultation?.duration || '30 mins'}</span>
                        </td>
                        <td>
                          <AdminStatusBadge status={doc.status} />
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                            onClick={() => setViewDoctor(doc)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                            onClick={() => setEditDoctor(doc)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`hospital-btn hospital-btn-sm ${
                              doc.status === 'Active' ? 'btn-outline-danger' : 'btn-outline-success'
                            }`}
                            onClick={() => handleToggleStatus(doc)}
                          >
                            {doc.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fs-6 fw-bold mb-0">{viewDoctor.name}</h5>
                  <span className="small text-muted">{viewDoctor.departmentName}</span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewDoctor(null)}
                />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border">
                      <div className="small text-muted fw-bold">Specialty</div>
                      <div className="fw-semibold">{viewDoctor.specialty}</div>
                      <div className="small text-muted fw-bold mt-2">Credentials</div>
                      <div className="small">
                        {Array.isArray(viewDoctor.qualification)
                          ? viewDoctor.qualification.join(', ')
                          : viewDoctor.qualification}
                      </div>
                      <div className="small text-muted fw-bold mt-2">Experience</div>
                      <div className="small">{viewDoctor.experience} Years Hospital Practice</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border">
                      <div className="small text-muted fw-bold">OPD Consultation Suite</div>
                      <div className="small">{viewDoctor.consultation?.location}</div>
                      <div className="small text-muted fw-bold mt-2">Clinical Hours</div>
                      <div className="small">
                        {viewDoctor.schedule?.workingDays?.join(', ')} (
                        {viewDoctor.schedule?.workingHours})
                      </div>
                      <div className="small text-muted fw-bold mt-2">Slot Duration</div>
                      <div className="small">{viewDoctor.consultation?.duration}</div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 bg-light rounded border">
                      <div className="small text-muted fw-bold mb-1">Professional Background</div>
                      <p className="small mb-0 text-muted">{viewDoctor.bio}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="hospital-btn hospital-btn-outline hospital-btn-sm"
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSaveEdit}>
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fw-bold">Edit Consultant Profile</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditDoctor(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label">Full Name</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={editDoctor.name}
                      onChange={(e) =>
                        setEditDoctor({ ...editDoctor, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Specialty</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={editDoctor.specialty}
                      onChange={(e) =>
                        setEditDoctor({ ...editDoctor, specialty: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Consultation Location</label>
                    <input
                      type="text"
                      className="hospital-form-control"
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
                    <label className="hospital-form-label">Experience (Years)</label>
                    <input
                      type="number"
                      className="hospital-form-control"
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
                <div className="modal-footer">
                  <button
                    type="button"
                    className="hospital-btn hospital-btn-outline hospital-btn-sm"
                    onClick={() => setEditDoctor(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="hospital-btn hospital-btn-primary hospital-btn-sm">
                    Save Changes
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAddDoctor}>
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fw-bold">Register New Consultant</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAddModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="e.g. Dr. Priya Raman"
                      value={newDoctorForm.name}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">
                      Department <span className="text-danger">*</span>
                    </label>
                    <select
                      className="hospital-form-control"
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
                    <label className="hospital-form-label">
                      Specialty <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="e.g. Pediatric Cardiology"
                      value={newDoctorForm.specialty}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, specialty: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Qualifications (Comma separated)</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="MBBS, MD, DM"
                      value={newDoctorForm.qualification}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, qualification: e.target.value })
                      }
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="hospital-form-label">Experience (Years)</label>
                      <input
                        type="number"
                        className="hospital-form-control"
                        value={newDoctorForm.experience}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, experience: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-6">
                      <label className="hospital-form-label">Consultation Duration</label>
                      <select
                        className="hospital-form-control"
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
                    <label className="hospital-form-label">OPD Suite Location</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="Wing B, Suite 205"
                      value={newDoctorForm.location}
                      onChange={(e) =>
                        setNewDoctorForm({ ...newDoctorForm, location: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="hospital-btn hospital-btn-outline hospital-btn-sm"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="hospital-btn hospital-btn-primary hospital-btn-sm">
                    Add Consultant
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
