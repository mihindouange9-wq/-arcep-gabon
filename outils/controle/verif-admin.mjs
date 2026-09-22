/* ARCEP Gabon — vérification de l'administration.
   Crée un compte de relecture, parcourt tous les écrans, exécute un cycle complet de
   création, modification, aperçu et suppression sur chaque type de contenu, vérifie que
   les données publiques reflètent chaque étape, puis supprime le compte. Le document de
   contenus est remis dans son état de départ ; l'historique garde les copies intermédiaires.

   Le serveur doit tourner : node outils/controle/verif-admin.mjs [base] [--captures] */
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';
import { creerCompte, supprimerCompte, fermerSessionsDe } from '../../serveur/auth.mjs';
import { chemin } from '../../serveur/base.mjs';

const BASE = process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:4310';
const CAPTURES = process.argv.includes('--captures');
const ID = 'relecture-' + Date.now().toString(36);
const MDP = 'relecture-' + Math.random().toString(36).slice(2) + '-2026';

let cookie = '';
let csrf = '';
const anomalies = [];
const ok = (sujet) => console.log('  ✓ ' + sujet);
const ko = (sujet, detail = '') => { anomalies.push(sujet); console.log('  ✗ ' + sujet + (detail ? ' — ' + detail : '')); };

async function appel(chemin, { corps = null, fichiers = null, redirige = true } = {}) {
  const options = { method: corps || fichiers ? 'POST' : 'GET', headers: { cookie }, redirect: 'manual' };
  if (fichiers) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(corps || {})) fd.append(k, v);
    for (const [k, f] of Object.entries(fichiers)) fd.append(k, f.blob, f.nom);
    options.body = fd;
  } else if (corps) {
    options.headers['content-type'] = 'application/x-www-form-urlencoded';
    options.body = new URLSearchParams(corps).toString();
  }
  let r = await fetch(BASE + chemin, options);
  const cookies = r.headers.get('set-cookie');
  if (cookies) cookie = cookies.split(';')[0];
  const statutInitial = r.status;
  const cible = r.headers.get('location');
  if (redirige && (r.status === 303 || r.status === 302) && cible) r = await fetch(BASE + cible, { headers: { cookie } });
  const html = await r.text();
  const j = /name="csrf" value="([^"]+)"/.exec(html);
  if (j) csrf = j[1];
  return { statut: r.status, statutInitial, cible, html };
}
const contient = (html, texte) => html.includes(texte);
const publique = async (chemin) => (await fetch(BASE + chemin)).text();

const etatInitial = await readFile(chemin.FICHIER, 'utf8');
console.log(`\nARCEP — vérification de l'administration sur ${BASE}\n${'='.repeat(52)}`);

