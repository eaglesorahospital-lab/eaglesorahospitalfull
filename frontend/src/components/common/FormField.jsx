import React from 'react';

/**
 * Hospital Platform — Accessible Form Field Component (Phase 1)
 * Supports text, email, tel, select, and textarea controls with proper ARIA labeling.
 */
export function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  options = [],
  rows = 4,
  className = '',
  ...rest
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`hospital-form-group ${className}`.trim()}>
      <label htmlFor={id} className="hospital-form-label">
        {label}
        {required && (
          <span className="required" aria-hidden="true">*</span>
        )}
      </label>

      {type === 'select' ? (
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className="hospital-form-control"
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className="hospital-form-control"
          {...rest}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className="hospital-form-control"
          {...rest}
        />
      )}

      {hint && !error && (
        <div id={hintId} className="hospital-form-hint">
          {hint}
        </div>
      )}

      {error && (
        <div id={errorId} className="hospital-form-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default FormField;
