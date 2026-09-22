/* ARCEP Gabon — écrans de l'espace d'administration.
   Rendu entièrement côté serveur, formulaires classiques : l'administration reste
   utilisable sans JavaScript et sans dépendance. Chaque écriture porte un jeton anti-rejeu. */
import { e, lien, ressource, icone, dateLisible } from './base.mjs';
import { PAGES, LISTES, ROLES as DESCRIPTIONS_ROLES, liste as lireListe, reglages as lireReglages } from '../schema.mjs';
const ROLES = Object.keys(DESCRIPTIONS_ROLES);

const MENU = [
  { titre: 'Contenu', entrees: [
    ['tableau', '/admin', 'Tableau de bord'], ['pages', '/admin/pages', 'Pages'], ['actualites', '/admin/actualites', 'Actualités'],
    ['documents', '/admin/documents', 'Réglementation'], ['observatoire', '/admin/observatoire', 'Observatoire'],
    ['faq', '/admin/faq', 'FAQ'], ['chiffres', '/admin/chiffres', 'Chiffres clés'], ['medias', '/admin/medias', 'Médiathèque'],
  ] },
  { titre: 'Organisation', admin: true, entrees: [
    ['categories', '/admin/categories', 'Catégories'], ['listes', '/admin/listes/droits', 'Listes consommateurs'],
  ] },
  { titre: 'Configuration', admin: true, entrees: [
    ['utilisateurs', '/admin/utilisateurs', 'Utilisateurs'], ['reglages', '/admin/reglages', 'Réglages et SEO'],
  ] },
];

const socle = ({ titre, corps, compte = null, actif = '', csrf = '', large = false }) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titre)} — Administration ARCEP</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/png" href="/assets/icone-arcep.png">
<link rel="stylesheet" href="${ressource('/css/polices.css')}">
<link rel="stylesheet" href="${ressource('/css/admin.css')}">
</head>
<body class="${compte ? 'connecte' : 'entree'}">
<svg hidden aria-hidden="true">
  <symbol id="i-fleche" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-diag" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-haut" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>
  <symbol id="i-bas" viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
</svg>
${compte ? `
<header class="haut">
  <button class="haut-menu" type="button" data-lateral aria-expanded="false" aria-controls="lateral"><svg class="icone"><use href="#i-menu"/></svg><span class="sr-only">Navigation</span></button>
  <p class="haut-marque"><img src="/assets/logo-arcep-blanc.png" alt="ARCEP Gabon"><span>Administration</span></p>
  <a class="haut-site" href="/" target="_blank" rel="noopener">Voir le site <svg class="icone"><use href="#i-diag"/></svg></a>
  <form class="haut-sortie" method="post" action="/admin/deconnexion">
    <input type="hidden" name="csrf" value="${e(csrf)}">
    <a href="/admin/compte" class="haut-compte"><b>${e(compte.nom)}</b><span>${e(compte.role)}</span></a>
    <button type="submit">Se déconnecter</button>
  </form>
</header>
<div class="cadre-admin">
  <nav class="lateral" id="lateral" aria-label="Administration">
    ${MENU.filter((g) => !g.admin || compte.role === 'administrateur').map((g) => `
    <p class="lateral-titre">${e(g.titre)}</p>
    <ul>${g.entrees.map(([cle, chemin, nom]) => `<li><a href="${chemin}"${actif === cle ? ' aria-current="page"' : ''}>${e(nom)}</a></li>`).join('')}</ul>`).join('')}
    <p class="lateral-titre">Compte</p>
    <ul><li><a href="/admin/compte"${actif === 'compte' ? ' aria-current="page"' : ''}>Mon mot de passe</a></li></ul>
  </nav>
  <main class="page${large ? ' page--large' : ''}">
${corps}
  </main>
</div>` : `<main class="page-entree">${corps}</main>`}
<script src="${ressource('/js/admin.js')}" defer></script>
</body>
</html>
`;

const messages = (message = '', erreur = '') => `${message ? `<p class="message message--ok" role="status">${e(message)}</p>` : ''}${erreur ? `<p class="message message--erreur" role="alert">${e(erreur)}</p>` : ''}`;
const tete = (titre, actions = '', chapo = '') => `<div class="tete-page"><div><h1>${e(titre)}</h1>${chapo ? `<p class="chapo">${e(chapo)}</p>` : ''}</div>${actions ? `<div class="tete-actions">${actions}</div>` : ''}</div>`;
const cache = (csrf) => `<input type="hidden" name="csrf" value="${e(csrf)}">`;
const suppression = (csrf, action, question) => `<form method="post" action="${action}" data-confirmer="${e(question)}">${cache(csrf)}<button type="submit" class="lien-danger">Supprimer</button></form>`;
const choixMedias = (nom, medias, valeur, libelle) => medias.length ? `
<p class="champ">
  <label for="${nom}">${e(libelle)}</label>
  <select id="${nom}" name="${nom}">
    <option value="">— aucun —</option>
    ${medias.map((g) => `<optgroup label="${e(g.titre)}">${g.entrees.map((m) => `<option value="${e(m.adresse)}"${m.adresse === valeur ? ' selected' : ''}>${e(m.nom)}</option>`).join('')}</optgroup>`).join('')}
  </select>
  <span class="aide">Sans effet si un fichier est téléversé ci-dessus.</span>
</p>` : `<input type="hidden" name="${nom}" value="${e(valeur || '')}">`;

/* ======================= CONNEXION ======================= */
export function connexion({ erreur = '', premier = false } = {}) {
  const corps = `
<div class="entree-bloc">
  <img class="entree-logo" src="/assets/logo-arcep-blanc.png" alt="ARCEP Gabon">
  <h1>${premier ? 'Créer le premier compte' : 'Administration'}</h1>
  <p class="entree-mot">${premier
    ? 'Aucun compte n’existe encore. Celui que vous créez ici sera administrateur et aura accès à la totalité des contenus.'
    : 'Accès réservé au personnel habilité de l’Autorité.'}</p>
  ${messages('', erreur)}
  <form method="post" action="${premier ? '/admin/creation' : '/admin/connexion'}">
    <p class="champ"><label for="identifiant">Identifiant</label><input id="identifiant" name="identifiant" type="text" required autocomplete="username" maxlength="60"></p>
    ${premier ? '<p class="champ"><label for="nom">Nom affiché</label><input id="nom" name="nom" type="text" required maxlength="80"></p>' : ''}
    <p class="champ"><label for="motdepasse">Mot de passe</label><input id="motdepasse" name="motdepasse" type="password" required autocomplete="${premier ? 'new-password' : 'current-password'}" minlength="${premier ? 12 : 1}" maxlength="200">${premier ? '<span class="aide">Douze caractères au minimum.</span>' : ''}</p>
    <button class="bouton" type="submit">${premier ? 'Créer le compte' : 'Entrer'}</button>
  </form>
  <p class="entree-retour"><a href="/">Retour au site</a></p>
