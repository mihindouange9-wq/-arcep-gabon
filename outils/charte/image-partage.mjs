// Image de partage 1200 x 630 (Open Graph) rendue par Chrome headless dans public/assets/partage.png. Serveur lancé.
// node outils/charte/image-partage.mjs [base]
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { setTimeout as attendre } from 'node:timers/promises';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const BASE = process.argv[2] || 'http://127.0.0.1:4310';
const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="${BASE}/css/polices.css">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { font-family: "Archivo", sans-serif; color: #f3f5f2; background: linear-gradient(160deg, #0a2a1a 0%, #0f3d25 45%, #12244a 100%); position: relative; }
  .lueur { position: absolute; width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, rgba(47,168,100,.45), transparent 62%); top: -450px; right: -250px; }
  .lueur-2 { position: absolute; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle, rgba(226,179,54,.28), transparent 62%); bottom: -400px; left: -200px; }
  .trame { position: absolute; inset: 0; opacity: .06; background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 96px 96px; }
  .cadre { position: absolute; inset: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
  img { height: 76px; width: auto; }
  h1 { font-size: 72px; font-weight: 800; letter-spacing: -.035em; line-height: .98; margin: 0; max-width: 16ch; font-variation-settings: "wdth" 108; }
  p { margin: 18px 0 0; font-family: "Source Serif 4", serif; font-size: 26px; color: rgba(243,245,242,.72); max-width: 34ch; }
  .pied { display: flex; justify-content: space-between; font-family: "IBM Plex Mono", monospace; font-size: 16px; letter-spacing: .14em; text-transform: uppercase; color: #e2b336; }
</style></head><body>
<span class="trame"></span><span class="lueur"></span><span class="lueur-2"></span>
<div class="cadre">
  <img src="${BASE}/assets/logo-arcep-blanc.png" alt="">
  <div><h1>Réguler, connecter, protéger, transformer.</h1><p>Autorité de Régulation des Communications Électroniques et des Postes de la République gabonaise.</p></div>
  <div class="pied"><span>République gabonaise</span><span>arcep.ga</span></div>
</div>
</body></html>`;

const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/chrome-partage-${port}`, '--window-size=1200,630', 'about:blank',
], { stdio: 'ignore' });
let cible = null;
for (let i = 0; i < 60 && !cible; i++) { await attendre(250); try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* attente */ } }
const ws = new WebSocket(cible.webSocketDebuggerUrl);
await new Promise((ok) => { ws.onopen = ok; });
let n = 0; const attentes = new Map();
ws.onmessage = (m) => { const t = JSON.parse(m.data); if (t.id && attentes.has(t.id)) { attentes.get(t.id)(t); attentes.delete(t.id); } };
const envoyer = (method, params = {}) => new Promise((ok) => { const id = ++n; attentes.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
await envoyer('Page.enable');
await envoyer('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
await envoyer('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(page) });
await attendre(2500);
const { data } = (await envoyer('Page.captureScreenshot', { format: 'png' })).result;
await writeFile('public/assets/partage.png', Buffer.from(data, 'base64'));
console.log('écrit : public/assets/partage.png');
try { ws.close(); } catch { /* fermé */ }
chrome.kill();
