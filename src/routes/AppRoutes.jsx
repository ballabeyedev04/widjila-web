import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Spinner from '../components/Spinner.jsx';

import Login from '../pages/auth/Login.jsx';
const Register = lazy(() => import('../pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword.jsx'));
// Écrans différés — voir le commentaire de `Suspense` plus bas.
// `/abonnement` tire tout le SDK Stripe : le charger d'emblée le mettait
// dans le premier octet servi à chaque visiteur, pour un écran que la
// plupart n'ouvre jamais.
const Abonnement = lazy(() => import('../pages/abonnement/Abonnement.jsx'));
const ConditionsUtilisation = lazy(() => import('../pages/legal/ConditionsUtilisation.jsx'));
const PolitiqueConfidentialite = lazy(() => import('../pages/legal/PolitiqueConfidentialite.jsx'));

// ── CHARGEMENT DIFFÉRÉ DES ÉCRANS ────────────────────────────────────────
//
// Vingt écrans étaient importés statiquement ici : 223 Ko de source partaient
// dans le paquet d'entrée, servis à quiconque ouvre l'application — page de
// connexion comprise — pour des pages que la plupart des rôles n'ouvrent
// jamais. Un chef de projet téléchargeait l'espace plateforme du super-admin,
// une entreprise téléchargeait les référentiels qu'elle ne voit pas.
//
// Trois écrans restent immédiats, et seulement eux :
//   - `Login` : la première chose que voit un visiteur non connecté ;
//   - `Dashboard` : le portail de la majorité des rôles après connexion ;
//   - `NotFound` : minuscule, et atteignable depuis n'importe quelle URL.
//
// Tous les autres sont différés. La table entière est enveloppée d'un
// `<Suspense>` unique (voir plus bas) dont le repli est le même spinner que
// celui des gardes d'accès : l'attente ressemble à ce que l'utilisateur voit
// déjà, elle ne se remarque pas comme un défaut.
import AdminLayout from '../layouts/AdminLayout.jsx';
// Rappel (voir ProtectedRoute.jsx) : ces gardes ne font que masquer l'UI. Les
// endpoints appelés par les pages ci-dessous doivent vérifier eux-mêmes les
// droits côté backend — cette liste de routes n'est jamais la source de vérité.
import ProtectedRoute, { SuperAdminRoute, RoleRoute } from './ProtectedRoute.jsx';
import { ROLES_GESTION, ROLES_GESTION_MEMBRES, homeForRole, ROLES_PARTENAIRES } from '../utils/constants.js';
import { useUser } from '../context/useUser.js';

/** Redirige la racine vers le portail du rôle connecté. */
function HomeRedirect() {
  const { user } = useUser();
  return <Navigate to={homeForRole(user?.role)} replace />;
}

import Dashboard from '../pages/dashboard/Dashboard.jsx';
const Profile = lazy(() => import('../pages/account/Profile.jsx'));
// Différé pour la même raison qu'`Abonnement` : cet écran de réglages
// embarque lui aussi le SDK Stripe, qui restait donc dans le bundle de
// démarrage de tout le monde. C'est une page de configuration, ouverte
// ponctuellement — pas un écran du travail quotidien.
const Organisation = lazy(() => import('../pages/organisation/Organisation.jsx'));
const Membres = lazy(() => import('../pages/organisation/Membres.jsx'));
const Equipes = lazy(() => import('../pages/organisation/Equipes.jsx'));
const Partenaires = lazy(() => import('../pages/organisation/Partenaires.jsx'));
const CorpsEtat = lazy(() => import('../pages/corpsEtat/CorpsEtat.jsx'));
const Phases = lazy(() => import('../pages/phase/Phases.jsx'));
const ReferentielTypes = lazy(() => import('../pages/referentiel/ReferentielTypes.jsx'));
const Chantiers = lazy(() => import('../pages/chantier/Chantiers.jsx'));
const ChantierDetail = lazy(() => import('../pages/chantier/ChantierDetail.jsx'));
const DemandesChantier = lazy(() => import('../pages/chantier/DemandesChantier.jsx'));
const Notifications = lazy(() => import('../pages/notification/Notifications.jsx'));
import NotFound from '../pages/error/NotFound.jsx';

// Espace PLATEFORME — réservé au super-admin. Aucun autre rôle ne l'ouvre,
// il n'a donc rien à faire dans le bundle de tout le monde.
// Examen d'une demande de chantier — CHARGE A LA DEMANDE.
//
// Seul ecran du portail a monter `PlanCanvas`, donc pdf.js. Importe
// normalement, il faisait entrer tout le moteur PDF dans le paquet
// d'entree : 1,4 Mo telecharges par QUICONQUE ouvre le portail, y compris
// sur la page de connexion, pour un ecran que seul le valideur visite.
// Les autres ecrans a plan (`PlansTab`, `TousPlans`) le faisaient deja.
const DemandeChantierDetail = lazy(() => import('../pages/chantier/DemandeChantierDetail.jsx'));

