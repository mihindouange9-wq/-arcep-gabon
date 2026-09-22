/* ARCEP Gabon — les pages publiques.
   L'accueil est un récit en scènes chromatiques, du vert de la forêt au blanc de la lumière.
   Les pages intérieures gardent la même grammaire mais servent la lecture : une autorité
   publique doit pouvoir être consultée par tout le monde, sur tous les écrans, sans script. */
import {
  e, lien, socle, entete, sectionTete, couture, icone, paragraphes, RUBRIQUES, rubriqueDe,
  actualitesPubliees, visuelActualite, dateLisible,
} from './base.mjs';
import { couvertureObservatoire, repartitionDocuments, jauge, onde } from './graphiques.mjs';
import { texte as T, liste as L, reglages } from '../schema.mjs';

const tel = (t) => `tel:${String(t).replace(/[^\d+]/g, '')}`;
const nombre = (n) => new Intl.NumberFormat('fr-FR').format(n);
const compte = (D) => ({
  publications: D.observatoire.reduce((n, m) => n + m.publications.length, 0),
  documents: D.documents.length,
  actualites: actualitesPubliees(D).length,
});

/* ======================= FRAGMENTS ======================= */
function blocChiffres(D, { niveau = 3 } = {}) {
  return `<div class="chiffres" data-serie>
  ${D.chiffres.map((c) => `
  <article class="chiffre">
    <p class="chiffre-valeur"><span class="tabulaire" data-compteur="${e(c.valeur)}" data-decimales="${e(c.decimales)}">${e(c.affichage)}</span></p>
    <p class="chiffre-unite">${e(c.unite)}</p>
    <h${niveau} class="chiffre-libelle">${e(c.libelle)}</h${niveau}>
    ${c.periode ? `<p class="mesure">${e(c.periode)}</p>` : ''}
    ${jauge(c)}
  </article>`).join('')}
</div>
<p class="source mesure">${e(D.chiffresSource)}</p>`;
}

function carteActualite(a, { grande = false } = {}) {
  return `<article class="article${grande ? ' article--une' : ''}">
  <a href="/actualites/${encodeURIComponent(a.id)}" data-curseur="lire">
    ${visuelActualite(a, 'article-visuel', grande ? 'eager' : 'lazy')}
    <span class="article-corps">
      <span class="article-meta mesure"><time datetime="${e(a.dateIso || '')}">${e(a.date)}</time>${a.rubrique ? ` · ${e(a.rubrique)}` : ''}</span>
      <span class="article-titre ${grande ? 'titre-3' : 'titre-5'}">${e(a.titre)}</span>
      ${grande && a.chapeau ? `<span class="article-chapeau">${e(a.chapeau)}</span>` : ''}
    </span>
  </a>
</article>`;
}

function dialogueMission(mi) {
  return `<dialog class="dialogue" id="mission-${e(mi.cle)}" aria-labelledby="mission-${e(mi.cle)}-titre">
  <div class="dialogue-corps">
    <button class="dialogue-fermer" type="button" data-fermer aria-label="Fermer">${icone('fermer')}</button>
    <p class="badge">Mission</p>
    <h2 class="titre-3" id="mission-${e(mi.cle)}-titre">${e(mi.titre)}</h2>
    <p class="chapo">${e(mi.resume)}</p>
    <ul class="points">${mi.points.map((p) => `<li>${e(p)}</li>`).join('')}</ul>
    <p><a class="lien" href="${lien(mi.lien)}" target="_blank" rel="noopener">Texte de référence sur arcep.ga ${icone('diag')}</a></p>
  </div>
</dialog>`;
}

