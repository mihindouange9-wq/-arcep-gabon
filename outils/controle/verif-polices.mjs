// Vérifie que chaque caractère publié sur les pages listées tombe dans les plages unicode-range de polices.css.
// Serveur lancé. node outils/controle/verif-polices.mjs [base]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const BASE = process.argv[2] && process.argv[2].startsWith('http') ? process.argv[2] : 'http://127.0.0.1:4310';

const PAGES = ['/', '/autorite', '/missions', '/observatoire', '/reglementation',
  '/actualites', '/consommateurs', '/page-inexistante', '/admin'];

// les plages livrées
const feuille = readFileSync(join(RACINE, 'public', 'css', 'polices.css'), 'utf8');

const plagesParFamille = new Map();
for (const bloc of feuille.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
  const famille = /font-family:\s*"([^"]+)"/.exec(bloc[1])?.[1];
  const brut = /unicode-range:\s*([^;]+)/.exec(bloc[1])?.[1];
  if (!famille || !brut) continue;
  const plages = plagesParFamille.get(famille) || [];
  for (const entree of brut.split(',')) {
    const m = /U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/.exec(entree.trim());
    if (!m) continue;
    const debut = parseInt(m[1], 16);
    plages.push([debut, m[2] ? parseInt(m[2], 16) : debut]);
  }
  plagesParFamille.set(famille, plages);
}

const couvert = (plages, code) => plages.some(([a, b]) => code >= a && code <= b);

// le texte réellement publié
const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

function texteVisible(html) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (tout, nom) => ENTITES[nom] ?? tout);
}

// déroulé
const familles = [...plagesParFamille.keys()];
console.log(`\nPolices livrées : ${familles.join(', ')}`);
for (const [famille, plages] of plagesParFamille) {
  console.log(`  ${famille.padEnd(16)} ${plages.length} plages`);
}

const manquants = new Map();   // caractère -> familles qui ne le couvrent pas
let caracteres = 0;

for (const chemin of PAGES) {
  const html = await (await fetch(BASE + chemin)).text();
  const vus = new Set(texteVisible(html));
  caracteres += vus.size;
  for (const caractere of vus) {
    const code = caractere.codePointAt(0);
    if (code < 32) continue;                       // retours à la ligne, tabulations
    for (const [famille, plages] of plagesParFamille) {
      if (couvert(plages, code)) continue;
      const cle = `${caractere} (U+${code.toString(16).toUpperCase().padStart(4, '0')})`;
      const liste = manquants.get(cle) || new Set();
      liste.add(famille);
      manquants.set(cle, liste);
    }
  }
}

console.log(`\n${PAGES.length} pages parcourues`);
if (!manquants.size) {
  console.log('  ✓ chaque caractère publié est couvert par les trois familles\n');
} else {
  console.log(`  ✗ ${manquants.size} caractère(s) hors des plages livrées :`);
  for (const [caractere, familles2] of manquants) {
    console.log(`     ${caractere}  absent de : ${[...familles2].join(', ')}`);
  }
  console.log('');
  process.exitCode = 1;
}
