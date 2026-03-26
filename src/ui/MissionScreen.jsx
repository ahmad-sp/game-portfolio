import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

// ── All mission/project data ──────────────────────────────────────────────────
export const MISSIONS = [
  {
    id: 'ai-traffic',
    title: 'AI Traffic Monitor',
    tagline: 'Real-Time UAV Surveillance System',
    color: '#4A90D9',
    status: 'COMPLETE',
    description:
      'A production-grade traffic anomaly detection platform using drone video feeds. The system processes live video streams, detects vehicles, and flags anomalies like wrong-way driving, congestion, or accidents in real-time.',
    problem:
      'Manual traffic monitoring is slow and error-prone. Cities lack an automated, AI-driven method to detect and respond to incidents on roads using aerial footage.',
    features: [
      'Real-time video processing with YOLOv8',
      'Multi-object tracking across frames',
      'Anomaly classification engine',
      'Live dashboard with alert system',
      'REST API for third-party integrations',
    ],
    tech: ['Python', 'YOLOv8', 'OpenCV', 'FastAPI', 'React', 'WebSocket'],
    demo: '#',
    github: '#',
  },
  {
    id: 'smart-menu',
    title: 'Smart Menu System',
    tagline: 'AI-Enhanced Digital Restaurant Platform',
    color: '#D4A843',
    status: 'COMPLETE',
    description:
      'A full-stack digital restaurant menu with AI-generated dish imagery, admin CMS, background-removed photos, and mobile-responsive design. Supports Indian localization and multiple payment integrations.',
    problem:
      'Restaurant owners lack affordable, visually appealing digital menus. Existing solutions are either too expensive or too basic to showcase food quality effectively.',
    features: [
      'AI-generated dish photography (28 items)',
      'Background removal pipeline',
      'Admin CMS with live menu editor',
      'Mobile-responsive layout',
      'Indian locale (₹ pricing, regional names)',
    ],
    tech: ['React', 'Node.js', 'MongoDB', 'Tailwind CSS', 'Vite', 'ImageMagick'],
    demo: '#',
    github: '#',
  },
  {
    id: 'portfolio-os',
    title: 'Portfolio OS',
    tagline: 'Immersive Game-Style 3D Portfolio',
    color: '#6AC46A',
    status: 'ACTIVE',
    description:
      'This portfolio itself — a fully immersive game-like experience built with React Three Fiber. Features spray-paint splash screen, GTA SA-style menu, walkable 3D world with interactive stations, and game HUD panels.',
    problem:
      'Standard portfolios are boring and forgettable. Recruiters see hundreds of static sites. A game-like experience creates a memorable first impression that stands out completely.',
    features: [
      'Canvas spray-paint splash screen',
      'GTA SA-style main menu with parallax',
      'WASD + mouse 3D camera movement',
      '4 interactive 3D station objects',
      'Game HUD UI panels with GSAP animations',
      'Web Audio API procedural sound engine',
    ],
    tech: ['React', 'Three.js', 'R3F', 'GSAP', 'Zustand', 'Vite'],
    demo: '#',
    github: '#',
  },
  {
    id: 'ml-classifier',
    title: 'ML Image Classifier',
    tagline: 'Deep Learning Vision Pipeline',
    color: '#D46A6A',
    status: 'COMPLETE',
    description:
      'An end-to-end image classification system with CNN training, evaluation dashboard, and REST API deployment. Supports custom datasets and real-time inference via a web interface.',
    problem:
      'Machine learning engineers need a streamlined pipeline to go from raw data to deployed model without gluing together disparate tools and frameworks manually.',
    features: [
      'Custom CNN architecture builder',
      'Training progress dashboard',
      'Data augmentation pipeline',
      'REST API for inference',
      'Docker containerized deployment',
    ],
    tech: ['Python', 'TensorFlow', 'Flask', 'Docker', 'React', 'PostgreSQL'],
    demo: '#',
    github: '#',
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Platform',
    tagline: 'Full-Featured Indian Commerce Solution',
    color: '#9B6AD4',
    status: 'COMPLETE',
    description:
      'A scalable e-commerce platform for the Indian market with Razorpay payment gateway, inventory management, order tracking, and a comprehensive admin dashboard with sales analytics.',
    problem:
      'Small businesses in India need an affordable, locally-adapted e-commerce solution with Indian payment gateways, currency, and regional shipping support.',
    features: [
      'Razorpay payments with UPI/NetBanking',
      'Inventory and order management',
      'Real-time order tracking',
      'Admin analytics dashboard',
      'Mobile-first responsive design',
    ],
    tech: ['Next.js', 'Prisma', 'PostgreSQL', 'Tailwind CSS', 'Razorpay', 'Vercel'],
    demo: '#',
    github: '#',
  },
];

