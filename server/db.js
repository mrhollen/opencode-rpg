// server/db.js
// OpenCode RPG database service using Node 26 built-in node:sqlite (DatabaseSync)

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DB_PATH = '/home/hollen/.local/share/opencode/opencode.db';
const DEFAULT_LOCKS_DIR = '/home/hollen/.local/state/opencode/locks';

let db = null;
let isFallbackMode = false;
let dbPathUsed = DEFAULT_DB_PATH;
let locksDirUsed = DEFAULT_LOCKS_DIR;

// In-memory overlay for created/updated todos
const todoOverlay = new Map(); // key: `${sessionId}:${position}` -> todo object
const newCustomTodos = []; // array of created todos not in main db

// Stargate glyphs and biomes
const STARGATE_GLYPHS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];
const STARGATE_BIOMES = ['forest', 'desert', 'snow', 'void'];
const STARGATE_PREFIXES = ['P3X', 'P4C', 'PX7', 'P8X', 'P9J', 'M4R', 'K7Z'];

/**
 * Initialize connection to OpenCode SQLite database with read-only flag.
 * Gracefully falls back to mock mode if DB is missing or unreadable.
 */
function initDb(customDbPath = null, customLocksDir = null) {
  dbPathUsed = customDbPath || process.env.OPENCODE_DB_PATH || DEFAULT_DB_PATH;
  locksDirUsed = customLocksDir || process.env.OPENCODE_LOCKS_DIR || DEFAULT_LOCKS_DIR;

  if (process.env.FORCE_FALLBACK === 'true') {
    console.warn('[Database] FORCE_FALLBACK is set; enabling mock mode.');
    isFallbackMode = true;
    db = null;
    return false;
  }

  try {
    if (fs.existsSync(dbPathUsed)) {
      db = new DatabaseSync(dbPathUsed, { readOnly: true });
      // Validate with a smoke query
      db.prepare('SELECT 1 FROM sqlite_master LIMIT 1').get();
      isFallbackMode = false;
      console.log(`[Database] Connected read-only to OpenCode DB at: ${dbPathUsed}`);
      return true;
    } else {
      console.warn(`[Database] File not found at: ${dbPathUsed}. Activating safe mock mode.`);
      isFallbackMode = true;
      db = null;
      return false;
    }
  } catch (err) {
    console.warn(`[Database] Failed to open DB (${err.message}). Activating safe mock mode.`);
    isFallbackMode = true;
    db = null;
    return false;
  }
}

function isDbConnected() {
  return !isFallbackMode && db !== null;
}

/**
 * Resolves the working directory for a given session.
 */
function getSessionDirectory(sessionId) {
  if (!isDbConnected() || !db) return process.cwd();
  try {
    const s = db.prepare('SELECT directory, project_id FROM session WHERE id = ? LIMIT 1').get(sessionId);
    if (s && s.directory && fs.existsSync(s.directory)) {
      return s.directory;
    }
    if (s && s.project_id) {
      const p = db.prepare('SELECT worktree FROM project WHERE id = ? LIMIT 1').get(s.project_id);
      if (p && p.worktree && fs.existsSync(p.worktree)) {
        return p.worktree;
      }
    }
  } catch (err) {
    console.error('[Database] getSessionDirectory error:', err.message);
  }
  return process.cwd();
}

/**
 * Computes human-friendly realm display name from worktree basename if raw name is null.
 */
function formatDisplayName(worktree, rawName) {
  if (rawName && typeof rawName === 'string' && rawName.trim().length > 0) {
    return rawName.trim();
  }
  if (!worktree || worktree === '/') return 'Root Realm';
  const cleaned = worktree.replace(/\/+$/, '');
  const base = path.basename(cleaned);
  return base || 'Unknown Realm';
}

/**
 * Assigns an agent/role/task to a logical RPG Station:
 * - 'forge': build, backend-dev, frontend-dev, code, craft, implementation
 * - 'library': explore, research, docs, writer, scholar
 * - 'cauldron': test, qa, backend-qa, frontend-qa, lint, review, verify, alchemist
 * - 'board': team-lead, architect, planner, ceo, general, quest orchestration
 * - 'treasury': cost, token, vault, gold, mana
 */
function assignStation(agent, role = '', title = '') {
  const a = (agent || '').toLowerCase();
  const r = (role || '').toLowerCase();
  const t = (title || '').toLowerCase();

  // 1. Board / Command Center
  if (
    r === 'lead' ||
    r === 'master' ||
    a.includes('team-lead') ||
    a.includes('lead') ||
    a.includes('architect') ||
    a.includes('planner') ||
    a.includes('ceo')
  ) {
    return 'board';
  }

  // 2. Cauldron / Alchemy & QA Lab
  if (
    a.includes('qa') ||
    a.includes('test') ||
    t.includes('test') ||
    t.includes('lint') ||
    t.includes('review') ||
    t.includes('verify') ||
    t.includes('alchem') ||
    t.includes('cauldron')
  ) {
    return 'cauldron';
  }

  // 3. Forge / Workshop & Code Dev
  if (
    a.includes('backend-dev') ||
    a.includes('frontend-dev') ||
    a.includes('dev') ||
    a.includes('build') ||
    a.includes('coder') ||
    a.includes('code') ||
    a.includes('implementation') ||
    t.includes('scaffold') ||
    t.includes('implement') ||
    t.includes('forge')
  ) {
    return 'forge';
  }

  // 4. Library / Scriptorium & Exploration
  if (
    a.includes('explore') ||
    a.includes('research') ||
    a.includes('doc') ||
    a.includes('writer') ||
    a.includes('scholar') ||
    t.includes('research') ||
    t.includes('roadmap') ||
    t.includes('readme')
  ) {
    return 'library';
  }

  // 5. Treasury / Gold & Token Vault
  if (a.includes('treasury') || t.includes('token') || t.includes('cost') || t.includes('vault')) {
    return 'treasury';
  }

  // Fallback defaults based on role
  if (r === 'subagent') return 'forge';
  return 'board';
}

/**
 * Safely parses model metadata string (JSON or identifier)
 */
function parseModel(modelStr) {
  if (!modelStr) return { id: 'Default Model', providerID: 'unknown', variant: 'default' };
  try {
    const parsed = JSON.parse(modelStr);
    return {
      id: parsed.id || modelStr,
      providerID: parsed.providerID || 'unknown',
      variant: parsed.variant || 'default',
      raw: modelStr,
    };
  } catch {
    return { id: modelStr, providerID: 'unknown', variant: 'default', raw: modelStr };
  }
}

/**
 * Scans locks directory for active OpenCode locks and examines process heartbeat.
 */
