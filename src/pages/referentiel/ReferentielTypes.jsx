import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Pencil, Trash2, RefreshCw, X, Lock } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Input, Select, Textarea } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import { SERVICES_TYPES } from '../../service/referentiel/typesService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import SwalCustom from '../../utils/swal.config.js';

const PAR_PAGE = 12;

/**
 * Écran d'administration d'un référentiel de TYPE.
 *
 * ── Ce qu'il remplace ─────────────────────────────────────────────────────
 * Trois listes figées — types de document, d'intervenant, d'inspection — qui
 * vivaient à la fois dans une colonne `ENUM` PostgreSQL et dans les constantes
 * du web. Ajouter « PPSPS » demandait une migration ET une livraison.
 *
 * ── Un seul composant pour les trois ──────────────────────────────────────
 * Les trois référentiels ont le même contrat serveur et le même écran. Trois
 * copies se seraient mises à diverger au premier correctif appliqué à une
 * seule ; la variation tient dans la prop [referentiel] et le préfixe i18n.
 *
 * ── DEUX CATALOGUES cohabitent, et cela se voit ───────────────────────────
 *   - le catalogue STANDARD, fourni par la plateforme, commun à tous les
 *     clients — consultable mais verrouillé (seul le super-admin le modifie) ;
 *   - les types PROPRES à l'organisation, qu'elle gère librement.
 * Sans ce repère visuel, l'utilisateur cliquerait « Modifier » sur des lignes
 * qu'il n'a pas le droit de changer.
 *
 * @param {'document'|'intervenant'|'inspection'} referentiel
 */
