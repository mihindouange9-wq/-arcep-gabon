// Révélations à l'entrée dans le viewport, parallaxe, vidéos décoratives.
// Les états initiaux sont dans le CSS sous .js : sans ce module rien n'est masqué.
import { QSA, gsap, SplitText, pret, reduit, mobile, auChamp } from './socle.mjs';

export function demarrerRevelations() {
  const tout = QSA('[data-reveler], [data-serie], .onde');
  if (!pret || reduit()) { for (const el of tout) el.classList.add('vu', 'pret'); videos(); return; }

  for (const el of QSA('[data-reveler]')) {
    if (el.closest('.hero')) continue;
    const mode = el.getAttribute('data-reveler');
    if (mode === 'lignes' && SplitText) {
      const decoupe = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ligne' });
      el.classList.add('pret');
      gsap.set(decoupe.lines, { yPercent: 110 });
      auChamp(el, () => gsap.to(decoupe.lines, { yPercent: 0, duration: 1.2, stagger: .08 }));
    } else if (mode === 'masque') {
      const media = el.querySelector('img, video, .visuel-interieur');
      el.classList.add('pret');
      if (media) {
        gsap.set(media, { clipPath: 'inset(0 0 100% 0)', scale: 1.12 });
        auChamp(el, () => { el.classList.add('vu'); gsap.to(media, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.5, ease: 'expo.out', clearProps: 'clipPath,scale' }); }, '85%');
      } else el.classList.add('vu');
    } else {
      gsap.set(el, { y: 26, opacity: 0 });
      el.classList.add('pret');
      auChamp(el, () => gsap.to(el, { y: 0, opacity: 1, duration: 1.1, clearProps: 'transform' }));
    }
  }

  for (const serie of QSA('[data-serie]')) {
    const enfants = Array.from(serie.children);
    enfants.forEach((en, i) => en.style.setProperty('--rang', Math.min(i, 11)));
    gsap.set(enfants, { y: 22, opacity: 0 });
    serie.classList.add('vu');
    auChamp(serie, () => gsap.to(enfants, { y: 0, opacity: 1, duration: 1, stagger: Math.min(.09, .8 / enfants.length), clearProps: 'transform' }));
  }

  for (const onde of QSA('.onde')) auChamp(onde, () => onde.classList.add('vu'), '95%');

  if (!mobile()) {
    for (const el of QSA('[data-parallaxe]')) {
      const f = Number(el.getAttribute('data-parallaxe')) || 0;
      const scene = el.closest('section') || el.parentElement;
      gsap.to(el, { y: () => f * window.innerHeight, ease: 'none', scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: .8 } });
    }
  }
  videos();
}

function videos() {
  const liste = QSA('video[data-video]');
  if (!liste.length) return;
  const obs = new IntersectionObserver((entrees) => {
    for (const en of entrees) {
      const v = en.target;
      if (en.isIntersecting) v.play().catch(() => {}); else v.pause();
    }
  }, { threshold: .2 });
  for (const v of liste) obs.observe(v);
}
