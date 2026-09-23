# Contrôles

Huit outils de contrôle, sans dépendance, et deux outils de fabrication : la vidéo de
l'iPhone (`node outils/charte/video-iphone.mjs`, quelques minutes, serveur lancé) et
l'import des contenus de l'ancien site (`node outils/contenu/importer-arcep.mjs`, serveur
arrêté, à ne relancer que pour reprendre de nouveaux articles). Le serveur doit tourner
pour les six premiers contrôles.

```
node serveur/index.mjs                                   # dans un terminal
node outils/controle/verif.mjs                           # console, débordement, révélations, contraste
node outils/controle/verif-admin.mjs [--captures]        # cycle complet de l'administration
node outils/controle/captures.mjs [--pages accueil,…]    # planches de relecture, bureau et mobile
node outils/controle/sonde.mjs /chemin --y 2000 --expr "…"   # une expression évaluée dans la page
node outils/controle/poids.mjs [/chemin] [--largeur 390] # poids et temps de chargement
node outils/controle/verif-polices.mjs                   # couverture des caractères
node outils/controle/verif-css.mjs                       # classes et variables orphelines
node outils/controle/verif-nul.mjs [--corriger]          # octets NUL
```

## `verif.mjs` — le rendu servi

Pilote Chrome sans interface par le protocole de débogage et passe les douze pages au
crible : exceptions et erreurs de console, ressources en échec ; **débordement
horizontal** à neuf largeurs de 360 à 1920 pixels ; **révélations** — après un défilement
complet, rien de ce qui porte un état d'entrée ne doit être resté invisible ou décalé ;
**contraste** de chaque texte sur son fond réel, au seuil WCAG applicable à sa taille.

## `verif-admin.mjs` — l'administration

Crée un compte de relecture, parcourt tous les écrans, puis joue un cycle sur chaque type
de contenu : actualité en brouillon avec visuel téléversé, invisible sur le site, aperçu,
programmation, publication, page d'article, suppression ; texte avec PDF téléversé, faux
PDF refusé, médiathèque qui signale l'usage ; catégorie, tableau de bord, question,
indicateur ; textes de page ; réglages, robots.txt, sitemap.xml ; compte rédacteur et
ses refus ; restauration d'une version. Le document de contenus est remis dans son état
de départ, les fichiers téléversés effacés, le compte supprimé.

## `captures.mjs` — les planches

Une planche par page et par largeur (1440 et 390) : la page capturée tous les 900 pixels
de défilement, assemblée en grille dans `outils/captures/`. C'est la relecture visuelle.

## `poids.mjs` — la performance

Sans Lighthouse sur ce poste, la mesure de référence : chaque ressource, son type et sa
taille, le total, le premier rendu, le DOM prêt, le chargement complet. Repères au
22 septembre 2026, accueil, cache désactivé : 964 Ko en 34 fichiers, dont 215 Ko de
caractères et 179 Ko de scripts ; premier rendu sous 750 ms sur la machine de
développement. La vidéo de l'iPhone (12,5 Mo, 93 s) n'est chargée qu'à l'approche de sa
scène, jamais au chargement de la page.

---

# Pièges rencontrés, et ce qu'ils ont appris

## Un élément épinglé qui contient une iframe se recharge

ScrollTrigger épingle en déplaçant l'élément dans un espaceur, et le remet en place à
chaque recalcul. Déplacer un nœud qui contient une iframe recharge l'iframe, et le
recalcul provoqué par ce rechargement est entré en collision avec le premier : « The node
to be removed is no longer a child of this node ». **Les scènes longues sont collées par
`position: sticky`** et la section, plus haute, porte le défilement ; ScrollTrigger ne fait
que lire la progression. Corollaire : l'ancêtre doit rogner avec `overflow: clip`, pas
`overflow: hidden`, qui créerait un conteneur de défilement et annulerait le collage.

## La page qui s'encadre elle-même

L'accueil affiche le site dans un téléphone. Il faut `frame-src 'self'` sur la page qui
encadre **et** `frame-ancestors 'self'` sur la page encadrée — pas `'none'` sur l'une des
deux. Les réponses en mode `?ecran=1` sont les seules encadrables.

## `svg { display: block }` rend visible ce qui est `hidden`

La feuille d'icônes est un `<svg hidden>`. Une règle `svg { display: block }` l'emporte
sur le style d'agent utilisateur de `hidden`, et la feuille occupait 150 pixels en haut de
chaque page. **`[hidden] { display: none !important; }`** est posé dans chaque feuille.

## Une mesure de contraste ne voit pas les dégradés

`getComputedStyle().backgroundColor` est transparent pour une section dont le fond est un
dégradé : la sonde remontait jusqu'au fond du corps de page et signalait du texte sombre
sur du noir. **Chaque section pose sa couleur de surface en `background-color` sous son
`background-image`** : l'outil, comme un navigateur sans dégradé, lit la vraie teinte.

## SplitText avant les caractères

Découper un titre en lignes avant que la fonte soit chargée mesure les lignes de la fonte
de repli. Le point d'entrée attend `document.fonts.ready` (au plus 1,2 s) avant de lancer
les modules.

## En mode « headless », rien ne s'anime tant qu'on ne capture pas

Chrome sans interface ne produit aucune image tant qu'on ne lui en demande pas. Chaque pas
de défilement est suivi d'une capture jetée. La séquence d'entrée du hero dure quatre
secondes : les outils l'attendent avant de mesurer.

## Le sélecteur le plus spécifique reprend la main

Chaque usage nomme la teinte qui convient à son fond ; une bascule automatique clair/sombre
par la cascade serait reprise par le sélecteur le plus spécifique. Les scènes posent des
variables, les composants les consomment.

## Les séquences d'échappement survivent mal aux détours par la console

Une expression régulière écrite depuis un script shell a perdu son antislash (`/s+/` au
lieu de `/\s+/`) et les fichiers de polices ont reçu un nom avec espace. Les outils
s'écrivent avec un éditeur, pas par redirection ; `verif-nul.mjs` détecte les octets de
contrôle.
