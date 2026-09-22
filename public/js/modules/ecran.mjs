/* ARCEP Gabon — l'iPhone.
   Le téléphone entre, se redresse, se rapproche jusqu'à occuper la scène, puis se retire,
   pendant que le climat de la scène glisse du vert forêt au blanc. Son écran joue une
   vidéo du site mobile, enregistrée au format réel de l'appareil et qui défile lentement
   de page en page ; elle ne joue que lorsque le téléphone est dans le champ. */
import { QS, QSA, gsap, pret, reduit, mobile } from './socle.mjs';
import { tonalite } from './chrome.mjs';

const CLIMATS = [
  ['#0a2a1a', '#0f3d25'], ['#0f3d25', '#1e7f4c'], ['#1e7f4c', '#12244a'], ['#12244a', '#3fa9f5'],
  ['#2b86c4', '#c9982a'], ['#e2b336', '#f6dc8a'], ['#fbf1cf', '#ffffff'],
];

export function demarrerEcran() {
  const section = QS('.ecran');
  if (!section) return;
  const iphone = QS('.iphone', section);
  const video = QS('[data-iphone-video]', section);
  const texte = QS('.ecran-texte', section);
  const etapes = QSA('.ecran-etapes li', section);
  if (!iphone) return;

  /* ---- La vidéo : lecture dans le champ, pages marquées au fil du temps ---- */
  if (video) {
    let segments = [];
    fetch('/assets/iphone-defilement.json').then((r) => (r.ok ? r.json() : [])).then((s) => { segments = Array.isArray(s) ? s : []; }).catch(() => {});
    const obs = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { if (video.preload === 'none') video.preload = 'auto'; video.play().catch(() => {}); }
      else video.pause();
    }, { threshold: .1 });
    obs.observe(section);
    video.addEventListener('timeupdate', () => {
      if (!segments.length || !etapes.length) return;
      let courant = segments[0];
      for (const s of segments) if (video.currentTime >= s.debut) courant = s;
      for (const li of etapes) li.toggleAttribute('aria-current', li.dataset.etape === courant.route);
    });
  }

  if (!pret || reduit() || mobile()) {
    if (pret && !reduit()) {
      gsap.fromTo(iphone, { y: 80, opacity: 0, rotateX: 12 }, { y: 0, opacity: 1, rotateX: 0, duration: 1.4, scrollTrigger: { trigger: section, start: 'top 70%', once: true } });
    }
    return;
  }

  const base = () => iphone.getBoundingClientRect().height / (Number(gsap.getProperty(iphone, 'scale')) || 1);
  const centrer = () => {
    const r = iphone.getBoundingClientRect();
    return window.innerWidth / 2 - (r.left + r.width / 2) + Number(gsap.getProperty(iphone, 'x') || 0);
  };
  const echelle = () => Math.min(2.1, (window.innerHeight * .92) / base());

  /* La scène reste collée par CSS (position: sticky) pendant que la section, plus haute,
     défile : le téléphone n'est jamais déplacé dans le document. */
  section.classList.add('ecran--cinema');
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: .8, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const clair = self.progress > .74;
        section.classList.toggle('ecran--clair', clair);
        if (self.isActive) tonalite(clair ? 'clair' : 'sombre');
      },
    },
  });
  tl.fromTo(iphone, { y: '80vh', scale: .5, rotateX: 26, rotateZ: -7, opacity: .6 }, { y: 0, scale: 1, rotateX: 0, rotateZ: 0, opacity: 1, duration: 1.2, ease: 'none' })
    .to(texte, { opacity: 0, y: -40, duration: .35, ease: 'none' }, '+=.15')
    .to(iphone, { scale: () => echelle(), x: () => centrer(), duration: .8, ease: 'none' }, '<')
    .to({}, { duration: 2.2 })
    .to(iphone, { scale: 1, x: 0, duration: .8, ease: 'none' })
    .to(texte, { opacity: 1, y: 0, duration: .35, ease: 'none' }, '<+=.3');

  /* Le climat : sept paliers, du vert forêt au blanc. */
  const climat = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
  CLIMATS.slice(1).forEach(([a, b]) => climat.to(section, { '--a': a, '--b': b, duration: 1, ease: 'none' }));
}
