# Audit du projet ARCEP — 22 septembre 2026

Audit de la version « instrument » (livrée le 20 septembre 2026, archivée dans
`geek/archives/arcep-instrument-2026-09-22.zip`) avant la refonte premium.

## Vue d'ensemble

| | |
|---|---|
| Stack | Node 22, bibliothèque standard seule, **aucune dépendance npm**, aucun bundler |
| Rendu | Pages rendues côté serveur en gabarits de chaînes (`serveur/vues/`), fonctionnelles sans JavaScript |
| Contenus | Un document JSON (`donnees/arcep.json`, 1 075 lignes) : institution, conseil, président, 4 chiffres clés, 5 missions, 9 catégories, 63 textes, 3 marchés / 36 tableaux de bord, 9 actualités, 5 FAQ, 6 partenaires, 13 directions |
| Écriture | Atomique, sérialisée, historique 30 jours (`serveur/base.mjs`) |
| Administration | `/admin`, formulaires classiques, scrypt + sessions + jeton anti-rejeu, 5 écrans |
| Interface de données | `/api`, lecture seule, 6 routes |
| Démarrage | `node serveur/index.mjs` → port 4310 |
| Build | Aucun. Déploiement : un dossier copié et un hébergeur Node |
| Polices | Manrope, Source Serif 4, IBM Plex Mono auto-hébergées (211 Ko), outil `outils/contenu/polices.mjs` |
| Contrôle | `outils/controle/verif.mjs` (Chrome headless par CDP : console, débordement 360→1920, révélations, contraste WCAG) |
| Gestion de versions | Aucun dépôt Git ; archives zip dans `geek/archives/` |

### Ce qui est réutilisable tel quel

- **Tout le serveur** : routage, service statique enfermé dans `public/`, en-têtes de sécurité,
  CSP refermée sur `self`, stockage atomique, authentification, multipart maison, médiathèque
  avec reconnaissance par signature. Code propre, commenté, sans dépendance. À conserver et à
  étendre, jamais à remplacer.
- **La chaîne de contenus** (`outils/contenu/`) et les **outils de contrôle** (`outils/controle/`).
- **Les données** : rien n'est inventé, tout vient d'arcep.ga. Deux réponses de FAQ sont
  polluées par l'aspiration (texte de pied de page collé, phrase tronquée) et doivent être
  nettoyées, pas réécrites.
- **Les assets** : logo (couleur, blanc, noir, vert), icône, vidéo du logo (webm 762 Ko / mp4
  4,7 Mo), 9 visuels d'actualité (799 à 1400 px, 85 à 178 Ko).
- **La palette mesurée sur le logo** (`charte/palette-logo.json`) : verts #175b31 #459447,
  bleus #24798e #235272 #182e55, or #e2b336, encre #1a1819, perle #c7dbda.

### Ce qui doit être refait

- La totalité du **front visuel** (systeme.css, site.css, site.js, vues des pages) : le parti
  pris « appareil de mesure » est cohérent mais austère, monochrome bleu de nuit, sans
  profondeur ni écosystème chromatique, sans storytelling. Il ne correspond pas à la commande.
- L'**administration** : fonctionnelle mais limitée à 5 écrans ; pas de pages éditables, pas
  d'observatoire ni de FAQ administrables, pas de PDF, pas de brouillon ni de programmation,
  un seul compte sans rôle.

---

## UI

| Point | Constat | Verdict |
|---|---|---|
| Hiérarchie | Titres Manrope 800 très gros, chapos serif, repères mono : lisible mais tout se ressemble d'une page à l'autre (même en-tête, même liste) | À refaire |
| Couleurs | Fond `#0d1626` partout (règle, header, hero, en-têtes, pied, sections sombres) ; les six « canaux » ne colorent que des filets et des codes. Aucun dégradé, aucune lumière | À refaire : écosystème vert / bleu / jaune |
| Typographie | Manrope est générique (présent sur des milliers de sites) ; Source Serif 4 et IBM Plex Mono sont bien choisis | Remplacer Manrope par une linéale à caractère ; garder serif + mono |
| Espacements | Rythme correct (`--section` 4–7,5 rem) mais uniforme | À enrichir |
| Composants | Lignes, fiches, rangs, cartes : tous construits sur le même filet de 1 px. Pas de bouton secondaire, pas de badge, pas de table, pas de modale, pas de tooltip | Design system complet à écrire |
| Cohérence | Excellente, mais au prix de la monotonie | — |

## UX

| Point | Constat | Verdict |
|---|---|---|
| Navigation | 6 liens desktop + panneau plein écran mobile. Pas de « Contact » en navigation (fusionné dans Consommateurs) | Ajouter Contact, menu immersif desktop |
| Parcours | L'accueil est une liste de six rubriques : aucun récit, aucune mise en avant des missions, des chiffres ou de l'actualité au premier écran | Scroll storytelling |
| Accessibilité | Bon socle : lien d'évitement, focus visible, ARIA sur le panneau, contraste vérifié 4,5:1, `prefers-reduced-motion`, site sans JS | Conserver, étendre au menu, aux modales, aux accordéons |
| Responsive | Vérifié sans débordement de 360 à 1920. Le mobile est un desktop empilé | Repenser les compositions mobiles |
| Recherche | Réglementation seulement (titre + année). Rien sur l'observatoire, les actualités, la FAQ | Généraliser |
| Découverte | Les actualités renvoient vers arcep.ga (pas de page article) ; les missions ne s'ouvrent pas ; l'observatoire est une liste de 36 liens PDF | Pages article, missions interactives, observatoire filtrable |

