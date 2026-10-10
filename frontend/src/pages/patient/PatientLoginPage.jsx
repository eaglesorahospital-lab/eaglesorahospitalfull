import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import { HOSPITAL_METADATA } from '../../data/navigation';

/**
 * Hospital Platform — Patient Portal Authentication
 * Dedicated patient login and registration gateway.
 * Fully integrated with Django REST Framework SimpleJWT endpoints:
 * - POST /api/auth/login/
 * - POST /api/auth/register/
 */
export function PatientLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('FEMALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const redirectPath = searchParams.get('redirect') || '/my-appointments';

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const { user } = await authService.login(email, password);

      if (user.role !== 'PATIENT') {
        // If staff/admin user accidentally logs in here, route them appropriately
        if (user.role === 'DOCTOR_STAFF') {
          navigate('/admin/schedules', { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password || !passwordConfirm) {
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
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName,
        last_name: lastName,
        phone,
        gender,
        date_of_birth: dateOfBirth || null,
        address,
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
    <div className="patient-login-page py-5 bg-slate-50 min-vh-100 d-flex flex-column justify-content-center">
      <div className="container" style={{ maxWidth: '540px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2 mb-2">
            <div className="hospital-brand-cross-icon bg-primary text-white p-2 rounded-2" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
              </svg>
            </div>
            <span className="fs-4 fw-bold text-dark">{HOSPITAL_METADATA.name}</span>
          </Link>
          <h1 className="h5 fw-bold text-dark mb-1">Patient Portal Gateway</h1>
          <p className="text-muted small mb-0">
            Secure, verified access to your personal consultations, appointments, and medical record.
          </p>
        </div>

        {/* Tab Segment Controls */}
        <div className="d-flex justify-content-center mb-3">
          <div className="bg-white p-1 rounded-3 border d-inline-flex gap-1 shadow-sm">
            <button
              type="button"
              className={`btn btn-sm px-4 fw-semibold ${mode === 'login' ? 'btn-primary' : 'btn-light text-muted'}`}
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-sm px-4 fw-semibold ${mode === 'register' ? 'btn-primary' : 'btn-light text-muted'}`}
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
        <div className="card shadow-sm border-0 rounded-3 p-4 bg-white">
          {errorMessage && (
            <div className="alert alert-danger small py-2 px-3 mb-3" role="alert">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success small py-2 px-3 mb-3" role="alert">
              {successMessage}
            </div>
          )}

          {mode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark" htmlFor="patient-login-email">
                  Email Address <span className="text-danger">*</span>
                </label>
                <input
                  id="patient-login-email"
                  type="email"
                  className="form-control form-control-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark" htmlFor="patient-login-pass">
                  Password <span className="text-danger">*</span>
                </label>
                <input
                  id="patient-login-pass"
                  type="password"
                  className="form-control form-control-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 btn-sm py-2 fw-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                ) : null}
                {isLoading ? 'Verifying Credentials...' : 'Sign In to Patient Portal'}
              </button>

              <div className="text-center mt-3 pt-3 border-top small text-muted">
                Don't have an outpatient account?{' '}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
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
                <div className="col-6">
                  <label className="form-label small fw-semibold text-dark" htmlFor="reg-first-name">
                    First Name
                  </label>
                  <input
                    id="reg-first-name"
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-dark" htmlFor="reg-last-name">
                    Last Name
                  </label>
                  <input
                    id="reg-last-name"
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold text-dark" htmlFor="reg-email">
                  Email Address <span className="text-danger">*</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-control form-control-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-dark" htmlFor="reg-phone">
                    Mobile Phone
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    className="form-control form-control-sm"
                    placeholder="10-digit mobile"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-dark" htmlFor="reg-gender">
                    Gender
                  </label>
                  <select
                    id="reg-gender"
                    className="form-select form-select-sm"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold text-dark" htmlFor="reg-dob">
                  Date of Birth
                </label>
                <input
                  id="reg-dob"
                  type="date"
                  className="form-control form-control-sm"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold text-dark" htmlFor="reg-address">
                  Residential Address
                </label>
                <input
                  id="reg-address"
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="City, State, Postal Code"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-dark" htmlFor="reg-password">
                    Password <span className="text-danger">*</span>
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    className="form-control form-control-sm"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-dark" htmlFor="reg-password-confirm">
                    Confirm Password <span className="text-danger">*</span>
                  </label>
                  <input
                    id="reg-password-confirm"
                    type="password"
                    className="form-control form-control-sm"
                    placeholder="Re-enter password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 btn-sm py-2 fw-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                ) : null}
                {isLoading ? 'Creating Account...' : 'Register & Create Medical Record'}
              </button>

              <div className="text-center mt-3 pt-3 border-top small text-muted">
                Already registered?{' '}
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
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
          <Link to="/staff/login" className="text-decoration-none small text-muted hover-text-dark">
            Are you a doctor or hospital administrator? Sign in to Staff Workspace &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PatientLoginPage;