</div>`;
  return socle({ titre: premier ? 'Premier compte' : 'Connexion', corps });
}

export const refus = ({ compte, csrf }) => socle({ titre: 'Accès réservé', compte, csrf, corps: `${tete('Accès réservé')}<p class="chapo">Cet écran est réservé aux administrateurs. Votre rôle est « ${e(compte.role)} ».</p>` });
export const introuvable = ({ compte, csrf }) => socle({ titre: 'Écran introuvable', compte, csrf, corps: `${tete('Écran introuvable')}<p class="chapo">Aucun écran ne répond à cette adresse. <a href="/admin">Revenir au tableau de bord</a>.</p>` });

/* ======================= TABLEAU DE BORD ======================= */
export function tableau({ compte, csrf, D, versions, message = '' }) {
  const publications = D.observatoire.reduce((n, m) => n + m.publications.length, 0);
  const brouillons = D.actualites.filter((a) => a.statut === 'brouillon');
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const programmees = D.actualites.filter((a) => a.statut === 'publie' && a.publierLe && a.publierLe > aujourdhui);
  const compteurs = [
    [D.actualites.length, 'Actualités', '/admin/actualites'], [D.documents.length, 'Textes réglementaires', '/admin/documents'],
    [publications, 'Tableaux de bord', '/admin/observatoire'], [D.faq.length, 'Questions fréquentes', '/admin/faq'],
    [D.chiffres.length, 'Chiffres clés', '/admin/chiffres'], [Object.keys(PAGES).length, 'Pages', '/admin/pages'],
  ];
  const corps = `
${tete('Tableau de bord', '', 'Les contenus publiés sur le site. Toute modification est enregistrée et une copie de l’état précédent est conservée trente jours.')}
${messages(message)}
<ul class="compteurs">
  ${compteurs.map(([n, nom, chemin]) => `<li><a href="${chemin}"><span class="compteur-valeur">${n}</span><span class="compteur-nom">${e(nom)}</span></a></li>`).join('')}
</ul>
<div class="colonnes">
  <section class="bloc">
    <h2>À suivre</h2>
    ${brouillons.length ? `<p class="bloc-ligne"><b>${brouillons.length}</b> brouillon${brouillons.length > 1 ? 's' : ''} d’actualité — <a href="/admin/actualites?filtre=brouillon">voir</a></p>` : '<p class="bloc-ligne">Aucun brouillon en attente.</p>'}
    ${programmees.length ? `<p class="bloc-ligne"><b>${programmees.length}</b> actualité${programmees.length > 1 ? 's' : ''} programmée${programmees.length > 1 ? 's' : ''} — <a href="/admin/actualites?filtre=programme">voir</a></p>` : ''}
    <p class="bloc-ligne">Dernier tableau de bord : <b>${e(D.observatoire[0]?.publications[0]?.titre || '—')}</b></p>
    <p class="bloc-ligne">Chiffres clés : <b>${e(D.chiffresSource)}</b></p>
  </section>
  <section class="bloc">
    <h2>Versions conservées</h2>
    ${versions.length ? `<ul class="versions">${versions.map((v) => `<li><code>${e(v)}</code>${compte.role === 'administrateur' ? `<form method="post" action="/admin/restaurer" data-confirmer="Restaurer cette version ? L’état actuel sera conservé dans l’historique.">${cache(csrf)}<input type="hidden" name="version" value="${e(v)}"><button type="submit" class="lien-action">Restaurer</button></form>` : ''}</li>`).join('')}</ul>`
      : '<p class="vide">Aucune modification enregistrée pour l’instant.</p>'}
  </section>
</div>`;
  return socle({ titre: 'Tableau de bord', corps, compte, csrf, actif: 'tableau' });
}

/* ======================= MON COMPTE ======================= */
export function monCompte({ compte, csrf, message = '', erreur = '' }) {
  const corps = `
${tete('Mon mot de passe', '', `Compte « ${compte.identifiant} », rôle ${compte.role}.`)}
${messages(message, erreur)}
<form method="post" action="/admin/compte" class="formulaire">
  ${cache(csrf)}
  <p class="champ"><label for="actuel">Mot de passe actuel</label><input id="actuel" name="actuel" type="password" required autocomplete="current-password"></p>
  <p class="champ"><label for="nouveau">Nouveau mot de passe</label><input id="nouveau" name="nouveau" type="password" required minlength="12" autocomplete="new-password"><span class="aide">Douze caractères au minimum.</span></p>
  <p class="champ"><label for="confirmation">Confirmer le nouveau mot de passe</label><input id="confirmation" name="confirmation" type="password" required minlength="12" autocomplete="new-password"></p>
  <p class="barre-actions"><button class="bouton" type="submit">Modifier</button></p>
</form>`;
  return socle({ titre: 'Mon mot de passe', corps, compte, csrf, actif: 'compte' });
}

/* ======================= PAGES ======================= */
export function listePages({ compte, csrf, D, message = '' }) {
  const corps = `
${tete('Pages', '', 'Les titres et textes d’habillage de chaque page. Les faits — statut, missions, chiffres, coordonnées — se modifient dans leurs propres écrans.')}
${messages(message)}
<ul class="liste-cartes">
  ${Object.entries(PAGES).map(([cle, p]) => {
    const modifies = Object.keys(p.champs).filter((c) => D.pages?.[cle]?.[c]).length;
    return `<li><a href="/admin/pages/${cle}"><span class="liste-carte-titre">${e(p.nom)}</span><span class="liste-carte-info">${Object.keys(p.champs).length} textes${modifies ? ` · ${modifies} personnalisé${modifies > 1 ? 's' : ''}` : ''}</span></a></li>`;
  }).join('')}
</ul>`;
  return socle({ titre: 'Pages', corps, compte, csrf, actif: 'pages' });
}

export function formPage({ compte, csrf, D, cle, message = '', erreur = '' }) {
  const p = PAGES[cle];
  const corps = `
