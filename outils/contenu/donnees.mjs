// Lecture et écriture directes de donnees/arcep.json pour les outils de la chaîne de contenu (serveur arrêté).
// Le serveur a sa propre écriture, atomique et journalisée, dans serveur/base.mjs.
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
