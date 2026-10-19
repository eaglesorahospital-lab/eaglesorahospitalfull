/**
 * Hospital Platform — Privacy-First Analytics Service (Phase 15/18)
 *
 * Strict Privacy & Healthcare Compliance Rules:
 * - Disabled by default when VITE_ANALYTICS_ID is empty/missing
 * - Strictly respects user consent from CookieConsent component
 * - Completely ignores private patient/staff areas (/admin/*, /doctor/*, /profile, /my-appointments/*, /staff/*)
 * - Masks URL query parameters to avoid leaking reference IDs, tokens, or search queries
 * - NEVER sends patient names, diagnoses, health symptoms, or authentication tokens
 */

const ANALYTICS_ID = import.meta.env.VITE_ANALYTICS_ID || '';
const CONSENT_STORAGE_KEY = 'eglesora_cookie_consent';

const RESTRICTED_PATH_PREFIXES = [
  '/admin',
  '/doctor',
  '/staff',
  '/patient',
  '/my-appointments',
  '/profile',
  '/login',
];

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Checks whether the visitor has granted consent for analytics cookies
   */
  hasConsent() {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      return Boolean(parsed?.analytics);
    } catch (e) {
      return false;
    }
  }

  /**
   * Initializes analytics only if configured and consented
   */
  init() {
    if (!ANALYTICS_ID) {
      // Configuration absent: remain completely silent
      return false;
    }

    if (!this.hasConsent()) {
      return false;
    }

    if (this.isInitialized) return true;

    // Dynamically inject GA4 or compatible analytics tag safely
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', ANALYTICS_ID, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        restricted_data_processing: true,
        send_page_view: false,
      });

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('Analytics initialization skipped:', err);
      return false;
    }
  }

  /**
   * Clean and sanitize URL paths before recording a page view
   */
  sanitizePath(pathname) {
    if (!pathname) return '/';
    // If route is within private clinical or staff portal, DO NOT TRACK
    for (const prefix of RESTRICTED_PATH_PREFIXES) {
      if (pathname.startsWith(prefix)) {
        return null;
      }
    }
    return pathname;
  }

  /**
   * Tracks an anonymized page view on public informational pages
   */
  trackPageView(pathname) {
    if (!this.init()) return;

    const safePath = this.sanitizePath(pathname);
    if (!safePath) return; // Skip private routes

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: safePath,
      });
    }
  }

  /**
   * Tracks a non-sensitive interaction event (e.g. language toggle, theme toggle)
   */
  trackEvent(category, action, label = null) {
    if (!this.init()) return;

    if (typeof window.gtag === 'function') {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
      });
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
