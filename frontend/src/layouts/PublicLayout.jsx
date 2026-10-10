import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

/**
 * Hospital Platform — Public Layout (Phase 1)
 * Standard outer wrapper for all patient-facing and public hospital views.
 */
export function PublicLayout() {
  return (
    <div className="hospital-layout-root">
      <TopBar />
      <Navbar />
      <main id="main-content" className="hospital-main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default PublicLayout;
