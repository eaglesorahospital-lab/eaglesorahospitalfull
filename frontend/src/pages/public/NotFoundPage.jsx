import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';
import Container from '../../components/common/Container';

/**
 * Hospital Platform — 404 Not Found Page (Neumorphic Redesign)
 */
export function NotFoundPage() {
  return (
    <Container className="text-center py-5">
      <div 
        className="neu-card p-5 mx-auto my-5" 
        style={{ maxWidth: '560px', borderRadius: '28px', background: 'var(--hospital-surface)' }}
      >
        <div 
          className="neu-icon-circle mx-auto mb-4 d-flex align-items-center justify-content-center"
          style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'var(--hospital-surface)', 
            boxShadow: 'var(--neu-inset)',
            color: 'var(--hospital-blue)'
          }}
        >
          <AlertCircle size={40} />
        </div>
        <h1 
          className="display-4 fw-bold mb-2" 
          style={{ fontFamily: 'var(--font-display)', color: 'var(--hospital-primary-navy)' }}
        >
          404
        </h1>
        <h2 className="fs-5 fw-bold mb-3" style={{ color: 'var(--hospital-text)' }}>
          Clinical Page Not Found
        </h2>
        <p className="small text-muted mb-4" style={{ lineHeight: '1.6' }}>
          The requested page could not be located in the EagleSora Hospital directory.
          Please verify the web address or return to the outpatient reception portal.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Link to="/" className="neu-btn neu-btn-primary d-inline-flex align-items-center gap-2">
            <Home size={16} /> Return to Home
          </Link>
          <button 
            type="button" 
            onClick={() => window.history.back()} 
            className="neu-btn neu-btn-outline d-inline-flex align-items-center gap-2"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    </Container>
  );
}

export default NotFoundPage;
