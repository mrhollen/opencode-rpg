// PlayerAvatar.js - Controllable Overseer Avatar with WASD, Arrow keys, click-to-move, walk animation, and proximity inspection prompts

import { PALETTE } from './Constants.js';

export class PlayerAvatar {
  constructor(startX = 1024, startY = 1050) {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.speed = 175; // px / sec

    this.facing = 'down'; // 'down', 'up', 'left', 'right'
    this.isMoving = false;
    this.animTime = 0;
    this.walkFrame = 0; // 0, 1, 2, 3

    // Click to move target
    this.moveTarget = null; // { x, y }

    // Proximity interaction
    this.interactionRadius = 90;
    this.nearbyHut = null;
    this.nearbyAgent = null;
    this.nearbyStation = null;

    // Dimensions
    this.width = 30;
    this.height = 36;
  }

  moveTo(targetX, targetY) {
    this.moveTarget = { x: targetX, y: targetY };
  }

  clearMoveTarget() {
    this.moveTarget = null;
  }

  teleportTo(targetX, targetY) {
    this.x = targetX;
    this.y = targetY;
    this.vx = 0;
    this.vy = 0;
    this.moveTarget = null;
  }

  update(dt, inputKeys = {}, tileMap = null, huts = [], agents = [], stations = []) {
    this.animTime += dt;

    let moveX = 0;
    let moveY = 0;

    // 1. Keyboard Input (WASD / Arrows)
    if (inputKeys['KeyW'] || inputKeys['ArrowUp']) moveY -= 1;
    if (inputKeys['KeyS'] || inputKeys['ArrowDown']) moveY += 1;
    if (inputKeys['KeyA'] || inputKeys['ArrowLeft']) moveX -= 1;
    if (inputKeys['KeyD'] || inputKeys['ArrowRight']) moveX += 1;

    // If keyboard input active, override click-to-move
    if (moveX !== 0 || moveY !== 0) {
      this.moveTarget = null;
    } else if (this.moveTarget) {
      // 2. Click-to-Move Vector
      const dx = this.moveTarget.x - this.x;
      const dy = this.moveTarget.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        moveX = dx / dist;
        moveY = dy / dist;
      } else {
        // Reached target
        this.moveTarget = null;
      }
    }

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      moveX /= len;
      moveY /= len;
    }

    this.isMoving = moveX !== 0 || moveY !== 0;

    // Determine Facing Direction
    if (Math.abs(moveX) > Math.abs(moveY)) {
      this.facing = moveX > 0 ? 'right' : 'left';
    } else if (moveY !== 0) {
      this.facing = moveY > 0 ? 'down' : 'up';
    }

    // Update walk animation frame
    if (this.isMoving) {
      this.walkFrame = Math.floor(this.animTime * 8) % 4; // 0, 1, 2, 3
    } else {
      this.walkFrame = 0;
    }

    // Velocity & Movement
    const targetVx = moveX * this.speed;
    const targetVy = moveY * this.speed;

    // Responsive physics lerp
    this.vx += (targetVx - this.vx) * 0.25;
    this.vy += (targetVy - this.vy) * 0.25;

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    // Collision detection with tileMap (sliding along walls)
    if (tileMap) {
      // Try full move
      if (tileMap.isWalkable(nextX, nextY)) {
        this.x = nextX;
        this.y = nextY;
      } else {
        // Try X-only slide
        if (tileMap.isWalkable(nextX, this.y)) {
          this.x = nextX;
        }
        // Try Y-only slide
        if (tileMap.isWalkable(this.x, nextY)) {
          this.y = nextY;
        }
      }
    } else {
      this.x = nextX;
      this.y = nextY;
    }

    // Proximity Detection
    this.checkProximity(huts, agents, stations);
  }

  checkProximity(huts, agents, stations) {
    this.nearbyHut = null;
    this.nearbyAgent = null;
    this.nearbyStation = null;

    let closestDist = this.interactionRadius;

    // Check closest agent
    agents.forEach(agent => {
      const dist = Math.hypot(agent.x - this.x, agent.y - this.y);
      if (dist < closestDist) {
        closestDist = dist;
        this.nearbyAgent = agent;
      }
    });

    // Check closest station
    stations.forEach(station => {
      const dist = Math.hypot(station.x - this.x, station.y - this.y);
      if (dist < closestDist) {
        closestDist = dist;
        this.nearbyStation = station;
        this.nearbyAgent = null; // Prioritize closer entity
      }
    });

    // Check closest hut entrance
    huts.forEach(hut => {
      const dist = Math.hypot(hut.doorX - this.x, hut.doorY - this.y);
      if (dist < closestDist) {
        closestDist = dist;
        this.nearbyHut = hut;
        this.nearbyAgent = null;
        this.nearbyStation = null;
      }
    });
  }

  render(ctx) {
    ctx.save();

    // 1. Click-to-move target beacon on ground
    if (this.moveTarget) {
      this.drawMoveTarget(ctx);
    }

    // 2. Interaction radius soft ring
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 14, this.interactionRadius, this.interactionRadius * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Ground shadow
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 14, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Character Sprite
    ctx.save();
    const bob = this.isMoving ? (this.walkFrame % 2 === 1 ? -1 : 0) : Math.sin(this.animTime * 3) > 0 ? 1 : 0;
    ctx.translate(Math.floor(this.x), Math.floor(this.y + bob));

    this.drawOverseer(ctx);
    ctx.restore();

    // 5. Overhead Proximity Inspection Prompt
    this.drawProximityPrompt(ctx);

    ctx.restore();
  }

  drawMoveTarget(ctx) {
    ctx.save();
    const { x, y } = this.moveTarget;
    const pulse = Math.sin(this.animTime * 8) * 3;

    // Glowing ground rings
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + pulse, 5 + pulse * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Mini target flag
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 1, y - 16, 2, 16);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 16);
    ctx.lineTo(x + 12, y - 12);
    ctx.lineTo(x + 1, y - 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawOverseer(ctx) {
    // Royal Cape flowing behind
    ctx.fillStyle = '#b91c1c'; // Crimson cape
    if (this.facing === 'up') {
      ctx.fillRect(-7, -4, 14, 14);
    } else {
      ctx.fillRect(-6, -2, 12, 12);
    }

    // Legs / Boots walking animation
    ctx.fillStyle = '#1c1917'; // Dark leather boots
    if (this.isMoving) {
      if (this.walkFrame === 1) {
        ctx.fillRect(-5, 9, 4, 6); // Left foot forward
        ctx.fillRect(1, 7, 4, 4);
      } else if (this.walkFrame === 3) {
        ctx.fillRect(-5, 7, 4, 4);
        ctx.fillRect(1, 9, 4, 6); // Right foot forward
      } else {
        ctx.fillRect(-5, 8, 4, 5);
        ctx.fillRect(1, 8, 4, 5);
      }
    } else {
      ctx.fillRect(-5, 8, 4, 5);
      ctx.fillRect(1, 8, 4, 5);
    }

    // Tunic (Royal Blue with Gold trim)
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-7, -4, 14, 13);
    ctx.fillStyle = '#fbbf24'; // Golden belt buckle
    ctx.fillRect(-3, 3, 6, 2);

    // Golden Pauldrons (Shoulders)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-9, -4, 3, 5);
    ctx.fillRect(6, -4, 3, 5);

    // Head / Face
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-5, -12, 10, 8);

    // Eyes depending on facing
    ctx.fillStyle = '#0f172a';
    if (this.facing === 'down') {
      ctx.fillRect(-3, -9, 2, 2);
      ctx.fillRect(1, -9, 2, 2);
    } else if (this.facing === 'left') {
      ctx.fillRect(-4, -9, 2, 2);
    } else if (this.facing === 'right') {
      ctx.fillRect(2, -9, 2, 2);
    } // If 'up', back of head

    // Cavalier Hat with Gold Crest & Feather
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-8, -14, 16, 3); // Brim
    ctx.fillRect(-6, -18, 12, 5); // Crown
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-6, -15, 12, 2); // Hatband

    // White Feather quill on hat
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, -20, 2, 6);
    ctx.fillRect(6, -21, 2, 3);

    // Brass Lantern held in hand
    const lanternX = this.facing === 'left' ? -10 : 8;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(lanternX, 0, 4, 2); // hand
    ctx.fillStyle = '#451a03';
    ctx.fillRect(lanternX, 2, 4, 6); // lantern cage
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(lanternX + 1, 3, 2, 4); // glowing glass
  }

  drawProximityPrompt(ctx) {
    let promptText = '';
    let targetName = '';

    if (this.nearbyHut) {
      promptText = '[SPACE / CLICK]';
      targetName = `Inspect Hut: ${this.nearbyHut.name}`;
    } else if (this.nearbyAgent) {
      promptText = '[SPACE / CLICK]';
      targetName = `Talk to: ${this.nearbyAgent.name}`;
    } else if (this.nearbyStation) {
      promptText = '[SPACE / CLICK]';
      targetName = `Inspect: ${this.nearbyStation.name}`;
    }

    if (!promptText) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const boxY = this.y - 34;
    ctx.font = '7px "Press Start 2P", monospace';
    const subW = ctx.measureText(targetName).width;
    const boxW = Math.max(130, subW + 20);
    const boxH = 22;

    // Glowing frame
    ctx.fillStyle = 'rgba(28, 25, 23, 0.95)';
    ctx.fillRect(this.x - boxW / 2, boxY - boxH / 2, boxW, boxH);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.x - boxW / 2, boxY - boxH / 2, boxW, boxH);

    // Action Key badge
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(promptText, this.x, boxY - 4);

    // Target Name
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(targetName, this.x, boxY + 5);

    ctx.restore();
  }
}

export default PlayerAvatar;
