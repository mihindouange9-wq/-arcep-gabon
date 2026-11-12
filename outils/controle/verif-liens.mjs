// Crawl du site depuis l'accueil : chaque adresse interne doit répondre 200 ; liens vides et liens vers l'ancien site
// signalés, domaines externes listés pour relecture. node outils/controle/verif-liens.mjs [base]
const BASE = (process.argv[2] || 'http://127.0.0.1:4310').replace(/\/+$/, '');
const vus = new Map();          // adresse → statut
const file = ['/'];
const externes = new Map();     // adresse → page d'origine
const anomalies = [];
const IGNORER = /^(mailto:|tel:|#|javascript:)/i;

const attributs = (html) => [...html.matchAll(/\b(?:href|src|poster)="([^"]*)"/g)].map((m) => m[1]);

while (file.length) {
  const chemin = file.shift();
  if (vus.has(chemin)) continue;
  let r;
  try { r = await fetch(BASE + chemin, { redirect: 'manual' }); } catch (e) { vus.set(chemin, 0); anomalies.push(`${chemin} : injoignable (${e.message})`); continue; }
  vus.set(chemin, r.status);
  if (r.status !== 200) { anomalies.push(`${chemin} : réponse ${r.status}`); continue; }
  const type = r.headers.get('content-type') || '';
  if (!type.startsWith('text/html')) continue;
  const html = await r.text();
  for (const brut of attributs(html)) {
    const a = brut.trim();
    if (a === '') { anomalies.push(`${chemin} : lien vide`); continue; }
    if (IGNORER.test(a)) continue;
    if (/^https?:\/\//i.test(a)) {
      if (/arcep\.ga/i.test(a) && !/^mailto:/i.test(a)) anomalies.push(`${chemin} : lien vers l’ancien site ${a}`);
      else if (!externes.has(a)) externes.set(a, chemin);
      continue;
    }
    if (a.startsWith('//') || a.startsWith('data:')) continue;
    const u = new URL(a, BASE + chemin);
    const cible = u.pathname + (u.search || '');
    if (u.pathname.startsWith('/admin')) continue;
    if (!vus.has(cible) && !file.includes(cible)) file.push(cible);
  }
}

const pages = [...vus].filter(([c]) => !/\.[a-z0-9]{2,5}(\?|$)/i.test(c)).length;
console.log(`\nARCEP — liens de ${BASE}\n${'='.repeat(52)}`);
console.log(`  ${vus.size} adresses vérifiées (${pages} pages, ${vus.size - pages} fichiers)`);
console.log(`  ${externes.size} liens externes : ${[...externes.keys()].map((u) => new URL(u).hostname).filter((h, i, t) => t.indexOf(h) === i).join(', ') || 'aucun'}`);
if (anomalies.length) { console.log(`\n${anomalies.length} anomalie(s) :\n  ` + anomalies.join('\n  ') + '\n'); process.exitCode = 1; }
else console.log('  ✓ tout répond 200, aucun lien vide, aucun lien vers l’ancien site\n');
