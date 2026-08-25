import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Select } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import { listerAuditLogs } from '../../service/admin/adminService.js';
import { formatDateTime } from '../../utils/format.js';

export default function PlateformeAudit() {
  const { t } = useTranslation('plateforme');
  const [filters, setFilters] = useState({ action: '', cibleType: '' });

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur,} = useServerList(listerAuditLogs, {
    limit: 20,
    filterKeys: ['action', 'cibleType'],
    filters,
  });

  return (
    <>
      <PageHeader title={t('audit.titre')} subtitle={t('audit.sousTitre', { total })}>
        <button className="btn btn-secondary" onClick={reload}><RefreshCw size={16} /> {t('actions.actualiser')}</button>
      </PageHeader>

      <div className="filter-bar">
        <Select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} label="">
          <option value="">{t('audit.filtres.toutesActions')}</option>
          {['create', 'update', 'delete', 'login', 'logout', 'login_echoue', 'statut_change', 'telechargement'].map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select value={filters.cibleType} onChange={(e) => setFilters({ ...filters, cibleType: e.target.value })} label="">
          <option value="">{t('audit.filtres.tousTypes')}</option>
          {['utilisateur', 'organisation', 'chantier', 'reserve', 'inspection', 'document', 'plan', 'notification'].map((cible) => <option key={cible} value={cible}>{cible}</option>)}
        </Select>
      </div>

      {accessDenied ? <ErrorState variante="droits" titre={t('superAdmin.accesRefuse')} message={erreur} />
        : erreur ? (
          /* Un échec de chargement n'est PAS un écran vide : sans cette
             branche, une panne réseau s'affichait « aucune donnée ». */
          <ErrorState message={erreur} onRetry={reload} />
        )
        : loading ? <SkeletonListe lignes={6} />
        : items.length === 0 ? <EmptyState title={t('audit.aucunEvenement')} />
        : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('champs.date')}</th><th>{t('audit.colonnes.action')}</th><th>{t('champs.type')}</th><th>{t('audit.colonnes.utilisateur')}</th><th>{t('champs.details')}</th></tr></thead>
                  <tbody>
                    {items.map((log) => (
                      <tr key={log.id}>
                        <td className="text-muted" style={{ fontSize: 13 }}>{formatDateTime(log.createdAt)}</td>
                        <td><Badge tone={log.action === 'delete' ? 'danger' : log.action === 'create' ? 'success' : log.action === 'update' ? 'primary' : 'neutral'}>{log.action || '—'}</Badge></td>
                        <td><span className="badge badge-neutral">{log.cibleType || '—'}</span></td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{log.adminNom || log.adminEmail || '—'}</td>
                        <td className="text-muted" style={{ fontSize: 12 }}>{log.details ? JSON.stringify(log.details).slice(0, 120) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination total={total} page={page} limit={20} onPage={setPage} />
          </>
        )}
    </>
  );
}
