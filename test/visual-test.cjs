const puppeteer = require('puppeteer');
const { app } = require('../server/index.js');
const path = require('path');
const fs = require('fs');

async function runVisualTest() {
  const PORT = 3001;
  const server = app.listen(PORT, () => {
    console.log(`[Test Server] Listening on http://localhost:${PORT}`);
  });

  const outputDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let browser = null;
  try {
    console.log('🚀 Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', (msg) => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[BROWSER ERROR]', err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) console.log('[HTTP ERROR]', res.status(), res.url());
    });
    page.on('requestfailed', (req) => console.log('[REQ FAILED]', req.url(), req.failure()?.errorText));

    console.log('🌐 Navigating to http://localhost:3001...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2500));

    // 1. Capture Stargate Portal in Village
    // Pan camera north or walk north toward Stargate (x: 1024, y: 764)
    console.log('🌀 Navigating camera to view the Stargate Portal...');
    await page.evaluate(() => {
      // Find the canvas container or dispatch key/camera event
      const canvas = document.querySelector('canvas');
      if (canvas) {
        // Press up / pan to see Stargate
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      }
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    });
    await new Promise((r) => setTimeout(r, 800));

    console.log('📸 Capturing screenshot: 13_stargate_village_portal.png...');
    await page.screenshot({ path: path.join(outputDir, '13_stargate_village_portal.png') });

    page.on('response', (res) => {
      if (res.status() >= 400) console.log('[HTTP ERROR]', res.status(), res.url());
    });

    const clickButtonByText = async (text) => {
      const handles = await page.$$('button');
      for (const h of handles) {
        const val = await h.evaluate((el) => el.innerText || '');
        const title = await h.evaluate((el) => el.title || '');
        if (val.toLowerCase().includes(text.toLowerCase()) || title.toLowerCase().includes(text.toLowerCase())) {
          await h.click();
          return true;
        }
      }
      return false;
    };

    // 2. Open Stargate Overworld Map Modal
    console.log('🌌 Opening Stargate Galactic Overworld Map & DHD...');
    const allBtns = await page.$$eval('button', (btns) => btns.map((b) => ({ text: b.innerText, title: b.title })));
    console.log('All buttons on page:', allBtns);
    const clickedStargate = await clickButtonByText('Stargate');
    if (clickedStargate) {
      await new Promise((r) => setTimeout(r, 2000));
      console.log('📸 Capturing screenshot: 14_stargate_overworld_galaxy_map.png...');
      await page.screenshot({ path: path.join(outputDir, '14_stargate_overworld_galaxy_map.png') });
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 800));
    }

    // 3. Walk into House Interior View!
    console.log('🏠 Entering Walk-in House Interior Workshop...');
    await page.evaluate(() => {
      if (window.__enterFirstHutInterior) {
        window.__enterFirstHutInterior();
      }
    });
    await new Promise((r) => setTimeout(r, 1800));

    console.log('📸 Capturing screenshot: 15_house_interior_workshop.png...');
    await page.screenshot({ path: path.join(outputDir, '15_house_interior_workshop.png') });

    // 4. Open Single-GPU Smart Decree Queue Modal
    console.log('⏳ Opening Single-GPU Smart Decree Queue Modal...');
    const clickedQueue = await clickButtonByText('Queue');
    if (clickedQueue) {
      await new Promise((r) => setTimeout(r, 2000));
      console.log('📸 Capturing screenshot: 16_single_gpu_decree_queue.png...');
      await page.screenshot({ path: path.join(outputDir, '16_single_gpu_decree_queue.png') });
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 800));
    }

    console.log('🎉 Stargate, House Interior, and GPU Queue visual test completed successfully!');
  } catch (err) {
    console.error('❌ Visual test failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runVisualTest();
