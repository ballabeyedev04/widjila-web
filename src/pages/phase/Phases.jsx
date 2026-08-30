import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Pencil, Trash2, RefreshCw, X, ListOrdered, Lock } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { Input, Select, Textarea } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import { invaliderPhases } from '../../hooks/usePhasesActives.js';
import {
  listerPhases, creerPhase, modifierPhase, basculerActifPhase, supprimerPhase,
} from '../../service/phase/phaseService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import SwalCustom from '../../utils/swal.config.js';

const PAR_PAGE = 12;

/**
 * Référentiel des phases de chantier — Pré-cloisons, Cloisons, Pré-livraison,
 * OPR, Réception, Livraison, 30 jours, GPA, Biennale, Décennale.
 *
 * C'est la liste proposée à la création d'une réserve, où la phase est
 * OBLIGATOIRE. Les phases ne sont donc jamais saisies à la main sur le
 * terrain : elles viennent d'ici.
 *
 * L'ORDRE est explicite (`ordre`) et non alphabétique : « Décennale » ne
 * précède pas « Pré-cloisons » sur un chantier. L'administrateur le contrôle.
 *
 * DEUX RÉFÉRENTIELS COHABITENT, distingués à l'écran :
 *   - le référentiel STANDARD, fourni par la plateforme — consultable mais
 *     verrouillé (seul le super-admin le modifie) ;
 *   - les phases PROPRES à l'organisation, qu'elle gère librement.
 *
 * À ne pas confondre avec les phases de PLANNING d'un chantier (onglet
 * « Aperçu » du chantier), qui portent des dates et alimentent le calendrier.
 */
export default function Phases() {
  const { t } = useTranslation('phase');
  const { user } = useUser();
  const [filters, setFilters] = useState({ search: '', actif: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur } = useServerList(
    listerPhases,
    { limit: PAR_PAGE, filterKeys: ['search', 'actif'], filters }
  );

  const superAdmin = user?.role === 'Admin';

  /** Vrai si CETTE ligne est modifiable par l'utilisateur connecté. */
  const modifiable = (p) => superAdmin || p.organisationId !== null;

  /** Le référentiel alimente aussi les formulaires : on invalide leur cache. */
  const rafraichir = () => { invaliderPhases(); reload(); };

  const basculer = async (p) => {
    try {
      await basculerActifPhase(p.id, !p.actif);
      SwalCustom.success(p.actif ? t('messages.desactivee') : t('messages.activee'));
      rafraichir();
    } catch (err) {
      SwalCustom.error({ title: t('messages.actionImpossible'), text: getErrorMessage(err) });
    }
  };

  const supprimer = async (p) => {
    const ok = await SwalCustom.confirm({
      title: t('supprimer.titre', { nom: p.nom }),
      // Le serveur refuse si des réserves l'utilisent — on l'annonce AVANT,
      // pour que la désactivation apparaisse comme la voie normale plutôt que
      // comme un échec subi.
      text: t('supprimer.texte'),
      icon: 'warning',
      danger: true,
    });
    if (!ok) return;
    try {
      await supprimerPhase(p.id);
      SwalCustom.success(t('messages.supprimee'));
      rafraichir();
    } catch (err) {
      SwalCustom.error({ title: t('messages.suppressionImpossible'), text: getErrorMessage(err) });
    }
  };

  return (
    <>
      <PageHeader title={t('titre')} subtitle={t('sousTitre', { count: total })}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {t('nouvelle')}
        </button>
      </PageHeader>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            placeholder={t('rechercher')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}>
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={filters.actif} onChange={(e) => setFilters({ ...filters, actif: e.target.value })} label="">
          <option value="">{t('filtres.toutes')}</option>
          <option value="true">{t('filtres.actives')}</option>
          <option value="false">{t('filtres.inactives')}</option>
        </Select>
        <button
          className="btn btn-ghost"
          onClick={reload}
          title={t('layout:actions.rafraichir')}
          aria-label={t('layout:actions.rafraichir')}
        ><RefreshCw size={16} /></button>
      </div>

      {accessDenied ? <ErrorState variante="droits" titre={t('accesRefuse')} message={erreur} />
        : erreur ? <ErrorState message={erreur} onRetry={reload} />
        : loading ? <Chargement />
        : items.length === 0 ? (
          <EmptyState
            title={t('vide.titre')}
            message={t('vide.message')}
            recherche={!!filters.search || filters.actif !== ''}
            icon={ListOrdered}
          />
        ) : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('colonnes.ordre')}</th>
                      <th>{t('colonnes.phase')}</th>
                      <th>{t('colonnes.portee')}</th>
                      <th>{t('colonnes.statut')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id}>
                        <td className="text-muted" style={{ fontSize: 13, width: 70 }}>{p.ordre}</td>
                        <td>
                          <strong>{p.nom}</strong>
                          {p.description && (
                            <div className="text-muted" style={{ fontSize: 12 }}>{p.description}</div>
                          )}
                        </td>
                        <td>
                          {p.organisationId === null
                            ? <Badge tone="info">{t('portee.standard')}</Badge>
                            : <Badge tone="primary">{t('portee.organisation')}</Badge>}
                        </td>
                        <td>
                          <Badge tone={p.actif ? 'success' : 'neutral'}>
                            {p.actif ? t('statut.active') : t('statut.inactive')}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {modifiable(p) ? (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => basculer(p)}
                                title={p.actif ? t('actions.desactiver') : t('actions.activer')}
                              >
                                {p.actif ? t('actions.desactiver') : t('actions.activer')}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)} title={t('actions.modifier')}>
                                <Pencil size={14} />
                              </button>
                              <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => supprimer(p)} title={t('actions.supprimer')}>
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="text-muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <Lock size={12} /> {t('verrouille')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination total={total} page={page} limit={PAR_PAGE} onPage={setPage} />
          </>
        )}

      <PhaseModal
        open={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        phase={editing}
        onSaved={rafraichir}
      />
    </>
  );
}

