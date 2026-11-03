import React from 'react';
import { useTranslation } from 'react-i18next';
import { HOSPITAL_METADATA } from '../../data/navigation';
import { PhoneCall, Clock, Headphones } from 'lucide-react';

/**
 * Hospital Platform — Header / Top Information Bar
 * Institutional Healthcare utility header with Emergency desk, Help line, Visiting hours,
 * and Persistent Language Selector (English, Hindi, Marathi).
 * Adheres to accessible touch targets, baseline optical alignment, and responsive viewports.
 */
export function TopBar() {
  const { t } = useTranslation();

  return (
    <aside 
      className="hospital-topbar" 
      aria-label="Hospital Information & Emergency Contacts"
    >
      <div className="hospital-container">
        <div className="d-flex flex-wrap flex-lg-nowrap justify-content-between align-items-center gap-2 py-1">
          {/* Emergency and Help Line */}
          <div className="d-flex align-items-center gap-2 gap-md-3 min-w-0">
            <span className="hospital-topbar-item text-nowrap d-inline-flex align-items-center gap-1.5">
              <span 
                className="hospital-topbar-badge d-inline-flex align-items-center gap-1 px-2 py-0.5 rounded-pill"
                style={{
                  background: 'rgba(239, 68, 68, 0.20)',
                  border: '1px solid rgba(239, 68, 68, 0.40)',
                  color: '#FCA5A5',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                <span className="pulse-dot"></span>
                24/7
              </span>
              <span className="hospital-topbar-label d-none d-sm-inline ms-0.5">{t('nav.emergencyDesk')}:</span>
              <a
                href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                className="hospital-topbar-value text-white fw-bold d-inline-flex align-items-center gap-1.5 text-decoration-none"
                style={{
                  minHeight: '36px',
                  padding: '0.2rem 0.45rem',
                  borderRadius: 'var(--radius-xs, 4px)',
                  transition: 'background var(--transition-fast)'
                }}
                title="Call Emergency Hotline"
              >
                <PhoneCall size={13.5} className="text-warning flex-shrink-0" />
                <span>{HOSPITAL_METADATA.emergencyPhone}</span>
              </a>
              <span className="hospital-topbar-note text-white-50 ms-1" style={{ fontSize: '0.75rem' }}>
                ({HOSPITAL_METADATA.emergencyDeskNote})
              </span>
            </span>

            <span className="hospital-topbar-item d-none d-lg-inline-flex align-items-center gap-1.5 text-nowrap">
              <Headphones size={13.5} className="text-white-50 flex-shrink-0" />
              <span className="hospital-topbar-label">{t('nav.helpDesk')}:</span>
              <a
                href={`tel:${HOSPITAL_METADATA.generalPhone.replace(/[^0-9+]/g, '')}`}
                className="hospital-topbar-value text-white text-decoration-none d-inline-flex align-items-center px-2 py-1"
                style={{ minHeight: '36px' }}
                title="Call General Help Desk"
              >
                {HOSPITAL_METADATA.generalPhone}
              </a>
            </span>
          </div>

          {/* Visiting Hours & Language Selection */}
          <div className="d-flex align-items-center flex-shrink-0">
            {/* Visiting Hours (Desktop) */}
            <div className="hospital-topbar-visiting d-none d-xl-inline-flex align-items-center gap-1.5 text-nowrap">
              <Clock size={13.5} className="hospital-topbar-visiting-icon text-white-50 flex-shrink-0" />
              <span className="hospital-topbar-label">{t('nav.visitingHours')}:</span>
              <span className="hospital-topbar-visiting-time text-white fw-medium">{HOSPITAL_METADATA.visitingHours}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default TopBar;
