/* ARCEP Gabon — accès au document de contenus depuis la chaîne d'extraction.

   Les outils de cette chaîne écrivaient autrefois un fichier JavaScript chargé par le
   navigateur. Le site étant désormais rendu par un serveur, le contenu vit dans un seul
   document JSON, que le serveur et l'administration partagent. Tous les outils passent
   par ici : le chemin n'est écrit qu'une fois.

   Le serveur possède sa propre écriture, atomique et journalisée (serveur/base.mjs). Celle
   d'ici est directe : la chaîne d'extraction se joue hors ligne, serveur arrêté. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
export const FICHIER = join(RACINE, 'donnees', 'arcep.json');
export const ASSETS = join(RACINE, 'public', 'assets');

export const lireDonnees = () => JSON.parse(readFileSync(FICHIER, 'utf8'));

export const ecrireDonnees = (donnees) => {
  writeFileSync(FICHIER, JSON.stringify(donnees, null, 1) + '\n', 'utf8');
};
