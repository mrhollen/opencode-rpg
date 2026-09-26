// StationRenderer.js - Workstations around huts (Forge, Library, Alchemy, Notice Board, Treasury)

import { STATION_TYPES, PALETTE } from './Constants.js';

export class StationRenderer {
  constructor() {
    this.stations = [];
    this.animTime = 0;
    this.sparkTimer = 0;
    this.bubbleTimer = 0;
    this.runeTimer = 0;
    this.coinTimer = 0;
  }

  /**
   * Generates workstations for each hut.
   */
  generateStationsForHuts(huts = []) {
    this.stations = [];

    huts.forEach(hut => {
      const hx = hut.x;
      const hy = hut.y;

      // 1. Forge / Workbench (Build / Coder agent station)
      this.stations.push({
        id: `${hut.id}-forge`,
        hutId: hut.id,
        type: STATION_TYPES.FORGE,
        name: 'The Hephaestus Forge',
        roleTag: 'build',
        description: 'Code synthesis, compilation & artifact assembly',
        x: hx - 84,
        y: hy + 42,
        width: 44,
        height: 38,
        active: hut.active, // Active if hut has active build agent
        stat: '1,420 lines compiled',
      });

      // 2. Library / Arcane Study (Explore / Search agent station)
      this.stations.push({
        id: `${hut.id}-library`,
        hutId: hut.id,
        type: STATION_TYPES.LIBRARY,
        name: 'Arcane Scriptorium',
        roleTag: 'explore',
        description: 'Codebase indexing, semantic search & file ingestion',
        x: hx + 84,
        y: hy + 42,
        width: 44,
        height: 40,
        active: hut.active,
        stat: '84 files indexed',
      });

      // 3. Alchemist Table / Cauldron (Review / Test agent station)
      this.stations.push({
        id: `${hut.id}-alchemy`,
        hutId: hut.id,
        type: STATION_TYPES.ALCHEMY,
        name: 'Alchemical Crucible',
        roleTag: 'review',
        description: 'Automated test execution, linting & verification brews',
        x: hx - 110,
        y: hy - 14,
        width: 42,
        height: 38,
        active: hut.active,
        stat: '12 / 12 tests passed',
      });

      // 4. Guild Notice Board (Task / Todo station)
      this.stations.push({
        id: `${hut.id}-notice_board`,
        hutId: hut.id,
        type: STATION_TYPES.NOTICE_BOARD,
        name: 'Bounty Board',
        roleTag: 'task',
        description: 'Active session objectives, subtasks & orchestrator plan',
        x: hx + 104,
        y: hy - 14,
        width: 38,
        height: 42,
        active: true,
        stat: '4 pending quests',
      });

      // 5. Treasury Vault Chest (Cost & Token vault)
      this.stations.push({
        id: `${hut.id}-treasury`,
        hutId: hut.id,
        type: STATION_TYPES.TREASURY,
        name: 'Guild Token Vault',
        roleTag: 'tokens',
        description: 'LLM token consumption, inference cost & budget ledger',
        x: hx + 52,
        y: hy + 68,
        width: 34,
        height: 28,
        active: hut.active,
        stat: `${hut.tokens.toLocaleString()} Tokens ($0.04)`,
      });
    });

    return this.stations;
  }

  getStations() {
    return this.stations;
  }

