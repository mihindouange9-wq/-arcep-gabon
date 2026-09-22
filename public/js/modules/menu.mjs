/* ARCEP Gabon — le menu immersif.
   Un rideau qui descend, des rubriques qui montent l'une après l'autre. Le focus reste
   dans le menu, Échap le ferme, et la page derrière est rendue inerte. */
import { QS, QSA, gsap, pret, reduit, bloquer } from './socle.mjs';

export function demarrerMenu() {
  const bouton = QS('.chrome-menu');
  const menu = QS('#menu');
  const principal = QS('main');
  const pied = QS('.pied');
  if (!bouton || !menu) return;
  const liens = QSA('.menu-liste a', menu);
  const cote = QSA('.menu-cote > div, .menu-pied', menu);
  let ouvert = false;
  let ligne = null;

  const focusables = () => QSA('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', menu);

  const ouvrir = () => {
    if (ouvert) return;
    ouvert = true;
    menu.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-ouvert');
    bloquer(true);
    if (principal) principal.inert = true;
    if (pied) pied.inert = true;
    if (pret && !reduit()) {
      ligne = gsap.timeline()
        .fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'expo.inOut' })
        .fromTo(liens, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .06 }, '-=.45')
        .fromTo(cote, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .08 }, '-=.7');
    } else {
      menu.style.clipPath = 'inset(0 0 0% 0)';
    }
    liens[0]?.focus({ preventScroll: true });
  };

  const fermer = (retour = true) => {
    if (!ouvert) return;
    ouvert = false;
    bouton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-ouvert');
    if (principal) principal.inert = false;
    if (pied) pied.inert = false;
    const fin = () => { menu.hidden = true; bloquer(false); };
    if (pret && !reduit()) {
      ligne?.kill();
      gsap.timeline({ onComplete: fin })
        .to([...liens, ...cote], { opacity: 0, y: -12, duration: .35, stagger: .02, ease: 'power2.in' })
        .to(menu, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut' }, '-=.2');
    } else fin();
    if (retour) bouton.focus({ preventScroll: true });
  };

  bouton.addEventListener('click', () => (ouvert ? fermer() : ouvrir()));
  document.addEventListener('keydown', (ev) => {
    if (!ouvert) return;
    if (ev.key === 'Escape') { ev.preventDefault(); fermer(); return; }
    if (ev.key !== 'Tab') return;
    const f = focusables();
    const premier = bouton;
    const dernier = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === premier) { ev.preventDefault(); dernier.focus(); }
    else if (!ev.shiftKey && document.activeElement === dernier) { ev.preventDefault(); premier.focus(); }
  });
  /* Un lien vers la page courante ferme simplement le menu. */
  for (const a of liens) a.addEventListener('click', (ev) => {
    const u = new URL(a.href, window.location.href);
    if (u.pathname === window.location.pathname && u.search === window.location.search) { ev.preventDefault(); fermer(); }
  });
}
