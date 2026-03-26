import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { openPanel, closePanel } from './panelAnimations';
import { HUD_BG, HUD_BORDER, ACCENT, PanelHeader, ScanlineOverlay } from './hudComponents';

const CONTACTS = [
  { label: 'Email', value: 'reachahmadsp@gmail.com', icon: '✉', href: 'mailto:reachahmadsp@gmail.com', color: ACCENT },
  { label: 'GitHub', value: 'github.com/ahmad-sp', icon: '◈', href: 'https://github.com/ahmad-sp', color: '#6AC46A' },
  { label: 'LinkedIn', value: 'linkedin.com/in/ahmad-s-p', icon: '◆', href: 'https://in.linkedin.com/in/ahmad-s-p', color: '#4A90D9' },
];

const TERMINAL_LINES = [
  { text: '> Init secure channel...', delay: 0 },
  { text: '> Handshake complete.', delay: 500 },
  { text: '> Signal lock: ██████░░░░ 60%', delay: 1000 },
  { text: '> Signal lock: ██████████ 100%', delay: 1600 },
  { text: '> Ready. Awaiting transmission.', delay: 2200 },
  { text: '> _', delay: 2800, blink: true },
];

export default function Contact({ onClose }) {
  const panelRef = useRef(null);
  const [displayedLines, setDisplayedLines] = useState([]);
  const [form, setForm] = useState({ name: '', message: '' });
  const [sent, setSent] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    openPanel(panelRef, 'bottom');

    // Terminal print-on with delays
    TERMINAL_LINES.forEach((line) => {
      const t = setTimeout(() => {
        setDisplayedLines((prev) => [...prev, line]);
      }, line.delay);
      timers.current.push(t);
    });

    const esc = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', esc);
    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener('keydown', esc);
    };
  }, []);

  const handleClose = () => closePanel(panelRef, onClose, 'bottom');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        ref={panelRef}
        style={{
          width: '100%', maxWidth: 460,
          background: HUD_BG, backdropFilter: 'blur(12px)', border: `1px solid ${HUD_BORDER}`,
          borderRadius: 2, overflow: 'hidden', position: 'relative',
        }}
      >
        <ScanlineOverlay />
        <PanelHeader title="Communications" onClose={handleClose} accentColor="#D46A6A" />

        <div style={{ padding: '20px 22px 24px' }}>
          {/* Terminal */}
          <div style={{
            background: '#050505', border: '1px solid rgba(106,196,106,0.15)',
            padding: '12px 14px', marginBottom: 20,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11, lineHeight: 2.2, minHeight: 130,
          }}>
            {displayedLines.map((line, i) => (
              <div
                key={i}
                style={{
                  color: line.blink ? ACCENT : '#6AC46A',
                  animation: line.blink ? 'none' : undefined,
                }}
              >
                {line.text}
              </div>
            ))}
          </div>

          {/* Contact links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {CONTACTS.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${c.color}20`,
                  borderLeft: `3px solid ${c.color}`,
                  padding: '10px 14px', textDecoration: 'none', color: '#fff',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${c.color}0d`;
                  e.currentTarget.style.borderColor = `${c.color}70`;
                  gsap.to(e.currentTarget, { x: 4, duration: 0.15 });
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.borderColor = `${c.color}20`;
                  gsap.to(e.currentTarget, { x: 0, duration: 0.15 });
                }}
              >
                <span style={{ color: c.color, fontSize: 16, width: 20, textAlign: 'center' }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: "'Oswald', sans-serif", marginBottom: 1 }}>{c.label}</div>
                  <div style={{ fontSize: 12, fontFamily: "'Share Tech Mono', monospace", color: 'rgba(255,255,255,0.75)' }}>{c.value}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>→</span>
              </a>
            ))}
          </div>

          {/* Quick form */}
          {!sent ? (
            <form
              onSubmit={(e) => { e.preventDefault(); setSent(true); }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ fontSize: 9, fontFamily: "'Oswald', sans-serif", letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 2 }}>
                &gt; Transmit Message
              </div>
              {['name', 'message'].map((field) => (
                field === 'message' ? (
                  <textarea
                    key={field}
                    placeholder="Your message..."
                    value={form.message}
                    onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                    required
                    rows={3}
                    style={inputStyle}
                  />
                ) : (
                  <input
                    key={field}
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    style={inputStyle}
                  />
                )
              ))}
              <button
                type="submit"
                style={{
                  background: ACCENT, color: '#000', border: 'none',
                  fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                  fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase',
                  padding: '10px', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#E8C46A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT; }}
              >
                Transmit
              </button>
            </form>
          ) : (
            <div style={{
              textAlign: 'center', padding: '18px',
              fontFamily: "'Share Tech Mono', monospace",
              color: '#6AC46A', fontSize: 12, lineHeight: 2,
            }}>
              <div>&gt; Transmission received.</div>
              <div>&gt; Standing by, {form.name}.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(212,168,67,0.15)',
  borderRadius: 1,
  color: '#fff',
  fontFamily: "'Share Tech Mono', monospace",
  fontSize: 11,
  padding: '9px 12px',
  outline: 'none',
  resize: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
