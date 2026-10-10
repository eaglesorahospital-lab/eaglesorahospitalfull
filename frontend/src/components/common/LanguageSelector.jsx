import React from 'react';
import { useTranslation } from 'react-i18next';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिंदी', short: 'HI' },
  { code: 'mr', label: 'मराठी', short: 'MR' },
];

/**
 * Hospital Platform — Accessible Language Selector
 * Allows switching between English, Hindi, and Marathi with persistence.
 */
export function LanguageSelector({ variant = 'topbar', className = '' }) {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language || 'en';

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const handleSelectCode = (code) => {
    i18n.changeLanguage(code);
  };

  if (variant === 'pills') {
    return (
      <div
        className={`hospital-lang-pills d-inline-flex align-items-center gap-1 ${className}`}
        role="group"
        aria-label="Select Language"
      >
        <span className="small text-muted me-1 d-none d-sm-inline">
          {t('nav.language')}:
        </span>
        {LANGUAGES.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelectCode(lang.code)}
              className={`btn btn-sm ${
                isActive
                  ? 'btn-primary fw-bold'
                  : 'btn-outline-secondary'
              }`}
              style={{
                fontSize: '0.8rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
              }}
              aria-pressed={isActive}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Topbar variant (clean, accessible select dropdown with globe icon)
  return (
    <div className={`hospital-lang-selector d-inline-flex align-items-center gap-1 ${className}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white-50"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <label htmlFor="hospital-lang-select" className="visually-hidden">
        {t('nav.language')}
      </label>
      <select
        id="hospital-lang-select"
        value={currentLang}
        onChange={handleLanguageChange}
        className="form-select form-select-sm border-0 py-0 ps-1 pe-4 text-white bg-transparent fw-semibold"
        style={{
          fontSize: '0.8125rem',
          cursor: 'pointer',
          width: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '3px',
        }}
        aria-label="Select website language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;
