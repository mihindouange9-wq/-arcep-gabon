// Relevé d'une page de l'ancien site (texte, titres, liens, images, couleurs, polices) vers recherche/<nom>.json.
// node outils/contenu/scrape.mjs <url> <nom>
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [URL_ = 'https://www.arcep.ga/', NOM = 'accueil'] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/chrome-cdp-${port}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 60 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable');
await send('Page.navigate', { url: URL_ });
await sleep(9000);
const data = await ev(`JSON.stringify({
  url: location.href,
  titre: document.title,
  meta: document.querySelector('meta[name=description]')?.content || '',
  titres: [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => h.tagName + ' · ' + h.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t.length > 6).slice(0, 120),
  texte: document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 24000),
  liens: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.textContent.replace(/\s+/g, ' ').trim() + ' → ' + a.href).filter((t) => t.length > 6))].slice(0, 160),
  images: [...new Set([...document.querySelectorAll('img')].map((i) => i.currentSrc || i.src))].slice(0, 60),
  couleurs: (() => { const c = {}; document.querySelectorAll('body *').forEach((e) => { const s = getComputedStyle(e); [s.color, s.backgroundColor, s.borderTopColor].forEach((v) => { if (v && v !== 'rgba(0, 0, 0, 0)') c[v] = (c[v] || 0) + 1; }); }); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 18); })(),
  polices: (() => { const f = {}; document.querySelectorAll('body *').forEach((e) => { const v = getComputedStyle(e).fontFamily; if (v) f[v] = (f[v] || 0) + 1; }); return Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 6); })()
})`);
await mkdir('recherche', { recursive: true });
await writeFile(`recherche/${NOM}.json`, data || '{}');
const o = JSON.parse(data || '{}');
console.log(NOM, '·', o.titre, '·', (o.texte || '').length, 'caractères ·', (o.liens || []).length, 'liens');
ws.close(); chrome.kill();
