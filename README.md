# ARCEP Gabon — refonte du site institutionnel

Site complet de l'Autorité de Régulation des Communications Électroniques et des Postes de
la République gabonaise : **pages publiques, interface de données et espace
d'administration**, servis par un seul processus Node, sans aucune dépendance à installer.

Le parti pris : **un voyage chromatique du territoire vers le monde**. L'accueil se lit
comme un récit en douze scènes — du vert de la forêt au bleu du ciel, puis à l'or et au
blanc de la lumière — où chaque partie du travail de l'Autorité a son climat, son rythme et
ses données. Le vocabulaire graphique vient des réseaux : nœuds et liaisons, trames de
coordonnées, tracés de signal, toujours en fond, toujours retenus. Les visuels sont réels :
l'actualité à la une, les données publiées, et le site mobile lui-même, filmé, dans le
téléphone.

---

## Démarrer

```
node serveur/index.mjs
```

| | |
|---|---|
| Site | http://127.0.0.1:4310/ |
| Interface de données | http://127.0.0.1:4310/api |
| Administration | http://127.0.0.1:4310/admin |

**Aucune dépendance à installer, aucun appel sortant** : ni `npm install`, ni base de
données, ni service externe. Les caractères, les bibliothèques de mouvement (GSAP,
ScrollTrigger, SplitText, Lenis) et les médias sont servis par le site lui-même, et la
politique de sécurité du contenu se referme sur `self`.

Le serveur n'emploie que la bibliothèque standard de Node (version 20 ou plus récente). Le
premier appel à `/admin` propose de créer le compte d'administration ; il n'en existe aucun
par défaut.

Variables d'environnement : `ARCEP_PORT` (défaut 4310), `ARCEP_HOTE` (défaut 127.0.0.1),
`ARCEP_SECURISE=1` derrière un HTTPS — le cookie de session reçoit alors l'attribut `Secure`.

---

## Arborescence

```
serveur/            le processus
  index.mjs         routage, fichiers versionnés, en-têtes de sécurité, formulaire de contact,
                    robots.txt, sitemap.xml
  base.mjs          lecture et écriture du document de contenus (atomique, journalisée)
  auth.mjs          comptes, rôles, mots de passe scrypt, sessions, jetons anti-rejeu
  medias.mjs        médiathèque : images et PDF reconnus sur leurs octets
  multipart.mjs     lecture des formulaires portant des fichiers
  api.mjs           interface de données publique, en lecture seule
  admin.mjs         routes de l'administration
  schema.mjs        textes éditables des pages, listes, réglages, rôles
  vues/
    base.mjs        socle des pages : en-tête, menu, curseur, pied, métadonnées, icônes
    pages.mjs       les pages publiques
    graphiques.mjs  graphiques SVG rendus par le serveur à partir des données
    admin.mjs       les écrans d'administration

public/             tout ce qui est servi tel quel
  css/polices.css   Archivo, Source Serif 4, IBM Plex Mono, auto-hébergées
  css/systeme.css   design system : jetons, scènes, primitives, en-tête, menu, curseur, pied
  css/site.css      les pages
  css/admin.css     l'administration
  js/avant.js       unique script bloquant : signale que le JavaScript est disponible
  js/site.js        point d'entrée ; js/modules/ : un module par comportement
  js/ecran.js       mode « écran » : la page rendue dans l'iPhone de l'accueil
  js/admin.js       conforts de l'administration
  js/vendor/        GSAP 3.13, ScrollTrigger, SplitText, Lenis 1.3
  assets/           logo, icône, image de partage, vidéo du logo, vidéo de l'iPhone, visuels d'actualité
  assets/polices/   les fichiers woff2 (407 Ko), produits par outils/contenu/polices.mjs
  assets/medias/    les images téléversées depuis l'administration
  assets/documents/ les PDF téléversés depuis l'administration

donnees/
  arcep.json        la totalité des contenus
  comptes.json      créé au premier compte ; jamais livré
  historique/       une copie horodatée avant chaque écriture, conservée trente jours
  demandes.jsonl    les demandes reçues par le formulaire de contact

charte/             la charte de marque (PDF, PPTX, planches, masters du logo)
docs/               audit, architecture, administration, contrôles, direction artistique
outils/
  contenu/          import des contenus de l'ancien site, allègement des visuels, polices
  charte/           charte de marque, image de partage, vidéo de l'iPhone
  controle/         vérification des pages, des liens, de l'administration, du poids, hygiène du code
  deploiement/      démarrage sur Render (disque persistant)
  captures/         planches de relecture
recherche/          pages du site officiel telles qu'aspirées, pour référence
sources/            documents fournis par le client
```

---

## Les pages

| Adresse | Contenu |
|---|---|
| `/` | le récit : hero, identité, missions, mots-clés, chiffres, observatoire, réglementation, iPhone, actualités, consommateurs, contact |
| `/autorite` | statut, Conseil de Régulation, directions, mot du Président, partenaires |
| `/missions` | les cinq missions et leurs attributions |
| `/observatoire` | indicateurs, couverture trimestrielle, tableaux de bord filtrables |
| `/reglementation` | bibliothèque des textes : recherche, type, année, PDF |
| `/actualites`, `/actualites/:id` | la une, les publications, les pages d'article |
| `/consommateurs` | numéro 1331, garanties, démarches, questions fréquentes |
| `/contact` | coordonnées et formulaire |
| `/mentions-legales`, `/confidentialite` | pages légales |
| `/robots.txt`, `/sitemap.xml` | référencement, pilotés par les réglages |

Toute page accepte `?ecran=1` : c'est le mode dans lequel le site mobile est filmé pour
l'écran du téléphone de l'accueil (`outils/charte/video-iphone.mjs`), même rendu, sans
barre de défilement ni défilement lissé.

---

## Origine des contenus

Les contenus ont été repris une fois du site officiel de l'Autorité par
`outils/contenu/importer-arcep.mjs` : quatre-vingt-treize actualités avec leur texte, leur
visuel et leurs images, soixante-trois textes réglementaires et trente-cinq tableaux de
bord avec leur PDF, les missions, les chiffres, les coordonnées. **Rien n'est inventé** et
**rien ne renvoie vers l'ancien site** : tout est servi ici. Les visuels lourds ont été
réencodés par `outils/contenu/optimiser-images.mjs`. Les titres et phrases d'habillage
sont déclarés dans `serveur/schema.mjs` et modifiables depuis l'administration.

---

## Documentation

| | |
|---|---|
| [docs/audit.md](docs/audit.md) | l'audit de la version précédente et les décisions |
| [docs/1-architecture.md](docs/1-architecture.md) | comment le serveur est bâti, et pourquoi ainsi |
| [docs/2-administration.md](docs/2-administration.md) | comptes, rôles, publication, médias, restauration |
| [docs/3-controles.md](docs/3-controles.md) | la batterie de vérification et les pièges rencontrés |
| [docs/4-direction-artistique.md](docs/4-direction-artistique.md) | palette, typographie, mouvement, scènes |

---

## Mise en ligne

Il faut **un hébergement capable d'exécuter Node** : l'administration et le formulaire de
contact écrivent sur le disque. Derrière un serveur frontal (nginx, Caddy), relayer vers
`127.0.0.1:4310`, terminer le TLS en amont, lancer le processus avec `ARCEP_SECURISE=1`,
puis renseigner l'adresse publique et autoriser l'indexation dans « Réglages et SEO ».
Sauvegarder `donnees/` et `public/assets/medias/`, `public/assets/documents/`.
