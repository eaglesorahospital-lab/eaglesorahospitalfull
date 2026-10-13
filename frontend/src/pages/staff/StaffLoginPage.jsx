import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import { HOSPITAL_METADATA } from '../../data/navigation';
import ThemeToggle from '../../components/common/ThemeToggle';
import { Activity, ShieldCheck, Mail, Lock, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * Hospital Platform — Staff & Doctor Portal Login
 * Dedicated, unlinked authentication gateway for hospital administrators and medical staff.
 * Connects directly to Django REST Framework JWT endpoint (/api/auth/login/).
 */
export function StaffLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both institutional email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const { user } = await authService.login(email, password);

      if (user.role === 'PATIENT') {
        navigate('/my-appointments', { replace: true });
        return;
      }

      const searchParams = new URLSearchParams(location.search);
      const redirectPath = searchParams.get('redirect');

      if (redirectPath && redirectPath.startsWith('/admin')) {
        navigate(redirectPath, { replace: true });
      } else if (user.role === 'DOCTOR_STAFF') {
        navigate('/admin/schedules', { replace: true });
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || t('staff.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-5"
      style={{ backgroundColor: 'var(--neu-bg)' }}
    >
      <div className="container" style={{ maxWidth: '480px' }}>
        {/* Top actions: Brand + ThemeToggle */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2">
            <div className="hospital-brand-cross-icon neu-raised d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }} aria-hidden="true">
              <Activity size={20} className="text-white" />
            </div>
            <span className="fs-5 fw-bold text-body">{HOSPITAL_METADATA.name}</span>
          </Link>
          <ThemeToggle compact />
        </div>

        {/* Institutional Branding Header */}
        <div className="text-center mb-4">
          <div className="neu-eyebrow text-uppercase fw-bold text-primary mb-1">
            Institutional Gateway
          </div>
          <h1 className="h4 fw-bold text-body mb-1">{t('staff.portalTitle')}</h1>
          <p className="text-muted small mb-0">
            Internal operations system for medical faculty and administrative personnel.
          </p>
        </div>

        {/* Login Card */}
        <div className="neu-raised neu-surface rounded-4 p-4 p-sm-5">
          <div className="neu-inset p-3 rounded-3 small mb-4 d-flex align-items-center gap-2 text-muted" role="status">
            <ShieldCheck size={18} className="text-primary flex-shrink-0" />
            <span>{t('staff.portalNotice')}</span>
          </div>

          {errorMessage && (
            <div className="neu-inset p-3 rounded-3 border-start border-4 border-danger small mb-4 text-danger d-flex align-items-center gap-2" role="alert">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="staff-email" className="hospital-form-label mb-1">
                {t('staff.emailLabel')} <span className="text-danger">*</span>
              </label>
              <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-2">
                <span className="text-muted ps-2"><Mail size={16} /></span>
                <input
                  id="staff-email"
                  type="email"
                  className="form-control bg-transparent border-0 shadow-none ps-0"
                  placeholder="staff@eglesorahospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="staff-password" className="hospital-form-label mb-1">
                {t('staff.passwordLabel')} <span className="text-danger">*</span>
              </label>
              <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-2">
                <span className="text-muted ps-2"><Lock size={16} /></span>
                <input
                  id="staff-password"
                  type="password"
                  className="form-control bg-transparent border-0 shadow-none ps-0"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="neu-btn neu-btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>{t('staff.signingIn')}</span>
                </>
              ) : (
                <span>{t('staff.loginBtn')}</span>
              )}
            </button>
          </form>

          <div className="text-center mt-4 pt-3 border-top">
            <Link to="/patient/login" className="text-primary small text-decoration-none d-inline-flex align-items-center gap-1 mb-2 fw-semibold">
              <span>Looking for the Patient Portal? Sign in here</span>
              <ArrowRight size={14} />
            </Link>
            <div>
              <Link to="/" className="text-muted small text-decoration-none d-inline-flex align-items-center gap-1">
                <ArrowLeft size={13} />
                <span>{t('staff.backToPublic')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Security & Audit Notice */}
        <div className="text-center mt-4 text-muted small" style={{ fontSize: '0.75rem' }}>
          Eagle Sora Hospital Information System &bull; Secure Clinical Gateway &bull; JWT Encrypted Session
        </div>
      </div>
    </div>
  );
}

export default StaffLoginPage;
