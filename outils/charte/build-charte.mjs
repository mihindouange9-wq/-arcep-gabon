// Compose charte/index.html, la charte de marque : une planche 16:9 par page.
// Les couleurs viennent de charte/palette-logo.json (mesure du logo par palette-logo.mjs).
// node outils/charte/build-charte.mjs
import { readFileSync, writeFileSync } from 'node:fs';

// Palette mesurée sur le logo
const mesures = JSON.parse(readFileSync('charte/palette-logo.json', 'utf8'));
const trouver = (hex) => mesures.find((m) => m.hex.toLowerCase() === hex.toLowerCase()) || null;

const MARQUE = [
  { hex: '#175b31', nom: 'Vert Régulation', role: 'Couleur primaire. Signature, aplats institutionnels, titres sur fond clair.' },
  { hex: '#24798e', nom: 'Bleu Pétrole', role: 'Couleur secondaire. Données, tableaux, repères techniques.' },
  { hex: '#459447', nom: 'Vert Signal', role: 'Appui vivant. Traits, jauges, éléments actifs.' },
  { hex: '#235272', nom: 'Bleu Institution', role: 'Appui sobre. Documents officiels, seconde profondeur.' },
  { hex: '#182e55', nom: 'Bleu Nuit', role: 'Fonds sombres alternatifs, couvertures de rapport.' },
  { hex: '#e2b336', nom: 'Or Gabon', role: 'Accent rare, repris de la flèche. Jamais plus de 5 % d’une surface.' },
  { hex: '#1a1819', nom: 'Noir Encre', role: 'Texte principal, mot « ARCEP » de la signature.' },
  { hex: '#c7dbda', nom: 'Gris Perle', role: 'Fonds clairs, aplats de repos, séparations.' },
];

const DERIVES = [
  { hex: '#0d3520', nom: 'Vert Profond', role: 'Nuance foncée du primaire. Fonds de couverture et de signalétique.' },
  { hex: '#5fbf65', nom: 'Vert Clair', role: 'Nuance claire du signal. Libellés sur fond sombre, où le vert signal manque de contraste.' },
];

const SOMMAIRE = [
  'Le cadre de cette charte', 'Les quatre principes',
  'La signature', 'Construction et protection',
  'Tailles minimales', 'Déclinaisons monochromes',
  'Fonds autorisés', 'Usages à proscrire',
  'Cosignature', 'La palette de marque',
  'Références d’impression', 'Répartition des couleurs',
  'Les trois familles typographiques', 'Hiérarchie éditoriale',
  'Règles du français', 'Le territoire graphique',
  'Iconographie', 'Photographie',
  'Ton de voix', 'Papeterie',
  'Supports numériques', 'Signalétique',
  'Ce qui ne se négocie pas',
];

const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Contraste
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [h, l] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (h + 0.05) / (l + 0.05);
};
const cmjn = (hex) => {
  const m = trouver(hex);
  if (m) return m.cmjn.join(' / ');
  const [r, v, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const n = 1 - Math.max(r, v, b);
  if (n >= 1) return '0 / 0 / 0 / 100';
  return [(1 - r - n) / (1 - n), (1 - v - n) / (1 - n), (1 - b - n) / (1 - n), n]
    .map((x) => Math.round(x * 100)).join(' / ');
};
const rvb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');

// Motif d'onde dérivé de l'arc du logo
const onde = (opacite = 1, couleur = '#5fbf65') => `
      <svg viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
        ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M-120 ${700 + i * 26} C 220 ${420 - i * 52} 620 ${330 - i * 46} 1320 ${120 - i * 30}" stroke="${couleur}" stroke-width="${1.4 - i * 0.12}" opacity="${(opacite * (1 - i * 0.13)).toFixed(2)}"/>`).join('\n        ')}
      </svg>`;

let numero = 0;
const planche = ({ titre, sombre = false, corps }) => {
  numero++;
  return `
  <section class="page${sombre ? ' page--sombre' : ''}">
    <header class="entete-planche">
      <span>${e(titre)}</span>
      <span class="doc">ARCEP Gabon · Charte de marque</span>
    </header>
    <div class="corps">
