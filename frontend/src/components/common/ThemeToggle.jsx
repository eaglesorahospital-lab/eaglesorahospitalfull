import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '', compact = false, showLabel = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`neu-theme-toggle ${compact ? 'neu-theme-toggle-compact' : ''} ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={`toggle-icon-wrap ${isDark ? 'is-dark' : 'is-light'}`}>
        {isDark ? (
          <Moon size={compact ? 15 : 17} className="text-accent-cyan" />
        ) : (
          <Sun size={compact ? 15 : 17} className="text-warning" />
        )}
      </span>
      {showLabel && (
        <span className="toggle-label text-muted small fw-medium ms-1">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}