// ── MissionScreen Component ───────────────────────────────────────────────────
export default function MissionScreen({ mission, onClose }) {
  const panelRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    // Dim overlay fade in
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    // Panel slide in from right
    gsap.fromTo(
      panelRef.current,
      { x: 60, opacity: 0, scale: 0.97 },
      { x: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' }
    );
    const esc = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const handleClose = () => {
    gsap.to(panelRef.current, { x: 60, opacity: 0, scale: 0.97, duration: 0.3, ease: 'power2.in' });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.35, onComplete: onClose });
  };

  const c = mission.color;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        ref={panelRef}
        style={{
          width: '100%', maxWidth: 640, maxHeight: '90vh',
          background: 'rgba(4,5,8,0.98)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${c}30`,
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Scanline overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)' }} />

        {/* Header */}
        <div style={{ background: c, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, background: '#000', transform: 'rotate(45deg)' }} />
            <span style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.5em', color: '#000', textTransform: 'uppercase' }}>
              Mission File
            </span>
            <span style={{ background: 'rgba(0,0,0,0.2)', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#000', padding: '2px 8px', letterSpacing: '0.15em' }}>
              {mission.status}
            </span>
          </div>
          <button onClick={handleClose} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.4)', color: '#000', cursor: 'pointer', fontSize: 15, fontWeight: 700, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, fontFamily: 'monospace' }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 28px' }}>
          {/* Mission title */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', lineHeight: 1 }}>
              {mission.title}
            </div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 11, letterSpacing: '0.25em', color: c, textTransform: 'uppercase', marginTop: 6 }}>
              {mission.tagline}
            </div>
          </div>

          <div style={{ height: 1, background: `linear-gradient(to right, ${c}60, transparent)`, margin: '16px 0' }} />

          {/* Description */}
          <SectionLabel>Briefing</SectionLabel>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.85, marginBottom: 20, fontFamily: "'Rajdhani',sans-serif", letterSpacing: '0.02em' }}>
            {mission.description}
          </p>

          {/* Problem statement */}
          <SectionLabel>Problem</SectionLabel>
          <div style={{ borderLeft: `3px solid ${c}60`, paddingLeft: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.85, fontFamily: "'Rajdhani',sans-serif" }}>
              {mission.problem}
            </p>
          </div>

          {/* Features */}
          <SectionLabel>Objectives</SectionLabel>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {mission.features.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ color: c, fontSize: 13, marginTop: 1, flexShrink: 0 }}>▸</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: "'Rajdhani',sans-serif", lineHeight: 1.6 }}>{f}</span>
              </li>
            ))}
          </ul>

          {/* Tech stack */}
          <SectionLabel>Tech Stack</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 26 }}>
            {mission.tech.map((t) => (
              <span key={t} style={{ fontFamily: "'Oswald',sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: c, border: `1px solid ${c}40`, padding: '4px 10px', background: `${c}0d` }}>
                {t}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={mission.demo} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: c, color: '#000', border: 'none', fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.4em', textTransform: 'uppercase', padding: '12px', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              ▶ Live Demo
            </a>
            <a href={mission.github} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: 'transparent', color: c, border: `1px solid ${c}60`, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.4em', textTransform: 'uppercase', padding: '12px', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              ◈ GitHub
            </a>
            <button onClick={handleClose}
              style={{ background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Oswald',sans-serif", fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', padding: '12px 16px', cursor: 'pointer' }}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 10, letterSpacing: '0.45em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 10 }}>
      &gt; {children}
    </div>
  );
}
