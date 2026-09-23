/* ARCEP Gabon — planches de relecture.
   Attend le serveur, appelle chaque page pour vérifier son code de réponse, puis pilote
   Chrome sans interface pour capturer chaque page à plusieurs positions de défilement,
   en bureau et en mobile, et assemble une planche par page dans outils/captures/.

   node outils/controle/captures.mjs [base] [--pages accueil,missions] [--pas 900] */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as attendre } from 'node:timers/promises';

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith('http')) || 'http://127.0.0.1:4310';
const option = (nom, defaut) => { const i = args.indexOf('--' + nom); return i >= 0 ? args[i + 1] : defaut; };
const SORTIE = 'outils/captures';
const PAS = Number(option('pas', 900));

const PAGES = [
  ['accueil', '/'], ['autorite', '/autorite'], ['missions', '/missions'], ['observatoire', '/observatoire'],
  ['reglementation', '/reglementation'], ['actualites', '/actualites'], ['article', '/actualites/115'],
  ['consommateurs', '/consommateurs'], ['contact', '/contact'], ['introuvable', '/page-inexistante'],
  ['mentions', '/mentions-legales'], ['admin', '/admin'], ['ecran', '/?ecran=1'],
];
const TABLETTE = args.includes('--tablette');
const choisies = option('pages', '') ? PAGES.filter(([n]) => option('pages', '').split(',').includes(n)) : PAGES;

/* ---- 1. le serveur répond ---- */
for (let essai = 0; essai < 40; essai++) {
  try { await fetch(BASE + '/robots.txt'); break; } catch { await attendre(250); }
  if (essai === 39) { console.error('serveur injoignable sur ' + BASE); process.exit(1); }
}
console.log(`\nARCEP — relecture de ${BASE}\n${'='.repeat(52)}`);
for (const [nom, chemin] of PAGES) {
  const r = await fetch(BASE + chemin);
  const corps = await r.text();
  console.log(`  ${String(r.status).padEnd(4)} ${nom.padEnd(15)} ${(corps.length / 1024).toFixed(0).padStart(4)} Ko`);
}

/* ---- 2. Chrome ---- */
async function ouvrirChrome() {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profil = `${process.env.TEMP || 'C:/Temp'}/chrome-relecture-${port}-${Date.now()}`;
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' });
  let cible = null;
  for (let essai = 0; essai < 60 && !cible; essai++) {
    await attendre(250);
    try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* pas encore */ }
  }
  if (!cible) { chrome.kill(); throw new Error('Chrome injoignable'); }
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  let numero = 0;
  const attentes = new Map();
  const ecouteurs = [];
  ws.onmessage = (m) => {
    const t = JSON.parse(m.data);
    if (t.id && attentes.has(t.id)) { attentes.get(t.id)(t); attentes.delete(t.id); }
    else if (t.method) for (const e of ecouteurs) e(t);
  };
  const envoyer = (method, params = {}) => new Promise((ok) => { const id = ++numero; attentes.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
  return { envoyer, ecouter: (fn) => ecouteurs.push(fn), fermer: () => { try { ws.close(); } catch { /* fermé */ } chrome.kill(); } };
}

const cdp = await ouvrirChrome();
await cdp.envoyer('Page.enable');
await cdp.envoyer('Runtime.enable');
await cdp.envoyer('Log.enable');
await cdp.envoyer('Network.enable');
let journal = [];
cdp.ecouter((t) => {
  if (t.method === 'Runtime.exceptionThrown') journal.push('exception : ' + (t.params.exceptionDetails?.exception?.description || t.params.exceptionDetails?.text || '').split('\n').slice(0, 4).join(' « '));
  if (t.method === 'Runtime.consoleAPICalled' && (t.params.type === 'error' || t.params.type === 'warning')) journal.push(t.params.type + ' : ' + t.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  if (t.method === 'Log.entryAdded' && t.params.entry.level === 'error') journal.push('log : ' + t.params.entry.text + ' ' + (t.params.entry.url || ''));
  if (t.method === 'Network.loadingFailed' && !t.params.canceled) journal.push('ressource : ' + t.params.errorText + ' (' + t.params.type + ')');
});
const evaluer = async (expression) => {
  const r = await cdp.envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'erreur');
  return r.result?.result?.value;
};

async function planche(nom, chemin, largeur, hauteur, suffixe) {
  journal = [];
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: largeur < 820 });
  await cdp.envoyer('Page.navigate', { url: BASE + chemin });
  await attendre(1200);
  await cdp.envoyer('Page.captureScreenshot', { format: 'png' });
  await attendre(4200);   // la séquence d'entrée du hero
  const total = await evaluer('document.documentElement.scrollHeight');
  const images = [];
  for (let y = 0; y <= total; y += PAS) {
    await evaluer(`window.scrollTo(0, ${y})`);
    await attendre(120);
    await cdp.envoyer('Page.captureScreenshot', { format: 'png' });
    await attendre(700);
    const { data } = (await cdp.envoyer('Page.captureScreenshot', { format: 'png' })).result;
    images.push(data);
    if (images.length >= 14) break;
  }
  const erreurs = journal.filter((l) => !(chemin === '/page-inexistante' && /404/.test(l)));
  /* Assemblage en grille dans une page vierge. */
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });
  await cdp.envoyer('Page.navigate', { url: 'about:blank' });
  await attendre(300);
  const colonnes = largeur < 820 ? 6 : largeur < 1000 ? 4 : 3;
  const echelle = largeur < 820 ? .5 : largeur < 1000 ? .4 : .45;
  const url = await evaluer(`(async () => {
    const srcs = ${JSON.stringify(images)};
    const imgs = await Promise.all(srcs.map((s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s; })));
    const w = Math.round(${largeur} * ${echelle}), h = Math.round(${hauteur} * ${echelle}), col = ${colonnes}, marge = 12;
    const lignes = Math.ceil(imgs.length / col);
    const c = document.createElement('canvas');
    c.width = col * (w + marge) + marge; c.height = lignes * (h + marge) + marge + 30;
    const x = c.getContext('2d');
    x.fillStyle = '#23292a'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff'; x.font = '14px system-ui'; x.fillText(${JSON.stringify(nom + ' · ' + largeur + ' px · ' + chemin)}, marge, 20);
    imgs.forEach((im, i) => { x.drawImage(im, marge + (i % col) * (w + marge), 30 + marge + Math.floor(i / col) * (h + marge), w, h); });
    return c.toDataURL('image/png');
  })()`);
  await writeFile(`${SORTIE}/${nom}-${suffixe}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`  ${nom.padEnd(15)} ${suffixe.padEnd(7)} ${images.length} vues · ${Math.round(total)} px${erreurs.length ? '\n     ✗ ' + erreurs.join('\n     ✗ ') : ''}`);
}

await mkdir(SORTIE, { recursive: true });
console.log('');
for (const [nom, chemin] of choisies) {
  if (nom === 'ecran') { await planche(nom, chemin, 440, 956, 'iphone'); continue; }
  await planche(nom, chemin, 1440, 900, 'bureau');
  if (TABLETTE) await planche(nom, chemin, 834, 1100, 'tablette');
  await planche(nom, chemin, 390, 800, 'mobile');
}
cdp.fermer();
console.log('\nplanches écrites dans ' + SORTIE + '\n');
