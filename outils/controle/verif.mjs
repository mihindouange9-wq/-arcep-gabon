/* ARCEP Gabon — batterie de vérification du site servi.
   Le site n'est plus une page de fichiers : il est rendu par serveur/index.mjs. Cet outil
   attaque donc une adresse http, pas un chemin de disque.

   node outils/controle/verif.mjs [base] [--captures]

   Ce qu'il contrôle, page par page :
     1. le code de réponse et l'absence d'erreur de console ou de ressource ;
     2. le débordement horizontal, à neuf largeurs de 360 à 1920 ;
     3. l'état final des révélations après un défilement complet — rien ne doit rester
        invisible si le script a échoué à poser sa classe ;
     4. le contraste de chaque texte sur son fond réel (WCAG AA).

   Piège d'expérience, consigné ici pour la prochaine fois : en mode « headless », aucune
   image n'est produite tant qu'on ne demande pas de capture. Les transitions restent donc
   figées à leur état de départ. Chaque pas de défilement est suivi d'une capture jetée,
   sans quoi le contrôle des révélations échoue toujours. */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as attendre } from 'node:timers/promises';

const BASE = (process.argv[2] && process.argv[2].startsWith('http')) ? process.argv[2] : 'http://127.0.0.1:4310';
const CAPTURES = process.argv.includes('--captures');
const SORTIE = 'outils/captures';

/* La dernière colonne dit le code de réponse attendu : la page d'erreur répond 404, et
   Chrome le consigne comme une erreur de ressource. Ce n'est pas une anomalie. */
const PAGES = [
  ['accueil', '/'],
  ['autorite', '/autorite'],
  ['missions', '/missions'],
  ['observatoire', '/observatoire'],
  ['reglementation', '/reglementation'],
  ['actualites', '/actualites'],
  ['article', '/actualites/115'],
  ['consommateurs', '/consommateurs'],
  ['contact', '/contact'],
  ['mentions', '/mentions-legales'],
  ['introuvable', '/page-inexistante', 404],
  ['admin', '/admin'],
];

const LARGEURS = [360, 390, 414, 768, 834, 1024, 1280, 1440, 1920];