/* ======================= ACCUEIL ======================= */
export function accueil(D, { ecran = false } = {}) {
  const R = reglages(D);
  const I = D.institution;
  const n = compte(D);
  const publiees = actualitesPubliees(D);
  const [une, ...suite] = publiees;
  const mots = T(D, 'accueil', 'motsCles').split('|').map((m) => m.trim()).filter(Boolean);
  const derniers = D.observatoire.map((m) => ({ ...m, derniere: m.publications[0] }));
  const demarches = L(D, 'demarches').slice(0, 3);

  const corps = `
<section class="hero section" id="hero" data-scene="foret" data-tonalite="sombre">
  ${ecran ? '' : '<canvas class="hero-reseau" aria-hidden="true"></canvas>'}
  <span class="trame" aria-hidden="true"></span>
  <span class="lueur hero-lueur" aria-hidden="true"></span>
  <span class="lueur lueur--2 hero-lueur-2" aria-hidden="true"></span>
  <div class="cadre hero-cadre">
    <div class="hero-intro" aria-hidden="true"><img src="/assets/logo-arcep-blanc.png" alt="" width="1056" height="466"></div>
    <div class="hero-contenu">
      <p class="hero-sur" data-hero="sur">${e(I.statut)}</p>
      <h1 class="titre-1 hero-titre" data-hero="titre">${e(T(D, 'accueil', 'heroTitre'))}</h1>
      <p class="chapo hero-texte" data-hero="texte">${e(T(D, 'accueil', 'heroTexte'))}</p>
      <div class="hero-actions" data-hero="actions">
        <a class="bouton" href="/missions">Nos missions ${icone('fleche')}</a>
        <a class="bouton bouton--contour" href="/observatoire">Observatoire des marchés</a>
      </div>
    </div>
    ${une ? `
    <a class="hero-une" href="/actualites/${encodeURIComponent(une.id)}" data-hero="une" data-curseur="lire">
      <span class="visuel hero-une-visuel">${une.image ? `<img src="${lien(une.image)}" alt="${e(une.alt || '')}" decoding="async" fetchpriority="high">` : '<span class="visuel-interieur"></span>'}</span>
      <span class="hero-une-corps">
        <span class="hero-une-sur">À la une · <time datetime="${e(une.dateIso || '')}">${e(une.date)}</time></span>
        <span class="hero-une-titre">${e(une.titre)}</span>
        <span class="lien lien--simple">Lire ${icone('fleche')}</span>
      </span>
    </a>` : ''}
    <div class="hero-pied" data-hero="pied">
      <a class="hero-defiler" href="#identite" data-curseur="explorer"><span>Découvrir</span>${icone('bas')}</a>
      <p class="mesure">${e(I.adresse)}</p>
    </div>
  </div>
</section>

<section class="identite section" id="identite" data-scene="vert-bleu" data-tonalite="sombre">
  <span class="lueur" aria-hidden="true" data-parallaxe="-0.2" style="top:-20%;left:-20%"></span>
  <div class="cadre identite-cadre">
    <div class="identite-texte">
      <h2 class="titre-2" data-reveler="lignes">${e(T(D, 'accueil', 'identiteTitre'))}</h2>
      <div class="prose" data-reveler><p>${e(I.presentation)}</p></div>
      <dl class="fiche" data-serie>
        <div><dt>Statut</dt><dd>${e(I.statut)}</dd></div>
        <div><dt>Texte fondateur</dt><dd>${e(I.fondation)}</dd></div>
        <div><dt>Siège</dt><dd>${e(I.adresse)}</dd></div>
      </dl>
      <p data-reveler><a class="lien" href="/autorite">Découvrir l’Autorité ${icone('fleche')}</a></p>
    </div>
    <div class="identite-media" data-parallaxe="0.08">
      <figure class="media" data-reveler="masque">
        <video muted loop playsinline preload="none" aria-label="Animation du logo ARCEP Gabon" data-video>
          <source src="/assets/logo-anime.webm" type="video/webm">
          <source src="/assets/logo-anime.mp4" type="video/mp4">
        </video>
      </figure>
      <blockquote class="citation" data-reveler>
        <p class="titre-4">« ${e(D.president.accroche)} »</p>
        <footer><a class="lien lien--simple" href="/autorite#president">${e(D.president.titre)} ${icone('fleche')}</a></footer>
      </blockquote>
    </div>
  </div>
</section>

<section class="missions-accueil section" id="missions" data-scene="bleu" data-tonalite="sombre">
  <span class="trame" aria-hidden="true"></span>
  <span class="lueur" aria-hidden="true" data-parallaxe="0.15" style="right:-25%;top:10%"></span>
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'accueil', 'missionsTitre'), chapo: T(D, 'accueil', 'missionsTexte'),
      action: `<a class="lien" href="/missions">Toutes les missions ${icone('fleche')}</a>` })}
    <ol class="missions" data-serie>
      ${D.missions.map((mi) => `
      <li class="mission">
        <a class="mission-ouvrir" href="/missions#${e(mi.cle)}" data-mission="${e(mi.cle)}" data-curseur="ouvrir">
          <span class="mission-titre titre-3">${e(mi.titre)}</span>
          <span class="mission-resume">${e(mi.resume)}</span>
          <span class="mission-nombre mesure">${mi.points.length} ${mi.points.length > 1 ? 'attributions' : 'attribution'}</span>
          <span class="mission-fleche">${icone('fleche')}</span>
        </a>
      </li>`).join('')}
    </ol>
  </div>
  ${D.missions.map(dialogueMission).join('')}
</section>

<section class="mots section" id="connectivite" data-scene="electrique" data-tonalite="sombre">
  ${onde('onde mots-onde')}
  <span class="lueur" aria-hidden="true" data-parallaxe="-0.1" style="left:30%;top:-30%"></span>
  <div class="mots-scene">
    <div class="cadre mots-cadre">
      <div class="mots-pile" aria-label="${e(mots.join(', '))}">
        ${mots.map((m, i) => `<p class="grand-mot mots-mot" data-mot="${i}"><span>${e(m)}</span></p>`).join('')}
      </div>
      <p class="chapo mots-texte" data-reveler>${e(T(D, 'accueil', 'motsTexte'))}</p>
    </div>
  </div>
</section>

<section class="chiffres-accueil section" id="chiffres" data-scene="graphite" data-tonalite="sombre">
  <span class="trame" aria-hidden="true"></span>
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'accueil', 'chiffresTitre'), chapo: D.chiffresSource.replace(/^Source\s*:\s*/i, ''),
      action: `<a class="lien" href="/observatoire">Tous les indicateurs ${icone('fleche')}</a>` })}
    ${blocChiffres(D)}
    <div class="graphiques">
      <figure class="graphique" data-reveler>
        <figcaption><span class="titre-5">${nombre(n.documents)} textes réglementaires</span><span class="mesure">par catégorie</span></figcaption>
        ${repartitionDocuments(D)}
      </figure>
      <figure class="graphique" data-reveler>
        <figcaption><span class="titre-5">${nombre(n.publications)} tableaux de bord</span><span class="mesure">par trimestre et par marché</span></figcaption>
        ${couvertureObservatoire(D)}
      </figure>
    </div>
  </div>
</section>

<section class="observatoire-accueil section" id="observatoire" data-scene="clair" data-tonalite="clair">
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'accueil', 'observatoireTitre'), chapo: T(D, 'accueil', 'observatoireTexte'),
      action: `<a class="bouton" href="/observatoire">Ouvrir l’Observatoire ${icone('fleche')}</a>` })}
    <ul class="marches" data-serie>
      ${derniers.map((m) => `
      <li>
        <a class="marche carte carte--lien" href="/observatoire?marche=${encodeURIComponent(m.cle)}" data-curseur="voir">
          <span class="marche-icone">${icone(m.cle === 'mobile' ? 'reseau' : m.cle === 'fixe' ? 'telephone' : 'onde', 'icone')}</span>
          <span class="marche-nom titre-3">${e(m.nom)}</span>
          <span class="marche-compte mesure">${m.publications.length} tableaux de bord</span>
          ${m.derniere ? `<span class="marche-dernier"><span class="badge badge--or">Dernier</span> ${e(m.derniere.trimestre)} ${e(m.derniere.annee)}</span>` : ''}
        </a>
      </li>`).join('')}
    </ul>
  </div>
</section>

<section class="reglementation-accueil section" id="reglementation" data-scene="bleu-or" data-tonalite="sombre">
  <span class="trame" aria-hidden="true"></span>
  <span class="lueur lueur--2" aria-hidden="true" data-parallaxe="0.12" style="right:-20%;bottom:-40%"></span>
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'accueil', 'reglementationTitre'), chapo: T(D, 'accueil', 'reglementationTexte') })}
    <form class="recherche recherche--grande" method="get" action="/reglementation" role="search" data-reveler>
      <label class="sr-only" for="recherche-accueil">${e(T(D, 'reglementation', 'rechercheAide'))}</label>
      ${icone('loupe')}
      <input id="recherche-accueil" name="q" type="search" placeholder="${e(T(D, 'reglementation', 'rechercheAide'))}" autocomplete="off">
      <button class="bouton" type="submit">Rechercher</button>
    </form>
    <ul class="categories" data-serie>
      ${D.categories.map((c) => {
        const k = D.documents.filter((d) => d.categorie === c.cle).length;
        return `<li><a class="categorie" href="/reglementation?categorie=${encodeURIComponent(c.cle)}" data-curseur="voir">
          <span class="categorie-nom">${e(c.nom)}</span>
          <span class="categorie-nombre tabulaire">${k}</span>
        </a></li>`;
      }).join('')}
    </ul>
  </div>
</section>

${ecran ? '' : `
<section class="ecran section" id="ecran" data-scene="foret" data-tonalite="sombre">
  <div class="ecran-fond" aria-hidden="true"><span class="lueur ecran-lueur"></span><span class="lueur lueur--2 ecran-lueur-2"></span><span class="trame"></span></div>
  <div class="ecran-scene">
    <div class="cadre ecran-cadre">
      <div class="ecran-texte">
        <h2 class="titre-2" data-reveler="lignes">${e(T(D, 'accueil', 'ecranTitre'))}</h2>
        <p class="chapo" data-reveler>${e(T(D, 'accueil', 'ecranTexte'))}</p>
        <ol class="ecran-etapes" aria-label="Pages affichées dans le téléphone">
          <li data-etape="/" aria-current="true">Accueil</li>
          <li data-etape="/missions">Missions</li>
          <li data-etape="/observatoire">Observatoire</li>
          <li data-etape="/reglementation">Réglementation</li>
          <li data-etape="/actualites">Actualités</li>
          <li data-etape="/contact">Contact</li>
        </ol>
      </div>
      <div class="iphone" data-iphone>
        <div class="iphone-chassis">
          <i class="iphone-bouton iphone-bouton--action" aria-hidden="true"></i>
          <i class="iphone-bouton iphone-bouton--haut" aria-hidden="true"></i>
          <i class="iphone-bouton iphone-bouton--bas" aria-hidden="true"></i>
          <i class="iphone-bouton iphone-bouton--alim" aria-hidden="true"></i>
          <i class="iphone-bouton iphone-bouton--camera" aria-hidden="true"></i>
          <div class="iphone-ecran">
            <i class="iphone-ilot" aria-hidden="true"></i>
            <span class="iphone-statut" aria-hidden="true"><b>9:41</b><span class="iphone-statut-icones"><i class="iphone-signal"></i><i class="iphone-wifi"></i><i class="iphone-batterie"></i></span></span>
            <video class="iphone-vue" muted loop playsinline preload="none" poster="/assets/iphone-affiche.jpg" aria-label="Le site ARCEP Gabon sur un téléphone, page après page" data-iphone-video>
              <source src="/assets/iphone-defilement.webm" type="video/webm">
            </video>
            <i class="iphone-reflet" aria-hidden="true"></i>
          </div>
        </div>
        <i class="iphone-ombre" aria-hidden="true"></i>
      </div>
    </div>
  </div>
</section>`}

<section class="actualites-accueil section" id="actualites" data-scene="blanc" data-tonalite="clair">
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'accueil', 'actualitesTitre'),
      action: `<a class="lien" href="/actualites">Toute l’actualité ${icone('fleche')}</a>` })}
    ${une ? `
    <div class="actualites-composition">
      ${carteActualite(une, { grande: true })}
      <div class="actualites-suite" data-serie>
        ${suite.slice(0, 3).map((a) => carteActualite(a)).join('')}
      </div>
    </div>` : '<p class="vide">Aucune actualité publiée pour l’instant.</p>'}
  </div>
</section>

<section class="consommateurs-accueil section" id="consommateurs" data-scene="or-blanc" data-tonalite="clair">
  <span class="lueur" aria-hidden="true" data-parallaxe="-0.1" style="left:-25%;top:-20%"></span>
  <div class="cadre consommateurs-cadre">
    <div class="numero" data-reveler>
      <a class="numero-valeur" href="${tel(I.numeroCourt)}" aria-label="Appeler le ${e(I.numeroCourt)}">${e(I.numeroCourt)}</a>
      <p class="numero-texte">${e(T(D, 'consommateurs', 'numeroTexte'))}</p>
    </div>
    <div class="consommateurs-texte">
      <h2 class="titre-2" data-reveler="lignes">${e(T(D, 'accueil', 'consommateursTitre'))}</h2>
      <p class="chapo" data-reveler>${e(T(D, 'accueil', 'consommateursTexte'))}</p>
      <ul class="demarches" data-serie>
        ${demarches.map((d) => `<li><a class="demarche" href="${lien(d.lien) || '/consommateurs'}">
          <span class="demarche-titre titre-5">${e(d.titre)}</span>
          <span class="demarche-texte">${e(d.texte)}</span>
          ${icone('fleche')}
        </a></li>`).join('')}
      </ul>
      <p data-reveler><a class="bouton" href="/consommateurs">Espace consommateurs ${icone('fleche')}</a></p>
    </div>
  </div>
</section>

<section class="contact-accueil section" id="contact" data-scene="graphite" data-tonalite="sombre">
  <span class="trame" aria-hidden="true"></span>
  <div class="cadre contact-cadre">
    <div>
      <h2 class="titre-2" data-reveler="lignes">${e(T(D, 'accueil', 'contactTitre'))}</h2>
      <p class="chapo" data-reveler>${e(T(D, 'contact', 'heroTexte'))}</p>
      <p data-reveler><a class="bouton" href="/contact">Adresser une demande ${icone('fleche')}</a></p>
    </div>
    ${coordonnees(D)}
  </div>
</section>`;

  return socle({
    D, titre: 'Accueil', cle: '', scene: 'foret', tonalite: 'sombre', chemin: '/', ecran, corps,
    description: R.descriptionSite,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'GovernmentOrganization',
      name: I.nom, alternateName: `${I.sigle} ${I.pays}`, url: R.adressePublique || undefined,
      email: I.email, telephone: I.telephones[0],
      address: { '@type': 'PostalAddress', streetAddress: I.adresse, addressLocality: 'Libreville', addressCountry: 'GA' },
      logo: (R.adressePublique || '') + '/assets/logo-arcep.png',
    },
  });
}

