import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import Button from '../../components/common/Button';

/**
 * Hospital Platform — 404 Not Found Page (Phase 1)
 */
export function NotFoundPage() {
  return (
    <Container className="text-center py-5">
      <div className="hospital-card p-5 mx-auto" style={{ maxWidth: '600px' }}>
        <h1 className="display-4 fw-bold text-secondary mb-2">404</h1>
        <h2 className="hospital-section-title mb-3">Page Not Found</h2>
        <p className="hospital-text-supporting mb-4">
          The requested page could not be located in the Hospital Platform directory.
          Please verify the web address or return to the main hospital portal.
        </p>
        <Link to="/">
          <Button variant="primary">Return to Hospital Home</Button>
        </Link>
      </div>
    </Container>
  );
}

export default NotFoundPage;
