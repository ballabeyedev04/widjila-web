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
  AlertCircle, Check, Infinity as InfinityIcon, RotateCcw, Shield, Star, Users, Zap,
} from 'lucide-react';

import EmptyState from '../../../components/EmptyState.jsx';
import Spinner from '../../../components/Spinner.jsx';
import { estPeriodeAnnuelle, formatDate, formatPrix } from '../../../utils/format.js';
import '../../../assets/css/abonnement.css';

/**
 * Icône d'une formule, choisie sur son CODE — même table que l'écran
 * Abonnement. L'identifiant est un UUID depuis que le catalogue vit en base :
 * les anciennes clés (`starter`, `business`) ne correspondaient plus à rien.
 */
function PlanIcon({ code, size = 28 }) {
  if (code === 'pro') return <Zap size={size} />;
  if (code === 'entreprise') return <InfinityIcon size={size} />;
  return <Star size={size} />;
}

/** `null` = illimité ; `-1` est l'ancienne sentinelle, encore tolérée. */
const estIllimite = (valeur) => valeur === null || valeur === undefined || valeur === -1;

/**
 * Onglet « Abonnement » de la page Organisation.
 *
 * Composant purement présentationnel : l'état et les actions vivent dans
 * Organisation() et sont reçus en props. Il ne PAIE rien : « Choisir » mène
 * à la page Abonnement, seul parcours de paiement (récapitulatif puis Stripe
 * Checkout). L'onglet portait autrefois son propre formulaire de carte —
 * deux surfaces de paiement qui divergeaient à chaque correction.
 *
 * `planDetails` : réponse de GET /abonnement/plan-details passée par
 * `versDetailsOnglet` — { isSubscribed, trialEnded, joursRestantsTrial,
 * trialEndsAt, planActuel, planActuelDetails, allPlans[] }.
 */
export default function AbonnementTab({
  planDetails, planLoading, paymentLoading, paymentError, onSelectPlan, onCancelSubscription,
}) {
  const { t } = useTranslation('organisation');
  if (planLoading && !planDetails) return <Spinner label={t('abonnement.chargement')} />;
  if (!planDetails) {
    return <EmptyState title={t('abonnement.indisponible.titre')} message={t('abonnement.indisponible.message')} />;
  }

  const { isSubscribed, trialEnded, joursRestantsTrial, trialEndsAt, planActuelDetails } = planDetails;
  const plans = planDetails.allPlans || [];

  // Période et libellés du catalogue : partagés avec l'écran Abonnement, pour
  // que les deux surfaces de paiement annoncent le même prix, à l'identique.
  const periode = (p) => (
    estPeriodeAnnuelle(p) ? t('plateforme:abonnement.parAnCourt') : t('plateforme:abonnement.parMoisCourt')
  );

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
            const estPlanActuel = Boolean(isSubscribed && planActuelDetails?.id === plan.id);
            return (
              <article key={plan.id} className={`plan-card ${plan.code === 'pro' ? 'popular' : ''}`} data-plan={plan.code}>
                {plan.code === 'pro' && <div className="plan-popular-badge">{t('abonnement.plans.populaire')}</div>}

                <div className="plan-header">
                  <div className="plan-icon-wrapper"><PlanIcon code={plan.code} /></div>
                  <h2 className="plan-name">{plan.nom}</h2>
                  <p className="plan-description">{plan.description}</p>
                </div>

                <div className="plan-price">
                  {plan.surDevis ? (
                    /* Pas de montant : afficher 0 ferait croire à une offre gratuite. */
                    <span className="plan-amount plan-amount-devis">{t('plateforme:abonnement.surDevis')}</span>
                  ) : (
                    <>
                      {/* Dans la devise de la formule, pas un « € » en dur. */}
                      <span className="plan-amount">{formatPrix(plan.prix, plan.devise)}</span>
                      <span className="plan-period">{periode(plan.periode)}</span>
                    </>
                  )}
                </div>

                <ul className="plan-features">
                  {/* Le serveur envoie des CODES (`fonctionnalites`), traduits
                      ici ; l'ancien champ `features` n'existe plus. */}
                  {(plan.fonctionnalites || []).map((code) => (
                    <li key={code}>
                      <Check size={14} className="feature-check" /> {t(`plateforme:abonnement.fonctionnalites.${code}`, { defaultValue: code })}
                    </li>
                  ))}
                </ul>

                <div className="plan-limits">
                  {plan.limiteChantiers !== 0 && (
                    <div className="limit-item">
                      <Users size={14} /> {estIllimite(plan.limiteChantiers) ? t('abonnement.plans.chantiersIllimites') : t('abonnement.plans.chantiersMax', { n: plan.limiteChantiers })}
                    </div>
                  )}
                  {plan.limiteUtilisateurs !== 0 && (
                    <div className="limit-item">
                      <Users size={14} /> {estIllimite(plan.limiteUtilisateurs) ? t('abonnement.plans.utilisateursIllimites') : t('abonnement.plans.utilisateursMax', { n: plan.limiteUtilisateurs })}
                    </div>
                  )}
                </div>

                {plan.surDevis ? (
                  /* « Sur devis » ne se paie pas en ligne : le serveur refuserait
                     l'intention de paiement. On contacte, on ne choisit pas. */
                  <a
                    className={`btn ${plan.code === 'pro' ? 'btn-accent' : 'btn-primary'} w-full btn-lg plan-cta`}
                    href="mailto:contact@widjila.com"
                  >
                    {t('plateforme:abonnement.nousContacter')}
                  </a>
                ) : (
                  <button
                    className={`btn ${plan.code === 'pro' ? 'btn-accent' : 'btn-primary'} w-full btn-lg plan-cta`}
                    onClick={() => onSelectPlan(plan)}
                    disabled={estPlanActuel || paymentLoading}
                  >
                    {estPlanActuel ? t('abonnement.plans.planActuel') : isSubscribed ? t('abonnement.plans.changer') : t('abonnement.plans.choisir')}
                  </button>
                )}
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
