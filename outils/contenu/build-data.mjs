// Extrait les données de l'ancien site (recherche/html/*.html) vers recherche/extrait.json : réglementation, observatoire, actualités, FAQ.
// node outils/contenu/build-data.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const lire = (n) => (existsSync(`recherche/html/${n}.html`) ? readFileSync(`recherche/html/${n}.html`, 'utf8') : '');
const decode = (s) => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&#039;|&rsquo;|&lsquo;/g, '’').replace(/&amp;/g, '&').replace(/&quot;|&laquo;|&raquo;/g, '"')
  .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É').replace(/&egrave;/g, 'è').replace(/&ecirc;/g, 'ê').replace(/&euml;/g, 'ë')
  .replace(/&agrave;/g, 'à').replace(/&Agrave;/g, 'À').replace(/&acirc;/g, 'â').replace(/&ccedil;/g, 'ç').replace(/&ocirc;/g, 'ô')
  .replace(/&ugrave;/g, 'ù').replace(/&ucirc;/g, 'û').replace(/&icirc;/g, 'î').replace(/&iuml;/g, 'ï').replace(/&oelig;/g, 'œ')
  .replace(/&#\d+;/g, ' ')
  .replace(/\s+/g, ' ').trim();

// Réglementation : titre, année, lien du document
const CATS = [
  ['lois', 'Lois', 'reg1'], ['ordonnances', 'Ordonnances', 'reg2'], ['decrets', 'Décrets', 'reg3'],
  ['arretes', 'Arrêtés', 'reg4'], ['deliberations', 'Délibérations', 'reg5'], ['decisions', 'Décisions', 'reg6'],
  ['baremes', 'Barèmes', 'reg7'], ['formulaires', 'Formulaires', 'reg8'], ['homologations', 'Équipements homologués', 'reg9'],
];
const documents = [];
for (const [cle, nom, fichier] of CATS) {
  const html = lire(fichier);
  const vus = new Set();
  // le tableau du bas contient l'année puis le titre puis les liens
  const lignes = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  for (const l of lignes) {
    const cellules = [...l.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (!cellules.length) continue;
    const annee = decode((l.match(/<th[^>]*>([\s\S]*?)<\/th>/i) || [])[1] || '').match(/\b(19|20)\d{2}\b/)?.[0] || '';
    const titre = decode(cellules[0]);
    const lien = (l.match(/href="([^"]+\.pdf)"/i) || [])[1] || '';
    if (!titre || titre.length < 6 || vus.has(titre)) continue;
    vus.add(titre);
    documents.push({ categorie: cle, nom, annee, titre, lien });
  }
  if (!vus.size) { // repli : cartes sans tableau
    for (const m of html.matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>([\s\S]{0,400}?)href="([^"]+\.pdf)"/gi)) {
      const titre = decode(m[1]);
      if (!titre || vus.has(titre)) continue;
      vus.add(titre);
      documents.push({ categorie: cle, nom, annee: titre.match(/\b(19|20)\d{2}\b/)?.[0] || '', titre, lien: m[3] });
    }
  }
}

// Observatoire : tableaux de bord par marché
const OBS = [['internet', 'Internet', 'obs1'], ['fixe', 'Fixe', 'obs2'], ['mobile', 'Mobile', 'obs3']];
const observatoire = OBS.map(([cle, nom, fichier]) => {
  const html = lire(fichier);
  const vus = new Map();
  for (const m of html.matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>([\s\S]{0,600}?)href="([^"]+\.pdf)"/gi)) {
    const titre = decode(m[1]);
    if (titre && !vus.has(titre)) vus.set(titre, m[3]);
  }
  const publications = [...vus.entries()].map(([titre, lien]) => ({ titre, lien })).slice(0, 12);
  return { cle, nom, publications };
});

// Actualités : date, titre, lien, chapeau
const actualites = [];
{
  const html = lire('actualites');
  const cartes = html.split('<div class="th-blog blog-card').slice(1);
  for (const carte of cartes) {
    const lien = carte.match(/href="(https:\/\/www\.arcep\.ga\/pages\/detail_actu\/(\d+))"/i) || [];
    const titre = decode((carte.match(/<h5 class="blog-title"><a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || '');
    const date = decode((carte.match(/<div class="blog-meta">([\s\S]*?)<\/div>/i) || [])[1] || '');
    const img = (carte.match(/background-image: url\(([^)]+)\)/i) || [])[1] || '';
    if (!titre || !lien[1]) continue;
    actualites.push({ id: lien[2], titre, date, lien: lien[1], image: img ? (img.startsWith('http') ? img : 'https://www.arcep.ga/' + img.replace(/^\//, '')) : '' });
  }
}
for (const a of actualites) {
  const html = lire('actu' + a.id);
  if (!html) continue;
  const corps = decode((html.match(/<div class="blog-content"[\s\S]*?<\/div>/i) || [])[0] || '');
  const texte = corps || decode((html.match(/<p>([\s\S]{80,1200}?)<\/p>/i) || [])[1] || '');
  a.chapeau = texte.slice(0, 420);
  const trouve = (html.match(/uploads\/actus\/[^"')\s]+/i) || [])[0];
  if (trouve && !a.image) a.image = 'https://www.arcep.ga/' + trouve;
}

// Foire aux questions
const faq = [];
{
  const html = lire('faqs');
  const blocs = [...html.matchAll(/<div class="accordion-header"[\s\S]*?<button[^>]*>([\s\S]*?)<\/button>[\s\S]*?<div class="accordion-body"[^>]*>([\s\S]*?)<\/div>/gi)];
  for (const b of blocs) {
    const q = decode(b[1]), r = decode(b[2]);
    if (q && r && q.length > 6) faq.push({ q, r });
  }
  if (!faq.length) {
    const t = decode(lire('faqs').replace(/[\s\S]*Foire aux questions/i, ''));
    const parts = t.split(/(?=Qu[’']est-ce|Quelle|Comment|Pourquoi|Que faire)/).map((s) => s.trim()).filter((s) => s.length > 40);
    for (const p of parts.slice(0, 14)) { const i = p.indexOf('?'); if (i > 0) faq.push({ q: p.slice(0, i + 1), r: p.slice(i + 1).trim().slice(0, 700) }); }
  }
}

const data = {
  documents,
  observatoire,
  actualites: actualites.slice(0, 9),
  faq: faq.slice(0, 12),
};
const stats = `documents ${documents.length} · observatoire ${observatoire.map((o) => o.publications.length).join('/')} · actualités ${data.actualites.length} · faq ${data.faq.length}`;
writeFileSync('recherche/extrait.json', JSON.stringify(data, null, 1));
console.log(stats);
