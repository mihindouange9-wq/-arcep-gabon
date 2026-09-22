# ARCEP Gabon — système de design

Décisions durables, telles qu'elles sont livrées dans `public/css/systeme.css` et
`public/css/site.css`. La direction artistique complète est dans
`docs/4-direction-artistique.md`.

## Le monde

Un voyage chromatique du territoire vers le monde : vert forêt, bleu profond, bleu
électrique, or, blanc. Institutionnel, technologique, chaleureux. Le vocabulaire graphique
des réseaux (nœuds, liaisons, trames, tracés de signal, lueurs) reste en fond. Pas de
motif décoratif, pas de violet, pas de rose, pas de texte en dégradé, pas de verre
décoratif. Les visuels sont réels : actualités, données, le site mobile filmé dans le
téléphone.

## Couleurs

Ancres du logo : `#175b31`, `#459447`, `#24798e`, `#235272`, `#182e55`, `#e2b336`.
Trois familles de sept nuances (verts, bleus, jaunes) et huit neutres, déclarées en
jetons `--vert-*`, `--bleu-*`, `--jaune-*`, plus six dégradés nommés. Chaque scène
(`[data-scene]`) pose `--surface`, `--fond-scene`, `--accent`, `--accent-2`,
`--accent-or`, `--lueur` ; chaque tonalité (`[data-tonalite]`) pose `--texte`,
`--texte-2`, `--filet`, `--surface-2`, les couleurs de bouton. Les composants ne
consomment que ces variables.

Contraste : 4,5:1 pour le texte courant, 3:1 pour le texte large, vérifié par
`outils/controle/verif.mjs` sur chaque page. Sur clair, un badge assombrit sa teinte.

## Typographie

- **Archivo** (variable, 100–900, chasse 62–125 %) : titres en chasse 104–108 et graisse
  750–800, mots-clés en chasse 120 et graisse 900, navigation et interface en 500–600.
- **Source Serif 4** 400 et italique : chapeaux, prose, citations, descriptions.
- **IBM Plex Mono** 400–500 : dates, références, unités, tabulaires. Jamais en costume.

Échelle `--t-0` (0,75 rem) à `--t-7` (clamp(3 rem, 1,6 rem + 6 vw, 6,4 rem)). Crénage
négatif plafonné à −0,04 em. Aucun surtitre au-dessus d'un titre.

## Formes, espaces, profondeur

Rayons 6 / 14 / 28 px et pilule. Marges `--marge` clamp(1,25 rem, 4 vw, 4,5 rem), sections
clamp(5 rem, 10 vw, 9 rem), cadre 1440 px. Ombres toujours décalées et floues
(`--ombre-2`, `--ombre-3`) ; lueurs radiales floutées, deux par scène au plus ; trame de
coordonnées à 5–7 % d'opacité.

## Composants

Boutons (plein, contour, petit), lien fléché, badges, cartes, champs, recherche, filtres
en pastilles, tables, messages d'état nommés, accordéon, dialogue, infobulle, fiche,
coordonnées, listes filtrables, couverture (matrice), barres, jauges, chiffres, iPhone.

## Mouvement

Une courbe maîtresse `cubic-bezier(.22, 1, .36, 1)`. Micro : transitions CSS 180–600 ms.
Méso : révélations GSAP à l'entrée dans le champ (lignes masquées, visuels démasqués,
séries décalées ≤ 8). Macro : séquence du hero, mots-clés et iPhone en scènes collantes,
menu en rideau, pied révélé. Tout se retire en mouvement réduit ; au doigt, ni curseur, ni
réseau animé, ni parallaxe, ni scènes collantes.

## Ce qui ne se négocie pas

Rien d'inventé. Le site fonctionne sans script. Les contrastes passent. Les couleurs de
scène viennent des jetons, jamais d'une valeur posée à la main dans un composant.
