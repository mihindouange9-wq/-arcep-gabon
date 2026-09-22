/* ARCEP Gabon — socle des pages publiques.
   Tout ce qui sort d'ici est échappé : les contenus peuvent être modifiés depuis
   l'administration, ils sont donc traités comme des entrées non fiables. */
import { reglages as lireReglages } from '../schema.mjs';

/* ======================= ÉCHAPPEMENT ======================= */
export const e = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* Seuls http, https, mailto, tel et les chemins relatifs sont acceptés dans un href. */
const PROTOCOLES = /^(https?:|mailto:|tel:)/i;
export const lien = (u) => {
  const v = String(u == null ? '' : u).trim();
  if (!v) return '';
  if (PROTOCOLES.test(v)) return e(v);
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('//') || /[\u0000-\u001f]/.test(v)) return '';
  return e(v);
};

/* Un texte long saisi dans l'administration : les lignes vides séparent les paragraphes. */
export const paragraphes = (texte, classe = '') =>
  String(texte || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p${classe ? ` class="${classe}"` : ''}>${e(p).replace(/\n/g, '<br>')}</p>`).join('');

/* ======================= VERSIONS DES FICHIERS ======================= */
/* Le serveur pose ici l'empreinte de chaque feuille et de chaque script au démarrage :
   l'adresse change quand le contenu change, et le fichier peut être mis en cache un an. */
let VERSIONS = {};
export const poserVersions = (v) => { VERSIONS = v; };
export const ressource = (chemin) => VERSIONS[chemin] ? `${chemin}?v=${VERSIONS[chemin]}` : chemin;

/* ======================= NAVIGATION ======================= */
export const RUBRIQUES = [
  { cle: 'autorite', nom: 'L’ARCEP', chemin: '/autorite', tenue: 'Statut, Conseil de Régulation, organisation, mot du Président.', scene: 'vert-bleu' },
  { cle: 'missions', nom: 'Missions', chemin: '/missions', tenue: 'Les cinq missions confiées à l’Autorité par les textes.', scene: 'bleu' },
  { cle: 'reglementation', nom: 'Réglementation', chemin: '/reglementation', tenue: 'Lois, décrets, arrêtés, délibérations, décisions.', scene: 'bleu-or' },
  { cle: 'observatoire', nom: 'Observatoire', chemin: '/observatoire', tenue: 'Tableaux de bord trimestriels des marchés.', scene: 'electrique' },
  { cle: 'actualites', nom: 'Actualités', chemin: '/actualites', tenue: 'Communications et participations de l’Autorité.', scene: 'graphite' },
  { cle: 'consommateurs', nom: 'Consommateurs', chemin: '/consommateurs', tenue: 'Vos droits, vos démarches, le numéro 1331.', scene: 'vert-bleu' },
  { cle: 'contact', nom: 'Contact', chemin: '/contact', tenue: 'Écrire à l’Autorité, la joindre, la trouver.', scene: 'graphite' },
];
export const rubriqueDe = (cle) => RUBRIQUES.find((r) => r.cle === cle) || null;

/* ======================= ICÔNES ======================= */
/* Un seul trait, une seule graisse : les symboles sont déclarés une fois et référencés
   par <use>. */
const ICONES = {
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  diag: '<path d="M7 17 17 7M8 7h9v9"/>',
  bas: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  telecharger: '<path d="M12 4v11M7 10l5 5 5-5M4 19h16"/>',
  externe: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  telephone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  courriel: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lieu: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  document: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  lecture: '<path d="M8 6v12l10-6Z"/>',
  onde: '<path d="M3 12h3l2-6 3 12 3-9 2 5 2-2h3"/>',
  reseau: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="m7 11 10-4M7 13l10 4"/>',
  bouclier: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
};
export const icone = (nom, classe = 'icone') => `<svg class="${classe}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;
const symboles = () => `<svg hidden aria-hidden="true">${Object.entries(ICONES).map(([n, d]) =>
  `<symbol id="i-${n}" viewBox="0 0 24 24">${d}</symbol>`).join('')}</svg>`;

/* ======================= LE SOCLE ======================= */
/* ecran : la page est rendue à l'intérieur de l'iPhone de l'accueil. Le rendu est le même,
   mais sans curseur, sans défilement lissé, sans séquence lourde, et les liens gardent
   le mode d'un clic à l'autre. */
export function socle({ D, titre, description, cle = '', corps, scene = 'foret', tonalite = 'sombre',
  chemin = '/', image = '', jsonld = null, ecran = false, canonique = '' }) {
  const R = lireReglages(D);
  const I = D.institution;
  const rubrique = rubriqueDe(cle);
  const titreComplet = cle ? `${titre} — ${R.titreSite}` : `${R.titreSite} — ${titre}`;
  const visuel = image || R.imagePartage;
  const base = R.adressePublique ? R.adressePublique.replace(/\/+$/, '') : '';
  const url = base + chemin;

  return `<!doctype html>
<html lang="fr"${ecran ? ' data-ecran="1"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(titreComplet)}</title>
<meta name="description" content="${e(description)}">
<meta name="robots" content="${R.indexation ? 'index, follow' : 'noindex, nofollow'}">
<meta name="theme-color" content="#0a2a1a">
${canonique || base ? `<link rel="canonical" href="${e(canonique || url)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${e(R.titreSite)}">
<meta property="og:title" content="${e(titreComplet)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:locale" content="fr_GA">
${url ? `<meta property="og:url" content="${e(url)}">` : ''}
${visuel ? `<meta property="og:image" content="${e(base + visuel)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(titreComplet)}">
<meta name="twitter:description" content="${e(description)}">
${visuel ? `<meta name="twitter:image" content="${e(base + visuel)}">` : ''}
<link rel="icon" type="image/png" href="/assets/icone-arcep.png">
<link rel="apple-touch-icon" href="/assets/icone-arcep.png">
<link rel="preload" href="/assets/polices/archivo-latin-100-900.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ressource('/css/polices.css')}">
<link rel="stylesheet" href="${ressource('/css/systeme.css')}">
<link rel="stylesheet" href="${ressource('/css/site.css')}">
<script src="${ressource('/js/avant.js')}"></script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body data-page="${e(cle || 'accueil')}">
${symboles()}
<a class="evitement" href="#contenu">Aller au contenu</a>
<div class="voile" aria-hidden="true"></div>
<div class="curseur" aria-hidden="true" data-ton="sombre"><span class="curseur-point"></span><span class="curseur-anneau"></span><span class="curseur-mot"></span></div>

<header class="chrome" id="chrome" data-etat="${tonalite}" data-defile="0">
  <span class="chrome-progression" aria-hidden="true"></span>
  <a class="marque" href="/" aria-label="ARCEP Gabon, accueil">
    <img class="marque-blanc" src="/assets/logo-arcep-blanc.png" alt="" width="1056" height="466">
    <img class="marque-couleur" src="/assets/logo-arcep.png" alt="ARCEP Gabon" width="1056" height="466">
  </a>
  <nav class="chrome-nav" aria-label="Navigation principale">
    ${RUBRIQUES.map((r) => `<a href="${r.chemin}"${r.cle === cle ? ' aria-current="page"' : ''}>${e(r.nom)}</a>`).join('')}
  </nav>
  <button class="chrome-menu" type="button" aria-expanded="false" aria-controls="menu">
    <span>Menu</span><i aria-hidden="true"></i>
  </button>
</header>

<div class="menu" id="menu" hidden>
  <div class="menu-fond" aria-hidden="true"><span class="lueur"></span><span class="lueur lueur--2"></span><span class="trame"></span></div>
  <div class="menu-corps">
    <nav class="menu-liste" aria-label="Rubriques">
      <a href="/"${!cle ? ' aria-current="page"' : ''}><span class="nom">Accueil</span><span class="tenue">Le site en une page.</span></a>
      ${RUBRIQUES.map((r) => `<a href="${r.chemin}"${r.cle === cle ? ' aria-current="page"' : ''}><span class="nom">${e(r.nom)}</span><span class="tenue">${e(r.tenue)}</span></a>`).join('')}
    </nav>
    <div class="menu-cote">
      <div>
        <h2>Accès directs</h2>
        <ul>
          <li><a href="/consommateurs#faq">Questions fréquentes</a></li>
          <li><a href="/reglementation?categorie=formulaires">Formulaires</a></li>
          <li><a href="/reglementation?categorie=homologations">Équipements homologués</a></li>
          <li><a href="/api">Interface de données</a></li>
        </ul>
      </div>
      <div>
        <h2>Nous joindre</h2>
        <address>
          ${e(I.adresse)}<br>
          ${I.telephones.map((t) => `<a href="tel:${e(t.replace(/[^\d+]/g, ''))}">${e(t)}</a>`).join(' · ')}<br>
          <a href="mailto:${e(I.email)}">${e(I.email)}</a><br>
          Consommateurs : <a href="tel:${e(I.numeroCourt)}">${e(I.numeroCourt)}</a>
        </address>
      </div>
    </div>
    <p class="menu-pied"><span>République gabonaise</span><span>${e(I.nom)}</span></p>
  </div>
</div>

<main id="contenu">
${corps}
</main>

${pied(D, R)}

${ecran ? '' : `<script defer src="${ressource('/js/vendor/gsap.min.js')}"></script>
<script defer src="${ressource('/js/vendor/ScrollTrigger.min.js')}"></script>
<script defer src="${ressource('/js/vendor/SplitText.min.js')}"></script>
<script defer src="${ressource('/js/vendor/lenis.min.js')}"></script>`}
<script type="module" src="${ressource(ecran ? '/js/ecran.js' : '/js/site.js')}"></script>
</body>
</html>
`;
}

/* ======================= LE PIED ======================= */
function pied(D, R) {
  const I = D.institution;
  const annee = new Date().getFullYear();
  return `<footer class="pied" id="pied">
  <span class="trame" aria-hidden="true"></span><span class="lueur" aria-hidden="true"></span>
  <div class="cadre">
    <p class="pied-signature" aria-hidden="true" data-signature><span>ARCEP</span> <span class="accent">Gabon</span></p>
    <div class="pied-grille">
      <div class="pied-marque">
        <img src="/assets/logo-arcep-blanc.png" alt="ARCEP Gabon" width="1056" height="466">
        <p>${e(I.nom)} de la République gabonaise. ${e(I.statut)}.</p>
        ${D.partenaires?.length ? `<div class="pied-partenaires" aria-label="Organisations partenaires">${D.partenaires.map((p) =>
          p.lien ? `<a href="${lien(p.lien)}" target="_blank" rel="noopener" title="${e(p.nom)}">${e(p.sigle)}</a>` : `<span title="${e(p.nom)}">${e(p.sigle)}</span>`).join('')}</div>` : ''}
      </div>
      <div>
        <h2>Rubriques</h2>
        <ul>${RUBRIQUES.map((r) => `<li><a href="${r.chemin}">${e(r.nom)}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h2>Accès directs</h2>
        <ul>
          <li><a href="/consommateurs#faq">Questions fréquentes</a></li>
          <li><a href="/reglementation?categorie=formulaires">Formulaires</a></li>
          <li><a href="/observatoire">Tableaux de bord</a></li>
          <li><a href="/api">Interface de données</a></li>
          <li><a href="https://www.arcep.ga/" target="_blank" rel="noopener">Site officiel arcep.ga</a></li>
        </ul>
      </div>
      <div>
        <h2>Contact</h2>
        <ul>
          <li>${e(I.adresse)}</li>
          ${I.telephones.map((t) => `<li><a href="tel:${e(t.replace(/[^\d+]/g, ''))}">${e(t)}</a></li>`).join('')}
          <li><a href="mailto:${e(I.email)}">${e(I.email)}</a></li>
          <li>Numéro consommateurs : <a href="tel:${e(I.numeroCourt)}">${e(I.numeroCourt)}</a></li>
        </ul>
        ${R.reseaux?.length ? `<h2 style="margin-top:1.4rem">Réseaux officiels</h2><ul>${R.reseaux.map((s) =>
          `<li><a href="${lien(s.lien)}" target="_blank" rel="noopener">${e(s.nom)}</a></li>`).join('')}</ul>` : ''}
      </div>
    </div>
    <p class="pied-bas">
      <span>© ${annee} ARCEP Gabon — Tous droits réservés</span>
      <span><a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a></span>
      ${R.mentionPied ? `<span>${e(R.mentionPied)}</span>` : ''}
    </p>
  </div>
</footer>`;
}

/* ======================= FRAGMENTS PARTAGÉS ======================= */
/* L'en-tête d'une page intérieure : un titre, une phrase, une scène. */
export function entete({ titre, chapo, scene = 'vert-bleu', complement = '' }) {
  return `<section class="entete section" data-scene="${e(scene)}" data-tonalite="sombre">
  <span class="trame" aria-hidden="true"></span>
  <span class="lueur entete-lueur" aria-hidden="true" data-parallaxe="-0.15"></span>
  <span class="lueur lueur--2 entete-lueur-2" aria-hidden="true" data-parallaxe="0.1"></span>
  <div class="cadre entete-cadre">
    <h1 class="titre-1" data-reveler="lignes">${e(titre)}</h1>
    ${chapo ? `<p class="chapo" data-reveler>${e(chapo)}</p>` : ''}
    ${complement}
  </div>
</section>`;
}

export function sectionTete({ titre, chapo, action = '', niveau = 2, classe = '' }) {
  return `<div class="section-tete${action ? ' section-tete--ligne' : ''}${classe ? ' ' + classe : ''}">
  <div>
    <h${niveau} class="titre-2" data-reveler="lignes">${e(titre)}</h${niveau}>
    ${chapo ? `<p class="chapo" data-reveler>${e(chapo)}</p>` : ''}
  </div>
  ${action ? `<div data-reveler>${action}</div>` : ''}
</div>`;
}

export const couture = (vers) => `<div class="couture" aria-hidden="true" style="--vers:${vers}"></div>`;

/* Une date française ("vendredi 21 août 2026") vers ISO, pour trier et pour les métadonnées. */
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export function dateIso(texte) {
  const m = /(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i.exec(String(texte || '').toLowerCase());
  if (!m) return '';
  const mois = MOIS.indexOf(m[2]);
  if (mois < 0) return '';
  return `${m[3]}-${String(mois + 1).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}
export function dateLisible(iso) {
  if (!iso) return '';
  const [a, m, j] = iso.split('-').map(Number);
  if (!a || !m || !j) return '';
  return `${j} ${MOIS[m - 1]} ${a}`;
}

/* Les actualités visibles du public : publiées, et dont la date de publication est passée. */
export function actualitesPubliees(D, maintenant = new Date()) {
  const now = maintenant.toISOString().slice(0, 10);
  return D.actualites
    .filter((a) => (a.statut || 'publie') === 'publie' && (!a.publierLe || a.publierLe <= now))
    .slice()
    .sort((x, y) => (y.dateIso || dateIso(y.date)).localeCompare(x.dateIso || dateIso(x.date)));
}

export function visuelActualite(a, classe = '', charge = 'lazy') {
  if (!a.image) return `<span class="visuel visuel--vide ${classe}" aria-hidden="true"><span class="visuel-interieur"></span></span>`;
  return `<span class="visuel ${classe}" data-reveler="masque"><img src="${lien(a.image)}" alt="${e(a.alt || '')}" loading="${charge}" decoding="async"></span>`;
}
