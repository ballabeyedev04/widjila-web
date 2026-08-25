import { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, Shield, X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Input, Select } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import {
  listerUtilisateurs, creerUtilisateurAdmin, modifierUtilisateurAdmin, changerRoleUtilisateur,
  supprimerUtilisateurAdmin, listerOrganisations,
} from '../../service/admin/adminService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, initials } from '../../utils/format.js';
import { ROLES, STATUTS_UTILISATEUR, enumLabel, roleLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';
import { validatePassword, validateIdentifiant } from '../../service/auth/authService.js';

export default function PlateformeUtilisateurs() {
  const { t } = useTranslation('plateforme');
  const [filters, setFilters] = useState({ search: '', role: '', statut: '', organisationId: '' });
  const [organisations, setOrganisations] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur,} = useServerList(listerUtilisateurs, {
    limit: 12,
    filterKeys: ['search', 'role', 'statut', 'organisationId'],
    filters,
  });

  useEffect(() => {
    listerOrganisations({ limit: 200 }).then((d) => setOrganisations(d.items)).catch(() => {});
  }, []);

  const remove = async (u) => {
    const res = await SwalCustom.confirm({ title: t('utilisateurs.confirmerSuppression', { nom: `${u.prenom} ${u.nom}` }), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerUtilisateurAdmin(u.id);
      SwalCustom.success(t('utilisateurs.supprime'));
      reload();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const changeRole = async (u, role) => {
    if (!role || role === u.role) return;
    const res = await SwalCustom.confirm({ title: t('utilisateurs.confirmerRole', { nom: `${u.prenom} ${u.nom}`, role: roleLabel(role) }), icon: 'question' });
    if (!res) return;
    try {
      await changerRoleUtilisateur(u.id, role);
      SwalCustom.success(t('utilisateurs.roleModifie'));
      reload();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <>
      <PageHeader title={t('utilisateurs.titre')} subtitle={t('utilisateurs.sousTitre', { total })}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> {t('utilisateurs.creer')}</button>
      </PageHeader>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input className="input" placeholder={t('superAdmin.recherchePlaceholder')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          {filters.search && <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}><X size={14} /></button>}
        </div>
        <Select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} label="">
          <option value="">{t('utilisateurs.filtres.tousRoles')}</option>
          {Object.entries(ROLES).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
        </Select>
        <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
          <option value="">{t('utilisateurs.filtres.tousStatuts')}</option>
          {Object.entries(STATUTS_UTILISATEUR).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
        </Select>
        <Select value={filters.organisationId} onChange={(e) => setFilters({ ...filters, organisationId: e.target.value })} label="">
          <option value="">{t('utilisateurs.filtres.toutesOrganisations')}</option>
          {organisations.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </Select>
        <button className="btn btn-ghost" onClick={reload}><RefreshCw size={16} /></button>
      </div>

      {accessDenied ? <ErrorState variante="droits" titre={t('superAdmin.accesRefuse')} message={erreur} />
        : erreur ? (
          /* Un échec de chargement n'est PAS un écran vide : sans cette
             branche, une panne réseau s'affichait « aucune donnée ». */
          <ErrorState message={erreur} onRetry={reload} />
        )
        : loading ? <SkeletonListe lignes={6} />
        : items.length === 0 ? <EmptyState title={t('utilisateurs.aucunUtilisateur')} />
        : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th></th><th>{t('utilisateurs.colonnes.utilisateur')}</th><th>{t('utilisateurs.organisation')}</th><th>{t('champs.role')}</th><th>{t('champs.statut')}</th><th>{t('utilisateurs.colonnes.inscritLe')}</th><th></th></tr></thead>
                  <tbody>
                    {items.map((u) => (
                      <tr key={u.id}>
                        <td style={{ width: 52 }}><div className="avatar">{initials(u.prenom, u.nom)}</div></td>
                        <td><strong>{u.prenom} {u.nom}</strong><div className="text-muted" style={{ fontSize: 12 }}>{u.email}</div></td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{u.organisation?.nom || '—'}</td>
                        <td>
                          <Badge role={u.role} />
                          {u.role === 'Admin' && <Shield size={13} style={{ verticalAlign: -2, marginLeft: 4 }} />}
                        </td>
                        <td><Badge statusKey={u.statut} /></td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(u.createdAt)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <select className="input" style={{ width: 150, padding: 5 }} value="" onChange={(e) => { changeRole(u, e.target.value); e.target.value = ''; }}>
                            <option value="">{t('utilisateurs.changerRole')}</option>
                            {Object.entries(ROLES).filter(([v]) => v !== u.role).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
                          </select>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(u)}><Pencil size={14} /></button>
                          <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(u)}><Trash2 size={14} /></button>
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

      <UtilisateurModal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} utilisateur={editing} organisations={organisations} onSaved={reload} />
    </>
  );
}

function UtilisateurModal({ open, onClose, utilisateur, organisations, onSaved }) {
  const { t } = useTranslation('plateforme');
  const isEdit = !!utilisateur;
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', identifiant: '', motDePasse: '', role: 'Entreprise',
    statut: 'actif', organisationId: '', fonction: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (utilisateur) {
      setForm({
        nom: utilisateur.nom || '', prenom: utilisateur.prenom || '', email: utilisateur.email || '',
        identifiant: utilisateur.identifiant || '', motDePasse: '', role: utilisateur.role || 'Entreprise',
        statut: utilisateur.statut || 'actif', organisationId: utilisateur.organisationId || '', fonction: utilisateur.fonction || '',
      });
    } else {
      setForm({ nom: '', prenom: '', email: '', identifiant: '', motDePasse: '', role: 'Entreprise', statut: 'actif', organisationId: '', fonction: '' });
    }
    setErrors({});
  }, [open, utilisateur]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('utilisateurs.modal.nomRequis');
    if (!form.prenom.trim()) errs.prenom = t('utilisateurs.modal.prenomRequis');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('validation.emailInvalide');
    if (!isEdit) {
      if (!validateIdentifiant(form.identifiant)) errs.identifiant = t('utilisateurs.modal.identifiantInvalide');
      if (!validatePassword(form.motDePasse)) errs.motDePasse = t('validation.motDePasseFaible');
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = {
        nom: form.nom, prenom: form.prenom, email: form.email, fonction: form.fonction,
        role: form.role, statut: form.statut,
        // Sélecteur laissé vide → `null`, pas `''` : le schéma Joi du backend
        // attend un UUID ou `null`, et une chaîne vide échouait sur « must be a
        // valid GUID » au lieu du message métier (« sélectionnez une organisation »).
        organisationId: form.organisationId || null,
      };
      if (isEdit) {
        await modifierUtilisateurAdmin(utilisateur.id, payload);
        SwalCustom.success(t('utilisateurs.modal.succesMaj'));
      } else {
        await creerUtilisateurAdmin({ ...payload, identifiant: form.identifiant, motDePasse: form.motDePasse });
        SwalCustom.success(t('utilisateurs.modal.succesCreation'));
      }
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: isEdit ? t('utilisateurs.modal.erreurMaj') : t('utilisateurs.modal.erreurCreation'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('utilisateurs.modal.titreEdition') : t('utilisateurs.modal.titreCreation')} size="lg" footer={
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
        <Input label={t('champs.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
        <Select label={t('utilisateurs.organisation')} value={form.organisationId} onChange={(e) => setForm({ ...form, organisationId: e.target.value })} emptyOption>
          <option value="">{t('utilisateurs.modal.sansOrganisation')}</option>
          {organisations.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </Select>
        <div className="grid-2">
          <Select label={t('champs.role')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {Object.entries(ROLES).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
          </Select>
          <Select label={t('champs.statut')} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
            {Object.entries(STATUTS_UTILISATEUR).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
          </Select>
        </div>
        <Input label={t('champs.fonction')} value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} />
        {!isEdit && (
          <>
            <Input label={t('utilisateurs.modal.identifiant')} value={form.identifiant} onChange={(e) => setForm({ ...form, identifiant: e.target.value })} error={errors.identifiant} />
            <Input label={t('utilisateurs.modal.motDePasseInitial')} type="password" value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} error={errors.motDePasse} autoComplete="new-password" />
          </>
        )}
      </form>
    </Modal>
  );
}
