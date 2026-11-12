// Stockage : un document JSON, écriture atomique et sérialisée, copie horodatée avant chaque écriture (30 jours).
import { readFile, writeFile, rename, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const DOSSIER = join(RACINE, 'donnees');
const FICHIER = join(DOSSIER, 'arcep.json');
const HISTORIQUE = join(DOSSIER, 'historique');
const RETENTION = 30 * 24 * 3600 * 1000;   // trente jours

let cache = null;
let empreinte = 0;
let file = Promise.resolve();

// File d'écriture : chaque tâche attend la précédente.
const enFile = (tache) => {
  const suite = file.then(tache, tache);
  file = suite.then(() => undefined, () => undefined);
  return suite;
};

export const chemin = { RACINE, DOSSIER, FICHIER, HISTORIQUE };

// Lecture
export async function lire() {
  const info = await stat(FICHIER);
  if (cache && info.mtimeMs === empreinte) return cache;
  const brut = await readFile(FICHIER, 'utf8');
  cache = JSON.parse(brut);
  empreinte = info.mtimeMs;
  return cache;
}

// Copie profonde : le cache ne doit pas être modifié par un appelant.
export async function lireCopie() {
  return structuredClone(await lire());
}

// Écriture
export async function ecrire(donnees, motif = 'modification') {
  return enFile(async () => {
    await mkdir(HISTORIQUE, { recursive: true });

    // copie de l'état précédent avant de le remplacer
    if (existsSync(FICHIER)) {
      const avant = await readFile(FICHIER, 'utf8');
      const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
      await writeFile(join(HISTORIQUE, `${horodatage}-${motif}.json`), avant, 'utf8');
    }

    const provisoire = FICHIER + '.' + randomUUID().slice(0, 8) + '.tmp';
    await writeFile(provisoire, JSON.stringify(donnees, null, 1), 'utf8');
    await rename(provisoire, FICHIER);

    cache = donnees;
    empreinte = (await stat(FICHIER)).mtimeMs;
    await purgerHistorique();
    return donnees;
  });
}

// Modification d'une partie du document sous verrou.
export async function modifier(transformation, motif = 'modification') {
  return enFile(async () => {
    const brut = await readFile(FICHIER, 'utf8');
    const donnees = JSON.parse(brut);
    const resultat = await transformation(donnees);

    await mkdir(HISTORIQUE, { recursive: true });
    const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(join(HISTORIQUE, `${horodatage}-${motif}.json`), brut, 'utf8');

    const provisoire = FICHIER + '.' + randomUUID().slice(0, 8) + '.tmp';
    await writeFile(provisoire, JSON.stringify(donnees, null, 1), 'utf8');
    await rename(provisoire, FICHIER);

    cache = donnees;
    empreinte = (await stat(FICHIER)).mtimeMs;
    await purgerHistorique();
    return resultat === undefined ? donnees : resultat;
  });
}

// Historique
async function purgerHistorique() {
  try {
    const limite = Date.now() - RETENTION;
    for (const nom of await readdir(HISTORIQUE)) {
      const f = join(HISTORIQUE, nom);
      const info = await stat(f);
      if (info.mtimeMs < limite) await unlink(f);
    }
  } catch (e) { /* l'historique ne doit pas faire échouer l'écriture */ }
}

export async function historique(limite = 20) {
  try {
    const noms = await readdir(HISTORIQUE);
    return noms.sort().reverse().slice(0, limite);
  } catch (e) { return []; }
}

// Identifiants
export function identifiant(prefixe) {
  return prefixe + '-' + Date.now().toString(36) + randomUUID().slice(0, 4);
}

export { dirname };
