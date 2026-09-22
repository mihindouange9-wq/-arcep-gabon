/* ARCEP Gabon — serveur.
   Un seul processus Node, aucune dépendance installée : le site, l'interface de données et
   l'espace d'administration tiennent dans la bibliothèque standard.

   node serveur/index.mjs [port]
   Variables d'environnement : ARCEP_PORT, ARCEP_HOTE, ARCEP_SECURISE=1 derrière un HTTPS. */
import { createServer } from 'node:http';
import { readFile, stat, mkdir, appendFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lire, modifier, identifiant, chemin as chemins } from './base.mjs';
import { servirApi } from './api.mjs';
import { servirAdmin } from './admin.mjs';
import { lireOctets, frontiere, decouper } from './multipart.mjs';
import { poserVersions, dateIso, RUBRIQUES, actualitesPubliees } from './vues/base.mjs';
import { reglages } from './schema.mjs';
import * as Pages from './vues/pages.mjs';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(RACINE, 'public');
const PORT = Number(process.argv[2] || process.env.ARCEP_PORT || process.env.PORT || 4310);
/* Sur une plateforme d'hébergement, le processus doit écouter sur toutes les interfaces. */
const HOTE = process.env.ARCEP_HOTE || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const SECURISE = process.env.ARCEP_SECURISE === '1';
const CORPS_MAX = 64 * 1024;           // un formulaire de contact n'a pas besoin de plus
const CORPS_MEDIA = 26 * 1024 * 1024;  // un téléversement de fichiers, et lui seul

/* ======================= TYPES SERVIS ======================= */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

/* ======================= EN-TÊTES DE SÉCURITÉ ======================= */
/* Le site ne charge rien d'extérieur : caractères et bibliothèques sont auto-hébergés,
   aucun script n'est en ligne. La politique se referme donc sur « self ».
   'unsafe-inline' ne subsiste que pour les styles, parce que les vues posent des variables
   dans des attributs style — un attribut, jamais une balise.
   L'accueil affiche le site lui-même dans un téléphone : la page est donc encadrable par
   sa propre origine, et par elle seule. */
const csp = (encadrable) => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-src 'self'",
  `frame-ancestors ${encadrable ? "'self'" : "'none'"}`,
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const securite = (encadrable = false) => ({
  'content-security-policy': csp(encadrable),
  'x-content-type-options': 'nosniff',
  'x-frame-options': encadrable ? 'SAMEORIGIN' : 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'cross-origin-opener-policy': 'same-origin',
});

/* ======================= OUTILS ======================= */
const html = (reponse, corps, statut = 200, { cache = 'no-cache', encadrable = false, indexable = false } = {}) => {
  reponse.writeHead(statut, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': cache,
    ...securite(encadrable),
    ...(indexable ? {} : { 'x-robots-tag': 'noindex, nofollow' }),
  });
  reponse.end(corps);
};

const texte = (reponse, corps, type = 'text/plain; charset=utf-8', statut = 200) => {
  reponse.writeHead(statut, { 'content-type': type, 'cache-control': 'public, max-age=3600', ...securite() });
  reponse.end(corps);
};

/* Lit un corps de formulaire, borné en taille : une requête trop longue est refusée
   avant d'être mise en mémoire. */
function lireCorps(requete) {
  return new Promise((resoudre, rejeter) => {
    let total = 0;
    const morceaux = [];
    requete.on('data', (bloc) => {
      total += bloc.length;
      if (total > CORPS_MAX) { rejeter(new Error('corps trop volumineux')); requete.destroy(); return; }
      morceaux.push(bloc);
    });
    requete.on('end', () => resoudre(Buffer.concat(morceaux).toString('utf8')));
    requete.on('error', rejeter);
  });
}

const formulaire = (brut) => {
  const sortie = {};
  for (const [cle, valeur] of new URLSearchParams(brut)) sortie[cle] = valeur;
  return sortie;
};

/* ======================= VERSIONS ======================= */
/* Chaque feuille et chaque script reçoit une empreinte de son contenu. Les vues l'ajoutent
   à l'adresse ; un fichier demandé avec son empreinte est mis en cache un an, puisque son
   adresse changera avec son contenu. */
