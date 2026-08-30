import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Pencil, Trash2, RefreshCw, X, HardHat, Lock, History } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import HistoriqueCorpsEtat from './HistoriqueCorpsEtat.jsx';
import { Input, Select, Textarea } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import { invaliderCorpsEtat } from '../../hooks/useCorpsEtatActifs.js';
import {
  listerCorpsEtat, creerCorpsEtat, modifierCorpsEtat,
  basculerActifCorpsEtat, supprimerCorpsEtat,
} from '../../service/corpsEtat/corpsEtatService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import SwalCustom from '../../utils/swal.config.js';

const PAR_PAGE = 12;

/**
 * Catalogue des corps d'état — les métiers / types de travaux du BTP.
 *
 * Remplace l'ancienne liste figée de dix catégories, qui vivait à la fois dans
 * un ENUM PostgreSQL, dans les constantes du web et dans une énumération Dart
 * du mobile : ajouter « Serrurerie » demandait une migration ET une livraison
 * sur les trois plateformes.
 *
 * DEUX CATALOGUES COHABITENT ici, et la distinction est visible à l'écran :
 *   - le catalogue STANDARD, fourni par la plateforme, commun à tous les
 *     clients — consultable mais verrouillé (seul le super-admin le modifie) ;
 *   - les métiers PROPRES à l'organisation, qu'elle gère librement.
 * Sans ce repère visuel, un utilisateur passerait son temps à cliquer
 * « Modifier » sur des lignes qu'il n'a pas le droit de changer.
 */
export default function CorpsEtat() {
  const { t } = useTranslation('corpsEtat');
  const { user } = useUser();
  const [filters, setFilters] = useState({ search: '', actif: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [historique, setHistorique] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur } = useServerList(
    listerCorpsEtat,
    { limit: PAR_PAGE, filterKeys: ['search', 'actif'], filters }
  );

  const superAdmin = user?.role === 'Admin';

  /** Vrai si CETTE ligne est modifiable par l'utilisateur connecté. */
  const modifiable = (c) => superAdmin || c.organisationId !== null;

  /** Le catalogue est aussi lu par les formulaires de réserve : on l'invalide. */
  const rafraichir = () => { invaliderCorpsEtat(); reload(); };

  const basculer = async (c) => {
    try {
      await basculerActifCorpsEtat(c.id, !c.actif);
      SwalCustom.success(c.actif ? t('messages.desactive') : t('messages.active'));
      rafraichir();
    } catch (err) {
      SwalCustom.error({ title: t('messages.actionImpossible'), text: getErrorMessage(err) });
    }
  };

  const supprimer = async (c) => {
    const ok = await SwalCustom.confirm({
      title: t('supprimer.titre', { nom: c.nom }),
      // Le serveur refuse si des réserves l'utilisent — on le dit AVANT, pour
      // que la désactivation apparaisse comme la voie normale plutôt que
      // comme un échec.
      text: t('supprimer.texte'),
      icon: 'warning',
      danger: true,
    });
    if (!ok) return;
    try {
      await supprimerCorpsEtat(c.id);
      SwalCustom.success(t('messages.supprime'));
      rafraichir();
    } catch (err) {
      SwalCustom.error({ title: t('messages.suppressionImpossible'), text: getErrorMessage(err) });
    }
  };

  return (
    <>
      <PageHeader title={t('titre')} subtitle={t('sousTitre', { count: total })}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {t('nouveau')}
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
          <option value="">{t('filtres.tous')}</option>
          <option value="true">{t('filtres.actifs')}</option>
          <option value="false">{t('filtres.inactifs')}</option>
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
            icon={HardHat}
          />
        ) : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('colonnes.metier')}</th>
                      <th>{t('colonnes.code')}</th>
                      <th>{t('colonnes.portee')}</th>
                      <th>{t('colonnes.ordre')}</th>
                      <th>{t('colonnes.statut')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {/* Cliquer l'entreprise ouvre son historique — le
                              geste décrit par le client. */}
                          <button className="link" onClick={() => setHistorique(c)}>
                            <strong>{c.nom}</strong>
                          </button>
                          {c.description && (
                            <div className="text-muted" style={{ fontSize: 12 }}>{c.description}</div>
                          )}
                        </td>
                        <td className="text-muted" style={{ fontSize: 13 }}>
                          <code>{c.code || '—'}</code>
                        </td>
                        <td>
                          {c.organisationId === null
                            ? <Badge tone="info">{t('portee.standard')}</Badge>
                            : <Badge tone="primary">{t('portee.organisation')}</Badge>}
                        </td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{c.ordre}</td>
                        <td>
                          <Badge tone={c.actif ? 'success' : 'neutral'}>
                            {c.actif ? t('statut.actif') : t('statut.inactif')}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {modifiable(c) ? (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => basculer(c)}
                                title={c.actif ? t('actions.desactiver') : t('actions.activer')}
                              >
                                {c.actif ? t('actions.desactiver') : t('actions.activer')}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setHistorique(c)} title={t('historique.voir')}>
                                <History size={14} />
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)} title={t('actions.modifier')}>
                                <Pencil size={14} />
                              </button>
                              <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => supprimer(c)} title={t('actions.supprimer')}>
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Verrouillé pour l'ÉDITION, pas pour la
                                  consultation : l'historique d'un métier
                                  standard intéresse autant l'organisation. */}
                              <button className="btn btn-ghost btn-sm" onClick={() => setHistorique(c)} title={t('historique.voir')}>
                                <History size={14} />
                              </button>
                              <span className="text-muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 6 }}>
                                <Lock size={12} /> {t('verrouille')}
                              </span>
                            </>
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

      <HistoriqueCorpsEtat
        open={!!historique}
        onClose={() => setHistorique(null)}
        corpsEtat={historique}
      />

      <CorpsEtatModal
        open={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        corpsEtat={editing}
        onSaved={rafraichir}
      />
    </>
  );
}

