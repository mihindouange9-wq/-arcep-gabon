// HTML restreint des corps d'article : p, h2-h4, ul, ol, li, strong, em, a (http, https ou chemin du site), img (chemin du site), br, blockquote.
// Nettoyé à l'écriture et au rendu.

const BALISES = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'img', 'br', 'blockquote']);
const VIDES = new Set(['img', 'br']);
const RENOMMAGES = { b: 'strong', i: 'em', h1: 'h2', h5: 'h4', h6: 'h4' };

const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const adresseSure = (v, imageSeulement = false) => {
  const s = String(v || '').trim();
  if (!s) return '';
  if (imageSeulement) return /^\/[^/\\]/.test(s) && !/[\x00-\x1f]/.test(s) ? s : '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/[^/\\]/.test(s)) return s;
  return '';
};

// Entités
const ENTITES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', auml: 'ä', ccedil: 'ç',
  icirc: 'î', iuml: 'ï', ocirc: 'ô', ouml: 'ö', ugrave: 'ù', ucirc: 'û', uuml: 'ü', oelig: 'œ', aelig: 'æ', yuml: 'ÿ',
  Eacute: 'É', Egrave: 'È', Ecirc: 'Ê', Agrave: 'À', Acirc: 'Â', Ccedil: 'Ç', Icirc: 'Î', Ocirc: 'Ô', Ugrave: 'Ù', Ucirc: 'Û', OElig: 'Œ',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', ndash: '–', mdash: '—',
  euro: '€', deg: '°', middot: '·', bull: '•', copy: '©', reg: '®', trade: '™', times: '×', frac12: '½', sup2: '²', sup3: '³', ordm: 'º', ordf: 'ª',
};
export function decoderEntites(texte) {
  return String(texte || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+\d*);/g, (m, n) => (n in ENTITES ? ENTITES[n] : m));
}

// Nettoyage
// Balises inconnues retirées (contenu conservé), attributs limités à href, src et alt, balises refermées dans l'ordre.
export function nettoyer(html) {
  const source = String(html || '');
  const pile = [];
  let sortie = '';
  const motif = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|[^<]+|</g;
  let m;
  while ((m = motif.exec(source))) {
    const bloc = m[0];
    if (bloc.startsWith('<!--')) continue;
    if (bloc === '<') { sortie += '&lt;'; continue; }
    if (!m[1]) { sortie += echapper(decoderEntites(bloc)); continue; }
    let nom = m[1].toLowerCase();
    nom = RENOMMAGES[nom] || nom;
    const fermante = bloc.startsWith('</');
    if (nom === 'script' || nom === 'style') {
      // contenu de script/style : sauté
      const fin = source.indexOf(`</${m[1]}`, motif.lastIndex);
      if (!fermante && fin >= 0) motif.lastIndex = source.indexOf('>', fin) + 1;
      continue;
    }
    if (!BALISES.has(nom)) continue;
    if (fermante) {
      const i = pile.lastIndexOf(nom);
      if (i < 0) continue;
      while (pile.length > i) sortie += `</${pile.pop()}>`;
      continue;
    }
    const attributs = m[2] || '';
    const lire = (a) => (new RegExp(`\\b${a}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attributs) || [])[2] ?? (new RegExp(`\\b${a}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attributs) || [])[3] ?? (new RegExp(`\\b${a}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attributs) || [])[4] ?? '';
    if (nom === 'a') {
      const href = adresseSure(decoderEntites(lire('href')));
      if (!href) continue;   // un lien sans adresse sûre devient du texte
      sortie += `<a href="${echapper(href)}"${/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : ''}>`;
      pile.push('a');
      continue;
    }
    if (nom === 'img') {
      const src = adresseSure(decoderEntites(lire('src')), true);
      if (!src) continue;
      sortie += `<img src="${echapper(src)}" alt="${echapper(decoderEntites(lire('alt')))}" loading="lazy" decoding="async">`;
      continue;
    }
    if (VIDES.has(nom)) { sortie += `<${nom}>`; continue; }
    sortie += `<${nom}>`;
    pile.push(nom);
  }
  while (pile.length) sortie += `</${pile.pop()}>`;
  // Paragraphes vides et nbsp orphelins.
  // \s couvre déjà l'espace insécable : le répéter dans l'alternative rend la regex catastrophique.
  return sortie.replace(/<p>\s*(?:&nbsp;\s*)*<\/p>/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

export const contientHtml = (texte) => /<\s*(p|ul|ol|h[1-6]|blockquote|img|strong|em|a)\b/i.test(String(texte || ''));

// HTML restreint si présent, sinon texte simple en paragraphes.
export function corpsArticle(texte, paragraphes) {
  return contientHtml(texte) ? nettoyer(texte) : paragraphes(texte);
}
