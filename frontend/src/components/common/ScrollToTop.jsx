import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop Component
 * 
 * Automatically resets scroll position to the top (0, 0) on route (pathname) changes,
 * ensuring new pages start at the top across desktop and mobile devices.
 * 
 * Key behaviours:
 * - Listens to `pathname` changes so intra-page state changes (query params, tabs, modals)
 *   do not trigger unintended scroll resets.
 * - Preserves intentional hash anchors (#main-content, #section-id) by scrolling to the target anchor.
 * - Resets `window`, `document.documentElement`, `document.body`, and nested layout containers
 *   (`#main-content`, `.hospital-main-content`, `#admin-main-content`, `.admin-main-content`, `#doctor-main-content`).
 * - Uses `behavior: "instant"` to avoid jarring visual jumps or clashing with page mounting.
 * - Works consistently for standard navigation, direct clicks, and browser Back/Forward (POP).
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  const prevPathname = useRef(pathname);

  // Take explicit control of scroll restoration in SPA to avoid browser conflicts
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      const original = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      return () => {
        window.history.scrollRestoration = original;
      };
    }
  }, []);

  // Synchronously reset scroll position on pathname change before paint
  useLayoutEffect(() => {
    const isNewPath = prevPathname.current !== pathname;
    prevPathname.current = pathname;

    const performScroll = () => {
      // 1. If an anchor hash is present, attempt to scroll to the target element
      if (hash) {
        const targetId = hash.replace(/^#/, '');
        const element = document.getElementById(targetId) || (hash.length > 1 ? document.querySelector(hash) : null);
        if (element) {
          element.scrollIntoView({ behavior: 'instant', block: 'start' });
          return;
        }
      }

      // 2. Only reset scroll to (0, 0) if the pathname actually changed
      if (isNewPath) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant',
        });

        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
          document.documentElement.scrollLeft = 0;
        }

        if (document.body) {
          document.body.scrollTop = 0;
          document.body.scrollLeft = 0;
        }

        // Reset any nested layout containers
        const containers = document.querySelectorAll(
          '#main-content, .hospital-main-content, #admin-main-content, .admin-main-content, #doctor-main-content, .hospital-layout-root'
        );
        containers.forEach((container) => {
          if (container) {
            if (container.scrollTop > 0) container.scrollTop = 0;
            if (container.scrollLeft > 0) container.scrollLeft = 0;
          }
        });
      }
    };

    // Execute immediately before browser paint
    performScroll();

    // Also follow up in requestAnimationFrame to ensure stability after child components finish rendering
    const rafId = requestAnimationFrame(() => {
      performScroll();
    });

    return () => cancelAnimationFrame(rafId);
  }, [pathname, hash, navType]);

  return null;
}

export default ScrollToTop;
