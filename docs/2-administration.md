# Administration

L'espace d'administration vit à `/admin`. Il est rendu entièrement par le serveur et
fonctionne **sans JavaScript** : ce sont des formulaires ordinaires. Le script `admin.js`
n'ajoute qu'une confirmation avant suppression, l'aperçu d'un visuel choisi et le compte
des caractères.

## Le premier compte

Tant que `donnees/comptes.json` n'existe pas, `/admin` affiche *Créer le premier compte*.
Ce compte est administrateur. Mot de passe : douze caractères au minimum. Il n'existe
**aucun compte livré par défaut**.

## Les rôles

| Rôle | Accès |
|---|---|
| Administrateur | tout : contenus, catégories, listes, utilisateurs, réglages, restauration |
| Rédacteur | les contenus : pages, actualités, réglementation, observatoire, FAQ, chiffres, médiathèque |

Il reste toujours au moins un administrateur. Un administrateur crée les comptes, change
les rôles et réinitialise les mots de passe ; chacun change le sien dans « Mon mot de
passe ».

## Ce qui se pilote

| Écran | Ce qu'on y fait |
|---|---|
| **Tableau de bord** | compteurs, brouillons et publications programmées à suivre, versions conservées et restauration |
| **Pages** | les titres et textes d'habillage de chaque page ; un champ vide revient au texte de départ |
| **Actualités** | créer, modifier, supprimer ; visuel téléversé ou choisi ; chapeau, corps, rubrique ; **brouillon**, **publication**, **programmation** à une date ; **aperçu** d'un brouillon |
| **Réglementation** | les textes : intitulé, description, catégorie, année, date, PDF téléversé ou lien |
| **Observatoire** | les tableaux de bord : titre, marché, année, trimestre, PDF ou lien |
| **FAQ** | questions, réponses, thème, ordre |
| **Chiffres clés** | indicateurs : libellé, affichage, valeur, décimales, unité, période, ordre ; source commune |
| **Médiathèque** | images et PDF ; un fichier employé ne peut pas être supprimé, l'écran dit par quoi |
| **Catégories** | les types de textes réglementaires ; une catégorie employée ne peut pas être supprimée |
| **Listes consommateurs** | garanties et démarches de l'espace consommateurs |
| **Utilisateurs** | comptes, rôles, réinitialisation |
| **Réglages et SEO** | nom et description du site, adresse publique, indexation, image de partage, coordonnées affichées, réseaux officiels, mention du pied |

## La publication des actualités

Une actualité est **publiée** ou **brouillon**. Une actualité publiée avec une date
« publier à partir du » future reste invisible jusqu'à ce jour : c'est la programmation.
Le site, l'interface de données, le plan du site et les pages d'article n'exposent que les
actualités publiées dont la date est passée. L'aperçu, réservé aux comptes connectés,
montre l'article tel qu'il paraîtra.

La date de l'actualité est saisie au format ISO ; le site l'affiche en français.

## Les fichiers

Ce qui est accepté : **JPEG, PNG, WebP (cinq mégaoctets)** et **PDF (vingt mégaoctets)**.
Le format est vérifié sur les premiers octets du fichier — un JPEG renommé en `.pdf` est
refusé. Le nom d'origine est réduit à des caractères sûrs et complété par six caractères
aléatoires.

Un fichier employé par une actualité, un texte, un tableau de bord ou l'image de partage
**ne peut pas être supprimé** : il faut d'abord le détacher.

## Les garde-fous

- Chaque écriture exige une session valide **et** un jeton anti-rejeu.
- Les liens doivent commencer par `https://` ou par une barre oblique.
- Après chaque écriture, le serveur répond par une redirection : recharger la page ne
  republie rien.
- Les écrans d'organisation et de configuration répondent 403 à un rédacteur.

## Revenir en arrière

Avant chaque écriture, l'état précédent est copié dans `donnees/historique/`, nommé par
date et par motif. Le tableau de bord liste les douze dernières versions ; un
administrateur en **restaure** une d'un clic, et l'état courant rejoint l'historique.
Les copies sont conservées trente jours.

## Les demandes des usagers

Le formulaire de contact enregistre chaque demande dans `donnees/demandes.jsonl` : date,
nom, courriel, objet, direction destinataire, message, adresse d'origine. **Aucun courriel
n'est envoyé** : l'Autorité branchera son propre relais le moment venu.

## Sauvegarde

`donnees/` (contenus, comptes, historique, demandes), `public/assets/medias/` et
`public/assets/documents/`.