function coordonnees(D) {
  const I = D.institution;
  return `<dl class="coordonnees" data-serie>
  <div><dt>${icone('lieu')} Adresse</dt><dd>${e(I.adresse)}</dd></div>
  <div><dt>${icone('telephone')} Téléphone</dt><dd>${I.telephones.map((t) => `<a href="${tel(t)}">${e(t)}</a>`).join('<br>')}</dd></div>
  <div><dt>${icone('courriel')} Courriel</dt><dd><a href="mailto:${e(I.email)}">${e(I.email)}</a></dd></div>
  <div><dt>${icone('bouclier')} Consommateurs</dt><dd><a href="${tel(I.numeroCourt)}">Numéro court ${e(I.numeroCourt)}</a></dd></div>
</dl>`;
}

/* ======================= L'AUTORITÉ ======================= */
export function autorite(D, { ecran = false } = {}) {
  const I = D.institution;
  const corps = `
${entete({ titre: T(D, 'autorite', 'heroTitre'), chapo: T(D, 'autorite', 'heroTexte'), scene: 'vert-bleu' })}

<section class="section" data-scene="clair" data-tonalite="clair">
  <div class="cadre duo">
    <div>
      <h2 class="titre-2" data-reveler="lignes">${e(T(D, 'accueil', 'identiteTitre'))}</h2>
      <div class="prose" data-reveler><p>${e(I.presentation)}</p></div>
    </div>
    <dl class="fiche" data-serie>
      <div><dt>Sigle</dt><dd>${e(I.sigle)} ${e(I.pays)}</dd></div>
      <div><dt>Statut</dt><dd>${e(I.statut)}</dd></div>
      <div><dt>Texte fondateur</dt><dd>${e(I.fondation)}</dd></div>
      <div><dt>Secteurs</dt><dd>Communications électroniques et postes</dd></div>
      <div><dt>Siège</dt><dd>${e(I.adresse)}</dd></div>
    </dl>
  </div>
</section>

<section class="section" id="conseil" data-scene="bleu" data-tonalite="sombre">
  <span class="trame" aria-hidden="true"></span>
  <span class="lueur" aria-hidden="true" data-parallaxe="0.12" style="right:-20%;top:-10%"></span>
  <div class="cadre duo duo--inverse">
    <figure class="media" data-reveler="masque">
      <video muted loop playsinline preload="none" aria-label="Animation du logo ARCEP Gabon" data-video>
        <source src="/assets/logo-anime.webm" type="video/webm">
        <source src="/assets/logo-anime.mp4" type="video/mp4">
      </video>
    </figure>
    <div>
      <h2 class="titre-2" data-reveler="lignes">${e(T(D, 'autorite', 'conseilTitre'))}</h2>
      <div class="prose" data-reveler><p>${e(D.conseil.texte)}</p><p>${e(D.conseil.composition)}</p></div>
      <dl class="fiche fiche--rang" data-serie>
        <div><dt>Membres</dt><dd>Sept, nommés par décret pris en Conseil des Ministres</dd></div>
        <div><dt>Mandat</dt><dd>Quatre ans, renouvelable une fois</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="section" id="organisation" data-scene="blanc" data-tonalite="clair">
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'autorite', 'organisationTitre'), chapo: T(D, 'autorite', 'organisationTexte') })}
    <ol class="directions" data-serie>
      ${D.directions.map((d, i) => `<li class="direction"><span class="direction-rang tabulaire">${String(i + 1).padStart(2, '0')}</span><span>${e(d)}</span></li>`).join('')}
    </ol>
  </div>
</section>

<section class="section" id="president" data-scene="vert-bleu" data-tonalite="sombre">
  <span class="lueur" aria-hidden="true" data-parallaxe="-0.15" style="left:-20%;bottom:-30%"></span>
  <div class="cadre">
    <p class="badge" data-reveler>${e(D.president.titre)}</p>
    <h2 class="titre-1 president-accroche" data-reveler="lignes">${e(D.president.accroche)}</h2>
    <div class="president-corps">
      <div class="prose prose--grande" data-reveler>${D.president.paragraphes.map((p) => `<p>${e(p)}</p>`).join('')}</div>
      <dl class="axes" data-serie>
        ${D.president.axes.map((a, i) => `<div><dt><span class="tabulaire">${String(i + 1).padStart(2, '0')}</span> ${e(a.titre)}</dt><dd>${e(a.texte)}</dd></div>`).join('')}
      </dl>
    </div>
  </div>
</section>

<section class="section" id="partenaires" data-scene="clair" data-tonalite="clair">
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'autorite', 'partenairesTitre') })}
    <ul class="partenaires" data-serie>
      ${D.partenaires.map((p) => `<li class="partenaire carte${p.lien ? ' carte--lien' : ''}">
        ${p.lien ? `<a href="${lien(p.lien)}" target="_blank" rel="noopener" class="partenaire-lien">` : '<div class="partenaire-lien">'}
          <span class="partenaire-sigle titre-3">${e(p.sigle)}</span>
          <span class="partenaire-nom">${e(p.nom)}</span>
          <span class="badge badge--neutre">${e(p.secteur)}</span>
        ${p.lien ? '</a>' : '</div>'}
      </li>`).join('')}
    </ul>
  </div>
</section>`;

  return socle({ D, titre: T(D, 'autorite', 'heroTitre'), cle: 'autorite', scene: 'vert-bleu', chemin: '/autorite', ecran, corps,
    description: 'Statut, textes fondateurs, Conseil de Régulation, organisation, mot du Président et partenaires de l’ARCEP Gabon.' });
}

