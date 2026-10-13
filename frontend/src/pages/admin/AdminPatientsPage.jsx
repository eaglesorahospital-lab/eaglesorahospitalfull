import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  HeartPulse, 
  Calendar 
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import patientService from '../../services/patientService';
import { INITIAL_DEMO_PATIENTS } from '../../data/adminData';

/**
 * Hospital Platform — Admin Patients Management Page (Neumorphic Redesign)
 * Registry of registered patients and outpatient clinical files.
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
    <div className="admin-patients-view">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <PageHeader
          title="Patient Directory & Registration Files"
          description="Outpatient medical files, MRN registries, contact telemetry, and appointment counts."
          breadcrumbs={breadcrumbs}
          className="mb-0"
        />
        <button 
          type="button" 
          className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={16} />
          Register New Patient
        </button>
      </div>

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
            className="neu-select"
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
            className="neu-select"
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
      <div 
        className="neu-card p-0 mb-4 overflow-hidden" 
        style={{ borderRadius: '20px', background: 'var(--hospital-surface)' }}
      >
        <div className="neu-table-container">
          <table className="neu-table">
            <thead>
              <tr>
                <th className="col-mrn">MRN & Blood</th>
                <th className="col-patient">Patient Details</th>
                <th className="col-demographics">Demographics</th>
                <th className="col-contact">Contact & Email</th>
                <th className="col-reg-date">Registration</th>
                <th className="col-consultations">Consultations</th>
                <th className="col-status">Status</th>
                <th className="col-actions text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <RotateCw size={24} className="spin-anim mb-2 text-primary" />
                    <div>Loading patient directory...</div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <AlertCircle size={28} className="mb-2 text-muted" />
                    <div className="fw-semibold">No patient records match the selected filter criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((pat) => (
                  <tr key={pat.id}>
                    <td className="col-mrn">
                      <span 
                        className="px-2.5 py-1 rounded small fw-bold font-monospace d-inline-block mb-1"
                        style={{ 
                          background: 'var(--hospital-surface)', 
                          boxShadow: 'var(--neu-inset)',
                          fontSize: '0.785rem',
                          color: 'var(--hospital-medical-blue)'
                        }}
                      >
                        {pat.mrn}
                      </span>
                      <div className="small text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                        Blood: <strong className="text-body">{pat.bloodGroup || 'O+'}</strong>
                      </div>
                    </td>
                    <td className="col-patient">
                      <div className="fw-bold fs-6" style={{ color: 'var(--hospital-primary-navy)' }}>
                        {pat.name}
                      </div>
                      <span className="small text-muted d-block mt-0.5">
                        {pat.address ? pat.address.split(',')[0] : 'Mumbai, Maharashtra'}
                      </span>
                    </td>
                    <td className="col-demographics">
                      <div className="small fw-bold text-body">{pat.gender}</div>
                      <span className="small text-muted d-block mt-0.5">
                        {pat.age} yrs ({pat.dateOfBirth})
                      </span>
                    </td>
                    <td className="col-contact">
                      <div className="small fw-semibold text-body">{pat.contact}</div>
                      <span className="small text-muted text-break d-block mt-0.5" style={{ maxWidth: '210px' }}>
                        {pat.email}
                      </span>
                    </td>
                    <td className="col-reg-date">
                      <span className="small text-muted font-monospace">
                        {pat.registrationDate || '2026-10-08'}
                      </span>
                    </td>
                    <td className="col-consultations">
                      <span className="neu-badge neu-badge-info fw-bold">
                        {pat.appointmentCount || 0} Visits
                      </span>
                    </td>
                    <td className="col-status">
                      <AdminStatusBadge status={pat.status || 'Active'} />
                    </td>
                    <td className="col-actions text-end text-nowrap">
                      <div className="neu-action-btns">
                        <button
                          type="button"
                          className="neu-btn neu-btn-outline neu-btn-sm"
                          onClick={() => setViewPatient(pat)}
                          title="View complete outpatient file"
                        >
                          <Eye size={13} className="me-1" />
                          View File
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

      {/* View Patient Details Modal */}
      {viewPatient && (
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
                    Patient File: {viewPatient.name} ({viewPatient.mrn})
                  </h5>
                  <span className="small text-muted">Registered: {viewPatient.registrationDate || 'Active Record'}</span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setViewPatient(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold mb-2 text-uppercase">Demographic Profile</div>
                      <div className="small mb-1"><strong>Full Name:</strong> {viewPatient.name}</div>
                      <div className="small mb-1"><strong>Date of Birth:</strong> {viewPatient.dateOfBirth} ({viewPatient.age} years)</div>
                      <div className="small mb-1"><strong>Gender:</strong> {viewPatient.gender}</div>
                      <div className="small mb-1"><strong>Blood Group:</strong> {viewPatient.bloodGroup}</div>
                      <div className="small"><strong>File Status:</strong> {viewPatient.status}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div 
                      className="p-3 neu-card-sm h-100" 
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="small text-muted fw-bold mb-2 text-uppercase">Contact & Emergency</div>
                      <div className="small mb-1"><strong>Mobile Phone:</strong> {viewPatient.contact}</div>
                      <div className="small mb-1"><strong>Email Address:</strong> {viewPatient.email}</div>
                      <div className="small mb-1"><strong>Address:</strong> {viewPatient.address}</div>
                      <div className="small"><strong>Emergency Contact:</strong> {viewPatient.emergencyContact || 'Guardian / Family'}</div>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-3 neu-card-sm" 
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="small text-muted fw-bold mb-1 text-uppercase">Clinical Utilization History</div>
                  <div className="small">Total Outpatient Consultations: <strong>{viewPatient.appointmentCount || 0}</strong></div>
                  <div className="small">Most Recent Visit: <strong>{viewPatient.lastAppointmentDate || 'None logged'}</strong></div>
                </div>
              </div>
              <div 
                className="modal-footer px-4 py-3 border-top"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
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
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--hospital-border)' }}
            >
              <form onSubmit={handleAddPatient}>
                <div 
                  className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
                >
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Register Outpatient File
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
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="neu-input"
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
                      <label className="neu-form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="neu-input"
                        value={newPatientForm.dateOfBirth}
                        onChange={(e) =>
                          setNewPatientForm({ ...newPatientForm, dateOfBirth: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-6">
                      <label className="neu-form-label">Gender</label>
                      <select
                        className="neu-select"
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
                      <label className="neu-form-label">
                        Mobile Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="neu-input"
                        placeholder="9876543210"
                        value={newPatientForm.contact}
                        onChange={(e) =>
                          setNewPatientForm({ ...newPatientForm, contact: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="neu-form-label">Blood Group</label>
                      <select
                        className="neu-select"
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
                    <label className="neu-form-label">Email Address</label>
                    <input
                      type="email"
                      className="neu-input"
                      placeholder="patient@example.com"
                      value={newPatientForm.email}
                      onChange={(e) =>
                        setNewPatientForm({ ...newPatientForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="neu-form-label">Emergency Contact</label>
                    <input
                      type="text"
                      className="neu-input"
                      placeholder="e.g. S. Sundaram (+91 98765 00000) - Spouse"
                      value={newPatientForm.emergencyContact}
                      onChange={(e) =>
                        setNewPatientForm({ ...newPatientForm, emergencyContact: e.target.value })
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
