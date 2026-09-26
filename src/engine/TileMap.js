// TileMap.js - Procedural terrain generator with dynamic world biomes (Forest, Desert, Snow, Void)

import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILE_TYPES,
  BIOMES,
  BIOME_CONFIGS,
  PALETTE,
} from './Constants.js';

export class TileMap {
  constructor(initialBiome = BIOMES.FOREST) {
    this.cols = MAP_COLS;
    this.rows = MAP_ROWS;
    this.tileSize = TILE_SIZE;
    this.width = WORLD_WIDTH;
    this.height = WORLD_HEIGHT;

    // Current World Biome
    this.biome = initialBiome;

    // Center coordinates
    this.centerX = Math.floor(this.cols / 2) * this.tileSize;
    this.centerY = Math.floor(this.rows / 2) * this.tileSize;

    // Grid data
    this.grid = new Uint8Array(this.cols * this.rows);
    this.walkable = new Uint8Array(this.cols * this.rows); // 1 = walkable, 0 = blocked

    // Scenery entities (Trees, Fences, Lanterns, Fountain, Cacti, Crystals, Braziers)
    this.scenery = [];
    this.lightSources = [];

    // Offscreen cached terrain canvas for 60fps rendering
    this.terrainCanvas = null;
    this.terrainCtx = null;

    // Animation timer for water, ice cracks, & magic swirls
    this.animTime = 0;

    this.init();
  }

  setBiome(newBiome) {
    if (!BIOME_CONFIGS[newBiome]) return;
    this.biome = newBiome;

    // Clear dynamic scenery and light sources
    this.scenery = [];
    this.lightSources = [];

    // Reset walkability
    for (let i = 0; i < this.walkable.length; i++) {
      this.walkable[i] = 1;
    }

    // Rebuild scenery & re-bake terrain canvas
    this.setupPlazaAndWater();
    this.generateVegetation();
    this.bakeTerrain();
  }

  getTile(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return TILE_TYPES.GRASS_1;
    return this.grid[row * this.cols + col];
  }