function getLockInfo() {
  const locks = [];
  try {
    if (fs.existsSync(locksDirUsed)) {
      const entries = fs.readdirSync(locksDirUsed, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && e.name.endsWith('.lock')) {
          const lockDir = path.join(locksDirUsed, e.name);
          const metaPath = path.join(lockDir, 'meta.json');
          const heartbeatPath = path.join(lockDir, 'heartbeat');
          let meta = null;
          let isAlive = false;
          let heartbeatMtime = null;

          if (fs.existsSync(metaPath)) {
            try {
              meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              if (meta && meta.pid) {
                try {
                  process.kill(meta.pid, 0);
                  isAlive = true;
                } catch {
                  isAlive = false;
                }
              }
            } catch {}
          }

          if (fs.existsSync(heartbeatPath)) {
            try {
              const stat = fs.statSync(heartbeatPath);
              heartbeatMtime = stat.mtimeMs;
              if (Date.now() - heartbeatMtime < 2 * 60 * 1000) {
                isAlive = true;
              }
            } catch {}
          }

          locks.push({
            name: e.name,
            meta,
            pid: meta?.pid || null,
            isAlive,
            createdAt: meta?.createdAt || null,
            heartbeatMtime,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Locks] Error scanning locks:', err.message);
  }
  return locks;
}

/**
 * Retrieves active sessions based on locks and recent DB updates (within 15 minutes).
 */
function getActiveSessions() {
  if (isFallbackMode || !db) return getMockActive();

  try {
    const now = Date.now();
    const threshold15m = now - 15 * 60 * 1000;
    const threshold2m = now - 2 * 60 * 1000;

    let activeSessions = db
      .prepare(
        `
      SELECT id, project_id, parent_id, slug, title, agent, model, time_created, time_updated, time_archived
      FROM session
      WHERE time_updated >= ? AND time_archived IS NULL
      ORDER BY time_updated DESC
    `
      )
      .all(threshold15m);

    // If none within 15m, find the single most recently active session
    if (activeSessions.length === 0) {
      const latest = db
        .prepare(
          `
        SELECT id, project_id, parent_id, slug, title, agent, model, time_created, time_updated, time_archived
        FROM session
        WHERE time_archived IS NULL
        ORDER BY time_updated DESC
        LIMIT 1
      `
        )
        .get();
      if (latest) {
        activeSessions = [latest];
      }
    }

    return activeSessions.map((s) => {
      const isRecent = s.time_updated >= threshold2m;
      const modelInfo = parseModel(s.model);
      const isMaster = !s.parent_id;

      return {
        id: s.id,
        sessionId: s.id,
        status: 'active',
        is_active: true,
        slug: s.slug,
        title: s.title,
        agent: s.agent || (isMaster ? 'team-lead' : 'subagent'),
        model: modelInfo.id,
        modelData: modelInfo,
        projectId: s.project_id,
        time_updated: s.time_updated,
        lastUpdated: s.time_updated,
        station: assignStation(s.agent, isMaster ? 'master' : 'subagent', s.title),
        isRecent,
      };
    });
  } catch (err) {
    console.error('[Database] getActiveSessions error:', err.message);
    return getMockActive();
  }
}

/**
 * GET /api/projects: List all projects with aggregated stats.
 */
function getProjects() {
  if (isFallbackMode || !db) return getMockProjects();

  try {
    const threshold15m = Date.now() - 15 * 60 * 1000;
    const query = `
      SELECT 
        p.id,
        p.name,
        p.worktree,
        p.time_created,
        p.time_updated as project_time_updated,
        COUNT(s.id) as session_count,
        COUNT(CASE WHEN s.time_updated >= ? AND s.time_archived IS NULL THEN 1 END) as active_count,
        COALESCE(SUM(s.tokens_input + s.tokens_output + s.tokens_reasoning), 0) as total_tokens,
        COALESCE(SUM(s.cost), 0.0) as total_cost,
        MAX(COALESCE(s.time_updated, p.time_updated)) as last_updated
      FROM project p
      LEFT JOIN session s ON s.project_id = p.id
      GROUP BY p.id
      ORDER BY last_updated DESC
    `;

    const rows = db.prepare(query).all(threshold15m);
    return rows.map((r) => {
      const displayName = formatDisplayName(r.worktree, r.name);
      return {
        id: r.id,
        name: displayName,
        raw_name: r.name,
        worktree: r.worktree,
        session_count: Number(r.session_count || 0),
        sessionCount: Number(r.session_count || 0),
        active_count: Number(r.active_count || 0),
        activeCount: Number(r.active_count || 0),
        total_tokens: Number(r.total_tokens || 0),
        totalTokens: Number(r.total_tokens || 0),
        total_cost: Number(r.total_cost || 0),
        totalCost: Number(r.total_cost || 0),
        last_updated: Number(r.last_updated || r.project_time_updated || Date.now()),
        lastUpdated: Number(r.last_updated || r.project_time_updated || Date.now()),
      };
    });
  } catch (err) {
    console.error('[Database] getProjects error:', err.message);
    return getMockProjects();
  }
}

/**
 * GET /api/projects/:projectId/world: World details, master sessions, subagents, todos, stations.
 */
function getProjectWorld(projectId) {
  if (isFallbackMode || !db) return getMockWorld(projectId);

  try {
    let project = db.prepare('SELECT * FROM project WHERE id = ? LIMIT 1').get(projectId);
    if (!project) {
      project = db
        .prepare('SELECT * FROM project WHERE worktree LIKE ? LIMIT 1')
        .get(`%${projectId}%`);
    }

    if (!project) {
      return null;
    }

    const threshold15m = Date.now() - 15 * 60 * 1000;

    // Fetch master sessions (parent_id IS NULL)
    let masterRows = db
      .prepare(
        'SELECT * FROM session WHERE project_id = ? AND parent_id IS NULL ORDER BY time_updated DESC'
      )
      .all(project.id);

    // If project has sessions but none has parent_id IS NULL, show all sessions
    if (masterRows.length === 0) {
      masterRows = db
        .prepare('SELECT * FROM session WHERE project_id = ? ORDER BY time_updated DESC')
        .all(project.id);
    }

    const sessions = masterRows.map((m) => {
      const is_active = m.time_updated >= threshold15m && !m.time_archived;
      const modelInfo = parseModel(m.model);

      // Fetch subagents (child sessions)
      const childRows = db
        .prepare('SELECT * FROM session WHERE parent_id = ? ORDER BY time_updated DESC')
        .all(m.id);

/**
 * Extracts the latest real tool invocation or activity from session parts.
 */
function getLatestSessionActivity(sessionId) {
  if (!db || isFallbackMode) return null;
  try {
    const parts = db
      .prepare('SELECT data FROM part WHERE session_id = ? ORDER BY time_created DESC LIMIT 8')
      .all(sessionId);
    for (const p of parts) {
      try {
        const d = JSON.parse(p.data);
        if (d.type === 'tool' && d.tool) {
          const inp = d.state?.input || {};
          const desc = inp.description || inp.command || inp.filePath || inp.path || inp.query || '';
          const shortDesc = desc.length > 45 ? desc.substring(0, 42) + '...' : desc;
          return shortDesc ? `${d.tool}: ${shortDesc}` : `${d.tool}`;
        }
      } catch {}
    }
  } catch {}
  return null;
}

      const subagents = childRows.map((sub) => {
        const subActive = sub.time_updated >= threshold15m && !sub.time_archived;
        const subModel = parseModel(sub.model);
        const recentTodo = db
          .prepare(
            `
          SELECT content FROM todo 
          WHERE session_id = ? 
          ORDER BY CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END, position DESC 
          LIMIT 1
        `
          )
          .get(sub.id);

        const realActivity = getLatestSessionActivity(sub.id);
        const recentTask = realActivity || recentTodo?.content || sub.title;

        return {
          id: sub.id,
          role: sub.agent || 'subagent',
          agent: sub.agent || 'subagent',
          title: sub.title,
          slug: sub.slug,
          model: subModel.id,
          modelData: subModel,
          time_created: sub.time_created,
          time_updated: sub.time_updated,
          is_active: subActive,
          status: subActive ? 'active' : 'idle',
          recent_task: recentTask,
          recentTask: recentTask,
          latestActivity: realActivity,
          station: assignStation(sub.agent, 'subagent', sub.title),
          tokens_input: Number(sub.tokens_input || 0),
          tokens_output: Number(sub.tokens_output || 0),
          tokens_reasoning: Number(sub.tokens_reasoning || 0),
          cost: Number(sub.cost || 0),
        };
      });

      // Fetch merged todos for master and all subagents
      const todos = getSessionTodos(m.id);

      const activeSubCount = subagents.filter((s) => s.is_active).length;
      const totalActiveCount = activeSubCount + (is_active ? 1 : 0);
      const activeTodo = todos.find((t) => t.status === 'in_progress');
      const masterActivity = getLatestSessionActivity(m.id);
      const currentTask = masterActivity || activeTodo?.content || m.title;

      return {
        id: m.id,
        slug: m.slug,
        title: m.title,
        agent: m.agent || 'team-lead',
        model: modelInfo.id,
        modelData: modelInfo,
        cost: Number(m.cost || 0),
        tokens_input: Number(m.tokens_input || 0),
        tokens_output: Number(m.tokens_output || 0),
        tokens_reasoning: Number(m.tokens_reasoning || 0),
        tokens_cache_read: Number(m.tokens_cache_read || 0),
        tokens_cache_write: Number(m.tokens_cache_write || 0),
        time_created: m.time_created,
        time_updated: m.time_updated,
        time_archived: m.time_archived,
        is_active,
        status: is_active ? 'active' : m.time_archived ? 'resting' : 'idle',
        station: assignStation(m.agent, 'master', m.title),
        currentTask,
        latestActivity: masterActivity,
        subagents,
        todos,
        activeAgents: totalActiveCount,
        activeAgentsCount: totalActiveCount,
      };
    });

    const activeCount = sessions.reduce((acc, s) => acc + (s.is_active ? 1 : 0), 0);

    return {
      project: {
        id: project.id,
        name: formatDisplayName(project.worktree, project.name),
        worktree: project.worktree,
        time_created: project.time_created,
        time_updated: project.time_updated,
      },
      sessions,
      masterSessions: sessions,
      totalSessions: sessions.length,
      activeCount,
    };
  } catch (err) {
    console.error('[Database] getProjectWorld error:', err.message);
    return getMockWorld(projectId);
  }
}

/**
 * GET /api/sessions/:sessionId/logs: Chronicle items (messages, parts, reasoning, tools).
 */
function getSessionLogs(sessionId, includeChildren = false) {
  if (isFallbackMode || !db) return getMockLogs(sessionId);

  try {
    let sessionIds = [sessionId];
    if (includeChildren) {
      const childSessions = db
        .prepare('SELECT id FROM session WHERE parent_id = ?')
        .all(sessionId);
      sessionIds = [sessionId, ...childSessions.map((c) => c.id)];
    }

    const placeholders = sessionIds.map(() => '?').join(',');

    const msgs = db
      .prepare(
        `
      SELECT id, session_id, time_created, time_updated, data 
      FROM message 
      WHERE session_id IN (${placeholders}) 
      ORDER BY time_created ASC
    `
      )
      .all(...sessionIds);

    const parts = db
      .prepare(
        `
      SELECT id, message_id, session_id, time_created, time_updated, data 
      FROM part 
      WHERE session_id IN (${placeholders}) 
      ORDER BY time_created ASC
    `
      )
      .all(...sessionIds);

    const msgMap = new Map();
    for (const m of msgs) {
      let d = {};
      try {
        d = JSON.parse(m.data);
      } catch {}
      msgMap.set(m.id, { ...m, parsedData: d });
    }

    const chronicleItems = [];
    const processedMsgIdsWithParts = new Set();

    for (const p of parts) {
      let partData = {};
      try {
        partData = JSON.parse(p.data);
      } catch {}

      const parentMsg = msgMap.get(p.message_id);
      processedMsgIdsWithParts.add(p.message_id);
      const role =
        parentMsg?.parsedData?.role || (partData.type === 'tool' ? 'tool' : 'assistant');

      let text = null;
      let reasoning = null;
      let toolCall = null;

      if (partData.type === 'text') {
        text = partData.text || '';
      } else if (partData.type === 'reasoning') {
        reasoning = partData.text || partData.reasoning || '';
      } else if (partData.type === 'tool') {
        toolCall = {
          name: partData.tool,
          id: partData.callID,
          input: partData.state?.input,
          output: partData.state?.output,
          status: partData.state?.status,
          title: partData.title,
          time: partData.time,
        };
      }

      const itemTime =
        partData.time?.start || p.time_created || parentMsg?.time_created || Date.now();

      chronicleItems.push({
        id: p.id,
        type: partData.type || 'text',
        role: role,
        text,
        reasoning,
        toolCall,
        time: itemTime,
        timestamp: itemTime,
        messageId: p.message_id,
        sessionId: p.session_id,
        patch: partData.type === 'patch' ? { hash: partData.hash, files: partData.files } : null,
      });
    }

    for (const m of msgs) {
      if (!processedMsgIdsWithParts.has(m.id)) {
        const d = m.parsedData || {};
        chronicleItems.push({
          id: m.id,
          type: d.role === 'user' ? 'text' : 'text',
          role: d.role || 'user',
          text: d.text || d.content || (d.summary ? JSON.stringify(d.summary) : ''),
          reasoning: null,
          toolCall: null,
          time: m.time_created,
          timestamp: m.time_created,
          messageId: m.id,
          sessionId: m.session_id,
          patch: null,
        });
      }
    }

    chronicleItems.sort((a, b) => a.time - b.time);
    return chronicleItems;
  } catch (err) {
    console.error('[Database] getSessionLogs error:', err.message);
    return getMockLogs(sessionId);
  }
}

/**
 * GET /api/sessions/:sessionId/todos: Todos for session and child sessions (merging overlays).
 */
function getSessionTodos(sessionId) {
  let dbTodos = [];
  if (!isFallbackMode && db) {
    try {
      dbTodos = db
        .prepare(
          `
        SELECT session_id, content, status, priority, position, time_created, time_updated
        FROM todo
        WHERE session_id = ? OR session_id IN (SELECT id FROM session WHERE parent_id = ?)
        ORDER BY position ASC
      `
        )
        .all(sessionId, sessionId)
        .map((t) => ({ ...t }));
    } catch (err) {
      console.error('[Database] getSessionTodos query error:', err.message);
      dbTodos = getMockTodos(sessionId);
    }
  } else {
    dbTodos = getMockTodos(sessionId);
  }

  const modifiedTodos = dbTodos.map((t) => {
    const key = `${t.session_id}:${t.position}`;
    if (todoOverlay.has(key)) {
      return { ...t, ...todoOverlay.get(key) };
    }
    return t;
  });

  const createdForSession = newCustomTodos.filter(
    (t) => t.session_id === sessionId
  );

  return [...modifiedTodos, ...createdForSession].sort((a, b) => a.position - b.position);
}

/**
 * POST /api/sessions/:sessionId/todos: Create a new todo item.
 */
function createSessionTodo(sessionId, { content, priority = 'medium' }) {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Todo content cannot be empty');
  }

  const cleanContent = content.trim();
  const cleanPriority = ['high', 'medium', 'low'].includes(priority) ? priority : 'medium';
  const now = Date.now();

  const currentTodos = getSessionTodos(sessionId);
  const nextPos = currentTodos.length > 0 ? Math.max(...currentTodos.map((t) => t.position)) + 1 : 0;

  const newTodo = {
    session_id: sessionId,
    content: cleanContent,
    status: 'pending',
    priority: cleanPriority,
    position: nextPos,
    time_created: now,
    time_updated: now,
  };

  if (!isFallbackMode && db) {
    try {
      const rwDb = new DatabaseSync(dbPathUsed);
      rwDb
        .prepare(
          `
        INSERT INTO todo (session_id, content, status, priority, position, time_created, time_updated)
        VALUES (?, ?, 'pending', ?, ?, ?, ?)
      `
        )
        .run(sessionId, cleanContent, cleanPriority, nextPos, now, now);
      rwDb.close();
    } catch {}
  }

  newCustomTodos.push(newTodo);
  todoOverlay.set(`${sessionId}:${nextPos}`, newTodo);

  return newTodo;
}

/**
 * PATCH /api/sessions/:sessionId/todos/:position: Update/toggle todo status or priority.
 */
function updateSessionTodo(sessionId, position, updates = {}) {
  const pos = parseInt(position, 10);
  if (isNaN(pos)) {
    throw new Error('Invalid position');
  }

  const validStatuses = ['completed', 'in_progress', 'pending'];
  const validPriorities = ['high', 'medium', 'low'];
  const now = Date.now();

  const updateFields = {};
  if (updates.status && validStatuses.includes(updates.status)) {
    updateFields.status = updates.status;
  }
  if (updates.priority && validPriorities.includes(updates.priority)) {
    updateFields.priority = updates.priority;
  }
  if (updates.content && typeof updates.content === 'string' && updates.content.trim()) {
    updateFields.content = updates.content.trim();
  }
  updateFields.time_updated = now;

  if (!isFallbackMode && db) {
    try {
      const rwDb = new DatabaseSync(dbPathUsed);
      const setClauses = [];
      const values = [];
      for (const [k, v] of Object.entries(updateFields)) {
        setClauses.push(`${k} = ?`);
        values.push(v);
      }
      values.push(sessionId, pos);
      rwDb
        .prepare(`UPDATE todo SET ${setClauses.join(', ')} WHERE session_id = ? AND position = ?`)
        .run(...values);
      rwDb.close();
    } catch {}
  }

  const key = `${sessionId}:${pos}`;
  const existing = todoOverlay.get(key) || {};
  const merged = { ...existing, ...updateFields, session_id: sessionId, position: pos };
  todoOverlay.set(key, merged);

  const allTodos = getSessionTodos(sessionId);
  const found = allTodos.find((t) => t.position === pos);
  return found || merged;
}

/**
 * GET /api/sessions/:sessionId/diffs:
 * Extract and parse modified files with line additions, deletions, and patches.
 */
function getSessionDiffs(sessionId) {
  if (isFallbackMode || !db) return getMockDiffs(sessionId);

  try {
    const fileMap = new Map();

    const childSessions = db
      .prepare('SELECT id FROM session WHERE parent_id = ?')
      .all(sessionId);
    const sessionIds = [sessionId, ...childSessions.map((c) => c.id)];
    const placeholders = sessionIds.map(() => '?').join(',');

    const sessionsWithDiffs = db
      .prepare(
        `SELECT id, summary_diffs FROM session WHERE id IN (${placeholders}) AND summary_diffs IS NOT NULL`
      )
      .all(...sessionIds);

    for (const s of sessionsWithDiffs) {
      try {
        const parsed = JSON.parse(s.summary_diffs);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const fileName = item.file || item.path || item.filename;
            if (fileName) {
              fileMap.set(fileName, {
                file: fileName,
                additions: Number(item.additions || item.added || 1),
                deletions: Number(item.deletions || item.deleted || 0),
                patch: item.patch || item.diff || '',
                type: item.type || 'edit',
              });
            }
          }
        }
      } catch {}
    }

    const parts = db
      .prepare(
        `
      SELECT id, message_id, session_id, time_created, data 
      FROM part 
      WHERE session_id IN (${placeholders})
      ORDER BY time_created ASC
    `
      )
      .all(...sessionIds);

    for (const p of parts) {
      try {
        const d = JSON.parse(p.data);
        if (d.type === 'tool') {
          const input = d.state?.input || {};
          const filePath = input.filePath || input.path || input.TargetFile || d.title;
          const toolName = d.tool || '';

          if (
            filePath &&
            typeof filePath === 'string' &&
            ['write', 'edit', 'replace', 'create'].some((k) => toolName.includes(k))
          ) {
            const existing = fileMap.get(filePath) || {
              file: filePath,
              additions: 0,
              deletions: 0,
              patch: '',
              type: toolName.includes('write') ? 'write' : 'edit',
            };

            if (toolName.includes('write')) {
              const lines = (input.content || input.CodeContent || '').split('\n').length;
              existing.additions += lines;
              existing.type = existing.type || 'write';
              if (!existing.patch && (input.content || input.CodeContent)) {
                existing.patch = `+ ${(input.content || input.CodeContent).slice(0, 300)}...`;
              }
            } else if (toolName.includes('edit') || toolName.includes('replace')) {
              const added = (input.newString || input.ReplacementContent || '').split('\n').length;
              const deleted = (input.oldString || input.TargetContent || '').split('\n').length;
              existing.additions += added;
              existing.deletions += deleted;
              existing.type = 'edit';
              if (!existing.patch) {
                existing.patch = `- ${(input.oldString || input.TargetContent || '').slice(0, 100)}\n+ ${(input.newString || input.ReplacementContent || '').slice(0, 100)}`;
              }
            }
            fileMap.set(filePath, existing);
          }
        } else if (d.type === 'patch' && Array.isArray(d.files)) {
          for (const f of d.files) {
            if (!fileMap.has(f)) {
              fileMap.set(f, {
                file: f,
                additions: 1,
                deletions: 0,
                patch: `commit ${d.hash || 'sealed'}`,
                type: 'patch',
              });
            }
          }
        }
      } catch {}
    }

    const diffs = Array.from(fileMap.values());
    if (diffs.length === 0) {
      return getMockDiffs(sessionId);
    }
    return diffs;
  } catch (err) {
    console.error('[Database] getSessionDiffs error:', err.message);
    return getMockDiffs(sessionId);
  }
}

