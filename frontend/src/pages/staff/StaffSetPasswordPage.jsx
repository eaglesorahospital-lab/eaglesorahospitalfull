import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Activity, ShieldCheck, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import authService from '../../services/authService';
import ThemeToggle from '../../components/common/ThemeToggle';
import { HOSPITAL_METADATA } from '../../data/navigation';

export function StaffSetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const isTokenFlow = Boolean(uid && token);
  const currentUser = authService.getCurrentUser();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const calculateStrength = (pass) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please provide both new password and confirmation password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (!isTokenFlow && !currentPassword) {
      setErrorMessage('Please provide your current temporary password.');
      return;
    }

    setIsLoading(true);

    try {
      if (isTokenFlow) {
        await authService.setupPassword(uid, token, newPassword, confirmPassword);
        setSuccessMessage('Password established successfully! Redirecting to consultant workspace...');
      } else {
        await authService.changePassword(currentPassword, newPassword, confirmPassword);
        setSuccessMessage('Password updated successfully! Redirecting to consultant workspace...');
      }

      setTimeout(() => {
        const user = authService.getCurrentUser();
        if (user?.role === 'DOCTOR_STAFF') {
          navigate('/doctor', { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to establish password. Link may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="staff-gateway-wrapper d-flex align-items-center justify-content-center min-vh-100 py-5"
      style={{ backgroundColor: 'var(--neu-bg)' }}
    >
      <div className="container" style={{ maxWidth: '500px' }}>
        {/* Brand Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2">
            <div
              className="hospital-brand-cross-icon neu-raised d-flex align-items-center justify-content-center"
              style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
              aria-hidden="true"
            >
              <Activity size={20} className="text-white" />
            </div>
            <span className="fs-5 fw-bold text-body">{HOSPITAL_METADATA.name}</span>
          </Link>
          <ThemeToggle compact />
        </div>

        {/* Card */}
        <div className="neu-raised neu-surface rounded-4 p-4 p-sm-5">
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3 neu-inset"
              style={{ width: '64px', height: '64px', color: '#16845B' }}
            >
              <Lock size={28} />
            </div>
            <h1 className="h4 fw-bold text-body mb-1">
              {isTokenFlow ? 'Set Consultant Password' : 'Change Temporary Password'}
            </h1>
            <p className="text-muted small mb-0">
              {isTokenFlow
                ? 'Welcome to EgleSora Hospital. Please create a strong, secure password for your staff account.'
                : 'For clinical data security, you must update your temporary password before accessing the doctor portal.'}
            </p>
          </div>

          <div
            className="neu-inset p-3 rounded-3 small mb-4 d-flex align-items-center gap-2 text-muted"
            role="status"
          >
            <ShieldCheck size={18} className="text-primary flex-shrink-0" />
            <span>Encrypted transmission. Passwords must be at least 8 characters long.</span>
          </div>

          {errorMessage && (
            <div
              className="neu-inset p-3 rounded-3 border-start border-4 border-danger small mb-4 text-danger d-flex align-items-center gap-2"
              role="alert"
            >
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              className="neu-inset p-3 rounded-3 border-start border-4 border-success small mb-4 text-success d-flex align-items-center gap-2"
              role="alert"
            >
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isTokenFlow && (
              <div className="mb-3">
                <label className="neu-form-label">
                  Temporary Password <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="neu-input pe-5"
                    placeholder="Enter current temporary password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3 text-decoration-none"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="neu-form-label">
                New Password <span className="text-danger">*</span>
              </label>
              <div className="position-relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="neu-input pe-5"
                  placeholder="Create new institutional password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                {isTokenFlow && (
                  <button
                    type="button"
                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3 text-decoration-none"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>

              {/* Password strength progress bar */}
              {newPassword && (
                <div className="mt-2">
                  <div className="progress" style={{ height: '5px' }}>
                    <div
                      className={`progress-bar ${
                        strength <= 25 ? 'bg-danger' : strength <= 50 ? 'bg-warning' : strength <= 75 ? 'bg-info' : 'bg-success'
                      }`}
                      role="progressbar"
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                  <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: '0.72rem' }}>
                    <span>Min 8 characters</span>
                    <span>
                      {strength <= 25
                        ? 'Weak'
                        : strength <= 50
                        ? 'Fair'
                        : strength <= 75
                        ? 'Good'
                        : 'Strong'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="neu-form-label">
                Confirm New Password <span className="text-danger">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="neu-input"
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="neu-btn neu-btn-primary w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
              disabled={isLoading || Boolean(successMessage)}
            >
              {isLoading ? (
                <span>Establishing credentials...</span>
              ) : (
                <>
                  <span>Save Password & Access Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <Link to="/staff/login" className="text-decoration-none small text-muted">
              Return to Staff Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffSetPasswordPage;
