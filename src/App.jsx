import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { SubscriptionProvider } from './context/SubscriptionContext.jsx';
import LanguageSync from './i18n/LanguageSync.jsx';

/**
 * Hiérarchie des providers :
 *   ErrorBoundary (filet d'erreurs global)
 *     → UserProvider (utilisateur connecté — source de vérité)
 *     → SubscriptionProvider (statut abonnement organisation)
 *       → BrowserRouter (routage)
 *         → AppRoutes
 */
export default function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <LanguageSync />
        <SubscriptionProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SubscriptionProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}