// Dépôt guidé des plans — monte `PlanVignette`, donc pdf.js. Chargé à la
// demande pour la même raison que l'écran ci-dessus.
const DepotPlans = lazy(() => import('../pages/chantier/DepotPlans.jsx'));

// Explorateur de plans — descend l'arborescence `plans.parent_id` d'un chantier
// jusqu'au plan où l'on pose la réserve. Monte `PlanCanvas`, donc pdf.js :
// chargé à la demande pour la même raison que les deux écrans ci-dessus.
const PlanExplorer = lazy(() => import('../pages/plan/PlanExplorer.jsx'));
const PlateformeDashboard = lazy(() => import('../pages/plateforme/PlateformeDashboard.jsx'));
const PlateformeUtilisateurs = lazy(() => import('../pages/plateforme/PlateformeUtilisateurs.jsx'));
const PlateformeOrganisations = lazy(() => import('../pages/plateforme/PlateformeOrganisations.jsx'));
const PlateformeDemandes = lazy(() => import('../pages/plateforme/PlateformeDemandes.jsx'));
const PlateformeAudit = lazy(() => import('../pages/plateforme/PlateformeAudit.jsx'));
const PlateformePrixAbonnements = lazy(() => import('../pages/plateforme/PlateformePrixAbonnements.jsx'));
const PlateformeSuppressions = lazy(() => import('../pages/plateforme/PlateformeSuppressions.jsx'));
const SuppressionCompte = lazy(() => import('../pages/legal/SuppressionCompte.jsx'));
const ToutesReserves = lazy(() => import('../pages/reserve/ToutesReserves.jsx'));
const ReserveDetail = lazy(() => import('../pages/reserve/ReserveDetail.jsx'));
const TousPlans = lazy(() => import('../pages/plan/TousPlans.jsx'));

