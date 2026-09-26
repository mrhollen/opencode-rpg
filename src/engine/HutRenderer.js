// HutRenderer.js - Renders unique Guild Huts / Workshops for opencode master sessions

import { PALETTE } from './Constants.js';

export class HutRenderer {
  constructor() {
    this.huts = [];
    this.smokeTimer = 0;
    this.animTime = 0;
  }

  /**
   * Layout huts around the village plaza based on sessions list.
   * If sessions are provided, each session gets a unique hut.
   */
  layoutHuts(sessions = [], centerX = 1024, centerY = 1024) {
    this.huts = [];

    // Distinct plot coordinates around the village center (radius ~ 360-440px)
    const plots = [
      { x: centerX - 360, y: centerY - 280, theme: 'forge', sign: 'Code Smithy' },
      { x: centerX + 360, y: centerY - 280, theme: 'arcane', sign: 'Scholar Sanctum' },
      { x: centerX - 380, y: centerY + 260, theme: 'apothecary', sign: 'Alchemist Lab' },
      { x: centerX + 340, y: centerY + 280, theme: 'citadel', sign: 'Guild Keep' },
      { x: centerX, y: centerY - 440, theme: 'forge', sign: 'Ironworks' },
      { x: centerX - 480, y: centerY, theme: 'arcane', sign: 'Starlight Spire' },
      { x: centerX + 480, y: centerY, theme: 'citadel', sign: 'Crown Hall' },
      { x: centerX, y: centerY + 440, theme: 'apothecary', sign: 'Herbal Bastion' },
    ];

    // Fallback if no sessions
    const sessionList = (sessions && sessions.length > 0)
      ? sessions
      : [
          { id: 'session-main', name: 'Agent Guildhall (Main)', status: 'active', activeAgents: 3 },
          { id: 'session-dev', name: 'Refactoring Workshop', status: 'idle', activeAgents: 0 },
          { id: 'session-research', name: 'Arcane Research Hub', status: 'active', activeAgents: 2 },
          { id: 'session-test', name: 'Testing Laboratory', status: 'active', activeAgents: 1 },
        ];

    sessionList.forEach((session, index) => {
      const plot = plots[index % plots.length];
      const hut = {
        id: session.id || `hut-${index}`,
        session: session,
        name: session.name || session.slug || plot.sign,
        x: plot.x,
        y: plot.y,
        width: 170,
        height: 140,
        theme: plot.theme,
        chimneyX: plot.x + 48,
        chimneyY: plot.y - 70,
        doorX: plot.x,
        doorY: plot.y + 40,
        active: session.status === 'active' || (session.activeAgents && session.activeAgents > 0),
        activeAgentsCount: session.activeAgents || (session.status === 'active' ? 1 : 0),
        tokens: session.tokens || 14250,
      };
      this.huts.push(hut);
    });

    return this.huts;
  }

  getHuts() {
    return this.huts;
  }

