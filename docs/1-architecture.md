# Architecture

## Pourquoi un serveur, et pourquoi celui-ci

Un back-end suppose des écritures : un agent de l'Autorité doit pouvoir publier une
actualité, corriger une date, ajouter un texte réglementaire sans rappeler un prestataire.
Il suppose aussi une contrainte que l'ARCEP connaît bien : le serveur qui hébergera ce site
devra être administré par ses équipes.

D'où le choix tenu de bout en bout : **aucune dépendance installée**. Pas de `npm install`,
pas de base de données à provisionner, pas de service tiers. Le processus n'emploie que la
bibliothèque standard de Node. Un dossier copié, une commande, le site tourne. Rien ne se
périme et il n'y a pas de chaîne d'approvisionnement à surveiller.

La refonte de septembre 2026 a conservé cette fondation et transformé tout ce qui se voit :
design system, mouvement, pages, administration.

## Les contenus

`donnees/arcep.json` — un document : l'institution, le Conseil, le Président et ses axes,
les chiffres clés, les missions, les catégories réglementaires et leurs textes, les marchés
de l'Observatoire et leurs tableaux de bord, les actualités, les questions fréquentes, les
partenaires, les directions. S'y ajoutent depuis la refonte : `pages` (les textes
d'habillage modifiés), `listes` (garanties et démarches de l'espace consommateurs) et
`reglages` (référencement, réseaux, adresse publique).

Ce qui n'est pas un fait institutionnel — un titre de section, une phrase d'accroche — est
déclaré dans `serveur/schema.mjs` avec sa valeur de départ. Les vues lisent la valeur
enregistrée, sinon la valeur de départ ; l'administration en fait des formulaires.

`serveur/base.mjs` garantit que **deux enregistrements simultanés ne peuvent ni se
recouvrir ni laisser un fichier tronqué** : file d'écriture, fichier temporaire puis
renommage, copie horodatée dans `donnees/historique/` avant chaque écriture (trente
jours), cache mémoire invalidé par la date de modification.

Au démarrage, `preparerDonnees()` pose une fois ce qui manque aux contenus repris du site
officiel : identifiants, statut de publication, date ISO triable. Rien d'autre n'est touché.

## Le rendu

Les pages sont **rendues par le serveur**, en gabarits de chaînes. Aucun cadre, aucune
étape de compilation : la page arrive complète et **fonctionne sans JavaScript** —
navigation, filtres, formulaires, administration.

Tout ce qui sort des vues est échappé (`e()` dans `vues/base.mjs`). Les adresses passent
par `lien()`, qui n'accepte que `http`, `https`, `mailto`, `tel` et les chemins relatifs.
Le corps d'un article peut porter un HTML restreint (`serveur/html.mjs` : paragraphes,
titres, listes, gras, italique, liens, images du site) ; il est nettoyé à l'écriture et de
nouveau au rendu, balise par balise, attribut par attribut.
Les graphiques (`vues/graphiques.mjs`) sont des SVG construits à partir des données du
document : nombre de textes par catégorie, matrice trimestres × marchés, jauges.

Les feuilles et les scripts sont servis sous une adresse portant l'empreinte de leur
contenu (`/css/site.css?v=…`) et mis en cache un an ; l'adresse change quand le fichier
change.

## Le navigateur

`public/js/site.js` charge un module par comportement (`public/js/modules/`) :

| Module | Rôle |
|---|---|
| `socle` | GSAP, ScrollTrigger, SplitText, Lenis ; défilement lissé à la souris seulement ; ancres |
| `chrome` | l'en-tête : état selon la scène survolée, retrait à la descente, progression |
| `menu` | le menu immersif : rideau, focus retenu, page rendue inerte |
| `curseur` | point et anneau, mots d'action ; souris seulement |
| `voile` | la transition entre pages |
| `hero` | la séquence d'entrée, l'actualité à la une et le réseau de nœuds sur canvas |
| `revelations` | titres ligne à ligne, visuels démasqués, séries, parallaxe, vidéos |
| `donnees` | compteurs, jauges, barres, couverture |
| `missions` | les dialogues des missions |
| `mots` | les quatre verbes, scène collante |
| `ecran` | l'iPhone : entrée, rapprochement, vidéo du site mobile, climat |
| `filtrage` | les listes filtrables, l'adresse qui suit |
| `pied` | la signature du pied de page |

