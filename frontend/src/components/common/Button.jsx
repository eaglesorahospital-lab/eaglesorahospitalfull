import React from 'react';

/**
 * Hospital Platform — Reusable Button Component (Phase 1)
 * Accessible, medical styling. Avoids playful hover bounces or glow animations.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  ariaLabel,
  ...rest
}) {
  const variantClass = `hospital-btn-${variant}`;
  const sizeClass = size === 'sm' ? 'hospital-btn-sm' : size === 'lg' ? 'hospital-btn-lg' : '';

  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`hospital-btn ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
