/**
 * URL Security Utilities (Phase 20B — Remediation of SEC-06 / CVE-2025-68470)
 *
 * Provides defense-in-depth sanitization for user-supplied return/redirect query
 * parameters to prevent Open Redirect attacks via schema injection, protocol-relative
 * URLs, and backslash path traversal exploits.
 */

/**
 * Sanitizes a redirect path to ensure it is strictly an internal application route.
 *
 * Rejects:
 * - Scheme-based absolute URLs (e.g. "https://attacker.com", "javascript:...", "data:...")
 * - Protocol-relative URLs (e.g. "//attacker.com")
 * - Windows / backslash navigation vectors (e.g. "\attacker.com", "/foo\bar")
 * - Empty, null, undefined, or non-string inputs
 *
 * @param {string} targetUrl - The candidate redirect path from query string or storage.
 * @param {string} fallbackUrl - Safe fallback path if targetUrl is invalid (default: '/').
 * @returns {string} Safe internal relative path starting with a single '/'.
 */
export function sanitizeRedirectUrl(targetUrl, fallbackUrl = '/') {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return fallbackUrl;
  }

  const trimmed = targetUrl.trim();

  // Defense against encoded bypass attempts (e.g. %5C for backslash, %2F%2F for //)
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch (e) {
    // Malformed URI encoding -> reject immediately
    return fallbackUrl;
  }

  // Rejection 1: Any backslash characters (CVE-2025-68470 exploit vector) in raw or decoded form
  if (trimmed.includes('\\') || decoded.includes('\\')) {
    return fallbackUrl;
  }

  // Rejection 2: Protocol-relative URLs (starts with '//') in raw or decoded form
  if (trimmed.startsWith('//') || decoded.startsWith('//')) {
    return fallbackUrl;
  }

  // Rejection 3: Full URI schemes (e.g. http:, https:, javascript:, data:) in raw or decoded form
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
    return fallbackUrl;
  }

  // Rejection 4: Must strictly start with a single '/'
  if (!trimmed.startsWith('/') || !decoded.startsWith('/')) {
    return fallbackUrl;
  }

  // Rejection 5: Control characters or null bytes
  if (/[\x00-\x1F\x7F]/.test(trimmed) || /[\x00-\x1F\x7F]/.test(decoded)) {
    return fallbackUrl;
  }

  return trimmed;
}

export default {
  sanitizeRedirectUrl,
};