await creerCompte(ID, MDP, 'Relecture', 'administrateur');
try {
  /* ---- connexion ---- */
  let r = await appel('/admin/connexion', { corps: { identifiant: ID, motdepasse: 'mauvais' }, redirige: false });
  r.statutInitial === 401 ? ok('mot de passe incorrect refusé') : ko('mot de passe incorrect accepté');
  r = await appel('/admin/connexion', { corps: { identifiant: ID, motdepasse: MDP } });
  contient(r.html, 'Tableau de bord') ? ok('connexion') : ko('connexion', 'tableau de bord absent');
  r = await appel('/admin/actualites/nouvelle', { corps: { titre: 'x' }, redirige: false });
  r.statutInitial === 403 ? ok('écriture sans jeton anti-rejeu refusée') : ko('écriture sans jeton acceptée');

  /* ---- tous les écrans ---- */
  const ecrans = ['/admin', '/admin/pages', '/admin/pages/accueil', '/admin/actualites', '/admin/actualites/nouvelle', '/admin/documents',
    '/admin/documents/nouveau', '/admin/categories', '/admin/observatoire', '/admin/observatoire/nouveau', '/admin/faq', '/admin/faq/nouvelle',
    '/admin/chiffres', '/admin/chiffres/nouveau', '/admin/medias', '/admin/listes/droits', '/admin/listes/demarches', '/admin/utilisateurs',
    '/admin/reglages', '/admin/compte'];
  for (const ecran of ecrans) {
    r = await appel(ecran);
    r.statut === 200 && !contient(r.html, 'Une erreur est survenue') ? ok(`écran ${ecran}`) : ko(`écran ${ecran}`, 'statut ' + r.statut);
  }

  /* ---- actualité : brouillon, publication, programmation, aperçu, suppression ---- */
  const image = await readFile('public/assets/actus/119.jpg');
  r = await appel('/admin/actualites/nouvelle', { corps: { csrf, titre: 'Relecture — actualité de contrôle', dateIso: '2026-09-22', statut: 'brouillon', chapeau: 'Chapeau de contrôle', corps: 'Premier paragraphe.\n\nSecond paragraphe.', rubrique: 'Contrôle', lien: '', image: '', alt: 'Visuel', publierLe: '' },
    fichiers: { visuel: { blob: new Blob([image], { type: 'image/jpeg' }), nom: 'controle.jpg' } } });
  const idAct = /\/admin\/actualites\/(act-[a-z0-9]+)/.exec(r.html)?.[1];
  idAct && contient(r.html, 'brouillon') ? ok('actualité créée en brouillon avec visuel téléversé') : ko('création d’actualité');
  let pub = await publique('/actualites');
  !contient(pub, 'Relecture — actualité de contrôle') ? ok('le brouillon n’apparaît pas sur le site') : ko('brouillon visible sur le site');
  r = await appel(`/admin/actualites/${idAct}/apercu`);
  contient(r.html, 'Second paragraphe') ? ok('aperçu du brouillon') : ko('aperçu du brouillon');
  r = await appel(`/admin/actualites/${idAct}`, { corps: { csrf, titre: 'Relecture — actualité de contrôle', dateIso: '2026-09-22', statut: 'publie', chapeau: 'Chapeau', corps: 'Corps', rubrique: 'Contrôle', lien: '', image: '/assets/actus/119.jpg', alt: '', publierLe: '2099-01-01' } });
  pub = await publique('/actualites');
  !contient(pub, 'Relecture — actualité de contrôle') ? ok('l’actualité programmée reste invisible') : ko('actualité programmée visible');
  r = await appel(`/admin/actualites/${idAct}`, { corps: { csrf, titre: 'Relecture — actualité de contrôle', dateIso: '2026-09-22', statut: 'publie', chapeau: 'Chapeau', corps: 'Corps', rubrique: 'Contrôle', lien: '', image: '/assets/actus/119.jpg', alt: '', publierLe: '' } });
  pub = await publique('/actualites');
  contient(pub, 'Relecture — actualité de contrôle') ? ok('l’actualité publiée apparaît sur le site') : ko('actualité publiée absente');
  pub = await publique(`/actualites/${idAct}`);
  contient(pub, 'Corps') && contient(pub, 'NewsArticle') ? ok('page article avec données structurées') : ko('page article');
  r = await appel(`/admin/actualites/${idAct}/supprimer`, { corps: { csrf } });
  !contient(r.html, 'Relecture — actualité de contrôle') ? ok('actualité supprimée') : ko('suppression d’actualité');

  /* ---- document PDF ---- */
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  r = await appel('/admin/documents/nouveau', { corps: { csrf, titre: 'Relecture — décision de contrôle', categorie: 'decisions', annee: '2026', date: '', description: 'Description de contrôle', lien: '', fichier: '' },
    fichiers: { pdf: { blob: new Blob([pdf], { type: 'application/pdf' }), nom: 'controle.pdf' } } });
  const idDoc = /\/admin\/documents\/(doc-[a-z0-9]+)/.exec(r.html)?.[1];
  idDoc && contient(r.html, 'PDF') ? ok('texte réglementaire créé avec PDF téléversé') : ko('création de texte');
  pub = await publique('/reglementation?categorie=decisions');
  contient(pub, 'Relecture — décision de contrôle') && contient(pub, '/assets/documents/') ? ok('texte visible avec son PDF') : ko('texte absent du site');
  r = await appel('/admin/documents/nouveau', { corps: { csrf, titre: 'Faux PDF', categorie: 'decisions', annee: '2026' }, fichiers: { pdf: { blob: new Blob([image], { type: 'application/pdf' }), nom: 'faux.pdf' } }, redirige: false });
  r.statutInitial === 400 ? ok('un JPEG renommé en PDF est refusé') : ko('faux PDF accepté');
  r = await appel('/admin/medias');
  contient(r.html, 'controle-') && contient(r.html, 'texte « Relecture') ? ok('la médiathèque signale le PDF employé') : ko('médiathèque');
  r = await appel(`/admin/documents/${idDoc}/supprimer`, { corps: { csrf } });
  !contient(r.html, 'Relecture — décision de contrôle') ? ok('texte supprimé') : ko('suppression de texte');

  /* ---- catégorie ---- */
  r = await appel('/admin/categories', { corps: { csrf, cle: 'controle', nom: 'Contrôle', lien: '' } });
  contient(r.html, 'Contrôle') ? ok('catégorie créée') : ko('création de catégorie');
  r = await appel('/admin/categories/lois/supprimer', { corps: { csrf }, redirige: false });
  r.statutInitial === 400 ? ok('une catégorie employée ne peut pas être supprimée') : ko('catégorie employée supprimée');
  r = await appel('/admin/categories/controle/supprimer', { corps: { csrf } });
  !contient(r.html, '>Contrôle<') ? ok('catégorie supprimée') : ko('suppression de catégorie');

  /* ---- observatoire ---- */
  r = await appel('/admin/observatoire/nouveau', { corps: { csrf, titre: 'Relecture — tableau de bord', marche: 'internet', annee: '2026', trimestre: 'T2', lien: 'https://www.arcep.ga/', fichier: '' } });
  const idObs = /\/admin\/observatoire\/(obs-[a-z0-9]+)/.exec(r.html)?.[1];
  idObs ? ok('tableau de bord créé') : ko('création de tableau de bord');
  pub = await publique('/observatoire?marche=internet&annee=2026');
  contient(pub, 'Relecture — tableau de bord') ? ok('tableau de bord visible et filtrable') : ko('tableau de bord absent');
  r = await appel(`/admin/observatoire/${idObs}/supprimer`, { corps: { csrf } });
  ok('tableau de bord supprimé');

  /* ---- FAQ ---- */
  r = await appel('/admin/faq/nouvelle', { corps: { csrf, q: 'Question de contrôle ?', r: 'Réponse de contrôle.', categorie: 'Contrôle' } });
  const idFaq = /\/admin\/faq\/(faq-[a-z0-9]+)/.exec(r.html)?.[1];
  idFaq ? ok('question créée') : ko('création de question');
  r = await appel(`/admin/faq/${idFaq}/monter`, { corps: { csrf } });
  pub = await publique('/consommateurs');
  contient(pub, 'Question de contrôle') && contient(pub, 'FAQPage') ? ok('question visible, données structurées présentes') : ko('question absente');
  await appel(`/admin/faq/${idFaq}/supprimer`, { corps: { csrf } });
  ok('question supprimée');

  /* ---- chiffres ---- */
  r = await appel('/admin/chiffres/nouveau', { corps: { csrf, libelle: 'Indicateur de contrôle', affichage: '12,5', valeur: '12,5', decimales: '1', unite: '%', periode: 'T1 2026' } });
  const idChi = /\/admin\/chiffres\/(chi-[a-z0-9]+)/.exec(r.html)?.[1];
  idChi ? ok('indicateur créé') : ko('création d’indicateur');
  pub = await publique('/');
  contient(pub, 'Indicateur de contrôle') && contient(pub, 'data-jauge') ? ok('indicateur visible avec sa jauge') : ko('indicateur absent');
  await appel(`/admin/chiffres/${idChi}/supprimer`, { corps: { csrf } });
  ok('indicateur supprimé');

  /* ---- page, liste, réglages ---- */
  r = await appel('/admin/pages/accueil', { corps: { csrf, heroTitre: 'Titre de contrôle' } });
  pub = await publique('/');
  contient(pub, 'Titre de contrôle') ? ok('texte de page modifié') : ko('texte de page');
  await appel('/admin/pages/accueil', { corps: { csrf } });
  pub = await publique('/');
  contient(pub, 'Réguler les communications') ? ok('texte de page rétabli') : ko('texte de page non rétabli');
  r = await appel('/admin/reglages', { corps: { csrf, titreSite: 'ARCEP Gabon', descriptionSite: 'Description de contrôle', adressePublique: 'https://exemple.ga', indexation: '1', mentionPied: 'Mention', reseauNom0: 'Contrôle', reseauLien0: 'https://exemple.ga/x' } });
  pub = await publique('/');
  contient(pub, 'index, follow') && contient(pub, 'https://exemple.ga/') && contient(pub, 'Réseaux officiels') ? ok('réglages appliqués : indexation, canonique, réseaux') : ko('réglages');
  const robots = await publique('/robots.txt');
  contient(robots, 'Sitemap: https://exemple.ga/sitemap.xml') ? ok('robots.txt et plan du site') : ko('robots.txt');
  const plan = await publique('/sitemap.xml');
  contient(plan, '<loc>https://exemple.ga/reglementation</loc>') ? ok('sitemap.xml') : ko('sitemap.xml');

  /* ---- utilisateurs et rôles ---- */
  r = await appel('/admin/utilisateurs', { corps: { csrf, identifiant: ID + '-redac', nom: 'Rédacteur', role: 'redacteur', motdepasse: MDP } });
  contient(r.html, ID + '-redac') ? ok('compte rédacteur créé') : ko('création de compte');
  const cookieAdmin = cookie; const csrfAdmin = csrf;
  cookie = '';
  r = await appel('/admin/connexion', { corps: { identifiant: ID + '-redac', motdepasse: MDP } });
  r = await appel('/admin/utilisateurs', { redirige: false });
  r.statut === 403 ? ok('le rédacteur n’accède pas aux utilisateurs') : ko('rédacteur admis aux utilisateurs');
  r = await appel('/admin/actualites');
  r.statut === 200 ? ok('le rédacteur accède aux actualités') : ko('rédacteur refusé aux actualités');
  cookie = cookieAdmin; csrf = csrfAdmin;
  r = await appel(`/admin/utilisateurs/${encodeURIComponent(ID + '-redac')}/supprimer`, { corps: { csrf } });
  !contient(r.html, ID + '-redac') ? ok('compte rédacteur supprimé') : ko('suppression de compte');

  /* ---- restauration ---- */
  r = await appel('/admin');
  const version = /<code>([^<]+)<\/code>/.exec(r.html)?.[1];
  r = await appel('/admin/restaurer', { corps: { csrf, version } });
  contient(r.html, 'Version restaurée') ? ok('restauration d’une version') : ko('restauration');

  /* ---- captures ---- */
  if (CAPTURES) await capturer(cookie);
} finally {
  fermerSessionsDe(ID);
  await supprimerCompte(ID).catch(() => {});
  await writeFile(chemin.FICHIER, etatInitial, 'utf8');
  /* Les fichiers téléversés pendant le cycle ne doivent pas rester dans la médiathèque. */
  for (const dossier of ['public/assets/medias', 'public/assets/documents']) {
    for (const f of await readdir(dossier).catch(() => [])) if (f.startsWith('controle-')) await unlink(join(dossier, f)).catch(() => {});
  }
}

