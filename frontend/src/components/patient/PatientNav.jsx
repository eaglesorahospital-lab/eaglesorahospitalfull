import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import usePatientSession from '../../hooks/usePatientSession';
import authService from '../../services/authService';

/**
 * Hospital Platform — Patient Area Navigation Bar
 * Apollo / Fortis inspired balanced patient identity strip and compact navigation tabs.
 * Clean, compact action buttons and segmented tab controls.
 * Uses dynamic authenticated profile data with zero hardcoded MRN values.
 */
export function PatientNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { patientProfile, isAuthenticated } = usePatientSession();

  const displayName = patientProfile?.fullName || (isAuthenticated ? 'Patient Account' : 'Outpatient Guest');
  const displayMrn = patientProfile?.mrn ? `MRN: ${patientProfile.mrn}` : (isAuthenticated ? 'MRN: Verified' : 'Portal Guest');

  // Generate initials for avatar badge
  const initials = (displayName || 'P')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'PT';

  const handleLogout = async () => {
    await authService.logout();
    navigate('/patient/login');
  };

  return (
    <div className="patient-portal-nav-wrapper mb-4">
      {/* Patient Identity Strip: Balanced, Compact, Responsive */}
      <div className="patient-identity-strip bg-white border rounded-3 p-3 mb-3 shadow-sm d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div className="d-flex align-items-center gap-3 min-w-0">
          <div
            className="patient-avatar-badge rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
            style={{ width: '44px', height: '44px', fontSize: '1rem', backgroundColor: '#0f2e59' }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h2 className="fs-6 fw-bold text-dark mb-0 lh-1">
                {displayName}
              </h2>
              <span className="badge bg-light text-primary border" style={{ fontSize: '0.75rem' }}>
                {displayMrn}
              </span>
            </div>
            <div className="small text-muted d-flex flex-wrap align-items-center gap-2" style={{ fontSize: '0.8125rem' }}>
              <span>{patientProfile?.mobile || 'No contact phone'}</span>
              <span className="d-none d-sm-inline">&bull;</span>
              <span className="text-break">{patientProfile?.email || 'No email registered'}</span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="patient-primary-action d-flex align-items-center gap-2 flex-shrink-0">
          <Link
            to="/appointments/book"
            className="hospital-btn hospital-btn-primary hospital-btn-sm d-inline-flex align-items-center justify-content-center gap-1 shadow-sm text-nowrap px-3 py-2"
            style={{ borderRadius: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t('nav.bookConsultation')}</span>
          </Link>

          {isAuthenticated ? (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1 px-3 py-2"
              style={{ borderRadius: '6px' }}
              onClick={handleLogout}
              title="Sign out of patient portal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/patient/login"
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 px-3 py-2"
              style={{ borderRadius: '6px' }}
            >
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Compact Segmented Navigation Tabs */}
      <nav className="patient-nav-tabs d-inline-flex gap-2 p-1 bg-slate-100 rounded-3 border" style={{ maxWidth: '100%' }} aria-label="Patient Portal Navigation">
        <NavLink
          to="/my-appointments"
          end
          className={({ isActive }) =>
            `patient-tab-btn text-decoration-none px-3 py-1-5 rounded-2 small fw-semibold d-inline-flex align-items-center justify-content-center gap-2 ${
              isActive
                ? 'bg-white text-primary shadow-sm border border-light'
                : 'text-secondary hover-text-dark'
            }`
          }
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="d-none d-sm-inline">{t('patient.dashboard')}</span>
          <span className="d-sm-none">Appointments</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `patient-tab-btn text-decoration-none px-3 py-1-5 rounded-2 small fw-semibold d-inline-flex align-items-center justify-content-center gap-2 ${
              isActive
                ? 'bg-white text-primary shadow-sm border border-light'
                : 'text-secondary hover-text-dark'
            }`
          }
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="d-none d-sm-inline">{t('patient.profile')}</span>
          <span className="d-sm-none">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default PatientNav;
