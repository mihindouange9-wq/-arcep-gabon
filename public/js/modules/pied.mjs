import { QS, QSA, gsap, pret, reduit, auChamp } from './socle.mjs';

export function demarrerPied() {
  const signature = QS('[data-signature]');
  if (!signature || !pret || reduit()) return;
  const mots = QSA('span', signature);
  signature.style.overflow = 'hidden';
  gsap.set(mots, { yPercent: 105 });
  auChamp(signature, () => gsap.to(mots, { yPercent: 0, duration: 1.4, stagger: .12, ease: 'expo.out' }), '92%');
}
