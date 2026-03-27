import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import useGameStore from '../store/useGameStore';

const playDeepImpact = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime;

    // LAYER 1: THE SUB-BASS (The "Thump")
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now); // Very deep
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    
    subGain.gain.setValueAtTime(1.2, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    subOsc.connect(subGain).connect(masterGain);

    // LAYER 2: THE CRUNCH (The "Rockstar Slam")
    const crunchOsc = ctx.createOscillator();
    const crunchGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    crunchOsc.type = 'sawtooth'; // Aggressive texture
    crunchOsc.frequency.setValueAtTime(120, now);
    crunchOsc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    
    crunchGain.gain.setValueAtTime(0.5, now);
    crunchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    crunchOsc.connect(filter).connect(crunchGain).connect(masterGain);

    // LAYER 3: THE DUST (White Noise Reverb)
    const bufferSize = ctx.sampleRate * 1.0;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 300;
    
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);

    // MASTER TRIGGER
    subOsc.start(now);
    crunchOsc.start(now);
    noise.start(now);

    subOsc.stop(now + 0.8);
    crunchOsc.stop(now + 0.8);
    noise.stop(now + 1.0);
    
  } catch (e) {
    console.log("Audio blocked by browser.");
  }
};

export default function SplashScreen() {
  const setSplashDone = useGameStore((s) => s.setSplashDone);
  const [started, setStarted] = useState(false);
  const containerRef = useRef();
  const textRef = useRef();
  const overlayRef = useRef();

  const handleTrigger = () => {
    if (started) return;
    setStarted(true);
    playDeepImpact();

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.6,
          delay: 0.5,
          onComplete: () => setSplashDone(true)
        });
      }
    });

    // 1. Violent Entry
    tl.fromTo(textRef.current, 
      { scale: 5, opacity: 0, filter: 'blur(20px)' },
      { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.15, ease: "expo.out" }
    );

    // 2. High-Frequency Strobe (The Rockstar Trademark)
    tl.to(overlayRef.current, {
      opacity: 1,
      repeat: 7,
      yoyo: true,
      duration: 0.04,
      ease: "none",
      onComplete: () => gsap.set(overlayRef.current, { opacity: 0 })
    }, "<");

    // 3. Brutal Screen Shake
    tl.to(textRef.current, {
      x: "random(-40, 40)",
      y: "random(-40, 40)",
      duration: 0.05,
      repeat: 10,
      yoyo: true,
      onComplete: () => gsap.set(textRef.current, { x: 0, y: 0 })
    }, "-=0.3");
  };

  return (
    <div
      ref={containerRef}
      onClick={handleTrigger}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#050505',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: started ? 'default' : 'crosshair', // Rockstar games often use a crosshair/aimer vibe
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Full-screen strobe layer */}
      <div ref={overlayRef} style={{ position: 'absolute', inset: 0, background: '#D4A843', opacity: 0, zIndex: 5, pointerEvents: 'none' }} />

      {!started ? (
        <div style={{ color: '#666', fontFamily: 'Impact, sans-serif', fontSize: '1rem', letterSpacing: '0.5em', opacity: 0.5, animation: 'blink 1s infinite' }}>
          PRESS ANYWHERE TO LOAD
        </div>
      ) : (
        <h1
          ref={textRef}
          style={{
            fontSize: '22vw',
            fontWeight: '900',
            color: '#D4A843',
            fontFamily: 'Impact, sans-serif',
            margin: 0,
            zIndex: 10,
            textShadow: '10px 10px 0px rgba(0,0,0,1)'
          }}
        >
          AHMAD
        </h1>
      )}

      {/* Grit & Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, transparent 40%, #000 150%)', zIndex: 11, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")', opacity: 0.1, zIndex: 12, pointerEvents: 'none' }} />

      <style>{`
        @keyframes blink { 0% { opacity: 0.1; } 50% { opacity: 0.6; } 100% { opacity: 0.1; } }
      `}</style>
    </div>
  );
}