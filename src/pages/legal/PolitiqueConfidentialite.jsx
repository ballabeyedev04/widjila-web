import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import '../../assets/css/legal.css';

/**
 * Politique de confidentialité — contenu standard RGPD pour un SaaS de
 * suivi de chantier. Les informations d'identification du responsable de
 * traitement (raison sociale, adresse, email DPO/contact) sont des espaces
 * réservés [À COMPLÉTER] : à remplacer par les données réelles avant mise
 * en production, elles n'ont pas été fournies à la génération de cette page.
 */
export default function PolitiqueConfidentialite() {
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
        <div className="legal-eyebrow">RGPD</div>
        <h1>Politique de confidentialité</h1>
        <p className="legal-maj">Dernière mise à jour : 16 août 2026</p>

        <section>
          <h2>1. Responsable de traitement</h2>
          <p>
            Le responsable du traitement des données à caractère personnel collectées via l'Application
            <strong> Widjila — Suivie Chantier</strong> est <strong>[À COMPLÉTER — raison sociale]</strong>,
            dont le siège est situé <strong>[À COMPLÉTER — adresse]</strong>, joignable à l'adresse
            <strong> [À COMPLÉTER — email contact/DPO]</strong>.
          </p>
        </section>

        <section>
          <h2>2. Données collectées</h2>
          <p>Selon votre usage de l'Application, nous collectons :</p>
          <ul>
            <li><strong>Données de compte</strong> : nom, prénom, email, téléphone, fonction, rôle ;</li>
            <li><strong>Données d'organisation</strong> : nom, raison sociale, SIRET/RCCM/NINEA, adresse, contacts ;</li>
            <li><strong>Données de suivi de chantier</strong> : chantiers, réserves, inspections, commentaires, photos, plans et documents déposés par vous ou les membres de votre organisation ;</li>
            <li><strong>Données de connexion</strong> : adresse IP, journaux de connexion, journal d'audit des actions effectuées (traçabilité) ;</li>
            <li><strong>Données de facturation</strong> : historique d'abonnement, statut de paiement (les coordonnées bancaires elles-mêmes sont traitées directement par notre prestataire de paiement, jamais stockées par nos soins).</li>
          </ul>
        </section>

        <section>
          <h2>3. Finalités et bases légales</h2>
          <ul>
            <li><strong>Exécution du contrat</strong> : fourniture du service, gestion du compte et de l'abonnement ;</li>
            <li><strong>Intérêt légitime</strong> : sécurité du service, prévention de la fraude, amélioration du produit, journal d'audit ;</li>
            <li><strong>Obligation légale</strong> : conservation de certaines données comptables et de facturation ;</li>
            <li><strong>Consentement</strong> : communications marketing non essentielles, lorsqu'elles existent (désinscription possible à tout moment).</li>
          </ul>
        </section>

        <section>
          <h2>4. Destinataires et sous-traitants</h2>
          <p>
            Vos données sont accessibles aux membres autorisés de votre organisation (selon leur rôle) et aux
            équipes techniques de l'Éditeur strictement dans la limite du support et de la maintenance. Elles
            peuvent également être traitées par nos sous-traitants techniques, notamment :
          </p>
          <ul>
            <li>hébergement applicatif et base de données ;</li>
            <li>stockage des fichiers et photos (stockage compatible S3) ;</li>
            <li>envoi d'emails transactionnels (notifications, vérification de compte, réinitialisation de mot de passe) ;</li>
            <li>traitement des paiements d'abonnement.</li>
          </ul>
          <p>
            Ces prestataires n'utilisent vos données que pour exécuter les services demandés et sont contractuellement
            tenus à des obligations de confidentialité et de sécurité équivalentes.
          </p>
        </section>

        <section>
          <h2>5. Durée de conservation</h2>
          <p>
            Les données de compte et de chantier sont conservées pendant toute la durée de l'abonnement, puis
            archivées ou supprimées dans un délai raisonnable après résiliation, sauf obligation légale de
            conservation plus longue (documents comptables notamment). Les journaux de connexion et d'audit sont
            conservés pour une durée limitée à des fins de sécurité.
          </p>
        </section>

        <section>
          <h2>6. Vos droits</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la législation applicable,
            vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et
            d'opposition sur vos données personnelles. Vous pouvez exercer ces droits en écrivant à
            <strong> [À COMPLÉTER — email contact/DPO]</strong>. Vous disposez également du droit d'introduire une
            réclamation auprès de l'autorité de contrôle compétente (en France, la CNIL).
          </p>
        </section>

        <section>
          <h2>7. Sécurité</h2>
          <p>
            L'accès à l'Application est protégé par mot de passe et, en option, par une authentification à deux
            facteurs (MFA). Les échanges sont chiffrés (HTTPS/TLS). Les accès aux données sont journalisés dans un
            journal d'audit consultable par les administrateurs de votre organisation.
          </p>
        </section>

        <section>
          <h2>8. Cookies</h2>
          <p>
            L'Application utilise des cookies ou technologies équivalentes strictement nécessaires à son
            fonctionnement (maintien de session, préférences d'affichage). Aucun cookie publicitaire ou de suivi
            tiers n'est déposé sans votre consentement préalable.
          </p>
        </section>

        <section>
          <h2>9. Modification de la présente politique</h2>
          <p>
            Cette politique peut être mise à jour pour refléter l'évolution du service ou de la réglementation.
            Toute modification substantielle vous sera communiquée par email ou notification avant son entrée en
            vigueur.
          </p>
        </section>

        <div className="legal-contact">
          Pour exercer vos droits ou toute question relative à vos données, écrivez-nous à
          {' '}<strong>[À COMPLÉTER — email de contact]</strong>.
        </div>
      </div>
    </div>
  );
}
