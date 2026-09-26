// server/queue.js
// Single-GPU Smart Message Queue & Dispatcher for OpenCode RPG

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const dbService = require('./db.js');

const LOCKS_DIR = process.env.OPENCODE_LOCKS_DIR || '/home/hollen/.local/state/opencode/locks';
const BUSY_TIMESTAMP_THRESHOLD_MS = 45 * 1000; // 45 seconds

// In-memory queue state
let decreeQueue = []; // array of decree objects
let currentRunningProcess = null;
let currentRunningDecree = null;
let sseBroadcastCallback = null;
let lastGpuBusyState = null;
let dispatcherTimer = null;

/**
 * Configure the SSE broadcast function for queue event emission.
 */
function setSseBroadcaster(fn) {
  sseBroadcastCallback = fn;
}

function emitSse(eventType, data) {
  if (typeof sseBroadcastCallback === 'function') {
    try {
      sseBroadcastCallback(eventType, data);
    } catch (err) {
      console.error('[Queue SSE] Error broadcasting:', err.message);
    }
  }
}

/**
 * Single-GPU Busy Detection:
 * 1. Checks /home/hollen/.local/state/opencode/locks for active session locks.
 * 2. Checks DB part and message tables for recent timestamps (< 45s).
 * 3. Checks if our internal dispatcher is actively running a process.
 */
