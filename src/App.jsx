import React, { useState, useEffect, useCallback } from 'react';
import { RpgCanvas } from './engine/RpgCanvas.jsx';
import HUD from './components/HUD.jsx';
import HutModal from './components/HutModal.jsx';
import WorldSelectModal from './components/WorldSelectModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import ForgeModal from './components/ForgeModal.jsx';
import TreasuryModal from './components/TreasuryModal.jsx';
import RoyalScribeModal from './components/RoyalScribeModal.jsx';
import OverworldMapModal from './components/OverworldMapModal.jsx';
import DecreeQueueModal from './components/DecreeQueueModal.jsx';
import sound from './components/SoundEngine.js';

// Default / fallback projects if backend is offline or empty
const FALLBACK_PROJECTS = [
  {
    id: 'proj_opencode_rpg',
    name: 'opencode-rpg',
    worktree: '/home/hollen/Code/opencode-rpg',
    fantasyName: 'The Realm of OpenCode RPG',
    totalTokens: 142850,
    totalCost: 1.48,
    activeCount: 2,
    sessionCount: 4,
  },
  {
    id: 'proj_media_streamer',
    name: 'media-streamer',
    worktree: '/home/hollen/Code/media-streamer',
    fantasyName: 'Kingdom of Media Streamer',
    totalTokens: 384000,
    totalCost: 3.92,
    activeCount: 1,
    sessionCount: 5,
  },
  {
    id: 'proj_forgejo',
    name: 'forgejo-agent',
    worktree: '/home/hollen/Code/forgejo-agent',
    fantasyName: 'Duchy of Forgejo Citadel',
    totalTokens: 92400,
    totalCost: 0.95,
    activeCount: 0,
    sessionCount: 3,
  },
];

// Default / fallback sessions for initial view
const FALLBACK_SESSIONS = [
  {
    id: 'ses_main_guildhall',
    projectId: 'proj_opencode_rpg',
    title: 'Grand Guildhall Orchestration',
    slug: 'grand-guildhall',
    status: 'active',
    agent: 'Archmage Commander',
    model: 'Claude 3.7 Sonnet',
    cost: 0.65,
    tokens_input: 48200,
    tokens_output: 14500,
    tokens_reasoning: 9200,
    tokens_cache_read: 22000,
    time_created: Date.now() - 3600000 * 2,
    todos: [
      { id: 't1', content: 'Craft Retro 16-bit HUD Overlay and Character Sheet', status: 'completed', priority: 'high' },
      { id: 't2', content: 'Synthesize Pure Web Audio 8-bit sound chimes & fanfare', status: 'completed', priority: 'high' },
      { id: 't3', content: 'Connect real-time chronicle logs with alchemical tool traces', status: 'in_progress', priority: 'high' },
      { id: 't4', content: 'Polish dynamic village lighting and Day/Night cycle', status: 'pending', priority: 'medium' },
    ],
    subagents: [
      { id: 'sub-blacksmith', name: 'Groric Hammerfall', model: 'Qwen 2.5 Coder', tokens_input: 18000, tokens_output: 6200, status: 'active', cost: 0.18, currentTask: 'Hammering terminal commands' },
      { id: 'sub-scholar', name: 'Elaria Starweaver', model: 'Claude 3.5 Sonnet', tokens_input: 12000, tokens_output: 4100, status: 'active', cost: 0.22, currentTask: 'Deciphering AST parchment' },
    ],
  },
  {
    id: 'ses_code_smithy',
    projectId: 'proj_opencode_rpg',
    title: 'Code Smithy & Engine Tuning',
    slug: 'code-smithy',
    status: 'active',
    agent: 'Dwarf Blacksmith',
    model: 'Qwen 2.5 Coder 32B',
    cost: 0.42,
    tokens_input: 32000,
    tokens_output: 11200,
    tokens_reasoning: 4500,
    tokens_cache_read: 15400,
    time_created: Date.now() - 3600000 * 5,
    todos: [
      { id: 't5', content: 'Implement particle engine for chimney smoke and sparks', status: 'completed', priority: 'high' },
      { id: 't6', content: 'Calibrate smooth camera lerp & minimap navigation', status: 'completed', priority: 'medium' },
      { id: 't7', content: 'Forge interactive hitboxes for village stations', status: 'in_progress', priority: 'high' },
    ],
    subagents: [],
  },
  {
    id: 'ses_scriptorium',
    projectId: 'proj_opencode_rpg',
    title: 'Scriptorium & Documentation Archive',
    slug: 'royal-scriptorium',
    status: 'idle',
    agent: 'Elf Scholar',
    model: 'Claude 3.5 Haiku',
    cost: 0.18,
    tokens_input: 19500,
    tokens_output: 4800,
    tokens_reasoning: 1200,
    tokens_cache_read: 8200,
    time_created: Date.now() - 3600000 * 18,
    todos: [
      { id: 't8', content: 'Catalogue all agent roles in the Overseer Grimoire', status: 'completed', priority: 'medium' },
      { id: 't9', content: 'Draft spells reference for file and terminal actions', status: 'completed', priority: 'low' },
    ],
    subagents: [],
  },
  {
    id: 'ses_alchemy_lab',
    projectId: 'proj_opencode_rpg',
    title: 'Transmutation Lab & Test Crucible',
    slug: 'transmutation-lab',
    status: 'idle',
    agent: 'Alchemist Savant',
    model: 'DeepSeek R1',
    cost: 0.23,
    tokens_input: 24950,
    tokens_output: 7700,
    tokens_reasoning: 12400,
    tokens_cache_read: 6100,
    time_created: Date.now() - 3600000 * 36,
    todos: [
      { id: 't10', content: 'Run full test suite with coverage reporting', status: 'completed', priority: 'high' },
      { id: 't11', content: 'Analyze runtime memory leaks in canvas particle pool', status: 'completed', priority: 'medium' },
    ],
    subagents: [],
  },
];

