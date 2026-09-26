import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Sparkles,
  Filter,
  Award,
  Scroll,
  Plus,
  X,
  Check,
  Feather,
} from 'lucide-react';
import sound from './SoundEngine';

export default function QuestBoard({ session, todos: initialTodos }) {
  const [todos, setTodos] = useState(initialTodos || session?.todos || []);
  const [filter, setFilter] = useState('all'); // 'all', 'in_progress', 'completed', 'pending'
  const [loading, setLoading] = useState(false);

  // New Quest creation form state
  const [isAddingQuest, setIsAddingQuest] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  // Fetch todos from API if not already supplied
  useEffect(() => {
    if (initialTodos && initialTodos.length > 0) {
      setTodos(initialTodos);
      return;
    }

    if (session?.id) {
      let isMounted = true;
      setLoading(true);
      fetch(`/api/sessions/${session.id}/todos`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch todos');
          return res.json();
        })
        .then((data) => {
          if (isMounted) {
            setTodos(data.todos || data || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setTodos(session?.todos || []);
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [session?.id, initialTodos]);

  // Derived stats
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const inProgressCount = todos.filter((t) => t.status === 'in_progress' || t.status === 'running').length;
  const pendingCount = totalCount - completedCount - inProgressCount;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTodos = todos.filter((t) => {
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'in_progress') return t.status === 'in_progress' || t.status === 'running';
    if (filter === 'pending') return t.status === 'pending' || !t.status;
    return true;
  });

  const handleFilterChange = (newFilter) => {
    sound.playClick();
    setFilter(newFilter);
  };

  // Toggle Quest Status (Interactive)
  const handleToggleQuest = (todo, index) => {
    const isNowCompleted = todo.status !== 'completed';
    const nextStatus = isNowCompleted ? 'completed' : 'in_progress';

    if (isNowCompleted) {
      sound.playFanfare();
    } else {
      sound.playClick();
    }

    const updated = todos.map((t, i) => {
      const match = (todo.id && t.id === todo.id) || (todo.position !== undefined && t.position === todo.position) || i === index;
      return match ? { ...t, status: nextStatus } : t;
    });

    setTodos(updated);

    // Sync to backend if session exists
    if (session?.id) {
      fetch(`/api/sessions/${session.id}/todos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          position: todo.position ?? index,
          status: nextStatus,
        }),
      }).catch(() => {});
    }
  };

  // Inscribe New Quest (Interactive Add)
  const handleAddQuestSubmit = (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    sound.playHammer();

    const newTodo = {
      id: `quest-${Date.now()}`,
      content: newContent.trim(),
      priority: newPriority,
      status: 'in_progress',
      position: todos.length,
      time_created: Date.now(),
    };

    setTodos((prev) => [...prev, newTodo]);
    setNewContent('');
    setIsAddingQuest(false);

    // Sync to backend if session exists
    if (session?.id) {
      fetch(`/api/sessions/${session.id}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      }).catch(() => {});
    }
  };

  const getPriorityBadge = (priority = 'medium') => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-pixel bg-red-950/80 border border-red-600 text-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            CRITICAL CONTRACT
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-pixel bg-sky-950/80 border border-sky-600 text-sky-300">
            SIDE QUEST
          </span>
        );
      case 'medium':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-pixel bg-amber-950/80 border border-amber-600 text-amber-300">
            ROYAL BOUNTY
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Quest Progress Banner */}
      <div className="bg-stone-900/90 border-2 border-amber-800/80 p-4 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Scroll className="w-5 h-5 text-amber-400" />
              <h3 className="font-medieval text-xl text-amber-200 font-bold">
                Royal Quest Board
              </h3>
            </div>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              Decrees and objectives assigned by the Realm Overseer
            </p>
          </div>

          {/* Action: Inscribe New Quest button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setIsAddingQuest(!isAddingQuest);
              }}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-amber-100 font-pixel text-xs rounded border border-amber-500 shadow flex items-center gap-1.5 transition-all"
            >
              {isAddingQuest ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isAddingQuest ? 'Close Scroll' : 'Inscribe Quest'}</span>
            </button>
          </div>
        </div>

        {/* Quest Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-pixel mb-1.5">
            <span className="text-stone-300">Campaign Completion</span>
            <span className="text-amber-400 font-bold">{percentComplete}% ({completedCount}/{totalCount})</span>
          </div>
          <div className="w-full h-4 bg-stone-950 rounded border border-amber-900/80 p-0.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-emerald-400 rounded-sm transition-all duration-500 flex items-center justify-end pr-1"
              style={{ width: `${percentComplete}%` }}
            >
              {percentComplete >= 100 && (
                <Sparkles className="w-3 h-3 text-stone-950 animate-bounce" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inscribe Quest Form (Expandable) */}
      {isAddingQuest && (
        <form
          onSubmit={handleAddQuestSubmit}
          className="bg-stone-900 border-2 border-amber-600/80 p-4 rounded-lg shadow-lg space-y-3 modal-enter"
        >
          <div className="flex items-center gap-2 text-xs font-pixel text-amber-300">
            <Feather className="w-4 h-4 text-amber-400" />
            <span>INSCRIBE NEW ROYAL QUEST DECREE</span>
          </div>

          <div>
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="e.g. Refactor potion parser or implement unit tests..."
              className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-sans"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-pixel text-stone-400">PRIORITY:</span>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="bg-stone-950 border border-stone-700 rounded px-2.5 py-1 text-xs text-amber-300 font-pixel focus:outline-none"
              >
                <option value="high">Critical Contract (High)</option>
                <option value="medium">Royal Bounty (Medium)</option>
                <option value="low">Side Quest (Low)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingQuest(false)}
                className="px-3 py-1 bg-stone-800 text-stone-400 text-xs font-pixel rounded border border-stone-700 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newContent.trim()}
                className="pixel-btn px-4 py-1 text-xs font-pixel disabled:opacity-50"
              >
                Issue Decree
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-xs font-pixel text-stone-400">FILTER BOUNTIES:</span>
        </div>
        <div className="flex gap-1.5">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'in_progress', label: `Active (${inProgressCount})` },
            { id: 'completed', label: `Completed (${completedCount})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`px-2.5 py-1 text-[11px] font-pixel rounded transition-all ${
                filter === tab.id
                  ? 'bg-amber-800/80 text-amber-100 border border-amber-500 shadow'
                  : 'bg-stone-900/60 text-stone-400 border border-stone-800 hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quests List */}
      {loading ? (
        <div className="py-12 text-center text-amber-300 font-pixel text-xs animate-pulse">
          Consulting the royal parchment records...
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="py-12 text-center bg-stone-900/40 border border-dashed border-stone-800 rounded-lg">
          <Award className="w-10 h-10 text-stone-600 mx-auto mb-2" />
          <div className="font-medieval text-lg text-stone-300">
            {filter === 'completed'
              ? 'No quests completed yet in this campaign.'
              : 'No quests match the chosen decree.'}
          </div>
          <div className="text-xs text-stone-500 font-sans mt-1">
            New tasks will appear as the agent formulates its battle plan.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTodos.map((todo, index) => {
            const isCompleted = todo.status === 'completed';
            const isInProgress = todo.status === 'in_progress' || todo.status === 'running';

            return (
              <div
                key={todo.id || `todo-${index}`}
                onClick={() => handleToggleQuest(todo, index)}
                className={`relative p-3.5 rounded border transition-all cursor-pointer group select-none ${
                  isCompleted
                    ? 'bg-stone-950/70 border-stone-800/80 opacity-75 hover:opacity-90'
                    : isInProgress
                    ? 'bg-amber-950/30 border-amber-600/70 shadow-md shadow-amber-950/30 hover:border-amber-400'
                    : 'bg-stone-900/70 border-stone-800 hover:border-stone-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Checkbox Icon */}
                  <div className="mt-0.5 shrink-0 group-hover:scale-110 transition-transform">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isInProgress ? (
                      <Clock className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-500" />
                    )}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-pixel text-stone-500">
                          TASK #{index + 1}
                        </span>
                        {getPriorityBadge(todo.priority)}
                      </div>

                      {/* Status Stamp */}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-pixel bg-emerald-950 border border-emerald-700 text-emerald-300">
                          ACCOMPLISHED ✓
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-pixel bg-amber-950 border border-amber-600 text-amber-300 animate-pulse">
                          UNDERWAY
                        </span>
                      )}
                    </div>

                    <div
                      className={`text-sm font-sans ${
                        isCompleted
                          ? 'line-through text-stone-500'
                          : 'text-stone-200 font-medium'
                      }`}
                    >
                      {todo.content || todo.title || 'Untitled Objective'}
                    </div>

                    <div className="mt-1 text-[10px] text-stone-500 font-vt opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to toggle status ({isCompleted ? 'Mark Active' : 'Mark Accomplished'})
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
