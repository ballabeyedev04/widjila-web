import { useMemo, useState } from 'react';
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

/**
 * Ton d'un verbe d'action.
 *
 * Le journal enregistre des chemins pointés — `chantiers.valider.update` —
 * et l'ancienne version comparait la chaîne ENTIÈRE à « delete » ou
 * « create ». Aucune n'y correspondait jamais : toutes les pastilles
 * sortaient grises, y compris les suppressions. Le verbe se lit au dernier
 * segment.
 */
const TONS = {
  create: 'success',
  update: 'primary',
  delete: 'danger',
  login: 'info',
  logout: 'neutral',
  login_echoue: 'danger',
  statut_change: 'warning',
  telechargement: 'info',
};

/**
 * Décompose une action journalisée en ressource et verbe.
 *
 * `notifications.device-token.create` → { ressource: 'notifications ›
 * device-token', verbe: 'create' }
 *
 * La ressource est affichée en clair sous la pastille : lue telle quelle, la
 * chaîne pointée demande un effort de déchiffrage à chaque ligne, et un
 * journal se parcourt vite.
 */
function decomposer(action) {
  if (!action) return { ressource: null, verbe: null };
  const segments = String(action).split('.');
  if (segments.length === 1) return { ressource: null, verbe: segments[0] };
  return {
    verbe: segments[segments.length - 1],
    ressource: segments.slice(0, -1).join(' › ').replace(/-/g, ' '),
  };
}

/** Jour d'un horodatage, pour les intertitres. */
const jourDe = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export default function PlateformeAudit() {
  const { t, i18n } = useTranslation('plateforme');
  const [filters, setFilters] = useState({ action: '', cibleType: '' });

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur } =
    useServerList(listerAuditLogs, {
      limit: 20,
      filterKeys: ['action', 'cibleType'],
      filters,
    });

  const heure = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }),
    [i18n.language]
  );
  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [i18n.language]
  );

  return (
    <>
      <PageHeader title={t('audit.titre')} subtitle={t('audit.sousTitre', { total })}>
        <button className="btn btn-secondary" onClick={reload}>
          <RefreshCw size={16} /> {t('actions.actualiser')}
        </button>
      </PageHeader>

      <div className="filter-bar">
        <Select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} label="">
          <option value="">{t('audit.filtres.toutesActions')}</option>
          {Object.keys(TONS).map((a) => (
            <option key={a} value={a}>{t(`audit.verbes.${a}`, a.replace(/_/g, ' '))}</option>
          ))}
        </Select>
        <Select value={filters.cibleType} onChange={(e) => setFilters({ ...filters, cibleType: e.target.value })} label="">
          <option value="">{t('audit.filtres.tousTypes')}</option>
          {['utilisateur', 'organisation', 'chantier', 'reserve', 'inspection', 'document', 'plan', 'notification', 'ressource'].map((cible) => (
            <option key={cible} value={cible}>{cible}</option>
          ))}
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
                <table className="table table-audit">
                  <thead>
                    <tr>
                      <th style={{ width: 72 }}>{t('champs.heure', 'Heure')}</th>
                      <th>{t('audit.colonnes.action')}</th>
                      <th>{t('audit.colonnes.cible')}</th>
                      <th>{t('audit.colonnes.utilisateur')}</th>
                      <th style={{ width: 130 }}>{t('audit.colonnes.origine')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((log, i) => {
                      const { ressource, verbe } = decomposer(log.action);
                      // Intertitre de journée : un journal se lit par
                      // tranches de temps, et répéter la date sur chaque
                      // ligne la rend invisible à force.
                      const nouveauJour = jourDe(log.createdAt) !== jourDe(items[i - 1]?.createdAt);

                      return (
                        <Ligne
                          key={log.id}
                          log={log}
                          ressource={ressource}
                          verbe={verbe}
                          heure={heure}
                          jourLong={jourLong}
                          nouveauJour={nouveauJour}
                          t={t}
                        />
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

function Ligne({ log, ressource, verbe, heure, jourLong, nouveauJour, t }) {
  const quand = log.createdAt ? new Date(log.createdAt) : null;

  return (
    <>
      {nouveauJour && quand && (
        <tr className="audit-jour">
          <td colSpan={5}>{jourLong.format(quand)}</td>
        </tr>
      )}
      <tr>
        <td className="text-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          {quand ? heure.format(quand) : '—'}
        </td>

        <td>
          <Badge tone={TONS[verbe] || 'neutral'}>
            {t(`audit.verbes.${verbe}`, verbe || '—')}
          </Badge>
          {ressource && <div className="audit-ressource">{ressource}</div>}
        </td>

        <td>
          {log.cibleType ? (
            <>
              <span className="badge badge-neutral">{log.cibleType}</span>
              {/* Les identifiants sont des UUID : entiers, ils poussent la
                  colonne hors de l'écran sans qu'on les lise jamais en
                  entier. Le début suffit à rapprocher deux lignes, et
                  l'identifiant complet reste au survol. */}
              {log.cibleId && (
                <div className="audit-cible-id" title={log.cibleId}>
                  {String(log.cibleId).slice(0, 8)}…
                </div>
              )}
            </>
          ) : <span className="text-muted">—</span>}
        </td>

        <td>
          <div style={{ fontSize: 13 }}>{log.adminNom || t('audit.compteSupprime')}</div>
          {log.adminEmail && <div className="audit-email">{log.adminEmail}</div>}
        </td>

        {/* L'adresse IP était capturée à chaque événement et n'était affichée
            nulle part. C'est pourtant elle qui distingue « le compte a agi »
            de « quelqu'un d'autre a agi depuis ce compte ». */}
        <td className="text-muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {log.ip || '—'}
        </td>
      </tr>
    </>
  );
}
