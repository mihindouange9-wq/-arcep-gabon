// Réencode en JPEG (canvas Chrome) les visuels de public/assets/actus/ trop lourds ou trop larges, et répercute
// les renommages dans donnees/arcep.json. Un fichier n'est remplacé que si le résultat est plus léger.
// node outils/contenu/optimiser-images.mjs [--limite 350] [--largeur 1600] [--qualite 82]
import { tmpdir } from 'node:os';
import { readdir, stat, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as attendre } from 'node:timers/promises';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const args = process.argv.slice(2);
const option = (nom, defaut) => { const i = args.indexOf('--' + nom); return i >= 0 ? Number(args[i + 1]) : defaut; };
const LIMITE = option('limite', 350) * 1024;
const LARGEUR = option('largeur', 1600);
const QUALITE = option('qualite', 82) / 100;
const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const DOSSIER = join(RACINE, 'public', 'assets', 'actus');
const FICHIER = join(RACINE, 'donnees', 'arcep.json');

const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/chrome-images-${port}`, 'about:blank',
], { stdio: 'ignore' });
let cible = null;
for (let i = 0; i < 60 && !cible; i++) { await attendre(250); try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* attente */ } }
const ws = new WebSocket(cible.webSocketDebuggerUrl);
await new Promise((ok) => { ws.onopen = ok; });
let n = 0; const attentes = new Map();
ws.onmessage = (m) => { const t = JSON.parse(m.data); if (t.id && attentes.has(t.id)) { attentes.get(t.id)(t); attentes.delete(t.id); } };
const envoyer = (method, params = {}) => new Promise((ok) => { const id = ++n; attentes.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
const evaluer = async (e) => { const r = await envoyer('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, timeout: 120000 }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'erreur'); return r.result?.result?.value; };
await envoyer('Page.enable'); await envoyer('Runtime.enable');
// about:blank ne peut pas lire file:// : on part d'une page locale
const PAGE = join(tmpdir(), 'arcep-images.html');
await writeFile(PAGE, '<!doctype html><meta charset="utf-8"><title>Images</title>', 'utf8');
await envoyer('Page.navigate', { url: 'file:///' + PAGE.replace(/\\/g, '/') });
await attendre(500);

const D = JSON.parse(await readFile(FICHIER, 'utf8'));
let avant = 0, apres = 0, traites = 0;
const renommages = new Map();
for (const nom of (await readdir(DOSSIER)).sort()) {
  if (!/\.(jpe?g|png|webp)$/i.test(nom)) continue;
  const chemin = join(DOSSIER, nom);
  const taille = (await stat(chemin)).size;
  const url = 'file:///' + chemin.replace(/\\/g, '/');
  const info = await evaluer(`new Promise((ok) => { const i = new Image(); i.onload = () => ok({ l: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => ok(null); i.src = ${JSON.stringify(url)}; })`);
  if (!info) { console.log(`  ${nom} : illisible`); continue; }
  if (taille <= LIMITE && info.l <= LARGEUR) continue;
  const k = Math.min(1, LARGEUR / info.l);
  const donnees = await evaluer(`new Promise((ok) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * ${k}); c.height = Math.round(i.naturalHeight * ${k}); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', ${QUALITE}).split(',')[1]); }; i.src = ${JSON.stringify(url)}; })`);
  const octets = Buffer.from(donnees, 'base64');
  if (octets.length >= taille && k === 1) continue;
  const nouveau = nom.replace(/\.(jpe?g|png|webp)$/i, '.jpg');
  await writeFile(join(DOSSIER, nouveau), octets);
  if (nouveau !== nom) { await unlink(chemin); renommages.set(`/assets/actus/${nom}`, `/assets/actus/${nouveau}`); }
  avant += taille; apres += octets.length; traites++;
  console.log(`  ${nom.padEnd(16)} ${info.l}×${info.h} ${(taille / 1024).toFixed(0).padStart(5)} Ko → ${nouveau.padEnd(16)} ${(octets.length / 1024).toFixed(0).padStart(5)} Ko`);
}
try { ws.close(); } catch { /* fermé */ }
chrome.kill();

// renommages répercutés dans le document
if (renommages.size) {
  let texte = JSON.stringify(D, null, 1);
  for (const [a, b] of renommages) texte = texte.split(a).join(b);
  await writeFile(FICHIER, texte, 'utf8');
}
console.log(`\n${traites} visuels réencodés · ${(avant / 1048576).toFixed(1)} Mo → ${(apres / 1048576).toFixed(1)} Mo · ${renommages.size} références mises à jour\n`);
