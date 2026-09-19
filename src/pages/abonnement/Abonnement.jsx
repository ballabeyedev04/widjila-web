import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check, Loader2, AlertCircle, Shield, Zap, Users, LogIn,
  Infinity as InfinityIcon, Star,
} from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

import {
  getPlans, getStatus, getDroits, getHistorique, creerCheckoutSession, getEtatPaiement,
} from '../../service/subscription/subscriptionService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import { useSubscription } from '../../context/SubscriptionContext.jsx';
import { roleAllowed, ROLES_GESTION } from '../../utils/constants.js';
import { estPeriodeAnnuelle, formatPrix } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';
import '../../assets/css/abonnement.css';
import RecapitulatifPaiement from './sections/RecapitulatifPaiement.jsx';
import { CarteUsage, SectionHistorique } from './sections/EtatAbonnement.jsx';
import { attendreConfirmation } from '../../utils/attendreConfirmation.js';

/**
 * Attentes entre deux interrogations du serveur au retour de Stripe.
 *
 * Le webhook arrive en général dans la seconde ; les paliers suivants
 * couvrent un Stripe lent ou un serveur occupé — une trentaine de secondes
 * au total, après quoi on cesse SANS conclure : le paiement est peut-être
 * passé, l'activation pas encore visible. On le dit tel quel.
 */
