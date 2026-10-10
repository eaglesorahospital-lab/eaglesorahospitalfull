import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import { HOSPITAL_METADATA } from '../../data/navigation';

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

      // If patient user logs in, route them seamlessly to Patient Portal
      if (user.role === 'PATIENT') {
        navigate('/my-appointments', { replace: true });
        return;
      }

      // Check for redirect query or default based on role
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
      style={{ backgroundColor: '#0f172a' }}
    >
      <div className="container" style={{ maxWidth: '480px' }}>
        {/* Institutional Branding Header */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded p-3 mb-3"
            style={{ width: '56px', height: '56px' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
            </svg>
          </div>
          <h1 className="h4 fw-bold text-white mb-1">{HOSPITAL_METADATA.name}</h1>
          <div className="text-secondary small">{t('staff.portalTitle')}</div>
        </div>

        {/* Login Card */}
        <div className="card shadow-lg border-0 rounded-3">
          <div className="card-body p-4 p-sm-5">
            <div className="alert alert-info py-2 px-3 small mb-4" role="status">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="me-2 d-inline"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {t('staff.portalNotice')}
            </div>

            {errorMessage && (
              <div className="alert alert-danger py-2 px-3 small mb-4" role="alert">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="staff-email" className="form-label small fw-semibold text-dark">
                  {t('staff.emailLabel')} <span className="text-danger">*</span>
                </label>
                <input
                  id="staff-email"
                  type="email"
                  className="form-control"
                  placeholder="staff@eglesorahospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="staff-password" className="form-label small fw-semibold text-dark">
                  {t('staff.passwordLabel')} <span className="text-danger">*</span>
                </label>
                <input
                  id="staff-password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
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
          </div>

          <div className="card-footer bg-light text-center py-3 border-top">
            <Link to="/patient/login" className="text-primary small text-decoration-none d-block mb-1 fw-semibold">
              Looking for the Patient Portal? Sign in here &rarr;
            </Link>
            <Link to="/" className="text-muted small text-decoration-none">
              &larr; {t('staff.backToPublic')}
            </Link>
          </div>
        </div>

        {/* Security & Audit Notice */}
        <div className="text-center mt-4 text-secondary small" style={{ fontSize: '0.75rem' }}>
          Eagle Sora Hospital Information System &bull; Secure Clinical Gateway &bull; SimpleJWT Encrypted Session
        </div>
      </div>
    </div>
  );
}

export default StaffLoginPage;