function getGpuStatus() {
  const now = Date.now();
  let lockCount = 0;
  let activeLockPid = null;

  // 1. Scan locks directory
  try {
    if (fs.existsSync(LOCKS_DIR)) {
      const entries = fs.readdirSync(LOCKS_DIR, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && e.name.endsWith('.lock')) {
          const metaPath = path.join(LOCKS_DIR, e.name, 'meta.json');
          if (fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              if (meta && meta.pid) {
                try {
                  process.kill(meta.pid, 0); // test if process is alive
                  lockCount++;
                  activeLockPid = meta.pid;
                } catch {}
              }
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.error('[Queue] Error checking locks:', err.message);
  }

  // 2. Scan DB recent activity (< 45s)
  let activeSessionId = null;
  let dbActivityReason = null;

  if (dbService.isDbConnected()) {
    try {
      const recentThreshold = now - BUSY_TIMESTAMP_THRESHOLD_MS;
      // Scoped check using indexed queries
      const activeSessions = dbService.getActiveSessions();
      if (activeSessions.length > 0) {
        const topActive = activeSessions[0];
        if (now - topActive.time_updated < BUSY_TIMESTAMP_THRESHOLD_MS) {
          activeSessionId = topActive.id;
          dbActivityReason = `Active agent (${topActive.agent || 'model'}) executing in session ${topActive.slug || topActive.id} (${Math.round((now - topActive.time_updated) / 1000)}s ago)`;
        }
      }
    } catch (err) {
      console.error('[Queue] Error querying DB activity:', err.message);
    }
  }

  // 3. Check internal running process
  let isBusy = false;
  let reason = 'Single GPU is idle and ready to receive royal decrees';

  if (currentRunningProcess !== null) {
    isBusy = true;
    activeSessionId = currentRunningDecree?.sessionId || activeSessionId;
    reason = `Executing queued decree ${currentRunningDecree?.id} for session ${currentRunningDecree?.sessionId}`;
  } else if (lockCount > 0) {
    isBusy = true;
    reason = `Active lock held by OpenCode process (PID ${activeLockPid})`;
  } else if (dbActivityReason) {
    isBusy = true;
    reason = dbActivityReason;
  }

  const pendingDecrees = decreeQueue.filter((d) => d.status === 'pending');

  const statusObj = {
    isBusy,
    reason,
    activeSessionId,
    lockCount,
    pendingDecreesCount: pendingDecrees.length,
    runningDecree: currentRunningDecree
      ? {
          id: currentRunningDecree.id,
          sessionId: currentRunningDecree.sessionId,
          prompt: currentRunningDecree.prompt,
          time_started: currentRunningDecree.time_started,
        }
      : null,
    timestamp: now,
  };

  // Check if GPU status transitioned
  if (lastGpuBusyState !== null && lastGpuBusyState !== isBusy) {
    emitSse('gpu_status_changed', statusObj);
  }
  lastGpuBusyState = isBusy;

  return statusObj;
}

/**
 * Priority rank helper: high (3) > normal (2) > low (1)
 */
function priorityRank(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'high':
      return 3;
    case 'low':
      return 1;
    default:
      return 2;
  }
}

/**
 * Enqueue a new prompt / royal decree for a session.
 */
function enqueueDecree(sessionId, { prompt, priority = 'normal' }) {
  if (!sessionId) {
    throw new Error('sessionId is required to enqueue a decree');
  }
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('prompt is required and cannot be empty');
  }

  const cleanPriority = ['high', 'normal', 'low'].includes(priority) ? priority : 'normal';
  const now = Date.now();

  const decree = {
    id: `decree_${now}_${Math.random().toString(36).slice(2, 7)}`,
    sessionId,
    prompt: prompt.trim(),
    priority: cleanPriority,
    status: 'pending',
    time_enqueued: now,
    time_started: null,
    time_completed: null,
    exitCode: null,
    outputPreview: '',
    error: null,
  };

  decreeQueue.push(decree);

  emitSse('decree_enqueued', {
    decree,
    queueLength: decreeQueue.filter((d) => d.status === 'pending').length,
    gpuStatus: getGpuStatus(),
  });

  // Attempt immediate dispatch if GPU is idle
  setImmediate(() => {
    dispatchNextDecree();
  });

  return decree;
}

/**
 * Retrieve queued decrees for a specific session.
 */
function getQueueForSession(sessionId) {
  return decreeQueue.filter((d) => d.sessionId === sessionId);
}

/**
 * Cancel a pending decree by ID.
 */
function cancelDecree(queueId) {
  const decree = decreeQueue.find((d) => d.id === queueId);
  if (!decree) {
    return null;
  }

  if (decree.status === 'pending') {
    decree.status = 'cancelled';
    decree.time_completed = Date.now();

    emitSse('decree_cancelled', {
      decreeId: queueId,
      sessionId: decree.sessionId,
      gpuStatus: getGpuStatus(),
    });

    return decree;
  }

  if (decree.status === 'running') {
    try {
      if (currentRunningProcess) {
        currentRunningProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.error('[Queue] Error killing running process:', err.message);
    }
    decree.status = 'cancelled';
    decree.time_completed = Date.now();
    decree.error = 'Cancelled by user command';
    currentRunningProcess = null;
    currentRunningDecree = null;

    emitSse('decree_cancelled', {
      decreeId: queueId,
      sessionId: decree.sessionId,
      gpuStatus: getGpuStatus(),
    });
    return decree;
  }

  return decree;
}

/**
 * Retrieve global single-GPU status and the decree queue.
 */
function getGlobalQueueStatus() {
  const gpu = getGpuStatus();
  return {
    gpu,
    queue: decreeQueue,
    pendingCount: decreeQueue.filter((d) => d.status === 'pending').length,
    runningCount: currentRunningDecree ? 1 : 0,
    completedCount: decreeQueue.filter((d) => d.status === 'completed').length,
  };
}

/**
 * Dispatches the next decree in queue when single-GPU is idle.
 */
function dispatchNextDecree() {
  if (currentRunningProcess !== null) {
    return; // Already executing a decree
  }

  const gpu = getGpuStatus();
  if (gpu.isBusy) {
    return; // GPU currently engaged by active lock or DB activity
  }

  // Find next pending decree: highest priority first, then oldest enqueued
  const pendingDecrees = decreeQueue.filter((d) => d.status === 'pending');
  if (pendingDecrees.length === 0) {
    return;
  }

  pendingDecrees.sort((a, b) => {
    const diffPriority = priorityRank(b.priority) - priorityRank(a.priority);
    if (diffPriority !== 0) return diffPriority;
    return a.time_enqueued - b.time_enqueued;
  });

  const nextDecree = pendingDecrees[0];
  nextDecree.status = 'running';
  nextDecree.time_started = Date.now();
  currentRunningDecree = nextDecree;

  emitSse('decree_started', {
    decree: nextDecree,
    gpuStatus: getGpuStatus(),
  });

  // Resolve session worktree/dir
  const workingDir = dbService.getSessionDirectory
    ? dbService.getSessionDirectory(nextDecree.sessionId)
    : process.cwd();

  console.log(
    `[Queue Dispatcher] 🚀 Dispatching decree ${nextDecree.id} for session ${nextDecree.sessionId}`
  );
  console.log(`[Queue Dispatcher] CWD: ${workingDir} | Prompt: "${nextDecree.prompt}"`);

  // Support Mock Dispatch for testing or fallback mode
  if (process.env.MOCK_DISPATCH === 'true') {
    setTimeout(() => {
      nextDecree.status = 'completed';
      nextDecree.exitCode = 0;
      nextDecree.time_completed = Date.now();
      nextDecree.outputPreview = 'Simulated dispatch successful.';
      currentRunningProcess = null;
      currentRunningDecree = null;

      emitSse('decree_completed', {
        decree: nextDecree,
        exitCode: 0,
        gpuStatus: getGpuStatus(),
      });
      // Try next item
      dispatchNextDecree();
    }, 150);
    return;
  }

  // Real spawn: opencode run -s <sessionId> "<prompt>"
  try {
    const child = spawn('opencode', ['run', '-s', nextDecree.sessionId, nextDecree.prompt], {
      cwd: workingDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    currentRunningProcess = child;
    let outputBuffer = '';

    child.stdout.on('data', (chunk) => {
      outputBuffer += chunk.toString();
      if (outputBuffer.length > 500) {
        nextDecree.outputPreview = outputBuffer.slice(-500);
      } else {
        nextDecree.outputPreview = outputBuffer;
      }
    });

    child.stderr.on('data', (chunk) => {
      outputBuffer += chunk.toString();
    });

    child.on('close', (code) => {
      console.log(`[Queue Dispatcher] Decree ${nextDecree.id} completed with code ${code}`);
      nextDecree.status = code === 0 ? 'completed' : 'failed';
      nextDecree.exitCode = code;
      nextDecree.time_completed = Date.now();
      nextDecree.outputPreview = outputBuffer.slice(-1000);

      currentRunningProcess = null;
      currentRunningDecree = null;

      emitSse('decree_completed', {
        decree: nextDecree,
        exitCode: code,
        gpuStatus: getGpuStatus(),
      });

      // Continue queue
      setImmediate(() => {
        dispatchNextDecree();
      });
    });

    child.on('error', (err) => {
      console.error(`[Queue Dispatcher] Process error for ${nextDecree.id}:`, err.message);
      nextDecree.status = 'failed';
      nextDecree.error = err.message;
      nextDecree.time_completed = Date.now();

      currentRunningProcess = null;
      currentRunningDecree = null;

      emitSse('decree_completed', {
        decree: nextDecree,
        exitCode: -1,
        gpuStatus: getGpuStatus(),
      });

      setImmediate(() => {
        dispatchNextDecree();
      });
    });
  } catch (err) {
    console.error(`[Queue Dispatcher] Spawn failure:`, err.message);
    nextDecree.status = 'failed';
    nextDecree.error = err.message;
    nextDecree.time_completed = Date.now();
    currentRunningProcess = null;
    currentRunningDecree = null;
  }
}

/**
 * Start the background polling dispatcher.
 */
function startDispatcherLoop(intervalMs = 2000) {
  if (dispatcherTimer) return;
  dispatcherTimer = setInterval(() => {
    dispatchNextDecree();
  }, intervalMs);
  dispatcherTimer.unref?.();
}

/**
 * Stop the background polling dispatcher.
 */
function stopDispatcherLoop() {
  if (dispatcherTimer) {
    clearInterval(dispatcherTimer);
    dispatcherTimer = null;
  }
}

// Auto-start dispatcher loop
startDispatcherLoop(2000);

module.exports = {
  getGpuStatus,
  enqueueDecree,
  getQueueForSession,
  cancelDecree,
  getGlobalQueueStatus,
  dispatchNextDecree,
  setSseBroadcaster,
  startDispatcherLoop,
  stopDispatcherLoop,
};
