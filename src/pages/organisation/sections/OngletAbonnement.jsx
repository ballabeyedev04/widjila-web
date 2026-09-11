/**
 * L'onglet « Abonnement » du profil d'organisation.
 *
 * Extrait de `Organisation.jsx`, qui atteignait 818 lignes en mélangeant deux
 * sujets sans rapport : l'identité de l'entreprise — coordonnées, filiales,
 * organigramme — et son abonnement. Le second est le SEUL à tirer Stripe, et
 * il dispose déjà de son propre écran (`pages/abonnement/`).
 *
 * Les garder ensemble avait un coût mesurable : le SDK Stripe partait dans le
 * même morceau que le formulaire de coordonnées, et toute modification de l'un
 * obligeait à faire défiler l'autre.
 */
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, Check, CreditCard, Infinity as InfinityIcon, RotateCcw, Shield, Star, Users, Zap,
} from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';

import PaymentForm from '../../abonnement/sections/FormulaireCarte.jsx';

import Spinner from '../../../components/Spinner.jsx';
import { formatDate } from '../../../utils/format.js';
import SwalCustom from '../../../utils/swal.config.js';
import '../../../assets/css/abonnement.css';

/** Icône illustrant un plan (starter / pro / business). */
function PlanIcon({ planId, size = 28 }) {
  if (planId === 'starter') return <Star size={size} />;
  if (planId === 'pro') return <Zap size={size} />;
  if (planId === 'business') return <InfinityIcon size={size} />;
  return <CreditCard size={size} />;
}

/**
 * Onglet « Abonnement » de la page Organisation.
 *
 * Composant purement présentationnel : l'état (plan sélectionné, clientSecret,
 * chargements) et les actions vivent dans Organisation() et sont reçus en props.
 *
 * `planDetails` est le payload de GET /abonnement/plan-details :
 * { isSubscribed, trialEnded, joursRestantsTrial, trialEndsAt, planActuel,
 *   planActuelDetails, allPlans[] }
 */
