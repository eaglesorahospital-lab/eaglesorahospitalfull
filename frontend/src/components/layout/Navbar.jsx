import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HOSPITAL_METADATA } from '../../data/navigation';
import LanguageSelector from '../common/LanguageSelector';
import ThemeToggle from '../common/ThemeToggle';
import authService from '../../services/authService';
import { Calendar, User, LogOut, Menu, X, Activity } from 'lucide-react';

/**
 * Hospital Platform — Navbar Component
 * Premium Glassmorphism healthcare navigation with mobile slide-down drawer,
 * Escape key dismiss, backdrop overlay, body-scroll lock, and accessible 44px touch targets.
 */
export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  // Synchronize session events
  useEffect(() => {
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

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock body scroll and handle Escape key dismiss when drawer is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
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
      <nav 
        className="hospital-navbar py-2" 
        aria-label="Main Navigation"
        style={{
          background: 'var(--glass-surface-nav)',
          backdropFilter: 'var(--glass-blur-md)',
          WebkitBackdropFilter: 'var(--glass-blur-md)',
          borderBottom: 'var(--glass-border-subtle)',
          boxShadow: 'var(--glass-shadow-sm)',
          transition: 'all var(--transition-normal)'
        }}
      >
        <div className="hospital-container">
          <div className="d-flex align-items-center justify-content-between gap-2.5 min-w-0 w-100">
            {/* 1. Left: Hospital Brand Identity */}
            <Link to="/" className="hospital-brand d-flex align-items-center gap-2 text-decoration-none flex-shrink-0" onClick={closeNavbar}>
              <div 
                className="hospital-brand-cross-icon neu-raised d-flex align-items-center justify-content-center"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm, 10px)',
                  background: 'linear-gradient(135deg, var(--hospital-primary-navy) 0%, var(--hospital-medical-blue) 100%)',
                  boxShadow: '0 4px 12px rgba(40, 120, 200, 0.25)'
                }}
                aria-hidden="true"
              >
                <Activity size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="hospital-brand-text d-flex flex-column min-w-0" style={{ maxWidth: '210px' }}>
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
                        `hospital-nav-link text-decoration-none text-nowrap fw-semibold px-3 py-2 rounded-3 transition-all ${
                          isActive 
                            ? 'active-nav-link shadow-sm' 
                            : 'text-body'
                        }`
                      }
                      style={{ minHeight: '38px' }}
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
                className="glass-btn glass-btn-primary fw-semibold d-inline-flex align-items-center gap-1.5 px-3 py-2 text-nowrap"
                style={{ minHeight: '40px', fontSize: '0.85rem' }}
              >
                <Calendar size={15} />
                <span>{t('nav.bookConsultation', 'Book Consultation')}</span>
              </Link>

              {/* Patient Auth Flow */}
              {isAuthenticated && currentUser?.role === 'PATIENT' ? (
                <div className="d-flex align-items-center gap-1.5 ms-1">
                  <Link
                    to="/my-appointments"
                    className="glass-btn glass-btn-secondary fw-semibold d-inline-flex align-items-center gap-1.5 px-3 py-2 text-nowrap"
                    style={{ minHeight: '40px', fontSize: '0.85rem' }}
                  >
                    <User size={15} />
                    <span>{currentUser.name?.split(' ')[0] || 'My Records'}</span>
                  </Link>
                  <button
                    type="button"
                    className="glass-btn glass-btn-outline p-0 d-inline-flex align-items-center justify-content-center"
                    style={{ minHeight: '40px', width: '40px' }}
                    onClick={handleLogout}
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : !isAuthenticated ? (
                <Link
                  to="/patient/login"
                  className="glass-btn glass-btn-outline fw-semibold px-3 py-2 text-nowrap ms-1"
                  style={{ minHeight: '40px', fontSize: '0.85rem' }}
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
                className="hospital-navbar-toggler glass-btn-icon"
                onClick={toggleNavbar}
                aria-expanded={isOpen}
                aria-label="Toggle navigation menu"
                style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
              >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Backdrop Overlay */}
      {isOpen && (
        <div
          className="glass-modal-backdrop d-xl-none position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 1025 }}
          onClick={closeNavbar}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Dropdown / Drawer (Rendered below 1200px) */}
      {isOpen && (
        <div
          className="d-xl-none position-fixed start-0 end-0 px-3 py-3"
          style={{
            top: '64px',
            zIndex: 1030,
            maxHeight: 'calc(100vh - 72px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div 
            className="glass-card p-3 p-sm-4 shadow-lg border"
            style={{
              background: 'var(--glass-surface-card-hover)',
              backdropFilter: 'var(--glass-blur-lg)',
              WebkitBackdropFilter: 'var(--glass-blur-lg)',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div className="mb-3 pb-2 border-bottom d-flex align-items-center justify-content-between">
              <LanguageSelector variant="pills" />
              <ThemeToggle showLabel />
            </div>

            <ul className="list-unstyled mb-3 d-flex flex-column gap-1">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    onClick={closeNavbar}
                    className={({ isActive }) =>
                      `d-flex align-items-center px-3 py-2.5 text-decoration-none rounded-3 fw-semibold transition-all ${
                        isActive
                          ? 'glass-btn-primary shadow-sm'
                          : 'text-body hover-bg-subtle'
                      }`
                    }
                    style={{ minHeight: '44px' }}
                  >
                    {link.fullLabel || link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="pt-2 d-flex flex-column gap-2 border-top">
              <Link
                to="/appointments/book"
                onClick={closeNavbar}
                className="glass-btn glass-btn-primary w-100 text-center justify-content-center py-2.5"
                style={{ minHeight: '44px' }}
              >
                <Calendar size={17} className="me-2" />
                {t('nav.bookConsultation')}
              </Link>
              {isAuthenticated && currentUser?.role === 'PATIENT' ? (
                <button
                  type="button"
                  className="glass-btn glass-btn-outline text-danger w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
                  style={{ minHeight: '44px', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  onClick={handleLogout}
                >
                  <LogOut size={17} />
                  Sign Out ({currentUser.name?.split(' ')[0] || 'Patient'})
                </button>
              ) : !isAuthenticated ? (
                <Link
                  to="/patient/login"
                  onClick={closeNavbar}
                  className="glass-btn glass-btn-secondary w-100 py-2.5 text-center justify-content-center"
                  style={{ minHeight: '44px' }}
                >
                  <User size={17} className="me-2" />
                  Sign In to Patient Portal
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
