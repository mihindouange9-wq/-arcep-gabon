/* ARCEP Gabon — interface de données publique.
   Lecture seule et anonyme : les mêmes contenus que le site, dans un format exploitable.
   Aucune écriture ici ; l'administration passe par ses propres routes authentifiées. */
import { lire } from './base.mjs';
import { RUBRIQUES, actualitesPubliees } from './vues/base.mjs';

const PAGE_MAX = 200;

const json = (reponse, charge, { statut = 200, cache = 300 } = {}) => {
  const corps = JSON.stringify(charge, null, 1);
  reponse.writeHead(statut, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': `public, max-age=${cache}`,
    'x-content-type-options': 'nosniff',
  });
  reponse.end(corps);
};

const entier = (v, defaut, min, max) => {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return defaut;
  return Math.min(max, Math.max(min, n));
};

export async function servirApi(chemin, url, reponse) {
  const D = await lire();

  if (chemin === '/api' || chemin === '/api/') {
    return json(reponse, {
      nom: 'Interface de données ARCEP Gabon',
      note: 'Contenus repris du site officiel arcep.ga. Lecture seule.',
      routes: [
        { chemin: '/api/contenus', description: 'La totalité des contenus publiés' },
        { chemin: '/api/rubriques', description: 'Les rubriques du site et le volume de chacune' },
        { chemin: '/api/chiffres', description: 'Les indicateurs clés du secteur' },
        { chemin: '/api/actualites', description: 'Les actualités, paramètres : limite, depuis' },
        { chemin: '/api/documents', description: 'Les textes réglementaires, paramètres : categorie, q, limite, depuis' },
        { chemin: '/api/observatoire', description: 'Les tableaux de bord par marché' },
        { chemin: '/api/faq', description: 'Les questions fréquentes' },
        { chemin: '/api/institution', description: 'L’Autorité : statut, coordonnées, directions, partenaires' },
      ],
    });
  }

  if (chemin === '/api/contenus') {
    /* Les brouillons, les réglages et les textes d'habillage restent hors de l'interface. */
    const { reglages, pages, listes, ...publie } = D;
    return json(reponse, { ...publie, actualites: actualitesPubliees(D) });
  }

  if (chemin === '/api/rubriques') {
    const publications = D.observatoire.reduce((n, m) => n + m.publications.length, 0);
    const compte = {
      autorite: D.directions.length,
      missions: D.missions.length,
      observatoire: publications,
      reglementation: D.documents.length,
      actualites: actualitesPubliees(D).length,
      consommateurs: D.faq.length,
      contact: D.directions.length,
    };
    return json(reponse, RUBRIQUES.map((r) => ({ cle: r.cle, nom: r.nom, chemin: r.chemin, description: r.tenue, volume: compte[r.cle] })));
  }

  if (chemin === '/api/faq') return json(reponse, D.faq);
  if (chemin === '/api/institution') {
    return json(reponse, { institution: D.institution, conseil: D.conseil, directions: D.directions, partenaires: D.partenaires });
  }

  if (chemin === '/api/chiffres') {
    return json(reponse, { source: D.chiffresSource, chiffres: D.chiffres });
  }

  if (chemin === '/api/actualites') {
    const limite = entier(url.searchParams.get('limite'), 20, 1, PAGE_MAX);
    const depuis = entier(url.searchParams.get('depuis'), 0, 0, 10000);
    const tout = actualitesPubliees(D);
    return json(reponse, { total: tout.length, depuis, limite, resultats: tout.slice(depuis, depuis + limite) });
  }

  if (chemin === '/api/documents') {
    const categorie = (url.searchParams.get('categorie') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const limite = entier(url.searchParams.get('limite'), 50, 1, PAGE_MAX);
    const depuis = entier(url.searchParams.get('depuis'), 0, 0, 10000);
    const filtres = D.documents.filter((d) =>
      (!categorie || d.categorie === categorie)
      && (!q || d.titre.toLowerCase().includes(q) || String(d.annee).includes(q)));
    return json(reponse, {
      total: filtres.length, depuis, limite,
      categories: D.categories,
      resultats: filtres.slice(depuis, depuis + limite),
    });
  }

  if (chemin === '/api/observatoire') {
    return json(reponse, D.observatoire);
  }

  return json(reponse, { erreur: 'Route inconnue', routes: '/api' }, { statut: 404, cache: 0 });
}
