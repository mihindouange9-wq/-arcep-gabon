// Missions de l'accueil en <dialog> ; sans JS, le lien mène à /missions
import { QS, QSA, gsap, pret, reduit, bloquer } from './socle.mjs';

export function demarrerMissions() {
  const liens = QSA('a[data-mission]');
  if (!liens.length || typeof HTMLDialogElement !== 'function') return;

  const fermer = (d) => {
    const fin = () => { d.close(); bloquer(false); };
    if (pret && !reduit()) gsap.to(d, { opacity: 0, scale: .97, duration: .25, ease: 'power2.in', onComplete: fin });
    else fin();
  };

  for (const a of liens) {
    const d = QS('#mission-' + CSS.escape(a.dataset.mission));
    if (!d) continue;
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      d.showModal();
      bloquer(true);
      if (pret && !reduit()) gsap.fromTo(d, { opacity: 0, scale: .96, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: .5, ease: 'expo.out' });
      QS('[data-fermer]', d)?.focus();
    });
    d.addEventListener('cancel', (ev) => { ev.preventDefault(); fermer(d); });
    d.addEventListener('click', (ev) => { if (ev.target === d) fermer(d); });
    QS('[data-fermer]', d)?.addEventListener('click', () => fermer(d));
  }
}
