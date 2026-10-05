/**
 * Authentic Procedural Web Audio Sound Engine for Craftmine.
 * Synthesizes classic block breaking, placing, footsteps, TNT fuse, explosion,
 * flint & steel spark, and animal vocalizations without external audio assets.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public enabled: boolean = true;
  public volume: number = 0.55;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // Footstep sound based on surface
  public playFootstep(type: 'grass' | 'stone' | 'wood' | 'sand' | 'water' | 'glass' | 'snow') {
    if (!this.enabled || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    switch (type) {
      case 'grass':
      case 'snow':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110 + Math.random() * 20, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.08);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        break;

      case 'stone':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260 + Math.random() * 40, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, t);
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        break;

      case 'wood':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160 + Math.random() * 30, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.09);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        break;

      case 'sand':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.07);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        break;

      case 'water':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(160, t + 0.12);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        break;

      default:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(190, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        break;
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Block placing sound (solid thud)
  public playBlockPlace(type: string = 'stone') {
    if (!this.enabled || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type === 'wood' ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(250 + Math.random() * 30, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.11);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, t);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Block break sound (burst of noise + percussive crunch)
  public playBlockBreak() {
    if (!this.enabled || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950 + Math.random() * 200, t);
    filter.frequency.exponentialRampToValueAtTime(280, t + 0.13);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  // Flint & Steel Spark / Click sound
  public playFlintAndSteel() {
    if (!this.enabled || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Metallic click
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

    // Spark noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.08);
  }

  // TNT Fuse Sizzling Hiss
  public playFuseHiss(): AudioNode | null {
    if (!this.enabled || this.volume <= 0) return null;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return null;

    const t = this.ctx.currentTime;
    const duration = 2.6; // Matches TNT fuse time

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.linearRampToValueAtTime(0.35, t + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    return gain;
  }

  // Massive TNT Explosion sound
  public playExplosion() {
    if (!this.enabled || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // 1. Deep sub-bass boom
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(28, t + 0.7);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.95);

    // 2. Blast noise roar
    const blastDuration = 1.3;
    const bufferSize = Math.floor(this.ctx.sampleRate * blastDuration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + blastDuration);

    const blastGain = this.ctx.createGain();
    blastGain.gain.setValueAtTime(0.95, t);
    blastGain.gain.exponentialRampToValueAtTime(0.001, t + blastDuration);

    noise.connect(filter);
    filter.connect(blastGain);
    blastGain.connect(this.masterGain);

    noise.start(t);
  }

  // Animal ambient sounds
  public playAnimalSound(type: 'pig' | 'cow' | 'sheep' | 'chicken' | 'frog') {
    if (!this.enabled || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    switch (type) {
      case 'frog': {
        // Frog ribbit / croak: two quick throaty bass bursts
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(75, t + 0.12);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(320, t);
        filter.Q.setValueAtTime(4.0, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }
      case 'pig': {
        // Pig oink: modulated nasal sawtooth
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, t);
        osc.frequency.linearRampToValueAtTime(280, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.22);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(650, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.24);
        break;
      }

      case 'cow': {
        // Cow moo: deep resonant drone with slight drop
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.linearRampToValueAtTime(95, t + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.6);
        break;
      }

      case 'sheep': {
        // Sheep baa: vibrato modulated tone
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(210, t);

        // Fast pitch flutter
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(8, t);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(15, t);
        lfo.connect(osc.frequency);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        lfo.start(t);
        osc.start(t);
        lfo.stop(t + 0.4);
        osc.stop(t + 0.4);
        break;
      }

      case 'chicken': {
        // Chicken cluck: short quick chirp
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.09);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }
    }
  }

  // Water splash sound when diving or surfacing
  public playSplash() {
    if (!this.enabled || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Jump swoosh
  public playJump() {
    if (!this.enabled || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(280, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }
}

export const soundEngine = new SoundEngine();
