/**
 * Shared GSAP panel animation helpers
 * All panels slide in from a configurable direction with scale effect.
 */
import { gsap } from 'gsap';

export const openPanel = (ref, direction = 'right') => {
  const x = direction === 'right' ? 80 : direction === 'left' ? -80 : 0;
  const y = direction === 'bottom' ? 60 : 0;
  gsap.fromTo(
    ref.current,
    { x, y, opacity: 0, scale: 0.96 },
    { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' }
  );
};

export const closePanel = (ref, onComplete, direction = 'right') => {
  const x = direction === 'right' ? 80 : direction === 'left' ? -80 : 0;
  const y = direction === 'bottom' ? 40 : 0;
  gsap.to(ref.current, {
    x, y,
    opacity: 0,
    scale: 0.97,
    duration: 0.35,
    ease: 'power2.in',
    onComplete,
  });
};
