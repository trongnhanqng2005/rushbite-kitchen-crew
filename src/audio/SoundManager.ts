/**
 * Web Audio API procedural sound engine for RushBite.
 * Requires zero external audio files, operates with zero latency,
 * and handles browser autoplay restrictions gracefully.
 */

import { GameConfig } from '../game/GameConfig.ts';

export class SoundManager {
  private static instance: SoundManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private sizzleNode: AudioBufferSourceNode | null = null;
  private sizzleGain: GainNode | null = null;
  private sizzleStopTimeout: ReturnType<typeof setTimeout> | null = null;

  private fryerNode: AudioBufferSourceNode | null = null;
  private fryerGain: GainNode | null = null;
  private fryerStopTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public init(): void {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = GameConfig.audio.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = GameConfig.audio.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.isInitialized = true;
    } catch (e) {
      console.warn('[SoundManager] Audio initialization error:', e);
    }
  }

  public setMasterVolume(vol: number): void {
    GameConfig.audio.masterVolume = vol;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(GameConfig.audio.muted ? 0 : vol, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number): void {
    GameConfig.audio.sfxVolume = vol;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  public setMuted(muted: boolean): void {
    GameConfig.audio.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : GameConfig.audio.masterVolume, this.ctx.currentTime);
    }
  }

  // --- SOUND EFFECTS ---

  public playPickup(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playPlace(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playCashRegister(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Dual bells for realistic register chime
    [1318.5, 1760.0].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.3, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startT);
      osc.stop(startT + 0.5);
    });
  }

  public playOrderServed(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Major chord arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playOrderArrival(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Two-tone bell ding-dong
    [880, 659.25].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.15;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  public playError(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.25);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playTrash(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public startGrillSizzle(): void {
    if (!this.ctx || !this.sfxGain || this.sizzleNode) return;
    if (this.sizzleStopTimeout !== null) {
      clearTimeout(this.sizzleStopTimeout);
      this.sizzleStopTimeout = null;
    }
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;

      // Filtered pink noise for rich sizzle
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      this.sizzleNode = this.ctx.createBufferSource();
      this.sizzleNode.buffer = buffer;
      this.sizzleNode.loop = true;

      // Bandpass filter to sound like meat sizzling
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2200;
      filter.Q.value = 1.2;

      this.sizzleGain = this.ctx.createGain();
      this.sizzleGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.sizzleNode.connect(filter);
      filter.connect(this.sizzleGain);
      this.sizzleGain.connect(this.sfxGain);

      this.sizzleNode.start();
    } catch (e) {
      console.warn('[SoundManager] Error starting grill sizzle:', e);
    }
  }

  public stopGrillSizzle(): void {
    if (this.sizzleStopTimeout !== null) {
      clearTimeout(this.sizzleStopTimeout);
      this.sizzleStopTimeout = null;
    }
    if (this.sizzleGain && this.ctx) {
      this.sizzleGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    }
    this.sizzleStopTimeout = setTimeout(() => {
      this.sizzleStopTimeout = null;
      if (this.sizzleNode) {
        try {
          this.sizzleNode.stop();
          this.sizzleNode.disconnect();
        } catch (_) {}
        this.sizzleNode = null;
        this.sizzleGain = null;
      }
    }, 250);
  }

  public startFryerSizzle(): void {
    if (!this.ctx || !this.sfxGain || this.fryerNode) return;
    if (this.fryerStopTimeout !== null) {
      clearTimeout(this.fryerStopTimeout);
      this.fryerStopTimeout = null;
    }
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;

      // Deep bubbling fryer noise
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
        data[i] *= 4.0;
      }

      this.fryerNode = this.ctx.createBufferSource();
      this.fryerNode.buffer = buffer;
      this.fryerNode.loop = true;

      // Lower bandpass filter for bubbling deep oil fry
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 1.8;

      this.fryerGain = this.ctx.createGain();
      this.fryerGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      this.fryerNode.connect(filter);
      filter.connect(this.fryerGain);
      this.fryerGain.connect(this.sfxGain);

      this.fryerNode.start();
    } catch (e) {
      console.warn('[SoundManager] Error starting fryer sizzle:', e);
    }
  }

  public stopFryerSizzle(): void {
    if (this.fryerStopTimeout !== null) {
      clearTimeout(this.fryerStopTimeout);
      this.fryerStopTimeout = null;
    }
    if (this.fryerGain && this.ctx) {
      this.fryerGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    }
    this.fryerStopTimeout = setTimeout(() => {
      this.fryerStopTimeout = null;
      if (this.fryerNode) {
        try {
          this.fryerNode.stop();
          this.fryerNode.disconnect();
        } catch (_) {}
        this.fryerNode = null;
        this.fryerGain = null;
      }
    }, 250);
  }

  public playDrinkDispense(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Fizz burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3500;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);

    // Liquid tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.28);

    oscGain.gain.setValueAtTime(0.18, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playRushWarning(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Urgent two-tone chime / siren
    [
      { freq: 440, time: now },
      { freq: 587.33, time: now + 0.16 },
      { freq: 440, time: now + 0.32 },
      { freq: 587.33, time: now + 0.48 },
    ].forEach((tone) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone.freq, tone.time);

      gain.gain.setValueAtTime(0.25, tone.time);
      gain.gain.exponentialRampToValueAtTime(0.001, tone.time + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(tone.time);
      osc.stop(tone.time + 0.16);
    });
  }

  public dispose(): void {
    if (this.sizzleStopTimeout !== null) {
      clearTimeout(this.sizzleStopTimeout);
      this.sizzleStopTimeout = null;
    }
    if (this.sizzleNode) {
      try {
        this.sizzleNode.stop();
        this.sizzleNode.disconnect();
      } catch (_) {}
      this.sizzleNode = null;
      this.sizzleGain = null;
    }
    if (this.fryerStopTimeout !== null) {
      clearTimeout(this.fryerStopTimeout);
      this.fryerStopTimeout = null;
    }
    if (this.fryerNode) {
      try {
        this.fryerNode.stop();
        this.fryerNode.disconnect();
      } catch (_) {}
      this.fryerNode = null;
      this.fryerGain = null;
    }
  }
}
