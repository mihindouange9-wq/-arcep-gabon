// Rapatrie les visuels d'actualité de l'ancien site, les allège (largeur max 1400, JPEG 82) dans public/assets/actus/
// et met à jour donnees/arcep.json. node outils/contenu/fetch-images.mjs
import { tmpdir } from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { lireDonnees, ecrireDonnees } from './donnees.mjs';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const run = promisify(execFile);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';

const data = lireDonnees();
mkdirSync('public/assets/actus', { recursive: true });

// 1. Téléchargement
const aTraiter = [];
for (const a of data.actualites) {
  if (!a.image || /^\/?assets\//.test(a.image)) continue;
  const brut = `public/assets/actus/brut-${a.id}`;
  try {
    // les noms de fichiers accentués doivent être encodés avant la requête
    const url = a.image.replace(/[^\u0000-\u007f]/g, (c) => encodeURIComponent(c));
    await run('curl', ['-s', '-L', '-A', UA, '--max-time', '40', '-o', brut, url], { maxBuffer: 40e6 });
    aTraiter.push({ id: a.id, brut });
  } catch (e) { console.log('échec', a.id, e.message.split('\n')[0]); }
}
console.log('téléchargées :', aTraiter.length);

// 2. Conversion par un canvas de Chrome
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

let avant = 0, apres = 0;
for (const { id: num, brut } of aTraiter) {
  if (!existsSync(brut)) continue;
  const buf = readFileSync(brut);
  avant += buf.length;
  const mime = buf[0] === 0x89 ? 'image/png' : 'image/jpeg';
  const expr = `new Promise((res) => { const i = new Image(); i.onload = () => { const k = Math.min(1, 1400 / i.naturalWidth); const c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * k); c.height = Math.round(i.naturalHeight * k); const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82).split(',')[1]); }; i.onerror = () => res(null); i.src = 'data:${mime};base64,${buf.toString('base64')}'; })`;
  const r = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  if (!r) { console.log('illisible', num); continue; }
  const out = Buffer.from(r, 'base64');
  writeFileSync(`public/assets/actus/${num}.jpg`, out);
  apres += out.length;
}
ws.close(); chrome.kill();
console.log('images :', (avant / 1048576).toFixed(1), 'Mo →', (apres / 1048576).toFixed(1), 'Mo');

// 3. Mise à jour des chemins et nettoyage des fichiers bruts
for (const a of data.actualites) if (existsSync(`public/assets/actus/${a.id}.jpg`)) a.image = `public/assets/actus/${a.id}.jpg`;
ecrireDonnees(data);
for (const { brut } of aTraiter) { try { readFileSync(brut); await run('cmd', ['/c', 'del', '/q', brut.replace(/\//g, '\\')]); } catch {} }
console.log('donnees/arcep.json mis à jour');
