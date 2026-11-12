// Télécharge les sous-ensembles latin et latin-ext des trois familles (Google Fonts, woff2) dans public/assets/polices/
// et écrit public/css/polices.css. Le sous-ensemble latin seul ne couvre pas œ ni certaines capitales accentuées :
// verif-polices.mjs contrôle la couverture après coup.
// node outils/contenu/polices.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const DOSSIER = join(RACINE, 'public', 'assets', 'polices');
const FEUILLE = join(RACINE, 'public', 'css', 'polices.css');

// UA de navigateur récent : Google renvoie du woff2 variable, pas du truetype
const AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/131.0 Safari/537.36';

// graisses effectivement employées par les feuilles
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

const entete = `/* Polices auto-hébergées. Fichier généré par outils/contenu/polices.mjs, ne pas modifier à la main. */

`;

await writeFile(FEUILLE, entete + regles.join('\n\n') + '\n', 'utf8');
console.log(`\n${regles.length} déclarations · ${(total / 1024).toFixed(0)} Ko au total`);
console.log('écrit : public/css/polices.css');
