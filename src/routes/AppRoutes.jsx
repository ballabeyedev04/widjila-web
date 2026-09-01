import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Spinner from '../components/Spinner.jsx';

import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import ForgotPassword from '../pages/auth/ForgotPassword.jsx';
import ResetPassword from '../pages/auth/ResetPassword.jsx';
import VerifyEmail from '../pages/auth/VerifyEmail.jsx';
// Écrans différés — voir le commentaire de `Suspense` plus bas.
// `/abonnement` tire tout le SDK Stripe : le charger d'emblée le mettait
// dans le premier octet servi à chaque visiteur, pour un écran que la
// plupart n'ouvre jamais.
const Abonnement = lazy(() => import('../pages/abonnement/Abonnement.jsx'));
const ConditionsUtilisation = lazy(() => import('../pages/legal/ConditionsUtilisation.jsx'));
const PolitiqueConfidentialite = lazy(() => import('../pages/legal/PolitiqueConfidentialite.jsx'));

import AdminLayout from '../layouts/AdminLayout.jsx';
// Rappel (voir ProtectedRoute.jsx) : ces gardes ne font que masquer l'UI. Les
// endpoints appelés par les pages ci-dessous doivent vérifier eux-mêmes les
// droits côté backend — cette liste de routes n'est jamais la source de vérité.
import ProtectedRoute, { SuperAdminRoute, RoleRoute } from './ProtectedRoute.jsx';
import { ROLES_GESTION, ROLES_GESTION_MEMBRES, homeForRole } from '../utils/constants.js';
import { useUser } from '../context/useUser.js';

/** Redirige la racine vers le portail du rôle connecté. */
function HomeRedirect() {
  const { user } = useUser();
  return <Navigate to={homeForRole(user?.role)} replace />;
}

import Dashboard from '../pages/dashboard/Dashboard.jsx';
import Profile from '../pages/account/Profile.jsx';
// Différé pour la même raison qu'`Abonnement` : cet écran de réglages
// embarque lui aussi le SDK Stripe, qui restait donc dans le bundle de
// démarrage de tout le monde. C'est une page de configuration, ouverte
// ponctuellement — pas un écran du travail quotidien.
const Organisation = lazy(() => import('../pages/organisation/Organisation.jsx'));
import Membres from '../pages/organisation/Membres.jsx';
import Equipes from '../pages/organisation/Equipes.jsx';
import Partenaires from '../pages/organisation/Partenaires.jsx';
import CorpsEtat from '../pages/corpsEtat/CorpsEtat.jsx';
import Phases from '../pages/phase/Phases.jsx';
import ReferentielTypes from '../pages/referentiel/ReferentielTypes.jsx';
import Chantiers from '../pages/chantier/Chantiers.jsx';
import ChantierDetail from '../pages/chantier/ChantierDetail.jsx';
import DemandesChantier from '../pages/chantier/DemandesChantier.jsx';
import DemandeChantierDetail from '../pages/chantier/DemandeChantierDetail.jsx';
import Notifications from '../pages/notification/Notifications.jsx';
import NotFound from '../pages/error/NotFound.jsx';

// Espace PLATEFORME — réservé au super-admin. Aucun autre rôle ne l'ouvre,
// il n'a donc rien à faire dans le bundle de tout le monde.
const PlateformeDashboard = lazy(() => import('../pages/plateforme/PlateformeDashboard.jsx'));
const PlateformeUtilisateurs = lazy(() => import('../pages/plateforme/PlateformeUtilisateurs.jsx'));
const PlateformeOrganisations = lazy(() => import('../pages/plateforme/PlateformeOrganisations.jsx'));
const PlateformeDemandes = lazy(() => import('../pages/plateforme/PlateformeDemandes.jsx'));
const PlateformeAudit = lazy(() => import('../pages/plateforme/PlateformeAudit.jsx'));
const PlateformePrixAbonnements = lazy(() => import('../pages/plateforme/PlateformePrixAbonnements.jsx'));
const PlateformeSuppressions = lazy(() => import('../pages/plateforme/PlateformeSuppressions.jsx'));
const SuppressionCompte = lazy(() => import('../pages/legal/SuppressionCompte.jsx'));
import ToutesReserves from '../pages/reserve/ToutesReserves.jsx';
import ReserveDetail from '../pages/reserve/ReserveDetail.jsx';
import TousPlans from '../pages/plan/TousPlans.jsx';

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
      <Route path="/verify-email" element={<VerifyEmail />} />
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
        <Route path="partenaires" element={<RoleRoute roles={['Admin', 'ChefProjet', 'ConducteurTravaux', 'MaitreOuvrage', 'MaitreOeuvre']}><Partenaires /></RoleRoute>} />
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
        <Route path="chantiers/:id" element={<ChantierDetail />} />
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
