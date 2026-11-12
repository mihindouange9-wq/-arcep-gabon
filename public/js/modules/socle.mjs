// Socle GSAP / ScrollTrigger / SplitText / Lenis (chargés depuis vendor/, exposés sur window)

export const QS = (s, r = document) => r.querySelector(s);
export const QSA = (s, r = document) => Array.from(r.querySelectorAll(s));

const REDUIT = window.matchMedia('(prefers-reduced-motion: reduce)');
const FIN = window.matchMedia('(pointer: fine)');
export const reduit = () => REDUIT.matches;
export const mobile = () => window.innerWidth < 861 || !FIN.matches;

export const gsap = window.gsap;
export const ScrollTrigger = window.ScrollTrigger;
export const SplitText = window.SplitText;
export const pret = Boolean(gsap && ScrollTrigger);

export let lenis = null;

if (pret) {
  gsap.registerPlugin(ScrollTrigger, ...(SplitText ? [SplitText] : []));
  gsap.defaults({ ease: 'expo.out', duration: 1 });
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Lenis seulement à la souris et hors prefers-reduced-motion
  if (window.Lenis && !reduit() && FIN.matches) {
    lenis = new window.Lenis({
      autoRaf: false, lerp: .1, duration: 1.1, smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Ancres via Lenis, décalées de la hauteur de l'en-tête
  document.addEventListener('click', (ev) => {
    const a = ev.target instanceof Element ? ev.target.closest('a[href^="#"]') : null;
    if (!a || a.getAttribute('href') === '#') return;
    const cible = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!cible) return;
    ev.preventDefault();
    defilerVers(cible);
    cible.setAttribute('tabindex', '-1');
    cible.focus({ preventScroll: true });
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

export function defilerVers(cible, decalage = -72) {
  if (lenis) lenis.scrollTo(cible, { offset: decalage, duration: 1.4 });
  else cible.scrollIntoView({ behavior: reduit() ? 'auto' : 'smooth', block: 'start' });
}

export function bloquer(oui) {
  if (lenis) { if (oui) lenis.stop(); else lenis.start(); }
  document.documentElement.style.overflow = oui ? 'hidden' : '';
}

export function auChamp(el, fn, marge = '88%') {
  if (!pret) { fn(); return; }
  ScrollTrigger.create({ trigger: el, start: `top ${marge}`, once: true, onEnter: fn });
}
