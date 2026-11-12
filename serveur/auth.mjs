// Authentification de l'administration : scrypt, sessions en mémoire, jeton CSRF, limitation des tentatives, rôles.
// Sessions en mémoire : un redémarrage déconnecte tous les comptes.
import { randomBytes, scrypt as scryptRappel, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { chemin } from './base.mjs';

const scrypt = promisify(scryptRappel);
const COMPTES = join(chemin.DOSSIER, 'comptes.json');

export const REGLAGES = {
  dureeSession: 8 * 3600 * 1000,     // huit heures
  tentativesMax: 5,
  fenetreTentatives: 15 * 60 * 1000, // quinze minutes
  cookie: 'arcep_session',
  motDePasseMin: 12,
};

export const ROLES = ['administrateur', 'redacteur'];

// Comptes
async function chargerComptes() {
  if (!existsSync(COMPTES)) return [];
  const comptes = JSON.parse(await readFile(COMPTES, 'utf8'));
  // Comptes antérieurs aux rôles : administrateurs.
  for (const c of comptes) if (!ROLES.includes(c.role)) c.role = 'administrateur';
  return comptes;
}

async function enregistrerComptes(comptes) {
  await mkdir(chemin.DOSSIER, { recursive: true });
  const provisoire = COMPTES + '.' + randomBytes(4).toString('hex') + '.tmp';
  await writeFile(provisoire, JSON.stringify(comptes, null, 1), 'utf8');
  await rename(provisoire, COMPTES);
}

async function deriver(motDePasse, sel) {
  return (await scrypt(motDePasse, sel, 64, { N: 16384, r: 8, p: 1 }));
}

const identifiantValide = (id) => /^[a-z0-9][a-z0-9._-]{2,59}$/i.test(id);

export async function creerCompte(identifiant, motDePasse, nom = identifiant, role = 'administrateur') {
  if (!identifiantValide(identifiant)) throw new Error('L’identifiant doit comporter de trois à soixante caractères : lettres, chiffres, point, tiret.');
  if (motDePasse.length < REGLAGES.motDePasseMin) throw new Error(`Le mot de passe doit faire au moins ${REGLAGES.motDePasseMin} caractères.`);
  if (!ROLES.includes(role)) throw new Error('Rôle inconnu.');
  const comptes = await chargerComptes();
  if (comptes.some((c) => c.identifiant.toLowerCase() === identifiant.toLowerCase())) throw new Error('Cet identifiant existe déjà.');
  const sel = randomBytes(16).toString('hex');
  const empreinte = (await deriver(motDePasse, sel)).toString('hex');
  comptes.push({ identifiant, nom, role, sel, empreinte, cree: new Date().toISOString() });
  await enregistrerComptes(comptes);
  return { identifiant, nom, role };
}

export async function listerComptes() {
  return (await chargerComptes()).map(({ identifiant, nom, role, cree }) => ({ identifiant, nom, role, cree }));
}

export async function supprimerCompte(identifiant) {
  const comptes = await chargerComptes();
  const restants = comptes.filter((c) => c.identifiant !== identifiant);
  if (restants.length === comptes.length) throw new Error('Compte introuvable.');
  if (!restants.some((c) => c.role === 'administrateur')) throw new Error('Il doit rester au moins un administrateur.');
  await enregistrerComptes(restants);
}

export async function changerRole(identifiant, role) {
  if (!ROLES.includes(role)) throw new Error('Rôle inconnu.');
  const comptes = await chargerComptes();
  const compte = comptes.find((c) => c.identifiant === identifiant);
  if (!compte) throw new Error('Compte introuvable.');
  compte.role = role;
  if (!comptes.some((c) => c.role === 'administrateur')) throw new Error('Il doit rester au moins un administrateur.');
  await enregistrerComptes(comptes);
}

export async function changerMotDePasse(identifiant, actuel, nouveau) {
  if (nouveau.length < REGLAGES.motDePasseMin) throw new Error(`Le mot de passe doit faire au moins ${REGLAGES.motDePasseMin} caractères.`);
  const comptes = await chargerComptes();
  const compte = comptes.find((c) => c.identifiant === identifiant);
  if (!compte) throw new Error('Compte introuvable.');
  const candidat = await deriver(actuel, compte.sel);
  const attendu = Buffer.from(compte.empreinte, 'hex');
  if (candidat.length !== attendu.length || !timingSafeEqual(candidat, attendu)) throw new Error('Le mot de passe actuel est incorrect.');
  compte.sel = randomBytes(16).toString('hex');
  compte.empreinte = (await deriver(nouveau, compte.sel)).toString('hex');
  await enregistrerComptes(comptes);
}

// Réinitialisation par un administrateur, sans l'ancien mot de passe.
export async function reinitialiserMotDePasse(identifiant, nouveau) {
  if (nouveau.length < REGLAGES.motDePasseMin) throw new Error(`Le mot de passe doit faire au moins ${REGLAGES.motDePasseMin} caractères.`);
  const comptes = await chargerComptes();
  const compte = comptes.find((c) => c.identifiant === identifiant);
  if (!compte) throw new Error('Compte introuvable.');
  compte.sel = randomBytes(16).toString('hex');
  compte.empreinte = (await deriver(nouveau, compte.sel)).toString('hex');
  await enregistrerComptes(comptes);
}

export async function aucunCompte() {
  return (await chargerComptes()).length === 0;
}

// Tentatives
const tentatives = new Map();

function tropDeTentatives(cle) {
  const t = tentatives.get(cle);
  if (!t) return false;
  if (Date.now() - t.depuis > REGLAGES.fenetreTentatives) { tentatives.delete(cle); return false; }
  return t.nombre >= REGLAGES.tentativesMax;
}

function noterEchec(cle) {
  const t = tentatives.get(cle);
  if (!t || Date.now() - t.depuis > REGLAGES.fenetreTentatives) {
    tentatives.set(cle, { nombre: 1, depuis: Date.now() });
  } else {
    t.nombre++;
  }
}

// Vérification
export async function verifier(identifiant, motDePasse, adresse = '') {
  const cle = identifiant + '|' + adresse;
  if (tropDeTentatives(cle)) {
    return { ok: false, raison: 'Trop de tentatives. Réessayez dans un quart d’heure.' };
  }
  const comptes = await chargerComptes();
  const compte = comptes.find((c) => c.identifiant === identifiant);

  // Dériver même sans compte trouvé : temps de réponse constant.
  const sel = compte ? compte.sel : randomBytes(16).toString('hex');
  const candidat = await deriver(motDePasse, sel);
  const attendu = compte ? Buffer.from(compte.empreinte, 'hex') : randomBytes(64);
  const juste = candidat.length === attendu.length && timingSafeEqual(candidat, attendu);

  if (!compte || !juste) { noterEchec(cle); return { ok: false, raison: 'Identifiant ou mot de passe incorrect.' }; }
  tentatives.delete(cle);
  return { ok: true, compte: { identifiant: compte.identifiant, nom: compte.nom, role: compte.role } };
}

// Sessions
const sessions = new Map();

export function ouvrirSession(compte) {
  const jeton = randomBytes(32).toString('base64url');
  sessions.set(jeton, {
    compte,
    csrf: randomBytes(24).toString('base64url'),
    expire: Date.now() + REGLAGES.dureeSession,
  });
  return jeton;
}

export function session(jeton) {
  if (!jeton) return null;
  const s = sessions.get(jeton);
  if (!s) return null;
  if (Date.now() > s.expire) { sessions.delete(jeton); return null; }
  s.expire = Date.now() + REGLAGES.dureeSession;   // expiration glissante
  return s;
}

export function fermerSession(jeton) { sessions.delete(jeton); }

// Changement de rôle ou suppression : sessions du compte closes.
export function fermerSessionsDe(identifiant) {
  for (const [jeton, s] of sessions) if (s.compte.identifiant === identifiant) sessions.delete(jeton);
}

// Purge des sessions expirées et des tentatives anciennes.
setInterval(() => {
  const maintenant = Date.now();
  for (const [jeton, s] of sessions) if (maintenant > s.expire) sessions.delete(jeton);
  for (const [cle, t] of tentatives) if (maintenant - t.depuis > REGLAGES.fenetreTentatives) tentatives.delete(cle);
}, 15 * 60 * 1000).unref();

// Cookies
export function lireCookies(entete = '') {
  const sortie = {};
  for (const part of entete.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    sortie[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return sortie;
}

// Derrière HTTPS : préfixe __Host- (Secure obligatoire, sans Domain, Path=/).
export const nomCookie = (securise) => (securise ? '__Host-' : '') + REGLAGES.cookie;

export function cookieSession(jeton, securise) {
  const parts = [
    `${nomCookie(securise)}=${jeton}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(REGLAGES.dureeSession / 1000)}`,
  ];
  if (securise) parts.push('Secure');
  return parts.join('; ');
}

export function cookieEfface(securise) {
  const parts = [`${nomCookie(securise)}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (securise) parts.push('Secure');
  return parts.join('; ');
}

// Comparaison à temps constant.
export function csrfValide(s, fourni) {
  if (!s || !fourni) return false;
  const a = Buffer.from(String(s.csrf));
  const b = Buffer.from(String(fourni));
  return a.length === b.length && timingSafeEqual(a, b);
}
