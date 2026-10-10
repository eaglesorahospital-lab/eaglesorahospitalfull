import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HOSPITAL_METADATA } from '../../data/navigation';

/**
 * Hospital Platform — Footer Component
 * Professional light-neutral healthcare footer adhering to Apollo / Fortis design standards:
 * - Crisp, clean light neutral background (#f8fafc) with subtle border (#e2e8f0)
 * - Deep navy typography (#0f2e59) for high legibility and medical authority
 * - Balanced, responsive columns with verified institutional contacts
 * - Explicit emergency response information and restrained policy footer
 */
export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="hospital-footer bg-light-neutral border-top" aria-label="Hospital Footer">
      <div className="hospital-container">
        <div className="row g-4 g-lg-5 py-4 py-md-5">
          {/* 1. Institutional Identity & Verification */}
          <div className="col-12 col-lg-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white"
                style={{ width: '28px', height: '28px', backgroundColor: '#0f2e59', fontSize: '0.875rem' }}
                aria-hidden="true"
              >
                +
              </div>
              <h2 className="hospital-footer-title fs-5 mb-0 fw-bold">
                {HOSPITAL_METADATA.name}
              </h2>
            </div>
            <div className="small fw-semibold text-secondary mb-2">
              {HOSPITAL_METADATA.legalName}
            </div>
            <p className="small text-muted mb-3" style={{ lineHeight: '1.6' }}>
              {t('footer.overview')}
            </p>

            <div className="small text-muted d-flex flex-column gap-1">
              <div className="d-flex align-items-start gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary mt-1 flex-shrink-0" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{HOSPITAL_METADATA.address}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary flex-shrink-0" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Help Desk: <strong className="text-dark">{HOSPITAL_METADATA.generalPhone}</strong></span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary flex-shrink-0" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Desk: <a href={`mailto:${HOSPITAL_METADATA.email}`} className="text-decoration-none text-muted">{HOSPITAL_METADATA.email}</a></span>
              </div>
            </div>
          </div>

          {/* 2. Hospital Navigation */}
          <div className="col-6 col-sm-4 col-lg-2">
            <h3 className="hospital-footer-title fs-6 fw-bold mb-3">
              {t('footer.navigation')}
            </h3>
            <ul className="hospital-footer-links list-unstyled mb-0 d-flex flex-column gap-2 small">
              <li><Link to="/" className="text-decoration-none text-muted hover-text-dark">{t('nav.home')}</Link></li>
              <li><Link to="/doctors" className="text-decoration-none text-muted hover-text-dark">{t('nav.doctors')}</Link></li>
              <li><Link to="/departments" className="text-decoration-none text-muted hover-text-dark">{t('nav.departments')}</Link></li>
              <li><Link to="/about" className="text-decoration-none text-muted hover-text-dark">{t('nav.about')}</Link></li>
              <li><Link to="/contact" className="text-decoration-none text-muted hover-text-dark">{t('nav.contact')}</Link></li>
            </ul>
          </div>

          {/* 3. Patient Care & Services */}
          <div className="col-6 col-sm-4 col-lg-3">
            <h3 className="hospital-footer-title fs-6 fw-bold mb-3">
              {t('footer.patientCare')}
            </h3>
            <ul className="hospital-footer-links list-unstyled mb-0 d-flex flex-column gap-2 small">
              <li><Link to="/appointments/book" className="text-decoration-none text-muted hover-text-dark">{t('nav.bookConsultation') || 'Book Consultation'}</Link></li>
              <li><Link to="/my-appointments" className="text-decoration-none text-muted hover-text-dark">{t('nav.patientPortal')}</Link></li>
              <li><Link to="/profile" className="text-decoration-none text-muted hover-text-dark">{t('patient.profile')}</Link></li>
              <li><Link to="/departments" className="text-decoration-none text-muted hover-text-dark">{t('hero.exploreSpecialties')}</Link></li>
            </ul>
          </div>

          {/* 4. Emergency & OPD Operating Schedule */}
          <div className="col-12 col-sm-4 col-lg-3">
            <h3 className="hospital-footer-title fs-6 fw-bold mb-3">
              {t('footer.emergency')}
            </h3>

            {/* Emergency Hotline Box with Red Accent */}
            <div className="hospital-footer-emergency-card bg-white border rounded-2 p-3 mb-3 shadow-none">
              <div className="d-flex align-items-center gap-1 mb-1">
                <span className="badge bg-danger text-white" style={{ fontSize: '0.65rem' }}>24/7</span>
                <span className="small fw-bold text-dark">{t('footer.emergencyDeskLabel')}:</span>
              </div>
              <div className="fs-6 fw-bold text-danger mb-1">
                <a
                  href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                  className="text-danger text-decoration-none"
                >
                  {HOSPITAL_METADATA.emergencyPhone}
                </a>
              </div>
              <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                {HOSPITAL_METADATA.emergencyDeskNote ? `(${HOSPITAL_METADATA.emergencyDeskNote})` : t('footer.emergencyDeskToll')}
              </div>
            </div>

            <div className="small text-muted">
              <strong className="text-dark d-block mb-1">{t('footer.visitingGuidelines')}</strong>
              <span>{HOSPITAL_METADATA.visitingHours}</span>
            </div>
          </div>
        </div>

        {/* 5. Legal & Disclaimer Bottom Strip */}
        <div className="hospital-footer-bottom border-top py-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 small text-muted">
          <div>
            &copy; {currentYear} {HOSPITAL_METADATA.legalName}. {t('footer.rightsReserved')}
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted">{t('footer.privacy')}</span>
            <span>&bull;</span>
            <span className="text-muted">{t('footer.terms')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
