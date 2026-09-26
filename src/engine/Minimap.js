// Minimap.js - Retro radar minimap showing huts, active agent blips, player beacon, and camera viewport

import { WORLD_WIDTH, WORLD_HEIGHT, PALETTE } from './Constants.js';

export class Minimap {
  constructor(size = 150) {
    this.size = size;
    this.x = 20;
    this.y = 20; // default top-right or bottom-right
    this.scale = this.size / WORLD_WIDTH; // world -> minimap scale
    this.isExpanded = false;
    this.animTime = 0;
  }

  updatePosition(canvasWidth, canvasHeight, align = 'bottom-right') {
    if (align === 'bottom-right') {
      this.x = canvasWidth - this.size - 20;
      this.y = canvasHeight - this.size - 24;
    } else if (align === 'top-right') {
      this.x = canvasWidth - this.size - 20;
      this.y = 20;
    }
  }

  update(dt) {
    this.animTime += dt;
  }

  containsPoint(screenX, screenY) {
    return (
      screenX >= this.x &&
      screenX <= this.x + this.size &&
      screenY >= this.y &&
      screenY <= this.y + this.size
    );
  }

  handleClick(screenX, screenY, camera, player = null, particleSystem = null) {
    const relX = (screenX - this.x) / this.size;
    const relY = (screenY - this.y) / this.size;

    const targetWorldX = Math.max(32, Math.min(WORLD_WIDTH - 32, relX * WORLD_WIDTH));
    const targetWorldY = Math.max(32, Math.min(WORLD_HEIGHT - 32, relY * WORLD_HEIGHT));

    // 1. Smoothly center camera
    camera.centerOn(targetWorldX, targetWorldY);

    // 2. Teleport Overseer Avatar directly to clicked coordinate
    if (player) {
      player.teleportTo(targetWorldX, targetWorldY);
    }

    // 3. Emit magical teleport particles
    if (particleSystem) {
      for (let i = 0; i < 8; i++) {
        particleSystem.emitArcaneRune(targetWorldX + (Math.random() * 20 - 10), targetWorldY + (Math.random() * 20 - 10), '#38bdf8');
      }
      particleSystem.emitForgeSparks(targetWorldX, targetWorldY, 14);
    }

    return { x: targetWorldX, y: targetWorldY };
  }

  render(ctx, camera, player, huts = [], agents = [], biome = 'forest', courier = null) {
    ctx.save();

    const mx = this.x;
    const my = this.y;
    const ms = this.size;

    // 1. Retro Frame Box
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(mx - 4, my - 4, ms + 8, ms + 8);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeRect(mx - 4, my - 4, ms + 8, ms + 8);

    // Inner gold border
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 1, my - 1, ms + 2, ms + 2);

    // 2. Biome-aware Terrain Background
    let groundCol = '#26341d';
    let waterCol = '#0284c7';
    if (biome === 'desert') {
      groundCol = '#92400e';
      waterCol = '#06b6d4';
    } else if (biome === 'snow') {
      groundCol = '#94a3b8';
      waterCol = '#38bdf8';
    } else if (biome === 'void') {
      groundCol = '#1e1138';
      waterCol = '#6b21a8';
    }

    ctx.fillStyle = groundCol;
    ctx.fillRect(mx, my, ms, ms);

    // Clip to minimap interior
    ctx.beginPath();
    ctx.rect(mx, my, ms, ms);
    ctx.clip();

    // 3. Draw Water Pond / Oasis / Mana Pool
    ctx.fillStyle = waterCol;
    const pondWorldX = 1024 + 16 * 32;
    const pondWorldY = 1024 + 10 * 32;
    ctx.beginPath();
    ctx.ellipse(
      mx + pondWorldX * this.scale,
      my + pondWorldY * this.scale,
      9 * 32 * this.scale,
      6 * 32 * this.scale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 4. Draw Central Plaza
    ctx.fillStyle = biome === 'void' ? '#3b0764' : '#78716c';
    ctx.beginPath();
    ctx.arc(mx + (WORLD_WIDTH / 2) * this.scale, my + (WORLD_HEIGHT / 2) * this.scale, 7 * 32 * this.scale, 0, Math.PI * 2);
    ctx.fill();

    // 5. Draw Huts
    huts.forEach(hut => {
      const hx = mx + hut.x * this.scale;
      const hy = my + hut.y * this.scale;
      const hw = Math.max(8, hut.width * this.scale);
      const hh = Math.max(6, hut.height * this.scale);

      // Hut square
      ctx.fillStyle = hut.active ? '#b45309' : '#57534e';
      ctx.fillRect(hx - hw / 2, hy - hh / 2, hw, hh);

      // Status beacon dot
      ctx.fillStyle = hut.active ? '#10b981' : '#a8a29e';
      ctx.fillRect(hx - 2, hy - 2, 4, 4);
    });

    // 6. Draw Active Agents (Pulsing Blips)
    agents.forEach(agent => {
      if (agent.status === 'working') {
        const ax = mx + agent.x * this.scale;
        const ay = my + agent.y * this.scale;
        const pulse = Math.sin(this.animTime * 10 + agent.x) * 1.5;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(ax, ay, 2 + Math.max(0, pulse), 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 7. Draw Courier Apprentice Blip
    if (courier) {
      const cx = mx + courier.x * this.scale;
      const cy = my + courier.y * this.scale;
      ctx.fillStyle = '#fde047'; // Bright golden messenger dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Draw Camera Viewport Rectangle
    const bounds = camera.getVisibleBounds(0);
    const camLeft = mx + Math.max(0, bounds.left) * this.scale;
    const camTop = my + Math.max(0, bounds.top) * this.scale;
    const camW = (bounds.right - bounds.left) * this.scale;
    const camH = (bounds.bottom - bounds.top) * this.scale;

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.strokeRect(camLeft, camTop, camW, camH);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.12)';
    ctx.fillRect(camLeft, camTop, camW, camH);

    // 8. Draw Player Beacon
    if (player) {
      const px = mx + player.x * this.scale;
      const py = my + player.y * this.scale;
      const pulse = Math.sin(this.animTime * 8) * 1.5;

      // Glow halo
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(px, py, 5 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Core red adventurer marker
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }

    ctx.restore();

    // 9. Cardinal Directions (N, S, E, W)
    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', mx + ms / 2, my + 8);
    ctx.fillText('S', mx + ms / 2, my + ms - 6);
    ctx.fillText('W', mx + 8, my + ms / 2);
    ctx.fillText('E', mx + ms - 8, my + ms / 2);

    // Title label
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'left';
    ctx.fillText('REALM MAP', mx + 4, my - 8);

    ctx.restore();
  }
}

export default Minimap;
