import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import { INITIAL_CONTENT_SECTIONS } from '../../data/adminData';

/**
 * Hospital Platform — Admin Public Website Content Management (Phase 8)
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
          setActionNotice(`Section "${s.title}" status changed to ${next} (local state).`);
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

    setActionNotice(`Saved revisions to "${editSection.title}" in local prototype state.`);
    setEditSection(null);
  };

  return (
    <div>
      <PageHeader
        title="Public Website Content & Announcements"
        description="Institutional governance text, visiting policies, triage guidelines, and clinical facility documentation."
        breadcrumbs={breadcrumbs}
      />

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

      {/* Filter Bar */}
      <AdminFilterBar
        searchPlaceholder="Search sections by title or keywords..."
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
            className="hospital-form-control"
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
      <div className="hospital-card p-0 mb-4 overflow-hidden">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Section Title</th>
                <th>Category</th>
                <th>Summary Description</th>
                <th>Last Revision</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No content sections found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSections.map((sec) => (
                  <tr key={sec.id}>
                    <td>
                      <div className="fw-bold">{sec.title}</div>
                      <code>{sec.sectionKey}</code>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{sec.category}</span>
                    </td>
                    <td>
                      <span className="small text-muted">{sec.summary}</span>
                    </td>
                    <td>
                      <span className="small text-muted">{sec.lastUpdated}</span>
                    </td>
                    <td>
                      <AdminStatusBadge status={sec.status} />
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                        onClick={() => setViewSection(sec)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                        onClick={() => setEditSection(sec)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`hospital-btn hospital-btn-sm ${
                          sec.status === 'Published' ? 'btn-outline-warning' : 'btn-outline-success'
                        }`}
                        onClick={() => handleToggleStatus(sec.id)}
                      >
                        {sec.status === 'Published' ? 'Unpublish' : 'Publish'}
                      </button>
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fs-6 fw-bold mb-0">
                    Content Preview: {viewSection.title}
                  </h5>
                  <span className="small text-muted">
                    Category: {viewSection.category} • Key: <code>{viewSection.sectionKey}</code>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewSection(null)}
                />
              </div>
              <div className="modal-body">
                <div className="p-3 bg-light rounded border mb-3">
                  <div className="small text-muted fw-bold mb-1">Public Summary</div>
                  <div className="small">{viewSection.summary}</div>
                </div>

                <div className="p-3 bg-white rounded border mb-3">
                  <div className="small text-muted fw-bold mb-2">Main Body Content</div>
                  <p className="small mb-0 text-dark" style={{ lineHeight: '1.6' }}>
                    {viewSection.contentBody}
                  </p>
                </div>

                {viewSection.highlights && viewSection.highlights.length > 0 && (
                  <div className="p-3 bg-light rounded border">
                    <div className="small text-muted fw-bold mb-2">Key Highlights / Bullet Items</div>
                    <ul className="small mb-0 ps-3">
                      {viewSection.highlights.map((item, idx) => (
                        <li key={idx} className="mb-1">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="hospital-btn hospital-btn-outline hospital-btn-sm"
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSaveEdit}>
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fw-bold">
                    Edit Content: {editSection.title}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditSection(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label">Section Title</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={editSection.title}
                      onChange={(e) =>
                        setEditSection({ ...editSection, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Brief Summary</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={editSection.summary}
                      onChange={(e) =>
                        setEditSection({ ...editSection, summary: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Main Content Text</label>
                    <textarea
                      rows="5"
                      className="hospital-form-control"
                      value={editSection.contentBody}
                      onChange={(e) =>
                        setEditSection({ ...editSection, contentBody: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="hospital-btn hospital-btn-outline hospital-btn-sm"
                    onClick={() => setEditSection(null)}
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
    </div>
  );
}

export default AdminContentPage;
