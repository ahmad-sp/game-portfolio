import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Transition({ onComplete }) {
  const ref = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();

    tl.to(ref.current, {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.in',
    })
    .to(ref.current, {
      scale: 1.06,
      filter: 'blur(8px) brightness(0)',
      duration: 0.5,
      ease: 'power2.inOut',
    })
    .call(() => onComplete && onComplete());

    return () => tl.kill();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 200,
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
