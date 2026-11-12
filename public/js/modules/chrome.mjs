// En-tête : tonalité selon la scène survolée, masquage à la descente, barre de progression
import { QS, QSA, gsap, ScrollTrigger, pret, reduit } from './socle.mjs';

const chrome = QS('#chrome');
const curseur = QS('.curseur');
const ecouteurs = [];

export function tonalite(t) {
  if (!chrome) return;
  chrome.dataset.etat = t;
  if (curseur) curseur.dataset.ton = t;
  for (const fn of ecouteurs) fn(t);
}
export const surTonalite = (fn) => ecouteurs.push(fn);

export function demarrerChrome() {
  if (!chrome) return;
  const progression = QS('.chrome-progression');
  let dernier = window.scrollY;
  let cache = false;

  const suivre = () => {
    const y = window.scrollY;
    chrome.dataset.defile = y > 24 ? '1' : '0';
    const descend = y > dernier + 4 && y > 420;
    const remonte = y < dernier - 4 || y < 120;
    if (descend && !cache && !document.body.classList.contains('menu-ouvert')) { cache = true; chrome.dataset.cache = '1'; }
    else if (remonte && cache) { cache = false; chrome.dataset.cache = '0'; }
    dernier = y;
    if (progression && !pret) {
      const course = document.documentElement.scrollHeight - window.innerHeight;
      progression.style.transform = `scaleX(${course > 0 ? Math.min(1, y / course) : 0})`;
    }
  };
  window.addEventListener('scroll', suivre, { passive: true });
  suivre();

  if (pret && progression && !reduit()) {
    gsap.to(progression, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
  }

  const scenes = QSA('[data-tonalite]').filter((s) => s.closest('main'));
  if (pret) {
    for (const s of scenes) {
      ScrollTrigger.create({
        trigger: s, start: 'top 40px', end: 'bottom 40px',
        onToggle: (self) => { if (self.isActive) tonalite(s.dataset.tonalite); },
      });
    }
  } else {
    const obs = new IntersectionObserver((entrees) => {
      for (const en of entrees) if (en.isIntersecting) tonalite(en.target.dataset.tonalite);
    }, { rootMargin: '-40px 0px -85% 0px' });
    for (const s of scenes) obs.observe(s);
  }
}
