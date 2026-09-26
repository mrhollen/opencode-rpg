// HouseInterior.js - Walk-in House Interior Scene with workstations, hearth, and furniture

import { PALETTE, STATION_TYPES, AGENT_ROLES, AGENT_STATUSES } from './Constants.js';
import { AgentSprite } from './AgentSprite.js';
import sound from '../components/SoundEngine.js';

export class HouseInterior {
  constructor(hutSession = null) {
    this.session = hutSession;
    this.hutName = hutSession?.name || hutSession?.title || 'Guild Workshop';
    this.theme = hutSession?.theme || 'forge';

    // Room dimensions (26 x 18 tiles @ 32px = 832 x 576)
    this.width = 832;
    this.height = 576;
    this.tileSize = 32;

    // Room bounds (interior playable area)
    this.bounds = {
      left: 64,
      right: 768,
      top: 96,
      bottom: 512,
    };

    // Exit Doorway at the bottom center
    this.exitZone = {
      x: 416,
      y: 524,
      width: 64,
      height: 36,
    };

    this.animTime = 0;
    this.fireTimer = 0;

    // Interior Workstations & Furniture (hitboxes and render data)
    this.stations = [];
    this.agents = [];
    this.furniture = [];
    this.lightSources = [];

    this.initInterior();
  }

