# Architecture

## Choix de base

Un seul processus Node, bibliothèque standard uniquement. Pas de `npm install`, pas de base de données, pas de service tiers. Le site doit pouvoir être hébergé et administré par les équipes de l'Autorité : un dossier copié et une commande suffisent, et il n'y a pas de chaîne de dépendances à maintenir.

## Contenus

`donnees/arcep.json` est le seul document de données : institution, Conseil, Président, chiffres clés, missions, catégories réglementaires et textes, marchés de l'Observatoire et tableaux de bord, actualités, FAQ, partenaires, directions, plus trois sections éditables : `pages` (textes d'habillage), `listes` (garanties et démarches consommateurs) et `reglages` (SEO, réseaux, adresse publique).

Les textes qui ne sont pas des données institutionnelles (titre de section, accroche, libellé) sont déclarés dans `serveur/schema.mjs` avec leur valeur par défaut. Les vues lisent la valeur enregistrée, sinon la valeur par défaut ; l'administration génère les formulaires à partir du schéma.

`serveur/base.mjs` sérialise les écritures (file de promesses), écrit dans un fichier temporaire puis renomme, copie l'état précédent dans `donnees/historique/` (rétention 30 jours) et invalide son cache mémoire sur la date de modification. Deux écritures simultanées ne peuvent ni se recouvrir ni laisser un fichier tronqué.

Au démarrage, `preparerDonnees()` complète une fois les contenus importés qui n'ont pas d'identifiant, de statut ou de date ISO. Rien d'autre n'est modifié, et rien n'est écrit si rien ne manque.

## Rendu

Pages rendues côté serveur en template strings, sans framework ni build. Chaque page fonctionne sans JavaScript : navigation, filtres, formulaires, administration.

Tout ce qui sort des vues passe par `e()` (`vues/base.mjs`). Les URL passent par `lien()`, qui n'accepte que `http`, `https`, `mailto`, `tel` et les chemins relatifs. Le corps d'un article accepte un HTML restreint (`serveur/html.mjs` : paragraphes, titres, listes, gras, italique, liens, images du site), nettoyé à l'écriture et au rendu.

Les graphiques (`vues/graphiques.mjs`) sont des SVG construits à partir des données : textes par catégorie, matrice trimestres × marchés, jauges.

Feuilles et scripts sont servis avec l'empreinte de leur contenu (`/css/site.css?v=…`) et un cache d'un an ; l'URL change quand le fichier change.

## Navigateur

`public/js/site.js` charge un module par comportement (`public/js/modules/`) :

| Module | Rôle |
|---|---|
| `socle` | GSAP, ScrollTrigger, SplitText, Lenis ; défilement lissé à la souris seulement ; ancres |
| `chrome` | en-tête : état selon la scène survolée, retrait à la descente, barre de progression |
| `menu` | menu plein écran : rideau, focus retenu, page inerte |
| `curseur` | curseur personnalisé (souris seulement) |
| `voile` | transition entre pages |
| `hero` | séquence d'entrée, actualité à la une, réseau de nœuds sur canvas |
| `revelations` | titres ligne à ligne, visuels démasqués, séries, parallaxe, vidéos |
| `donnees` | compteurs, jauges, barres, couverture |
| `missions` | dialogues des missions |
| `mots` | mots-clés en scène sticky |
| `ecran` | iPhone : entrée, zoom, vidéo du site mobile, changement de climat |
| `filtrage` | listes filtrables, URL synchronisée |
| `documents` | lecteur PDF en modale |
| `pied` | pied de page |

Deux règles : les états initiaux des animations vivent sous la classe `js` (posée par `avant.js` avant le premier rendu), donc rien n'est masqué sans script ; et `prefers-reduced-motion` désactive tout le mouvement. Sur écran tactile : pas de curseur, pas de réseau animé, pas de parallaxe, pas de scènes sticky.

Les deux scènes longues (mots-clés, iPhone) utilisent `position: sticky`, pas de pin ScrollTrigger.

L'écran de l'iPhone joue une vidéo du site mobile (`public/assets/iphone-defilement.webm`) produite par `outils/charte/video-iphone.mjs` : Chrome headless rend chaque page en `?ecran=1` à 440 × 956 (×1,5), sans barre de défilement, défile lentement, et les images sont encodées en VP9 via WebCodecs. Le JSON voisin donne le timecode de chaque page. La vidéo ne se charge qu'à l'approche de sa scène.

## Autonomie

`outils/contenu/importer-arcep.mjs` a importé une fois les actualités (texte, visuels, images), les PDF réglementaires et ceux de l'Observatoire dans `public/assets/`. Aucune page ne renvoie vers l'ancien site ; l'URL d'origine de chaque contenu est conservée dans un champ `source` non exposé.

## Sécurité

| | |
|---|---|
| Frontal | `ARCEP_PROXY=1` fait lire `X-Forwarded-For` (ignoré sinon). `ARCEP_SECURISE=1` ajoute HSTS, `upgrade-insecure-requests`, cookie `Secure` et préfixe `__Host-`. |
| Fichiers servis | PDF et SVG reçoivent leur propre CSP (`default-src 'none'`). URL mal formée : 404. |
| Mots de passe | scrypt (N=16384, r=8, p=1, 64 octets), sel par compte, comparaison en temps constant, dérivation même si le compte n'existe pas. |
| Comptes | deux rôles ; au moins un administrateur ; un changement de rôle ou de mot de passe ferme les sessions du compte. |
| Sessions | jeton aléatoire en mémoire, expiration glissante 8 h, cookie `HttpOnly`, `SameSite=Strict`. |
| Écritures | jeton CSRF sur chaque `POST` de l'administration, comparé en temps constant. |
| Connexion | 5 tentatives par quart d'heure et par couple identifiant/adresse. |
| Formulaire public | honeypot, 5 envois par heure et par adresse, corps limité à 64 Ko. |
| Fichiers | statique confiné à `public/`, liste d'extensions ; téléversements limités pendant la réception ; format vérifié sur les premiers octets (JPEG, PNG, WebP, PDF) ; noms nettoyés et suffixés. |
| En-têtes | CSP `self` (styles inline tolérés pour les attributs `style`), `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. `noindex` tant que l'indexation n'est pas activée dans les réglages. |

## Polices

Trois familles auto-hébergées (`public/assets/polices/`, 407 Ko, sous-ensembles latin et latin-ext) : Archivo (variable, graisse 100–900, chasse 62–125 %), Source Serif 4 (prose), IBM Plex Mono (données). `outils/contenu/polices.mjs` les télécharge et génère `polices.css` ; `outils/controle/verif-polices.mjs` vérifie la couverture des caractères publiés.

## Couleurs

Voir [4-direction-artistique.md](4-direction-artistique.md). Chaque scène pose ses variables (`--surface`, `--texte`, `--accent`…) sur sa section ; l'en-tête et le curseur s'adaptent à la tonalité survolée. Les contrastes sont vérifiés par `outils/controle/verif.mjs`.
