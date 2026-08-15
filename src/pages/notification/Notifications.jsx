import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, Megaphone, RefreshCw, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Input, Select } from '../../components/FormControls.jsx';
import { useUser } from '../../context/useUser.js';
import {
  listerNotifications, marquerLues, broadcastOrganisation, broadcastChantier,
} from '../../service/notification/notificationService.js';
import { listerChantiers } from '../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDateTime } from '../../utils/format.js';
import { ROLES_GESTION, roleAllowed, enumLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';

export default function Notifications() {
  const { t } = useTranslation('plateforme');
  const { user } = useUser();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [nonLuesCount, setNonLuesCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nonLuesOnly, setNonLuesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerNotifications({ page, limit, nonLues: nonLuesOnly });
      setItems(d.items);
      setTotal(d.total);
      setNonLuesCount(d.nonLuesCount);
    } catch (err) {
      SwalCustom.error({ title: t('notifications.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, nonLuesOnly, t]);
  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    try {
      await marquerLues();
      SwalCustom.success(t('notifications.toutesLues'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const markOne = async (id) => {
    try {
      await marquerLues([id]);
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const canBroadcast = roleAllowed(user?.role, ROLES_GESTION);

  return (
    <>
      <PageHeader title={t('notifications.titre')} subtitle={t('notifications.sousTitre', { nonLues: nonLuesCount, total })}>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} /> {t('actions.actualiser')}</button>
        <button className="btn btn-secondary" onClick={markAll}><CheckCheck size={16} /> {t('notifications.toutMarquerLu')}</button>
        {canBroadcast && <button className="btn btn-primary" onClick={() => setShowBroadcast(true)}><Megaphone size={16} /> {t('notifications.broadcast')}</button>}
      </PageHeader>

      <div className="filter-bar">
        <label className="checkbox-row">
          <input type="checkbox" checked={nonLuesOnly} onChange={(e) => { setNonLuesOnly(e.target.checked); setPage(1); }} />
          <span>{t('notifications.nonLuesUniquement')}</span>
        </label>
      </div>

      {loading ? <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('etats.chargement')}</div></div>
        : items.length === 0 ? <EmptyState title={t('notifications.aucuneTitre')} message={t('notifications.aucuneMessage')} />
        : (
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {items.map((n) => (
                  <div key={n.id} className={`notification-item ${n.lu_a ? '' : 'unread'}`} onClick={() => !n.lu_a && markOne(n.id)}>
                    <div className="notification-icon"><Bell size={16} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14 }}>
                        <strong>{n.titre}</strong> {!n.lu_a && <span className="badge badge-primary">{t('notifications.nouveau')}</span>}
                      </div>
                      <div className="text-muted" style={{ fontSize: 13 }}>{n.message}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{formatDateTime(n.createdAt)} {n.type && <Badge tone="neutral">{enumLabel(n.type, n.type)}</Badge>}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {total > limit && (
        <div className="pagination">
          <span className="pagination-info">{t('notifications.nbNotifications', { total })}</span>
          <div className="pagination-btns">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
            <button className="page-btn" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>›</button>
          </div>
        </div>
      )}

      <BroadcastModal open={showBroadcast} onClose={() => setShowBroadcast(false)} onSent={load} />
    </>
  );
}

function BroadcastModal({ open, onClose, onSent }) {
  const { t } = useTranslation('plateforme');
  const [scope, setScope] = useState('organisation'); // organisation | chantier
  const [chantiers, setChantiers] = useState([]);
  const [chantierId, setChantierId] = useState('');
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [lien, setLien] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScope('organisation'); setChantierId(''); setTitre(''); setMessage(''); setType('info'); setLien('');
    listerChantiers({ limit: 100 }).then((d) => setChantiers(d.items)).catch(() => {});
  }, [open]);

  const submit = async () => {
    if (!titre.trim() || !message.trim()) return SwalCustom.error(t('notifications.modal.titreEtMessageRequis'));
    setSaving(true);
    try {
      const body = { titre, message, type, lien: lien || undefined };
      if (scope === 'chantier') {
        if (!chantierId) return SwalCustom.error(t('notifications.modal.choisirChantier'));
        await broadcastChantier(chantierId, body);
        SwalCustom.success(t('notifications.modal.envoyeChantier'));
      } else {
        await broadcastOrganisation(body);
        SwalCustom.success(t('notifications.modal.envoyeOrganisation'));
      }
      onClose();
      onSent();
    } catch (err) { SwalCustom.error({ title: t('notifications.modal.erreurEnvoi'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('notifications.modal.titre')} size="sm" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Megaphone size={15} /> {t('notifications.modal.envoyer')}</button>
      </>
    }>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button className={`tab-btn ${scope === 'organisation' ? 'active' : ''}`} onClick={() => setScope('organisation')}><Users size={14} /> {t('notifications.modal.organisation')}</button>
        <button className={`tab-btn ${scope === 'chantier' ? 'active' : ''}`} onClick={() => setScope('chantier')}>{t('notifications.modal.chantier')}</button>
      </div>
      {scope === 'chantier' && (
        <Select label={t('notifications.modal.chantier')} value={chantierId} onChange={(e) => setChantierId(e.target.value)}>
          {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </Select>
      )}
      <Input label={t('champs.titre')} value={titre} onChange={(e) => setTitre(e.target.value)} required />
      <div className="field">
        <label>{t('notifications.modal.message')}</label>
        <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required />
      </div>
      <div className="grid-2">
        <Select label={t('champs.type')} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="info">{enumLabel('info', 'Information')}</option>
          <option value="alerte">{enumLabel('alerte', 'Alerte')}</option>
          <option value="rappel">{enumLabel('rappel', 'Rappel')}</option>
          <option value="urgent">{enumLabel('urgent', 'Urgent')}</option>
        </Select>
        <Input label={t('notifications.modal.lien')} value={lien} onChange={(e) => setLien(e.target.value)} placeholder={t('notifications.modal.lienPlaceholder')} />
      </div>
    </Modal>
  );
}
