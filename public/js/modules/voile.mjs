// Transition de sortie entre pages (l'entrée est en CSS pur)
import { QS, reduit } from './socle.mjs';

export function demarrerVoile() {
  const voile = QS('.voile');
  if (!voile) return;
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) voile.classList.remove('voile--sortie'); });
  document.addEventListener('click', (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || reduit()) return;
    const a = ev.target instanceof Element ? ev.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    let u;
    try { u = new URL(a.href, window.location.href); } catch { return; }
    if (u.origin !== window.location.origin || u.href === window.location.href) return;
    if (u.pathname === window.location.pathname && u.hash) return;
    if (/\.(pdf|jpe?g|png|webp|mp4|webm|json|xml|txt)$/i.test(u.pathname) || u.pathname.startsWith('/api')) return;
    ev.preventDefault();
    voile.classList.add('voile--sortie');
    window.setTimeout(() => { window.location.href = u.href; }, 520);
  });
}
