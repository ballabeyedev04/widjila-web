import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check, Loader2, AlertCircle, Shield, Zap, Users, LogIn,
  Infinity as InfinityIcon, Star,
} from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

import { getPlans, getStatus, getDroits, getHistorique, creerPaymentIntent } from '../../service/subscription/subscriptionService.js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import { roleAllowed, ROLES_GESTION } from '../../utils/constants.js';
import { estPeriodeAnnuelle, formatPrix } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';
import '../../assets/css/abonnement.css';
import PaymentForm from './sections/FormulaireCarte.jsx';
import { CarteUsage, SectionHistorique } from './sections/EtatAbonnement.jsx';
import { attendreConfirmation } from '../../utils/attendreConfirmation.js';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

/* ── Composant interne pour le formulaire de carte (isolé pour hooks Stripe) ── */
/**
 * Icône d'une formule, choisie sur son CODE.
 *
 * Les codes du catalogue sont administrables : une formule inconnue de cette
 * table doit garder une icône plutôt qu'un trou. `Star` sert donc de repli.
 */
function IconePlan({ code, size = 28 }) {
  if (code === 'pro') return <Zap size={size} />;
  if (code === 'entreprise') return <InfinityIcon size={size} />;
  return <Star size={size} />;
}

/** « Prénom Nom », ou l'adresse e-mail à défaut. */
const nomAffiche = (u) => [u?.prenom, u?.nom].filter(Boolean).join(' ') || u?.email || '';

