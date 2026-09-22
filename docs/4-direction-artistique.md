# Direction artistique — ARCEP Gabon

## L'idée

L'ARCEP est l'institution qui tient le spectre, les réseaux et les postes d'un pays. Le site
raconte ce mouvement : **du territoire vers le monde**. Chaque grande partie de la page
d'accueil est une atmosphère chromatique, et le défilement fait glisser le visiteur de la
forêt (vert profond) vers le ciel (bleu électrique) puis vers la lumière (or, puis blanc).
Les trois couleurs du logo cessent d'être des aplats : elles deviennent des climats.

Le vocabulaire graphique vient des réseaux : nœuds et liaisons, grilles de coordonnées,
tracés de signal, pulsations. Toujours en fond, toujours retenu. Les visuels sont réels :
l'actualité à la une dans le hero, les données publiées dans les graphiques, le site
mobile filmé dans le téléphone. Le Gabon est présent par ses données, ses textes, ses
visuels officiels et la lumière chaude de la palette.

## Palette

Les six couleurs du logo restent les ancres (`charte/palette-logo.json`). Chaque famille
est étendue en une échelle de sept nuances, mesurées lisibles sur leurs fonds respectifs.

### Verts

| Jeton | Valeur | Usage |
|---|---|---|
| `--vert-foret` | `#0a2a1a` | fond du hero, du pied de page |
| `--vert-profond` | `#0f3d25` | scène 01, transitions |
| `--vert` | `#175b31` | couleur de l'institution, boutons, logo |
| `--vert-emeraude` | `#1e7f4c` | dégradés, accents sur clair |
| `--vert-vif` | `#2fa864` | accents sur sombre |
| `--vert-lumineux` | `#6fd39a` | repères et accents sur sombre |
| `--vert-pale` | `#dff1e6` | fonds clairs teintés |

### Bleus

| Jeton | Valeur | Usage |
|---|---|---|
| `--bleu-nuit` | `#0a1428` | fond des scènes les plus sombres |
| `--bleu-profond` | `#12244a` | scène missions, chiffres |
| `--bleu` | `#182e55` | bleu institutionnel de la charte |
| `--bleu-petrole` | `#24798e` | observatoire, données |
| `--bleu-tech` | `#2b86c4` | dégradés, accents sur clair |
| `--bleu-electrique` | `#3fa9f5` | accents sur sombre |
| `--bleu-pale` | `#dbe9f5` | fonds clairs teintés |

### Jaunes

| Jeton | Valeur | Usage |
|---|---|---|
| `--jaune-profond` | `#86620f` | texte sur clair (6:1 sur blanc) |
| `--jaune-dore` | `#c9982a` | dégradés |
| `--jaune` | `#e2b336` | or du logo, repères, chiffres |
| `--jaune-chaud` | `#ecc457` | accents sur sombre |
| `--jaune-lumineux` | `#f6dc8a` | climat clair de la scène iPhone |
| `--jaune-pale` | `#fbf1cf` | fonds clairs teintés, consommateurs |

### Neutres

| Jeton | Valeur |
|---|---|
| `--blanc` | `#ffffff` |
| `--blanc-casse` | `#f7f6f1` |
| `--gris-chaud` | `#eeeae1` |
| `--gris` | `#5f6b74` (texte secondaire sur clair, 5,4:1) |
| `--graphite` | `#23282e` |
| `--noir-doux` | `#121417` |
| `--encre` | `#16191c` |

### Dégradés nommés

| Jeton | Composition |
|---|---|
| `--degrade-foret` | forêt → émeraude |
| `--degrade-emeraude-bleu` | émeraude → bleu profond |
| `--degrade-bleu-electrique` | bleu profond → bleu tech |
| `--degrade-bleu-or` | bleu → or |
| `--degrade-graphite-bleu` | graphite → bleu profond |

Jamais de violet, jamais de rose. Les dégradés évoluent au défilement (position, opacité,
flou) et servent de coutures entre les scènes.

### Les scènes de l'accueil

