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
  Briefcase,
  Upload,
  Copy,
  Check,
  Key,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Image as ImageIcon
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

  // Initial form state
  const initialNewDoctorState = {
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    specialty: '',
    qualification: '',
    registrationNumber: '',
    experience: 5,
    consultationDuration: '30 minutes',
    location: '',
    bio: '',
    expertise: '',
    isActive: true,
  };

  // New Doctor form state
  const [newDoctorForm, setNewDoctorForm] = useState(initialNewDoctorState);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

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

  // Handle profile photo selection and client-side validation
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        photo: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        photo: 'Photo size exceeds limit. Please upload an image under 5MB.',
      }));
      return;
    }

    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated.photo;
      return updated;
    });

    setPhotoFile(file);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleClearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated.photo;
      return updated;
    });
  };

  const handleCopy = (key, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const validateForm = () => {
    const errors = {};
    if (!newDoctorForm.name.trim()) errors.name = 'Full name is required.';
    if (!photoFile) errors.photo = 'Profile photo upload is required.';

    if (!newDoctorForm.email.trim()) {
      errors.email = 'Email address is required for consultant account.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newDoctorForm.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!newDoctorForm.phone.trim()) {
      errors.phone = 'Mobile contact number is required.';
    } else if (!/^[0-9+() -]{7,20}$/.test(newDoctorForm.phone.trim())) {
      errors.phone = 'Please provide a valid mobile number (at least 7 digits).';
    }

    if (!newDoctorForm.departmentId) errors.departmentId = 'Department selection is required.';
    if (!newDoctorForm.specialty.trim()) errors.specialty = 'Specialty is required.';
    if (!newDoctorForm.qualification.trim()) errors.qualification = 'Qualifications are required.';

    if (newDoctorForm.experience === '' || isNaN(newDoctorForm.experience) || Number(newDoctorForm.experience) < 0) {
      errors.experience = 'Experience must be 0 years or greater.';
    }

    if (!newDoctorForm.consultationDuration) errors.consultationDuration = 'Consultation duration is required.';
    if (!newDoctorForm.location.trim()) errors.location = 'OPD suite / clinical location is required.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Add Doctor with atomic user creation & PostgreSQL persistence
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setActionError(null);
    setActionNotice(null);
    setIsSubmitting(true);

    try {
      const selectedDept = departments.find(
        (d) => String(d.id) === String(newDoctorForm.departmentId) || String(d.dbId) === String(newDoctorForm.departmentId)
      ) || departments[0];

      const durationMinutes = parseInt(newDoctorForm.consultationDuration, 10) || 30;

      const formData = new FormData();
      formData.append('name', newDoctorForm.name.trim());
      formData.append('email', newDoctorForm.email.trim());
      formData.append('phone', newDoctorForm.phone.trim());
      formData.append('department', selectedDept ? (selectedDept.dbId || selectedDept.id) : 1);
      formData.append('specialty_name', newDoctorForm.specialty.trim());
      formData.append('qualification', newDoctorForm.qualification.trim());
      if (newDoctorForm.registrationNumber?.trim()) {
        formData.append('registration_number', newDoctorForm.registrationNumber.trim());
      }
      formData.append('experience_years', Number(newDoctorForm.experience) || 0);
      formData.append('consultation_duration_minutes', durationMinutes);
      formData.append('consultation_location', newDoctorForm.location.trim());
      formData.append('bio', newDoctorForm.bio.trim() || `Consultant ${newDoctorForm.specialty.trim()} specialist at EgleSora Hospital.`);
      if (newDoctorForm.expertise.trim()) {
        formData.append('expertise', newDoctorForm.expertise.trim());
      }
      formData.append('is_active', String(newDoctorForm.isActive !== false));
      if (photoFile) {
        formData.append('image', photoFile);
      }

      const res = await doctorService.createDoctor(formData);
      const createdDoctor = res.doctor || res;
      const creds = res.credentials;

      setDoctorsList((prev) => [createdDoctor, ...prev]);
      setActionNotice(`Successfully registered consultant ${createdDoctor.name} and provisioned account.`);
      setShowAddModal(false);

      // Reset form state
      setNewDoctorForm({
        ...initialNewDoctorState,
        departmentId: departments[0]?.dbId || departments[0]?.id || '',
      });
      handleClearPhoto();
      setFieldErrors({});

      // Open credentials modal
      if (creds) {
        setCreatedCredentials({
          doctor: createdDoctor,
          ...creds,
        });
      }
    } catch (err) {
      if (err.data && typeof err.data === 'object') {
        const serverErrors = {};
        let generalMsg = '';
        Object.entries(err.data).forEach(([k, v]) => {
          const msg = Array.isArray(v) ? v.join(' ') : String(v);
          if (k === 'email') serverErrors.email = msg;
          else if (k === 'phone') serverErrors.phone = msg;
          else if (k === 'name') serverErrors.name = msg;
          else if (k === 'image' || k === 'photo') serverErrors.photo = msg;
          else generalMsg += `${k}: ${msg} `;
        });
        if (Object.keys(serverErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...serverErrors }));
        }
        setActionError(generalMsg || err.message || 'Failed to register consultant.');
      } else {
        setActionError(`Failed to register consultant in database: ${err.message}`);
      }
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
                            {doc.photo || doc.photo_url || doc.image_url ? (
                              <img 
                                src={doc.photo || doc.photo_url || doc.image_url} 
                                alt={doc.name}
                                style={{ 
                                  width: '42px', 
                                  height: '42px', 
                                  borderRadius: '12px', 
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                  boxShadow: 'var(--neu-shadow-sm)'
                                }} 
                              />
                            ) : (
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
                            )}
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
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div 
              className="modal-content neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--hospital-border)' }}
            >
              <form onSubmit={handleAddDoctor} noValidate>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--hospital-surface)',
                        boxShadow: 'var(--neu-inset)',
                        color: 'var(--hospital-medical-blue)',
                      }}
                    >
                      <Stethoscope size={18} />
                    </div>
                    <div>
                      <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                        Register New Consultant
                      </h5>
                      <span className="small text-muted">Provisions staff profile and auto-creates doctor user account</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)', maxHeight: '75vh', overflowY: 'auto' }}>
                  {/* Photo Upload Section */}
                  <div className="mb-4">
                    <label className="neu-form-label mb-2 d-flex justify-content-between align-items-center">
                      <span>Profile Photo <span className="text-danger">*</span></span>
                      <span className="small text-muted font-monospace">JPEG, PNG, WebP (Max 5MB)</span>
                    </label>

                    {photoPreview ? (
                      <div 
                        className="d-flex align-items-center justify-content-between p-3 neu-card-sm"
                        style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '16px',
                              objectFit: 'cover',
                              boxShadow: 'var(--neu-shadow-sm)',
                            }}
                          />
                          <div>
                            <div className="fw-semibold small text-truncate" style={{ maxWidth: '280px' }}>
                              {photoFile?.name}
                            </div>
                            <div className="small text-muted">
                              {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : ''}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm text-danger"
                          onClick={handleClearPhoto}
                        >
                          <X size={14} className="me-1" />
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor="doctor-photo-upload"
                          className="d-flex flex-column align-items-center justify-content-center p-4 w-100 text-center"
                          style={{
                            border: `2px dashed ${fieldErrors.photo ? 'var(--neu-error)' : 'var(--hospital-border)'}`,
                            borderRadius: '16px',
                            cursor: 'pointer',
                            background: 'var(--hospital-surface)',
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <div 
                            className="d-flex align-items-center justify-content-center mb-2"
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: 'var(--hospital-surface)',
                              boxShadow: 'var(--neu-inset)',
                              color: 'var(--hospital-medical-blue)',
                            }}
                          >
                            <Upload size={20} />
                          </div>
                          <span className="fw-semibold small" style={{ color: 'var(--hospital-primary-navy)' }}>
                            Click to select consultant headshot
                          </span>
                          <span className="small text-muted mt-1">
                            High resolution photo for public directory & portal
                          </span>
                        </label>
                        <input
                          id="doctor-photo-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoChange}
                          className="d-none"
                        />
                      </div>
                    )}
                    {fieldErrors.photo && (
                      <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                        <AlertCircle size={13} />
                        <span>{fieldErrors.photo}</span>
                      </div>
                    )}
                  </div>

                  {/* Form Grid */}
                  <div className="row g-3">
                    {/* Full Name */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="neu-input"
                        placeholder="e.g. Dr. Sunita Deshmukh"
                        value={newDoctorForm.name}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, name: e.target.value })
                        }
                        style={fieldErrors.name ? { borderColor: 'var(--neu-error)' } : {}}
                      />
                      {fieldErrors.name && (
                        <div className="text-danger small mt-1">{fieldErrors.name}</div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="neu-input"
                        placeholder="e.g. s.deshmukh@eglesora.com"
                        value={newDoctorForm.email}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, email: e.target.value })
                        }
                        style={fieldErrors.email ? { borderColor: 'var(--neu-error)' } : {}}
                      />
                      {fieldErrors.email ? (
                        <div className="text-danger small mt-1">{fieldErrors.email}</div>
                      ) : (
                        <div className="small text-muted mt-1">Used for portal login and password setup</div>
                      )}
                    </div>

                    {/* Mobile Phone */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Mobile Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="neu-input"
                        placeholder="e.g. +91 98234 56789"
                        value={newDoctorForm.phone}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, phone: e.target.value })
                        }
                        style={fieldErrors.phone ? { borderColor: 'var(--neu-error)' } : {}}
                      />
                      {fieldErrors.phone && (
                        <div className="text-danger small mt-1">{fieldErrors.phone}</div>
                      )}
                    </div>

                    {/* Department */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Department <span className="text-danger">*</span>
                      </label>
                      <select
                        className="neu-select"
                        value={newDoctorForm.departmentId}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, departmentId: e.target.value })
                        }
                        style={fieldErrors.departmentId ? { borderColor: 'var(--neu-error)' } : {}}
                      >
                        {(departments.length > 0 ? departments : DEMO_DEPARTMENTS).map((dept) => (
                          <option key={dept.dbId || dept.id} value={dept.dbId || dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.departmentId && (
                        <div className="text-danger small mt-1">{fieldErrors.departmentId}</div>
                      )}
                    </div>

                    {/* Specialty */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Specialty <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="neu-input"
                        placeholder="e.g. Interventional Cardiology"
                        value={newDoctorForm.specialty}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, specialty: e.target.value })
                        }
                        style={fieldErrors.specialty ? { borderColor: 'var(--neu-error)' } : {}}
                      />
                      {fieldErrors.specialty && (
                        <div className="text-danger small mt-1">{fieldErrors.specialty}</div>
                      )}
                    </div>

                    {/* Qualifications */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Qualifications <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="neu-input"
                        placeholder="MBBS, MD (Medicine), DM (Cardiology)"
                        value={newDoctorForm.qualification}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, qualification: e.target.value })
                        }
                        style={fieldErrors.qualification ? { borderColor: 'var(--neu-error)' } : {}}
                      />
                      {fieldErrors.qualification && (
                        <div className="text-danger small mt-1">{fieldErrors.qualification}</div>
                      )}
                    </div>

                    {/* Years of Experience */}
                    <div className="col-12 col-md-4">
                      <label className="neu-form-label">
                        Experience (Years) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="neu-input"
                        value={newDoctorForm.experience}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, experience: e.target.value })
                        }
                        style={fieldErrors.experience ? { borderColor: 'var(--neu-error)' } : {}}
                      />
                      {fieldErrors.experience && (
                        <div className="text-danger small mt-1">{fieldErrors.experience}</div>
                      )}
                    </div>

                    {/* Consultation Duration */}
                    <div className="col-12 col-md-4">
                      <label className="neu-form-label">
                        Slot Duration <span className="text-danger">*</span>
                      </label>
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
                        <option value="60 minutes">60 minutes</option>
                      </select>
                    </div>

                    {/* OPD Suite / Location */}
                    <div className="col-12 col-md-4">
                      <label className="neu-form-label">
                        OPD Suite Location <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="neu-input"
                        placeholder="Suite 302, Wing B"
                        value={newDoctorForm.location}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, location: e.target.value })
                        }
                        style={fieldErrors.location ? { borderColor: 'var(--neu-error)' } : {}}
                      />
                      {fieldErrors.location && (
                        <div className="text-danger small mt-1">{fieldErrors.location}</div>
                      )}
                    </div>

                    {/* Account Status */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Account Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="neu-select"
                        value={newDoctorForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                        onChange={(e) =>
                          setNewDoctorForm({
                            ...newDoctorForm,
                            isActive: e.target.value === 'ACTIVE',
                          })
                        }
                      >
                        <option value="ACTIVE">Active (Clinical Privileges Granted)</option>
                        <option value="INACTIVE">Inactive (Account Pending / On Hold)</option>
                      </select>
                      <div className="small text-muted mt-1">Controls immediate public booking visibility</div>
                    </div>

                    {/* Professional Registration Number (Optional) */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Medical Council Reg. Number (Optional)
                      </label>
                      <input
                        type="text"
                        className="neu-input"
                        placeholder="e.g. MCI-2018-987654 / MMC-43210"
                        value={newDoctorForm.registrationNumber}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, registrationNumber: e.target.value })
                        }
                      />
                      <div className="small text-muted mt-1">Medical license or council credential ID</div>
                    </div>

                    {/* Clinical Expertise */}
                    <div className="col-12 col-md-6">
                      <label className="neu-form-label">
                        Clinical Expertise (Optional, Comma separated)
                      </label>
                      <input
                        type="text"
                        className="neu-input"
                        placeholder="e.g. Coronary Angioplasty, Pacemaker Implantation"
                        value={newDoctorForm.expertise}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, expertise: e.target.value })
                        }
                      />
                    </div>

                    {/* Professional Bio */}
                    <div className="col-12">
                      <label className="neu-form-label">Professional Background & Biography (Optional)</label>
                      <textarea
                        className="neu-input"
                        rows="3"
                        placeholder="Consultant background, training, fellowship, and academic honors..."
                        value={newDoctorForm.bio}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, bio: e.target.value })
                        }
                      />
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
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="neu-btn neu-btn-primary neu-btn-sm d-inline-flex align-items-center gap-2" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw size={14} className="spin-anim" />
                        Provisioning Doctor Account...
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        Register Consultant
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials & One-Time Password Setup Modal */}
      {createdCredentials && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.75)', backdropFilter: 'blur(5px)' }}
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
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(56, 161, 105, 0.1)',
                      color: 'var(--neu-success)',
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                      Consultant Account Provisioned & Credentials Generated
                    </h5>
                    <span className="small text-muted">Secure one-time staff credential delivery</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setCreatedCredentials(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                {/* Profile info notice */}
                <div 
                  className="p-3 neu-card-sm mb-4 d-flex align-items-center gap-3"
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  {createdCredentials.doctor?.photo || createdCredentials.doctor?.photo_url ? (
                    <img
                      src={createdCredentials.doctor?.photo || createdCredentials.doctor?.photo_url}
                      alt={createdCredentials.doctor?.name}
                      style={{ width: '52px', height: '52px', borderRadius: '14px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'var(--hospital-surface)',
                        boxShadow: 'var(--neu-inset)',
                        color: 'var(--hospital-medical-blue)',
                      }}
                    >
                      <Stethoscope size={24} />
                    </div>
                  )}
                  <div>
                    <div className="fw-bold fs-6" style={{ color: 'var(--hospital-primary-navy)' }}>
                      {createdCredentials.doctor?.name}
                    </div>
                    <div className="small text-muted">
                      {createdCredentials.doctor?.specialty} • {createdCredentials.doctor?.departmentName}
                    </div>
                    <div className="small text-success fw-semibold mt-1">
                      Role Assigned: DOCTOR_STAFF (Active Clinical Privileges)
                    </div>
                  </div>
                </div>

                {/* Password change security warning */}
                <div 
                  className="p-3 mb-4 d-flex align-items-start gap-2"
                  style={{ 
                    borderRadius: '14px', 
                    background: 'rgba(221, 107, 32, 0.08)',
                    border: '1px solid rgba(221, 107, 32, 0.25)',
                    color: '#C05621'
                  }}
                >
                  <ShieldAlert size={18} className="flex-shrink-0 mt-1" />
                  <div className="small">
                    <strong>Mandatory First-Login Password Change Active:</strong> The consultant's account has been flagged with an enforced password change requirement. The doctor cannot access protected clinical appointments or scheduling until they set a permanent password.
                  </div>
                </div>

                {/* Credential Cards */}
                <div className="row g-3 mb-3">
                  {/* Login Username / Email */}
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100"
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold text-uppercase mb-1">Doctor Portal Username</div>
                      <div className="d-flex align-items-center justify-content-between mt-2">
                        <span className="font-monospace fw-semibold small text-truncate">
                          {createdCredentials.email || createdCredentials.username}
                        </span>
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => handleCopy('username', createdCredentials.email || createdCredentials.username)}
                          title="Copy username"
                        >
                          {copiedKey === 'username' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Temporary Password */}
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100"
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold text-uppercase mb-1">Temporary Initial Password</div>
                      <div className="d-flex align-items-center justify-content-between mt-2">
                        <span className="font-monospace fw-bold small text-primary">
                          {createdCredentials.temporary_password}
                        </span>
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => handleCopy('tempPassword', createdCredentials.temporary_password)}
                          title="Copy temporary password"
                        >
                          {copiedKey === 'tempPassword' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expiring Setup URL */}
                  <div className="col-12">
                    <div 
                      className="p-3 neu-card-sm"
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="small text-muted fw-bold text-uppercase">
                          One-Time Password Setup Link (Expiring)
                        </div>
                        <span className="neu-badge neu-badge-neutral small">Expiring Token</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <input
                          type="text"
                          readOnly
                          className="neu-input font-monospace small"
                          value={createdCredentials.setup_url || `${window.location.origin}/staff/set-password`}
                          style={{ background: 'var(--hospital-bg)' }}
                        />
                        <button
                          type="button"
                          className="neu-btn neu-btn-primary neu-btn-sm flex-shrink-0"
                          onClick={() => handleCopy('setupUrl', createdCredentials.setup_url || `${window.location.origin}/staff/set-password`)}
                        >
                          {copiedKey === 'setupUrl' ? (
                            <>
                              <Check size={14} className="me-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy size={14} className="me-1" />
                              Copy Link
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="small text-muted text-center">
                  Never log or transmit temporary credentials over unencrypted channels. This credential will expire once set.
                </div>
              </div>

              <div 
                className="modal-footer px-4 py-3 border-top d-flex justify-content-between"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-1"
                  onClick={() => {
                    const fullText = `EgleSora Hospital Consultant Account Details:
Doctor: ${createdCredentials.doctor?.name}
Department: ${createdCredentials.doctor?.departmentName}
Email/Username: ${createdCredentials.email || createdCredentials.username}
Temporary Password: ${createdCredentials.temporary_password}
Password Setup Link: ${createdCredentials.setup_url || `${window.location.origin}/staff/set-password`}
Note: You will be required to choose a new password upon first login.`;
                    handleCopy('allCreds', fullText);
                  }}
                >
                  {copiedKey === 'allCreds' ? (
                    <>
                      <Check size={14} className="text-success" />
                      All Details Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy All Details
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="neu-btn neu-btn-primary neu-btn-sm"
                  onClick={() => setCreatedCredentials(null)}
                >
                  Dismiss & Return to Directory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDoctorsPage;
