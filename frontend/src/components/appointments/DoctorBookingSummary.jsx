import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import doctorService from '../../services/doctorService';
import { DEMO_DOCTORS } from '../../data/hospitalData';

/**
 * Hospital Platform — Doctor Booking Summary & Selector Component (Phase 6 & Persistence Fix)
 * Displays the selected specialist's clinical details or provides an in-place selector
 * if no doctor is pre-selected. Backed authoritatively by PostgreSQL database.
 */
export function DoctorBookingSummary({ doctor, onSelectDoctor, onChangeDoctor }) {
  // Authoritative active doctors list for selection
  const [activeDoctors, setActiveDoctors] = useState(() => DEMO_DOCTORS.filter((d) => d.status === 'active'));

  useEffect(() => {
    let isMounted = true;
    doctorService
      .getDoctors({ is_active: true, page_size: 100 })
      .then((res) => {
        if (isMounted && res?.results) {
          const activeOnly = res.results.filter((d) => d.status === 'active');
          setActiveDoctors(activeOnly);
        }
      })
      .catch((err) => console.warn('Could not load doctors in DoctorBookingSummary:', err));

    return () => {
      isMounted = false;
    };
  }, []);
  // If doctor is already selected, display the summary card
  if (doctor) {
    const qualifications = Array.isArray(doctor.qualification)
      ? doctor.qualification.join(', ')
      : doctor.credentials || '';

    return (
      <div className="hospital-card p-4 bg-white mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
          <div className="d-flex align-items-start gap-3">
            <div
              className="doctor-avatar-box"
              style={{ width: '4rem', height: '4rem' }}
              aria-hidden="true"
            >
              {doctor.photo ? (
                <img src={doctor.photo} alt={doctor.name} />
              ) : (
                <span>{doctor.initials || 'DR'}</span>
              )}
            </div>

            <div>
              <span className="badge bg-secondary text-white mb-1">
                Consultant Specialist
              </span>
              <h2 className="h5 fw-bold text-dark mb-1">{doctor.name}</h2>
              <div className="small fw-semibold text-primary mb-1">
                {doctor.specialty} &bull; {doctor.departmentName || doctor.department}
              </div>
              {qualifications && (
                <div className="small text-muted mb-1">{qualifications}</div>
              )}
              <div className="small text-muted">
                Experience: <strong>{doctor.experience} years</strong>
              </div>
            </div>
          </div>

          <div className="text-md-end w-100 w-md-auto border-top border-md-top-0 pt-3 pt-md-0">
            <button
              type="button"
              className="hospital-btn hospital-btn-outline hospital-btn-sm"
              onClick={onChangeDoctor}
            >
              Change Doctor
            </button>
          </div>
        </div>

        {/* Consultation Logistics Strip */}
        <div className="row g-3 mt-3 pt-3 border-top border-light small">
          <div className="col-12 col-sm-4">
            <span className="fw-semibold text-dark">Consultation Type: </span>
            <span className="text-muted">{doctor.consultation?.type || 'In-person Consultation'}</span>
          </div>
          <div className="col-12 col-sm-4">
            <span className="fw-semibold text-dark">Slot Duration: </span>
            <span className="text-muted">{doctor.consultation?.duration || '30 minutes'}</span>
          </div>
          <div className="col-12 col-sm-4">
            <span className="fw-semibold text-dark">Location: </span>
            <span className="text-muted">{doctor.consultation?.location || 'Clinical OPD'}</span>
          </div>
        </div>
      </div>
    );
  }

  // If no doctor selected, show a clear selection interface

  return (
    <div className="hospital-card p-4 bg-white mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h5 fw-bold text-primary mb-1">Select an Attending Medical Specialist</h2>
          <p className="hospital-text-supporting mb-0">
            Choose a consultant physician to begin your appointment reservation.
          </p>
        </div>
        <Link to="/doctors">
          <Button variant="outline" size="sm">
            View Full Directory &rarr;
          </Button>
        </Link>
      </div>

      <div className="row g-3">
        {activeDoctors.map((doc) => (
          <div key={doc.id} className="col-12 col-md-6">
            <div className="p-3 border border-light rounded bg-light d-flex justify-content-between align-items-center gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="doctor-avatar-box"
                  style={{ width: '3rem', height: '3rem', fontSize: '1rem' }}
                  aria-hidden="true"
                >
                  <span>{doc.initials || 'DR'}</span>
                </div>
                <div>
                  <div className="fw-bold text-dark">{doc.name}</div>
                  <div className="small text-primary">{doc.specialty}</div>
                  <div className="small text-muted">{doc.departmentName || doc.department}</div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => onSelectDoctor(doc)}
              >
                Select
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DoctorBookingSummary;