${corps}
    </div>
    <footer class="pied-planche">
      <span>Proposition d’identité — Méthode Aura</span>
      <span>${String(numero).padStart(2, '0')}</span>
    </footer>
  </section>`;
};

const planches = [];

// 01 Couverture
numero++;
planches.push(`
  <section class="page couverture">
    <div class="onde" aria-hidden="true">${onde(0.85)}</div>
    <div class="bloc">
      <img src="img/master-logo-blanc.png" alt="ARCEP Gabon">
      <span class="filet"></span>
      <p class="titre">Charte de marque</p>
      <p class="sous">Autorité de Régulation des Communications Électroniques et des Postes<br>République gabonaise</p>
    </div>
    <p class="coin coin--g">Conçu par<br>Méthode Aura</p>
    <p class="coin coin--d">Septembre 2026<br>Version 1</p>
  </section>`);

// 02 Sommaire
planches.push(planche({
  titre: 'Sommaire',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Ce document</span>
          <h2>Une marque,<br>des règles tenues</h2>
          <p style="margin-top:16px">Vingt-trois planches qui fixent ce que l’ARCEP montre d’elle-même : sa signature, ses couleurs, ses caractères, son territoire graphique et son ton.</p>
        </div>
        <div>
          <div class="sommaire">
            ${SOMMAIRE.map((t, i) => `<div><span class="n">${String(i + 3).padStart(2, '0')}</span><span class="t">${e(t)}</span></div>`).join('\n            ')}
          </div>
        </div>
      </div>`,
}));

// 03 Cadre
planches.push(planche({
  titre: 'Le cadre',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Statut du document</span>
          <h2>Ce que cette charte<br>engage, et ce qu’elle laisse</h2>
        </div>
        <div>
          <p class="chapo">Cette charte définit l’image de l’ARCEP au-delà de tout support. Elle vaut pour le papier, l’écran, la signalétique, les tenues, les véhicules et les prises de parole.</p>
          <p style="margin-top:15px"><b>Elle engage</b> la signature et ses déclinaisons, la palette, les caractères, le territoire graphique, le ton. Ces éléments ne se renégocient pas support par support : c’est leur constance qui fait la marque.</p>
          <p style="margin-top:12px"><b>Elle laisse libres</b> la composition, le rythme éditorial et le choix des images, tant que les règles ci-après sont tenues.</p>
          <p style="margin-top:12px"><b>Elle se met à jour</b> par avenant daté. Toute dérogation s’écrit, se motive et se date.</p>
          <p style="margin-top:16px;font-family:var(--mono);font-size:11.5px;line-height:1.7;color:var(--gris)">Document soumis à la validation de l’Autorité.<br>Les couleurs de la marque ont été mesurées sur le logo officiel.</p>
        </div>
      </div>`,
}));

// 04 Principes
planches.push(planche({
  titre: 'Les principes',
  sombre: true,
  corps: `
      <span class="etiquette">Fondements</span>
      <h2 style="margin-bottom:24px">Quatre principes gouvernent<br>toutes les décisions visuelles</h2>
      <div class="principes">
        <div class="principe">
          <span class="n">01</span>
          <h3>Autorité</h3>
          <p>Une institution qui arbitre ne se raconte pas : elle se tient. Formes nettes, aplats francs, aucune fioriture.</p>
        </div>
        <div class="principe">
          <span class="n">02</span>
          <h3>Clarté</h3>
          <p>Un régulateur publie des textes, des chiffres et des décisions. Tout doit se lire vite et sans ambiguïté.</p>
        </div>
        <div class="principe">
          <span class="n">03</span>
          <h3>Technicité</h3>
          <p>Le secteur est technique et le montre : grilles régulières, données lisibles, vocabulaire graphique de la mesure.</p>
        </div>
        <div class="principe">
          <span class="n">04</span>
          <h3>Ouverture</h3>
          <p>L’Autorité connecte le Gabon au monde. La couleur et l’onde disent ce mouvement vers l’extérieur.</p>
        </div>
      </div>`,
}));

// 05 Signature
planches.push(planche({
  titre: 'La signature',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Version principale</span>
          <h2>La signature<br>ne se redessine pas</h2>
          <p style="margin-top:15px">Le sigle, l’arc, la flèche et la mention « GABON » forment un ensemble solidaire. Aucun élément ne se déplace, ne se retire ni ne s’utilise seul.</p>
          <p style="margin-top:12px">Le fichier de référence est le master vectoriel détenu par l’Autorité. Les fichiers bitmap fournis avec cette charte servent au contrôle, pas à la reproduction en grand format.</p>
        </div>
        <div>
          <div class="cadre-logo"><img src="img/master-logo-couleur.png" alt=""></div>
          <p style="font-family:var(--mono);font-size:10.5px;line-height:1.7;color:var(--gris);margin-top:11px">Signature couleur sur fond clair — usage par défaut</p>
        </div>
      </div>`,
}));