export default function AbonnementTab({
  planDetails, planLoading, selectedPlan, clientSecret, paymentLoading, paymentError,
  stripePromise, onSelectPlan, onCancelSelection, onCancelSubscription, onPaymentSuccess,
}) {
  const { t } = useTranslation('organisation');
  if (planLoading && !planDetails) return <Spinner label={t('abonnement.chargement')} />;
  if (!planDetails) {
    return <EmptyState title={t('abonnement.indisponible.titre')} message={t('abonnement.indisponible.message')} />;
  }

  const { isSubscribed, trialEnded, joursRestantsTrial, trialEndsAt, planActuelDetails } = planDetails;
  const plans = planDetails.allPlans || [];

  // ── Écran de paiement (un plan est sélectionné) ────────────────────────────
  if (selectedPlan) {
    return (
      <section className="payment-section" aria-label={t('abonnement.paiement.aria')}>
        <div className="payment-header">
          <button className="btn btn-ghost" onClick={onCancelSelection}>← {t('abonnement.paiement.retourPlans')}</button>
          <div className="payment-plan-summary">
            <div className="payment-plan-icon"><PlanIcon planId={selectedPlan.id} size={24} /></div>
            <div>
              <strong>{selectedPlan.nom}</strong>
              <span>{selectedPlan.prix} {t('abonnement.paiement.parMois')}</span>
            </div>
          </div>
        </div>

        {paymentError && <div className="abonnement-alert" role="alert"><AlertCircle size={18} /> {paymentError}</div>}

        {stripePromise ? (
          <Elements stripe={stripePromise}>
            {/* Le MÊME formulaire que l'écran Abonnement. L'onglet avait le
                sien, qui traitait un paiement `processing` comme une erreur
                et divergeait de l'autre à chaque correction. */}
            <PaymentForm
              plan={selectedPlan}
              clientSecret={clientSecret}
              loading={paymentLoading}
              onSuccess={onPaymentSuccess}
            />
          </Elements>
        ) : (
          <div className="stripe-unavailable">
            <AlertCircle size={32} />
            <h3>{t('abonnement.stripeIndispo.titre')}</h3>
            <p><Trans t={t} i18nKey="abonnement.stripeIndispo.cleManquante" components={{ code: <code /> }} /></p>
            <p className="hint"><Trans t={t} i18nKey="abonnement.stripeIndispo.hint" components={{ code: <code /> }} /></p>
          </div>
        )}
      </section>
    );
  }

  // ── Écran principal : statut + choix du plan ───────────────────────────────
  return (
    <section className="plans-section" aria-label={t('abonnement.plans.aria')}>
      {/* Statut actuel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {isSubscribed ? (
          <span className="badge badge-success"><Check size={12} /> {t('abonnement.statut.actif', { plan: planActuelDetails?.nom || planDetails.planActuel || t('abonnement.statut.planEnCours') })}</span>
        ) : trialEnded ? (
          <span className="badge badge-danger"><AlertCircle size={12} /> {t('abonnement.statut.essaiExpire')}</span>
        ) : (
          <span className="badge badge-warning">
            <Zap size={12} /> {t('abonnement.statut.essai', { count: joursRestantsTrial })}
            {trialEndsAt ? ` (${t('abonnement.statut.jusquAu', { date: formatDate(trialEndsAt) })})` : ''}
          </span>
        )}

        {isSubscribed && (
          <button className="btn btn-secondary btn-sm" onClick={onCancelSubscription} disabled={paymentLoading}>
            <RotateCcw size={14} /> {t('abonnement.annuler.bouton')}
          </button>
        )}
      </div>

      {paymentError && <div className="abonnement-alert" role="alert"><AlertCircle size={18} /> {paymentError}</div>}

      {plans.length === 0 ? (
        <EmptyState title={t('abonnement.plans.aucun.titre')} message={t('abonnement.plans.aucun.message')} />
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => {
            const estPlanActuel = isSubscribed && planActuelDetails?.id === plan.id;
            return (
              <article key={plan.id} className={`plan-card ${plan.id === 'pro' ? 'popular' : ''}`} data-plan={plan.id}>
                {plan.id === 'pro' && <div className="plan-popular-badge">{t('abonnement.plans.populaire')}</div>}

                <div className="plan-header">
                  <div className="plan-icon-wrapper"><PlanIcon planId={plan.id} /></div>
                  <h2 className="plan-name">{plan.nom}</h2>
                  <p className="plan-description">{plan.description}</p>
                </div>

                <div className="plan-price">
                  <span className="plan-amount">{plan.prix}</span>
                  <span className="plan-period">{t('abonnement.plans.parMois')}</span>
                </div>

                <ul className="plan-features">
                  {(plan.features || []).map((feature, i) => (
                    <li key={i}><Check size={14} className="feature-check" /> {feature}</li>
                  ))}
                </ul>

                <div className="plan-limits">
                  {plan.limiteChantiers !== 0 && (
                    <div className="limit-item">
                      <Users size={14} /> {plan.limiteChantiers === -1 ? t('abonnement.plans.chantiersIllimites') : t('abonnement.plans.chantiersMax', { n: plan.limiteChantiers })}
                    </div>
                  )}
                  {plan.limiteUtilisateurs !== 0 && (
                    <div className="limit-item">
                      <Users size={14} /> {plan.limiteUtilisateurs === -1 ? t('abonnement.plans.utilisateursIllimites') : t('abonnement.plans.utilisateursMax', { n: plan.limiteUtilisateurs })}
                    </div>
                  )}
                </div>

                <button
                  className={`btn ${plan.id === 'pro' ? 'btn-accent' : 'btn-primary'} w-full btn-lg plan-cta`}
                  onClick={() => onSelectPlan(plan)}
                  disabled={estPlanActuel || paymentLoading}
                >
                  {estPlanActuel ? t('abonnement.plans.planActuel') : isSubscribed ? t('abonnement.plans.changer') : t('abonnement.plans.choisir')}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <p className="plans-note">
        <Shield size={14} /> {t('abonnement.plans.note')}
      </p>
    </section>
  );
}
