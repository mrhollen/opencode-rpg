// AgentSprite.js - Retro 16-bit / 32-bit pixel art agent characters with animations and overhead speech bubbles

import { AGENT_ROLES, AGENT_STATUSES, PALETTE } from './Constants.js';

export class AgentSprite {
  constructor(config = {}) {
    this.id = config.id || `agent-${Math.random().toString(36).substring(2, 7)}`;
    this.name = config.name || 'Grand Mage';
    this.role = config.role || AGENT_ROLES.MASTER;
    this.status = config.status || AGENT_STATUSES.IDLE;
    this.hutId = config.hutId || null;
    this.stationId = config.stationId || null;

    this.x = config.x || 0;
    this.y = config.y || 0;
    this.facing = config.facing || 'down'; // 'down', 'up', 'left', 'right'

    // Activity & Reasoning for speech bubbles
    this.currentTask = config.currentTask || (this.status === 'working' ? 'Processing AST & synthesizing...' : '');
    this.reasoning = config.reasoning || '';
    this.speechTimer = config.speechTimer || 0;

    // Animation state
    this.animTime = Math.random() * 5; // offset
    this.frame = 0;
    this.workCycle = 0; // 0 to 1 for work swing/cast

    // Dimensions
    this.width = 32;
    this.height = 36;
  }

  update(dt) {
    this.animTime += dt;
    this.speechTimer += dt;

    if (this.status === AGENT_STATUSES.WORKING) {
      // Work cycle repeats every 1.2 seconds
      this.workCycle = (this.animTime % 1.2) / 1.2;
    } else {
      this.workCycle = 0;
    }
  }

  render(ctx, isSelected = false, isHovered = false) {
    ctx.save();

    // 1. Ground shadow beneath character
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 14, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Selection indicator ring
    if (isSelected || isHovered) {
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 14, 15, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Character Pixel Sprite based on Role
    ctx.save();
    // Idle breathing bob (1-2 pixels)
    const bob = Math.sin(this.animTime * 4) > 0 ? 1 : 0;
    ctx.translate(Math.floor(this.x), Math.floor(this.y + bob));

    switch (this.role) {
      case AGENT_ROLES.MASTER:
        this.drawMasterWizard(ctx);
        break;
      case AGENT_ROLES.BUILD:
        this.drawDwarfBlacksmith(ctx);
        break;
      case AGENT_ROLES.EXPLORE:
        this.drawElfScholar(ctx);
        break;
      case AGENT_ROLES.REVIEW:
        this.drawAlchemistMage(ctx);
        break;
      case AGENT_ROLES.TASK:
      default:
        this.drawApprenticeRogue(ctx);
        break;
    }
    ctx.restore();

    // 4. Overhead Badges & Speech Bubble
    this.drawOverheadUI(ctx, isSelected);

    ctx.restore();
  }

  // --- Character Rendering Methods ---

  // Grand Mage (Master Agent)
  drawMasterWizard(ctx) {
    const isWorking = this.status === AGENT_STATUSES.WORKING;

    // Robes (Sapphire / Royal Purple)
    ctx.fillStyle = '#312e81';
    ctx.fillRect(-8, -4, 16, 16);
    // Robe hem gold trim
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-8, 10, 16, 2);

    // Belt
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-7, 2, 14, 2);

    // Head / Face
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(-5, -12, 10, 8);

    // Wizard Beard (Long white flowing beard)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-6, -6, 12, 8);
    ctx.fillRect(-4, 2, 8, 4);

    // Wizard Eyes
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(-3, -10, 2, 2);
    ctx.fillRect(1, -10, 2, 2);

