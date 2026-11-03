import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

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

  // Topbar variant (compact, polished healthcare language pill with globe and chevron)
  return (
    <div className={`hospital-topbar-lang-pill ${className}`}>
      <Globe size={13} className="hospital-topbar-lang-icon" aria-hidden="true" />
      <label htmlFor="hospital-lang-select" className="visually-hidden">
        {t('nav.language')}
      </label>
      <select
        id="hospital-lang-select"
        value={currentLang}
        onChange={handleLanguageChange}
        className="hospital-topbar-lang-select"
        aria-label="Select website language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
      <ChevronDown size={11} className="hospital-topbar-lang-chevron" aria-hidden="true" />
    </div>
  );
}

export default LanguageSelector;
