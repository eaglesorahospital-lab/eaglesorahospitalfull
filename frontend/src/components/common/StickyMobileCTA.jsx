import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HOSPITAL_METADATA } from '../../data/navigation';

/**
 * Sticky Mobile Call to Action
 * Provides a persistent, accessible quick-action bar for mobile viewports (< 768px).
 * - Hidden on booking, authentication, and private dashboard pages.
 * - Respects device safe-area insets.
 * - Two clear actions: Quick Emergency / Help Desk Call and Book Appointment.
 */
export function StickyMobileCTA() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  // Pages where sticky CTA should NOT appear:
  // - Already booking an appointment
  // - Confirmation page
  // - Login or authentication pages
  // - Private patient, staff, or doctor portals
  // - Admin dashboards
  const isExcluded =
    path === '/appointments/book' ||
    path === '/appointments/result' ||
    path === '/login' ||
    path === '/patient/login' ||
    path === '/staff/login' ||
    path.startsWith('/admin') ||
    path.startsWith('/doctor') ||
    path.startsWith('/my-appointments') ||
    path.startsWith('/profile');

  if (isExcluded) {
    return null;
  }

  const callNumber = HOSPITAL_METADATA.emergencyPhone || HOSPITAL_METADATA.generalPhone;
  const cleanTel = callNumber.replace(/[^+\d]/g, '');

  return (
    <aside
      className="sticky-mobile-cta d-block d-md-none"
      aria-label="Quick actions"
      role="region"
    >
      <div className="sticky-mobile-cta-container">
        <a
          href={`tel:${cleanTel}`}
          className="sticky-cta-btn sticky-cta-call"
          aria-label={`Call Hospital Help Desk: ${callNumber}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>Call Desk</span>
        </a>

        <Link
          to="/appointments/book"
          className="sticky-cta-btn sticky-cta-book"
          id="sticky-mobile-book-cta"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Book Appointment</span>
        </Link>
      </div>
    </aside>
  );
}

export default StickyMobileCTA;
