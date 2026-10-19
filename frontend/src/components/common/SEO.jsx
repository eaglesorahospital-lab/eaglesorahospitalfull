import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_TITLE = 'EgleSora Hospital | Excellence in Clinical Care & Patient Safety';
const DEFAULT_DESCRIPTION = 'EgleSora Hospital provides patient-centered tertiary healthcare, outpatient consultations, multi-specialty clinical departments, and 24/7 emergency services.';
const SITE_URL = 'https://eglesorahospital.netlify.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

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
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute(rel, rel);
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

    // 4. Canonical URL
    const currentUrl = canonicalUrl || `${SITE_URL}${location.pathname}`;
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