/**
 * GET /api/projects/:projectId/analytics:
 * Token usage breakdown by Model Catalyst, cache hit efficiency, estimated savings, and timeline.
 */
function getProjectAnalytics(projectId) {
  if (isFallbackMode || !db) return getMockAnalytics(projectId);

  try {
    let project = db.prepare('SELECT id, name, worktree FROM project WHERE id = ?').get(projectId);
    if (!project) {
      project = db
        .prepare('SELECT id, name, worktree FROM project WHERE worktree LIKE ? LIMIT 1')
        .get(`%${projectId}%`);
    }

    const targetId = project ? project.id : projectId;

    const sessions = db
      .prepare(
        `
      SELECT id, model, cost, tokens_input, tokens_output, tokens_reasoning, tokens_cache_read, tokens_cache_write, time_created, time_updated
      FROM session
      WHERE project_id = ?
      ORDER BY time_created ASC
    `
      )
      .all(targetId);

    const catalystBreakdown = {};
    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    let totalTokensReasoning = 0;
    let totalTokensCacheRead = 0;
    let totalTokensCacheWrite = 0;
    let totalCost = 0;
    const timeline = {};

    for (const s of sessions) {
      let modelName = 'Default';
      try {
        const parsed = JSON.parse(s.model);
        modelName = parsed.id || parsed.modelID || s.model || 'Default';
      } catch {
        modelName = s.model || 'Default';
      }

      let catalyst = 'Other Catalyst';
      const mLower = modelName.toLowerCase();
      if (mLower.includes('qwen')) catalyst = 'Qwen Catalyst';
      else if (mLower.includes('claude') || mLower.includes('anthropic')) catalyst = 'Claude Catalyst';
      else if (mLower.includes('gpt') || mLower.includes('openai')) catalyst = 'GPT Catalyst';
      else if (mLower.includes('gemma')) catalyst = 'Gemma Catalyst';
      else if (mLower.includes('deepseek') || mLower.includes('r1')) catalyst = 'DeepSeek Catalyst';

      if (!catalystBreakdown[catalyst]) {
        catalystBreakdown[catalyst] = {
          catalyst,
          models: new Set(),
          tokens_input: 0,
          tokens_output: 0,
          tokens_reasoning: 0,
          tokens_cache_read: 0,
          tokens_cache_write: 0,
          total_tokens: 0,
          cost: 0,
          sessions_count: 0,
        };
      }

      const c = catalystBreakdown[catalyst];
      c.models.add(modelName);
      c.tokens_input += s.tokens_input || 0;
      c.tokens_output += s.tokens_output || 0;
      c.tokens_reasoning += s.tokens_reasoning || 0;
      c.tokens_cache_read += s.tokens_cache_read || 0;
      c.tokens_cache_write += s.tokens_cache_write || 0;
      c.total_tokens +=
        (s.tokens_input || 0) +
        (s.tokens_output || 0) +
        (s.tokens_reasoning || 0) +
        (s.tokens_cache_read || 0);
      c.cost += s.cost || 0;
      c.sessions_count += 1;

      totalTokensInput += s.tokens_input || 0;
      totalTokensOutput += s.tokens_output || 0;
      totalTokensReasoning += s.tokens_reasoning || 0;
      totalTokensCacheRead += s.tokens_cache_read || 0;
      totalTokensCacheWrite += s.tokens_cache_write || 0;
      totalCost += s.cost || 0;

      const dateKey = new Date(s.time_created).toISOString().split('T')[0];
      timeline[dateKey] = (timeline[dateKey] || 0) + 1;
    }

    const catalystsArray = Object.values(catalystBreakdown).map((c) => ({
      ...c,
      models: Array.from(c.models),
    }));

    const totalReadAndInput = totalTokensCacheRead + totalTokensInput;
    const cacheHitEfficiency =
      totalReadAndInput > 0 ? (totalTokensCacheRead / totalReadAndInput) * 100 : 0;
    const estimatedSavingsUsd = (totalTokensCacheRead / 1_000_000) * 2.7;

    return {
      projectId: targetId,
      projectName: project ? formatDisplayName(project.worktree, project.name) : targetId,
      summary: {
        totalSessions: sessions.length,
        totalTokens: totalTokensInput + totalTokensOutput + totalTokensReasoning + totalTokensCacheRead,
        totalTokensInput,
        totalTokensOutput,
        totalTokensReasoning,
        totalTokensCacheRead,
        totalTokensCacheWrite,
        totalCostUsd: Number(totalCost.toFixed(4)),
        cacheHitEfficiencyPercent: Number(cacheHitEfficiency.toFixed(2)),
        estimatedSavingsUsd: Number(estimatedSavingsUsd.toFixed(4)),
      },
      catalysts: catalystsArray,
      timeline,
    };
  } catch (err) {
    console.error('[Database] getProjectAnalytics error:', err.message);
    return getMockAnalytics(projectId);
  }
}

