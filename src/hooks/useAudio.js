import { useEffect, useRef, useCallback } from 'react';
import useGameStore from '../store/useGameStore';

// Singleton AudioContext to prevent generating multiple contexts
let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

// 800Hz square wave, 60ms, vol 0.04
export const playHover = (soundEnabled) => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.06);
};

// 400Hz → 600Hz square, 100ms+150ms, vol 0.06
export const playSelect = (soundEnabled) => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
};

// 200Hz → 150Hz sawtooth, 300ms+400ms, vol 0.05
export const playTransition = (soundEnabled) => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.7);
};

// 600Hz → 400Hz square, 80ms+120ms, vol 0.04
export const playBack = (soundEnabled) => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
};

// 55Hz sawtooth, lowpass 200Hz, vol 0.015, loops continuously
export const useAmbientSound = (soundEnabled) => {
  const oscRef = useRef(null);
  const gainRef = useRef(null);

  useEffect(() => {
    if (!soundEnabled) {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      return;
    }

    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);

    gain.gain.setValueAtTime(0.015, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    
    oscRef.current = osc;
    gainRef.current = gain;

    return () => {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch(e){}
        oscRef.current.disconnect();
        oscRef.current = null;
      }
    };
  }, [soundEnabled]);
};

// Main hook wrapper to provide functions bound to the current soundEnabled state easily
export const useAudio = () => {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  
  useAmbientSound(soundEnabled);

  return {
    playHover: useCallback(() => playHover(soundEnabled), [soundEnabled]),
    playSelect: useCallback(() => playSelect(soundEnabled), [soundEnabled]),
    playTransition: useCallback(() => playTransition(soundEnabled), [soundEnabled]),
    playBack: useCallback(() => playBack(soundEnabled), [soundEnabled]),
  };
};
