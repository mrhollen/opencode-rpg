// StargatePortal.js - Iconic Stargate Naquadah Ring, DHD pedestal, Chevrons, Kawoosh, and Swirling Event Horizon

import { PALETTE } from './Constants.js';
import sound from '../components/SoundEngine.js';

export class StargatePortal {
  constructor(x = 1024, y = 720) {
    this.x = x;
    this.y = y;
    this.radius = 56; // Ring radius
    this.outerRadius = 68;

    // DHD (Dial Home Device) pedestal in front of gate
    this.dhdX = x;
    this.dhdY = y + 84;
    this.dhdRadius = 16;

    // Gate States: 'idle', 'dialing', 'kawoosh', 'open'
    this.state = 'open'; // default open/shimmering or idle
    this.lockedChevrons = 7; // 0 to 9 locked
    this.dialingTimer = 0;
    this.dialCallback = null;

    // Animations
    this.animTime = 0;
    this.ringRotation = 0;
    this.kawooshTime = 0;
    this.kawooshDuration = 1.2;

    // Light sources for Lighting engine
    this.lightSources = [];
  }

  dial(onComplete = null) {
    this.state = 'dialing';
    this.lockedChevrons = 0;
    this.dialingTimer = 0;
    this.dialCallback = onComplete;
    sound.playClick();
  }

