// server/verify.js
// Verification suite testing all OpenCode RPG backend endpoints against live database, queue, stargate network, and mock fallback

const http = require('node:http');
const dbService = require('./db.js');
const queueService = require('./queue.js');
const { app } = require('./index.js');

const TEST_PORT = 3002;
let serverInstance = null;

function requestJson(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:${TEST_PORT}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data, error: e.message });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function fetchJson(path) {
  return requestJson(path, 'GET');
}

function testSse() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${TEST_PORT}/api/events`, (res) => {
      const contentType = res.headers['content-type'];
      let chunkCount = 0;
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        chunkCount++;
        if (buffer.includes('connected') || chunkCount >= 1) {
          req.destroy();
          resolve({
            status: res.statusCode,
            contentType,
            bufferReceived: buffer,
          });
        }
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNRESET') {
        resolve({ status: 200, closed: true });
      } else {
        reject(err);
      }
    });

    setTimeout(() => {
      req.destroy();
      resolve({ status: 200, timeout: true });
    }, 4000);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('🔮 Starting OpenCode RPG Comprehensive Verification Suite...\n');

  // Enable test mock dispatch for lightning-fast queue test
  process.env.MOCK_DISPATCH = 'true';

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`[Test Server] Listening on http://localhost:${TEST_PORT}`);
      resolve();
    });
  });

  let testProjectId = null;
  let testSessionId = null;

  try {
    // 1. Health check
    console.log('Test 1: GET /health');
    const health = await fetchJson('/health');
    assert(health.status === 200, `Health check returned status ${health.status}`);
    assert(health.data.status === 'ok', 'Health status is ok');
    console.log('  ✓ Health check passed (dbConnected:', health.data.dbConnected, ')\n');

    // 2. GET /api/projects
    console.log('Test 2: GET /api/projects');
    const projectsRes = await fetchJson('/api/projects');
    assert(projectsRes.status === 200, `Expected 200, got ${projectsRes.status}`);
    assert(Array.isArray(projectsRes.data), 'Expected projects response to be an array');
    assert(projectsRes.data.length > 0, 'Expected at least 1 project');

    const firstProj = projectsRes.data[0];
    testProjectId = firstProj.id;
    console.log(`  ✓ Returned ${projectsRes.data.length} projects`);
    console.log(`  ✓ First project: "${firstProj.name}" (${firstProj.id})\n`);

    // 3. GET /api/stargate/network (STARGATE OVERWORLD MAP)
    console.log('Test 3: GET /api/stargate/network (Stargate Network)');
    const stargateRes = await fetchJson('/api/stargate/network');
    assert(stargateRes.status === 200, `Expected 200, got ${stargateRes.status}`);
    assert(Array.isArray(stargateRes.data.destinations), 'Expected destinations array');
    assert(stargateRes.data.destinations.length > 0, 'Expected at least 1 destination');

    const dest = stargateRes.data.destinations[0];
    assert(dest.planetDesignation, 'Destination must have planet designation');
    assert(Array.isArray(dest.stargateAddress) && dest.stargateAddress.length === 7, 'Must have 7 chevron glyphs');
    assert(dest.galaxyCoords && typeof dest.galaxyCoords.x === 'number', 'Must have galaxyCoords {x, y}');
    assert(['forest', 'desert', 'snow', 'void'].includes(dest.biome), `Invalid biome: ${dest.biome}`);
    assert(['ONLINE', 'DIALING', 'ENGAGED'].includes(dest.status), `Invalid status: ${dest.status}`);

    console.log(`  ✓ Stargate network active with ${stargateRes.data.totalPlanets} planetary gates`);
    console.log(`  ✓ Primary Gate: ${dest.planetDesignation}`);
    console.log(`    Address: [${dest.stargateAddress.join(' ')}] | Biome: ${dest.biome} | Coords: (${dest.galaxyCoords.x}%, ${dest.galaxyCoords.y}%) | Status: ${dest.status}\n`);

    // 4. GET /api/projects/:projectId/world
    console.log(`Test 4: GET /api/projects/${testProjectId}/world`);
    const worldRes = await fetchJson(`/api/projects/${testProjectId}/world`);
    assert(worldRes.status === 200, `Expected 200, got ${worldRes.status}`);
    assert(worldRes.data.project, 'World must include project metadata');
    assert(Array.isArray(worldRes.data.sessions), 'World must have sessions array');

    if (worldRes.data.sessions.length > 0) {
      const master = worldRes.data.sessions[0];
      testSessionId = master.id;
      assert(master.id, 'Master session must have id');
      console.log(`  ✓ World master: "${master.title}" -> Station: ${master.station}\n`);
    }

    // 5. GET /api/projects/:projectId/analytics
    console.log(`Test 5: GET /api/projects/${testProjectId}/analytics`);
    const analyticsRes = await fetchJson(`/api/projects/${testProjectId}/analytics`);
    assert(analyticsRes.status === 200, `Expected 200, got ${analyticsRes.status}`);
    assert(analyticsRes.data.summary, 'Analytics must include summary');
    console.log(`  ✓ Analytics: Cache Hit = ${analyticsRes.data.summary.cacheHitEfficiencyPercent}%, Est. Savings = $${analyticsRes.data.summary.estimatedSavingsUsd}\n`);

    // 6. SINGLE-GPU SMART QUEUE TESTS
    console.log('Test 6: Single-GPU Smart Queue API');

    // 6a. GET /api/queue/status
    console.log('  Test 6a: GET /api/queue/status');
    const queueStatusRes = await fetchJson('/api/queue/status');
    assert(queueStatusRes.status === 200, `Expected 200, got ${queueStatusRes.status}`);
    assert('isBusy' in queueStatusRes.data.gpu, 'GPU status must have isBusy flag');
    console.log(`    ✓ Single-GPU Status: isBusy=${queueStatusRes.data.gpu.isBusy} (${queueStatusRes.data.gpu.reason})`);

    // 6b. POST /api/sessions/:sessionId/queue (Enqueue Decree)
    if (testSessionId) {
      console.log(`  Test 6b: POST /api/sessions/${testSessionId}/queue`);
      const enqueueRes = await requestJson(`/api/sessions/${testSessionId}/queue`, 'POST', {
        prompt: 'Inscribe AST verification runes into test suite',
        priority: 'high',
      });
      assert(enqueueRes.status === 201, `Expected 201, got ${enqueueRes.status}`);
      assert(enqueueRes.data.success === true, 'Expected success: true');
      const queuedDecreeId = enqueueRes.data.decree.id;
      console.log(`    ✓ Enqueued decree ${queuedDecreeId} with priority '${enqueueRes.data.decree.priority}'`);

      // 6c. GET /api/sessions/:sessionId/queue
      console.log(`  Test 6c: GET /api/sessions/${testSessionId}/queue`);
      const sessionQueueRes = await fetchJson(`/api/sessions/${testSessionId}/queue`);
      assert(sessionQueueRes.status === 200, `Expected 200, got ${sessionQueueRes.status}`);
      assert(Array.isArray(sessionQueueRes.data.decrees), 'Expected decrees array');
      console.log(`    ✓ Retrieved session queue: ${sessionQueueRes.data.decrees.length} decrees`);

      // 6d. Enqueue and Cancel Decree
      const decreeToCancel = queueService.enqueueDecree(testSessionId, {
        prompt: 'Task to be cancelled',
        priority: 'low',
      });
      const cancelRes = await requestJson(`/api/queue/${decreeToCancel.id}`, 'DELETE');
      assert(cancelRes.status === 200, `Expected 200, got ${cancelRes.status}`);
      assert(cancelRes.data.decree.status === 'cancelled', 'Status must be cancelled');
      console.log(`    ✓ Cancelled decree ${decreeToCancel.id} successfully\n`);
    }

    // 7. Interactive Quests & Code Diffs & Royal Scribe
    if (testSessionId) {
      console.log(`Test 7: Session Details for ${testSessionId}`);

      // 7a. GET diffs
      const diffsRes = await fetchJson(`/api/sessions/${testSessionId}/diffs`);
      assert(diffsRes.status === 200, `Expected 200 for diffs`);
      console.log(`  ✓ Extracted ${diffsRes.data.length} file diffs and patches`);

      // 7b. GET scribe
      const scribeRes = await fetchJson(`/api/sessions/${testSessionId}/scribe`);
      assert(scribeRes.status === 200, `Expected 200 for scribe`);
      console.log(`  ✓ Royal Scribe: "${scribeRes.data.title}" (${scribeRes.data.chapters.length} chapters)`);

      // 7c. POST & PATCH todo
      const createTodoRes = await requestJson(`/api/sessions/${testSessionId}/todos`, 'POST', {
        content: `Reinforce gate barrier at ${Date.now()}`,
        priority: 'high',
      });
      assert(createTodoRes.status === 201, 'Todo creation failed');
      const patchTodoRes = await requestJson(
        `/api/sessions/${testSessionId}/todos/${createTodoRes.data.todo.position}`,
        'PATCH',
        { status: 'completed' }
      );
      assert(patchTodoRes.status === 200 && patchTodoRes.data.todo.status === 'completed', 'Todo patch failed');
      console.log(`  ✓ Interactive Quest created & toggled to completed\n`);
    }

    // 8. GET /api/events (SSE)
    console.log('Test 8: GET /api/events (SSE stream)');
    const sseRes = await testSse();
    assert(sseRes.status === 200, `Expected 200 for SSE, got ${sseRes.status}`);
    assert(sseRes.contentType.includes('text/event-stream'), 'Content-Type must be text/event-stream');
    console.log('  ✓ SSE connection established with text/event-stream\n');

    console.log('🎉 ALL BACKEND, QUEUE & STARGATE TESTS PASSED 100%! ⚔️🛡️🌀');
  } finally {
    queueService.stopDispatcherLoop();
    if (serverInstance) {
      serverInstance.close();
      console.log('[Test Server] Closed');
    }
  }

  // 9. Test Fallback Mode
  console.log('\n🛡️ Testing Fallback / Safe Mode with FORCE_FALLBACK=true...');
  dbService.initDb('/nonexistent/path/opencode.db');
  const mockStargate = dbService.getStargateNetwork();
  assert(mockStargate.length > 0, 'Mock stargate must not be empty');
  const mockWorld = dbService.getProjectWorld('proj_crowban');
  assert(mockWorld.sessions.length > 0, 'Mock world must have sessions');
  console.log('  ✓ Safe fallback mode verified across all features!');

  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  queueService.stopDispatcherLoop();
  if (serverInstance) serverInstance.close();
  process.exit(1);
});