    // Pointed Wizard Hat
    ctx.fillStyle = '#1e1b4b';
    // Brim
    ctx.fillRect(-10, -13, 20, 3);
    // Cone
    ctx.fillRect(-6, -18, 12, 5);
    ctx.fillRect(-4, -23, 8, 5);
    ctx.fillRect(-2, -26, 4, 3);
    // Gold Hatband
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-6, -14, 12, 2);

    // Wizard Staff in Hand
    const staffX = 9;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(staffX, -22, 2, 34);

    // Staff Mana Crystal Orb
    const crystalGlow = isWorking ? Math.sin(this.animTime * 12) * 2 + 5 : 4;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(staffX - 2, -26, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(staffX - 1, -25, 2, 2);

    // Working magic rings
    if (isWorking) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      const r = (this.workCycle * 20) % 20;
      ctx.beginPath();
      ctx.arc(0, 12, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Dwarf Blacksmith (Build Agent)
  drawDwarfBlacksmith(ctx) {
    const isWorking = this.status === AGENT_STATUSES.WORKING;

    // Muscular Dwarf Body
    ctx.fillStyle = '#78350f'; // Leather tunic
    ctx.fillRect(-8, -2, 16, 14);

    // Heavy Blacksmith Apron
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-6, 0, 12, 12);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-6, 0, 12, 2); // Strap

    // Head / Face
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-6, -10, 12, 8);

    // Eyes
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-4, -8, 2, 2);
    ctx.fillRect(2, -8, 2, 2);

    // Dwarf Braided Ginger Beard
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-7, -5, 14, 8);
    ctx.fillRect(-5, 3, 10, 5);
    ctx.fillRect(-3, 8, 6, 3); // Braid tip

    // Iron Headband / Helmet
    ctx.fillStyle = '#57534e';
    ctx.fillRect(-7, -12, 14, 4);
    ctx.fillStyle = '#d6d3d1';
    ctx.fillRect(-5, -12, 10, 1);

    // Blacksmith Hammer & Swing Animation
    ctx.save();
    let hammerAngle = 0;
    if (isWorking) {
      // Swing overhead and strike down
      hammerAngle = this.workCycle < 0.6 ? -1.2 + this.workCycle * 2.5 : 0.3 - (this.workCycle - 0.6) * 3;
    }

    ctx.translate(8, 2);
    ctx.rotate(hammerAngle);

    // Handle
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, -14, 3, 16);

    // Iron Hammer Head
    ctx.fillStyle = '#44403c';
    ctx.fillRect(-3, -18, 9, 6);
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(-3, -18, 9, 2);

    ctx.restore();
  }

  // Elf Scholar (Explore Agent)
  drawElfScholar(ctx) {
    const isWorking = this.status === AGENT_STATUSES.WORKING;

    // Scholar Tunic (Emerald / Forest Green)
    ctx.fillStyle = '#065f46';
    ctx.fillRect(-7, -3, 14, 15);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(-5, -1, 10, 11);

    // Leather belt with scroll pouch
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6, 4, 12, 2);

    // Head / Face
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-5, -11, 10, 8);

    // Long Blonde Elf Hair
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-6, -13, 12, 4);
    ctx.fillRect(-7, -10, 3, 10);
    ctx.fillRect(4, -10, 3, 10);

    // Pointed Elf Ears
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-8, -9, 2, 4);
    ctx.fillRect(6, -9, 2, 4);

    // Intelligent Eyes / Spectacles
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3, -8, 2, 2);
    ctx.fillRect(1, -8, 2, 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.strokeRect(-4, -9, 3, 3);
    ctx.strokeRect(1, -9, 3, 3);

    // Grimoire / Scroll held in hands
    ctx.fillStyle = '#92400e'; // Book cover
    ctx.fillRect(-5, 4, 10, 8);
    ctx.fillStyle = isWorking ? '#38bdf8' : '#fef3c7'; // Glowing page if working
    ctx.fillRect(-4, 5, 8, 6);
  }

  // Alchemist Mage (Review / Tester Agent)
  drawAlchemistMage(ctx) {
    const isWorking = this.status === AGENT_STATUSES.WORKING;

    // Violet Frock Coat
    ctx.fillStyle = '#581c87';
    ctx.fillRect(-7, -3, 14, 15);
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(-5, -1, 10, 11);

    // Potion bandolier sash
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6, -2, 12, 3);
    // Tiny colored vials on sash
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -2, 2, 3);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, -2, 2, 3);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(4, -2, 2, 3);

    // Head / Face
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(-5, -11, 10, 8);

    // Wild Purple Hair
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-6, -13, 12, 4);
    ctx.fillRect(-7, -10, 2, 6);
    ctx.fillRect(5, -10, 2, 6);

    // Brass Alchemist Goggles on forehead
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-6, -13, 12, 3);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-4, -13, 3, 2);
    ctx.fillRect(1, -13, 3, 2);

    // Eyes
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(-3, -8, 2, 2);
    ctx.fillRect(1, -8, 2, 2);

    // Potion Flask held out
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(6, 0, 4, 2); // Flask neck
    ctx.fillStyle = isWorking ? '#22c55e' : '#a855f7'; // Bubbling green potion
    ctx.fillRect(5, 2, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 3, 2, 2);
  }

  // Apprentice Rogue (Task / Dispatcher Agent)
  drawApprenticeRogue(ctx) {
    // Dark Rogue Tunic & Hood
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-6, -3, 12, 14);

    // Head / Face inside cowl
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-4, -9, 8, 6);

    // Dark Hood
    ctx.fillStyle = '#111827';
    ctx.fillRect(-6, -13, 12, 5);
    ctx.fillRect(-6, -8, 2, 6);
    ctx.fillRect(4, -8, 2, 6);

    // Alert Eyes
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-3, -7, 2, 2);
    ctx.fillRect(1, -7, 2, 2);

    // Feather Quill & Scroll
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(4, 2, 6, 7); // Scroll
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(7, -3, 2, 6); // Red feather quill
  }

  // --- Overhead UI: Name Tag, Status Badge & Speech Bubble ---
  drawOverheadUI(ctx, isSelected) {
    const isWorking = this.status === AGENT_STATUSES.WORKING;
    const isThinking = this.status === AGENT_STATUSES.THINKING;

    // 1. Status Pill Tag
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tagY = this.y - 30;
    const roleEmoji = this.getRoleIcon();
    const tagText = `${roleEmoji} ${this.name}`;

    ctx.font = '7px "Press Start 2P", monospace';
    const tagW = ctx.measureText(tagText).width + 12;

    // Pill box
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(this.x - tagW / 2, tagY - 6, tagW, 12);
    ctx.strokeStyle = isWorking ? '#10b981' : (isThinking ? '#f59e0b' : '#57534e');
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - tagW / 2, tagY - 6, tagW, 12);

    // Status dot
    const dotX = this.x - tagW / 2 + 5;
    ctx.fillStyle = isWorking ? '#10b981' : (isThinking ? '#f59e0b' : '#78716c');
    ctx.fillRect(dotX - 1, tagY - 1, 3, 3);

    // Text
    ctx.fillStyle = isWorking ? '#a7f3d0' : '#e2e8f0';
    ctx.fillText(tagText, this.x + 3, tagY);

    // 2. Speech Bubble if working or has active reasoning/task
    const speechContent = this.currentTask || this.reasoning;
    if ((isWorking || isThinking || isSelected) && speechContent) {
      this.drawSpeechBubble(ctx, speechContent, tagY - 14);
    }

    ctx.restore();
  }

  drawSpeechBubble(ctx, text, bottomY) {
    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';

    // Truncate text cleanly if too long
    const maxChars = 28;
    const displayText = text.length > maxChars ? text.substring(0, maxChars - 3) + '...' : text;

    const textW = ctx.measureText(displayText).width + 14;
    const boxH = 16;
    const boxX = this.x - textW / 2;
    const boxY = bottomY - boxH - 4;

    // Bubble white/cream background
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(boxX, boxY, textW, boxH);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, textW, boxH);

    // Pointer tail pointing down towards agent
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.moveTo(this.x - 4, boxY + boxH);
    ctx.lineTo(this.x + 4, boxY + boxH);
    ctx.lineTo(this.x, boxY + boxH + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.beginPath();
    ctx.moveTo(this.x - 4, boxY + boxH);
    ctx.lineTo(this.x, boxY + boxH + 4);
    ctx.lineTo(this.x + 4, boxY + boxH);
    ctx.stroke();

    // Bubble text
    ctx.fillStyle = '#1c1917';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, this.x, boxY + boxH / 2);

    ctx.restore();
  }

  getRoleIcon() {
    switch (this.role) {
      case AGENT_ROLES.MASTER:
        return '🧙';
      case AGENT_ROLES.BUILD:
        return '⚒️';
      case AGENT_ROLES.EXPLORE:
        return '📜';
      case AGENT_ROLES.REVIEW:
        return '⚗️';
      case AGENT_ROLES.TASK:
      default:
        return '🗡️';
    }
  }

  containsPoint(worldX, worldY) {
    const left = this.x - this.width / 2;
    const right = this.x + this.width / 2;
    const top = this.y - this.height / 2 - 10;
    const bottom = this.y + this.height / 2 + 10;
    return worldX >= left && worldX <= right && worldY >= top && worldY <= bottom;
  }
}

export default AgentSprite;