// 06 Construction
planches.push(planche({
  titre: 'Construction',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Zone de protection</span>
          <h2>Un module,<br>et tout en découle</h2>
          <p style="margin-top:15px">Le module <b>x</b> est la hauteur de la mention « GABON ». La zone de protection vaut <b>2x</b> sur les quatre côtés. Aucun texte, aucun filet, aucune image n’y pénètre.</p>
          <p style="margin-top:12px">Dans un angle de page, la signature respecte cette même zone par rapport au bord du support.</p>
        </div>
        <div>
          <div class="cadre-logo">
            <span class="zone" style="inset:30px"></span>
            <img src="img/master-logo-couleur.png" style="width:270px">
            <span class="cote" style="left:50%;top:9px;transform:translateX(-50%)">2x</span>
            <span class="cote" style="left:9px;top:50%;transform:translateY(-50%)">2x</span>
          </div>
          <p style="font-family:var(--mono);font-size:10.5px;line-height:1.7;color:var(--gris);margin-top:11px">x = hauteur des capitales de « GABON »</p>
        </div>
      </div>`,
}));

// 07 Tailles
planches.push(planche({
  titre: 'Tailles minimales',
  corps: `
      <span class="etiquette">Seuils de lisibilité</span>
      <h2 style="margin-bottom:26px">En dessous de ces tailles,<br>la signature n’est plus lisible</h2>
      <div class="tailles">
        <div class="taille"><img src="img/master-logo-couleur.png" style="width:240px"><span class="n">Papeterie et rapports<br><b>45 mm</b> de large</span></div>
        <div class="taille"><img src="img/master-logo-couleur.png" style="width:150px"><span class="n">Cartes et petits formats<br><b>28 mm</b> de large</span></div>
        <div class="taille"><img src="img/master-logo-couleur.png" style="width:96px"><span class="n">Minimum absolu, impression<br><b>24 mm</b> de large</span></div>
        <div class="taille"><img src="img/master-logo-couleur.png" style="width:120px"><span class="n">Minimum absolu, écran<br><b>120 px</b> de large</span></div>
      </div>
      <p style="margin-top:24px">En dessous de ces seuils, la mention « GABON » se ferme et l’arc se brouille. Pour les très petits formats — favicon, avatar, badge — utiliser l’icône carrée fournie, jamais la signature réduite.</p>`,
}));

// 08 Monochromes
planches.push(planche({
  titre: 'Déclinaisons',
  corps: `
      <span class="etiquette">Monochromes</span>
      <h2 style="margin-bottom:24px">Quatre déclinaisons, pas une de plus</h2>
      <div class="grille-versions">
        <div class="version">
          <div class="vue" style="background:var(--blanc)"><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="nom">Couleur</p>
          <p class="mot">Usage par défaut, sur blanc ou gris perle.</p>
        </div>
        <div class="version">
          <div class="vue" style="background:var(--blanc)"><img src="img/logo-vert-profond.png" alt=""></div>
          <p class="nom">Monochrome vert</p>
          <p class="mot">Impression une couleur, tampons, gravure.</p>
        </div>
        <div class="version">
          <div class="vue" style="background:var(--blanc)"><img src="img/logo-noir.png" alt=""></div>
          <p class="nom">Monochrome noir</p>
          <p class="mot">Télécopie, photocopie, presse noir et blanc.</p>
        </div>
        <div class="version">
          <div class="vue" style="background:var(--vert-sombre)"><img src="img/master-logo-blanc.png" alt=""></div>
          <p class="nom">Blanc</p>
          <p class="mot">Tout fond sombre ou photographie foncée.</p>
        </div>
      </div>`,
}));

// 09 Fonds
planches.push(planche({
  titre: 'Fonds autorisés',
  corps: `
      <span class="etiquette">Lisibilité</span>
      <h2 style="margin-bottom:24px">La version suit le fond, jamais l’inverse</h2>
      <div class="grille-versions">
        <div class="version">
          <div class="vue" style="background:var(--blanc)"><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="nom">Blanc</p><p class="mot">Version couleur.</p>
        </div>
        <div class="version">
          <div class="vue" style="background:var(--perle)"><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="nom">Gris perle</p><p class="mot">Version couleur.</p>
        </div>
        <div class="version">
          <div class="vue" style="background:var(--vert)"><img src="img/master-logo-blanc.png" alt=""></div>
          <p class="nom">Vert régulation</p><p class="mot">Version blanche.</p>
        </div>
        <div class="version">
          <div class="vue" style="background:var(--nuit)"><img src="img/master-logo-blanc.png" alt=""></div>
          <p class="nom">Bleu nuit</p><p class="mot">Version blanche.</p>
        </div>
      </div>
      <p style="margin-top:22px">Sur photographie, la version blanche s’emploie uniquement sur une zone calme et suffisamment sombre. Si la zone ne l’est pas, poser un aplat vert régulation derrière la signature plutôt que d’assombrir l’image.</p>`,
}));

// 10 Interdits
planches.push(planche({
  titre: 'Usages à proscrire',
  corps: `
      <span class="etiquette">Jamais</span>
      <h2 style="margin-bottom:24px">Cinq gestes qui abîment la marque</h2>
      <div class="interdits">
        <div class="interdit">
          <div class="vue vue--etire"><span class="croix">✕</span><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="mot">Déformer. Les proportions sont fixes.</p>
        </div>
        <div class="interdit">
          <div class="vue vue--pivot"><span class="croix">✕</span><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="mot">Incliner ou faire pivoter.</p>
        </div>
        <div class="interdit">
          <div class="vue vue--teinte"><span class="croix">✕</span><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="mot">Recolorer hors des déclinaisons prévues.</p>
        </div>
        <div class="interdit">
          <div class="vue vue--fond"><span class="croix">✕</span><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="mot">Poser la version couleur sur un fond qui la mange.</p>
        </div>
        <div class="interdit">
          <div class="vue vue--ombre"><span class="croix">✕</span><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="mot">Ajouter ombre, relief ou contour.</p>
        </div>
      </div>`,
}));

// 11 Cosignature
planches.push(planche({
  titre: 'Cosignature',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Partenariats</span>
          <h2>L’Autorité signe<br>à gauche, toujours</h2>
          <p style="margin-top:15px">En cosignature, la signature de l’ARCEP occupe la position d’honneur, à gauche ou en haut. Un filet d’un point l’écarte du partenaire, à une distance égale à la zone de protection.</p>
          <p style="margin-top:12px">Les signatures s’alignent sur leur hauteur optique, pas sur leur cadre. Aucune ne domine l’autre par la taille.</p>
        </div>
        <div>
          <div class="cosignature">
            <img src="img/master-logo-couleur.png" alt="">
            <span class="barre"></span>
            <span class="partenaire">Signature<br>du partenaire</span>
          </div>
          <p style="font-family:var(--mono);font-size:10.5px;line-height:1.7;color:var(--gris);margin-top:11px">Écart = 2x · filet 1 pt à 14 % de noir</p>
        </div>
      </div>`,
}));