/* ======================= MISSIONS ======================= */
export function missions(D, { ecran = false } = {}) {
  const corps = `
${entete({ titre: T(D, 'missions', 'heroTitre'), chapo: T(D, 'missions', 'heroTexte'), scene: 'bleu',
  complement: `<nav class="sommaire" aria-label="Sommaire des missions" data-serie>${D.missions.map((mi) =>
    `<a href="#${e(mi.cle)}">${e(mi.titre.replace(/^Mission (d’|d')?/i, ''))}</a>`).join('')}</nav>` })}

${D.missions.map((mi, i) => `
<section class="section mission-page" id="${e(mi.cle)}" data-scene="${i % 2 ? 'blanc' : 'clair'}" data-tonalite="clair">
  <div class="cadre mission-page-cadre">
    <div class="mission-page-tete">
      <p class="badge">Mission</p>
      <h2 class="titre-2" data-reveler="lignes">${e(mi.titre)}</h2>
      <p class="chapo" data-reveler>${e(mi.resume)}</p>
      <p data-reveler><a class="lien" href="${lien(mi.lien)}" target="_blank" rel="noopener">Texte de référence sur arcep.ga ${icone('diag')}</a></p>
    </div>
    <ul class="points points--grands" data-serie>${mi.points.map((p) => `<li>${e(p)}</li>`).join('')}</ul>
  </div>
</section>`).join('')}`;

  return socle({ D, titre: T(D, 'missions', 'heroTitre'), cle: 'missions', scene: 'bleu', chemin: '/missions', ecran, corps,
    description: 'Les cinq missions de l’ARCEP Gabon : ordre général, investigation, ordre juridique, technique et économique.' });
}

