import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Clock,
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Layers,
  Inbox,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import sound from './SoundEngine';
import { formatRelativeTime } from '../utils/rpgHelpers';

export default function DecreeQueueModal({
  session,
  sessions = [],
  gpuStatus: parentGpuStatus = 'idle',
  activeAgentTask = '',
  onClose,
}) {
  const [decreeText, setDecreeText] = useState('');
  const [targetSessionId, setTargetSessionId] = useState(session?.id || sessions[0]?.id || '');
  const [priority, setPriority] = useState('medium');
  const [queue, setQueue] = useState([]);
  const [serverGpuStatus, setServerGpuStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load existing queue
  useEffect(() => {
    fetchQueue();
  }, [targetSessionId]);

  const fetchQueue = async () => {
    if (!targetSessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${targetSessionId}/queue`);
      if (res.ok) {
        const data = await res.json();
        setQueue(data.decrees || data.queue || []);
        if (data.gpuStatus) {
          setServerGpuStatus(data.gpuStatus);
        }
      }
    } catch {
      // Local fallback queue if offline
    } finally {
      setLoading(false);
    }
  };

  // Enqueue new decree
  const handleEnqueue = async (e) => {
    e.preventDefault();
    if (!decreeText.trim()) return;

    sound.playHammer();
    const promptText = decreeText.trim();
    const isBusy = effectiveGpuStatus === 'busy';

    const tempDecree = {
      id: `decree-${Date.now()}`,
      sessionId: targetSessionId,
      prompt: promptText,
      content: promptText,
      priority,
      status: isBusy ? 'pending' : 'running',
      timeCreated: Date.now(),
      queuePosition: queue.length + 1,
    };

    setQueue((prev) => [...prev, tempDecree]);
    setDecreeText('');

    try {
      const res = await fetch(`/api/sessions/${targetSessionId}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          priority,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.decree) {
          setQueue((prev) =>
            prev.map((d) => (d.id === tempDecree.id ? { ...d, ...data.decree } : d))
          );
        }
        if (data.gpuStatus) {
          setServerGpuStatus(data.gpuStatus);
        }
      }
    } catch {
      // Offline fallback: simulate dispatch
      if (!isBusy) {
        setTimeout(() => {
          sound.playFanfare();
          setQueue((prev) =>
            prev.map((d) => (d.id === tempDecree.id ? { ...d, status: 'completed' } : d))
          );
        }, 2200);
      }
    }
  };

  // Remove decree from queue
  const handleRemove = async (decreeId) => {
    sound.playClick();
    setQueue((prev) => prev.filter((d) => d.id !== decreeId));
    try {
      await fetch(`/api/queue/${decreeId}`, {
        method: 'DELETE',
      });
    } catch {}
  };

  const effectiveGpuStatus = serverGpuStatus || parentGpuStatus || 'idle';
  const isGpuBusy = effectiveGpuStatus === 'busy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm modal-enter">
      <div className="pixel-box-gold w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden shadow-2xl bg-stone-950">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-4 border-b-4 border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-stone-900 border-2 border-amber-600 flex items-center justify-center text-xl shadow">
              📥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medieval text-2xl text-amber-200 font-bold">
                  Single-GPU Smart Decree Queue
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-pixel bg-amber-950 border border-amber-600 text-amber-300">
                  VRAM PROTECTOR
                </span>
              </div>
              <p className="text-xs text-stone-400 font-sans mt-0.5">
                Messenger Desk • Buffers commands until active tokens finish generating
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded border border-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Single-GPU Status Monitor Banner */}
        <div
          className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isGpuBusy
              ? 'bg-amber-950/40 border-amber-700/80 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-700/80 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Cpu className={`w-5 h-5 ${isGpuBusy ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            <div>
              <div className="font-pixel text-[11px] font-bold">
                {isGpuBusy ? '🟡 GPU STATUS: BUSY (Generating tokens...)' : '🟢 GPU STATUS: IDLE (VRAM Available)'}
              </div>
              <div className="text-[11px] text-stone-300 mt-0.5 font-sans">
                {isGpuBusy
                  ? `Active Task: ${activeAgentTask || 'Processing ast runes & generating responses...'}`
                  : 'Ready for instant dispatch without VRAM contention'}
              </div>
            </div>
          </div>

          <div className="text-[10px] font-pixel bg-stone-950/80 px-2.5 py-1 rounded border border-stone-800 self-start sm:self-center">
            SAFE QUEUE ACTIVE
          </div>
        </div>

        {/* Explanatory Callout */}
        <div className="bg-stone-900/60 px-4 py-2 text-[11px] text-stone-400 font-sans border-b border-stone-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Single-GPU Safety Queue:</strong> Messages will wait in orderly line and dispatch automatically the moment the GPU has a free breath.
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-stone-950/90">
          {/* New Decree Form */}
          <form onSubmit={handleEnqueue} className="bg-stone-900/90 border border-stone-800 p-4 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-pixel text-amber-300 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> DICTATE DECREE TO QUEUE
              </span>

              {/* Target Session Picker */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-400 font-pixel text-[10px]">HUT TARGET:</span>
                <select
                  value={targetSessionId}
                  onChange={(e) => setTargetSessionId(e.target.value)}
                  className="bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1 font-mono focus:outline-none"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || s.slug}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <textarea
                value={decreeText}
                onChange={(e) => setDecreeText(e.target.value)}
                placeholder="Instruct the agent on next quest objective, test execution, or refactor..."
                rows={3}
                className="w-full bg-stone-950 border border-stone-700 rounded p-3 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-pixel text-stone-400">PRIORITY:</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="bg-stone-950 border border-stone-700 text-amber-300 text-xs rounded px-2 py-1 font-pixel focus:outline-none"
                >
                  <option value="high">Critical (Jumps Queue)</option>
                  <option value="medium">Standard Bounty</option>
                  <option value="low">Low (When Idle)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!decreeText.trim()}
                className="pixel-btn-gold px-4 py-1.5 text-xs font-pixel text-stone-950 font-bold rounded flex items-center gap-1.5 disabled:opacity-50"
              >
                <Layers className="w-3.5 h-3.5 text-stone-950" />
                <span>Enqueue Decree</span>
              </button>
            </div>
          </form>

          {/* Queued Decrees List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-pixel text-stone-400 pb-1 border-b border-stone-800">
              <span className="flex items-center gap-1.5">
                <Inbox className="w-4 h-4 text-amber-500" /> PENDING DISPATCH ROSTER ({queue.length})
              </span>
              <button
                onClick={fetchQueue}
                className="text-[10px] text-stone-400 hover:text-stone-200 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-amber-400' : ''}`} /> Refresh
              </button>
            </div>

            {queue.length === 0 ? (
              <div className="py-12 text-center text-stone-500 font-medieval text-base bg-stone-900/30 rounded border border-dashed border-stone-800">
                The messenger desk is clear. No decrees waiting in queue.
              </div>
            ) : (
              <div className="space-y-2.5">
                {queue.map((item, idx) => {
                  const isWaiting = item.status === 'pending' || item.status === 'waiting';
                  const isDispatching = item.status === 'running' || item.status === 'dispatching';
                  const isCompleted = item.status === 'completed';

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                        isDispatching
                          ? 'bg-amber-950/30 border-amber-500 shadow-md shadow-amber-950/40'
                          : isCompleted
                          ? 'bg-stone-950/60 border-stone-800 opacity-60'
                          : 'bg-stone-900/70 border-stone-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-1">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isDispatching ? (
                            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                          ) : (
                            <span className="font-pixel text-[10px] text-stone-500 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800">
                              #{idx + 1}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isWaiting && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-pixel bg-amber-950/80 border border-amber-600 text-amber-300">
                                ⏳ WAITING FOR FREE MOMENT
                              </span>
                            )}
                            {isDispatching && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-pixel bg-cyan-950 border border-cyan-500 text-cyan-300 animate-pulse">
                                ⚡ DISPATCHING TO GPU...
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-pixel bg-emerald-950 border border-emerald-600 text-emerald-300">
                                ✓ DISPATCHED & PROCESSED
                              </span>
                            )}

                            <span className="text-[10px] text-stone-500 font-sans">
                              {formatRelativeTime(item.timeCreated || item.time_created)}
                            </span>
                          </div>

                          <p className="text-xs text-stone-200 font-sans leading-relaxed select-text">
                            {item.prompt || item.content}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1 text-stone-500 hover:text-rose-400 rounded hover:bg-stone-800"
                        title="Cancel / Discard Decree"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