const VERSIONS = {};
async function calculerVersions() {
  for (const dossier of ['css', 'js', 'js/vendor', 'js/modules']) {
    let noms = [];
    try { noms = await readdir(join(PUBLIC, dossier)); } catch { continue; }
    for (const nom of noms) {
      if (!/\.(css|m?js)$/.test(nom)) continue;
      const contenu = await readFile(join(PUBLIC, dossier, nom));
      VERSIONS[`/${dossier}/${nom}`] = createHash('sha1').update(contenu).digest('hex').slice(0, 10);
    }
  }
  poserVersions(VERSIONS);
}

/* ======================= FICHIERS STATIQUES ======================= */
async function servirFichier(cheminUrl, url, reponse, tete) {
  const cible = resolve(join(PUBLIC, normalize(decodeURIComponent(cheminUrl))));
  if (relative(PUBLIC, cible).startsWith('..')) return false;   // jamais hors de public/
  let info;
  try { info = await stat(cible); } catch { return false; }
  if (!info.isFile()) return false;

  const type = TYPES[extname(cible).toLowerCase()];
  if (!type) return false;                                       // extension non servie

  /* Les médias ne changent jamais sous le même nom : un an de cache. Les feuilles et les
     scripts sont mis en cache un an si l'adresse porte l'empreinte du fichier, et sont
     revalidés à chaque visite sinon. */
  const media = /^\/assets\//.test(cheminUrl);
  const versionne = url.searchParams.get('v') && url.searchParams.get('v') === VERSIONS[cheminUrl];
  const immuable = media || versionne;
  const entetes = {
    'content-type': type,
    'cache-control': immuable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
    'content-length': info.size,
    'last-modified': info.mtime.toUTCString(),
  };
  if (type === 'application/pdf') entetes['content-disposition'] = 'inline';
  reponse.writeHead(200, entetes);
  if (tete) return reponse.end(), true;
  reponse.end(await readFile(cible));
  return true;
}

/* ======================= DEMANDES DES USAGERS ======================= */
/* Le formulaire de contact enregistre la demande dans donnees/demandes.jsonl.
   Aucun envoi de courriel : l'Autorité branchera son propre relais le moment venu. */
async function enregistrerDemande(champs, adresse) {
  await mkdir(chemins.DOSSIER, { recursive: true });
  const ligne = JSON.stringify({
    recue: new Date().toISOString(),
    nom: champs.nom, courriel: champs.courriel, objet: champs.objet || '',
    direction: champs.direction, message: champs.message,
    adresse,
  }) + '\n';
  await appendFile(join(chemins.DOSSIER, 'demandes.jsonl'), ligne, 'utf8');
}

const demandesRecentes = new Map();
function tropDeDemandes(adresse) {
  const maintenant = Date.now();
  const liste = (demandesRecentes.get(adresse) || []).filter((t) => maintenant - t < 3600_000);
  demandesRecentes.set(adresse, liste);
  return liste.length >= 5;
}
function noterDemande(adresse) {
  const liste = demandesRecentes.get(adresse) || [];
  liste.push(Date.now());
  demandesRecentes.set(adresse, liste);
}

function validerDemande(c) {
  const nom = String(c.nom || '').trim();
  const courriel = String(c.courriel || '').trim();
  const message = String(c.message || '').trim();
  if (nom.length < 2 || nom.length > 120) return 'Indiquez votre nom et prénom.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(courriel) || courriel.length > 160) return 'Indiquez une adresse électronique valide.';
  if (String(c.objet || '').length > 200) return 'L’objet dépasse deux cents caractères.';
  if (message.length < 10) return 'Le message doit comporter au moins dix caractères.';
  if (message.length > 4000) return 'Le message dépasse quatre mille caractères.';
  return '';
}

