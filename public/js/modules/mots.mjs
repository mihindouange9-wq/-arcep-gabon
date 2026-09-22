/* ARCEP Gabon — les mots-clés.
   Quatre verbes se succèdent pendant que la scène reste épinglée : chacun monte, se pose,
   puis cède la place. Au doigt ou en mouvement réduit, ils sont simplement posés. */
import { QS, QSA, gsap, pret, reduit, mobile } from './socle.mjs';

export function demarrerMots() {
  const section = QS('.mots');
  if (!section) return;
  const scene = QS('.mots-scene', section);
  const mots = QSA('.mots-mot', section);
  if (!pret || reduit() || mobile() || mots.length < 2) { section.classList.add('mots--statique'); return; }

  /* La scène reste collée par CSS (position: sticky) pendant que la section, plus haute,
     défile : aucun élément n'est déplacé dans le document. */
  section.classList.add('mots--cinema');
  section.style.setProperty('--etapes', mots.length);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: .7 },
  });
  mots.forEach((mot, i) => {
    tl.fromTo(mot, { opacity: 0, yPercent: 45, filter: 'blur(18px)' }, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1, ease: 'power2.out' });
    if (i < mots.length - 1) tl.to(mot, { opacity: 0, yPercent: -45, filter: 'blur(18px)', duration: 1, ease: 'power2.in' }, '+=.5');
  });
  tl.to({}, { duration: .6 });
}
