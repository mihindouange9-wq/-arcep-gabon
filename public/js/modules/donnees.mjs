/* ARCEP Gabon — les données animées.
   Les compteurs montent jusqu'à leur valeur puis la chaîne exacte rendue par le serveur
   est remise en place ; les jauges, les barres et la couverture se remplissent à l'entrée
   dans le champ. Aucune valeur n'est calculée ici : tout vient du document. */
import { QSA, gsap, pret, reduit, auChamp } from './socle.mjs';

export function demarrerDonnees() {
  for (const cellule of QSA('[data-compteur]')) {
    const fin = Number(cellule.dataset.compteur);
    const decimales = Number(cellule.dataset.decimales || 0);
    const exact = cellule.textContent;
    if (!Number.isFinite(fin) || !pret || reduit()) continue;
    const format = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    const etat = { v: 0 };
    cellule.textContent = format.format(0);
    auChamp(cellule, () => gsap.to(etat, {
      v: fin, duration: 2.6, ease: 'power3.out',
      onUpdate: () => { cellule.textContent = format.format(etat.v); },
      onComplete: () => { cellule.textContent = exact; },
    }), '80%');
  }

  for (const jauge of QSA('[data-jauge]')) {
    const part = Number(jauge.dataset.jauge) || 0;
    if (!pret || reduit()) { jauge.style.setProperty('--part', part); continue; }
    jauge.style.setProperty('--part', 0);
    auChamp(jauge, () => gsap.to(jauge, { '--part': part, duration: 1.8, ease: 'expo.out' }), '80%');
  }

  for (const el of QSA('.barres, .couverture')) {
    QSA('.barre, .couverture-case', el).forEach((c, i) => c.style.setProperty('--rang', i));
    if (!pret || reduit()) { el.classList.add('vu'); continue; }
    auChamp(el, () => el.classList.add('vu'), '85%');
  }
}
