/* ARCEP Gabon — filtrage des listes.
   Le serveur rend la totalité des entrées et masque celles qui ne correspondent pas : sans
   script, le tri du serveur fait foi. Ici, le même calcul est refait instantanément, et
   l'adresse suit pour qu'un lien copié garde les filtres. */
import { QS, QSA, defilerVers } from './socle.mjs';

const DEFAUTS = new Set(['tout', 'toutes', 'tous', '']);

export function demarrerFiltrage() {
  for (const form of QSA('form[data-filtrage]')) {
    const racine = form.closest('section') || document;
    const liste = QS('[data-liste]', racine);
    if (!liste) continue;
    const entrees = QSA(':scope > li, :scope > details', liste).filter((el) => !el.hasAttribute('data-vide'));
    const vide = QS('[data-vide]', liste);
    const compte = QS('[data-compte]', racine);
    const champ = QS('[data-recherche]', form);
    const filtres = QSA('[data-filtre]', form);
    const une = QS('.actualites-composition--page', racine);
    const parPage = Number(liste.dataset.page) || 0;
    const plus = QS('[data-plus]', racine);
    let limite = parPage;
    const uneHref = une ? QS('a', une)?.getAttribute('href') : null;
    const etat = {};
    for (const f of filtres) if (f.hasAttribute('aria-current')) etat[f.dataset.filtre] = f.dataset.valeur;
    let minuterie = 0;

    const appliquer = () => {
      const terme = champ ? champ.value.trim().toLowerCase() : '';
      const parDefaut = !terme && Object.values(etat).every((v) => DEFAUTS.has(v));
      let retenus = 0;
      for (const el of entrees) {
        let garde = !terme || (el.dataset.titre || '').includes(terme);
        for (const [cle, valeur] of Object.entries(etat)) {
          if (DEFAUTS.has(valeur)) continue;
          if ((el.dataset[cle] || '') !== valeur) garde = false;
        }
        /* L'article à la une n'est pas répété dans la liste tant qu'aucun filtre n'agit. */
        if (garde && parDefaut && uneHref && QS('a', el)?.getAttribute('href') === uneHref) garde = false;
        el.hidden = !garde;
        if (garde) retenus += 1;
      }
      if (une) une.hidden = !parDefaut;
      if (parDefaut && une) retenus += 1;
      /* Une longue liste se dévoile par pages : les entrées au-delà de la limite attendent. */
      if (parPage) {
        let visibles = 0;
        for (const el of entrees) { if (el.hidden) continue; visibles += 1; if (visibles > limite) el.hidden = true; }
        if (plus) plus.hidden = visibles <= limite;
      }
      if (vide) vide.hidden = retenus > 0;
      if (compte) {
        if (!compte.dataset.mot) compte.dataset.mot = compte.textContent.replace(/^\d+\s*/, '').replace(/(s|x)$/, '').replace(/(s|x) de bord$/, ' de bord');
        const mot = compte.dataset.mot;
        const pluriel = mot.startsWith('tableau') ? mot.replace('tableau', 'tableaux') : mot + 's';
        compte.textContent = `${retenus} ${retenus > 1 ? pluriel : mot}`;
      }
      for (const f of filtres) {
        const valeur = etat[f.dataset.filtre];
        const actif = valeur === undefined ? DEFAUTS.has(f.dataset.valeur) : valeur === f.dataset.valeur;
        if (f.tagName === 'BUTTON') f.setAttribute('aria-pressed', String(actif));
        else if (actif) f.setAttribute('aria-current', 'true'); else f.removeAttribute('aria-current');
      }
      const u = new URL(window.location.href);
      for (const [cle, valeur] of Object.entries(etat)) { if (DEFAUTS.has(valeur)) u.searchParams.delete(cle); else u.searchParams.set(cle, valeur); }
      if (terme) u.searchParams.set('q', champ.value.trim()); else u.searchParams.delete('q');
      window.history.replaceState(null, '', u.pathname + u.search + u.hash);
    };

    for (const f of filtres) {
      f.addEventListener('click', (ev) => {
        ev.preventDefault();
        const cle = f.dataset.filtre;
        etat[cle] = (f.tagName === 'BUTTON' && etat[cle] === f.dataset.valeur) ? '' : f.dataset.valeur;
        limite = parPage;
        appliquer();
        if (f.tagName !== 'BUTTON') defilerVers(liste, -140);
      });
    }
    if (champ) champ.addEventListener('input', () => { clearTimeout(minuterie); limite = parPage; minuterie = setTimeout(appliquer, 120); });
    if (plus) plus.querySelector('button').addEventListener('click', () => { limite += parPage; appliquer(); });
    form.addEventListener('submit', (ev) => { ev.preventDefault(); appliquer(); });
    appliquer();
  }

  /* Un accordéon : les flèches passent d'une question à l'autre, Début et Fin aux bornes. */
  for (const acc of QSA('.accordeon')) {
    acc.addEventListener('keydown', (ev) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key)) return;
      const sommaires = QSA('details:not([hidden]) > summary', acc);
      const i = sommaires.indexOf(document.activeElement);
      if (i < 0) return;
      ev.preventDefault();
      const j = ev.key === 'ArrowDown' ? Math.min(sommaires.length - 1, i + 1) : ev.key === 'ArrowUp' ? Math.max(0, i - 1) : ev.key === 'Home' ? 0 : sommaires.length - 1;
      sommaires[j].focus();
    });
  }
}
