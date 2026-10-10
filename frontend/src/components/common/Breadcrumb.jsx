import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Hospital Platform — Breadcrumb Component (Phase 1)
 * Semantic breadcrumbs with accessible markup.
 */
export function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="hospital-breadcrumb">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={item.label + index}
              className={`hospital-breadcrumb-item ${isLast ? 'active' : ''}`}
              aria-current={isLast ? 'page' : undefined}
            >
              {isLast || !item.to ? (
                <span>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
