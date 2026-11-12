// Retire du logo les îlots parasites laissés par le détourage (traits de 1 ou 2 px), sans changer la taille du fichier,
// et produit un master détouré au plus juste pour la charte et l'impression.
// node outils/charte/nettoyer-logo.mjs
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const FICHIERS = [
  { source: 'public/assets/logo-arcep.png', master: 'charte/img/master-logo-couleur.png' },
  { source: 'public/assets/logo-arcep-blanc.png', master: 'charte/img/master-logo-blanc.png' },
  { source: 'public/assets/icone-arcep.png', master: null },
];

const port = 9090 + Math.floor(Math.random() * 200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/chrome-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = l.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (m, p = {}) => new Promise((res) => { const i = ++id; const t = setTimeout(() => { pending.delete(i); res({}); }, 40000); pending.set(i, (d) => { clearTimeout(t); res(d); }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });

mkdirSync('charte/img', { recursive: true });

for (const { source, master } of FICHIERS) {
  const base64 = readFileSync(source).toString('base64');
  const expr = `new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const image = x.getImageData(0, 0, W, H);
      const d = image.data;
      const SEUIL = 24;
      const plein = (px, py) => d[(py * W + px) * 4 + 3] > SEUIL;

      // îlots connexes
      const vu = new Uint8Array(W * H);
      const iles = [];
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        const k = py * W + px;
        if (vu[k] || !plein(px, py)) continue;
        const pixels = [k]; vu[k] = 1;
        let a = px, b = py, c2 = px, d2 = py, t = 0;
        const pile = [k];
        while (pile.length) {
          const cur = pile.pop(), cx = cur % W, cy = (cur - cx) / W;
          t++;
          if (cx < a) a = cx; if (cx > c2) c2 = cx;
          if (cy < b) b = cy; if (cy > d2) d2 = cy;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const nk = ny * W + nx;
            if (!vu[nk] && plein(nx, ny)) { vu[nk] = 1; pile.push(nk); pixels.push(nk); }
          }
        }
        iles.push({ t, x: a, y: b, w: c2 - a + 1, h: d2 - b + 1, pixels });
      }

      // parasite : très plat et large, ou minuscule
      const retires = [];
      for (const i of iles) {
        const plat = i.h <= 2 && i.w >= 20;
        const miette = i.t <= 12;
        if (!plat && !miette) continue;
        retires.push({ x: i.x, y: i.y, w: i.w, h: i.h, t: i.t });
        for (const k of i.pixels) d[k * 4 + 3] = 0;
      }
      x.putImageData(image, 0, 0);

      // boîte du contenu restant, pour le master détouré
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (d[(py * W + px) * 4 + 3] > SEUIL) {
        if (px < x0) x0 = px; if (px > x1) x1 = px;
        if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const m = document.createElement('canvas');
      m.width = bw; m.height = bh;
      m.getContext('2d').drawImage(c, x0, y0, bw, bh, 0, 0, bw, bh);

      res(JSON.stringify({
        propre: c.toDataURL('image/png').split(',')[1],
        master: m.toDataURL('image/png').split(',')[1],
        retires, boite: { x: x0, y: y0, w: bw, h: bh },
      }));
    };
    img.onerror = () => res(null);
    img.src = 'data:image/png;base64,${base64}';
  })`;

  const brut = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  if (!brut) { console.log('échec :', source); continue; }
  const r = JSON.parse(brut);
  writeFileSync(source, Buffer.from(r.propre, 'base64'));
  if (master) writeFileSync(master, Buffer.from(r.master, 'base64'));
  const liste = r.retires.map((i) => `${i.w}×${i.h} en x${i.x} y${i.y}`).join(', ') || 'aucun';
  console.log(`${source} · parasites retirés : ${liste}`);
  console.log(`   contenu utile : ${r.boite.w}×${r.boite.h} en x${r.boite.x} y${r.boite.y}${master ? ' → ' + master : ''}`);
}
ws.close(); chrome.kill();