function Chargement() {
  const { t } = useTranslation('corpsEtat');
  return (
    <div className="card">
      <div className="card-body" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
        {t('chargement')}
      </div>
    </div>
  );
}

/* ============ Création / édition ============ */
function CorpsEtatModal({ open, onClose, corpsEtat, onSaved }) {
  const { t } = useTranslation('corpsEtat');
  const edition = !!corpsEtat;
  const [form, setForm] = useState({ nom: '', code: '', description: '', ordre: 0, actif: true });
  const [saving, setSaving] = useState(false);

  // Réinitialisation à CHAQUE ouverture et à chaque changement de ligne :
  // sans la dépendance sur `corpsEtat`, ouvrir « Modifier » sur une seconde
  // ligne affichait encore les valeurs de la première.
  useEffect(() => {
    if (!open) return;
    setForm({
      nom: corpsEtat?.nom || '',
      code: corpsEtat?.code || '',
      description: corpsEtat?.description || '',
      ordre: corpsEtat?.ordre ?? 0,
      actif: corpsEtat ? corpsEtat.actif : true,
    });
  }, [open, corpsEtat]);

  const maj = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.nom.trim()) return SwalCustom.error(t('validation.nomRequis'));
    setSaving(true);
    try {
      const corps = {
        nom: form.nom.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        ordre: Number(form.ordre) || 0,
        actif: form.actif === true || form.actif === 'true',
      };
      if (edition) {
        await modifierCorpsEtat(corpsEtat.id, corps);
        SwalCustom.success(t('messages.modifie'));
      } else {
        await creerCorpsEtat(corps);
        SwalCustom.success(t('messages.cree'));
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
      title={edition ? t('modal.modifier', { nom: corpsEtat?.nom }) : t('modal.nouveau')}
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

        <Input
          label={t('champs.code')}
          value={form.code}
          onChange={maj('code')}
          placeholder="serrurerie"
          hint={t('champs.codeAide')}
        />

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
            <option value="true">{t('statut.actif')}</option>
            <option value="false">{t('statut.inactif')}</option>
          </Select>
        </div>
      </form>
    </Modal>
  );
}