  getStationAt(worldX, worldY) {
    for (let i = this.stations.length - 1; i >= 0; i--) {
      const s = this.stations[i];
      const left = s.x - s.width / 2;
      const right = s.x + s.width / 2;
      const top = s.y - s.height / 2;
      const bottom = s.y + s.height / 2;

      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return s;
      }
    }
    return null;
  }

  update(dt, particleSystem = null) {
    this.animTime += dt;
    this.sparkTimer += dt;
    this.bubbleTimer += dt;
    this.runeTimer += dt;
    this.coinTimer += dt;

    if (!particleSystem) return;

    // Forge sparks
    if (this.sparkTimer > 0.45) {
      this.sparkTimer = 0;
      this.stations.forEach(s => {
        if (s.type === STATION_TYPES.FORGE && s.active) {
          particleSystem.emitForgeSparks(s.x + 2, s.y - 6, 8);
        }
      });
    }

    // Alchemist bubbles
    if (this.bubbleTimer > 0.25) {
      this.bubbleTimer = 0;
      this.stations.forEach(s => {
        if (s.type === STATION_TYPES.ALCHEMY && s.active) {
          particleSystem.emitCauldronBubbles(s.x, s.y - 4, '#10b981');
        }
      });
    }

    // Arcane runes
    if (this.runeTimer > 0.6) {
      this.runeTimer = 0;
      this.stations.forEach(s => {
        if (s.type === STATION_TYPES.LIBRARY && s.active) {
          particleSystem.emitArcaneRune(s.x, s.y - 12, '#38bdf8');
        }
      });
    }

    // Treasury sparkles
    if (this.coinTimer > 0.8) {
      this.coinTimer = 0;
      this.stations.forEach(s => {
        if (s.type === STATION_TYPES.TREASURY && s.active) {
          particleSystem.emitCoinSparkle(s.x, s.y - 4);
        }
      });
    }
  }

  render(ctx, selectedStationId = null, hoveredStationId = null) {
    this.stations.forEach(station => {
      const isSelected = selectedStationId === station.id;
      const isHovered = hoveredStationId === station.id;

      ctx.save();
      // Ground shadow
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath();
      ctx.ellipse(station.x, station.y + station.height / 2 + 2, station.width / 2 + 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Distinct pulsating glow aura based on station type
      if (isSelected || isHovered) {
        const pulse = Math.sin(this.animTime * 6) * 2;
        let glowColor = '#fbbf24';
        let glowAccent = '#fde047';

        if (station.type === STATION_TYPES.FORGE) {
          glowColor = '#ea580c';
          glowAccent = '#f97316';
        } else if (station.type === STATION_TYPES.LIBRARY) {
          glowColor = '#0284c7';
          glowAccent = '#38bdf8';
        } else if (station.type === STATION_TYPES.ALCHEMY) {
          glowColor = '#059669';
          glowAccent = '#34d399';
        } else if (station.type === STATION_TYPES.NOTICE_BOARD) {
          glowColor = '#b45309';
          glowAccent = '#f59e0b';
        } else if (station.type === STATION_TYPES.TREASURY) {
          glowColor = '#d97706';
          glowAccent = '#fbbf24';
        }

        // Radial glow on ground
        ctx.fillStyle = `${glowColor}33`;
        ctx.beginPath();
        ctx.ellipse(
          station.x,
          station.y + station.height / 2 + 2,
          station.width / 2 + 10 + pulse,
          12 + pulse * 0.5,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Pulsing dashed border
        ctx.strokeStyle = glowAccent;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(
          station.x - station.width / 2 - 6 - pulse,
          station.y - station.height / 2 - 6 - pulse,
          station.width + 12 + pulse * 2,
          station.height + 12 + pulse * 2
        );
        ctx.setLineDash([]);
      }

      switch (station.type) {
        case STATION_TYPES.FORGE:
          this.drawForge(ctx, station);
          break;
        case STATION_TYPES.LIBRARY:
          this.drawLibrary(ctx, station);
          break;
        case STATION_TYPES.ALCHEMY:
          this.drawAlchemy(ctx, station);
          break;
        case STATION_TYPES.NOTICE_BOARD:
          this.drawNoticeBoard(ctx, station);
          break;
        case STATION_TYPES.TREASURY:
          this.drawTreasury(ctx, station);
          break;
      }

      // Overhead Mini Station Tag if hovered or selected
      if (isHovered || isSelected) {
        this.drawStationTooltip(ctx, station);
      }

      ctx.restore();
    });
  }

  // 1. Forge / Workbench
  drawForge(ctx, s) {
    const { x, y } = s;

    // Stone hearth on the left
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x - 18, y - 12, 16, 20);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(x - 16, y - 10, 12, 16);

    // Glowing coals in hearth
    const pulse = Math.sin(this.animTime * 10) * 0.2 + 0.8;
    ctx.fillStyle = PALETTE.torchOrange;
    ctx.fillRect(x - 14, y - 6, 8, 8);
    ctx.fillStyle = PALETTE.brightGold;
    ctx.fillRect(x - 12, y - 4, 4, 4);

    // Anvil stump (tree stump base)
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 2, y, 14, 12);
    ctx.fillStyle = PALETTE.woodHighlight;
    ctx.fillRect(x + 4, y, 10, 3);

    // Anvil body (iron gray)
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x, y - 8, 18, 8);
    // Horn of anvil
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x - 6, y - 6);
    ctx.lineTo(x, y - 4);
    ctx.fill();
    // Anvil face highlight
    ctx.fillStyle = '#78716c';
    ctx.fillRect(x, y - 8, 18, 2);

    // Red-hot metal bar resting on anvil
    if (s.active) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 4, y - 10, 8, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(x + 6, y - 10, 4, 1);
    }
  }

  // 2. Library / Arcane Study Desk
  drawLibrary(ctx, s) {
    const { x, y } = s;

    // Mahogany Bookshelf behind desk
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 16, y - 18, 32, 22);
    ctx.fillStyle = PALETTE.woodBase;
    ctx.fillRect(x - 14, y - 16, 28, 18);

    // Colorful book spines on shelf
    const bookColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = bookColors[i % bookColors.length];
      ctx.fillRect(x - 12 + i * 5, y - 14, 4, 14);
    }

    // Wooden writing desk in front
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 18, y + 2, 36, 12);
    ctx.fillStyle = PALETTE.woodHighlight;
    ctx.fillRect(x - 16, y + 2, 32, 3);

    // Open Grimoire on desk
    ctx.fillStyle = '#fef3c7'; // Open parchment pages
    ctx.fillRect(x - 8, y - 2, 16, 8);
    ctx.fillStyle = '#78350f'; // Book spine / cover
    ctx.fillRect(x - 1, y - 2, 2, 8);

    // Glowing arcane text in book
    if (s.active) {
      ctx.fillStyle = PALETTE.manaCyan;
      ctx.fillRect(x - 6, y, 4, 1);
      ctx.fillRect(x - 6, y + 2, 3, 1);
      ctx.fillRect(x + 2, y, 4, 1);
      ctx.fillRect(x + 2, y + 2, 3, 1);
    }

    // Brass Candle with flickering flame
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 10, y - 4, 3, 6);
    // Candle flame
    ctx.fillStyle = PALETTE.torchOrange;
    ctx.fillRect(x + 11, y - 7, 2, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 11, y - 6, 1, 1);
  }

  // 3. Alchemist Cauldron & Lab
  drawAlchemy(ctx, s) {
    const { x, y } = s;

    // Hearth fire stones
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x - 12, y + 6, 24, 6);

    // Flickering fire under cauldron
    ctx.fillStyle = PALETTE.torchOrange;
    ctx.fillRect(x - 6, y + 2, 12, 6);
    ctx.fillStyle = PALETTE.brightGold;
    ctx.fillRect(x - 3, y + 3, 6, 4);

    // Cast iron cauldron belly
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Cauldron lip rim
    ctx.fillStyle = '#44403c';
    ctx.fillRect(x - 14, y - 10, 28, 4);

    // Bubbling potion surface
    ctx.fillStyle = s.active ? '#10b981' : '#a855f7';
    ctx.fillRect(x - 10, y - 9, 20, 3);

    // Side table with potion vials
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 12, y - 6, 10, 14);

    // Flask 1 (Red)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 13, y - 8, 3, 5);
    // Flask 2 (Cyan)
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(x + 17, y - 9, 3, 6);
  }

  // 4. Guild Notice Board
  drawNoticeBoard(ctx, s) {
    const { x, y } = s;

    // Wooden vertical posts
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 14, y - 14, 4, 28);
    ctx.fillRect(x + 10, y - 14, 4, 28);

    // Cork/Wood board
    ctx.fillStyle = PALETTE.woodHighlight;
    ctx.fillRect(x - 16, y - 16, 32, 22);
    ctx.fillStyle = PALETTE.woodBase;
    ctx.strokeRect(x - 16, y - 16, 32, 22);

    // Slanted shingle rooflet
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x + 18, y - 15);
    ctx.lineTo(x - 18, y - 15);
    ctx.closePath();
    ctx.fill();

    // Pinned Parchment Notes
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x - 12, y - 12, 10, 8); // Scroll 1
    ctx.fillRect(x + 2, y - 10, 10, 9);  // Scroll 2
    ctx.fillRect(x - 8, y - 2, 14, 6);   // Scroll 3

    // Red wax seals on scrolls
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - 8, y - 13, 2, 2);
    ctx.fillRect(x + 6, y - 11, 2, 2);

    // Golden exclamation badge above board
    const bounce = Math.sin(this.animTime * 5) * 2;
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y - 24 + bounce);
  }

  // 5. Treasury Chest
  drawTreasury(ctx, s) {
    const { x, y } = s;

    // Heavy iron-banded wooden chest body
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 12, y - 6, 24, 16);

    // Iron bands
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x - 12, y - 6, 3, 16);
    ctx.fillRect(x + 9, y - 6, 3, 16);
    ctx.fillRect(x - 12, y + 2, 24, 2);

    // Curved lid
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x - 13, y - 12, 26, 7);
    ctx.fillStyle = '#f59e0b'; // Gold trim
    ctx.fillRect(x - 13, y - 13, 26, 2);

    // Golden keyhole latch
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x - 2, y - 5, 4, 5);
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x - 1, y - 4, 2, 2);

    // Scattered gold coins around chest
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x - 16, y + 8, 3, 2);
    ctx.fillRect(x - 12, y + 9, 3, 2);
    ctx.fillRect(x + 13, y + 7, 3, 2);
    ctx.fillRect(x + 10, y + 9, 3, 2);
  }

  drawStationTooltip(ctx, s) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    let actionPrompt = '[CLICK] Inspect Station';
    let promptColor = '#fef08a';

    if (s.type === STATION_TYPES.FORGE) {
      actionPrompt = '[CLICK] Inspect Forge Diffs';
      promptColor = '#fdba74';
    } else if (s.type === STATION_TYPES.LIBRARY) {
      actionPrompt = '[CLICK] Open Royal Scriptorium';
      promptColor = '#7dd3fc';
    } else if (s.type === STATION_TYPES.ALCHEMY) {
      actionPrompt = '[CLICK] View Alchemical Tests';
      promptColor = '#6ee7b7';
    } else if (s.type === STATION_TYPES.NOTICE_BOARD) {
      actionPrompt = '[CLICK] Inspect Bounty Board';
      promptColor = '#fde047';
    } else if (s.type === STATION_TYPES.TREASURY) {
      actionPrompt = '[CLICK] Inspect Treasury Vault';
      promptColor = '#fef08a';
    }

    ctx.font = '8px "Press Start 2P", monospace';
    const titleText = s.name;
    const actionText = actionPrompt;
    const subText = s.stat;

    const tw = Math.max(
      ctx.measureText(titleText).width,
      ctx.measureText(actionText).width,
      ctx.measureText(subText).width
    ) + 20;
    const th = 38;
    const boxX = s.x - tw / 2;
    const boxY = s.y - s.height / 2 - 36;

    // Parchment dark box
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(boxX, boxY, tw, th);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, tw, th);

    // Title
    ctx.fillStyle = '#fef3c7';
    ctx.fillText(titleText, s.x, boxY + 11);

    // Action Prompt (Highlighted)
    ctx.fillStyle = promptColor;
    ctx.fillText(actionText, s.x, boxY + 23);

    // Subtext stats
    ctx.fillStyle = '#94a3b8';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(subText, s.x, boxY + 34);

    ctx.restore();
  }

  getLightSources() {
    const sources = [];
    this.stations.forEach(s => {
      if (s.type === STATION_TYPES.FORGE && s.active) {
        sources.push({
          x: s.x,
          y: s.y,
          radius: 95,
          color: PALETTE.torchOrange,
          flicker: true,
        });
      } else if (s.type === STATION_TYPES.LIBRARY && s.active) {
        sources.push({
          x: s.x,
          y: s.y,
          radius: 80,
          color: PALETTE.manaCyan,
          flicker: false,
        });
      } else if (s.type === STATION_TYPES.ALCHEMY && s.active) {
        sources.push({
          x: s.x,
          y: s.y,
          radius: 80,
          color: PALETTE.potionGreen,
          flicker: true,
        });
      } else if (s.type === STATION_TYPES.TREASURY && s.active) {
        sources.push({
          x: s.x,
          y: s.y,
          radius: 65,
          color: PALETTE.brightGold,
          flicker: false,
        });
      }
    });
    return sources;
  }
}

export default StationRenderer;
