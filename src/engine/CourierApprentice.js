// CourierApprentice.js - Animated Courier Apprentice wandering between Town Plaza and Huts carrying a glowing scroll

import { PALETTE } from './Constants.js';

export class CourierApprentice {
  constructor(startX = 1024, startY = 1060) {
    this.x = startX;
    this.y = startY;
    this.homeX = startX;
    this.homeY = startY;

    this.targetX = startX;
    this.targetY = startY;
    this.targetHut = null;
    this.targetHutIndex = 0;

    this.speed = 90; // px / sec
    this.facing = 'down'; // 'down', 'up', 'left', 'right'
    this.state = 'collecting'; // 'collecting', 'walking_to_hut', 'delivering', 'walking_to_plaza'
    this.stateTimer = 2.0;

    this.animTime = 0;
    this.walkFrame = 0;
    this.isMoving = false;

    this.name = 'Pip the Swift';
    this.speech = 'Collecting new quest scrolls... 📜';
    this.speechTimer = 3.0;

    this.width = 28;
    this.height = 34;
  }

  update(dt, huts = [], tileMap = null, particleSystem = null) {
    this.animTime += dt;
    this.speechTimer -= dt;

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
    }

    switch (this.state) {
      case 'collecting': {
        this.isMoving = false;
        this.facing = 'up';
        this.speech = 'Collecting dispatch scrolls... 📜';

        if (this.stateTimer <= 0) {
          // Find next hut to deliver to
          if (huts && huts.length > 0) {
            this.targetHutIndex = (this.targetHutIndex + 1) % huts.length;
            this.targetHut = huts[this.targetHutIndex];
            this.targetX = this.targetHut.doorX;
            this.targetY = this.targetHut.doorY + 18;
            this.state = 'walking_to_hut';
            this.speech = `Express delivery for ${this.targetHut.name}! 🏃`;
            this.speechTimer = 3.5;
          } else {
            this.stateTimer = 3.0;
          }
        }
        break;
      }

      case 'walking_to_hut': {
        this.isMoving = true;
        const reached = this.moveTowards(this.targetX, this.targetY, dt, tileMap);

        // Emit golden trail sparkles while running
        if (particleSystem && Math.random() < 0.18) {
          particleSystem.emitCoinSparkle(this.x, this.y - 6);
        }

        if (reached) {
          this.state = 'delivering';
          this.stateTimer = 2.4;
          this.isMoving = false;
          this.facing = 'up';
          this.speech = `Scroll delivered to ${this.targetHut ? this.targetHut.name : 'Workshop'}! ✨`;
          this.speechTimer = 2.5;

          if (particleSystem) {
            particleSystem.emitCoinSparkle(this.x, this.y - 12);
            particleSystem.emitCoinSparkle(this.x + 8, this.y - 12);
          }
        }
        break;
      }

      case 'delivering': {
        this.isMoving = false;
        this.facing = 'up';

        // Delivery sparkle celebration
        if (particleSystem && Math.random() < 0.25) {
          particleSystem.emitCoinSparkle(this.x + (Math.random() * 12 - 6), this.y - 14);
        }

        if (this.stateTimer <= 0) {
          this.targetX = this.homeX + (Math.random() * 20 - 10);
          this.targetY = this.homeY + (Math.random() * 20 - 10);
          this.state = 'walking_to_plaza';
          this.speech = 'Returning to Town Square Notice Board 🏰';
          this.speechTimer = 3.0;
        }
        break;
      }

      case 'walking_to_plaza': {
        this.isMoving = true;
        const reached = this.moveTowards(this.targetX, this.targetY, dt, tileMap);

        if (reached) {
          this.state = 'collecting';
          this.stateTimer = 2.8;
          this.isMoving = false;
          this.facing = 'up';
          this.speech = 'Checking quest bounty board... 📜';
          this.speechTimer = 2.8;
        }
        break;
      }
    }

