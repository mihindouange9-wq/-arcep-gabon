// Graphiques SVG rendus côté serveur à partir des données.
import { e, lien } from './base.mjs';

// Couverture des tableaux de bord
// Matrice trimestres x marchés, une case par tableau de bord publié.
export function couvertureObservatoire(D) {
  const cases = new Map();
  const periodes = new Set();
  for (const m of D.observatoire) {
    for (const p of m.publications) {
      const cle = `${p.annee}-${p.trimestre}`;
      periodes.add(cle);
      cases.set(`${m.cle}|${cle}`, p);
    }
  }
  const colonnes = Array.from(periodes).sort();
  const annees = [];
  for (const c of colonnes) {
    const a = c.slice(0, 4);
    const dernier = annees[annees.length - 1];
    if (dernier && dernier.annee === a) dernier.n += 1; else annees.push({ annee: a, n: 1 });
  }
  const total = D.observatoire.reduce((n, m) => n + m.publications.length, 0);

  return `<div class="couverture" role="table" aria-label="Tableaux de bord publiés par trimestre et par marché">
  <div class="couverture-annees" role="row" aria-hidden="true">
    <span class="couverture-coin"></span>
    ${annees.map((a) => `<span class="couverture-annee" style="--n:${a.n}">${e(a.annee)}</span>`).join('')}
  </div>
  <div class="couverture-trimestres" role="row">
    <span class="couverture-coin" role="columnheader">Marché</span>
    ${colonnes.map((c) => `<span class="couverture-trimestre" role="columnheader">${e(c.slice(5))}</span>`).join('')}
  </div>
  ${D.observatoire.map((m) => `
  <div class="couverture-ligne" role="row">
    <span class="couverture-marche" role="rowheader">${e(m.nom)}</span>
    ${colonnes.map((c) => {
      const p = cases.get(`${m.cle}|${c}`);
      return p && (p.fichier || p.lien)
        ? `<a class="couverture-case" role="cell" href="${lien(p.fichier || p.lien)}" target="_blank" rel="noopener" data-infobulle="${e(p.titre)}" aria-label="${e(p.titre)}"><i></i></a>`
        : `<span class="couverture-case couverture-case--vide" role="cell" aria-label="Non publié"><i></i></span>`;
    }).join('')}
  </div>`).join('')}
  <p class="couverture-legende mesure">${total} tableaux de bord · ${colonnes.length} trimestres · ${D.observatoire.length} marchés</p>
</div>`;
}

// Textes par catégorie
export function repartitionDocuments(D) {
  const comptes = D.categories.map((c) => ({ ...c, n: D.documents.filter((d) => d.categorie === c.cle).length }));
  const max = Math.max(1, ...comptes.map((c) => c.n));
  return `<ol class="barres" aria-label="Nombre de textes par catégorie">
  ${comptes.map((c) => `
  <li class="barre">
    <a href="/reglementation?categorie=${encodeURIComponent(c.cle)}" class="barre-nom">${e(c.nom)}</a>
    <span class="barre-piste"><i class="barre-valeur" style="--part:${(c.n / max).toFixed(3)}"></i></span>
    <span class="barre-nombre tabulaire">${c.n}</span>
  </li>`).join('')}
</ol>`;
}

// Jauge d'un indicateur
// Pourcentage : piste graduée, repère à 100 si dépassé.
export function jauge(c) {
  if (String(c.unite).trim() !== '%') return '';
  const valeur = Number(c.valeur);
  const echelle = valeur > 100 ? Math.ceil(valeur / 50) * 50 : 100;
  return `<span class="jauge" aria-hidden="true" data-jauge="${(valeur / echelle).toFixed(4)}" style="--echelle:${echelle}">
    <i class="jauge-piste"></i>
    <i class="jauge-valeur"></i>
    ${valeur > 100 ? `<i class="jauge-repere" style="--a:${(100 / echelle).toFixed(4)}"></i>` : ''}
    <span class="jauge-graduations"><b>0</b><b>${echelle}</b></span>
  </span>`;
}

// Onde de signal
// Courbes tracées au défilement.
export function onde(classe = 'onde', n = 5) {
  const chemins = Array.from({ length: n }, (_, i) => {
    const d = `M-160 ${960 + i * 34} C 280 ${580 - i * 68} 760 ${450 - i * 60} 1600 ${170 - i * 40}`;
    return `<path d="${d}" pathLength="1" style="--rang:${i}" stroke-width="${(2 - i * .2).toFixed(2)}" opacity="${(.55 - i * .08).toFixed(2)}"/>`;
  }).join('');
  return `<svg class="${classe}" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">${chemins}</svg>`;
}