/* ======================= OBSERVATOIRE ======================= */
export function observatoire(D, { ecran = false, marche = 'tous', annee = 'toutes' } = {}) {
  const annees = Array.from(new Set(D.observatoire.flatMap((m) => m.publications.map((p) => p.annee)))).sort().reverse();
  const toutes = D.observatoire.flatMap((m) => m.publications.map((p) => ({ ...p, marche: m.cle, marcheNom: m.nom })))
    .sort((a, b) => (b.annee + b.trimestre).localeCompare(a.annee + a.trimestre));
  const retenu = (p) => (marche === 'tous' || p.marche === marche) && (annee === 'toutes' || p.annee === annee);
  const filtrees = toutes.filter(retenu);
  const parametres = (m, a) => {
    const q = new URLSearchParams();
    if (m !== 'tous') q.set('marche', m);
    if (a !== 'toutes') q.set('annee', a);
    const s = q.toString();
    return '/observatoire' + (s ? '?' + s : '') + '#tableaux';
  };

  const corps = `
${entete({ titre: T(D, 'observatoire', 'heroTitre'), chapo: T(D, 'observatoire', 'heroTexte'), scene: 'electrique' })}

<section class="section" data-scene="graphite" data-tonalite="sombre">
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'observatoire', 'chiffresTitre'), chapo: D.chiffresSource.replace(/^Source\s*:\s*/i, '') })}
    ${blocChiffres(D)}
  </div>
</section>

<section class="section" data-scene="clair" data-tonalite="clair">
  <div class="cadre">
    ${sectionTete({ titre: 'La couverture trimestrielle', chapo: 'Chaque case est un tableau de bord publié : cliquez pour l’ouvrir.' })}
    <div data-reveler>${couvertureObservatoire(D)}</div>
  </div>
</section>

<section class="section" id="tableaux" data-scene="blanc" data-tonalite="clair">
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'observatoire', 'publicationsTitre') })}
    <form class="filtrage" method="get" action="/observatoire" data-filtrage="observatoire">
      <div class="filtrage-groupe">
        <span class="filtrage-nom">Marché</span>
        <p class="filtres" role="group" aria-label="Filtrer par marché">
          <a href="${parametres('tous', annee)}" data-filtre="marche" data-valeur="tous"${marche === 'tous' ? ' aria-current="true"' : ''}>Tous</a>
          ${D.observatoire.map((m) => `<a href="${parametres(m.cle, annee)}" data-filtre="marche" data-valeur="${e(m.cle)}"${marche === m.cle ? ' aria-current="true"' : ''}>${e(m.nom)} <span class="compte">${m.publications.length}</span></a>`).join('')}
        </p>
      </div>
      <div class="filtrage-groupe">
        <span class="filtrage-nom">Année</span>
        <p class="filtres" role="group" aria-label="Filtrer par année">
          <a href="${parametres(marche, 'toutes')}" data-filtre="annee" data-valeur="toutes"${annee === 'toutes' ? ' aria-current="true"' : ''}>Toutes</a>
          ${annees.map((a) => `<a href="${parametres(marche, a)}" data-filtre="annee" data-valeur="${e(a)}"${annee === a ? ' aria-current="true"' : ''}>${e(a)}</a>`).join('')}
        </p>
      </div>
      <noscript><button class="bouton bouton--petit" type="submit">Filtrer</button></noscript>
    </form>
    <p class="compte-resultats mesure" data-compte aria-live="polite">${filtrees.length} tableau${filtrees.length > 1 ? 'x' : ''} de bord</p>
    <ul class="publications" data-liste>
      ${toutes.map((p) => `
      <li class="publication" data-marche="${e(p.marche)}" data-annee="${e(p.annee)}"${retenu(p) ? '' : ' hidden'}>
        <a class="publication-lien" href="${lien(p.lien)}" target="_blank" rel="noopener" data-curseur="ouvrir">
          <span class="publication-periode"><b class="tabulaire">${e(p.annee)}</b><i>${e(p.trimestre)}</i></span>
          <span class="publication-corps">
            <span class="badge">${e(p.marcheNom)}</span>
            <span class="publication-titre">${e(p.titre)}</span>
          </span>
          <span class="publication-action">${icone('document')}<span>PDF</span></span>
        </a>
      </li>`).join('')}
      <li class="vide" data-vide${filtrees.length ? ' hidden' : ''}>Aucun tableau de bord ne correspond à ces filtres.</li>
    </ul>
  </div>
</section>`;

  return socle({ D, titre: T(D, 'observatoire', 'heroTitre'), cle: 'observatoire', scene: 'electrique', chemin: '/observatoire', ecran, corps,
    description: 'Indicateurs du secteur et tableaux de bord trimestriels de l’internet, du fixe et du mobile au Gabon.' });
}

/* ======================= RÉGLEMENTATION ======================= */
export function reglementation(D, { ecran = false, categorie = 'tout', annee = 'toutes', recherche = '' } = {}) {
  const terme = recherche.trim().toLowerCase();
  const annees = Array.from(new Set(D.documents.map((d) => d.annee).filter(Boolean))).sort().reverse();
  /* La page porte toujours tous les textes ; ceux qui ne correspondent pas sont rendus
     masqués. Sans script le tri du serveur fait foi ; avec, le même calcul est refait
     dans la page, sans rechargement ni liste tronquée. */
  const retenu = (d) => (categorie === 'tout' || d.categorie === categorie)
    && (annee === 'toutes' || d.annee === annee)
    && (!terme || d.titre.toLowerCase().includes(terme) || String(d.annee).includes(terme) || String(d.description || '').toLowerCase().includes(terme));
  const documents = D.documents.slice().sort((a, b) => String(b.annee).localeCompare(String(a.annee)));
  const filtres = documents.filter(retenu);
  const parametres = (c, a) => {
    const q = new URLSearchParams();
    if (c !== 'tout') q.set('categorie', c);
    if (a !== 'toutes') q.set('annee', a);
    if (terme) q.set('q', recherche);
    const s = q.toString();
    return '/reglementation' + (s ? '?' + s : '') + '#bibliotheque';
  };

  const corps = `
${entete({ titre: T(D, 'reglementation', 'heroTitre'), chapo: T(D, 'reglementation', 'heroTexte'), scene: 'bleu-or',
  complement: `<form class="recherche recherche--grande" method="get" action="/reglementation" role="search" data-reveler>
      <label class="sr-only" for="q">${e(T(D, 'reglementation', 'rechercheAide'))}</label>
      ${icone('loupe')}
      <input id="q" name="q" type="search" value="${e(recherche)}" placeholder="${e(T(D, 'reglementation', 'rechercheAide'))}" autocomplete="off" data-recherche>
      <button class="bouton" type="submit">Rechercher</button>
    </form>` })}

<section class="section" id="bibliotheque" data-scene="clair" data-tonalite="clair">
  <div class="cadre">
    <form class="filtrage" method="get" action="/reglementation" data-filtrage="reglementation">
      ${terme ? `<input type="hidden" name="q" value="${e(recherche)}">` : ''}
      <div class="filtrage-groupe">
        <span class="filtrage-nom">Type</span>
        <p class="filtres" role="group" aria-label="Filtrer par type de texte">
          <a href="${parametres('tout', annee)}" data-filtre="categorie" data-valeur="tout"${categorie === 'tout' ? ' aria-current="true"' : ''}>Tous <span class="compte">${D.documents.length}</span></a>
          ${D.categories.map((c) => `<a href="${parametres(c.cle, annee)}" data-filtre="categorie" data-valeur="${e(c.cle)}"${categorie === c.cle ? ' aria-current="true"' : ''}>${e(c.nom)} <span class="compte">${D.documents.filter((d) => d.categorie === c.cle).length}</span></a>`).join('')}
        </p>
      </div>
      <div class="filtrage-groupe">
        <span class="filtrage-nom">Année</span>
        <p class="filtres" role="group" aria-label="Filtrer par année">
          <a href="${parametres(categorie, 'toutes')}" data-filtre="annee" data-valeur="toutes"${annee === 'toutes' ? ' aria-current="true"' : ''}>Toutes</a>
          ${annees.map((a) => `<a href="${parametres(categorie, a)}" data-filtre="annee" data-valeur="${e(a)}"${annee === a ? ' aria-current="true"' : ''}>${e(a)}</a>`).join('')}
        </p>
      </div>
      <noscript><button class="bouton bouton--petit" type="submit">Filtrer</button></noscript>
    </form>

    <p class="compte-resultats mesure" data-compte aria-live="polite">${filtres.length} texte${filtres.length > 1 ? 's' : ''}</p>

    <ul class="textes" data-liste>
      ${documents.map((d) => `
      <li class="texte" data-categorie="${e(d.categorie)}" data-annee="${e(d.annee)}" data-titre="${e((d.titre + ' ' + (d.description || '')).toLowerCase())}"${retenu(d) ? '' : ' hidden'}>
        <span class="texte-periode"><b class="tabulaire">${e(d.annee || '—')}</b><i>${e(d.nom)}</i></span>
        <span class="texte-corps">
          <span class="texte-titre">${e(d.titre)}</span>
          ${d.description ? `<span class="texte-description">${e(d.description)}</span>` : ''}
          ${d.date ? `<span class="mesure">${e(dateLisible(d.date))}</span>` : ''}
        </span>
        <span class="texte-actions">
          ${d.fichier || d.lien
            ? `<a class="texte-action" href="${lien(d.fichier || d.lien)}" target="_blank" rel="noopener">${icone('document')}<span>Consulter</span></a>
               <a class="texte-action" href="${lien(d.fichier || d.lien)}" download data-infobulle="Télécharger le PDF" aria-label="Télécharger ${e(d.titre)}">${icone('telecharger')}</a>`
            : '<span class="texte-action texte-action--vide">Sans fichier</span>'}
        </span>
      </li>`).join('')}
      <li class="vide" data-vide${filtres.length ? ' hidden' : ''}>Aucun texte ne correspond à cette recherche.</li>
    </ul>
  </div>
</section>`;

  return socle({ D, titre: T(D, 'reglementation', 'heroTitre'), cle: 'reglementation', scene: 'bleu-or', chemin: '/reglementation', ecran, corps,
    description: 'Lois, ordonnances, décrets, arrêtés, délibérations, décisions, barèmes et formulaires de l’ARCEP Gabon.' });
}

