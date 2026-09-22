/* ARCEP Gabon — la vidéo de l'iPhone.
   Enregistre le site mobile qui défile lentement, page après page, au format réel de
   l'écran du 17 Pro Max (440 × 956 points, ici rendus à 1,5 pixel par point), sans barre
   de défilement, puis l'encode en WebM (VP9) dans Chrome par WebCodecs. Écrit :
     public/assets/iphone-defilement.webm   la vidéo
     public/assets/iphone-affiche.jpg       la première image, affichée avant lecture
     public/assets/iphone-defilement.json   le début de chaque page, en secondes

   Le serveur doit tourner. node outils/charte/video-iphone.mjs [base] [--vitesse 260] [--ips 24] */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { setTimeout as attendre } from 'node:timers/promises';

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith('http')) || 'http://127.0.0.1:4310';
const option = (nom, defaut) => { const i = args.indexOf('--' + nom); return i >= 0 ? Number(args[i + 1]) : defaut; };
const VITESSE = option('vitesse', 300);      // pixels par seconde
const IPS = option('ips', 24);
const ECHELLE = 1.5;
const L = 440, H = 956;
const DEBIT = option('debit', 950) * 1000;  // bits par seconde
const DOSSIER = `${process.env.TEMP || 'C:/Temp'}/arcep-video-${Date.now()}`;

/* Les pages, et la hauteur de défilement retenue pour chacune : l'accueil en entier,
   les autres jusqu'à un plafond, pour que la vidéo reste courte. */
const PAGES = [
  { route: '/', plafond: Infinity, pause: 1.6 },
  { route: '/missions', plafond: 1800, pause: 1.2 },
  { route: '/observatoire', plafond: 2200, pause: 1.2 },
  { route: '/reglementation', plafond: 1800, pause: 1.2 },
  { route: '/actualites', plafond: 1800, pause: 1.2 },
  { route: '/contact', plafond: Infinity, pause: 1.6 },
];

/* ======================= CHROME ======================= */
async function ouvrirChrome(taille) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${port}`, `--user-data-dir=${DOSSIER}/profil-${port}`, `--window-size=${taille}`, 'about:blank',
  ], { stdio: 'ignore' });
  let cible = null;
  for (let i = 0; i < 60 && !cible; i++) { await attendre(250); try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* attente */ } }
  if (!cible) throw new Error('Chrome injoignable');
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((ok) => { ws.onopen = ok; });
  let n = 0; const attentes = new Map();
  ws.onmessage = (m) => { const t = JSON.parse(m.data); if (t.id && attentes.has(t.id)) { attentes.get(t.id)(t); attentes.delete(t.id); } };
  const envoyer = (method, params = {}) => new Promise((ok) => { const id = ++n; attentes.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
  const evaluer = async (expression, timeout = 30000) => {
    const r = await envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, timeout });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'erreur');
    return r.result?.result?.value;
  };
  return { envoyer, evaluer, fermer: () => { try { ws.close(); } catch { /* fermé */ } chrome.kill(); } };
}

/* ======================= 1. CAPTURE ======================= */
await mkdir(DOSSIER, { recursive: true });
const cdp = await ouvrirChrome(`${L},${H}`);
await cdp.envoyer('Page.enable'); await cdp.envoyer('Runtime.enable');
await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: L, height: H, deviceScaleFactor: ECHELLE, mobile: true });
await cdp.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true });

const segments = [];
let numero = 0;
const capturer = async () => {
  const { data } = (await cdp.envoyer('Page.captureScreenshot', { format: 'jpeg', quality: 92 })).result;
  await writeFile(`${DOSSIER}/i${String(numero++).padStart(5, '0')}.jpg`, Buffer.from(data, 'base64'));
};
/* Un déplacement de défilement suit une courbe douce au départ et à l'arrivée. */
const doux = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

console.log(`\nARCEP — vidéo de l'iPhone · ${L}×${H} à ${ECHELLE}x · ${IPS} i/s · ${VITESSE} px/s\n${'='.repeat(52)}`);
for (const page of PAGES) {
  segments.push({ route: page.route, debut: Number((numero / IPS).toFixed(2)) });
  await cdp.envoyer('Page.navigate', { url: BASE + page.route + '?ecran=1' });
  await attendre(1500);
  await cdp.envoyer('Page.captureScreenshot', { format: 'jpeg', quality: 50 });
  await attendre(800);
  /* Les visuels paresseux sont chargés d'avance : on descend, on remonte. */
  const total = await cdp.evaluer('document.documentElement.scrollHeight - window.innerHeight');
  for (let y = 0; y < total; y += 700) { await cdp.evaluer(`window.scrollTo(0, ${y})`); await attendre(60); }
  await cdp.evaluer('window.scrollTo(0, 0)');
  await attendre(600);
  const course = Math.min(total, page.plafond);
  const images = Math.round((course / VITESSE) * IPS);
  const pauseImages = Math.round(page.pause * IPS);
  for (let i = 0; i < pauseImages; i++) await capturer();
  for (let i = 1; i <= images; i++) {
    /* Une légère douceur aux extrémités, une vitesse constante entre les deux. */
    const p = i / images;
    const y = course * (p < .08 ? doux(p / .16) * .08 : p > .92 ? .92 + doux(.5 + (p - .92) / .16) * .08 : p);
    await cdp.evaluer(`window.scrollTo(0, ${Math.round(y)})`);
    await capturer();
  }
  for (let i = 0; i < pauseImages; i++) await capturer();
  console.log(`  ${page.route.padEnd(16)} ${Math.round(course)} px · ${images + 2 * pauseImages} images`);
}
cdp.fermer();
const total = numero;
console.log(`  ${total} images · ${(total / IPS).toFixed(1)} s`);

