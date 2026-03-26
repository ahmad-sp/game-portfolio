import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { openPanel, closePanel } from './panelAnimations';
import { HUD_BG, HUD_BORDER, ACCENT, PanelHeader, ScanlineOverlay } from './hudComponents';

const SKILLS_LIST = [
  { name: 'Python / AI Engineering', value: 90, color: '#4A90D9' },
  { name: 'Machine Learning', value: 85, color: '#4A90D9' },
  { name: 'Deep Learning / CNNs', value: 80, color: '#4A90D9' },
  { name: 'React / Next.js', value: 88, color: ACCENT },
  { name: 'Node.js / FastAPI', value: 80, color: ACCENT },
  { name: 'Computer Vision', value: 82, color: '#6AC46A' },
];

export default function Profile({ onClose }) {
  const panelRef = useRef(null);
  const barsRef = useRef([]);

  useEffect(() => {
    openPanel(panelRef, 'left');
    barsRef.current.forEach((bar, i) => {
      if (!bar) return;
      gsap.fromTo(bar,
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 1.0, ease: 'power3.out', delay: 0.35 + i * 0.09 }
      );
    });
    const esc = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const handleClose = () => closePanel(panelRef, onClose, 'left');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
        paddingLeft: '4%', background: 'rgba(0,0,0,0.35)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        ref={panelRef}
        style={{
          width: '100%', maxWidth: 420, maxHeight: '88vh',
          background: HUD_BG, backdropFilter: 'blur(12px)', border: `1px solid ${HUD_BORDER}`,
          borderRadius: 2, overflow: 'hidden', position: 'relative',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <ScanlineOverlay />
        <PanelHeader title="Player Profile" onClose={handleClose} accentColor={ACCENT} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 28px' }}>
          {/* Identity row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 22 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 1,
              background: `linear-gradient(135deg, #D4A843, #7A5C00)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontFamily: "'Oswald', sans-serif",
              fontWeight: 700, color: '#000', flexShrink: 0,
              border: '1px solid rgba(212,168,67,0.3)',
            }}>A</div>
            <div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '0.08em', color: '#fff' }}>AHMAD S P</div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: ACCENT, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 3 }}>
                AIML Engineer &middot; Full Stack Dev
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `linear-gradient(to right, ${HUD_BORDER}, transparent)`, marginBottom: 18 }} />

          {/* Bio */}
          <p style={{
            fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.9,
            borderLeft: `2px solid ${ACCENT}40`, paddingLeft: 12, marginBottom: 22,
            fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.02em',
          }}>
            Passionate engineer specializing in AI/ML systems and full-stack
            web development. I build intelligent products that solve real problems
            — from computer vision pipelines to interactive 3D web experiences.
          </p>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {[
              { l: 'Projects', v: '15+' },
              { l: 'Years Exp', v: '3+' },
              { l: 'Tech Stack', v: '20+' },
            ].map(s => (
              <div key={s.l} style={{
                flex: 1, border: `1px solid ${HUD_BORDER}`,
                background: 'rgba(212,168,67,0.04)', padding: '10px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Oswald', sans-serif", color: ACCENT }}>{s.v}</div>
                <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Ability label */}
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 14 }}>
            &gt; Ability Stats
          </div>

          {/* Skill bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {SKILLS_LIST.map((skill, i) => (
              <div key={skill.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>{skill.name}</span>
                  <span style={{ fontSize: 11, color: skill.color, fontFamily: "'Share Tech Mono', monospace" }}>{skill.value}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <div
                    ref={(el) => (barsRef.current[i] = el)}
                    style={{ height: '100%', width: `${skill.value}%`, background: `linear-gradient(90deg, ${skill.color}70, ${skill.color})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
