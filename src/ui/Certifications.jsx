import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import audio from '../store/audioManager';
import { PanelHeader, ScanlineOverlay, HUD_BG, HUD_BORDER, ACCENT } from './hudComponents';

const certifications = [
  { title: 'Python for Data Science', issuer: 'IBM Skills Network', date: 'Jan 2024' },
  { title: 'Prompt Engineering', issuer: 'CognitiveClass', date: 'Jan 2024' },
  { title: 'HTML', issuer: 'Spoken Tutorial', date: 'Feb 2024' },
  { title: 'Cybersecurity', issuer: 'Academor', date: 'Feb 2024' },
  { title: 'Java', issuer: 'Spoken Tutorial', date: 'Jul 2024' },
  { title: 'MongoDB Basics', issuer: 'MongoDB University', date: 'Jul 2024' },
  { title: 'Hands-on AI for Real World Applications', issuer: 'IIT Kharagpur', date: 'Nov 2024' },
  { title: 'Rapid AI Services Development', issuer: 'eTrain', date: 'Dec 2024' },
  { title: 'R Programming', issuer: 'Spoken Tutorial', date: 'Dec 2024' },
  { title: 'NLP & Text Mining', issuer: 'Simplilearn', date: 'Mar 2025' },
  { title: 'Git Training', issuer: 'Spoken Tutorial', date: 'May 2025' },
  { title: 'Microsoft Azure Fundamentals', issuer: 'Microsoft', date: '2025' },
  { title: 'Oracle AI Foundations', issuer: 'Oracle', date: 'Oct 2025' },
];

export default function Certifications({ onClose }) {
  const panelRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(panelRef.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }
    );
    
    // Stagger animation for the list items
    if (listRef.current?.children) {
      gsap.fromTo(listRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, []);

  const close = () => {
    audio.click();
    gsap.to(panelRef.current, { opacity: 0, x: 15, duration: 0.3, onComplete: onClose });
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      paddingRight: '6%', zIndex: 300, pointerEvents: 'none',
    }}>
      <div ref={panelRef} style={{
        width: 440, background: HUD_BG,
        border: `1px solid ${HUD_BORDER}`,
        padding: 32, borderRadius: 2, position: 'relative',
        boxShadow: '0 0 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(212,168,67,0.05)',
        pointerEvents: 'auto', WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)'
      }}>
        <ScanlineOverlay />
        <PanelHeader title="Certifications" onClose={close} accentColor="#B388FF" />

        <div style={{ marginTop: 24, paddingRight: 8, maxHeight: '60vh', overflowY: 'auto' }}>
          <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {certifications.map((cert, i) => (
              <div key={i} style={{
                background: 'rgba(0,0,0,0.4)', borderLeft: `2px solid ${ACCENT}`,
                padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4,
                transition: 'background 0.2s', cursor: 'default'
              }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,168,67,0.1)'; audio.hover(); }}
                 onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}>
                <div style={{ color: '#fff', fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: '0.05em' }}>
                  {cert.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 11 }}>
                  <span>{cert.issuer}</span>
                  <span style={{ color: ACCENT }}>{cert.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          &gt; VERIFIED RECORDS FOUND
        </div>
      </div>
    </div>
  );
}
