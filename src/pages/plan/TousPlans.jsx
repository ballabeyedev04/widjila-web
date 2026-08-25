import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Building2, Map, Layers } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { listerTousPlans } from '../../service/plan/planService.js';
import { listerChantiers } from '../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Tous les plans de l'organisation, TOUS CHANTIERS CONFONDUS.
 *
 * Le serveur ne renvoie que la dernière version de chaque plan et NE PAGINE
 * PAS (voir `plan.service.js#listTousPlans`). La recherche textuelle est donc
 * faite ici, sur la liste complète déjà en mémoire — contrairement aux
 * réserves, il n'y a pas de page suivante où un résultat pourrait se cacher.
 */
export default function TousPlans() {
  const { t } = useTranslation('chantier');
  const [plans, setPlans] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [chantierId, setChantierId] = useState('');
  const [recherche, setRecherche] = useState('');
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerTousPlans({ chantierId });
      setPlans(d.items);
    } catch (err) {
      SwalCustom.error({ title: t('plans.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, t]);

  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    listerChantiers({ limit: 100 }).then((d) => setChantiers(d.items)).catch(() => {});
  }, []);

  const motif = recherche.trim().toLowerCase();
  const visibles = motif
    ? plans.filter((p) => `${p.nom} ${p.chantier?.nom ?? ''}`.toLowerCase().includes(motif))
    : plans;

  const filtresActifs = !!(recherche || chantierId);

  return (
    <>
      <PageHeader title={t('plans.tousTitre')} subtitle={t('plans.tousSousTitre', { total: plans.length })} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              className="input"
              style={{ paddingLeft: 34, width: '100%' }}
              placeholder={t('plans.recherchePlaceholder')}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>

          <select className="input" style={{ minWidth: 200 }} value={chantierId} onChange={(e) => setChantierId(e.target.value)}>
            <option value="">{t('reserves.tousChantiers')}</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>

          {filtresActifs && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setRecherche(''); setChantierId(''); }}>
              <X size={14} /> {t('actions.reinitialiser')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 50 }}>{t('etats.chargement')}</div></div>
      ) : visibles.length === 0 ? (
        <EmptyState
          title={t('plans.aucunPlan')}
          message={filtresActifs ? t('plans.aucunPlanFiltre') : t('plans.aucunPlanMessage')}
        />
      ) : (
        <div className="grid-3">
          {visibles.map((p) => (
            <Link key={p.id} to={`/chantiers/${p.chantierId}?tab=plans`} className="card plan-carte">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <span className="plan-carte-icone"><Map size={18} /></span>
                  {p.version != null && <Badge tone="info"><Layers size={11} /> v{p.version}</Badge>}
                </div>

                <h3 style={{ margin: '12px 0 4px', fontSize: 15, lineHeight: 1.3 }}>{p.nom}</h3>

                <p className="text-muted" style={{ margin: 0, fontSize: 12.5 }}>
                  <Building2 size={12} style={{ verticalAlign: -2 }} /> {p.chantier?.nom || '—'}
                </p>

                {p.createdAt && (
                  <p className="text-muted" style={{ margin: '8px 0 0', fontSize: 11.5 }}>
                    {formatDate(p.createdAt)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
