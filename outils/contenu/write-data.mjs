/* Compose donnees/arcep.json à partir des extraits du site officiel (recherche/extrait.json + recherche/coeur.json).
   Les textes institutionnels sont repris tels quels ; rien n'est inventé.
   node outils/contenu/write-data.mjs */
import { ecrireDonnees } from './donnees.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const extrait = JSON.parse(readFileSync('recherche/extrait.json', 'utf8'));
const coeur = JSON.parse(readFileSync('recherche/coeur.json', 'utf8'));
const nettoie = (s) => s.replace(/repliky hodinek\s*/gi, '').replace(/\s+/g, ' ').trim();

/* ---------- Institution ---------- */
const institution = {
  sigle: 'ARCEP',
  pays: 'Gabon',
  nom: 'Autorité de Régulation des Communications Électroniques et des Postes',
  statut: 'Autorité administrative indépendante de la République gabonaise',
  fondation: 'Ordonnance n°000008/PR/2012 du 13 février 2012, ratifiée par la loi n°006/2012 du 13 août 2012',
  presentation: nettoie(`L’Autorité de Régulation des Communications Électroniques et des Postes (ARCEP) de la République gabonaise est une Autorité administrative indépendante. Elle est créée par l’Ordonnance n°000008/PR/2012 du 13 février 2012 et ratifiée par la loi n° 006/2012 du 13 août 2012 qui abroge le décret n° 0116/PR/MCEN et confère à l’ARCEP la qualité d’«Autorité» en lieu et place d’«Agence», de nouvelles missions et une organisation adaptées au fonctionnement d’une autorité.`),
  adresse: 'Kalikak, BP. 50 000 — Libreville, Gabon',
  telephones: ['(+241) 011 44 68 11', '(+241) 011 44 68 12'],
  email: 'arcep@arcep.ga',
  numeroCourt: '1331',
  source: 'https://www.arcep.ga/',
};

/* ---------- Conseil de régulation ---------- */
const conseil = {
  titre: 'Conseil de Régulation',
  texte: nettoie(`Le Conseil de Régulation, organe délibérant et de direction de l’Autorité, est investi de l’ensemble des prérogatives dévolues à ladite Autorité par les textes en vigueur. Il peut déléguer certaines de ses prérogatives à son Président ou au Secrétariat Exécutif.`),
  composition: nettoie(`Le Conseil de Régulation comprend sept (7) membres nommés par décret pris en Conseil des Ministres avec un mandat de quatre ans renouvelable une fois. Le Président du Conseil veille d’une part à l’application des délibérations du Conseil, et exerce les pouvoirs de représentation de l’Autorité tout en administrant les services de l’Autorité, d’autre part.`),
};

/* ---------- Mot du Président (extraits fidèles) ---------- */
const president = {
  titre: 'Mot du Président',
  accroche: 'Connecter le Gabon au monde.',
  paragraphes: [
    nettoie(`Bienvenue sur le site officiel de l’Autorité de Régulation des Communications Électroniques et des Postes (ARCEP) Gabon. Ce portail est l’expression de notre engagement à faire du secteur des télécommunications et des services postaux un levier de développement, d’inclusion et d’innovation permettant de connecter le Gabon au monde.`),
    nettoie(`À l’heure où le numérique transforme nos modes de vie et redéfinit les interactions sociales et économiques, notre mission est de garantir un environnement concurrentiel, équitable et transparent. Nous œuvrons pour promouvoir l’accès à des services de communication de qualité, accessibles et sécurisés, tout en accompagnant les innovations technologiques et les nouveaux services numériques.`),
  ],
  axes: [
    { titre: 'Service universel', texte: 'Le développement du service universel, visant à connecter les populations dans les zones rurales du Gabon.' },
    { titre: 'Fréquences', texte: 'La gestion des fréquences radioélectriques et une réglementation conforme aux standards internationaux, afin de garantir une utilisation optimale des ressources en fréquences.' },
    { titre: 'Ressources', texte: 'La gestion saine des ressources financières, essentielle pour assurer la pérennité de l’Institution et une régulation efficace.' },
    { titre: 'Management', texte: 'Un management orthodoxe et efficace, gage d’un climat social apaisé.' },
  ],
};

