import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  UserCheck,
  Building2,
  Stethoscope,
  RefreshCw
} from 'lucide-react';
import doctorService from '../../services/doctorService';
import ThemeToggle from '../../components/common/ThemeToggle';
import { HOSPITAL_METADATA } from '../../data/navigation';

export function AcceptInvitationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Token verification states
  const [isValidating, setIsValidating] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Password strength calculation
  const calculateStrength = (pass) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(password);

  // Validate token on mount
  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      if (!token) {
        if (isMounted) {
          setValidationError('No invitation token found in link. Please use the complete activation link provided in your email.');
          setIsValidating(false);
        }
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      try {
        const res = await doctorService.validateInvitationToken(token);
        if (isMounted) {
          if (res.valid) {
            setInvitationData(res);
          } else {
            setValidationError(res.detail || 'This invitation link is invalid or has expired.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setValidationError(err.message || 'Unable to verify invitation link. It may be expired or already redeemed.');
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!password || !confirmPassword) {
      setSubmitError('Please provide both new password and confirmation password.');
      return;
    }

    if (password.length < 8) {
      setSubmitError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await doctorService.acceptInvitation({
        token,
        password,
        passwordConfirm: confirmPassword,
      });

      setSubmitSuccess(true);

      setTimeout(() => {
        navigate('/doctor', { replace: true });
      }, 1800);
    } catch (err) {
      setSubmitError(err.message || 'Failed to activate account. The invitation may have expired or been revoked.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-5"
      style={{ backgroundColor: 'var(--neu-bg)' }}
    >
      <div className="container" style={{ maxWidth: '520px' }}>
        {/* Brand Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2">
            <div
              className="hospital-brand-cross-icon neu-raised d-flex align-items-center justify-content-center"
              style={{ width: '36px', height: '36px' }}
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
          {/* State 1: Validating Token */}
          {isValidating && (
            <div className="text-center py-5" role="status">
              <div
                className="spinner-border text-primary mb-3"
                role="status"
                style={{ width: '3rem', height: '3rem' }}
              >
                <span className="visually-hidden">Validating invitation...</span>
              </div>
              <h2 className="h5 fw-bold text-body mb-2">Verifying Consultant Invitation</h2>
              <p className="text-muted small mb-0">
                Securing connection and verifying credentials with hospital registry...
              </p>
            </div>
          )}

          {/* State 2: Token Validation Error */}
          {!isValidating && validationError && (
            <div className="text-center">
              <div
                className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3 neu-inset"
                style={{ width: '64px', height: '64px', color: '#DC2626' }}
              >
                <AlertCircle size={32} />
              </div>
              <h1 className="h4 fw-bold text-body mb-2">Invitation Unavailable</h1>
              <p className="text-muted small mb-4">
                {validationError}
              </p>

              <div className="neu-inset p-3 rounded-3 text-start small mb-4 text-muted">
                <div className="fw-semibold text-body mb-1">Need assistance?</div>
                <div>Please contact Hospital Medical Staff Administration or your department director to request a fresh onboarding invitation link.</div>
              </div>

              <div className="d-flex gap-2 justify-content-center">
                <Link to="/staff/login" className="btn neu-btn-primary px-4 py-2">
                  Staff Login Portal
                </Link>
                <Link to="/" className="btn neu-btn-outline px-4 py-2">
                  Hospital Home
                </Link>
              </div>
            </div>
          )}

          {/* State 3: Valid Token -> Password Setup Form */}
          {!isValidating && !validationError && (
            <>
              <div className="text-center mb-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3 neu-inset"
                  style={{ width: '64px', height: '64px', color: '#16845B' }}
                >
                  <UserCheck size={30} />
                </div>
                <h1 className="h4 fw-bold text-body mb-1">
                  Activate Consultant Account
                </h1>
                <p className="text-muted small mb-0">
                  Welcome to EgleSora Hospital. Set your password to complete credentialing and access your doctor workspace.
                </p>
              </div>

              {/* Doctor Details Badge */}
              {invitationData?.doctor && (
                <div className="neu-inset p-3 rounded-3 mb-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Stethoscope size={16} className="text-primary flex-shrink-0" />
                    <span className="fw-bold text-body">{invitationData.doctor.name}</span>
                  </div>
                  <div className="d-flex flex-wrap gap-x-3 gap-y-1 small text-muted">
                    <div className="d-flex align-items-center gap-1">
                      <Building2 size={14} />
                      <span>{invitationData.doctor.department}</span>
                    </div>
                    {invitationData.doctor.specialty && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                        {invitationData.doctor.specialty}
                      </span>
                    )}
                  </div>
                  {invitationData.email && (
                    <div className="small text-muted mt-2 pt-2 border-top border-secondary-subtle">
                      Registered Email: <span className="text-body fw-medium">{invitationData.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Security Banner */}
              <div
                className="neu-inset p-3 rounded-3 small mb-4 d-flex align-items-center gap-2 text-muted"
                role="status"
              >
                <ShieldCheck size={18} className="text-primary flex-shrink-0" />
                <span>Encrypted single-use activation. Passwords must be at least 8 characters long.</span>
              </div>

              {submitError && (
                <div
                  className="neu-inset p-3 rounded-3 border-start border-4 border-danger small mb-4 text-danger d-flex align-items-center gap-2"
                  role="alert"
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div
                  className="neu-inset p-3 rounded-3 border-start border-4 border-success small mb-4 text-success d-flex align-items-center gap-2"
                  role="alert"
                >
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <span>Account activated successfully! Launching your consultant workspace...</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* New Password */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-body" htmlFor="doc-new-pass">
                    New Password
                  </label>
                  <div className="position-relative">
                    <input
                      id="doc-new-pass"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control neu-input pe-5"
                      placeholder="Minimum 8 characters with numbers & symbols"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting || submitSuccess}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="btn position-absolute end-0 top-50 translate-middle-y text-muted border-0 bg-transparent p-2 me-1"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="progress neu-inset" style={{ height: '6px' }}>
                        <div
                          className={`progress-bar ${
                            strength <= 25
                              ? 'bg-danger'
                              : strength <= 50
                              ? 'bg-warning'
                              : strength <= 70
                              ? 'bg-info'
                              : 'bg-success'
                          }`}
                          role="progressbar"
                          style={{ width: `${strength}%` }}
                          aria-valuenow={strength}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                          Strength: {strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 70 ? 'Good' : 'Strong'}
                        </span>
                        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                          {password.length >= 8 ? '✓ 8+ chars' : '× 8+ chars'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label className="form-label small fw-semibold text-body" htmlFor="doc-confirm-pass">
                    Confirm New Password
                  </label>
                  <input
                    id="doc-confirm-pass"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-control neu-input ${
                      confirmPassword && password !== confirmPassword ? 'border-danger' : ''
                    }`}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting || submitSuccess}
                    required
                    autoComplete="new-password"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <div className="text-danger small mt-1">Passwords do not match.</div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn neu-btn-primary w-100 py-3 fw-semibold d-flex align-items-center justify-content-center gap-2"
                  disabled={isSubmitting || submitSuccess || !password || password !== confirmPassword}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Activating Consultant Account...</span>
                    </>
                  ) : submitSuccess ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Account Activated</span>
                    </>
                  ) : (
                    <>
                      <span>Activate & Enter Portal</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="text-center mt-4">
                <p className="text-muted small mb-0">
                  Already activated your account?{' '}
                  <Link to="/staff/login" className="text-primary text-decoration-none fw-semibold">
                    Sign in to Staff Portal
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AcceptInvitationPage;
