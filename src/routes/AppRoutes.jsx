import { Routes, Route, Navigate } from 'react-router-dom';

import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import ForgotPassword from '../pages/auth/ForgotPassword.jsx';
import ResetPassword from '../pages/auth/ResetPassword.jsx';
import VerifyEmail from '../pages/auth/VerifyEmail.jsx';
import Abonnement from '../pages/abonnement/Abonnement.jsx';
import ConditionsUtilisation from '../pages/legal/ConditionsUtilisation.jsx';
import PolitiqueConfidentialite from '../pages/legal/PolitiqueConfidentialite.jsx';

import AdminLayout from '../layouts/AdminLayout.jsx';
// Rappel (voir ProtectedRoute.jsx) : ces gardes ne font que masquer l'UI. Les
// endpoints appelés par les pages ci-dessous doivent vérifier eux-mêmes les
// droits côté backend — cette liste de routes n'est jamais la source de vérité.
import ProtectedRoute, { SuperAdminRoute, RoleRoute } from './ProtectedRoute.jsx';
import { ROLES_GESTION, homeForRole } from '../utils/constants.js';
import { useUser } from '../context/useUser.js';

/** Redirige la racine vers le portail du rôle connecté. */
function HomeRedirect() {
  const { user } = useUser();
  return <Navigate to={homeForRole(user?.role)} replace />;
}

import Dashboard from '../pages/dashboard/Dashboard.jsx';
import Profile from '../pages/account/Profile.jsx';
import Organisation from '../pages/organisation/Organisation.jsx';
import Membres from '../pages/organisation/Membres.jsx';
import Equipes from '../pages/organisation/Equipes.jsx';
import Partenaires from '../pages/organisation/Partenaires.jsx';
import Chantiers from '../pages/chantier/Chantiers.jsx';
import ChantierDetail from '../pages/chantier/ChantierDetail.jsx';
import Notifications from '../pages/notification/Notifications.jsx';
import NotFound from '../pages/error/NotFound.jsx';

import PlateformeDashboard from '../pages/plateforme/PlateformeDashboard.jsx';
import PlateformeUtilisateurs from '../pages/plateforme/PlateformeUtilisateurs.jsx';
import PlateformeOrganisations from '../pages/plateforme/PlateformeOrganisations.jsx';
import PlateformeAudit from '../pages/plateforme/PlateformeAudit.jsx';

export default function AppRoutes() {
  return (
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
        <Route path="membres" element={<RoleRoute roles={ROLES_GESTION}><Membres /></RoleRoute>} />
        <Route path="equipes" element={<RoleRoute roles={ROLES_GESTION}><Equipes /></RoleRoute>} />
        <Route path="partenaires" element={<RoleRoute roles={['Admin', 'ChefProjet', 'ConducteurTravaux', 'MaitreOuvrage', 'MaitreOeuvre']}><Partenaires /></RoleRoute>} />
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
          path="plateforme/audit"
          element={
            <SuperAdminRoute>
              <PlateformeAudit />
            </SuperAdminRoute>
          }
        />
      </Route>

      {/* ---------- 404 ---------- */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
