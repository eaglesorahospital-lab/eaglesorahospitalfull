import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HOSPITAL_METADATA } from '../../data/navigation';
import LanguageSelector from '../common/LanguageSelector';
import ThemeToggle from '../common/ThemeToggle';
import authService from '../../services/authService';
import { Calendar, User, LogOut, Menu, X, Activity } from 'lucide-react';

/**
 * Hospital Platform — Navbar Component
 * Neumorphism / Soft UI healthcare navigation.
 * Explicitly separates public patient navigation from internal staff workflows.
 */
export function Navbar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  React.useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(authService.isAuthenticated());
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener('eglesora-session-updated', handleAuthChange);
    window.addEventListener('eglesora-session-expired', handleAuthChange);
    return () => {
      window.removeEventListener('eglesora-session-updated', handleAuthChange);
      window.removeEventListener('eglesora-session-expired', handleAuthChange);
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/patient/login';
  };

  const toggleNavbar = () => {
    setIsOpen((prev) => !prev);
  };

  const closeNavbar = () => {
    setIsOpen(false);
  };

  const navLinks = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.doctorsShort', 'Doctors'), fullLabel: t('nav.doctors', 'Find a Doctor'), path: '/doctors' },
    { label: t('nav.departmentsShort', 'Departments'), fullLabel: t('nav.departments', 'Specialties & Departments'), path: '/departments' },
    { label: t('nav.patientPortal'), fullLabel: t('nav.patientPortal'), path: '/my-appointments' },
    { label: t('nav.about'), path: '/about' },
    { label: t('nav.contactShort', 'Contact'), fullLabel: t('nav.contact', 'Contact & Locations'), path: '/contact' },
  ];

  return (
    <header className="hospital-navbar-header sticky-top">
      <nav className="hospital-navbar py-2" aria-label="Main Navigation">
        <div className="hospital-container">
        <div className="d-flex align-items-center justify-content-between gap-2.5 min-w-0 w-100">
          {/* 1. Left: Hospital Brand Identity (Bounded) */}
          <Link to="/" className="hospital-brand d-flex align-items-center gap-2 text-decoration-none flex-shrink-0" onClick={closeNavbar}>
            <div className="hospital-brand-cross-icon neu-raised d-flex align-items-center justify-content-center" aria-hidden="true">
              <Activity size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="hospital-brand-text d-flex flex-column min-w-0" style={{ maxWidth: '200px' }}>
              <span className="hospital-brand-title fw-bold fs-6 lh-1 mb-0 text-nowrap">
                {HOSPITAL_METADATA.name}
              </span>
              <span className="hospital-brand-subtitle lh-1 text-nowrap text-muted text-truncate d-none d-xxl-block mt-1" style={{ fontSize: '0.685rem' }}>
                {HOSPITAL_METADATA.tagline}
              </span>
            </div>
          </Link>

          {/* 2. Center: Desktop Navigation Links (Centered, visible on xl/xxl >= 1200px) */}
          <nav className="hospital-nav-center d-none d-xl-flex align-items-center justify-content-center flex-grow-1 min-w-0 px-2" aria-label="Primary Navigation">
            <ul className="d-flex align-items-center list-unstyled mb-0 gap-1 flex-nowrap">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    className={({ isActive }) =>
                      `hospital-nav-link text-decoration-none text-nowrap fw-semibold ${
                        isActive ? 'active-nav-link' : ''
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* 3. Right: Desktop Actions (ThemeToggle, CTA, Auth, visible on xl/xxl >= 1200px) */}
          <div className="hospital-nav-actions d-none d-xl-flex align-items-center gap-2 flex-shrink-0">
            <ThemeToggle compact />

            {/* Primary CTA */}
            <Link
              to="/appointments/book"
              className="neu-btn neu-btn-primary fw-semibold d-inline-flex align-items-center gap-1.5 px-2.5 py-1.5 text-nowrap"
              style={{ minHeight: '36px', fontSize: '0.825rem' }}
            >
              <Calendar size={14} />
              <span>{t('nav.bookConsultation', 'Book Consultation')}</span>
            </Link>

            {/* Patient Auth Flow */}
            {isAuthenticated && currentUser?.role === 'PATIENT' ? (
              <div className="d-flex align-items-center gap-1.5 ms-1">
                <Link
                  to="/my-appointments"
                  className="neu-btn neu-btn-secondary fw-semibold d-inline-flex align-items-center gap-1.5 px-2.5 py-1.5 text-nowrap"
                  style={{ minHeight: '36px', fontSize: '0.825rem' }}
                >
                  <User size={14} />
                  <span>{currentUser.name?.split(' ')[0] || 'My Records'}</span>
                </Link>
                <button
                  type="button"
                  className="neu-btn neu-btn-outline p-2 d-inline-flex align-items-center justify-content-center"
                  style={{ minHeight: '36px', width: '36px' }}
                  onClick={handleLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : !isAuthenticated ? (
              <Link
                to="/patient/login"
                className="neu-btn neu-btn-outline fw-semibold px-2.5 py-1.5 text-nowrap ms-1"
                style={{ minHeight: '36px', fontSize: '0.825rem' }}
              >
                Sign In
              </Link>
            ) : null}
          </div>

          {/* Mobile / Tablet Controls (< 1200px) */}
          <div className="d-flex align-items-center gap-2 d-xl-none">
            <ThemeToggle compact />
            <button
              type="button"
              className="hospital-navbar-toggler neu-raised p-2 d-flex align-items-center justify-content-center"
              onClick={toggleNavbar}
              aria-expanded={isOpen}
              aria-label="Toggle navigation menu"
              style={{ minHeight: '38px', width: '38px' }}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown / Drawer (Rendered below 1200px) */}
        {isOpen && (
          <div className="d-xl-none pt-3 pb-2 mt-2 neu-surface rounded-4 p-3 mt-3 border">
            <div className="mb-3 pb-2 border-bottom d-flex align-items-center justify-content-between">
              <LanguageSelector variant="pills" />
              <ThemeToggle showLabel />
            </div>

            <ul className="list-unstyled mb-3">
              {navLinks.map((link) => (
                <li key={link.path} className="mb-1">
                  <NavLink
                    to={link.path}
                    onClick={closeNavbar}
                    className={({ isActive }) =>
                      `d-block py-2 px-3 text-decoration-none rounded-3 fw-medium transition-all ${
                        isActive
                          ? 'neu-inset text-primary fw-bold'
                          : 'text-body'
                      }`
                    }
                  >
                    {link.fullLabel || link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="pt-2 d-flex flex-column gap-2">
              <Link
                to="/appointments/book"
                onClick={closeNavbar}
                className="neu-btn neu-btn-primary w-100 text-center justify-content-center py-2"
                style={{ minHeight: '40px' }}
              >
                <Calendar size={16} className="me-2" />
                {t('nav.bookConsultation')}
              </Link>
              {isAuthenticated && currentUser?.role === 'PATIENT' ? (
                <button
                  type="button"
                  className="neu-btn neu-btn-outline text-danger w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  style={{ minHeight: '40px' }}
                  onClick={() => {
                    closeNavbar();
                    handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  Sign Out ({currentUser.name?.split(' ')[0] || 'Patient'})
                </button>
              ) : !isAuthenticated ? (
                <Link
                  to="/patient/login"
                  onClick={closeNavbar}
                  className="neu-btn neu-btn-secondary w-100 py-2 text-center justify-content-center"
                  style={{ minHeight: '40px' }}
                >
                  <User size={16} className="me-2" />
                  Sign In to Patient Portal
                </Link>
              ) : null}
            </div>
          </div>
        )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
