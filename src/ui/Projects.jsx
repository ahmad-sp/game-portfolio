import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { openPanel, closePanel } from './panelAnimations';
import { HUD_BG, HUD_BORDER, ACCENT, PanelHeader, ScanlineOverlay } from './hudComponents';
import MissionScreen, { MISSIONS } from './MissionScreen';

export default function Projects({ onClose }) {
  const panelRef = useRef(null);
  const cardRefs = useRef([]);
  const [activeMission, setActiveMission] = useState(null);

  useEffect(() => {
    openPanel(panelRef, 'bottom');
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      gsap.fromTo(card,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.06 * i }
      );
    });
    const esc = (e) => { if (e.key === 'Escape' && !activeMission) handleClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const handleClose = () => closePanel(panelRef, onClose, 'bottom');

  // If a mission is open, render MissionScreen on top
  if (activeMission) {
    return (
      <>
        {/* Keep Projects panel faded behind */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '5vh', pointerEvents: 'none' }}>
          <div ref={panelRef} style={{ opacity: 0.3, width: '100%', maxWidth: 700, maxHeight: '90vh', background: HUD_BG, border: `1px solid ${HUD_BORDER}`, borderRadius: 2, overflow: 'hidden' }} />
        </div>
        <MissionScreen mission={activeMission} onClose={() => setActiveMission(null)} />
      </>
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        ref={panelRef}
        style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', background: HUD_BG, backdropFilter: 'blur(12px)', border: `1px solid ${HUD_BORDER}`, borderRadius: 2, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}
      >
        <ScanlineOverlay />
        <PanelHeader title="Mission Select" onClose={handleClose} accentColor={ACCENT} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
          {/* Mission count */}
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', marginBottom: 14 }}>
            &gt; {MISSIONS.length} MISSIONS AVAILABLE · SELECT TO ENTER
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {MISSIONS.map((mission, i) => (
              <div
                key={mission.id}
                ref={(el) => (cardRefs.current[i] = el)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${mission.color}20`,
                  borderTop: `2px solid ${mission.color}`,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  gridColumn: i === MISSIONS.length - 1 && MISSIONS.length % 2 !== 0 ? 'span 2' : 'span 1',
                }}
                onMouseEnter={(e) => {
                  gsap.to(e.currentTarget, { y: -3, duration: 0.2, ease: 'power2.out' });
                  e.currentTarget.style.background = `${mission.color}0d`;
                  e.currentTarget.style.boxShadow = `0 4px 22px ${mission.color}20`;
                }}
                onMouseLeave={(e) => {
                  gsap.to(e.currentTarget, { y: 0, duration: 0.2 });
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => setActiveMission(mission)}
              >
                {/* Status indicator */}
                <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, letterSpacing: '0.2em', color: mission.status === 'ACTIVE' ? '#6AC46A' : 'rgba(255,255,255,0.18)', fontFamily: "'Share Tech Mono',monospace" }}>
                  {mission.status === 'ACTIVE' ? '● ' : '○ '}{mission.status}
                </div>

                <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 5, paddingRight: 60, letterSpacing: '0.04em' }}>
                  {mission.title}
                </div>
                <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 10, letterSpacing: '0.2em', color: mission.color, textTransform: 'uppercase', marginBottom: 10 }}>
                  {mission.tagline}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                  {mission.tech.slice(0, 4).map(t => (
                    <span key={t} style={{ fontSize: 9, fontFamily: "'Oswald',sans-serif", letterSpacing: '0.15em', color: mission.color, border: `1px solid ${mission.color}35`, padding: '2px 7px', textTransform: 'uppercase' }}>{t}</span>
                  ))}
                  {mission.tech.length > 4 && <span style={{ fontSize: 9, fontFamily: "'Share Tech Mono',monospace", color: 'rgba(255,255,255,0.2)', alignSelf: 'center' }}>+{mission.tech.length - 4}</span>}
                </div>

                {/* CTA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 6, height: 6, background: mission.color, transform: 'rotate(45deg)' }} />
                  <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: mission.color, fontWeight: 700 }}>
                    Enter Mission
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
