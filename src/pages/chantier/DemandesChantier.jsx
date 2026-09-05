import { useState } from 'react';
import { Check, X, ShieldAlert, HardHat, Paperclip, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Textarea } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import { listerChantiers, validerChantier, rejeterChantier } from '../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Longueur minimale du motif de refus.
 *
 * MÊME seuil que le schéma Joi du backend : le vérifier ici évite un
 * aller-retour pour une erreur que le formulaire détecte seul. Les deux
 * doivent bouger ensemble — un seuil plus bas ici produirait un refus serveur
 * incompréhensible.
 */
const MOTIF_MIN = 10;

const LIMITE = 12;

/** Onglets — filtre `demandes` côté serveur, jamais `statut`. */
const ONGLETS = [
  { valeur: 'a_valider', cle: 'aValider' },
  { valeur: 'mes', cle: 'mes' },
];

/**
 * Demandes de création de chantier.
 *
 * Un chantier créé par un compte non super-admin ne naît pas utilisable : il
 * dépose une demande, que cet écran tranche. Deux vues sur la même liste :
 *
 *   - « À valider » : la file d'attente de ceux qui décident ;
 *   - « Mes demandes » : le suivi du demandeur, avec le motif du refus et le
 *     chemin pour corriger — corriger une demande refusée la renvoie.
 *
 * Le refus ne supprime rien : la structure et les plans déjà saisis doivent
 * survivre à la correction.
 */
