import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Users, 
  Search, 
  RotateCw, 
  Phone, 
  Mail, 
  Calendar, 
  Droplet, 
  AlertCircle, 
  User, 
  FileText, 
  MapPin, 
  ShieldAlert 
} from 'lucide-react';
import apiClient from '../../services/api';

export function DoctorPatientsPage() {
  const { doctorProfile } = useOutletContext() || {};
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const fetchDoctorPatients = () => {
    setIsLoading(true);
    setActionError(null);
    apiClient
      .get('/api/patients/', { requiresAuth: true })
      .then((data) => {
        const list = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
        setPatients(list);
      })
      .catch((err) => {
        setActionError(`Failed to load assigned patient records: ${err.message}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchDoctorPatients();
  }, []);

  // Lock body scroll and listen for Escape key when dossier modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedPatient) {
        setSelectedPatient(null);
      }
    };
    if (selectedPatient) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPatient]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const name = `${p.first_name || ''} ${p.last_name || ''} ${p.full_name || ''}`.toLowerCase();
      const mrn = (p.mrn || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      return name.includes(term) || mrn.includes(term) || phone.includes(term) || email.includes(term);
    });
  }, [patients, searchTerm]);

  return (
    <div className="doctor-patients-view">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h1 className="h4 fw-bold text-body mb-0.5">Assigned Patient Records</h1>
          <p className="text-muted small mb-0">
            Confidential medical roster restricted to patients with clinical appointments in your care.
          </p>
        </div>
        <button
          type="button"
          className="neu-btn neu-btn-outline neu-btn-sm d-flex align-items-center gap-1.5"
          onClick={fetchDoctorPatients}
          disabled={isLoading}
        >
          <RotateCw size={14} className={isLoading ? 'spin-anim' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {actionError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small mb-4" role="alert">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="neu-card rounded-4 p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-8">
            <div className="position-relative">
              <Search size={16} className="position-absolute start-0 top-50 translate-middle-y ms-3 text-muted" />
              <input
                type="text"
                className="neu-input ps-5 w-100"
                style={{ fontSize: '16px', minHeight: '44px' }}
                placeholder="Search by patient MRN, full name, mobile number, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4 text-md-end text-muted small">
            <span>Showing <strong>{filteredPatients.length}</strong> assigned patient(s)</span>
          </div>
        </div>
      </div>

      {/* Grid of Patients */}
      {isLoading ? (
        <div className="text-center py-5 text-muted neu-card rounded-4">
          <RotateCw size={24} className="spin-anim mb-2 text-primary" />
          <div>Retrieving clinical patient directory...</div>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-5 text-muted neu-card rounded-4 p-4">
          <Users size={32} className="mb-2 text-muted" />
          <div className="fw-semibold">No patient records found.</div>
          <div className="small text-muted mt-1">Patients will automatically appear here once scheduled for consultations.</div>
        </div>
      ) : (
        <div className="row g-3">
          {filteredPatients.map((p) => {
            const fullName = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient';
            return (
              <div key={p.id || p.mrn} className="col-12 col-md-6 col-xl-4">
                <div className="neu-card rounded-4 p-3.5 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge" style={{ background: 'var(--hospital-primary-navy)', fontSize: '0.72rem' }}>
                        MRN: {p.mrn || 'N/A'}
                      </span>
                      {p.blood_group && (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: '0.7rem' }}>
                          <Droplet size={11} className="me-0.5 inline" />
                          {p.blood_group}
                        </span>
                      )}
                    </div>

                    <h3 className="fs-6 fw-bold text-body mb-1">{fullName}</h3>

                    <div className="small text-muted mb-2 d-flex flex-wrap gap-2" style={{ fontSize: '0.78rem' }}>
                      {p.gender && <span>Gender: {p.gender}</span>}
                      {p.gender && p.date_of_birth && <span>•</span>}
                      {p.date_of_birth && <span>DOB: {p.date_of_birth}</span>}
                    </div>

                    <div className="neu-inset p-2.5 rounded-3 mb-2" style={{ fontSize: '0.78rem' }}>
                      <div className="d-flex align-items-center gap-1.5 text-body mb-1 text-truncate">
                        <Phone size={12} className="text-primary flex-shrink-0" />
                        <span>{p.phone || 'No phone provided'}</span>
                      </div>
                      {p.email && (
                        <div className="d-flex align-items-center gap-1.5 text-muted text-truncate">
                          <Mail size={12} className="text-secondary flex-shrink-0" />
                          <span>{p.email}</span>
                        </div>
                      )}
                    </div>

                    {p.emergency_contact && (
                      <div className="small text-muted" style={{ fontSize: '0.72rem' }}>
                        <strong>Emergency:</strong> {p.emergency_contact}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-2 border-top d-flex justify-content-between align-items-center">
                    <span className="small text-success fw-medium">Active File</span>
                    <button
                      type="button"
                      className="neu-btn neu-btn-outline neu-btn-sm"
                      style={{ minHeight: '44px' }}
                      onClick={() => setSelectedPatient(p)}
                    >
                      View Dossier
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Patient Dossier Modal */}
      {selectedPatient && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(10, 25, 47, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPatient(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content neu-raised neu-surface rounded-4 p-4 border-0 shadow-lg">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <span className="badge" style={{ background: 'var(--hospital-primary-navy)', fontSize: '0.75rem' }}>
                    MRN: {selectedPatient.mrn}
                  </span>
                  <h4 className="fs-5 fw-bold text-body mt-1 mb-0">
                    {selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}
                  </h4>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-2 d-flex align-items-center justify-content-center"
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
                  onClick={() => setSelectedPatient(null)}
                  aria-label="Close modal"
                >
                  <span className="fs-5">✕</span>
                </button>
              </div>

              <div className="neu-inset p-3 rounded-3 mb-3 small">
                <div className="row g-2">
                  <div className="col-6">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Date of Birth</div>
                    <div className="fw-semibold text-body">{selectedPatient.date_of_birth || 'Not recorded'}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Blood Group</div>
                    <div className="fw-semibold text-danger">{selectedPatient.blood_group || 'Unknown'}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Gender</div>
                    <div className="fw-semibold text-body">{selectedPatient.gender || 'Not specified'}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Emergency Contact</div>
                    <div className="fw-semibold text-body">{selectedPatient.emergency_contact || 'None listed'}</div>
                  </div>
                </div>
              </div>

              <div className="neu-inset p-3 rounded-3 mb-3 small">
                <div className="text-muted mb-0.5" style={{ fontSize: '0.72rem' }}>Registered Residential Address</div>
                <div className="text-body">{selectedPatient.address || 'No residential address on record.'}</div>
              </div>

              <div className="neu-inset p-3 rounded-3 mb-4 small">
                <div className="text-muted mb-0.5" style={{ fontSize: '0.72rem' }}>Contact Information</div>
                <div className="text-body fw-medium">{selectedPatient.phone || 'No phone'}</div>
                <div className="text-muted">{selectedPatient.email || 'No email address'}</div>
              </div>

              <button
                type="button"
                className="neu-btn neu-btn-primary w-100"
                style={{ minHeight: '44px' }}
                onClick={() => setSelectedPatient(null)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorPatientsPage;