/* ======================= ACTUALITÉS ======================= */
export function actualites(D, { ecran = false, annee = 'toutes', recherche = '' } = {}) {
  const publiees = actualitesPubliees(D);
  const terme = recherche.trim().toLowerCase();
  const annees = Array.from(new Set(publiees.map((a) => (a.dateIso || '').slice(0, 4)).filter(Boolean))).sort().reverse();
  const rubriques = Array.from(new Set(publiees.map((a) => a.rubrique).filter(Boolean)));
  const retenu = (a) => (annee === 'toutes' || (a.dateIso || '').startsWith(annee))
    && (!terme || a.titre.toLowerCase().includes(terme) || String(a.chapeau || '').toLowerCase().includes(terme));
  const filtrees = publiees.filter(retenu);
  const [une, ...suite] = filtrees;
  const parametres = (a) => {
    const q = new URLSearchParams();
    if (a !== 'toutes') q.set('annee', a);
    if (terme) q.set('q', recherche);
    const s = q.toString();
    return '/actualites' + (s ? '?' + s : '') + '#liste';
  };

  const corps = `
${entete({ titre: T(D, 'actualites', 'heroTitre'), chapo: T(D, 'actualites', 'heroTexte'), scene: 'graphite' })}

<section class="section" id="liste" data-scene="blanc" data-tonalite="clair">
  <div class="cadre">
    <form class="filtrage filtrage--ligne" method="get" action="/actualites" data-filtrage="actualites">
      <div class="recherche">
        <label class="sr-only" for="q">Rechercher une actualité</label>
        ${icone('loupe')}
        <input id="q" name="q" type="search" value="${e(recherche)}" placeholder="Rechercher une actualité" autocomplete="off" data-recherche>
      </div>
      <p class="filtres" role="group" aria-label="Filtrer par année">
        <a href="${parametres('toutes')}" data-filtre="annee" data-valeur="toutes"${annee === 'toutes' ? ' aria-current="true"' : ''}>Toutes</a>
        ${annees.map((a) => `<a href="${parametres(a)}" data-filtre="annee" data-valeur="${e(a)}"${annee === a ? ' aria-current="true"' : ''}>${e(a)}</a>`).join('')}
      </p>
      ${rubriques.length ? `<p class="filtres" role="group" aria-label="Filtrer par rubrique">${rubriques.map((r) => `<button type="button" data-filtre="rubrique" data-valeur="${e(r)}">${e(r)}</button>`).join('')}</p>` : ''}
      <noscript><button class="bouton bouton--petit" type="submit">Filtrer</button></noscript>
    </form>
    <p class="compte-resultats mesure" data-compte aria-live="polite">${filtrees.length} publication${filtrees.length > 1 ? 's' : ''}</p>
    ${une ? `<div class="actualites-composition actualites-composition--page">${carteActualite(une, { grande: true })}</div>` : ''}
    <ul class="articles" data-liste data-serie>
      ${publiees.map((a) => `<li data-annee="${e((a.dateIso || '').slice(0, 4))}" data-rubrique="${e(a.rubrique || '')}" data-titre="${e((a.titre + ' ' + (a.chapeau || '')).toLowerCase())}"${retenu(a) && a !== une ? '' : ' hidden'}>${carteActualite(a)}</li>`).join('')}
      <li class="vide" data-vide${filtrees.length ? ' hidden' : ''}>Aucune actualité ne correspond à cette recherche.</li>
    </ul>
    <p class="suite" data-reveler><a class="lien" href="https://www.arcep.ga/actualites" target="_blank" rel="noopener">Archives complètes sur arcep.ga ${icone('diag')}</a></p>
  </div>
</section>`;

  return socle({ D, titre: T(D, 'actualites', 'heroTitre'), cle: 'actualites', scene: 'graphite', chemin: '/actualites', ecran, corps,
    description: 'Actualités de l’ARCEP Gabon : communications officielles et participations internationales.' });
}

