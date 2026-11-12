// Poids et temps de chargement d'une page : ressources par type, total, premier rendu, DOM prêt, chargement complet.
// node outils/controle/poids.mjs [/chemin] [--largeur 1440]
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const args = process.argv.slice(2);
const chemin = args.find((a) => a.startsWith('/')) || '/';
const largeur = args.includes('--largeur') ? Number(args[args.indexOf('--largeur') + 1]) : 1440;
const BASE = 'http://127.0.0.1:4310';

const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/chrome-poids-${port}`, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });
let cible = null;
for (let i = 0; i < 60 && !cible; i++) { await attendre(250); try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* attente */ } }
const ws = new WebSocket(cible.webSocketDebuggerUrl);
await new Promise((ok) => { ws.onopen = ok; });
let n = 0; const attentes = new Map();
const ressources = new Map();
ws.onmessage = (m) => {
  const t = JSON.parse(m.data);
  if (t.id && attentes.has(t.id)) { attentes.get(t.id)(t); attentes.delete(t.id); return; }
  if (t.method === 'Network.responseReceived') ressources.set(t.params.requestId, { url: t.params.response.url, type: t.params.type, octets: 0, statut: t.params.response.status });
  if (t.method === 'Network.loadingFinished' && ressources.has(t.params.requestId)) ressources.get(t.params.requestId).octets = t.params.encodedDataLength;
};
const envoyer = (method, params = {}) => new Promise((ok) => { const id = ++n; attentes.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
const evaluer = async (e) => (await envoyer('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;

await envoyer('Page.enable'); await envoyer('Runtime.enable'); await envoyer('Network.enable');
await envoyer('Network.setCacheDisabled', { cacheDisabled: true });
await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 900, deviceScaleFactor: 1, mobile: largeur < 820 });
await envoyer('Page.navigate', { url: BASE + chemin });
await attendre(4000);
await envoyer('Page.captureScreenshot', { format: 'png' });
await attendre(1500);

const temps = await evaluer(`(() => { const n = performance.getEntriesByType('navigation')[0]; const p = performance.getEntriesByType('paint'); return { dom: Math.round(n.domContentLoadedEventEnd), charge: Math.round(n.loadEventEnd), premierRendu: Math.round((p.find((x) => x.name === 'first-contentful-paint') || {}).startTime || 0) }; })()`);
const parType = {};
let total = 0;
for (const r of ressources.values()) {
  if (!r.url.startsWith(BASE)) continue;
  const cle = r.type === 'Document' && r.url.includes('ecran=1') ? 'Écran (iframe)' : r.type;
  parType[cle] = parType[cle] || { n: 0, octets: 0 };
  parType[cle].n += 1; parType[cle].octets += r.octets;
  total += r.octets;
}
const ko = (o) => (o / 1024).toFixed(0).padStart(6) + ' Ko';
console.log(`\nARCEP — poids de ${chemin} à ${largeur} px (cache désactivé)\n${'='.repeat(52)}`);
for (const [type, v] of Object.entries(parType).sort((a, b) => b[1].octets - a[1].octets)) console.log(`  ${type.padEnd(16)} ${String(v.n).padStart(3)} fichier${v.n > 1 ? 's' : ' '} ${ko(v.octets)}`);
console.log(`  ${'total'.padEnd(16)} ${String(ressources.size).padStart(3)} fichiers ${ko(total)}`);
console.log(`\n  premier rendu ${temps.premierRendu} ms · DOM prêt ${temps.dom} ms · chargement complet ${temps.charge} ms\n`);
const lourds = Array.from(ressources.values()).filter((r) => r.url.startsWith(BASE)).sort((a, b) => b.octets - a.octets).slice(0, 8);
for (const r of lourds) console.log(`  ${ko(r.octets)}  ${r.url.replace(BASE, '').split('?')[0]}`);
console.log('');
try { ws.close(); } catch { /* fermé */ }
chrome.kill();