// 12 Palette
planches.push(planche({
  titre: 'Palette',
  corps: `
      <span class="etiquette">Mesurée sur le logo</span>
      <h2 style="margin-bottom:20px">Huit couleurs, toutes issues de la signature</h2>
      <div class="palette">
        ${MARQUE.slice(0, 4).map((c) => `
        <div class="teinte">
          <div class="pastille" style="background:${c.hex}"></div>
          <span class="nom">${e(c.nom)}</span>
          <span class="hex">${c.hex.toUpperCase()}</span>
          <span class="role">${e(c.role)}</span>
        </div>`).join('')}
      </div>
      <div class="palette" style="margin-top:16px">
        ${MARQUE.slice(4).map((c) => `
        <div class="teinte">
          <div class="pastille" style="background:${c.hex}"></div>
          <span class="nom">${e(c.nom)}</span>
          <span class="hex">${c.hex.toUpperCase()}</span>
          <span class="role">${e(c.role)}</span>
        </div>`).join('')}
      </div>`,
}));

// 13 Impression
planches.push(planche({
  titre: 'Références',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Impression et écran</span>
          <h2>Les valeurs<br>qui font foi</h2>
          <p style="margin-top:15px">La quadrichromie est calculée depuis les valeurs mesurées. Elle sert de base à l’imprimeur.</p>
          <p style="margin-top:12px"><b>Les équivalences Pantone ne figurent pas ici volontairement.</b> Elles se valident sur épreuve contractuelle, chez l’imprimeur retenu, et se consignent ensuite par avenant à cette charte.</p>
        </div>
        <div>
          <div class="tableau" style="grid-template-columns:none">
            <div class="tete" style="grid-template-columns:30px 1.25fr 1fr 1.15fr;gap:12px"><span></span><span>Couleur</span><span>RVB</span><span>CMJN</span></div>
            ${MARQUE.map((c) => `<div style="grid-template-columns:30px 1.25fr 1fr 1.15fr;gap:12px"><span class="pastille-ligne" style="background:${c.hex}"></span><span style="font-family:var(--titre);font-weight:600">${e(c.nom)}</span><span class="c">${rvb(c.hex)}</span><span class="c">${cmjn(c.hex)}</span></div>`).join('\n            ')}
          </div>
        </div>
      </div>`,
}));

// 14 Répartition
planches.push(planche({
  titre: 'Répartition',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Équilibre</span>
          <h2>La proportion fait<br>autant que la teinte</h2>
          <p style="margin-top:15px">Sur un support donné, la répartition ci-contre maintient l’équilibre de la marque. Les blancs et les gris portent la lecture ; le vert signe ; l’or ponctue.</p>
          <p style="margin-top:12px">Un support où l’or dépasse 5 % de la surface n’est plus un support de l’ARCEP.</p>
        </div>
        <div>
          <div class="repartition">
            <span style="flex:60;background:var(--blanc);color:var(--gris)">60 % BLANC</span>
            <span style="flex:20;background:var(--vert);color:#fff">20 % VERT</span>
            <span style="flex:9;background:var(--perle);color:var(--gris)">9 %</span>
            <span style="flex:7;background:var(--petrole);color:#fff">7 %</span>
            <span style="flex:4;background:var(--or);color:var(--encre)">4 %</span>
          </div>
          <div class="tableau" style="margin-top:22px">
            <div style="grid-template-columns:1fr 92px;gap:14px"><span style="font-family:var(--texte)">Texte principal sur blanc</span><span class="c" style="text-align:right">${ratio('#1a1819', '#ffffff').toFixed(2)}:1</span></div>
            <div style="grid-template-columns:1fr 92px;gap:14px"><span style="font-family:var(--texte)">Vert régulation sur blanc</span><span class="c" style="text-align:right">${ratio('#175b31', '#ffffff').toFixed(2)}:1</span></div>
            <div style="grid-template-columns:1fr 92px;gap:14px"><span style="font-family:var(--texte)">Blanc sur vert régulation</span><span class="c" style="text-align:right">${ratio('#ffffff', '#175b31').toFixed(2)}:1</span></div>
            <div style="grid-template-columns:1fr 92px;gap:14px"><span style="font-family:var(--texte)">Blanc sur bleu nuit</span><span class="c" style="text-align:right">${ratio('#ffffff', '#182e55').toFixed(2)}:1</span></div>
            <div style="grid-template-columns:1fr 92px;gap:14px"><span style="font-family:var(--texte)">Noir encre sur or gabon</span><span class="c" style="text-align:right">${ratio('#1a1819', '#e2b336').toFixed(2)}:1</span></div>
          </div>
          <p style="margin-top:14px;font-family:var(--mono);font-size:10.5px;line-height:1.6;color:var(--gris)">Seuil exigé : 4,5 pour le texte courant, 3 pour les grandes tailles.</p>
        </div>
      </div>`,
}));

