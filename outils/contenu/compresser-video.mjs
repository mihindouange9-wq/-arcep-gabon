/* Produit une version WebM allégée de la vidéo du logo (encodage par Chrome, MediaRecorder).
   Le MP4 d'origine reste en secours pour les navigateurs sans WebM.
   node outils/contenu/compresser-video.mjs [entrée] [sortie] [largeur] [débit kbps] */
import { spawn } from 'node:child_process';
import { writeFileSync, statSync } from 'node:fs';

const [ENTREE = 'public/assets/logo-anime.mp4', SORTIE = 'public/assets/logo-anime.webm', LARGEUR = '960', DEBIT = '900'] = process.argv.slice(2);
const port = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (m, p = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });

await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/arcep/outils/contenu/encodeur.html' });
await sleep(1200);
const expr = `encoder(${JSON.stringify('../' + ENTREE)}, ${+LARGEUR}, ${+DEBIT * 1000})`;
const r = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 180000 })).result?.result?.value;
ws.close(); chrome.kill();
if (!r || !r.base64) { console.log('échec :', r && r.erreur); process.exit(1); }
writeFileSync(SORTIE, Buffer.from(r.base64, 'base64'));
console.log(`${ENTREE} ${(statSync(ENTREE).size / 1048576).toFixed(1)} Mo → ${SORTIE} ${(statSync(SORTIE).size / 1048576).toFixed(1)} Mo · ${r.duree.toFixed(1)} s · ${r.largeur}×${r.hauteur}`);