/**
 * GET /api/sessions/:sessionId/scribe:
 * Generates an epic medieval fantasy quest chronicle of the session.
 */
function getSessionScribeTale(sessionId) {
  if (isFallbackMode || !db) return getMockScribeTale(sessionId);

  try {
    const session = db.prepare('SELECT * FROM session WHERE id = ?').get(sessionId);
    if (!session) return getMockScribeTale(sessionId);

    const subagents = db.prepare('SELECT * FROM session WHERE parent_id = ?').all(sessionId);
    const todos = getSessionTodos(sessionId);
    const diffs = getSessionDiffs(sessionId);

    const completedQuests = todos.filter((t) => t.status === 'completed');
    const inProgressQuests = todos.filter((t) => t.status === 'in_progress');
    const seals = diffs.filter((d) => d.type === 'patch').map((d) => d.patch.replace('commit ', ''));

    const guildmasterName = session.title || session.slug;
    const fellowshipList = [
      { name: session.slug, role: 'Guildmaster Commander', station: 'High Sanctum (Board)' },
      ...subagents.map((s) => ({
        name: s.slug,
        role: s.agent || 'Subagent',
        station: assignStation(s.agent, 'subagent', s.title),
      })),
    ];

    const totalMana = (session.tokens_input || 0) + (session.tokens_output || 0) + (session.tokens_reasoning || 0);
    const chapters = [];

    chapters.push({
      title: 'Chapter I: The Gathering at the High Sanctum',
      text: `In the third watch, Guildmaster ${session.slug} summoned an elite fellowship of ${fellowshipList.length} specialists. The war council gathered at the central guildhall to undertake the solemn pact: "${session.title}". With ancient blueprints unrolled upon the scrying table, each agent swore their oath upon the code anvil.`,
    });

    const stationDispatches = fellowshipList
      .slice(1)
      .map((f) => `${f.name} took up vigil at the ${f.station} as ${f.role}`)
      .join('; ');

    if (stationDispatches) {
      chapters.push({
        title: 'Chapter II: March to the Village Stations',
        text: `The fellowship split across the realm: ${stationDispatches}. Through winding cobbled alleys, sparks danced from the chimney flues as bellows breathed life into the code smithy.`,
      });
    }

    const featItems = completedQuests.slice(0, 5).map((q) => `vanquished the trial "${q.content}"`);
    const fileRunes = diffs.slice(0, 4).map((d) => `inscribed ${d.additions} sacred runes into ${path.basename(d.file)}`);
    const featSummary = [...featItems, ...fileRunes].join(', ');

    chapters.push({
      title: 'Chapter III: The Trial of the Sacred Runes',
      text: `Great hammers struck against stubborn AST stones. The agents ${featSummary || 'held their line against regressions and refactored the sacred repositories'}. ${seals.length > 0 ? `With thunderous resonance, the seals [${seals.slice(0, 3).join(', ')}] were struck into history.` : 'The codebase was consecrated with unbroken tests.'}`,
    });

    chapters.push({
      title: 'Chapter IV: The Song of Victory',
      text: `By sundown, ${completedQuests.length} grand quests lay completed, expending ${Math.round(totalMana / 1000)}k Mana from the realm ley lines. The realm of ${session.slug} stands fortified, ready for the next dawn.`,
    });

    const fullNarrative = chapters.map((c) => `### ${c.title}\n\n${c.text}`).join('\n\n');

    return {
      title: `The Saga of ${guildmasterName}`,
      guildmaster: session.slug,
      masterSessionId: sessionId,
      fellowshipSize: fellowshipList.length,
      fellowship: fellowshipList,
      completedQuestsCount: completedQuests.length,
      inProgressQuestsCount: inProgressQuests.length,
      sealsForged: seals.length,
      modifiedFilesCount: diffs.length,
      manaExpended: totalMana,
      chapters,
      narrative: fullNarrative,
    };
  } catch (err) {
    console.error('[Database] getSessionScribeTale error:', err.message);
    return getMockScribeTale(sessionId);
  }
}

