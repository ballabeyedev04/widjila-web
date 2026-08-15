import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStatus } from '../service/subscription/subscriptionService.js';

const SubscriptionContext = createContext(null);

/**
 * Provider pour le statut d'abonnement de l'organisation connectée.
 * Expose : status, refreshStatus, isLoading
 */
export function SubscriptionProvider({ children }) {
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

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Écouter les changements de storage (ex: après paiement)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'sc_user' || e.key === 'sc_at') {
        refreshStatus();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshStatus]);

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