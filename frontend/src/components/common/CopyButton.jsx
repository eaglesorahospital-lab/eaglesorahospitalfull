import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Reusable CopyButton Component
 * Copies text to clipboard with animated visual confirmation and accessible screen-reader announcement.
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  showText = false,
  className = '',
  size = 14,
  title = 'Copy to clipboard',
}) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <button
      type="button"
      className={`neu-btn neu-btn-sm d-inline-flex align-items-center gap-1 ${className}`}
      onClick={handleCopy}
      title={isCopied ? copiedLabel : title}
      aria-label={isCopied ? copiedLabel : `${title}: ${text}`}
      style={{ minHeight: '36px' }}
    >
      {isCopied ? (
        <Check size={size} className="text-success" aria-hidden="true" />
      ) : (
        <Copy size={size} aria-hidden="true" />
      )}
      {showText && <span>{isCopied ? copiedLabel : label}</span>}
      <span className="visually-hidden" aria-live="polite">
        {isCopied ? `${copiedLabel}: ${text}` : ''}
      </span>
    </button>
  );
}

export default CopyButton;

