import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Pencil, Trash2, Copy, MapPin, ArrowRight, X, RefreshCw } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Input, Textarea, Select } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import {
  listerChantiers, creerChantier, modifierChantier, supprimerChantier, dupliquerChantier,
} from '../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, formatBudget, toDateInputValue } from '../../utils/format.js';
import { STATUTS_CHANTIER, ROLES_OPERATIONNELS, roleAllowed, enumLabel } from '../../utils/constants.js';
import { useUser } from '../../context/useUser.js';
import SwalCustom from '../../utils/swal.config.js';

export default function Chantiers() {
  const { t } = useTranslation('chantier');
  const { user } = useUser();
  const role = user?.role;
  // Gestion opérationnelle (créer/modifier/dupliquer) ; suppression réservée au chef de projet.
  const canManage = roleAllowed(role, ROLES_OPERATIONNELS);
  const canDelete = role === 'ChefProjet' || role === 'Admin';

  const [filters, setFilters] = useState({ search: '', statut: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied } = useServerList(listerChantiers, {
    limit: 12,
    filterKeys: ['search', 'statut'],
    filters,
  });

  const remove = async (c) => {
    const res = await SwalCustom.confirm({ title: t('liste.supprimerTitre', { nom: c.nom }),
      text: t('messages.actionIrreversible'),
      icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerChantier(c.id);
      SwalCustom.success(t('liste.supprime'));
      reload();
    } catch (err) { SwalCustom.error({ title: t('commun.suppressionImpossible'), text: getErrorMessage(err) }); }
  };

  const duplicate = async (c) => {
    const res = await SwalCustom.confirm({ title: t('liste.dupliquerTitre', { nom: c.nom }),
      text: t('liste.dupliquerTexte'),
      icon: 'question' });
    if (!res) return;
    try {
      await dupliquerChantier(c.id);
      SwalCustom.success(t('liste.duplique'));
      reload();
    } catch (err) { SwalCustom.error({ title: t('commun.duplicationImpossible'), text: getErrorMessage(err) }); }
  };

  return (
    <>
      <PageHeader title={t('liste.titre')} subtitle={t('liste.sousTitre', { n: total })}>
        {canManage && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> {t('liste.nouveau')}</button>}
      </PageHeader>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input className="input" placeholder={t('liste.rechercher')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          {filters.search && <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}><X size={14} /></button>}
        </div>
        <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
          <option value="">{t('commun.tousStatuts')}</option>
          {Object.entries(STATUTS_CHANTIER).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
        </Select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={16} /></button>
      </div>

      {accessDenied ? <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>{t('liste.accesRefuse')}</div></div>
        : loading ? <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>{t('etats.chargement')}</div></div>
        : items.length === 0 ? <EmptyState title={t('liste.videTitre')} message={t('liste.videMessage')} />
        : (
          <>
            <div className="grid-2">
              {items.map((c) => (
                <div className="card" key={c.id}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h2 style={{ fontSize: 17 }}><Link className="link" to={`/chantiers/${c.id}`}>{c.nom}</Link></h2>
                        {c.code && <span className="text-muted" style={{ fontSize: 12 }}>{c.code}</span>}
                      </div>
                      <Badge statusKey={c.statut} />
                    </div>
                    <p className="text-secondary" style={{ fontSize: 13, margin: '10px 0' }}>
                      {c.description || <span className="text-muted">{t('commun.aucuneDescription')}</span>}
                    </p>
                    <div className="text-muted" style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {c.adresse && <span><MapPin size={13} style={{ verticalAlign: -2 }} /> {c.adresse}</span>}
                      <span>{t('liste.dates', { debut: formatDate(c.date_debut), fin: formatDate(c.date_fin) })}</span>
                      {c.budget && <span>{t('commun.budget')} <strong>{formatBudget(c.budget)}</strong></span>}
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link className="btn btn-secondary btn-sm" to={`/chantiers/${c.id}`}>{t('liste.ouvrir')} <ArrowRight size={14} /></Link>
                      {canManage && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)} title={t('actions.modifier')}><Pencil size={14} /></button>}
                      {canManage && <button className="btn btn-ghost btn-sm" onClick={() => duplicate(c)} title={t('actions.dupliquer')}><Copy size={14} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(c)} title={t('actions.supprimer')}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination total={total} page={page} limit={12} onPage={setPage} />
          </>
        )}

      <ChantierModal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} chantier={editing} onSaved={reload} />
    </>
  );
}

function ChantierModal({ open, onClose, chantier, onSaved }) {
  const { t } = useTranslation('chantier');
  const isEdit = !!chantier;
  const [form, setForm] = useState({
    // Noms alignés sur le contrat de l'API (snake_case) : le schéma Joi valide
    // avec stripUnknown, une clé en camelCase serait retirée sans erreur.
    // Le chantier n'a ni ville ni pays : le cahier des charges (Table projects)
    // et le modèle Sequelize ne portent qu'une adresse libre. Ville et pays sont
    // des attributs de l'ORGANISATION (Table organisations : city, country).
    nom: '', code: '', description: '', adresse: '',
    date_debut: '', date_fin: '', budget: '', statut: 'en_preparation',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const reset = () => {
    if (chantier) {
      setForm({
        nom: chantier.nom || '', code: chantier.code || '', description: chantier.description || '',
        adresse: chantier.adresse || '',
        date_debut: toDateInputValue(chantier.date_debut), date_fin: toDateInputValue(chantier.date_fin),
        budget: chantier.budget ?? '', statut: chantier.statut || 'en_preparation',
      });
    } else {
      setForm({ nom: '', code: '', description: '', adresse: '', date_debut: '', date_fin: '', budget: '', statut: 'en_preparation' });
    }
    setErrors({});
  };
  useEffect(() => { if (open) reset(); }, [open, chantier]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('commun.nomRequis');
    if (form.date_debut && form.date_fin && new Date(form.date_debut) > new Date(form.date_fin)) errs.date_fin = t('liste.finApresDebut');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      nom: form.nom, code: form.code || undefined, description: form.description,
      adresse: form.adresse,
      date_debut: form.date_debut || undefined, date_fin: form.date_fin || undefined,
      budget: form.budget === '' ? undefined : Number(form.budget),
      statut: form.statut,
    };
    setSaving(true);
    try {
      if (isEdit) {
        await modifierChantier(chantier.id, payload);
        SwalCustom.success(t('liste.misAJour'));
      } else {
        await creerChantier(payload);
        SwalCustom.success(t('liste.cree'));
      }
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: isEdit ? t('commun.majImpossible') : t('commun.creationImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('liste.modalModifier') : t('liste.modalNouveau')} size="lg" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : isEdit ? t('actions.enregistrer') : t('actions.creer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="grid-2">
          <Input label={t('liste.nomChantier')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
          <Input label={t('commun.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CH-2026-001" />
        </div>
        <Textarea label={t('champs.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div className="grid-2">
          <Input label={t('champs.adresse')} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          <Input label={t('liste.budgetLabel')} type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        </div>
        <div className="grid-2">
          <Input label={t('champs.dateDebut')} type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
          <Input label={t('champs.dateFin')} type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} error={errors.date_fin} />
        </div>
        <Select label={t('champs.statut')} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
          {Object.entries(STATUTS_CHANTIER).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
        </Select>
      </form>
    </Modal>
  );
}
