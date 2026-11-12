// Ressources de départ : logo détouré (fond blanc rendu transparent), version blanche, icône carrée, première image de la vidéo.
// Tout passe par un canvas de Chrome. node outils/contenu/prepare-assets.mjs
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const LOGO = 'logo arcep.png';
const VIDEO = 'Animate_ARCEP_GABON_logo_20260918010633.mp4';
const b64 = (await readFile(LOGO)).toString('base64');

const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/chrome-cdp-${port}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable');
await send('Page.navigate', { url: 'about:blank' });
await sleep(700);
await mkdir('assets', { recursive: true });
await mkdir('recherche', { recursive: true });

// 1. Logo détouré : pixels quasi blancs rendus transparents, image rognée au contenu
const traite = await ev(`new Promise((res) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height); const p = d.data;
    let minx = c.width, miny = c.height, maxx = 0, maxy = 0;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2];
      const clair = Math.min(r, g, b);
      if (clair > 244) { p[i + 3] = 0; }            // blanc du fond : transparent
      else if (clair > 228) { p[i + 3] = Math.round((244 - clair) / 16 * 255); } // bord adouci
      if (p[i + 3] > 12) { const n = i / 4, px = n % c.width, py = (n / c.width) | 0;
        if (px < minx) minx = px; if (px > maxx) maxx = px; if (py < miny) miny = py; if (py > maxy) maxy = py; }
    }
    x.putImageData(d, 0, 0);
    const m = 6, w = maxx - minx + 1 + m * 2, h = maxy - miny + 1 + m * 2;
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    c2.getContext('2d').drawImage(c, minx - m, miny - m, w, h, 0, 0, w, h);
    // version blanche : la même silhouette, remplie de blanc cassé
    const c3 = document.createElement('canvas'); c3.width = w; c3.height = h;
    const x3 = c3.getContext('2d'); x3.drawImage(c2, 0, 0);
    x3.globalCompositeOperation = 'source-in'; x3.fillStyle = '#ffffff'; x3.fillRect(0, 0, w, h);
    // carré pour l'icône : le logo centré sur fond vert profond
    const cote = 512, c4 = document.createElement('canvas'); c4.width = cote; c4.height = cote;
    const x4 = c4.getContext('2d'); x4.fillStyle = '#0F3D2E'; x4.fillRect(0, 0, cote, cote);
    const k = (cote * 0.74) / w; x4.drawImage(c3, (cote - w * k) / 2, (cote - h * k) / 2, w * k, h * k);
    res(JSON.stringify({ w, h, couleur: c2.toDataURL('image/png').split(',')[1], blanc: c3.toDataURL('image/png').split(',')[1], carre: c4.toDataURL('image/png').split(',')[1] }));
  };
  img.src = 'data:image/png;base64,${b64}';
})`);
const o = JSON.parse(traite);
await writeFile('public/assets/logo-arcep.png', Buffer.from(o.couleur, 'base64'));
await writeFile('public/assets/logo-arcep-blanc.png', Buffer.from(o.blanc, 'base64'));
await writeFile('public/assets/icone-arcep.png', Buffer.from(o.carre, 'base64'));
console.log('logo détouré', o.w + '×' + o.h, '· version blanche · icône 512');

// 2. Vidéo : dimensions, durée, image de référence
await send('Page.navigate', { url: 'data:text/html,<body style="margin:0;background:%230b0b0b"><video id=v muted autoplay playsinline></video>' });
await sleep(800);
await ev(`document.getElementById('v').src = ${JSON.stringify(new URL('../../' + VIDEO, import.meta.url).href)}; true`);
await sleep(2500);
const info = await ev(`new Promise((r) => { const v = document.getElementById('v'); const go = () => r(JSON.stringify({ w: v.videoWidth, h: v.videoHeight, duree: Math.round(v.duration * 10) / 10 })); v.readyState >= 1 ? go() : (v.onloadedmetadata = go); })`);
console.log('vidéo :', info);
await ev(`(() => { const v = document.getElementById('v'); v.pause(); v.currentTime = Math.min(1.5, (v.duration || 3) / 2); v.style.width = '760px'; return true; })()`);
await sleep(1500);
const { data } = (await send('Page.captureScreenshot', { format: 'png' })).result;
await writeFile('recherche/video-frame.png', Buffer.from(data, 'base64'));
console.log('image de la vidéo → recherche/video-frame.png');
ws.close(); chrome.kill();