// 15 Typographie
planches.push(planche({
  titre: 'Typographie',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Trois familles</span>
          <div class="specimen">
            <span class="nom">Manrope — titres et signalétique</span>
            <p class="demo" style="font-family:Manrope,sans-serif;font-weight:800;font-size:39px;letter-spacing:-.03em">Réguler, arbitrer</p>
            <p class="usage">Titres, intertitres, panneaux, interfaces. Graisses 400 à 800.</p>
          </div>
          <div class="specimen">
            <span class="nom">Source Serif 4 — documents officiels</span>
            <p class="demo" style="font-family:'Source Serif 4',serif;font-size:21px">Décisions, rapports et textes de référence</p>
            <p class="usage">Tout écrit long : décisions, rapports annuels, avis, courriers.</p>
          </div>
          <div class="specimen">
            <span class="nom">IBM Plex Mono — données et repères</span>
            <p class="demo" style="font-family:'IBM Plex Mono',monospace;font-size:15px;letter-spacing:.06em">330,83 Md FCFA · T4 2025 · N°006/PR/2014</p>
            <p class="usage">Chiffres, références de textes, tableaux, annexes techniques.</p>
          </div>
        </div>
        <div>
          <span class="etiquette">Pourquoi ces trois-là</span>
          <p><b>Une institution écrit beaucoup et longtemps.</b> Un seul caractère ne peut pas porter à la fois un panneau d’accueil, un rapport de cent pages et un tableau de chiffres.</p>
          <p style="margin-top:12px">Manrope tient la distance et l’angle : elle reste lisible sur un totem comme dans un menu. Source Serif porte la lecture suivie sans fatigue, et donne aux textes officiels la gravité que la linéale leur retire. IBM Plex Mono aligne les chiffres en colonnes et distingue sans ambiguïté le zéro de la lettre O, ce qui compte dans les références réglementaires.</p>
          <p style="margin-top:12px"><b>Les trois sont sous licence libre SIL OFL.</b> L’Autorité, ses imprimeurs, ses partenaires et ses prestataires les installent sans redevance ni contrat. Pour une institution publique, ce point n’est pas un détail : il conditionne la tenue de la charte hors les murs.</p>
          <p class="jeu">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 ÀÂÇÉÈÊËÎÏÔÙÛÜŒ «&nbsp;» € —</p>
        </div>
      </div>`,
}));

// 16 Hiérarchie
planches.push(planche({
  titre: 'Hiérarchie',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Échelle éditoriale</span>
          <h2>Six niveaux suffisent<br>à tout document</h2>
          <p style="margin-top:15px">L’échelle vaut pour un document A4. Elle se transpose par proportion sur les autres formats : chaque niveau garde son rapport au précédent.</p>
          <p style="margin-top:12px">L’interlignage se règle à 1,4 fois le corps pour le texte courant, 1,1 pour les titres.</p>
        </div>
        <div>
          <div class="hierarchie">
            <div><span class="cle">Titre de couverture</span><span>Manrope 800</span><span class="val">42 pt</span></div>
            <div><span class="cle">Titre de partie</span><span>Manrope 700</span><span class="val">24 pt</span></div>
            <div><span class="cle">Intertitre</span><span>Manrope 600</span><span class="val">14 pt</span></div>
            <div><span class="cle">Texte courant</span><span>Source Serif 4 Regular</span><span class="val">10,5 pt</span></div>
            <div><span class="cle">Légende et note</span><span>Source Serif 4 Italic</span><span class="val">8,5 pt</span></div>
            <div><span class="cle">Référence et donnée</span><span>IBM Plex Mono 500</span><span class="val">8 pt</span></div>
          </div>
          <p style="margin-top:18px"><b>Jamais moins de 8 pt à l’impression, ni moins de 12 px à l’écran.</b> Une mention légale illisible n’est pas une mention légale.</p>
        </div>
      </div>`,
}));

