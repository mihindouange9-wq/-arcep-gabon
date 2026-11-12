// Typographie française sur les chaînes de donnees/arcep.json : espace fine insécable avant ? et ! et dans les guillemets.
// Jamais sur les liens ni les images. node outils/contenu/typographie.mjs
import { lireDonnees, ecrireDonnees } from './donnees.mjs';

const FINE = ' ';

// L'extraction a perdu les apostrophes d'élision ("L ARCEP c est", "qu avec") : on les rétablit.
// Aucune de ces lettres n'est un mot seul en français, la substitution ne peut pas abîmer une phrase correcte.
const ELISION = /(^|[^\p{L}\p{N}’'-])(l|d|n|s|c|j|t|m|qu|jusqu|lorsqu|puisqu|quoiqu) (?=[aeiouyœæàâäéèêëîïôöùûüh])/giu;
const typo = (s) => s
  .replace(ELISION, '$1$2’')
  .replace(/[\s  ]*([?!])/g, FINE + '$1')
  .replace(/«[\s  ]*/g, '«' + FINE)
  .replace(/[\s  ]*»/g, FINE + '»');

const IGNORE = new Set(['lien', 'image', 'cle', 'categorie', 'num', 'annee']);
const parcourir = (v, cle) => {
  if (typeof v === 'string') return IGNORE.has(cle) || /^https?:|^\/?assets\//.test(v) ? v : typo(v);
  if (Array.isArray(v)) return v.map((x) => parcourir(x, cle));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, parcourir(x, k)]));
  return v;
};

const data = lireDonnees();
const avant = JSON.stringify(data);
const apres = parcourir(data, '');
ecrireDonnees(apres);
const n = (JSON.stringify(apres).match(/ /g) || []).length - (avant.match(/ /g) || []).length;
const elisions = (JSON.stringify(apres).match(/’/g) || []).length - (avant.match(/’/g) || []).length;
console.log('espaces fines ajoutées :', n, '· apostrophes d’élision rétablies :', elisions);
