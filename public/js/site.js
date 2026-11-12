// Point d'entrée : chaque module vérifie lui-même si la page le concerne.
import { demarrerChrome } from './modules/chrome.mjs';
import { demarrerMenu } from './modules/menu.mjs';
import { demarrerCurseur } from './modules/curseur.mjs';
import { demarrerVoile } from './modules/voile.mjs';
import { demarrerHero } from './modules/hero.mjs';
import { demarrerRevelations } from './modules/revelations.mjs';
import { demarrerDonnees } from './modules/donnees.mjs';
import { demarrerMissions } from './modules/missions.mjs';
import { demarrerMots } from './modules/mots.mjs';
import { demarrerEcran } from './modules/ecran.mjs';
import { demarrerFiltrage } from './modules/filtrage.mjs';
import { demarrerDocuments } from './modules/documents.mjs';
import { demarrerPied } from './modules/pied.mjs';

// SplitText mesure les lignes : attendre les polices (1,2 s max).
if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((ok) => setTimeout(ok, 1200))]);

demarrerChrome();
demarrerMenu();
demarrerCurseur();
demarrerVoile();
demarrerHero();
demarrerRevelations();
demarrerDonnees();
demarrerMissions();
demarrerMots();
demarrerEcran();
demarrerFiltrage();
demarrerDocuments();
demarrerPied();