// 17 Règles du français
planches.push(planche({
  titre: 'Composition',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Français</span>
          <h2>La typographie française<br>a des règles, elles s’appliquent</h2>
          <p style="margin-top:15px">Une autorité qui publie des textes de droit se juge aussi à sa ponctuation. Ces règles ne sont pas décoratives : elles évitent les ruptures de lecture et les coupures fautives.</p>
        </div>
        <div>
          <ul style="display:grid;gap:1px;background:var(--filet)">
            <li style="list-style:none;background:var(--papier);padding:10px 0;font-family:var(--texte);font-size:13px;line-height:1.5">Espace fine insécable avant <b>? ! ; :</b> et à l’intérieur des guillemets français.</li>
            <li style="list-style:none;background:var(--papier);padding:10px 0;font-family:var(--texte);font-size:13px;line-height:1.5">Guillemets français «&nbsp;» en premier niveau, anglais “” en second.</li>
            <li style="list-style:none;background:var(--papier);padding:10px 0;font-family:var(--texte);font-size:13px;line-height:1.5">Capitales accentuées : <b>É</b>tat, <b>À</b> compter de, <b>Ê</b>tre.</li>
            <li style="list-style:none;background:var(--papier);padding:10px 0;font-family:var(--texte);font-size:13px;line-height:1.5">Espace insécable dans les nombres : 5&nbsp;544&nbsp;403 — et avant l’unité : 330,83&nbsp;milliards.</li>
            <li style="list-style:none;background:var(--papier);padding:10px 0;font-family:var(--texte);font-size:13px;line-height:1.5">Numéro s’abrège en <b>n°</b>, pas en « No » ni « # ».</li>
            <li style="list-style:none;background:var(--papier);padding:10px 0;font-family:var(--texte);font-size:13px;line-height:1.5">Le tiret cadratin — sépare une incise ; le trait d’union ne s’y substitue pas.</li>
            <li style="list-style:none;background:var(--papier);padding:10px 0;font-family:var(--texte);font-size:13px;line-height:1.5">Pas de veuve ni d’orpheline : aucun mot seul en fin ou en début de colonne.</li>
          </ul>
        </div>
      </div>`,
}));

// 18 Territoire graphique
planches.push(planche({
  titre: 'Territoire graphique',
  sombre: true,
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">L’onde</span>
          <h2>Un seul motif,<br>tiré de l’arc du logo</h2>
          <p style="margin-top:15px">L’onde reprend la courbe qui traverse la signature. Elle figure le signal, la portée, la liaison entre le Gabon et le monde.</p>
          <p style="margin-top:12px">Elle se pose toujours en fond, jamais au premier plan, à une opacité inférieure à 35 %. Elle ne porte aucun texte et ne sert jamais de cadre.</p>
          <p style="margin-top:12px">Elle se trace en vert clair sur fond sombre, en gris perle sur fond clair. Une seule famille de courbes par support.</p>
        </div>
        <div>
          <div class="onde-demo">${onde(0.9)}</div>
          <p style="margin-top:11px;font-family:var(--mono);font-size:10.5px;color:rgba(245,246,244,.5)">Six courbes, épaisseur dégressive, même origine</p>
        </div>
      </div>`,
}));

