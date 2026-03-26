/**
 * AudioManager — generates sounds procedurally using Web Audio API
 * No external audio files needed.
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ambientNode = null;
    this.ambientGain = null;
  }

  _getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(val) {
    this.enabled = val;
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(val ? 0.04 : 0, this._getCtx().currentTime, 0.3);
    }
  }

  // Hover — short high tick
  hover() {
    if (!this.enabled) return;
    try {
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  }

  // Click — punchy thud
  click() {
    if (!this.enabled) return;
    try {
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  }

  // Spray — white noise burst
  spray() {
    if (!this.enabled) return;
    try {
      const ctx = this._getCtx();
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.value = 4000;
      bpf.Q.value = 0.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      source.connect(bpf);
      bpf.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
      source.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  }

  // Panel open — whoosh
  panelOpen() {
    if (!this.enabled) return;
    try {
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // Start ambient drone loop
  startAmbient() {
    if (!this.enabled) return;
    try {
      const ctx = this._getCtx();
      if (this.ambientNode) return; // already running

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      this.ambientGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = 55;
      osc2.type = 'sine';
      osc2.frequency.value = 82.5;
      osc3.type = 'triangle';
      osc3.frequency.value = 110;

      const g1 = ctx.createGain(); g1.gain.value = 0.6;
      const g2 = ctx.createGain(); g2.gain.value = 0.3;
      const g3 = ctx.createGain(); g3.gain.value = 0.15;

      // LFO for subtle pulsing
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.2;
      lfoGain.gain.value = 0.01;
      lfo.connect(lfoGain);
      lfoGain.connect(this.ambientGain.gain);

      osc1.connect(g1); g1.connect(this.ambientGain);
      osc2.connect(g2); g2.connect(this.ambientGain);
      osc3.connect(g3); g3.connect(this.ambientGain);

      this.ambientGain.gain.value = 0;
      this.ambientGain.connect(ctx.destination);

      osc1.start(); osc2.start(); osc3.start(); lfo.start();
      this.ambientGain.gain.setTargetAtTime(this.enabled ? 0.04 : 0, ctx.currentTime, 1.5);

      this.ambientNode = { osc1, osc2, osc3, lfo };
    } catch (e) {}
  }

  stopAmbient() {
    try {
      if (this.ambientNode) {
        const { osc1, osc2, osc3, lfo } = this.ambientNode;
        [osc1, osc2, osc3, lfo].forEach((o) => o.stop());
        this.ambientNode = null;
      }
    } catch (e) {}
  }
}

export const audio = new AudioManager();
export default audio;
