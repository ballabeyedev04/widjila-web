/**
 * Le récapitulatif avant paiement — la SEULE étape entre « Choisir » et la
 * page de paiement de Stripe.
 *
 * Il remplace l'ancien formulaire de carte maison (`CardElement`). Le
 * paiement lui-même se fait sur Stripe Checkout, la page hébergée par
 * Stripe : c'est elle qui collecte la carte, gère 3-D Secure, la détection
 * de fraude, les moyens de paiement locaux et les langues. Nous n'avons donc
 * plus ni clé publiable dans le navigateur, ni champ bancaire à dessiner, ni
 * cas d'erreur de carte à traduire.
 *
 * Ce composant ne fait qu'une chose : dire ce qui va être payé, par qui, et
 * annoncer la redirection. Rien de plus — pas de faux éléments bancaires,
 * pas d'argumentaire. Une page de paiement rassure par sa sobriété.
 */
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, Loader2, Lock } from 'lucide-react';

import { estPeriodeAnnuelle, formatPrix } from '../../../utils/format.js';

export default function RecapitulatifPaiement({
  plan, payeur, enCours, erreur, onPayer, onRetour,
}) {
  const { t } = useTranslation('plateforme');
  const periode = estPeriodeAnnuelle(plan.periode) ? t('abonnement.parAnCourt') : t('abonnement.parMoisCourt');

  return (
    <section className="payment-section" aria-label={t('abonnement.paiementAriaLabel')}>
      <div className="payment-header">
        <button type="button" className="btn btn-ghost" onClick={onRetour} disabled={enCours}>
          <ArrowLeft size={14} /> {t('abonnement.retourPlans')}
        </button>
      </div>

      <div className="recap-card">
        <h2 className="recap-title">{t('abonnement.recap.titre')}</h2>

        <dl className="recap-lignes">
          <div className="recap-ligne">
            <dt>{t('abonnement.recap.formule')}</dt>
            <dd>{plan.nom}</dd>
          </div>
          <div className="recap-ligne">
            <dt>{t('abonnement.recap.montant')}</dt>
            <dd><strong>{formatPrix(plan.prix, plan.devise)}</strong> {periode}</dd>
          </div>
          {payeur && (
            <div className="recap-ligne">
              <dt>{t('abonnement.recap.payeur')}</dt>
              <dd>{payeur}</dd>
            </div>
          )}
        </dl>

        <p className="recap-redirection">
          <Lock size={14} /> {t('abonnement.recap.redirection')}
        </p>

        {erreur && <div className="payment-error" role="alert">{erreur}</div>}

        <button
          type="button"
          className="btn btn-primary w-full btn-lg"
          onClick={onPayer}
          disabled={enCours}
        >
          {enCours ? (
            <><Loader2 size={16} className="spin" /> {t('abonnement.recap.redirectionEnCours')}</>
          ) : (
            <>{t('abonnement.recap.payer', { prix: formatPrix(plan.prix, plan.devise) })} <ExternalLink size={16} /></>
          )}
        </button>

        <p className="payment-hint">
          {t('abonnement.recap.mention')}
        </p>
      </div>
    </section>
  );
}
