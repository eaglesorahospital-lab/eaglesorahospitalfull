import React from 'react';

/**
 * Hospital Platform — Container Component (Phase 1)
 * Standardizes responsive boundaries and eliminates horizontal overflow.
 */
export function Container({
  children,
  fluid = false,
  className = '',
  as: Component = 'div',
  ...rest
}) {
  const containerClass = fluid ? 'container-fluid' : 'hospital-container';

  return (
    <Component className={`${containerClass} ${className}`.trim()} {...rest}>
      {children}
    </Component>
  );
}

export default Container;
