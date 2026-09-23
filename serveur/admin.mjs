/* ARCEP Gabon — routes de l'espace d'administration.
   Toute écriture exige une session valide et un jeton anti-rejeu. Les réponses d'écriture
   redirigent (303) pour qu'un rafraîchissement ne rejoue jamais l'action. Les écrans
   d'organisation et de configuration sont réservés aux administrateurs. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lire, modifier, ecrire, historique, identifiant, chemin as chemins } from './base.mjs';
import {
  aucunCompte, creerCompte, verifier, ouvrirSession, session, fermerSession, fermerSessionsDe,
  lireCookies, cookieSession, cookieEfface, csrfValide, nomCookie, ROLES,
  listerComptes, supprimerCompte, changerRole, changerMotDePasse, reinitialiserMotDePasse,
} from './auth.mjs';
import * as V from './vues/admin.mjs';
import * as Medias from './medias.mjs';
import { PAGES, LISTES, REGLAGES_DEFAUT } from './schema.mjs';
import { dateIso } from './vues/base.mjs';
import { nettoyer, contientHtml } from './html.mjs';
import * as Pages from './vues/pages.mjs';

let ENTETES = {};
const html = (reponse, corps, statut = 200, entetes = {}) => {
  reponse.writeHead(statut, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...ENTETES, ...entetes });
  reponse.end(corps);
};
const versLa = (reponse, url, entetes = {}) => {
  reponse.writeHead(303, { location: url, 'cache-control': 'no-store', ...entetes });
  reponse.end();
};

/* Les adresses acceptées dans les contenus : http, https, ou un chemin du site. */
const adresseValide = (v) => {
  const s = String(v || '').trim();
  if (!s) return true;
  if (/^https?:\/\//i.test(s)) return true;
  return s.startsWith('/') && !s.startsWith('//');
};
const champ = (f, cle, max = 4000) => String(f[cle] || '').trim().slice(0, max);
const dateValide = (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function servirAdmin({ chemin, url, requete, reponse, corpsForm, fichiers = [], securise, entetes = {}, adresse = '' }) {
  ENTETES = entetes;
  const cookies = lireCookies(requete.headers.cookie || '');
  const s = session(cookies[nomCookie(securise)]);
  adresse = adresse || requete.socket.remoteAddress || '';
  const methode = requete.method;
  const message = url.searchParams.get('message') || '';

  /* ---------- Premier démarrage : création du compte initial ---------- */
  if (await aucunCompte()) {
    if (chemin === '/admin/creation' && methode === 'POST') {
      try {
        const compte = await creerCompte(champ(corpsForm, 'identifiant', 60), String(corpsForm.motdepasse || ''),
          champ(corpsForm, 'nom', 80) || champ(corpsForm, 'identifiant', 60), 'administrateur');
        const jeton = ouvrirSession(compte);
        return versLa(reponse, '/admin', { 'set-cookie': cookieSession(jeton, securise) });
      } catch (err) {
        return html(reponse, V.connexion({ premier: true, erreur: err.message }));
      }
    }
    return html(reponse, V.connexion({ premier: true }));
  }

  /* ---------- Connexion ---------- */
  if (chemin === '/admin/connexion' && methode === 'POST') {
    const resultat = await verifier(champ(corpsForm, 'identifiant', 60), String(corpsForm.motdepasse || ''), adresse);
    if (!resultat.ok) return html(reponse, V.connexion({ erreur: resultat.raison }), 401);
    const jeton = ouvrirSession(resultat.compte);
    return versLa(reponse, '/admin', { 'set-cookie': cookieSession(jeton, securise) });
  }
  if (chemin === '/admin/deconnexion' && methode === 'POST') {
    fermerSession(cookies[nomCookie(securise)]);
    return versLa(reponse, '/admin', { 'set-cookie': cookieEfface(securise) });
  }

  /* ---------- Au-delà, une session est exigée ---------- */
  if (!s) return html(reponse, V.connexion({}), chemin === '/admin' ? 200 : 401);
  const compte = s.compte;
  const csrf = s.csrf;
  const admin = compte.role === 'administrateur';
  const base = { compte, csrf };

  /* Toute écriture porte un jeton anti-rejeu. */
  if (methode === 'POST' && !csrfValide(s, corpsForm.csrf)) {
    return html(reponse, V.connexion({ erreur: 'Session expirée. Reconnectez-vous puis recommencez.' }), 403);
  }
  const reserve = () => html(reponse, V.refus({ ...base }), 403);

  /* ---------- Tableau de bord ---------- */
  if (chemin === '/admin') {
    const D = await lire();
    return html(reponse, V.tableau({ ...base, D, versions: await historique(12), message }));
  }

  /* ---------- Restauration d'une version ---------- */
  if (chemin === '/admin/restaurer' && methode === 'POST') {
    if (!admin) return reserve();
    const nom = champ(corpsForm, 'version', 120);
    if (!/^[\w.-]+\.json$/.test(nom)) return versLa(reponse, '/admin?message=' + encodeURIComponent('Version inconnue.'));
    try {
      const brut = await readFile(join(chemins.HISTORIQUE, nom), 'utf8');
      await ecrire(JSON.parse(brut), 'restauration');
      return versLa(reponse, '/admin?message=' + encodeURIComponent('Version restaurée. L’état précédent a été conservé dans l’historique.'));
    } catch {
      return versLa(reponse, '/admin?message=' + encodeURIComponent('Cette version est illisible.'));
    }
  }

  /* ---------- Mon compte ---------- */
  if (chemin === '/admin/compte') {
    if (methode === 'GET') return html(reponse, V.monCompte({ ...base, message }));
    try {
      const nouveau = String(corpsForm.nouveau || '');
      if (nouveau !== String(corpsForm.confirmation || '')) throw new Error('Les deux saisies du nouveau mot de passe diffèrent.');
      await changerMotDePasse(compte.identifiant, String(corpsForm.actuel || ''), nouveau);
      return versLa(reponse, '/admin/compte?message=' + encodeURIComponent('Mot de passe modifié.'));
    } catch (err) { return html(reponse, V.monCompte({ ...base, erreur: err.message }), 400); }
  }

  /* ---------- Pages ---------- */
  if (chemin === '/admin/pages') return html(reponse, V.listePages({ ...base, D: await lire(), message }));
  let m = chemin.match(/^\/admin\/pages\/([a-z]+)$/);
  if (m && PAGES[m[1]]) {
    const cle = m[1];
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.formPage({ ...base, D, cle, message }));
    await modifier((b) => {
      b.pages = b.pages || {};
      b.pages[cle] = {};
      for (const nom of Object.keys(PAGES[cle].champs)) b.pages[cle][nom] = champ(corpsForm, nom, 4000);
    }, `page-${cle}`);
    return versLa(reponse, `/admin/pages/${cle}?message=` + encodeURIComponent('Textes enregistrés.'));
  }

  /* ---------- Actualités ---------- */
  if (chemin === '/admin/actualites' && methode === 'GET') {
    return html(reponse, V.listeActualites({ ...base, D: await lire(), message, filtre: url.searchParams.get('filtre') || 'toutes' }));
  }
  if (chemin === '/admin/actualites/nouvelle') {
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.formActualite({ ...base, medias: await Medias.inventaire(D, 'image') }));
    const issue = await visuelTeleverse(fichiers, 'visuel');
    if (issue.erreur) return html(reponse, V.formActualite({ ...base, erreur: issue.erreur, actualite: corpsForm, medias: await Medias.inventaire(D, 'image') }), 400);
    if (issue.chemin) corpsForm.image = issue.chemin;
    const erreur = validerActualite(corpsForm);
    if (erreur) return html(reponse, V.formActualite({ ...base, erreur, actualite: corpsForm, medias: await Medias.inventaire(D, 'image') }), 400);
    const id = identifiant('act');
    await modifier((b) => { b.actualites.unshift({ id, ...actualiteDepuis(corpsForm) }); }, 'actualite-creation');
    return versLa(reponse, '/admin/actualites?message=' + encodeURIComponent('Actualité enregistrée.'));
  }
  m = chemin.match(/^\/admin\/actualites\/([^/]+)(\/supprimer|\/apercu)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const D = await lire();
    const actualite = D.actualites.find((a) => a.id === id);
    if (!actualite) return versLa(reponse, '/admin/actualites?message=' + encodeURIComponent('Actualité introuvable.'));
    if (m[2] === '/apercu') return html(reponse, Pages.article(D, actualite, { apercu: true }));
    if (m[2] === '/supprimer' && methode === 'POST') {
      await modifier((b) => { b.actualites = b.actualites.filter((a) => a.id !== id); }, 'actualite-suppression');
      return versLa(reponse, '/admin/actualites?message=' + encodeURIComponent('Actualité supprimée.'));
    }
    if (methode === 'GET') return html(reponse, V.formActualite({ ...base, actualite, medias: await Medias.inventaire(D, 'image'), message }));
    const issue = await visuelTeleverse(fichiers, 'visuel');
    if (issue.erreur) return html(reponse, V.formActualite({ ...base, erreur: issue.erreur, actualite: { ...actualite, ...corpsForm }, medias: await Medias.inventaire(D, 'image') }), 400);
    if (issue.chemin) corpsForm.image = issue.chemin;
    const erreur = validerActualite(corpsForm);
    if (erreur) return html(reponse, V.formActualite({ ...base, erreur, actualite: { ...actualite, ...corpsForm }, medias: await Medias.inventaire(D, 'image') }), 400);
    await modifier((b) => {
      const i = b.actualites.findIndex((a) => a.id === id);
      if (i >= 0) b.actualites[i] = { ...b.actualites[i], ...actualiteDepuis(corpsForm) };
    }, 'actualite-modification');
    return versLa(reponse, `/admin/actualites/${encodeURIComponent(id)}?message=` + encodeURIComponent('Actualité enregistrée.'));
  }

  /* ---------- Réglementation : documents ---------- */
  if (chemin === '/admin/documents' && methode === 'GET') {
    return html(reponse, V.listeDocuments({ ...base, D: await lire(), message, categorie: url.searchParams.get('categorie') || 'tout' }));
  }
  if (chemin === '/admin/documents/nouveau') {
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.formDocument({ ...base, D, medias: await Medias.inventaire(D, 'document') }));
    const issue = await visuelTeleverse(fichiers, 'pdf', ['document']);
    if (issue.erreur) return html(reponse, V.formDocument({ ...base, D, erreur: issue.erreur, document: corpsForm, medias: await Medias.inventaire(D, 'document') }), 400);
    if (issue.chemin) corpsForm.fichier = issue.chemin;
    const erreur = validerDocument(corpsForm, D);
    if (erreur) return html(reponse, V.formDocument({ ...base, D, erreur, document: corpsForm, medias: await Medias.inventaire(D, 'document') }), 400);
    await modifier((b) => { b.documents.unshift({ id: identifiant('doc'), ...documentDepuis(corpsForm, b) }); }, 'document-creation');
    return versLa(reponse, '/admin/documents?message=' + encodeURIComponent('Texte enregistré.'));
  }
  m = chemin.match(/^\/admin\/documents\/([^/]+)(\/supprimer)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const D = await lire();
    const doc = D.documents.find((d) => d.id === id);
    if (!doc) return versLa(reponse, '/admin/documents?message=' + encodeURIComponent('Texte introuvable.'));
    if (m[2] && methode === 'POST') {
      await modifier((b) => { b.documents = b.documents.filter((d) => d.id !== id); }, 'document-suppression');
      return versLa(reponse, '/admin/documents?message=' + encodeURIComponent('Texte supprimé.'));
    }
    if (methode === 'GET') return html(reponse, V.formDocument({ ...base, D, document: doc, medias: await Medias.inventaire(D, 'document'), message }));
    const issue = await visuelTeleverse(fichiers, 'pdf', ['document']);
    if (issue.erreur) return html(reponse, V.formDocument({ ...base, D, erreur: issue.erreur, document: { ...doc, ...corpsForm }, medias: await Medias.inventaire(D, 'document') }), 400);
    if (issue.chemin) corpsForm.fichier = issue.chemin;
    const erreur = validerDocument(corpsForm, D);
    if (erreur) return html(reponse, V.formDocument({ ...base, D, erreur, document: { ...doc, ...corpsForm }, medias: await Medias.inventaire(D, 'document') }), 400);
    await modifier((b) => {
      const i = b.documents.findIndex((d) => d.id === id);
      if (i >= 0) b.documents[i] = { ...b.documents[i], ...documentDepuis(corpsForm, b) };
    }, 'document-modification');
    return versLa(reponse, `/admin/documents/${encodeURIComponent(id)}?message=` + encodeURIComponent('Texte enregistré.'));
  }

  /* ---------- Réglementation : catégories ---------- */
  if (chemin === '/admin/categories') {
    if (!admin) return reserve();
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.categories({ ...base, D, message }));
    const cle = champ(corpsForm, 'cle', 40).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const nom = champ(corpsForm, 'nom', 80);
    if (!cle || !nom) return html(reponse, V.categories({ ...base, D, erreur: 'La clé et le nom sont obligatoires.' }), 400);
    if (D.categories.some((c) => c.cle === cle)) return html(reponse, V.categories({ ...base, D, erreur: 'Cette clé existe déjà.' }), 400);
    if (!adresseValide(corpsForm.lien)) return html(reponse, V.categories({ ...base, D, erreur: 'Le lien doit commencer par https:// ou par une barre oblique.' }), 400);
    await modifier((b) => { b.categories.push({ cle, nom, lien: champ(corpsForm, 'lien', 500) }); }, 'categorie-creation');
    return versLa(reponse, '/admin/categories?message=' + encodeURIComponent('Catégorie ajoutée.'));
  }
  m = chemin.match(/^\/admin\/categories\/([a-z0-9-]+)(\/supprimer)?$/);
  if (m && methode === 'POST') {
    if (!admin) return reserve();
    const cle = m[1];
    const D = await lire();
    if (!D.categories.some((c) => c.cle === cle)) return versLa(reponse, '/admin/categories?message=' + encodeURIComponent('Catégorie inconnue.'));
    if (m[2]) {
      if (D.documents.some((d) => d.categorie === cle)) return html(reponse, V.categories({ ...base, D, erreur: 'Des textes emploient cette catégorie : reclassez-les avant de la supprimer.' }), 400);
      await modifier((b) => { b.categories = b.categories.filter((c) => c.cle !== cle); }, 'categorie-suppression');
      return versLa(reponse, '/admin/categories?message=' + encodeURIComponent('Catégorie supprimée.'));
    }
    const nom = champ(corpsForm, 'nom', 80);
    if (!nom) return html(reponse, V.categories({ ...base, D, erreur: 'Le nom est obligatoire.' }), 400);
    if (!adresseValide(corpsForm.lien)) return html(reponse, V.categories({ ...base, D, erreur: 'Le lien doit commencer par https:// ou par une barre oblique.' }), 400);
    await modifier((b) => {
      const c = b.categories.find((x) => x.cle === cle);
      if (c) { c.nom = nom; c.lien = champ(corpsForm, 'lien', 500); }
      for (const d of b.documents) if (d.categorie === cle) d.nom = nom;
    }, 'categorie-modification');
    return versLa(reponse, '/admin/categories?message=' + encodeURIComponent('Catégorie enregistrée.'));
  }

  /* ---------- Observatoire ---------- */
  if (chemin === '/admin/observatoire' && methode === 'GET') {
    return html(reponse, V.listeObservatoire({ ...base, D: await lire(), message, marche: url.searchParams.get('marche') || 'tous' }));
  }
  if (chemin === '/admin/observatoire/nouveau') {
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.formObservatoire({ ...base, D, medias: await Medias.inventaire(D, 'document') }));
    const issue = await visuelTeleverse(fichiers, 'pdf', ['document']);
    if (issue.erreur) return html(reponse, V.formObservatoire({ ...base, D, erreur: issue.erreur, publication: corpsForm, medias: await Medias.inventaire(D, 'document') }), 400);
    if (issue.chemin) corpsForm.fichier = issue.chemin;
    const erreur = validerPublication(corpsForm, D);
    if (erreur) return html(reponse, V.formObservatoire({ ...base, D, erreur, publication: corpsForm, medias: await Medias.inventaire(D, 'document') }), 400);
    await modifier((b) => {
      const marche = b.observatoire.find((x) => x.cle === corpsForm.marche);
      marche.publications.unshift({ id: identifiant('obs'), ...publicationDepuis(corpsForm) });
      trierPublications(marche);
    }, 'observatoire-creation');
    return versLa(reponse, '/admin/observatoire?message=' + encodeURIComponent('Tableau de bord enregistré.'));
  }
  m = chemin.match(/^\/admin\/observatoire\/([^/]+)(\/supprimer)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const D = await lire();
    let publication = null, marcheDe = null;
    for (const mk of D.observatoire) { const p = mk.publications.find((x) => x.id === id); if (p) { publication = { ...p, marche: mk.cle }; marcheDe = mk.cle; } }
    if (!publication) return versLa(reponse, '/admin/observatoire?message=' + encodeURIComponent('Tableau de bord introuvable.'));
    if (m[2] && methode === 'POST') {
      await modifier((b) => { for (const mk of b.observatoire) mk.publications = mk.publications.filter((x) => x.id !== id); }, 'observatoire-suppression');
      return versLa(reponse, '/admin/observatoire?message=' + encodeURIComponent('Tableau de bord supprimé.'));
    }
    if (methode === 'GET') return html(reponse, V.formObservatoire({ ...base, D, publication, medias: await Medias.inventaire(D, 'document'), message }));
    const issue = await visuelTeleverse(fichiers, 'pdf', ['document']);
    if (issue.erreur) return html(reponse, V.formObservatoire({ ...base, D, erreur: issue.erreur, publication: { ...publication, ...corpsForm }, medias: await Medias.inventaire(D, 'document') }), 400);
    if (issue.chemin) corpsForm.fichier = issue.chemin;
    const erreur = validerPublication(corpsForm, D);
    if (erreur) return html(reponse, V.formObservatoire({ ...base, D, erreur, publication: { ...publication, ...corpsForm }, medias: await Medias.inventaire(D, 'document') }), 400);
    await modifier((b) => {
      for (const mk of b.observatoire) mk.publications = mk.publications.filter((x) => x.id !== id);
      const marche = b.observatoire.find((x) => x.cle === corpsForm.marche);
      marche.publications.push({ id, ...publicationDepuis(corpsForm) });
      trierPublications(marche);
    }, 'observatoire-modification');
    return versLa(reponse, '/admin/observatoire?message=' + encodeURIComponent('Tableau de bord enregistré.'));
  }

  /* ---------- FAQ ---------- */
  if (chemin === '/admin/faq' && methode === 'GET') return html(reponse, V.listeFaq({ ...base, D: await lire(), message }));
  if (chemin === '/admin/faq/nouvelle') {
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.formFaq({ ...base, D }));
    const erreur = validerFaq(corpsForm);
    if (erreur) return html(reponse, V.formFaq({ ...base, D, erreur, faq: corpsForm }), 400);
    await modifier((b) => { b.faq.push({ id: identifiant('faq'), q: champ(corpsForm, 'q', 300), r: champ(corpsForm, 'r', 6000), categorie: champ(corpsForm, 'categorie', 60) }); }, 'faq-creation');
    return versLa(reponse, '/admin/faq?message=' + encodeURIComponent('Question enregistrée.'));
  }
  m = chemin.match(/^\/admin\/faq\/([^/]+)(\/supprimer|\/monter|\/descendre)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const D = await lire();
    const f = D.faq.find((x) => x.id === id);
    if (!f) return versLa(reponse, '/admin/faq?message=' + encodeURIComponent('Question introuvable.'));
    if (m[2] && methode === 'POST') {
      await modifier((b) => {
        const i = b.faq.findIndex((x) => x.id === id);
        if (m[2] === '/supprimer') b.faq.splice(i, 1);
        else {
          const j = m[2] === '/monter' ? i - 1 : i + 1;
          if (j >= 0 && j < b.faq.length) [b.faq[i], b.faq[j]] = [b.faq[j], b.faq[i]];
        }
      }, 'faq-' + m[2].slice(1));
      return versLa(reponse, '/admin/faq?message=' + encodeURIComponent(m[2] === '/supprimer' ? 'Question supprimée.' : 'Ordre modifié.'));
    }
    if (methode === 'GET') return html(reponse, V.formFaq({ ...base, D, faq: f, message }));
    const erreur = validerFaq(corpsForm);
    if (erreur) return html(reponse, V.formFaq({ ...base, D, erreur, faq: { ...f, ...corpsForm } }), 400);
    await modifier((b) => {
      const c = b.faq.find((x) => x.id === id);
      if (c) { c.q = champ(corpsForm, 'q', 300); c.r = champ(corpsForm, 'r', 6000); c.categorie = champ(corpsForm, 'categorie', 60); }
    }, 'faq-modification');
    return versLa(reponse, `/admin/faq/${encodeURIComponent(id)}?message=` + encodeURIComponent('Question enregistrée.'));
  }

  /* ---------- Chiffres clés ---------- */
  if (chemin === '/admin/chiffres') {
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.listeChiffres({ ...base, D, message }));
    const source = champ(corpsForm, 'source', 200);
    if (!source) return html(reponse, V.listeChiffres({ ...base, D, erreur: 'La source est obligatoire.' }), 400);
    await modifier((b) => { b.chiffresSource = source; }, 'chiffres-source');
    return versLa(reponse, '/admin/chiffres?message=' + encodeURIComponent('Source enregistrée.'));
  }
  if (chemin === '/admin/chiffres/nouveau') {
    if (methode === 'GET') return html(reponse, V.formChiffre({ ...base }));
    const erreur = validerChiffre(corpsForm);
    if (erreur) return html(reponse, V.formChiffre({ ...base, erreur, chiffre: corpsForm }), 400);
    await modifier((b) => { b.chiffres.push({ id: identifiant('chi'), ...chiffreDepuis(corpsForm) }); }, 'chiffre-creation');
    return versLa(reponse, '/admin/chiffres?message=' + encodeURIComponent('Indicateur enregistré.'));
  }
  m = chemin.match(/^\/admin\/chiffres\/([^/]+)(\/supprimer|\/monter|\/descendre)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const D = await lire();
    const c = D.chiffres.find((x) => x.id === id);
    if (!c) return versLa(reponse, '/admin/chiffres?message=' + encodeURIComponent('Indicateur introuvable.'));
    if (m[2] && methode === 'POST') {
      await modifier((b) => {
        const i = b.chiffres.findIndex((x) => x.id === id);
        if (m[2] === '/supprimer') b.chiffres.splice(i, 1);
        else {
          const j = m[2] === '/monter' ? i - 1 : i + 1;
          if (j >= 0 && j < b.chiffres.length) [b.chiffres[i], b.chiffres[j]] = [b.chiffres[j], b.chiffres[i]];
        }
      }, 'chiffre-' + m[2].slice(1));
      return versLa(reponse, '/admin/chiffres?message=' + encodeURIComponent(m[2] === '/supprimer' ? 'Indicateur supprimé.' : 'Ordre modifié.'));
    }
    if (methode === 'GET') return html(reponse, V.formChiffre({ ...base, chiffre: c, message }));
    const erreur = validerChiffre(corpsForm);
    if (erreur) return html(reponse, V.formChiffre({ ...base, erreur, chiffre: { ...c, ...corpsForm } }), 400);
    await modifier((b) => { const i = b.chiffres.findIndex((x) => x.id === id); if (i >= 0) b.chiffres[i] = { id, ...chiffreDepuis(corpsForm) }; }, 'chiffre-modification');
    return versLa(reponse, '/admin/chiffres?message=' + encodeURIComponent('Indicateur enregistré.'));
  }

  /* ---------- Médiathèque ---------- */
  if (chemin === '/admin/medias') {
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.mediatheque({ ...base, groupes: await Medias.inventaire(D), message }));
    const envoyes = fichiers.filter((f) => f.champ === 'fichiers');
    if (!envoyes.length) return html(reponse, V.mediatheque({ ...base, groupes: await Medias.inventaire(D), erreur: 'Choisissez au moins un fichier.' }), 400);
    const refus = [];
    for (const f of envoyes) { const issue = await Medias.enregistrer(f, { genres: ['image', 'document'] }); if (issue.erreur) refus.push(issue.erreur); }
    if (refus.length) return html(reponse, V.mediatheque({ ...base, groupes: await Medias.inventaire(D), erreur: refus.join(' ') }), 400);
    return versLa(reponse, '/admin/medias?message=' + encodeURIComponent(`${envoyes.length - refus.length} fichier${envoyes.length > 1 ? 's' : ''} ajouté${envoyes.length > 1 ? 's' : ''}.`));
  }
  if (chemin === '/admin/medias/supprimer' && methode === 'POST') {
    const D = await lire();
    const echec = await Medias.supprimer(champ(corpsForm, 'dossier', 20), champ(corpsForm, 'nom', 120), D);
    if (echec) return html(reponse, V.mediatheque({ ...base, groupes: await Medias.inventaire(D), erreur: echec }), 400);
    return versLa(reponse, '/admin/medias?message=' + encodeURIComponent('Fichier supprimé.'));
  }

  /* ---------- Listes (droits, démarches) ---------- */
  m = chemin.match(/^\/admin\/listes\/([a-z]+)$/);
  if (m && LISTES[m[1]]) {
    if (!admin) return reserve();
    const cle = m[1];
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.formListe({ ...base, D, cle, message }));
    const entrees = [];
    for (let i = 0; i < 12; i++) {
      const titre = champ(corpsForm, `titre${i}`, 200);
      const texte = champ(corpsForm, `texte${i}`, 1000);
      const lien = champ(corpsForm, `lien${i}`, 500);
      if (!titre && !texte) continue;
      if (!adresseValide(lien)) return html(reponse, V.formListe({ ...base, D, cle, erreur: `Le lien de l’entrée ${i + 1} doit commencer par https:// ou par une barre oblique.` }), 400);
      entrees.push({ titre, texte, lien });
    }
    await modifier((b) => { b.listes = b.listes || {}; b.listes[cle] = entrees; }, `liste-${cle}`);
    return versLa(reponse, `/admin/listes/${cle}?message=` + encodeURIComponent('Liste enregistrée.'));
  }

  /* ---------- Utilisateurs ---------- */
  if (chemin === '/admin/utilisateurs') {
    if (!admin) return reserve();
    if (methode === 'GET') return html(reponse, V.utilisateurs({ ...base, comptes: await listerComptes(), message }));
    try {
      await creerCompte(champ(corpsForm, 'identifiant', 60), String(corpsForm.motdepasse || ''), champ(corpsForm, 'nom', 80) || champ(corpsForm, 'identifiant', 60), champ(corpsForm, 'role', 20));
      return versLa(reponse, '/admin/utilisateurs?message=' + encodeURIComponent('Compte créé.'));
    } catch (err) { return html(reponse, V.utilisateurs({ ...base, comptes: await listerComptes(), erreur: err.message }), 400); }
  }
  m = chemin.match(/^\/admin\/utilisateurs\/([^/]+)\/(supprimer|role|motdepasse)$/);
  if (m && methode === 'POST') {
    if (!admin) return reserve();
    const id = decodeURIComponent(m[1]);
    try {
      if (m[2] === 'supprimer') {
        if (id === compte.identifiant) throw new Error('Vous ne pouvez pas supprimer votre propre compte.');
        await supprimerCompte(id); fermerSessionsDe(id);
      } else if (m[2] === 'role') {
        if (id === compte.identifiant) throw new Error('Vous ne pouvez pas changer votre propre rôle.');
        await changerRole(id, champ(corpsForm, 'role', 20)); fermerSessionsDe(id);
      } else {
        await reinitialiserMotDePasse(id, String(corpsForm.motdepasse || '')); fermerSessionsDe(id);
      }
      return versLa(reponse, '/admin/utilisateurs?message=' + encodeURIComponent('Compte mis à jour.'));
    } catch (err) { return html(reponse, V.utilisateurs({ ...base, comptes: await listerComptes(), erreur: err.message }), 400); }
  }

  /* ---------- Réglages et SEO ---------- */
  if (chemin === '/admin/reglages') {
    if (!admin) return reserve();
    const D = await lire();
    if (methode === 'GET') return html(reponse, V.reglages({ ...base, D, medias: await Medias.inventaire(D, 'image'), message }));
    const issue = await visuelTeleverse(fichiers, 'partage');
    if (issue.erreur) return html(reponse, V.reglages({ ...base, D, medias: await Medias.inventaire(D, 'image'), erreur: issue.erreur }), 400);
    const adressePublique = champ(corpsForm, 'adressePublique', 200);
    if (adressePublique && !/^https?:\/\/[^\s/]+$/i.test(adressePublique)) return html(reponse, V.reglages({ ...base, D, medias: await Medias.inventaire(D, 'image'), erreur: 'L’adresse publique doit être de la forme https://www.exemple.ga, sans chemin.' }), 400);
    const reseaux = [];
    for (let i = 0; i < 6; i++) {
      const nom = champ(corpsForm, `reseauNom${i}`, 60);
      const lien = champ(corpsForm, `reseauLien${i}`, 300);
      if (!nom && !lien) continue;
      if (!nom || !/^https:\/\//i.test(lien)) return html(reponse, V.reglages({ ...base, D, medias: await Medias.inventaire(D, 'image'), erreur: `Le réseau ${i + 1} doit avoir un nom et une adresse https.` }), 400);
      reseaux.push({ nom, lien });
    }
    await modifier((b) => {
      b.reglages = {
        ...REGLAGES_DEFAUT, ...(b.reglages || {}),
        titreSite: champ(corpsForm, 'titreSite', 80) || REGLAGES_DEFAUT.titreSite,
        descriptionSite: champ(corpsForm, 'descriptionSite', 300) || REGLAGES_DEFAUT.descriptionSite,
        imagePartage: issue.chemin || champ(corpsForm, 'imagePartage', 300),
        indexation: corpsForm.indexation === '1',
        adressePublique, reseaux,
        mentionPied: champ(corpsForm, 'mentionPied', 120),
      };
      b.institution.adresse = champ(corpsForm, 'adresse', 200) || b.institution.adresse;
      b.institution.email = champ(corpsForm, 'email', 120) || b.institution.email;
      b.institution.numeroCourt = champ(corpsForm, 'numeroCourt', 12) || b.institution.numeroCourt;
      const tels = [champ(corpsForm, 'telephone0', 40), champ(corpsForm, 'telephone1', 40)].filter(Boolean);
      if (tels.length) b.institution.telephones = tels;
    }, 'reglages');
    return versLa(reponse, '/admin/reglages?message=' + encodeURIComponent('Réglages enregistrés.'));
  }

  return html(reponse, V.introuvable({ ...base }), 404);
}

