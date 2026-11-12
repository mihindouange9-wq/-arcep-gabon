// Couleurs dominantes du logo : pixels opaques quantifiés, teintes voisines regroupées. Écrit charte/palette-logo.json.
// node outils/charte/palette-logo.mjs [fichier]
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const SOURCE = process.argv[2] || 'charte/img/master-logo-couleur.png';
const port = 9110 + Math.floor(Math.random() * 200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (m, p = {}) => new Promise((res) => { const i = ++id; const t = setTimeout(() => { pending.delete(i); res({}); }, 40000); pending.set(i, (d) => { clearTimeout(t); res(d); }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });

const base64 = readFileSync(SOURCE).toString('base64');
const expr = `new Promise((res) => {
  const img = new Image();
  img.onload = () => {
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, W, H).data;

    // on ne retient que les pixels franchement opaques : pas de bords lissés
    const seaux = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 245) continue;
      const cle = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      const s = seaux.get(cle) || { n: 0, r: 0, v: 0, b: 0 };
      s.n++; s.r += d[i]; s.v += d[i + 1]; s.b += d[i + 2];
      seaux.set(cle, s);
    }
    let liste = [...seaux.values()]
      .map((s) => ({ n: s.n, r: Math.round(s.r / s.n), v: Math.round(s.v / s.n), b: Math.round(s.b / s.n) }))
      .sort((p, q) => q.n - p.n);

    // regroupement des teintes trop voisines pour être distinguées à l'œil
    const garde = [];
    const distance = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.v - b.v) + Math.abs(a.b - b.b);
    for (const t of liste) {
      const proche = garde.find((g) => distance(g, t) < 60);
      if (proche) { proche.n += t.n; continue; }
      garde.push({ ...t });
      if (garde.length >= 10) break;
    }
    const total = garde.reduce((s, g) => s + g.n, 0);
    res(JSON.stringify(garde.map((g) => ({
      hex: '#' + [g.r, g.v, g.b].map((v) => v.toString(16).padStart(2, '0')).join(''),
      rgb: [g.r, g.v, g.b],
      part: +(100 * g.n / total).toFixed(1),
    }))));
  };
  img.onerror = () => res(null);
  img.src = 'data:image/png;base64,${base64}';
})`;

const brut = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const teintes = JSON.parse(brut || '[]');

// conversion CMJN indicative (partie impression de la charte)
const cmjn = ([r, v, b]) => {
  const R = r / 255, V = v / 255, B = b / 255;
  const n = 1 - Math.max(R, V, B);
  if (n >= 1) return [0, 0, 0, 100];
  const c = (1 - R - n) / (1 - n), m = (1 - V - n) / (1 - n), j = (1 - B - n) / (1 - n);
  return [c, m, j, n].map((v2) => Math.round(v2 * 100));
};

console.log(SOURCE);
console.log('teinte     part     RVB              CMJN');
for (const t of teintes) {
  console.log(
    t.hex.toUpperCase().padEnd(10),
    (t.part + ' %').padStart(6),
    ('' + t.rgb.join(', ')).padEnd(16),
    cmjn(t.rgb).join(' / ')
  );
}
writeFileSync('charte/palette-logo.json', JSON.stringify(teintes.map((t) => ({ ...t, cmjn: cmjn(t.rgb) })), null, 1));
console.log('→ charte/palette-logo.json');
ws.close(); chrome.kill();