// 19 Iconographie
const ICONES = [
  ['Réseau', '<circle cx="17" cy="17" r="4"/><path d="M17 3v6M17 25v6M3 17h6M25 17h6"/>'],
  ['Spectre', '<path d="M4 22c4-14 8-14 12 0s8 14 12 0"/>'],
  ['Document', '<path d="M8 4h13l6 6v20H8z"/><path d="M21 4v6h6"/>'],
  ['Contrôle', '<circle cx="15" cy="15" r="9"/><path d="M22 22l7 7"/>'],
  ['Consommateur', '<circle cx="17" cy="12" r="5"/><path d="M6 30c0-6 5-10 11-10s11 4 11 10"/>'],
  ['Courrier', '<rect x="4" y="8" width="26" height="18"/><path d="M4 8l13 10L30 8"/>'],
];
planches.push(planche({
  titre: 'Iconographie',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Principes</span>
          <h2>Un trait, une épaisseur,<br>aucun remplissage</h2>
          <p style="margin-top:15px">Les icônes se dessinent au trait, sur une grille de 32 points, avec une épaisseur constante de 2 points et des extrémités franches.</p>
          <p style="margin-top:12px">Pas de perspective, pas de dégradé, pas de couleur secondaire à l’intérieur d’une icône. Une icône se lit à 16 points de côté ou elle est à redessiner.</p>
        </div>
        <div>
          <div class="icones">
            ${ICONES.map(([nom, d]) => `
            <div class="icone">
              <svg viewBox="0 0 34 34" fill="none" stroke="#175b31" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${d}</svg>
              <span>${e(nom)}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>`,
}));

// 20 Photographie
planches.push(planche({
  titre: 'Photographie',
  corps: `
      <span class="etiquette">Direction</span>
      <h2 style="margin-bottom:22px">Des faits, pas des symboles</h2>
      <div class="photos">
        <div class="photo">
          <img src="../assets/actus/118.jpg" alt="">
          <p class="mot"><b>L’Autorité au travail.</b> Réunions, délégations, terrain. Des personnes réelles, jamais de banque d’images.</p>
        </div>
        <div class="photo">
          <img src="../assets/actus/117.jpg" alt="">
          <p class="mot"><b>La représentation.</b> Instances internationales et partenariats, cadrage large, lumière naturelle.</p>
        </div>
        <div class="photo">
          <img src="../assets/actus/117.jpg" alt="" style="filter:grayscale(1) contrast(1.05) sepia(.35) hue-rotate(96deg) saturate(2.6)">
          <p class="mot"><b>Le traitement bichrome.</b> Vert régulation et blanc, réservé aux couvertures et aux fonds de citation.</p>
        </div>
      </div>
      <p style="margin-top:20px">Cadrages horizontaux, hauteur d’œil, aucune retouche qui modifie la réalité de la scène. Les portraits se font sur fond neutre ou dans le lieu de travail, jamais en studio blanc détouré.</p>`,
}));

// 21 Ton de voix
planches.push(planche({
  titre: 'Ton de voix',
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Écrire pour l’Autorité</span>
          <h2>Précis, sobre,<br>jamais surplombant</h2>
          <p style="margin-top:15px">L’ARCEP arbitre entre des opérateurs et protège des usagers. Elle écrit donc sans emphase, sans promesse et sans jargon inutile — mais sans simplifier ce qui est juridiquement exact.</p>
          <p style="margin-top:12px">Phrases courtes. Voix active. Le sujet de la phrase est celui qui agit.</p>
        </div>
        <div>
          <div class="voix">
            <div class="oui"><p class="cle">On écrit</p><p>L’Autorité sanctionne les manquements constatés.</p></div>
            <div class="non"><p class="cle">On n’écrit pas</p><p>Des sanctions pourront éventuellement être prises.</p></div>
            <div class="oui"><p class="cle">On écrit</p><p>Le taux de pénétration du mobile atteint 176,52 %.</p></div>
            <div class="non"><p class="cle">On n’écrit pas</p><p>Un taux de pénétration absolument spectaculaire.</p></div>
            <div class="oui"><p class="cle">On écrit</p><p>Composez le 1331 pour signaler un manquement.</p></div>
            <div class="non"><p class="cle">On n’écrit pas</p><p>N’hésitez plus, contactez-nous dès maintenant&nbsp;!</p></div>
          </div>
        </div>
      </div>`,
}));

// 22 Papeterie
planches.push(planche({
  titre: 'Papeterie',
  corps: `
      <span class="etiquette">Applications</span>
      <h2 style="margin-bottom:20px">Papier à en-tête et carte de visite</h2>
      <div class="supports">
        <div class="feuille">
          <img src="img/master-logo-couleur.png" alt="">
          <div class="lignes">
            <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
          <p class="bas">ARCEP — KALIKAK, BP. 50 000, LIBREVILLE, GABON · (+241) 011 44 68 11 · ARCEP@ARCEP.GA</p>
        </div>
        <div class="cartes">
          <div class="carte">
            <img src="img/master-logo-couleur.png" alt="">
            <div><p class="nom">Prénom NOM</p><p class="fonction">Fonction exercée</p></div>
            <p class="coord">(+241) 011 44 68 11 · PRENOM.NOM@ARCEP.GA<br>KALIKAK, BP. 50 000 — LIBREVILLE</p>
          </div>
          <div class="carte carte--dos"><img src="img/master-logo-blanc.png" alt=""></div>
        </div>
      </div>
      <p style="margin-top:16px">Signature en haut à gauche, à 2x du bord. Coordonnées en pied, en IBM Plex Mono, sur une seule ligne. Papier non couché, blanc naturel, 100 g pour la correspondance et 350 g pour la carte.</p>`,
}));

// 23 Numérique
planches.push(planche({
  titre: 'Supports numériques',
  corps: `
      <span class="etiquette">Applications</span>
      <h2 style="margin-bottom:22px">Écrans, avatars et signatures</h2>
      <div class="numeriques">
        <div class="ecran">
          <div class="barre"><i></i><i></i><i></i></div>
          <div class="vue"><img src="img/master-logo-blanc.png" alt=""></div>
          <p class="mot">Page d’accueil — signature en réserve</p>
        </div>
        <div class="ecran">
          <div class="barre"><i></i><i></i><i></i></div>
          <div class="vue vue--avatar"><img src="../assets/icone-arcep.png" alt=""></div>
          <p class="mot">Avatar — icône carrée, jamais la signature</p>
        </div>
        <div class="ecran">
          <div class="barre"><i></i><i></i><i></i></div>
          <div class="vue" style="background:var(--nuit)"><img src="img/master-logo-blanc.png" alt=""></div>
          <p class="mot">Présentation — fond bleu nuit</p>
        </div>
        <div class="ecran">
          <div class="barre"><i></i><i></i><i></i></div>
          <div class="vue" style="background:var(--blanc)"><img src="img/master-logo-couleur.png" alt=""></div>
          <p class="mot">Signature de courriel — version couleur</p>
        </div>
      </div>
      <p style="margin-top:20px">La signature de courriel se limite à la version couleur sur blanc, 180 px de large, suivie du nom, de la fonction et du téléphone en Manrope. Aucune citation, aucune image de fond, aucune couleur hors palette.</p>`,
}));

// 24 Signalétique
planches.push(planche({
  titre: 'Signalétique',
  corps: `
      <span class="etiquette">Applications</span>
      <h2 style="margin-bottom:22px">Bâtiment, événement, terrain</h2>
      <div class="signaletique">
        <div class="panneau">
          <div class="vue vue--mur"><img src="img/logo-vert-profond.png" alt=""></div>
          <p class="mot"><b>Façade et accueil.</b> Lettres découpées ou signature appliquée, monochrome vert sur support clair.</p>
        </div>
        <div class="panneau">
          <div class="vue vue--totem"><img src="img/master-logo-blanc.png" alt=""></div>
          <p class="mot"><b>Totem et orientation.</b> Fond vert profond, signature blanche, texte en Manrope 600.</p>
        </div>
        <div class="panneau">
          <div class="vue vue--kakemono"><img src="img/master-logo-blanc.png" alt=""></div>
          <p class="mot"><b>Événement.</b> Dégradé vert vers bleu nuit, onde en fond, signature centrée en haut.</p>
        </div>
      </div>
      <p style="margin-top:20px">À l’extérieur, la taille de la signature se calcule sur la distance de lecture : un centimètre de hauteur de capitale pour un mètre de recul. Aucun texte en réserve sur l’onde.</p>`,
}));

// 25 Non négociable
planches.push(planche({
  titre: 'L’essentiel',
  sombre: true,
  corps: `
      <div class="duo">
        <div>
          <span class="etiquette">Non négociable</span>
          <h2>Si vous ne reteniez<br>que ces huit points</h2>
          <p style="margin-top:15px">Une charte se juge à ce qu’elle empêche. Ces huit règles suffisent à protéger la marque dans quatre-vingt-dix pour cent des cas.</p>
        </div>
        <div>
          <ul class="regles">
            <li><span>01</span><div>La signature ne se redessine pas, ne se déforme pas, ne se décompose pas.</div></li>
            <li><span>02</span><div>Zone de protection de 2x, toujours libre.</div></li>
            <li><span>03</span><div>Quatre déclinaisons seulement : couleur, vert, noir, blanc.</div></li>
            <li><span>04</span><div>Aucune couleur hors palette, l’or sous les 5 % de surface.</div></li>
            <li><span>05</span><div>Manrope, Source Serif 4, IBM Plex Mono. Aucune autre.</div></li>
            <li><span>06</span><div>Jamais moins de 8 pt imprimé, ni 12 px à l’écran.</div></li>
            <li><span>07</span><div>L’onde reste en fond, sous 35 % d’opacité, sans texte dessus.</div></li>
            <li><span>08</span><div>Des photographies réelles, jamais de banque d’images.</div></li>
          </ul>
        </div>
      </div>`,
}));

// 26 Dos
numero++;
planches.push(`
  <section class="page couverture">
    <div class="onde" aria-hidden="true">${onde(0.55)}</div>
    <div class="bloc">
      <img src="img/master-logo-blanc.png" alt="" style="width:205px">
      <span class="filet"></span>
      <p class="sous">Kalikak, BP. 50 000 — Libreville, Gabon<br>(+241) 011 44 68 11 · arcep@arcep.ga</p>
    </div>
    <p class="coin coin--g">Conçu par<br>Méthode Aura</p>
    <p class="coin coin--d">Septembre 2026<br>Version 1</p>
  </section>`);

const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ARCEP Gabon — Charte de marque</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="charte.css">
</head>
<body>
${planches.join('\n')}
</body>
</html>
`;

writeFileSync('charte/index.html', html);
console.log('charte/index.html —', planches.length, 'planches');
