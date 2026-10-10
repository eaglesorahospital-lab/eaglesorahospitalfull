import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HOSPITAL_METADATA } from '../../data/navigation';
import LanguageSelector from '../common/LanguageSelector';
import authService from '../../services/authService';

/**
 * Hospital Platform — Navbar Component
 * Streamlined, high-clarity healthcare navigation adhering to Apollo / Fortis patterns.
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
    { label: t('nav.doctors'), path: '/doctors' },
    { label: t('nav.departments'), path: '/departments' },
    { label: t('nav.patientPortal'), path: '/my-appointments' },
    { label: t('nav.about'), path: '/about' },
    { label: t('nav.contact'), path: '/contact' },
  ];

  return (
    <header className="hospital-navbar-header sticky-top">
      <nav className="hospital-navbar bg-white border-bottom py-2" aria-label="Main Navigation">
        <div className="hospital-container">
          <div className="d-flex align-items-center justify-content-between">
            {/* Hospital Brand Identity */}
            <Link to="/" className="text-decoration-none d-flex align-items-center gap-2" onClick={closeNavbar}>
              <div className="hospital-brand-cross-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
                </svg>
              </div>
              <div className="d-flex flex-column">
                <span className="hospital-brand-title fw-bold text-dark fs-5 lh-1 mb-1">
                  {HOSPITAL_METADATA.name}
                </span>
                <span className="hospital-brand-subtitle text-muted small lh-1 d-none d-sm-block" style={{ fontSize: '0.75rem' }}>
                  {HOSPITAL_METADATA.tagline}
                </span>
              </div>
            </Link>

            {/* Mobile Toggler */}
            <button
              type="button"
              className="hospital-navbar-toggler d-lg-none btn btn-outline-secondary btn-sm p-1"
              onClick={toggleNavbar}
              aria-expanded={isOpen}
              aria-label="Toggle navigation menu"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {isOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>

            {/* Desktop Navigation Links */}
            <div className="d-none d-lg-flex align-items-center gap-4">
              <ul className="d-flex align-items-center list-unstyled mb-0 gap-3">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <NavLink
                      to={link.path}
                      className={({ isActive }) =>
                        `hospital-nav-link text-decoration-none px-2 py-1 text-nowrap fw-semibold ${
                          isActive ? 'active-nav-link' : 'text-secondary'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="ms-2 d-flex align-items-center gap-2">
                <Link
                  to="/appointments/book"
                  className="hospital-btn hospital-btn-primary fw-semibold d-inline-flex align-items-center gap-2 px-3 py-2 text-nowrap shadow-sm"
                  style={{ borderRadius: '6px' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {t('nav.bookConsultation')}
                </Link>

                {isAuthenticated && currentUser?.role === 'PATIENT' ? (
                  <div className="d-flex align-items-center gap-2">
                    <Link
                      to="/my-appointments"
                      className="btn btn-sm btn-outline-primary fw-semibold px-2 py-2 text-nowrap"
                      style={{ borderRadius: '6px' }}
                    >
                      {currentUser.name?.split(' ')[0] || 'My Records'}
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary px-2 py-2"
                      style={{ borderRadius: '6px' }}
                      onClick={handleLogout}
                      title="Sign Out"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : !isAuthenticated ? (
                  <Link
                    to="/patient/login"
                    className="btn btn-sm btn-outline-secondary fw-semibold px-3 py-2 text-nowrap"
                    style={{ borderRadius: '6px' }}
                  >
                    Sign In
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isOpen && (
            <div className="d-lg-none pt-3 pb-2 border-top mt-2">
              <div className="mb-3 pb-2 border-bottom">
                <LanguageSelector variant="pills" />
              </div>

              <ul className="list-unstyled mb-3">
                {navLinks.map((link) => (
                  <li key={link.path} className="mb-1">
                    <NavLink
                      to={link.path}
                      onClick={closeNavbar}
                      className={({ isActive }) =>
                        `d-block py-2 px-2 text-decoration-none rounded fw-semibold ${
                          isActive
                            ? 'bg-light text-primary border-start border-3 border-primary'
                            : 'text-dark'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="pt-2 d-flex flex-column gap-2">
                <Link
                  to="/appointments/book"
                  onClick={closeNavbar}
                  className="hospital-btn hospital-btn-primary w-100 text-center justify-content-center"
                >
                  {t('nav.bookConsultation')}
                </Link>
                {isAuthenticated && currentUser?.role === 'PATIENT' ? (
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100 btn-sm py-2"
                    onClick={() => {
                      closeNavbar();
                      handleLogout();
                    }}
                  >
                    Sign Out ({currentUser.name?.split(' ')[0] || 'Patient'})
                  </button>
                ) : !isAuthenticated ? (
                  <Link
                    to="/patient/login"
                    onClick={closeNavbar}
                    className="btn btn-outline-primary w-100 btn-sm py-2"
                  >
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
