import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, Pencil, Trash2, Upload, RefreshCw, Download, X } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { Input, Select } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import {
  listerMembres, ajouterMembre, modifierMembre, supprimerMembre, importerMembres,
} from '../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, initials } from '../../utils/format.js';
import { ROLES, STATUTS_UTILISATEUR, roleLabel, enumLabel, rolesAttribuables } from '../../utils/constants.js';
import { useUser } from '../../context/useUser.js';
import SwalCustom from '../../utils/swal.config.js';
import { validatePassword } from '../../service/auth/authService.js';
import { useEnum } from '../../hooks/useEnums.js';

export default function Membres() {
  // Rôles et statuts servis par l'API — voir hooks/useEnums.js.
  const roles = useEnum('roles');
  const statutsUtilisateur = useEnum('statutsUtilisateur');
  const { t } = useTranslation('organisation');
  const [filters, setFilters] = useState({ search: '', role: '', statut: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur,} = useServerList(listerMembres, {
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
          {roles.map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}
        </Select>
        <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
          <option value="">{t('membres.tousStatuts')}</option>
          {statutsUtilisateur.map((value) => <option key={value} value={value}>{enumLabel(value, STATUTS_UTILISATEUR[value]?.label)}</option>)}
        </Select>
        <button
          className="btn btn-ghost"
          onClick={reload}
          title={t('layout:actions.rafraichir')}
          aria-label={t('layout:actions.rafraichir')}
        ><RefreshCw size={16} /></button>
      </div>

      {/* `message` porte l'explication du serveur : un 403 ne signifie pas
          toujours « mauvais rôle » — il peut manquer la MFA, et le serveur
          le dit. */}
      {accessDenied ? <ErrorState variante="droits" titre={t('membres.accesRefuse')} message={erreur} />
        /* Un échec de chargement n'est PAS un écran vide : sans cette
           branche, une panne réseau s'affichait « aucun membre » et invitait
           à réinviter des personnes déjà présentes. */
        : erreur ? <ErrorState message={erreur} onRetry={reload} />
        : loading ? <Loading /> : items.length === 0 ? (
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

/* ============ Création / édition ============ */
function MemberModal({ open, onClose, member, onSaved }) {
  const { t } = useTranslation('organisation');
  // Le rôle du compte connecté borne les rôles proposés — voir
  // `rolesAttribuables`, miroir de la garde serveur.
  const { user } = useUser();
  const statutsUtilisateur = useEnum('statutsUtilisateur');
  const isEdit = !!member;
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', fonction: '', role: 'ConducteurTravaux',
    statut: 'actif', motDePasse: '', identifiant: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [motDePasseAuto, setMotDePasseAuto] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (member) {
      setForm({
        nom: member.nom || '', prenom: member.prenom || '', email: member.email || '',
        telephone: member.telephone || '', fonction: member.fonction || '',
        role: member.role || 'ConducteurTravaux', statut: member.statut || 'actif',
        motDePasse: '',
      });
    } else {
      setForm({ nom: '', prenom: '', email: '', telephone: '', fonction: '', role: 'ConducteurTravaux', statut: 'actif', motDePasse: '' });
    }
    // Comme sur mobile : par défaut, c'est le SERVEUR qui produit le mot de
    // passe et l'envoie au membre par courriel. Celui qui crée le compte n'a
    // aucune raison de choisir — ni de connaître — le mot de passe de
    // quelqu'un d'autre.
    setMotDePasseAuto(true);
    setErrors({});
  }, [open, member]);

  /**
   * Annonce la création — et dit au créateur ce qu'il lui reste à faire.
   *
   * Le serveur envoie les identifiants par courriel et ne renvoie le mot de
   * passe temporaire QUE si cet envoi a échoué (voir
   * `organisation.controller.js#ajouterMembre`). Deux situations opposées,
   * donc deux messages : soit le membre a reçu ses accès, soit il faut les lui
   * transmettre — et c'est la seule fois où ce mot de passe sera affiché.
   *
   * Un « Membre créé. » unique laissait le second cas sans issue : le compte
   * existait, personne ne pouvait s'y connecter.
   */
  const annoncerCreation = async (resultat) => {
    const temporaire = resultat?.motDePasseTemporaire;
    if (!temporaire) {
      SwalCustom.success(t('membres.modal.succesCreation'));
      return;
    }
    // `fire` et non `info` : les helpers de notification se referment tout
    // seuls au bout de trois secondes. Ce mot de passe ne sera plus JAMAIS
    // affiché — il doit rester à l'écran jusqu'à ce qu'on l'ait noté.
    await SwalCustom.fire({
      icon: 'warning',
      title: t('membres.modal.succesCreation'),
      text: t('membres.modal.mailNonEnvoye', { motDePasse: temporaire }),
      confirmButtonText: t('membres.modal.motDePasseNote'),
      allowOutsideClick: false,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('validation.champRequis', { champ: t('champs.nom') });
    if (!form.prenom.trim()) errs.prenom = t('validation.champRequis', { champ: t('champs.prenom') });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('validation.emailInvalide');
    // Le mot de passe n'est exigé que si l'on a choisi de le fixer soi-même.
    if (!isEdit && !motDePasseAuto && !validatePassword(form.motDePasse)) {
      errs.motDePasse = t('validation.motDePasseFaible');
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
        // `mot_de_passe` et non `motDePasse` : le schéma Joi du serveur est en
        // snake_case et valide avec `stripUnknown`. La clé camelCase envoyée
        // jusqu'ici disparaissait sans le moindre message — le mot de passe
        // saisi n'était jamais celui du compte créé, et personne ne pouvait
        // s'en apercevoir depuis l'écran.
        const resultat = await ajouterMembre({
          ...payload,
          ...(motDePasseAuto ? {} : { mot_de_passe: form.motDePasse }),
        });
        await annoncerCreation(resultat);
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
            {rolesAttribuables(user?.role).map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}
          </Select>
          <Select label={t('champs.statut')} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
            {statutsUtilisateur.map((value) => <option key={value} value={value}>{enumLabel(value, STATUTS_UTILISATEUR[value]?.label)}</option>)}
          </Select>
        </div>
        <Input label={t('champs.fonction')} value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} />
        {/* Plus de champ « Identifiant » : aucune colonne de ce nom n'existe
            côté serveur, et le schéma Joi le retirait silencieusement. On se
            connecte avec son ADRESSE E-MAIL — la demander deux fois sous deux
            noms différents ne pouvait qu'égarer. */}
        {!isEdit && (
          <>
            <label className="champ-bascule">
              <input
                type="checkbox"
                checked={motDePasseAuto}
                onChange={(e) => setMotDePasseAuto(e.target.checked)}
              />
              <span>
                <strong>{t('membres.modal.motDePasseAuto')}</strong>
                <em>{t('membres.modal.motDePasseAutoHint')}</em>
              </span>
            </label>
            {!motDePasseAuto && (
              <Input
                label={t('membres.modal.motDePasseInitial')}
                type="password"
                value={form.motDePasse}
                onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
                error={errors.motDePasse}
                hint={t('membres.modal.motDePasseHint')}
                autoComplete="new-password"
              />
            )}
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

  /**
   * Modèle CSV, fabriqué ici.
   *
   * Le lien pointait vers `/uploads/templates/membres.csv` — un fichier qui
   * n'existe nulle part, et qu'un lien nu aurait de toute façon demandé sans
   * session, sur le domaine de l'admin. Les colonnes sont celles que lit
   * réellement le serveur (`organisation.service.js#importContacts`) ; l'aide
   * annonçait « identifiant » et « mot de passe », deux colonnes ignorées — le
   * serveur génère un mot de passe provisoire pour chaque membre.
   */
  const telechargerModele = () => {
    const contenu = '\uFEFFprenom,nom,email,telephone,fonction,role\n'
      + 'Awa,Diop,awa.diop@exemple.sn,+221770000000,Conductrice de travaux,\n';
    const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'modele-membres.csv';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
          {/* CSV seulement : le serveur lit le fichier avec `csv-parse`. Un
              classeur Excel était proposé ici, et échouait en « CSV illisible ». */}
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files[0] || null)} />
          <div className="hint">{t('membres.import.hint')}</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={telechargerModele}><Download size={14} /> {t('membres.import.modele')}</button>
      </form>
    </Modal>
  );
}
