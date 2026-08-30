import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Pencil, Trash2, X, Building2, Handshake, Briefcase } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Input, Select, Textarea } from '../../components/FormControls.jsx';
import {
  listerPartenaires, creerPartenaire, modifierPartenaire, supprimerPartenaire,
} from '../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate } from '../../utils/format.js';
import { TYPES_PARTENAIRE, enumLabel } from '../../utils/constants.js';
import { useUser } from '../../context/useUser.js';
import SwalCustom from '../../utils/swal.config.js';
import { useEnum } from '../../hooks/useEnums.js';

export default function Partenaires() {
  const typesPartenaire = useEnum('typesPartenaire');
  const { t } = useTranslation('organisation');
  const { user } = useUser();
  const canDelete = user?.role === 'ChefProjet' || user?.role === 'Admin';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerPartenaires({ search, type, limit: 50 });
      setItems(d.items);
      setTotal(d.total);
    } catch (err) {
      SwalCustom.error({ title: t('partenaires.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [search, type, t]);
  useEffect(() => { load(); }, [load]);

  const remove = async (p) => {
    const res = await SwalCustom.confirm({ title: t('partenaires.supprimer.titre', { nom: p.nom }), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerPartenaire(p.id);
      SwalCustom.success(t('partenaires.supprimer.succes'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <>
      <PageHeader title={t('partenaires.titre')} subtitle={t('partenaires.sousTitre', { count: total })}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> {t('partenaires.nouveau')}</button>
      </PageHeader>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input className="input" placeholder={t('partenaires.rechercher')} value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="icon-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} label="">
          <option value="">{t('partenaires.tousTypes')}</option>
          {typesPartenaire.map((value) => <option key={value} value={value}>{enumLabel(value, TYPES_PARTENAIRE[value])}</option>)}
        </Select>
      </div>

      {loading ? <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('etats.chargement')}</div></div>
        : items.length === 0 ? <EmptyState title={t('partenaires.vide.titre')} message={t('partenaires.vide.message')} />
        : (
          <div className="grid-2">
            {items.map((p) => (
              <div className="card" key={p.id}>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ fontSize: 16 }}><Handshake size={17} style={{ verticalAlign: -3, marginRight: 6 }} /> {p.nom}</h2>
                      <p className="text-muted" style={{ fontSize: 12.5 }}>{p.email || p.telephone || '—'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}><Pencil size={14} /></button>
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(p)}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                  <div style={{ margin: '12px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-neutral">{enumLabel(p.type, TYPES_PARTENAIRE[p.type] || p.type || '—')}</span>
                    <Badge statusKey={p.statut} />
                  </div>
                  {p.description && <p style={{ fontSize: 13 }}>{p.description}</p>}
                  <div className="text-muted" style={{ fontSize: 12 }}>{t('partenaires.ajouteLe', { date: formatDate(p.createdAt) })}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      <PartenaireModal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} partenaire={editing} onSaved={load} />
    </>
  );
}

function PartenaireModal({ open, onClose, partenaire, onSaved }) {
  const typesPartenaire = useEnum('typesPartenaire');
  const { t } = useTranslation('organisation');
  const isEdit = !!partenaire;
  const [form, setForm] = useState({ nom: '', type: 'bureau_etudes', email: '', telephone: '', adresse: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (partenaire) {
      setForm({ nom: partenaire.nom || '', type: partenaire.type || 'bureau_etudes', email: partenaire.email || '', telephone: partenaire.telephone || '', adresse: partenaire.adresse || '', description: partenaire.description || '' });
    } else {
      setForm({ nom: '', type: 'bureau_etudes', email: '', telephone: '', adresse: '', description: '' });
    }
    setErrors({});
  }, [open, partenaire]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('validation.champRequis', { champ: t('partenaires.modal.nom') });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('validation.emailInvalide');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (isEdit) {
        await modifierPartenaire(partenaire.id, form);
        SwalCustom.success(t('partenaires.modal.succesModif'));
      } else {
        await creerPartenaire(form);
        SwalCustom.success(t('partenaires.modal.succesCreation'));
      }
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: isEdit ? t('partenaires.modal.erreurModif') : t('partenaires.modal.erreurCreation'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('partenaires.modal.titreEdition') : t('partenaires.modal.titreCreation')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : isEdit ? t('actions.enregistrer') : t('actions.creer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <Input label={t('partenaires.modal.nom')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
        <Select label={t('champs.type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {typesPartenaire.map((value) => <option key={value} value={value}>{enumLabel(value, TYPES_PARTENAIRE[value])}</option>)}
        </Select>
        <div className="grid-2">
          <Input label={t('champs.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <Input label={t('champs.telephone')} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
        </div>
        <Input label={t('champs.adresse')} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
        <Textarea label={t('champs.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      </form>
    </Modal>
  );
}
