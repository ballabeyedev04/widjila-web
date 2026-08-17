import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  UserRound, Mail, Phone, Briefcase, ShieldCheck,
  Smartphone, History, MonitorSmartphone, Trash2, RefreshCw, Download, Save, UserCog, Lock,
} from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import Spinner from '../../components/Spinner.jsx';
import { Input, Select } from '../../components/FormControls.jsx';
import {
  getMe, modifierProfil, changerMotDePasse, listerSessions, revoquerSession, revoquerToutesSessions,
  listerConnexions, provisionMfa, activerMfa, desactiverMfa, exporterDonnees,
} from '../../service/account/accountService.js';
import { logout as authLogout } from '../../service/auth/authService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import { validatePassword } from '../../service/auth/authService.js';
import { formatDate, formatDateTime, initials } from '../../utils/format.js';
import { roleLabel, LANGUES } from '../../utils/constants.js';
import { applyLanguage } from '../../i18n/index.js';
import SwalCustom from '../../utils/swal.config.js';

export default function Profile() {
  const navigate = useNavigate();
  const { setUser, clearUser } = useUser();
  const { t } = useTranslation('profile');

  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [showMdp, setShowMdp] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showConnexions, setShowConnexions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await getMe();
      setProfil(me);
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label={t('chargement')} />;
  if (!profil) return <p className="text-secondary">{t('introuvable')}</p>;

  return (
    <>
      <PageHeader title={t('titre')} subtitle={t('sousTitre', { role: roleLabel(profil.role) })} />

      <div className="grid-2-panel side-fixed">
        {/* Carte identité */}
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div className="avatar lg" style={{ width: 84, height: 84, fontSize: 30, margin: '0 auto 14px' }}>
              {profil.photoProfil ? <img src={profil.photoProfil} alt="" /> : initials(profil.nom, profil.prenom)}
            </div>
            <h2 style={{ fontSize: 18 }}>{profil.prenom} {profil.nom}</h2>
            <p className="text-muted" style={{ fontSize: 12.5 }}>{profil.email}</p>
            <div style={{ margin: '14px 0', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Badge role={profil.role} />
              <Badge statusKey={profil.statut} />
            </div>
            {profil.email_verifie
              ? <span className="badge badge-success">{t('emailVerifie')}</span>
              : <span className="badge badge-warning">{t('emailNonVerifie')}</span>}
            <div style={{ display: 'grid', gap: 10, marginTop: 22, textAlign: 'left' }}>
              <button className="btn btn-primary w-full" onClick={() => setShowEdit(true)}><UserCog size={16} /> {t('boutons.modifierProfil')}</button>
              <button className="btn btn-secondary w-full" onClick={() => setShowMdp(true)}><Lock size={16} /> {t('boutons.changerMotDePasse')}</button>
              <button className="btn btn-secondary w-full" onClick={() => setShowSessions(true)}><MonitorSmartphone size={16} /> {t('boutons.sessionsActives')}</button>
              <button className="btn btn-secondary w-full" onClick={() => setShowConnexions(true)}><History size={16} /> {t('boutons.historiqueConnexions')}</button>
            </div>
          </div>
        </div>

        {/* Détails */}
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="card">
            <div className="card-header"><h2>{t('infos.titre')}</h2></div>
            <div className="card-body">
              <div className="kv-list">
                <div className="kv-item"><span className="k"><Mail size={14} style={{ verticalAlign: -2 }} /> {t('champs.email')}</span><span className="v">{profil.email}</span></div>
                <div className="kv-item"><span className="k"><Phone size={14} style={{ verticalAlign: -2 }} /> {t('champs.telephone')}</span><span className="v">{profil.telephone || '—'}</span></div>
                <div className="kv-item"><span className="k"><Briefcase size={14} style={{ verticalAlign: -2 }} /> {t('champs.fonction')}</span><span className="v">{profil.fonction || '—'}</span></div>
                <div className="kv-item"><span className="k"><UserRound size={14} style={{ verticalAlign: -2 }} /> {t('champs.langue')}</span><span className="v">{LANGUES.find((l) => l.value === profil.langue)?.label || profil.langue || '—'}</span></div>
                <div className="kv-item"><span className="k">{t('infos.derniereConnexion')}</span><span className="v">{formatDateTime(profil.dernierConnexion)}</span></div>
                <div className="kv-item"><span className="k">{t('infos.compteCreeLe')}</span><span className="v">{formatDate(profil.createdAt)}</span></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2><ShieldCheck size={18} style={{ verticalAlign: -3 }} /> {t('securite.titre')}</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <strong>{t('securite.mfaTitre')}</strong>
                  <p className="text-muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                    {profil.mfa_active ? t('securite.mfaActive') : t('securite.mfaInactive')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {profil.mfa_active
                    ? <MfaDisableButton onChanged={load} />
                    : <MfaEnableButton onChanged={load} />}
                </div>
              </div>
              <div style={{ marginTop: 16, borderTop: '1px dashed var(--border)', paddingTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                  <Download size={15} /> {t('securite.exporterDonnees')}
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                  <Trash2 size={15} /> {t('securite.supprimerCompte')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfilModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        profil={profil}
        onSaved={(u) => { setUser(u); setProfil(u); }}
      />
      <ChangePasswordModal open={showMdp} onClose={() => setShowMdp(false)} />
      <SessionsModal open={showSessions} onClose={() => setShowSessions(false)} />
      <ConnexionsModal open={showConnexions} onClose={() => setShowConnexions(false)} />
    </>
  );

  async function handleExport() {
    try {
      const data = await exporterDonnees();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mes-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
      SwalCustom.success(t('rgpd.exportSucces'));
    } catch (err) {
      SwalCustom.error({ title: t('rgpd.exportErreur'), text: getErrorMessage(err) });
    }
  }

  async function handleDelete() {
    const res = await SwalCustom.confirm({
      title: t('rgpd.suppressionTitre'),
      text: t('rgpd.suppressionTexte'),
      icon: 'warning',
      confirmText: t('rgpd.suppressionConfirmer'),
      danger: true,
    });
    if (!res) return;
    try {
      await authLogout();
      clearUser();
      SwalCustom.success(t('rgpd.suppressionSucces'));
      navigate('/login', { replace: true });
    } catch (err) {
      SwalCustom.error({ title: t('rgpd.suppressionErreur'), text: getErrorMessage(err) });
    }
  }
}

/* ============ Modale édition profil ============ */
function EditProfilModal({ open, onClose, profil, onSaved }) {
  const { t } = useTranslation('profile');
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', fonction: '', langue: 'fr' });
  const [photoProfil, setPhotoProfil] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && profil) {
      setForm({ nom: profil.nom || '', prenom: profil.prenom || '', telephone: profil.telephone || '', fonction: profil.fonction || '', langue: profil.langue || 'fr' });
      setPhotoProfil(null);
      setErrors({});
    }
  }, [open, profil]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('edition.nomRequis');
    if (!form.prenom.trim()) errs.prenom = t('edition.prenomRequis');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const data = { ...form, ...(photoProfil ? { photoProfil } : {}) };
      const result = await modifierProfil(data);
      const utilisateur = result?.utilisateur || { ...profil, ...form };
      // La langue est confirmée par le serveur : on bascule l'interface sur la
      // valeur réellement persistée, pas sur celle saisie dans le formulaire.
      applyLanguage(utilisateur.langue);
      SwalCustom.success(t('edition.succes'));
      onSaved(utilisateur);
      onClose();
    } catch (err) {
      SwalCustom.error({ title: t('edition.erreur'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('edition.titre')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Save size={16} /> {saving ? t('etats.enregistrement') : t('actions.enregistrer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="grid-2">
          <Input label={t('champs.nom')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
          <Input label={t('champs.prenom')} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} error={errors.prenom} required />
        </div>
        <div className="grid-2">
          <Input label={t('champs.telephone')} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+221 77 123 45 67" />
          <Input label={t('champs.fonction')} value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} />
        </div>
        <Select label={t('champs.langue')} value={form.langue} onChange={(e) => setForm({ ...form, langue: e.target.value })}>
          {LANGUES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </Select>
        <div className="field">
          <label>{t('edition.photoProfil')}</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhotoProfil(e.target.files[0] || null)} />
          <div className="hint">{t('edition.photoHint')}</div>
        </div>
      </form>
    </Modal>
  );
}

/* ============ Modale changement de mot de passe ============ */
function ChangePasswordModal({ open, onClose }) {
  const navigate = useNavigate();
  const { clearUser } = useUser();
  const { t } = useTranslation('profile');
  const [form, setForm] = useState({ ancien: '', nouveau: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.ancien) errs.ancien = t('motDePasse.actuelRequis');
    if (!validatePassword(form.nouveau)) errs.nouveau = t('validation.motDePasseFaible');
    if (form.nouveau !== form.confirm) errs.confirm = t('validation.motsDePasseDifferents');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await changerMotDePasse({ ancien_mot_de_passe: form.ancien, nouveau_mot_de_passe: form.nouveau });
      SwalCustom.success(t('motDePasse.succes'));
      await authLogout();
      clearUser();
      navigate('/login', { replace: true });
    } catch (err) {
      SwalCustom.error({ title: t('motDePasse.erreur'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('motDePasse.titre')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : t('motDePasse.bouton')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <Input type="password" label={t('motDePasse.actuel')} value={form.ancien} onChange={(e) => setForm({ ...form, ancien: e.target.value })} error={errors.ancien} autoComplete="current-password" />
        <Input type="password" label={t('motDePasse.nouveau')} value={form.nouveau} onChange={(e) => setForm({ ...form, nouveau: e.target.value })} error={errors.nouveau} hint={t('motDePasse.hint')} autoComplete="new-password" />
        <Input type="password" label={t('motDePasse.confirmer')} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} autoComplete="new-password" />
      </form>
    </Modal>
  );
}

/* ============ MFA ============ */
function MfaEnableButton({ onChanged }) {
  const { t } = useTranslation('profile');
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState(null);
  const [qr, setQr] = useState(null);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const openModal = async () => {
    setOpen(true);
    setProvisioning(true);
    try {
      const data = await provisionMfa();
      setSecret(data.secret);
      setQr(data.qr);
    } catch (err) {
      SwalCustom.error({ title: t('mfa.erreurSecret'), text: getErrorMessage(err) });
      setOpen(false);
    } finally {
      setProvisioning(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return SwalCustom.error(t('mfa.codeRequis'));
    setSaving(true);
    try {
      await activerMfa({ code, secret });
      SwalCustom.success(t('mfa.succesActivation'));
      setOpen(false);
      onChanged();
    } catch (err) {
      SwalCustom.error({ title: t('mfa.codeInvalide'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="btn btn-primary" onClick={openModal}><Smartphone size={16} /> {t('mfa.activer')}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('mfa.titreActivation')}>
        {provisioning ? <Spinner label={t('mfa.generation')} /> : (
          <>
            <p className="text-secondary" style={{ marginBottom: 14 }}>
              {t('mfa.instructions')}
            </p>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              {qr && <img src={qr} alt="QR code MFA" style={{ width: 180, height: 180, borderRadius: 10, border: '1px solid var(--border)' }} />}
              {secret && (
                <p style={{ fontSize: 12.5 }} className="text-muted mt-2">
                  {t('mfa.saisieManuelle')} <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{secret}</code>
                </p>
              )}
            </div>
            <form onSubmit={submit}>
              <Input label={t('mfa.code')} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" />
              <button className="btn btn-primary w-full" type="submit" disabled={saving}>{saving ? t('etats.verification') : t('mfa.boutonActiver')}</button>
            </form>
          </>
        )}
      </Modal>
    </>
  );
}

function MfaDisableButton({ onChanged }) {
  const { t } = useTranslation('profile');
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return SwalCustom.error(t('mfa.codeRequis'));
    setSaving(true);
    try {
      await desactiverMfa({ code });
      SwalCustom.success(t('mfa.succesDesactivation'));
      setOpen(false);
      onChanged();
    } catch (err) {
      SwalCustom.error({ title: t('mfa.codeInvalide'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>{t('mfa.desactiver')}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('mfa.titreDesactivation')}>
        <p className="text-secondary" style={{ marginBottom: 14 }}>{t('mfa.confirmationDesactivation')}</p>
        <form onSubmit={submit}>
          <Input label={t('mfa.code')} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" />
          <button className="btn btn-danger w-full" type="submit" disabled={saving}>{saving ? '…' : t('mfa.boutonDesactiver')}</button>
        </form>
      </Modal>
    </>
  );
}

/* ============ Sessions ============ */
function SessionsModal({ open, onClose }) {
  const { t } = useTranslation('profile');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await listerSessions();
      setSessions(data.items);
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [open]);
  useEffect(() => { load(); }, [load]);

  const revokeOne = async (id) => {
    const res = await SwalCustom.confirm({ title: t('sessions.confirmerRevocation'), icon: 'question' });
    if (!res) return;
    try {
      await revoquerSession(id);
      SwalCustom.success(t('sessions.revoquee'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const revokeAll = async () => {
    const res = await SwalCustom.confirm({ title: t('sessions.confirmerRevocationToutes'), icon: 'warning' });
    if (!res) return;
    try {
      await revoquerToutesSessions();
      SwalCustom.success(t('sessions.toutesRevoquees'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('sessions.titre')} size="lg" footer={
      <button className="btn btn-danger" onClick={revokeAll}><RefreshCw size={15} /> {t('sessions.revoquerToutes')}</button>
    }>
      {loading ? <Spinner label={t('sessions.chargement')} /> : (
        sessions.length === 0 ? <p className="text-muted">{t('sessions.aucune')}</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('champs.appareil')}</th><th>{t('champs.ip')}</th><th>{t('sessions.creeeLe')}</th><th>{t('sessions.expireLe')}</th><th></th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.appareil || s.userAgent || '—'}</td>
                    <td>{s.ip || '—'}</td>
                    <td>{formatDateTime(s.createdAt)}</td>
                    <td>{formatDateTime(s.expiresAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!s.actuelle && <button className="btn btn-ghost btn-sm" onClick={() => revokeOne(s.id)}><Trash2 size={14} /></button>}
                      {s.actuelle && <span className="badge badge-success">{t('sessions.celleCi')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Modal>
  );
}

/* ============ Historique connexions ============ */
function ConnexionsModal({ open, onClose }) {
  const { t } = useTranslation('profile');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 15;

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await listerConnexions({ page, limit });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [open, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <Modal open={open} onClose={onClose} title={t('connexions.titre', { total })} size="lg">
      {loading ? <Spinner label={t('etats.chargement')} /> : (
        items.length === 0 ? <p className="text-muted">{t('connexions.aucune')}</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('champs.date')}</th><th>{t('champs.type')}</th><th>{t('champs.statut')}</th><th>{t('champs.ip')}</th><th>{t('champs.details')}</th></tr></thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td><span className="badge badge-neutral">{c.type || '—'}</span></td>
                    <td>
                      {c.succes ? <span className="badge badge-success">{t('etats.succes')}</span> : <span className="badge badge-danger">{t('etats.echec')}</span>}
                    </td>
                    <td>{c.ip || '—'}</td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{c.motif || c.donnees?.motif || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > limit && (
              <div className="pagination">
                <span className="pagination-info">{t('connexions.total', { count: total })}</span>
                <div className="pagination-btns">
                  <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                  <button className="page-btn" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>›</button>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </Modal>
  );
}
