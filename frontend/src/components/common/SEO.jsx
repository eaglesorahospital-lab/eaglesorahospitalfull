import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_TITLE = 'EgleSora Hospital | Excellence in Clinical Care & Patient Safety';
const DEFAULT_DESCRIPTION = 'EgleSora Hospital provides patient-centered tertiary healthcare, outpatient consultations, multi-specialty clinical departments, and 24/7 emergency services.';
export const PRODUCTION_DOMAIN = 'https://eaglesora-hospital-frontend.onrender.com';
const DEFAULT_OG_IMAGE = `${PRODUCTION_DOMAIN}/og-image.jpg`;

/**
 * Resolves a given path or URL into a canonical absolute URL.
 * - Preserves already absolute HTTP/HTTPS URLs.
 * - Converts relative paths (e.g. "/", "/contact") into absolute URLs using the production domain.
 * - Avoids duplicate slashes.
 */
export function resolveCanonicalUrl(url, fallbackPath = '/') {
  const target = url !== undefined && url !== null && url !== '' ? String(url).trim() : fallbackPath;

  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  const withLeadingSlash = target.startsWith('/') ? target : `/${target}`;
  const sanitizedPath = withLeadingSlash.replace(/\/+/g, '/');

  return `${PRODUCTION_DOMAIN}${sanitizedPath}`;
}

/**
 * Reusable SEO Management Component
 * Automatically manages document title, meta descriptions, canonical links,
 * Open Graph (OG), and Twitter Card tags across public routes.
 *
 * Does not expose sensitive patient or administrative information.
 */
export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  canonicalUrl,
  noIndex = false,
}) {
  const location = useLocation();

  useEffect(() => {
    // 1. Title
    const formattedTitle = title
      ? (title.includes('EgleSora') ? title : `${title} | EgleSora Hospital`)
      : DEFAULT_TITLE;
    document.title = formattedTitle;

    // Helper to create or update meta tags
    const setMetaTag = (attrName, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to create or update link tags (e.g. canonical)
    const setLinkTag = (rel, href) => {
      if (!href) return;
      const existingLinks = document.querySelectorAll(`link[rel="${rel}"]`);
      if (existingLinks.length > 1) {
        for (let i = 1; i < existingLinks.length; i++) {
          existingLinks[i].remove();
        }
      }
      let el = existingLinks[0];
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 2. Robots Indexation Directive
    if (noIndex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      setMetaTag('name', 'robots', 'index, follow');
    }

    // 3. Standard Meta Description
    setMetaTag('name', 'description', description);

    // 4. Canonical URL & Open Graph URL
    const currentUrl = resolveCanonicalUrl(canonicalUrl, location.pathname || '/');
    setLinkTag('canonical', currentUrl);

    // 5. Open Graph Tags
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', currentUrl);
    setMetaTag('property', 'og:image', image);
    setMetaTag('property', 'og:site_name', 'EgleSora Hospital');

    // 6. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', image);

  }, [title, description, image, type, canonicalUrl, noIndex, location.pathname]);

  return null;
}

export default SEO;
