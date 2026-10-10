import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import PatientNav from '../../components/patient/PatientNav';
import usePatientSession from '../../hooks/usePatientSession';

/**
 * Hospital Platform — Patient Profile Page
 * Displays authenticated patient demographics, contact details, and emergency contact information.
 * Enforces PostgreSQL persistence via /api/patients/me/ and protects patient identity isolation.
 */
export function PatientProfilePage() {
  const { t } = useTranslation();
  const { patientProfile, profileLoading, isAuthenticated, updateProfile } = usePatientSession();

  const breadcrumbs = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.patientPortal'), to: '/my-appointments' },
    { label: t('patient.profile') },
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Synchronize when patientProfile updates
  useEffect(() => {
    if (patientProfile) {
      setFormData({
        fullName: patientProfile.fullName || '',
        mobile: patientProfile.mobile || '',
        email: patientProfile.email || '',
        gender: patientProfile.gender || 'Other',
        dateOfBirth: patientProfile.dateOfBirth || '',
        address: patientProfile.address || '',
        emergencyContact: patientProfile.emergencyContact || '',
      });
    }
  }, [patientProfile]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field] || errors.general) {
      setErrors((prev) => ({ ...prev, [field]: null, general: null }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name is required (minimum 2 characters).';
    }

    const cleanPhone = (formData.mobile || '').replace(/[^0-9]/g, '');
    if (!formData.mobile || cleanPhone.length < 10) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile phone number.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(formData);
      setIsEditing(false);
      setFeedbackNotice('Patient profile successfully updated in PostgreSQL database.');
    } catch (err) {
      setErrors({ general: err.message || 'Failed to update patient profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (patientProfile) {
      setFormData({
        fullName: patientProfile.fullName || '',
        mobile: patientProfile.mobile || '',
        email: patientProfile.email || '',
        gender: patientProfile.gender || 'Other',
        dateOfBirth: patientProfile.dateOfBirth || '',
        address: patientProfile.address || '',
        emergencyContact: patientProfile.emergencyContact || '',
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="patient-profile-page py-4">
      <div className="patient-portal-container">
        {/* Page Header */}
        <PageHeader
          title={t('patient.personalDetails')}
          description="View and manage your registered patient record and demographic details."
          breadcrumbs={breadcrumbs}
          className="mb-3"
        />

        {/* Patient Identity Strip & Tab Navigation */}
        <PatientNav />

        {/* Feedback Alert if Action Performed */}
        {feedbackNotice && (
          <div className="alert alert-success alert-dismissible fade show mb-4 small py-2 px-3" role="alert">
            {feedbackNotice}
            <button
              type="button"
              className="btn-close py-2"
              onClick={() => setFeedbackNotice(null)}
              aria-label="Close"
            />
          </div>
        )}

        {/* General Error Banner */}
        {errors.general && (
          <div className="alert alert-danger mb-4 small py-2 px-3" role="alert">
            {errors.general}
          </div>
        )}

        {!isAuthenticated ? (
          /* Unauthenticated Prompt */
          <div className="patient-card bg-white border rounded-3 p-4 p-md-5 text-center shadow-sm">
            <div className="mb-3 text-primary">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="fs-5 fw-bold text-dark mb-2">Patient Authentication Required</h3>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '520px' }}>
              Your medical and demographic records are strictly isolated and protected. Please sign in to your verified patient account to access your medical file.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link to="/patient/login" className="hospital-btn hospital-btn-primary px-4 py-2">
                Sign In to Patient Portal
              </Link>
              <Link to="/patient/login?mode=register" className="btn btn-outline-secondary px-4 py-2">
                Register New Patient
              </Link>
            </div>
          </div>
        ) : profileLoading ? (
          /* Loading State */
          <div className="patient-card bg-white border rounded-3 p-5 text-center shadow-sm">
            <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
            <div className="text-muted small">Loading patient profile from database...</div>
          </div>
        ) : (
          /* Main Profile Card */
          <div className="patient-card bg-white border rounded-3 p-3 p-md-4 mb-5 shadow-sm">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 border-bottom pb-3 mb-4">
              <div>
                <h2 className="fs-6 fw-bold text-dark mb-1">
                  {isEditing ? t('patient.editProfile') : t('patient.personalDetails')}
                </h2>
                <div className="small text-muted">
                  {isEditing
                    ? 'Update your contact and demographic information below.'
                    : t('common.verified')}
                </div>
              </div>

              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true);
                    setFeedbackNotice(null);
                  }}
                >
                  {t('patient.editProfile')}
                </Button>
              )}
            </div>

            {!isEditing ? (
              /* VIEW MODE */
              <div className="row g-3 g-md-4">
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-slate-50 border rounded-2 h-100">
                    <div className="text-uppercase small fw-bold text-primary mb-2">Primary Identity</div>
                    <div className="mb-2">
                      <span className="fw-semibold text-dark">{t('patient.fullName')}: </span>
                      <span className="text-muted">{patientProfile?.fullName || 'Not specified'}</span>
                    </div>
                    <div className="mb-2">
                      <span className="fw-semibold text-dark">MRN: </span>
                      <span className="badge bg-light text-primary border">{patientProfile?.mrn || 'Pending'}</span>
                    </div>
                    <div className="mb-2">
                      <span className="fw-semibold text-dark">{t('patient.dob')}: </span>
                      <span className="text-muted">{patientProfile?.dateOfBirth || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="fw-semibold text-dark">{t('patient.gender')}: </span>
                      <span className="text-muted">{patientProfile?.gender || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-3 bg-slate-50 border rounded-2 h-100">
                    <div className="text-uppercase small fw-bold text-primary mb-2">Contact Details</div>
                    <div className="mb-2">
                      <span className="fw-semibold text-dark">{t('patient.mobile')}: </span>
                      <span className="text-muted">{patientProfile?.mobile || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="fw-semibold text-dark">{t('patient.email')}: </span>
                      <span className="text-muted">{patientProfile?.email || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-3 bg-slate-50 border rounded-2 h-100">
                    <div className="text-uppercase small fw-bold text-primary mb-2">{t('patient.address')}</div>
                    <div className="text-muted">
                      {patientProfile?.address || 'No residential address recorded.'}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-3 bg-slate-50 border rounded-2 h-100">
                    <div className="text-uppercase small fw-bold text-primary mb-2">{t('patient.emergencyContact')}</div>
                    <div className="text-muted">
                      {patientProfile?.emergencyContact || 'No emergency contact registered.'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <form onSubmit={handleSave}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-name" className="form-label small fw-semibold text-dark">
                      {t('patient.fullName')} <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      className={`form-control form-control-sm ${errors.fullName ? 'is-invalid' : ''}`}
                      value={formData.fullName || ''}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                    />
                    {errors.fullName && <div className="invalid-feedback d-block">{errors.fullName}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-mobile" className="form-label small fw-semibold text-dark">
                      {t('patient.mobile')} <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-mobile"
                      type="tel"
                      className={`form-control form-control-sm ${errors.mobile ? 'is-invalid' : ''}`}
                      value={formData.mobile || ''}
                      onChange={(e) => handleChange('mobile', e.target.value)}
                    />
                    {errors.mobile && <div className="invalid-feedback d-block">{errors.mobile}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-email" className="form-label small fw-semibold text-dark">
                      {t('patient.email')} <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-email"
                      type="email"
                      className={`form-control form-control-sm ${errors.email ? 'is-invalid' : ''}`}
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-gender" className="form-label small fw-semibold text-dark">
                      {t('patient.gender')}
                    </label>
                    <select
                      id="edit-gender"
                      className="form-select form-select-sm"
                      value={formData.gender || 'OTHER'}
                      onChange={(e) => handleChange('gender', e.target.value)}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-dob" className="form-label small fw-semibold text-dark">
                      {t('patient.dob')}
                    </label>
                    <input
                      id="edit-dob"
                      type="date"
                      className="form-control form-control-sm"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-emergency" className="form-label small fw-semibold text-dark">
                      {t('patient.emergencyContact')}
                    </label>
                    <input
                      id="edit-emergency"
                      type="text"
                      className="form-control form-control-sm"
                      value={formData.emergencyContact || ''}
                      onChange={(e) => handleChange('emergencyContact', e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label htmlFor="edit-address" className="form-label small fw-semibold text-dark">
                      {t('patient.address')}
                    </label>
                    <input
                      id="edit-address"
                      type="text"
                      className="form-control form-control-sm"
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  </div>

                  <div className="col-12 d-flex flex-wrap gap-2 pt-3 border-top mt-3">
                    <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                      {isSaving ? 'Saving to Database...' : t('patient.saveChanges')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                      {t('patient.cancelEdit')}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientProfilePage;