| Scène | Atmosphère |
|---|---|
| Hero | vert forêt, lueur émeraude, réseau de nœuds, actualité à la une |
| Identité | vert profond → bleu profond |
| Missions | bleu profond, accents électriques |
| Connectivité (mots) | bleu → électrique |
| Chiffres | graphite → bleu, chiffres or |
| Observatoire | blanc cassé, pétrole |
| Réglementation | bleu → or |
| iPhone | vert profond → émeraude → bleu profond → électrique → or → jaune lumineux → blanc |
| Actualités | blanc |
| Consommateurs | jaune pâle → blanc, 1331 en or |
| Contact | graphite → bleu |
| Pied de page | noir doux / vert forêt |

## Typographie

| Rôle | Famille | Pourquoi |
|---|---|---|
| Éditoriale (titres, chiffres, hero, mots-clés) | **Archivo**, variable, graisse 100–900 et chasse 62–125 | Une grotesque de presse au dessin ferme ; la chasse étendue donne aux grands mots une autorité institutionnelle sans recourir à une fonte à la mode |
| Institutionnelle (navigation, corps, formulaires, données) | **Archivo** en chasse normale, 400–600 | Une seule famille sans-serif : cohérence et poids réduit |
| Prose (paragraphes longs, chapeaux, citations) | **Source Serif 4**, 400 et italique | Héritée de la charte : le serif porte la lecture longue et la voix institutionnelle |
| Mesure (dates, références, unités, tabulaires) | **IBM Plex Mono** 400–500 | Héritée de la charte, réservée aux données, jamais en costume |

Échelle fluide : `--t-0` 0,75 rem … `--t-7` clamp(3 rem, 1,6 rem + 6 vw, 6,4 rem). Interlignage
0,96 à 1,06 sur les titres, 1,6 à 1,68 sur la prose. Crénage négatif plafonné à −0,04 em. Chiffres tabulaires
partout où une colonne s'aligne.

## Mouvement

Trois niveaux, une seule courbe maîtresse `cubic-bezier(.22, 1, .36, 1)` (sortie
exponentielle), plus `power2.inOut` pour les scrubs.

| Niveau | Éléments | Outil |
|---|---|---|
| Micro | survols, boutons, liens, curseur, icônes | CSS transitions 180–320 ms |
| Méso | titres (SplitText, masques), visuels (clip-path), chiffres (compteurs), listes (stagger ≤ 8) | GSAP + ScrollTrigger, entrée dans le champ |
| Macro | séquence du hero, scènes chromatiques, mots-clés, iPhone, pied de page, menu | GSAP timelines et scrub ; deux scènes collantes (mots-clés, iPhone) tenues par `position: sticky` |

Règles : un élément qui n'est pas dans le champ ne calcule rien ; les scrubs suivent le
défilement avec 0,6 s d'inertie ; `prefers-reduced-motion` livre l'état final, sans
parallaxe ni scrub ; sur mobile, ni curseur, ni réseau de nœuds animé, ni parallaxe
profonde, mais les transitions chromatiques et les révélations restent.

Lenis lisse le défilement (durée 1,1, easing exponentiel), ScrollTrigger lui est synchronisé.

## Éléments graphiques

- **Réseau** : nœuds et liaisons dessinés sur canvas 2D dans le hero (≤ 90 nœuds,
  échelle de pixels plafonnée à 1,5, pause hors champ) ; absent sur mobile.
- **Grille de coordonnées** : trame de 1 px à 5–7 % d'opacité, posée par CSS.
- **Tracés de signal** : courbes SVG héritées de l'onde de la charte, dessinées au
  défilement.
- **Lueurs** : dégradés radiaux flous, deux par scène au maximum, animés en position.
- **Photographies** : les visuels officiels des actualités, jamais de banque d'images.

## iPhone 17 Pro Max

Maquette construite en CSS : proportions 78 × 163,4 mm, écran 440 × 956 pt aux angles de
55 pt, châssis aluminium en finition « bleu profond » (une des couleurs réelles du modèle),
Dynamic Island, barre d'état, reflets par dégradés coniques, ombre portée longue et douce.
L'écran joue une **vidéo du site mobile**, filmée en mode `?ecran=1` à 440 × 956 points
(1,5 pixel par point), sans barre de défilement, qui défile lentement de l'accueil au
contact : le vrai responsive, exactement comme sur l'appareil.
Pendant la phase collante, le défilement de la page fait défiler le contenu du téléphone et
enchaîne six pages du site ; le climat de la scène glisse du vert forêt au blanc.