export function article(D, a, { ecran = false } = {}) {
  const publiees = actualitesPubliees(D);
  const autres = publiees.filter((x) => x.id !== a.id).slice(0, 3);
  const corps = `
<article class="article-page">
  <section class="section entete entete--article" data-scene="graphite" data-tonalite="sombre">
    <span class="trame" aria-hidden="true"></span>
    <span class="lueur" aria-hidden="true" data-parallaxe="-0.15"></span>
    <div class="cadre cadre--etroit">
      <p class="article-page-meta mesure" data-reveler><a href="/actualites">Actualités</a> · <time datetime="${e(a.dateIso || '')}">${e(a.date)}</time>${a.rubrique ? ` · ${e(a.rubrique)}` : ''}</p>
      <h1 class="titre-1 article-page-titre" data-reveler="lignes">${e(a.titre)}</h1>
      ${a.chapeau ? `<p class="chapo" data-reveler>${e(a.chapeau)}</p>` : ''}
    </div>
  </section>
  <section class="section article-page-corps" data-scene="blanc" data-tonalite="clair">
    <div class="cadre cadre--etroit">
      ${a.image ? `<figure class="article-page-visuel" data-reveler="masque"><img src="${lien(a.image)}" alt="${e(a.alt || '')}" decoding="async"></figure>` : ''}
      ${a.corps ? `<div class="prose prose--grande" data-reveler>${paragraphes(a.corps)}</div>` : ''}
      ${a.lien ? `<p class="article-page-source" data-reveler><a class="bouton bouton--contour" href="${lien(a.lien)}" target="_blank" rel="noopener">Lire l’article sur arcep.ga ${icone('diag')}</a></p>` : ''}
    </div>
  </section>
  ${autres.length ? `
  <section class="section" data-scene="clair" data-tonalite="clair">
    <div class="cadre">
      ${sectionTete({ titre: 'À lire aussi', action: `<a class="lien" href="/actualites">Toute l’actualité ${icone('fleche')}</a>` })}
      <ul class="articles articles--trois" data-serie>${autres.map((x) => `<li>${carteActualite(x)}</li>`).join('')}</ul>
    </div>
  </section>` : ''}
</article>`;

  const R = reglages(D);
  return socle({ D, titre: a.titre, cle: 'actualites', scene: 'graphite', chemin: `/actualites/${encodeURIComponent(a.id)}`, ecran, corps,
    description: a.chapeau || a.titre, image: a.image || '',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.titre, datePublished: a.dateIso || undefined,
      image: a.image ? (R.adressePublique || '') + a.image : undefined,
      publisher: { '@type': 'Organization', name: D.institution.nom },
    } });
}

/* ======================= CONSOMMATEURS ======================= */
export function consommateurs(D, { ecran = false, recherche = '' } = {}) {
  const I = D.institution;
  const droits = L(D, 'droits');
  const demarches = L(D, 'demarches');
  const categories = Array.from(new Set(D.faq.map((f) => f.categorie).filter(Boolean)));
  const corps = `
${entete({ titre: T(D, 'consommateurs', 'heroTitre'), chapo: T(D, 'consommateurs', 'heroTexte'), scene: 'vert-bleu',
  complement: `<div class="numero numero--entete" data-reveler>
      <a class="numero-valeur" href="${tel(I.numeroCourt)}" aria-label="Appeler le ${e(I.numeroCourt)}">${e(I.numeroCourt)}</a>
      <p class="numero-texte">${e(T(D, 'consommateurs', 'numeroTexte'))}</p>
    </div>` })}

<section class="section" id="droits" data-scene="clair" data-tonalite="clair">
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'consommateurs', 'droitsTitre') })}
    <ol class="droits" data-serie>
      ${droits.map((d) => `<li class="droit"><span class="droit-icone">${icone('bouclier')}</span><h3 class="titre-4">${e(d.titre)}</h3><p>${e(d.texte)}</p></li>`).join('')}
    </ol>
  </div>
</section>

<section class="section" id="demarches" data-scene="or-blanc" data-tonalite="clair">
  <span class="lueur" aria-hidden="true" data-parallaxe="0.1" style="right:-20%;top:-20%"></span>
  <div class="cadre">
    ${sectionTete({ titre: T(D, 'consommateurs', 'demarchesTitre') })}
    <ul class="demarches demarches--grille" data-serie>
      ${demarches.map((d) => `<li><a class="demarche" href="${lien(d.lien) || '/contact'}">
        <span class="demarche-titre titre-5">${e(d.titre)}</span>
        <span class="demarche-texte">${e(d.texte)}</span>
        ${icone('fleche')}
      </a></li>`).join('')}
    </ul>
  </div>
</section>

<section class="section" id="faq" data-scene="blanc" data-tonalite="clair">
  <div class="cadre faq-cadre">
    <div class="faq-cote">
      <h2 class="titre-2" data-reveler="lignes">${e(T(D, 'consommateurs', 'faqTitre'))}</h2>
      <form class="recherche" method="get" action="/consommateurs#faq" role="search" data-reveler data-filtrage="faq">
        <label class="sr-only" for="faq-q">Rechercher une question</label>
        ${icone('loupe')}
        <input id="faq-q" name="q" type="search" value="${e(recherche)}" placeholder="Rechercher une question" autocomplete="off" data-recherche>
        ${categories.length ? `<p class="filtres" role="group" aria-label="Filtrer par thème">${categories.map((c) => `<button type="button" data-filtre="categorie" data-valeur="${e(c)}">${e(c)}</button>`).join('')}</p>` : ''}
      </form>
      <p class="compte-resultats mesure" data-compte aria-live="polite">${D.faq.length} questions</p>
      <p class="faq-aide" data-reveler>Votre question n’est pas là ? <a class="lien lien--simple" href="/contact">Écrivez-nous ${icone('fleche')}</a></p>
    </div>
    <div class="accordeon faq" data-liste data-reveler>
      ${D.faq.map((f, i) => {
        const terme = recherche.trim().toLowerCase();
        const visible = !terme || f.q.toLowerCase().includes(terme) || f.r.toLowerCase().includes(terme);
        return `<details${i === 0 && !terme ? ' open' : ''} data-categorie="${e(f.categorie || '')}" data-titre="${e((f.q + ' ' + f.r).toLowerCase())}"${visible ? '' : ' hidden'}>
        <summary>${e(f.q)} ${icone('plus')}</summary>
        <div class="accordeon-corps">${paragraphes(f.r)}</div>
      </details>`;
      }).join('')}
      <p class="vide" data-vide hidden>Aucune question ne correspond à cette recherche.</p>
    </div>
  </div>
</section>`;

  return socle({ D, titre: T(D, 'consommateurs', 'heroTitre'), cle: 'consommateurs', scene: 'vert-bleu', chemin: '/consommateurs', ecran, corps,
    description: 'Numéro court 1331, droits des usagers, démarches, qualité de service et questions fréquentes de l’ARCEP Gabon.',
    jsonld: { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: D.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })) } });
}