  initInterior() {
    const isSessionActive = this.session?.status === 'active' || (this.session?.activeAgents && this.session.activeAgents > 0);

    // 1. Grand Stone Fireplace & Roaring Hearth (Center North)
    this.hearth = {
      x: 416,
      y: 78,
      width: 96,
      height: 64,
      solid: true,
    };
    this.furniture.push(this.hearth);

    // Roaring Fireplace Light Source (Intense warm radial light)
    this.lightSources.push({
      x: 416,
      y: 90,
      radius: 220,
      color: '#ea580c',
      flicker: true,
    });

    // 2. Master Command Executive Desk (Center, in front of fireplace)
    const masterDesk = {
      id: 'interior-master-desk',
      type: 'master_desk',
      name: 'Command Lectern',
      x: 416,
      y: 190,
      width: 76,
      height: 44,
      solid: true,
      description: 'Guildmaster desk with glowing scrying orb & realm decrees',
    };
    this.stations.push(masterDesk);
    this.furniture.push(masterDesk);

    // Helper to map role strings to sprite class
    const mapSubRole = (r = '') => {
      const s = (r || '').toLowerCase();
      if (s.includes('code') || s.includes('dev') || s.includes('build') || s.includes('forge')) return AGENT_ROLES.BUILD;
      if (s.includes('explore') || s.includes('research') || s.includes('doc') || s.includes('lib')) return AGENT_ROLES.EXPLORE;
      if (s.includes('review') || s.includes('qa') || s.includes('test') || s.includes('alchem')) return AGENT_ROLES.REVIEW;
      return AGENT_ROLES.TASK;
    };

    // Subagents collection from real session data
    const subagents = this.session?.subagents || [];
    const assignedSubIds = new Set();

    // Find best match for each primary station
    const coderSub = subagents.find(s => mapSubRole(s.role || s.agent) === AGENT_ROLES.BUILD);
    if (coderSub) assignedSubIds.add(coderSub.id);

    const exploreSub = subagents.find(s => !assignedSubIds.has(s.id) && mapSubRole(s.role || s.agent) === AGENT_ROLES.EXPLORE);
    if (exploreSub) assignedSubIds.add(exploreSub.id);

    const qaSub = subagents.find(s => !assignedSubIds.has(s.id) && mapSubRole(s.role || s.agent) === AGENT_ROLES.REVIEW);
    if (qaSub) assignedSubIds.add(qaSub.id);

    const taskSub = subagents.find(s => !assignedSubIds.has(s.id));
    if (taskSub) assignedSubIds.add(taskSub.id);

    // Master Agent behind the command desk
    const masterTask = this.session?.latestActivity || this.session?.currentTask || (isSessionActive ? 'Orchestrating session tasks' : 'Session idle');
    this.masterAgent = new AgentSprite({
      id: 'interior-master-agent',
      name: `Lead: ${this.session?.agent || 'Master'}`,
      role: AGENT_ROLES.MASTER,
      status: isSessionActive ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
      x: 416,
      y: 156,
      currentTask: masterTask,
    });
    this.masterAgent.subagentData = {
      id: this.session?.id,
      agent: this.session?.agent || 'team-lead',
      model: this.session?.model,
      role: 'master',
      is_active: isSessionActive,
      title: this.session?.title,
    };
    this.agents.push(this.masterAgent);

    // 3. Blacksmith Forge & Heavy Anvil (North-West corner)
    const forgeStation = {
      id: 'interior-forge',
      type: STATION_TYPES.FORGE,
      name: 'Code Smithy & Diff Forge',
      roleTag: 'build',
      x: 160,
      y: 160,
      width: 76,
      height: 50,
      solid: true,
      active: isSessionActive,
      stat: 'Inspect File Diffs & Git Patches',
    };
    this.stations.push(forgeStation);
    this.furniture.push(forgeStation);

    // Forge hearth fire light
    this.lightSources.push({
      x: 130,
      y: 150,
      radius: 120,
      color: '#f97316',
      flicker: true,
    });

    // Coder Agent at forge (positioned so both agent and anvil can be clicked)
    const coderName = coderSub ? `Coder: ${coderSub.model || coderSub.role || coderSub.agent}` : `Coder (${this.session?.model || 'Code'})`;
    const coderTask = coderSub?.latestActivity || coderSub?.recentTask || (isSessionActive ? 'Applying code edits & git commits' : 'Idle (waiting for code)');
    this.blacksmith = new AgentSprite({
      id: coderSub ? `interior-sub-${coderSub.id}` : 'interior-blacksmith',
      name: coderName,
      role: AGENT_ROLES.BUILD,
      status: (coderSub ? coderSub.is_active : isSessionActive) ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
      x: 196,
      y: 158,
      currentTask: coderTask,
    });
    if (coderSub) this.blacksmith.subagentData = coderSub;
    this.agents.push(this.blacksmith);

    // 4. Royal Scriptorium & Library (East Wall)
    const scriptoriumStation = {
      id: 'interior-library',
      type: STATION_TYPES.LIBRARY,
      name: 'Research Desk & Log Chronicle',
      roleTag: 'explore',
      x: 672,
      y: 190,
      width: 74,
      height: 52,
      solid: true,
      active: isSessionActive,
      stat: 'Inspect Execution Logs & Chronicle',
    };
    this.stations.push(scriptoriumStation);
    this.furniture.push(scriptoriumStation);

    // Scriptorium blue mana light
    this.lightSources.push({
      x: 672,
      y: 190,
      radius: 100,
      color: '#38bdf8',
      flicker: false,
    });

    // Explore / Research Agent at scriptorium
    const exploreName = exploreSub ? `Explore: ${exploreSub.model || exploreSub.role || exploreSub.agent}` : `Research (${this.session?.model || 'Docs'})`;
    const exploreTask = exploreSub?.latestActivity || exploreSub?.recentTask || (isSessionActive ? 'Reading workspace files & symbols' : 'Idle (ready to explore)');
    this.scholar = new AgentSprite({
      id: exploreSub ? `interior-sub-${exploreSub.id}` : 'interior-scholar',
      name: exploreName,
      role: AGENT_ROLES.EXPLORE,
      status: (exploreSub ? exploreSub.is_active : isSessionActive) ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
      x: 636,
      y: 194,
      currentTask: exploreTask,
    });
    if (exploreSub) this.scholar.subagentData = exploreSub;
    this.agents.push(this.scholar);

    // 5. Alchemical Testing Laboratory (North-East corner)
    const alchemyStation = {
      id: 'interior-alchemy',
      type: STATION_TYPES.ALCHEMY,
      name: 'Testing & QA Crucible',
      roleTag: 'review',
      x: 672,
      y: 350,
      width: 70,
      height: 48,
      solid: true,
      active: isSessionActive,
      stat: 'Test Suite & Linter Verification',
    };
    this.stations.push(alchemyStation);
    this.furniture.push(alchemyStation);

    // Alchemy green glow
    this.lightSources.push({
      x: 672,
      y: 350,
      radius: 95,
      color: '#34d399',
      flicker: true,
    });

    // Test & QA Agent at crucible
    const qaName = qaSub ? `QA: ${qaSub.model || qaSub.role || qaSub.agent}` : `Test & QA (${this.session?.model || 'Review'})`;
    const qaTask = qaSub?.latestActivity || qaSub?.recentTask || (isSessionActive ? 'Running verification & tests' : 'Idle (checks passing)');
    this.alchemist = new AgentSprite({
      id: qaSub ? `interior-sub-${qaSub.id}` : 'interior-alchemist',
      name: qaName,
      role: AGENT_ROLES.REVIEW,
      status: (qaSub ? qaSub.is_active : isSessionActive) ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
      x: 636,
      y: 354,
      currentTask: qaTask,
    });
    if (qaSub) this.alchemist.subagentData = qaSub;
    this.agents.push(this.alchemist);

    // 6. Wall Bounty & Quest Board (West Wall)
    const boardStation = {
      id: 'interior-notice-board',
      type: STATION_TYPES.NOTICE_BOARD,
      name: 'Guild Bounty Board',
      roleTag: 'task',
      x: 130,
      y: 350,
      width: 56,
      height: 44,
      solid: true,
      active: true,
      stat: 'Pending session tasks',
    };
    this.stations.push(boardStation);
    this.furniture.push(boardStation);

    // Task / Rogue Agent near bounty board
    const taskName = taskSub ? `Task: ${taskSub.model || taskSub.role || taskSub.agent}` : 'Coordinator';
    const taskTask = taskSub?.latestActivity || taskSub?.recentTask || 'Managing task queue';
    this.rogue = new AgentSprite({
      id: taskSub ? `interior-sub-${taskSub.id}` : 'interior-rogue',
      name: taskName,
      role: AGENT_ROLES.TASK,
      status: (taskSub ? taskSub.is_active : false) ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
      x: 168,
      y: 358,
      currentTask: taskTask,
    });
    if (taskSub) this.rogue.subagentData = taskSub;
    this.agents.push(this.rogue);

    // 7. Treasury & Token Vault (South-East near wall)
    const treasuryStation = {
      id: 'interior-treasury',
      type: STATION_TYPES.TREASURY,
      name: 'Guild Token Vault',
      roleTag: 'tokens',
      x: 660,
      y: 470,
      width: 54,
      height: 38,
      solid: true,
      active: isSessionActive,
      stat: `${(this.session?.tokens_input || 14250).toLocaleString()} Tokens`,
    };
    this.stations.push(treasuryStation);
    this.furniture.push(treasuryStation);

    // 8. Royal Messenger Desk / Decree Dispatcher (South-West)
    const messengerDesk = {
      id: 'interior-messenger',
      type: 'messenger_desk',
      name: 'Royal Courier Desk',
      x: 160,
      y: 470,
      width: 64,
      height: 40,
      solid: true,
      description: 'Carrier raven post & decree dispatch desk',
    };
    this.stations.push(messengerDesk);
    this.furniture.push(messengerDesk);

    // 9. COLLABORATIVE GUILD WORKBENCHES FOR ALL REMAINING SUBAGENTS
    // Every single spawned subagent has a designated craft table and visible sprite!
    const extraSubagents = subagents.filter(s => !assignedSubIds.has(s.id));
    const EXTRA_WORKBENCH_SLOTS = [
      { x: 270, y: 220, deskY: 236 },
      { x: 330, y: 220, deskY: 236 },
      { x: 500, y: 220, deskY: 236 },
      { x: 560, y: 220, deskY: 236 },
      { x: 270, y: 300, deskY: 316 },
      { x: 330, y: 300, deskY: 316 },
      { x: 500, y: 300, deskY: 316 },
      { x: 560, y: 300, deskY: 316 },
      { x: 270, y: 380, deskY: 396 },
      { x: 330, y: 380, deskY: 396 },
      { x: 500, y: 380, deskY: 396 },
      { x: 560, y: 380, deskY: 396 },
      { x: 96,  y: 250, deskY: 266 },
      { x: 736, y: 250, deskY: 266 },
      { x: 96,  y: 410, deskY: 426 },
      { x: 736, y: 410, deskY: 426 },
      { x: 270, y: 450, deskY: 466 },
      { x: 560, y: 450, deskY: 466 },
    ];

    extraSubagents.forEach((sub, idx) => {
      const slot = EXTRA_WORKBENCH_SLOTS[idx % EXTRA_WORKBENCH_SLOTS.length];
      const offsetX = Math.floor(idx / EXTRA_WORKBENCH_SLOTS.length) * 12;
      const posX = slot.x + offsetX;
      const posY = slot.y;

      // Add drafting desk furniture item
      const deskItem = {
        id: `interior-desk-${sub.id}`,
        type: 'craft_table',
        name: `Worktable: ${sub.agent || 'Subagent'}`,
        x: posX,
        y: slot.deskY,
        width: 38,
        height: 22,
        solid: true,
      };
      this.furniture.push(deskItem);

      // Add agent sprite
      const subSprite = new AgentSprite({
        id: `interior-sub-${sub.id}`,
        name: `${sub.agent || 'subagent'}: ${sub.model || 'model'}`,
        role: mapSubRole(sub.role || sub.agent),
        status: sub.is_active ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
        x: posX,
        y: posY,
        currentTask: sub.latestActivity || sub.recentTask || sub.title,
      });
      subSprite.subagentData = sub;
      this.agents.push(subSprite);
    });

    // Wall Hanging Lanterns (Warm ambient light)
    this.lightSources.push({ x: 260, y: 110, radius: 110, color: '#fef08a', flicker: true });
    this.lightSources.push({ x: 572, y: 110, radius: 110, color: '#fef08a', flicker: true });
  }

