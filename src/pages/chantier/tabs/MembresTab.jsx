import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { listerMembresChantier, assignerMembres, retirerMembreChantier } from '../../../service/chantier/chantierService.js';
import { listerMembres } from '../../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { initials } from '../../../utils/format.js';
import { roleLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

export default function MembresTab({ chantierId, canManage }) {
  const { t } = useTranslation('chantier');
  const [membres, setMembres] = useState([]);
  const [orgMembres, setOrgMembres] = useState([]);
  const [role, setRole] = useState('');
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerMembresChantier(chantierId);
      setMembres(d.items);
    } catch (err) {
      SwalCustom.error({ title: t('membres.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, t]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listerMembres({ limit: 100 }).then((d) => setOrgMembres(d.items)).catch(() => {});
  }, []);

  const add = async () => {
    if (!selected) return SwalCustom.error(t('membres.selectionnerMembre'));
    try {
      await assignerMembres(chantierId, { membreIds: [selected], roleChantier: role || undefined });
      SwalCustom.success(t('membres.affecte'));
      setSelected('');
      load();
    } catch (err) { SwalCustom.error({ title: t('membres.affectationImpossible'), text: getErrorMessage(err) }); }
  };

  const remove = async (m) => {
    try {
      await retirerMembreChantier(chantierId, m.id);
      SwalCustom.success(t('membres.retire'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const available = orgMembres.filter((m) => !membres.some((x) => x.id === m.id));

  return (
    <div className="card">
      <div className="card-header"><h2>{t('membres.titre', { n: membres.length })}</h2></div>
      <div className="card-body">
        {canManage && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="input" style={{ flex: 1, minWidth: 220 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">{t('commun.affecterMembre')}</option>
              {available.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom} · {roleLabel(m.role)}</option>)}
            </select>
            <input className="input" placeholder={t('membres.rolePlaceholder')} value={role} onChange={(e) => setRole(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <button className="btn btn-primary btn-sm" onClick={add}><UserPlus size={14} /> {t('membres.affecter')}</button>
          </div>
        )}

        {loading ? <p className="text-muted">{t('etats.chargement')}</p>
          : membres.length === 0 ? <EmptyState title={t('membres.videTitre')} message={t('membres.videMessage')} />
          : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th></th><th>{t('membres.colMembre')}</th><th>{t('champs.role')}</th><th>{t('membres.colRoleChantier')}</th><th></th></tr></thead>
                <tbody>
                  {membres.map((m) => (
                    <tr key={m.id}>
                      <td style={{ width: 52 }}><div className="avatar">{initials(m.prenom, m.nom)}</div></td>
                      <td><strong>{m.prenom} {m.nom}</strong></td>
                      <td><Badge role={m.role} /></td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{m.roleChantier || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {canManage && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(m)}><Trash2 size={14} /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