Deux principes : **rien n'est caché sans script** (les états de départ vivent sous la
classe `js`, posée par `avant.js` avant le premier rendu), et **rien ne bouge si le
visiteur a demandé moins de mouvement**. Au doigt, ni curseur, ni réseau animé, ni
parallaxe, ni scènes collantes.

Les deux scènes longues (mots-clés, iPhone) sont tenues par `position: sticky`, pas par
un épinglage qui déplacerait des nœuds.

L'écran de l'iPhone joue une **vidéo du site mobile** (`public/assets/iphone-defilement.webm`),
enregistrée par `outils/charte/video-iphone.mjs` : Chrome sans interface rend chaque page
en mode `?ecran=1` au format du 17 Pro Max (440 × 956 points, 1,5 pixel par point), sans
barre de défilement, la fait défiler lentement, puis encode les images en VP9 par WebCodecs.
Le fichier JSON voisin donne le début de chaque page ; la vidéo ne joue que dans le champ.

## L'autonomie

Le site ne dépend plus de l'ancien : `outils/contenu/importer-arcep.mjs` a rapatrié, une
fois, toutes les actualités (texte, visuels de couverture, images intégrées) et tous les
PDF de la réglementation et de l'Observatoire dans `public/assets/`. Aucune page ne
renvoie vers arcep.ga ; l'adresse d'origine de chaque contenu est conservée dans un champ
`source`, jamais affiché.

## La sécurité

| | |
|---|---|
| Derrière un frontal | `ARCEP_PROXY=1` fait lire l'adresse du visiteur dans `X-Forwarded-For` ; sans ce réglage l'en-tête est ignoré, sinon n'importe qui pourrait le forger. `ARCEP_SECURISE=1` ajoute HSTS, `upgrade-insecure-requests`, l'attribut `Secure` et le préfixe `__Host-` du cookie. |
| Fichiers servis | un PDF ou un SVG reçoit sa propre politique de sécurité (`default-src 'none'`) : rien de ce qu'il contient ne s'exécute dans l'origine du site. Une adresse mal formée répond 404, jamais 500. |
| Mots de passe | `scrypt` (N=16384, r=8, p=1, 64 octets), sel par compte, comparaison à temps constant, dérivation même sans compte trouvé. |
| Comptes | deux rôles ; il reste toujours au moins un administrateur ; un changement de rôle ou de mot de passe clôt les sessions du compte. |
| Sessions | jeton aléatoire en mémoire, expiration glissante de huit heures, cookie `HttpOnly`, `SameSite=Strict`, `Secure` derrière un HTTPS. |
| Écritures | jeton anti-rejeu sur chaque `POST` de l'administration, vérifié en temps constant. |
| Connexion | cinq tentatives par quart d'heure et par couple identifiant/adresse. |
| Formulaire public | champ piège, cinq envois par heure et par adresse, corps borné à 64 Ko. |
| Fichiers | service statique enfermé dans `public/`, liste d'extensions ; téléversements bornés pendant la réception ; format reconnu sur les premiers octets (JPEG, PNG, WebP, PDF) ; noms réduits et suffixés d'un aléa. |
| En-têtes | CSP refermée sur `self` (styles en ligne tolérés pour les attributs `style`), `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. `noindex` tant que l'indexation n'est pas autorisée dans les réglages. |

## Les caractères

Trois familles auto-hébergées (`public/assets/polices/`, 407 Ko, sous-ensembles latin et
latin-ext) : **Archivo** (variable, graisse 100–900, chasse 62–125 %) pour tout le
sans-serif, **Source Serif 4** pour la prose, **IBM Plex Mono** pour les données.
`outils/contenu/polices.mjs` les télécharge et écrit `polices.css` ;
`outils/controle/verif-polices.mjs` vérifie que chaque caractère publié est couvert.

## Les couleurs

Voir [4-direction-artistique.md](4-direction-artistique.md). Chaque scène pose ses
variables (`--surface`, `--texte`, `--accent`…) sur sa section ; l'en-tête et le curseur
s'adaptent à la tonalité de la scène qu'ils survolent. Les contrastes sont vérifiés par
`outils/controle/verif.mjs` sur chaque page.