/**
 * GET /api/stargate/network:
 * Maps all projects as Stargate Network destinations across the overworld galaxy.
 */
function getStargateNetwork() {
  const projects = getProjects();
  return projects.map((p) => {
    const hash = crypto.createHash('sha256').update(p.id).digest('hex');
    const num = parseInt(hash.slice(0, 4), 16);

    const chevrons = [];
    for (let i = 0; i < 6; i++) {
      const gIdx = parseInt(hash.slice(i * 2, i * 2 + 2), 16) % STARGATE_GLYPHS.length;
      chevrons.push(STARGATE_GLYPHS[gIdx]);
    }
    chevrons.push('ᛟ'); // Point of Origin

    const prefix = STARGATE_PREFIXES[num % STARGATE_PREFIXES.length];
    const planetNum = (num % 900) + 100;
    const planetDesignation = `${prefix}-${planetNum} (${p.name})`;

    const x = Math.round(5 + (parseInt(hash.slice(4, 8), 16) / 65535) * 90);
    const y = Math.round(5 + (parseInt(hash.slice(8, 12), 16) / 65535) * 90);

    const nameLower = (p.name || '').toLowerCase();
    let biome = STARGATE_BIOMES[num % STARGATE_BIOMES.length];
    if (nameLower.includes('crowban') || nameLower.includes('bar')) biome = 'desert';
    else if (nameLower.includes('rpg') || nameLower.includes('media')) biome = 'forest';
    else if (nameLower.includes('breeze') || nameLower.includes('snow')) biome = 'snow';
    else if (nameLower.includes('corvus') || nameLower.includes('ai') || nameLower.includes('void')) biome = 'void';

    let status = 'ONLINE';
    if (p.active_count > 0) status = 'ENGAGED';
    else if (p.session_count === 0) status = 'DIALING';

    return {
      id: p.id,
      name: p.name,
      planetDesignation,
      stargateAddress: chevrons,
      addressString: chevrons.join(' '),
      galaxyCoords: { x, y },
      biome,
      status,
      sessionsCount: p.session_count,
      activeCount: p.active_count,
      mana: p.total_tokens,
      worktree: p.worktree,
    };
  });
}