  updateSession(freshSession) {
    if (!freshSession) return;
    this.session = freshSession;
    this.hutName = freshSession.name || freshSession.title || 'Guild Workshop';

    const isSessionActive =
      freshSession.status === 'active' ||
      freshSession.is_active ||
      (freshSession.activeAgents && freshSession.activeAgents > 0);

    // Update Master Agent
    if (this.masterAgent) {
      const masterTask =
        freshSession.latestActivity ||
        freshSession.currentTask ||
        (isSessionActive ? 'Orchestrating session tasks' : 'Session idle');
      this.masterAgent.name = `Lead: ${freshSession.agent || 'Master'}`;
      this.masterAgent.status = isSessionActive ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE;
      this.masterAgent.currentTask = masterTask;
      this.masterAgent.subagentData = {
        id: freshSession.id,
        agent: freshSession.agent || 'team-lead',
        model: freshSession.model,
        role: 'master',
        is_active: isSessionActive,
        title: freshSession.title,
      };
    }

    const mapSubRole = (r = '') => {
      const s = (r || '').toLowerCase();
      if (s.includes('code') || s.includes('dev') || s.includes('build') || s.includes('forge'))
        return AGENT_ROLES.BUILD;
      if (s.includes('explore') || s.includes('research') || s.includes('doc') || s.includes('lib'))
        return AGENT_ROLES.EXPLORE;
      if (s.includes('review') || s.includes('qa') || s.includes('test') || s.includes('alchem'))
        return AGENT_ROLES.REVIEW;
      return AGENT_ROLES.TASK;
    };

    const subagents = freshSession.subagents || [];
    const assignedSubIds = new Set();

    const coderSub = subagents.find((s) => mapSubRole(s.role || s.agent) === AGENT_ROLES.BUILD);
    if (coderSub) assignedSubIds.add(coderSub.id);

    const exploreSub = subagents.find(
      (s) => !assignedSubIds.has(s.id) && mapSubRole(s.role || s.agent) === AGENT_ROLES.EXPLORE
    );
    if (exploreSub) assignedSubIds.add(exploreSub.id);

    const qaSub = subagents.find(
      (s) => !assignedSubIds.has(s.id) && mapSubRole(s.role || s.agent) === AGENT_ROLES.REVIEW
    );
    if (qaSub) assignedSubIds.add(qaSub.id);

    const taskSub = subagents.find((s) => !assignedSubIds.has(s.id));
    if (taskSub) assignedSubIds.add(taskSub.id);

    // Update Blacksmith
    if (this.blacksmith) {
      const coderName = coderSub
        ? `Coder: ${coderSub.model || coderSub.role || coderSub.agent}`
        : `Coder (${freshSession.model || 'Code'})`;
      const coderTask =
        coderSub?.latestActivity ||
        coderSub?.recentTask ||
        (isSessionActive ? 'Applying code edits & git commits' : 'Idle (waiting for code)');
      const isCoderWorking = coderSub ? coderSub.is_active : isSessionActive;
      this.blacksmith.name = coderName;
      this.blacksmith.status = isCoderWorking ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE;
      this.blacksmith.currentTask = coderTask;
      if (coderSub) this.blacksmith.subagentData = coderSub;
    }

    // Update Scholar
    if (this.scholar) {
      const exploreName = exploreSub
        ? `Explore: ${exploreSub.model || exploreSub.role || exploreSub.agent}`
        : `Research (${freshSession.model || 'Docs'})`;
      const exploreTask =
        exploreSub?.latestActivity ||
        exploreSub?.recentTask ||
        (isSessionActive ? 'Reading workspace files & symbols' : 'Idle (ready to explore)');
      const isExploreWorking = exploreSub ? exploreSub.is_active : isSessionActive;
      this.scholar.name = exploreName;
      this.scholar.status = isExploreWorking ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE;
      this.scholar.currentTask = exploreTask;
      if (exploreSub) this.scholar.subagentData = exploreSub;
    }

    // Update Alchemist
    if (this.alchemist) {
      const qaName = qaSub
        ? `QA: ${qaSub.model || qaSub.role || qaSub.agent}`
        : `Test & QA (${freshSession.model || 'Review'})`;
      const qaTask =
        qaSub?.latestActivity ||
        qaSub?.recentTask ||
        (isSessionActive ? 'Running verification & tests' : 'Idle (checks passing)');
      const isQaWorking = qaSub ? qaSub.is_active : isSessionActive;
      this.alchemist.name = qaName;
      this.alchemist.status = isQaWorking ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE;
      this.alchemist.currentTask = qaTask;
      if (qaSub) this.alchemist.subagentData = qaSub;
    }

    // Update Rogue
    if (this.rogue) {
      const taskName = taskSub ? `Task: ${taskSub.model || taskSub.role || taskSub.agent}` : 'Coordinator';
      const taskTask = taskSub?.latestActivity || taskSub?.recentTask || 'Managing task queue';
      const isTaskWorking = taskSub ? taskSub.is_active : false;
      this.rogue.name = taskName;
      this.rogue.status = isTaskWorking ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE;
      this.rogue.currentTask = taskTask;
      if (taskSub) this.rogue.subagentData = taskSub;
    }

    // Update extra workbench subagents
    const extraSubagents = subagents.filter((s) => !assignedSubIds.has(s.id));
    extraSubagents.forEach((sub) => {
      let subSprite = this.agents.find((a) => a.id === `interior-sub-${sub.id}`);
      if (subSprite) {
        subSprite.name = `${sub.agent || 'subagent'}: ${sub.model || 'model'}`;
        subSprite.status = sub.is_active ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE;
        subSprite.currentTask = sub.latestActivity || sub.recentTask || sub.title;
        subSprite.subagentData = sub;
      }
    });

    // Update stations active flag
    this.stations.forEach((s) => {
      if (s.id !== 'interior-notice-board') {
        s.active = isSessionActive;
      }
    });
  }