const BIOMES_ORDER = ['forest', 'desert', 'snow', 'void'];

export default function App() {
  const [projects, setProjects] = useState(FALLBACK_PROJECTS);
  const [currentProject, setCurrentProject] = useState(FALLBACK_PROJECTS[0]);
  const [sessions, setSessions] = useState(FALLBACK_SESSIONS);
  const [selectedSession, setSelectedSession] = useState(null);

  // Modals & UI States
  const [isWorldSelectOpen, setIsWorldSelectOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isForgeOpen, setIsForgeOpen] = useState(false);
  const [isTreasuryOpen, setIsTreasuryOpen] = useState(false);
  const [isScribeOpen, setIsScribeOpen] = useState(false);
  const [isStargateOpen, setIsStargateOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Engine, Biome & Audio
  const [currentBiome, setCurrentBiome] = useState('forest');
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isCrtActive, setIsCrtActive] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  const currentProjectRef = React.useRef(currentProject);
  currentProjectRef.current = currentProject;
  const selectedSessionRef = React.useRef(selectedSession);
  selectedSessionRef.current = selectedSession;

  // 1. Fetch Projects from Backend
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch realms');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.projects || [];
      if (list.length > 0) {
        setProjects(list);
        if (!currentProjectRef.current || !list.find((p) => p.id === currentProjectRef.current.id)) {
          setCurrentProject(list[0]);
        }
      }
    } catch {
      // Backend not yet ready; retain fallback projects
    }
  }, []);

  // 2. Fetch Sessions for Current Project (supports silent real-time refresh)
  const fetchSessions = useCallback(async (projectId, silent = false) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/sessions`);
      if (!res.ok) throw new Error('Failed to fetch project sessions');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.sessions || [];
      if (list.length > 0) {
        setSessions(list);
        if (selectedSessionRef.current) {
          const fresh = list.find((s) => s.id === selectedSessionRef.current.id);
          if (fresh) {
            setSelectedSession(fresh);
          }
        }
      }
    } catch {
      // Backend not yet ready; retain fallback sessions
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (currentProject?.id) {
      fetchSessions(currentProject.id);
    }
  }, [currentProject?.id, fetchSessions]);

  // Periodic background sync (every 2.5s) guarantees real-time accuracy even without manual refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentProjectRef.current?.id) {
        fetchSessions(currentProjectRef.current.id, true);
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [fetchSessions]);

  // 3. Connect to SSE Live Events Stream
  useEffect(() => {
    let evtSource = null;
    try {
      evtSource = new EventSource('/api/events');

      evtSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'world_updated' || payload.type === 'session_updated') {
            if (currentProjectRef.current?.id) {
              fetchSessions(currentProjectRef.current.id, true);
            }
          }
          handleLiveEvent(payload);
        } catch {}
      };

      evtSource.addEventListener('world_updated', () => {
        if (currentProjectRef.current?.id) {
          fetchSessions(currentProjectRef.current.id, true);
        }
      });

      evtSource.addEventListener('session_updated', () => {
        if (currentProjectRef.current?.id) {
          fetchSessions(currentProjectRef.current.id, true);
        }
      });

      evtSource.addEventListener('tool_call', (e) => {
        try {
          sound.playHammer();
        } catch {}
      });

      evtSource.addEventListener('quest_completed', (e) => {
        try {
          sound.playFanfare();
        } catch {}
      });

      evtSource.onerror = () => {
        // SSE connection dropped; will auto reconnect
      };
    } catch {}

    return () => {
      if (evtSource) evtSource.close();
    };
  }, [fetchSessions]);

  // Handle live event mutations
  const handleLiveEvent = (event) => {
    if (!event) return;

    if (event.type === 'session_updated' && event.session) {
      setSessions((prev) =>
        prev.map((s) => (s.id === event.session.id ? { ...s, ...event.session } : s))
      );
      if (selectedSessionRef.current?.id === event.session.id) {
        setSelectedSession((prev) => ({ ...prev, ...event.session }));
      }
    }
  };

  // Switch Realm / Project
  const handleSelectProject = useCallback((project) => {
    setCurrentProject(project);
    fetchSessions(project.id);
  }, [fetchSessions]);

  // Inspect Hut / Session
  const handleSelectHut = useCallback((sessionOrHut) => {
    const sess = sessionOrHut?.session || sessionOrHut;
    if (sess) {
      setSelectedSession(sess);
    }
  }, []);

  // Handle Agent Selection
  const handleSelectAgent = useCallback((agent, hutSession) => {
    if (hutSession) {
      setSelectedSession(hutSession);
    }
  }, []);

  // Handle Open Stargate
  const handleOpenStargate = useCallback(() => {
    setIsStargateOpen(true);
  }, []);

  // Handle Station Click
  const handleSelectStation = useCallback((station, hutSession) => {
    if (!station) return;
    const sType = typeof station === 'string' ? station : station.type || '';
    if (sType === 'forge') {
      sound.playHammer();
      setSelectedSession(hutSession || sessions[0]);
      setIsForgeOpen(true);
    } else if (sType === 'treasury') {
      sound.playCoin();
      setIsTreasuryOpen(true);
    } else if (sType === 'library' || sType === 'alchemy') {
      sound.playScroll();
      setSelectedSession(hutSession || sessions[0]);
      setIsScribeOpen(true);
    } else if (sType === 'messenger_desk' || sType === 'messenger') {
      sound.playClick();
      setSelectedSession(hutSession || sessions[0]);
      setIsQueueOpen(true);
    } else if (sType === 'stargate') {
      sound.playDhdClick();
      setIsStargateOpen(true);
    } else if (hutSession) {
      setSelectedSession(hutSession);
    }
  }, [sessions]);

  // Cycle Biomes
  const handleCycleBiome = () => {
    const currentIdx = BIOMES_ORDER.indexOf(currentBiome);
    const nextIdx = (currentIdx + 1) % BIOMES_ORDER.length;
    setCurrentBiome(BIOMES_ORDER[nextIdx]);
  };

  // Toggle Chiptune BGM
  const handleToggleBgm = () => {
    const nowPlaying = sound.toggleBgm();
    setIsBgmPlaying(nowPlaying);
  };

  // Day/Night toggle updates BGM theme
  const handleToggleNight = () => {
    const nextNight = !isNightMode;
    setIsNightMode(nextNight);
    sound.setBgmTheme(nextNight ? 'night' : 'day');
  };

  // Filter sessions according to HUD search / status
  const visibleSessions = sessions.filter((s) => {
    if (statusFilter === 'active' && s.status !== 'active' && s.time_archived) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (s.title || '').toLowerCase().includes(q);
      const matchSlug = (s.slug || '').toLowerCase().includes(q);
      const matchAgent = (s.agent || '').toLowerCase().includes(q);
      return matchTitle || matchSlug || matchAgent;
    }
    return true;
  });

  const activeModalSession = selectedSession || sessions[0] || FALLBACK_SESSIONS[0];

  // Derive Single-GPU Status
  const activeWorkingCount = sessions.filter(
    (s) => s.status === 'active' || s.is_active || (s.activeAgents && s.activeAgents > 0)
  ).length;
  const gpuStatus = activeWorkingCount > 0 ? 'busy' : 'idle';
  const activeSessionItem =
    sessions.find((s) => s.status === 'active' || s.is_active) || sessions[0];
  const activeAgentTask = activeSessionItem?.currentTask || activeSessionItem?.title || '';

  return (
    <div className={`relative w-screen h-screen overflow-hidden bg-stone-950 font-sans ${isCrtActive ? 'crt-overlay' : ''}`}>
      {/* HUD Top Bar Overlay */}
      <HUD
        currentProject={currentProject}
        projects={projects}
        sessions={sessions}
        onOpenWorldSelect={() => setIsWorldSelectOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenForge={() => setIsForgeOpen(true)}
        onOpenTreasury={() => setIsTreasuryOpen(true)}
        onOpenScribe={() => setIsScribeOpen(true)}
        onOpenStargate={() => setIsStargateOpen(true)}
        onOpenQueue={() => setIsQueueOpen(true)}
        gpuStatus={gpuStatus}
        onSelectSession={(s) => setSelectedSession(s)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        isMuted={isMuted}
        onToggleMute={() => {
          const next = sound.toggleMute();
          setIsMuted(next);
        }}
        isBgmPlaying={isBgmPlaying}
        onToggleBgm={handleToggleBgm}
        isCrtActive={isCrtActive}
        onToggleCrt={() => setIsCrtActive(!isCrtActive)}
        isNightMode={isNightMode}
        onToggleNight={handleToggleNight}
        currentBiome={currentBiome}
        onCycleBiome={handleCycleBiome}
      />

      {/* 2D Retro RPG Canvas Viewport */}
      <div className="absolute inset-0 z-0">
        <RpgCanvas
          sessions={visibleSessions}
          selectedSessionId={selectedSession?.id}
          onSelectHut={handleSelectHut}
          onSelectAgent={handleSelectAgent}
          onSelectStation={handleSelectStation}
          onOpenStargate={handleOpenStargate}
          timePreset={isNightMode ? 'night' : 'day'}
          biome={currentBiome}
          showMinimap={true}
          showControls={true}
        />
      </div>

      {/* Hut & Agent Inspector Modal */}
      {selectedSession && !isForgeOpen && !isTreasuryOpen && !isScribeOpen && !isStargateOpen && !isQueueOpen && (
        <HutModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Station Modal: Forge (Code & Diffs) */}
      {isForgeOpen && (
        <ForgeModal
          session={activeModalSession}
          onClose={() => setIsForgeOpen(false)}
        />
      )}

      {/* Station Modal: Treasury (Mana & Gold Analytics) */}
      {isTreasuryOpen && (
        <TreasuryModal
          project={currentProject}
          sessions={sessions}
          onClose={() => setIsTreasuryOpen(false)}
        />
      )}

      {/* Station Modal: Royal Scribe Scroll */}
      {isScribeOpen && (
        <RoyalScribeModal
          session={activeModalSession}
          onClose={() => setIsScribeOpen(false)}
        />
      )}

      {/* Stargate Command / Galactic Overworld Map */}
      {isStargateOpen && (
        <OverworldMapModal
          projects={projects}
          currentProject={currentProject}
          onSelectProject={handleSelectProject}
          onClose={() => setIsStargateOpen(false)}
        />
      )}

      {/* Single-GPU Smart Decree Queue Modal */}
      {isQueueOpen && (
        <DecreeQueueModal
          session={activeModalSession}
          sessions={sessions}
          gpuStatus={gpuStatus}
          activeAgentTask={activeAgentTask}
          onClose={() => setIsQueueOpen(false)}
        />
      )}

      {/* World / Realm Selector Modal */}
      {isWorldSelectOpen && (
        <WorldSelectModal
          projects={projects}
          currentProject={currentProject}
          currentBiome={currentBiome}
          onSelectBiome={(biome) => setCurrentBiome(biome)}
          onSelectProject={handleSelectProject}
          onClose={() => setIsWorldSelectOpen(false)}
        />
      )}

      {/* Overseer Grimoire / Help Modal */}
      {isHelpOpen && (
        <HelpModal onClose={() => setIsHelpOpen(false)} />
      )}
    </div>
  );
}