/* ======================= CLIENT CDP ======================= */
async function ouvrirChrome() {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profil = `${process.env.TEMP || 'C:/Temp'}/chrome-arcep-${port}-${Date.now()}`;
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`,
    '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' });

  let cible = null;
  for (let essai = 0; essai < 60 && !cible; essai++) {
    await attendre(250);
    try {
      const liste = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      cible = liste.find((t) => t.type === 'page');
    } catch { /* Chrome n'écoute pas encore */ }
  }
  if (!cible) { chrome.kill(); throw new Error('Chrome injoignable sur le port ' + port); }

  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });

  let numero = 0;
  const attentes = new Map();
  const ecouteurs = [];
  ws.onmessage = (message) => {
    const trame = JSON.parse(message.data);
    if (trame.id && attentes.has(trame.id)) { attentes.get(trame.id)(trame); attentes.delete(trame.id); }
    else if (trame.method) for (const e of ecouteurs) e(trame);
  };
  const envoyer = (methode, params = {}) => new Promise((ok) => {
    const id = ++numero;
    attentes.set(id, ok);
    ws.send(JSON.stringify({ id, method: methode, params }));
  });

  return {
    envoyer,
    ecouter: (fn) => ecouteurs.push(fn),
    fermer: () => { try { ws.close(); } catch { /* déjà fermé */ } chrome.kill(); },
    port,
  };
}

/* Évalue une expression dans la page et rend la valeur, ou lève si la page a jeté. */
async function evaluer(cdp, expression) {
  const r = await cdp.envoyer('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error('expression : ' + (r.result.exceptionDetails.exception?.description || 'erreur'));
  }
  return r.result?.result?.value;
}

/* ======================= SONDES INJECTÉES ======================= */
/* Écrites en chaînes : elles s'exécutent dans la page, pas ici. */

const SONDE_DEBORDEMENT = `(() => {
  const large = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const fautifs = [];
  const bord = window.innerWidth + 1;
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    /* Un élément entièrement sorti par la gauche est un retrait volontaire — le champ
       piège du formulaire de contact, par exemple — et non un débordement. */
    if (s.position === 'absolute' && r.right < 0) continue;
    if (r.right > bord || r.left < -1) {
      /* Un élément n'est en débordement que si rien, au-dessus de lui, ne le rogne. Il faut
         donc remonter toute la chaîne des ancêtres : se contenter du parent immédiat
         signalait à tort l'onde décorative du pied, rognée deux niveaux plus haut. */
      let rogne = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const sa = getComputedStyle(a);
        if (sa.overflowX !== 'visible' || sa.overflowY !== 'visible' || sa.clipPath !== 'none') { rogne = true; break; }
      }
      if (rogne) continue;
      fautifs.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\\s+/).join('.') : '')
        + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
    }
  }
  return { large, fautifs: fautifs.slice(0, 6) };
})()`;

const SONDE_REVELATIONS = `(() => {
  const restes = [];
  /* Tout ce qui porte un état d'entrée doit avoir fini d'apparaître : opacité pleine, et
     aucune ligne de titre encore décalée dans son masque. */
  for (const el of document.querySelectorAll('[data-reveler], [data-serie] > *, [data-hero], .ligne')) {
    const r = el.getBoundingClientRect();
    if (r.height === 0 && r.width === 0) continue;
    if (el.closest('.mots-pile') || el.closest('.ecran-texte')) continue;
    const s = getComputedStyle(el);
    if (parseFloat(s.opacity) < 0.95) { restes.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' opacité ' + s.opacity); continue; }
    if (el.classList.contains('ligne') && s.transform !== 'none') {
      const m = /matrix(([^)]+))/.exec(s.transform);
      if (m && Math.abs(parseFloat(m[1].split(',')[5])) > 1) restes.push('ligne décalée ' + el.textContent.trim().slice(0, 30));
    }
  }
  return restes.slice(0, 8);
})()`;

/* Contraste : on remonte la pile des fonds jusqu'à trouver une couleur opaque, on calcule
   le rapport WCAG et on ne signale que ce qui passe sous le seuil applicable. */
const SONDE_CONTRASTE = `(() => {
  const lire = (c) => {
    const m = c.match(/[\\d.]+/g);
    if (!m) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
  };
  const canal = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b);
  const melange = (avant, arriere) => ({
    r: avant.r * avant.a + arriere.r * (1 - avant.a),
    g: avant.g * avant.a + arriere.g * (1 - avant.a),
    b: avant.b * avant.a + arriere.b * (1 - avant.a),
    a: 1,
  });
  const fond = (el) => {
    let pile = [];
    for (let n = el; n; n = n.parentElement) {
      const c = lire(getComputedStyle(n).backgroundColor);
      if (!c || c.a === 0) continue;
      pile.push(c);
      if (c.a === 1) break;
    }
    if (!pile.length) return { r: 255, g: 255, b: 255, a: 1 };
    let base = pile.pop();
    while (pile.length) base = melange(pile.pop(), base);
    return base;
  };

  const vus = new Set();
  const echecs = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.firstChild) continue;
    let texte = '';
    for (const n of el.childNodes) if (n.nodeType === 3) texte += n.nodeValue;
    if (!texte.trim()) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    const devant = lire(s.color);
    if (!devant) continue;
    const derriere = fond(el);
    const couleur = devant.a < 1 ? melange(devant, derriere) : devant;
    const a = lum(couleur), b = lum(derriere);
    const rapport = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

    const taille = parseFloat(s.fontSize);
    const gras = parseInt(s.fontWeight, 10) >= 700;
    const seuil = (taille >= 24 || (taille >= 18.66 && gras)) ? 3 : 4.5;
    if (rapport >= seuil) continue;

    const cle = s.color + '|' + JSON.stringify(derriere) + '|' + seuil;
    if (vus.has(cle)) continue;
    vus.add(cle);
    echecs.push({
      rapport: +rapport.toFixed(2), seuil,
      couleur: s.color,
      fond: 'rgb(' + [derriere.r, derriere.g, derriere.b].map(Math.round).join(',') + ')',
      taille: Math.round(taille),
      exemple: texte.trim().slice(0, 44),
      ou: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
    });
  }
  return echecs;
})()`;

/* ======================= DÉROULÉ ======================= */
const anomalies = [];
const signaler = (page, largeur, sujet, detail) => {
  anomalies.push({ page, largeur, sujet, detail });
  console.log(`  ✗ ${sujet} — ${detail}`);
};

const cdp = await ouvrirChrome();
await cdp.envoyer('Page.enable');
await cdp.envoyer('Runtime.enable');
await cdp.envoyer('Log.enable');
await cdp.envoyer('Network.enable');

let journal = [];
cdp.ecouter((trame) => {
  if (trame.method === 'Runtime.exceptionThrown') {
    journal.push('exception : ' + (trame.params.exceptionDetails?.exception?.description
      || trame.params.exceptionDetails?.text || 'inconnue'));
  }
  if (trame.method === 'Runtime.consoleAPICalled' && trame.params.type === 'error') {
    journal.push('console : ' + trame.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
  if (trame.method === 'Log.entryAdded' && trame.params.entry.level === 'error') {
    journal.push('log : ' + trame.params.entry.text + ' ' + (trame.params.entry.url || ''));
  }
  if (trame.method === 'Network.loadingFailed' && !trame.params.canceled) {
    journal.push('ressource : ' + trame.params.errorText + ' (' + trame.params.type + ')');
  }
});

async function aller(url, largeur, hauteur) {
  journal = [];
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', {
    width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: largeur < 820,
  });
  await cdp.envoyer('Page.navigate', { url });
  await attendre(900);
  /* Une capture jetée : elle force la production d'images, donc le jeu des transitions. */
  await cdp.envoyer('Page.captureScreenshot', { format: 'png' });
  await attendre(700);
}

if (CAPTURES) await mkdir(SORTIE, { recursive: true });

console.log(`\nARCEP — vérification de ${BASE}\n${'='.repeat(52)}`);

for (const [nom, chemin, statut = 200] of PAGES) {
  const url = BASE + chemin;
  console.log(`\n${nom}  ${chemin}`);

  /* ---- 1. largeur de référence : console, révélations, contraste ---- */
  const attendu = statut === 200 ? null : new RegExp(`status of ${statut}`);
  const propre = (ligne) => !(attendu && attendu.test(ligne));

  await aller(url, 1440, 900);
  await attendre(4200);   // la séquence d'entrée du hero
  for (const ligne of journal.filter(propre)) signaler(nom, 1440, 'console', ligne);

  /* Défilement complet, une capture par palier pour que les transitions se jouent. */
  const hauteurTotale = await evaluer(cdp, 'document.documentElement.scrollHeight');
  for (let y = 0; y < hauteurTotale; y += 500) {
    await evaluer(cdp, `window.scrollTo(0, ${y})`);
    await cdp.envoyer('Page.captureScreenshot', { format: 'png' });
    await attendre(120);
  }
  await attendre(1300);

  const restes = await evaluer(cdp, SONDE_REVELATIONS);
  for (const reste of restes) signaler(nom, 1440, 'révélation bloquée', reste);

  await evaluer(cdp, 'window.scrollTo(0, 0)');
  await attendre(400);
  const contrastes = await evaluer(cdp, SONDE_CONTRASTE);
  for (const c of contrastes) {
    signaler(nom, 1440, 'contraste',
      `${c.rapport} < ${c.seuil} · ${c.ou} ${c.taille}px · ${c.couleur} sur ${c.fond} · « ${c.exemple} »`);
  }
  if (!restes.length && !contrastes.length && !journal.filter(propre).length) console.log('  ✓ console, révélations, contraste');

  /* ---- 2. débordement à toutes les largeurs ---- */
  const ennuis = [];
  for (const largeur of LARGEURS) {
    await aller(url, largeur, largeur < 820 ? 780 : 900);
    const { large, fautifs } = await evaluer(cdp, SONDE_DEBORDEMENT);
    if (large > 1) ennuis.push(`${largeur}px : page ${large}px trop large`);
    for (const f of fautifs) ennuis.push(`${largeur}px : ${f}`);
    for (const ligne of journal.filter(propre)) signaler(nom, largeur, 'console', ligne);
  }
  for (const e of ennuis) signaler(nom, 0, 'débordement', e);
  if (!ennuis.length) console.log(`  ✓ aucun débordement de 360 à 1920`);

  /* ---- 3. captures ---- */
  if (CAPTURES) {
    for (const [suffixe, largeur, hauteur] of [['bureau', 1440, 900], ['mobile', 390, 780]]) {
      await aller(url, largeur, hauteur);
      await evaluer(cdp, 'window.scrollTo(0, 0)');
      await attendre(1500);
      const { data } = (await cdp.envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).result;
      await writeFile(`${SORTIE}/${nom}-${suffixe}.png`, Buffer.from(data, 'base64'));
    }
  }
}

cdp.fermer();

console.log(`\n${'='.repeat(52)}`);
if (!anomalies.length) console.log('Aucune anomalie sur les ' + PAGES.length + ' pages.\n');
else {
  console.log(`${anomalies.length} anomalie(s) :`);
  const parSujet = {};
  for (const a of anomalies) (parSujet[a.sujet] ||= []).push(a);
  for (const [sujet, liste] of Object.entries(parSujet)) console.log(`  ${sujet} : ${liste.length}`);
  console.log('');
  process.exitCode = 1;
}
