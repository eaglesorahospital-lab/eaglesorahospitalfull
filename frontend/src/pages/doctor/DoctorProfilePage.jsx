import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  User, 
  Upload, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  RotateCw, 
  Eye, 
  EyeOff, 
  Award, 
  MapPin, 
  Clock, 
  Mail, 
  Phone 
} from 'lucide-react';
import doctorService from '../../services/doctorService';
import authService from '../../services/authService';

export function DoctorProfilePage() {
  const { doctorProfile, setDoctorProfile } = useOutletContext() || {};
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Profile edit fields
  const [formData, setFormData] = useState({
    bio: '',
    expertise: '',
    consultation_location: '',
  });

  // Photo upload
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    if (doctorProfile) {
      setFormData({
        bio: doctorProfile.bio || '',
        expertise: Array.isArray(doctorProfile.expertise)
          ? doctorProfile.expertise.join(', ')
          : (doctorProfile.expertise || ''),
        consultation_location: doctorProfile.consultation_location || '',
      });
      if (doctorProfile.photo) {
        setPhotoPreview(doctorProfile.photo);
      }
    }
  }, [doctorProfile]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Selected photograph exceeds 5 MB limit. Please select a smaller image.');
      return;
    }
    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setProfileError('Invalid image format. Supported formats: JPEG, PNG, WebP.');
      return;
    }

    setProfileError(null);
    setSelectedPhoto(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileNotice(null);
    setProfileError(null);
    setIsSubmittingProfile(true);

    try {
      const payload = {
        bio: formData.bio,
        expertise: formData.expertise,
        consultation_location: formData.consultation_location,
      };

      if (selectedPhoto) {
        payload.photoFile = selectedPhoto;
      }

      const updated = await doctorService.updateMyDoctorProfile(payload);
      setDoctorProfile(updated);
      setSelectedPhoto(null);
      setProfileNotice('Consultant profile updated successfully in database.');
    } catch (err) {
      setProfileError(`Failed to update profile: ${err.message}`);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await authService.changePassword(currentPassword, newPassword, confirmPassword);
      setPasswordNotice('Password updated successfully! Your account credentials are secure.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Verify current password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="doctor-profile-view">
      <div className="mb-4">
        <h1 className="h4 fw-bold text-body mb-0.5">Consultant Faculty Profile</h1>
        <p className="text-muted small mb-0">
          Manage your professional biographical details, clinic suite location, photo, and access credentials.
        </p>
      </div>

      <div className="row g-4">
        {/* Left Column: Identity & Photo */}
        <div className="col-12 col-xl-4">
          <div className="neu-card rounded-4 p-4 text-center mb-4">
            <div className="position-relative d-inline-block mb-3">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={doctorProfile?.name}
                  className="rounded-circle neu-raised border border-3 border-white"
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white fs-1 neu-raised"
                  style={{ width: '120px', height: '120px', background: 'var(--hospital-primary-navy)' }}
                >
                  {(doctorProfile?.name || 'DR')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <label
                className="position-absolute bottom-0 end-0 p-2 rounded-circle neu-raised cursor-pointer"
                style={{ background: '#0D47A1', color: '#ffffff', cursor: 'pointer' }}
                title="Upload new profile photograph"
              >
                <Upload size={14} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="d-none"
                  onChange={handlePhotoSelect}
                />
              </label>
            </div>

            <h2 className="fs-5 fw-bold text-body mb-1">{doctorProfile?.name}</h2>
            <div className="badge mb-2" style={{ background: '#16845B' }}>
              {doctorProfile?.specialty || 'Consultant Specialist'}
            </div>

            <div className="neu-inset p-3 rounded-3 text-start mt-3 small">
              <div className="mb-2">
                <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Department</span>
                <span className="fw-semibold text-body">{doctorProfile?.departmentName || 'Medical Services'}</span>
              </div>
              <div className="mb-2">
                <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Academic Qualifications</span>
                <span className="fw-semibold text-body">
                  {Array.isArray(doctorProfile?.qualification)
                    ? doctorProfile?.qualification.join(', ')
                    : (doctorProfile?.qualification || 'MBBS, MD')}
                </span>
              </div>
              <div className="mb-2">
                <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Clinical Experience</span>
                <span className="fw-semibold text-body">{doctorProfile?.experience || 10} Years</span>
              </div>
              <div>
                <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Consultation Duration</span>
                <span className="fw-semibold text-body">{doctorProfile?.consultation_duration_minutes || 30} minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile & Security */}
        <div className="col-12 col-xl-8">
          {/* Bio and Location Card */}
          <div className="neu-card rounded-4 p-4 mb-4">
            <h3 className="fs-6 fw-bold text-body mb-3 pb-2 border-bottom">Professional Clinical Details</h3>

            {profileNotice && (
              <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-3" role="alert">
                <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                <span>{profileNotice}</span>
              </div>
            )}

            {profileError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-3" role="alert">
                <AlertCircle size={16} className="text-danger flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="mb-3">
                <label className="neu-form-label">OPD Suite / Consulting Room Location</label>
                <div className="position-relative">
                  <MapPin size={16} className="position-absolute start-0 top-50 translate-middle-y ms-3 text-muted" />
                  <input
                    type="text"
                    className="neu-input ps-5"
                    placeholder="e.g. OPD Wing B, 2nd Floor, Suite 204"
                    value={formData.consultation_location}
                    onChange={(e) => setFormData({ ...formData, consultation_location: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="neu-form-label">Clinical Expertise & Special Interests</label>
                <input
                  type="text"
                  className="neu-input"
                  placeholder="e.g. Stroke Care, Epilepsy, Neuro-Rehab, Migraine"
                  value={formData.expertise}
                  onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                />
                <span className="small text-muted mt-1 d-block" style={{ fontSize: '0.72rem' }}>
                  Comma separated keywords displayed on the public doctor profile.
                </span>
              </div>

              <div className="mb-4">
                <label className="neu-form-label">Professional Biography & Background</label>
                <textarea
                  className="neu-input"
                  rows={4}
                  placeholder="Brief clinical background, academic affiliations, and patient care philosophy..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="text-end">
                <button
                  type="submit"
                  className="neu-btn neu-btn-primary neu-btn-sm"
                  disabled={isSubmittingProfile}
                >
                  {isSubmittingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="neu-card rounded-4 p-4">
            <h3 className="fs-6 fw-bold text-body mb-3 pb-2 border-bottom d-flex align-items-center gap-2">
              <Lock size={16} className="text-primary" />
              Portal Access Security & Password
            </h3>

            {passwordNotice && (
              <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-3" role="alert">
                <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                <span>{passwordNotice}</span>
              </div>
            )}

            {passwordError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-3" role="alert">
                <AlertCircle size={16} className="text-danger flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="neu-form-label">
                  Current Password <span className="text-danger">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="neu-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                  <label className="neu-form-label">
                    New Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="neu-input"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="neu-form-label">
                    Confirm New Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="neu-input"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-muted p-0 text-decoration-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide password characters' : 'Show password characters'}
                </button>

                <button
                  type="submit"
                  className="neu-btn neu-btn-primary neu-btn-sm"
                  disabled={isSubmittingPassword}
                >
                  {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorProfilePage;