function Chargement() {
  const { t } = useTranslation('phase');
  return (
    <div className="card">
      <div className="card-body" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
        {t('chargement')}
      </div>
    </div>
  );
}

/* ============ Création / édition ============ */
function PhaseModal({ open, onClose, phase, onSaved }) {
  const { t } = useTranslation('phase');
  const edition = !!phase;
  const [form, setForm] = useState({ nom: '', description: '', ordre: 0, actif: true });
  const [saving, setSaving] = useState(false);

  // Réinitialisation à chaque ouverture ET à chaque changement de ligne :
  // sans la dépendance sur `phase`, ouvrir « Modifier » sur une seconde ligne
  // afficherait encore les valeurs de la première.
  useEffect(() => {
    if (!open) return;
    setForm({
      nom: phase?.nom || '',
      description: phase?.description || '',
      ordre: phase?.ordre ?? 0,
      actif: phase ? phase.actif : true,
    });
  }, [open, phase]);

  const maj = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.nom.trim()) return SwalCustom.error(t('validation.nomRequis'));
    setSaving(true);
    try {
      const corps = {
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        ordre: Number(form.ordre) || 0,
        actif: form.actif === true || form.actif === 'true',
      };
      if (edition) {
        await modifierPhase(phase.id, corps);
        SwalCustom.success(t('messages.modifiee'));
      } else {
        await creerPhase(corps);
        SwalCustom.success(t('messages.creee'));
      }
      onClose();
      onSaved();
    } catch (err) {
      SwalCustom.error({
        title: edition ? t('messages.modificationImpossible') : t('messages.creationImpossible'),
        text: getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={edition ? t('modal.modifier', { nom: phase?.nom }) : t('modal.nouvelle')}
      size="sm"
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? '…' : edition ? t('actions.enregistrer') : t('actions.creer')}
          </button>
        </>
      )}
    >
      <form onSubmit={submit}>
        <Input label={t('champs.nom')} value={form.nom} onChange={maj('nom')} required autoFocus />

        <Textarea
          label={t('champs.description')}
          value={form.description}
          onChange={maj('description')}
          rows={2}
        />

        <div className="grid-2">
          <Input
            label={t('champs.ordre')}
            type="number"
            min="0"
            value={form.ordre}
            onChange={maj('ordre')}
            hint={t('champs.ordreAide')}
          />
          <Select
            label={t('champs.statut')}
            value={String(form.actif)}
            onChange={(e) => setForm({ ...form, actif: e.target.value === 'true' })}
          >
            <option value="true">{t('statut.active')}</option>
            <option value="false">{t('statut.inactive')}</option>
          </Select>
        </div>
      </form>
    </Modal>
  );
}
