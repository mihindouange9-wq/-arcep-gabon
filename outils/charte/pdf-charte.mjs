/* Exporte charte/index.html en PDF 16:9 (une planche par page) via Chrome headless.
   node outils/charte/pdf-charte.mjs [sortie] */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const out = process.argv[2] ?? 'charte/ARCEP_Gabon_Charte_de_Marque.pdf';
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=C:/Users/mihin/AppData/Local/Temp/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1232, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///C:/Users/mihin/Documents/geek/arcep/charte/index.html' });
await sleep(1500);
await ev('document.fonts.ready.then(() => true)');
await ev(`Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))`);
await ev(`document.documentElement.style.setProperty('--k', '1'); true`);
await send('Emulation.setEmulatedMedia', { media: 'print' });
await sleep(800);
// 1200 × 675 px CSS = 12,5 × 7,03125 in
const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, paperWidth: 12.5, paperHeight: 7.03125, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
await writeFile(out, Buffer.from(pdf.result.data, 'base64'));
const pages = (Buffer.from(pdf.result.data, 'base64').toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log('pdf →', out, '·', pages, 'pages ·', Math.round(pdf.result.data.length * 0.75 / 1024), 'Ko');
ws.close(); chrome.kill();