/* ── Page principale ── */
export default function Abonnement() {
  const { t } = useTranslation('plateforme');
  const navigate = useNavigate();
  // La page s'affiche aussi pour un visiteur non connecté, qui doit pouvoir
  // consulter les offres avant de s'inscrire.
  const { user, pretAuthentification, transfertEchoue } = useUser();
  const utilisateurId = user?.id;
  // `?plan=<code>` : formule choisie AILLEURS — sur le mobile, qui ouvre cette
  // page dans le navigateur, ou avant une connexion. Voir la présélection.
  const [params, setParams] = useSearchParams();
  const planDemande = params.get('plan');

  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  // Vrai une fois le statut connu (ou sa demande tranchée) : la présélection
  // en dépend, pour ne jamais proposer de repayer la formule en cours.
  const [statusPret, setStatusPret] = useState(false);
  // Vrai pendant qu'on attend le verdict du serveur apres un paiement.
  const [confirmation, setConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState(null);
  // Droits et usage réels (`/abonnement/droits`) : la formule en cours, ses
  // limites, et ce qui en est consommé. Ouverts à tous les rôles connectés.
  const [droits, setDroits] = useState(null);
  const [usage, setUsage] = useState(null);
  // Historique des règlements. `null` tant qu'on ne sait pas — un tableau vide
  // signifierait « aucun paiement », ce qui n'est pas la même chose.
  const [historique, setHistorique] = useState(null);

  // Le serveur réserve l'historique ET le paiement au groupe FACTURATION :
  // l'appeler pour un autre rôle produit un 403.
  const voitLaFacturation = roleAllowed(user?.role, ROLES_GESTION);

  /* ---------- Catalogue (public) ---------- */
  useEffect(() => {
    let vivant = true;
    getPlans()
      .then((plansData) => { if (vivant) setPlans(plansData?.plans || plansData || []); })
      .catch((err) => { if (vivant) setError(getErrorMessage(err)); })
      .finally(() => { if (vivant) setLoading(false); });
    return () => { vivant = false; };
  }, []);

  /* ---------- Statut (session requise) ---------- */
  //
  // Demandé seulement une fois la session TRANCHÉE, et seulement s'il y en a
  // une. Il partait au montage, pour tout visiteur : sans jeton, 401 ; puis
  // refresh sans cookie, 400 ; puis renvoi vers `/login`. C'est exactement ce
  // que voyait quelqu'un arrivant du mobile pour payer. Attendre
  // `pretAuthentification` laisse aussi au transfert de session du mobile
  // (`UserContext`) le temps d'aboutir.
  useEffect(() => {
    if (!pretAuthentification) return undefined;
    if (!utilisateurId) {
      setStatus(null);
      setStatusPret(true);
      return undefined;
    }
    let vivant = true;
    setStatusPret(false);
    getStatus()
      .then((res) => { if (vivant) setStatus(res || null); })
      .catch(() => { if (vivant) setStatus(null); })
      .finally(() => { if (vivant) setStatusPret(true); });
    return () => { vivant = false; };
  }, [pretAuthentification, utilisateurId]);

  /* ---------- Droits, usage et règlements ---------- */
  //
  // Chargés à part de la grille des plans, et jamais bloquants : cet écran doit
  // rester consultable par un visiteur non connecté, pour qui ces trois appels
  // n'ont pas de réponse. Un échec laisse simplement la section absente.
  useEffect(() => {
    if (!pretAuthentification || !utilisateurId) return undefined;
    let vivant = true;

    getDroits()
      .then((d) => {
        if (!vivant || !d) return;
        setDroits(d.droits || null);
        setUsage(d.usage || null);
      })
      .catch(() => { /* section « Votre formule » non affichée */ });

    // Le second appel n'est PAS conditionné par un `return` anticipé : celui-ci
    // sauterait le nettoyage ci-dessous, et une réponse de `getDroits` arrivée
    // après le démontage écrirait dans un composant disparu.
    if (voitLaFacturation) {
      getHistorique()
        .then((lignes) => { if (vivant) setHistorique(lignes); })
        .catch(() => { /* section « Historique » non affichée */ });
    }

    return () => { vivant = false; };
  }, [pretAuthentification, utilisateurId, voitLaFacturation]);

  /* ---------- Présélection de la formule demandée ---------- */
  //
  // L'utilisateur a DÉJÀ choisi sa formule sur le mobile : lui redemander ici
  // de la retrouver dans la grille serait un aller-retour inutile. On ouvre
  // donc directement le formulaire de paiement de CETTE formule — une fois
  // catalogue, session et statut connus, et seulement si ce choix est payable
  // par ce compte. Sinon la grille s'affiche normalement.
  useEffect(() => {
    if (!planDemande || loading || !pretAuthentification || !statusPret) return;
    // Visiteur sans session : la demande reste dans l'adresse. Le bouton
    // « Se connecter » la transmet, et elle servira au retour.
    if (!utilisateurId) return;

    // Consommée une seule fois : « Retour aux formules » ne doit pas rouvrir
    // le paiement, ni une actualisation de la page le relancer.
    setParams((courants) => {
      const suivants = new URLSearchParams(courants);
      suivants.delete('plan');
      return suivants;
    }, { replace: true });

    const plan = plans.find((p) => p.code === planDemande);
    if (!plan || plan.surDevis || !voitLaFacturation) return;
    if (status?.isSubscribed && status.planCode === plan.code) return;
    setSelectedPlan(plan);
    setError(null);
  }, [planDemande, loading, pretAuthentification, statusPret, utilisateurId, plans, voitLaFacturation, status, setParams]);

  // Si un plan est sélectionné, créer la PaymentIntent
  useEffect(() => {
    if (!selectedPlan) {
      setClientSecret(null);
      return;
    }

    let cancelled = false;
    setPaymentLoading(true);
    creerPaymentIntent(selectedPlan.id)
      .then((res) => {
        if (!cancelled && res.clientSecret) {
          setClientSecret(res.clientSecret);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err));
          setSelectedPlan(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPaymentLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedPlan]);

  /**
   * Interroge le serveur jusqu'a ce qu'il confirme l'abonnement.
   *
   * `stripe.confirmCardPayment` rend `succeeded` des que la banque autorise le
   * debit -- mais l'abonnement, lui, n'est active que par le webhook, quelques
   * centaines de millisecondes a quelques secondes plus tard. Un seul appel a
   * `getStatus()` juste apres tombait donc presque toujours AVANT le webhook :
   * l'ecran rechargeait l'ancien statut, en silence, et celui qui venait de
   * payer ne voyait rien changer.
   *
   * Attentes croissantes plutot qu'un intervalle fixe : le cas normal se regle
   * au premier ou deuxieme essai, les suivants n'existent que pour les
   * lendemains difficiles. Une quinzaine de secondes au total, puis on renonce
   * -- sans jamais affirmer que le paiement a echoue, ce que nous ignorons.
   *
   * Pour un CHANGEMENT de formule, l'organisation était déjà abonnée :
   * `isSubscribed` seul serait vrai dès le premier essai. On attend donc que
   * la formule en cours soit celle qui vient d'être payée.
   */
  const attendreConfirmationServeur = useCallback((planCode) => attendreConfirmation(async () => {
    const res = await getStatus();
    if (res) setStatus(res);
    return Boolean(res?.isSubscribed && (!planCode || res.planCode === planCode));
  }), []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setError(null);
  };

  const handlePaymentSuccess = async () => {
    const planPaye = selectedPlan?.code;
    // Le formulaire disparait tout de suite : le debit est autorise, le
    // laisser a l'ecran inviterait a payer une seconde fois.
    setSelectedPlan(null);
    setClientSecret(null);

    setConfirmation(true);
    const actif = await attendreConfirmationServeur(planPaye);
    setConfirmation(false);

    if (actif) SwalCustom.success(t('abonnement.paiementReussi'));
    // Ni succes ni echec : le paiement est parti, l'activation n'est pas
    // encore visible. Annoncer l'un ou l'autre serait mentir.
    else SwalCustom.info(t('abonnement.paiementNonConfirme'));
  };

  const handleCancelSelection = () => {
    setSelectedPlan(null);
    setClientSecret(null);
  };

  /** Vers la connexion, avec retour ici — formule demandée comprise. */
  const allerConnexion = (planCode) => {
    const retour = planCode ? `/abonnement?plan=${encodeURIComponent(planCode)}` : '/abonnement';
    navigate('/login', { state: { retour } });
  };

  /**
   * Libellé et effet du bouton d'une formule.
   *
   * Seule la formule EN COURS est neutralisée. Toutes l'étaient dès qu'un
   * abonnement était actif : changer de formule devenait impossible ici,
   * alors que le mobile y envoie précisément pour cela — et que le serveur
   * sait remplacer la souscription en cours (voir `_activerSousVerrou`).
   */
  const boutonDuPlan = (plan) => {
    if (status?.isSubscribed && status.planCode === plan.code) {
      return { libelle: t('abonnement.planActuel'), desactive: true };
    }
    if (plan.surDevis) {
      return {
        libelle: t('abonnement.nousContacter'),
        action: () => { window.location.href = 'mailto:contact@widjila.com'; },
      };
    }
    // Session pas encore tranchée : ni « se connecter » (elle arrive peut-être
    // du mobile), ni un choix qui partirait sans jeton.
    if (!pretAuthentification) return { libelle: t('abonnement.choisirPlan'), desactive: true };
    if (!user) return { libelle: t('abonnement.seConnecterPourChoisir'), action: () => allerConnexion(plan.code) };
    // Le serveur refuserait le paiement (403) : on le dit avant, sur le bouton.
    if (!voitLaFacturation) return { libelle: t('abonnement.reserveFacturation'), desactive: true };
    return { libelle: t('abonnement.choisirPlan'), action: () => handleSelectPlan(plan) };
  };

  const periodeCourte = (periode) => (
    estPeriodeAnnuelle(periode) ? t('abonnement.parAnCourt') : t('abonnement.parMoisCourt')
  );

  const getTrialInfo = () => {
    if (!status) return null;
    if (status.isSubscribed) return { type: 'subscribed', label: t('abonnement.abonnementActif'), plan: status.planActuel };
    if (status.trialEnded) return { type: 'expired', label: t('abonnement.essaiExpire'), jours: 0 };
    if (status.joursRestantsTrial !== undefined) {
      return {
        type: 'trial',
        label: t('abonnement.essaiGratuit'),
        jours: status.joursRestantsTrial,
        endsAt: status.trialEndsAt,
      };
    }
    return null;
  };

  const trialInfo = getTrialInfo();

  if (loading) {
    return (
      <div className="abonnement-page">
        <div className="spinner-wrap"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="abonnement-page">
      {/* ── Header ── */}
      <header className="abonnement-header">
        <div>
          <h1 className="abonnement-title">{t('abonnement.titre')}</h1>
          <p className="abonnement-subtitle">
            {t('abonnement.sousTitre')}
          </p>
          {/* Qui paie : la session peut venir du mobile, ou d'une connexion
              déjà ouverte dans ce navigateur. On le montre avant tout débit. */}
          {user && (
            <p className="abonnement-subtitle">
              {t('abonnement.connecteEnTantQue', { nom: nomAffiche(user) })}
            </p>
          )}
        </div>

        {/* Badge de statut actuel */}
        <div className="abonnement-status-badge">
          {trialInfo && (
            <>
              {trialInfo.type === 'subscribed' && (
                <span className="badge badge-success">
                  <Check size={12} /> {trialInfo.label} — {trialInfo.plan || t('abonnement.planEnCours')}
                </span>
              )}
              {trialInfo.type === 'trial' && (
                <span className="badge badge-warning">
                  <Zap size={12} /> {trialInfo.label} — {t('abonnement.joursRestants', { count: trialInfo.jours })}
                </span>
              )}
              {trialInfo.type === 'expired' && (
                <span className="badge badge-danger">
                  <AlertCircle size={12} /> {trialInfo.label}
                </span>
              )}
            </>
          )}
          {!trialInfo && pretAuthentification && !user && (
            <span className="badge badge-neutral">{t('abonnement.nonConnecte')}</span>
          )}
        </div>
      </header>

      {/* ── Lien du mobile expiré ou déjà servi ──
          Sans ce message, la personne se retrouvait « non connectée » sans
          comprendre pourquoi, alors qu'elle l'était sur son téléphone. */}
      {transfertEchoue && pretAuthentification && !user && (
        <div className="abonnement-alert" role="alert">
          <AlertCircle size={18} /> {t('abonnement.transfertExpire')}
          <button type="button" className="btn btn-ghost" onClick={() => allerConnexion(planDemande)}>
            <LogIn size={14} /> {t('abonnement.seConnecter')}
          </button>
        </div>
      )}

      {/* ── Attente du verdict du serveur ──
          Le debit est autorise, l'abonnement pas encore active : c'est le
          webhook Stripe qui tranche. Sans ce bandeau, l'ecran paraissait
          n'avoir rien fait pendant les quelques secondes de l'aller-retour. */}
      {confirmation && (
        <div className="abonnement-alert" role="status" aria-live="polite">
          <Loader2 size={18} className="spin" /> {t('abonnement.confirmationEnCours')}
        </div>
      )}

      {/* ── Message d'erreur global ── */}
      {error && (
        <div className="abonnement-alert" role="alert">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* ── Votre formule : ce qu'elle permet, et ce qu'il en reste ──
          Placée AVANT la grille des offres : la première question de quelqu'un
          qui ouvre cet écran n'est pas « que proposez-vous ? » mais « où en
          suis-je ? ». */}
      <CarteUsage droits={droits} usage={usage} />

      {/* ── Historique des règlements ── */}
      {voitLaFacturation && historique && <SectionHistorique lignes={historique} />}

      {/* ── Grille des plans ── */}
      {!selectedPlan ? (
        <section className="plans-section" aria-label={t('abonnement.plansAriaLabel')}>
          <div className="plans-grid">
            {plans.map((plan) => {
              const bouton = boutonDuPlan(plan);
              return (
                <article
                  key={plan.id}
                  /* `plan.code` et non `plan.id` : depuis que le catalogue vit en
                     base, l'identifiant est un UUID. Le code (`pro`) est la clé
                     stable, celle que l'administrateur ne peut pas changer. */
                  className={`plan-card ${plan.code === 'pro' ? 'popular' : ''}`}
                  data-plan={plan.code}
                >
                  {plan.code === 'pro' && <div className="plan-popular-badge">{t('abonnement.lePlusChoisi')}</div>}

                  <div className="plan-header">
                    <div className="plan-icon-wrapper">
                      <IconePlan code={plan.code} size={28} />
                    </div>
                    <h2 className="plan-name">{plan.nom}</h2>
                    <p className="plan-description">{plan.description}</p>
                  </div>

                  <div className="plan-price">
                    {plan.surDevis ? (
                      /* « Sur devis » : pas de montant, donc pas de paiement en
                         ligne. Afficher 0 laisserait croire à une offre gratuite. */
                      <span className="plan-amount plan-amount-devis">{t('abonnement.surDevis')}</span>
                    ) : (
                      <>
                        {/* Dans la devise de la formule : un « € » en dur
                            annonçait des euros pour un tarif en francs CFA. */}
                        <span className="plan-amount">{formatPrix(plan.prix, plan.devise)}</span>
                        <span className="plan-period">{periodeCourte(plan.periode)}</span>
                      </>
                    )}
                  </div>

                  <ul className="plan-features">
                    {/* Le serveur envoie des CODES : la traduction reste côté
                        client, pour suivre la langue de l'utilisateur. */}
                    {(plan.fonctionnalites || []).map((code) => (
                      <li key={code}>
                        <Check size={14} className="feature-check" /> {t(`abonnement.fonctionnalites.${code}`, code)}
                      </li>
                    ))}
                  </ul>

                  <div className="plan-limits">
                    <div className="limit-item">
                      {/* `Users` était utilisé sans être importé : la grille
                          entière levait une ReferenceError au rendu. */}
                      <Users size={14} />{' '}
                      {/* `null` = illimité. L'ancien `-1` n'existe plus : une
                          colonne nullable dit « pas de limite » sans sentinelle. */}
                      {plan.limiteUtilisateurs == null
                        ? t('abonnement.utilisateursIllimites')
                        : t('abonnement.utilisateursMax', { n: plan.limiteUtilisateurs })}
                    </div>
                    {plan.limiteChantiers != null && (
                      <div className="limit-item">
                        <Users size={14} /> {t('abonnement.chantiersMax', { n: plan.limiteChantiers })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`btn ${plan.code === 'pro' ? 'btn-accent' : 'btn-primary'} w-full btn-lg plan-cta`}
                    onClick={bouton.action}
                    disabled={Boolean(bouton.desactive)}
                  >
                    {bouton.libelle}
                  </button>

                  {plan.surDevis && (
                    <p className="plan-devis-contact">
                      <a href="mailto:contact@widjila.com">contact@widjila.com</a>
                      {' · '}
                      <a href="tel:+33625755707">06 25 75 57 07</a>
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <p className="plans-note">
            <Shield size={14} /> {t('abonnement.notePlans')}
          </p>
        </section>
      ) : (
        /* ── Formulaire de paiement ── */
        <section className="payment-section" aria-label={t('abonnement.paiementAriaLabel')}>
          <div className="payment-header">
            <button className="btn btn-ghost" onClick={handleCancelSelection}>
              {t('abonnement.retourPlans')}
            </button>
            <div className="payment-plan-summary">
              <div className="payment-plan-icon">
                <IconePlan code={selectedPlan.code} size={24} />
              </div>
              <div>
                <strong>{selectedPlan.nom}</strong>
                <span>{formatPrix(selectedPlan.prix, selectedPlan.devise)} {periodeCourte(selectedPlan.periode)}</span>
              </div>
            </div>
          </div>

          {/* ── Paiement par carte bancaire ──
              Un SEUL moyen de paiement : la carte, via Stripe. C'est aussi la
              surface de paiement du MOBILE, qui n'encaisse rien lui-même et
              ouvre cette page dans le navigateur (voir `Env.abonnementUrl`
              côté Flutter). Les deux plateformes passent donc exactement par
              le même parcours. */}
          <div className="payment-methods">
            {/* Stripe - Carte bancaire */}
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  plan={selectedPlan}
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  loading={paymentLoading}
                />
              </Elements>
            ) : (
              <div className="stripe-unavailable">
                <AlertCircle size={32} />
                <h3>{t('abonnement.carteIndisponibleTitre')}</h3>
                <p><Trans t={t} i18nKey="abonnement.cleManquante" components={{ code: <code /> }} /></p>
                <p className="hint"><Trans t={t} i18nKey="abonnement.ajoutezCle" components={{ code: <code /> }} /></p>
              </div>
            )}
          </div>

          <p className="payment-footer-note">
            <Trans
              t={t}
              i18nKey="abonnement.conditions"
              components={{
                conditions: <Link to="#" className="auth-link" />,
                confidentialite: <Link to="#" className="auth-link" />,
              }}
            />
          </p>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="abonnement-footer">
        <p>
          <Trans
            t={t}
            i18nKey="abonnement.footerEnterprise"
            components={{ contact: <Link to="#" className="auth-link" /> }}
          />
        </p>
        <p className="copyright">{t('abonnement.copyright', { annee: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
