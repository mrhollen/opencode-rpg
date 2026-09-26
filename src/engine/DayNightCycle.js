// DayNightCycle.js - Dynamic day, dusk, night, dawn progression and ambient lighting calculations

export class DayNightCycle {
  constructor(cycleDuration = 180) {
    this.cycleDuration = cycleDuration; // seconds for a full 24h cycle
    this.time = 0.35; // Start at 0.35 (Midday ~11:00 AM)
    this.isPaused = false;
    this.speed = 1.0;
  }

  update(dt) {
    if (this.isPaused) return;
    this.time = (this.time + (dt / this.cycleDuration) * this.speed) % 1.0;
  }

  setTime(timeVal) {
    this.time = Math.max(0, Math.min(1, timeVal));
  }

  setTimePreset(preset) {
    switch (preset) {
      case 'dawn':
        this.time = 0.12;
        break;
      case 'day':
        this.time = 0.35;
        break;
      case 'dusk':
        this.time = 0.68;
        break;
      case 'night':
        this.time = 0.88;
        break;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  // Returns current phase name
  getPhase() {
    if (this.time >= 0.05 && this.time < 0.22) return 'dawn';
    if (this.time >= 0.22 && this.time < 0.62) return 'day';
    if (this.time >= 0.62 && this.time < 0.78) return 'dusk';
    return 'night';
  }

  // Returns formatted 24h time and status
  getTimeString() {
    const totalMinutes = Math.floor(this.time * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const padH = hours.toString().padStart(2, '0');
    const padM = mins.toString().padStart(2, '0');
    const phase = this.getPhase().toUpperCase();

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;

    return `${h12}:${padM} ${ampm} [${phase}]`;
  }

  // Computes RGBA color for the ambient darkness overlay
  getAmbientColor() {
    const t = this.time;

    // Day: 0.25 to 0.60 -> clear (alpha = 0)
    if (t >= 0.25 && t < 0.60) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }

    // Dusk: 0.60 to 0.75 -> transitions into deep sunset crimson/violet
    if (t >= 0.60 && t < 0.75) {
      const p = (t - 0.60) / 0.15; // 0 -> 1
      const r = Math.floor(160 - p * 130);
      const g = Math.floor(60 - p * 45);
      const b = Math.floor(80 + p * 30);
      const a = p * 0.82;
      return { r, g, b, a };
    }

    // Night: 0.75 to 0.95 -> deep moonlit indigo
    if (t >= 0.75 && t < 0.95) {
      return { r: 8, g: 14, b: 34, a: 0.86 };
    }

    // Dawn: 0.95 to 1.0 & 0.0 to 0.25 -> transitions to morning golden light
    const dawnP = t >= 0.95 ? (t - 0.95) / 0.3 : (t + 0.05) / 0.3; // 0 -> 1
    const r = Math.floor(8 + (1 - dawnP) * 100);
    const g = Math.floor(14 + (1 - dawnP) * 50);
    const b = Math.floor(34 + (1 - dawnP) * 50);
    const a = (1 - dawnP) * 0.86;
    return { r, g, b, a };
  }
}

export default DayNightCycle;
