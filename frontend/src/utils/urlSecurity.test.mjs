import { sanitizeRedirectUrl } from './urlSecurity.js';
import assert from 'assert';

console.log('Testing sanitizeRedirectUrl (SEC-06 remediation)...');

// Test 1: Valid internal paths
assert.strictEqual(sanitizeRedirectUrl('/my-appointments'), '/my-appointments');
assert.strictEqual(sanitizeRedirectUrl('/doctor/dashboard'), '/doctor/dashboard');
assert.strictEqual(sanitizeRedirectUrl('/admin/schedules?dept=cardio'), '/admin/schedules?dept=cardio');

// Test 2: Protocol-relative URLs (CVE-2025-68470 bypass)
assert.strictEqual(sanitizeRedirectUrl('//evil.com', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('///evil.com', '/fallback'), '/fallback');

// Test 3: Backslash bypass attempts (CVE-2025-68470)
assert.strictEqual(sanitizeRedirectUrl('\\evil.com', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('/doctor\\evil.com', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('/\\attacker.com', '/fallback'), '/fallback');

// Test 4: External absolute URLs
assert.strictEqual(sanitizeRedirectUrl('https://evil.com', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('http://evil.com/phishing', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('javascript:alert(1)', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('data:text/html,evil', '/fallback'), '/fallback');

// Test 5: Empty, null, undefined, or non-string inputs
assert.strictEqual(sanitizeRedirectUrl('', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl(null, '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl(undefined, '/fallback'), '/fallback');
// Test 6: Encoded bypass attempts (SEC-06 defense-in-depth)
assert.strictEqual(sanitizeRedirectUrl('%5C%5Cevil.com', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('/doctor%5Cevil.com', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('%2F%2Fattacker.com', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('javascript%3Aalert(1)', '/fallback'), '/fallback');
assert.strictEqual(sanitizeRedirectUrl('/admin%00malicious', '/fallback'), '/fallback');

console.log('ALL URL SANITIZER TESTS PASSED (20/20 cases verified)!');
