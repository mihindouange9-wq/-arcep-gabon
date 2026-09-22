/* ARCEP Gabon — schéma des contenus éditables.

   Tout ce qui, dans les pages, n'est pas une donnée reprise du site officiel est un texte
   d'habillage : titre d'une section, phrase d'accroche, libellé. Ces textes sont déclarés
   ici, avec leur valeur de départ, et l'administration en fait des formulaires. Les vues
   lisent la valeur enregistrée, sinon la valeur de départ.

   Rien de ce qui suit n'est une information institutionnelle : ce sont des titres. Les
   faits (statut, textes fondateurs, missions, chiffres, coordonnées) restent dans les
   sections de données du document et viennent d'arcep.ga. */

export const PAGES = {
  accueil: {
    nom: 'Accueil',
    champs: {
      heroTitre: { label: 'Titre principal', type: 'texte', defaut: 'Réguler les communications électroniques et les postes pour connecter le Gabon au monde.' },
      heroTexte: { label: 'Texte sous le titre', type: 'long', defaut: 'Autorité administrative indépendante de la République gabonaise, l’ARCEP est chargée de garantir un environnement concurrentiel, équitable et transparent.' },
      motsCles: { label: 'Mots-clés de la séquence (séparés par une barre verticale)', type: 'texte', defaut: 'Réguler|Connecter|Protéger|Transformer' },
      motsTexte: { label: 'Phrase sous les mots-clés', type: 'long', defaut: 'Quatre verbes pour une même mission : un secteur des communications électroniques et des postes au service des Gabonais.' },
      identiteTitre: { label: 'Titre de la section Identité', type: 'texte', defaut: 'Une autorité indépendante, née de l’ordonnance de 2012' },
      missionsTitre: { label: 'Titre de la section Missions', type: 'texte', defaut: 'Cinq missions confiées par les textes en vigueur' },
      missionsTexte: { label: 'Texte de la section Missions', type: 'long', defaut: 'Avis, contrôle, droit, technique, économie : l’Autorité intervient à chaque étape de la vie du secteur.' },
      chiffresTitre: { label: 'Titre de la section Chiffres', type: 'texte', defaut: 'Le secteur en chiffres' },
      observatoireTitre: { label: 'Titre de la section Observatoire', type: 'texte', defaut: 'L’Observatoire des marchés' },
      observatoireTexte: { label: 'Texte de la section Observatoire', type: 'long', defaut: 'Chaque trimestre, l’Autorité publie les tableaux de bord de l’internet, du fixe et du mobile.' },
      reglementationTitre: { label: 'Titre de la section Réglementation', type: 'texte', defaut: 'La bibliothèque réglementaire' },
      reglementationTexte: { label: 'Texte de la section Réglementation', type: 'long', defaut: 'Lois, ordonnances, décrets, arrêtés, délibérations et décisions : les textes qui encadrent le secteur, consultables et téléchargeables.' },
      ecranTitre: { label: 'Titre de la section iPhone', type: 'texte', defaut: 'La même information, dans votre main' },
      ecranTexte: { label: 'Texte de la section iPhone', type: 'long', defaut: 'Le site de l’Autorité est conçu pour tous les écrans : ce que vous voyez ici est la version mobile, telle qu’elle est servie.' },
      actualitesTitre: { label: 'Titre de la section Actualités', type: 'texte', defaut: 'La vie de l’Autorité' },
      consommateursTitre: { label: 'Titre de la section Consommateurs', type: 'texte', defaut: 'Vos droits, un numéro : le 1331' },
      consommateursTexte: { label: 'Texte de la section Consommateurs', type: 'long', defaut: 'Un manquement d’un opérateur, une question sur la qualité de service, un équipement à vérifier : l’Autorité est votre interlocuteur.' },
      contactTitre: { label: 'Titre de la section Contact', type: 'texte', defaut: 'Écrire à l’Autorité' },
    },
  },
  autorite: {
    nom: 'L’ARCEP',
    champs: {
      heroTitre: { label: 'Titre', type: 'texte', defaut: 'L’Autorité' },
      heroTexte: { label: 'Texte d’introduction', type: 'long', defaut: 'Autorité administrative indépendante, l’ARCEP régule les communications électroniques et les postes de la République gabonaise.' },
      conseilTitre: { label: 'Titre de la section Conseil', type: 'texte', defaut: 'Le Conseil de Régulation' },
      organisationTitre: { label: 'Titre de la section Organisation', type: 'texte', defaut: 'Le Secrétariat Exécutif et ses directions' },
      organisationTexte: { label: 'Texte de la section Organisation', type: 'long', defaut: 'Treize directions, chacune responsable d’un domaine de la régulation.' },
      partenairesTitre: { label: 'Titre de la section Partenaires', type: 'texte', defaut: 'Les organisations avec lesquelles l’Autorité travaille' },
    },
  },
  missions: {
    nom: 'Missions',
    champs: {
      heroTitre: { label: 'Titre', type: 'texte', defaut: 'Missions' },
      heroTexte: { label: 'Texte d’introduction', type: 'long', defaut: 'Avis, contrôle, droit, technique et économie : cinq missions confiées à l’Autorité par les textes en vigueur.' },
    },
  },
  observatoire: {
    nom: 'Observatoire',
    champs: {
      heroTitre: { label: 'Titre', type: 'texte', defaut: 'Observatoire des marchés' },
      heroTexte: { label: 'Texte d’introduction', type: 'long', defaut: 'Les tableaux de bord trimestriels publiés par l’Autorité pour suivre l’évolution de l’internet, du fixe et du mobile.' },
      chiffresTitre: { label: 'Titre de la section Indicateurs', type: 'texte', defaut: 'Les indicateurs du secteur' },
      publicationsTitre: { label: 'Titre de la bibliothèque', type: 'texte', defaut: 'Les tableaux de bord' },
    },
  },
  reglementation: {
    nom: 'Réglementation',
    champs: {
      heroTitre: { label: 'Titre', type: 'texte', defaut: 'Réglementation' },
      heroTexte: { label: 'Texte d’introduction', type: 'long', defaut: 'Les textes qui encadrent le secteur, réunis dans une bibliothèque unique, consultables et téléchargeables.' },
      rechercheAide: { label: 'Texte du champ de recherche', type: 'texte', defaut: 'Rechercher une loi, une décision, un décret…' },
    },
  },
  actualites: {
    nom: 'Actualités',
    champs: {
      heroTitre: { label: 'Titre', type: 'texte', defaut: 'Actualités' },
      heroTexte: { label: 'Texte d’introduction', type: 'long', defaut: 'Les communications de l’Autorité, ses participations aux instances internationales et les informations destinées au public.' },
    },
  },
  consommateurs: {
    nom: 'Consommateurs',
    champs: {
      heroTitre: { label: 'Titre', type: 'texte', defaut: 'Espace consommateurs' },
      heroTexte: { label: 'Texte d’introduction', type: 'long', defaut: 'Vos droits, la qualité des services et un canal direct avec l’Autorité.' },
      numeroTexte: { label: 'Texte à côté du 1331', type: 'long', defaut: 'Numéro court activé par l’ARCEP pour renforcer le dialogue entre les opérateurs et les consommateurs.' },
      droitsTitre: { label: 'Titre de la section Droits', type: 'texte', defaut: 'Ce que l’Autorité garantit' },
      demarchesTitre: { label: 'Titre de la section Démarches', type: 'texte', defaut: 'Vos démarches' },
      faqTitre: { label: 'Titre de la FAQ', type: 'texte', defaut: 'Questions fréquentes' },
    },
  },
  contact: {
    nom: 'Contact',
    champs: {
      heroTitre: { label: 'Titre', type: 'texte', defaut: 'Contact' },
      heroTexte: { label: 'Texte d’introduction', type: 'long', defaut: 'Le siège de l’Autorité reçoit vos demandes et les oriente vers la direction compétente.' },
      formulaireTitre: { label: 'Titre du formulaire', type: 'texte', defaut: 'Adresser une demande écrite' },
      confirmation: { label: 'Message de confirmation', type: 'long', defaut: 'Votre demande a été enregistrée. Le secrétariat de l’Autorité en accuse réception sous quarante-huit heures ouvrées.' },
    },
  },
};

