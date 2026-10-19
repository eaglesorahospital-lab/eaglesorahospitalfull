import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Building2, PhoneCall, Stethoscope, AlertTriangle } from 'lucide-react';
import Container from '../../components/common/Container';
import SEO from '../../components/common/SEO';
import { HOSPITAL_METADATA } from '../../data/navigation';

/**
 * Hospital Platform — 404 Not Found Page (Neumorphic Redesign)
 * Dignified, accessible healthcare 404 page with navigation to Home,
 * Departments, and Contact, plus verified 24/7 emergency hotline.
 */
export function NotFoundPage() {
  return (
    <>
      <SEO
        title="Page Not Found"
        description="The requested page could not be located in the EgleSora Hospital directory. Please check the URL or return to the reception portal."
      />
      <Container className="text-center py-5">
        <div
          className="neu-card p-4 p-md-5 mx-auto my-4 my-md-5"
          style={{
            maxWidth: '640px',
            borderRadius: '28px',
            background: 'var(--hospital-surface)',
          }}
        >
          {/* Medical Icon Emblem */}
          <div
            className="neu-icon-circle mx-auto mb-4 d-flex align-items-center justify-content-center position-relative"
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'var(--hospital-surface)',
              boxShadow: 'var(--neu-inset)',
              color: 'var(--hospital-blue)',
            }}
            aria-hidden="true"
          >
            <Stethoscope size={48} strokeWidth={1.75} />
            <div
              className="position-absolute bottom-0 end-0 rounded-circle bg-warning p-1 border border-white"
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <AlertTriangle size={16} className="text-dark" />
            </div>
          </div>

          <h1
            className="display-4 fw-bold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--hospital-primary-navy)' }}
          >
            404
          </h1>

          <h2 className="fs-5 fw-bold mb-3" style={{ color: 'var(--hospital-text)' }}>
            Clinical Page Not Found
          </h2>

          <p className="small text-muted mb-4" style={{ lineHeight: '1.6', maxWidth: '480px', margin: '0 auto' }}>
            The requested page or clinical directory record could not be located.
            Please verify the address or use the quick access options below to reach
            outpatient services and hospital departments.
          </p>

          {/* Core Action Buttons: Home, Departments, Contact */}
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 gap-sm-3 mb-4">
            <Link
              to="/"
              className="neu-btn neu-btn-primary d-inline-flex align-items-center justify-content-center gap-2 py-2 px-3"
            >
              <Home size={16} />
              <span>Return Home</span>
            </Link>
            <Link
              to="/departments"
              className="neu-btn neu-btn-outline d-inline-flex align-items-center justify-content-center gap-2 py-2 px-3"
            >
              <Building2 size={16} />
              <span>Explore Departments</span>
            </Link>
            <Link
              to="/contact"
              className="neu-btn neu-btn-secondary d-inline-flex align-items-center justify-content-center gap-2 py-2 px-3"
            >
              <PhoneCall size={16} />
              <span>Contact Hospital</span>
            </Link>
          </div>

          <div className="pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2 text-muted small">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn btn-link btn-sm text-decoration-none text-muted p-0 d-inline-flex align-items-center gap-1 hover-text-primary"
            >
              <ArrowLeft size={14} />
              <span>Go to previous page</span>
            </button>

            <span className="d-inline-flex align-items-center gap-1">
              <span>24/7 Emergency Desk:</span>
              <a
                href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`}
                className="fw-bold text-danger text-decoration-none"
              >
                {HOSPITAL_METADATA.emergencyPhone}
              </a>
            </span>
          </div>
        </div>
      </Container>
    </>
  );
}

export default NotFoundPage;
