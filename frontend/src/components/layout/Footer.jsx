import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HOSPITAL_METADATA } from '../../data/navigation';
import { Activity, MapPin, PhoneCall, Mail, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * Hospital Platform — Footer Component
 * Neumorphic / Soft UI Healthcare footer with verified institutional contacts
 * and 24/7 emergency trauma indicators.
 */
export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="hospital-footer border-top py-2" aria-label="Hospital Footer">
      <div className="hospital-container">
        <div className="row g-4 g-lg-5 py-4 py-md-5">
          {/* 1. Institutional Identity & Verification */}
          <div className="col-12 col-lg-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className="hospital-brand-cross-icon neu-raised d-flex align-items-center justify-content-center"
                style={{ width: '32px', height: '32px' }}
                aria-hidden="true"
              >
                <Activity size={18} className="text-white" />
              </div>
              <h2 className="hospital-footer-title fs-5 mb-0 fw-bold">
                {HOSPITAL_METADATA.name}
              </h2>
            </div>
            <div className="small fw-semibold text-primary mb-2 d-flex align-items-center gap-1">
              <ShieldCheck size={14} />
              <span>{HOSPITAL_METADATA.legalName}</span>
            </div>
            <p className="small text-muted mb-3" style={{ lineHeight: '1.6' }}>
              {t('footer.overview')}
            </p>

            <div className="small text-muted d-flex flex-column gap-2">
              <div className="d-flex align-items-start gap-2">
                <MapPin size={15} className="text-primary mt-1 flex-shrink-0" />
                <span>{HOSPITAL_METADATA.address}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <PhoneCall size={15} className="text-primary flex-shrink-0" />
                <span>
                  Help Desk:{' '}
                  <a
                    href={`tel:${HOSPITAL_METADATA.generalPhone.replace(/[^0-9+]/g, '')}`}
                    className="text-decoration-none text-body fw-bold hover-text-primary"
                  >
                    {HOSPITAL_METADATA.generalPhone}
                  </a>
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Mail size={15} className="text-primary flex-shrink-0" />
                <span>
                  Desk:{' '}
                  <a
                    href={`mailto:${HOSPITAL_METADATA.email}`}
                    className="text-decoration-none text-muted hover-text-primary"
                  >
                    {HOSPITAL_METADATA.email}
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* 2. Hospital Navigation */}
          <div className="col-6 col-sm-4 col-lg-2">
            <h3 className="hospital-footer-title fs-6 fw-bold mb-3 text-body">
              {t('footer.navigation')}
            </h3>
            <ul className="hospital-footer-links list-unstyled mb-0 d-flex flex-column gap-2 small">
              <li><Link to="/" className="text-decoration-none text-muted hover-text-primary">{t('nav.home')}</Link></li>
              <li><Link to="/doctors" className="text-decoration-none text-muted hover-text-primary">{t('nav.doctors')}</Link></li>
              <li><Link to="/departments" className="text-decoration-none text-muted hover-text-primary">{t('nav.departments')}</Link></li>
              <li><Link to="/about" className="text-decoration-none text-muted hover-text-primary">{t('nav.about')}</Link></li>
              <li><Link to="/contact" className="text-decoration-none text-muted hover-text-primary">{t('nav.contact')}</Link></li>
            </ul>
          </div>

          {/* 3. Patient Care & Services */}
          <div className="col-6 col-sm-4 col-lg-3">
            <h3 className="hospital-footer-title fs-6 fw-bold mb-3 text-body">
              {t('footer.patientCare')}
            </h3>
            <ul className="hospital-footer-links list-unstyled mb-0 d-flex flex-column gap-2 small">
              <li><Link to="/appointments/book" className="text-decoration-none text-muted hover-text-primary">{t('nav.bookConsultation') || 'Book Consultation'}</Link></li>
              <li><Link to="/my-appointments" className="text-decoration-none text-muted hover-text-primary">{t('nav.patientPortal')}</Link></li>
              <li><Link to="/profile" className="text-decoration-none text-muted hover-text-primary">{t('patient.profile')}</Link></li>
              <li><Link to="/departments" className="text-decoration-none text-muted hover-text-primary">{t('hero.exploreSpecialties')}</Link></li>
            </ul>
          </div>

          {/* 4. Emergency & OPD Operating Schedule */}
          <div className="col-12 col-sm-4 col-lg-3">
            <h3 className="hospital-footer-title fs-6 fw-bold mb-3 text-body">
              {t('footer.emergency')}
            </h3>

            {/* Emergency Hotline Box */}
            <div className="neu-raised neu-surface rounded-4 p-3 mb-3 border-start border-4 border-danger">
              <div className="d-flex align-items-center gap-1 mb-1">
                <span className="neu-badge neu-badge-danger d-inline-flex align-items-center gap-1">
                  <AlertTriangle size={11} />
                  24/7
                </span>
                <span className="small fw-bold text-body ms-1">{t('footer.emergencyDeskLabel')}:</span>
              </div>
              <div className="fs-6 fw-bold text-danger mb-1">
                <a
                  href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                  className="text-danger text-decoration-none d-inline-flex align-items-center gap-1"
                >
                  <PhoneCall size={14} />
                  {HOSPITAL_METADATA.emergencyPhone}
                </a>
              </div>
              <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                {HOSPITAL_METADATA.emergencyDeskNote ? `(${HOSPITAL_METADATA.emergencyDeskNote})` : t('footer.emergencyDeskToll')}
              </div>
            </div>

            <div className="small text-muted d-flex align-items-start gap-2">
              <Clock size={15} className="text-primary mt-1 flex-shrink-0" />
              <div>
                <strong className="text-body d-block mb-1">{t('footer.visitingGuidelines')}</strong>
                <span>{HOSPITAL_METADATA.visitingHours}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Legal & Disclaimer Bottom Strip */}
        <div className="border-top py-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 small text-muted">
          <div>
            &copy; {currentYear} {HOSPITAL_METADATA.legalName}. {t('footer.rightsReserved')}
          </div>
          <div className="d-flex align-items-center gap-3">
            <Link to="/privacy" className="text-decoration-none text-muted hover-text-primary">
              {t('footer.privacy') || 'Privacy Policy'}
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="text-decoration-none text-muted hover-text-primary">
              {t('footer.terms') || 'Terms & Conditions'}
            </Link>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openCookiePreferences'))}
              className="btn btn-link btn-sm p-0 text-decoration-none text-muted hover-text-primary small"
              style={{ fontSize: 'inherit' }}
            >
              Cookie Settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