export default function DemandesChantier() {
  const { t } = useTranslation('chantier');
  const [filters, setFilters] = useState({ search: '', demandes: 'a_valider' });
  const [aValider, setAValider] = useState(null);
  const [aRejeter, setARejeter] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur } = useServerList(
    listerChantiers,
    { limit: LIMITE, filterKeys: ['search', 'demandes'], filters },
  );

  const fileAValider = filters.demandes === 'a_valider';

  return (
    <>
      <PageHeader title={t('demandes.titre')} subtitle={t('demandes.sousTitre', { total })} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs" style={{ display: 'flex', gap: 6 }}>
            {ONGLETS.map(({ valeur, cle }) => (
              <button
                key={valeur}
                type="button"
                className={`btn btn-sm ${filters.demandes === valeur ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilters({ ...filters, demandes: valeur })}
              >
                {t(`demandes.onglets.${cle}`)}
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder={t('demandes.recherchePlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {accessDenied ? (
        <ErrorState variante="droits" titre={t('demandes.accesRefuse')} message={erreur} />
      ) : erreur ? (
        /* Un échec de chargement n'est PAS un écran vide : sans cette branche,
           une panne réseau s'afficherait « aucune demande » et laisserait
           croire que la file est traitée. */
        <ErrorState message={erreur} onRetry={reload} />
      ) : loading ? (
        <SkeletonListe lignes={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title={t(fileAValider ? 'demandes.aucuneAValider' : 'demandes.aucuneMienne')}
          message={t(fileAValider ? 'demandes.aucuneAValiderMessage' : 'demandes.aucuneMienneMessage')}
        />
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('demandes.colonnes.chantier')}</th>
                    <th>{t('demandes.colonnes.demandeur')}</th>
                    <th>{t('demandes.colonnes.deposeeLe')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {/* Le nom mène à l'EXAMEN de la demande, et non à
                            la fiche du chantier : on tranche en regardant les
                            plans déposés, section par section, ce que la fiche
                            ordinaire ne montre pas. */}
                        <Link to={`/chantiers/demandes/${c.id}`}><strong>{c.nom}</strong></Link>
                        <div className="text-muted" style={{ fontSize: 12 }}>{c.code}</div>
                        {c.adresse && <div className="text-muted" style={{ fontSize: 12 }}>{c.adresse}</div>}

                        {/* Les pièces jointes, VISIBLES DÈS LA LISTE.
                            Une demande se juge en partie sur ses documents —
                            « l'entreprise a-t-elle fourni le plan de masse ? ».
                            Sans ce repère, il fallait ouvrir chaque demande une
                            à une pour découvrir laquelle n'avait aucune pièce. */}
                        {c.nbPlans > 0 ? (
                          <div className="demande-plans">
                            <Paperclip size={12} />
                            {t('demandes.plansJoints', { count: c.nbPlans })}
                          </div>
                        ) : (
                          <div className="demande-plans demande-plans-vide">
                            <Paperclip size={12} />
                            {t('demandes.aucunPlan')}
                          </div>
                        )}
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>
                        {c.demandeur ? (
                          <>
                            <strong>{c.demandeur.prenom} {c.demandeur.nom}</strong>
                            <div style={{ fontSize: 12 }}>{c.demandeur.email}</div>
                          </>
                        ) : '—'}
                        {/* L'ENTREPRISE qui demande. Deux chantiers peuvent
                            porter le même nom chez deux clients differents :
                            sans elle, on tranche sans savoir pour qui. */}
                        {c.organisation?.nom && (
                          <div className="demande-entreprise">{c.organisation.nom}</div>
                        )}
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>
                        {formatDate(c.createdAt)}
                        <div><Badge statusKey={c.statut} /></div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {/* « Consulter » AVANT les deux décisions, et pour
                            toutes les demandes quel qu'en soit le statut : on
                            relit aussi une demande déjà tranchée. Le nom du
                            chantier y mène également, mais un lien dans un
                            tableau ne se voit pas comme une action. */}
                        <Link
                          to={`/chantiers/demandes/${c.id}`}
                          className="btn btn-sm btn-ghost"
                        ><Eye size={14} /> {t('demandes.consulter')}</Link>
                        {' '}
                        {c.statut === 'en_attente_validation' && fileAValider ? (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => setAValider(c)}>
                              <Check size={14} /> {t('demandes.valider')}
                            </button>
                            {' '}
                            <button className="btn btn-sm btn-ghost btn-danger-hover" onClick={() => setARejeter(c)}>
                              <X size={14} /> {t('demandes.rejeter')}
                            </button>
                          </>
                        ) : c.motif_rejet ? (
                          /* Le motif est la seule indication de ce qu'il faut
                             reprendre : il s'affiche directement, sans modale
                             à ouvrir pour le lire. */
                          <span
                            className="text-muted"
                            style={{ fontSize: 12, whiteSpace: 'pre-line', display: 'inline-block', maxWidth: 300, textAlign: 'left' }}
                          >
                            <ShieldAlert size={13} style={{ verticalAlign: -2 }} /> {c.motif_rejet}
                            <br />
                            <Link to={`/chantiers/${c.id}`}>{t('demandes.corriger')}</Link>
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination total={total} page={page} limit={LIMITE} onPage={setPage} />
        </>
      )}

      <ModalValider chantier={aValider} onClose={() => setAValider(null)} onDone={reload} />
      <ModalRejeter chantier={aRejeter} onClose={() => setARejeter(null)} onDone={reload} />
    </>
  );
}

/** Validation — le chantier devient utilisable, et son demandeur est prévenu. */
function ModalValider({ chantier, onClose, onDone }) {
  const { t } = useTranslation('chantier');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await validerChantier(chantier.id);
      SwalCustom.success(t('demandes.valideeSucces'));
      onClose();
      onDone();
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!chantier) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={t('demandes.modalValider.titre')}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>{t('actions.annuler')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            <Check size={16} /> {t('demandes.modalValider.confirmer')}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>{t('demandes.modalValider.intro', { nom: chantier.nom })}</p>
    </Modal>
  );
}

/** Refus — le motif est obligatoire, il part tel quel dans le courriel. */
function ModalRejeter({ chantier, onClose, onDone }) {
  const { t } = useTranslation('chantier');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (motif.trim().length < MOTIF_MIN) {
      setErreur(t('demandes.modalRejeter.motifRequis', { min: MOTIF_MIN }));
      return;
    }
    setSaving(true);
    try {
      await rejeterChantier(chantier.id, motif.trim());
      SwalCustom.success(t('demandes.rejeteeSucces'));
      onClose();
      onDone();
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!chantier) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={t('demandes.modalRejeter.titre')}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>{t('actions.annuler')}</button>
          <button className="btn btn-primary btn-danger-hover" onClick={submit} disabled={saving}>
            <X size={16} /> {t('demandes.modalRejeter.confirmer')}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>{t('demandes.modalRejeter.intro', { nom: chantier.nom })}</p>
      <Textarea
        label={t('demandes.modalRejeter.motifLabel')}
        hint={t('demandes.modalRejeter.motifAide')}
        placeholder={t('demandes.modalRejeter.motifPlaceholder')}
        required
        rows={5}
        maxLength={2000}
        error={erreur}
        value={motif}
        onChange={(e) => { setMotif(e.target.value); if (erreur) setErreur(''); }}
      />
    </Modal>
  );
}
