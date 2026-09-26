// ParticleSystem.js - Pixel-art particle engine for embers, sparks, smoke, bubbles, runes, and fireflies

export class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 2;
    this.color = '#fff';
    this.type = 'spark'; // 'spark', 'smoke', 'bubble', 'rune', 'firefly', 'ripple', 'coin'
    this.char = '';
    this.alpha = 1;
    this.gravity = 0;
    this.rotation = 0;
    this.vRot = 0;
  }

  init(x, y, options = {}) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = options.vx ?? (Math.random() * 2 - 1) * 20;
    this.vy = options.vy ?? (Math.random() * 2 - 1) * 20;
    this.life = options.life ?? 1.0;
    this.maxLife = this.life;
    this.size = options.size ?? 2;
    this.color = options.color ?? '#fbbf24';
    this.type = options.type ?? 'spark';
    this.char = options.char ?? '';
    this.gravity = options.gravity ?? 0;
    this.alpha = options.alpha ?? 1;
    this.rotation = options.rotation ?? 0;
    this.vRot = options.vRot ?? (Math.random() * 2 - 1) * 2;
  }

  update(dt) {
    if (!this.active) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.vRot * dt;

    const progress = this.life / this.maxLife; // 1 -> 0

    if (this.type === 'smoke') {
      // Smoke grows as it rises and fades out
      this.size += dt * 4;
      this.alpha = progress * 0.75;
      this.vx += (Math.random() - 0.5) * 4 * dt;
    } else if (this.type === 'spark') {
      // Sparks decay quickly
      this.alpha = progress;
      this.vx *= 0.95;
      this.vy *= 0.95;
    } else if (this.type === 'bubble') {
      // Bubbles wobble horizontally
      this.x += Math.sin(this.life * 15) * 0.4;
      this.alpha = Math.min(1, progress * 1.5);
    } else if (this.type === 'rune') {
      // Floating arcane rune
      this.alpha = Math.sin(progress * Math.PI); // Fades in and out
    } else if (this.type === 'firefly') {
      // Fireflies meander gently
      this.vx += (Math.random() - 0.5) * 15 * dt;
      this.vy += (Math.random() - 0.5) * 15 * dt;
      this.alpha = 0.4 + 0.6 * Math.abs(Math.sin(this.life * 4));
    } else if (this.type === 'ripple') {
      this.size += dt * 14;
      this.alpha = progress * 0.6;
    } else if (this.type === 'coin') {
      this.alpha = Math.sin(progress * Math.PI);
    }
  }

  render(ctx) {
    if (!this.active || this.alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));

    if (this.type === 'spark') {
      ctx.fillStyle = this.color;
      const s = Math.max(1, Math.floor(this.size));
      ctx.fillRect(Math.floor(this.x), Math.floor(this.y), s, s);
    } else if (this.type === 'smoke') {
      ctx.fillStyle = this.color;
      const s = Math.floor(this.size);
      // Pixel circle/cross
      ctx.fillRect(Math.floor(this.x - s / 2), Math.floor(this.y - s / 2), s, s);
    } else if (this.type === 'bubble') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      const r = Math.max(1, Math.floor(this.size));
      ctx.beginPath();
      ctx.arc(Math.floor(this.x), Math.floor(this.y), r, 0, Math.PI * 2);
      ctx.stroke();
      // Little highlight pixel inside
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(this.x - r / 2), Math.floor(this.y - r / 2), 1, 1);
    } else if (this.type === 'rune') {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = this.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 4;
      ctx.fillText(this.char || 'ᚱ', Math.floor(this.x), Math.floor(this.y));
    } else if (this.type === 'firefly') {
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 5;
      const s = Math.floor(this.size);
      ctx.fillRect(Math.floor(this.x), Math.floor(this.y), s, s);
    } else if (this.type === 'ripple') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      const r = Math.floor(this.size);
      ctx.beginPath();
      ctx.ellipse(Math.floor(this.x), Math.floor(this.y), r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'coin') {
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 6;
      ctx.fillRect(Math.floor(this.x), Math.floor(this.y), 3, 3);
    }

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(maxParticles = 500) {
    this.maxParticles = maxParticles;
    this.particles = [];
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(new Particle());
    }
    this.runeGlyphs = ['ᚱ', 'ᚪ', 'ᛗ', 'ᛟ', '✦', '✧', 'ᚷ', 'ᛞ', '◈', 'ᛉ'];
  }

  getAvailableParticle() {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) {
        return this.particles[i];
      }
    }
    // If pool is exhausted, reuse oldest
    return this.particles[0];
  }

  // --- Particle Emitter Helpers ---

  // Forge hammer spark burst
  emitForgeSparks(x, y, count = 12) {
    const colors = ['#fef08a', '#f59e0b', '#ef4444', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const p = this.getAvailableParticle();
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 55;
      p.init(x, y, {
        type: 'spark',
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        gravity: 45,
        life: 0.3 + Math.random() * 0.4,
        size: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  // Chimney smoke puff
  emitChimneySmoke(x, y) {
    const p = this.getAvailableParticle();
    const colors = ['#78716c', '#a8a29e', '#d6d3d1', '#e7e5e4'];
    p.init(x + (Math.random() * 4 - 2), y, {
      type: 'smoke',
      vx: (Math.random() * 2 - 1) * 8 + 3, // Drift slightly right with gentle wind
      vy: -18 - Math.random() * 12,
      gravity: -2,
      life: 1.8 + Math.random() * 0.8,
      size: 4 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.7,
    });
  }

  // Alchemist cauldron bubbles
  emitCauldronBubbles(x, y, color = '#22c55e') {
    const p = this.getAvailableParticle();
    p.init(x + (Math.random() * 14 - 7), y + (Math.random() * 4 - 2), {
      type: 'bubble',
      vx: (Math.random() * 2 - 1) * 6,
      vy: -14 - Math.random() * 10,
      gravity: 0,
      life: 0.8 + Math.random() * 0.5,
      size: 2 + Math.random() * 3,
      color: color,
    });
  }

  // Arcane floating runes
  emitArcaneRune(x, y, color = '#38bdf8') {
    const p = this.getAvailableParticle();
    const glyph = this.runeGlyphs[Math.floor(Math.random() * this.runeGlyphs.length)];
    p.init(x + (Math.random() * 16 - 8), y, {
      type: 'rune',
      vx: (Math.random() * 2 - 1) * 8,
      vy: -15 - Math.random() * 10,
      gravity: -2,
      life: 1.4 + Math.random() * 0.6,
      char: glyph,
      color: color,
    });
  }

  // Treasury coin sparkles
  emitCoinSparkle(x, y) {
    const p = this.getAvailableParticle();
    p.init(x + (Math.random() * 20 - 10), y + (Math.random() * 12 - 6), {
      type: 'coin',
      vx: (Math.random() * 2 - 1) * 5,
      vy: -10 - Math.random() * 8,
      life: 0.8 + Math.random() * 0.4,
      size: 2 + Math.random() * 2,
      color: '#fef08a',
    });
  }

  // Night ambient fireflies
  emitFirefly(x, y) {
    const p = this.getAvailableParticle();
    p.init(x, y, {
      type: 'firefly',
      vx: (Math.random() * 2 - 1) * 12,
      vy: (Math.random() * 2 - 1) * 12,
      life: 3.0 + Math.random() * 2.0,
      size: 2,
      color: Math.random() > 0.3 ? '#a3e635' : '#38bdf8',
    });
  }

  // Water ripple ring
  emitWaterRipple(x, y) {
    const p = this.getAvailableParticle();
    p.init(x, y, {
      type: 'ripple',
      vx: 0,
      vy: 0,
      life: 1.2 + Math.random() * 0.5,
      size: 3,
      color: '#e0f2fe',
    });
  }

  update(dt) {
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) {
        this.particles[i].update(dt);
      }
    }
  }

  render(ctx, bounds = null) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.active) {
        // Frustum cull if bounds provided
        if (bounds) {
          if (p.x < bounds.left || p.x > bounds.right || p.y < bounds.top || p.y > bounds.bottom) {
            continue;
          }
        }
        p.render(ctx);
      }
    }
  }
}

export default ParticleSystem;
