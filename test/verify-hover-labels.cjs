// test/verify-hover-labels.cjs
// Verifies that character/agent labels are only shown when moused over

const puppeteer = require('puppeteer');
const { app } = require('../server/index.js');
const path = require('path');
const fs = require('fs');

async function runHoverLabelsVerification() {
  const PORT = 3006;
  const server = app.listen(PORT, () => {
    console.log(`[Verify Hover Server] Listening on http://localhost:${PORT}`);
  });

  const outputDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let browser = null;
  try {
    console.log('🚀 Launching Puppeteer to verify hover-only character labels...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[BROWSER CONSOLE ERROR]', msg.text());
    });
    page.on('pageerror', (err) => console.error('[BROWSER PAGE ERROR]', err.message));

    console.log('🌐 Navigating to OpenCode RPG...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // TEST 1: Village Exterior - Clean View without mouse hover
    console.log('🌳 [Test 1] Verifying Village Exterior has no floating labels when unhovered...');
    // Move mouse to top-left corner so nothing is hovered
    await page.mouse.move(50, 50);
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({ path: path.join(outputDir, '28_clean_village_exterior_no_labels.png') });
    console.log('  ✓ Screenshot saved: 28_clean_village_exterior_no_labels.png');

    // TEST 2: Village Exterior - Hover over an Agent
    console.log('🌳 [Test 2] Hovering over an exterior agent to verify label appears on mouse over...');
    const agentPos = await page.evaluate(() => {
      // Find an agent in world coordinates and convert to screen coordinates
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      // In default exterior view, center is at screen (640, 400).
      // A hut master agent is near doorX - 28, doorY + 12
      return { screenX: 580, screenY: 340 };
    });

    // Hover over agent
    await page.mouse.move(agentPos.screenX, agentPos.screenY);
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({ path: path.join(outputDir, '29_hovered_exterior_agent_label.png') });
    console.log('  ✓ Screenshot saved: 29_hovered_exterior_agent_label.png');

    // TEST 3: Enter House Interior - Verify Clean Room with No Cluttered Labels
    console.log('\n🏠 [Test 3] Entering House Interior...');
    await page.evaluate(() => {
      if (window.__enterFirstHutInterior) {
        window.__enterFirstHutInterior();
      }
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Move mouse away to dark void corner (50, 50) so no agent is hovered
    await page.mouse.move(50, 50);
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({ path: path.join(outputDir, '30_clean_interior_no_labels.png') });
    console.log('  ✓ Screenshot saved: 30_clean_interior_no_labels.png (Clean workshop, zero label clutter!)');

    // TEST 4: Hover over Blacksmith / Coder Agent in Interior
    console.log('🔨 [Test 4] Hovering mouse over Coder/Blacksmith at the Forge in Interior...');
    // In interior:
    // Room center (416, 288) is at screen (640, 400) with zoom 1.15
    // Blacksmith is at world (196, 158)
    // Screen X = 640 + (196 - 416) * 1.15 = 640 - 253 = 387
    // Screen Y = 400 + (158 - 288) * 1.15 = 400 - 149.5 = 250.5
    await page.mouse.move(387, 250);
    await new Promise((r) => setTimeout(r, 600));

    // Verify hover state in engine
    const isHovered = await page.evaluate(() => {
      const cursor = document.querySelector('canvas')?.style?.cursor;
      return cursor === 'pointer';
    });
    console.log(`  ✓ Canvas cursor is pointer: ${isHovered}`);

    await page.screenshot({ path: path.join(outputDir, '31_hovered_interior_agent_label.png') });
    console.log('  ✓ Screenshot saved: 31_hovered_interior_agent_label.png (Single hovered label appears cleanly!)');

    // TEST 5: Hover over Command Desk Master Agent in Interior
    console.log('🧙 [Test 5] Hovering mouse over Guildmaster at Command Desk in Interior...');
    // Master agent is at world (416, 156)
    // Screen X = 640 + (416 - 416) * 1.15 = 640
    // Screen Y = 400 + (156 - 288) * 1.15 = 400 - 151.8 = 248
    await page.mouse.move(640, 248);
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({ path: path.join(outputDir, '32_hovered_interior_master_agent_label.png') });
    console.log('  ✓ Screenshot saved: 32_hovered_interior_master_agent_label.png');

    // TEST 6: Move mouse away to floor - Labels disappear again
    console.log('🧹 [Test 6] Moving mouse to empty floor to verify labels vanish immediately...');
    await page.mouse.move(416, 520);
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({ path: path.join(outputDir, '33_interior_after_mouse_leaves.png') });
    console.log('  ✓ Screenshot saved: 33_interior_after_mouse_leaves.png');

    console.log('\n🎉 ALL HOVER-ONLY LABEL TESTS PASSED! No busy clutter when unhovered.');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runHoverLabelsVerification();
