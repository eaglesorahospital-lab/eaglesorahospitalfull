import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  Users, 
  User, 
  LogOut, 
  Activity, 
  Menu, 
  X, 
  Stethoscope, 
  ShieldCheck, 
  RotateCw,
  Bell,
  History
} from 'lucide-react';
import authService from '../services/authService';
import doctorService from '../services/doctorService';
import ThemeToggle from '../components/common/ThemeToggle';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { HOSPITAL_METADATA } from '../data/navigation';

export function DoctorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const currentUser = authService.getCurrentUser();

  // Route guard: prevent patients or unauthenticated users from entering Doctor Admin Panel
  useEffect(() => {
    if (!currentUser) {
      navigate('/staff/login', { replace: true });
    } else if (currentUser.role === 'PATIENT') {
      navigate('/my-appointments', { replace: true });
    }
  }, [currentUser, navigate]);

  // Fetch doctor profile on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProfile(true);

    doctorService
      .getMyDoctorProfile()
      .then((profile) => {
        if (isMounted) setDoctorProfile(profile);
      })
      .catch((err) => {
        console.warn('Could not load doctor profile in DoctorLayout:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close sidebar drawer on route navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Handle Escape key to dismiss drawer and lock body scroll on mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSidebarOpen) setIsSidebarOpen(false);
        if (showLogoutModal) setShowLogoutModal(false);
      }
    };

    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen, showLogoutModal]);

  const handleConfirmedLogout = async () => {
    setShowLogoutModal(false);
    await authService.logout();
    navigate('/staff/login', { replace: true });
  };

  const navItems = [
    { label: 'Doctor Dashboard', to: '/doctor', icon: LayoutDashboard, end: true },
    { label: 'My Appointments', to: '/doctor/appointments', icon: Clock },
    { label: 'Consultation History', to: '/doctor/history', icon: History },
    { label: 'Patient Details', to: '/doctor/patients', icon: Users },
    { label: 'My Schedule', to: '/doctor/schedule', icon: Calendar },
    { label: 'Notifications', to: '/doctor/notifications', icon: Bell },
    { label: 'My Profile', to: '/doctor/profile', icon: User },
  ];

  return (
    <div className="hospital-layout-root admin-root-container min-vh-100 d-flex flex-column">
      {/* Top Navigation Bar with Frosted Glass Header */}
      <header
        className="d-flex align-items-center justify-content-between px-3 px-md-4 py-2.5"
        style={{
          background: 'rgba(10, 27, 46, 0.94)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#ffffff',
          zIndex: 1020,
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'var(--glass-shadow-sm)'
        }}
      >
        <div className="d-flex align-items-center gap-2.5">
          <button
            type="button"
            className="glass-btn-icon text-white d-lg-none"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label="Toggle navigation drawer"
            style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', background: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
          >
            <Menu size={22} />
          </button>

          <Link to="/doctor" className="d-flex align-items-center gap-2 text-decoration-none text-white">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{ width: '38px', height: '38px', background: 'var(--hospital-medical-blue)', boxShadow: '0 4px 12px rgba(40, 120, 200, 0.3)' }}
            >
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <span className="fw-bold fs-6 d-block lh-1 text-white">{HOSPITAL_METADATA.name}</span>
              <span 
                className="badge mt-1 text-uppercase" 
                style={{ 
                  background: 'rgba(22, 132, 91, 0.25)', 
                  border: '1px solid rgba(22, 132, 91, 0.45)',
                  color: '#34D399',
                  fontSize: '0.65rem', 
                  letterSpacing: '0.5px' 
                }}
              >
                DOCTOR WORKSPACE
              </span>
            </div>
          </Link>
        </div>

        {/* Right Header items */}
        <div className="d-flex align-items-center gap-2.5">
          <Link
            to="/doctor/notifications"
            className="glass-btn-icon text-white p-0 text-decoration-none position-relative d-flex align-items-center justify-content-center"
            title="Clinical Notifications"
            style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', background: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
          >
            <Bell size={18} />
          </Link>

          <ThemeToggle compact />

          <div className="d-none d-sm-flex align-items-center gap-2 text-end">
            <div>
              <div className="small fw-bold text-white lh-1">
                {doctorProfile?.name || currentUser?.name || 'Dr. Consultant'}
              </div>
              <div className="small text-white-50" style={{ fontSize: '0.72rem' }}>
                {doctorProfile?.specialty || doctorProfile?.specialty_name || 'Medical Specialist'}
              </div>
            </div>
            {doctorProfile?.photo ? (
              <img
                src={doctorProfile.photo}
                alt={`Portrait of ${doctorProfile.name}`}
                width="40"
                height="40"
                className="rounded-circle border border-2 border-white flex-shrink-0"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                style={{ width: '40px', height: '40px', background: '#0D47A1' }}
              >
                {(doctorProfile?.name || currentUser?.name || 'DR')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
          </div>

          <button
            type="button"
            className="glass-btn text-white btn-sm d-flex align-items-center gap-1.5 px-3 rounded-pill"
            style={{ 
              minHeight: '40px', 
              fontSize: '0.8rem',
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#FCA5A5'
            }}
            onClick={() => setShowLogoutModal(true)}
            title="Sign out of portal"
          >
            <LogOut size={15} />
            <span className="d-none d-md-inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Body Wrapper */}
      <div className="admin-body-wrapper d-flex flex-grow-1">
        {/* Sidebar */}
        <aside
          className={`admin-sidebar glass-card d-flex flex-column py-3 px-2 ${
            isSidebarOpen ? 'show' : ''
          }`}
          style={{
            width: '240px',
            flexShrink: 0,
            background: 'var(--glass-surface-card)',
            backdropFilter: 'var(--glass-blur-lg)',
            WebkitBackdropFilter: 'var(--glass-blur-lg)',
            borderRight: 'var(--glass-border-subtle)',
            borderRadius: 0,
            boxShadow: 'var(--glass-shadow-sm)',
            transition: 'transform 0.25s ease',
          }}
        >
          <div className="d-flex align-items-center justify-content-between px-3 mb-3 d-lg-none">
            <span className="fw-bold small text-muted text-uppercase">Doctor Menu</span>
            <button
              type="button"
              className="glass-btn-icon"
              style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close navigation drawer"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="nav flex-column gap-1 flex-grow-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center gap-2.5 px-3 py-2.5 rounded-3 fw-semibold text-decoration-none transition-all ${
                      isActive
                        ? 'glass-btn-primary shadow-sm text-white'
                        : 'text-body hover-bg-subtle'
                    }`
                  }
                  style={{ minHeight: '44px', fontSize: '0.875rem' }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Doctor Summary in Sidebar */}
          <div 
            className="p-3 rounded-3 mt-auto mb-2 glass-card-sm"
            style={{ background: 'var(--glass-surface-subtle)', border: 'var(--glass-border-subtle)' }}
          >
            <div className="small fw-semibold text-body mb-0.5">Clinical Suite</div>
            <div className="small text-muted" style={{ fontSize: '0.78rem' }}>
              {doctorProfile?.consultation_location || 'OPD Clinic Wing'}
            </div>
            <div className="small text-muted mt-1" style={{ fontSize: '0.72rem' }}>
              Slot: {doctorProfile?.consultation_duration_minutes || 30} mins
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="admin-sidebar-backdrop glass-modal-backdrop d-lg-none"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
            style={{ zIndex: 1035 }}
          />
        )}

        {/* Main Content View */}
        <main className="admin-main-content flex-grow-1 p-3 p-md-4">
          <ErrorBoundary>
            <Outlet context={{ doctorProfile, setDoctorProfile, isLoadingProfile }} />
          </ErrorBoundary>
        </main>
      </div>

      {/* Footer */}
      <footer
        className="py-2.5 px-4 small d-flex flex-wrap justify-content-between align-items-center"
        style={{
          background: 'rgba(10, 27, 46, 0.94)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: 'rgba(255, 255, 255, 0.75)',
          borderTop: '1px solid rgba(255, 255, 255, 0.10)',
          fontSize: '0.8rem',
        }}
      >
        <span>Eagle Sora Hospital — Doctor Portal</span>
        <span>
          Authenticated: <strong>{doctorProfile?.name || currentUser?.email}</strong>
        </span>
      </footer>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div
          className="modal show d-block glass-modal-backdrop"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content glass-modal rounded-4 p-4 border-0">
              <div className="text-center mb-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3 text-danger"
                  style={{ width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.15)' }}
                >
                  <LogOut size={26} />
                </div>
                <h5 className="h5 fw-bold text-body mb-1">Sign Out of Doctor Portal?</h5>
                <p className="text-muted small mb-0">
                  Your clinical session tokens will be revoked and cleared securely.
                </p>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="glass-btn glass-btn-secondary w-50"
                  style={{ minHeight: '44px' }}
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="glass-btn glass-btn-primary w-50"
                  style={{ minHeight: '44px', background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
                  onClick={handleConfirmedLogout}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorLayout;
