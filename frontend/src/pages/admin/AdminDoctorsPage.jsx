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
  Image as ImageIcon,
  Send,
  Ban,
  RefreshCw,
  MailCheck
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

  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedInvitationStatus, setSelectedInvitationStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('NAME_ASC');
  const [invitationLoadingId, setInvitationLoadingId] = useState(null);

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

  // Edit Doctor photo state
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editPhotoError, setEditPhotoError] = useState(null);
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);
  const [isDeletingEditPhoto, setIsDeletingEditPhoto] = useState(false);

  // Lock body scroll and dismiss on Escape for glass modals
  useEffect(() => {
    const hasOpenModal = Boolean(viewDoctor || editDoctor || showAddModal || createdCredentials);
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setViewDoctor(null);
          setEditDoctor(null);
          setShowAddModal(false);
          setCreatedCredentials(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [viewDoctor, editDoctor, showAddModal, createdCredentials]);

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

  // Filtered and sorted doctors
  const filteredDoctors = useMemo(() => {
    let list = doctorsList.filter((doc) => {
      const q = searchTerm.toLowerCase().trim();
      const qualStr = Array.isArray(doc.qualification) ? doc.qualification.join(' ') : (doc.qualification || '');
      const matchSearch =
        q === '' ||
        (doc.name || '').toLowerCase().includes(q) ||
        (doc.specialty || '').toLowerCase().includes(q) ||
        (doc.departmentName || '').toLowerCase().includes(q) ||
        (doc.email || '').toLowerCase().includes(q) ||
        (doc.phone || '').toLowerCase().includes(q) ||
        qualStr.toLowerCase().includes(q);

      const matchDept =
        selectedDepartment === 'ALL' ||
        String(doc.departmentId) === String(selectedDepartment) ||
        String(doc.departmentSlug) === String(selectedDepartment);

      const matchStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && (doc.is_active || doc.status === 'Active')) ||
        (selectedStatus === 'INACTIVE' && (!doc.is_active || doc.status === 'Inactive'));

      const invStatus = (doc.invitationStatus || doc.invitation_status || 'UNINVITED').toUpperCase();
      const matchInvStatus =
        selectedInvitationStatus === 'ALL' ||
        (selectedInvitationStatus === 'PENDING' && (invStatus === 'PENDING' || invStatus === 'INVITATION_PENDING')) ||
        (selectedInvitationStatus === 'ACCEPTED' && invStatus === 'ACCEPTED') ||
        (selectedInvitationStatus === 'EXPIRED' && invStatus === 'EXPIRED') ||
        (selectedInvitationStatus === 'REVOKED' && invStatus === 'REVOKED') ||
        (selectedInvitationStatus === 'UNINVITED' && (invStatus === 'UNINVITED' || !invStatus));

      return matchSearch && matchDept && matchStatus && matchInvStatus;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'NAME_DESC') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'EXPERIENCE_DESC') return (Number(b.experience) || 0) - (Number(a.experience) || 0);
      if (sortBy === 'EXPERIENCE_ASC') return (Number(a.experience) || 0) - (Number(b.experience) || 0);
      if (sortBy === 'STATUS') {
        const aActive = a.is_active ? 1 : 0;
        const bActive = b.is_active ? 1 : 0;
        return bActive - aActive;
      }
      return 0;
    });

    return list;
  }, [doctorsList, searchTerm, selectedDepartment, selectedStatus, selectedInvitationStatus, sortBy]);

  // Handle Send Invitation
  const handleInviteDoctor = async (doctor) => {
    setActionError(null);
    setActionNotice(null);
    setInvitationLoadingId(doctor.id);
    try {
      const res = await doctorService.inviteDoctor(doctor.slug || doctor.id);
      const inv = res.invitation;
      setDoctorsList((prev) =>
        prev.map((d) =>
          d.id === doctor.id
            ? {
                ...d,
                invitationStatus: inv?.status || 'PENDING',
                invitation_status: inv?.status || 'PENDING',
                latest_invitation_sent_at: inv?.created_at || new Date().toISOString(),
                latest_invitation_expires_at: inv?.expires_at,
              }
            : d
        )
      );
      if (viewDoctor && viewDoctor.id === doctor.id) {
        setViewDoctor((prev) => ({
          ...prev,
          invitationStatus: inv?.status || 'PENDING',
          invitation_status: inv?.status || 'PENDING',
          latest_invitation_sent_at: inv?.created_at || new Date().toISOString(),
          latest_invitation_expires_at: inv?.expires_at,
        }));
      }
      setActionNotice(res.message || `Invitation successfully sent to ${doctor.name}.`);
    } catch (err) {
      setActionError(`Failed to send invitation to ${doctor.name}: ${err.message || 'API error'}`);
    } finally {
      setInvitationLoadingId(null);
    }
  };

  // Handle Resend Invitation
  const handleResendInvitation = async (doctor) => {
    setActionError(null);
    setActionNotice(null);
    setInvitationLoadingId(doctor.id);
    try {
      const res = await doctorService.resendDoctorInvitation(doctor.slug || doctor.id);
      const inv = res.invitation;
      setDoctorsList((prev) =>
        prev.map((d) =>
          d.id === doctor.id
            ? {
                ...d,
                invitationStatus: inv?.status || 'PENDING',
                invitation_status: inv?.status || 'PENDING',
                latest_invitation_sent_at: inv?.created_at || new Date().toISOString(),
                latest_invitation_expires_at: inv?.expires_at,
              }
            : d
        )
      );
      if (viewDoctor && viewDoctor.id === doctor.id) {
        setViewDoctor((prev) => ({
          ...prev,
          invitationStatus: inv?.status || 'PENDING',
          invitation_status: inv?.status || 'PENDING',
          latest_invitation_sent_at: inv?.created_at || new Date().toISOString(),
          latest_invitation_expires_at: inv?.expires_at,
        }));
      }
      setActionNotice(res.message || `Invitation successfully resent to ${doctor.name}.`);
    } catch (err) {
      setActionError(`Failed to resend invitation to ${doctor.name}: ${err.message || 'API error'}`);
    } finally {
      setInvitationLoadingId(null);
    }
  };

  // Handle Revoke Invitation
  const handleRevokeInvitation = async (doctor) => {
    setActionError(null);
    setActionNotice(null);
    setInvitationLoadingId(doctor.id);
    try {
      const res = await doctorService.revokeDoctorInvitation(doctor.slug || doctor.id);
      setDoctorsList((prev) =>
        prev.map((d) =>
          d.id === doctor.id
            ? {
                ...d,
                invitationStatus: 'REVOKED',
                invitation_status: 'REVOKED',
              }
            : d
        )
      );
      if (viewDoctor && viewDoctor.id === doctor.id) {
        setViewDoctor((prev) => ({
          ...prev,
          invitationStatus: 'REVOKED',
          invitation_status: 'REVOKED',
        }));
      }
      setActionNotice(res.message || `Invitation for ${doctor.name} has been revoked.`);
    } catch (err) {
      setActionError(`Failed to revoke invitation for ${doctor.name}: ${err.message || 'API error'}`);
    } finally {
      setInvitationLoadingId(null);
    }
  };

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

  const handleClearEditPhoto = () => {
    setEditPhotoFile(null);
    if (editPhotoPreview) {
      URL.revokeObjectURL(editPhotoPreview);
      setEditPhotoPreview(null);
    }
    setEditPhotoError(null);
    const input = document.getElementById('edit-doctor-photo-upload');
    if (input) input.value = '';
  };

  const handleCloseEditModal = () => {
    handleClearEditPhoto();
    setEditDoctor(null);
  };

  const handleEditPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setEditPhotoError('Unsupported file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditPhotoError('Photo size exceeds limit. Please upload an image under 5MB.');
      return;
    }

    setEditPhotoError(null);
    setEditPhotoFile(file);
    if (editPhotoPreview) {
      URL.revokeObjectURL(editPhotoPreview);
    }
    setEditPhotoPreview(URL.createObjectURL(file));
  };

  const handleUploadEditPhoto = async () => {
    if (!editDoctor || !editPhotoFile) return;
    setIsUploadingEditPhoto(true);
    setEditPhotoError(null);
    try {
      const res = await doctorService.uploadDoctorPhoto(editDoctor.slug || editDoctor.id, editPhotoFile);
      const newPhotoUrl = res.photo_url || res.doctor?.photo || res.doctor?.photo_url;
      const updatedDoc = {
        ...editDoctor,
        photo: newPhotoUrl,
        photo_url: newPhotoUrl,
        image_url: newPhotoUrl,
      };
      setEditDoctor(updatedDoc);
      setDoctorsList((prev) =>
        prev.map((d) => (d.id === editDoctor.id ? { ...d, photo: newPhotoUrl, photo_url: newPhotoUrl, image_url: newPhotoUrl } : d))
      );
      handleClearEditPhoto();
      setActionNotice(`Doctor photo for ${editDoctor.name} uploaded successfully.`);
    } catch (err) {
      setEditPhotoError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingEditPhoto(false);
    }
  };

  const handleDeleteEditPhoto = async () => {
    if (!editDoctor) return;
    setIsDeletingEditPhoto(true);
    setEditPhotoError(null);
    try {
      await doctorService.deleteDoctorPhoto(editDoctor.slug || editDoctor.id);
      const updatedDoc = {
        ...editDoctor,
        photo: null,
        photo_url: null,
        image_url: null,
      };
      setEditDoctor(updatedDoc);
      setDoctorsList((prev) =>
        prev.map((d) => (d.id === editDoctor.id ? { ...d, photo: null, photo_url: null, image_url: null } : d))
      );
      handleClearEditPhoto();
      setActionNotice(`Doctor photo for ${editDoctor.name} removed successfully.`);
    } catch (err) {
      setEditPhotoError(`Failed to remove photo: ${err.message}`);
    } finally {
      setIsDeletingEditPhoto(false);
    }
  };

  // Handle Save Edit with PostgreSQL persistence
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDoctor) return;
    setActionError(null);
    setActionNotice(null);
    setEditPhotoError(null);
    setIsSubmitting(true);

    try {
      let updated = await doctorService.updateDoctor(editDoctor.slug || editDoctor.id, {
        name: editDoctor.name,
        specialty_name: editDoctor.specialty,
        consultation_location: editDoctor.consultation?.location,
        experience_years: editDoctor.experience,
      });

      // If user selected an image file, upload it as part of save
      if (editPhotoFile) {
        try {
          const photoRes = await doctorService.uploadDoctorPhoto(editDoctor.slug || editDoctor.id, editPhotoFile);
          const newPhotoUrl = photoRes.photo_url || photoRes.doctor?.photo || photoRes.doctor?.photo_url;
          if (newPhotoUrl) {
            updated = { ...updated, photo: newPhotoUrl, photo_url: newPhotoUrl, image_url: newPhotoUrl };
          }
        } catch (photoErr) {
          setActionNotice(`Doctor profile saved, but photo upload encountered an issue: ${photoErr.message}`);
        }
      }

      setDoctorsList((prev) =>
        prev.map((d) => (d.id === editDoctor.id ? updated : d))
      );
      if (!actionNotice) {
        setActionNotice(`Doctor profile for ${updated.name} updated in database.`);
      }
      handleCloseEditModal();
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
      const invitation = res.invitation;

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
      if (creds || invitation) {
        setCreatedCredentials({
          doctor: createdDoctor,
          invitation: invitation,
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
            searchPlaceholder="Search by doctor name, email, specialty, or phone..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            hasActiveFilters={
              searchTerm !== '' ||
              selectedDepartment !== 'ALL' ||
              selectedStatus !== 'ALL' ||
              selectedInvitationStatus !== 'ALL' ||
              sortBy !== 'NAME_ASC'
            }
            onClear={() => {
              setSearchTerm('');
              setSelectedDepartment('ALL');
              setSelectedStatus('ALL');
              setSelectedInvitationStatus('ALL');
              setSortBy('NAME_ASC');
            }}
          >
            <div className="col-12 col-sm-6 col-md-2">
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

            <div className="col-12 col-sm-6 col-md-2">
              <select
                className="neu-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="ALL">All Accounts</option>
                <option value="ACTIVE">Active Account</option>
                <option value="INACTIVE">Inactive Account</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-2">
              <select
                className="neu-select"
                value={selectedInvitationStatus}
                onChange={(e) => setSelectedInvitationStatus(e.target.value)}
                aria-label="Filter by invitation onboarding status"
              >
                <option value="ALL">All Onboarding</option>
                <option value="PENDING">Invitation Pending</option>
                <option value="ACCEPTED">Invitation Accepted</option>
                <option value="EXPIRED">Invitation Expired</option>
                <option value="REVOKED">Invitation Revoked</option>
                <option value="UNINVITED">Not Yet Invited</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-2">
              <select
                className="neu-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort doctor roster"
              >
                <option value="NAME_ASC">Name (A–Z)</option>
                <option value="NAME_DESC">Name (Z–A)</option>
                <option value="EXPERIENCE_DESC">Experience (High–Low)</option>
                <option value="EXPERIENCE_ASC">Experience (Low–High)</option>
                <option value="STATUS">Active First</option>
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
                    <th className="col-status">Account</th>
                    <th className="col-invitation">Onboarding</th>
                    <th className="col-actions text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        <RotateCw size={24} className="spin-anim mb-2 text-primary" />
                        <div>Loading doctor directory...</div>
                      </td>
                    </tr>
                  ) : filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
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
                                alt={`Portrait of ${doc.name}`}
                                width="42"
                                height="42"
                                loading="lazy"
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
                                <Mail size={12} className="flex-shrink-0 text-muted" />
                                <span className="text-truncate">{doc.email || 'No email registered'}</span>
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
                          <AdminStatusBadge status={doc.is_active ? 'Active' : 'Inactive'} />
                        </td>
                        <td className="col-invitation">
                          <div className="d-flex flex-column gap-1">
                            <AdminStatusBadge status={doc.invitationStatus || doc.invitation_status || 'UNINVITED'} />
                            {doc.latest_invitation_sent_at && (
                              <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                Sent: {new Date(doc.latest_invitation_sent_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
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

                            {/* Invitation Action Buttons */}
                            {(() => {
                              const invStatus = (doc.invitationStatus || doc.invitation_status || 'UNINVITED').toUpperCase();
                              const isInvLoading = invitationLoadingId === doc.id;
                              if (invStatus === 'ACCEPTED') {
                                return null;
                              }
                              if (invStatus === 'PENDING' || invStatus === 'INVITATION_PENDING') {
                                return (
                                  <>
                                    <button
                                      type="button"
                                      className="neu-btn neu-btn-outline neu-btn-sm"
                                      onClick={() => handleResendInvitation(doc)}
                                      disabled={isInvLoading || isSubmitting}
                                      title="Resend onboarding invitation email"
                                    >
                                      {isInvLoading ? (
                                        <RotateCw size={13} className="spin-anim me-1" />
                                      ) : (
                                        <RefreshCw size={13} className="me-1" />
                                      )}
                                      Resend
                                    </button>
                                    <button
                                      type="button"
                                      className="neu-btn neu-btn-outline neu-btn-sm text-danger"
                                      onClick={() => handleRevokeInvitation(doc)}
                                      disabled={isInvLoading || isSubmitting}
                                      title="Revoke active invitation"
                                    >
                                      <Ban size={13} className="me-1" />
                                      Revoke
                                    </button>
                                  </>
                                );
                              }
                              return (
                                <button
                                  type="button"
                                  className="neu-btn neu-btn-outline neu-btn-sm text-primary"
                                  onClick={() => handleInviteDoctor(doc)}
                                  disabled={isInvLoading || isSubmitting}
                                  title="Send onboarding invitation email"
                                >
                                  {isInvLoading ? (
                                    <RotateCw size={13} className="spin-anim me-1" />
                                  ) : (
                                    <Send size={13} className="me-1" />
                                  )}
                                  Invite
                                </button>
                              );
                            })()}

                            <button
                              type="button"
                              className={`neu-btn neu-btn-sm ${
                                doc.status === 'Active' || doc.is_active ? 'neu-btn-danger' : 'neu-btn-primary'
                              }`}
                              onClick={() => handleToggleStatus(doc)}
                              disabled={isSubmitting || invitationLoadingId === doc.id}
                              title={doc.status === 'Active' || doc.is_active ? 'Deactivate consultant' : 'Activate consultant'}
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

            {/* Mobile Stacked Card List (< 768px) */}
            <div className="d-md-none p-3 d-flex flex-column gap-3">
              {isLoading ? (
                <div className="text-center py-4 text-muted">
                  <RotateCw size={24} className="spin-anim mb-2 text-primary" />
                  <div>Loading doctor directory...</div>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <AlertCircle size={28} className="mb-2 text-muted" />
                  <div className="fw-semibold">No doctor records match the selected criteria.</div>
                </div>
              ) : (
                filteredDoctors.map((doc) => (
                  <div key={doc.id} className="admin-mobile-card">
                    <div className="d-flex align-items-center gap-3 mb-2">
                      {doc.photo || doc.photo_url || doc.image_url ? (
                        <img 
                          src={doc.photo || doc.photo_url || doc.image_url} 
                          alt={`Portrait of ${doc.name}`}
                          width="44"
                          height="44"
                          loading="lazy"
                          style={{ 
                            width: '44px', 
                            height: '44px', 
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
                            width: '44px', 
                            height: '44px', 
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
                      <div className="min-w-0 flex-grow-1">
                        <div className="fw-bold fs-6 text-truncate" style={{ color: 'var(--hospital-primary-navy)' }}>
                          {doc.name}
                        </div>
                        <div className="small text-muted text-truncate">{doc.email || 'No email registered'}</div>
                      </div>
                    </div>

                    <div className="admin-mobile-card-row">
                      <div>
                        <div className="fw-semibold text-primary small">{doc.specialty}</div>
                        <span className="small text-muted">{doc.departmentName}</span>
                      </div>
                      <div className="text-end">
                        <AdminStatusBadge status={doc.is_active ? 'Active' : 'Inactive'} />
                      </div>
                    </div>

                    <div className="small text-muted mt-2 pt-2 border-top d-flex justify-content-between" style={{ borderColor: 'var(--glass-border)' }}>
                      <span>Experience: <strong>{doc.experience} Years</strong></span>
                      <span>Slot: <strong>{doc.consultation?.duration || '30 mins'}</strong></span>
                    </div>

                    <div className="small text-muted mt-1 d-flex justify-content-between align-items-center">
                      <span>Onboarding:</span>
                      <AdminStatusBadge status={doc.invitationStatus || doc.invitation_status || 'UNINVITED'} />
                    </div>

                    <div className="admin-mobile-card-actions">
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm"
                        onClick={() => setViewDoctor(doc)}
                        title="View credentials & clinical profile"
                      >
                        <Eye size={14} className="me-1" />
                        Details
                      </button>
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm"
                        onClick={() => setEditDoctor(doc)}
                        title="Edit profile"
                      >
                        <Edit3 size={14} className="me-1" />
                        Edit
                      </button>
                      {(() => {
                        const invStatus = doc.invitationStatus || doc.invitation_status || 'UNINVITED';
                        const isInvLoading = invitationLoadingId === doc.id;
                        if (invStatus === 'ACCEPTED') return null;
                        if (invStatus === 'PENDING' || invStatus === 'INVITATION_PENDING') {
                          return (
                            <>
                              <button
                                type="button"
                                className="neu-btn neu-btn-outline neu-btn-sm"
                                onClick={() => handleResendInvitation(doc)}
                                disabled={isInvLoading || isSubmitting}
                              >
                                <RefreshCw size={14} className="me-1" />
                                Resend
                              </button>
                              <button
                                type="button"
                                className="neu-btn neu-btn-outline neu-btn-sm text-danger"
                                onClick={() => handleRevokeInvitation(doc)}
                                disabled={isInvLoading || isSubmitting}
                              >
                                <Ban size={14} className="me-1" />
                                Revoke
                              </button>
                            </>
                          );
                        }
                        return (
                          <button
                            type="button"
                            className="neu-btn neu-btn-outline neu-btn-sm text-primary"
                            onClick={() => handleInviteDoctor(doc)}
                            disabled={isInvLoading || isSubmitting}
                          >
                            <Send size={14} className="me-1" />
                            Invite
                          </button>
                        );
                      })()}
                      <button
                        type="button"
                        className={`neu-btn neu-btn-sm ${
                          doc.status === 'Active' || doc.is_active ? 'neu-btn-danger' : 'neu-btn-primary'
                        }`}
                        onClick={() => handleToggleStatus(doc)}
                        disabled={isSubmitting || invitationLoadingId === doc.id}
                      >
                        <Power size={14} className="me-1" />
                        {doc.status === 'Active' || doc.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
        </>
      )}

      {/* View Doctor Details Modal */}
      {viewDoctor && (
        <div
          className="modal show d-block glass-modal-backdrop"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div 
              className="modal-content glass-modal neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
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
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', padding: 0 }}
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

                  {/* Onboarding & Account Lifecycle Card */}
                  <div className="col-12">
                    <div
                      className="p-3 neu-card-sm"
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="small text-muted fw-bold text-uppercase">Account Lifecycle & Onboarding</div>
                        <div className="d-flex align-items-center gap-2">
                          <AdminStatusBadge status={viewDoctor.is_active ? 'Active' : 'Inactive'} />
                          <AdminStatusBadge status={viewDoctor.invitationStatus || viewDoctor.invitation_status || 'UNINVITED'} />
                        </div>
                      </div>

                      <div className="row g-2 small mb-3">
                        <div className="col-12 col-md-6">
                          <span className="text-muted">Account Email: </span>
                          <span className="fw-semibold font-monospace">{viewDoctor.email || 'N/A'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <span className="text-muted">Contact Phone: </span>
                          <span className="fw-semibold">{viewDoctor.phone || 'N/A'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <span className="text-muted">Invitation Sent: </span>
                          <span>
                            {viewDoctor.latest_invitation_sent_at
                              ? new Date(viewDoctor.latest_invitation_sent_at).toLocaleString()
                              : 'Never'}
                          </span>
                        </div>
                        <div className="col-12 col-md-6">
                          <span className="text-muted">Invitation Expiry: </span>
                          <span>
                            {viewDoctor.latest_invitation_expires_at
                              ? new Date(viewDoctor.latest_invitation_expires_at).toLocaleString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Modal Actions */}
                      <div className="d-flex gap-2 pt-2 border-top">
                        {(() => {
                          const invStatus = (viewDoctor.invitationStatus || viewDoctor.invitation_status || 'UNINVITED').toUpperCase();
                          const isInvLoading = invitationLoadingId === viewDoctor.id;
                          if (invStatus === 'ACCEPTED') {
                            return (
                              <div className="small text-success d-flex align-items-center gap-1">
                                <CheckCircle2 size={14} />
                                <span>Doctor has activated their account and set their password.</span>
                              </div>
                            );
                          }
                          if (invStatus === 'PENDING' || invStatus === 'INVITATION_PENDING') {
                            return (
                              <>
                                <button
                                  type="button"
                                  className="neu-btn neu-btn-primary neu-btn-sm d-inline-flex align-items-center gap-1"
                                  onClick={() => handleResendInvitation(viewDoctor)}
                                  disabled={isInvLoading}
                                >
                                  {isInvLoading ? <RotateCw size={13} className="spin-anim" /> : <RefreshCw size={13} />}
                                  Resend Invitation
                                </button>
                                <button
                                  type="button"
                                  className="neu-btn neu-btn-outline neu-btn-sm text-danger d-inline-flex align-items-center gap-1"
                                  onClick={() => handleRevokeInvitation(viewDoctor)}
                                  disabled={isInvLoading}
                                >
                                  <Ban size={13} />
                                  Revoke Invitation
                                </button>
                              </>
                            );
                          }
                          return (
                            <button
                              type="button"
                              className="neu-btn neu-btn-primary neu-btn-sm d-inline-flex align-items-center gap-1"
                              onClick={() => handleInviteDoctor(viewDoctor)}
                              disabled={isInvLoading}
                            >
                              {isInvLoading ? <RotateCw size={13} className="spin-anim" /> : <Send size={13} />}
                              Send Invitation
                            </button>
                          );
                        })()}
                      </div>
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
          className="modal show d-block glass-modal-backdrop"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content glass-modal neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
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
                    style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', padding: 0 }}
                    onClick={handleCloseEditModal}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  {/* Doctor Profile Photo Management Section */}
                  <div className="mb-4 p-3 neu-card-sm" style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}>
                    <label className="neu-form-label mb-2 d-flex justify-content-between align-items-center">
                      <span>Profile Photograph</span>
                      <span className="small text-muted font-monospace">JPEG, PNG, WebP (Max 5MB)</span>
                    </label>

                    <div className="d-flex align-items-center gap-3 mb-3">
                      {editPhotoPreview ? (
                        <img
                          src={editPhotoPreview}
                          alt="New profile preview"
                          width="56"
                          height="56"
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            objectFit: 'cover',
                            boxShadow: 'var(--neu-shadow-sm)',
                            border: '2px solid var(--hospital-medical-blue)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (editDoctor.photo || editDoctor.photo_url || editDoctor.image_url) ? (
                        <img
                          src={editDoctor.photo || editDoctor.photo_url || editDoctor.image_url}
                          alt={`Portrait of ${editDoctor.name}`}
                          width="56"
                          height="56"
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            objectFit: 'cover',
                            boxShadow: 'var(--neu-shadow-sm)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: 'var(--hospital-bg)',
                            boxShadow: 'var(--neu-inset)',
                            color: 'var(--hospital-medical-blue)',
                            flexShrink: 0,
                          }}
                        >
                          <Stethoscope size={24} />
                        </div>
                      )}

                      <div className="flex-grow-1 min-w-0">
                        {editPhotoFile ? (
                          <div>
                            <div className="fw-semibold small text-truncate">{editPhotoFile.name}</div>
                            <div className="small text-muted">{(editPhotoFile.size / 1024).toFixed(1)} KB (Ready to upload)</div>
                          </div>
                        ) : (editDoctor.photo || editDoctor.photo_url || editDoctor.image_url) ? (
                          <div>
                            <div className="fw-semibold small text-success d-flex align-items-center gap-1">
                              <CheckCircle2 size={13} />
                              <span>Active Photo Set</span>
                            </div>
                            <div className="small text-muted text-truncate">Saved to persistent storage</div>
                          </div>
                        ) : (
                          <div className="small text-muted">No profile photograph uploaded yet.</div>
                        )}
                      </div>

                      {/* Photo Actions */}
                      <div className="d-flex gap-2 flex-shrink-0">
                        {editPhotoFile ? (
                          <>
                            <button
                              type="button"
                              className="neu-btn neu-btn-primary neu-btn-sm"
                              onClick={handleUploadEditPhoto}
                              disabled={isUploadingEditPhoto}
                              title="Upload selected photo immediately"
                            >
                              {isUploadingEditPhoto ? (
                                <>
                                  <RotateCw size={13} className="spin-anim me-1" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload size={13} className="me-1" />
                                  Upload
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="neu-btn neu-btn-outline neu-btn-sm text-danger"
                              onClick={handleClearEditPhoto}
                              disabled={isUploadingEditPhoto}
                              title="Cancel photo selection"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (editDoctor.photo || editDoctor.photo_url || editDoctor.image_url) ? (
                          <button
                            type="button"
                            className="neu-btn neu-btn-outline neu-btn-sm text-danger"
                            onClick={handleDeleteEditPhoto}
                            disabled={isDeletingEditPhoto}
                            title="Remove profile photograph"
                          >
                            {isDeletingEditPhoto ? (
                              <RotateCw size={13} className="spin-anim" />
                            ) : (
                              'Remove'
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* File Selection Input */}
                    <div>
                      <input
                        id="edit-doctor-photo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleEditPhotoChange}
                        disabled={isUploadingEditPhoto || isSubmitting}
                        className="form-control form-control-sm"
                        style={{
                          borderRadius: '10px',
                          border: `1px solid ${editPhotoError ? 'var(--neu-error)' : 'var(--hospital-border)'}`,
                          background: 'var(--hospital-bg)',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>

                    {editPhotoError && (
                      <div className="text-danger small mt-2 d-flex align-items-center gap-1">
                        <AlertCircle size={13} className="flex-shrink-0" />
                        <span>{editPhotoError}</span>
                      </div>
                    )}
                  </div>

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
                    onClick={handleCloseEditModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm" disabled={isSubmitting || isUploadingEditPhoto}>
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
          className="modal show d-block glass-modal-backdrop"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div 
              className="modal-content glass-modal neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
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
                    style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', padding: 0 }}
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
                            alt="Doctor profile photo preview"
                            width="64"
                            height="64"
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
              className="modal-content glass-modal neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
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
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', padding: 0 }}
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
                      alt={`Portrait of ${createdCredentials.doctor?.name || 'Doctor'}`}
                      width="52"
                      height="52"
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

                  {/* Onboarding Invitation Link */}
                  {createdCredentials.invitation?.setup_url && (
                    <div className="col-12">
                      <div
                        className="p-3 neu-card-sm"
                        style={{ borderRadius: '16px', background: 'var(--hospital-surface)', border: '1px solid rgba(49, 130, 206, 0.35)' }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="small fw-bold text-uppercase text-primary d-flex align-items-center gap-1">
                            <MailCheck size={15} />
                            <span>Doctor Invitation & Onboarding Link</span>
                          </div>
                          <span className="neu-badge neu-badge-primary small">Cryptographic Hash</span>
                        </div>
                        <div className="small text-muted mb-2">
                          {createdCredentials.invitation.email_sent ? (
                            <span className="text-success d-inline-flex align-items-center gap-1">
                              <CheckCircle2 size={13} />
                              Invitation email dispatched to {createdCredentials.invitation.email}.
                            </span>
                          ) : (
                            <span className="text-warning d-inline-flex align-items-center gap-1">
                              <AlertCircle size={13} />
                              Email delivery pending or in development mode. You may share this secure link directly.
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            className="neu-input font-monospace small"
                            value={createdCredentials.invitation.setup_url}
                            style={{ background: 'var(--hospital-bg)' }}
                          />
                          <button
                            type="button"
                            className="neu-btn neu-btn-primary neu-btn-sm flex-shrink-0"
                            onClick={() => handleCopy('inviteUrl', createdCredentials.invitation.setup_url)}
                          >
                            {copiedKey === 'inviteUrl' ? (
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
                  )}
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
Password Setup Link: ${createdCredentials.setup_url || `${window.location.origin}/staff/set-password`}${createdCredentials.invitation?.setup_url ? `\nInvitation Onboarding Link: ${createdCredentials.invitation.setup_url}` : ''}
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
