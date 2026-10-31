import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import { HOSPITAL_METADATA } from '../../data/navigation';
import ThemeToggle from '../../components/common/ThemeToggle';
import SEO from '../../components/common/SEO';
import { Activity, ShieldCheck, Mail, Lock, User, Phone, MapPin, Calendar, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { sanitizeRedirectUrl } from '../../utils/urlSecurity';

/**
 * Hospital Platform — Patient Portal Authentication
 * Dedicated patient login and registration gateway with Neumorphism / Soft UI styling.
 */
export function PatientLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('FEMALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const redirectPath = sanitizeRedirectUrl(searchParams.get('redirect'), '/my-appointments');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      // Clear any prior stale session before initiating login
      authService.clearSession();

      const { user } = await authService.login(email, password, 'patient');

      if (!user || user.role !== 'PATIENT') {
        authService.clearSession();
        setErrorMessage('Access denied: Patient portal is restricted to patient accounts. Medical staff and administrators must use the Staff Portal.');
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch (err) {
      authService.clearSession();
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !passwordConfirm) {
      setErrorMessage('Email, password, and password confirmation are required.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({
        email: trimmedEmail,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        gender,
        date_of_birth: dateOfBirth ? dateOfBirth : null,
        address: address.trim(),
      });

      setSuccessMessage('Account registered successfully! Redirecting to Patient Portal...');
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="patient-login-page py-5 min-vh-100 d-flex flex-column justify-content-center">
      <SEO
        title="Patient Portal Login | EgleSora Hospital"
        description="Securely access your patient appointment history, consultation slips, and medical profile at EgleSora Hospital."
        canonicalUrl="/patient/login"
      />
      <div className="container" style={{ maxWidth: '540px' }}>
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

        {/* Brand Header */}
        <div className="text-center mb-4">
          <h1 className="h4 fw-bold text-body mb-1">Patient Portal Gateway</h1>
          <p className="text-muted small mb-0">
            Secure, verified access to your personal consultations, appointments, and medical record.
          </p>
        </div>

        {/* Tab Segment Controls */}
        <div className="d-flex justify-content-center mb-4">
          <div className="neu-inset p-1 rounded-pill d-inline-flex gap-1" style={{ maxWidth: '100%' }}>
            <button
              type="button"
              style={{ minHeight: '44px' }}
              className={`neu-btn neu-btn-sm rounded-pill px-4 ${mode === 'login' ? 'neu-btn-primary' : 'neu-btn-outline border-0 shadow-none'}`}
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              style={{ minHeight: '44px' }}
              className={`neu-btn neu-btn-sm rounded-pill px-4 ${mode === 'register' ? 'neu-btn-primary' : 'neu-btn-outline border-0 shadow-none'}`}
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
            >
              Register New Patient
            </button>
          </div>
        </div>

        {/* Auth Card */}
        <div className="neu-raised neu-surface rounded-4 p-4 p-sm-5">
          {errorMessage && (
            <div className="neu-inset p-3 rounded-3 border-start border-4 border-danger small mb-3 text-danger d-flex align-items-center gap-2" role="alert">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="neu-inset p-3 rounded-3 border-start border-4 border-success small mb-3 text-success d-flex align-items-center gap-2" role="alert">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="hospital-form-label mb-1" htmlFor="patient-login-email">
                  Email Address <span className="text-danger">*</span>
                </label>
                <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-2">
                  <span className="text-muted ps-2">
                    <Mail size={16} />
                  </span>
                  <input
                    id="patient-login-email"
                    type="email"
                    className="form-control bg-transparent border-0 shadow-none ps-0"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="hospital-form-label mb-1" htmlFor="patient-login-pass">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-2">
                  <span className="text-muted ps-2">
                    <Lock size={16} />
                  </span>
                  <input
                    id="patient-login-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control bg-transparent border-0 shadow-none ps-0"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-link text-muted pe-2 p-0 text-decoration-none d-flex align-items-center justify-content-center"
                    style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="neu-btn neu-btn-primary w-100 py-2 fw-semibold justify-content-center d-flex align-items-center gap-2"
                style={{ minHeight: '44px' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                ) : null}
                <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Patient Portal'}</span>
              </button>

              <div className="text-center mt-3 pt-3 border-top small text-muted">
                Don't have an outpatient account?{' '}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                  style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  onClick={() => setMode('register')}
                >
                  Register here
                </button>
              </div>
            </form>
          ) : (
            /* ================= REGISTER FORM ================= */
            <form onSubmit={handleRegister}>
              <div className="row g-2 mb-2">
                <div className="col-12 col-sm-6">
                  <label className="hospital-form-label mb-1" htmlFor="reg-first-name">
                    First Name
                  </label>
                  <div className="neu-inset rounded-3 p-1">
                    <input
                      id="reg-first-name"
                      type="text"
                      className="form-control bg-transparent border-0 shadow-none"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="hospital-form-label mb-1" htmlFor="reg-last-name">
                    Last Name
                  </label>
                  <div className="neu-inset rounded-3 p-1">
                    <input
                      id="reg-last-name"
                      type="text"
                      className="form-control bg-transparent border-0 shadow-none"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <label className="hospital-form-label mb-1" htmlFor="reg-email">
                  Email Address <span className="text-danger">*</span>
                </label>
                <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-2">
                  <span className="text-muted ps-2"><Mail size={15} /></span>
                  <input
                    id="reg-email"
                    type="email"
                    className="form-control bg-transparent border-0 shadow-none ps-0"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-12 col-sm-6">
                  <label className="hospital-form-label mb-1" htmlFor="reg-phone">
                    Mobile Phone
                  </label>
                  <div className="neu-inset rounded-3 p-1">
                    <input
                      id="reg-phone"
                      type="tel"
                      className="form-control bg-transparent border-0 shadow-none"
                      placeholder="10-digit mobile"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="hospital-form-label mb-1" htmlFor="reg-gender">
                    Gender
                  </label>
                  <div className="neu-inset rounded-3 p-1">
                    <select
                      id="reg-gender"
                      className="form-select bg-transparent border-0 shadow-none"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <label className="hospital-form-label mb-1" htmlFor="reg-dob">
                  Date of Birth
                </label>
                <div className="neu-inset rounded-3 p-1">
                  <input
                    id="reg-dob"
                    type="date"
                    className="form-control bg-transparent border-0 shadow-none"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-2">
                <label className="hospital-form-label mb-1" htmlFor="reg-address">
                  Residential Address
                </label>
                <div className="neu-inset rounded-3 p-1">
                  <input
                    id="reg-address"
                    type="text"
                    className="form-control bg-transparent border-0 shadow-none"
                    placeholder="City, State, Postal Code"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="hospital-form-label mb-1" htmlFor="reg-password">
                    Password <span className="text-danger">*</span>
                  </label>
                  <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-1">
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      className="form-control bg-transparent border-0 shadow-none"
                      placeholder="Min 8 chars"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-link text-muted pe-2 p-0 text-decoration-none d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="hospital-form-label mb-1" htmlFor="reg-password-confirm">
                    Confirm Password <span className="text-danger">*</span>
                  </label>
                  <div className="neu-inset rounded-3 p-1 d-flex align-items-center gap-1">
                    <input
                      id="reg-password-confirm"
                      type={showRegPasswordConfirm ? 'text' : 'password'}
                      className="form-control bg-transparent border-0 shadow-none"
                      placeholder="Re-enter"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-link text-muted pe-2 p-0 text-decoration-none d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
                      onClick={() => setShowRegPasswordConfirm(!showRegPasswordConfirm)}
                      aria-label={showRegPasswordConfirm ? 'Hide password' : 'Show password'}
                      title={showRegPasswordConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showRegPasswordConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="neu-btn neu-btn-primary w-100 py-2 fw-semibold justify-content-center d-flex align-items-center gap-2"
                style={{ minHeight: '44px' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                ) : null}
                <span>{isLoading ? 'Creating Account...' : 'Register & Create Medical Record'}</span>
              </button>

              <div className="text-center mt-3 pt-3 border-top small text-muted">
                Already registered?{' '}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                  style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  onClick={() => setMode('login')}
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Portal Switching / Staff Link */}
        <div className="text-center mt-4">
          <Link to="/staff/login" className="text-decoration-none small text-muted hover-text-primary">
            Are you a doctor or hospital administrator? Sign in to Staff Workspace &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PatientLoginPage;