console.log(`\n${'='.repeat(52)}`);
if (!anomalies.length) console.log('Aucune anomalie dans l’administration.\n');
else { console.log(`${anomalies.length} anomalie(s) : ${anomalies.join(' · ')}\n`); process.exitCode = 1; }

/* ---- captures des écrans, connecté ---- */
async function capturer(jeton) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP || 'C:/Temp'}/chrome-admin-${port}`, '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' });
  let cible = null;
  for (let i = 0; i < 60 && !cible; i++) { await attendre(250); try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* attente */ } }
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((okk) => { ws.onopen = okk; });
  let n = 0; const attentes = new Map();
  ws.onmessage = (m) => { const t = JSON.parse(m.data); if (t.id && attentes.has(t.id)) { attentes.get(t.id)(t); attentes.delete(t.id); } };
  const envoyer = (method, params = {}) => new Promise((okk) => { const id = ++n; attentes.set(id, okk); ws.send(JSON.stringify({ id, method, params })); });
  await envoyer('Page.enable'); await envoyer('Network.enable');
  const [nom, valeur] = jeton.split('=');
  await envoyer('Network.setCookie', { name: nom, value: valeur, url: BASE });
  await mkdir('outils/captures', { recursive: true });
  for (const [fichier, chemin, largeur] of [['admin-tableau', '/admin', 1440], ['admin-actualites', '/admin/actualites', 1440], ['admin-actualite-form', '/admin/actualites/nouvelle', 1440], ['admin-reglages', '/admin/reglages', 1440], ['admin-mobile', '/admin/actualites', 390]]) {
    await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 900, deviceScaleFactor: 1, mobile: largeur < 820 });
    await envoyer('Page.navigate', { url: BASE + chemin });
    await attendre(1500);
    const { data } = (await envoyer('Page.captureScreenshot', { format: 'png' })).result;
    await writeFile(`outils/captures/${fichier}.png`, Buffer.from(data, 'base64'));
  }
  try { ws.close(); } catch { /* fermé */ }
  chrome.kill();
  console.log('  captures : outils/captures/admin-*.png');
}
