import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Eye, 
  Edit3, 
  Power, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Users 
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import departmentService from '../../services/departmentService';
import { DEMO_DEPARTMENTS } from '../../data/hospitalData';

/**
 * Hospital Platform — Admin Departments Management Page (Neumorphic Redesign)
 * Departmental roster, clinical service suites, OPD timings, and facility contacts.
 */
export function AdminDepartmentsPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission
  if (currentRole && currentRole.id === 'PATIENT') {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Departments Management"
        onSwitchRole={setRole}
      />
    );
  }

  // Local state for departments
  const [departmentsList, setDepartmentsList] = useState(() =>
    DEMO_DEPARTMENTS.map((dept) => ({
      ...dept,
      status: dept.status || 'Active',
    }))
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    departmentService
      .getDepartments()
      .then((serverDepts) => {
        if (!isMounted) return;
        if (serverDepts && serverDepts.length > 0) {
          setDepartmentsList((prev) => {
            const serverSlugs = new Set(serverDepts.map((d) => d.slug || d.id));
            const existingNonDuplicates = prev.filter((d) => !serverSlugs.has(d.slug || d.id));
            return [...serverDepts, ...existingNonDuplicates];
          });
        }
      })
      .catch((err) => {
        console.warn('Could not load departments from API in AdminDepartmentsPage:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [viewDepartment, setViewDepartment] = useState(null);
  const [editDepartment, setEditDepartment] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Add form state
  const [newDeptForm, setNewDeptForm] = useState({
    name: '',
    specialty: '',
    shortDescription: '',
    opdHours: 'Mon - Sat: 09:00 AM - 04:00 PM',
    location: '',
    phone: '+91 (0) 22 0000 2200',
  });

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Department Directory' },
  ];

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    return departmentsList.filter((dept) => {
      const matchSearch =
        searchTerm === '' ||
        (dept.name && dept.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dept.specialty && dept.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dept.shortDescription && dept.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        selectedStatus === 'ALL' || (dept.status && dept.status.toUpperCase() === selectedStatus.toUpperCase());

      return matchSearch && matchStatus;
    });
  }, [departmentsList, searchTerm, selectedStatus]);

  // Toggle status
  const handleToggleStatus = async (deptId) => {
    const dept = departmentsList.find((d) => d.id === deptId || d.slug === deptId);
    if (!dept) return;
    const nextStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    const nextIsActive = nextStatus === 'Active';

    try {
      const targetIdentifier = dept.slug || dept.id;
      const updated = await departmentService.updateDepartment(targetIdentifier, {
        is_active: nextIsActive,
      });
      setDepartmentsList((prev) =>
        prev.map((d) => (d.id === deptId || d.slug === deptId ? { ...d, ...updated } : d))
      );
      setActionNotice(`Department "${dept.name}" status updated to ${nextStatus} in database.`);
    } catch (err) {
      setDepartmentsList((prev) =>
        prev.map((d) => {
          if (d.id === deptId || d.slug === deptId) {
            return { ...d, status: nextStatus, is_active: nextIsActive };
          }
          return d;
        })
      );
      setActionNotice(
        `Department "${dept.name}" status updated to ${nextStatus} (${err.message || 'Updated locally'}).`
      );
    }
  };

  // Handle Edit Save
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDepartment) return;

    try {
      const targetIdentifier = editDepartment.slug || editDepartment.id;
      const updated = await departmentService.updateDepartment(targetIdentifier, {
        name: editDepartment.name,
        specialty: editDepartment.specialty,
        short_description: editDepartment.shortDescription,
        opd_hours: editDepartment.opdHours,
        location: editDepartment.location || editDepartment.contact?.location,
      });
      setDepartmentsList((prev) =>
        prev.map((d) =>
          d.id === editDepartment.id || d.slug === editDepartment.slug ? { ...d, ...updated } : d
        )
      );
      setActionNotice(`Department "${editDepartment.name}" updated in database.`);
    } catch (err) {
      setDepartmentsList((prev) =>
        prev.map((d) => (d.id === editDepartment.id ? { ...d, ...editDepartment } : d))
      );
      setActionNotice(
        `Department "${editDepartment.name}" updated (${err.message || 'Updated locally'}).`
      );
    }
    setEditDepartment(null);
  };

  // Handle Add Department
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptForm.name || !newDeptForm.specialty) return;

    const slug = newDeptForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      const savedDept = await departmentService.createDepartment(newDeptForm);
      setDepartmentsList((prev) => [savedDept, ...prev]);
      setActionNotice(`Department "${savedDept.name}" created in database.`);
    } catch (err) {
      const newDeptObj = {
        id: slug,
        slug,
        name: newDeptForm.name,
        specialty: newDeptForm.specialty,
        shortDescription: newDeptForm.shortDescription || 'Specialized clinical hospital department.',
        fullDescription: newDeptForm.shortDescription || 'Specialized clinical hospital department.',
        services: ['Outpatient Clinical Consultation', 'Diagnostic Evaluations'],
        opdHours: newDeptForm.opdHours,
        contact: {
          location: newDeptForm.location || 'Hospital Main Building',
          phone: newDeptForm.phone,
          email: `${slug}@eglesorahospital.org`,
        },
        doctorIds: [],
        status: 'Active',
      };
      setDepartmentsList((prev) => [newDeptObj, ...prev]);
      setActionNotice(`Department "${newDeptObj.name}" created (${err.message || 'Updated locally'}).`);
    }

    setShowAddModal(false);
    setNewDeptForm({
      name: '',
      specialty: '',
      shortDescription: '',
      opdHours: 'Mon - Sat: 09:00 AM - 04:00 PM',
      location: '',
      phone: '+91 (0) 22 0000 2200',
    });
  };

  return (
    <div className="admin-departments-view">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <PageHeader
          title="Clinical Department Directory"
          description="Specialty wings, clinical services, outpatient hours, and departmental contacts."
          breadcrumbs={breadcrumbs}
          className="mb-0"
        />
        <button 
          type="button" 
          className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} />
          Add New Department
        </button>
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

      {/* Filter Bar */}
      <AdminFilterBar
        searchPlaceholder="Search departments by name or specialty..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        hasActiveFilters={searchTerm !== '' || selectedStatus !== 'ALL'}
        onClear={() => {
          setSearchTerm('');
          setSelectedStatus('ALL');
        }}
      >
        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="neu-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by department status"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </AdminFilterBar>

      {/* Departments Table */}
      <div 
        className="neu-card p-0 mb-4 overflow-hidden" 
        style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
      >
        <div className="neu-table-container">
          <table className="neu-table">
            <thead>
              <tr>
                <th className="col-dept-name">Department</th>
                <th className="col-dept-specialty">Specialty Domain</th>
                <th className="col-dept-hours">OPD Hours</th>
                <th className="col-dept-location">Facility Location</th>
                <th className="col-dept-faculty">Faculty</th>
                <th className="col-status">Status</th>
                <th className="col-dept-actions text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <RotateCw size={24} className="spin-anim mb-2 text-primary" />
                    <div>Loading department directory...</div>
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <AlertCircle size={28} className="mb-2 text-muted" />
                    <div className="fw-semibold">No departments match your search criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept.id || dept.slug}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div 
                          className="d-flex align-items-center justify-content-center"
                          style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '12px', 
                            background: 'var(--hospital-surface)', 
                            boxShadow: 'var(--neu-inset)', 
                            color: 'var(--hospital-cyan)',
                            flexShrink: 0
                          }}
                        >
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div className="fw-bold">{dept.name}</div>
                          <div className="small text-muted">{dept.contact?.phone || 'Direct line active'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="fw-semibold text-primary">{dept.specialty}</span>
                    </td>
                    <td>
                      <span className="small text-muted">{dept.opdHours || 'Mon - Sat: 09:00 - 17:00'}</span>
                    </td>
                    <td>
                      <span className="small">{dept.contact?.location || 'Clinical Wing'}</span>
                    </td>
                    <td>
                      <span className="neu-badge neu-badge-info">
                        {dept.doctorIds?.length || 0} Consultants
                      </span>
                    </td>
                    <td>
                      <AdminStatusBadge status={dept.status} />
                    </td>
                    <td className="text-end">
                      <div className="neu-action-btns">
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => setViewDepartment(dept)}
                          title="View clinical scope & services"
                        >
                          <Eye size={13} className="me-1" />
                          Details
                        </button>
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => setEditDepartment(dept)}
                          title="Edit department info"
                        >
                          <Edit3 size={13} className="me-1" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`neu-btn neu-btn-sm ${
                            dept.status === 'Active' ? 'neu-btn-danger' : 'neu-btn-primary'
                          }`}
                          onClick={() => handleToggleStatus(dept.id || dept.slug)}
                          title={dept.status === 'Active' ? 'Deactivate wing' : 'Activate wing'}
                        >
                          <Power size={13} className="me-1" />
                          {dept.status === 'Active' ? 'Deactivate' : 'Activate'}
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

      {/* View Department Details Modal */}
      {viewDepartment && (
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
                    {viewDepartment.name}
                  </h5>
                  <span className="small text-muted">{viewDepartment.specialty}</span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setViewDepartment(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <div 
                  className="p-3 neu-card-sm mb-3"
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="small text-muted fw-bold mb-1 text-uppercase">Clinical Overview</div>
                  <p className="small mb-0 text-muted">{viewDepartment.fullDescription || viewDepartment.shortDescription || 'Specialized clinical hospital department offering state-of-the-art diagnostics and inpatient/outpatient treatment.'}</p>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold mb-2 text-uppercase">Location & Contact</div>
                      <div className="small mb-1"><strong>Location:</strong> {viewDepartment.contact?.location || 'Clinical Wing'}</div>
                      <div className="small mb-1"><strong>Phone:</strong> {viewDepartment.contact?.phone || '+91 (0) 22 0000 2200'}</div>
                      <div className="small mb-1"><strong>Email:</strong> {viewDepartment.contact?.email || 'department@eglesorahospital.org'}</div>
                      <div className="small"><strong>OPD Hours:</strong> {viewDepartment.opdHours || 'Mon - Sat: 09:00 - 17:00'}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold mb-2 text-uppercase">Clinical Services</div>
                      <ul className="small mb-0 ps-3">
                        {(viewDepartment.services || ['Outpatient Clinical Consultation', 'Diagnostic Evaluations', 'Preventive Screenings']).map((svc, idx) => (
                          <li key={idx} className="mb-1">{svc}</li>
                        ))}
                      </ul>
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
                  onClick={() => setViewDepartment(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editDepartment && (
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
                    Edit Department Details
                  </h5>
                  <button
                    type="button"
                    className="neu-btn-icon"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setEditDepartment(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                  <div className="mb-3">
                    <label className="neu-form-label">Department Name</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editDepartment.name}
                      onChange={(e) =>
                        setEditDepartment({ ...editDepartment, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Specialty Domain</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editDepartment.specialty}
                      onChange={(e) =>
                        setEditDepartment({ ...editDepartment, specialty: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">OPD Hours</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editDepartment.opdHours}
                      onChange={(e) =>
                        setEditDepartment({ ...editDepartment, opdHours: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Location / Wing</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={editDepartment.contact?.location || ''}
                      onChange={(e) =>
                        setEditDepartment({
                          ...editDepartment,
                          contact: { ...editDepartment.contact, location: e.target.value },
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
                    onClick={() => setEditDepartment(null)}
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

      {/* Add Department Modal */}
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
              <form onSubmit={handleAddDepartment}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Register New Department
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
                      Department Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="e.g. Ophthalmology & Vision Care"
                      value={newDeptForm.name}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">
                      Specialty Domain <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="e.g. Ophthalmology"
                      value={newDeptForm.specialty}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, specialty: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Location / Wing</label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="e.g. Wing D, 2nd Floor, Suite 210"
                      value={newDeptForm.location}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, location: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">OPD Hours</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={newDeptForm.opdHours}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, opdHours: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Direct Phone</label>
                    <input
                      type="text"
                      className="neu-input"
                      value={newDeptForm.phone}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, phone: e.target.value })
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
                  <button type="submit" className="neu-btn neu-btn-primary neu-btn-sm">
                    Add Department
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

export default AdminDepartmentsPage;
