import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  FileText, 
  Eye, 
  Edit3, 
  Power, 
  CheckCircle2, 
  X, 
  Tag, 
  Calendar 
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import { INITIAL_CONTENT_SECTIONS } from '../../data/adminData';

/**
 * Hospital Platform — Admin Public Website Content Management (Neumorphic Redesign)
 * Interface to configure institutional overviews, clinical facilities descriptions,
 * visiting policies, emergency hotlines, and public health advisories.
 */
export function AdminContentPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission: only Super Admin and Hospital Admin can manage website content
  if (currentRole && (currentRole.id === 'DOCTOR_STAFF' || currentRole.id === 'PATIENT')) {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Website Content Management"
        onSwitchRole={setRole}
      />
    );
  }

  // Local state for content sections
  const [sectionsList, setSectionsList] = useState(INITIAL_CONTENT_SECTIONS);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [viewSection, setViewSection] = useState(null);
  const [editSection, setEditSection] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Website Content Management' },
  ];

  // Filtered sections
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
        title="Public Website Content & Announcements"
        description="Institutional governance text, visiting policies, triage guidelines, and clinical facility documentation."
        breadcrumbs={breadcrumbs}
      />

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
        <div className="neu-table-container">
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
      </div>

      {/* Preview Section Modal */}
      {viewSection && (
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
                    Content Preview: {viewSection.title}
                  </h5>
                  <span className="small text-muted">
                    Category: {viewSection.category} • Key: <code>{viewSection.sectionKey}</code>
                  </span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
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
