/* Captures de relecture de la charte : une image par planche (outils/captures/charte/pNN.jpg) + planches-contact 2 × 3.
   node outils/charte/charte-shots.mjs [echelle=0.5] */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const scale = +(process.argv[2] || 0.5);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const logs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown' || (d.method === 'Log.entryAdded' && d.params.entry.level === 'error')) logs.push(JSON.stringify(d.params).slice(0, 240)); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1232, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/arcep/charte/index.html' });
await sleep(1500); await ev('document.fonts.ready.then(() => true)');
await ev(`Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))`);
await sleep(600);
const rects = await ev(`[...document.querySelectorAll('.page')].map(p => { const r = p.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY]; })`);
const fonts = await ev(`[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight).join(', ')`);
// Débordements : éléments qui sortent de leur planche
const overflow = await ev(`[...document.querySelectorAll('.page')].map((p, i) => { const pr = p.getBoundingClientRect(); const bad = [...p.querySelectorAll('.corps *, .bloc *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > pr.right + 1 || r.bottom > pr.bottom - 30); }).slice(0, 3).map(e => e.className || e.tagName); return bad.length ? (i + 1) + ': ' + bad.join(' | ') : null; }).filter(Boolean)`);
await mkdir('outils/captures/charte', { recursive: true });
for (let i = 0; i < rects.length; i++) {
  const [x, y] = rects[i];
  await ev('window.scrollTo(0, ' + (y - 16) + '); true'); await sleep(250);
  const { data } = (await send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x, y, width: 1200, height: 675, scale } })).result;
  await writeFile(`outils/captures/charte/p${String(i + 1).padStart(2, '0')}.jpg`, Buffer.from(data, 'base64'));
}
// Planches-contact
const per = 6; const W = 1200 * scale;
for (let s = 0; s < rects.length; s += per) {
  const imgs = Array.from({ length: Math.min(per, rects.length - s) }, (_, k) => `<img src="p${String(s + k + 1).padStart(2, '0')}.jpg" width="${W}">`).join('');
  await writeFile(`outils/captures/charte/sheet-${s / per + 1}.html`, `<body style="margin:0;background:#333;display:grid;grid-template-columns:repeat(2,${W}px);gap:4px">${imgs}</body>`);
}
console.log('planches', rects.length, '· polices', fonts, '\ndébordements', JSON.stringify(overflow), '\nerreurs', logs.join('\n'));
ws.close(); chrome.kill();
