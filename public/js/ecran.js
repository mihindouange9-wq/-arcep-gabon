// Mode ?ecran=1 (rendu dans le téléphone de l'accueil) : propager le paramètre aux liens internes
for (const a of document.querySelectorAll('a[href]')) {
  let u;
  try { u = new URL(a.getAttribute('href'), window.location.href); } catch { continue; }
  if (u.origin !== window.location.origin || u.pathname.startsWith('/admin') || u.pathname.startsWith('/api')) continue;
  if (/\.(pdf|jpe?g|png|webp|mp4|webm)$/i.test(u.pathname)) continue;
  u.searchParams.set('ecran', '1');
  a.setAttribute('href', u.pathname + u.search + u.hash);
}
for (const d of document.querySelectorAll('[data-reveler], [data-serie]')) d.classList.add('vu', 'pret');
document.querySelector('.hero')?.classList.add('pret');
document.querySelector('.hero-intro')?.remove();
for (const v of document.querySelectorAll('video[data-video]')) { v.play().catch(() => {}); }
