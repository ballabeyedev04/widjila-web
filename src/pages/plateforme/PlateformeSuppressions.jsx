import { useState } from 'react';
import { Check, X, Mail, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Textarea } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import { listerDemandesSuppression, traiterDemandeSuppression } from '../../service/admin/adminService.js';
import { useActionUnique } from '../../hooks/useActionUnique.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';

/** Onglets = valeurs de `statut` envoyées au backend. '' = tout l'historique. */
const ONGLETS = [
  { statut: 'en_attente', cle: 'enAttente' },
  { statut: 'traitee', cle: 'traitees' },
  { statut: 'rejetee', cle: 'rejetees' },
  { statut: '', cle: 'toutes' },
];

/** Nombre de jours écoulés depuis le dépôt — le RGPD accorde 30 jours. */
function joursEcoules(date) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

/**
 * Demandes de suppression de compte — super-admin.
 *
 * Déposées depuis la page publique `/suppression-compte` par des visiteurs NON
 * AUTHENTIFIÉS. Cet écran ne supprime rien : il trace la décision. La
 * suppression effective passe par la gestion des utilisateurs, APRÈS
 * vérification d'identité — sans quoi il suffirait de connaître une adresse
 * email pour faire supprimer le compte d'autrui.
 */
export default function PlateformeSuppressions() {
  const { t } = useTranslation('plateforme');
  const [filters, setFilters] = useState({ search: '', statut: 'en_attente' });
  const [aTraiter, setATraiter] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur,} = useServerList(
    listerDemandesSuppression,
    { limit: 12, filterKeys: ['search', 'statut'], filters },
  );

  return (
    <>
      <PageHeader title={t('suppressions.titre')} subtitle={t('suppressions.sousTitre', { total })} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs" style={{ display: 'flex', gap: 6 }}>
            {ONGLETS.map(({ statut, cle }) => (
              <button
                key={cle}
                type="button"
                className={`btn btn-sm ${filters.statut === statut ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilters({ ...filters, statut })}
              >
                {t(`suppressions.onglets.${cle}`)}
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder={t('suppressions.recherchePlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {accessDenied ? (
        <ErrorState variante="droits" titre={t('superAdmin.accesRefuse')} message={erreur} />
      ) : erreur ? (
        /* Un échec de chargement n'est PAS un écran vide : sans cette
           branche, une panne réseau s'affichait « aucune donnée » et
           invitait à créer ce que l'on cherchait déjà. */
        <ErrorState message={erreur} onRetry={reload} />
      ) : loading ? (
        <SkeletonListe lignes={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('suppressions.aucuneDemande')}
          message={t('suppressions.aucuneDemandeMessage')}
        />
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('suppressions.colonnes.demandeur')}</th>
                    <th>{t('suppressions.colonnes.objet')}</th>
                    <th>{t('suppressions.colonnes.recueLe')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => {
                    const jours = joursEcoules(d.createdAt);
                    // 30 jours est le délai légal de réponse ; on alerte à 21
                    // pour laisser le temps de traiter, pas pour constater
                    // l'échéance une fois dépassée.
                    const urgent = d.statut === 'en_attente' && jours >= 21;

                    return (
                      <tr key={d.id}>
                        <td>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={13} /> {d.email}
                          </strong>
                          {d.statut !== 'en_attente' && (
                            <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
                              {t(`suppressions.statuts.${d.statut}`)}
                              {d.traite_le && ` · ${formatDate(d.traite_le)}`}
                            </div>
                          )}
                        </td>
                        <td style={{ maxWidth: 340 }}>
                          <span style={{ fontSize: 13, whiteSpace: 'pre-line' }}>{d.objet}</span>
                          {d.note_admin && (
                            <div className="text-muted" style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
                              {t('suppressions.note')} : {d.note_admin}
                            </div>
                          )}
                        </td>
                        <td className="text-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                          {formatDate(d.createdAt)}
                          {urgent && (
                            <div style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <Clock size={12} /> {t('suppressions.joursEcoules', { jours })}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {d.statut === 'en_attente' ? (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => setATraiter({ ...d, cible: 'traitee' })}>
                                <Check size={14} /> {t('suppressions.marquerTraitee')}
                              </button>
                              {' '}
                              <button className="btn btn-sm btn-ghost btn-danger-hover" onClick={() => setATraiter({ ...d, cible: 'rejetee' })}>
                                <X size={14} /> {t('suppressions.rejeter')}
                              </button>
                            </>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination total={total} page={page} limit={12} onPage={setPage} />
        </>
      )}

      <ModalTraiter demande={aTraiter} onClose={() => setATraiter(null)} onDone={reload} />
    </>
  );
}

/**
 * Décision de l'admin. La note est facultative pour une demande traitée, mais
 * OBLIGATOIRE pour un rejet : refuser une demande RGPD sans motif écrit ne
 * serait pas défendable en cas de contrôle.
 */
function ModalTraiter({ demande, onClose, onDone }) {
  const { t } = useTranslation('plateforme');
  const [note, setNote] = useState('');
  const [erreur, setErreur] = useState('');
  // Traiter une demande de suppression est IRRÉVERSIBLE : le compte est
  // pseudonymisé et supprimé. Un `setEnvoi(true)` classique ne protège pas
  // d'un double clic — `disabled` n'arrive qu'au rendu suivant, et une garde
  // sur l'état lit la valeur figée du rendu en cours. Voir useActionUnique.
  const { executer, enCours: envoi } = useActionUnique();

  if (!demande) return null;
  const rejet = demande.cible === 'rejetee';

  const confirmer = () => {
    if (rejet && !note.trim()) {
      setErreur(t('suppressions.motifObligatoire'));
      return;
    }
    setErreur('');
    return executer(async () => {
      try {
        await traiterDemandeSuppression(demande.id, demande.cible, note.trim());
        SwalCustom.toast({ icon: 'success', title: t('suppressions.miseAJour') });
        onDone();
        fermer();
      } catch (err) {
        setErreur(getErrorMessage(err));
      }
    });
  };

  const fermer = () => {
    setNote('');
    setErreur('');
    onClose();
  };

  return (
    <Modal
      open
      onClose={fermer}
      title={rejet ? t('suppressions.rejeterTitre') : t('suppressions.traiterTitre')}
      footer={
        <>
          <button className="btn btn-ghost" onClick={fermer} disabled={envoi}>{t('actions.annuler')}</button>
          <button className={`btn ${rejet ? 'btn-danger' : 'btn-primary'}`} onClick={confirmer} disabled={envoi}>
            {envoi ? t('etats.enCours') : t('actions.confirmer')}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, fontSize: 14 }}>
        {t('suppressions.confirmationTexte', { email: demande.email })}
      </p>
      <Textarea
        label={rejet ? t('suppressions.motifRejet') : t('suppressions.noteFacultative')}
        rows={4}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={rejet ? t('suppressions.motifPlaceholder') : t('suppressions.notePlaceholder')}
      />
      {erreur && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{erreur}</div>}
    </Modal>
  );
}