export default function ReferentielTypes({ referentiel }) {
  const { t } = useTranslation('typesReferentiel');
  const { user } = useUser();
  const service = SERVICES_TYPES[referentiel];

  const [filters, setFilters] = useState({ search: '', actif: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur } = useServerList(
    service.lister,
    { limit: PAR_PAGE, filterKeys: ['search', 'actif'], filters }
  );

  // Changer de référentiel doit repartir d'une liste propre : sans cela, un
  // filtre saisi sur les documents s'appliquerait aux inspections.
  useEffect(() => {
    setFilters({ search: '', actif: '' });
    setShowCreate(false);
    setEditing(null);
  }, [referentiel]);

  const superAdmin = user?.role === 'Admin';

  /** Vrai si CETTE ligne est modifiable par l'utilisateur connecté. */
  const modifiable = (ligne) => superAdmin || ligne.organisationId !== null;

  const basculer = async (ligne) => {
    try {
      await service.basculerActif(ligne.id, !ligne.actif);
      SwalCustom.success(ligne.actif ? t('messages.desactive') : t('messages.active'));
      reload();
    } catch (err) {
      SwalCustom.error({ title: t('messages.actionImpossible'), text: getErrorMessage(err) });
    }
  };

  const supprimer = async (ligne) => {
    const ok = await SwalCustom.confirm({
      title: t('supprimer.titre', { nom: ligne.nom }),
      // Le serveur refuse si des enregistrements l'utilisent — on le dit
      // AVANT, pour que la désactivation apparaisse comme la voie normale
      // plutôt que comme un échec.
      text: t('supprimer.texte'),
      icon: 'warning',
      danger: true,
    });
    if (!ok) return;
    try {
      await service.supprimer(ligne.id);
      SwalCustom.success(t('messages.supprime'));
      reload();
    } catch (err) {
      SwalCustom.error({ title: t('messages.suppressionImpossible'), text: getErrorMessage(err) });
    }
  };

  return (
    <>
      <PageHeader
        title={t(`${referentiel}.titre`)}
        subtitle={t('sousTitre', { count: total })}
      >
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
        : loading ? <SkeletonListe lignes={6} />
        : items.length === 0 ? (
          <EmptyState
            title={t('vide.titre')}
            message={t('vide.message')}
            recherche={!!filters.search || filters.actif !== ''}
          />
        ) : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('colonnes.nom')}</th>
                      <th>{t('colonnes.code')}</th>
                      <th>{t('colonnes.portee')}</th>
                      <th>{t('colonnes.ordre')}</th>
                      <th>{t('colonnes.statut')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((ligne) => (
                      <tr key={ligne.id}>
                        <td>
                          <strong>{ligne.nom}</strong>
                          {ligne.description && (
                            <div className="text-muted" style={{ fontSize: 12 }}>{ligne.description}</div>
                          )}
                        </td>
                        <td className="text-muted" style={{ fontSize: 13 }}><code>{ligne.code}</code></td>
                        <td>
                          {ligne.organisationId === null
                            ? <Badge tone="info">{t('portee.standard')}</Badge>
                            : <Badge tone="primary">{t('portee.organisation')}</Badge>}
                        </td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{ligne.ordre}</td>
                        <td>
                          <Badge tone={ligne.actif ? 'success' : 'neutral'}>
                            {ligne.actif ? t('statut.actif') : t('statut.inactif')}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {modifiable(ligne) ? (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => basculer(ligne)}
                              >
                                {ligne.actif ? t('actions.desactiver') : t('actions.activer')}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(ligne)} title={t('actions.modifier')}>
                                <Pencil size={14} />
                              </button>
                              <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => supprimer(ligne)} title={t('actions.supprimer')}>
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

      <TypeModal
        open={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        type={editing}
        service={service}
        onSaved={reload}
      />
    </>
  );
}

function TypeModal({ open, onClose, type, service, onSaved }) {
  const { t } = useTranslation('typesReferentiel');
  const isEdit = !!type;
  const [form, setForm] = useState({ code: '', nom: '', description: '', ordre: 0, actif: true });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(type
      ? {
        code: type.code || '',
        nom: type.nom || '',
        description: type.description || '',
        ordre: type.ordre ?? 0,
        actif: type.actif ?? true,
      }
      : { code: '', nom: '', description: '', ordre: 0, actif: true });
    setErrors({});
  }, [open, type]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return; // double soumission : la requête partirait deux fois

    const errs = {};
    if (!form.nom.trim()) errs.nom = t('validation.nomRequis');
    if (!isEdit) {
      if (!form.code.trim()) errs.code = t('validation.codeRequis');
      else if (!/^[a-z0-9_]+$/.test(form.code.trim().toLowerCase())) errs.code = t('validation.codeFormat');
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const corps = {
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        ordre: Number(form.ordre) || 0,
        actif: form.actif,
      };
      if (isEdit) {
        await service.modifier(type.id, corps);
        SwalCustom.success(t('messages.modifie'));
      } else {
        await service.creer({ ...corps, code: form.code.trim().toLowerCase() });
        SwalCustom.success(t('messages.cree'));
      }
      onSaved();
      onClose();
    } catch (err) {
      SwalCustom.error({ title: t('messages.echec'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('modal.titreEdition') : t('modal.titreCreation')}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('actions.annuler')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? '…' : t('actions.enregistrer')}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <Input
          label={t('champs.code')}
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          error={errors.code}
          /* Le code est figé après création : il est enregistré dans les
             données, le changer orphelinerait les enregistrements classés. */
          disabled={isEdit}
          hint={isEdit ? t('champs.codeFige') : t('champs.codeAide')}
          required={!isEdit}
        />
        <Input
          label={t('champs.nom')}
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          error={errors.nom}
          required
        />
        <Textarea
          label={t('champs.description')}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
        />
        <div className="grid-2">
          <Input
            label={t('champs.ordre')}
            type="number"
            min={0}
            value={form.ordre}
            onChange={(e) => setForm({ ...form, ordre: e.target.value })}
            hint={t('champs.ordreAide')}
          />
          <Select
            label={t('champs.statut')}
            value={form.actif ? 'true' : 'false'}
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
