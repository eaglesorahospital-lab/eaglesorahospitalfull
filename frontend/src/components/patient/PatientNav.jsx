import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import usePatientSession from '../../hooks/usePatientSession';
import authService from '../../services/authService';
import { Calendar, User, LogOut, Plus, ShieldCheck } from 'lucide-react';

/**
 * Hospital Platform — Patient Area Navigation Bar
 * Neumorphism / Soft UI patient identity strip and segmented navigation tabs.
 */
export function PatientNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { patientProfile, isAuthenticated } = usePatientSession();

  const displayName = patientProfile?.fullName || (isAuthenticated ? 'Patient Account' : 'Outpatient Guest');
  const displayMrn = patientProfile?.mrn ? `MRN: ${patientProfile.mrn}` : (isAuthenticated ? 'MRN: Verified' : 'Portal Guest');

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
      {/* Patient Identity Strip */}
      <div className="neu-raised neu-surface rounded-4 p-3 p-md-4 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div className="d-flex align-items-center gap-3 min-w-0">
          <div
            className="neu-inset rounded-circle d-flex align-items-center justify-content-center fw-bold text-primary flex-shrink-0"
            style={{ width: '48px', height: '48px', fontSize: '1.05rem' }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h2 className="fs-5 fw-bold text-body mb-0 lh-1">
                {displayName}
              </h2>
              <span className="neu-badge neu-badge-primary" style={{ fontSize: '0.75rem' }}>
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
        <div className="d-flex align-items-center gap-2 flex-shrink-0 w-100 w-sm-auto justify-content-end">
          <Link
            to="/appointments/book"
            className="neu-btn neu-btn-primary neu-btn-sm d-inline-flex align-items-center justify-content-center gap-1 text-nowrap px-3 py-2"
            style={{ minHeight: '44px' }}
          >
            <Plus size={15} />
            <span>{t('nav.bookConsultation')}</span>
          </Link>

          {isAuthenticated ? (
            <button
              type="button"
              className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-1 px-3 py-2 text-danger"
              style={{ minHeight: '44px' }}
              onClick={handleLogout}
              title="Sign out of patient portal"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/patient/login"
              className="neu-btn neu-btn-secondary neu-btn-sm d-inline-flex align-items-center gap-1 px-3 py-2"
              style={{ minHeight: '44px' }}
            >
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <nav className="neu-inset d-inline-flex gap-2 p-1 rounded-pill" style={{ maxWidth: '100%' }} aria-label="Patient Portal Navigation">
        <NavLink
          to="/my-appointments"
          end
          style={{ minHeight: '44px' }}
          className={({ isActive }) =>
            `text-decoration-none px-3 py-2 rounded-pill small fw-semibold d-inline-flex align-items-center justify-content-center gap-2 transition-all ${
              isActive
                ? 'neu-raised text-primary'
                : 'text-muted hover-text-primary'
            }`
          }
        >
          <Calendar size={15} />
          <span className="d-none d-sm-inline">{t('patient.dashboard')}</span>
          <span className="d-sm-none">Appointments</span>
        </NavLink>

        <NavLink
          to="/profile"
          style={{ minHeight: '44px' }}
          className={({ isActive }) =>
            `text-decoration-none px-3 py-2 rounded-pill small fw-semibold d-inline-flex align-items-center justify-content-center gap-2 transition-all ${
              isActive
                ? 'neu-raised text-primary'
                : 'text-muted hover-text-primary'
            }`
          }
        >
          <User size={15} />
          <span className="d-none d-sm-inline">{t('patient.profile')}</span>
          <span className="d-sm-none">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default PatientNav;
