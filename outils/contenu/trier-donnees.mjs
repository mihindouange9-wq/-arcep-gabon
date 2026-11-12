// Ordonne les tableaux de bord (du plus récent au plus ancien, période trimestrielle déduite du titre)
// et les textes réglementaires (par catégorie puis par année). node outils/contenu/trier-donnees.mjs
import { lireDonnees, ecrireDonnees } from './donnees.mjs';

const data = lireDonnees();

const lire = (titre) => {
  const m = titre.match(/(\d)\s*(?:er|eme|ème|e)?\s+trimestre\s+((?:19|20)\d{2})/i);
  return m ? { trimestre: +m[1], annee: +m[2] } : null;
};

let sans = 0;
for (const marche of data.observatoire) {
  for (const p of marche.publications) {
    const d = lire(p.titre);
    if (d) { p.trimestre = 'T' + d.trimestre; p.annee = String(d.annee); p.rang = d.annee * 10 + d.trimestre; }
    else { p.trimestre = 'PDF'; p.annee = ''; p.rang = 0; sans++; }
  }
  marche.publications.sort((a, b) => b.rang - a.rang);
  marche.publications.forEach((p) => delete p.rang);
}
ecrireDonnees(data);
console.log('tableaux ordonnés · sans période :', sans);

// réglementation : par catégorie, puis du plus récent au plus ancien
const ordre = data.categories.map((c) => c.cle);
data.documents.sort((a, b) => {
  const d = ordre.indexOf(a.categorie) - ordre.indexOf(b.categorie);
  return d !== 0 ? d : (parseInt(b.annee || '0', 10) - parseInt(a.annee || '0', 10));
});
ecrireDonnees(data);
console.log('bibliothèque ordonnée par catégorie puis par année');