  setTile(col, row, type) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.grid[row * this.cols + col] = type;
  }

  setWalkable(col, row, isWalkable) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.walkable[row * this.cols + col] = isWalkable ? 1 : 0;
  }

  init() {
    // 1. Fill default terrain with rich variations
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const absR = Math.abs((Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1);
        let t = TILE_TYPES.GRASS_1;
        if (absR < 0.25) t = TILE_TYPES.GRASS_2;
        else if (absR < 0.32) t = TILE_TYPES.GRASS_FLOWERS;
        else if (absR < 0.38) t = TILE_TYPES.GRASS_PEBBLES;

        this.setTile(c, r, t);
        this.setWalkable(c, r, true);
      }
    }

    this.setupPlazaAndWater();
    this.generateVegetation();
    this.bakeTerrain();
  }

  setupPlazaAndWater() {
    const midC = Math.floor(this.cols / 2);
    const midR = Math.floor(this.rows / 2);
    const plazaRadius = 6;

    // 2. Generate Village Square / Central Plaza
    for (let r = midR - plazaRadius; r <= midR + plazaRadius; r++) {
      for (let c = midC - plazaRadius; c <= midC + plazaRadius; c++) {
        const dist = Math.hypot(c - midC, r - midR);
        if (dist <= plazaRadius) {
          this.setTile(c, r, TILE_TYPES.PLAZA_STONE);
          this.setWalkable(c, r, true);
        } else if (dist <= plazaRadius + 1) {
          this.setTile(c, r, TILE_TYPES.COBBLE_EDGE);
        }
      }
    }

    // 3. Generate Pond / Oasis / Ice Lake / Mana Pool (East/Southeast)
    const pondCenterC = midC + 16;
    const pondCenterR = midR + 10;
    const pondRx = 9;
    const pondRy = 6;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const dx = (c - pondCenterC) / pondRx;
        const dy = (r - pondCenterR) / pondRy;
        const pondDist = Math.hypot(dx, dy);
        const wave = Math.sin(c * 0.8) * 0.15 + Math.cos(r * 0.9) * 0.12;

        if (pondDist + wave < 0.85) {
          this.setTile(c, r, TILE_TYPES.WATER);
          this.setWalkable(c, r, false);
        } else if (pondDist + wave < 1.05) {
          this.setTile(c, r, TILE_TYPES.WATER_SHALLOW);
          this.setWalkable(c, r, false);
        }
      }
    }

    // 4. Cobblestone / Sandstone / Icy / Runic Avenues from Plaza
    this.createPath(midC, midR, midC, 4); // North
    this.createPath(midC, midR, midC, this.rows - 5); // South
    this.createPath(midC, midR, 4, midR); // West
    this.createPath(midC, midR, midC + 11, midR); // East

    // Diagonal paths to guild huts
    this.createPath(midC, midR, midC - 16, midR - 14); // NW
    this.createPath(midC, midR, midC + 16, midR - 14); // NE
    this.createPath(midC, midR, midC - 16, midR + 14); // SW
    this.createPath(midC, midR, midC + 8, midR + 18);  // SE

    // 5. Village Center Scenery: Fountain / Well / Arcane Obelisk
    this.scenery.push({
      type: 'fountain',
      x: this.centerX,
      y: this.centerY,
      w: 64,
      h: 64,
      solid: true,
    });
    this.setWalkable(midC - 1, midR - 1, false);
    this.setWalkable(midC, midR - 1, false);
    this.setWalkable(midC - 1, midR, false);
    this.setWalkable(midC, midR, false);

    // Plaza Street Lanterns / Braziers at 4 corners
    const lanternOffsets = [
      { c: midC - 4, r: midR - 4 },
      { c: midC + 4, r: midR - 4 },
      { c: midC - 4, r: midR + 4 },
      { c: midC + 4, r: midR + 4 },
    ];
    lanternOffsets.forEach((pos) => {
      const lx = pos.c * this.tileSize + 16;
      const ly = pos.r * this.tileSize + 16;

      const lightColor = this.biome === BIOMES.VOID ? PALETTE.arcanePurple : (this.biome === BIOMES.DESERT ? PALETTE.amberGold : PALETTE.torchOrange);
      this.scenery.push({
        type: this.biome === BIOMES.SNOW || this.biome === BIOMES.VOID ? 'brazier' : 'lantern_post',
        x: lx,
        y: ly,
        solid: true,
      });
      this.lightSources.push({
        x: lx,
        y: ly - 20,
        radius: 120,
        color: lightColor,
        flicker: true,
      });
      this.setWalkable(pos.c, pos.r, false);
    });
  }

  createPath(x0, y0, x1, y1) {
    let currX = x0;
    let currY = y0;

    while (currX !== x1 || currY !== y1) {
      for (let ox = -1; ox <= 0; ox++) {
        for (let oy = -1; oy <= 0; oy++) {
          const c = currX + ox;
          const r = currY + oy;
          if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
            if (this.getTile(c, r) !== TILE_TYPES.WATER) {
              this.setTile(c, r, TILE_TYPES.COBBLESTONE);
              this.setWalkable(c, r, true);
            }
          }
        }
      }

      if (currX < x1) currX++;
      else if (currX > x1) currX--;

      if (currY < y1) currY++;
      else if (currY > y1) currY--;
    }
  }

  generateVegetation() {
    const midC = Math.floor(this.cols / 2);
    const midR = Math.floor(this.rows / 2);

    for (let r = 2; r < this.rows - 2; r += 2) {
      for (let c = 2; c < this.cols - 2; c += 2) {
        const distFromCenter = Math.hypot(c - midC, r - midR);
        if (distFromCenter < 8) continue; // Keep plaza clear

        const tile = this.getTile(c, r);
        if (tile === TILE_TYPES.COBBLESTONE || tile === TILE_TYPES.PLAZA_STONE || tile === TILE_TYPES.WATER) {
          continue;
        }

        const noise = Math.sin(c * 0.45) * Math.cos(r * 0.45);
        const seed = Math.abs((Math.sin(c * 93.1 + r * 37.7) * 23421.63) % 1);

        if (noise > 0.35 && seed < 0.65) {
          const tx = c * this.tileSize + 16 + (Math.sin(c + r) * 6);
          const ty = r * this.tileSize + 20 + (Math.cos(c * r) * 6);

          if (this.biome === BIOMES.DESERT) {
            const scType = seed > 0.4 ? 'palm' : 'cactus';
            this.scenery.push({
              type: scType,
              x: tx,
              y: ty,
              solid: true,
            });
            this.setWalkable(c, r, false);
          } else if (this.biome === BIOMES.SNOW) {
            const scType = seed > 0.3 ? 'frosted_pine' : 'ice_spire';
            this.scenery.push({
              type: scType,
              x: tx,
              y: ty,
              solid: true,
            });
            this.setWalkable(c, r, false);
          } else if (this.biome === BIOMES.VOID) {
            const scType = seed > 0.4 ? 'crystal_spire' : 'rune_monolith';
            this.scenery.push({
              type: scType,
              x: tx,
              y: ty,
              solid: true,
            });
            // Void crystals glow!
            if (scType === 'crystal_spire') {
              this.lightSources.push({
                x: tx,
                y: ty - 20,
                radius: 75,
                color: '#a855f7',
                flicker: false,
              });
            }
            this.setWalkable(c, r, false);
          } else {
            // Forest default
            const treeType = seed > 0.45 ? 'oak' : (seed > 0.2 ? 'pine' : 'apple');
            this.scenery.push({
              type: 'tree',
              subType: treeType,
              x: tx,
              y: ty,
              solid: true,
            });
            this.setWalkable(c, r, false);
          }
        }
      }
    }

    // Biome-specific Fences / Rocks
    const fenceSegments = [
      { startC: midC - 12, startR: midR + 6, len: 6, dir: 'h' },
      { startC: midC + 6, startR: midR - 10, len: 5, dir: 'h' },
      { startC: midC - 10, startR: midR - 8, len: 4, dir: 'v' },
    ];

    fenceSegments.forEach(seg => {
      for (let i = 0; i < seg.len; i++) {
        const c = seg.dir === 'h' ? seg.startC + i : seg.startC;
        const r = seg.dir === 'v' ? seg.startR + i : seg.startR;
        if (this.getTile(c, r) !== TILE_TYPES.COBBLESTONE && this.getTile(c, r) !== TILE_TYPES.WATER) {
          this.scenery.push({
            type: 'fence',
            dir: seg.dir,
            x: c * this.tileSize + 16,
            y: r * this.tileSize + 24,
            solid: true,
          });
          this.setWalkable(c, r, false);
        }
      }
    });

    // Pond Water Lilies (Forest only)
    if (this.biome === BIOMES.FOREST) {
      const pondCenterC = midC + 16;
      const pondCenterR = midR + 10;
      const lilyPads = [
        { c: pondCenterC - 3, r: pondCenterR - 1 },
        { c: pondCenterC + 2, r: pondCenterR + 2 },
        { c: pondCenterC - 1, r: pondCenterR + 3 },
        { c: pondCenterC + 4, r: pondCenterR - 2 },
      ];
      lilyPads.forEach(lp => {
        this.scenery.push({
          type: 'lily_pad',
          x: lp.c * this.tileSize + 16,
          y: lp.r * this.tileSize + 16,
          solid: false,
        });
      });
    }
  }

  // Pre-render static base tiles into offscreen canvas for extreme performance
  bakeTerrain() {
    if (typeof document === 'undefined') return;
    if (!this.terrainCanvas) {
      this.terrainCanvas = document.createElement('canvas');
      this.terrainCanvas.width = this.width;
      this.terrainCanvas.height = this.height;
      this.terrainCtx = this.terrainCanvas.getContext('2d');
    }

    this.terrainCtx.imageSmoothingEnabled = false;
    const ctx = this.terrainCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * this.tileSize;
        const y = r * this.tileSize;
        const type = this.getTile(c, r);

        this.drawBaseTile(ctx, type, x, y, c, r);
      }
    }
  }

  drawBaseTile(ctx, type, x, y, c, r) {
    const s = this.tileSize;
    const cfg = BIOME_CONFIGS[this.biome] || BIOME_CONFIGS[BIOMES.FOREST];

    switch (type) {
      case TILE_TYPES.GRASS_1:
      case TILE_TYPES.GRASS_2: {
        // Base Ground Color
        ctx.fillStyle = type === TILE_TYPES.GRASS_1 ? cfg.groundBase : cfg.groundDark;
        ctx.fillRect(x, y, s, s);

        // Ground texture flecks / sand grain / snow crystals
        ctx.fillStyle = cfg.groundDark;
        ctx.fillRect(x + 4, y + 8, 2, 4);
        ctx.fillRect(x + 18, y + 20, 2, 4);
        ctx.fillRect(x + 24, y + 6, 2, 3);

        ctx.fillStyle = cfg.groundLight;
        ctx.fillRect(x + 5, y + 7, 2, 3);
        ctx.fillRect(x + 19, y + 19, 2, 3);
        ctx.fillRect(x + 10, y + 24, 2, 3);
        break;
      }

      case TILE_TYPES.GRASS_FLOWERS: {
        ctx.fillStyle = cfg.groundBase;
        ctx.fillRect(x, y, s, s);

        // Biome Accent 1: Buttercups / Dunes Ripples / Ice Crystals / Mana Vein
        ctx.fillStyle = cfg.groundAccent1;
        if (this.biome === BIOMES.DESERT) {
          // Sand dune wave lines
          ctx.fillRect(x + 4, y + 10, 14, 2);
          ctx.fillRect(x + 14, y + 22, 12, 2);
        } else if (this.biome === BIOMES.VOID) {
          // Mana glowing veins
          ctx.fillRect(x + 6, y + 8, 3, 3);
          ctx.fillRect(x + 20, y + 18, 4, 2);
        } else {
          // Forest flowers / Snow ice crystals
          ctx.fillRect(x + 7, y + 9, 3, 3);
          ctx.fillRect(x + 20, y + 18, 3, 3);
        }

        // Biome Accent 2: Poppies / Clay / Frost / Cyan glow
        ctx.fillStyle = cfg.groundAccent2;
        ctx.fillRect(x + 12, y + 14, 3, 3);
        break;
      }

      case TILE_TYPES.GRASS_PEBBLES: {
        ctx.fillStyle = cfg.groundBase;
        ctx.fillRect(x, y, s, s);

        // Small pebbles / stones
        ctx.fillStyle = cfg.pathDark;
        ctx.fillRect(x + 10, y + 12, 4, 3);
        ctx.fillRect(x + 22, y + 20, 3, 2);
        ctx.fillStyle = cfg.pathHighlight;
        ctx.fillRect(x + 9, y + 11, 3, 2);
        ctx.fillRect(x + 21, y + 19, 2, 2);
        break;
      }

      case TILE_TYPES.COBBLESTONE: {
        // Base foundation
        ctx.fillStyle = cfg.pathDark;
        ctx.fillRect(x, y, s, s);

        // Individual Flagstones
        const stones = [
          { ox: 2, oy: 2, w: 12, h: 8, col: cfg.pathBase, hi: cfg.pathHighlight },
          { ox: 16, oy: 2, w: 14, h: 10, col: cfg.pathLight, hi: cfg.pathHighlight },
          { ox: 2, oy: 12, w: 14, h: 10, col: cfg.pathLight, hi: cfg.pathHighlight },
          { ox: 18, oy: 14, w: 12, h: 8, col: cfg.pathBase, hi: cfg.pathHighlight },
          { ox: 4, oy: 24, w: 10, h: 6, col: cfg.pathBase, hi: cfg.pathHighlight },
          { ox: 16, oy: 24, w: 14, h: 6, col: cfg.pathLight, hi: cfg.pathHighlight },
        ];

        stones.forEach(st => {
          ctx.fillStyle = cfg.pathDark;
          ctx.fillRect(x + st.ox - 1, y + st.oy - 1, st.w + 2, st.h + 2);
          ctx.fillStyle = st.col;
          ctx.fillRect(x + st.ox, y + st.oy, st.w, st.h);
          ctx.fillStyle = st.hi;
          ctx.fillRect(x + st.ox, y + st.oy, st.w - 2, 2);
          ctx.fillRect(x + st.ox, y + st.oy, 2, st.h - 2);
        });

        // Void Biome Runic Inscriptions on Path
        if (this.biome === BIOMES.VOID) {
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(x + 6, y + 5, 4, 1);
          ctx.fillRect(x + 20, y + 18, 5, 1);
        }
        break;
      }

      case TILE_TYPES.COBBLE_EDGE: {
        ctx.fillStyle = cfg.groundBase;
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = cfg.pathDark;
        ctx.fillRect(x + 6, y + 6, 8, 6);
        ctx.fillRect(x + 18, y + 16, 8, 6);
        ctx.fillStyle = cfg.pathBase;
        ctx.fillRect(x + 7, y + 7, 6, 4);
        ctx.fillRect(x + 19, y + 17, 6, 4);
        break;
      }

      case TILE_TYPES.PLAZA_STONE: {
        ctx.fillStyle = cfg.plazaBase;
        ctx.fillRect(x, y, s, s);

        const paverSize = 13;
        const coords = [
          { ox: 2, oy: 2 },
          { ox: 17, oy: 2 },
          { ox: 2, oy: 17 },
          { ox: 17, oy: 17 },
        ];

        coords.forEach(pt => {
          ctx.fillStyle = cfg.pathLight;
          ctx.fillRect(x + pt.ox, y + pt.oy, paverSize, paverSize);
          ctx.fillStyle = cfg.pathHighlight;
          ctx.fillRect(x + pt.ox, y + pt.oy, paverSize, 2);
          ctx.fillRect(x + pt.ox, y + pt.oy, 2, paverSize);
          ctx.fillStyle = cfg.pathDark;
          ctx.fillRect(x + pt.ox + paverSize - 2, y + pt.oy, 2, paverSize);
          ctx.fillRect(x + pt.ox, y + pt.oy + paverSize - 2, paverSize, 2);
        });
        break;
      }

      case TILE_TYPES.WATER: {
        ctx.fillStyle = cfg.waterDeep;
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = cfg.waterBase;
        ctx.fillRect(x + 4, y + 8, 14, 2);
        ctx.fillRect(x + 14, y + 20, 14, 2);

        // Snow: Ice cracks
        if (this.biome === BIOMES.SNOW) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 8, y + 4, 1, 8);
          ctx.fillRect(x + 9, y + 10, 6, 1);
        }
        break;
      }

      case TILE_TYPES.WATER_SHALLOW: {
        ctx.fillStyle = cfg.waterBase;
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = cfg.waterLight;
        ctx.fillRect(x + 2, y + 4, 12, 2);
        ctx.fillRect(x + 12, y + 18, 14, 2);
        ctx.fillStyle = cfg.waterFoam;
        ctx.fillRect(x + 6, y + 6, 4, 1);
        break;
      }

      default:
        ctx.fillStyle = cfg.groundBase;
        ctx.fillRect(x, y, s, s);
    }
  }

  isWalkable(worldX, worldY) {
    if (worldX < 0 || worldX >= this.width || worldY < 0 || worldY >= this.height) {
      return false;
    }
    const c = Math.floor(worldX / this.tileSize);
    const r = Math.floor(worldY / this.tileSize);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false;
    return this.walkable[r * this.cols + c] === 1;
  }

  update(dt, particleSystem = null) {
    this.animTime += dt;

    if (particleSystem && Math.random() < 0.08) {
      const midC = Math.floor(this.cols / 2) + 16;
      const midR = Math.floor(this.rows / 2) + 10;
      const rx = (midC + (Math.random() * 10 - 5)) * this.tileSize;
      const ry = (midR + (Math.random() * 8 - 4)) * this.tileSize;

      if (this.biome === BIOMES.VOID) {
        particleSystem.emitArcaneRune(rx, ry, '#c084fc');
      } else {
        particleSystem.emitWaterRipple(rx, ry);
      }
    }
  }

  renderGround(ctx, bounds) {
    if (!this.terrainCanvas) return;

    const sx = Math.max(0, Math.floor(bounds.left));
    const sy = Math.max(0, Math.floor(bounds.top));
    const sw = Math.min(this.width - sx, Math.ceil(bounds.right - bounds.left));
    const sh = Math.min(this.height - sy, Math.ceil(bounds.bottom - bounds.top));

    if (sw > 0 && sh > 0) {
      ctx.drawImage(this.terrainCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
    }

    // Water Shimmer overlay
    const waveShift = Math.sin(this.animTime * 3) * 2;
    ctx.fillStyle = this.biome === BIOMES.VOID ? 'rgba(217, 70, 239, 0.15)' : 'rgba(255, 255, 255, 0.12)';
    const midC = Math.floor(this.cols / 2) + 16;
    const midR = Math.floor(this.rows / 2) + 10;
    const pondX = (midC - 6) * this.tileSize;
    const pondY = (midR - 4) * this.tileSize;

    if (
      pondX + 400 > bounds.left &&
      pondX < bounds.right &&
      pondY + 300 > bounds.top &&
      pondY < bounds.bottom
    ) {
      ctx.fillRect(pondX + 60 + waveShift, pondY + 50, 24, 2);
      ctx.fillRect(pondX + 120 - waveShift, pondY + 90, 30, 2);
      ctx.fillRect(pondX + 90 + waveShift, pondY + 140, 20, 2);
    }
  }

  renderSceneryItem(ctx, item) {
    switch (item.type) {
      case 'tree':
        this.drawTree(ctx, item.x, item.y, item.subType);
        break;
      case 'palm':
        this.drawPalmTree(ctx, item.x, item.y);
        break;
      case 'cactus':
        this.drawCactus(ctx, item.x, item.y);
        break;
      case 'frosted_pine':
        this.drawFrostedPine(ctx, item.x, item.y);
        break;
      case 'ice_spire':
        this.drawIceSpire(ctx, item.x, item.y);
        break;
      case 'crystal_spire':
        this.drawCrystalSpire(ctx, item.x, item.y);
        break;
      case 'rune_monolith':
        this.drawRuneMonolith(ctx, item.x, item.y);
        break;
      case 'fence':
        this.drawFence(ctx, item.x, item.y, item.dir);
        break;
      case 'fountain':
        this.drawFountain(ctx, item.x, item.y);
        break;
      case 'lantern_post':
        this.drawLanternPost(ctx, item.x, item.y);
        break;
      case 'brazier':
        this.drawBrazier(ctx, item.x, item.y);
        break;
      case 'lily_pad':
        this.drawLilyPad(ctx, item.x, item.y);
        break;
    }
  }

  // --- Scenery Renderers ---

  drawTree(ctx, x, y, subType = 'oak') {
    ctx.save();
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 6, y - 18, 12, 22);
    ctx.fillStyle = PALETTE.woodBase;
    ctx.fillRect(x - 4, y - 18, 8, 20);

    if (subType === 'pine') {
      const tiers = [
        { yOffset: -16, w: 36, h: 22, color: '#166534' },
        { yOffset: -30, w: 28, h: 20, color: '#15803d' },
        { yOffset: -44, w: 20, h: 18, color: '#22c55e' },
      ];
      tiers.forEach(tier => {
        ctx.fillStyle = tier.color;
        ctx.beginPath();
        ctx.moveTo(x, y + tier.yOffset - tier.h);
        ctx.lineTo(x + tier.w / 2, y + tier.yOffset);
        ctx.lineTo(x - tier.w / 2, y + tier.yOffset);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#86efac';
        ctx.fillRect(x - 2, y + tier.yOffset - tier.h, 4, 3);
      });
    } else {
      const sway = Math.sin(this.animTime * 1.5 + x * 0.05) * 1.5;
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(x + sway, y - 36, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(x - 8 + sway, y - 40, 18, 0, Math.PI * 2);
      ctx.arc(x + 10 + sway, y - 42, 17, 0, Math.PI * 2);
      ctx.arc(x + sway, y - 48, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(x - 6 + sway, y - 46, 12, 0, Math.PI * 2);
      ctx.arc(x + 6 + sway, y - 48, 11, 0, Math.PI * 2);
      ctx.fill();

      if (subType === 'apple') {
        const apples = [
          { ox: -12, oy: -38 },
          { ox: 10, oy: -42 },
          { ox: -4, oy: -48 },
          { ox: 8, oy: -32 },
        ];
        apples.forEach(ap => {
          ctx.fillStyle = PALETTE.rubyRed;
          ctx.fillRect(x + ap.ox + sway, y + ap.oy, 4, 4);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(x + ap.ox + sway, y + ap.oy, 1, 1);
        });
      }
    }
    ctx.restore();
  }

  // Desert Date Palm Tree
  drawPalmTree(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved Trunk
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 8, y - 24, x + 4, y - 46);
    ctx.stroke();

    // Trunk rings
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 7;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(x - 1 + i * 1.5, y - 10 - i * 10, 6, 2);
    }

    // Palm Fronds
    const crownX = x + 4;
    const crownY = y - 46;
    const sway = Math.sin(this.animTime * 2 + x) * 2;

    const fronds = [
      { ex: -24, ey: -8 },
      { ex: 24, ey: -8 },
      { ex: -16, ey: -20 },
      { ex: 16, ey: -20 },
      { ex: 0, ey: -26 },
    ];

    fronds.forEach(fr => {
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.moveTo(crownX, crownY);
      ctx.quadraticCurveTo(crownX + fr.ex / 2, crownY + fr.ey - 6 + sway, crownX + fr.ex + sway, crownY + fr.ey);
      ctx.lineTo(crownX + fr.ex * 0.8, crownY + fr.ey + 4);
      ctx.closePath();
      ctx.fill();
    });

    // Coconuts
    ctx.fillStyle = '#451a03';
    ctx.fillRect(crownX - 3, crownY, 4, 4);
    ctx.fillRect(crownX + 1, crownY - 1, 4, 4);

    ctx.restore();
  }

  // Desert Saguaro Cactus
  drawCactus(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main column
    ctx.fillStyle = '#15803d';
    ctx.fillRect(x - 5, y - 36, 10, 38);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 3, y - 36, 4, 38);

    // Left arm
    ctx.fillStyle = '#15803d';
    ctx.fillRect(x - 14, y - 22, 10, 6);
    ctx.fillRect(x - 14, y - 32, 6, 14);

    // Right arm
    ctx.fillRect(x + 4, y - 26, 10, 6);
    ctx.fillRect(x + 8, y - 38, 6, 16);

    // Blooming pink desert flower on top
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(x - 3, y - 40, 6, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x - 1, y - 39, 2, 2);

    ctx.restore();
  }

  // Snow Frosted Pine Tree
  drawFrostedPine(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 4, y - 14, 8, 16);

    const tiers = [
      { yOffset: -12, w: 34, h: 20 },
      { yOffset: -26, w: 26, h: 18 },
      { yOffset: -38, w: 18, h: 16 },
    ];

    tiers.forEach(tier => {
      // Pine foliage
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.moveTo(x, y + tier.yOffset - tier.h);
      ctx.lineTo(x + tier.w / 2, y + tier.yOffset);
      ctx.lineTo(x - tier.w / 2, y + tier.yOffset);
      ctx.closePath();
      ctx.fill();

      // Heavy snow cap
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x, y + tier.yOffset - tier.h);
      ctx.lineTo(x + tier.w / 3, y + tier.yOffset - tier.h / 2);
      ctx.lineTo(x - tier.w / 3, y + tier.yOffset - tier.h / 2);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  // Snow Ice Spire
  drawIceSpire(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Translucent ice stalagmite
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x + 7, y);
    ctx.lineTo(x - 7, y);
    ctx.closePath();
    ctx.fill();

    // White crystal gleam
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 2, y - 26, 3, 14);
    ctx.restore();
  }

  // Void Glowing Crystal Spire
  drawCrystalSpire(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glow pulse
    const pulse = Math.sin(this.animTime * 4 + x) * 0.2 + 0.8;
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 10 * pulse;

    // Outer Amethyst Crystal Spire
    ctx.fillStyle = '#7e22ce';
    ctx.beginPath();
    ctx.moveTo(x, y - 44);
    ctx.lineTo(x + 10, y - 10);
    ctx.lineTo(x + 8, y + 2);
    ctx.lineTo(x - 8, y + 2);
    ctx.lineTo(x - 10, y - 10);
    ctx.closePath();
    ctx.fill();

    // Inner bright facet
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.lineTo(x + 4, y - 10);
    ctx.lineTo(x, y);
    ctx.lineTo(x - 4, y - 10);
    ctx.closePath();
    ctx.fill();

    // Crystal Tip Highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 42, 2, 8);

    ctx.restore();
  }

  // Void Rune Monolith
  drawRuneMonolith(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Obsidian Pillar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 7, y - 32, 14, 34);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 5, y - 32, 10, 34);

    // Glowing Neon Runes on Pillar
    const glow = Math.sin(this.animTime * 5) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(6, 182, 212, ${glow})`;
    ctx.fillRect(x - 2, y - 26, 4, 2);
    ctx.fillRect(x - 3, y - 20, 6, 2);
    ctx.fillRect(x - 2, y - 14, 4, 2);

    ctx.restore();
  }

  // Brazier with crackling flame (Snow & Void)
  drawBrazier(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x - 8, y, 16, 4);

    // Iron Stand
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 2, y - 18, 4, 20);
    ctx.fillRect(x - 8, y - 4, 16, 4);

    // Iron Bowl Basin
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 9, y - 22, 18, 6);

    // Flame Core (Void purple or Snow orange)
    const isVoid = this.biome === BIOMES.VOID;
    const flameBase = isVoid ? '#9333ea' : PALETTE.torchOrange;
    const flameCore = isVoid ? '#f0abfc' : PALETTE.torchYellow;

    const flicker = Math.sin(this.animTime * 14 + x) * 3;
    ctx.fillStyle = flameBase;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 22);
    ctx.lineTo(x + flicker, y - 34);
    ctx.lineTo(x + 6, y - 22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flameCore;
    ctx.fillRect(x - 2, y - 28, 4, 6);

    ctx.restore();
  }

  drawFence(ctx, x, y, dir = 'h') {
    ctx.save();
    const isSnow = this.biome === BIOMES.SNOW;
    ctx.fillStyle = PALETTE.woodDark;
    if (dir === 'h') {
      ctx.fillRect(x - 16, y - 10, 32, 3);
      ctx.fillRect(x - 16, y - 4, 32, 3);
      ctx.fillStyle = PALETTE.woodBase;
      ctx.fillRect(x - 14, y - 14, 5, 14);
      ctx.fillRect(x + 9, y - 14, 5, 14);
      if (isSnow) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 16, y - 12, 32, 2);
        ctx.fillRect(x - 14, y - 16, 5, 2);
        ctx.fillRect(x + 9, y - 16, 5, 2);
      }
    } else {
      ctx.fillRect(x - 2, y - 16, 4, 32);
      ctx.fillStyle = PALETTE.woodBase;
      ctx.fillRect(x - 6, y - 14, 12, 4);
      ctx.fillRect(x - 6, y + 8, 12, 4);
    }
    ctx.restore();
  }

  drawFountain(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y + 22, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    const cfg = BIOME_CONFIGS[this.biome] || BIOME_CONFIGS[BIOMES.FOREST];

    // Basin outer rim
    ctx.fillStyle = cfg.pathDark;
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 32, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cfg.pathLight;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 30, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pool liquid
    ctx.fillStyle = cfg.waterDeep;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center pedestal
    ctx.fillStyle = cfg.pathDark;
    ctx.fillRect(x - 8, y - 10, 16, 18);
    ctx.fillStyle = cfg.pathHighlight;
    ctx.fillRect(x - 6, y - 10, 12, 18);

    if (this.biome === BIOMES.VOID) {
      // Floating glowing mana orb
      const orbBob = Math.sin(this.animTime * 4) * 3;
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(x, y - 22 + orbBob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 24 + orbBob, 4, 4);
    } else {
      // Water jet spout
      const jetH = 14 + Math.sin(this.animTime * 6) * 4;
      ctx.fillStyle = cfg.waterFoam;
      ctx.fillRect(x - 1, y - 14 - jetH, 3, jetH);
      for (let i = 0; i < 4; i++) {
        const dropAngle = (this.animTime * 4 + (i * Math.PI) / 2) % (Math.PI * 2);
        const dx = Math.cos(dropAngle) * (8 + i * 2);
        const dy = Math.sin(dropAngle) * 4 + 2;
        ctx.fillRect(x + dx, y - 8 + dy, 2, 2);
      }
    }
    ctx.restore();
  }

  drawLanternPost(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x - 4, y, 8, 4);

    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 2, y - 26, 4, 28);
    ctx.fillStyle = PALETTE.woodBase;
    ctx.fillRect(x - 1, y - 26, 2, 28);

    ctx.fillStyle = PALETTE.woodHighlight;
    ctx.fillRect(x - 6, y - 24, 12, 3);

    ctx.fillStyle = '#292524';
    ctx.fillRect(x - 4, y - 21, 8, 9);

    ctx.fillStyle = PALETTE.brightGold;
    ctx.fillRect(x - 2, y - 19, 4, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 18, 2, 3);

    ctx.restore();
  }

  drawLilyPad(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0.3, Math.PI * 1.9);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f472b6';
    ctx.fillRect(x + 1, y - 3, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2, y - 2, 1, 1);
    ctx.restore();
  }

  getLightSources() {
    return this.lightSources;
  }
}

export default TileMap;
