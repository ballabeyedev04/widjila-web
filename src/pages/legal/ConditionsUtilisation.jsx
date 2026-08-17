import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import '../../assets/css/legal.css';

/**
 * Conditions générales d'utilisation — contenu standard pour un SaaS de
 * suivi de chantier. Les informations d'identification de l'éditeur
 * (raison sociale, SIRET, adresse du siège) sont des espaces réservés
 * [À COMPLÉTER] : à remplacer par les données réelles de la société avant
 * mise en production, elles n'ont pas été fournies à la génération de cette
 * page.
 */
export default function ConditionsUtilisation() {
  return (
    <div className="legal-page">
      <div className="legal-header">
        <Link to="/register" className="legal-back">
          <ArrowLeft size={15} /> Retour à l'inscription
        </Link>
        <div className="legal-brand">
          <span className="logo-icon"><ShieldCheck size={17} /></span>
          Widjila — Suivie Chantier
        </div>
      </div>

      <div className="legal-card">
        <div className="legal-eyebrow">Contrat</div>
        <h1>Conditions générales d'utilisation</h1>
        <p className="legal-maj">Dernière mise à jour : 16 août 2026</p>

        <section>
          <h2>1. Objet</h2>
          <p>
            Les présentes conditions générales d'utilisation (« CGU ») régissent l'accès et l'utilisation de la
            plateforme <strong>Widjila — Suivie Chantier</strong> (l'« Application »), un service en ligne (SaaS)
            de suivi de chantiers de construction : gestion de réserves, inspections, plans, documents, rapports et
            tableaux de bord. L'Application est éditée par <strong>[À COMPLÉTER — raison sociale de l'éditeur]</strong>,
            <strong> [À COMPLÉTER — forme juridique]</strong> immatriculée sous le numéro
            <strong> [À COMPLÉTER — SIRET/RCCM]</strong>, dont le siège social est situé
            <strong> [À COMPLÉTER — adresse]</strong> (l'« Éditeur »).
          </p>
          <p>
            Toute création de compte implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez
            pas ces conditions, vous ne devez pas utiliser l'Application.
          </p>
        </section>

        <section>
          <h2>2. Compte et organisation</h2>
          <p>
            L'inscription crée un compte administrateur rattaché à une organisation (entreprise, maîtrise d'œuvre,
            maîtrise d'ouvrage, etc.). Le titulaire du compte s'engage à fournir des informations exactes et à jour,
            et à préserver la confidentialité de son mot de passe. Toute action réalisée depuis un compte est réputée
            effectuée par son titulaire ou par un membre de l'organisation qu'il a invité.
          </p>
          <p>
            L'inscription ouvre droit à un essai gratuit de 7 jours. À l'issue de cette période, l'accès aux
            fonctionnalités est conditionné à la souscription d'un abonnement payant, selon les plans affichés dans
            l'Application.
          </p>
        </section>

        <section>
          <h2>3. Utilisation du service</h2>
          <p>L'utilisateur s'engage à :</p>
          <ul>
            <li>utiliser l'Application conformément à sa destination (suivi de chantiers réels) ;</li>
            <li>ne pas tenter de contourner les mesures de sécurité ou d'accéder à des données d'une autre organisation ;</li>
            <li>ne pas importer de contenu illicite, diffamatoire ou portant atteinte aux droits de tiers ;</li>
            <li>respecter les droits des autres membres invités sur son organisation (réserves, commentaires, documents partagés).</li>
          </ul>
        </section>

        <section>
          <h2>4. Contenus et données déposés</h2>
          <p>
            Les chantiers, réserves, photos, plans, documents et rapports déposés dans l'Application restent la
            propriété de l'organisation qui les a créés. L'Éditeur agit en tant qu'hébergeur technique de ces
            données et ne peut en disposer que pour les besoins du fonctionnement du service (sauvegarde,
            génération de rapports, notifications).
          </p>
        </section>

        <section>
          <h2>5. Disponibilité et support</h2>
          <p>
            L'Éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du service,
            sans garantir une disponibilité absolue (maintenances planifiées, incidents techniques indépendants de
            sa volonté). Les sauvegardes sont effectuées régulièrement mais ne dispensent pas l'utilisateur d'exporter
            ses données importantes.
          </p>
        </section>

        <section>
          <h2>6. Abonnement, résiliation et suspension</h2>
          <p>
            Les tarifs et modalités de facturation sont ceux affichés au moment de la souscription. L'utilisateur
            peut résilier son abonnement depuis son espace, la résiliation prenant effet à la fin de la période en
            cours. L'Éditeur se réserve le droit de suspendre un compte en cas de manquement grave aux présentes CGU
            ou d'impayé, après information préalable lorsque cela est possible.
          </p>
        </section>

        <section>
          <h2>7. Responsabilité</h2>
          <p>
            L'Application est un outil d'aide au suivi de chantier ; elle ne se substitue pas aux obligations
            légales et contractuelles des intervenants du bâtiment (maîtrise d'œuvre, entreprises, contrôleurs
            techniques). L'Éditeur ne saurait être tenu responsable des décisions prises sur la base des informations
            saisies par les utilisateurs eux-mêmes.
          </p>
        </section>

        <section>
          <h2>8. Modification des CGU</h2>
          <p>
            L'Éditeur peut faire évoluer les présentes CGU pour tenir compte des évolutions du service ou de la
            réglementation. Les utilisateurs seront informés de toute modification substantielle par email ou
            notification dans l'Application avant son entrée en vigueur.
          </p>
        </section>

        <section>
          <h2>9. Droit applicable</h2>
          <p>
            Les présentes CGU sont soumises au droit <strong>[À COMPLÉTER — droit applicable]</strong>. Tout litige
            relatif à leur interprétation ou leur exécution relève des juridictions compétentes du ressort du siège
            de l'Éditeur, sauf disposition légale impérative contraire.
          </p>
        </section>

        <div className="legal-contact">
          Une question sur ces conditions ? Contactez-nous à <strong>[À COMPLÉTER — email de contact]</strong>.
        </div>
      </div>
    </div>
  );
}
