/* ARCEP Gabon — démarrage sur Render.

   Render n'attache qu'un disque persistant par service. Ce script, lancé à la place du
   serveur, relie sur ce disque tout ce que l'administration écrit — le document de
   contenus, les comptes, l'historique, les demandes, les visuels et les PDF téléversés —
   puis démarre le serveur. Au premier démarrage, les contenus livrés sont copiés sur le
   disque ; ensuite, ils y vivent et survivent aux redéploiements.

   ARCEP_DISQUE : le point de montage du disque (défaut /var/data). */
import { existsSync, mkdirSync, cpSync, rmSync, symlinkSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const DISQUE = process.env.ARCEP_DISQUE || '/var/data';

const LIENS = [
  { source: join(RACINE, 'donnees'), cible: join(DISQUE, 'donnees'), copier: true },
  { source: join(RACINE, 'public', 'assets', 'medias'), cible: join(DISQUE, 'medias'), copier: false },
  { source: join(RACINE, 'public', 'assets', 'documents'), cible: join(DISQUE, 'documents'), copier: false },
];

if (existsSync(DISQUE)) {
  for (const { source, cible, copier } of LIENS) {
    if (!existsSync(cible)) {
      mkdirSync(cible, { recursive: true });
      if (copier && existsSync(source)) cpSync(source, cible, { recursive: true });
      console.log(`[render] disque initialisé : ${cible}`);
    }
    let lien = false;
    try { lien = lstatSync(source).isSymbolicLink(); } catch { /* absent */ }
    if (!lien) {
      if (existsSync(source)) rmSync(source, { recursive: true, force: true });
      symlinkSync(cible, source, 'dir');
      console.log(`[render] ${source} → ${cible}`);
    }
  }
} else {
  console.log(`[render] aucun disque sur ${DISQUE} : les écritures ne survivront pas à un redéploiement`);
}

await import('../../serveur/index.mjs');
