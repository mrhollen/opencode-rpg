// SoundEngine.js - Pure Web Audio API 8-bit Synthesizer & Procedural Chiptune Generator
// Zero external audio files required!

class SoundEngine {
  constructor() {
    this.ctx = null;
    const hasStorage = typeof localStorage !== 'undefined';
    this.muted = hasStorage ? localStorage.getItem('opencode_rpg_muted') === 'true' : false;
    this.bgmMuted = hasStorage ? localStorage.getItem('opencode_rpg_bgm_muted') === 'true' : false;
    this.bgmVolume = hasStorage ? parseFloat(localStorage.getItem('opencode_rpg_bgm_vol') || '0.25') : 0.25;

    // BGM State
    this.bgmPlaying = false;
    this.bgmTheme = 'day'; // 'day' | 'night'
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmGainNode = null;
    this.activeNodes = new Set();
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(value) {
    this.muted = !!value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('opencode_rpg_muted', this.muted ? 'true' : 'false');
    }
    if (!this.muted) {
      this.playBlip(600, 0.05);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- BGM Controls ---

  isBgmPlaying() {
    return this.bgmPlaying && !this.bgmMuted;
  }

  isBgmMuted() {
    return this.bgmMuted;
  }

  getBgmVolume() {
    return this.bgmVolume;
  }

  setBgmVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    localStorage.setItem('opencode_rpg_bgm_vol', this.bgmVolume.toString());
    if (this.bgmGainNode && this.ctx) {
      const targetGain = this.bgmMuted ? 0 : this.bgmVolume * 0.15;
      this.bgmGainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
  }

  toggleBgmMute() {
    this.bgmMuted = !this.bgmMuted;
    localStorage.setItem('opencode_rpg_bgm_muted', this.bgmMuted ? 'true' : 'false');
    if (this.bgmGainNode && this.ctx) {
      const targetGain = this.bgmMuted ? 0 : this.bgmVolume * 0.15;
      this.bgmGainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    if (!this.bgmMuted && !this.bgmPlaying) {
      this.startBgm(this.bgmTheme);
    }
    return this.bgmMuted;
  }

  setBgmTheme(theme) {
    if (this.bgmTheme === theme) return;
    this.bgmTheme = theme;
    if (this.bgmPlaying) {
      // Smoothly transition theme
      this.bgmStep = 0;
    }
  }

  startBgm(theme = 'day') {
    this.init();
    if (!this.ctx) return;
    this.bgmTheme = theme;
    this.bgmPlaying = true;

    if (!this.bgmGainNode) {
      this.bgmGainNode = this.ctx.createGain();
      this.bgmGainNode.connect(this.ctx.destination);
    }

    const targetGain = this.bgmMuted ? 0 : this.bgmVolume * 0.15;
    this.bgmGainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);

    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
    }

    this.bgmStep = 0;
    const intervalMs = this.bgmTheme === 'night' ? 220 : 140;

    this.bgmTimer = setInterval(() => {
      this.tickBgm();
    }, intervalMs);
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    // Cleanly stop any active oscillators
    this.activeNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {}
    });
    this.activeNodes.clear();
  }

  toggleBgm() {
    if (this.bgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm(this.bgmTheme);
      return true;
    }
  }

  tickBgm() {
    if (!this.ctx || !this.bgmPlaying || this.bgmMuted) return;

    const t = this.ctx.currentTime;

    if (this.bgmTheme === 'day') {
      this.tickDayTheme(t);
    } else {
      this.tickNightTheme(t);
    }

    this.bgmStep = (this.bgmStep + 1) % 32;
  }

  // --- Day Theme: Cheerful 8-bit Medieval Village (A Minor / C Major) ---
  tickDayTheme(t) {
    // Note frequencies (Hz)
    const C3 = 130.81, E3 = 164.81, G3 = 196.0, A2 = 110.0, D3 = 146.83, F3 = 174.61;
    const A3 = 220.0, B3 = 246.94, C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0, B4 = 493.88, C5 = 523.25;

    // Melody sequence (32 steps)
    const leadNotes = [
      A4, null, C5, null, B4, A4, G4, E4,
      A4, null, B4, C5, D5, null, C5, B4,
      C5, null, E4, G4, A4, null, G4, E4,
      D4, E4, F4, G4, A4, null, null, null,
    ];

    // Bassline (roots on beat)
    const bassNotes = [
      A2, null, A3, null, F3, null, G3, null,
      A2, null, A3, null, D3, null, E3, null,
      C3, null, G3, null, A2, null, E3, null,
      D3, null, F3, null, A2, null, A3, null,
    ];

    const step = this.bgmStep;

    // Play Lead note
    const leadFreq = leadNotes[step];
    if (leadFreq) {
      this.playSynthNote(leadFreq, 0.12, 'square', 0.18, t);
    }

    // Play Bass note
    const bassFreq = bassNotes[step];
    if (bassFreq) {
      this.playSynthNote(bassFreq, 0.18, 'triangle', 0.28, t);
    }

    // Gentle offbeat percussion pulse
    if (step % 4 === 2) {
      this.playNoiseTick(0.04, 0.08, t);
    }
  }

  // --- Night Theme: Serene Arcane Starlight Lullaby ---
  tickNightTheme(t) {
    const A2 = 110.0, F2 = 87.31, D3 = 146.83, E2 = 82.41;
    const C4 = 261.63, E4 = 329.63, A4 = 440.0, B4 = 493.88, D5 = 587.33, E5 = 659.25, G4 = 392.0;

    // Arpeggio chords
    const arpChords = [
      // Am9
      [A2, E4, A4, C4, E5],
      // Fmaj7
      [F2, C4, E4, A4, C4],
      // Dm7
      [D3, F4, A4, D5, F4],
      // Em7
      [E2, G4, B4, E5, B4],
    ];

    const chordIndex = Math.floor(this.bgmStep / 8) % arpChords.length;
    const chord = arpChords[chordIndex];
    const noteIndex = this.bgmStep % chord.length;
    const freq = chord[noteIndex];

    if (freq) {
      this.playSynthNote(freq, 0.28, 'sine', 0.22, t);
    }
  }

  playSynthNote(freq, duration, type, volume, t) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.bgmGainNode);

      osc.start(t);
      osc.stop(t + duration);

      this.activeNodes.add(osc);
      osc.onended = () => {
        this.activeNodes.delete(osc);
      };
    } catch {}
  }

  playNoiseTick(duration, volume, t) {
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
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
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGainNode);

      noise.start(t);
      noise.stop(t + duration);
    } catch {}
  }

  // --- Retro Sound Generators (SFX) ---

  /**
   * 8-bit UI Blip / Chirp
   */
  playBlip(freq = 520, duration = 0.06, type = 'square') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + duration);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch {}
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.03);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.03);
    } catch {}
  }

  playFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [
        { freq: 440, time: 0.00, dur: 0.08 },
        { freq: 554.37, time: 0.08, dur: 0.08 },
        { freq: 659.25, time: 0.16, dur: 0.08 },
        { freq: 880, time: 0.24, dur: 0.25 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const t = this.ctx.currentTime + time;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + dur);
      });
    } catch {}
  }

  playHammer() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      const ringOsc = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(1860, t);
      ringOsc.frequency.exponentialRampToValueAtTime(1420, t + 0.15);

      ringGain.gain.setValueAtTime(0.14, t);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      ringOsc.connect(ringGain);
      ringGain.connect(this.ctx.destination);

      ringOsc.start(t);
      ringOsc.stop(t + 0.15);

      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(160, t);
      thudOsc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

      thudGain.gain.setValueAtTime(0.2, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      thudOsc.connect(thudGain);
      thudGain.connect(this.ctx.destination);

      thudOsc.start(t);
      thudOsc.stop(t + 0.08);
    } catch {}
  }

  playScroll() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
      filter.Q.value = 3.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.12);
    } catch {}
  }

  playPortal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.18);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.35);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch {}
  }

  playCoin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, t);
      osc.frequency.setValueAtTime(1318.51, t + 0.08);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.28);
    } catch {}
  }

  /**
   * Stargate Chevron Locking Thud
   * Distinct heavy metallic clamp with progressive pitch for chevrons 1-7
   */
  playChevronLock(chevronNum = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const baseFreq = 80 + Math.min(chevronNum, 7) * 18;

      // 1. Heavy mechanical low clamp thud
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(baseFreq * 1.5, t);
      thudOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.18);

      thudGain.gain.setValueAtTime(0.35, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      thudOsc.connect(thudGain);
      thudGain.connect(this.ctx.destination);

      thudOsc.start(t);
      thudOsc.stop(t + 0.22);

      // 2. High metallic latch snap
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'square';
      snapOsc.frequency.setValueAtTime(1200 + chevronNum * 90, t);
      snapOsc.frequency.exponentialRampToValueAtTime(450, t + 0.06);

      snapGain.gain.setValueAtTime(0.18, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      snapOsc.connect(snapGain);
      snapGain.connect(this.ctx.destination);

      snapOsc.start(t);
      snapOsc.stop(t + 0.06);
    } catch {}
  }

  /**
   * Stargate "Kawoosh" - Unstable vortex eruption
   * Massive sub-bass boom followed by resonant rushing energy wave
   */
  playKawoosh() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      // 1. Massive sub-bass explosion (rumble eruption)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(35, t);
      subOsc.frequency.exponentialRampToValueAtTime(160, t + 0.12);
      subOsc.frequency.exponentialRampToValueAtTime(40, t + 0.8);

      subGain.gain.setValueAtTime(0.01, t);
      subGain.gain.linearRampToValueAtTime(0.4, t + 0.08);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      subOsc.start(t);
      subOsc.stop(t + 0.85);

      // 2. Erupting plasma vortex wave (filtered noise swoop)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(280, t);
      filter.frequency.exponentialRampToValueAtTime(2400, t + 0.25);
      filter.frequency.exponentialRampToValueAtTime(320, t + 0.9);
      filter.Q.value = 3.5;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, t);
      noiseGain.gain.linearRampToValueAtTime(0.35, t + 0.2);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.9);
    } catch {}
  }

  /**
   * Stargate DHD Glyph Chime
   */
  playDhdClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, t); // E5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  /**
   * Creaking Wooden Door Opening (House Interior)
   */
  playDoorOpen() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.linearRampToValueAtTime(210, t + 0.15);
      osc.frequency.linearRampToValueAtTime(120, t + 0.3);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.32);
    } catch {}
  }

  /**
   * Wooden Door Closing & Latch Click (House Interior)
   */
  playDoorClose() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Thud
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(110, t);
      thud.frequency.exponentialRampToValueAtTime(35, t + 0.14);

      thudGain.gain.setValueAtTime(0.3, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      thud.connect(thudGain);
      thudGain.connect(this.ctx.destination);

      thud.start(t);
      thud.stop(t + 0.14);

      // Latch click
      const latch = this.ctx.createOscillator();
      const latchGain = this.ctx.createGain();
      latch.type = 'square';
      latch.frequency.setValueAtTime(680, t + 0.08);
      latch.frequency.exponentialRampToValueAtTime(220, t + 0.15);

      latchGain.gain.setValueAtTime(0.12, t + 0.08);
      latchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      latch.connect(latchGain);
      latchGain.connect(this.ctx.destination);

      latch.start(t + 0.08);
      latch.stop(t + 0.15);
    } catch {}
  }
}

export const sound = new SoundEngine();
export default sound;
