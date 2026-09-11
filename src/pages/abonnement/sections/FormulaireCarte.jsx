/**
 * Le formulaire de carte bancaire.
 *
 * Extrait de `Abonnement.jsx`, qui atteignait 811 lignes en mélangeant la
 * grille publique des offres, deux fournisseurs de paiement et l'état du
 * compte. C'est le SEUL bloc qui touche Stripe : l'isoler rend visible d'un
 * coup d'œil ce qui dépend du fournisseur — et ce qui n'en dépend pas.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
// `AlertCircle`, `Loader2` et `CreditCard` étaient utilisés sans être
// importés : le formulaire levait une ReferenceError dès son premier rendu
// (l'indicateur « Préparation… » s'affiche pendant la création du
// PaymentIntent), et l'écran de paiement ne s'affichait jamais.
import { AlertCircle, CreditCard, Loader2, Shield } from 'lucide-react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';

import { estPeriodeAnnuelle, formatPrix } from '../../../utils/format.js';

/**
 * Formulaire de carte.
 *
 * Il tient son propre état d'erreur et l'affiche sous le champ : l'erreur doit
 * être à côté de ce qui l'a provoquée. Il n'expose donc PAS de `onError` au
 * parent — un tel rappel afficherait le même message une seconde fois, en
 * haut de page.
 */
export default function PaymentForm({ plan, clientSecret, onSuccess, loading }) {
  const { t } = useTranslation('plateforme');
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError(t('abonnement.stripeNonCharge'));
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError(t('abonnement.carteIntrouvable'));
      setProcessing(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElement } }
    );

    if (stripeError) {
      // Carte refusee, fonds insuffisants, 3-D Secure echoue : le message de
      // Stripe est deja precis et traduit, mieux vaut le relayer tel quel.
      setError(stripeError.message || t('abonnement.erreurPaiement'));
      setProcessing(false);
      return;
    }

    // Le statut decide, et rien d'autre. Cet ecran ne fait qu'AUTORISER le
    // debit ; c'est le webhook, cote serveur, qui activera l'abonnement.
    switch (paymentIntent?.status) {
      case 'succeeded':
      case 'processing':
        // `processing` n'est PAS un echec. Certains paiements se denouent en
        // differe : les afficher en rouge alarmait pour un debit qui aboutit.
        // On laisse le serveur trancher.
        onSuccess(paymentIntent.status);
        break;

      case 'requires_payment_method':
        // Stripe a rendu le PaymentIntent reutilisable : la carte a ete
        // refusee, une autre peut etre saisie sans tout recommencer.
        setError(t('abonnement.paiementRefuse'));
        setProcessing(false);
        break;

      default:
        // `requires_action`, `requires_confirmation`... Rien n'est perdu, mais
        // rien n'est acquis non plus : on ne promet pas.
        setError(t('abonnement.paiementNonConfirme'));
        setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-form-header">
        <Shield size={20} className="secure-icon" />
        <span>{t('abonnement.paiementSecurise')}</span>
      </div>

      <div className="payment-field">
        <label>{t('abonnement.carteBancaire')}</label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '15px',
                color: '#1e293b',
                '::placeholder': { color: '#94a3b8' },
                padding: '12px',
              },
              invalid: { color: '#ef4444', iconColor: '#ef4444' },
            },
          }}
        />
      </div>

      {error && <div className="payment-error"><AlertCircle size={14} /> {error}</div>}

      <button
        type="submit"
        className="btn btn-primary w-full btn-lg"
        // `!clientSecret` : sans intention de paiement, `confirmCardPayment`
        // n'a rien à confirmer — le bouton ne doit pas le laisser croire.
        disabled={processing || loading || !stripe || !clientSecret}
      >
        {processing ? (
          <>
            <Loader2 size={16} className="spin" /> {t('abonnement.traitement')}
          </>
        ) : loading ? (
          <>
            <Loader2 size={16} className="spin" /> {t('abonnement.preparation')}
          </>
        ) : (
          <>
            {/* Montant, devise et période de LA formule : ce bouton confirme
                un débit, il doit annoncer exactement celui-là. */}
            {t('abonnement.confirmerPaiement', {
              prix: formatPrix(plan.prix, plan.devise),
              periode: estPeriodeAnnuelle(plan.periode) ? t('abonnement.parAnCourt') : t('abonnement.parMoisCourt'),
            })}
            <CreditCard size={16} />
          </>
        )}
      </button>

      <p className="payment-hint">
        <Shield size={12} /> {t('abonnement.donneesCarteHint')}
      </p>
    </form>
  );
}
