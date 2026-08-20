import { useState } from 'react';
import { Check, X, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Select, Textarea } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import {
  listerDemandesInscription, validerDemandeInscription, rejeterDemandeInscription,
} from '../../service/admin/adminService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, initials } from '../../utils/format.js';
import { ROLES, enumLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';

/** Onglets = valeurs de `statut` envoyées au backend. */
const ONGLETS = [
  { statut: 'en_attente_validation', cle: 'enAttente' },
  { statut: 'rejete', cle: 'rejetees' },
  { statut: 'actif', cle: 'validees' },
];

/**
 * Demandes d'inscription — super-admin.
 *
 * L'inscription publique ne crée plus un compte utilisable : elle dépose une
 * demande que cet écran tranche. Valider active le compte et lui attribue son
 * rôle définitif ; rejeter exige un motif, envoyé tel quel au demandeur.
 */
export default function PlateformeDemandes() {
  const { t } = useTranslation('plateforme');
  const [filters, setFilters] = useState({ search: '', statut: 'en_attente_validation' });
  const [aValider, setAValider] = useState(null);
  const [aRejeter, setARejeter] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied } = useServerList(
    listerDemandesInscription,
    { limit: 12, filterKeys: ['search', 'statut'], filters },
  );

  const enAttente = filters.statut === 'en_attente_validation';

  return (
    <>
      <PageHeader title={t('demandes.titre')} subtitle={t('demandes.sousTitre', { total })} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs" style={{ display: 'flex', gap: 6 }}>
            {ONGLETS.map(({ statut, cle }) => (
              <button
                key={statut}
                type="button"
                className={`btn btn-sm ${filters.statut === statut ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilters({ ...filters, statut })}
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
        <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 50 }}>{t('superAdmin.accesRefuse')}</div></div>
      ) : loading ? (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 50 }}>{t('etats.chargement')}</div></div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t('demandes.aucuneDemande')}
          message={t('demandes.aucuneDemandeMessage')}
        />
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th></th>
                    <th>{t('demandes.colonnes.demandeur')}</th>
                    <th>{t('demandes.colonnes.organisation')}</th>
                    <th>{t('demandes.colonnes.roleDemande')}</th>
                    <th>{t(enAttente ? 'demandes.colonnes.demandeLe' : 'demandes.colonnes.traiteeLe')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id}>
                      <td style={{ width: 52 }}><div className="avatar">{initials(d.prenom, d.nom)}</div></td>
                      <td>
                        <strong>{d.prenom} {d.nom}</strong>
                        <div className="text-muted" style={{ fontSize: 12 }}>{d.email}</div>
                        {d.telephone && <div className="text-muted" style={{ fontSize: 12 }}>{d.telephone}</div>}
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>
                        {d.organisation?.nom || '—'}
                        {d.organisation?.ville && <div style={{ fontSize: 12 }}>{d.organisation.ville}</div>}
                      </td>
                      <td><Badge role={d.role} /></td>
                      <td className="text-muted" style={{ fontSize: 13 }}>
                        {formatDate(enAttente ? d.createdAt : (d.valide_le || d.createdAt))}
                        {!enAttente && <div><Badge statusKey={d.statut} /></div>}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {enAttente ? (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => setAValider(d)}>
                              <Check size={14} /> {t('demandes.valider')}
                            </button>
                            {' '}
                            <button className="btn btn-sm btn-ghost btn-danger-hover" onClick={() => setARejeter(d)}>
                              <X size={14} /> {t('demandes.rejeter')}
                            </button>
                          </>
                        ) : d.motif_rejet ? (
                          // Le motif est court et déjà connu de l'admin : l'afficher
                          // directement évite une modale pour trois mots.
                          <span className="text-muted" style={{ fontSize: 12, whiteSpace: 'normal', display: 'inline-block', maxWidth: 280, textAlign: 'left' }}>
                            <ShieldAlert size={13} style={{ verticalAlign: -2 }} /> {d.motif_rejet}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination total={total} page={page} limit={12} onPage={setPage} />
        </>
      )}

      <ModalValider demande={aValider} onClose={() => setAValider(null)} onDone={reload} />
      <ModalRejeter demande={aRejeter} onClose={() => setARejeter(null)} onDone={reload} />
    </>
  );
}

/** Validation — l'admin confirme, et fixe au passage le rôle définitif. */
function ModalValider({ demande, onClose, onDone }) {
  const { t } = useTranslation('plateforme');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  // Pas de réinitialisation manuelle du state : `demande` à null démonte le
  // composant, donc `role` repart vide à chaque ouverture.
  const submit = async () => {
    setSaving(true);
    try {
      await validerDemandeInscription(demande.id, role || undefined);
      SwalCustom.success(t('demandes.valideeSucces'));
      onClose();
      onDone();
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!demande) return null;
  const nom = `${demande.prenom} ${demande.nom}`;

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
      <p style={{ marginTop: 0 }}>{t('demandes.modalValider.intro', { nom })}</p>
      <Select
        label={t('demandes.modalValider.roleLabel')}
        hint={t('demandes.modalValider.roleAide')}
        value={role || demande.role}
        onChange={(e) => setRole(e.target.value)}
      >
        {/* 'Admin' est absent : le backend le refuse (voir
            demandeInscription.validation.js) — une inscription publique ne
            peut pas produire un super-admin. */}
        {Object.entries(ROLES)
          .filter(([v]) => v !== 'Admin')
          .map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
      </Select>
    </Modal>
  );
}

/** Rejet — le motif est obligatoire, il part tel quel dans l'email. */
function ModalRejeter({ demande, onClose, onDone }) {
  const { t } = useTranslation('plateforme');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    // Même seuil que le schéma Joi du backend : valider ici évite un aller-retour
    // pour une erreur que le formulaire peut détecter seul.
    if (motif.trim().length < 5) {
      setErreur(t('demandes.modalRejeter.motifRequis'));
      return;
    }
    setSaving(true);
    try {
      await rejeterDemandeInscription(demande.id, motif.trim());
      SwalCustom.success(t('demandes.rejeteeSucces'));
      onClose();
      onDone();
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!demande) return null;
  const nom = `${demande.prenom} ${demande.nom}`;

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
      <p style={{ marginTop: 0 }}>{t('demandes.modalRejeter.intro', { nom })}</p>
      <Textarea
        label={t('demandes.modalRejeter.motifLabel')}
        placeholder={t('demandes.modalRejeter.motifPlaceholder')}
        required
        rows={5}
        maxLength={1000}
        error={erreur}
        value={motif}
        onChange={(e) => { setMotif(e.target.value); if (erreur) setErreur(''); }}
      />
    </Modal>
  );
}