/* ======================= PLAN DU SITE ======================= */
function planDuSite(D) {
  const R = reglages(D);
  const base = (R.adressePublique || `http://${HOTE}:${PORT}`).replace(/\/+$/, '');
  const pages = ['/', ...RUBRIQUES.map((r) => r.chemin), '/mentions-legales', '/confidentialite',
    ...actualitesPubliees(D).map((a) => `/actualites/${encodeURIComponent(a.id)}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}
</urlset>
`;
}

/* ======================= ROUTAGE ======================= */
async function router(requete, reponse) {
  const url = new URL(requete.url, `http://${requete.headers.host || 'localhost'}`);
  const chemin = url.pathname.replace(/\/+$/, '') || '/';
  const methode = requete.method;
  const tete = methode === 'HEAD';

  if (methode !== 'GET' && methode !== 'POST' && methode !== 'HEAD') {
    reponse.writeHead(405, { allow: 'GET, POST, HEAD', ...securite() });
    return reponse.end('Méthode non autorisée');
  }

  /* --- interface de données --- */
  if (chemin === '/api' || chemin.startsWith('/api/')) {
    if (methode === 'POST') { reponse.writeHead(405, { allow: 'GET' }); return reponse.end(); }
    return servirApi(chemin, url, reponse);
  }

  /* --- administration --- */
  if (chemin === '/admin' || chemin.startsWith('/admin/')) {
    let corpsForm = {};
    let fichiers = [];
    if (methode === 'POST') {
      const type = requete.headers['content-type'] || '';
      try {
        if (type.startsWith('multipart/form-data')) {
          const limite = frontiere(type);
          if (!limite) { reponse.writeHead(400, securite()); return reponse.end('Formulaire illisible'); }
          const octets = await lireOctets(requete, CORPS_MEDIA);
          const parts = decouper(octets, limite);
          corpsForm = parts.champs;
          fichiers = parts.fichiers;
        } else {
          corpsForm = formulaire(await lireCorps(requete));
        }
      } catch {
        reponse.writeHead(413, { 'content-type': 'text/html; charset=utf-8', connection: 'close', ...securite() });
        reponse.end('<!doctype html><meta charset="utf-8"><title>Fichier trop lourd</title>'
          + '<p style="font:16px/1.6 system-ui;padding:3rem">Le fichier envoyé dépasse la taille '
          + 'autorisée (cinq mégaoctets par image, vingt par document). '
          + '<a href="/admin/medias">Revenir à la médiathèque</a></p>');
        reponse.on('finish', () => requete.destroy());
        return;
      }
    }
    return servirAdmin({ chemin, url, requete, reponse, corpsForm, fichiers, securise: SECURISE, entetes: securite() });
  }

  /* --- fichiers du site --- */
  if (methode !== 'POST' && chemin !== '/' && await servirFichier(chemin, url, reponse, tete)) return;

  const D = await lire();
  const R = reglages(D);
  const ecran = url.searchParams.get('ecran') === '1';
  const options = { encadrable: ecran, indexable: R.indexation };
  const rendre = (corps, statut = 200) => html(reponse, corps, statut, options);

  if (chemin === '/robots.txt') {
    const base = (R.adressePublique || '').replace(/\/+$/, '');
    return texte(reponse, R.indexation
      ? `User-agent: *\nAllow: /\nDisallow: /admin\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`
      : 'User-agent: *\nDisallow: /\n');
  }
  if (chemin === '/sitemap.xml') return texte(reponse, planDuSite(D), 'application/xml; charset=utf-8');

  /* --- formulaire de contact --- */
  if (chemin === '/contact' && methode === 'POST') {
    const adresse = requete.socket.remoteAddress || '';
    let champs = {};
    try { champs = formulaire(await lireCorps(requete)); }
    catch { reponse.writeHead(413, securite()); return reponse.end('Requête trop volumineuse'); }

    /* Le champ piège n'est visible que des robots : s'il est rempli, on accuse réception
       sans rien enregistrer. */
    if (String(champs.site || '').trim()) return rendre(Pages.contact(D, { envoye: true, ecran }));
    if (tropDeDemandes(adresse)) {
      return rendre(Pages.contact(D, { erreur: 'Trop de demandes envoyées depuis cet accès. Réessayez dans une heure.', champs, ecran }), 429);
    }
    const erreur = validerDemande(champs);
    if (erreur) return rendre(Pages.contact(D, { erreur, champs, ecran }), 400);

    await enregistrerDemande(champs, adresse);
    noterDemande(adresse);
    return rendre(Pages.contact(D, { envoye: true, ecran }));
  }
  if (methode === 'POST') { reponse.writeHead(405, { allow: 'GET, HEAD', ...securite() }); return reponse.end(); }

  /* --- pages publiques --- */
  if (chemin === '/') return rendre(Pages.accueil(D, { ecran }));
  if (chemin === '/autorite') return rendre(Pages.autorite(D, { ecran }));
  if (chemin === '/missions') return rendre(Pages.missions(D, { ecran }));
  if (chemin === '/observatoire') {
    return rendre(Pages.observatoire(D, {
      ecran, marche: url.searchParams.get('marche') || 'tous', annee: url.searchParams.get('annee') || 'toutes',
    }));
  }
  if (chemin === '/reglementation') {
    return rendre(Pages.reglementation(D, {
      ecran,
      categorie: url.searchParams.get('categorie') || 'tout',
      annee: url.searchParams.get('annee') || 'toutes',
      recherche: url.searchParams.get('q') || '',
    }));
  }
  if (chemin === '/actualites') {
    return rendre(Pages.actualites(D, { ecran, annee: url.searchParams.get('annee') || 'toutes', recherche: url.searchParams.get('q') || '' }));
  }
  const article = /^\/actualites\/([^/]+)$/.exec(chemin);
  if (article) {
    const id = decodeURIComponent(article[1]);
    const a = actualitesPubliees(D).find((x) => x.id === id);
    if (!a) return rendre(Pages.introuvable(D, { ecran }), 404);
    return rendre(Pages.article(D, a, { ecran }));
  }
  if (chemin === '/consommateurs') return rendre(Pages.consommateurs(D, { ecran, recherche: url.searchParams.get('q') || '' }));
  if (chemin === '/contact') return rendre(Pages.contact(D, { ecran, direction: url.searchParams.get('direction') || '' }));
  if (chemin === '/mentions-legales') return rendre(Pages.mentionsLegales(D, { ecran }));
  if (chemin === '/confidentialite') return rendre(Pages.confidentialite(D, { ecran }));

  return rendre(Pages.introuvable(D, { ecran }), 404);
}

/* ======================= MISE EN ROUTE ======================= */
/* Les contenus repris du site officiel n'avaient ni identifiant, ni statut, ni date
   triable : on les pose, une fois, pour que l'administration puisse les désigner et que
   les pages puissent trier. Rien d'autre n'est touché. */
async function preparerDonnees() {
  let pose = 0;
  await modifier((D) => {
    for (const a of D.actualites) {
      if (!a.id) { a.id = identifiant('act'); pose++; }
      if (!a.statut) { a.statut = 'publie'; pose++; }
      if (!a.dateIso) { a.dateIso = dateIso(a.date); pose++; }
    }
    for (const d of D.documents) if (!d.id) { d.id = identifiant('doc'); pose++; }
    for (const m of D.observatoire) for (const p of m.publications) if (!p.id) { p.id = identifiant('obs'); pose++; }
    for (const f of D.faq) if (!f.id) { f.id = identifiant('faq'); pose++; }
    for (const c of D.chiffres) if (!c.id) { c.id = identifiant('chi'); pose++; }
    if (!D.pages) { D.pages = {}; pose++; }
    if (!D.reglages) { D.reglages = {}; pose++; }
    if (!D.listes) { D.listes = {}; pose++; }
    return pose;
  }, 'preparation');
  return pose;
}

const serveur = createServer((requete, reponse) => {
  router(requete, reponse).catch((err) => {
    console.error('[erreur]', requete.method, requete.url, '·', err && err.stack);
    if (reponse.headersSent) return reponse.destroy();
    reponse.writeHead(500, { 'content-type': 'text/html; charset=utf-8', ...securite() });
    reponse.end('<!doctype html><meta charset="utf-8"><title>Erreur</title>'
      + '<p style="font:16px/1.6 system-ui;padding:3rem">Une erreur est survenue. '
      + 'L’équipe technique en a été informée.</p>');
  });
});

serveur.headersTimeout = 20000;
serveur.requestTimeout = 60000;

await calculerVersions();
const pose = await preparerDonnees();
serveur.listen(PORT, HOTE, () => {
  console.log(`ARCEP Gabon — http://${HOTE}:${PORT}`);
  console.log(`  site           http://${HOTE}:${PORT}/`);
  console.log(`  données        http://${HOTE}:${PORT}/api`);
  console.log(`  administration http://${HOTE}:${PORT}/admin`);
  if (pose) console.log(`  ${pose} attributs posés sur les contenus repris`);
});

const arreter = () => { serveur.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
process.on('SIGINT', arreter);
process.on('SIGTERM', arreter);
