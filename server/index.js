// server/index.js
// OpenCode RPG Backend Service
// Provides REST APIs, Single-GPU Smart Queue, Stargate Network, and SSE streaming

const express = require('express');
const cors = require('cors');
const dbService = require('./db.js');
const queueService = require('./queue.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Set of connected SSE clients
const sseClients = new Set();

// Shared timestamps for change tracking
const lastSeenTimestamps = {
  sessionTime: 0,
  partTime: 0,
  todoTime: 0,
};

// Wire queue service to broadcast over SSE
queueService.setSseBroadcaster(broadcastSse);

// =========================================================================
// REST API ENDPOINTS
// =========================================================================

/**
 * Health check endpoint
 */
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'opencode-rpg-server',
    dbConnected: dbService.isDbConnected(),
    uptime: Math.round(process.uptime()),
    timestamp: Date.now(),
  });
});

/**
 * 1. GET /api/projects
 * List all projects (realms) with aggregated stats:
 * id, name, worktree, session_count, active_count, total_tokens, total_cost, last_updated.
 * Ordered by last_updated DESC.
 */
app.get('/api/projects', (req, res) => {
  try {
    const projects = dbService.getProjects();
    res.json(projects);
  } catch (err) {
    console.error('[API] /api/projects error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve realms', message: err.message });
  }
});

/**
 * 2. GET /api/projects/:projectId/world
 * World details:
 * - Project metadata (id, name, worktree)
 * - Master sessions (where parent_id IS NULL)
 *   - Session info (id, slug, title, agent, model, cost, tokens, time, is_active, status, station)
 *   - Subagents: child sessions with role/agent, title, slug, model, time_updated, is_active, status, recent_task, station
 *   - Todos: list of todos for master and children (session_id, content, status, priority, position, time_updated)
 *   - Station mapping ('forge', 'library', 'cauldron', 'board', 'treasury')
 */
app.get('/api/projects/:projectId/world', (req, res) => {
  try {
    const { projectId } = req.params;
    const world = dbService.getProjectWorld(projectId);
    if (!world) {
      return res.status(404).json({ error: 'Realm not found', projectId });
    }
    res.json(world);
  } catch (err) {
    console.error(`[API] /api/projects/${req.params.projectId}/world error:`, err.message);
    res.status(500).json({ error: 'Failed to retrieve realm world', message: err.message });
  }
});

/**
 * 2b. GET /api/projects/:projectId/sessions
 * Frontend compatible alias that returns sessions array
 */
app.get('/api/projects/:projectId/sessions', (req, res) => {
  try {
    const { projectId } = req.params;
    const world = dbService.getProjectWorld(projectId);
    if (!world) {
      return res.json([]);
    }
    const sessions = world.sessions || [];
    res.json(sessions);
  } catch (err) {
    console.error(`[API] /api/projects/${req.params.projectId}/sessions error:`, err.message);
    res.json([]);
  }
});

/**
 * 2c. GET /api/projects/:projectId/analytics
 * Advanced Project Analytics:
 * - Token usage breakdown by Model Catalyst (Qwen, Claude, GPT, etc.)
 * - Cache hit efficiency percentage and estimated cost savings
 * - Session activity timeline (sessions per day)
 */
app.get('/api/projects/:projectId/analytics', (req, res) => {
  try {
    const { projectId } = req.params;
    const analytics = dbService.getProjectAnalytics(projectId);
    res.json(analytics);
  } catch (err) {
    console.error(`[API] /api/projects/${req.params.projectId}/analytics error:`, err.message);
    res.status(500).json({ error: 'Failed to compute realm analytics', message: err.message });
  }
});

/**
 * 2d. GET /api/stargate/network
 * Stargate Network Galaxy Map:
 * Returns all project realms mapped as Stargate planetary destinations.
 */
