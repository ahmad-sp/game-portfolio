import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import useGameStore from '../store/useGameStore';
import audio from '../store/audioManager';

const MENU_ITEMS = [
  { id: 'start',    label: 'Start' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills',   label: 'Skills' },
  { id: 'contact',  label: 'Contact' },
];

export default function Menu() {
  const { currentMenuIndex, setCurrentMenuIndex } = useGameStore();
  const containerRef = useRef(null);
  const bgRef = useRef(null);
  const itemRefs = useRef([]);
  const transitioning = useRef(false);

  // Entrance animation
  useEffect(() => {
    gsap.set(containerRef.current, { opacity: 0 });
    gsap.to(containerRef.current, { opacity: 1, duration: 1.0, ease: 'power2.out' });

    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.fromTo(el,
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.5 + i * 0.12 }
      );
    });
  }, []);

  // Mouse parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!bgRef.current) return;
      const { clientX, clientY } = e;
      const x = (clientX / window.innerWidth - 0.5) * 18;
      const y = (clientY / window.innerHeight - 0.5) * 10;
      gsap.to(bgRef.current, {
        x: -x,
        y: -y,
        duration: 1.8,
        ease: 'power2.out',
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Main menu → game transition
  const handleSelect = useCallback((idx) => {
    if (transitioning.current) return;
    transitioning.current = true;
    audio.click();

    const item = MENU_ITEMS[idx];
    const section = item.id === 'start' ? null : item.id;

    // Cinematic zoom + blur + fade
    const tl = gsap.timeline();
    tl.to(containerRef.current, {
      scale: 1.18,
      filter: 'blur(10px) brightness(0.4)',
      duration: 0.7,
      ease: 'power2.inOut',
    })
    .to(containerRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        useGameStore.setState({ gameStarted: true, activeSection: section });
      },
    });
  }, []);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowUp') {
        const next = (currentMenuIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
        setCurrentMenuIndex(next);
        audio.hover();
      } else if (e.key === 'ArrowDown') {
        const next = (currentMenuIndex + 1) % MENU_ITEMS.length;
        setCurrentMenuIndex(next);
        audio.hover();
      } else if (e.key === 'Enter') {
        handleSelect(currentMenuIndex);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentMenuIndex, handleSelect]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, overflow: 'hidden',
        transformOrigin: 'center center',
      }}
    >
      {/* Parallax background wrapper */}
      <div
        ref={bgRef}
        style={{
          position: 'absolute',
          inset: '-5%',
          width: '110%',
          height: '110%',
        }}
      >
        <img
          src="/menu_bg.png"
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            pointerEvents: 'none', display: 'block',
          }}
        />
      </div>

      {/* Olive-green film grade */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(55, 68, 22, 0.5)',
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 130% 110% at 18% 50%, transparent 20%, rgba(0,0,0,0.72) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'overlay', pointerEvents: 'none',
        animation: 'grain 0.4s steps(1) infinite',
      }} />

      {/* Top-left branding */}
      <div style={{
        position: 'absolute', top: 32, left: '6%',
        fontFamily: "'Pricedown Bl', sans-serif",
        fontSize: 20, color: 'rgba(212,168,67,0.8)',
        textShadow: '2px 2px 0 rgba(0,0,0,0.8)',
        textTransform: 'uppercase'
      }}>
        Ahmad S P • Portfolio
      </div>

      {/* Top-right Controls */}
      <div style={{
        position: 'absolute', top: 32, right: '6%',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16, zIndex: 60,
      }}>
        {/* Social Links */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { 
              name: 'LinkedIn', url: 'https://linkedin.com/',
              svg: <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.27c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm13.5 12.27h-3v-5.6c0-3.37-4-3.12-4 0v5.6h-3v-11h3v1.76c1.4-2.58 7-2.78 7 2.48v6.76z" />
            },
            { 
              name: 'GitHub', url: 'https://github.com/',
              svg: <path d="M12 0c-6.63 0-12 5.37-12 12 0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.16c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4 1.02 0 2.04.13 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.62-5.48 5.91.43.37.82 1.11.82 2.24v3.32c0 .32.22.7.83.58 4.75-1.58 8.19-6.08 8.19-11.38 0-6.63-5.37-12-12-12z" />
            }
          ].map((link) => (
            <a key={link.name} href={link.url} target="_blank" rel="noreferrer"
               title={link.name}
               onMouseEnter={(e) => { audio.hover(); gsap.to(e.currentTarget, { color: '#D4A843', filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.6))', y: -2, duration: 0.2, ease: 'power2.out' }); }}
               onMouseLeave={(e) => { gsap.to(e.currentTarget, { color: 'rgba(255,255,255,0.4)', filter: 'drop-shadow(0 0 0px rgba(0,0,0,0))', y: 0, duration: 0.2 }); }}
               style={{ color: 'rgba(255,255,255,0.4)', display: 'block', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                {link.svg}
              </svg>
            </a>
          ))}
        </div>
        
        {/* Resume Button */}
        <a href="/resume.pdf" target="public/resume.pdf" download="Ahmad_Resume.pdf"
           onMouseEnter={(e) => { audio.hover(); gsap.to(e.currentTarget, { color: '#D4A843', borderColor: 'rgba(212,168,67,0.6)', backgroundColor: 'rgba(212,168,67,0.05)', y: -2, duration: 0.2, ease: 'power2.out' }); }}
           onMouseLeave={(e) => { gsap.to(e.currentTarget, { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent', y: 0, duration: 0.2 }); }}
           style={{
             display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
             border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2,
             color: 'rgba(255,255,255,0.5)', fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 500,
             letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', cursor: 'pointer',
             backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)',
           }}>
          <span>Download Resume</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>
      </div>

      {/* Menu items */}
      <nav style={{
        position: 'absolute', left: '6%', bottom: '18%',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {MENU_ITEMS.map((item, idx) => {
          const isActive = idx === currentMenuIndex;
          return (
            <button
              key={item.id}
              ref={(el) => (itemRefs.current[idx] = el)}
              onClick={() => {
                setCurrentMenuIndex(idx);
                handleSelect(idx);
              }}
              onMouseEnter={() => {
                if (idx !== currentMenuIndex) {
                  setCurrentMenuIndex(idx);
                  audio.hover();
                }
                // GSAP scale on hover
                gsap.to(itemRefs.current[idx], { scaleX: 1.04, duration: 0.2, ease: 'power2.out', transformOrigin: 'left center' });
              }}
              onMouseLeave={() => {
                gsap.to(itemRefs.current[idx], { scaleX: 1, duration: 0.2, ease: 'power2.out' });
              }}
              style={{
                display: 'block',
                background: isActive ? 'var(--menu-active-bg)' : 'transparent',
                color: isActive ? 'var(--menu-active-text)' : 'var(--menu-text)',
                fontFamily: "'Oswald', sans-serif",
                fontWeight: isActive ? 700 : 300,
                fontSize: isActive ? 28 : 22,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                border: 'none',
                padding: isActive ? '7px 22px' : '5px 4px',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: 2,
                outline: 'none',
                minWidth: 220,
                textShadow: isActive ? 'none' : '0 2px 8px rgba(0,0,0,0.9)',
                transformOrigin: 'left center',
                // Subtle active pulse
                boxShadow: isActive ? '4px 0 0 0 rgba(212,168,67,0.5)' : 'none',
              }}
            >
              {isActive && (
                <svg 
                  viewBox="0 0 24 24" 
                  style={{ 
                    width: 16, height: 16, 
                    marginRight: 12, 
                    display: 'inline-block', 
                    verticalAlign: 'bottom',
                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))',
                    marginBottom: 2
                  }} 
                  fill="currentColor"
                >
                  <path d="M6 4l12 8-12 8z" />
                </svg>
              )}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Controls hint — bottom right */}
      <div style={{
        position: 'absolute', bottom: 28, right: '4%',
        fontFamily: "'Oswald', sans-serif",
        fontSize: 11, letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.3)', textAlign: 'right', lineHeight: 2,
      }}>
        <div>↑ ↓ &nbsp; Navigate</div>
        <div>Enter &nbsp; Select</div>
      </div>
    </div>
  );
}