${tete(`Page « ${p.nom} »`, `<a class="lien-action" href="/${cle === 'accueil' ? '' : cle}" target="_blank" rel="noopener">Voir la page <svg class="icone"><use href="#i-diag"/></svg></a>`, 'Laissez un champ vide pour revenir au texte de départ.')}
${messages(message, erreur)}
<form method="post" action="/admin/pages/${cle}" class="formulaire">
  ${cache(csrf)}
  ${Object.entries(p.champs).map(([nom, c]) => {
    const valeur = D.pages?.[cle]?.[nom] || '';
    return `<p class="champ">
      <label for="${nom}">${e(c.label)}</label>
      ${c.type === 'long' ? `<textarea id="${nom}" name="${nom}" rows="3" maxlength="4000" placeholder="${e(c.defaut)}">${e(valeur)}</textarea>` : `<input id="${nom}" name="${nom}" type="text" maxlength="400" value="${e(valeur)}" placeholder="${e(c.defaut)}">`}
      <span class="aide">Texte de départ : ${e(c.defaut)}</span>
    </p>`;
  }).join('')}
  <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button><a href="/admin/pages">Retour</a></p>
</form>`;
  return socle({ titre: p.nom, corps, compte, csrf, actif: 'pages' });
}

/* ======================= ACTUALITÉS ======================= */
export function listeActualites({ compte, csrf, D, message = '', filtre = 'toutes' }) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const etat = (a) => a.statut === 'brouillon' ? 'brouillon' : (a.publierLe && a.publierLe > aujourdhui) ? 'programme' : 'publie';
  const liste = D.actualites.filter((a) => filtre === 'toutes' || etat(a) === filtre);
  const corps = `
${tete('Actualités', `<a class="bouton" href="/admin/actualites/nouvelle"><svg class="icone"><use href="#i-plus"/></svg> Nouvelle actualité</a>`)}
${messages(message)}
<p class="filtres">
  ${[['toutes', 'Toutes'], ['publie', 'Publiées'], ['programme', 'Programmées'], ['brouillon', 'Brouillons']].map(([v, n]) =>
    `<a href="/admin/actualites?filtre=${v}"${filtre === v ? ' aria-current="true"' : ''}>${n} <span>${v === 'toutes' ? D.actualites.length : D.actualites.filter((a) => etat(a) === v).length}</span></a>`).join('')}
</p>
<table class="table">
  <thead><tr><th scope="col">Date</th><th scope="col">Titre</th><th scope="col">Rubrique</th><th scope="col">État</th><th scope="col">Actions</th></tr></thead>
  <tbody>
    ${liste.map((a) => `
    <tr>
      <td class="mono">${e(a.dateIso || a.date)}</td>
      <td><a href="/admin/actualites/${encodeURIComponent(a.id)}">${e(a.titre)}</a>${a.image ? '' : ' <span class="pastille">sans visuel</span>'}</td>
      <td>${e(a.rubrique || '—')}</td>
      <td><span class="pastille pastille--${etat(a)}">${{ publie: 'publiée', programme: 'programmée le ' + dateLisible(a.publierLe), brouillon: 'brouillon' }[etat(a)]}</span></td>
      <td class="actions">
        <a href="/admin/actualites/${encodeURIComponent(a.id)}">Modifier</a>
        <a href="/admin/actualites/${encodeURIComponent(a.id)}/apercu" target="_blank" rel="noopener">Aperçu</a>
        ${suppression(csrf, `/admin/actualites/${encodeURIComponent(a.id)}/supprimer`, 'Supprimer définitivement cette actualité ?')}
      </td>
    </tr>`).join('') || '<tr><td colspan="5" class="vide">Aucune actualité dans cet état.</td></tr>'}
  </tbody>
</table>`;
  return socle({ titre: 'Actualités', corps, compte, csrf, actif: 'actualites', large: true });
}

export function formActualite({ compte, csrf, actualite = null, erreur = '', message = '', medias = [] }) {
  const a = { id: '', titre: '', dateIso: '', lien: '', image: '', alt: '', chapeau: '', corps: '', rubrique: '', statut: 'publie', publierLe: '', ...(actualite || {}) };
  const nouvelle = !actualite || !actualite.id;
  const corps = `
${tete(nouvelle ? 'Nouvelle actualité' : 'Modifier l’actualité', nouvelle ? '' : `<a class="lien-action" href="/admin/actualites/${encodeURIComponent(a.id)}/apercu" target="_blank" rel="noopener">Aperçu <svg class="icone"><use href="#i-diag"/></svg></a>`)}
${messages(message, erreur)}
<form method="post" enctype="multipart/form-data" action="${nouvelle ? '/admin/actualites/nouvelle' : `/admin/actualites/${encodeURIComponent(a.id)}`}" class="formulaire formulaire--deux">
  ${cache(csrf)}
  <div class="formulaire-principal">
    <p class="champ"><label for="titre">Titre</label><input id="titre" name="titre" type="text" required maxlength="300" value="${e(a.titre)}"></p>
    <p class="champ"><label for="chapeau">Chapeau</label><textarea id="chapeau" name="chapeau" rows="3" maxlength="2000" data-compte="chapeau-compte">${e(a.chapeau || '')}</textarea><span class="aide" id="chapeau-compte"></span></p>
    <p class="champ"><label for="corps">Corps de l’article</label><textarea id="corps" name="corps" rows="14" maxlength="20000" data-compte="corps-compte">${e(a.corps || '')}</textarea><span class="aide" id="corps-compte">Une ligne vide sépare deux paragraphes.</span></p>
    <p class="champ"><label for="lien">Lien vers l’article officiel (facultatif)</label><input id="lien" name="lien" type="url" maxlength="500" value="${e(a.lien)}" placeholder="https://www.arcep.ga/…"></p>
  </div>
  <div class="formulaire-cote">
    <fieldset class="bloc">
      <legend>Publication</legend>
      <p class="champ"><label for="statut">État</label><select id="statut" name="statut"><option value="publie"${a.statut !== 'brouillon' ? ' selected' : ''}>Publiée</option><option value="brouillon"${a.statut === 'brouillon' ? ' selected' : ''}>Brouillon</option></select></p>
      <p class="champ"><label for="dateIso">Date de l’actualité</label><input id="dateIso" name="dateIso" type="date" required value="${e(a.dateIso)}"></p>
      <p class="champ"><label for="publierLe">Publier à partir du</label><input id="publierLe" name="publierLe" type="date" value="${e(a.publierLe || '')}"><span class="aide">Laissez vide pour publier immédiatement. Une actualité publiée avec une date future reste invisible jusqu’à cette date.</span></p>
      <p class="champ"><label for="rubrique">Rubrique</label><input id="rubrique" name="rubrique" type="text" maxlength="60" value="${e(a.rubrique || '')}" placeholder="Communiqué, Événement, Célébration…"></p>
    </fieldset>
    <fieldset class="bloc">
      <legend>Visuel</legend>
      <p class="apercu" id="apercu-visuel">${a.image ? `<img src="${lien(a.image)}" alt="">` : ''}</p>
      <p class="champ"><label for="visuel">Téléverser une image</label><input id="visuel" name="visuel" type="file" accept="image/jpeg,image/png,image/webp" data-apercu="apercu-visuel"><span class="aide">JPEG, PNG ou WebP, cinq mégaoctets au maximum.</span></p>
      ${choixMedias('image', medias, a.image, '…ou choisir dans la médiathèque')}
      <p class="champ"><label for="alt">Description du visuel (accessibilité)</label><input id="alt" name="alt" type="text" maxlength="200" value="${e(a.alt || '')}"></p>
    </fieldset>
    <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button><a href="/admin/actualites">Retour</a></p>
  </div>
