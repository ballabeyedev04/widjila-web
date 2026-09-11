import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStatus } from '../service/subscription/subscriptionService.js';
import { useUser } from './useUser.js';

const SubscriptionContext = createContext(null);

/**
 * Provider pour le statut d'abonnement de l'organisation connectée.
 * Expose : status, refreshStatus, isLoading
 */
export function SubscriptionProvider({ children }) {
  const { user, pretAuthentification } = useUser();
  const utilisateurId = user?.id;
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await getStatus();
      if (res) setStatus(res);
    } catch {
      // Silencieux : on garde l'ancien statut
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Statut demandé seulement pour une session ÉTABLIE.
  //
  // Il partait au montage de l'application, pour tout visiteur. Sur une page
  // publique — `/abonnement` ouverte depuis le mobile, les pages légales —
  // l'appel sans jeton recevait un 401, l'intercepteur tentait un refresh sans
  // cookie (400), puis renvoyait vers `/login` : la page d'abonnement se
  // fermait d'elle-même sous les yeux de celui qui venait payer. Attendre
  // `pretAuthentification` laisse aussi le temps à la reconnexion silencieuse
  // et au transfert de session du mobile d'aboutir.
  useEffect(() => {
    if (!pretAuthentification) return;
    if (!utilisateurId) {
      setStatus(null);
      setIsLoading(false);
      return;
    }
    refreshStatus();
  }, [pretAuthentification, utilisateurId, refreshStatus]);

  // Pas d'écoute de l'événement `storage` : il écoutait `sc_user` et `sc_at`,
  // deux clés de SESSIONstorage — propre à chaque onglet. L'événement ne se
  // déclenche jamais entre onglets pour ce stockage : l'écouteur ne faisait
  // rien, et laissait croire que le statut se synchronisait.

  return (
    <SubscriptionContext.Provider value={{ status, refreshStatus, isLoading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/** Hook pour accéder au statut d'abonnement n'importe où. */
export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription doit être utilisé dans un SubscriptionProvider');
  return ctx;
};

/** Helper pour obtenir l'info trial/abonnement formatée. */
export const getTrialDisplayInfo = (status) => {
  if (!status) return { type: 'unknown', label: '—' };
  if (status.isSubscribed) return { type: 'subscribed', label: 'Abonnement actif', plan: status.planActuel };
  if (status.trialEnded) return { type: 'expired', label: 'Essai expiré', jours: 0 };
  if (status.joursRestantsTrial !== undefined) {
    return {
      type: 'trial',
      label: 'Essai gratuit',
      jours: status.joursRestantsTrial,
      endsAt: status.trialEndsAt,
    };
  }
  return { type: 'unknown', label: '—' };
};
