import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Building,
  FileText, 
  Eye, 
  Edit3, 
  Power, 
  CheckCircle2, 
  X, 
  RotateCw, 
  Upload, 
  Trash2, 
  Save, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  ShieldAlert,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import hospitalService from '../../services/hospitalService';
import { INITIAL_CONTENT_SECTIONS } from '../../data/adminData';

/**
 * Hospital Platform — Admin Public Website & Hospital Profile Management (Neumorphic)
 * Provides centralized institutional governance:
 * 1. Live PostgreSQL-backed Hospital Profile (Legal entity, contact phones, OPD timings, logo).
 * 2. Website Content Sections (Triage rules, visiting policies, advisory announcements).
 */
export function AdminContentPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission: only Super Admin and Hospital Admin can manage hospital profile & content
  if (currentRole && (currentRole.id === 'DOCTOR_STAFF' || currentRole.id === 'PATIENT')) {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Hospital Profile & Content Management"
        onSwitchRole={setRole}
      />
    );
  }

  // Active Tab: 'profile' | 'sections'
  const [activeTab, setActiveTab] = useState('profile');

  // --- Hospital Profile State (PostgreSQL) ---
  const [hospitalProfile, setHospitalProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: '',
    legal_name: '',
    tagline: '',
    overview: '',
    contact_phone: '',
    emergency_phone: '',
    contact_email: '',
    address: '',
    visiting_hours: '',
    emergency_info: '',
  });


  // --- Website Sections State ---
  const [sectionsList, setSectionsList] = useState(INITIAL_CONTENT_SECTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewSection, setViewSection] = useState(null);
  const [editSection, setEditSection] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Lock body scroll and dismiss on Escape for glass modals
  useEffect(() => {
    const hasOpenModal = Boolean(viewSection || editSection);
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setViewSection(null);
          setEditSection(null);
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
  }, [viewSection, editSection]);

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Hospital Profile & Content' },
  ];

  // Fetch Hospital Profile on Mount
  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await hospitalService.getProfile();
      if (data) {
        setHospitalProfile(data);
        setProfileForm({
          name: data.name || '',
          legal_name: data.legal_name || '',
          tagline: data.tagline || '',
          overview: data.overview || '',
          contact_phone: data.contact_phone || '',
          emergency_phone: data.emergency_phone || '',
          contact_email: data.contact_email || '',
          address: data.address || '',
          visiting_hours: data.visiting_hours || '',
          emergency_info: data.emergency_info || '',
        });
      }
    } catch (err) {
      console.warn('Failed to load live hospital profile, using initial institutional profile:', err);
      const fallback = {
        id: 1,
        name: 'EgleSora Super Speciality Hospital',
        legal_name: 'EgleSora Healthcare Services Pvt Ltd',
        tagline: 'Excellence in Clinical Care & Patient Safety',
        overview: 'Tertiary healthcare institute committed to world-class clinical excellence and patient safety.',
        contact_phone: '+91 (0) 22 0000 2222',
        emergency_phone: '+91 (0) 22 0000 1111',
        contact_email: 'desk@eglesorahospital.org',
        address: '12 Medical District Avenue, City Center, Pune, Maharashtra 411001',
        visiting_hours: 'Monday - Saturday: 08:00 AM - 08:00 PM',
        emergency_info: '24/7 Acute trauma triage protocols and ambulance bay directions.',
        logo_url: null,
      };
      setHospitalProfile(fallback);
      setProfileForm(fallback);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Save Hospital Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!hospitalProfile?.id) return;
    setProfileSaving(true);
    try {
      const updated = await hospitalService.updateProfile(hospitalProfile.id, profileForm);
      setHospitalProfile(updated);
      setActionNotice('Hospital Profile and institutional details successfully updated in PostgreSQL database.');
    } catch (err) {
      setActionNotice(`Failed to save profile: ${err.message || 'Error saving changes'}`);
    } finally {
      setProfileSaving(false);
    }
  };

  // Upload Logo
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setActionNotice('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setLogoUploading(true);
    try {
      const res = await hospitalService.uploadLogo(file);
      if (res?.profile) {
        setHospitalProfile(res.profile);
      } else {
        await loadProfile();
      }
      setActionNotice('Hospital emblem updated successfully.');
    } catch (err) {
      setActionNotice(`Failed to upload logo: ${err.message || 'Upload failed'}`);
    } finally {
      setLogoUploading(false);
    }
  };

  // Delete Logo
  const handleDeleteLogo = async () => {
    if (!window.confirm('Are you sure you want to remove the hospital logo?')) return;
    try {
      await hospitalService.deleteLogo();
      await loadProfile();
      setActionNotice('Hospital emblem removed.');
    } catch (err) {
      setActionNotice(`Failed to remove logo: ${err.message}`);
    }
  };

  // Filtered sections for Tab 2
  const filteredSections = useMemo(() => {
    return sectionsList.filter((sec) => {
      const matchSearch =
        searchTerm === '' ||
        sec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sec.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sec.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        categoryFilter === 'ALL' || sec.category.toUpperCase() === categoryFilter.toUpperCase();

      return matchSearch && matchCategory;
    });
  }, [sectionsList, searchTerm, categoryFilter]);

  // Handle Toggle Status (Published/Draft)
  const handleToggleStatus = (secId) => {
    setSectionsList((prev) =>
      prev.map((s) => {
        if (s.id === secId) {
          const next = s.status === 'Published' ? 'Draft' : 'Published';
          setActionNotice(`Section "${s.title}" status changed to ${next} in local state.`);
          return { ...s, status: next };
        }
        return s;
      })
    );
  };

  // Handle Save Edit
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editSection) return;

    setSectionsList((prev) =>
      prev.map((s) =>
        s.id === editSection.id
          ? {
              ...editSection,
              lastUpdated: '2026-10-08',
            }
          : s
      )
    );

    setActionNotice(`Saved revisions to "${editSection.title}".`);
    setEditSection(null);
  };

  return (
    <div className="admin-content-view">
      <PageHeader
        title="Hospital Profile & Public Content"
        description="Institutional governance, official contacts, OPD hours, emblem, and patient advisory documentation."
        breadcrumbs={breadcrumbs}
      />

      {/* Action Notice Alert */}
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

      {/* Top Tab Navigation */}
      <div className="d-flex gap-2 mb-4">
        <button
          type="button"
          className={`neu-btn ${activeTab === 'profile' ? 'neu-btn-primary' : 'neu-btn-outline'}`}
          onClick={() => setActiveTab('profile')}
        >
          <Building size={16} className="me-2" />
          Hospital Profile & Governance (Live API)
        </button>
        <button
          type="button"
          className={`neu-btn ${activeTab === 'sections' ? 'neu-btn-primary' : 'neu-btn-outline'}`}
          onClick={() => setActiveTab('sections')}
        >
          <FileText size={16} className="me-2" />
          Public Content Sections
        </button>
      </div>

      {/* TAB 1: LIVE HOSPITAL PROFILE */}
      {activeTab === 'profile' && (
        <div>
          {profileLoading ? (
            <div className="neu-card p-5 text-center" style={{ borderRadius: '20px' }}>
              <RotateCw size={32} className="spin-anim mb-3 text-primary" />
              <div className="fw-semibold">Loading institutional profile from backend API...</div>
            </div>
          ) : profileError ? (
            <div className="neu-card p-4 text-center" style={{ borderRadius: '20px' }}>
              <AlertCircle size={32} className="mb-2 text-danger" />
              <div className="text-danger fw-semibold mb-3">{profileError}</div>
              <button type="button" className="neu-btn neu-btn-primary neu-btn-sm" onClick={loadProfile}>
                Retry Loading
              </button>
            </div>
          ) : (
            <div className="row g-4">
              {/* Left Column: Emblem / Logo Card */}
              <div className="col-12 col-lg-4">
                <div 
                  className="neu-card p-4 h-100 d-flex flex-column align-items-center text-center"
                  style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
                >
                  <h6 className="fw-bold mb-3" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Hospital Emblem / Logo
                  </h6>

                  <div 
                    className="p-3 mb-3 d-flex align-items-center justify-content-center overflow-hidden"
                    style={{ 
                      width: '160px', 
                      height: '160px', 
                      borderRadius: '24px', 
                      background: 'var(--hospital-bg)',
                      boxShadow: 'var(--neu-inset)',
                    }}
                  >
                    {hospitalProfile?.logo_url ? (
                      <img 
                        src={hospitalProfile.logo_url} 
                        alt="Hospital Emblem" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <Building size={54} color="var(--hospital-blue)" style={{ opacity: 0.6 }} />
                    )}
                  </div>

                  <p className="small text-muted mb-3" style={{ fontSize: '0.82rem' }}>
                    Uploaded logo renders on the public navbar, footer, and printable consultation slips.
                  </p>

                  <div className="d-flex flex-column gap-2 w-100">
                    <label 
                      className={`neu-btn neu-btn-outline neu-btn-sm w-100 text-center ${logoUploading ? 'disabled' : ''}`}
                      style={{ cursor: logoUploading ? 'not-allowed' : 'pointer' }}
                    >
                      <Upload size={14} className="me-2" />
                      {logoUploading ? 'Uploading...' : 'Replace Logo'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="d-none" 
                        onChange={handleLogoChange}
                        disabled={logoUploading}
                      />
                    </label>

                    {hospitalProfile?.logo_url && (
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm text-danger w-100"
                        onClick={handleDeleteLogo}
                      >
                        <Trash2 size={14} className="me-2" />
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Institutional Profile Form */}
              <div className="col-12 col-lg-8">
                <div 
                  className="neu-card p-4"
                  style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h6 className="fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                      Institutional Governance & Contacts
                    </h6>
                    <span className="neu-badge neu-badge-success">PostgreSQL Backed</span>
                  </div>

                  <form onSubmit={handleSaveProfile}>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="neu-form-label">Hospital Brand Name</label>
                        <input
                          type="text"
                          className="neu-input"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="neu-form-label">Legal Entity Name</label>
                        <input
                          type="text"
                          className="neu-input"
                          value={profileForm.legal_name}
                          onChange={(e) => setProfileForm({ ...profileForm, legal_name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12">
                        <label className="neu-form-label">Brand Tagline</label>
                        <input
                          type="text"
                          className="neu-input"
                          value={profileForm.tagline}
                          onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="neu-form-label">Primary Telephone</label>
                        <input
                          type="text"
                          className="neu-input"
                          value={profileForm.contact_phone}
                          onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="neu-form-label">Emergency Hotline (24x7)</label>
                        <input
                          type="text"
                          className="neu-input"
                          value={profileForm.emergency_phone}
                          onChange={(e) => setProfileForm({ ...profileForm, emergency_phone: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="neu-form-label">Official Contact Email</label>
                        <input
                          type="email"
                          className="neu-input"
                          value={profileForm.contact_email}
                          onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12">
                        <label className="neu-form-label">Physical Campus Address</label>
                        <input
                          type="text"
                          className="neu-input"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="neu-form-label">Visiting Hours & OPD Timings</label>
                        <input
                          type="text"
                          className="neu-input"
                          value={profileForm.visiting_hours}
                          onChange={(e) => setProfileForm({ ...profileForm, visiting_hours: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="neu-form-label">Emergency Protocol Summary</label>
                        <input
                          type="text"
                          className="neu-input"
                          value={profileForm.emergency_info}
                          onChange={(e) => setProfileForm({ ...profileForm, emergency_info: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-12">
                        <label className="neu-form-label">Institutional Overview & Mission</label>
                        <textarea
                          rows="4"
                          className="neu-textarea"
                          value={profileForm.overview}
                          onChange={(e) => setProfileForm({ ...profileForm, overview: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline"
                        onClick={loadProfile}
                        disabled={profileSaving}
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        className="neu-btn neu-btn-primary"
                        disabled={profileSaving}
                      >
                        <Save size={15} className="me-2" />
                        {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WEBSITE CONTENT SECTIONS */}
      {activeTab === 'sections' && (
        <div>
          {/* Filter Bar */}
          <AdminFilterBar
            searchPlaceholder="Search content sections by title, key, or category..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            hasActiveFilters={searchTerm !== '' || categoryFilter !== 'ALL'}
            onClear={() => {
              setSearchTerm('');
              setCategoryFilter('ALL');
            }}
          >
            <div className="col-12 col-sm-6 col-md-3">
              <select
                className="neu-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="ALL">All Categories</option>
                <option value="INSTITUTIONAL">Institutional</option>
                <option value="SERVICES">Services</option>
                <option value="PATIENT INFO">Patient Info</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="ADVISORIES">Advisories</option>
              </select>
            </div>
          </AdminFilterBar>

          {/* Content Sections Table */}
          <div 
            className="neu-card p-0 mb-4 overflow-hidden" 
            style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
          >
            {/* Desktop Table View */}
            <div className="neu-table-container d-none d-md-block">
              <table className="neu-table">
                <thead>
                  <tr>
                    <th className="col-content-title">Section Title & Key</th>
                    <th className="col-content-cat">Category</th>
                    <th className="col-content-summary">Summary Description</th>
                    <th className="col-content-updated">Last Revision</th>
                    <th className="col-content-status">Status</th>
                    <th className="col-content-actions text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSections.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        No content sections found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSections.map((sec) => (
                      <tr key={sec.id}>
                        <td>
                          <div className="fw-bold">{sec.title}</div>
                          <span 
                            className="px-2 py-0.5 rounded small font-monospace mt-1 d-inline-block"
                            style={{ 
                              background: 'var(--hospital-surface)', 
                              boxShadow: 'var(--neu-inset)',
                              fontSize: '0.72rem',
                              color: 'var(--hospital-blue)'
                            }}
                          >
                            {sec.sectionKey}
                          </span>
                        </td>
                        <td>
                          <span className="neu-badge neu-badge-info">{sec.category}</span>
                        </td>
                        <td>
                          <span className="small text-muted text-truncate d-inline-block" style={{ maxWidth: '280px' }}>
                            {sec.summary}
                          </span>
                        </td>
                        <td>
                          <span className="small text-muted">{sec.lastUpdated}</span>
                        </td>
                        <td>
                          <AdminStatusBadge status={sec.status} />
                        </td>
                        <td className="text-end">
                          <div className="neu-action-btns">
                            <button
                              type="button"
                              className="neu-btn neu-btn-outline neu-btn-sm"
                              onClick={() => setViewSection(sec)}
                              title="Preview content rendered"
                            >
                              <Eye size={13} className="me-1" />
                              Preview
                            </button>
                            <button
                              type="button"
                              className="neu-btn neu-btn-outline neu-btn-sm"
                              onClick={() => setEditSection(sec)}
                              title="Edit text content"
                            >
                              <Edit3 size={13} className="me-1" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`neu-btn neu-btn-sm ${
                                sec.status === 'Published' ? 'neu-btn-outline' : 'neu-btn-primary'
                              }`}
                              onClick={() => handleToggleStatus(sec.id)}
                              title={sec.status === 'Published' ? 'Set as Draft' : 'Publish Section'}
                            >
                              <Power size={13} className="me-1" />
                              {sec.status === 'Published' ? 'Unpublish' : 'Publish'}
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
              {filteredSections.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No content sections found matching your filter criteria.
                </div>
              ) : (
                filteredSections.map((sec) => (
                  <div key={sec.id} className="admin-mobile-card">
                    <div className="admin-mobile-card-row">
                      <div className="fw-bold fs-6" style={{ color: 'var(--hospital-primary-navy)' }}>
                        {sec.title}
                      </div>
                      <AdminStatusBadge status={sec.status} />
                    </div>

                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span 
                        className="px-2 py-0.5 rounded small font-monospace d-inline-block"
                        style={{ 
                          background: 'var(--hospital-surface)', 
                          boxShadow: 'var(--neu-inset)',
                          fontSize: '0.72rem',
                          color: 'var(--hospital-blue)'
                        }}
                      >
                        {sec.sectionKey}
                      </span>
                      <span className="neu-badge neu-badge-info">{sec.category}</span>
                    </div>

                    <div className="small text-muted mb-2">
                      {sec.summary}
                    </div>

                    <div className="small text-muted pt-2 border-top d-flex justify-content-between" style={{ borderColor: 'var(--glass-border)' }}>
                      <span>Last Revision:</span>
                      <span className="font-monospace">{sec.lastUpdated}</span>
                    </div>

                    <div className="admin-mobile-card-actions">
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm"
                        onClick={() => setViewSection(sec)}
                        title="Preview section content"
                      >
                        <Eye size={14} className="me-1" />
                        Preview
                      </button>
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm"
                        onClick={() => handleOpenEdit(sec)}
                        title="Edit section content"
                      >
                        <Edit3 size={14} className="me-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`neu-btn neu-btn-sm ${
                          sec.status === 'Published' ? 'neu-btn-outline' : 'neu-btn-primary'
                        }`}
                        onClick={() => handleToggleStatus(sec.id)}
                        title={sec.status === 'Published' ? 'Set as Draft' : 'Publish Section'}
                      >
                        <Power size={14} className="me-1" />
                        {sec.status === 'Published' ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Section Modal */}
      {viewSection && (
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
                    Content Preview: {viewSection.title}
                  </h5>
                  <span className="small text-muted">
                    Category: {viewSection.category} • Key: <code>{viewSection.sectionKey}</code>
                  </span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', padding: 0 }}
                  onClick={() => setViewSection(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <div 
                  className="p-3 neu-card-sm mb-3"
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="small text-muted fw-bold mb-1 text-uppercase">Public Summary</div>
                  <div className="small">{viewSection.summary}</div>
                </div>

                <div 
                  className="p-3 neu-card-sm mb-3"
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="small text-muted fw-bold mb-2 text-uppercase">Main Body Content</div>
                  <p className="small mb-0 text-muted" style={{ lineHeight: '1.6' }}>
                    {viewSection.contentBody}
                  </p>
                </div>

                {viewSection.highlights && viewSection.highlights.length > 0 && (
                  <div 
                    className="p-3 neu-card-sm"
                    style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                  >
                    <div className="small text-muted fw-bold mb-2 text-uppercase">Key Highlights</div>
                    <ul className="small mb-0 ps-3">
                      {viewSection.highlights.map((item, idx) => (
                        <li key={idx} className="mb-1">{item}</li>
                      ))}
                    </ul>
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
                  onClick={() => setViewSection(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editSection && (
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
              <form onSubmit={handleSaveEdit}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Edit Content: {editSection.title}
                  </h5>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setEditSection(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  <div className="mb-3">
                    <label className="neu-form-label">Section Title</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editSection.title}
                      onChange={(e) =>
                        setEditSection({ ...editSection, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Brief Summary</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editSection.summary}
                      onChange={(e) =>
                        setEditSection({ ...editSection, summary: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Main Content Text</label>
                    <textarea
                      rows="6"
                      className="neu-textarea"
                      value={editSection.contentBody}
                      onChange={(e) =>
                        setEditSection({ ...editSection, contentBody: e.target.value })
                      }
                      required
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
                    onClick={() => setEditSection(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm">
                    Save Changes
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

export default AdminContentPage;