app.get('/api/stargate/network', (req, res) => {
  try {
    const network = dbService.getStargateNetwork();
    res.json({
      destinations: network,
      totalPlanets: network.length,
      engagedCount: network.filter((d) => d.status === 'ENGAGED').length,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[API] /api/stargate/network error:', err.message);
    res.status(500).json({ error: 'Failed to scry Stargate network', message: err.message });
  }
});

/**
 * 3. GET /api/sessions/:sessionId/logs
 * Retrieve chronicle items for the specified session (and optional child subagents).
 */
app.get('/api/sessions/:sessionId/logs', (req, res) => {
  try {
    const { sessionId } = req.params;
    const includeChildren = req.query.includeChildren === 'true' || req.query.all === 'true';
    const logs = dbService.getSessionLogs(sessionId, includeChildren);
    res.json(logs);
  } catch (err) {
    console.error(`[API] /api/sessions/${req.params.sessionId}/logs error:`, err.message);
    res.status(500).json({ error: 'Failed to retrieve chronicle logs', message: err.message });
  }
});

/**
 * 3b. GET /api/sessions/:sessionId/todos
 * Retrieve todos for session and its subagents (used by QuestBoard).
 */
app.get('/api/sessions/:sessionId/todos', (req, res) => {
  try {
    const { sessionId } = req.params;
    const todos = dbService.getSessionTodos(sessionId);
    res.json({ todos, total: todos.length });
  } catch (err) {
    console.error(`[API] /api/sessions/${req.params.sessionId}/todos error:`, err.message);
    res.status(500).json({ error: 'Failed to retrieve session quests', message: err.message });
  }
});

/**
 * 3c. POST /api/sessions/:sessionId/todos
 * Inscribe a new quest / todo into the session questboard.
 */
app.post('/api/sessions/:sessionId/todos', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content, priority } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Quest content is required' });
    }

    const newTodo = dbService.createSessionTodo(sessionId, { content, priority });

    broadcastSse('session_updated', {
      type: 'session_updated',
      session: { id: sessionId, todos: dbService.getSessionTodos(sessionId) },
    });

    res.status(201).json({ success: true, todo: newTodo });
  } catch (err) {
    console.error(`[API] POST /api/sessions/${req.params.sessionId}/todos error:`, err.message);
    res.status(500).json({ error: 'Failed to create quest', message: err.message });
  }
});

/**
 * 3d. PATCH /api/sessions/:sessionId/todos/:position
 * Toggle or update quest status ('completed', 'in_progress', 'pending') or priority.
 */
app.patch('/api/sessions/:sessionId/todos/:position', (req, res) => {
  try {
    const { sessionId, position } = req.params;
    const updates = req.body || {};

    const updatedTodo = dbService.updateSessionTodo(sessionId, position, updates);

    if (updates.status === 'completed') {
      broadcastSse('quest_completed', {
        content: updatedTodo.content,
        session_id: sessionId,
      });
    }

    broadcastSse('session_updated', {
      type: 'session_updated',
      session: { id: sessionId, todos: dbService.getSessionTodos(sessionId) },
    });

    res.json({ success: true, todo: updatedTodo });
  } catch (err) {
    console.error(
      `[API] PATCH /api/sessions/${req.params.sessionId}/todos/${req.params.position} error:`,
      err.message
    );
    res.status(500).json({ error: 'Failed to update quest', message: err.message });
  }
});

/**
 * 3e. GET /api/sessions/:sessionId/diffs
 * File Diffs & Code Edits API
 */
app.get('/api/sessions/:sessionId/diffs', (req, res) => {
  try {
    const { sessionId } = req.params;
    const diffs = dbService.getSessionDiffs(sessionId);
    res.json(diffs);
  } catch (err) {
    console.error(`[API] /api/sessions/${req.params.sessionId}/diffs error:`, err.message);
    res.status(500).json({ error: 'Failed to extract file diffs', message: err.message });
  }
});

/**
 * 3f. GET /api/sessions/:sessionId/scribe
 * The Royal Scribe API: Medieval epic quest chronicle
 */
app.get('/api/sessions/:sessionId/scribe', (req, res) => {
  try {
    const { sessionId } = req.params;
    const tale = dbService.getSessionScribeTale(sessionId);
    res.json(tale);
  } catch (err) {
    console.error(`[API] /api/sessions/${req.params.sessionId}/scribe error:`, err.message);
    res.status(500).json({ error: 'Failed to generate scribe tale', message: err.message });
  }
});

// =========================================================================
// SINGLE-GPU SMART MESSAGE QUEUE ENDPOINTS
// =========================================================================

/**
 * 4a. POST /api/sessions/:sessionId/queue
 * Enqueue a prompt / royal decree to be executed when single-GPU is idle.
 */
app.post('/api/sessions/:sessionId/queue', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { prompt, priority } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required to enqueue decree' });
    }

    const decree = queueService.enqueueDecree(sessionId, { prompt, priority });
    res.status(201).json({ success: true, decree, gpuStatus: queueService.getGpuStatus() });
  } catch (err) {
    console.error(`[API] POST /api/sessions/${req.params.sessionId}/queue error:`, err.message);
    res.status(500).json({ error: 'Failed to enqueue royal decree', message: err.message });
  }
});

/**
 * 4b. GET /api/sessions/:sessionId/queue
 * List queued decrees for a specific session.
 */