/* ======================= VALIDATION ======================= */
/* Le champ fichier est facultatif : s'il est rempli, le fichier est enregistré et son
   chemin remplace celui saisi ; s'il est vide, le fichier en place est conservé. */
async function visuelTeleverse(fichiers, champNom, genres = ['image']) {
  const f = fichiers.find((x) => x.champ === champNom);
  if (!f) return {};
  const issue = await Medias.enregistrer(f, { genres });
  return issue.erreur ? { erreur: issue.erreur } : { chemin: issue.chemin };
}

function validerActualite(f) {
  if (!champ(f, 'titre', 300)) return 'Le titre est obligatoire.';
  if (!dateValide(champ(f, 'dateIso', 10)) || !champ(f, 'dateIso', 10)) return 'La date est obligatoire, au format AAAA-MM-JJ.';
  if (!dateValide(champ(f, 'publierLe', 10))) return 'La date de publication doit être au format AAAA-MM-JJ.';
  if (!adresseValide(f.image)) return 'Le visuel doit être un chemin du site ou une adresse https.';
  if (!['publie', 'brouillon'].includes(f.statut)) return 'Statut inconnu.';
  return '';
}
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dateFrancaise(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  return `${JOURS[d.getUTCDay()]} ${String(j).padStart(2, '0')} ${MOIS[m - 1]} ${a}`;
}
function actualiteDepuis(f) {
  const iso = champ(f, 'dateIso', 10);
  return {
    titre: champ(f, 'titre', 300), dateIso: iso, date: dateFrancaise(iso),
    image: champ(f, 'image', 500), alt: champ(f, 'alt', 200),
    chapeau: champ(f, 'chapeau', 2000), corps: contientHtml(f.corps) ? nettoyer(String(f.corps || '')).slice(0, 40000) : champ(f, 'corps', 40000), rubrique: champ(f, 'rubrique', 60),
    statut: f.statut, publierLe: champ(f, 'publierLe', 10),
  };
}

