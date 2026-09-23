/* ARCEP Gabon — le lecteur de documents.
   Un PDF du site s'ouvre dans une fenêtre modale, sans quitter la page : le document est
   affiché par le lecteur du navigateur dans un cadre, avec, à portée de main, le
   téléchargement et l'ouverture dans un onglet pour les navigateurs qui n'affichent pas
   les PDF intégrés. Sans script, le lien ouvre le fichier comme d'habitude. */
import { QS, gsap, pret, reduit, bloquer } from './socle.mjs';

export function demarrerDocuments() {
  const liens = Array.from(document.querySelectorAll('a[href$=".pdf"]:not([download])'))
    .filter((a) => new URL(a.href, window.location.href).origin === window.location.origin);
  if (!liens.length || typeof HTMLDialogElement !== 'function') return;

  const dialogue = document.createElement('dialog');
  dialogue.className = 'dialogue dialogue--document';
  dialogue.setAttribute('aria-label', 'Document');
  dialogue.innerHTML = `
    <div class="lecteur">
      <div class="lecteur-tete">
        <p class="lecteur-titre" data-titre></p>
        <div class="lecteur-actions">
          <a class="bouton bouton--petit bouton--contour" data-telecharger download>Télécharger</a>
          <a class="bouton bouton--petit bouton--contour" data-onglet target="_blank" rel="noopener">Ouvrir dans un onglet</a>
          <button class="lecteur-fermer" type="button" data-fermer aria-label="Fermer"><svg class="icone" aria-hidden="true"><use href="#i-fermer"/></svg></button>
        </div>
      </div>
      <iframe class="lecteur-cadre" title="Document" data-cadre></iframe>
    </div>`;
  document.body.append(dialogue);
  const cadre = QS('[data-cadre]', dialogue);
  const titre = QS('[data-titre]', dialogue);
  const telecharger = QS('[data-telecharger]', dialogue);
  const onglet = QS('[data-onglet]', dialogue);
  let dernier = null;

  const fermer = () => {
    const fin = () => { dialogue.close(); cadre.removeAttribute('src'); bloquer(false); dernier?.focus({ preventScroll: true }); };
    if (pret && !reduit()) gsap.to(dialogue, { opacity: 0, scale: .98, duration: .22, ease: 'power2.in', onComplete: fin });
    else fin();
  };
  const ouvrir = (a) => {
    dernier = a;
    const adresse = a.getAttribute('href');
    titre.textContent = a.getAttribute('aria-label') || a.dataset.titre || a.closest('li, article, .couverture-case')?.querySelector('.texte-titre, .publication-titre')?.textContent?.trim() || 'Document';
    telecharger.href = adresse;
    onglet.href = adresse;
    cadre.src = adresse + '#view=FitH';
    dialogue.showModal();
    bloquer(true);
    if (pret && !reduit()) gsap.fromTo(dialogue, { opacity: 0, scale: .97, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: .45, ease: 'expo.out' });
    QS('[data-fermer]', dialogue).focus();
  };

  for (const a of liens) {
    a.addEventListener('click', (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      ouvrir(a);
    });
  }
  dialogue.addEventListener('cancel', (ev) => { ev.preventDefault(); fermer(); });
  dialogue.addEventListener('click', (ev) => { if (ev.target === dialogue) fermer(); });
  QS('[data-fermer]', dialogue).addEventListener('click', fermer);
}
