import type { FaqTranslation } from "./faq-types";

/** Human review approved, as confirmed by the project owner. See supportReview. */
export const frFaq: Record<string, FaqTranslation> = {
  services: {
    question: "Quels services GEIT Ltd propose-t-elle ?",
    answer: "GEIT propose la gestion et le conseil en énergie, le développement de projets, les études de marché, les solutions technologiques, le conseil en énergies renouvelables, l’efficacité énergétique et les audits, le conseil en stockage par batteries et flexibilité, le conseil en recharge de véhicules électriques, l’analyse énergétique numérique et les services d’empreinte carbone. Les pages de services précisent le périmètre et les étapes suivantes. Les prestations de conseil sont distinctes des fonctions logicielles disponibles dans l’espace de travail.",
    statusNote: "Consultez le périmètre des services ou contactez GEIT pour discuter de vos besoins.",
    keywords: ["services", "conseil", "consultant", "recherche", "développement", "recharge", "carbone", "entreprise"],
  },
  "what-is": {
    question: "Qu’est-ce que GEIT Energy SaaS ?",
    answer: "GEIT Energy SaaS est un espace de travail d’analyse énergétique accessible après connexion. Les organisations importent manuellement des données par intervalles, gèrent les sites et compteurs et enregistrent analyses, scénarios et rapports. Il est actuellement en test interne et n’est donc pas proposé comme service de surveillance en production.",
    statusNote: "Phase de test interne.", keywords: ["plateforme", "produit", "espace", "présentation"],
  },
  who: {
    question: "Qui peut utiliser la plateforme ?",
    answer: "Les utilisateurs inscrits appartenant à une organisation, avec les rôles de propriétaire, administrateur, responsable énergie, consultant, analyste ou lecteur. Les autorisations varient selon le rôle. Vérifiez votre adresse e-mail après l’inscription, avant de vous connecter. Les visiteurs déconnectés voient la page de connexion, pas les données clients.",
    statusNote: "Le contrôle d’accès par rôle est mis en œuvre.", keywords: ["utilisateurs", "rôles", "inscription", "compte", "connexion", "organisation", "lecteur", "analyste"],
  },
  data: {
    question: "Quelles données énergétiques la plateforme peut-elle surveiller ?",
    answer: "Elle analyse les relevés d’énergie et de puissance par intervalles que vous importez à partir de modèles CSV ou XLSX, après un aperçu de validation et une confirmation explicite. Les fichiers sont limités à 5 000 lignes et 2 MiB. Elle ne se connecte ni aux compteurs ni aux passerelles IoT et ne relève pas de données en direct : elle ne fournit donc pas de surveillance en temps réel.",
    statusNote: "Import manuel uniquement. Aucune télémétrie en direct.", keywords: ["données", "surveillance", "import", "compteur", "direct", "téléverser", "fichier"],
  },
  "solar-battery": {
    question: "La plateforme prend-elle en charge le solaire photovoltaïque et le stockage par batteries ?",
    answer: "Oui, pour une évaluation préliminaire. La plateforme propose des scénarios de base de production solaire et de fonctionnement des batteries, avec des contraintes de capacité, d’état de charge, de puissance et de rendement. Il s’agit de calculs de référence documentés, pas d’optimisation avancée ni de performances mesurées des batteries. GEIT propose aussi du conseil en énergies renouvelables et en stockage.",
    statusNote: "Scénarios de base uniquement.", keywords: ["solaire", "photovoltaïque", "batterie", "batteries", "stockage", "renouvelable", "scénario", "flexibilité"],
  },
  dashboards: {
    question: "Quels tableaux de bord, analyses et rapports sont disponibles ?",
    answer: "Les analyses enregistrées de gestion énergétique présentent la consommation, la puissance de pointe, la couverture, le facteur de charge et le coût à tarif fixe, avec graphiques et tableaux accessibles. Des jumeaux numériques fondés sur les données importées et des prévisions de référence avec un historique suffisant existent. La vue d’ensemble est une page d’accès aux modules, pas un tableau de bord de tout le portefeuille. Selon le module, les exports sont en CSV, XLSX, PDF ou JSON ; les tableaux PDF sont des résumés. Un centre de rapports consolidés est prévu mais n’est pas disponible.",
    statusNote: "Vues par analyse. Centre de rapports consolidés prévu.", keywords: ["tableau", "bord", "analyses", "rapports", "export", "graphique", "prévision", "jumeau", "ensemble"],
  },
  inefficiencies: {
    question: "Peut-on suivre la performance énergétique et identifier les inefficacités ?",
    answer: "Les utilisateurs peuvent examiner les analyses enregistrées pour étudier les profils de consommation, les pointes et le facteur de charge, et comparer des périodes. Le repérage d’anomalies existe, mais ne constitue pas un diagnostic de panne. Les prévisions exigent au moins 35 jours complets consécutifs et ne sont pas produites si l’historique est insuffisant. Pour un examen de l’efficacité d’un site, GEIT propose un audit en tant que prestation de conseil.",
    statusNote: "Analyse des données importées, pas de surveillance continue.", keywords: ["efficacité", "inefficacité", "performance", "gaspillage", "audit", "anomalie", "économies"],
  },
  alerts: {
    question: "Comment fonctionnent les alertes et les notifications ?",
    answer: "Vous pouvez enregistrer des règles pour les kWh quotidiens ou les kW de l’intervalle de pointe. Les règles ne sont évaluées que lors de l’enregistrement d’une analyse ; une alerte déclenchée renvoie à cette analyse et peut être acquittée. Il n’y a ni planificateur, ni évaluation continue, ni envoi par e-mail, SMS ou notification push. Une règle enregistrée ne signifie donc pas une surveillance active.",
    statusNote: "Vérification à l’enregistrement. Aucun canal d’envoi.", keywords: ["alerte", "alertes", "notification", "notifications", "courriel", "seuil", "règle"],
  },
  sites: {
    question: "La plateforme prend-elle en charge plusieurs bâtiments ou sites ?",
    answer: "Oui. Selon votre rôle, vous pouvez créer et modifier des sites et compteurs, définir les fuseaux horaires et tarifs fixes des sites, les archiver ou les restaurer. Ce n’est ni un registre général d’équipements ni un système de maintenance, et la vue d’ensemble n’est pas un tableau de bord d’indicateurs pour tout le portefeuille.",
    statusNote: "Gestion des sites et compteurs uniquement.", keywords: ["site", "sites", "bâtiment", "bâtiments", "plusieurs", "compteur", "équipement", "portefeuille", "tarif"],
  },
  security: {
    question: "Comment les données clients et les autorisations d’accès sont-elles protégées ?",
    answer: "Les données clients sont dans des tables par locataire avec Row Level Security, les fichiers dans un compartiment privé et les sessions utilisent des cookies HttpOnly. L’accès dépend de l’appartenance à l’organisation et du rôle. Cela a été vérifié par un audit de métadonnées en lecture seule ; un test comportemental complet entre locataires et un examen de sécurité indépendant restent à réaliser. GEIT ne revendique aucune certification. Contactez GEIT pour toute question de sécurité ou de confidentialité.",
    statusNote: "Aucune certification revendiquée. Examen indépendant en attente.", keywords: ["sécurité", "confidentialité", "autorisation", "protection", "certification", "chiffrement", "accès"],
  },
  start: {
    question: "Comment commencer ou demander une démonstration ?",
    answer: "Envoyez un e-mail ou appelez GEIT aux coordonnées de la page de contact pour discuter de vos besoins ou demander une démonstration. Le formulaire de consultation du site vérifie uniquement les champs : il n’envoie ni n’enregistre les demandes, car l’envoi n’est pas configuré. Vous pouvez vous inscrire et vérifier votre e-mail pour accéder à l’espace de travail, actuellement en test interne.",
    statusNote: "Le contact et l’inscription sont disponibles.", keywords: ["commencer", "démo", "démonstration", "essai", "prix", "devis", "consultation", "coût", "facturation"],
  },
  support: {
    question: "Comment obtenir une assistance technique ?",
    answer: "Pour les problèmes de connexion, utilisez les pages de récupération du compte : mot de passe oublié et réinitialisation du mot de passe. Pour toute autre question, contactez directement GEIT aux coordonnées ci-dessous. Ce chat répond uniquement à partir de la FAQ et ne peut ni ouvrir de ticket ni accéder à votre compte.",
    statusNote: "Assistance humaine via la page de contact.", keywords: ["assistance", "aide", "technique", "problème", "mot", "passe", "réinitialisation", "récupération", "humain"],
  },
};