/* ---------- Chiffres clés (Observatoire des marchés ARCEP 2024) ---------- */
const chiffres = [
  { valeur: 330.83, affichage: '330,83', unite: 'milliards de FCFA', libelle: 'Chiffre d’affaires global du secteur des communications électroniques', decimales: 2 },
  { valeur: 5544403, affichage: '5 544 403', unite: 'abonnements', libelle: 'Nombre d’abonnements dans le secteur des communications électroniques', decimales: 0 },
  { valeur: 176.52, affichage: '176,52', unite: '%', libelle: 'Taux de pénétration du mobile', decimales: 2 },
  { valeur: 38, affichage: '38', unite: '%', libelle: 'Part du chiffre d’affaires d’internet dans le chiffre d’affaires global du secteur', decimales: 0 },
];
const chiffresSource = 'Source : Observatoire des marchés ARCEP 2024';

/* ---------- Missions (texte officiel, nettoyé d’un fragment parasite présent sur le site) ---------- */
const missions = [
  {
    num: '01', cle: 'general', titre: 'Mission d’ordre général', lien: 'https://www.arcep.ga/pages/detail_mission/1',
    resume: 'Éclairer la décision publique et accompagner la tutelle du secteur.',
    points: [
      'Émettre des avis sur toutes questions du secteur des communications électroniques et des postes.',
      'Assister les ministères responsables dans l’exercice de leurs pouvoirs de tutelle sur les services publics personnalisés opérant dans le secteur des communications électroniques et des postes.',
    ],
  },
  {
    num: '02', cle: 'investigation', titre: 'Mission d’investigation', lien: 'https://www.arcep.ga/pages/detail_mission/2',
    resume: 'Contrôler, prévenir et sanctionner les manquements des opérateurs.',
    points: [
      'Veiller au respect par les opérateurs des dispositions contenues dans les licences, autorisations, agréments et cahiers de charges, et sanctionner ou faire sanctionner les contrevenants.',
      'Prévenir et sanctionner les pratiques anticoncurrentielles.',
      'Veiller au traitement équitable des consommateurs et en sanctionner les violations.',
      'Veiller au respect des stipulations contractuelles entre les opérateurs, en prévenir les conflits et en sanctionner les manquements.',
      'Émettre des avis sur toute opération de cession ou de rachat de parts sociales entre les opérateurs.',
      'Veiller au respect par les opérateurs des obligations et interdictions liées au caractère personnel et non cessible de la licence, et en sanctionner les violations.',
    ],
  },
  {
    num: '03', cle: 'juridique', titre: 'Mission d’ordre juridique', lien: 'https://www.arcep.ga/pages/detail_mission/3',
    resume: 'Préparer le droit du secteur et veiller à son application.',
    points: [
      'Préparer les études et projets de textes relatifs au secteur des communications électroniques et des postes, de sa propre initiative ou à la demande du Gouvernement.',
      'Veiller au respect par les opérateurs de leurs obligations résultant de la réglementation communautaire, des accords internationaux, de la législation et de la réglementation nationale applicables, et en sanctionner les violations.',
    ],
  },
  {
    num: '04', cle: 'technique', titre: 'Mission technique', lien: 'https://www.arcep.ga/pages/detail_mission/4',
    resume: 'Encadrer les réseaux, les autorisations et la collecte d’informations.',
    points: [
      'Délivrer les accords préalables aux exploitants des réseaux ouverts au public dûment autorisés par les textes en vigueur, nécessaires à l’exercice de leur droit de passage dans le domaine public et des servitudes sur les propriétés privées.',
      'Veiller à l’accomplissement par les opérateurs des formalités relatives à l’obtention des autorisations ou déclarations liées à l’exercice des activités du secteur.',
      'Recueillir toutes les informations utiles relatives aux activités des opérateurs aux fins de régulation.',
    ],
  },
  {
    num: '05', cle: 'economique', titre: 'Mission économique', lien: 'https://www.arcep.ga/pages/detail_mission/5',
    resume: 'Surveiller les mouvements capitalistiques du secteur.',
    points: [
      'S’assurer que les changements de contrôle direct ou indirect issus des cessions ou d’achats de parts sociales ne se transforment en cessions de licences déguisées, et sanctionner les auteurs.',
    ],
  },
];

