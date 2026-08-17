import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat, AlertTriangle, FileImage, ClipboardCheck, FileText, Users,
  RefreshCw, TrendingUp, ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import Spinner from '../../components/Spinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import MesChantiersCard from '../../components/MesChantiersCard.jsx';
import { statsGlobales } from '../../service/dashboard/dashboardService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatNombre } from '../../utils/format.js';
import { STATUTS_RESERVE, SEVERITES, enumLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';

export default function Dashboard() {
  const { t } = useTranslation('plateforme');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await statsGlobales();
      if (requestIdRef.current === requestId) setStats(data);
    } catch (err) {
      if (requestIdRef.current === requestId) {
        SwalCustom.error({ title: t('dashboard.erreurStats'), text: getErrorMessage(err) });
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label={t('dashboard.chargement')} />;

  if (!stats) {
    return (
      <>
        <PageHeader title={t('dashboard.titre')} subtitle={t('dashboard.sousTitre')} />
        <EmptyState title={t('dashboard.aucuneStatTitre')} message={t('dashboard.aucuneStatMessage')} />
      </>
    );
  }

  const reservesParStatut = Object.entries(stats.parStatut || {});
  const reservesParSeverite = Object.entries(stats.parSeverite || {});
  const maxStatut = Math.max(1, ...reservesParStatut.map(([, n]) => n));
  const maxSeverite = Math.max(1, ...reservesParSeverite.map(([, n]) => n));
  const totalParChantier = (stats.parChantier || []).reduce((acc, c) => acc + (c.reserves?.total || 0), 0);

  return (
    <>
      <PageHeader
        title={t('dashboard.titre')}
        subtitle={t('dashboard.sousTitre')}
      >
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} /> {t('actions.actualiser')}</button>
      </PageHeader>

      <div className="stat-grid">
        <StatCard icon={HardHat} label={t('dashboard.stats.chantiers')} value={stats.chantiers} tone="navy" />
        <StatCard icon={AlertTriangle} label={t('dashboard.stats.reservesOuvertes')} value={stats.reserves?.ouvertes} tone="orange" />
        <StatCard icon={FileImage} label={t('dashboard.stats.plans')} value={stats.plans} tone="blue" />
        <StatCard icon={ClipboardCheck} label={t('dashboard.stats.inspections')} value={stats.inspections} tone="green" />
        <StatCard icon={FileText} label={t('dashboard.stats.documents')} value={stats.documents} tone="red" />
        <StatCard icon={Users} label={t('dashboard.stats.utilisateurs')} value={stats.utilisateurs} tone="navy" />
      </div>

      <MesChantiersCard />

      <div className="grid-2-panel main-wide">
        <div className="card">
          <div className="card-header">
            <h2>{t('dashboard.reservesParStatut')}</h2>
            <span className="text-muted">{t('dashboard.auTotal', { valeur: formatNombre(stats.reserves?.total) })}</span>
          </div>
          <div className="card-body">
            {reservesParStatut.length === 0 ? (
              <p className="text-muted">{t('dashboard.aucuneReserve')}</p>
            ) : (
              reservesParStatut.map(([key, n]) => {
                const def = STATUTS_RESERVE[key] || { label: key };
                return (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span>{enumLabel(key, def.label)}</span>
                      <strong>{n}</strong>
                    </div>
                    <div style={{ height: 9, background: '#eef1f4', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${(n / maxStatut) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 5 }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>{t('dashboard.reservesParSeverite')}</h2>
          </div>
          <div className="card-body">
            {reservesParSeverite.length === 0 ? (
              <p className="text-muted">{t('dashboard.aucuneReserve')}</p>
            ) : (
              reservesParSeverite.map(([key, n]) => {
                const def = SEVERITES[key] || { label: key, tone: 'neutral' };
                const color = def.tone === 'danger' ? 'var(--danger)' : def.tone === 'warning' ? 'var(--warning)' : def.tone === 'info' ? 'var(--info)' : 'var(--text-muted)';
                return (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ textTransform: 'capitalize' }}>{enumLabel(key, def.label)}</span>
                      <strong>{n}</strong>
                    </div>
                    <div style={{ height: 9, background: '#eef1f4', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${(n / maxSeverite) * 100}%`, height: '100%', background: color, borderRadius: 5 }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">
          <h2><TrendingUp size={18} style={{ verticalAlign: -2 }} /> {t('dashboard.repartitionParChantier')}</h2>
          {totalParChantier > 0 && <span className="text-muted">{t('dashboard.nbReserves', { valeur: totalParChantier })}</span>}
        </div>
        <div className="card-body">
          {!stats.parChantier?.length ? (
            <EmptyState title={t('dashboard.aucunChantierTitre')} message={t('dashboard.aucunChantierMessage')} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('dashboard.colonnes.chantier')}</th>
                    <th>{t('champs.statut')}</th>
                    <th style={{ textAlign: 'right' }}>{t('dashboard.colonnes.reserves')}</th>
                    <th style={{ textAlign: 'right' }}>{t('dashboard.colonnes.ouvertes')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.parChantier.map((c) => (
                    <tr key={c.id || c.chantierId}>
                      <td><strong>{c.nom || t('dashboard.chantierParDefaut')}</strong></td>
                      <td>
                        <span className="badge badge-neutral">{enumLabel(c.statut, c.statut || '—')}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{c.reserves?.total ?? 0}</td>
                      <td style={{ textAlign: 'right' }}>{c.reserves?.ouvertes ?? 0}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link className="btn btn-ghost btn-sm" to={`/chantiers/${c.id}`}>
                          {t('dashboard.ouvrir')} <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
