import React from 'react';
import { useTranslation } from 'react-i18next';
import { HOSPITAL_METADATA } from '../../data/navigation';
import LanguageSelector from '../common/LanguageSelector';

/**
 * Hospital Platform — Header / Top Information Bar
 * Professional healthcare header with Emergency desk, Help line, Visiting hours,
 * and Persistent Language Selector (English, Hindi, Marathi).
 */
export function TopBar() {
  const { t } = useTranslation();

  return (
    <aside className="hospital-topbar" aria-label="Hospital Information & Emergency Contacts">
      <div className="hospital-container">
        <div className="d-flex justify-content-between align-items-center gap-2 py-1">
          {/* Emergency and Help Line */}
          <div className="d-flex align-items-center gap-2 gap-md-3 min-w-0">
            <span className="hospital-topbar-item text-nowrap">
              <span className="hospital-topbar-badge">24/7</span>
              <span className="hospital-topbar-label d-none d-sm-inline">{t('nav.emergencyDesk')}:</span>
              <a
                href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                className="hospital-topbar-value text-white fw-bold"
              >
                {HOSPITAL_METADATA.emergencyPhone}
              </a>
              <span className="text-white-50 d-none d-md-inline" style={{ fontSize: '0.75rem' }}>
                ({HOSPITAL_METADATA.emergencyDeskNote})
              </span>
            </span>

            <span className="hospital-topbar-item d-none d-lg-inline-flex text-nowrap">
              <span className="hospital-topbar-label">{t('nav.helpDesk')}:</span>
              <span className="hospital-topbar-value">{HOSPITAL_METADATA.generalPhone}</span>
            </span>
          </div>

          {/* Visiting Hours & Language Selection */}
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <div className="d-none d-xl-flex align-items-center gap-1 text-white-50 small text-nowrap">
              <span className="hospital-topbar-label">{t('nav.visitingHours')}:</span>
              <span className="text-white small">{HOSPITAL_METADATA.visitingHours}</span>
            </div>

            <div className="border-start border-secondary ps-2 ms-1 d-flex align-items-center">
              <LanguageSelector variant="topbar" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default TopBar;
