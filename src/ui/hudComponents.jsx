import { useEffect, useRef } from 'react';
import { openPanel, closePanel } from './panelAnimations';

// ── Shared HUD styles ─────────────────────────────────────────────────────────
export const HUD_BG = 'rgba(0,0,0,0.97)';
export const HUD_BORDER = 'rgba(212,168,67,0.25)';
export const ACCENT = '#D4A843';

export function PanelHeader({ title, onClose, accentColor = ACCENT }) {
  return (
    <div style={{
      background: accentColor,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 6, height: 6, background: '#000', transform: 'rotate(45deg)', flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700, fontSize: 12, letterSpacing: '0.4em',
          color: '#000', textTransform: 'uppercase',
        }}>{title}</span>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,0,0,0.3)',
          color: '#000', cursor: 'pointer', fontSize: 14, lineHeight: 1,
          fontWeight: 700, width: 24, height: 24, display: 'flex',
          alignItems: 'center', justifyContent: 'center', borderRadius: 1,
          fontFamily: 'monospace',
        }}
      >×</button>
    </div>
  );
}

export function ScanlineOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
      borderRadius: 2,
    }} />
  );
}

export function StatBar({ label, value, color = ACCENT }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color, fontFamily: "'Share Tech Mono', monospace", fontWeight: 600 }}>
          {value}
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
        }} />
      </div>
    </div>
  );
}
