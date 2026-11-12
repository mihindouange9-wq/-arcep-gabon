// Import des contenus de l'ancien site (arcep.ga) dans donnees/arcep.json et public/assets/ : actualités (corps en HTML
// restreint, images intégrées extraites en fichiers), PDF de la réglementation et de l'observatoire. Les liens vers
// l'ancien site sont remplacés par un champ source, jamais affiché. Les articles de test ou vides sont ignorés et listés.
// Serveur arrêté. node outils/contenu/importer-arcep.mjs [--sans-pdf] [--sans-actus] [--forcer]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nettoyer, decoderEntites } from '../../serveur/html.mjs';
import { dateIso } from '../../serveur/vues/base.mjs';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const FICHIER = join(RACINE, 'donnees', 'arcep.json');
const ACTUS = join(RACINE, 'public', 'assets', 'actus');
const DOCUMENTS = join(RACINE, 'public', 'assets', 'documents');
const SITE = 'https://www.arcep.ga';
const ENTETES = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36', accept: '*/*' };
const SANS_PDF = process.argv.includes('--sans-pdf');
const SANS_ACTUS = process.argv.includes('--sans-actus');

const D = JSON.parse(await readFile(FICHIER, 'utf8'));
await mkdir(ACTUS, { recursive: true });
await mkdir(DOCUMENTS, { recursive: true });
const rapport = { articles: 0, ignores: [], images: 0, pdf: 0, echecs: [] };

// timeout 45 s, deux nouvelles tentatives
const telecharger = async (url, essais = 3) => {
  for (let i = 1; i <= essais; i++) {
    try {
      const r = await fetch(url, { headers: ENTETES, redirect: 'follow', signal: AbortSignal.timeout(45000) });
      if (!r.ok) throw new Error(`réponse ${r.status}`);
      return { octets: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || '' };
    } catch (e) {
      if (i === essais || /réponse 4\d\d/.test(e.message)) throw e;
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
};
const FORCER = process.argv.includes('--forcer');
const enregistrer = () => writeFile(FICHIER, JSON.stringify(D, null, 1), 'utf8');
const page = async (url) => (await telecharger(url)).octets.toString('utf8');
const nomSur = (s) => decoderEntites(String(s)).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'fichier';
const estPdf = (b) => b.subarray(0, 5).toString('latin1') === '%PDF-';
const extensionImage = (b) => (b[0] === 0xff && b[1] === 0xd8) ? '.jpg' : (b[1] === 0x50 && b[2] === 0x4e) ? '.png' : (b.subarray(8, 12).toString('latin1') === 'WEBP') ? '.webp' : (b.subarray(0, 3).toString('latin1') === 'GIF') ? '.gif' : '';

// 1. Actualités
if (!SANS_ACTUS) {
  console.log('\nActualités');
  const identifiants = new Map();   // id → date de la liste (jj/mm/aaaa)
  for (let p = 1; p <= 30; p++) {
    const html = await page(`${SITE}/actualites${p > 1 ? '?page=' + p : ''}`);
    let nouveaux = 0;
    for (const m of html.matchAll(/detail_actu\/(\d+)"[^>]*>\s*(\d{2})\/(\d{2})\/(\d{4})/g)) {
      if (!identifiants.has(m[1])) { identifiants.set(m[1], `${m[4]}-${m[3]}-${m[2]}`); nouveaux++; }
    }
    for (const m of html.matchAll(/detail_actu\/(\d+)/g)) if (!identifiants.has(m[1])) { identifiants.set(m[1], ''); nouveaux++; }
    if (!nouveaux) break;
  }
  console.log(`  ${identifiants.size} articles référencés`);

  const existants = new Map(D.actualites.map((a) => [String(a.id), a]));
  const importes = [];
  for (const [id, dateListe] of identifiants) {
    // déjà importé : conservé, sauf --forcer
    if (!FORCER && existants.get(id)?.corps && existants.get(id)?.source) { importes.push(existants.get(id)); continue; }
    let html;
    try { html = await page(`${SITE}/pages/detail_actu/${id}`); } catch (e) { rapport.echecs.push(`article ${id} : ${e.message}`); continue; }
    const titre = decoderEntites((/class="blog-title">([\s\S]*?)<\/h2>/.exec(html)?.[1] || '').replace(/<[^>]+>/g, '').trim());
    const dateTexte = decoderEntites((/class="blog-meta">[\s\S]*?<\/i>\s*([^<]+)/.exec(html)?.[1] || '').trim());
    const couverture = /class="blog-img" style="background-image:url\(([^)]+)\)/.exec(html)?.[1] || '';
    const bloc = /<div class="text-justify">([\s\S]*?)<\/div>\s*(<p class="text-dark d-flex">|<div class="blog-single-footer|<\/div>\s*<\/div>)/.exec(html)?.[1]
      || /<div class="text-justify">([\s\S]*?)<p class="text-dark d-flex">/.exec(html)?.[1] || '';
    if (!titre || /^test\b/i.test(titre)) { rapport.ignores.push(`${id} · ${titre || 'sans titre'}`); continue; }

    // images base64 -> fichiers
    let n = 0;
    let corps = bloc;
    for (const m of bloc.matchAll(/<img[^>]*src="data:image\/(jpeg|jpg|png|gif|webp);base64,([^"]+)"[^>]*>/gi)) {
      const octets = Buffer.from(m[2], 'base64');
      const ext = extensionImage(octets) || '.' + m[1].replace('jpeg', 'jpg');
      const nom = `${id}-${++n}${ext}`;
      await writeFile(join(ACTUS, nom), octets);
      corps = corps.replace(m[0], `<img src="/assets/actus/${nom}" alt="">`);
      rapport.images++;
    }
    // images distantes rapatriées
    for (const m of corps.matchAll(/<img[^>]*src="(https?:\/\/[^"]+)"[^>]*>/gi)) {
      try {
        const { octets } = await telecharger(decoderEntites(m[1]));
        const ext = extensionImage(octets); if (!ext) continue;
        const nom = `${id}-${++n}${ext}`;
        await writeFile(join(ACTUS, nom), octets);
        corps = corps.replace(m[0], `<img src="/assets/actus/${nom}" alt="">`);
        rapport.images++;
      } catch { corps = corps.replace(m[0], ''); }
    }
    corps = nettoyer(corps)
      // bloc de partage (WhatsApp, Facebook) retiré
      .replace(/<p>\s*<a href="https:\/\/api\.whatsapp\.com[\s\S]*$/i, '')
      .replace(/(<p>|<h[2-4]>)(<strong>)?\s*Partager\s*:?\s*(<\/strong>)?(<\/p>|<\/h[2-4]>)\s*$/i, '')
      .trim();
    const texteSeul = corps.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!texteSeul && !couverture) { rapport.ignores.push(`${id} · ${titre} (vide)`); continue; }

    let image = existants.get(id)?.image || '';
    if (!image && couverture) {
      try {
        const { octets } = await telecharger(decoderEntites(couverture));
        const ext = extensionImage(octets);
        if (ext) { await writeFile(join(ACTUS, `${id}${ext}`), octets); image = `/assets/actus/${id}${ext}`; rapport.images++; }
      } catch (e) { rapport.echecs.push(`visuel ${id} : ${e.message}`); }
    }
    const iso = dateIso(dateTexte) || dateListe || existants.get(id)?.dateIso || '';
    const ancien = existants.get(id) || {};
    const chapeau = ancien.chapeau && ancien.chapeau !== ancien.date ? ancien.chapeau : '';
    importes.push({
      id, titre, date: dateTexte || ancien.date || '', dateIso: iso, image, alt: ancien.alt || '',
      chapeau, corps, rubrique: ancien.rubrique || '', statut: ancien.statut || 'publie', publierLe: ancien.publierLe || '',
      source: `${SITE}/pages/detail_actu/${id}`,
    });
    rapport.articles++;
    process.stdout.write(`  ${id} ${titre.slice(0, 70)}\n`);
    // écriture après chaque article : l'import est reprenable
    const locales = D.actualites.filter((a) => !/^\d+$/.test(String(a.id)));
    const restants = D.actualites.filter((a) => /^\d+$/.test(String(a.id)) && !importes.some((x) => x.id === a.id));
    D.actualites = [...importes, ...restants, ...locales];
    await enregistrer();
  }
  // les actualités créées dans l'administration (act-...) sont conservées
  const locales = D.actualites.filter((a) => !/^\d+$/.test(String(a.id)));
  D.actualites = [...importes, ...locales].sort((x, y) => String(y.dateIso).localeCompare(String(x.dateIso)));
  console.log(`  ${rapport.articles} articles importés · ${rapport.images} images · ${rapport.ignores.length} ignorés`);
}

// 2 et 3. PDF
async function rapatrier(entree, prefixe, dossierNom) {
  const url = decoderEntites(entree.lien || entree.source || '');
  if (!url) return;
  if (entree.fichier && existsSync(join(RACINE, 'public', entree.fichier))) { entree.source = entree.source || url; entree.lien = ''; return; }
  try {
    const { octets } = await telecharger(encodeURI(url).replace(/%25/g, '%'));
    if (!estPdf(octets)) throw new Error('le fichier reçu n’est pas un PDF');
    const nom = `${prefixe}-${nomSur(dossierNom)}-${nomSur(url.split('/').pop().replace(/\.pdf$/i, ''))}.pdf`;
    await writeFile(join(DOCUMENTS, nom), octets);
    entree.fichier = `/assets/documents/${nom}`;
    entree.source = url;
    entree.lien = '';
    rapport.pdf++;
    process.stdout.write(`  ${nom}
`);
    await enregistrer();
  } catch (e) {
    rapport.echecs.push(`${prefixe} « ${entree.titre.slice(0, 50)} » : ${e.message}`);
    entree.source = url;
    entree.lien = '';   // plus aucun renvoi vers l'ancien site, même en cas d'échec
  }
}
if (!SANS_PDF) {
  console.log('\nTextes réglementaires');
  for (const d of D.documents) await rapatrier(d, 'reglementation', d.categorie);
  console.log(`  ${D.documents.filter((d) => d.fichier).length} / ${D.documents.length} avec fichier`);
  console.log('\nObservatoire');
  for (const m of D.observatoire) for (const p of m.publications) await rapatrier(p, 'observatoire', m.cle);
  console.log(`  ${D.observatoire.reduce((n, m) => n + m.publications.filter((p) => p.fichier).length, 0)} / ${D.observatoire.reduce((n, m) => n + m.publications.length, 0)} avec fichier`);
}

// 4. Liens vers l'ancien site
for (const mi of D.missions) { if (mi.lien) { mi.source = mi.lien; mi.lien = ''; } }
for (const c of D.categories) { if (c.lien) { c.source = c.lien; c.lien = ''; } }
for (const p of D.partenaires) { if (/arcep\.ga/.test(p.lien || '')) { p.source = p.lien; p.lien = ''; } }

await writeFile(FICHIER, JSON.stringify(D, null, 1), 'utf8');
console.log(`\nDocument écrit : donnees/arcep.json`);
if (rapport.ignores.length) console.log(`\nArticles ignorés (${rapport.ignores.length}) :\n  ` + rapport.ignores.join('\n  '));
if (rapport.echecs.length) console.log(`\nÉchecs (${rapport.echecs.length}) :\n  ` + rapport.echecs.join('\n  '));
console.log('');
