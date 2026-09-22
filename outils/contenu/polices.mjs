/* ARCEP Gabon — auto-hébergement des caractères.

   Le site n'appelle plus fonts.googleapis.com : les trois familles de la charte sont
   téléchargées ici, une fois, dans public/assets/polices/, et déclarées par
   public/css/polices.css. Trois raisons, dans l'ordre d'importance pour l'Autorité :

     — la page ne dépend plus d'un service tiers pour être lisible. Sur une liaison lente
       ou filtrée, le texte s'affiche dans la bonne fonte, pas dans une approximation ;
     — la politique de sécurité du contenu se referme sur « self » : plus aucun domaine
       extérieur n'est autorisé, ni pour la feuille de style, ni pour les fichiers ;
     — aucune requête du visiteur ne part vers un tiers.

   node outils/contenu/polices.mjs

   Piège vérifié : ne garder que le sous-ensemble « latin » laisse tomber des caractères
   que le français emploie (œ, Œ, les capitales accentuées de certains textes officiels).
   On prend donc latin ET latin-ext, et outils/controle/verif-polices.mjs contrôle ensuite
   que chaque caractère réellement publié tombe dans une plage livrée. */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const DOSSIER = join(RACINE, 'public', 'assets', 'polices');
const FEUILLE = join(RACINE, 'public', 'css', 'polices.css');

/* Un navigateur récent obtient le woff2 et les fontes variables ; un agent inconnu
   recevrait du truetype, quatre fois plus lourd. */
const AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/131.0 Safari/537.36';

/* Les graisses demandées sont exactement celles que les feuilles emploient : Archivo en
   variable (graisse 100 à 900, chasse 62 à 125 %) pour tout le sans-serif, Source Serif 4
   en romain et italique pour la prose, IBM Plex Mono en deux graisses pour les données. */
const FAMILLES = [
  { nom: 'Archivo', fichier: 'archivo', spec: 'Archivo:wdth,wght@62..125,100..900' },
  { nom: 'Source Serif 4', fichier: 'source-serif-4', spec: 'Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400' },
  { nom: 'IBM Plex Mono', fichier: 'ibm-plex-mono', spec: 'IBM+Plex+Mono:wght@400;500' },
];

const SOUS_ENSEMBLES = new Set(['latin', 'latin-ext']);

await mkdir(DOSSIER, { recursive: true });

const regles = [];
let total = 0;

for (const famille of FAMILLES) {
  const adresse = `https://fonts.googleapis.com/css2?family=${famille.spec}&display=swap`;
  const reponse = await fetch(adresse, { headers: { 'User-Agent': AGENT } });
  if (!reponse.ok) throw new Error(`${famille.nom} : réponse ${reponse.status}`);
  const css = await reponse.text();

  let n = 0;
  for (const bloc of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const [, sousEnsemble, corps] = bloc;
    if (!SOUS_ENSEMBLES.has(sousEnsemble)) continue;

    const url = /url\((https:[^)]+\.woff2)\)/.exec(corps)?.[1];
    const graisse = /font-weight:\s*([^;]+)/.exec(corps)?.[1].trim();
    const style = /font-style:s*([^;]+)/.exec(corps)?.[1].trim() || 'normal';
    const chasse = /font-stretch:s*([^;]+)/.exec(corps)?.[1].trim() || '';
    const plage = /unicode-range:\s*([^;]+)/.exec(corps)?.[1].trim();
    if (!url || !graisse || !plage) continue;

    const octets = Buffer.from(await (await fetch(url)).arrayBuffer());
    const nom = `${famille.fichier}-${sousEnsemble}-${graisse.replace(/\s+/g, '-')}${style === 'italic' ? '-italique' : ''}.woff2`;
    await writeFile(join(DOSSIER, nom), octets);
    total += octets.length;
    n += 1;

    regles.push(`@font-face {
  font-family: "${famille.nom}";
  src: url("/assets/polices/${nom}") format("woff2");
  font-weight: ${graisse};
  font-style: ${style};${chasse ? `
  font-stretch: ${chasse};` : ''}
  font-display: swap;
  unicode-range: ${plage};
}`);
    console.log(`  ${nom.padEnd(44)} ${(octets.length / 1024).toFixed(1)} Ko`);
  }
  if (!n) throw new Error(`${famille.nom} : aucun sous-ensemble latin trouvé`);
}

const entete = `/* ARCEP Gabon — caractères auto-hébergés.

   Fichier produit par outils/contenu/polices.mjs. Ne pas modifier à la main : relancer
   l'outil. Les fichiers vivent dans public/assets/polices/ et sont servis avec un cache
   d'un mois, leur contenu ne changeant jamais sous le même nom.

   « font-display: swap » affiche immédiatement la fonte de repli et permute dès que la
   fonte définitive est prête : le texte d'une autorité publique ne doit jamais rester
   invisible en attendant un fichier. */

`;

await writeFile(FEUILLE, entete + regles.join('\n\n') + '\n', 'utf8');
console.log(`\n${regles.length} déclarations · ${(total / 1024).toFixed(0)} Ko au total`);
console.log('écrit : public/css/polices.css');
