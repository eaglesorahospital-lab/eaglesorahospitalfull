import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import departmentService from '../../services/departmentService';
import { DEMO_DOCTORS, DEMO_DEPARTMENTS } from '../../data/hospitalData';
import { Stethoscope, Clock, MapPin, ChevronRight, User, Award, Search, Filter } from 'lucide-react';

/**
 * Hospital Platform — Doctor Booking Summary & Selector Component
 * Displays the selected specialist's clinical details or provides an in-place selector
 * with Neumorphic styling and department/specialty filtering.
 */
export function DoctorBookingSummary({ doctor, onSelectDoctor, onChangeDoctor }) {
  const [activeDoctors, setActiveDoctors] = useState(() => DEMO_DOCTORS.filter((d) => d.status === 'active'));
  const [departments, setDepartments] = useState(() => DEMO_DEPARTMENTS);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      doctorService.getDoctors({ is_active: true, page_size: 100 }),
      departmentService.getDepartments(),
    ]).then(([docRes, deptRes]) => {
      if (!isMounted) return;
      if (docRes.status === 'fulfilled' && docRes.value?.results) {
        const activeOnly = docRes.value.results.filter(
          (d) => d.is_active !== false && String(d.status).toLowerCase() !== 'inactive'
        );
        setActiveDoctors(activeOnly);
      }
      if (deptRes.status === 'fulfilled' && deptRes.value?.length > 0) {
        setDepartments(deptRes.value);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDoctors = useMemo(() => {
    return activeDoctors.filter((doc) => {
      const matchDept =
        selectedDept === 'ALL' ||
        String(doc.departmentId) === String(selectedDept) ||
        String(doc.departmentSlug) === String(selectedDept) ||
        String(doc.department) === String(selectedDept);

      const query = searchTerm.trim().toLowerCase();
      const matchSearch =
        !query ||
        doc.name.toLowerCase().includes(query) ||
        (doc.specialty || '').toLowerCase().includes(query);

      return matchDept && matchSearch;
    });
  }, [activeDoctors, selectedDept, searchTerm]);

  if (doctor) {
    const qualifications = Array.isArray(doctor.qualification)
      ? doctor.qualification.join(', ')
      : doctor.credentials || '';

    const photoUrl = doctor.photo || doctor.photo_url || doctor.image_url || doctor.image;

    return (
      <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
          <div className="d-flex align-items-start gap-3">
            <div
              className="doctor-avatar-box neu-inset flex-shrink-0"
              style={{ width: '4rem', height: '4rem', overflow: 'hidden' }}
              aria-hidden="true"
            >
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={`Portrait of ${doctor.name}`}
                  width="64"
                  height="64"
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <span className="fw-bold text-primary">{doctor.initials || 'DR'}</span>
              )}
            </div>

            <div>
              <span className="neu-badge neu-badge-primary mb-1 d-inline-block">
                Consultant Specialist
              </span>
              <h2 className="h5 fw-bold text-body mb-1">{doctor.name}</h2>
              <div className="small fw-semibold text-primary mb-1 d-flex align-items-center gap-1">
                <Stethoscope size={13} />
                <span>{doctor.specialty} &bull; {doctor.departmentName || doctor.department}</span>
              </div>
              {qualifications && (
                <div className="small text-muted mb-1">{qualifications}</div>
              )}
              <div className="small text-muted d-flex align-items-center gap-1">
                <Award size={13} className="text-primary" />
                <span>Experience: <strong className="text-body">{doctor.experience} years</strong></span>
              </div>
            </div>
          </div>

          <div className="text-md-end w-100 w-md-auto pt-2 pt-md-0">
            <button
              type="button"
              className="neu-btn neu-btn-outline neu-btn-sm"
              onClick={onChangeDoctor}
            >
              Change Doctor
            </button>
          </div>
        </div>

        {/* Consultation Logistics Strip */}
        <div className="row g-3 mt-3 pt-3 border-top small text-muted">
          <div className="col-12 col-sm-4 d-flex align-items-center gap-1">
            <strong className="text-body">Type: </strong>
            <span>{doctor.consultation?.type || 'In-person Consultation'}</span>
          </div>
          <div className="col-12 col-sm-4 d-flex align-items-center gap-1">
            <Clock size={13} className="text-primary" />
            <strong className="text-body">Duration: </strong>
            <span>{doctor.consultation?.duration || '30 minutes'}</span>
          </div>
          <div className="col-12 col-sm-4 d-flex align-items-center gap-1">
            <MapPin size={13} className="text-primary" />
            <strong className="text-body">Location: </strong>
            <span>{doctor.consultation?.location || 'Clinical OPD'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="neu-raised neu-surface p-4 rounded-4 mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h2 className="h5 fw-bold text-primary mb-1">Select an Attending Medical Specialist</h2>
          <p className="text-muted small mb-0">
            Choose a consultant physician to begin your appointment reservation.
          </p>
        </div>
        <Link to="/doctors" className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-1">
          <span>View Directory</span>
          <ChevronRight size={13} />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="row g-2 mb-3">
        <div className="col-12 col-sm-6 col-md-4">
          <div className="position-relative">
            <input
              type="text"
              className="neu-input small py-1.5"
              placeholder="Search by doctor name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-4">
          <select
            className="neu-select small py-1.5"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.slug || dept.id} value={dept.slug || dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row g-3">
        {filteredDoctors.length === 0 ? (
          <div className="col-12 text-center py-4 text-muted small">
            No active doctors match the selected department or search filter.
          </div>
        ) : (
          filteredDoctors.map((doc) => {
            const photoUrl = doc.photo || doc.photo_url || doc.image_url || doc.image;
            return (
              <div key={doc.id} className="col-12 col-md-6">
                <div className="neu-inset p-3 rounded-4 d-flex justify-content-between align-items-center gap-3">
                  <div className="d-flex align-items-center gap-3 min-w-0">
                    <div
                      className="doctor-avatar-box neu-raised flex-shrink-0"
                      style={{ width: '3rem', height: '3rem', fontSize: '1rem', overflow: 'hidden' }}
                      aria-hidden="true"
                    >
                      {photoUrl ? (
                        <img 
                          src={photoUrl} 
                          alt={`Portrait of ${doc.name}`}
                          width="48"
                          height="48"
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <span className="fw-bold text-primary">{doc.initials || 'DR'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="fw-bold text-body text-truncate">{doc.name}</div>
                      <div className="small text-primary text-truncate">{doc.specialty}</div>
                      <div className="small text-muted text-truncate">{doc.departmentName || doc.department}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="neu-btn neu-btn-primary neu-btn-sm flex-shrink-0"
                    onClick={() => onSelectDoctor(doc)}
                  >
                    Select
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default DoctorBookingSummary;
