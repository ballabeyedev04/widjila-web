import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Building2, CalendarClock, Eye } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import { listerToutesReserves } from '../../service/reserve/reserveService.js';
import { listerChantiers } from '../../service/chantier/chantierService.js';
import { formatDate } from '../../utils/format.js';
import { STATUTS_RESERVE, SEVERITES, PRIORITES, enumLabel } from '../../utils/constants.js';

const FILTRES_VIDES = { search: '', statut: '', severite: '', priorite: '', chantierId: '' };

/**
 * Statuts qui terminent le cycle de vie d'une réserve — voir l'énumération
 * `statut` de `reserve.model.js`. Une échéance dépassée n'y est plus un retard.
 */
const STATUTS_CLOS = ['validee', 'cloturee'];

/** Une échéance dépassée sur une réserve encore ouverte mérite d'être vue. */
function estEnRetard(reserve) {
  if (!reserve?.date_limite) return false;
  if (STATUTS_CLOS.includes(reserve.statut)) return false;
  return new Date(reserve.date_limite) < new Date();
}

/**
 * Toutes les réserves de l'organisation, TOUS CHANTIERS CONFONDUS.
 *
 * Complète la liste par chantier (onglet Réserves d'une fiche) : sur plusieurs
 * chantiers en parallèle, savoir ce qui est en retard imposait d'ouvrir chaque
 * fiche l'une après l'autre.
 *
 * Le filtrage est fait par le SERVEUR (`GET /reserves`), pas en mémoire :
 * filtrer une page de 20 lignes déjà chargées ne montrerait que ce que cette
 * page contient, ce qui donne des résultats faux dès le second écran.
 */
export default function ToutesReserves() {
  const { t } = useTranslation('chantier');
  const [filters, setFilters] = useState(FILTRES_VIDES);
  const [chantiers, setChantiers] = useState([]);

  const { items, total, page, setPage, loading, accessDenied, error: erreur, reload,} = useServerList(
    listerToutesReserves,
    { limit: 20, filterKeys: ['search', 'statut', 'severite', 'priorite', 'chantierId'], filters },
  );

  // Alimente le sélecteur de chantier. Échec silencieux : le filtre reste
  // vide, la liste fonctionne quand même.
  useEffect(() => {
    listerChantiers({ limit: 100 }).then((d) => setChantiers(d.items)).catch(() => {});
  }, []);

  const filtresActifs = Object.entries(filters).some(([, v]) => v);
  const maj = (cle, valeur) => setFilters((f) => ({ ...f, [cle]: valeur }));

  return (
    <>
      <PageHeader title={t('reserves.toutesTitre')} subtitle={t('reserves.toutesSousTitre', { total })} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              className="input"
              style={{ paddingLeft: 34, width: '100%' }}
              placeholder={t('reserves.rechercheGlobalePlaceholder')}
              value={filters.search}
              onChange={(e) => maj('search', e.target.value)}
            />
          </div>

          <select className="input" style={{ minWidth: 190 }} value={filters.chantierId} onChange={(e) => maj('chantierId', e.target.value)}>
            <option value="">{t('reserves.tousChantiers')}</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>

          <select className="input" style={{ minWidth: 150 }} value={filters.statut} onChange={(e) => maj('statut', e.target.value)}>
            <option value="">{t('reserves.tousStatuts')}</option>
            {Object.entries(STATUTS_RESERVE).map(([cle, v]) => (
              <option key={cle} value={cle}>{enumLabel(cle, v.label)}</option>
            ))}
          </select>

          <select className="input" style={{ minWidth: 140 }} value={filters.severite} onChange={(e) => maj('severite', e.target.value)}>
            <option value="">{t('reserves.toutesSeverites')}</option>
            {Object.entries(SEVERITES).map(([cle, v]) => (
              <option key={cle} value={cle}>{enumLabel(cle, v.label)}</option>
            ))}
          </select>

          <select className="input" style={{ minWidth: 140 }} value={filters.priorite} onChange={(e) => maj('priorite', e.target.value)}>
            <option value="">{t('reserves.toutesPriorites')}</option>
            {Object.entries(PRIORITES).map(([cle, v]) => (
              <option key={cle} value={cle}>{enumLabel(cle, v.label)}</option>
            ))}
          </select>

          {filtresActifs && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters(FILTRES_VIDES)}>
              <X size={14} /> {t('actions.reinitialiser')}
            </button>
          )}
        </div>
      </div>

      {accessDenied ? (
        <ErrorState variante="droits" titre={t('commun.accesRefuse')} message={erreur} />
      ) : erreur ? (
        /* Un échec de chargement n'est PAS un écran vide : sans cette
           branche, une panne réseau s'affichait « aucune donnée » et
           invitait à créer ce que l'on cherchait déjà. */
        <ErrorState message={erreur} onRetry={reload} />
      ) : loading ? (
        <SkeletonListe lignes={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('reserves.aucuneReserve')}
          message={filtresActifs ? t('reserves.aucuneReserveFiltre') : t('reserves.aucuneReserveMessage')}
        />
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('reserves.colonneReserve')}</th>
                    <th>{t('commun.chantier')}</th>
                    <th>{t('champs.statut')}</th>
                    <th>{t('reserves.severite')}</th>
                    <th>{t('reserves.assigneeA')}</th>
                    <th>{t('champs.dateLimite')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const retard = estEnRetard(r);
                    return (
                      <tr key={r.id}>
                        <td style={{ maxWidth: 300 }}>
                          <Link to={`/reserves/${r.id}`} style={{ fontWeight: 600 }}>{r.titre}</Link>
                          <div className="text-muted" style={{ fontSize: 12 }}>{r.numero}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {r.chantier ? (
                            <Link to={`/chantiers/${r.chantier.id}`} className="text-secondary">
                              <Building2 size={13} style={{ verticalAlign: -2 }} /> {r.chantier.nom}
                            </Link>
                          ) : '—'}
                        </td>
                        <td><Badge statusKey={r.statut} /></td>
                        <td>
                          <Badge tone={SEVERITES[r.severite]?.tone}>
                            {enumLabel(r.severite, SEVERITES[r.severite]?.label || r.severite)}
                          </Badge>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {r.assigne?.prenom ? `${r.assigne.prenom} ${r.assigne.nom}` : '—'}
                        </td>
                        <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                          {r.date_limite ? (
                            <span style={retard ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                              {retard && <CalendarClock size={13} style={{ verticalAlign: -2 }} />}{' '}
                              {formatDate(r.date_limite)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link to={`/reserves/${r.id}`} className="btn btn-ghost btn-sm" title={t('champs.details')}>
                            <Eye size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
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