export default function AppRoutes() {
  return (
    /* Un seul `Suspense` autour de toute la table plutôt qu'un par route :
       les écrans différés partagent la même attente, et le repli est le même
       spinner que celui des gardes d'accès — l'utilisateur voit donc la même
       chose, qu'il attende son profil ou le chargement d'un écran. */
    <Suspense fallback={<Spinner />}>
      <Routes>
      {/* ---------- Public ---------- */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* `/verify-email` — parcours RETIRÉ côté serveur.
          `auth.service.js#register` pose `email_verifie: true` et n'envoie
          aucun mail : c'est le super-admin qui valide chaque demande, et il
          joue le rôle d'acteur de confiance. L'endpoint `POST /auth/verify-email`
          n'existe plus.
          La route est conservée en REDIRECTION plutôt que supprimée : un
          visiteur qui suit un ancien lien atterrissait sur « Lien invalide ou
          expiré » — un message qui accuse son lien alors que c'est la route
          serveur qui a disparu. Il veut se connecter ; on l'y emmène. */}
      <Route path="/verify-email" element={<Navigate to="/login" replace />} />
      <Route path="/abonnement" element={<Abonnement />} />
      <Route path="/condition-utilisation" element={<ConditionsUtilisation />} />
      <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
      {/* URL déclarée à Google Play — doit rester accessible SANS connexion :
          un utilisateur ayant désinstallé l'app doit pouvoir demander la
          suppression de son compte. Ne pas déplacer sous ProtectedRoute. */}
      <Route path="/suppression-compte" element={<SuppressionCompte />} />

      {/* ---------- Protégé (layout admin) ---------- */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profil" element={<Profile />} />
        <Route path="organisation" element={<RoleRoute roles={ROLES_GESTION}><Organisation /></RoleRoute>} />
        <Route path="membres" element={<RoleRoute roles={ROLES_GESTION_MEMBRES}><Membres /></RoleRoute>} />
        <Route path="equipes" element={<RoleRoute roles={ROLES_GESTION}><Equipes /></RoleRoute>} />
        {/* Catalogue des métiers BTP — référentiel de l'organisation, au même
            titre que son organigramme : même groupe de rôles. */}
        <Route path="corps-etat" element={<RoleRoute roles={ROLES_GESTION}><CorpsEtat /></RoleRoute>} />
        {/* Référentiel des phases — même groupe de rôles que le catalogue
            des métiers : ce sont deux données de référence de l'entreprise. */}
        <Route path="phases" element={<RoleRoute roles={ROLES_GESTION}><Phases /></RoleRoute>} />
        {/* Référentiels de TYPE — un seul écran, trois jeux de données.
            Ils remplacent trois colonnes ENUM que le client ne pouvait pas
            étendre sans migration. Même groupe de rôles que les autres
            référentiels de l'entreprise. */}
        <Route path="types-document" element={<RoleRoute roles={ROLES_GESTION}><ReferentielTypes referentiel="document" /></RoleRoute>} />
        <Route path="types-intervenant" element={<RoleRoute roles={ROLES_GESTION}><ReferentielTypes referentiel="intervenant" /></RoleRoute>} />
        <Route path="types-inspection" element={<RoleRoute roles={ROLES_GESTION}><ReferentielTypes referentiel="inspection" /></RoleRoute>} />
        <Route path="partenaires" element={<RoleRoute roles={ROLES_PARTENAIRES}><Partenaires /></RoleRoute>} />
        {/* Vues TRANSVERSALES — toutes les réserves et tous les plans de
            l'organisation, chantiers confondus. Déclarées avant les routes
            de chantier : elles ne dépendent d'aucun chantier précis. */}
        <Route path="reserves" element={<ToutesReserves />} />
        <Route path="reserves/:id" element={<ReserveDetail />} />
        <Route path="plans" element={<TousPlans />} />
        {/* Demandes de creation de chantier. Ouverte a TOUS : l'onglet
            « A valider » ne renvoie rien a qui ne valide pas, et l'onglet
            « Mes demandes » concerne justement ceux qui deposent. */}
        <Route path="chantiers/demandes" element={<DemandesChantier />} />
        {/* Examen d'une demande : les plans y sont presentes par sections,
            comme sur mobile, et consultables SANS creation de reserve.
            Declaree avant `chantiers/:id`, qui prendrait sinon « demandes »
            pour un identifiant — React Router classe pourtant les segments
            statiques avant les dynamiques, l'ordre n'est ici que pour la
            lecture. */}
        <Route path="chantiers/demandes/:id" element={<DemandeChantierDetail />} />
        <Route path="chantiers" element={<Chantiers />} />
        {/* Explorateur de plans — le parcours de relevé du mobile, porté au
            web : plans globaux → sous-plans → plan → clic → nouvelle réserve.
            Déclarée AVANT `chantiers/:id` par souci de lecture ; React Router
            classe de toute façon le segment statique `plans` avant le
            paramètre, les deux ne peuvent donc pas entrer en collision.
            `?nom=` porte le nom du chantier (le fil d'Ariane commence par
            lui), `?planId=` ouvre directement SUR un plan au lieu de partir
            des plans globaux. */}
        <Route path="chantiers/:chantierId/plans/explorer" element={<PlanExplorer />} />
        <Route path="chantiers/:id" element={<ChantierDetail />} />
        {/* Dépôt guidé des plans, comme sur mobile.
            SANS chantier : le parcours de l'entreprise commence par les plans
            et finit par le formulaire de demande — les valideurs reçoivent
            ainsi une demande complète, pas un chantier vide.
            AVEC chantier : chaque ajout part au serveur sur-le-champ.
            Deux chemins distincts plutôt qu'un paramètre facultatif, que
            React Router résoudrait mais qui rendrait l'intention illisible. */}
        <Route path="depot-plans" element={<DepotPlans />} />
        <Route path="depot-plans/:chantierId" element={<DepotPlans />} />
        <Route path="notifications" element={<Notifications />} />

        {/* ---------- Super-admin (plateforme) ---------- */}
        <Route
          path="plateforme"
          element={
            <SuperAdminRoute>
              <PlateformeDashboard />
            </SuperAdminRoute>
          }
        />
        <Route
          path="plateforme/utilisateurs"
          element={
            <SuperAdminRoute>
              <PlateformeUtilisateurs />
            </SuperAdminRoute>
          }
        />
        <Route
          path="plateforme/organisations"
          element={
            <SuperAdminRoute>
              <PlateformeOrganisations />
            </SuperAdminRoute>
          }
        />
        <Route
          path="plateforme/demandes"
          element={
            <SuperAdminRoute>
              <PlateformeDemandes />
            </SuperAdminRoute>
          }
        />
        <Route
          path="plateforme/suppressions"
          element={
            <SuperAdminRoute>
              <PlateformeSuppressions />
            </SuperAdminRoute>
          }
        />
        <Route
          path="plateforme/audit"
          element={
            <SuperAdminRoute>
              <PlateformeAudit />
            </SuperAdminRoute>
          }
        />
        {/* Catalogue des formules d'abonnement — réservé au super-admin
            plateforme : les tarifs sont communs à toutes les organisations. */}
        <Route
          path="plateforme/prix-abonnements"
          element={
            <SuperAdminRoute>
              <PlateformePrixAbonnements />
            </SuperAdminRoute>
          }
        />
      </Route>

        {/* ---------- 404 ---------- */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
