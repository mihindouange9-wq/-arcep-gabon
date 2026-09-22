/* ARCEP Gabon — sonde.
   Ouvre une page dans Chrome sans interface, la fait défiler à une position donnée, puis
   évalue une expression et rapporte le résultat avec les exceptions rencontrées.

   node outils/controle/sonde.mjs /chemin [--largeur 1440] [--y 2000] [--expr "document.title"] */
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

const args = process.argv.slice(2);
const chemin = args.find((a) => a.startsWith('/')) || '/';
const option = (nom, defaut) => { const i = args.indexOf('--' + nom); return i >= 0 ? args[i + 1] : defaut; };
const BASE = 'http://127.0.0.1:4310';
const largeur = Number(option('largeur', 1440));
const y = Number(option('y', 0));
const expr = option('expr', 'document.title');

const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP || 'C:/Temp'}/chrome-sonde-${port}`, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });
let cible = null;
for (let i = 0; i < 60 && !cible; i++) { await attendre(250); try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* attente */ } }
const ws = new WebSocket(cible.webSocketDebuggerUrl);
await new Promise((ok) => { ws.onopen = ok; });
let n = 0; const attentes = new Map(); const journal = [];
ws.onmessage = (m) => {
  const t = JSON.parse(m.data);
  if (t.id && attentes.has(t.id)) { attentes.get(t.id)(t); attentes.delete(t.id); return; }
  if (t.method === 'Runtime.exceptionThrown') journal.push((t.params.exceptionDetails?.exception?.description || t.params.exceptionDetails?.text || '').split('\n').slice(0, 5).join('\n      '));
  if (t.method === 'Runtime.consoleAPICalled') journal.push(t.params.type + ' : ' + t.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
};
const envoyer = (method, params = {}) => new Promise((ok) => { const id = ++n; attentes.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
const evaluer = async (e) => { const r = await envoyer('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.exceptionDetails ? 'ERREUR ' + r.result.exceptionDetails.exception?.description : r.result?.result?.value; };

await envoyer('Page.enable'); await envoyer('Runtime.enable');
await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 900, deviceScaleFactor: 1, mobile: largeur < 820 });
await envoyer('Page.navigate', { url: BASE + chemin });
await attendre(1500);
await envoyer('Page.captureScreenshot', { format: 'png' });
await attendre(4500);
await evaluer(`window.scrollTo(0, ${y})`);
for (let i = 0; i < 5; i++) { await envoyer('Page.captureScreenshot', { format: 'png' }); await attendre(200); }
console.log('résultat :', JSON.stringify(await evaluer(expr), null, 1));
if (journal.length) console.log('journal :\n  ' + journal.join('\n  '));
try { ws.close(); } catch { /* fermé */ }
chrome.kill();
