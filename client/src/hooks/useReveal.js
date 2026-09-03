import { useEffect, useRef } from 'react';

// Adds the "in-view" class (see .reveal / .reveal.in-view in styles/index.css) the first time
// the element scrolls into the viewport, so sections animate in as the visitor scrolls down
// the landing page rather than all firing at once on load.
export default function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
