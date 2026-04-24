import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import http from 'node:http';

const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR);

const targetUrl = process.env.TARGET_URL || 'http://localhost:5173';
const email = process.env.SMOKE_EMAIL || 'mike.plumbing@dealbank.local';
const password = process.env.SMOKE_PASSWORD || 'DealBank2025!';
const screenshotPath = path.join(ARTIFACT_DIR, 'contractor-dashboard-smoke.png');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function serverAlive() {
  return new Promise((resolve) => {
    try {
      const u = new URL(targetUrl);
      const hostname = u.hostname;
      const port = u.port || (u.protocol === 'https:' ? 443 : 80);
      const path = u.pathname || '/';
      const opts = { method: 'HEAD', hostname, port, path, timeout: 2000 };
      // debug
      // console.log(`ping ${hostname}:${port}${path}`);
      const req = http.request(opts, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch (err) {
      resolve(false);
    }
  });
}

async function waitForServer(timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await serverAlive()) return true;
    await sleep(1000);
  }
  throw new Error('Timed out waiting for dev server');
}

async function findAndClickButtonByText(page, text) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const txt = await page.evaluate((el) => (el.innerText || el.textContent || '').trim(), b);
    if (!txt) continue;
    if (txt.toLowerCase().includes(text.toLowerCase())) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function run() {
  console.log('waiting for dev server...');
  await waitForServer(120000);
  console.log('server ready, launching browser...');
  // Prefer a locally installed Chrome/Edge binary first (common Windows locations), then fall back to sparticuz chromium
  let executablePath = null;
  const candidates = [
    process.env.CHROME_PATH,
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const c of candidates) {
    try {
      if (c && fs.existsSync(c) && fs.statSync(c).isFile()) {
        executablePath = c;
        break;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!executablePath) {
    try {
      const cp = await chromium.executablePath();
      if (cp && fs.existsSync(cp) && fs.statSync(cp).isFile()) {
        executablePath = cp;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!executablePath) {
    throw new Error('No Chromium/Chrome executable found. Set CHROME_PATH or install Chrome/Edge.');
  }

  console.log('Using browser executable:', executablePath);

  const browser = await puppeteer.launch({
    executablePath,
    args: (chromium.args || []).concat(['--no-sandbox', '--disable-setuid-sandbox']),
    defaultViewport: { width: 390, height: 844 },
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // click Log in on landing
    await sleep(800);
    await findAndClickButtonByText(page, 'log in');

    // wait for email input
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.type('input[type="email"]', email, { delay: 30 });
    await page.type('input[type="password"]', password, { delay: 30 });

    // click submit (try several variants)
    await findAndClickButtonByText(page, 'Log In');
    await findAndClickButtonByText(page, 'Log in');

    // wait for dashboard root
    await page.waitForSelector('.db-dashboard-root', { timeout: 30000 });

    // give data a moment to load
    await sleep(2000);

    // open mobile hamburger menu (aria-label set in TopBar)
    try {
      await page.click('button[aria-label="Open dashboard menu"]');
      await sleep(500);
    } catch (e) {
      // fallback: try clicking by role/text
      await findAndClickButtonByText(page, 'menu');
      await sleep(500);
    }

    // capture full page to include overlay
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log('screenshot saved to ' + screenshotPath);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    try { await browser.close(); } catch (e) {}
    process.exit(1);
  }
}

run();
