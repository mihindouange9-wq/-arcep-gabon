# Contrôles

Huit outils de contrôle sans dépendance, plus deux outils de fabrication : la vidéo de l'iPhone (`node outils/charte/video-iphone.mjs`, serveur lancé) et l'import des contenus de l'ancien site (`node outils/contenu/importer-arcep.mjs`, serveur arrêté, à ne relancer que pour de nouveaux articles). Le serveur doit tourner pour les six premiers.

```
node serveur/index.mjs
node outils/controle/verif.mjs                           # console, débordement, révélations, contraste
node outils/controle/verif-liens.mjs                     # crawl : tout répond 200, aucun lien vers l'ancien site
node outils/controle/verif-admin.mjs [--captures]        # cycle complet de l'administration
node outils/controle/captures.mjs [--pages accueil,…]    # planches bureau et mobile
MSYS_NO_PATHCONV=1 node outils/controle/sonde.mjs /chemin --y 2000 --expr "…"   # évalue une expression dans une page
node outils/controle/poids.mjs [/chemin] [--largeur 390] # poids et temps de chargement
node outils/controle/verif-polices.mjs                   # couverture des caractères
node outils/controle/verif-css.mjs                       # classes et variables orphelines
```

Sous Git Bash, `MSYS_NO_PATHCONV=1` est nécessaire devant `sonde.mjs /chemin`, sinon le shell convertit le chemin.

## `verif.mjs`

Pilote Chrome headless par CDP sur les douze pages : exceptions et erreurs console, ressources en échec ; débordement horizontal à neuf largeurs de 360 à 1920 px ; état final des révélations après un défilement complet (rien ne doit rester invisible ou décalé) ; contraste de chaque texte sur son fond réel, au seuil WCAG correspondant à sa taille.

## `verif-liens.mjs`

Parcourt le site depuis l'accueil (environ 600 URL : pages et fichiers) et vérifie que tout répond 200, qu'aucun lien n'est vide et qu'aucun ne pointe vers l'ancien site. Les domaines externes rencontrés sont listés.

## `verif-admin.mjs`

Crée un compte de test, parcourt tous les écrans, puis joue un cycle sur chaque type de contenu : actualité en brouillon avec visuel téléversé (invisible côté public), aperçu, programmation, publication, page d'article, suppression ; texte avec PDF téléversé, faux PDF refusé, médiathèque qui signale l'usage ; catégorie, tableau de bord, question, indicateur ; textes de page ; réglages, robots.txt, sitemap.xml ; compte rédacteur et ses refus ; restauration d'une version. Le document de contenus est remis dans son état initial, les fichiers téléversés effacés, le compte supprimé.

## `captures.mjs`

Une planche par page et par largeur (1440 et 390) : capture tous les 900 px de défilement, assemblée en grille dans `outils/captures/`.

## `poids.mjs`

Chaque ressource, son type et sa taille, le total, le premier rendu, le DOM prêt, le chargement complet. Ordre de grandeur sur l'accueil, cache désactivé : un peu moins de 1 Mo en 34 fichiers, dont 215 Ko de polices et 179 Ko de scripts. La vidéo de l'iPhone (12,5 Mo) n'est chargée qu'à l'approche de sa scène.

## Notes techniques

**Pin ScrollTrigger et iframe.** ScrollTrigger épingle en déplaçant l'élément dans un espaceur, et le remet en place à chaque refresh. Déplacer un nœud qui contient une iframe la recharge, et le refresh déclenché par ce rechargement entre en collision avec le premier (« The node to be removed is no longer a child of this node »). Les scènes longues utilisent donc `position: sticky`, la section porte le défilement et ScrollTrigger ne fait que lire la progression. L'ancêtre doit rogner avec `overflow: clip`, pas `overflow: hidden`, qui crée un conteneur de défilement et annule le sticky.

**Page encadrée.** Le mode `?ecran=1` est le seul encadrable : `frame-src 'self'` sur la page qui encadre et `frame-ancestors 'self'` sur la page encadrée.

**`svg { display: block }` et `hidden`.** La feuille d'icônes est un `<svg hidden>`. Une règle `svg { display: block }` l'emporte sur le style UA de `hidden`. Chaque feuille pose `[hidden] { display: none !important; }`.

**Contraste et dégradés.** `getComputedStyle().backgroundColor` est transparent pour une section dont le fond est un dégradé. Chaque section pose sa couleur de surface en `background-color` sous son `background-image`, ce que la sonde lit.

**SplitText et polices.** Découper un titre avant le chargement de la police mesure les lignes de la police de repli. Le point d'entrée attend `document.fonts.ready` (au plus 1,2 s).

**Headless et animations.** Chrome headless ne rend rien tant qu'aucune capture n'est demandée ; les transitions restent à leur état initial. Chaque pas de défilement est suivi d'une capture jetée. La séquence d'entrée du hero dure environ 4 s, les outils l'attendent avant de mesurer.

**Cascade.** Les scènes posent des variables, les composants les consomment. Pas de bascule clair/sombre automatique par sélecteur, qui serait reprise par le sélecteur le plus spécifique.
