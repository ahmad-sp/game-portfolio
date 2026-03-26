import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import useGameStore from '../store/useGameStore';

/* ─────────────────────────────────────────────────────────────────────────────
   ROCKSTAR-STYLE SPLASH — clean, intentional, no canvas complexity
   Timeline: black → badge reveal → brightness pop / shake → hold → fade out
───────────────────────────────────────────────────────────────────────────── */
export default function SplashScreen() {
  const setSplashDone = useGameStore((s) => s.setSplashDone);

  // DOM refs
  const wrapRef   = useRef(null);
  const badgeRef  = useRef(null);
  const letterRef = useRef(null);
  const starRef   = useRef(null);
  const lineRef   = useRef(null);
  const studioRef = useRef(null);
  const skipRef   = useRef(null);
  const hasSkipped = useRef(false);

  const finish = () => {
    if (hasSkipped.current) return;
    hasSkipped.current = true;
    gsap.to(wrapRef.current, {
      opacity: 0, duration: 0.55, ease: 'power2.in',
      onComplete: () => setSplashDone(true),
    });
  };

  useEffect(() => {
    // ── Initial hidden state ──────────────────────────────────
    gsap.set([badgeRef.current, studioRef.current, skipRef.current], { opacity: 0 });
    gsap.set(badgeRef.current, { scale: 0.78, y: 12 });
    gsap.set(letterRef.current, { opacity: 0, y: 10 });
    gsap.set(starRef.current,   { opacity: 0, scale: 0 });
    gsap.set(lineRef.current,   { scaleX: 0 });
    gsap.set(studioRef.current, { opacity: 0, y: 6, letterSpacing: '0.3em' });

    // ── Main timeline ─────────────────────────────────────────
    const tl = gsap.timeline({ delay: 0.3 });

    // 1. Badge reveal (0.3s → 1.5s)
    tl.to(badgeRef.current, {
      opacity: 1, scale: 1, y: 0,
      duration: 0.75, ease: 'expo.out',
    })
    .to(letterRef.current, {
      opacity: 1, y: 0,
      duration: 0.5, ease: 'power3.out',
    }, '-=0.45')
    .to(starRef.current, {
      opacity: 1, scale: 1,
      duration: 0.35, ease: 'back.out(2)',
    }, '-=0.3')

    // 2. Separator line
    .to(lineRef.current, {
      scaleX: 1, duration: 0.45, ease: 'power3.inOut',
    }, '-=0.2')

    // 3. Studio name
    .to(studioRef.current, {
      opacity: 1, y: 0, letterSpacing: '0.6em',
      duration: 0.5, ease: 'power2.out',
    }, '-=0.2')

    // 4. Impact moment: brightness pop + shake (1.5s → 2s)
    .to(badgeRef.current, {
      filter: 'brightness(1.9) saturate(1.2)',
      duration: 0.06, ease: 'none',
      yoyo: true, repeat: 1,
    })
    .to(wrapRef.current, { x: -5, y: 3, duration: 0.05, ease: 'none' })
    .to(wrapRef.current, { x:  6, y:-4, duration: 0.05, ease: 'none' })
    .to(wrapRef.current, { x: -4, y: 2, duration: 0.05, ease: 'none' })
    .to(wrapRef.current, { x:  3, y:-2, duration: 0.05, ease: 'none' })
    .to(wrapRef.current, { x:  0, y: 0, duration: 0.1,  ease: 'power2.out' })
    .to(badgeRef.current, { filter: 'brightness(1)', duration: 0.15 })

    // 5. Hold — show skip (2s → 2.5s)
    .to({}, { duration: 0.5 })
    .to(skipRef.current, { opacity: 0.45, duration: 0.4 })

    // 6. Extra hold + fade out (2.5s → 3s)
    .to({}, { duration: 0.7 })
    .to(wrapRef.current, {
      opacity: 0, duration: 0.65, ease: 'power2.inOut',
      onComplete: () => setSplashDone(true),
    });

    // Skip handlers
    const onKey   = () => finish();
    const onClick = () => finish();
    window.addEventListener('keydown', onKey);
    wrapRef.current?.addEventListener('click', onClick);

    return () => {
      tl.kill();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#000', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', overflow: 'hidden',
      }}
    >
      {/* ── Radial glow background ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(212,168,67,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Logo group ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* Badge */}
        <div
          ref={badgeRef}
          style={{
            width: 180, height: 180,
            borderRadius: 32,
            background: 'linear-gradient(145deg, #D4A843 0%, #A87820 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 0 60px rgba(212,168,67,0.22), 0 0 120px rgba(212,168,67,0.08), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          {/* Inner subtle border */}
          <div style={{
            position: 'absolute', inset: 6,
            borderRadius: 26,
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'none',
          }} />

          {/* "A" letter */}
          <span
            ref={letterRef}
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 104, fontWeight: 700,
              color: '#1a1000', lineHeight: 1,
              letterSpacing: -3, marginTop: -4,
              display: 'block',
              textShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >A</span>

          {/* Star accent — bottom right */}
          <span
            ref={starRef}
            style={{
              position: 'absolute', bottom: 18, right: 22,
              fontSize: 26, color: 'rgba(255,255,255,0.85)',
              lineHeight: 1, textShadow: '0 0 8px rgba(255,255,255,0.5)',
            }}
          >★</span>
        </div>

        {/* Divider line */}
        <div
          ref={lineRef}
          style={{
            width: 180, height: 1, marginTop: 22,
            background: 'linear-gradient(to right, transparent, rgba(212,168,67,0.45), transparent)',
            transformOrigin: 'center',
          }}
        />

        {/* Studio name */}
        <div
          ref={studioRef}
          style={{
            marginTop: 16,
            fontFamily: "'Oswald', sans-serif",
            fontSize: 12, fontWeight: 400,
            letterSpacing: '0.6em',
            textTransform: 'uppercase',
            color: 'rgba(214,198,165,0.65)',
          }}
        >
          Ahmad S P
        </div>
      </div>

      {/* ── Grain overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.055, mixBlendMode: 'overlay',
        animation: 'grain 0.4s steps(1) infinite',
      }} />

      {/* ── Vignette ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.8) 100%)',
      }} />

      {/* ── Skip hint ── */}
      <div
        ref={skipRef}
        style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'Oswald', sans-serif", fontSize: 10,
          letterSpacing: '0.45em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
          opacity: 0,
        }}
      >Press any key to skip</div>
    </div>
  );
}