/* ======================= CONTACT ======================= */
export function contact(D, { ecran = false, envoye = false, erreur = '', champs = {}, direction = '' } = {}) {
  const I = D.institution;
  const corps = `
${entete({ titre: T(D, 'contact', 'heroTitre'), chapo: T(D, 'contact', 'heroTexte'), scene: 'graphite' })}

<section class="section" data-scene="clair" data-tonalite="clair" id="formulaire">
  <div class="cadre contact-page">
    <div class="contact-page-cote">
      ${coordonnees(D)}
      <p class="contact-page-note" data-reveler>Les demandes reçues par ce formulaire sont enregistrées par le secrétariat de l’Autorité et orientées vers la direction compétente.</p>
    </div>
    <div class="contact-page-formulaire">
      <h2 class="titre-3" data-reveler="lignes">${e(T(D, 'contact', 'formulaireTitre'))}</h2>
      ${envoye ? `<p class="message message--ok" role="status">${e(T(D, 'contact', 'confirmation'))}</p>` : `
      <form class="formulaire" method="post" action="/contact#formulaire" data-reveler novalidate>
        ${erreur ? `<p class="message message--erreur" role="alert">${e(erreur)}</p>` : ''}
        <div class="formulaire-ligne">
          <p class="champ">
            <label for="nom">Nom et prénom</label>
            <input id="nom" name="nom" type="text" autocomplete="name" required maxlength="120" value="${e(champs.nom || '')}">
          </p>
          <p class="champ">
            <label for="courriel">Courriel</label>
            <input id="courriel" name="courriel" type="email" autocomplete="email" required maxlength="160" value="${e(champs.courriel || '')}">
          </p>
        </div>
        <div class="formulaire-ligne">
          <p class="champ">
            <label for="objet">Objet</label>
            <input id="objet" name="objet" type="text" maxlength="200" value="${e(champs.objet || '')}" placeholder="Réclamation, question, demande d’information…">
          </p>
          <p class="champ">
            <label for="direction">Direction destinataire</label>
            <select id="direction" name="direction">
              ${D.directions.map((d) => `<option${(champs.direction || direction) === d ? ' selected' : ''}>${e(d)}</option>`).join('')}
            </select>
          </p>
        </div>
        <p class="champ">
          <label for="message">Message</label>
          <textarea id="message" name="message" rows="6" required maxlength="4000">${e(champs.message || '')}</textarea>
          <span class="aide">Dix caractères au minimum, quatre mille au maximum.</span>
        </p>
        <p class="champ champ--piege" aria-hidden="true">
          <label for="site">Ne rien saisir ici</label>
          <input id="site" name="site" type="text" tabindex="-1" autocomplete="off">
        </p>
        <p class="formulaire-actions">
          <button class="bouton" type="submit">Envoyer la demande ${icone('fleche')}</button>
          <span class="aide">Les données saisies servent uniquement au traitement de votre demande.</span>
        </p>
      </form>`}
    </div>
  </div>
</section>`;

  return socle({ D, titre: T(D, 'contact', 'heroTitre'), cle: 'contact', scene: 'graphite', chemin: '/contact', ecran, corps,
    description: `Contacter l’ARCEP Gabon : ${I.adresse}, ${I.telephones.join(', ')}, ${I.email}, numéro consommateurs ${I.numeroCourt}.` });
}

/* ======================= PAGES LÉGALES ======================= */
export function mentionsLegales(D, { ecran = false } = {}) {
  const I = D.institution;
  const corps = `
${entete({ titre: 'Mentions légales', scene: 'graphite' })}
<section class="section" data-scene="clair" data-tonalite="clair">
  <div class="cadre cadre--etroit prose prose--grande">
    <h2 class="titre-4">Éditeur</h2>
    <p>${e(I.nom)} (${e(I.sigle)}), ${e(I.statut).toLowerCase()}, créée par ${e(I.fondation)}.</p>
    <p>${e(I.adresse)} · ${I.telephones.map((t) => e(t)).join(' · ')} · <a href="mailto:${e(I.email)}">${e(I.email)}</a></p>
    <h2 class="titre-4">Contenus</h2>
    <p>Les textes réglementaires, tableaux de bord, chiffres et actualités publiés sur ce site sont ceux de l’Autorité. Les documents téléchargeables sont fournis à titre d’information ; seule la version publiée au Journal officiel de la République gabonaise fait foi pour les textes législatifs et réglementaires.</p>
    <h2 class="titre-4">Hébergement</h2>
    <p>Le site est servi par l’infrastructure de l’Autorité. Aucune ressource n’est chargée depuis un domaine tiers.</p>
  </div>
</section>`;
  return socle({ D, titre: 'Mentions légales', cle: '', scene: 'graphite', chemin: '/mentions-legales', ecran, corps,
    description: 'Éditeur, contenus et hébergement du site de l’ARCEP Gabon.' });
}

export function confidentialite(D, { ecran = false } = {}) {
  const corps = `
${entete({ titre: 'Confidentialité', scene: 'graphite' })}
<section class="section" data-scene="clair" data-tonalite="clair">
  <div class="cadre cadre--etroit prose prose--grande">
    <h2 class="titre-4">Ce que le site enregistre</h2>
    <p>La consultation du site ne dépose aucun témoin de connexion (cookie) et ne fait appel à aucun service de mesure d’audience ni à aucun domaine tiers : caractères, scripts et médias sont servis par le site lui-même.</p>
    <h2 class="titre-4">Le formulaire de contact</h2>
    <p>Les informations saisies dans le formulaire de contact — nom, courriel, objet, direction destinataire, message — sont enregistrées par le secrétariat de l’Autorité avec la date de réception et l’adresse d’origine de la demande, dans le seul but d’y répondre. Elles ne sont ni cédées ni utilisées à d’autres fins.</p>
    <h2 class="titre-4">L’espace d’administration</h2>
    <p>Seul l’espace réservé au personnel habilité emploie un témoin de session, strictement nécessaire à l’authentification, supprimé à la déconnexion.</p>
    <h2 class="titre-4">Vos droits</h2>
    <p>Pour toute question relative aux données vous concernant, adressez-vous à l’Autorité par les moyens indiqués sur la page <a href="/contact">Contact</a>.</p>
  </div>
</section>`;
  return socle({ D, titre: 'Confidentialité', cle: '', scene: 'graphite', chemin: '/confidentialite', ecran, corps,
    description: 'Ce que le site de l’ARCEP Gabon enregistre, et pourquoi.' });
}

/* ======================= PAGE INTROUVABLE ======================= */
export function introuvable(D, { ecran = false } = {}) {
  const corps = `
${entete({ titre: 'Page introuvable', chapo: 'L’adresse demandée ne correspond à aucune page du site. Les rubriques ci-dessous vous remettront sur la bonne voie.', scene: 'graphite' })}
<section class="section" data-scene="clair" data-tonalite="clair">
  <div class="cadre">
    <ul class="sommaire sommaire--grand" data-serie>
      ${RUBRIQUES.map((r) => `<li><a href="${r.chemin}"><span class="titre-4">${e(r.nom)}</span><span>${e(r.tenue)}</span></a></li>`).join('')}
    </ul>
    <p class="suite" data-reveler><a class="lien" href="/">Revenir à l’accueil ${icone('fleche')}</a></p>
  </div>
</section>`;
  return socle({ D, titre: 'Page introuvable', cle: '', scene: 'graphite', chemin: '/404', ecran, corps,
    description: 'La page demandée n’existe pas ou a été déplacée.' });
}

export { rubriqueDe, couture };
