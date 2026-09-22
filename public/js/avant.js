/* ARCEP Gabon — le seul script bloquant du site.
   Il ne fait qu'une chose : signaler que le JavaScript est disponible, avant le premier
   rendu. Les états de départ des animations sont conditionnés à cette classe, de sorte
   qu'un navigateur sans JavaScript affiche la page entière, immédiatement, sans clignotement. */
document.documentElement.classList.add('js');
