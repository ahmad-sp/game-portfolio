import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import useGameStore from '../store/useGameStore';

function playSpray() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 1.0; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch(e) {}
}

function playImpact() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(2.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch(e) {}
}

export default function SplashScreen() {
  const setSplashDone = useGameStore((s) => s.setSplashDone);
  const [started, setStarted] = useState(false);
  
  const wrapRef = useRef();
  const textRef = useRef();
  const maskPathRef = useRef();
  const particleContainerRef = useRef();
  const instructionRef = useRef();

  const handleStart = () => {
    if (started) return;
    setStarted(true);
    gsap.to(instructionRef.current, { opacity: 0, duration: 0.2 });

    const tl = gsap.timeline({ delay: 0.3 });

    // Spray Reveal
    tl.add(() => playSpray(), 0);
    
    tl.fromTo(maskPathRef.current, 
      { strokeDashoffset: -1500 }, 
      { 
        strokeDashoffset: 0, 
        duration: 0.9, 
        ease: 'power2.inOut',
        onUpdate: function() {
          const progress = this.progress(); 
          spawnParticles(progress);
        }
      }, 0
    );

    // Impact
    tl.add(() => {
      playImpact();
      gsap.to(wrapRef.current, {
        x: () => (Math.random()-0.5)*15,
        y: () => (Math.random()-0.5)*15,
        yoyo: true, repeat: 5, duration: 0.04
      });
      // Glow pulse
      gsap.fromTo(textRef.current, 
        { filter: 'drop-shadow(0px 0px 40px rgba(212,168,67,1)) brightness(2)' },
        { filter: 'drop-shadow(0px 0px 15px rgba(212,168,67,0.4)) brightness(1)', duration: 0.8, ease: 'power2.out' }
      );
    }, 0.9);

    // Fade to black and transition
    tl.to(wrapRef.current, {
      opacity: 0, duration: 0.5, ease: 'power2.inOut',
      delay: 0.6,
      onComplete: () => setSplashDone(true)
    });
  };

  const spawnParticles = (progress) => {
    if (!particleContainerRef.current) return;
    const px = Math.floor(progress * window.innerWidth);
    const py = Math.floor(progress * window.innerHeight);

    for(let i=0; i<3; i++) {
      const p = document.createElement('div');
      p.style.position = 'absolute';
      p.style.width = Math.random() > 0.6 ? '4px' : '2px';
      p.style.height = p.style.width;
      p.style.borderRadius = '50%';
      p.style.backgroundColor = Math.random() > 0.4 ? '#D4A843' : '#FFFFFF';
      p.style.left = `${px + (Math.random()-0.5)*60}px`;
      p.style.top = `${py + (Math.random()-0.5)*60}px`;
      p.style.pointerEvents = 'none';
      p.style.zIndex = 10;
      particleContainerRef.current.appendChild(p);

      gsap.to(p, {
        x: (Math.random()-0.5)*50,
        y: (Math.random()-0.5)*50 + 20, 
        opacity: 0,
        scale: 0.1,
        duration: 0.3 + Math.random()*0.3,
        ease: 'power1.out',
        onComplete: () => p.remove()
      });
    }
  };

  return (
    <div
      ref={wrapRef}
      onClick={handleStart}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#040508',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: started ? 'auto' : 'pointer', overflow: 'hidden'
      }}
    >
      {/* Grain Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        opacity: 0.05, mixBlendMode: 'overlay', pointerEvents: 'none'
      }} />

      <div ref={particleContainerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {!started && (
        <div ref={instructionRef} style={{
          position: 'absolute', bottom: '15%', color: '#666',
          fontFamily: "'Share Tech Mono', monospace", fontSize: 14, letterSpacing: '0.2em',
          animation: 'pulse 1.5s infinite'
        }}>
          [ CLICK TO INITIALIZE ]
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>

      {/* SVG Mask Reveal */}
      <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }}>
        <defs>
          <filter id="spray-roughness">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          
          <mask id="spray-mask">
            <path
              ref={maskPathRef}
              d="M -50 -50 L 1050 550"
              stroke="white"
              strokeWidth="320"
              strokeDasharray="1500"
              strokeDashoffset="1500"
              strokeLinecap="round"
              filter="url(#spray-roughness)"
              fill="none"
            />
          </mask>
        </defs>

        <g mask={started ? "url(#spray-mask)" : "none"}>
          {started && (
            <text
              ref={textRef}
              x="500" y="250"
              textAnchor="middle" dominantBaseline="middle"
              fontSize="240" fontFamily="Pricedown Bl, 'Oswald', sans-serif"
              fill="#D4A843" letterSpacing="10"
              style={{ filter: 'drop-shadow(0px 0px 15px rgba(212,168,67,0.4))' }}
            >
              AHMAD
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
