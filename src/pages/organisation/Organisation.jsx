import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, MapPin, Mail, Phone, Globe, Save, Plus, Network, Pencil,
  CreditCard, Zap, Star, Infinity as InfinityIcon, Users, RotateCcw, AlertCircle, Check,
  Shield, Loader2,
} from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Spinner from '../../components/Spinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import DataTable from '../../components/table/DataTable.jsx';
import Badge from '../../components/Badge.jsx';
import { Input, Select } from '../../components/FormControls.jsx';
import {
  getOrganisation, modifierOrganisation, listerFiliales, creerFiliale, creerAgence, getOrganigramme,
} from '../../service/organisation/organisationService.js';
import { useNavigate } from 'react-router-dom';
import {
  getPlanDetails, annulerAbonnement,
} from '../../service/subscription/subscriptionService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, initials } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';
import { ROLES_GESTION, roleAllowed } from '../../utils/constants.js';
import '../../assets/css/abonnement.css';
import { useUser } from '../../context/useUser.js';
// Les chargements secondaires de cet écran n'interrompent rien en cas
// d'échec — mais ils le SIGNALENT, au lieu de laisser une liste vide
// que rien ne distingue d'une liste en panne.
import { reporter } from '../../utils/monitoring.js';
import AbonnementTab from './sections/OngletAbonnement.jsx';
import { versDetailsOnglet } from './sections/detailsAbonnement.js';

export default function Organisation() {
  const { t } = useTranslation('organisation');
  const { user } = useUser();
  const navigate = useNavigate();
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
  const [paymentLoading, setPaymentLoading] = useState(false);

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
      // `res` est `{ droits, usage, souscription, plans }`, adapté ici au
      // format de l'onglet — voir `detailsAbonnement.js`.
      const res = await getPlanDetails();
      if (res) setPlanDetails(versDetailsOnglet(res));
    } catch (err) {
      reporter(err, { source: 'Organisation/planDetails' });
    } finally {
      setPlanLoading(false);
    }
  }, [canManageOrg]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPlanDetails(); }, [loadPlanDetails]);

  /**
   * Choisir une formule ici mène à la page Abonnement, qui porte le SEUL
   * parcours de paiement (récapitulatif puis Stripe Checkout). Cet onglet
   * avait son propre formulaire de carte, copie de l'autre : deux surfaces
   * de paiement divergeaient à chaque correction, et une page qui annonçait
   * « paiement réussi » sur un simple `?payment=success` a existé ici.
   * `?plan=` ouvre directement le récapitulatif de la formule choisie.
   */
  const handleSelectPlan = (plan) => {
    navigate(`/abonnement?plan=${encodeURIComponent(plan.code)}`);
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
            {/* `flexBasis` et non `minWidth` : un plancher de 300 px déborde
                d'un téléphone de 320 px une fois les marges déduites. Une base
                flexible garde la même largeur quand il y a la place, et cède
                quand il n'y en a pas. */}
            <div className="kv-list" style={{ flex: '1 1 300px', minWidth: 0 }}>
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
              paymentLoading={paymentLoading}
              onSelectPlan={handleSelectPlan}
              onCancelSubscription={handleCancelSubscription}
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

  const colonnes = [
    {
      cle: 'avatar',
      titre: '',
      triable: false,
      recherchable: false,
      largeur: 44,
      rendu: (f) => <div className="avatar">{initials(f.nom)}</div>,
    },
    {
      cle: 'nom',
      titre: t('filiales.colonnes.nom'),
      filtre: 'texte',
      // Le nom de la maison mère entre dans la recherche : on cherche souvent
      // « toutes les agences de X », et X n'apparaît que là.
      valeur: (f) => `${f.nom ?? ''} ${f.parent?.nom ?? ''}`.trim(),
      rendu: (f) => (
        <>
          <strong>{f.nom}</strong>
          {f.parent?.nom && (
            <div className="text-muted" style={{ fontSize: 12 }}>
              {t('filiales.rattacheeA', { nom: f.parent.nom })}
            </div>
          )}
        </>
      ),
    },
    {
      cle: 'type',
      titre: t('champs.type'),
      filtre: 'select',
      options: [
        { valeur: 'filiale', label: t('filiales.type.filiale') },
        { valeur: 'agence', label: t('filiales.type.agence') },
      ],
      valeur: (f) => f.type,
      rendu: (f) => (
        <span className="badge badge-neutral">
          {f.type === 'agence' ? t('filiales.type.agence') : t('filiales.type.filiale')}
        </span>
      ),
    },
    {
      cle: 'contact',
      titre: t('filiales.colonnes.contact'),
      filtre: 'texte',
      // Téléphone ET email : la colonne n'en affiche qu'un, mais l'utilisateur
      // peut chercher par l'autre.
      valeur: (f) => `${f.telephone ?? ''} ${f.email ?? ''}`.trim(),
      rendu: (f) => <span className="text-muted" style={{ fontSize: 13 }}>{f.telephone || f.email || '—'}</span>,
    },
    {
      cle: 'statut',
      titre: t('champs.statut'),
      filtre: 'texte',
      valeur: (f) => f.statut,
      rendu: (f) => <Badge statusKey={f.statut} />,
    },
    {
      cle: 'createdAt',
      titre: t('filiales.colonnes.creeeLe'),
      valeur: (f) => (f.createdAt ? new Date(f.createdAt) : null),
      rendu: (f) => <span className="text-muted" style={{ fontSize: 13 }}>{formatDate(f.createdAt)}</span>,
    },
    {
      cle: 'actions',
      titre: '',
      triable: false,
      recherchable: false,
      alignement: 'droite',
      rendu: (f) => (f.type === 'filiale'
        ? <button className="btn btn-ghost btn-sm" onClick={() => onCreateAgence(f.id)} title={t('filiales.creerAgence')}><Plus size={14} /></button>
        : null),
    },
  ];

  return (
    <DataTable
      donnees={items ?? []}
      colonnes={colonnes}
      titreVide={t('filiales.vide.titre')}
      messageVide={t('filiales.vide.message')}
      parPage={10}
      triInitial={{ cle: 'nom', sens: 'asc' }}
    />
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
      listerFiliales().then((d) => setFiliales(d.items)).catch((err) => reporter(err, { source: 'Organisation' }));
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


