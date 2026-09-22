/* Typographie française : espace fine insécable avant ? ! et à l'intérieur des guillemets.
   S'applique aux chaînes de texte de donnees/arcep.json, jamais aux liens ni aux images.
   node outils/contenu/typographie.mjs */
import { lireDonnees, ecrireDonnees } from './donnees.mjs';

const FINE = ' ';

/* L'aspiration du site officiel a perdu les apostrophes d'élision : « L ARCEP c est »,
   « qu avec », « l HSPA+ ». On les rétablit — c'est un défaut d'extraction, pas le texte de
   l'Autorité. La règle est sûre : en français, aucune de ces lettres n'est un mot à elle
   seule, la substitution ne peut donc pas abîmer une phrase correcte. */
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
