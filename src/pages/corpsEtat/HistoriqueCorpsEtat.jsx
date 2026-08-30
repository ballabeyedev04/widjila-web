import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { History, X } from 'lucide-react';

import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { getHistoriqueCorpsEtat } from '../../service/corpsEtat/corpsEtatService.js';
import { listerToutesReserves } from '../../service/reserve/reserveService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate } from '../../utils/format.js';
import { STATUTS_RESERVE, enumLabel } from '../../utils/constants.js';

const PAR_PAGE = 10;

/**
 * Historique des réserves d'une entreprise (corps d'état), filtrable par phase.
 *
 * DEUX APPELS, volontairement distincts :
 *   - la RÉPARTITION par phase (`/corps-etat/:id/historique`) — l'en-tête, qui
 *     donne les compteurs de toutes les phases d'un coup ;
 *   - la LISTE des réserves (`/reserves?corpsEtatId=…&phaseId=…`) — paginée et
 *     rechargée à chaque changement de filtre.
 *
 * Les fusionner obligerait soit à renvoyer toutes les réserves pour compter,
 * soit à recalculer les compteurs à chaque page — ils ne bougent pourtant pas
 * quand on tourne les pages.
 */
export default function HistoriqueCorpsEtat({ open, onClose, corpsEtat }) {
  const { t } = useTranslation('corpsEtat');
  const { t: tPhase } = useTranslation('phase');
  const { t: tChantier } = useTranslation('chantier');

  const [repartition, setRepartition] = useState([]);
  const [totalGlobal, setTotalGlobal] = useState(0);
  const [phaseId, setPhaseId] = useState('');
  const [reserves, setReserves] = useState([]);
  const [totalListe, setTotalListe] = useState(0);
  const [page, setPage] = useState(1);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const id = corpsEtat?.id;

  // Répartition : rechargée à l'ouverture seulement — les compteurs ne
  // dépendent ni du filtre de phase ni de la pagination.
  useEffect(() => {
    if (!open || !id) return undefined;
    let vivant = true;
    setPhaseId('');
    setPage(1);
    setErreur(null);

    getHistoriqueCorpsEtat(id)
      .then((d) => {
        if (!vivant) return;
        setRepartition(d?.repartition || []);
        setTotalGlobal(d?.total || 0);
      })
      .catch((err) => { if (vivant) setErreur(getErrorMessage(err)); });

    return () => { vivant = false; };
  }, [open, id]);

  const chargerListe = useCallback(async () => {
    if (!open || !id) return;
    setChargement(true);
    try {
      const d = await listerToutesReserves({
        page, limit: PAR_PAGE, corpsEtatId: id, phaseId: phaseId || undefined,
      });
      setReserves(d.items || []);
      setTotalListe(d.total || 0);
      setErreur(null);
    } catch (err) {
      setErreur(getErrorMessage(err));
    } finally {
      setChargement(false);
    }
  }, [open, id, page, phaseId]);

  useEffect(() => { chargerListe(); }, [chargerListe]);

  const choisirPhase = (valeur) => { setPhaseId(valeur); setPage(1); };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('historique.titre', { nom: corpsEtat?.nom || '' })}
      size="lg"
      footer={<button className="btn btn-secondary" onClick={onClose}>{t('actions.fermer')}</button>}
    >
      {erreur && <ErrorState message={erreur} onRetry={chargerListe} />}

      {/* ── Répartition par phase ── */}
      <div className="hist-phases">
        <button
          type="button"
          className={`hist-phase ${phaseId === '' ? 'actif' : ''}`}
          onClick={() => choisirPhase('')}
        >
          <span className="hist-phase-nom">{t('historique.toutesPhases')}</span>
          <span className="hist-phase-compte">{totalGlobal}</span>
        </button>

        {repartition.map((r) => (
          <button
            key={r.phaseId || 'sans-phase'}
            type="button"
            className={`hist-phase ${phaseId === r.phaseId ? 'actif' : ''}`}
            /* Les réserves SANS phase (antérieures à la règle) ne sont pas
               filtrables : le serveur n'a pas de « phaseId = null » en
               paramètre, et inventer une valeur sentinelle pour ça
               compliquerait l'API pour un cas résiduel. */
            onClick={() => r.phaseId && choisirPhase(r.phaseId)}
            disabled={!r.phaseId}
          >
            <span className="hist-phase-nom">{r.phaseNom || t('historique.sansPhase')}</span>
            <span className="hist-phase-compte">{r.total}</span>
          </button>
        ))}
      </div>

      {/* ── Liste des réserves ── */}
      {chargement ? (
        <p className="text-muted" style={{ fontSize: 13, padding: '18px 0' }}>{t('chargement')}</p>
      ) : reserves.length === 0 ? (
        <EmptyState
          title={t('historique.videTitre')}
          message={t('historique.videMessage')}
          icon={History}
          recherche={!!phaseId}
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{tChantier('reserves.colNumero')}</th>
                  <th>{tChantier('reserves.colReserve')}</th>
                  <th>{tPhase('selecteur.label')}</th>
                  <th>{t('historique.creeLe')}</th>
                  <th>{tChantier('champs.statut')}</th>
                  <th>{t('historique.corrigeeLe')}</th>
                </tr>
              </thead>
              <tbody>
                {reserves.map((r) => (
                  <tr key={r.id}>
                    <td className="text-muted" style={{ fontSize: 13 }}>{r.numero}</td>
                    <td><strong>{r.titre}</strong></td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{r.phase?.nom || '—'}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(r.createdAt)}</td>
                    <td>
                      <Badge tone={STATUTS_RESERVE[r.statut]?.tone}>
                        {enumLabel(r.statut, STATUTS_RESERVE[r.statut]?.label || r.statut)}
                      </Badge>
                    </td>
                    {/* `date_validation` est la date à laquelle la correction a
                        été VALIDÉE — c'est elle qui fait foi pour la levée
                        d'une réserve, pas la date de dernière modification. */}
                    <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(r.date_validation) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={totalListe} page={page} limit={PAR_PAGE} onPage={setPage} />
        </>
      )}
    </Modal>
  );
}

export { PAR_PAGE };