/* Les démarches et garanties de l'espace consommateurs : des listes courtes, issues des
   missions de l'Autorité (mission d'investigation, mission technique), éditables. */
export const LISTES = {
  droits: {
    nom: 'Garanties de l’espace consommateurs',
    defaut: [
      { titre: 'Un traitement équitable', texte: 'L’Autorité veille au traitement équitable des consommateurs et sanctionne les violations constatées auprès des opérateurs.' },
      { titre: 'Des opérateurs qui tiennent leurs engagements', texte: 'Respect des licences, autorisations, agréments et cahiers des charges, contrôlé par l’Autorité.' },
      { titre: 'Un marché sans pratiques anticoncurrentielles', texte: 'Prévention et sanction des pratiques anticoncurrentielles entre opérateurs.' },
      { titre: 'Des équipements homologués', texte: 'Homologation des équipements et contrôle de la qualité des réseaux ouverts au public.' },
    ],
  },
  demarches: {
    nom: 'Démarches de l’espace consommateurs',
    defaut: [
      { titre: 'Signaler un manquement d’un opérateur', texte: 'Composez le 1331 ou adressez une demande écrite à la direction concernée depuis la page Contact.', lien: '/contact' },
      { titre: 'Vérifier qu’un équipement est homologué', texte: 'La liste des équipements homologués est publiée dans la bibliothèque réglementaire.', lien: '/reglementation?categorie=homologations' },
      { titre: 'Comprendre la qualité de service', texte: 'Les indicateurs suivis par l’Autorité sont expliqués dans les questions fréquentes et publiés dans l’Observatoire.', lien: '/observatoire' },
      { titre: 'Consulter les textes qui vous protègent', texte: 'Lois, décrets et décisions sont consultables et téléchargeables.', lien: '/reglementation' },
    ],
  },
};

export const REGLAGES_DEFAUT = {
  titreSite: 'ARCEP Gabon',
  descriptionSite: 'Autorité de Régulation des Communications Électroniques et des Postes de la République gabonaise : missions, réglementation, observatoire des marchés, actualités et espace consommateurs.',
  imagePartage: '/assets/partage.png',
  indexation: false,
  adressePublique: '',
  reseaux: [],
  mentionPied: 'Proposition de refonte · Méthode Aura',
};

export const ROLES = {
  administrateur: 'Administrateur — tous les contenus, les comptes et les réglages',
  redacteur: 'Rédacteur — actualités, documents, observatoire, FAQ, chiffres, médias',
};

/* Lecture d'un texte de page : la valeur enregistrée, sinon la valeur de départ. */
export function texte(D, page, champ) {
  const declare = PAGES[page]?.champs[champ];
  const enregistre = D.pages?.[page]?.[champ];
  if (typeof enregistre === 'string' && enregistre.trim()) return enregistre;
  return declare ? declare.defaut : '';
}

export function liste(D, cle) {
  const enregistree = D.listes?.[cle];
  if (Array.isArray(enregistree) && enregistree.length) return enregistree;
  return LISTES[cle]?.defaut || [];
}

export function reglages(D) {
  return { ...REGLAGES_DEFAUT, ...(D.reglages || {}) };
}
