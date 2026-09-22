/* Produit les déclinaisons monochromes de la signature à partir de la couche alpha du logo.
   Aucune retouche à la main : la forme reste exactement celle du logo officiel, seule la
   couleur de remplissage change. node outils/charte/logo-declinaisons.mjs */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SOURCE = 'public/assets/logo-arcep-blanc.png';   // silhouette pleine, fond transparent
const SORTIES = [
  { nom: 'logo-vert-profond', couleur: '#0f3d2e' },
  { nom: 'logo-vert', couleur: '#175b31' },
  { nom: 'logo-noir', couleur: '#0e1614' },
  { nom: 'logo-blanc', couleur: '#ffffff' },
];

const port = 9050 + Math.floor(Math.random() * 200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (m, p = {}) => new Promise((res) => { const i = ++id; const t = setTimeout(() => { pending.delete(i); res({}); }, 20000); pending.set(i, (d) => { clearTimeout(t); res(d); }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });

const base64 = readFileSync(SOURCE).toString('base64');
mkdirSync('charte/img', { recursive: true });

for (const { nom, couleur } of SORTIES) {
  /* On peint la couleur puis on la découpe par la silhouette : le tracé reste intact. */
  const expr = `new Promise((res) => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement('canvas');
      c.width = i.naturalWidth; c.height = i.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(i, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = ${JSON.stringify(couleur)};
      x.fillRect(0, 0, c.width, c.height);
      res(c.toDataURL('image/png').split(',')[1]);
    };
    i.onerror = () => res(null);
    i.src = 'data:image/png;base64,${base64}';
  })`;
  const r = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  if (!r) { console.log('échec :', nom); continue; }
  const buf = Buffer.from(r, 'base64');
  writeFileSync(`charte/img/${nom}.png`, buf);
  console.log(`charte/img/${nom}.png · ${(buf.length / 1024).toFixed(0)} Ko`);
}
ws.close(); chrome.kill();
