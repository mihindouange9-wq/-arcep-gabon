// Mots-clés en scène sticky, scrubbés au défilement
import { QS, QSA, gsap, pret, reduit, mobile } from './socle.mjs';

export function demarrerMots() {
  const section = QS('.mots');
  if (!section) return;
  const scene = QS('.mots-scene', section);
  const mots = QSA('.mots-mot', section);
  if (!pret || reduit() || mobile() || mots.length < 2) { section.classList.add('mots--statique'); return; }

  // Pas de pin : la scène est sticky, ScrollTrigger ne fait que lire la progression
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
