// Curseur personnalisé (souris uniquement)
import { QS, mobile, reduit } from './socle.mjs';
import { surTonalite } from './chrome.mjs';

const MOTS = { voir: 'Voir', ouvrir: 'Ouvrir', explorer: 'Explorer', glisser: 'Glisser', lire: 'Lire' };

export function demarrerCurseur() {
  const curseur = QS('.curseur');
  if (!curseur || mobile() || reduit()) return;
  const mot = QS('.curseur-mot', curseur);
  document.documentElement.classList.add('curseur-actif');
  surTonalite((t) => { curseur.dataset.ton = t; });

  let cx = -100, cy = -100, px = -100, py = -100, visible = false, boucle = 0;
  const rendre = () => {
    px += (cx - px) * .22;
    py += (cy - py) * .22;
    curseur.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    if (Math.abs(cx - px) > .1 || Math.abs(cy - py) > .1) boucle = requestAnimationFrame(rendre);
    else boucle = 0;
  };
  const relancer = () => { if (!boucle) boucle = requestAnimationFrame(rendre); };

  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    cx = ev.clientX; cy = ev.clientY;
    if (!visible) { visible = true; px = cx; py = cy; curseur.style.opacity = '1'; }
    relancer();
  }, { passive: true });
  document.addEventListener('mouseleave', () => { curseur.style.opacity = '0'; visible = false; });
  window.addEventListener('pointerdown', () => { curseur.dataset.appui = '1'; });
  window.addEventListener('pointerup', () => { delete curseur.dataset.appui; });

  document.addEventListener('pointerover', (ev) => {
    const el = ev.target instanceof Element ? ev.target.closest('[data-curseur], a, button, summary, label, input, textarea, select') : null;
    if (!el) { delete curseur.dataset.mot; delete curseur.dataset.survol; if (mot) mot.textContent = ''; return; }
    const cle = el.getAttribute('data-curseur');
    if (cle && MOTS[cle]) { curseur.dataset.mot = cle; if (mot) mot.textContent = MOTS[cle]; }
    else { delete curseur.dataset.mot; if (mot) mot.textContent = ''; }
    curseur.dataset.survol = '1';
  });
}
