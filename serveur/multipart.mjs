/* ARCEP Gabon — lecture des formulaires avec fichier.

   Un téléversement arrive en « multipart/form-data » : le corps est une suite de parties
   séparées par une frontière, chacune avec ses propres en-têtes. Node ne sait pas le lire
   seul, et le site n'installe aucune dépendance : on le lit donc ici, en une centaine de
   lignes.

   Deux règles tenues :
   — on travaille sur des octets, jamais sur une chaîne. Convertir un JPEG en UTF-8 pour le
     découper le corromprait silencieusement ;
   — la taille est bornée pendant la réception, pas après. Un corps trop long est refusé
     avant d'avoir été mis en mémoire. */

const CRLF = Buffer.from('\r\n');
const CRLFCRLF = Buffer.from('\r\n\r\n');

/* Lit le corps d'une requête, borné. Rend un Buffer. */
export function lireOctets(requete, maximum) {
  return new Promise((resoudre, rejeter) => {
    let total = 0;
    const morceaux = [];
    requete.on('data', (bloc) => {
      total += bloc.length;
      if (total > maximum) {
        /* On cesse de lire, mais on ne coupe pas : l'appelant doit pouvoir répondre 413.
           Détruire la requête ici laisserait le navigateur devant une connexion fermée
           sans explication, et l'agent devant un écran blanc. */
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

/* La frontière est annoncée dans l'en-tête de type. */
export function frontiere(typeContenu) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(typeContenu || '');
  if (!m) return null;
  return (m[1] || m[2]).trim();
}

/* Découpe un corps multipart.
   Rend { champs, fichiers } : les champs texte d'un côté, les parties portant un nom de
   fichier de l'autre, avec leurs octets bruts. */
export function decouper(corps, limite) {
  const separateur = Buffer.from('--' + limite);
  const champs = Object.create(null);
  const fichiers = [];

  let position = corps.indexOf(separateur);
  if (position === -1) return { champs, fichiers };

  while (position !== -1) {
    let debut = position + separateur.length;

    /* « --frontière-- » marque la fin du corps. */
    if (corps[debut] === 0x2d && corps[debut + 1] === 0x2d) break;

    /* On saute le retour à la ligne qui suit la frontière. */
    if (corps[debut] === 0x0d && corps[debut + 1] === 0x0a) debut += 2;

    const finEntetes = corps.indexOf(CRLFCRLF, debut);
    if (finEntetes === -1) break;

    const entetes = corps.subarray(debut, finEntetes).toString('utf8');
    const suivant = corps.indexOf(separateur, finEntetes);
    if (suivant === -1) break;

    /* Le contenu s'arrête deux octets avant la frontière suivante : le CRLF qui la précède
       appartient au séparateur, pas au fichier. */
    let finContenu = suivant;
    if (corps.subarray(finContenu - 2, finContenu).equals(CRLF)) finContenu -= 2;
    const contenu = corps.subarray(finEntetes + 4, finContenu);

    const disposition = /content-disposition:([^\r\n]*)/i.exec(entetes)?.[1] || '';
    const nom = valeurParametre(disposition, 'name');
    const nomFichier = valeurParametre(disposition, 'filename');
    const type = /content-type:\s*([^\r\n;]+)/i.exec(entetes)?.[1].trim() || '';

    if (nom) {
      if (nomFichier !== null) {
        /* Un champ fichier laissé vide arrive avec un nom vide et zéro octet : on l'ignore,
           il ne doit pas effacer le visuel existant. */
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

/* Extrait un paramètre d'un en-tête Content-Disposition, guillemets compris.
   Rend null si le paramètre est absent, '' s'il est présent mais vide — la distinction
   compte pour « filename ». */
function valeurParametre(entete, cle) {
  const guillemets = new RegExp(cle + '="([^"]*)"', 'i').exec(entete);
  if (guillemets) return guillemets[1];
  const nu = new RegExp(cle + '=([^;]*)', 'i').exec(entete);
  return nu ? nu[1].trim() : null;
}
