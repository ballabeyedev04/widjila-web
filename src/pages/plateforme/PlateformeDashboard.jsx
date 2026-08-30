import { useEffect, useState, useCallback } from 'react';
import { Building2, Users, HardHat, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import { statsPlateforme, croissanceInscriptions } from '../../service/admin/adminService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatNombre } from '../../utils/format.js';
import { enumLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';

export default function PlateformeDashboard() {
  const { t } = useTranslation('plateforme');
  const [stats, setStats] = useState(null);
  const [croissance, setCroissance] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([statsPlateforme(), croissanceInscriptions(6)]);
      setStats(s);
      setCroissance(c?.croissance || []);
    } catch (err) {
      SwalCustom.error({ title: t('superAdmin.erreurStats'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 50 }}>{t('etats.chargement')}</div></div>;
  if (!stats) return null;

  const maxAbonnement = Math.max(1, ...Object.values(stats.parAbonnement || {}));
  const maxCroissance = Math.max(1, ...croissance.map((c) => c.inscriptions));

  return (
    <>
      <PageHeader title={t('superAdmin.titre')} subtitle={t('superAdmin.sousTitre')}>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} /> {t('actions.actualiser')}</button>
      </PageHeader>

      <div className="stat-grid">
        <StatCard icon={Building2} label={t('superAdmin.stats.organisations')} value={stats.organisations} tone="navy" />
        <StatCard icon={Users} label={t('superAdmin.stats.utilisateurs')} value={stats.utilisateurs} tone="blue" />
        <StatCard icon={HardHat} label={t('superAdmin.stats.chantiers')} value={stats.chantiers} tone="green" />
        <StatCard icon={AlertTriangle} label={t('superAdmin.stats.reserves')} value={stats.reserves} tone="orange" />
        <StatCard icon={AlertTriangle} label={t('superAdmin.stats.reservesOuvertes')} value={stats.reservesOuvertes} tone="red" />
      </div>

      <div className="grid-2-panel">
        <div className="card">
          <div className="card-header"><h2>{t('superAdmin.orgParAbonnement')}</h2></div>
          <div className="card-body">
            {Object.entries(stats.parAbonnement || {}).length === 0 && <p className="text-muted">{t('superAdmin.aucuneDonnee')}</p>}
            {/* Les clés viennent de la BASE (`organisation.abonnement`) : ce
                sont les codes réels du catalogue. La table locale qu'on
                interrogeait ici listait « Starter / Business / Enterprise »,
                qui n'existent pas — elle ne répondait donc jamais, et le code
                brut s'affichait déjà. On l'affiche maintenant franchement. */}
            {Object.entries(stats.parAbonnement || {}).map(([key, n]) => {
              return (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span>{enumLabel(key, key)}</span><strong>{n}</strong>
                  </div>
                  <div style={{ height: 9, background: '#eef1f4', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${(n / maxAbonnement) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 5 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2><TrendingUp size={17} style={{ verticalAlign: -3 }} /> {t('superAdmin.croissance')}</h2></div>
          <div className="card-body">
            {croissance.length === 0 ? <p className="text-muted">{t('superAdmin.aucuneInscription')}</p> : (
              <div className="bar-chart">
                {croissance.map((c) => (
                  <div key={c.mois} className="bar-col">
                    <div className="bar-track">
                      <div className="bar-fill" style={{ height: `${(c.inscriptions / maxCroissance) * 100}%` }} />
                    </div>
                    <span className="bar-label">{c.mois}</span>
                    <strong className="bar-value">{c.inscriptions}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header"><h2>{t('superAdmin.reservesParStatut')}</h2></div>
        <div className="card-body">
          <div className="kv-list" style={{ columns: 2 }}>
            {Object.entries(stats.reservesParStatut || {}).map(([statut, n]) => (
              <div key={statut} className="kv-item">
                <span className="k">{enumLabel(statut, statut.replace(/_/g, ' '))}</span>
                <span className="v">{formatNombre(n)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
