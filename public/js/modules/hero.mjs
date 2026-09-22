/* ARCEP Gabon — le hero.
   Une séquence d'entrée — le logo, la lumière, le titre, le message, l'actualité à la une —
   puis un réseau de nœuds et de liaisons dessiné sur un canvas : des points qui dérivent,
   des liaisons qui se nouent à portée, un signal qui les parcourt. Tout est plafonné :
   quatre-vingt-dix nœuds au plus, une échelle de pixels de 1,5 au plus, et rien ne se
   calcule hors du champ. */
import { QS, gsap, SplitText, pret, reduit, mobile } from './socle.mjs';

export function demarrerHero() {
  const hero = QS('.hero');
  if (!hero) return;
  const intro = QS('.hero-intro', hero);
  const canvas = QS('.hero-reseau', hero);

  if (!pret || reduit()) {
    hero.classList.add('pret');
    if (intro) intro.remove();
    return;
  }

  sequence(hero, intro);
  if (canvas && !mobile()) reseau(canvas, hero);
}

/* ---------- La séquence d'entrée ---------- */
function sequence(hero, intro) {
  const titre = QS('.hero-titre', hero);
  const marque = QS('#chrome .marque');
  const lueur = QS('.hero-lueur', hero);
  const suite = ['[data-hero="sur"]', '[data-hero="texte"]', '[data-hero="actions"]', '[data-hero="une"]', '[data-hero="pied"]'].map((s) => QS(s, hero)).filter(Boolean);
  const deja = sessionStorage.getItem('arcep-intro') === '1';
  const logo = intro ? QS('img', intro) : null;

  let lignes = null;
  if (SplitText && titre) {
    lignes = SplitText.create(titre, { type: 'lines', mask: 'lines', linesClass: 'ligne' });
    titre.classList.add('pret');
    gsap.set(lignes.lines, { yPercent: 110 });
  }

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (logo && !deja) {
    if (marque) gsap.set(marque, { opacity: 0 });
    tl.fromTo(logo, { scale: .82, opacity: 0, filter: 'blur(16px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.2 });
    if (lueur) tl.fromTo(lueur, { scale: .3, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6 }, '-=.9');
    tl.to({}, { duration: .35 })
      .add(() => {
        /* Le logo rejoint sa place dans l'en-tête, puis lui cède. */
        if (!marque) { intro.remove(); return; }
        const de = logo.getBoundingClientRect();
        const vers = marque.getBoundingClientRect();
        const k = vers.height / de.height;
        gsap.to(logo, {
          x: vers.left + vers.width / 2 - (de.left + de.width / 2),
          y: vers.top + vers.height / 2 - (de.top + de.height / 2),
          scale: k, duration: 1.1, ease: 'expo.inOut',
          onComplete: () => { gsap.set(marque, { opacity: 1 }); intro.remove(); },
        });
      })
      .to({}, { duration: .9 });
    sessionStorage.setItem('arcep-intro', '1');
  } else {
    if (intro) intro.remove();
    if (lueur) tl.fromTo(lueur, { scale: .5, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4 });
  }
  tl.add(() => hero.classList.add('pret'), deja ? 0 : '-=.6');
  if (lignes) tl.to(lignes.lines, { yPercent: 0, duration: 1.2, stagger: .09 }, '-=.5');
  else if (titre) tl.fromTo(titre, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 }, '-=.5');
  tl.fromTo(suite, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .09 }, '-=.9');
}

/* ---------- Le réseau ---------- */
function reseau(canvas, hero) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  let L = 0, H = 0, noeuds = [], signaux = [], actif = false, boucle = 0, souris = { x: -1e4, y: -1e4 };
  const N = () => Math.min(90, Math.round((L * H) / 16000));
  const PORTEE = () => Math.max(120, Math.min(210, L / 8));

  const couleurs = ['111, 211, 154', '63, 169, 245', '226, 179, 54'];

  const dimensionner = () => {
    const r = hero.getBoundingClientRect();
    L = Math.round(r.width); H = Math.round(r.height);
    canvas.width = Math.round(L * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = L + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = N();
    noeuds = Array.from({ length: n }, (_, i) => ({
      x: Math.random() * L, y: Math.random() * H,
      vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18,
      r: 1 + Math.random() * 1.6, c: couleurs[i % 3 === 0 ? 2 : i % 2],
    }));
    signaux = [];
  };

  const dessiner = () => {
    ctx.clearRect(0, 0, L, H);
    const portee = PORTEE();
    for (const n of noeuds) {
      n.x += n.vx; n.y += n.vy;
      const dx = souris.x - n.x, dy = souris.y - n.y, d = Math.hypot(dx, dy);
      if (d < 220 && d > 0) { n.x -= dx / d * .25; n.y -= dy / d * .25; }
      if (n.x < -20) n.x = L + 20; else if (n.x > L + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < noeuds.length; i++) {
      const a = noeuds[i];
      for (let j = i + 1; j < noeuds.length; j++) {
        const b = noeuds[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) > portee || Math.abs(dy) > portee) continue;
        const d = Math.hypot(dx, dy);
        if (d > portee) continue;
        const f = 1 - d / portee;
        ctx.strokeStyle = `rgba(${a.c}, ${(f * .28).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        if (signaux.length < 6 && Math.random() < .0009) signaux.push({ a, b, t: 0, c: a.c });
      }
    }
    for (const n of noeuds) {
      ctx.fillStyle = `rgba(${n.c}, .75)`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
    /* Les signaux : une pulsation qui parcourt une liaison, puis s'éteint. */
    for (const s of signaux) {
      s.t += .012;
      const x = s.a.x + (s.b.x - s.a.x) * s.t, y = s.a.y + (s.b.y - s.a.y) * s.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
      g.addColorStop(0, `rgba(${s.c}, .9)`); g.addColorStop(1, `rgba(${s.c}, 0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    }
    signaux = signaux.filter((s) => s.t < 1);
    if (actif) boucle = requestAnimationFrame(dessiner);
  };

  const demarrer = () => { if (!actif) { actif = true; boucle = requestAnimationFrame(dessiner); } };
  const arreter = () => { actif = false; cancelAnimationFrame(boucle); boucle = 0; };

  dimensionner();
  new IntersectionObserver(([en]) => (en.isIntersecting ? demarrer() : arreter()), { threshold: .05 }).observe(hero);
  window.addEventListener('resize', dimensionner);
  hero.addEventListener('pointermove', (ev) => { const r = canvas.getBoundingClientRect(); souris = { x: ev.clientX - r.left, y: ev.clientY - r.top }; }, { passive: true });
  hero.addEventListener('pointerleave', () => { souris = { x: -1e4, y: -1e4 }; });
  document.addEventListener('visibilitychange', () => (document.hidden ? arreter() : demarrer()));
}