  getHutAt(worldX, worldY) {
    for (let i = this.huts.length - 1; i >= 0; i--) {
      const hut = this.huts[i];
      // Hitbox covers roof and base
      const left = hut.x - hut.width / 2 - 10;
      const right = hut.x + hut.width / 2 + 10;
      const top = hut.y - hut.height / 2 - 25;
      const bottom = hut.y + hut.height / 2 + 20;

      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return hut;
      }
    }
    return null;
  }

  update(dt, particleSystem = null) {
    this.animTime += dt;
    this.smokeTimer += dt;

    // Emit smoke puffs from active chimneys
    if (this.smokeTimer > 0.22) {
      this.smokeTimer = 0;
      if (particleSystem) {
        this.huts.forEach(hut => {
          if (hut.active || Math.random() < 0.6) {
            particleSystem.emitChimneySmoke(hut.chimneyX, hut.chimneyY);
          }
        });
      }
    }
  }

  render(ctx, selectedHutId = null, hoveredHutId = null) {
    this.huts.forEach(hut => {
      const isSelected = selectedHutId === hut.id;
      const isHovered = hoveredHutId === hut.id;
      this.drawHut(ctx, hut, isSelected, isHovered);
    });
  }

  drawHut(ctx, hut, isSelected, isHovered) {
    const { x, y, width, height, theme, active } = hut;
    const halfW = width / 2;
    const halfH = height / 2;

    ctx.save();

    // 1. Ground Shadow underneath hut
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + halfH + 8, halfW + 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Cobblestone Porch Apron in front of door
    ctx.fillStyle = PALETTE.dirtBase;
    ctx.fillRect(x - 28, y + halfH - 2, 56, 16);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(x - 24, y + halfH, 48, 12);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x - 20, y + halfH + 2, 40, 2);

    // 3. Selection / Hover Glow ring on ground
    if (isSelected || isHovered) {
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#60a5fa';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(x, y + halfH + 8, halfW + 24, 28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Stone Foundation Base
    const stoneH = 26;
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x - halfW, y + halfH - stoneH, width, stoneH);
    ctx.fillStyle = PALETTE.stoneBase;
    ctx.fillRect(x - halfW + 2, y + halfH - stoneH + 2, width - 4, stoneH - 4);

    // Stone brick lines
    ctx.fillStyle = PALETTE.stoneDark;
    for (let bx = -halfW + 20; bx < halfW; bx += 28) {
      ctx.fillRect(x + bx, y + halfH - stoneH + 2, 2, stoneH - 4);
    }
    ctx.fillRect(x - halfW + 2, y + halfH - stoneH / 2, width - 4, 2);

    // 5. Wooden Walls
    const wallH = 68;
    const wallTop = y + halfH - stoneH - wallH;

    let wallBaseCol = PALETTE.woodBase;
    let wallDarkCol = PALETTE.woodDark;
    let wallBeamCol = PALETTE.woodLight;

    if (theme === 'arcane') {
      wallBaseCol = '#312e81'; // Arcane indigo timber
      wallDarkCol = '#1e1b4b';
      wallBeamCol = '#4338ca';
    } else if (theme === 'citadel') {
      wallBaseCol = '#44403c'; // Stone masonry keep
      wallDarkCol = '#1c1917';
      wallBeamCol = '#78716c';
    }

    ctx.fillStyle = wallBaseCol;
    ctx.fillRect(x - halfW + 6, wallTop, width - 12, wallH);

    // Horizontal timber plank stripes
    ctx.fillStyle = wallDarkCol;
    for (let py = wallTop + 14; py < y + halfH - stoneH; py += 16) {
      ctx.fillRect(x - halfW + 6, py, width - 12, 2);
    }

    // Vertical structural corner timber posts
    ctx.fillStyle = wallBeamCol;
    ctx.fillRect(x - halfW + 6, wallTop, 10, wallH);
    ctx.fillRect(x + halfW - 16, wallTop, 10, wallH);
    ctx.fillStyle = wallDarkCol;
    ctx.fillRect(x - halfW + 6, wallTop, 2, wallH);
    ctx.fillRect(x + halfW - 8, wallTop, 2, wallH);

    // 6. Solid Oak Door
    const doorW = 30;
    const doorH = 46;
    const doorX = x - doorW / 2;
    const doorY = y + halfH - stoneH - 4;

    // Door frame
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(doorX - 3, doorY - 4, doorW + 6, doorH + 6);

    // Door planks
    ctx.fillStyle = PALETTE.woodHighlight;
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = PALETTE.woodBase;
    ctx.fillRect(doorX + 10, doorY, 2, doorH);
    ctx.fillRect(doorX + 20, doorY, 2, doorH);

    // Iron strap hinges
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(doorX + 2, doorY + 8, 14, 4);
    ctx.fillRect(doorX + 2, doorY + 28, 14, 4);

    // Brass doorknob ring
    ctx.fillStyle = PALETTE.amberGold;
    ctx.fillRect(doorX + doorW - 7, doorY + 22, 4, 5);

    // 7. Leaded Glass Windows (Left & Right of Door)
    const windowFlicker = Math.sin(this.animTime * 8 + x) * 0.15 + 0.85;
    const winGlowCol = active
      ? (theme === 'arcane' ? 'rgba(56, 189, 248, 0.9)' : 'rgba(251, 191, 36, 0.9)')
      : 'rgba(245, 158, 11, 0.5)';

    const windows = [
      { wx: x - halfW + 24, wy: wallTop + 18 },
      { wx: x + halfW - 46, wy: wallTop + 18 },
    ];

    windows.forEach(win => {
      // Outer frame
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(win.wx - 2, win.wy - 2, 26, 26);

      // Warm glowing pane
      ctx.fillStyle = winGlowCol;
      ctx.fillRect(win.wx, win.wy, 22, 22);

      // Window panes cross grid
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(win.wx + 10, win.wy, 2, 22);
      ctx.fillRect(win.wx, win.wy + 10, 22, 2);

      // Subtle warm light halo spill
      if (active) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
        ctx.fillRect(win.wx - 6, win.wy + 22, 34, 14);
      }
    });

    // 8. Stone Chimney (behind roof)
    const chimX = hut.chimneyX;
    const chimY = hut.chimneyY;
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(chimX - 10, chimY, 20, 48);
    ctx.fillStyle = PALETTE.stoneBase;
    ctx.fillRect(chimX - 8, chimY + 2, 16, 44);
    // Chimney cap
    ctx.fillStyle = PALETTE.stoneHighlight;
    ctx.fillRect(chimX - 12, chimY - 4, 24, 6);

    // 9. Thatched / Shingled Roof
    let roofDark = '#78350f';
    let roofBase = '#b45309';
    let roofLight = '#d97706';
    let roofTrim = '#fef08a';

    if (theme === 'arcane') {
      roofDark = '#1e1b4b';
      roofBase = '#3730a3';
      roofLight = '#4f46e5';
      roofTrim = '#818cf8';
    } else if (theme === 'apothecary') {
      roofDark = '#14532d';
      roofBase = '#15803d';
      roofLight = '#16a34a';
      roofTrim = '#86efac';
    } else if (theme === 'citadel') {
      roofDark = '#450a0a';
      roofBase = '#991b1b';
      roofLight = '#dc2626';
      roofTrim = '#fca5a5';
    }

    const roofOverhang = 16;
    const roofApexY = wallTop - 42;
    const roofBaseY = wallTop + 6;

    // Roof shadow underside
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x, roofApexY);
    ctx.lineTo(x + halfW + roofOverhang + 2, roofBaseY + 4);
    ctx.lineTo(x - halfW - roofOverhang - 2, roofBaseY + 4);
    ctx.closePath();
    ctx.fill();

    // Main roof triangle
    ctx.fillStyle = roofBase;
    ctx.beginPath();
    ctx.moveTo(x, roofApexY);
    ctx.lineTo(x + halfW + roofOverhang, roofBaseY);
    ctx.lineTo(x - halfW - roofOverhang, roofBaseY);
    ctx.closePath();
    ctx.fill();

    // Shingle layers / thatch ridges
    ctx.fillStyle = roofDark;
    for (let sIdx = 1; sIdx <= 4; sIdx++) {
      const sy = roofApexY + sIdx * 9;
      const progress = sIdx / 5;
      const curW = (halfW + roofOverhang) * progress;
      ctx.fillRect(x - curW, sy, curW * 2, 2);
    }

    // Roof ridge highlight
    ctx.fillStyle = roofLight;
    ctx.beginPath();
    ctx.moveTo(x, roofApexY);
    ctx.lineTo(x, roofApexY + 4);
    ctx.lineTo(x - halfW - roofOverhang, roofBaseY);
    ctx.lineTo(x - halfW - roofOverhang + 4, roofBaseY);
    ctx.closePath();
    ctx.fill();

    // Wooden eave fascia trim
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - halfW - roofOverhang, roofBaseY);
    ctx.lineTo(x, roofApexY);
    ctx.lineTo(x + halfW + roofOverhang, roofBaseY);
    ctx.stroke();

    // Roof crest pinnacle ornament
    ctx.fillStyle = PALETTE.brightGold;
    ctx.fillRect(x - 3, roofApexY - 8, 6, 8);
    ctx.fillRect(x - 5, roofApexY - 6, 10, 3);

    // 10. Hanging Wooden Signpost beside door
    const signX = x - halfW - 24;
    const signY = y + 10;

    // Signpost wooden arm
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(signX + 16, signY - 14, 16, 4);
    ctx.fillRect(signX + 18, signY - 10, 2, 6); // chain
    ctx.fillRect(signX + 28, signY - 10, 2, 6); // chain

    // Sign board
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(signX, signY - 4, 38, 22);
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(signX, signY - 4, 38, 22);

    // Sign emblem icon
    ctx.fillStyle = theme === 'forge' ? PALETTE.torchOrange : (theme === 'arcane' ? PALETTE.manaCyan : PALETTE.potionGreen);
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const emblem = theme === 'forge' ? '⚒' : (theme === 'arcane' ? '★' : '⚗');
    ctx.fillText(emblem, signX + 19, signY + 7);

    // 11. Overhead Floating Name Banner & Status Pill
    this.drawOverheadInfo(ctx, hut, isSelected, isHovered);

    ctx.restore();
  }

  drawOverheadInfo(ctx, hut, isSelected, isHovered) {
    const { x, y, width, name, active, activeAgentsCount } = hut;
    const bannerY = y - hut.height / 2 - 40;

    // Banner Pill
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Measure name width
    ctx.font = '9px "Press Start 2P", monospace';
    const textW = Math.max(110, ctx.measureText(name).width + 24);
    const textH = 22;

    // Pill background
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x - textW / 2, bannerY - textH / 2, textW, textH);

    // Pill border
    ctx.strokeStyle = active ? '#10b981' : (isSelected ? '#f59e0b' : '#78716c');
    ctx.lineWidth = 2;
    ctx.strokeRect(x - textW / 2, bannerY - textH / 2, textW, textH);

    // Status beacon dot
    const dotX = x - textW / 2 + 10;
    const dotY = bannerY;
    if (active) {
      const pulse = Math.sin(this.animTime * 6) * 1.5;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4 + pulse, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Name text
    ctx.fillStyle = active ? '#fef3c7' : '#d6d3d1';
    ctx.fillText(name, x + 6, bannerY);

    // Active subagents badge
    if (activeAgentsCount > 0) {
      const badgeY = bannerY - 16;
      ctx.font = '8px "Press Start 2P", monospace';
      const badgeText = `⚡ ${activeAgentsCount} ACTIVE`;
      const bw = ctx.measureText(badgeText).width + 12;

      ctx.fillStyle = '#064e3b';
      ctx.fillRect(x - bw / 2, badgeY - 8, bw, 16);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - bw / 2, badgeY - 8, bw, 16);

      ctx.fillStyle = '#6ee7b7';
      ctx.fillText(badgeText, x, badgeY);
    }

    ctx.restore();
  }
}

export default HutRenderer;
