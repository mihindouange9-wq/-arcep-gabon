/* ARCEP Gabon — administration.
   Trois conforts, aucun indispensable : une confirmation avant suppression, l'aperçu d'un
   visuel choisi, et le compte des caractères d'un champ borné. */
for (const form of document.querySelectorAll('form[data-confirmer]')) {
  form.addEventListener('submit', (ev) => {
    if (!window.confirm(form.dataset.confirmer)) ev.preventDefault();
  });
}

for (const champ of document.querySelectorAll('input[type="file"][data-apercu]')) {
  const cible = document.getElementById(champ.dataset.apercu);
  if (!cible) continue;
  champ.addEventListener('change', () => {
    const f = champ.files && champ.files[0];
    if (!f || !f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f);
    cible.innerHTML = '';
    const img = new Image();
    img.src = url;
    img.alt = '';
    img.onload = () => URL.revokeObjectURL(url);
    cible.append(img);
  });
}

for (const zone of document.querySelectorAll('[maxlength][data-compte]')) {
  const sortie = document.getElementById(zone.dataset.compte);
  if (!sortie) continue;
  const maj = () => { sortie.textContent = `${zone.value.length} / ${zone.maxLength}`; };
  zone.addEventListener('input', maj);
  maj();
}

/* La barre latérale se replie sur petit écran. */
const bouton = document.querySelector('[data-lateral]');
const lateral = document.querySelector('.lateral');
if (bouton && lateral) {
  bouton.addEventListener('click', () => {
    const ouvert = lateral.classList.toggle('lateral--ouvert');
    bouton.setAttribute('aria-expanded', String(ouvert));
  });
}
