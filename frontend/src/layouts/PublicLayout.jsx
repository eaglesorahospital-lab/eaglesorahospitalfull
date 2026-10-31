import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import CookieConsent from '../components/common/CookieConsent';
import StickyMobileCTA from '../components/common/StickyMobileCTA';
import BackToTop from '../components/common/BackToTop';

/**
 * Hospital Platform — Public Layout (Phase 1)
 * Standard outer wrapper for all patient-facing and public hospital views.
 */
export function PublicLayout() {
  return (
    <div className="hospital-layout-root has-sticky-cta">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <TopBar />
      <Navbar />
      <main id="main-content" className="hospital-main-content">
        <Outlet />
      </main>
      <Footer />
      <StickyMobileCTA />
      <BackToTop />
      <CookieConsent />
    </div>
  );
}

export default PublicLayout;