/* ======================= 2. ENCODAGE ======================= */
/* Une page vierge, ouverte depuis le disque, charge les images une à une, les encode en
   VP9 par WebCodecs et les assemble en WebM avec webm-muxer, qui écrit durée et index. */
const pageEncodeur = `<!doctype html><meta charset="utf-8"><script type="module">
import { Muxer, ArrayBufferTarget } from 'https://cdn.jsdelivr.net/npm/webm-muxer@5.0.3/build/webm-muxer.mjs';
window.encoder = async (dossier, total, ips, largeur, hauteur, debit) => {
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'V_VP9', width: largeur, height: hauteur, frameRate: ips } });
  const encodeur = new VideoEncoder({ output: (morceau, meta) => muxer.addVideoChunk(morceau, meta), error: (e) => { window.erreur = String(e); } });
  encodeur.configure({ codec: 'vp09.00.10.08', width: largeur, height: hauteur, bitrate: debit, framerate: ips, latencyMode: 'quality' });
  const canvas = new OffscreenCanvas(largeur, hauteur);
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < total; i++) {
    const img = new Image();
    img.src = dossier + '/i' + String(i).padStart(5, '0') + '.jpg';
    await img.decode();
    ctx.drawImage(img, 0, 0, largeur, hauteur);
    const image = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / ips), duration: Math.round(1e6 / ips) });
    encodeur.encode(image, { keyFrame: i % (ips * 4) === 0 });
    image.close();
    if (encodeur.encodeQueueSize > 8) await new Promise((ok) => setTimeout(ok, 40));
    window.avancement = i;
  }
  await encodeur.flush();
  muxer.finalize();
  const octets = new Uint8Array(muxer.target.buffer);
  let s = '';
  for (let i = 0; i < octets.length; i += 32768) s += String.fromCharCode.apply(null, octets.subarray(i, i + 32768));
  return btoa(s);
};
window.pret = true;
</script>`;
await writeFile(`${DOSSIER}/encodeur.html`, pageEncodeur, 'utf8');
const enc = await ouvrirChrome('800,600');
await enc.envoyer('Page.enable'); await enc.envoyer('Runtime.enable');
await enc.envoyer('Page.navigate', { url: 'file:///' + DOSSIER.replace(/\\/g, '/') + '/encodeur.html' });
for (let i = 0; i < 80; i++) { if (await enc.evaluer('window.pret === true')) break; await attendre(250); }
const largeur = Math.round(L * ECHELLE / 2) * 2, hauteur = Math.round(H * ECHELLE / 2) * 2;
console.log(`  encodage VP9 ${largeur}×${hauteur} à ${DEBIT / 1000} kb/s…`);
const dossierUrl = 'file:///' + DOSSIER.replace(/\\/g, '/');
const base64 = await enc.evaluer(`window.encoder(${JSON.stringify(dossierUrl)}, ${total}, ${IPS}, ${largeur}, ${hauteur}, ${DEBIT})`, 900000);
const erreur = await enc.evaluer('window.erreur || ""');
enc.fermer();
if (erreur || !base64) { console.error('échec de l’encodage :', erreur); process.exit(1); }
await writeFile('public/assets/iphone-defilement.webm', Buffer.from(base64, 'base64'));

/* L'affiche : la première image, telle quelle. */
const premiere = (await readdir(DOSSIER)).find((f) => f === 'i00000.jpg');
if (premiere) await writeFile('public/assets/iphone-affiche.jpg', await (await import('node:fs/promises')).readFile(`${DOSSIER}/${premiere}`));
await writeFile('public/assets/iphone-defilement.json', JSON.stringify(segments), 'utf8');
await rm(DOSSIER, { recursive: true, force: true });
const { size } = await (await import('node:fs/promises')).stat('public/assets/iphone-defilement.webm');
console.log(`\n  public/assets/iphone-defilement.webm · ${(size / 1048576).toFixed(1)} Mo · ${(total / IPS).toFixed(0)} s\n  public/assets/iphone-affiche.jpg · public/assets/iphone-defilement.json\n`);
