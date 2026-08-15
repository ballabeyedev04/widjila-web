import { useEffect, useState, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  Building2, MapPin, Mail, Phone, Globe, Save, Plus, Network, Pencil,
  CreditCard, Zap, Star, Infinity as InfinityIcon, Users, RotateCcw, AlertCircle, Check,
  Shield, Loader2,
} from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Spinner from '../../components/Spinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Badge from '../../components/Badge.jsx';
import { Input, Select } from '../../components/FormControls.jsx';
import {
  getOrganisation, modifierOrganisation, listerFiliales, creerFiliale, creerAgence, getOrganigramme,
} from '../../service/organisation/organisationService.js';
import {
  getPlanDetails, creerPaymentIntent, changerPlan, annulerAbonnement,
} from '../../service/subscription/subscriptionService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, initials } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';
import { ROLES_GESTION, roleAllowed } from '../../utils/constants.js';
import '../../assets/css/abonnement.css';
import { useUser } from '../../context/useUser.js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function Organisation() {
  const { t } = useTranslation('organisation');
  const { user } = useUser();
  const canManageOrg = roleAllowed(user?.role, ROLES_GESTION);

  const [org, setOrg] = useState(null);
  const [filiales, setFiliales] = useState([]);
  const [organigramme, setOrganigramme] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('filiales'); // filiales | organigramme | abonnement

  const [showEdit, setShowEdit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState('filiale'); // filiale | agence
  const [createParentId, setCreateParentId] = useState('');

  // État pour l'onglet abonnement
  const [planDetails, setPlanDetails] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [stripePromise] = useState(() => loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, f] = await Promise.all([getOrganisation(), listerFiliales()]);
      setOrg(o);
      setFiliales(f.items);
    } catch (err) {
      SwalCustom.error({ title: t('org.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadPlanDetails = useCallback(async () => {
    if (!canManageOrg) return;
    setPlanLoading(true);
    try {
      // unwrap() a déjà déballé l'enveloppe { success, message, data } :
      // `res` EST le payload { isSubscribed, allPlans, planActuelDetails… }.
      const res = await getPlanDetails();
      if (res) setPlanDetails(res);
    } catch (err) {
      console.warn('Impossible de charger les détails du plan:', err);
    } finally {
      setPlanLoading(false);
    }
  }, [canManageOrg]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPlanDetails(); }, [loadPlanDetails]);

  // Créer PaymentIntent quand un plan est sélectionné (nouveau ou changement)
  useEffect(() => {
    if (!selectedPlan) {
      setClientSecret(null);
      return;
    }
    let cancelled = false;
    setPaymentLoading(true);
    setPaymentError(null);
    const createIntent = planDetails?.isSubscribed ? changerPlan : creerPaymentIntent;
    createIntent(selectedPlan.id)
      .then((res) => {
        if (!cancelled && res.clientSecret) {
          setClientSecret(res.clientSecret);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPaymentError(getErrorMessage(err));
          setSelectedPlan(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPaymentLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedPlan, planDetails?.isSubscribed]);

  // Écouteur pour le retour Stripe (success_url)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      SwalCustom.success(t('abonnement.paiementReussi'));
      loadPlanDetails();
      load();
      setSelectedPlan(null);
      setClientSecret(null);
    } else if (params.get('payment') === 'cancel') {
      window.history.replaceState({}, document.title, window.location.pathname);
      SwalCustom.info(t('abonnement.paiementAnnule'));
    }
  }, [load, loadPlanDetails, t]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setPaymentError(null);
  };

  const handleCancelSelection = () => {
    setSelectedPlan(null);
    setClientSecret(null);
  };

  const handleCancelSubscription = async () => {
    // SwalCustom.confirm résout un booléen (pas un objet SweetAlert) et attend
    // `confirmText`, pas `confirmButtonText`.
    const confirme = await SwalCustom.confirm({
      title: t('abonnement.annuler.titre'),
      text: t('abonnement.annuler.texte'),
      icon: 'warning',
      confirmText: t('abonnement.annuler.confirmer'),
      danger: true,
    });
    if (!confirme) return;

    setPaymentLoading(true);
    try {
      await annulerAbonnement();
      SwalCustom.success(t('abonnement.annuler.succes'));
      loadPlanDetails();
      load();
    } catch (err) {
      SwalCustom.error({ title: t('abonnement.annuler.erreur'), text: getErrorMessage(err) });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Le webhook Stripe activera l'abonnement côté serveur
    try {
      await loadPlanDetails();
      await load();
    } catch (err) {
      console.warn('Rechargement statut échoué:', err);
    }
    setSelectedPlan(null);
    setClientSecret(null);
  };

  if (loading) return <Spinner label={t('org.chargement')} />;
  if (!org) return <p className="text-secondary">{t('org.aucune')}</p>;

  return (
    <>
      <PageHeader
        title={org.nom}
        subtitle={t('org.sousTitre')}
      >
        <button className="btn btn-secondary" onClick={() => setShowEdit(true)}><Pencil size={16} /> {t('actions.modifier')}</button>
      </PageHeader>

      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="avatar lg" style={{ width: 72, height: 72, fontSize: 26 }}>
              {org.logo_url ? <img src={org.logo_url} alt="" /> : initials(org.nom)}
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h2 style={{ fontSize: 20 }}>{org.nom}</h2>
              <p className="text-muted">{org.raison_sociale || t('org.raisonSocialeNonPrecisee')}</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge statusKey={org.statut} />
                {org.abonnement && <span className="badge badge-info">{org.abonnement}</span>}
              </div>
            </div>
            <div className="kv-list" style={{ minWidth: 300 }}>
              {org.telephone && <div className="kv-item"><span className="k"><Phone size={13} /> {t('org.telCourt')}</span><span className="v">{org.telephone}</span></div>}
              {org.email && <div className="kv-item"><span className="k"><Mail size={13} /> {t('champs.email')}</span><span className="v">{org.email}</span></div>}
              {org.adresse && <div className="kv-item"><span className="k"><MapPin size={13} /> {t('champs.adresse')}</span><span className="v">{org.adresse}</span></div>}
              {(org.ville || org.pays) && (
                <div className="kv-item">
                  <span className="k"><Globe size={13} /> {t('org.localisation')}</span>
                  <span className="v">{[org.ville, org.pays].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {org.siret && <div className="kv-item"><span className="k">{t('org.champs.siret')}</span><span className="v">{org.siret}</span></div>}
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`tab-btn ${tab === 'filiales' ? 'active' : ''}`} onClick={() => setTab('filiales')}><Building2 size={15} /> {t('org.onglets.filiales')}</button>
            <button className={`tab-btn ${tab === 'organigramme' ? 'active' : ''}`} onClick={() => setTab('organigramme')}><Network size={15} /> {t('org.onglets.organigramme')}</button>
            {canManageOrg && (
              <button className={`tab-btn ${tab === 'abonnement' ? 'active' : ''}`} onClick={() => setTab('abonnement')}><CreditCard size={15} /> {t('org.onglets.abonnement')}</button>
            )}
          </div>
          {tab === 'filiales' && (
            <button className="btn btn-primary btn-sm" onClick={() => { setCreateType('filiale'); setShowCreate(true); }}><Plus size={15} /> {t('filiales.nouvelle')}</button>
          )}
        </div>
        <div className="card-body">
          {tab === 'filiales' ? (
            <FilialesList
              items={filiales}
              onCreateAgence={(parentId) => { setCreateParentId(parentId); setCreateType('agence'); setShowCreate(true); }}
            />
          ) : tab === 'organigramme' ? (
            <OrganigrammeTree data={organigramme} onLoad={() => getOrganigramme().then(setOrganigramme).catch((err) => SwalCustom.error(getErrorMessage(err)))} />
          ) : (
            <AbonnementTab
              planDetails={planDetails}
              planLoading={planLoading}
              selectedPlan={selectedPlan}
              clientSecret={clientSecret}
              paymentLoading={paymentLoading}
              paymentError={paymentError}
              stripePromise={stripePromise}
              onSelectPlan={handleSelectPlan}
              onCancelSelection={handleCancelSelection}
              onCancelSubscription={handleCancelSubscription}
              onPaymentSuccess={handlePaymentSuccess}
            />
          )}
        </div>
      </div>

      <EditOrgModal open={showEdit} onClose={() => setShowEdit(false)} org={org} onSaved={(u) => setOrg(u)} />
      <CreateEntityModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateParentId(''); }}
        type={createType}
        initialParentId={createParentId}
        onCreated={load}
      />
    </>
  );
}

function FilialesList({ items, onCreateAgence }) {
  const { t } = useTranslation('organisation');
  if (!items?.length) return <EmptyState title={t('filiales.vide.titre')} message={t('filiales.vide.message')} />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th></th><th>{t('filiales.colonnes.nom')}</th><th>{t('champs.type')}</th><th>{t('filiales.colonnes.contact')}</th><th>{t('champs.statut')}</th><th>{t('filiales.colonnes.creeeLe')}</th><th></th></tr></thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id}>
              <td style={{ width: 44 }}><div className="avatar">{initials(f.nom)}</div></td>
              <td><strong>{f.nom}</strong>{f.parent?.nom && <div className="text-muted" style={{ fontSize: 12 }}>{t('filiales.rattacheeA', { nom: f.parent.nom })}</div>}</td>
              <td><span className="badge badge-neutral">{f.type === 'agence' ? t('filiales.type.agence') : t('filiales.type.filiale')}</span></td>
              <td className="text-muted" style={{ fontSize: 13 }}>{f.telephone || f.email || '—'}</td>
              <td><Badge statusKey={f.statut} /></td>
              <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(f.createdAt)}</td>
              <td style={{ textAlign: 'right' }}>
                {f.type === 'filiale' && <button className="btn btn-ghost btn-sm" onClick={() => onCreateAgence(f.id)} title={t('filiales.creerAgence')}><Plus size={14} /></button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ORG_TYPES = {
  entreprise: { tone: 'primary' },
  filiale: { tone: 'info' },
  agence: { tone: 'neutral' },
};

function OrgNode({ entite, type, hasChildren = false }) {
  const { t } = useTranslation('organisation');
  const def = ORG_TYPES[type] || { tone: 'neutral' };
  const label = t(`organigramme.types.${type}`, { defaultValue: type });
  return (
    <div className={`org-tree-node${hasChildren ? ' has-children' : ''}`}>
      <div className="avatar">{entite.logo_url ? <img src={entite.logo_url} alt="" /> : initials(entite.nom)}</div>
      <div className="org-node-info">
        <strong>{entite.nom}</strong>
        {entite.telephone && <div className="text-muted" style={{ fontSize: 12 }}>{entite.telephone}</div>}
      </div>
      <span className={`badge badge-${def.tone}`}>{label}</span>
    </div>
  );
}

/** Arbre visuel entreprise → filiales → agences (données GET /organisation/organigramme). */
function OrganigrammeTree({ data, onLoad }) {
  const { t } = useTranslation('organisation');
  useEffect(() => { onLoad(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  if (!data?.entreprise) {
    return <EmptyState title={t('organigramme.vide.titre')} message={t('organigramme.vide.message')} />;
  }
  const { entreprise, filiales = [] } = data;

  return (
    <div className="org-tree">
      <OrgNode entite={entreprise} type="entreprise" hasChildren={filiales.length > 0} />
      {filiales.length > 0 && (
        <div className={`org-tree-children${filiales.length > 1 ? ' multi' : ''}`}>
          {filiales.map((f) => (
            <div key={f.id} className="org-tree-branch">
              <OrgNode entite={f} type="filiale" hasChildren={Boolean(f.agences?.length)} />
              {f.agences?.length > 0 && (
                <div className={`org-tree-children${f.agences.length > 1 ? ' multi' : ''}`}>
                  {f.agences.map((a) => (
                    <div key={a.id} className="org-tree-branch">
                      <OrgNode entite={a} type="agence" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditOrgModal({ open, onClose, org, onSaved }) {
  const { t } = useTranslation('organisation');
  // Champs alignés sur le cahier des charges (Table organisations) et sur le
  // schéma Joi modifierOrganisationSchema. `site_web` et `secteur_activite`
  // ont été retirés : ils n'existent ni dans le modèle ni dans le schéma, et
  // étaient donc supprimés en silence par stripUnknown.
  const [form, setForm] = useState({
    nom: '', raison_sociale: '', siret: '', num_tva: '', rccm: '', ninea: '',
    telephone: '', email: '', adresse: '', ville: '', pays: '',
  });
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && org) {
      setForm({
        nom: org.nom || '', raison_sociale: org.raison_sociale || '',
        siret: org.siret || '', num_tva: org.num_tva || '',
        rccm: org.rccm || '', ninea: org.ninea || '',
        telephone: org.telephone || '', email: org.email || '',
        adresse: org.adresse || '', ville: org.ville || '', pays: org.pays || '',
      });
      setLogo(null);
    }
  }, [open, org]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('validation.champRequis', { champ: t('org.champs.nom') });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('validation.emailInvalide');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const data = { ...form, ...(logo ? { logo } : {}) };
      const res = await modifierOrganisation(data);
      SwalCustom.success(t('org.modifier.succes'));
      onSaved(res?.organisation || org);
      onClose();
    } catch (err) {
      SwalCustom.error({ title: t('org.modifier.erreur'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('org.modifier.titre')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Save size={16} /> {t('actions.enregistrer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="grid-2">
          <Input label={t('org.champs.nom')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
          <Input label={t('org.champs.raisonSociale')} value={form.raison_sociale} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} />
        </div>
        <div className="grid-2">
          <Input label={t('org.champs.siret')} value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
          <Input label={t('org.champs.numTva')} value={form.num_tva} onChange={(e) => setForm({ ...form, num_tva: e.target.value })} />
        </div>
        <div className="grid-2">
          <Input label={t('org.champs.rccm')} value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
          <Input label={t('org.champs.ninea')} value={form.ninea} onChange={(e) => setForm({ ...form, ninea: e.target.value })} />
        </div>
        <div className="grid-2">
          <Input label={t('champs.telephone')} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
          <Input label={t('champs.email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        </div>
        <Input label={t('champs.adresse')} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
        <div className="grid-2">
          <Input label={t('org.champs.ville')} value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
          <Input label={t('org.champs.pays')} value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('org.champs.logo')}</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files[0] || null)} />
          <div className="hint">{t('org.modifier.logoHint')}</div>
        </div>
      </form>
    </Modal>
  );
}

function CreateEntityModal({ open, onClose, type, initialParentId = '', onCreated }) {
  const { t } = useTranslation('organisation');
  const [form, setForm] = useState({ nom: '', parentId: '', telephone: '', email: '' });
  const [filiales, setFiliales] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({ nom: '', parentId: initialParentId, telephone: '', email: '' });
      listerFiliales().then((d) => setFiliales(d.items)).catch(() => {});
    }
  }, [open, type, initialParentId]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('validation.champRequis', { champ: t('filiales.champs.nom') });
    if (type === 'agence' && !form.parentId) errs.parentId = t('filiales.parentRequis');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (type === 'filiale') {
        await creerFiliale({ nom: form.nom, telephone: form.telephone, email: form.email });
        SwalCustom.success(t('filiales.filialeCreee'));
      } else {
        await creerAgence({ nom: form.nom, filialeId: form.parentId, telephone: form.telephone, email: form.email });
        SwalCustom.success(t('filiales.agenceCreee'));
      }
      onClose();
      onCreated();
    } catch (err) {
      SwalCustom.error({ title: t('filiales.erreurCreation'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={type === 'filiale' ? t('filiales.nouvelle') : t('filiales.nouvelleAgence')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Plus size={16} /> {t('actions.creer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <Input label={t('filiales.champs.nom')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
        {type === 'agence' && (
          <Select label={t('filiales.champs.parent')} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} error={errors.parentId} emptyOption>
            {filiales.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </Select>
        )}
        <div className="grid-2">
          <Input label={t('champs.telephone')} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
          <Input label={t('champs.email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}

/* ============ Onglet Abonnement ============ */

/** Icône illustrant un plan (starter / pro / business). */
function PlanIcon({ planId, size = 28 }) {
  if (planId === 'starter') return <Star size={size} />;
  if (planId === 'pro') return <Zap size={size} />;
  if (planId === 'business') return <InfinityIcon size={size} />;
  return <CreditCard size={size} />;
}

/** Formulaire carte bancaire — isolé pour pouvoir utiliser les hooks Stripe. */
function AbonnementPaymentForm({ plan, clientSecret, loading, onSuccess }) {
  const { t } = useTranslation('organisation');
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError(t('abonnement.paiement.stripeNonCharge'));
      return;
    }
    if (!clientSecret) {
      setError(t('abonnement.paiement.nonInitialise'));
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError(t('abonnement.paiement.carteIntrouvable'));
      setProcessing(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElement } }
    );

    if (stripeError) {
      setError(stripeError.message || t('abonnement.paiement.erreur'));
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setError(t('abonnement.paiement.enAttente'));
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-form-header">
        <Shield size={20} className="secure-icon" />
        <span>{t('abonnement.paiement.securise')}</span>
      </div>

      <div className="payment-field">
        <label>{t('abonnement.paiement.carte')}</label>
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

      <button type="submit" className="btn btn-primary w-full btn-lg" disabled={processing || loading || !stripe}>
        {processing ? (
          <><Loader2 size={16} className="spin" /> {t('abonnement.paiement.traitement')}</>
        ) : loading ? (
          <><Loader2 size={16} className="spin" /> {t('abonnement.paiement.preparation')}</>
        ) : (
          <>{t('abonnement.paiement.confirmer', { prix: plan.prix })} <CreditCard size={16} /></>
        )}
      </button>

      <p className="payment-hint">
        <Shield size={12} /> {t('abonnement.paiement.hint')}
      </p>
    </form>
  );
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
function AbonnementTab({
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
            <AbonnementPaymentForm
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
