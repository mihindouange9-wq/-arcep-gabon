// Lecture des corps multipart/form-data sans dépendance.
// On travaille sur des octets (jamais de conversion en chaîne) et la taille est bornée pendant la réception.

const CRLF = Buffer.from('\r\n');
const CRLFCRLF = Buffer.from('\r\n\r\n');

// Lit le corps borné, rend un Buffer.
export function lireOctets(requete, maximum) {
  return new Promise((resoudre, rejeter) => {
    let total = 0;
    const morceaux = [];
    requete.on('data', (bloc) => {
      total += bloc.length;
      if (total > maximum) {
        // On arrête de lire sans détruire la requête : l'appelant doit pouvoir répondre 413.
        requete.pause();
        rejeter(Object.assign(new Error('corps trop volumineux'), { code: 'TROP_LONG' }));
        return;
      }
      morceaux.push(bloc);
    });
    requete.on('end', () => resoudre(Buffer.concat(morceaux)));
    requete.on('error', rejeter);
  });
}

// Frontière annoncée dans le Content-Type.
export function frontiere(typeContenu) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(typeContenu || '');
  if (!m) return null;
  return (m[1] || m[2]).trim();
}

// Rend { champs, fichiers } ; les fichiers gardent leurs octets bruts.
export function decouper(corps, limite) {
  const separateur = Buffer.from('--' + limite);
  const champs = Object.create(null);
  const fichiers = [];

  let position = corps.indexOf(separateur);
  if (position === -1) return { champs, fichiers };

  while (position !== -1) {
    let debut = position + separateur.length;

    // --frontiere-- : fin du corps.
    if (corps[debut] === 0x2d && corps[debut + 1] === 0x2d) break;

    // CRLF après la frontière.
    if (corps[debut] === 0x0d && corps[debut + 1] === 0x0a) debut += 2;

    const finEntetes = corps.indexOf(CRLFCRLF, debut);
    if (finEntetes === -1) break;

    const entetes = corps.subarray(debut, finEntetes).toString('utf8');
    const suivant = corps.indexOf(separateur, finEntetes);
    if (suivant === -1) break;

    // Le CRLF qui précède la frontière suivante appartient au séparateur, pas au contenu.
    let finContenu = suivant;
    if (corps.subarray(finContenu - 2, finContenu).equals(CRLF)) finContenu -= 2;
    const contenu = corps.subarray(finEntetes + 4, finContenu);

    const disposition = /content-disposition:([^\r\n]*)/i.exec(entetes)?.[1] || '';
    const nom = valeurParametre(disposition, 'name');
    const nomFichier = valeurParametre(disposition, 'filename');
    const type = /content-type:\s*([^\r\n;]+)/i.exec(entetes)?.[1].trim() || '';

    if (nom) {
      if (nomFichier !== null) {
        // Champ fichier vide : nom vide et zéro octet, à ignorer.
        if (nomFichier !== '' && contenu.length > 0) {
          fichiers.push({ champ: nom, nom: nomFichier, type, octets: contenu });
        }
      } else {
        champs[nom] = contenu.toString('utf8');
      }
    }

    position = suivant;
  }

  return { champs, fichiers };
}

// Paramètre d'un Content-Disposition : null si absent, '' si présent mais vide (la différence compte pour filename).
function valeurParametre(entete, cle) {
  const guillemets = new RegExp(cle + '="([^"]*)"', 'i').exec(entete);
  if (guillemets) return guillemets[1];
  const nu = new RegExp(cle + '=([^;]*)', 'i').exec(entete);
  return nu ? nu[1].trim() : null;
}