## Technique

| Point | Constat | Verdict |
|---|---|---|
| Architecture | Un processus, modules ES clairs, responsabilités séparées | Conserver |
| Performance | HTML ~40 Ko par page, CSS 30 Ko, JS 9 Ko, polices 211 Ko, aucune requête tierce. Excellent point de départ | Tenir ce niveau malgré GSAP (~120 Ko) : chargement différé, `defer`, cache immuable |
| Dépendances | Aucune. Bibliothèques de mouvement à auto-héberger dans `public/js/vendor/` (GSAP 3.13 est libre de droits, plugins compris) | — |
| Maintenabilité | Gabarits de chaînes lisibles ; `pages.mjs` (472 lignes) et `site.js` (278) restent petits | Découper `site.js` en modules |
| Sécurité | CSP `self`, `nosniff`, `frame-ancestors 'none'`, scrypt, CSRF, limites de taille pendant la réception, signatures de fichiers | Conserver. Ouvrir `frame-ancestors 'self'` uniquement pour l'écran de l'iPhone |
| SEO | `noindex` volontaire (proposition non validée), pas d'Open Graph, pas de sitemap, pas de robots.txt, pas de données structurées | À construire, `noindex` piloté par un réglage |
| Cache | Médias immuables un mois, CSS/JS `no-cache` | Versionner les feuilles et scripts par empreinte |

## Motion

| Point | Constat | Verdict |
|---|---|---|
| Existant | Onde SVG dessinée puis dérivante, lames de transition entre pages, révélations mot à mot, compteurs 5,5 s, règle graduée, filets qui se tirent | Idées justes, exécution minimale |
| Qualité | Une seule famille d'easing, durées longues, tout en CSS + IntersectionObserver | Passer à GSAP + ScrollTrigger + Lenis pour le scrub, le pin et la synchronisation |
| Fluidité | Aucun scroll lissé, aucune parallaxe, aucune transition chromatique | À construire |
| Cohérence | Bonne | Hiérarchie micro / méso / macro à formaliser |

## Administration

| Écran | Existant | Manque |
|---|---|---|
| Tableau de bord | Compteurs + versions | Activité, brouillons, liens rapides |
| Actualités | Créer / modifier / supprimer, visuel, chapeau | Corps d'article, rubrique, brouillon / publication / programmation, page article publique |
| Documents | Créer / modifier / supprimer, catégorie, année, lien | Description, date, PDF téléversé, catégories administrables |
| Chiffres clés | 4 relevés fixes | Ajouter / retirer, période, indicateur |
| Visuels | Images JPEG / PNG / WebP | PDF, vidéos |
| Observatoire | Lecture seule | Créer / modifier / supprimer un tableau de bord, marchés |
| FAQ | Absente | Questions, réponses, catégories |
| Pages | Absentes | Titres et textes des pages |
| Utilisateurs | Un compte, sans rôle | Comptes, rôles, changement de mot de passe |
| SEO / Paramètres | Absents | Titre, description, image de partage, indexation, coordonnées, réseaux |

## Traces à retirer

`grep` sur « claude, chatgpt, openai, generated, cursor, lovable, IA, AI » : aucune occurrence
dans le code livré. Seul `outils/controle/verif.mjs` écrit son profil Chrome sous
`AppData/Local/Temp/claude/` : chemin à neutraliser. Le pied de page cite « Méthode Aura »,
l'agence auteure : c'est une signature d'agence, pas une trace d'outil, elle est conservée.

## Décision d'architecture

**La stack est conservée.** Un serveur Node sans dépendance qui rend des pages complètes,
avec une administration en formulaires et un JSON comme base, atteint le résultat demandé :
ce sont le front, le mouvement et l'administration qu'il faut transformer, pas la
fondation. Migrer vers Next.js ou un CMS headless ajouterait une chaîne de build et une
dépendance d'hébergement sans rien apporter au visiteur.

Ce qui change :

1. `public/js/vendor/` accueille GSAP, ScrollTrigger, SplitText et Lenis, servis par le site
   lui-même (la CSP reste `script-src 'self'`).
2. `public/js/` est découpé en modules ES : socle, curseur, menu, hero, scènes chromatiques,
   révélations, chiffres, iPhone, bibliothèques, FAQ.
3. Le design system vit dans `public/css/systeme.css` (jetons) et `public/css/site.css`
   (pages) ; l'administration a sa feuille.
4. Le document JSON gagne des sections `pages`, `reglages`, `faq` enrichie, `observatoire`
   administrable, statuts de publication et rôles de comptes. Les contenus existants ne
   sont pas modifiés, seulement nettoyés là où l'aspiration a laissé des scories.
5. Les scripts et feuilles sont servis sous un nom versionné par empreinte pour un cache long.

Voir [4-direction-artistique.md](4-direction-artistique.md) pour la palette, la typographie
et le système de mouvement.