function validerDocument(f, D) {
  if (!champ(f, 'titre', 400)) return 'L’intitulé est obligatoire.';
  if (!D.categories.some((c) => c.cle === f.categorie)) return 'Catégorie inconnue.';
  const annee = champ(f, 'annee', 4);
  if (annee && !/^[0-9]{4}$/.test(annee)) return 'L’année doit comporter quatre chiffres.';
  if (!dateValide(champ(f, 'date', 10))) return 'La date doit être au format AAAA-MM-JJ.';
  if (!adresseValide(f.lien)) return 'Le lien doit commencer par https:// ou par une barre oblique.';
  if (!adresseValide(f.fichier)) return 'Le fichier doit être un chemin du site.';
  return '';
}
function documentDepuis(f, D) {
  const categorie = D.categories.find((c) => c.cle === f.categorie);
  return {
    categorie: f.categorie, nom: categorie ? categorie.nom : f.categorie,
    annee: champ(f, 'annee', 4), date: champ(f, 'date', 10), titre: champ(f, 'titre', 400),
    description: champ(f, 'description', 1000), lien: champ(f, 'lien', 500), fichier: champ(f, 'fichier', 500),
  };
}

function validerPublication(f, D) {
  if (!champ(f, 'titre', 300)) return 'Le titre est obligatoire.';
  if (!D.observatoire.some((mk) => mk.cle === f.marche)) return 'Marché inconnu.';
  if (!/^[0-9]{4}$/.test(champ(f, 'annee', 4))) return 'L’année doit comporter quatre chiffres.';
  if (!/^T[1-4]$/.test(champ(f, 'trimestre', 2))) return 'Le trimestre doit être T1, T2, T3 ou T4.';
  if (!adresseValide(f.lien)) return 'Le lien doit commencer par https:// ou par une barre oblique.';
  if (!champ(f, 'lien', 500) && !champ(f, 'fichier', 500)) return 'Indiquez un lien ou téléversez un PDF.';
  return '';
}
const publicationDepuis = (f) => ({
  titre: champ(f, 'titre', 300), annee: champ(f, 'annee', 4), trimestre: champ(f, 'trimestre', 2),
  lien: champ(f, 'lien', 500), fichier: champ(f, 'fichier', 500),
});
const trierPublications = (marche) => marche.publications.sort((a, b) => (b.annee + b.trimestre).localeCompare(a.annee + a.trimestre));

