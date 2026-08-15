import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, MapPin, Pencil, Trash2, Copy, LayoutDashboard, Building2, FileImage,
  AlertTriangle, ClipboardCheck, FileText, Users, BarChart3, Save,
} from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import Spinner from '../../components/Spinner.jsx';
import { Input, Textarea, Select } from '../../components/FormControls.jsx';
import { useUser } from '../../context/useUser.js';
import {
  getChantier, modifierChantier, changerStatutChantier, supprimerChantier, dupliquerChantier,
} from '../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, formatBudget, toDateInputValue } from '../../utils/format.js';
import { STATUTS_CHANTIER, ROLES_PILOTAGE, roleAllowed, enumLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';
import ApercuTab from './tabs/ApercuTab.jsx';
import StructureTab from './tabs/StructureTab.jsx';
import PlansTab from './tabs/PlansTab.jsx';
import ReservesTab from './tabs/ReservesTab.jsx';
import InspectionsTab from './tabs/InspectionsTab.jsx';
import DocumentsTab from './tabs/DocumentsTab.jsx';
import RapportsTab from './tabs/RapportsTab.jsx';
import MembresTab from './tabs/MembresTab.jsx';

// L'onglet « Membres » (affectation) est réservé aux rôles gestion/encadrement.
// Le libellé de chaque onglet vient du namespace i18n `chantier` (detail.onglets.<key>).
const TABS = [
  { key: 'apercu', icon: LayoutDashboard },
  { key: 'structure', icon: Building2 },
  { key: 'plans', icon: FileImage },
  { key: 'reserves', icon: AlertTriangle },
  { key: 'inspections', icon: ClipboardCheck },
  { key: 'documents', icon: FileText },
  { key: 'rapports', icon: BarChart3 },
  { key: 'membres', icon: Users, roles: ['Admin', 'ChefProjet', 'ConducteurTravaux', 'MaitreOuvrage', 'MaitreOeuvre'] },
];

// Onglets visibles selon le rôle de l'utilisateur connecté.
const tabsPourRole = (role) => TABS.filter((t) => !t.roles || roleAllowed(role, t.roles));

export default function ChantierDetail() {
  const { t } = useTranslation('chantier');
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [chantier, setChantier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('apercu');
  const [showEdit, setShowEdit] = useState(false);
  const [showStatut, setShowStatut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getChantier(id);
      setChantier(c);
    } catch (err) {
      SwalCustom.error({ title: t('detail.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [id, t]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label={t('detail.chargement')} />;
  if (!chantier) return <p className="text-secondary">{t('detail.introuvable')}</p>;

  // Gestion opérationnelle : Chef de projet, Conducteur de travaux, Maître d'œuvre.
  const canManage = ['ChefProjet', 'ConducteurTravaux', 'MaitreOeuvre'].includes(user?.role);
  // Pilotage / validation (changer le statut d'un chantier) : le MOA et le BC valident.
  const canPilot = roleAllowed(user?.role, ROLES_PILOTAGE);
  // Suppression réservée au chef de projet (et à l'admin).
  const canDelete = user?.role === 'ChefProjet' || user?.role === 'Admin';
  // Affecter/retirer des membres : Chef de projet ou Maître d'œuvre (backend).
  const canAssign = ['ChefProjet', 'MaitreOeuvre', 'Admin'].includes(user?.role);

  // Onglets accessibles au rôle connecté (l'Admin voit tout).
  const tabs = tabsPourRole(user?.role);
  const activeTab = tabs.some((x) => x.key === tab) ? tab : 'apercu';

  const remove = async () => {
    const res = await SwalCustom.confirm({ title: t('detail.supprimerTitre', { nom: chantier.nom }),
      text: t('messages.actionIrreversible'),
      icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerChantier(chantier.id);
      SwalCustom.success(t('detail.supprime'));
      navigate('/chantiers', { replace: true });
    } catch (err) { SwalCustom.error({ title: t('commun.suppressionImpossible'), text: getErrorMessage(err) }); }
  };

  const duplicate = async () => {
    const res = await SwalCustom.confirm({ title: t('detail.dupliquerTitre', { nom: chantier.nom }),
      text: t('detail.dupliquerTexte'),
      icon: 'question' });
    if (!res) return;
    try {
      const c = await dupliquerChantier(chantier.id);
      SwalCustom.success(t('detail.duplique'));
      navigate(`/chantiers/${c.id}`);
    } catch (err) { SwalCustom.error({ title: t('commun.duplicationImpossible'), text: getErrorMessage(err) }); }
  };

  return (
    <>
      <PageHeader
        title={chantier.nom}
        subtitle={<span>{chantier.code || t('detail.sansCode')} <Badge statusKey={chantier.statut} /></span>}
      >
        <Link className="btn btn-secondary" to="/chantiers"><ArrowLeft size={16} /> {t('detail.tousLesChantiers')}</Link>
        {canPilot && <button className="btn btn-secondary" onClick={() => setShowStatut(true)}>{t('detail.changerStatut')}</button>}
        {canManage && (
          <>
            <button className="btn btn-primary" onClick={() => setShowEdit(true)}><Pencil size={16} /> {t('actions.modifier')}</button>
            <button className="btn btn-ghost btn-icon-only" onClick={duplicate} title={t('actions.dupliquer')}><Copy size={16} /></button>
          </>
        )}
        {canDelete && <button className="btn btn-ghost btn-icon-only btn-danger-hover" onClick={remove} title={t('actions.supprimer')}><Trash2 size={16} /></button>}
      </PageHeader>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="chip"><MapPin size={14} style={{ verticalAlign: -2 }} /> {chantier.adresse || t('detail.adresseNonRenseignee')}</span>
          <span className="chip">{t('commun.debut')} {formatDate(chantier.date_debut)}</span>
          <span className="chip">{t('commun.fin')} {formatDate(chantier.date_fin)}</span>
          {chantier.budget && <span className="chip">{t('commun.budget')} <strong>{formatBudget(chantier.budget)}</strong></span>}
          {chantier.responsable && <span className="chip">{t('detail.responsable')} <strong>{chantier.responsable.prenom} {chantier.responsable.nom}</strong></span>}
        </div>
      </div>

      <div className="tabs-bar">
        {tabs.map((x) => {
          const Icon = x.icon;
          return (
            <button key={x.key} className={`tab-btn ${activeTab === x.key ? 'active' : ''}`} onClick={() => setTab(x.key)}>
              <Icon size={15} /> {t(`detail.onglets.${x.key}`)}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {activeTab === 'apercu' && <ApercuTab chantierId={chantier.id} chantier={chantier} />}
        {activeTab === 'structure' && <StructureTab chantierId={chantier.id} chantier={chantier} canManage={canManage} />}
        {activeTab === 'plans' && <PlansTab chantierId={chantier.id} canManage={canManage} />}
        {activeTab === 'reserves' && <ReservesTab chantierId={chantier.id} />}
        {activeTab === 'inspections' && <InspectionsTab chantierId={chantier.id} canManage={canManage} />}
        {activeTab === 'documents' && <DocumentsTab chantierId={chantier.id} canManage={canManage} />}
        {activeTab === 'rapports' && <RapportsTab chantierId={chantier.id} />}
        {activeTab === 'membres' && <MembresTab chantierId={chantier.id} canManage={canAssign} />}
      </div>

      <EditChantierModal open={showEdit} onClose={() => setShowEdit(false)} chantier={chantier} onSaved={load} />
      <StatutModal open={showStatut} onClose={() => setShowStatut(false)} chantier={chantier} onSaved={load} />
    </>
  );
}

function EditChantierModal({ open, onClose, chantier, onSaved }) {
  const { t } = useTranslation('chantier');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open || !chantier) return;
    setForm({
      nom: chantier.nom || '', code: chantier.code || '', description: chantier.description || '',
      // Ni ville ni pays : ce sont des attributs de l'organisation, pas du
      // chantier (cahier des charges, Table projects vs Table organisations).
      adresse: chantier.adresse || '',
      // snake_case : miroir du contrat de l'API (voir Chantiers.jsx)
      date_debut: toDateInputValue(chantier.date_debut), date_fin: toDateInputValue(chantier.date_fin),
      budget: chantier.budget ?? '',
    });
    setErrors({});
  }, [open, chantier]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom?.trim()) errs.nom = t('commun.nomRequis');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await modifierChantier(chantier.id, {
        nom: form.nom, code: form.code || undefined, description: form.description,
        adresse: form.adresse,
        date_debut: form.date_debut || undefined, date_fin: form.date_fin || undefined,
        budget: form.budget === '' ? undefined : Number(form.budget),
      });
      SwalCustom.success(t('detail.misAJour'));
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: t('commun.majImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('detail.modalModifier')} size="lg" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Save size={16} /> {t('actions.enregistrer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="grid-2">
          <Input label={t('commun.nom')} value={form.nom || ''} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
          <Input label={t('commun.code')} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <Textarea label={t('champs.description')} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div className="grid-2">
          <Input label={t('champs.adresse')} value={form.adresse || ''} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          <Input label={t('liste.budgetLabel')} type="number" min="0" value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        </div>
        <div className="grid-2">
          <Input label={t('champs.dateDebut')} type="date" value={form.date_debut || ''} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
          <Input label={t('champs.dateFin')} type="date" value={form.date_fin || ''} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
}

function StatutModal({ open, onClose, chantier, onSaved }) {
  const { t } = useTranslation('chantier');
  const [statut, setStatut] = useState(chantier?.statut || 'en_preparation');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setStatut(chantier?.statut || 'en_preparation'); }, [open, chantier]);

  const submit = async () => {
    if (!statut) return SwalCustom.error(t('detail.choisirStatut'));
    setSaving(true);
    try {
      await changerStatutChantier(chantier.id, { statut });
      SwalCustom.success(t('commun.statutMisAJour'));
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('detail.changerStatut')} size="sm" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : t('actions.appliquer')}</button>
      </>
    }>
      <Select label={t('champs.statut')} value={statut} onChange={(e) => setStatut(e.target.value)}>
        {Object.entries(STATUTS_CHANTIER).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
      </Select>
    </Modal>
  );
}
