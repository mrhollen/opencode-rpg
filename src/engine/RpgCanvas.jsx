// RpgCanvas.jsx - Primary React Canvas Component for the 2D Retro Pixel RPG Engine

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera } from './Camera.js';
import { TileMap } from './TileMap.js';
import { HutRenderer } from './HutRenderer.js';
import { StationRenderer } from './StationRenderer.js';
import { AgentSprite } from './AgentSprite.js';
import { PlayerAvatar } from './PlayerAvatar.js';
import { CourierApprentice } from './CourierApprentice.js';
import { HouseInterior } from './HouseInterior.js';
import { StargatePortal } from './StargatePortal.js';
import { ParticleSystem } from './ParticleSystem.js';
import { DayNightCycle } from './DayNightCycle.js';
import { Lighting } from './Lighting.js';
import { Minimap } from './Minimap.js';
import {
  AGENT_ROLES,
  AGENT_STATUSES,
  STATION_TYPES,
  BIOMES,
  BIOME_CONFIGS,
} from './Constants.js';
import sound from '../components/SoundEngine.js';

export function RpgCanvas({
  sessions = [],
  selectedSessionId = null,
  onSelectHut = null,
  onSelectAgent = null,
  onSelectStation = null,
  onHoverHut = null,
  onOpenStargate = null,
  onExitInterior = null,
  timePreset = null,
  biome = 'forest',
  showMinimap = true,
  showControls = true,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [currentBiome, setCurrentBiome] = useState(biome || BIOMES.FOREST);

  // Engine systems persistent refs
  const engineRef = useRef({
    camera: null,
    tileMap: null,
    hutRenderer: null,
    stationRenderer: null,
    agents: [],
    player: null,
    courier: null,
    stargate: null,
    activeView: 'exterior', // 'exterior' | 'interior'
    currentHutInterior: null,
    lastExteriorPos: { x: 1024, y: 1050 },
    hoveredStargate: false,
    particles: null,
    dayNight: null,
    lighting: null,
    minimap: null,
    biome: biome || BIOMES.FOREST,
    keysDown: {},
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    hoveredHut: null,
    hoveredStation: null,
    hoveredAgent: null,
    selectedStation: null,
    selectedAgent: null,
    fps: 60,
    frameCount: 0,
    lastFpsUpdate: 0,
    isMuted: false,
  });

  const [hudState, setHudState] = useState({
    timeString: '12:00 PM [DAY]',
    phase: 'day',
    fps: 60,
    zoom: 1.0,
    isFollowingPlayer: true,
    isMuted: false,
    biome: biome || BIOMES.FOREST,
    activeView: 'exterior',
  });

  // Cycle through 4 world biomes
  const cycleBiome = useCallback(() => {
    const biomeList = [BIOMES.FOREST, BIOMES.DESERT, BIOMES.SNOW, BIOMES.VOID];
    const currentIndex = biomeList.indexOf(engineRef.current.biome);
    const nextBiome = biomeList[(currentIndex + 1) % biomeList.length];

    engineRef.current.biome = nextBiome;
    engineRef.current.tileMap?.setBiome(nextBiome);
    setCurrentBiome(nextBiome);
    setHudState(prev => ({ ...prev, biome: nextBiome }));
    sound.playFanfare();
  }, []);

  // Update biome if prop changes
  useEffect(() => {
    if (biome && engineRef.current.tileMap && engineRef.current.biome !== biome) {
      engineRef.current.biome = biome;
      engineRef.current.tileMap.setBiome(biome);
      setCurrentBiome(biome);
      setHudState(prev => ({ ...prev, biome }));
    }
  }, [biome]);

  // Transition into House Interior View
  const enterHouseInterior = useCallback((hutSession) => {
    const engine = engineRef.current;
    if (!hutSession) return;

    engine.lastExteriorPos = { x: engine.player.x, y: engine.player.y };
    engine.currentHutInterior = new HouseInterior(hutSession);
    engine.activeView = 'interior';

    // Position player just inside the room near entrance rug
    engine.player.x = 416;
    engine.player.y = 480;
    engine.player.vx = 0;
    engine.player.vy = 0;
    engine.player.facing = 'up';
    engine.player.clearMoveTarget();

    // Center camera on room
    engine.camera.unfollow();
    engine.camera.centerOn(416, 288, true);
    engine.camera.setZoom(1.15, true);

    setHudState(prev => ({ ...prev, activeView: 'interior', isFollowingPlayer: false }));
    sound.playDoorOpen();
  }, []);

  // Transition back to Village Exterior View
  const exitHouseInterior = useCallback(() => {
    const engine = engineRef.current;
    engine.activeView = 'exterior';
    engine.currentHutInterior = null;

    // Return player to outside hut entrance
    engine.player.x = engine.lastExteriorPos.x;
    engine.player.y = engine.lastExteriorPos.y + 16;
    engine.player.vx = 0;
    engine.player.vy = 0;
    engine.player.facing = 'down';
    engine.player.clearMoveTarget();

    engine.camera.follow(engine.player);
    engine.camera.setZoom(1.0);

    setHudState(prev => ({ ...prev, activeView: 'exterior', isFollowingPlayer: true }));
    sound.playDoorClose();
    if (onExitInterior) onExitInterior();
  }, [onExitInterior]);

  // Expose global helper for automated testing and shortcuts
  useEffect(() => {
    window.__enterFirstHutInterior = () => {
      const hut = engineRef.current.hutRenderer?.getHuts()[0];
      if (hut) enterHouseInterior(hut.session || hut);
    };
    window.__exitHouseInterior = exitHouseInterior;
    return () => {
      delete window.__enterFirstHutInterior;
      delete window.__exitHouseInterior;
    };
  }, [enterHouseInterior, exitHouseInterior]);


  // 1. Initialize Engine Systems on Mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    const engine = engineRef.current;
    engine.camera = new Camera(width, height);
    engine.tileMap = new TileMap(engine.biome);
    engine.hutRenderer = new HutRenderer();
    engine.stationRenderer = new StationRenderer();
    engine.particles = new ParticleSystem(450);
    engine.dayNight = new DayNightCycle(240); // 4-minute full cycle
    engine.lighting = new Lighting(width, height);
    engine.minimap = new Minimap(140);
    engine.player = new PlayerAvatar(engine.tileMap.centerX, engine.tileMap.centerY + 50);
    engine.courier = new CourierApprentice(engine.tileMap.centerX, engine.tileMap.centerY + 70);

    // Iconic Stargate on the Stone Dais North of the central plaza
    engine.stargate = new StargatePortal(engine.tileMap.centerX, engine.tileMap.centerY - 260);

    // Initial camera centers on player
    engine.camera.follow(engine.player);

    if (timePreset) {
      engine.dayNight.setTimePreset(timePreset);
    }

    // Populate initial huts, stations, and agents
    refreshWorldEntities(sessions);

    // Setup input listeners
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      engine.keysDown[e.code] = true;

      // Space or E: Proximity Inspection / Enter Trigger
      if (e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        const p = engine.player;

        if (engine.activeView === 'interior' && engine.currentHutInterior) {
          // If at door exit rug
          if (engine.currentHutInterior.isAtExit(p.x, p.y)) {
            exitHouseInterior();
            return;
          }
          // Inspect workstation inside room
          const station = engine.currentHutInterior.getStationAt(p.x, p.y);
          if (station) {
            sound.playScroll();
            if (onSelectStation) {
              onSelectStation(station.type, engine.currentHutInterior.session, station);
            }
            return;
          }
          // Talk to agent inside room
          const agent = engine.currentHutInterior.getAgentAt(p.x, p.y);
          if (agent) {
            sound.playClick();
            if (onSelectAgent) onSelectAgent(agent, engine.currentHutInterior.session);
            return;
          }
        } else {
          // Exterior Proximity

          // 1. Dial Stargate if near portal / DHD
          if (engine.stargate?.isNear(p.x, p.y, 85)) {
            engine.stargate.dial(() => {
              if (onOpenStargate) onOpenStargate();
            });
            return;
          }

          // 2. Enter House Interior if near hut entrance
          if (p.nearbyHut) {
            enterHouseInterior(p.nearbyHut.session || p.nearbyHut);
            return;
          }

          // 3. Inspect Station
          if (p.nearbyStation) {
            sound.playScroll();
            engine.selectedStation = p.nearbyStation;
            if (onSelectStation) {
              onSelectStation(p.nearbyStation.type, getHutSession(p.nearbyStation.hutId), p.nearbyStation);
            }
            return;
          }

          // 4. Talk to Agent
          if (p.nearbyAgent) {
            sound.playClick();
            engine.selectedAgent = p.nearbyAgent;
            if (onSelectAgent) onSelectAgent(p.nearbyAgent, getHutSession(p.nearbyAgent.hutId));
            return;
          }
        }
      }

      // Hotkey ESC or Backspace: Exit Interior View
      if ((e.code === 'Escape' || e.code === 'Backspace') && engine.activeView === 'interior') {
        exitHouseInterior();
        return;
      }

      // Hotkey G: Dial Stargate (Travel to Realm)
      if (e.code === 'KeyG' && engine.activeView === 'exterior') {
        engine.stargate?.dial(() => {
          if (onOpenStargate) onOpenStargate();
        });
      }

      // Hotkey B: Cycle Biome
      if (e.code === 'KeyB') {
        cycleBiome();
      }

      // Hotkey T: Cycle Time
      if (e.code === 'KeyT') {
        cycleTime();
      }

      // Hotkey F: Center camera on Player
      if (e.code === 'KeyF') {
        toggleFollowPlayer();
      }

      // Hotkey M: Mute
      if (e.code === 'KeyM') {
        toggleMute();
      }

      // Hotkeys + / - : Zoom
      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        engine.camera.setZoom(engine.camera.targetZoom * 1.2);
      }
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        engine.camera.setZoom(engine.camera.targetZoom * 0.83);
      }
      if (e.code === 'Digit0') {
        engine.camera.setZoom(1.0);
      }
    };

    const handleKeyUp = (e) => {
      engine.keysDown[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          canvas.width = w;
          canvas.height = h;
          engine.camera.resize(w, h);
          engine.lighting.resize(w, h);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 2. Start Animation Loop
    let animationFrameId;
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      update(dt, currentTime);
      render();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver.disconnect();
    };
  }, [cycleBiome, enterHouseInterior, exitHouseInterior, onOpenStargate, onSelectAgent, onSelectHut, onSelectStation]);

  // Update world entities when sessions prop changes
  useEffect(() => {
    refreshWorldEntities(sessions);
  }, [sessions]);

  // Center camera on selected hut if selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId || !engineRef.current.hutRenderer) return;
    const huts = engineRef.current.hutRenderer.getHuts();
    const targetHut = huts.find(h => h.id === selectedSessionId || (h.session && h.session.id === selectedSessionId));
    if (targetHut && engineRef.current.activeView === 'exterior') {
      engineRef.current.camera.unfollow();
      engineRef.current.camera.centerOn(targetHut.x, targetHut.y);
      setHudState(prev => ({ ...prev, isFollowingPlayer: false }));
    }
  }, [selectedSessionId]);

  const getHutSession = (hutId) => {
    const hut = engineRef.current.hutRenderer?.getHuts().find(h => h.id === hutId);
    return hut ? (hut.session || hut) : null;
  };

  const refreshWorldEntities = (sessionList) => {
    const engine = engineRef.current;
    if (!engine.hutRenderer || !engine.stationRenderer) return;

    // Layout Huts
    const huts = engine.hutRenderer.layoutHuts(sessionList, engine.tileMap.centerX, engine.tileMap.centerY);

    // Layout Workstations
    const stations = engine.stationRenderer.generateStationsForHuts(huts);

    // Populate Agents for each hut & station
    const newAgents = [];

    huts.forEach(hut => {
      newAgents.push(
        new AgentSprite({
          id: `${hut.id}-master`,
          name: `${hut.name} (Overseer)`,
          role: AGENT_ROLES.MASTER,
          status: hut.active ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
          hutId: hut.id,
          x: hut.doorX - 28,
          y: hut.doorY + 12,
          currentTask: hut.active ? 'Orchestrating subagents & goals...' : 'Resting in guild sanctum',
        })
      );

      const forge = stations.find(s => s.hutId === hut.id && s.type === STATION_TYPES.FORGE);
      if (forge) {
        newAgents.push(
          new AgentSprite({
            id: `${hut.id}-builder`,
            name: 'Groric Hammerfall',
            role: AGENT_ROLES.BUILD,
            status: hut.active ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
            hutId: hut.id,
            stationId: forge.id,
            x: forge.x + 18,
            y: forge.y,
            currentTask: hut.active ? 'Forging AST code modifications...' : 'Maintaining anvil & tongs',
          })
        );
      }

      const library = stations.find(s => s.hutId === hut.id && s.type === STATION_TYPES.LIBRARY);
      if (library) {
        newAgents.push(
          new AgentSprite({
            id: `${hut.id}-scholar`,
            name: 'Sylas Moonwhisper',
            role: AGENT_ROLES.EXPLORE,
            status: hut.active ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
            hutId: hut.id,
            stationId: library.id,
            x: library.x - 16,
            y: library.y + 4,
            currentTask: hut.active ? 'Querying symbol definitions...' : 'Filing project parchments',
          })
        );
      }

      const alchemy = stations.find(s => s.hutId === hut.id && s.type === STATION_TYPES.ALCHEMY);
      if (alchemy) {
        newAgents.push(
          new AgentSprite({
            id: `${hut.id}-alchemist`,
            name: 'Valen Fizzlewick',
            role: AGENT_ROLES.REVIEW,
            status: hut.active ? AGENT_STATUSES.WORKING : AGENT_STATUSES.IDLE,
            hutId: hut.id,
            stationId: alchemy.id,
            x: alchemy.x + 14,
            y: alchemy.y + 2,
            currentTask: hut.active ? 'Brewing regression test suite...' : 'Distilling potion reagents',
          })
        );
      }

      const board = stations.find(s => s.hutId === hut.id && s.type === STATION_TYPES.NOTICE_BOARD);
      if (board) {
        newAgents.push(
          new AgentSprite({
            id: `${hut.id}-rogue`,
            name: 'Pip Swiftfoot',
            role: AGENT_ROLES.TASK,
            status: AGENT_STATUSES.IDLE,
            hutId: hut.id,
            stationId: board.id,
            x: board.x - 14,
            y: board.y + 6,
            currentTask: 'Inspecting pending quest scrolls',
          })
        );
      }
    });

    engine.agents = newAgents;
  };

  // --- Main Engine Update ---
  const update = (dt, currentTime) => {
    const engine = engineRef.current;

    if (engine.activeView === 'interior' && engine.currentHutInterior) {
      // 1. UPDATE INTERIOR SCENE
      engine.currentHutInterior.update(dt, engine.particles);
      engine.player.update(
        dt,
        engine.keysDown,
        engine.currentHutInterior,
        [],
        engine.currentHutInterior.agents,
        engine.currentHutInterior.stations
      );

      // Check auto exit if walking down onto doorway rug
      if (engine.currentHutInterior.isAtExit(engine.player.x, engine.player.y) && engine.player.vy > 0) {
        exitHouseInterior();
        return;
      }

      engine.particles.update(dt);
      engine.dayNight.update(dt);
      engine.lighting.update(dt);
      engine.camera.update(dt);
    } else {
      // 2. UPDATE EXTERIOR VILLAGE SCENE
      const {
        tileMap,
        player,
        courier,
        stargate,
        hutRenderer,
        stationRenderer,
        agents,
        particles,
        dayNight,
        lighting,
        camera,
        minimap,
        keysDown,
      } = engine;

      if (!tileMap || !player) return;

      const huts = hutRenderer.getHuts();
      const stations = stationRenderer.getStations();

      tileMap.update(dt, particles);
      player.update(dt, keysDown, tileMap, huts, agents, stations);

      // Update Stargate Portal
      if (stargate) {
        stargate.update(dt, particles);
        engine.hoveredStargate = stargate.isNear(player.x, player.y, 85);
      }

      // Auto enter interior if walking directly into hut door
      for (const hut of huts) {
        const distToDoor = Math.hypot(player.x - hut.doorX, player.y - hut.doorY);
        if (distToDoor < 18 && player.vy < 0) {
          enterHouseInterior(hut.session || hut);
          return;
        }
      }

      if (courier) {
        courier.update(dt, huts, tileMap, particles);
      }

      hutRenderer.update(dt, particles);
      stationRenderer.update(dt, particles);
      agents.forEach(agent => agent.update(dt));
      particles.update(dt);
      dayNight.update(dt);
      lighting.update(dt);

      if (dayNight.getPhase() === 'night' && Math.random() < 0.15) {
        const bounds = camera.getVisibleBounds(40);
        const fx = bounds.left + Math.random() * (bounds.right - bounds.left);
        const fy = bounds.top + Math.random() * (bounds.bottom - bounds.top);
        particles.emitFirefly(fx, fy);
      }

      camera.update(dt);
      minimap.update(dt);
      minimap.updatePosition(canvasRef.current.width, canvasRef.current.height, 'bottom-right');
    }

    // Periodic HUD Updates (every 300ms)
    engine.frameCount++;
    if (currentTime - engine.lastFpsUpdate > 300) {
      const currentFps = Math.round((engine.frameCount * 1000) / (currentTime - engine.lastFpsUpdate));
      engine.fps = currentFps;
      engine.frameCount = 0;
      engine.lastFpsUpdate = currentTime;

      setHudState(prev => ({
        ...prev,
        timeString: engine.dayNight.getTimeString(),
        phase: engine.dayNight.getPhase(),
        fps: currentFps,
        zoom: Math.round(engine.camera.zoom * 100) / 100,
        isFollowingPlayer: !!engine.camera.target,
        isMuted: sound.isMuted(),
        biome: engine.biome,
        activeView: engine.activeView,
      }));
    }
  };

  // --- Main Engine Render ---
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    const engine = engineRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (engine.activeView === 'interior' && engine.currentHutInterior) {
      // 1. RENDER HOUSE INTERIOR
      engine.camera.apply(ctx);

      engine.currentHutInterior.render(
        ctx,
        engine.player,
        engine.hoveredStation?.id,
        engine.selectedStation?.id
      );

      engine.particles.render(ctx);
      engine.camera.restore(ctx);

      // Interior Atmospheric Lighting (Fireplace + Lanterns)
      const interiorLightSources = [
        ...engine.currentHutInterior.getLightSources(),
        {
          x: engine.player.x,
          y: engine.player.y - 10,
          radius: 95,
          color: '#fed7aa',
          flicker: true,
        },
      ];
      engine.lighting.render(ctx, engine.camera, engine.dayNight, interiorLightSources);

    } else {
      // 2. RENDER EXTERIOR VILLAGE
      engine.camera.apply(ctx);
      const visibleBounds = engine.camera.getVisibleBounds(80);

      // A. Ground
      engine.tileMap.renderGround(ctx, visibleBounds);

      // B. Stargate Portal Dais & Ring
      if (engine.stargate) {
        engine.stargate.render(ctx, engine.hoveredStargate);
      }

      // C. Huts
      engine.hutRenderer.render(ctx, selectedSessionId, engine.hoveredHut?.id);

      // D. Stations
      engine.stationRenderer.render(ctx, engine.selectedStation?.id, engine.hoveredStation?.id);

      // E. Depth-Sorted Entities Pass (Scenery + Agents + Courier + Player)
      const renderables = [];

      engine.tileMap.scenery.forEach(item => {
        if (
          item.x + 40 >= visibleBounds.left &&
          item.x - 40 <= visibleBounds.right &&
          item.y + 40 >= visibleBounds.top &&
          item.y - 40 <= visibleBounds.bottom
        ) {
          renderables.push({
            y: item.y,
            render: (c) => engine.tileMap.renderSceneryItem(c, item),
          });
        }
      });

      engine.agents.forEach(agent => {
        if (
          agent.x + 30 >= visibleBounds.left &&
          agent.x - 30 <= visibleBounds.right &&
          agent.y + 30 >= visibleBounds.top &&
          agent.y - 30 <= visibleBounds.bottom
        ) {
          renderables.push({
            y: agent.y,
            render: (c) => agent.render(c, engine.selectedAgent?.id === agent.id, engine.hoveredAgent?.id === agent.id),
          });
        }
      });

      if (engine.courier) {
        renderables.push({
          y: engine.courier.y,
          render: (c) => engine.courier.render(c, false, engine.hoveredAgent?.id === 'courier'),
        });
      }

      renderables.push({
        y: engine.player.y,
        render: (c) => engine.player.render(c),
      });

      renderables.sort((a, b) => a.y - b.y);
      renderables.forEach(item => item.render(ctx));

      // F. Particles
      engine.particles.render(ctx, visibleBounds);

      engine.camera.restore(ctx);

      // Atmospheric Lighting Pass
      const lightSources = [];
      engine.tileMap.getLightSources().forEach(ls => lightSources.push(ls));
      engine.hutRenderer.getHuts().forEach(h => {
        if (h.active) {
          lightSources.push({
            x: h.x,
            y: h.y + 10,
            radius: 120,
            color: '#fbbf24',
            flicker: true,
          });
        }
      });
      engine.stationRenderer.getLightSources().forEach(ls => lightSources.push(ls));
      if (engine.stargate) {
        engine.stargate.getLightSources().forEach(ls => lightSources.push(ls));
      }
      lightSources.push({
        x: engine.player.x,
        y: engine.player.y - 10,
        radius: 110,
        color: '#fed7aa',
        flicker: true,
      });

      engine.lighting.render(ctx, engine.camera, engine.dayNight, lightSources);

      // Screen-space Minimap
      if (showMinimap) {
        engine.minimap.render(ctx, engine.camera, engine.player, engine.hutRenderer.getHuts(), engine.agents, engine.biome, engine.courier);
      }
    }
  };

  // --- Mouse & Gesture Interactions ---
  const handleMouseDown = (e) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Interior Mouse Interactions
    if (engine.activeView === 'interior' && engine.currentHutInterior) {
      if (e.button === 0) {
        const worldPos = engine.camera.screenToWorld(mouseX, mouseY);

        // Check if clicked an Interior Station
        const station = engine.currentHutInterior.getStationAt(worldPos.x, worldPos.y);
        if (station) {
          sound.playScroll();
          engine.selectedStation = station;
          if (onSelectStation) {
            onSelectStation(station.type, engine.currentHutInterior.session, station);
          }
          return;
        }

        // Check if clicked an Interior Agent
        const agent = engine.currentHutInterior.getAgentAt(worldPos.x, worldPos.y);
        if (agent) {
          sound.playClick();
          engine.selectedAgent = agent;
          if (onSelectAgent) {
            onSelectAgent(agent, engine.currentHutInterior.session);
          }
          return;
        }

        // Check if clicked exit mat
        if (engine.currentHutInterior.isAtExit(worldPos.x, worldPos.y)) {
          exitHouseInterior();
          return;
        }

        // Move Player inside room
        engine.player.moveTo(worldPos.x, worldPos.y);
        sound.playClick();
      }
      return;
    }

    // Exterior Mouse Interactions
    if (showMinimap && engine.minimap.containsPoint(mouseX, mouseY)) {
      const teleportPos = engine.minimap.handleClick(
        mouseX,
        mouseY,
        engine.camera,
        engine.player,
        engine.particles
      );
      sound.playPortal();
      setHudState(prev => ({ ...prev, isFollowingPlayer: true }));
      return;
    }

    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      engine.isDragging = true;
      engine.dragStart = { x: mouseX, y: mouseY };
      engine.camera.unfollow();
      setHudState(prev => ({ ...prev, isFollowingPlayer: false }));
      return;
    }

    if (e.button === 0) {
      const worldPos = engine.camera.screenToWorld(mouseX, mouseY);

      // 1. Check if clicked Stargate Portal / DHD (Dial Stargate!)
      if (engine.stargate && engine.stargate.containsPoint(worldPos.x, worldPos.y)) {
        engine.stargate.dial(() => {
          if (onOpenStargate) onOpenStargate();
        });
        return;
      }

      // 2. Check if clicked Courier Apprentice
      if (engine.courier && engine.courier.containsPoint(worldPos.x, worldPos.y)) {
        sound.playBlip(720, 0.08);
        engine.courier.speech = 'Courier Pip here! Delivering scrolls across the realm! 🏃📜';
        engine.courier.speechTimer = 3.5;
        return;
      }

      // 3. Check if clicked a Station
      const clickedStation = engine.stationRenderer.getStationAt(worldPos.x, worldPos.y);
      if (clickedStation) {
        sound.playScroll();
        engine.selectedStation = clickedStation;
        if (onSelectStation) {
          onSelectStation(clickedStation.type, getHutSession(clickedStation.hutId), clickedStation);
        }
        return;
      }

      // 4. Check if clicked an Agent
      const clickedAgent = engine.agents.find(a => a.containsPoint(worldPos.x, worldPos.y));
      if (clickedAgent) {
        sound.playClick();
        engine.selectedAgent = clickedAgent;
        if (onSelectAgent) {
          onSelectAgent(clickedAgent, getHutSession(clickedAgent.hutId));
        }
        return;
      }

      // 5. Check if clicked a Hut (Walks inside the house!)
      const clickedHut = engine.hutRenderer.getHutAt(worldPos.x, worldPos.y);
      if (clickedHut) {
        enterHouseInterior(clickedHut.session || clickedHut);
        return;
      }

      // 6. Otherwise Click-to-Move Player
      engine.player.moveTo(worldPos.x, worldPos.y);
      sound.playClick();
    }
  };

  const handleMouseMove = (e) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (engine.isDragging) {
      const dx = mouseX - engine.dragStart.x;
      const dy = mouseY - engine.dragStart.y;
      engine.camera.pan(dx, dy);
      engine.dragStart = { x: mouseX, y: mouseY };
      return;
    }

    const worldPos = engine.camera.screenToWorld(mouseX, mouseY);

    if (engine.activeView === 'interior' && engine.currentHutInterior) {
      engine.hoveredStation = engine.currentHutInterior.getStationAt(worldPos.x, worldPos.y) || null;
      engine.hoveredAgent = engine.currentHutInterior.getAgentAt(worldPos.x, worldPos.y) || null;
      canvas.style.cursor = (engine.hoveredStation || engine.hoveredAgent || engine.currentHutInterior.isAtExit(worldPos.x, worldPos.y)) ? 'pointer' : 'default';
      return;
    }

    const prevHoveredHut = engine.hoveredHut;
    engine.hoveredHut = engine.hutRenderer?.getHutAt(worldPos.x, worldPos.y) || null;
    if (engine.hoveredHut !== prevHoveredHut && onHoverHut) {
      onHoverHut(engine.hoveredHut ? (engine.hoveredHut.session || engine.hoveredHut) : null);
    }

    engine.hoveredStation = engine.stationRenderer?.getStationAt(worldPos.x, worldPos.y) || null;
    engine.hoveredAgent = engine.agents.find(a => a.containsPoint(worldPos.x, worldPos.y)) || null;

    const isHoveringStargate = engine.stargate && engine.stargate.containsPoint(worldPos.x, worldPos.y);
    engine.hoveredStargate = isHoveringStargate;

    if (
      engine.hoveredHut ||
      engine.hoveredStation ||
      engine.hoveredAgent ||
      isHoveringStargate ||
      (engine.courier && engine.courier.containsPoint(worldPos.x, worldPos.y)) ||
      (showMinimap && engine.minimap?.containsPoint(mouseX, mouseY))
    ) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
  };

  const handleMouseUp = () => {
    engineRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    engineRef.current.camera.zoomAt(e.deltaY, mouseX, mouseY);
  };

  // --- HUD Control Helpers ---
  const toggleFollowPlayer = () => {
    const engine = engineRef.current;
    if (engine.camera.target) {
      engine.camera.unfollow();
      setHudState(prev => ({ ...prev, isFollowingPlayer: false }));
    } else {
      engine.camera.follow(engine.player);
      sound.playFanfare();
      setHudState(prev => ({ ...prev, isFollowingPlayer: true }));
    }
  };

  const cycleTime = () => {
    const engine = engineRef.current;
    const currentPhase = engine.dayNight.getPhase();
    const nextPhase = {
      day: 'dusk',
      dusk: 'night',
      night: 'dawn',
      dawn: 'day',
    }[currentPhase];

    engine.dayNight.setTimePreset(nextPhase);
    sound.playBlip(700, 0.05);
  };

  const toggleMute = () => {
    const muted = sound.toggleMute();
    setHudState(prev => ({ ...prev, isMuted: muted }));
  };

  const zoomIn = () => {
    engineRef.current.camera.setZoom(engineRef.current.camera.targetZoom * 1.25);
    sound.playClick();
  };

  const zoomOut = () => {
    engineRef.current.camera.setZoom(engineRef.current.camera.targetZoom * 0.8);
    sound.playClick();
  };

  const resetZoom = () => {
    engineRef.current.camera.setZoom(1.0);
    sound.playClick();
  };

  const currentBiomeConfig = BIOME_CONFIGS[currentBiome] || BIOME_CONFIGS[BIOMES.FOREST];
  const isInterior = hudState.activeView === 'interior';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-stone-950 font-pixel"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* HTML5 Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Top HUD: Time of Day, Biome, Stargate, Controls */}
      {showControls && (
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* If inside house: Leave Workshop Button */}
          {isInterior ? (
            <button
              onClick={exitHouseInterior}
              title="Exit Workshop and return to the Village [Hotkey: ESC / Backspace]"
              className="pixel-btn px-3 py-1.5 text-[9px] flex items-center gap-1.5 cursor-pointer shadow-lg bg-amber-950/90 border-amber-600 text-amber-200"
            >
              <span>🚪</span>
              <span>Exit to Village</span>
            </button>
          ) : (
            <>
              {/* Stargate Dial Button */}
              <button
                onClick={() => {
                  engineRef.current.stargate?.dial(() => {
                    if (onOpenStargate) onOpenStargate();
                  });
                }}
                title="Dial the Ancient Stargate to travel between realms [Hotkey: G]"
                className="pixel-btn px-2.5 py-1.5 text-[9px] flex items-center gap-1.5 cursor-pointer shadow-lg bg-sky-950/80 border-sky-600 text-sky-200 hover:bg-sky-900"
              >
                <span>🌀</span>
                <span>Stargate Network</span>
              </button>

              {/* Biome Switcher */}
              <button
                onClick={cycleBiome}
                title="Switch Realm Biome (Forest, Desert, Snow, Void) [Hotkey: B]"
                className="pixel-btn px-2.5 py-1.5 text-[9px] flex items-center gap-1.5 cursor-pointer shadow-lg bg-emerald-950/80 border-emerald-700 hover:bg-emerald-900"
              >
                <span>{currentBiomeConfig.icon}</span>
                <span>{currentBiomeConfig.name}</span>
              </button>
            </>
          )}

          {/* Time Badge & Toggle */}
          <button
            onClick={cycleTime}
            title="Click to cycle time of day (Day, Dusk, Night, Dawn) [Hotkey: T]"
            className="pixel-btn px-2.5 py-1.5 text-[9px] flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <span>{hudState.phase === 'night' ? '🌙' : (hudState.phase === 'dusk' ? '🌅' : '☀️')}</span>
            <span>{hudState.timeString}</span>
          </button>

          {/* Follow Player Toggle */}
          <button
            onClick={toggleFollowPlayer}
            title="Focus and follow Overseer player [Hotkey: F]"
            className={`pixel-btn px-2.5 py-1.5 text-[9px] flex items-center gap-1.5 cursor-pointer shadow-lg ${
              hudState.isFollowingPlayer ? 'bg-amber-800 text-amber-200' : 'opacity-70'
            }`}
          >
            <span>🎯</span>
            <span>{hudState.isFollowingPlayer ? 'Following' : 'Free Cam'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            title="Toggle Retro 8-bit Sound Effects [Hotkey: M]"
            className="pixel-btn px-2 py-1.5 text-[9px] cursor-pointer"
          >
            {hudState.isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      )}

      {/* Top-Right HUD: Zoom Controls & Performance */}
      {showControls && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-auto">
          <div className="bg-stone-900/80 border border-stone-700 px-2 py-1 text-[8px] text-stone-300">
            {hudState.fps} FPS | {Math.round(hudState.zoom * 100)}%
          </div>
          <button
            onClick={zoomIn}
            title="Zoom In [+]"
            className="pixel-btn px-2 py-1 text-[9px] cursor-pointer"
          >
            +
          </button>
          <button
            onClick={zoomOut}
            title="Zoom Out [-]"
            className="pixel-btn px-2 py-1 text-[9px] cursor-pointer"
          >
            -
          </button>
          <button
            onClick={resetZoom}
            title="Reset Zoom [0]"
            className="pixel-btn px-2 py-1 text-[8px] cursor-pointer"
          >
            1:1
          </button>
        </div>
      )}

      {/* Bottom-Left Controls Guide Overlay */}
      {showControls && (
        <div className="absolute bottom-3 left-3 bg-stone-950/85 border border-stone-800 p-2.5 text-[8px] text-stone-300 pointer-events-none rounded shadow-2xl backdrop-blur-sm max-w-xs">
          <div className="text-amber-400 font-bold mb-1 tracking-wider">
            {isInterior ? 'WORKSHOP INTERIOR CONTROLS' : 'OVERSEER CONTROLS'}
          </div>
          <div className="space-y-0.5 text-stone-400">
            <div><span className="text-stone-200 font-mono">WASD / Arrows</span>: Walk Overseer</div>
            <div><span className="text-stone-200 font-mono">Click Ground</span>: Move To</div>
            {isInterior ? (
              <>
                <div><span className="text-stone-200 font-mono">Space / E</span>: Inspect Desk / Forge</div>
                <div><span className="text-stone-200 font-mono">ESC / Step on Rug</span>: Exit to Village</div>
              </>
            ) : (
              <>
                <div><span className="text-stone-200 font-mono">Click Minimap</span>: Teleport Player ⚡</div>
                <div><span className="text-stone-200 font-mono">Space / E</span>: Enter Hut / Dial Gate</div>
                <div><span className="text-stone-200 font-mono">G</span>: Dial Stargate Network 🌀</div>
                <div><span className="text-stone-200 font-mono">B</span>: Switch Biome ({currentBiomeConfig.name})</div>
              </>
            )}
            <div><span className="text-stone-200 font-mono">Scroll</span>: Zoom In / Out</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RpgCanvas;
