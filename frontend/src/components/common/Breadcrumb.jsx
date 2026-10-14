import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Hospital Platform — Breadcrumb Component (Phase 1)
 * Semantic breadcrumbs with accessible markup.
 */
export function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="hospital-breadcrumb-nav mb-2">
      <ol className="hospital-breadcrumb list-unstyled d-flex flex-wrap align-items-center mb-0 p-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={item.label + index}
              className={`hospital-breadcrumb-item d-inline-flex align-items-center ${isLast ? 'active text-body fw-medium' : 'text-muted'}`}
              aria-current={isLast ? 'page' : undefined}
            >
              {isLast || !item.to ? (
                <span>{item.label}</span>
              ) : (
                <Link to={item.to} className="text-decoration-none text-primary">
                  {item.label}
                </Link>
              )}
              {!isLast && <span className="hospital-breadcrumb-separator mx-2 text-muted opacity-50" aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


export default Breadcrumb;
