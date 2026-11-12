# ARCEP Gabon

Site institutionnel de l'Autorité de Régulation des Communications Électroniques et des Postes : pages publiques, API de lecture et espace d'administration, servis par un seul processus Node sans dépendance.

## Démarrer

```
node serveur/index.mjs
```

| | |
|---|---|
| Site | http://127.0.0.1:4310/ |
| API | http://127.0.0.1:4310/api |
| Administration | http://127.0.0.1:4310/admin |

Pas de `npm install`, pas de base de données, aucun appel sortant : polices, bibliothèques (GSAP, ScrollTrigger, SplitText, Lenis) et médias sont servis par le site, la CSP est fermée sur `self`. Node 20 minimum.

Au premier appel de `/admin`, le site propose de créer le compte administrateur. Il n'existe aucun compte par défaut.

Variables d'environnement :

| Variable | Rôle |
|---|---|
| `ARCEP_PORT` | port d'écoute (4310) ; `PORT` est aussi lu |
| `ARCEP_HOTE` | interface d'écoute (127.0.0.1, ou 0.0.0.0 si `PORT` est défini) |
| `ARCEP_SECURISE=1` | derrière HTTPS : cookie `Secure` + `__Host-`, HSTS, `upgrade-insecure-requests` |
| `ARCEP_PROXY=1` | derrière un frontal : lit `X-Forwarded-For` |

## Arborescence

```
serveur/
  index.mjs         serveur HTTP : routage, statique versionné, en-têtes de sécurité,
                    formulaire de contact, robots.txt, sitemap.xml
  base.mjs          lecture/écriture du document de contenus (atomique, historisée)
  auth.mjs          comptes, rôles, scrypt, sessions, CSRF
  medias.mjs        médiathèque (images et PDF vérifiés sur leur signature)
  multipart.mjs     parseur multipart/form-data
  api.mjs           API publique en lecture seule
  admin.mjs         routes de l'administration
  schema.mjs        textes éditables, listes, réglages, rôles
  vues/             base.mjs (layout, menu, pied, meta, icônes), pages.mjs, graphiques.mjs (SVG), admin.mjs

public/
  css/              polices.css (généré), systeme.css (tokens, scènes, primitives), site.css, admin.css
  js/               avant.js (pose la classe js), site.js + modules/, ecran.js, admin.js, vendor/
  assets/           logo, icônes, image de partage, vidéos, visuels d'actualité
  assets/polices/   woff2 (Archivo, Source Serif 4, IBM Plex Mono)
  assets/medias/    images téléversées depuis l'administration
  assets/documents/ PDF téléversés depuis l'administration

donnees/
  arcep.json        l'ensemble des contenus
  comptes.json      créé au premier compte, jamais versionné
  historique/       copie horodatée avant chaque écriture (30 jours)
  demandes.jsonl    demandes reçues par le formulaire de contact

charte/             charte de marque (PDF, PPTX, planches, logos)
docs/               architecture, administration, contrôles, direction artistique
outils/
  contenu/          import des contenus de l'ancien site, optimisation des images, polices
  charte/           génération de la charte, image de partage, vidéo de l'iPhone
  controle/         vérifications (pages, liens, admin, poids, polices, CSS)
  deploiement/      démarrage sur Render
```

## Pages

| Adresse | Contenu |
|---|---|
| `/` | accueil : hero, identité, missions, mots-clés, chiffres, observatoire, réglementation, iPhone, actualités, consommateurs, contact |
| `/autorite` | statut, Conseil de Régulation, directions, mot du Président, partenaires |
| `/missions` | les cinq missions et leurs attributions |
| `/observatoire` | indicateurs, couverture trimestrielle, tableaux de bord filtrables |
| `/reglementation` | textes réglementaires : recherche, type, année, PDF |
| `/actualites`, `/actualites/:id` | liste paginée et pages d'article |
| `/consommateurs` | numéro 1331, garanties, démarches, FAQ |
| `/contact` | coordonnées et formulaire |
| `/mentions-legales`, `/confidentialite` | pages légales |
| `/robots.txt`, `/sitemap.xml` | pilotés par les réglages |

Toute page accepte `?ecran=1` : rendu sans curseur ni défilement lissé, utilisé pour filmer le site mobile affiché dans l'iPhone de l'accueil (`outils/charte/video-iphone.mjs`).

## Contenus

Les contenus ont été importés une fois depuis l'ancien site (`outils/contenu/importer-arcep.mjs`) : 93 actualités avec texte et visuels, 63 textes réglementaires, 35 tableaux de bord avec leur PDF, missions, chiffres, coordonnées. Tout est servi localement, aucun lien ne renvoie vers l'ancien site. Les images lourdes ont été réencodées par `outils/contenu/optimiser-images.mjs`. Les titres et textes d'habillage sont déclarés dans `serveur/schema.mjs` et modifiables depuis l'administration.

## Documentation

- [docs/1-architecture.md](docs/1-architecture.md) : serveur, contenus, rendu, sécurité
- [docs/2-administration.md](docs/2-administration.md) : comptes, rôles, publication, médias, restauration
- [docs/3-controles.md](docs/3-controles.md) : outils de vérification et notes techniques
- [docs/4-direction-artistique.md](docs/4-direction-artistique.md) : palette, typographie, mouvement, scènes
- [DEPLOIEMENT.md](DEPLOIEMENT.md) : Render, serveur virtuel, nom de domaine

## Mise en ligne

Il faut un hébergement Node : l'administration et le formulaire de contact écrivent sur le disque. Derrière un frontal (nginx, Caddy), relayer vers `127.0.0.1:4310`, terminer le TLS en amont, lancer avec `ARCEP_SECURISE=1` (et `ARCEP_PROXY=1`), puis renseigner l'adresse publique et autoriser l'indexation dans « Réglages et SEO ». Sauvegarder `donnees/`, `public/assets/medias/` et `public/assets/documents/`. Détails dans `DEPLOIEMENT.md`.
