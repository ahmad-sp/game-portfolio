import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { openPanel, closePanel } from './panelAnimations';
import { HUD_BG, HUD_BORDER, ACCENT, PanelHeader, ScanlineOverlay } from './hudComponents';

const CATEGORIES = [
  {
    name: 'Frontend', color: '#4A90D9',
    skills: [
      { name: 'React / Next.js', level: 90 },
      { name: 'TypeScript', level: 78 },
      { name: 'Tailwind CSS', level: 88 },
      { name: 'Three.js / R3F', level: 72 },
    ],
  },
  {
    name: 'Backend', color: ACCENT,
    skills: [
      { name: 'Node.js / Express', level: 80 },
      { name: 'Python / FastAPI', level: 88 },
      { name: 'PostgreSQL / MongoDB', level: 75 },
      { name: 'REST / GraphQL', level: 82 },
    ],
  },
  {
    name: 'AI / ML', color: '#6AC46A',
    skills: [
      { name: 'Machine Learning', level: 85 },
      { name: 'Deep Learning', level: 80 },
      { name: 'Computer Vision', level: 82 },
      { name: 'NLP / LLMs', level: 70 },
    ],
  },
  {
    name: 'DevOps & Tools', color: '#D46A6A',
    skills: [
      { name: 'Git / GitHub', level: 90 },
      { name: 'Docker', level: 68 },
      { name: 'Linux CLI', level: 75 },
      { name: 'Figma', level: 65 },
    ],
  },
];

export default function Skills({ onClose }) {
  const panelRef = useRef(null);
  const barsRef = useRef([]);

  useEffect(() => {
    openPanel(panelRef, 'right');
    barsRef.current.forEach((bar, i) => {
      if (!bar) return;
      gsap.fromTo(bar,
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 1.1, ease: 'power3.out', delay: 0.2 + i * 0.055 }
      );
    });
    const esc = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const handleClose = () => closePanel(panelRef, onClose, 'right');

  let barIdx = 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: '4%', background: 'rgba(0,0,0,0.35)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        ref={panelRef}
        style={{
          width: '100%', maxWidth: 500, maxHeight: '88vh',
          background: HUD_BG, backdropFilter: 'blur(12px)', border: `1px solid ${HUD_BORDER}`,
          borderRadius: 2, overflow: 'hidden', position: 'relative',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <ScanlineOverlay />
        <PanelHeader title="Abilities" onClose={handleClose} accentColor="#6AC46A" />

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            {CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <div style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700, fontSize: 11,
                  letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: cat.color, marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderBottom: `1px solid ${cat.color}25`, paddingBottom: 6,
                }}>
                  <div style={{ width: 5, height: 5, background: cat.color, transform: 'rotate(45deg)' }} />
                  {cat.name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cat.skills.map((skill) => {
                    const idx = barIdx++;
                    return (
                      <div key={skill.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                            {skill.name}
                          </span>
                          <span style={{ fontSize: 10, color: cat.color, fontFamily: "'Share Tech Mono', monospace" }}>
                            {skill.level}
                          </span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                          <div
                            ref={(el) => (barsRef.current[idx] = el)}
                            style={{ height: '100%', width: `${skill.level}%`, background: `linear-gradient(90deg, ${cat.color}80, ${cat.color})` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
