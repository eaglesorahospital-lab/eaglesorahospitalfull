import React from 'react';
import { useTranslation } from 'react-i18next';
import { HOSPITAL_METADATA } from '../../data/navigation';
import LanguageSelector from '../common/LanguageSelector';
import { PhoneCall, Clock, Headphones } from 'lucide-react';

/**
 * Hospital Platform — Header / Top Information Bar
 * Premium Glassmorphism styling with Emergency desk, Help line, Visiting hours,
 * and Persistent Language Selector (English, Hindi, Marathi).
 * Adheres to accessible 44px touch targets on mobile viewports.
 */
export function TopBar() {
  const { t } = useTranslation();

  return (
    <aside 
      className="hospital-topbar" 
      aria-label="Hospital Information & Emergency Contacts"
      style={{
        background: 'rgba(10, 27, 46, 0.94)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.10)'
      }}
    >
      <div className="hospital-container">
        <div className="d-flex justify-content-between align-items-center gap-2">
          {/* Emergency and Help Line */}
          <div className="d-flex align-items-center gap-1 gap-md-3 min-w-0">
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
              <span className="hospital-topbar-label d-none d-sm-inline ms-1">{t('nav.emergencyDesk')}:</span>
              <a
                href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                className="hospital-topbar-value text-white fw-bold d-inline-flex align-items-center gap-1.5 text-decoration-none"
                style={{
                  minHeight: '44px',
                  padding: '0.35rem 0.5rem',
                  borderRadius: 'var(--radius-xs)',
                  transition: 'background var(--transition-fast)'
                }}
                title="Call Emergency Hotline"
              >
                <PhoneCall size={14} className="text-warning flex-shrink-0" />
                <span>{HOSPITAL_METADATA.emergencyPhone}</span>
              </a>
              <span className="text-white-50 d-none d-xl-inline" style={{ fontSize: '0.75rem' }}>
                ({HOSPITAL_METADATA.emergencyDeskNote})
              </span>
            </span>

            <span className="hospital-topbar-item d-none d-lg-inline-flex align-items-center gap-1 text-nowrap">
              <Headphones size={13} className="text-white-50 flex-shrink-0" />
              <span className="hospital-topbar-label">{t('nav.helpDesk')}:</span>
              <a
                href={`tel:${HOSPITAL_METADATA.generalPhone.replace(/[^0-9+]/g, '')}`}
                className="hospital-topbar-value text-white text-decoration-none d-inline-flex align-items-center px-2 py-1"
                style={{ minHeight: '44px' }}
                title="Call General Help Desk"
              >
                {HOSPITAL_METADATA.generalPhone}
              </a>
            </span>
          </div>

          {/* Visiting Hours & Language Selection */}
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <div className="d-none d-xl-flex align-items-center gap-1 text-white-50 small text-nowrap">
              <Clock size={13} className="text-white-50 flex-shrink-0" />
              <span className="hospital-topbar-label">{t('nav.visitingHours')}:</span>
              <span className="text-white small">{HOSPITAL_METADATA.visitingHours}</span>
            </div>

            <div className="border-start border-white border-opacity-25 ps-2 ms-1 d-flex align-items-center">
              <LanguageSelector variant="topbar" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default TopBar;