    // Walking animation frame
    if (this.isMoving) {
      this.walkFrame = Math.floor(this.animTime * 9) % 4;
    } else {
      this.walkFrame = 0;
    }
  }

  moveTowards(tx, ty, dt, tileMap = null) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      this.x = tx;
      this.y = ty;
      return true;
    }

    const step = this.speed * dt;
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;

    // Determine facing
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }

    this.x = nx;
    this.y = ny;
    return false;
  }

  render(ctx, isSelected = false, isHovered = false) {
    ctx.save();

    // 1. Ground Shadow
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 12, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Selection / Hover Ring
    if (isSelected || isHovered) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 12, 13, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Character Body
    ctx.save();
    const bob = this.isMoving ? (this.walkFrame % 2 === 1 ? -1 : 0) : 0;
    ctx.translate(Math.floor(this.x), Math.floor(this.y + bob));

    this.drawCourierSprite(ctx);
    ctx.restore();

    // 4. Overhead Badge & Speech Bubble
    this.drawOverheadUI(ctx);

    ctx.restore();
  }

  drawCourierSprite(ctx) {
    // Brown Leather Satchel swinging at side
    ctx.fillStyle = '#78350f';
    const satchelX = this.facing === 'left' ? 4 : -8;
    ctx.fillRect(satchelX, 0, 5, 6);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(satchelX + 2, 2, 2, 2); // buckle

    // Boots / Walking Legs
    ctx.fillStyle = '#451a03';
    if (this.isMoving) {
      if (this.walkFrame === 1) {
        ctx.fillRect(-4, 7, 3, 5);
        ctx.fillRect(1, 5, 3, 4);
      } else if (this.walkFrame === 3) {
        ctx.fillRect(-4, 5, 3, 4);
        ctx.fillRect(1, 7, 3, 5);
      } else {
        ctx.fillRect(-4, 6, 3, 5);
        ctx.fillRect(1, 6, 3, 5);
      }
    } else {
      ctx.fillRect(-4, 6, 3, 5);
      ctx.fillRect(1, 6, 3, 5);
    }

    // Courier Tunic (Teal / Forest Green)
    ctx.fillStyle = '#0f766e';
    ctx.fillRect(-6, -4, 12, 11);
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(-4, -2, 8, 9);

    // Leather belt & diagonal satchel strap
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-5, 2, 10, 2);
    ctx.beginPath();
    ctx.moveTo(-5, -4);
    ctx.lineTo(satchelX + 2, 0);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Head / Face
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-4, -11, 8, 7);

    // Eyes based on facing
    ctx.fillStyle = '#0f172a';
    if (this.facing === 'down') {
      ctx.fillRect(-3, -8, 2, 2);
      ctx.fillRect(1, -8, 2, 2);
    } else if (this.facing === 'left') {
      ctx.fillRect(-3, -8, 2, 2);
    } else if (this.facing === 'right') {
      ctx.fillRect(1, -8, 2, 2);
    }

    // Messenger Cap with Feather
    ctx.fillStyle = '#042f2e';
    ctx.fillRect(-6, -14, 12, 4);
    ctx.fillRect(-4, -16, 8, 3);
    // Yellow Feather plume
    ctx.fillStyle = '#fde047';
    ctx.fillRect(2, -18, 2, 4);
    ctx.fillRect(3, -19, 2, 2);

    // Glowing Golden Parchment Scroll held in hand
    const scrollX = this.facing === 'left' ? -10 : 6;
    const scrollY = -2;

    // Glowing aura around scroll
    const glowPulse = Math.sin(this.animTime * 8) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(253, 224, 71, ${0.4 * glowPulse})`;
    ctx.fillRect(scrollX - 2, scrollY - 2, 8, 10);

    // Unfurled Parchment
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(scrollX, scrollY, 5, 7);
    ctx.fillStyle = '#b45309'; // Scroll wood handles
    ctx.fillRect(scrollX - 1, scrollY - 1, 7, 1);
    ctx.fillRect(scrollX - 1, scrollY + 7, 7, 1);

    // Red wax seal on scroll
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(scrollX + 1, scrollY + 2, 3, 3);
  }

  drawOverheadUI(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Courier Tag
    const tagY = this.y - 28;
    const tagText = '🏃 Courier Pip';
    ctx.font = '7px "Press Start 2P", monospace';
    const tagW = ctx.measureText(tagText).width + 12;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(this.x - tagW / 2, tagY - 6, tagW, 12);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - tagW / 2, tagY - 6, tagW, 12);

    ctx.fillStyle = '#fef08a';
    ctx.fillText(tagText, this.x, tagY);

    // 2. Active Speech Bubble
    if (this.speech && this.speechTimer > 0) {
      const bubbleY = tagY - 14;
      const text = this.speech;
      const bw = ctx.measureText(text).width + 14;
      const bh = 16;
      const bx = this.x - bw / 2;
      const by = bubbleY - bh;

      // Bubble background
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Tail
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.moveTo(this.x - 4, by + bh);
      ctx.lineTo(this.x + 4, by + bh);
      ctx.lineTo(this.x, by + bh + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(this.x - 4, by + bh);
      ctx.lineTo(this.x, by + bh + 4);
      ctx.lineTo(this.x + 4, by + bh);
      ctx.stroke();

      ctx.fillStyle = '#1c1917';
      ctx.fillText(text, this.x, by + bh / 2);
    }

    ctx.restore();
  }

  containsPoint(worldX, worldY) {
    const left = this.x - this.width / 2;
    const right = this.x + this.width / 2;
    const top = this.y - this.height / 2 - 10;
    const bottom = this.y + this.height / 2 + 10;
    return worldX >= left && worldX <= right && worldY >= top && worldY <= bottom;
  }
}

export default CourierApprentice;