</form>`;
  return socle({ titre: nouvelle ? 'Nouvelle actualité' : 'Modifier', corps, compte, csrf, actif: 'actualites', large: true });
}

/* ======================= DOCUMENTS ======================= */
export function listeDocuments({ compte, csrf, D, message = '', categorie = 'tout' }) {
  const docs = categorie === 'tout' ? D.documents : D.documents.filter((d) => d.categorie === categorie);
  const corps = `
${tete('Réglementation', `<a class="bouton" href="/admin/documents/nouveau"><svg class="icone"><use href="#i-plus"/></svg> Nouveau texte</a>`)}
${messages(message)}
<p class="filtres">
  <a href="/admin/documents"${categorie === 'tout' ? ' aria-current="true"' : ''}>Tous <span>${D.documents.length}</span></a>
  ${D.categories.map((c) => `<a href="/admin/documents?categorie=${encodeURIComponent(c.cle)}"${categorie === c.cle ? ' aria-current="true"' : ''}>${e(c.nom)} <span>${D.documents.filter((d) => d.categorie === c.cle).length}</span></a>`).join('')}
</p>
<table class="table">
  <thead><tr><th scope="col">Année</th><th scope="col">Catégorie</th><th scope="col">Intitulé</th><th scope="col">Fichier</th><th scope="col">Actions</th></tr></thead>
  <tbody>
    ${docs.map((d) => `
    <tr>
      <td class="mono">${e(d.annee || '—')}</td>
      <td>${e(d.nom)}</td>
      <td><a href="/admin/documents/${encodeURIComponent(d.id)}">${e(d.titre)}</a></td>
      <td>${d.fichier ? '<span class="pastille pastille--publie">PDF</span>' : d.lien ? '<span class="pastille">lien</span>' : '<span class="pastille pastille--brouillon">aucun</span>'}</td>
      <td class="actions"><a href="/admin/documents/${encodeURIComponent(d.id)}">Modifier</a>${suppression(csrf, `/admin/documents/${encodeURIComponent(d.id)}/supprimer`, 'Supprimer définitivement ce texte ?')}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="vide">Aucun texte dans cette catégorie.</td></tr>'}
  </tbody>
</table>`;
  return socle({ titre: 'Réglementation', corps, compte, csrf, actif: 'documents', large: true });
}

export function formDocument({ compte, csrf, D, document: doc = null, erreur = '', message = '', medias = [] }) {
  const d = { id: '', titre: '', annee: '', date: '', categorie: D.categories[0]?.cle || '', lien: '', fichier: '', description: '', ...(doc || {}) };
  const nouveau = !doc || !doc.id;
  const corps = `
${tete(nouveau ? 'Nouveau texte' : 'Modifier le texte')}
${messages(message, erreur)}
<form method="post" enctype="multipart/form-data" action="${nouveau ? '/admin/documents/nouveau' : `/admin/documents/${encodeURIComponent(d.id)}`}" class="formulaire formulaire--deux">
  ${cache(csrf)}
  <div class="formulaire-principal">
    <p class="champ"><label for="titre">Intitulé du texte</label><input id="titre" name="titre" type="text" required maxlength="400" value="${e(d.titre)}"></p>
    <p class="champ"><label for="description">Description (facultative)</label><textarea id="description" name="description" rows="4" maxlength="1000">${e(d.description || '')}</textarea></p>
    <div class="formulaire-ligne">
      <p class="champ"><label for="categorie">Catégorie</label><select id="categorie" name="categorie">${D.categories.map((c) => `<option value="${e(c.cle)}"${c.cle === d.categorie ? ' selected' : ''}>${e(c.nom)}</option>`).join('')}</select></p>
      <p class="champ"><label for="annee">Année</label><input id="annee" name="annee" type="text" maxlength="4" pattern="[0-9]{4}" value="${e(d.annee)}" placeholder="2026"></p>
      <p class="champ"><label for="date">Date précise (facultative)</label><input id="date" name="date" type="date" value="${e(d.date || '')}"></p>
    </div>
  </div>
  <div class="formulaire-cote">
    <fieldset class="bloc">
      <legend>Document</legend>
      ${d.fichier ? `<p class="aide">Fichier actuel : <a href="${lien(d.fichier)}" target="_blank" rel="noopener">${e(d.fichier.split('/').pop())}</a></p>` : ''}
      <p class="champ"><label for="pdf">Téléverser un PDF</label><input id="pdf" name="pdf" type="file" accept="application/pdf"><span class="aide">Vingt mégaoctets au maximum. Le fichier remplace le PDF actuel.</span></p>
      ${choixMedias('fichier', medias, d.fichier, '…ou choisir dans la médiathèque')}
      <p class="champ"><label for="lien">…ou lien externe</label><input id="lien" name="lien" type="url" maxlength="500" value="${e(d.lien)}" placeholder="https://www.arcep.ga/uploads/…"><span class="aide">Le PDF téléversé a priorité sur le lien.</span></p>
    </fieldset>
    <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button><a href="/admin/documents">Retour</a></p>
  </div>
</form>`;
  return socle({ titre: nouveau ? 'Nouveau texte' : 'Modifier', corps, compte, csrf, actif: 'documents', large: true });
}

/* ======================= CATÉGORIES ======================= */
export function categories({ compte, csrf, D, message = '', erreur = '' }) {
  const corps = `
${tete('Catégories de la réglementation', '', 'Une catégorie employée par des textes ne peut pas être supprimée.')}
${messages(message, erreur)}
<table class="table">
  <thead><tr><th scope="col">Clé</th><th scope="col">Nom</th><th scope="col">Lien officiel</th><th scope="col">Textes</th><th scope="col">Actions</th></tr></thead>
  <tbody>
    ${D.categories.map((c) => {
      const n = D.documents.filter((d) => d.categorie === c.cle).length;
      return `<tr>
      <td class="mono">${e(c.cle)}</td>
      <td colspan="2"><form method="post" action="/admin/categories/${e(c.cle)}" class="ligne-form">${cache(csrf)}<input type="text" name="nom" value="${e(c.nom)}" maxlength="80" required aria-label="Nom"><input type="url" name="lien" value="${e(c.lien || '')}" maxlength="500" aria-label="Lien officiel"><button type="submit" class="lien-action">Enregistrer</button></form></td>
      <td class="mono">${n}</td>
      <td class="actions">${n ? '<span class="aide">employée</span>' : suppression(csrf, `/admin/categories/${e(c.cle)}/supprimer`, 'Supprimer cette catégorie ?')}</td>
    </tr>`;
    }).join('')}
  </tbody>
</table>
<h2 class="titre-bloc">Ajouter une catégorie</h2>
<form method="post" action="/admin/categories" class="formulaire">
  ${cache(csrf)}
  <div class="formulaire-ligne">
    <p class="champ"><label for="cle">Clé</label><input id="cle" name="cle" type="text" required maxlength="40" pattern="[a-z0-9-]+" placeholder="circulaires"><span class="aide">Lettres minuscules, chiffres et tirets. Sert dans l’adresse.</span></p>
    <p class="champ"><label for="nom">Nom affiché</label><input id="nom" name="nom" type="text" required maxlength="80" placeholder="Circulaires"></p>
    <p class="champ"><label for="lien">Lien officiel (facultatif)</label><input id="lien" name="lien" type="url" maxlength="500"></p>
  </div>
  <p class="barre-actions"><button class="bouton" type="submit">Ajouter</button></p>
</form>`;
  return socle({ titre: 'Catégories', corps, compte, csrf, actif: 'categories', large: true });
}

/* ======================= OBSERVATOIRE ======================= */
export function listeObservatoire({ compte, csrf, D, message = '', marche = 'tous' }) {
  const toutes = D.observatoire.flatMap((m) => m.publications.map((p) => ({ ...p, marche: m.cle, marcheNom: m.nom })))
    .filter((p) => marche === 'tous' || p.marche === marche)
    .sort((a, b) => (b.annee + b.trimestre).localeCompare(a.annee + a.trimestre));
  const corps = `
${tete('Observatoire', `<a class="bouton" href="/admin/observatoire/nouveau"><svg class="icone"><use href="#i-plus"/></svg> Nouveau tableau de bord</a>`)}
${messages(message)}
<p class="filtres">
  <a href="/admin/observatoire"${marche === 'tous' ? ' aria-current="true"' : ''}>Tous</a>
  ${D.observatoire.map((m) => `<a href="/admin/observatoire?marche=${e(m.cle)}"${marche === m.cle ? ' aria-current="true"' : ''}>${e(m.nom)} <span>${m.publications.length}</span></a>`).join('')}
</p>
<table class="table">
  <thead><tr><th scope="col">Période</th><th scope="col">Marché</th><th scope="col">Titre</th><th scope="col">Fichier</th><th scope="col">Actions</th></tr></thead>
  <tbody>
    ${toutes.map((p) => `
    <tr>
      <td class="mono">${e(p.annee)} ${e(p.trimestre)}</td>
      <td>${e(p.marcheNom)}</td>
      <td><a href="/admin/observatoire/${encodeURIComponent(p.id)}">${e(p.titre)}</a></td>
      <td>${p.fichier ? '<span class="pastille pastille--publie">PDF</span>' : '<span class="pastille">lien</span>'}</td>
      <td class="actions"><a href="/admin/observatoire/${encodeURIComponent(p.id)}">Modifier</a>${suppression(csrf, `/admin/observatoire/${encodeURIComponent(p.id)}/supprimer`, 'Supprimer ce tableau de bord ?')}</td>
    </tr>`).join('')}
  </tbody>
</table>`;
  return socle({ titre: 'Observatoire', corps, compte, csrf, actif: 'observatoire', large: true });
}

export function formObservatoire({ compte, csrf, D, publication = null, erreur = '', message = '', medias = [] }) {
  const p = { id: '', titre: '', annee: String(new Date().getFullYear()), trimestre: 'T1', marche: D.observatoire[0]?.cle || '', lien: '', fichier: '', ...(publication || {}) };
  const nouveau = !publication || !publication.id;
  const corps = `
${tete(nouveau ? 'Nouveau tableau de bord' : 'Modifier le tableau de bord')}
${messages(message, erreur)}
<form method="post" enctype="multipart/form-data" action="${nouveau ? '/admin/observatoire/nouveau' : `/admin/observatoire/${encodeURIComponent(p.id)}`}" class="formulaire">
  ${cache(csrf)}
  <p class="champ"><label for="titre">Titre</label><input id="titre" name="titre" type="text" required maxlength="300" value="${e(p.titre)}" placeholder="Tableau de bord Internet du 2e trimestre 2026"></p>
  <div class="formulaire-ligne">
    <p class="champ"><label for="marche">Marché</label><select id="marche" name="marche">${D.observatoire.map((m) => `<option value="${e(m.cle)}"${m.cle === p.marche ? ' selected' : ''}>${e(m.nom)}</option>`).join('')}</select></p>
    <p class="champ"><label for="annee">Année</label><input id="annee" name="annee" type="text" required maxlength="4" pattern="[0-9]{4}" value="${e(p.annee)}"></p>
    <p class="champ"><label for="trimestre">Trimestre</label><select id="trimestre" name="trimestre">${['T1', 'T2', 'T3', 'T4'].map((t) => `<option${t === p.trimestre ? ' selected' : ''}>${t}</option>`).join('')}</select></p>
  </div>
  <fieldset class="bloc">
    <legend>Document</legend>
    ${p.fichier ? `<p class="aide">Fichier actuel : <a href="${lien(p.fichier)}" target="_blank" rel="noopener">${e(p.fichier.split('/').pop())}</a></p>` : ''}
    <p class="champ"><label for="pdf">Téléverser un PDF</label><input id="pdf" name="pdf" type="file" accept="application/pdf"></p>
    ${choixMedias('fichier', medias, p.fichier, '…ou choisir dans la médiathèque')}
    <p class="champ"><label for="lien">…ou lien externe</label><input id="lien" name="lien" type="url" maxlength="500" value="${e(p.lien)}"></p>
  </fieldset>
  <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button><a href="/admin/observatoire">Retour</a></p>
</form>`;
  return socle({ titre: nouveau ? 'Nouveau tableau de bord' : 'Modifier', corps, compte, csrf, actif: 'observatoire' });
}

/* ======================= FAQ ======================= */
export function listeFaq({ compte, csrf, D, message = '' }) {
  const corps = `
${tete('Questions fréquentes', `<a class="bouton" href="/admin/faq/nouvelle"><svg class="icone"><use href="#i-plus"/></svg> Nouvelle question</a>`, 'L’ordre affiché est celui du site.')}
${messages(message)}
<table class="table">
  <thead><tr><th scope="col">Ordre</th><th scope="col">Question</th><th scope="col">Thème</th><th scope="col">Actions</th></tr></thead>
  <tbody>
    ${D.faq.map((f, i) => `
    <tr>
      <td class="ordre">
        <form method="post" action="/admin/faq/${encodeURIComponent(f.id)}/monter">${cache(csrf)}<button type="submit" class="lien-action" aria-label="Monter"${i === 0 ? ' disabled' : ''}><svg class="icone"><use href="#i-haut"/></svg></button></form>
        <form method="post" action="/admin/faq/${encodeURIComponent(f.id)}/descendre">${cache(csrf)}<button type="submit" class="lien-action" aria-label="Descendre"${i === D.faq.length - 1 ? ' disabled' : ''}><svg class="icone"><use href="#i-bas"/></svg></button></form>
      </td>
      <td><a href="/admin/faq/${encodeURIComponent(f.id)}">${e(f.q)}</a></td>
      <td>${e(f.categorie || '—')}</td>
      <td class="actions"><a href="/admin/faq/${encodeURIComponent(f.id)}">Modifier</a>${suppression(csrf, `/admin/faq/${encodeURIComponent(f.id)}/supprimer`, 'Supprimer cette question ?')}</td>
    </tr>`).join('')}
  </tbody>
</table>`;
  return socle({ titre: 'FAQ', corps, compte, csrf, actif: 'faq', large: true });
}

export function formFaq({ compte, csrf, D, faq = null, erreur = '', message = '' }) {
  const f = { id: '', q: '', r: '', categorie: '', ...(faq || {}) };
  const nouvelle = !faq || !faq.id;
  const themes = Array.from(new Set(D.faq.map((x) => x.categorie).filter(Boolean)));
  const corps = `
${tete(nouvelle ? 'Nouvelle question' : 'Modifier la question')}
${messages(message, erreur)}
<form method="post" action="${nouvelle ? '/admin/faq/nouvelle' : `/admin/faq/${encodeURIComponent(f.id)}`}" class="formulaire">
  ${cache(csrf)}
  <p class="champ"><label for="q">Question</label><input id="q" name="q" type="text" required maxlength="300" value="${e(f.q)}"></p>
  <p class="champ"><label for="r">Réponse</label><textarea id="r" name="r" rows="8" required maxlength="6000">${e(f.r)}</textarea><span class="aide">Une ligne vide sépare deux paragraphes.</span></p>
  <p class="champ"><label for="categorie">Thème (facultatif)</label><input id="categorie" name="categorie" type="text" maxlength="60" value="${e(f.categorie || '')}" list="themes" placeholder="L’Autorité, Réseaux mobiles, Qualité de service…"><datalist id="themes">${themes.map((t) => `<option value="${e(t)}">`).join('')}</datalist></p>
  <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button><a href="/admin/faq">Retour</a></p>
</form>`;
  return socle({ titre: nouvelle ? 'Nouvelle question' : 'Modifier', corps, compte, csrf, actif: 'faq' });
}

/* ======================= CHIFFRES CLÉS ======================= */
export function listeChiffres({ compte, csrf, D, message = '', erreur = '' }) {
  const corps = `
${tete('Chiffres clés', `<a class="bouton" href="/admin/chiffres/nouveau"><svg class="icone"><use href="#i-plus"/></svg> Nouvel indicateur</a>`, 'Les indicateurs affichés sur l’accueil et dans l’Observatoire. La valeur sert au compteur animé ; l’affichage est le texte présenté au visiteur.')}
${messages(message, erreur)}
<table class="table">
  <thead><tr><th scope="col">Ordre</th><th scope="col">Affichage</th><th scope="col">Unité</th><th scope="col">Libellé</th><th scope="col">Période</th><th scope="col">Actions</th></tr></thead>
  <tbody>
    ${D.chiffres.map((c, i) => `
    <tr>
      <td class="ordre">
        <form method="post" action="/admin/chiffres/${encodeURIComponent(c.id)}/monter">${cache(csrf)}<button type="submit" class="lien-action" aria-label="Monter"${i === 0 ? ' disabled' : ''}><svg class="icone"><use href="#i-haut"/></svg></button></form>
        <form method="post" action="/admin/chiffres/${encodeURIComponent(c.id)}/descendre">${cache(csrf)}<button type="submit" class="lien-action" aria-label="Descendre"${i === D.chiffres.length - 1 ? ' disabled' : ''}><svg class="icone"><use href="#i-bas"/></svg></button></form>
      </td>
      <td class="mono"><a href="/admin/chiffres/${encodeURIComponent(c.id)}">${e(c.affichage)}</a></td>
      <td>${e(c.unite)}</td>
      <td>${e(c.libelle)}</td>
      <td>${e(c.periode || '—')}</td>
      <td class="actions"><a href="/admin/chiffres/${encodeURIComponent(c.id)}">Modifier</a>${suppression(csrf, `/admin/chiffres/${encodeURIComponent(c.id)}/supprimer`, 'Supprimer cet indicateur ?')}</td>
    </tr>`).join('')}
  </tbody>
</table>
<h2 class="titre-bloc">Source affichée</h2>
<form method="post" action="/admin/chiffres" class="formulaire">
  ${cache(csrf)}
  <p class="champ"><label for="source">Source</label><input id="source" name="source" type="text" required maxlength="200" value="${e(D.chiffresSource)}"></p>
  <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button></p>
</form>`;
  return socle({ titre: 'Chiffres clés', corps, compte, csrf, actif: 'chiffres', large: true });
}

export function formChiffre({ compte, csrf, chiffre = null, erreur = '', message = '' }) {
  const c = { id: '', valeur: '', affichage: '', unite: '', libelle: '', decimales: 0, periode: '', ...(chiffre || {}) };
  const nouveau = !chiffre || !chiffre.id;
  const corps = `
${tete(nouveau ? 'Nouvel indicateur' : 'Modifier l’indicateur')}
${messages(message, erreur)}
<form method="post" action="${nouveau ? '/admin/chiffres/nouveau' : `/admin/chiffres/${encodeURIComponent(c.id)}`}" class="formulaire">
  ${cache(csrf)}
  <p class="champ"><label for="libelle">Libellé</label><input id="libelle" name="libelle" type="text" required maxlength="200" value="${e(c.libelle)}" placeholder="Taux de pénétration du mobile"></p>
  <div class="formulaire-ligne">
    <p class="champ"><label for="affichage">Affichage</label><input id="affichage" name="affichage" type="text" required maxlength="40" value="${e(c.affichage)}" placeholder="176,52"><span class="aide">Le texte exact lu par le visiteur.</span></p>
    <p class="champ"><label for="valeur">Valeur numérique</label><input id="valeur" name="valeur" type="text" required maxlength="24" value="${e(c.valeur)}" inputmode="decimal" placeholder="176.52"><span class="aide">Sert au compteur animé.</span></p>
    <p class="champ"><label for="decimales">Décimales</label><input id="decimales" name="decimales" type="number" min="0" max="4" required value="${e(c.decimales)}"></p>
  </div>
  <div class="formulaire-ligne">
    <p class="champ"><label for="unite">Unité</label><input id="unite" name="unite" type="text" required maxlength="60" value="${e(c.unite)}" placeholder="%, abonnements, milliards de FCFA"><span class="aide">Une unité « % » affiche une jauge.</span></p>
    <p class="champ"><label for="periode">Période (facultative)</label><input id="periode" name="periode" type="text" maxlength="60" value="${e(c.periode || '')}" placeholder="4e trimestre 2024"></p>
  </div>
  <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button><a href="/admin/chiffres">Retour</a></p>
</form>`;
  return socle({ titre: nouveau ? 'Nouvel indicateur' : 'Modifier', corps, compte, csrf, actif: 'chiffres' });
}

/* ======================= MÉDIATHÈQUE ======================= */
export function mediatheque({ compte, csrf, groupes, message = '', erreur = '' }) {
  const octets = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' Mo' : Math.round(n / 1024) + ' Ko';
  const total = groupes.reduce((n, g) => n + g.entrees.length, 0);
  const corps = `
${tete('Médiathèque', '', `${total} fichier${total > 1 ? 's' : ''} : visuels des actualités, image de partage, documents PDF de la réglementation et de l’Observatoire.`)}
${messages(message, erreur)}
<form class="bloc" method="post" enctype="multipart/form-data" action="/admin/medias">
  ${cache(csrf)}
  <p class="champ"><label for="fichiers">Ajouter des fichiers</label><input id="fichiers" name="fichiers" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" required><span class="aide">Images JPEG, PNG, WebP (cinq mégaoctets) et documents PDF (vingt mégaoctets). Le format est vérifié sur le contenu, pas sur le nom.</span></p>
  <p class="barre-actions"><button class="bouton" type="submit">Téléverser</button></p>
</form>
${groupes.map((g) => `
<h2 class="titre-bloc">${e(g.titre)} <span class="mono">${g.entrees.length}</span></h2>
<ul class="vignettes">
  ${g.entrees.map((m) => `
  <li class="vignette${m.genre === 'document' ? ' vignette--document' : ''}">
    ${m.genre === 'document' ? `<a class="vignette-doc" href="${e(m.adresse)}" target="_blank" rel="noopener">PDF</a>` : `<img src="${e(m.adresse)}" alt="${e(m.nom)}" loading="lazy" decoding="async">`}
    <p class="vignette-nom mono">${e(m.nom)}</p>
    <p class="vignette-info">${octets(m.taille)}${m.employe ? ` · <b>${e(m.employe)}</b>` : ''}</p>
    ${m.supprimable ? `<form method="post" action="/admin/medias/supprimer" data-confirmer="Supprimer ce fichier ?">${cache(csrf)}<input type="hidden" name="dossier" value="${e(g.cle)}"><input type="hidden" name="nom" value="${e(m.nom)}"><button class="lien-danger" type="submit">Supprimer</button></form>` : '<p class="vignette-info">Détachez-le d’abord</p>'}
  </li>`).join('')}
</ul>`).join('') || '<p class="vide">Aucun fichier pour l’instant.</p>'}`;
  return socle({ titre: 'Médiathèque', corps, compte, csrf, actif: 'medias', large: true });
}

/* ======================= LISTES ======================= */
export function formListe({ compte, csrf, D, cle, message = '', erreur = '' }) {
  const entrees = lireListe(D, cle);
  const lignes = [...entrees, ...Array.from({ length: Math.max(0, 8 - entrees.length) }, () => ({ titre: '', texte: '', lien: '' }))];
  const corps = `
${tete(LISTES[cle].nom, `<p class="filtres">${Object.entries(LISTES).map(([k, l]) => `<a href="/admin/listes/${k}"${k === cle ? ' aria-current="true"' : ''}>${e(l.nom.split(' de ')[0])}</a>`).join('')}</p>`, 'Une entrée sans titre ni texte est ignorée. Vider toutes les entrées rétablit la liste de départ.')}
${messages(message, erreur)}
<form method="post" action="/admin/listes/${cle}" class="formulaire">
  ${cache(csrf)}
  ${lignes.map((l, i) => `
  <fieldset class="bloc">
    <legend>Entrée ${i + 1}</legend>
    <p class="champ"><label for="titre${i}">Titre</label><input id="titre${i}" name="titre${i}" type="text" maxlength="200" value="${e(l.titre)}"></p>
    <p class="champ"><label for="texte${i}">Texte</label><textarea id="texte${i}" name="texte${i}" rows="2" maxlength="1000">${e(l.texte)}</textarea></p>
    ${cle === 'demarches' ? `<p class="champ"><label for="lien${i}">Lien</label><input id="lien${i}" name="lien${i}" type="text" maxlength="500" value="${e(l.lien || '')}" placeholder="/contact"></p>` : ''}
  </fieldset>`).join('')}
  <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button></p>
</form>`;
  return socle({ titre: LISTES[cle].nom, corps, compte, csrf, actif: 'listes' });
}

/* ======================= UTILISATEURS ======================= */
export function utilisateurs({ compte, csrf, comptes, message = '', erreur = '' }) {
  const corps = `
${tete('Utilisateurs', '', Object.values(DESCRIPTIONS_ROLES).join(' · ') + '. Il doit toujours rester au moins un administrateur.')}
${messages(message, erreur)}
<table class="table">
  <thead><tr><th scope="col">Identifiant</th><th scope="col">Nom</th><th scope="col">Rôle</th><th scope="col">Créé le</th><th scope="col">Actions</th></tr></thead>
  <tbody>
    ${comptes.map((c) => `
    <tr>
      <td class="mono">${e(c.identifiant)}${c.identifiant === compte.identifiant ? ' <span class="pastille">vous</span>' : ''}</td>
      <td>${e(c.nom)}</td>
      <td>${c.identifiant === compte.identifiant ? e(c.role) : `<form method="post" action="/admin/utilisateurs/${encodeURIComponent(c.identifiant)}/role" class="ligne-form">${cache(csrf)}<select name="role" aria-label="Rôle">${ROLES.map((r) => `<option value="${r}"${r === c.role ? ' selected' : ''}>${r}</option>`).join('')}</select><button type="submit" class="lien-action">Changer</button></form>`}</td>
      <td class="mono">${e(dateLisible(String(c.cree || '').slice(0, 10)))}</td>
      <td class="actions">
        ${c.identifiant === compte.identifiant ? '<a href="/admin/compte">Mon mot de passe</a>' : `
        <form method="post" action="/admin/utilisateurs/${encodeURIComponent(c.identifiant)}/motdepasse" class="ligne-form">${cache(csrf)}<input type="password" name="motdepasse" minlength="12" required placeholder="Nouveau mot de passe" aria-label="Nouveau mot de passe" autocomplete="new-password"><button type="submit" class="lien-action">Réinitialiser</button></form>
        ${suppression(csrf, `/admin/utilisateurs/${encodeURIComponent(c.identifiant)}/supprimer`, 'Supprimer ce compte ?')}`}
      </td>
    </tr>`).join('')}
  </tbody>
</table>
<h2 class="titre-bloc">Créer un compte</h2>
<form method="post" action="/admin/utilisateurs" class="formulaire">
  ${cache(csrf)}
  <div class="formulaire-ligne">
    <p class="champ"><label for="identifiant">Identifiant</label><input id="identifiant" name="identifiant" type="text" required maxlength="60" autocomplete="off"></p>
    <p class="champ"><label for="nom">Nom affiché</label><input id="nom" name="nom" type="text" maxlength="80"></p>
    <p class="champ"><label for="role">Rôle</label><select id="role" name="role">${ROLES.map((r) => `<option value="${r}">${r}</option>`).join('')}</select></p>
  </div>
  <p class="champ"><label for="motdepasse">Mot de passe initial</label><input id="motdepasse" name="motdepasse" type="password" required minlength="12" autocomplete="new-password"><span class="aide">Douze caractères au minimum. L’utilisateur pourra le changer depuis « Mon mot de passe ».</span></p>
  <p class="barre-actions"><button class="bouton" type="submit">Créer le compte</button></p>
</form>`;
  return socle({ titre: 'Utilisateurs', corps, compte, csrf, actif: 'utilisateurs', large: true });
}

/* ======================= RÉGLAGES ======================= */
export function reglages({ compte, csrf, D, medias = [], message = '', erreur = '' }) {
  const R = lireReglages(D);
  const I = D.institution;
  const reseaux = [...(R.reseaux || []), ...Array.from({ length: Math.max(0, 4 - (R.reseaux || []).length) }, () => ({ nom: '', lien: '' }))];
  const corps = `
${tete('Réglages et SEO')}
${messages(message, erreur)}
<form method="post" enctype="multipart/form-data" action="/admin/reglages" class="formulaire formulaire--deux">
  ${cache(csrf)}
  <div class="formulaire-principal">
    <fieldset class="bloc">
      <legend>Référencement</legend>
      <p class="champ"><label for="titreSite">Nom du site</label><input id="titreSite" name="titreSite" type="text" maxlength="80" value="${e(R.titreSite)}"></p>
      <p class="champ"><label for="descriptionSite">Description (accueil et partages)</label><textarea id="descriptionSite" name="descriptionSite" rows="3" maxlength="300" data-compte="desc-compte">${e(R.descriptionSite)}</textarea><span class="aide" id="desc-compte"></span></p>
      <p class="champ"><label for="adressePublique">Adresse publique du site</label><input id="adressePublique" name="adressePublique" type="url" maxlength="200" value="${e(R.adressePublique || '')}" placeholder="https://www.arcep.ga"><span class="aide">Sert aux adresses canoniques, au plan du site et aux cartes de partage.</span></p>
      <p class="champ champ--case"><label><input type="checkbox" name="indexation" value="1"${R.indexation ? ' checked' : ''}> Autoriser l’indexation par les moteurs de recherche</label><span class="aide">Décoché tant que la proposition n’est pas validée : le site reste hors des moteurs.</span></p>
    </fieldset>
    <fieldset class="bloc">
      <legend>Coordonnées affichées</legend>
      <p class="champ"><label for="adresse">Adresse</label><input id="adresse" name="adresse" type="text" maxlength="200" value="${e(I.adresse)}"></p>
      <div class="formulaire-ligne">
        <p class="champ"><label for="telephone0">Téléphone 1</label><input id="telephone0" name="telephone0" type="text" maxlength="40" value="${e(I.telephones[0] || '')}"></p>
        <p class="champ"><label for="telephone1">Téléphone 2</label><input id="telephone1" name="telephone1" type="text" maxlength="40" value="${e(I.telephones[1] || '')}"></p>
      </div>
      <div class="formulaire-ligne">
        <p class="champ"><label for="email">Courriel</label><input id="email" name="email" type="email" maxlength="120" value="${e(I.email)}"></p>
        <p class="champ"><label for="numeroCourt">Numéro court consommateurs</label><input id="numeroCourt" name="numeroCourt" type="text" maxlength="12" value="${e(I.numeroCourt)}"></p>
      </div>
    </fieldset>
  </div>
  <div class="formulaire-cote">
    <fieldset class="bloc">
      <legend>Image de partage</legend>
      <p class="apercu" id="apercu-partage">${R.imagePartage ? `<img src="${lien(R.imagePartage)}" alt="">` : ''}</p>
      <p class="champ"><label for="partage">Téléverser une image (1200 × 630 px)</label><input id="partage" name="partage" type="file" accept="image/jpeg,image/png,image/webp" data-apercu="apercu-partage"></p>
      ${choixMedias('imagePartage', medias, R.imagePartage, '…ou choisir dans la médiathèque')}
    </fieldset>
    <fieldset class="bloc">
      <legend>Réseaux officiels</legend>
      <p class="aide">Affichés dans le pied de page seulement s’ils sont renseignés.</p>
      ${reseaux.map((r, i) => `<div class="formulaire-ligne"><p class="champ"><label for="reseauNom${i}">Nom</label><input id="reseauNom${i}" name="reseauNom${i}" type="text" maxlength="60" value="${e(r.nom)}"></p><p class="champ"><label for="reseauLien${i}">Adresse</label><input id="reseauLien${i}" name="reseauLien${i}" type="url" maxlength="300" value="${e(r.lien)}"></p></div>`).join('')}
    </fieldset>
    <fieldset class="bloc">
      <legend>Pied de page</legend>
      <p class="champ"><label for="mentionPied">Mention</label><input id="mentionPied" name="mentionPied" type="text" maxlength="120" value="${e(R.mentionPied || '')}"></p>
    </fieldset>
    <p class="barre-actions"><button class="bouton" type="submit">Enregistrer</button></p>
  </div>
</form>`;
  return socle({ titre: 'Réglages', corps, compte, csrf, actif: 'reglages', large: true });
}

export { icone };