app.get('/api/sessions/:sessionId/queue', (req, res) => {
  try {
    const { sessionId } = req.params;
    const decrees = queueService.getQueueForSession(sessionId);
    res.json({
      sessionId,
      decrees,
      count: decrees.length,
      gpuStatus: queueService.getGpuStatus(),
    });
  } catch (err) {
    console.error(`[API] GET /api/sessions/${req.params.sessionId}/queue error:`, err.message);
    res.status(500).json({ error: 'Failed to retrieve session queue', message: err.message });
  }
});

/**
 * 4c. DELETE /api/queue/:queueId
 * Cancel a pending or running decree in the queue.
 */
app.delete('/api/queue/:queueId', (req, res) => {
  try {
    const { queueId } = req.params;
    const cancelled = queueService.cancelDecree(queueId);
    if (!cancelled) {
      return res.status(404).json({ error: 'Decree not found in queue', queueId });
    }
    res.json({ success: true, decree: cancelled, gpuStatus: queueService.getGpuStatus() });
  } catch (err) {
    console.error(`[API] DELETE /api/queue/${req.params.queueId} error:`, err.message);
    res.status(500).json({ error: 'Failed to cancel decree', message: err.message });
  }
});

/**
 * 4d. GET /api/queue/status
 * Global single-GPU busy status & decree queue telemetry.
 */
app.get('/api/queue/status', (req, res) => {
  try {
    const status = queueService.getGlobalQueueStatus();
    res.json(status);
  } catch (err) {
    console.error('[API] GET /api/queue/status error:', err.message);
    res.status(500).json({ error: 'Failed to check single-GPU queue status', message: err.message });
  }
});

/**
 * 5. GET /api/active
 * Detect active sessions checking locks and recent updates.
 */
app.get('/api/active', (req, res) => {
  try {
    const activeSessions = dbService.getActiveSessions();
    const locks = dbService.getLockInfo();

    if (req.query.format === 'object') {
      res.json({
        activeSessionIds: activeSessions.map((s) => s.id),
        activeSessions,
        locks,
        count: activeSessions.length,
      });
    } else {
      res.json(activeSessions);
    }
  } catch (err) {
    console.error('[API] /api/active error:', err.message);
    res.status(500).json({ error: 'Failed to detect active agents', message: err.message });
  }
});

/**
 * 6. GET /api/events
 * Server-Sent Events (SSE) stream pushing updates every 3 seconds or on DB change.
 */
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  if (res.flushHeaders) {
    res.flushHeaders();
  }

  sseClients.add(res);

  const welcomePayload = {
    type: 'connected',
    message: 'OpenCode Arcane Stream active',
    gpu: queueService.getGpuStatus(),
    timestamp: Date.now(),
  };
  res.write(`data: ${JSON.stringify(welcomePayload)}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Broadcast helper for SSE
function broadcastSse(eventType, data) {
  if (sseClients.size === 0) return;

  let messageStr = '';
  if (eventType && eventType !== 'message') {
    messageStr += `event: ${eventType}\n`;
  }
  messageStr += `data: ${JSON.stringify(data)}\n\n`;

  for (const client of sseClients) {
    try {
      client.write(messageStr);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Background poller ticking every 3 seconds
const SSE_POLL_INTERVAL_MS = 3000;
const poller = setInterval(() => {
  if (sseClients.size === 0) return;

  try {
    const { hasChanges, updatedSession, newToolCall, completedTodo } =
      dbService.checkDbUpdates(lastSeenTimestamps);

    if (hasChanges) {
      if (updatedSession) {
        broadcastSse('session_updated', { type: 'session_updated', session: updatedSession });
        broadcastSse(null, { type: 'session_updated', session: updatedSession });
      }

      if (newToolCall) {
        broadcastSse('tool_call', newToolCall);
      }

      if (completedTodo) {
        broadcastSse('quest_completed', completedTodo);
      }
    } else {
      const now = Date.now();
      broadcastSse(null, { type: 'sync', timestamp: now });
      broadcastSse('heartbeat', { type: 'heartbeat', timestamp: now });
    }
  } catch (err) {
    console.error('[SSE Poller] Error in periodic broadcast:', err.message);
  }
}, SSE_POLL_INTERVAL_MS);

poller.unref?.();

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Serve built frontend assets
const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}


// Generic error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Arcane Error', message: err.message });
});

// Start the server if executed directly
let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`🏰 OpenCode RPG Backend running at http://localhost:${PORT}`);
    console.log(`📡 SSE Stream available at http://localhost:${PORT}/api/events`);
    console.log(`🌀 Stargate Network active at http://localhost:${PORT}/api/stargate/network`);
    console.log(`⚡ Single-GPU Smart Queue online at http://localhost:${PORT}/api/queue/status`);
  });
}

module.exports = { app, server, broadcastSse };
