import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import patientService from '../../services/patientService';
import { INITIAL_DEMO_PATIENTS } from '../../data/adminData';

/**
 * Hospital Platform — Admin Patients Management Page (Phase 8)
 * Registry of registered patients and outpatient files.
 * Uses fictional demo records only; strict data privacy notice displayed.
 */
export function AdminPatientsPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Check role permission
  if (currentRole && currentRole.id === 'PATIENT') {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Patients Management"
        onSwitchRole={setRole}
      />
    );
  }

  // Local state for patients list
  const [patientsList, setPatientsList] = useState(INITIAL_DEMO_PATIENTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    patientService
      .getPatients({ page_size: 100 })
      .then((res) => {
        if (!isMounted) return;
        if (res?.results && res.results.length > 0) {
          setPatientsList((prev) => {
            const serverIds = new Set(res.results.map((p) => String(p.id)));
            const existingNonDuplicates = prev.filter((p) => !serverIds.has(String(p.id)));
            return [...res.results, ...existingNonDuplicates];
          });
        }
      })
      .catch((err) => {
        console.warn('Could not load patients from API in AdminPatientsPage:', err);
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
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [viewPatient, setViewPatient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Add Patient Form State
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    dateOfBirth: '1990-01-01',
    gender: 'Female',
    contact: '',
    email: '',
    address: '',
    emergencyContact: '',
    bloodGroup: 'O+',
  });

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Patient Directory' },
  ];

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patientsList.filter((pat) => {
      const matchSearch =
        searchTerm === '' ||
        (pat.name && pat.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pat.mrn && pat.mrn.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pat.contact && pat.contact.includes(searchTerm)) ||
        (pat.email && pat.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchGender =
        genderFilter === 'ALL' || (pat.gender && pat.gender.toUpperCase() === genderFilter.toUpperCase());

      const matchStatus =
        statusFilter === 'ALL' || (pat.status && pat.status.toUpperCase() === statusFilter.toUpperCase());

      return matchSearch && matchGender && matchStatus;
    });
  }, [patientsList, searchTerm, genderFilter, statusFilter]);

  // Handle Add Patient
  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!newPatientForm.name || !newPatientForm.contact) return;

    try {
      const savedPatient = await patientService.createPatient(newPatientForm);
      setPatientsList((prev) => [savedPatient, ...prev]);
      setActionNotice(`Registered new patient ${savedPatient.name} with MRN ${savedPatient.mrn} in database.`);
    } catch (err) {
      const newId = `PAT-${4400 + patientsList.length + 1}`;
      const newMRN = `MRN-2026-${4400 + patientsList.length + 1}`;

      const newPatObj = {
        id: newId,
        mrn: newMRN,
        name: newPatientForm.name,
        dateOfBirth: newPatientForm.dateOfBirth,
        age: 2026 - parseInt(newPatientForm.dateOfBirth.slice(0, 4), 10) || 30,
        gender: newPatientForm.gender,
        contact: newPatientForm.contact,
        email: newPatientForm.email || 'patient@example.com',
        address: newPatientForm.address || 'Mumbai, Maharashtra',
        emergencyContact: newPatientForm.emergencyContact || 'Guardian / Relative',
        bloodGroup: newPatientForm.bloodGroup,
        registrationDate: '2026-10-08',
        appointmentCount: 0,
        lastAppointmentDate: 'None',
        status: 'Active',
      };

      setPatientsList((prev) => [newPatObj, ...prev]);
      setActionNotice(
        `Registered new patient ${newPatObj.name} with ${newPatObj.mrn} (${err.message || 'Updated locally'}).`
      );
    }

    setShowAddModal(false);
    setNewPatientForm({
      name: '',
      dateOfBirth: '1990-01-01',
      gender: 'Female',
      contact: '',
      email: '',
      address: '',
      emergencyContact: '',
      bloodGroup: 'O+',
    });
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <PageHeader
          title="Patient Directory & Registration Files"
          description="Fictional outpatient records, medical record numbers (MRNs), contact data, and consultation counts."
          breadcrumbs={breadcrumbs}
          className="mb-0"
        />
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
          + Register New Patient
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

      {/* Filter and Search Bar */}
      <AdminFilterBar
        searchPlaceholder="Search by patient name, MRN, mobile, or email..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        hasActiveFilters={searchTerm !== '' || genderFilter !== 'ALL' || statusFilter !== 'ALL'}
        onClear={() => {
          setSearchTerm('');
          setGenderFilter('ALL');
          setStatusFilter('ALL');
        }}
      >
        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="hospital-form-control"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            aria-label="Filter by gender"
          >
            <option value="ALL">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>

        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="hospital-form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by patient status"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </AdminFilterBar>

      {/* Patients Table */}
      <div className="hospital-card p-0 mb-4 overflow-hidden">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>MRN</th>
                <th>Patient Name</th>
                <th>Demographics</th>
                <th>Contact & Email</th>
                <th>Registration</th>
                <th>Visits</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    No patient records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((pat) => (
                  <tr key={pat.id}>
                    <td>
                      <div className="fw-bold">
                        <code>{pat.mrn}</code>
                      </div>
                      <span className="small text-muted">Blood: {pat.bloodGroup}</span>
                    </td>
                    <td>
                      <div className="fw-bold">{pat.name}</div>
                      <span className="small text-muted">{pat.address.split(',')[0]}</span>
                    </td>
                    <td>
                      <div className="small fw-semibold">{pat.gender}</div>
                      <span className="small text-muted">{pat.age} yrs ({pat.dateOfBirth})</span>
                    </td>
                    <td>
                      <div className="small fw-semibold">{pat.contact}</div>
                      <span className="small text-muted">{pat.email}</span>
                    </td>
                    <td>
                      <span className="small text-muted">{pat.registrationDate}</span>
                    </td>
                    <td>
                      <span className="hospital-badge hospital-badge-scheduled">
                        {pat.appointmentCount} Visits
                      </span>
                    </td>
                    <td>
                      <AdminStatusBadge status={pat.status} />
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="hospital-btn hospital-btn-outline hospital-btn-sm"
                        onClick={() => setViewPatient(pat)}
                      >
                        View Record
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Patient Details Modal */}
      {viewPatient && (
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
                    Patient File: {viewPatient.name} ({viewPatient.mrn})
                  </h5>
                  <span className="small text-muted">Registered: {viewPatient.registrationDate}</span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewPatient(null)}
                />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <div className="small text-muted fw-bold mb-2">Demographic Profile</div>
                      <div className="small"><strong>Full Name:</strong> {viewPatient.name}</div>
                      <div className="small"><strong>Date of Birth:</strong> {viewPatient.dateOfBirth} ({viewPatient.age} years)</div>
                      <div className="small"><strong>Gender:</strong> {viewPatient.gender}</div>
                      <div className="small"><strong>Blood Group:</strong> {viewPatient.bloodGroup}</div>
                      <div className="small"><strong>File Status:</strong> {viewPatient.status}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <div className="small text-muted fw-bold mb-2">Contact & Emergency Details</div>
                      <div className="small"><strong>Mobile Phone:</strong> {viewPatient.contact}</div>
                      <div className="small"><strong>Email Address:</strong> {viewPatient.email}</div>
                      <div className="small"><strong>Residential Address:</strong> {viewPatient.address}</div>
                      <div className="small"><strong>Emergency Contact:</strong> {viewPatient.emergencyContact}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-light rounded border">
                  <div className="small text-muted fw-bold mb-1">Clinical Utilization History</div>
                  <div className="small">Total Hospital Consultations: <strong>{viewPatient.appointmentCount}</strong></div>
                  <div className="small">Most Recent Outpatient Visit: <strong>{viewPatient.lastAppointmentDate}</strong></div>
                  <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                    * Pure prototype simulation. Fictional patient demographics used to evaluate administrative navigation.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="hospital-btn hospital-btn-outline hospital-btn-sm"
                  onClick={() => setViewPatient(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register New Patient Modal */}
      {showAddModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAddPatient}>
                <div className="modal-header">
                  <h5 className="modal-title fs-6 fw-bold">Register Outpatient File</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAddModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="hospital-form-label">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="e.g. Meenakshi Sundaram"
                      value={newPatientForm.name}
                      onChange={(e) =>
                        setNewPatientForm({ ...newPatientForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="hospital-form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="hospital-form-control"
                        value={newPatientForm.dateOfBirth}
                        onChange={(e) =>
                          setNewPatientForm({ ...newPatientForm, dateOfBirth: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-6">
                      <label className="hospital-form-label">Gender</label>
                      <select
                        className="hospital-form-control"
                        value={newPatientForm.gender}
                        onChange={(e) =>
                          setNewPatientForm({ ...newPatientForm, gender: e.target.value })
                        }
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="hospital-form-label">
                        Mobile Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="hospital-form-control"
                        placeholder="9876543210"
                        value={newPatientForm.contact}
                        onChange={(e) =>
                          setNewPatientForm({ ...newPatientForm, contact: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="hospital-form-label">Blood Group</label>
                      <select
                        className="hospital-form-control"
                        value={newPatientForm.bloodGroup}
                        onChange={(e) =>
                          setNewPatientForm({ ...newPatientForm, bloodGroup: e.target.value })
                        }
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Email Address</label>
                    <input
                      type="email"
                      className="hospital-form-control"
                      placeholder="patient@example.com"
                      value={newPatientForm.email}
                      onChange={(e) =>
                        setNewPatientForm({ ...newPatientForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="hospital-form-label">Emergency Contact</label>
                    <input
                      type="text"
                      className="hospital-form-control"
                      placeholder="e.g. S. Sundaram (+91 98765 00000) - Spouse"
                      value={newPatientForm.emergencyContact}
                      onChange={(e) =>
                        setNewPatientForm({ ...newPatientForm, emergencyContact: e.target.value })
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
                    Register File
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

export default AdminPatientsPage;