/**
 * Fast check for real-time DB changes across sessions, parts, and todos.
 */
function checkDbUpdates(lastSeen) {
  if (isFallbackMode || !db) {
    return { hasChanges: false, updatedSession: null, newToolCall: null, completedTodo: null };
  }

  try {
    const latestSessionRow = db
      .prepare(
        `
      SELECT id, project_id, parent_id, slug, title, agent, model, cost, tokens_input, tokens_output, time_created, time_updated
      FROM session
      ORDER BY time_updated DESC
      LIMIT 1
    `
      )
      .get();

    let updatedSession = null;
    let newToolCall = null;
    let completedTodo = null;
    let hasChanges = false;

    if (latestSessionRow && latestSessionRow.time_updated > (lastSeen.sessionTime || 0)) {
      lastSeen.sessionTime = latestSessionRow.time_updated;
      hasChanges = true;

      const modelInfo = parseModel(latestSessionRow.model);
      const isMaster = !latestSessionRow.parent_id;
      updatedSession = {
        id: latestSessionRow.id,
        slug: latestSessionRow.slug,
        title: latestSessionRow.title,
        agent: latestSessionRow.agent || (isMaster ? 'team-lead' : 'subagent'),
        model: modelInfo.id,
        cost: latestSessionRow.cost,
        tokens_input: latestSessionRow.tokens_input,
        tokens_output: latestSessionRow.tokens_output,
        time_created: latestSessionRow.time_created,
        time_updated: latestSessionRow.time_updated,
        status: 'active',
        is_active: true,
        station: assignStation(
          latestSessionRow.agent,
          isMaster ? 'master' : 'subagent',
          latestSessionRow.title
        ),
      };

      const latestPart = db
        .prepare(
          `
        SELECT id, message_id, session_id, time_created, data
        FROM part
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 1
      `
        )
        .get(latestSessionRow.id);

      if (latestPart && latestPart.time_created > (lastSeen.partTime || 0)) {
        lastSeen.partTime = latestPart.time_created;
        try {
          const parsed = JSON.parse(latestPart.data);
          if (parsed.type === 'tool') {
            newToolCall = {
              tool: parsed.tool,
              session_id: latestPart.session_id,
              callID: parsed.callID,
              title: parsed.title,
            };
          }
        } catch {}
      }
    }

    const latestTodo = db
      .prepare(
        `
      SELECT session_id, content, status, time_updated
      FROM todo
      WHERE status = 'completed'
      ORDER BY time_updated DESC
      LIMIT 1
    `
      )
      .get();

    if (latestTodo && latestTodo.time_updated > (lastSeen.todoTime || 0)) {
      lastSeen.todoTime = latestTodo.time_updated;
      hasChanges = true;
      completedTodo = {
        content: latestTodo.content,
        session_id: latestTodo.session_id,
      };
    }

    return { hasChanges, updatedSession, newToolCall, completedTodo };
  } catch (err) {
    console.error('[Database] checkDbUpdates error:', err.message);
    return { hasChanges: false, updatedSession: null, newToolCall: null, completedTodo: null };
  }
}

