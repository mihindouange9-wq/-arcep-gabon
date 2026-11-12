// Médiathèque : visuels dans public/assets/medias/, PDF dans public/assets/documents/, visuels importés dans public/assets/actus/.
// Le type est reconnu sur les premiers octets, jamais sur l'extension ni le Content-Type annoncé.
import { readdir, stat, writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const ASSETS = join(RACINE, 'public', 'assets');
const MEDIAS = join(ASSETS, 'medias');
const DOCUMENTS = join(ASSETS, 'documents');
const ACTUS = join(ASSETS, 'actus');

export const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;       // cinq mégaoctets par visuel
export const TAILLE_MAX_DOCUMENT = 20 * 1024 * 1024;   // vingt mégaoctets par document

// Reconnaissance
const SIGNATURES = [
  { ext: '.jpg', type: 'image/jpeg', genre: 'image', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.png', type: 'image/png', genre: 'image', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: '.webp', type: 'image/webp', genre: 'image', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { ext: '.pdf', type: 'application/pdf', genre: 'document', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
];

export function reconnaitre(octets) {
  if (octets.length < 16) return null;
  return SIGNATURES.find((s) => s.test(octets)) || null;
}

// Dimensions
// Dimensions lues dans l'en-tête, à titre indicatif.
export function dimensions(octets) {
  try {
    if (octets[0] === 0xff && octets[1] === 0xd8) return dimensionsJpeg(octets);
    if (octets[1] === 0x50 && octets[2] === 0x4e) {
      return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) };
    }
    if (octets.subarray(8, 12).toString('latin1') === 'WEBP') return dimensionsWebp(octets);
  } catch { /* en-tête illisible : pas un motif de refus */ }
  return null;
}

function dimensionsJpeg(b) {
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marqueur = b[i + 1];
    // Marqueurs SOF (taille), hors SOF4, SOF8 et SOF12.
    if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
      return { hauteur: b.readUInt16BE(i + 5), largeur: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function dimensionsWebp(b) {
  const forme = b.subarray(12, 16).toString('latin1');
  if (forme === 'VP8X') return { largeur: b.readUIntLE(24, 3) + 1, hauteur: b.readUIntLE(27, 3) + 1 };
  if (forme === 'VP8 ') return { largeur: b.readUInt16LE(26) & 0x3fff, hauteur: b.readUInt16LE(28) & 0x3fff };
  if (forme === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { largeur: (bits & 0x3fff) + 1, hauteur: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

// Nommage
// Nom d'origine conservé mais réduit à des caractères sûrs (URL et disque).
function nommer(original) {
  const base = original.replace(/\.[^.]*$/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'fichier';
  return `${base}-${randomUUID().slice(0, 6)}`;
}

// Enregistrement
export async function enregistrer(fichier, { genres = ['image'] } = {}) {
  const signature = reconnaitre(fichier.octets);
  if (!signature || !genres.includes(signature.genre)) {
    const attendu = genres.includes('document') && genres.includes('image') ? 'une image JPEG, PNG ou WebP, ni un PDF'
      : genres.includes('document') ? 'un PDF' : 'une image JPEG, PNG ou WebP';
    return { erreur: `« ${fichier.nom} » n’est pas ${attendu}.` };
  }
  const limite = signature.genre === 'document' ? TAILLE_MAX_DOCUMENT : TAILLE_MAX_IMAGE;
  if (fichier.octets.length > limite) {
    return { erreur: `« ${fichier.nom} » dépasse ${limite / 1048576} mégaoctets.` };
  }
  const dossier = signature.genre === 'document' ? DOCUMENTS : MEDIAS;
  const prefixe = signature.genre === 'document' ? '/assets/documents/' : '/assets/medias/';
  await mkdir(dossier, { recursive: true });
  const nom = nommer(fichier.nom) + signature.ext;
  await writeFile(join(dossier, nom), fichier.octets);
  return { chemin: prefixe + nom, nom, genre: signature.genre, taille: fichier.octets.length, ...(dimensions(fichier.octets) || {}) };
}

// Inventaire
const DOSSIERS = [
  { cle: 'medias', titre: 'Visuels téléversés', genre: 'image', chemin: MEDIAS, prefixe: '/assets/medias/', supprimable: true },
  { cle: 'documents', titre: 'Documents PDF', genre: 'document', chemin: DOCUMENTS, prefixe: '/assets/documents/', supprimable: true },
  { cle: 'actus', titre: 'Visuels repris du site officiel', genre: 'image', chemin: ACTUS, prefixe: '/assets/actus/', supprimable: true },
];

const MOTIF = { image: /\.(jpe?g|png|webp)$/i, document: /\.pdf$/i };

// Tout fichier référencé par un contenu.
function employes(D) {
  const e = new Map();
  const noter = (adresse, quoi) => { if (adresse) e.set(adresse, quoi); };
  for (const a of D.actualites) noter(a.image, `actualité « ${a.titre.slice(0, 40)} »`);
  for (const d of D.documents) noter(d.fichier, `texte « ${d.titre.slice(0, 40)} »`);
  for (const m of D.observatoire) for (const p of m.publications) noter(p.fichier, `tableau de bord « ${p.titre.slice(0, 40)} »`);
  if (D.reglages?.imagePartage) noter(D.reglages.imagePartage, 'image de partage');
  return e;
}

export async function inventaire(D, genre = null) {
  const usages = employes(D);
  const groupes = [];
  for (const dossier of DOSSIERS) {
    if (genre && dossier.genre !== genre) continue;
    if (!existsSync(dossier.chemin)) continue;
    const entrees = [];
    for (const nom of (await readdir(dossier.chemin)).sort()) {
      if (!MOTIF[dossier.genre].test(nom)) continue;
      const info = await stat(join(dossier.chemin, nom));
      const adresse = dossier.prefixe + nom;
      entrees.push({
        nom, adresse, taille: info.size, modifie: info.mtime, genre: dossier.genre,
        employe: usages.get(adresse) || '',
        supprimable: dossier.supprimable && !usages.has(adresse),
      });
    }
    if (entrees.length) groupes.push({ ...dossier, entrees });
  }
  return groupes;
}

// Suppression
// Le fichier doit être dans un dossier déclaré et n'être référencé par aucun contenu.
export async function supprimer(cle, nom, D) {
  const dossier = DOSSIERS.find((d) => d.cle === cle && d.supprimable);
  if (!dossier) return 'Dossier inconnu.';
  if (!/^[A-Za-z0-9._-]+$/.test(nom) || nom.startsWith('.')) return 'Nom de fichier invalide.';
  if (!MOTIF[dossier.genre].test(nom)) return 'Ce type de fichier ne peut pas être supprimé ici.';

  const adresse = dossier.prefixe + nom;
  const usage = employes(D).get(adresse);
  if (usage) return `Ce fichier est employé par ${usage}. Détachez-le avant de le supprimer.`;
  const cible = join(dossier.chemin, nom);
  if (!existsSync(cible)) return 'Fichier introuvable.';
  await unlink(cible);
  return '';
}
