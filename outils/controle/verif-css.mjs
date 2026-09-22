/* ARCEP Gabon — hygiène des feuilles de style.

   Deux contrôles, tous deux statiques :
     1. les classes déclarées dans public/css/ que plus aucune vue ni aucun script
        n'emploie — du poids mort après chaque remaniement ;
     2. les variables déclarées dans :root que plus aucune règle ne consomme.

   node outils/controle/verif-css.mjs

   La lecture des sources est volontairement littérale : on cherche le nom de classe dans
   le code des vues. Une classe composée à l'exécution échapperait au contrôle ; elles sont
   donc listées ci-dessous, à la main, avec la raison. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* polices.css est volontairement hors périmètre : il ne déclare ni classe ni variable, et
   les « .woff2 » de ses url() seraient relevés comme des classes orphelines. */
const FEUILLES = ['public/css/systeme.css', 'public/css/site.css', 'public/css/admin.css'];

/* Les sources qui peuvent nommer une classe : les vues rendues par le serveur et les
   scripts du navigateur. */
const fichiers = (d) => readdirSync(d).map((f) => join(d, f)).filter((f) => statSync(f).isFile());
const SOURCES = [...fichiers('serveur/vues'), 'serveur/schema.mjs', ...fichiers('public/js'), ...fichiers('public/js/modules')];

/* Classes posées à l'exécution ou produites par le découpage des titres : elles
   n'apparaissent pas telles quelles dans les sources. */
const POSEES = new Map([
  ['vu', 'posée à l’entrée dans le champ par revelations.mjs et donnees.mjs'],
  ['pret', 'posée par revelations.mjs et hero.mjs une fois les états de départ appliqués'],
  ['ligne', 'créée par le découpage des titres (SplitText, linesClass)'],
  ['curseur-actif', 'posée sur html par curseur.mjs'],
  ['menu-ouvert', 'posée sur body par menu.mjs'],
  ['voile--sortie', 'posée au départ vers une autre page'],
  ['mots--statique', 'posée par mots.mjs au doigt ou en mouvement réduit'],
  ['mots--cinema', 'posée par mots.mjs sur bureau'],
  ['ecran--cinema', 'posée par ecran.mjs sur bureau'],
  ['ecran--clair', 'posée par ecran.mjs dans la phase claire'],
  ['iphone--libre', 'réservée : rend l’écran interactif'],
  ['lateral--ouvert', 'posée par admin.js sur petit écran'],
  ['lenis', 'posées sur html par Lenis'],
  ['lenis-smooth', 'posées sur html par Lenis'],
  ['lenis-stopped', 'posées sur html par Lenis'],
  ['onde', 'passée en argument à onde() dans vues/graphiques.mjs'],
  ['mots-onde', 'variante d’onde, passée en argument'],
  ['article-visuel', 'passée en argument à visuelActualite()'],
  ['visuel-interieur', 'rendue par visuelActualite() pour un article sans visuel'],
  ['connecte', 'posée sur body de l’administration'],
  ['pastille--programme', 'composée à partir de l’état de l’actualité dans vues/admin.mjs'],
  ['pastille--publie', 'composée à partir de l’état de l’actualité dans vues/admin.mjs'],
  ['pastille--brouillon', 'composée à partir de l’état de l’actualité dans vues/admin.mjs'],
  ['css', 'faux positif : les url() des dégradés SVG en ligne'],
  ['org', 'faux positif : les url() des dégradés SVG en ligne'],
  ['w3', 'faux positif : les url() des dégradés SVG en ligne'],
  ['entree', 'posée sur body de l’écran de connexion'],
]);

const source = SOURCES.map((f) => readFileSync(f, 'utf8')).join('\n');
const css = FEUILLES.map((f) => readFileSync(f, 'utf8')).join('\n');

/* ---------- 1. classes orphelines ---------- */
const classes = new Set();
for (const trouve of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes.add(trouve[1]);

/* On ne cherche pas le nom n'importe où dans la source : on relève les jetons réellement
   posés dans un attribut class, puis ceux manipulés par les scripts. Sans cela, « page »
   serait déclaré employé parce que le mot apparaît dans un commentaire. */
const employesParLesVues = new Set();
for (const attribut of source.matchAll(/class="([^"]*)"/g)) {
  for (const jeton of attribut[1].split(/[\s${}`'"()]+/)) if (jeton) employesParLesVues.add(jeton);
}
for (const litteral of source.matchAll(/(?:classList\.(?:add|remove|toggle|contains)|querySelector(?:All)?|closest)\(\s*['"`]([^'"`]+)/g)) {
  for (const jeton of litteral[1].split(/[\s.,>:[\]]+/)) if (jeton) employesParLesVues.add(jeton);
}

const orphelines = [...classes]
  .filter((c) => !POSEES.has(c) && !employesParLesVues.has(c))
  .sort();

/* ---------- 2. variables orphelines ---------- */
const declarees = new Set();
for (const trouve of css.matchAll(/^\s*(--[\w-]+)\s*:/gm)) declarees.add(trouve[1]);
const employees = new Set();
for (const trouve of css.matchAll(/var\(\s*(--[\w-]+)/g)) employees.add(trouve[1]);
const jetonsOrphelins = [...declarees].filter((v) => !employees.has(v)).sort();

/* ---------- rapport ---------- */
let anomalies = 0;

console.log('\nClasses déclarées : ' + classes.size);
if (orphelines.length) {
  anomalies += orphelines.length;
  console.log('  ✗ sans emploi dans les vues ni les scripts :');
  for (const c of orphelines) console.log('     .' + c);
} else console.log('  ✓ toutes employées');

console.log('\nVariables déclarées : ' + declarees.size);
if (jetonsOrphelins.length) {
  anomalies += jetonsOrphelins.length;
  console.log('  ✗ jamais consommées :');
  for (const v of jetonsOrphelins) console.log('     ' + v);
} else console.log('  ✓ toutes consommées');

console.log('');
if (anomalies) process.exitCode = 1;
