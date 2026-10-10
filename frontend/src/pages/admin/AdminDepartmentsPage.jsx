import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import departmentService from '../../services/departmentService';
import { DEMO_DEPARTMENTS } from '../../data/hospitalData';

/**
 * Hospital Platform — Admin Departments Management Page (Phase 8)
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
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <PageHeader
          title="Clinical Department Directory"
          description="Specialty wings, clinical services, outpatient hours, and departmental contacts."
          breadcrumbs={breadcrumbs}
          className="mb-0"
        />
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
          + Add New Department
        </Button>
      </div>

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
            className="hospital-form-control"
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
      <div className="hospital-card p-0 mb-4 overflow-hidden">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Specialty Domain</th>
                <th>OPD Hours</th>
                <th>Facility Location</th>
                <th>Doctors Roster</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No departments match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <div className="fw-bold">{dept.name}</div>
                      <div className="small text-muted">{dept.contact?.phone || 'Main Switchboard'}</div>
                    </td>
                    <td>
                      <span className="fw-semibold text-primary">{dept.specialty}</span>
                    </td>
                    <td>
                      <span className="small text-muted">{dept.opdHours}</span>
                    </td>
                    <td>
                      <span className="small">{dept.contact?.location || 'Clinical Wing'}</span>
                    </td>
                    <td>
                      <span className="hospital-badge hospital-badge-scheduled">
                        {dept.doctorIds?.length || 0} Consultants
                      </span>
                    </td>
                    <td>
                      <AdminStatusBadge status={dept.status} />
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                        onClick={() => setViewDepartment(dept)}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm me-1"
                        onClick={() => setEditDepartment(dept)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`hospital-btn hospital-btn-sm ${
                          dept.status === 'Active' ? 'btn-outline-danger' : 'btn-outline-success'
                        }`}
                        onClick={() => handleToggleStatus(dept.id)}
                      >
                        {dept.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fs-6 fw-bold mb-0">{viewDepartment.name}</h5>
                  <span className="small text-muted">{viewDepartment.specialty}</span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewDepartment(null)}
                />
              </div>
              <div className="modal-body">
                <div className="p-3 bg-light rounded border mb-3">
                  <div className="small text-muted fw-bold mb-1">Clinical Overview</div>
                  <p className="small mb-0 text-muted">{viewDepartment.fullDescription || viewDepartment.shortDescription}</p>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <div className="small text-muted fw-bold mb-2">Location & Contact</div>
                      <div className="small"><strong>Location:</strong> {viewDepartment.contact?.location}</div>
                      <div className="small"><strong>Phone:</strong> {viewDepartment.contact?.phone}</div>
                      <div className="small"><strong>Email:</strong> {viewDepartment.contact?.email}</div>
                      <div className="small"><strong>OPD Hours:</strong> {viewDepartment.opdHours}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <div className="small text-muted fw-bold mb-2">Clinical Services</div>
                      <ul className="small mb-0 ps-3">
                        {viewDepartment.services?.map((svc, idx) => (
                          <li key={idx}>{svc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="hospital-btn hospital-btn-outline hospital-btn-sm"
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSaveEdit}>
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fw-bold">Edit Department Details</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditDepartment(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label">Department Name</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={editDepartment.name}
                      onChange={(e) =>
                        setEditDepartment({ ...editDepartment, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Specialty</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={editDepartment.specialty}
                      onChange={(e) =>
                        setEditDepartment({ ...editDepartment, specialty: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">OPD Hours</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={editDepartment.opdHours}
                      onChange={(e) =>
                        setEditDepartment({ ...editDepartment, opdHours: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Location</label>
                    <input
                      type="text"
                      className="hospital-form-control"
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
                <div className="modal-footer">
                  <button
                    type="button"
                    className="hospital-btn hospital-btn-outline hospital-btn-sm"
                    onClick={() => setEditDepartment(null)}
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

      {/* Add Department Modal */}
      {showAddModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAddDepartment}>
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fw-bold">Register New Department</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAddModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label">
                      Department Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="e.g. Ophthalmology & Vision Care"
                      value={newDeptForm.name}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">
                      Specialty Domain <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="e.g. Ophthalmology"
                      value={newDeptForm.specialty}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, specialty: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Location / Wing</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="e.g. Wing D, 2nd Floor, Suite 210"
                      value={newDeptForm.location}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, location: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">OPD Hours</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={newDeptForm.opdHours}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, opdHours: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Direct Phone</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      value={newDeptForm.phone}
                      onChange={(e) =>
                        setNewDeptForm({ ...newDeptForm, phone: e.target.value })
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