  isWalkable(x, y) {
    // Check outer wall bounds
    if (
      x < this.bounds.left ||
      x > this.bounds.right ||
      y < this.bounds.top ||
      y > this.bounds.bottom + 20
    ) {
      // Allow stepping into exit doorway
      if (
        x >= this.exitZone.x - this.exitZone.width / 2 &&
        x <= this.exitZone.x + this.exitZone.width / 2 &&
        y >= this.bounds.bottom &&
        y <= this.exitZone.y + 20
      ) {
        return true;
      }
      return false;
    }

    // Check collision with solid furniture
    for (const item of this.furniture) {
      const halfW = (item.width / 2) + 12;
      const halfH = (item.height / 2) + 8;
      if (
        x >= item.x - halfW &&
        x <= item.x + halfW &&
        y >= item.y - halfH &&
        y <= item.y + halfH
      ) {
        return false;
      }
    }

    return true;
  }

  isAtExit(playerX, playerY) {
    return (
      playerX >= this.exitZone.x - this.exitZone.width / 2 &&
      playerX <= this.exitZone.x + this.exitZone.width / 2 &&
      playerY >= this.exitZone.y - 10
    );
  }

  getStationAt(worldX, worldY) {
    for (const s of this.stations) {
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

  getAgentAt(worldX, worldY) {
    return this.agents.find(a => a.containsPoint(worldX, worldY)) || null;
  }

  update(dt, particleSystem = null) {
    this.animTime += dt;
    this.fireTimer += dt;

    // Update internal agents
    this.agents.forEach(a => a.update(dt));

    // Emit fireplace embers and smoke
    if (particleSystem && this.fireTimer > 0.15) {
      this.fireTimer = 0;
      // Embers
      particleSystem.emitForgeSparks(this.hearth.x + (Math.random() * 24 - 12), this.hearth.y + 12, 3);
      // Cauldron bubbles
      particleSystem.emitCauldronBubbles(672, 346, '#22c55e');
      // Scriptorium runes
      if (Math.random() < 0.4) {
        particleSystem.emitArcaneRune(672, 180, '#38bdf8');
      }
    }
  }

  render(ctx, player, hoveredStationId = null, selectedStationId = null) {
    ctx.save();

    // 1. Black Void Backdrop
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Stone & Timber Walls
    this.drawWalls(ctx);

    // 3. Parquet Hardwood Floor & Guild Crest Carpet
    this.drawFloor(ctx);

    // 4. Stained Glass Windows
    this.drawWindows(ctx);

    // 5. Fireplace & Hearth Fire
    this.drawFireplace(ctx);

    // 6. Furniture & Workstations (Background layer)
    this.drawFurnitureBase(ctx, hoveredStationId, selectedStationId);

    // 7. Y-Sorted Entities (Furniture tops, Agents, Player)
    const renderables = [];

    // Furniture tops
    this.furniture.forEach(item => {
      renderables.push({
        y: item.y + item.height / 2,
        render: (c) => this.drawFurnitureItem(c, item, hoveredStationId === item.id || selectedStationId === item.id),
      });
    });

    // Agents
    this.agents.forEach(agent => {
      renderables.push({
        y: agent.y,
        render: (c) => agent.render(c, false, false),
      });
    });

    // Player
    if (player) {
      renderables.push({
        y: player.y,
        render: (c) => player.render(c),
      });
    }

    renderables.sort((a, b) => a.y - b.y);
    renderables.forEach(item => item.render(ctx));

    // 8. Exit Doorway & Welcome Mat
    this.drawExitDoorway(ctx);

    // 9. Overhead Room Header Plaque
    this.drawRoomHeader(ctx);

    ctx.restore();
  }

  drawWalls(ctx) {
    const { left, right, top, bottom } = this.bounds;

    // Timber & Stone wall base
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(left - 32, top - 48, right - left + 64, 48);

    // Horizontal timber beams
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(left - 32, top - 48, right - left + 64, 8);
    ctx.fillRect(left - 32, top - 8, right - left + 64, 8);

    // Vertical structural log posts
    ctx.fillStyle = PALETTE.woodBase;
    for (let x = left - 32; x <= right + 32; x += 96) {
      ctx.fillRect(x, top - 48, 12, 48);
    }

    // Left and right side wall borders
    ctx.fillStyle = '#292524';
    ctx.fillRect(left - 32, top, 32, bottom - top + 32);
    ctx.fillRect(right, top, 32, bottom - top + 32);
  }

  drawFloor(ctx) {
    const { left, right, top, bottom } = this.bounds;

    // Polished Oak Parquet Wood Planks
    ctx.fillStyle = '#451a03';
    ctx.fillRect(left, top, right - left, bottom - top);

    // Parquet plank stripes
    ctx.fillStyle = '#78350f';
    for (let y = top; y < bottom; y += 32) {
      for (let x = left; x < right; x += 64) {
        const offset = ((y / 32) % 2 === 0) ? 0 : 32;
        ctx.fillRect(x + offset, y + 2, 30, 28);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(x + offset + 2, y + 4, 26, 2); // Highlight
        ctx.fillStyle = '#78350f';
      }
    }

    // Center Guild Crest Carpet
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2 + 30;
    const rw = 220;
    const rh = 130;

    // Carpet Shadow & Fringe
    ctx.fillStyle = '#7f1d1d'; // Crimson velvet rug
    ctx.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
    ctx.strokeStyle = '#f59e0b'; // Gold embroidered border
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - rw / 2 + 4, cy - rh / 2 + 4, rw - 8, rh - 8);

    // Inner gold crest rune
    ctx.fillStyle = '#fbbf24';
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️', cx, cy);
  }

  drawWindows(ctx) {
    const { left, right, top } = this.bounds;
    const winY = top - 36;

    // Left stained glass window
    this.drawStainedGlass(ctx, left + 64, winY);
    // Right stained glass window
    this.drawStainedGlass(ctx, right - 88, winY);
  }

  drawStainedGlass(ctx, x, y) {
    // Arch frame
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 2, y - 2, 28, 36);

    // Colored glowing glass
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(x, y, 12, 16);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 12, y, 12, 16);
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(x, y + 16, 12, 16);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x + 12, y + 16, 12, 16);

    // Window leaded cross
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x + 11, y, 2, 32);
    ctx.fillRect(x, y + 15, 24, 2);

    // Light shaft on floor
    ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x, y + 32);
    ctx.lineTo(x + 24, y + 32);
    ctx.lineTo(x + 64, y + 140);
    ctx.lineTo(x - 20, y + 140);
    ctx.closePath();
    ctx.fill();
  }

  drawFireplace(ctx) {
    const { x, y, width, height } = this.hearth;

    // Stone Chimney breast
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x - width / 2 - 4, y - 40, width + 8, height + 40);
    ctx.fillStyle = PALETTE.stoneBase;
    ctx.fillRect(x - width / 2, y - 36, width, height + 36);

    // Mantle piece (thick oak shelf)
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - width / 2 - 8, y - 8, width + 16, 12);
    ctx.fillStyle = PALETTE.woodHighlight;
    ctx.fillRect(x - width / 2 - 8, y - 8, width + 16, 3);

    // Mantle decorations (Brass clock, candle)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x - 6, y - 20, 12, 12); // Mantle clock
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x - 30, y - 18, 4, 10); // Candle
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(x - 29, y - 22, 2, 4);  // Flame

    // Firebox opening (Arch)
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(x - 28, y + 6, 56, 36);

    // Roaring burning logs & animated flames
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 22, y + 30, 44, 8); // Iron andirons & logs

    // Dancing fire flame
    const flicker1 = Math.sin(this.animTime * 16) * 4;
    const flicker2 = Math.cos(this.animTime * 20) * 3;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 34);
    ctx.lineTo(x - 4 + flicker1, y + 10);
    ctx.lineTo(x + 4 + flicker2, y + 8);
    ctx.lineTo(x + 18, y + 34);
    ctx.closePath();
    ctx.fill();

    // Hot golden core
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 34);
    ctx.lineTo(x + flicker1 * 0.5, y + 18);
    ctx.lineTo(x + 10, y + 34);
    ctx.closePath();
    ctx.fill();

    // Heraldry Banners on left and right of chimney
    this.drawHeraldryBanner(ctx, x - width / 2 - 46, y - 24, '#991b1b', '⚔️');
    this.drawHeraldryBanner(ctx, x + width / 2 + 16, y - 24, '#1e3a8a', '🛡️');
  }

  drawHeraldryBanner(ctx, x, y, color, icon) {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 2, y, 34, 4); // Banner rod

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x + 30, y + 4);
    ctx.lineTo(x + 30, y + 54);
    ctx.lineTo(x + 15, y + 42); // Swallowtail cut
    ctx.lineTo(x, y + 54);
    ctx.closePath();
    ctx.fill();

    // Gold trim
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Emblem
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + 15, y + 26);
  }

  drawFurnitureBase(ctx, hoveredId, selectedId) {
    // Furniture base shadows
    this.furniture.forEach(item => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(item.x, item.y + item.height / 2 + 4, item.width / 2 + 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Distinct glowing highlight on hover / select
      if (item.id === hoveredId || item.id === selectedId) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(
          item.x - item.width / 2 - 6,
          item.y - item.height / 2 - 6,
          item.width + 12,
          item.height + 12
        );
        ctx.setLineDash([]);
      }
    });
  }

  drawFurnitureItem(ctx, item, isHighlighted) {
    const { x, y } = item;

    switch (item.type) {
      case 'master_desk':
        this.drawMasterDesk(ctx, x, y, isHighlighted);
        break;
      case STATION_TYPES.FORGE:
        this.drawForgeWorkshop(ctx, x, y);
        break;
      case STATION_TYPES.LIBRARY:
        this.drawScriptoriumWorkshop(ctx, x, y);
        break;
      case STATION_TYPES.ALCHEMY:
        this.drawAlchemyWorkshop(ctx, x, y);
        break;
      case STATION_TYPES.NOTICE_BOARD:
        this.drawWallNoticeBoard(ctx, x, y);
        break;
      case STATION_TYPES.TREASURY:
        this.drawTreasuryVault(ctx, x, y);
        break;
      case 'messenger_desk':
        this.drawMessengerDesk(ctx, x, y);
        break;
      case 'craft_table':
        this.drawCraftTable(ctx, x, y);
        break;
    }

    if (isHighlighted) {
      this.drawTooltip(ctx, item);
    }
  }

  drawCraftTable(ctx, x, y) {
    // Sturdy wooden guild craft / drafting table
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 20, y - 10, 40, 20);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 18, y - 8, 36, 16);

    // Parchment scroll or blueprint
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x - 10, y - 5, 20, 10);

    // Little inkwell & quill
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 11, y - 6, 4, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 12, y - 9, 1, 3);
  }

  drawMasterDesk(ctx, x, y, isHighlighted) {
    // Heavy Carved Mahogany Desk
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 38, y - 18, 76, 36);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 36, y - 16, 72, 32);

    // Green felt blotter in center
    ctx.fillStyle = '#065f46';
    ctx.fillRect(x - 20, y - 12, 40, 24);

    // Glowing Mystic Scrying Orb on brass stand (Left)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x - 30, y - 6, 6, 6); // stand
    const orbGlow = Math.sin(this.animTime * 6) * 2;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x - 27, y - 8, 7 + orbGlow * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 29, y - 10, 2, 2);

    // Parchment maps & Brass inkpot (Right)
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x + 14, y - 8, 14, 10);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x + 22, y - 12, 2, 6); // red quill
  }

  drawForgeWorkshop(ctx, x, y) {
    // Stone Corner Hearth
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x - 36, y - 24, 32, 40);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(x - 30, y - 14, 20, 20); // coals
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x - 26, y - 10, 12, 12);

    // Heavy Iron Anvil on Tree Stump
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 6, y - 6, 26, 26);
    ctx.fillStyle = '#334155'; // Anvil
    ctx.fillRect(x + 4, y - 18, 30, 14);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x + 4, y - 18, 30, 3);

    // Glowing red-hot metal bar
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 12, y - 20, 14, 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 16, y - 20, 6, 1);

    // Quenching water tub
    ctx.fillStyle = PALETTE.woodBase;
    ctx.fillRect(x - 8, y + 8, 16, 16);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(x - 6, y + 10, 12, 12);
  }

  drawScriptoriumWorkshop(ctx, x, y) {
    // Twin Bookshelves against wall
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 34, y - 26, 68, 32);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 32, y - 24, 64, 28);

    // Books with colorful spines
    const bookColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = bookColors[i % bookColors.length];
      ctx.fillRect(x - 28 + i * 6, y - 22, 5, 24);
    }

    // Slanted Writing Lectern Desk
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 24, y + 8, 48, 18);

    // Open Glowing Grimoire
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x - 12, y + 2, 24, 12);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(x - 8, y + 6, 6, 2);
    ctx.fillRect(x + 2, y + 6, 6, 2);
  }

  drawAlchemyWorkshop(ctx, x, y) {
    // Heavy wooden lab bench
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 32, y - 10, 64, 28);

    // Glass Retort & Distillation Flasks
    ctx.fillStyle = '#10b981'; // Green bubbling flask
    ctx.beginPath();
    ctx.arc(x - 16, y - 4, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a855f7'; // Purple vial
    ctx.fillRect(x + 4, y - 12, 6, 14);

    ctx.fillStyle = '#ef4444'; // Red vial
    ctx.fillRect(x + 14, y - 10, 6, 12);

    // Glass Distillation Coil
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - 2, y - 6, 6, 0, Math.PI);
    ctx.stroke();

    // Mortar & Pestle
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x - 28, y + 2, 8, 6);
  }

  drawWallNoticeBoard(ctx, x, y) {
    // Cork board frame
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 26, y - 22, 52, 40);
    ctx.fillStyle = '#d4a373'; // Cork
    ctx.fillRect(x - 24, y - 20, 48, 36);

    // Pinned Bounty Scrolls
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x - 20, y - 16, 16, 12);
    ctx.fillRect(x + 2, y - 14, 16, 14);
    ctx.fillRect(x - 12, y + 2, 22, 10);

    // Red Wax Seals
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - 14, y - 16, 3, 3);
    ctx.fillRect(x + 8, y - 14, 3, 3);

    // Exclamation mark
    ctx.fillStyle = '#f59e0b';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('!', x, y - 26);
  }

  drawTreasuryVault(ctx, x, y) {
    // Heavy Iron Vault Chest
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x - 24, y - 16, 48, 30);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 22, y - 14, 44, 26);

    // Iron Banding & Rivets
    ctx.fillStyle = '#44403c';
    ctx.fillRect(x - 24, y - 16, 4, 30);
    ctx.fillRect(x + 20, y - 16, 4, 30);
    ctx.fillRect(x - 24, y - 2, 48, 3);

    // Gold Lock & Coins around base
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x - 3, y - 6, 6, 7);

    // Scattered gold coins
    ctx.fillRect(x - 28, y + 8, 4, 3);
    ctx.fillRect(x - 22, y + 10, 3, 3);
    ctx.fillRect(x + 22, y + 8, 4, 3);
  }

  drawMessengerDesk(ctx, x, y) {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x - 30, y - 16, 60, 32);
    ctx.fillStyle = PALETTE.woodBase;
    ctx.fillRect(x - 28, y - 14, 56, 28);

    // Pigeon / Raven cage
    ctx.fillStyle = '#475569';
    ctx.strokeRect(x - 24, y - 12, 16, 20);

    // Stacks of Parchment
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x + 4, y - 8, 18, 14);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x + 8, y - 4, 10, 2);
  }

  drawExitDoorway(ctx) {
    const { x, y, width, height } = this.exitZone;

    // Stone Threshold & Doorway frame
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x - width / 2 - 6, y - 8, width + 12, height + 8);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(x - width / 2, y - 4, width, height);

    // Woven Welcome Mat
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - width / 2 + 6, y + 2, width - 12, 18);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - width / 2 + 8, y + 4, width - 16, 14);

    // Exit Label
    ctx.fillStyle = '#fde047';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▼ EXIT TO VILLAGE', x, y + 11);
  }

  drawRoomHeader(ctx) {
    const x = this.width / 2;
    const y = 24;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const title = `🏰 ${this.hutName.toUpperCase()}`;
    ctx.font = '10px "Press Start 2P", monospace';
    const tw = ctx.measureText(title).width + 32;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x - tw / 2, y - 14, tw, 28);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - tw / 2, y - 14, tw, 28);

    ctx.fillStyle = '#fef3c7';
    ctx.fillText(title, x, y);

    ctx.restore();
  }

  drawTooltip(ctx, s) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    let action = '[SPACE / CLICK] Inspect';
    if (s.type === STATION_TYPES.FORGE) action = '[CLICK] Inspect Forge Diffs';
    else if (s.type === STATION_TYPES.LIBRARY) action = '[CLICK] Open Royal Scriptorium';
    else if (s.type === STATION_TYPES.ALCHEMY) action = '[CLICK] View Alchemical Tests';
    else if (s.type === STATION_TYPES.NOTICE_BOARD) action = '[CLICK] Inspect Bounty Board';
    else if (s.type === STATION_TYPES.TREASURY) action = '[CLICK] Inspect Treasury Vault';

    ctx.font = '8px "Press Start 2P", monospace';
    const textW = Math.max(ctx.measureText(s.name).width, ctx.measureText(action).width) + 20;
    const textH = 34;
    const bx = s.x - textW / 2;
    const by = s.y - s.height / 2 - 32;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(bx, by, textW, textH);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, textW, textH);

    ctx.fillStyle = '#fef3c7';
    ctx.fillText(s.name, s.x, by + 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(action, s.x, by + 26);

    ctx.restore();
  }

  getLightSources() {
    return this.lightSources;
  }
}

export default HouseInterior;
