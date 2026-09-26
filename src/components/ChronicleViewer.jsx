import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  FileCode,
  Sparkles,
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowUp,
  Filter,
  Scroll,
  MessageSquare,
  Zap,
  Code2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import sound from './SoundEngine';
import { getToolSpell, formatRelativeTime } from '../utils/rpgHelpers';

export default function ChronicleViewer({ session }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'user', 'reasoning', 'tool', 'assistant'
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedThoughts, setExpandedThoughts] = useState({});

  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  // Fetch session logs
  const fetchLogs = async () => {
    if (!session?.id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${session.id}/logs`);
      if (!res.ok) {
        throw new Error(`Failed to consult chronicle (Status ${res.status})`);
      }
      const data = await res.json();
      const rawLogs = Array.isArray(data) ? data : data.logs || data.messages || [];
      const normalized = normalizeLogs(rawLogs);
      setLogs(normalized);
    } catch (err) {
      // If endpoint is not ready or returns 404, fallback to session's existing messages or demo chronicle
      if (session.messages && session.messages.length > 0) {
        setLogs(normalizeLogs(session.messages));
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [session?.id]);

  // Auto-scroll when logs change
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Helper to normalize diverse OpenCode log shapes
  function normalizeLogs(raw) {
    const list = [];

    raw.forEach((item, idx) => {
      // 1. Direct Part format
      if (item.type || item.data) {
        const d = typeof item.data === 'string' ? safeJsonParse(item.data) : item.data || item;
        list.push({
          id: item.id || `log-${idx}`,
          timestamp: item.time_created || item.timestamp || Date.now(),
          ...d,
        });
        return;
      }

      // 2. Message format with role and parts
      if (item.role) {
        const msgRole = item.role;
        const msgTime = item.time_created || item.timestamp || Date.now();
        const parts = item.parts || [];

        if (parts.length > 0) {
          parts.forEach((p, pIdx) => {
            const partData = typeof p.data === 'string' ? safeJsonParse(p.data) : p.data || p;
            list.push({
              id: p.id || `${item.id}-p${pIdx}`,
              timestamp: p.time_created || msgTime,
              role: msgRole,
              ...partData,
            });
          });
        } else {
          list.push({
            id: item.id || `msg-${idx}`,
            timestamp: msgTime,
            role: msgRole,
            type: msgRole === 'user' ? 'user_prompt' : 'text',
            text: item.text || item.content || '',
          });
        }
      }
    });

    return list;
  }

  function safeJsonParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return { text: str };
    }
  }

  // Filter logs by search and type
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // Type filter
      if (typeFilter === 'user' && item.role !== 'user' && item.type !== 'user_prompt') return false;
      if (typeFilter === 'reasoning' && item.type !== 'reasoning') return false;
      if (typeFilter === 'tool' && item.type !== 'tool') return false;
      if (typeFilter === 'assistant' && (item.type !== 'text' || item.role === 'user')) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = item.text && item.text.toLowerCase().includes(q);
        const reasoningMatch = item.reasoning && item.reasoning.toLowerCase().includes(q);
        const toolMatch =
          item.tool &&
          (item.tool.toLowerCase().includes(q) ||
            JSON.stringify(item.state || {}).toLowerCase().includes(q));
        return textMatch || reasoningMatch || toolMatch;
      }

      return true;
    });
  }, [logs, typeFilter, searchQuery]);

  const toggleThought = (id) => {
    sound.playClick();
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    sound.playBlip(750, 0.08);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const scrollToBottom = () => {
    sound.playClick();
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    sound.playClick();
    logsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-[650px] max-h-[75vh]">
      {/* Top Chronicle Toolbar */}
      <div className="bg-stone-900/90 border-2 border-stone-800 p-3 rounded-t-lg space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Title & Stats */}
          <div className="flex items-center gap-2">
            <Scroll className="w-4 h-4 text-amber-400" />
            <span className="font-medieval text-lg text-amber-200 font-bold">
              The Chronicle of Invocations
            </span>
            <span className="text-[11px] font-pixel text-stone-500 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
              {logs.length} scrolls recorded
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                fetchLogs();
              }}
              disabled={loading}
              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-pixel rounded border border-stone-700 flex items-center gap-1.5 transition-colors"
              title="Refresh Chronicle"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setAutoScroll(!autoScroll);
              }}
              className={`px-2 py-1 text-xs font-pixel rounded border flex items-center gap-1.5 transition-colors ${
                autoScroll
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                  : 'bg-stone-950 text-stone-500 border-stone-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-amber-400 animate-ping' : 'bg-stone-600'}`} />
              <span>Auto-Follow</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Type Filter Chips */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stone-800/80">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scrolls, spells, errors, runes..."
              className="w-full bg-stone-950 border border-stone-700/80 rounded pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Scrolls' },
              { id: 'user', label: '👑 Decrees' },
              { id: 'reasoning', label: '✦ Arcane' },
              { id: 'tool', label: '⚡ Spells' },
              { id: 'assistant', label: '💬 Dialogue' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  sound.playClick();
                  setTypeFilter(f.id);
                }}
                className={`px-2.5 py-1 text-[11px] font-pixel rounded whitespace-nowrap transition-all ${
                  typeFilter === f.id
                    ? 'bg-amber-800 text-amber-100 border border-amber-500'
                    : 'bg-stone-950/80 text-stone-400 border border-stone-800 hover:text-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chronicle Stream Container */}
      <div
        ref={logsContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-950/90 border-x-2 border-b-2 border-stone-800 relative"
      >
        {loading && logs.length === 0 ? (
          <div className="py-20 text-center text-amber-400 font-pixel text-xs animate-pulse">
            Consulting the ancient chronicle annals...
          </div>
        ) : error && logs.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="font-medieval text-amber-300 text-lg">No chronicle recorded yet</div>
            <div className="text-xs text-stone-500 font-sans">
              As the agent begins forging code and pondering quests, the history will be inscribed here.
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-stone-500 font-medieval text-base">
            No chronicle records match the selected decree query.
          </div>
        ) : (
          filteredLogs.map((entry, idx) => {
            const isUser = entry.role === 'user' || entry.type === 'user_prompt';
            const isReasoning = entry.type === 'reasoning';
            const isTool = entry.type === 'tool';
            const isAssistant = !isUser && !isReasoning && !isTool;

            // 1. USER PROMPT / ROYAL DECREE
            if (isUser) {
              const textContent = entry.text || entry.content || '';
              return (
                <div
                  key={entry.id || idx}
                  className="scroll-paper rounded-lg p-4 border-2 border-amber-700 shadow-md relative overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-amber-800/40 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📜</span>
                      <div>
                        <div className="font-medieval font-bold text-amber-950 text-sm">
                          Royal Commissioner's Decree
                        </div>
                        <div className="text-[10px] text-amber-800/80 font-sans">
                          {formatRelativeTime(entry.timestamp)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(textContent, entry.id)}
                      className="text-amber-900/80 hover:text-amber-950 p-1 rounded hover:bg-amber-700/10"
                      title="Copy Decree"
                    >
                      {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-medieval text-stone-900 text-sm whitespace-pre-wrap leading-relaxed select-text">
                    {textContent}
                  </div>
                </div>
              );
            }

            // 2. REASONING / ARCANE CONTEMPLATION
            if (isReasoning) {
              const thoughtText = entry.text || entry.reasoning || '';
              const isExpanded = !!expandedThoughts[entry.id || idx];
              const preview = thoughtText.slice(0, 160) + (thoughtText.length > 160 ? '...' : '');

              return (
                <div
                  key={entry.id || idx}
                  className="bg-indigo-950/30 border border-indigo-500/40 rounded-lg p-3 relative shadow-inner"
                >
                  <div
                    onClick={() => toggleThought(entry.id || idx)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span className="font-medieval text-indigo-300 font-semibold text-xs">
                        Arcane Contemplation (Inner Monologue)
                      </span>
                      <span className="text-[9px] font-pixel text-indigo-400/80 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-700/50">
                        {thoughtText.length} runes
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                      <span className="font-pixel text-[10px]">
                        {isExpanded ? 'Fold' : 'Reveal'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Thought Body */}
                  <div className="mt-2 text-xs font-mono text-indigo-200/90 leading-relaxed border-t border-indigo-900/50 pt-2 select-text">
                    {isExpanded ? (
                      <div className="whitespace-pre-wrap max-h-96 overflow-y-auto pr-2">
                        {thoughtText}
                      </div>
                    ) : (
                      <div className="italic text-stone-400 text-[11px] line-clamp-2">
                        "{preview}"
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // 3. TOOL INVOCATION / ALCHEMICAL SPELL
            if (isTool) {
              const toolName = entry.tool || 'spell';
              const spell = getToolSpell(toolName);
              const toolState = entry.state || {};
              const input = toolState.input || entry.input || {};
              const output = toolState.output || entry.output || '';
              const isCompleted = toolState.status === 'completed' || !!output;
              const isError = toolState.status === 'error';

              const commandStr = input.command || input.path || input.file_path || input.query || (typeof input === 'string' ? input : JSON.stringify(input));
              const outputStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2);

              return (
                <div
                  key={entry.id || idx}
                  className="bg-stone-900/95 border-2 border-stone-800 rounded-lg overflow-hidden shadow-lg"
                >
                  {/* Spell Header */}
                  <div className="bg-stone-950/90 px-3 py-2 border-b border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{spell.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medieval font-bold text-amber-300 text-xs">
                            {spell.spellName}
                          </span>
                          <span className="text-[10px] font-pixel text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                            {toolName}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 font-sans">
                          {formatRelativeTime(entry.timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isError ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-pixel bg-red-950 border border-red-700 text-red-300">
                          CURSED / FAILED
                        </span>
                      ) : isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-pixel bg-emerald-950 border border-emerald-700 text-emerald-300">
                          SUCCESSFUL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-pixel bg-amber-950 border border-amber-600 text-amber-300 animate-pulse">
                          IN PROGRESS
                        </span>
                      )}

                      <button
                        onClick={() => copyToClipboard(commandStr, `cmd-${entry.id || idx}`)}
                        className="text-stone-400 hover:text-stone-200 p-1 rounded hover:bg-stone-800"
                        title="Copy Invocation"
                      >
                        {copiedId === `cmd-${entry.id || idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Input / Command Display */}
                  {commandStr && (
                    <div className="p-3 bg-stone-950 font-code text-xs text-amber-200 border-b border-stone-800/80 flex items-start gap-2 select-text overflow-x-auto">
                      <span className="text-emerald-400 font-bold select-none">$</span>
                      <pre className="whitespace-pre-wrap font-code flex-1">{commandStr}</pre>
                    </div>
                  )}

                  {/* Output Display */}
                  {outputStr && (
                    <div className="p-3 bg-[#0d0d0d] font-code text-[11px] text-stone-300 max-h-64 overflow-y-auto select-text leading-relaxed">
                      <pre className="whitespace-pre-wrap">{outputStr}</pre>
                    </div>
                  )}
                </div>
              );
            }

            // 4. ASSISTANT RESPONSE / DIALOGUE BOX
            const assistantText = entry.text || entry.content || '';
            if (!assistantText) return null;

            return (
              <div
                key={entry.id || idx}
                className="bg-stone-900/90 border border-amber-900/60 rounded-lg p-3.5 shadow-md flex items-start gap-3 select-text"
              >
                {/* Avatar Portrait */}
                <div className="w-10 h-10 rounded bg-stone-950 border border-amber-600/70 flex items-center justify-center text-xl shrink-0">
                  🧙‍♂️
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-cinzel font-bold text-amber-300 text-xs">
                        Archmage Chronicler
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(assistantText, `ast-${entry.id || idx}`)}
                      className="text-stone-400 hover:text-stone-200 p-1 rounded hover:bg-stone-800"
                      title="Copy Response"
                    >
                      {copiedId === `ast-${entry.id || idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="font-sans text-xs text-stone-200 whitespace-pre-wrap leading-relaxed">
                    {assistantText}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Floating Jump Controls */}
      <div className="absolute bottom-5 right-6 flex flex-col gap-1.5 z-20">
        <button
          onClick={scrollToTop}
          className="p-2 bg-stone-900/90 hover:bg-stone-800 text-stone-300 rounded border border-stone-700 shadow-md transition-all hover:scale-105"
          title="Scroll to Top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={scrollToBottom}
          className="p-2 bg-stone-900/90 hover:bg-stone-800 text-stone-300 rounded border border-stone-700 shadow-md transition-all hover:scale-105"
          title="Scroll to Bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