function validerFaq(f) {
  if (!champ(f, 'q', 300)) return 'La question est obligatoire.';
  if (!champ(f, 'r', 6000)) return 'La réponse est obligatoire.';
  return '';
}

function validerChiffre(f) {
  if (!champ(f, 'affichage', 40)) return 'L’affichage est obligatoire.';
  if (!champ(f, 'unite', 60)) return 'L’unité est obligatoire.';
  if (!champ(f, 'libelle', 200)) return 'Le libellé est obligatoire.';
  const v = Number(String(f.valeur || '').replace(',', '.').replace(/\s/g, ''));
  if (!Number.isFinite(v) || v < 0) return 'La valeur doit être un nombre positif.';
  const d = Number.parseInt(f.decimales, 10);
  if (!Number.isInteger(d) || d < 0 || d > 4) return 'Les décimales doivent être comprises entre 0 et 4.';
  return '';
}
const chiffreDepuis = (f) => ({
  valeur: Number(String(f.valeur).replace(',', '.').replace(/\s/g, '')), affichage: champ(f, 'affichage', 40),
  unite: champ(f, 'unite', 60), libelle: champ(f, 'libelle', 200), decimales: Number.parseInt(f.decimales, 10) || 0,
  periode: champ(f, 'periode', 60),
});

export { ROLES, dateIso };
