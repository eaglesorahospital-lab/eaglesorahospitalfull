import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import PatientNav from '../../components/patient/PatientNav';
import usePatientSession from '../../hooks/usePatientSession';
import { User, Phone, Mail, MapPin, CheckCircle2, AlertTriangle, ShieldCheck, Edit3, X } from 'lucide-react';

/**
 * Hospital Platform — Patient Profile Page
 * Displays authenticated patient demographics with Neumorphism styling.
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
          <div className="neu-inset p-3 rounded-4 mb-4 border-start border-4 border-success small text-success d-flex justify-content-between align-items-center" role="alert">
            <span className="d-flex align-items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{feedbackNotice}</span>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-link text-muted p-0"
              onClick={() => setFeedbackNotice(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* General Error Banner */}
        {errors.general && (
          <div className="neu-inset p-3 rounded-4 mb-4 border-start border-4 border-danger small text-danger" role="alert">
            {errors.general}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="neu-raised neu-surface rounded-4 p-4 p-md-5 text-center">
            <div className="neu-inset rounded-circle d-inline-flex p-3 text-primary mb-3">
              <User size={36} />
            </div>
            <h3 className="fs-5 fw-bold text-body mb-2">Patient Authentication Required</h3>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '520px' }}>
              Your medical and demographic records are strictly isolated and protected. Please sign in to your verified patient account to access your medical file.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link to="/patient/login" className="neu-btn neu-btn-primary px-4 py-2">
                Sign In to Patient Portal
              </Link>
              <Link to="/patient/login?mode=register" className="neu-btn neu-btn-outline px-4 py-2">
                Register New Patient
              </Link>
            </div>
          </div>
        ) : profileLoading ? (
          <div className="neu-raised neu-surface rounded-4 p-5 text-center">
            <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
            <div className="text-muted small">Loading patient profile from database...</div>
          </div>
        ) : (
          <div className="neu-raised neu-surface rounded-4 p-4 p-md-5 mb-5">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 border-bottom pb-3 mb-4">
              <div>
                <h2 className="fs-6 fw-bold text-body mb-1">
                  {isEditing ? t('patient.editProfile') : t('patient.personalDetails')}
                </h2>
                <div className="small text-muted">
                  {isEditing
                    ? 'Update your contact and demographic information below.'
                    : t('common.verified')}
                </div>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-1"
                  onClick={() => {
                    setIsEditing(true);
                    setFeedbackNotice(null);
                  }}
                >
                  <Edit3 size={14} />
                  <span>{t('patient.editProfile')}</span>
                </button>
              )}
            </div>

            {!isEditing ? (
              /* VIEW MODE */
              <div className="row g-3 g-md-4">
                <div className="col-12 col-md-6">
                  <div className="neu-inset p-3 rounded-4 h-100">
                    <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2">Primary Identity</div>
                    <div className="mb-2">
                      <strong className="text-body">{t('patient.fullName')}: </strong>
                      <span className="text-muted">{patientProfile?.fullName || 'Not specified'}</span>
                    </div>
                    <div className="mb-2">
                      <strong className="text-body">MRN: </strong>
                      <span className="neu-badge neu-badge-primary">{patientProfile?.mrn || 'Pending'}</span>
                    </div>
                    <div className="mb-2">
                      <strong className="text-body">{t('patient.dob')}: </strong>
                      <span className="text-muted">{patientProfile?.dateOfBirth || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong className="text-body">{t('patient.gender')}: </strong>
                      <span className="text-muted">{patientProfile?.gender || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="neu-inset p-3 rounded-4 h-100">
                    <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2">Contact Details</div>
                    <div className="mb-2">
                      <strong className="text-body">{t('patient.mobile')}: </strong>
                      <span className="text-muted">{patientProfile?.mobile || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong className="text-body">{t('patient.email')}: </strong>
                      <span className="text-muted">{patientProfile?.email || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="neu-inset p-3 rounded-4 h-100">
                    <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2">{t('patient.address')}</div>
                    <div className="text-muted">
                      {patientProfile?.address || 'No residential address recorded.'}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="neu-inset p-3 rounded-4 h-100">
                    <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-2">{t('patient.emergencyContact')}</div>
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
                    <label htmlFor="edit-name" className="hospital-form-label mb-1">
                      {t('patient.fullName')} <span className="text-danger">*</span>
                    </label>
                    <div className="neu-inset rounded-3 p-1">
                      <input
                        id="edit-name"
                        type="text"
                        className="form-control bg-transparent border-0 shadow-none"
                        value={formData.fullName || ''}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                      />
                    </div>
                    {errors.fullName && <div className="text-danger small mt-1">{errors.fullName}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-mobile" className="hospital-form-label mb-1">
                      {t('patient.mobile')} <span className="text-danger">*</span>
                    </label>
                    <div className="neu-inset rounded-3 p-1">
                      <input
                        id="edit-mobile"
                        type="tel"
                        className="form-control bg-transparent border-0 shadow-none"
                        value={formData.mobile || ''}
                        onChange={(e) => handleChange('mobile', e.target.value)}
                      />
                    </div>
                    {errors.mobile && <div className="text-danger small mt-1">{errors.mobile}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-email" className="hospital-form-label mb-1">
                      {t('patient.email')} <span className="text-danger">*</span>
                    </label>
                    <div className="neu-inset rounded-3 p-1">
                      <input
                        id="edit-email"
                        type="email"
                        className="form-control bg-transparent border-0 shadow-none"
                        value={formData.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                    {errors.email && <div className="text-danger small mt-1">{errors.email}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-gender" className="hospital-form-label mb-1">
                      {t('patient.gender')}
                    </label>
                    <div className="neu-inset rounded-3 p-1">
                      <select
                        id="edit-gender"
                        className="form-select bg-transparent border-0 shadow-none"
                        value={formData.gender || 'OTHER'}
                        onChange={(e) => handleChange('gender', e.target.value)}
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-dob" className="hospital-form-label mb-1">
                      {t('patient.dob')}
                    </label>
                    <div className="neu-inset rounded-3 p-1">
                      <input
                        id="edit-dob"
                        type="date"
                        className="form-control bg-transparent border-0 shadow-none"
                        value={formData.dateOfBirth || ''}
                        onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="edit-emergency" className="hospital-form-label mb-1">
                      {t('patient.emergencyContact')}
                    </label>
                    <div className="neu-inset rounded-3 p-1">
                      <input
                        id="edit-emergency"
                        type="text"
                        className="form-control bg-transparent border-0 shadow-none"
                        value={formData.emergencyContact || ''}
                        onChange={(e) => handleChange('emergencyContact', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <label htmlFor="edit-address" className="hospital-form-label mb-1">
                      {t('patient.address')}
                    </label>
                    <div className="neu-inset rounded-3 p-1">
                      <input
                        id="edit-address"
                        type="text"
                        className="form-control bg-transparent border-0 shadow-none"
                        value={formData.address || ''}
                        onChange={(e) => handleChange('address', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-12 d-flex flex-wrap gap-2 pt-3 border-top mt-3">
                    <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm" disabled={isSaving}>
                      {isSaving ? 'Saving to Database...' : t('patient.saveChanges')}
                    </button>
                    <button type="button" className="neu-btn neu-btn-outline neu-btn-sm" onClick={handleCancelEdit} disabled={isSaving}>
                      {t('patient.cancelEdit')}
                    </button>
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
