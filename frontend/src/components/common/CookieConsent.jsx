import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cookie, Settings, Check, X, Info } from 'lucide-react';
import analyticsService from '../../services/analyticsService';

const CONSENT_KEY = 'eglesora_cookie_consent';

/**
 * Hospital Platform — Cookie Consent & Privacy Preference Interface (Phase 15/17)
 *
 * Features:
 * - Clear explanation of necessary authentication storage vs optional preferences
 * - Accessible controls (Accept All, Reject Non-Essential, Customize Preferences)
 * - Persistent choice in localStorage
 * - Revisit mechanism via 'openCookiePreferences' window event
 * - Initializes analytics only upon explicit opt-in
 */
export function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Preference toggles
  const [preferences, setPreferences] = useState({
    necessary: true, // Always locked to true
    functional: true,
    analytics: false,
  });

  useEffect(() => {
    // Check if consent has already been recorded
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({
          necessary: true,
          functional: parsed.functional ?? true,
          analytics: parsed.analytics ?? false,
        });
        if (parsed.analytics) {
          analyticsService.init();
        }
      } else {
        // Show banner after brief delay
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      setIsOpen(true);
    }
  }, []);

  // Listen for openCookiePreferences event from Footer
  useEffect(() => {
    const handleOpen = () => {
      setShowPreferences(true);
      setIsOpen(true);
    };
    window.addEventListener('openCookiePreferences', handleOpen);
    return () => window.removeEventListener('openCookiePreferences', handleOpen);
  }, []);

  const saveConsent = (consentObj) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consentObj));
      setPreferences(consentObj);
      if (consentObj.analytics) {
        analyticsService.init();
      }
    } catch (e) {}
    setIsOpen(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, functional: true, analytics: true });
  };

  const handleRejectNonEssential = () => {
    saveConsent({ necessary: true, functional: false, analytics: false });
  };

  const handleSavePreferences = () => {
    saveConsent({
      necessary: true,
      functional: preferences.functional,
      analytics: preferences.analytics,
    });
  };

  if (!isOpen) return null;

  return (
    <aside
      className="position-fixed bottom-0 start-0 end-0 p-3 p-md-4"
      style={{ zIndex: 1060 }}
      role="dialog"
      aria-label="Cookie and Privacy Preferences"
      aria-modal="true"
    >
      <div className="container" style={{ maxWidth: '960px' }}>
        <div
          className="neu-card p-4 rounded-4 shadow-lg border"
          style={{
            background: 'var(--hospital-surface, #ffffff)',
            borderColor: 'var(--hospital-border, #e2e8f0)',
          }}
        >
          {!showPreferences ? (
            /* Banner View */
            <div className="row align-items-center g-3">
              <div className="col-12 col-lg-8">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div
                    className="p-1.5 rounded-circle bg-primary bg-opacity-10 text-primary d-inline-flex"
                    aria-hidden="true"
                  >
                    <Cookie size={18} />
                  </div>
                  <strong className="fs-6 text-body">Cookie & Privacy Notice</strong>
                </div>
                <p className="small text-muted mb-0" style={{ lineHeight: '1.6' }}>
                  EgleSora Hospital uses essential browser local storage to maintain secure patient and staff
                  sessions. We also use functional storage to remember your language and theme preferences.
                  We do not deploy third-party advertising cookies.{' '}
                  <Link to="/privacy" className="text-primary text-decoration-none fw-semibold">
                    Read our Privacy Policy
                  </Link>
                  .
                </p>
              </div>
              <div className="col-12 col-lg-4 d-flex flex-wrap align-items-center justify-content-lg-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="neu-btn neu-btn-outline btn-sm py-2 px-3 small d-inline-flex align-items-center gap-1"
                >
                  <Settings size={14} />
                  <span>Preferences</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="neu-btn neu-btn-secondary btn-sm py-2 px-3 small"
                >
                  Reject Optional
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="neu-btn neu-btn-primary btn-sm py-2 px-3 small fw-semibold"
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            /* Preferences Detail View */
            <div>
              <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
                <div className="d-flex align-items-center gap-2">
                  <Settings size={20} className="text-primary" />
                  <h3 className="h6 fw-bold mb-0 text-body">Manage Cookie & Storage Preferences</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="btn btn-sm btn-link text-muted p-0"
                  aria-label="Close preferences view"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="d-flex flex-column gap-3 mb-4">
                {/* 1. Necessary */}
                <div className="p-3 rounded-3 neu-inset d-flex justify-content-between align-items-center">
                  <div>
                    <strong className="d-block small text-body">1. Strictly Necessary Storage</strong>
                    <span className="small text-muted" style={{ fontSize: '0.8rem' }}>
                      Required for JWT authentication, CSRF validation, and outpatient appointment verification. Cannot be disabled.
                    </span>
                  </div>
                  <span className="neu-badge neu-badge-primary text-nowrap ms-2">Always Active</span>
                </div>

                {/* 2. Functional */}
                <div className="p-3 rounded-3 neu-surface border d-flex justify-content-between align-items-center">
                  <div>
                    <strong className="d-block small text-body">2. Functional & Language Preferences</strong>
                    <span className="small text-muted" style={{ fontSize: '0.8rem' }}>
                      Remembers your chosen interface language (English, Hindi, Marathi) and dark/light display mode.
                    </span>
                  </div>
                  <div className="form-check form-switch ms-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="cookie-functional-toggle"
                      checked={preferences.functional}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, functional: e.target.checked }))
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="visually-hidden" htmlFor="cookie-functional-toggle">
                      Toggle Functional Cookies
                    </label>
                  </div>
                </div>

                {/* 3. Analytics */}
                <div className="p-3 rounded-3 neu-surface border d-flex justify-content-between align-items-center">
                  <div>
                    <strong className="d-block small text-body">3. Anonymous Usage Statistics (Optional)</strong>
                    <span className="small text-muted" style={{ fontSize: '0.8rem' }}>
                      Helps our clinical desk measure outpatient traffic volume to allocate staff. No medical details, symptoms, or personal identities are ever collected.
                    </span>
                  </div>
                  <div className="form-check form-switch ms-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="cookie-analytics-toggle"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="visually-hidden" htmlFor="cookie-analytics-toggle">
                      Toggle Analytics Cookies
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="neu-btn neu-btn-outline btn-sm py-2 px-3 small"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="neu-btn neu-btn-primary btn-sm py-2 px-3 small fw-semibold"
                >
                  Save My Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default CookieConsent;
