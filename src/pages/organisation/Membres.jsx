import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, Pencil, Trash2, Upload, RefreshCw, Download, X } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Input, Select } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import {
  listerMembres, ajouterMembre, modifierMembre, supprimerMembre, importerMembres,
} from '../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, initials } from '../../utils/format.js';
import { ROLES, STATUTS_UTILISATEUR, roleLabel, enumLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';
import { validatePassword, validateIdentifiant } from '../../service/auth/authService.js';

export default function Membres() {
  const { t } = useTranslation('organisation');
  const [filters, setFilters] = useState({ search: '', role: '', statut: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const { items, total, page, setPage, loading, reload, accessDenied } = useServerList(listerMembres, {
    limit: 12,
    filterKeys: ['search', 'role', 'statut'],
    filters,
  });

  const remove = async (m) => {
    const res = await SwalCustom.confirm({ title: t('membres.supprimer.titre', { nom: `${m.prenom} ${m.nom}` }),
      text: t('messages.actionIrreversible'),
      icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerMembre(m.id);
      SwalCustom.success(t('membres.supprimer.succes'));
      reload();
    } catch (err) {
      SwalCustom.error({ title: t('membres.supprimer.erreur'), text: getErrorMessage(err) });
    }
  };

  return (
    <>
      <PageHeader title={t('membres.titre')} subtitle={t('membres.sousTitre', { count: total })}>
        <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Upload size={16} /> {t('actions.importer')}</button>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><UserPlus size={16} /> {t('membres.nouveau')}</button>
      </PageHeader>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            placeholder={t('membres.rechercher')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}><X size={14} /></button>}
        </div>
        <Select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} label="">
          <option value="">{t('membres.tousRoles')}</option>
          {Object.entries(ROLES).map(([value]) => <option key={value} value={value}>{roleLabel(value)}</option>)}
        </Select>
        <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
          <option value="">{t('membres.tousStatuts')}</option>
          {Object.entries(STATUTS_UTILISATEUR).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
        </Select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={16} /></button>
      </div>

      {accessDenied ? <AccessDeniedMessage /> : loading ? <Loading /> : items.length === 0 ? (
        <EmptyState title={t('membres.vide.titre')} message={t('membres.vide.message')} />
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th></th><th>{t('membres.colonnes.nom')}</th><th>{t('membres.colonnes.contact')}</th><th>{t('champs.role')}</th><th>{t('champs.statut')}</th><th>{t('membres.colonnes.membreDepuis')}</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id}>
                      <td style={{ width: 52 }}><div className="avatar">{m.photoProfil ? <img src={m.photoProfil} alt="" /> : initials(m.nom, m.prenom)}</div></td>
                      <td><strong>{m.prenom} {m.nom}</strong><div className="text-muted" style={{ fontSize: 12 }}>{m.fonction || '—'}</div></td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{m.email}<div>{m.telephone || ''}</div></td>
                      <td><Badge role={m.role} /></td>
                      <td><Badge statusKey={m.statut} /></td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(m.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(m)}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(m)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination total={total} page={page} limit={12} onPage={setPage} />
        </>
      )}

      <MemberModal
        open={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        member={editing}
        onSaved={reload}
      />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImported={reload} />
    </>
  );
}

function Loading() {
  const { t } = useTranslation('organisation');
  return (
    <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>{t('etats.chargement')}</div></div>
  );
}
function AccessDeniedMessage() {
  const { t } = useTranslation('organisation');
  return (
    <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>{t('membres.accesRefuse')}</div></div>
  );
}

/* ============ Création / édition ============ */
function MemberModal({ open, onClose, member, onSaved }) {
  const { t } = useTranslation('organisation');
  const isEdit = !!member;
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', fonction: '', role: 'ConducteurTravaux',
    statut: 'actif', motDePasse: '', identifiant: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (member) {
      setForm({
        nom: member.nom || '', prenom: member.prenom || '', email: member.email || '',
        telephone: member.telephone || '', fonction: member.fonction || '',
        role: member.role || 'ConducteurTravaux', statut: member.statut || 'actif',
        motDePasse: '', identifiant: member.identifiant || '',
      });
    } else {
      setForm({ nom: '', prenom: '', email: '', telephone: '', fonction: '', role: 'ConducteurTravaux', statut: 'actif', motDePasse: '', identifiant: '' });
    }
    setErrors({});
  }, [open, member]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('validation.champRequis', { champ: t('champs.nom') });
    if (!form.prenom.trim()) errs.prenom = t('validation.champRequis', { champ: t('champs.prenom') });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('validation.emailInvalide');
    if (!isEdit) {
      if (!validateIdentifiant(form.identifiant)) errs.identifiant = t('membres.modal.identifiantInvalide');
      if (!validatePassword(form.motDePasse)) errs.motDePasse = t('validation.motDePasseFaible');
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone,
        fonction: form.fonction, role: form.role, statut: form.statut,
      };
      if (isEdit) {
        await modifierMembre(member.id, payload);
        SwalCustom.success(t('membres.modal.succesModif'));
      } else {
        await ajouterMembre({ ...payload, identifiant: form.identifiant, motDePasse: form.motDePasse });
        SwalCustom.success(t('membres.modal.succesCreation'));
      }
      onClose();
      onSaved();
    } catch (err) {
      SwalCustom.error({ title: isEdit ? t('membres.modal.erreurModif') : t('membres.modal.erreurCreation'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('membres.modal.titreEdition') : t('membres.modal.titreCreation')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : isEdit ? t('actions.enregistrer') : t('actions.creer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="grid-2">
          <Input label={t('champs.nom')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
          <Input label={t('champs.prenom')} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} error={errors.prenom} required />
        </div>
        <div className="grid-2">
          <Input label={t('champs.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
          <Input label={t('champs.telephone')} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
        </div>
        <div className="grid-2">
          <Select label={t('champs.role')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {Object.entries(ROLES).map(([value]) => <option key={value} value={value}>{roleLabel(value)}</option>)}
          </Select>
          <Select label={t('champs.statut')} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
            {Object.entries(STATUTS_UTILISATEUR).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
          </Select>
        </div>
        <Input label={t('champs.fonction')} value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} />
        {!isEdit && (
          <>
            <Input label={t('membres.modal.identifiant')} value={form.identifiant} onChange={(e) => setForm({ ...form, identifiant: e.target.value })} error={errors.identifiant} hint={t('membres.modal.identifiantHint')} />
            <Input label={t('membres.modal.motDePasseInitial')} type="password" value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} error={errors.motDePasse} hint={t('membres.modal.motDePasseHint')} autoComplete="new-password" />
          </>
        )}
      </form>
    </Modal>
  );
}

/* ============ Import ============ */
function ImportModal({ open, onClose, onImported }) {
  const { t } = useTranslation('organisation');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const templateUrl = '/uploads/templates/membres.csv';

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return SwalCustom.error(t('membres.import.fichierRequis'));
    setSaving(true);
    try {
      await importerMembres(file);
      SwalCustom.success(t('membres.import.succes'));
      onClose();
      onImported();
    } catch (err) {
      SwalCustom.error({ title: t('membres.import.erreur'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('membres.import.titre')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Upload size={16} /> {t('actions.importer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="field">
          <label>{t('champs.fichier')}</label>
          <input type="file" accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files[0] || null)} />
          <div className="hint">{t('membres.import.hint')}</div>
        </div>
        <a className="btn btn-ghost btn-sm" href={templateUrl} target="_blank" rel="noreferrer"><Download size={14} /> {t('membres.import.modele')}</a>
      </form>
    </Modal>
  );
}
