// Aspire les pages de l'ancien site vers recherche/html/*.html et en extrait le texte dans recherche/contenu.json.
// node outils/contenu/fetch-arcep.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const B = 'https://www.arcep.ga';
const PAGES = [
  ['accueil', '/'], ['apropos', '/apropos'], ['motdupresident', '/motdupresident'],
  ['conseil_regulation', '/conseil_regulation'], ['organigramme', '/organigramme'],
  ['mission1', '/pages/detail_mission/1'], ['mission2', '/pages/detail_mission/2'], ['mission3', '/pages/detail_mission/3'],
  ['mission4', '/pages/detail_mission/4'], ['mission5', '/pages/detail_mission/5'],
  ['reg1', '/pages/detail_reglementation/1'], ['reg2', '/pages/detail_reglementation/2'], ['reg3', '/pages/detail_reglementation/3'],
  ['reg4', '/pages/detail_reglementation/4'], ['reg5', '/pages/detail_reglementation/5'], ['reg6', '/pages/detail_reglementation/6'],
  ['reg7', '/pages/detail_reglementation/7'], ['reg8', '/pages/detail_reglementation/8'], ['reg9', '/pages/detail_reglementation/9'],
  ['obs1', '/pages/detail_observatoire/1'], ['obs2', '/pages/detail_observatoire/2'], ['obs3', '/pages/detail_observatoire/3'],
  ['actualites', '/actualites'], ['contact', '/contact'], ['faqs', '/faqs'], ['multimedia', '/multimedia'], ['plan_site', '/plan_site'],
  ['actu120', '/pages/detail_actu/120'], ['actu119', '/pages/detail_actu/119'], ['actu118', '/pages/detail_actu/118'],
  ['actu117', '/pages/detail_actu/117'], ['actu116', '/pages/detail_actu/116'], ['actu115', '/pages/detail_actu/115'],
];
const texte = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h1|h2|h3|h4|tr)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&#039;|&rsquo;/g, '’').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à').replace(/&ccedil;/g, 'ç').replace(/&ecirc;/g, 'ê').replace(/&#[0-9]+;/g, ' ')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();

await mkdir('recherche/html', { recursive: true });
const out = {};
for (const [nom, chemin] of PAGES) {
  try {
    const { stdout } = await run('curl', ['-s', '-A', UA, '--max-time', '25', B + chemin], { maxBuffer: 20e6 });
    await writeFile(`recherche/html/${nom}.html`, stdout);
    const t = texte(stdout);
    const titres = [...stdout.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter((s) => s.length > 3).slice(0, 40);
    const pdfs = [...new Set([...stdout.matchAll(/href="([^"]+\.pdf)"/gi)].map((m) => m[1]))].slice(0, 40);
    const imgs = [...new Set([...stdout.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]))].slice(0, 30);
    out[nom] = { chemin, titres, pdfs, imgs, texte: t.slice(0, 12000) };
    console.log(nom.padEnd(20), t.length.toString().padStart(6), 'car ·', titres.length, 'titres ·', pdfs.length, 'pdf');
  } catch (e) { console.log(nom.padEnd(20), 'échec :', e.message.split('\n')[0]); }
}
await writeFile('recherche/contenu.json', JSON.stringify(out, null, 1));
console.log('→ recherche/contenu.json');