const ATTENTES_VERIFICATION = [0, 1500, 2500, 3500, 5000, 6500, 8000];

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
  // Le statut GLOBAL (bandeau d'essai de la mise en page) : rafraîchi après
  // un paiement confirmé, sinon l'en-tête continuait d'annoncer l'essai.
  const { refreshStatus } = useSubscription();
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
  // Vrai pendant qu'on attend le verdict du serveur au retour de Stripe.
  const [verification, setVerification] = useState(false);
  // Message d'information (paiement annulé, en cours de vérification…) :
  // distinct de `error`, ce n'est pas une panne.
  const [info, setInfo] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  // Vrai entre le clic « Payer » et le départ vers Stripe.
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
  // donc directement le récapitulatif de CETTE formule — une fois
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

  /* ---------- Retour de Stripe Checkout ---------- */
  //
  // `?paiement=retour&session=cs_…` : l'utilisateur revient de la page de
  // paiement. Ce retour ne PROUVE rien — on y arrive aussi en tapant
  // l'adresse — et la page n'annonce donc rien d'elle-même : elle interroge
  // le serveur, que seul le webhook Stripe (signé) renseigne, jusqu'à ce que
  // la souscription soit active. Échec et annulation sont annoncés tels que
  // le serveur les connaît ; « en attente » au bout des essais est dit tel
  // quel, sans promettre.
  //
  // `?paiement=annule` : l'utilisateur a quitté Stripe par « Retour ».
  //
  // Les paramètres sont CAPTURÉS une fois, au montage : l'effet les efface
  // de l'adresse dès qu'il démarre (une actualisation ne doit pas rejouer la
  // vérification), et un effet qui dépendrait d'eux serait alors nettoyé au
  // milieu de sa propre vérification — plus rien ne s'afficherait.
  const [retour] = useState(() => (
    params.get('paiement') ? { type: params.get('paiement'), session: params.get('session') } : null
  ));
  const retourLanceRef = useRef(false);
  const monteRef = useRef(true);
  useEffect(() => {
    monteRef.current = true;
    return () => { monteRef.current = false; };
  }, []);

  const rechargerEtat = useCallback(async () => {
    const [s, d, h] = await Promise.all([
      getStatus().catch(() => null),
      getDroits().catch(() => null),
      voitLaFacturation ? getHistorique().catch(() => null) : Promise.resolve(null),
    ]);
    if (!monteRef.current) return;
    if (s) setStatus(s);
    if (d) { setDroits(d.droits || null); setUsage(d.usage || null); }
    if (h) setHistorique(h);
    refreshStatus();
  }, [voitLaFacturation, refreshStatus]);

  useEffect(() => {
    if (!retour || retourLanceRef.current || !pretAuthentification) return;
    retourLanceRef.current = true;

    // Consommé une seule fois : une actualisation de la page ne doit pas
    // relancer la vérification, ni réafficher « annulé ».
    setParams((courants) => {
      const suivants = new URLSearchParams(courants);
      suivants.delete('paiement');
      suivants.delete('session');
      return suivants;
    }, { replace: true });

    if (retour.type === 'annule') {
      setInfo(t('abonnement.retour.annule'));
      return;
    }
    if (retour.type !== 'retour' || !retour.session || !utilisateurId) return;

    setVerification(true);
    setError(null);
    setInfo(null);

    (async () => {
      let verdict = 'en_attente';
      let reseauEnPanne = false;
      const confirme = await attendreConfirmation(async () => {
        try {
          const res = await getEtatPaiement(retour.session);
          reseauEnPanne = false;
          const statut = res?.paiement?.statut;
          if (statut === 'active') { verdict = 'active'; return true; }
          if (statut === 'echec' || statut === 'annulee') { verdict = statut; return true; }
          return false;
        } catch (err) {
          reseauEnPanne = !err?.response;
          return false;
        }
      }, { attentes: ATTENTES_VERIFICATION });
      if (!monteRef.current) return;

      await rechargerEtat();
      if (!monteRef.current) return;
      setVerification(false);

      if (confirme && verdict === 'active') {
        SwalCustom.success(t('abonnement.retour.confirme'));
      } else if (verdict === 'echec') {
        setError(t('abonnement.retour.echec'));
      } else if (verdict === 'annulee') {
        setInfo(t('abonnement.retour.annule'));
      } else if (reseauEnPanne) {
        setError(t('abonnement.retour.reseau'));
      } else {
        setInfo(t('abonnement.retour.enAttente'));
      }
    })();
    // `t`, `setParams` et `rechargerEtat` sont stables ; l'effet ne doit
    // repartir que lorsque la session est tranchée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pretAuthentification, utilisateurId]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setError(null);
    setInfo(null);
  };

  /**
   * Départ vers Stripe Checkout.
   *
   * Le serveur crée la session (montant relu en base) et rend son adresse ;
   * le navigateur y va. Tout ce qui suit — carte, 3-D Secure, confirmation —
   * se passe chez Stripe, puis Stripe ramène ici avec `?paiement=retour`.
   * Le bouton est neutralisé dès le clic : deux clics ouvriraient deux
   * sessions.
   */
  const handlePayer = async () => {
    if (!selectedPlan || paymentLoading) return;
    setPaymentLoading(true);
    setError(null);
    try {
      const res = await creerCheckoutSession(selectedPlan.id);
      if (!res?.url) throw new Error(t('abonnement.recap.sessionIndisponible'));
      window.location.assign(res.url);
      // La page est en train de partir : on laisse le bouton neutralisé.
    } catch (err) {
      setError(getErrorMessage(err));
      setPaymentLoading(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedPlan(null);
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

      {/* ── Vérification du paiement au retour de Stripe ──
          Le retour n'est pas une preuve : c'est le webhook Stripe qui tranche,
          côté serveur. Sans ce bandeau, l'écran paraissait n'avoir rien fait
          pendant les quelques secondes de l'aller-retour. */}
      {verification && (
        <div className="abonnement-alert abonnement-alert-info" role="status" aria-live="polite">
          <Loader2 size={18} className="spin" /> {t('abonnement.retour.verification')}
        </div>
      )}

      {/* ── Message d'information (annulation, activation en attente) ── */}
      {info && !verification && (
        <div className="abonnement-alert abonnement-alert-info" role="status">
          <AlertCircle size={18} /> {info}
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
        /* ── Récapitulatif, puis Stripe Checkout ──
            Un SEUL moyen de paiement, sur la page hébergée par Stripe. C'est
            aussi la surface de paiement du MOBILE, qui n'encaisse rien
            lui-même et ouvre cette page dans le navigateur (voir
            `Env.abonnementUrl` côté Flutter). */
        <>
          <RecapitulatifPaiement
            plan={selectedPlan}
            payeur={user ? nomAffiche(user) : null}
            enCours={paymentLoading}
            erreur={null}
            onPayer={handlePayer}
            onRetour={handleCancelSelection}
          />
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
        </>
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