/* ---------- Directions (page contact du site) ---------- */
const directions = [
  'Secrétariat Exécutif', 'Secrétariat Exécutif Adjoint 1', 'Secrétariat Exécutif Adjoint 2',
  'Direction des Ressources Humaines et des Systèmes d’Informations', 'Direction du Budget et de la Comptabilité',
  'Direction de l’Audit Interne', 'Direction Juridique', 'Direction de la Régulation',
  'Direction des Ressources Rares et des Infrastructures Haut-Débit', 'Direction des Homologations et de la Qualité des Réseaux',
  'Direction de la Recherche, du Développement, de l’Innovation, des Affaires Internationales et des Études',
  'Direction des Systèmes d’Interconnexion et des Plateformes', 'Direction du Développement du Service Universel',
];

/* ---------- Partenaires (liens du site officiel) ---------- */
const partenaires = [
  { sigle: 'UPU', nom: 'Union postale universelle', secteur: 'Postes', lien: 'https://www.upu.int/fr/Accueil' },
  { sigle: 'UPAP', nom: 'Union panafricaine des postes', secteur: 'Postes', lien: 'https://www.upap-papu.africa/fr/' },
  { sigle: 'UIT', nom: 'Union internationale des télécommunications', secteur: 'Communications', lien: 'https://www.itu.int/fr/Pages/default.aspx' },
  { sigle: 'URT', nom: 'Union des radiodiffusions et télévisions', secteur: 'Communications', lien: '' },
  { sigle: 'ARTAC', nom: 'Association des régulateurs de télécommunications d’Afrique centrale', secteur: 'Communications', lien: '' },
  { sigle: 'FRATEL', nom: 'Réseau francophone de la régulation des télécommunications', secteur: 'Coopération', lien: 'https://www.arcep.ga/fratel/' },
];

/* ---------- Catégories de réglementation ---------- */
const categories = [
  { cle: 'lois', nom: 'Lois', lien: 'https://www.arcep.ga/pages/detail_reglementation/1' },
  { cle: 'ordonnances', nom: 'Ordonnances', lien: 'https://www.arcep.ga/pages/detail_reglementation/2' },
  { cle: 'decrets', nom: 'Décrets', lien: 'https://www.arcep.ga/pages/detail_reglementation/3' },
  { cle: 'arretes', nom: 'Arrêtés', lien: 'https://www.arcep.ga/pages/detail_reglementation/4' },
  { cle: 'deliberations', nom: 'Délibérations', lien: 'https://www.arcep.ga/pages/detail_reglementation/5' },
  { cle: 'decisions', nom: 'Décisions', lien: 'https://www.arcep.ga/pages/detail_reglementation/6' },
  { cle: 'baremes', nom: 'Barèmes', lien: 'https://www.arcep.ga/pages/detail_reglementation/7' },
  { cle: 'formulaires', nom: 'Formulaires', lien: 'https://www.arcep.ga/pages/detail_reglementation/8' },
  { cle: 'homologations', nom: 'Équipements homologués', lien: 'https://www.arcep.ga/pages/detail_reglementation/9' },
];

const faq = extrait.faq.map((f) => ({ q: nettoie(f.q), r: nettoie(f.r) }));
const actualites = extrait.actualites.map((a) => ({ ...a, titre: nettoie(a.titre), date: nettoie(a.date) }));
const documents = extrait.documents.map((d) => ({ ...d, titre: nettoie(d.titre) }));

const data = { institution, conseil, president, chiffres, chiffresSource, missions, categories, documents, observatoire: extrait.observatoire, actualites, faq, partenaires, directions };

mkdirSync('js', { recursive: true });
ecrireDonnees(data);
console.log('donnees/arcep.json écrit ·', documents.length, 'documents ·', actualites.length, 'actualités ·', faq.length, 'questions ·', missions.length, 'missions');