// =========================================================================
// MOCK / FALLBACK DATASET
// =========================================================================

function getMockProjects() {
  const now = Date.now();
  return [
    {
      id: 'proj_crowban',
      name: 'crowban',
      raw_name: null,
      worktree: '/home/hollen/Code/crowban',
      session_count: 13,
      sessionCount: 13,
      active_count: 2,
      activeCount: 2,
      total_tokens: 1405000,
      totalTokens: 1405000,
      total_cost: 0.45,
      totalCost: 0.45,
      last_updated: now - 30000,
      lastUpdated: now - 30000,
    },
    {
      id: 'proj_opencode_rpg',
      name: 'opencode-rpg',
      raw_name: null,
      worktree: '/home/hollen/Code/opencode-rpg',
      session_count: 4,
      sessionCount: 4,
      active_count: 1,
      activeCount: 1,
      total_tokens: 320000,
      totalTokens: 320000,
      total_cost: 0.12,
      totalCost: 0.12,
      last_updated: now - 120000,
      lastUpdated: now - 120000,
    },
    {
      id: 'proj_corvus',
      name: 'corvus',
      raw_name: null,
      worktree: '/home/hollen/Code/corvus',
      session_count: 8,
      sessionCount: 8,
      active_count: 0,
      activeCount: 0,
      total_tokens: 850000,
      totalTokens: 850000,
      total_cost: 0.28,
      totalCost: 0.28,
      last_updated: now - 3600000 * 24,
      lastUpdated: now - 3600000 * 24,
    },
  ];
}

function getMockWorld(projectId) {
  const now = Date.now();
  const mockMaster = {
    id: 'ses_mighty_moon',
    slug: 'mighty-moon',
    title: 'Building MCP-first Kanban app with Onion architecture',
    agent: 'team-lead',
    model: 'Qwen Medium Long Context',
    modelData: { id: 'Qwen Medium Long Context', providerID: 'llama.cpp' },
    cost: 0.45,
    tokens_input: 308077,
    tokens_output: 40152,
    tokens_reasoning: 15200,
    tokens_cache_read: 95000,
    tokens_cache_write: 12000,
    time_created: now - 3600000 * 3,
    time_updated: now - 30000,
    time_archived: null,
    is_active: true,
    status: 'active',
    station: 'board',
    currentTask: 'Orchestrating subagents & Kanban architecture',
    subagents: [
      {
        id: 'ses_nimble_falcon',
        role: 'backend-dev',
        agent: 'backend-dev',
        title: 'Comments/notes/ACs/artifacts writes (@backend-dev subagent)',
        slug: 'nimble-falcon',
        model: 'Qwen Medium Low Precision',
        modelData: { id: 'Qwen Medium Low Precision', providerID: 'llama.cpp' },
        time_created: now - 3600000,
        time_updated: now - 20000,
        is_active: true,
        status: 'active',
        recent_task: 'Implement typed comments, replace-on-write notes, and AC toggle',
        recentTask: 'Implement typed comments, replace-on-write notes, and AC toggle',
        station: 'forge',
        tokens_input: 63400,
        tokens_output: 21100,
        tokens_reasoning: 0,
        cost: 0.15,
      },
      {
        id: 'ses_sunny_forest',
        role: 'explore',
        agent: 'explore',
        title: 'Extract lease specs & infra (@explore subagent)',
        slug: 'sunny-forest',
        model: 'Qwen Small',
        modelData: { id: 'Qwen Small', providerID: 'llama.cpp' },
        time_created: now - 3600000 * 2,
        time_updated: now - 3600000,
        is_active: false,
        status: 'idle',
        recent_task: 'Scrying codebase architecture specs in ARCHITECTURE.md',
        recentTask: 'Scrying codebase architecture specs in ARCHITECTURE.md',
        station: 'library',
        tokens_input: 74100,
        tokens_output: 1680,
        tokens_reasoning: 0,
        cost: 0.05,
      },
    ],
    todos: [
      {
        session_id: 'ses_mighty_moon',
        content: 'Create hybrid_name.go with hybrid name generator',
        status: 'completed',
        priority: 'high',
        position: 0,
        time_created: now - 3600000 * 2,
        time_updated: now - 3600000 * 2,
      },
      {
        session_id: 'ses_mighty_moon',
        content: 'Implement unit of work pattern for transactions',
        status: 'completed',
        priority: 'high',
        position: 1,
        time_created: now - 3600000 * 2,
        time_updated: now - 3600000,
      },
    ],
    activeAgents: 2,
    activeAgentsCount: 2,
  };

  return {
    project: {
      id: projectId || 'proj_crowban',
      name: 'crowban',
      worktree: '/home/hollen/Code/crowban',
      time_created: now - 3600000 * 24,
      time_updated: now - 30000,
    },
    sessions: [mockMaster],
    masterSessions: [mockMaster],
    totalSessions: 1,
    activeCount: 1,
  };
}

