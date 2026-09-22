/* Repère et retire les octets NUL glissés dans les fichiers texte. Ils viennent des
   redirections de la console Windows et cassent les outils qui traitent le fichier en texte.
   node outils/controle/verif-nul.mjs [--corriger] */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CORRIGER = process.argv.includes('--corriger');
const IGNORE = new Set(['node_modules', '.git', 'recherche', 'livraison', 'sources', 'assets', 'captures']);
const NUL = String.fromCharCode(0);

const lister = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  if (IGNORE.has(e.name)) return [];
  const p = join(d, e.name);
  return e.isDirectory() ? lister(p) : [p];
});

const cibles = lister('.').filter((f) => /\.(html|css|js|mjs|md|toml|txt|json)$/i.test(f));
let touches = 0;

for (const f of cibles) {
  const texte = readFileSync(f, 'utf8');
  const i = texte.indexOf(NUL);
  if (i < 0) continue;
  touches++;
  const nombre = texte.split(NUL).length - 1;
  const ligne = texte.slice(0, i).split('\n').length;
  const contexte = texte.slice(Math.max(0, i - 60), i).replace(/\s+/g, ' ')
    + ' [NUL] ' + texte.slice(i + 1, i + 25).replace(/\s+/g, ' ');
  console.log(`${f} · ${nombre} octet(s) NUL · ligne ${ligne}`);
  console.log(`   … ${contexte} …`);
  if (CORRIGER) { writeFileSync(f, texte.split(NUL).join('')); console.log('   → retiré'); }
}

console.log(`${cibles.length} fichiers texte contrôlés · ${touches} contenaient des NUL`);
process.exit(touches && !CORRIGER ? 1 : 0);