  update(dt, particleSystem = null) {
    this.animTime += dt;

    if (this.state === 'dialing') {
      this.dialingTimer += dt;
      this.ringRotation += dt * 3.5; // Inner ring spins during dialing

      // Lock chevrons sequentially (every 0.35s)
      const targetChevrons = Math.min(7, Math.floor(this.dialingTimer / 0.35) + 1);
      if (targetChevrons > this.lockedChevrons) {
        this.lockedChevrons = targetChevrons;
        sound.playClick();
        if (particleSystem) {
          particleSystem.emitForgeSparks(this.x, this.y - this.radius, 4);
        }
      }

      // Chevron 7 locked -> trigger Kawoosh!
      if (this.lockedChevrons >= 7 && this.dialingTimer > 2.6) {
        this.state = 'kawoosh';
        this.kawooshTime = 0;
        sound.playPortal();

        if (particleSystem) {
          // Explosive burst of blue energy particles
          for (let i = 0; i < 20; i++) {
            particleSystem.emitArcaneRune(this.x + (Math.random() * 40 - 20), this.y + (Math.random() * 30 - 15), '#38bdf8');
          }
          particleSystem.emitForgeSparks(this.x, this.y, 25);
        }
      }
    } else if (this.state === 'kawoosh') {
      this.kawooshTime += dt;
      if (this.kawooshTime >= this.kawooshDuration) {
        this.state = 'open';
        if (this.dialCallback) {
          this.dialCallback();
          this.dialCallback = null;
        }
      }
    } else if (this.state === 'open') {
      // Gentle constant rotation of chevron constellations
      this.ringRotation += dt * 0.15;

      // Occasional event horizon water droplets
      if (particleSystem && Math.random() < 0.15) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (this.radius - 8);
        const px = this.x + Math.cos(angle) * dist;
        const py = this.y + Math.sin(angle) * (dist * 0.75);
        particleSystem.emitWaterRipple(px, py);
      }
    }
  }

  containsPoint(worldX, worldY) {
    // Check gate ring hitbox
    const gateDist = Math.hypot(worldX - this.x, worldY - this.y);
    if (gateDist <= this.outerRadius + 12) return true;

    // Check DHD hitbox
    const dhdDist = Math.hypot(worldX - this.dhdX, worldY - this.dhdY);
    if (dhdDist <= this.dhdRadius + 10) return true;

    return false;
  }

  isNear(worldX, worldY, radius = 95) {
    return Math.hypot(worldX - this.x, worldY - this.y) < radius ||
           Math.hypot(worldX - this.dhdX, worldY - this.dhdY) < radius;
  }

  render(ctx, isHovered = false) {
    ctx.save();

    // 1. Stone Dais & Stairs Platform
    this.drawStoneDais(ctx);

    // 2. Heavy Naquadah Support Base Clamps
    this.drawBaseRamp(ctx);

    // 3. Stargate Ring (Outer & Inner Track)
    this.drawNaquadahRing(ctx);

    // 4. The 9 Chevrons
    this.drawChevrons(ctx);

    // 5. Event Horizon ("The Puddle") or Kawoosh
    if (this.state === 'open') {
      this.drawEventHorizon(ctx);
    } else if (this.state === 'kawoosh') {
      this.drawKawoosh(ctx);
    }

    // 6. DHD (Dial Home Device) in front
    this.drawDHD(ctx, isHovered);

    // 7. Hover / Selection Glow & Title
    if (isHovered) {
      this.drawHoverPrompt(ctx);
    }

    ctx.restore();
  }

  drawStoneDais(ctx) {
    const { x, y } = this;

    // Outer Dais Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 42, 96, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower Tier Stone Dais
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(x, y + 36, 88, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(x, y + 33, 84, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper Tier Stone Dais
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(x, y + 26, 72, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.ellipse(x, y + 24, 68, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Carved ancient glyph runes on stone step
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 40, y + 32, 8, 2);
    ctx.fillRect(x - 20, y + 33, 8, 2);
    ctx.fillRect(x + 12, y + 33, 8, 2);
    ctx.fillRect(x + 32, y + 32, 8, 2);
  }

  drawBaseRamp(ctx) {
    const { x, y } = this;

    // Steel / Naquadah Base Anchors (Left & Right Clamps)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 52, y + 16, 16, 18);
    ctx.fillRect(x + 36, y + 16, 16, 18);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 50, y + 18, 12, 14);
    ctx.fillRect(x + 38, y + 18, 12, 14);

    // Center walkway ramp leading into the gate ring
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(x - 24, y + 30);
    ctx.lineTo(x + 24, y + 30);
    ctx.lineTo(x + 18, y + 10);
    ctx.lineTo(x - 18, y + 10);
    ctx.closePath();
    ctx.fill();
  }

  drawNaquadahRing(ctx) {
    const { x, y, radius, outerRadius } = this;

    // Outer Stationary Dark Naquadah Ring
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x, y, outerRadius - 4, 0, Math.PI * 2);
    ctx.fill();

    // Inner Rotating Track Ring (Metallic gray with constellation markings)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(x, y, radius - 6, 0, Math.PI * 2);
    ctx.fill();

    // Etched Constellation Glyphs on the spinning track
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.ringRotation);

    const glyphCount = 18;
    for (let i = 0; i < glyphCount; i++) {
      const angle = (i * Math.PI * 2) / glyphCount;
      const gx = Math.cos(angle) * (radius - 2);
      const gy = Math.sin(angle) * (radius - 2);

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }
    ctx.restore();
  }

  drawChevrons(ctx) {
    const { x, y, outerRadius } = this;

    // 9 Chevrons positioned around the ring (0 = Top / 12 o'clock)
    // Angles in radians:
    const chevronAngles = [
      -Math.PI / 2,                // Chevron 1 (Top Center - 90 deg)
      -Math.PI / 2 + Math.PI / 4,  // Chevron 2 (Top Right)
      -Math.PI / 2 + Math.PI / 2,  // Chevron 3 (Right)
      -Math.PI / 2 + (3 * Math.PI) / 4, // Chevron 4 (Bottom Right)
      Math.PI / 2,                 // Chevron 5 (Bottom Center)
      Math.PI / 2 + Math.PI / 4,   // Chevron 6 (Bottom Left)
      Math.PI,                     // Chevron 7 (Left)
      Math.PI + Math.PI / 4,       // Chevron 8 (Top Left)
      -Math.PI / 2 - Math.PI / 6,  // Chevron 9 (Upper Left offset)
    ];

    chevronAngles.forEach((angle, index) => {
      const isLocked = index < this.lockedChevrons;
      const cx = x + Math.cos(angle) * (outerRadius - 2);
      const cy = y + Math.sin(angle) * (outerRadius - 2);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + Math.PI / 2);

      // V-shaped mechanical chevron bracket
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-6, -8, 12, 12);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-4, -6, 8, 8);

      // Chevron Glowing Core
      if (isLocked) {
        // Glowing hot orange-red chevron lock!
        const pulse = Math.sin(this.animTime * 12 + index) * 0.15 + 0.85;
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-3, -5, 6, 6);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-1, -3, 2, 3);

        // Chevron light halo
        ctx.fillStyle = `rgba(249, 115, 22, ${0.45 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Inactive chevron core (dark rust)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-3, -4, 6, 4);
      }

      ctx.restore();
    });
  }

  // The Event Horizon ("The Puddle") - Swirling aquatic blue wormhole
  drawEventHorizon(ctx) {
    const { x, y, radius } = this;
    const r = radius - 8;

    ctx.save();

    // Clip to interior of the gate ring
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    // Deep Aquatic Blue Base
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);

    // Swirling concentric wave ripples
    const waveTime = this.animTime * 2.5;
    for (let i = 1; i <= 4; i++) {
      const rippleR = ((waveTime * 12 + i * 14) % r);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(224, 242, 254, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Iridescent turquoise / white water vortex shimmer
    const shimmerShift = Math.sin(this.animTime * 4) * 8;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + shimmerShift, y - shimmerShift * 0.5, r * 0.7, r * 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Center Bright Event Horizon Core
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(x, y, 10 + Math.sin(this.animTime * 6) * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Soft Blue Glow emanating outward onto stone steps
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + 26, r + 20, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The Iconic "Kawoosh" Vortex Burst Wave
  drawKawoosh(ctx) {
    const { x, y, radius } = this;
    const progress = this.kawooshTime / this.kawooshDuration; // 0 -> 1

    ctx.save();
    // Expanding and collapsing vortex cone
    let coneDist = 0;
    if (progress < 0.4) {
      // Shooting forward
      coneDist = (progress / 0.4) * 58;
    } else {
      // Collapsing back
      coneDist = (1 - (progress - 0.4) / 0.6) * 58;
    }

    // Vortex wave cone
    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x - radius + 12, y);
    ctx.quadraticCurveTo(x, y + coneDist * 1.4, x + radius - 12, y);
    ctx.lineTo(x, y - radius + 12);
    ctx.closePath();
    ctx.fill();

    // White hot core burst
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y + coneDist * 0.7, 16 + (1 - progress) * 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // DHD (Dial Home Device) on stone plinth in front
  drawDHD(ctx, isHovered) {
    const { dhdX, dhdY, dhdRadius } = this;

    // Plinth Ground Shadow
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(dhdX, dhdY + 12, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone Pedestal Stand
    ctx.fillStyle = '#334155';
    ctx.fillRect(dhdX - 8, dhdY - 4, 16, 16);
    ctx.fillStyle = '#475569';
    ctx.fillRect(dhdX - 6, dhdY - 2, 12, 14);

    // Angled DHD Console Disc
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(dhdX, dhdY - 8, dhdRadius + 2, dhdRadius * 0.6 + 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(dhdX, dhdY - 8, dhdRadius, dhdRadius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glyph Keys on Console (Small colored facets)
    const isDialing = this.state === 'dialing';
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const kx = dhdX + Math.cos(angle) * (dhdRadius - 5);
      const ky = (dhdY - 8) + Math.sin(angle) * (dhdRadius * 0.6 - 3);

      ctx.fillStyle = isDialing ? '#f59e0b' : '#64748b';
      ctx.fillRect(kx - 1, ky - 1, 3, 2);
    }

    // Large Central Activation Dome Button
    const domePulse = Math.sin(this.animTime * 8) * 0.15 + 0.85;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(dhdX, dhdY - 9, 6 * domePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(dhdX - 1, dhdY - 10, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // DHD Warm Glow
    ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
    ctx.beginPath();
    ctx.arc(dhdX, dhdY - 9, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHoverPrompt(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const promptText = '[SPACE / CLICK] Dial Stargate (Travel to Realm)';
    const titleText = '🌀 ANCIENT STARGATE';

    ctx.font = '8px "Press Start 2P", monospace';
    const tw = Math.max(ctx.measureText(promptText).width, ctx.measureText(titleText).width) + 24;
    const th = 36;
    const bx = this.x - tw / 2;
    const by = this.y - this.outerRadius - 38;

    // Glowing Frame
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx, by, tw, th);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, tw, th);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(titleText, this.x, by + 12);

    // Action Key Prompt
    ctx.fillStyle = '#fde047';
    ctx.fillText(promptText, this.x, by + 26);

    ctx.restore();
  }

  getLightSources() {
    const sources = [];

    // If Event Horizon is active, emit bright cyan/blue light
    if (this.state === 'open') {
      sources.push({
        x: this.x,
        y: this.y,
        radius: 170,
        color: '#0284c7',
        flicker: false,
      });
    }

    // DHD glowing orange dome
    sources.push({
      x: this.dhdX,
      y: this.dhdY - 9,
      radius: 65,
      color: '#ea580c',
      flicker: true,
    });

    return sources;
  }
}

export default StargatePortal;