function getMockLogs(sessionId) {
  const now = Date.now();
  return [
    {
      id: 'mock_msg_1',
      type: 'text',
      role: 'user',
      text: 'Implement collaboration writes for crowban.',
      reasoning: null,
      toolCall: null,
      time: now - 180000,
      timestamp: now - 180000,
      messageId: 'mock_msg_1',
    },
    {
      id: 'mock_part_tool',
      type: 'tool',
      role: 'assistant',
      text: null,
      reasoning: null,
      toolCall: {
        name: 'write',
        id: 'call_mock_write_1',
        title: 'internal/application/acceptance.go',
        input: { filePath: 'internal/application/acceptance.go' },
        output: 'Wrote file successfully.',
        status: 'completed',
        time: { start: now - 90000, end: now - 89000 },
      },
      time: now - 90000,
      timestamp: now - 90000,
      messageId: 'mock_msg_2',
    },
  ];
}

function getMockTodos(sessionId) {
  const now = Date.now();
  return [
    {
      session_id: sessionId || 'mock_session',
      content: 'Create hybrid_name.go with hybrid name generator',
      status: 'completed',
      priority: 'high',
      position: 0,
      time_created: now - 3600000 * 2,
      time_updated: now - 3600000 * 2,
    },
    {
      session_id: sessionId || 'mock_session',
      content: 'Implement unit of work pattern for transactions',
      status: 'in_progress',
      priority: 'high',
      position: 1,
      time_created: now - 3600000 * 2,
      time_updated: now - 3600000,
    },
  ];
}

function getMockActive() {
  const now = Date.now();
  return [
    {
      id: 'ses_mighty_moon',
      sessionId: 'ses_mighty_moon',
      status: 'active',
      is_active: true,
      slug: 'mighty-moon',
      title: 'Building MCP-first Kanban app with Onion architecture',
      agent: 'team-lead',
      model: 'Qwen Medium Long Context',
      projectId: 'proj_crowban',
      time_updated: now - 30000,
      lastUpdated: now - 30000,
      station: 'board',
    },
  ];
}

function getMockDiffs(sessionId) {
  return [
    {
      file: 'internal/application/acceptance.go',
      additions: 120,
      deletions: 0,
      patch: '+ package application\n\ntype Acceptance struct {...}',
      type: 'write',
    },
  ];
}

function getMockAnalytics(projectId) {
  return {
    projectId: projectId || 'proj_crowban',
    projectName: 'crowban',
    summary: {
      totalSessions: 13,
      totalTokens: 28119246,
      totalTokensInput: 990761,
      totalTokensOutput: 444703,
      totalTokensReasoning: 0,
      totalTokensCacheRead: 26683782,
      totalTokensCacheWrite: 0,
      totalCostUsd: 0.45,
      cacheHitEfficiencyPercent: 96.42,
      estimatedSavingsUsd: 72.05,
    },
    catalysts: [
      {
        catalyst: 'Qwen Catalyst',
        models: ['Qwen Medium Long Context', 'Qwen Small', 'Qwen Medium Low Precision'],
        tokens_input: 990761,
        tokens_output: 444703,
        tokens_reasoning: 0,
        tokens_cache_read: 26683782,
        tokens_cache_write: 0,
        total_tokens: 28119246,
        cost: 0.45,
        sessions_count: 13,
      },
    ],
    timeline: {
      '2026-09-25': 3,
      '2026-09-26': 10,
    },
  };
}

function getMockScribeTale(sessionId) {
  return {
    title: 'The Saga of Building MCP-first Kanban app with Onion architecture',
    guildmaster: 'mighty-moon',
    masterSessionId: sessionId,
    fellowshipSize: 4,
    fellowship: [
      { name: 'mighty-moon', role: 'Guildmaster Commander', station: 'High Sanctum (Board)' },
      { name: 'nimble-falcon', role: 'Dwarf Smith (backend-dev)', station: 'The Great Anvil (Forge)' },
    ],
    completedQuestsCount: 3,
    inProgressQuestsCount: 1,
    sealsForged: 2,
    modifiedFilesCount: 3,
    manaExpended: 348229,
    chapters: [
      {
        title: 'Chapter I: The Gathering at the High Sanctum',
        text: 'In the third watch, Guildmaster mighty-moon summoned an elite fellowship to forge the Onion Citadel.',
      },
    ],
    narrative: 'In the third watch, Guildmaster mighty-moon convened the fellowship to forge the Onion Citadel...',
  };
}

// Auto-initialize default connection
initDb();

module.exports = {
  initDb,
  isDbConnected,
  getSessionDirectory,
  formatDisplayName,
  assignStation,
  parseModel,
  getLockInfo,
  getActiveSessions,
  getProjects,
  getProjectWorld,
  getSessionLogs,
  getSessionTodos,
  createSessionTodo,
  updateSessionTodo,
  getSessionDiffs,
  getProjectAnalytics,
  getSessionScribeTale,
  getStargateNetwork,
  checkDbUpdates,
  getMockProjects,
  getMockWorld,
  getMockLogs,
  getMockTodos,
  getMockActive,
  getMockDiffs,
  getMockAnalytics,
  getMockScribeTale,
};
