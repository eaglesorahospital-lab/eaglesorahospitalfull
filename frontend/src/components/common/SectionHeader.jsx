import React from 'react';

/**
 * Hospital Platform — Section Header Component (Phase 1)
 * Enforces clear semantic hierarchy without decorative colored left stripes or orbs.
 */
export function SectionHeader({
  title,
  subtitle,
  align = 'left',
  className = '',
}) {
  const alignClass = align === 'center' ? 'text-center' : '';

  return (
    <header className={`mb-4 ${alignClass} ${className}`.trim()}>
      <h2 className="hospital-section-title">{title}</h2>
      {subtitle && <p className="hospital-text-supporting mb-0">{subtitle}</p>}
    </header>
  );
}

export default SectionHeader;
