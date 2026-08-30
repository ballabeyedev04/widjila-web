import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Upload, Eye, Trash2, Copy, Download, QrCode,
  Paperclip, SignpostBig, MessagesSquare, Camera, Users, ExternalLink,
} from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import Modal from '../../../components/Modal.jsx';
import Pagination from '../../../components/Pagination.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import ReserveDetailCorps from '../../../components/reserve/ReserveDetailCorps.jsx';
import useReserveDetail from '../../../hooks/useReserveDetail.js';
import { Input, Select, Textarea } from '../../../components/FormControls.jsx';
import { useUser } from '../../../context/useUser.js';
import {
  ROLES_RESERVE_INTERVENANTS, ROLES_OPERATIONNELS, ROLES_OPERATIONNELS_CONTROLE, roleAllowed,
} from '../../../utils/constants.js';
// Les appels du DÉTAIL (pièces, signatures, affectations, commentaires,
// médias, QR) ne sont plus listés ici : ils vivent dans `useReserveDetail`.
import {
  listerReserves, creerReserve, creerSerieReserves,
  supprimerReserve, dupliquerReserve,
  exporterExcelReserves, importerExcelReserves,
} from '../../../service/reserve/reserveService.js';
import { listerLots, listerMembresChantier } from '../../../service/chantier/chantierService.js';
import { listerPartenaires } from '../../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate } from '../../../utils/format.js';
import { STATUTS_RESERVE, SEVERITES, enumLabel } from '../../../utils/constants.js';
import { useCorpsEtatActifs } from '../../../hooks/useCorpsEtatActifs.js';
import { usePhasesActives } from '../../../hooks/usePhasesActives.js';
import SwalCustom from '../../../utils/swal.config.js';
import { useEnum } from '../../../hooks/useEnums.js';

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReservesTab({ chantierId }) {
  // Statuts et sévérités servis par l'API — hooks/useEnums.js.
  const statutsReserve = useEnum('statutsReserve');
  const severites = useEnum('severites');
  const { t } = useTranslation('chantier');
  const { t: tCorps } = useTranslation('corpsEtat');
  const { user } = useUser();
  const role = user?.role;
  // Aligné sur le backend (src/config/roles.js) : chaque rôle ne voit que
  // les actions qui le concernent.
  const canAct = roleAllowed(role, ROLES_RESERVE_INTERVENANTS);         // créer, statut, signer, pièces, affecter
  const canDelete = roleAllowed(role, ROLES_OPERATIONNELS);             // supprimer réserve/pièce/affectation/média
  const canImport = roleAllowed(role, ROLES_OPERATIONNELS_CONTROLE);    // import Excel

  const [filters, setFilters] = useState({ search: '', statut: '', severite: '', lotId: '' });
  const [lots, setLots] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerReserves(chantierId, { page, limit, ...filters });
      setItems(d.items);
      setTotal(d.total);
    } catch (err) {
      SwalCustom.error({ title: t('reserves.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, page, filters, t]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters.search, filters.statut, filters.severite, filters.lotId]);
  useEffect(() => { listerLots(chantierId).then((d) => setLots(d.items)).catch(() => {}); }, [chantierId]);

  const remove = async (r) => {
    const res = await SwalCustom.confirm({ title: t('reserves.supprimerTitre', { numero: r.numero }), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerReserve(r.id);
      SwalCustom.success(t('reserves.supprimee'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const duplicate = async (r) => {
    try {
      await dupliquerReserve(r.id);
      SwalCustom.success(t('reserves.dupliquee'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const exportExcel = async () => {
    try {
      const blob = await exporterExcelReserves(chantierId);
      downloadBlob(blob, `reserves-chantier-${chantierId}.xlsx`);
      SwalCustom.success(t('reserves.exportTelecharge'));
    } catch (err) { SwalCustom.error({ title: t('commun.exportImpossible'), text: getErrorMessage(err) }); }
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>{t('reserves.titre', { n: total })}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={exportExcel}><FileSpreadsheet size={14} /> {t('reserves.excel')}</button>
            {canImport && <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(true)}><Upload size={14} /> {t('actions.importer')}</button>}
            {canAct && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> {t('reserves.nouvelle')}</button>}
          </div>
        </div>
        <div className="card-body">
          <div className="filter-bar" style={{ marginBottom: 14 }}>
            <div className="search-box">
              <Search size={16} />
              <input className="input" placeholder={t('commun.rechercher')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              {filters.search && <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}><X size={14} /></button>}
            </div>
            <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
              <option value="">{t('commun.tousStatuts')}</option>
              {statutsReserve.map((value) => <option key={value} value={value}>{enumLabel(value, STATUTS_RESERVE[value]?.label)}</option>)}
            </Select>
            <Select value={filters.severite} onChange={(e) => setFilters({ ...filters, severite: e.target.value })} label="">
              <option value="">{t('reserves.toutesSeverites')}</option>
              {severites.map((value) => <option key={value} value={value}>{enumLabel(value, SEVERITES[value]?.label)}</option>)}
            </Select>
            <Select value={filters.lotId} onChange={(e) => setFilters({ ...filters, lotId: e.target.value })} label="">
              <option value="">{t('reserves.tousLots')}</option>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </Select>
            <button
          className="btn btn-ghost"
          onClick={load}
          title={t('layout:actions.rafraichir')}
          aria-label={t('layout:actions.rafraichir')}
        ><RefreshCw size={16} /></button>
          </div>

          {loading ? <p className="text-muted">{t('etats.chargement')}</p>
            : items.length === 0 ? <EmptyState title={t('reserves.videTitre')} message={t('reserves.videMessage')} />
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('reserves.colNumero')}</th><th>{t('reserves.colReserve')}</th><th>{t('reserves.severite')}</th><th>{tCorps('selecteur.label')}</th><th>{t('reserves.lot')}</th><th>{t('champs.statut')}</th><th>{t('reserves.echeance')}</th><th></th></tr></thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.numero}</strong></td>
                        <td>
                          <button className="link" onClick={() => setViewing(r)}>{r.titre}</button>
                          <div className="text-muted" style={{ fontSize: 12 }}>{r.partenaire?.nom || r.entreprise?.nom || r.entreprise || '—'}</div>
                        </td>
                        <td><Badge tone={SEVERITES[r.severite]?.tone}>{enumLabel(r.severite, SEVERITES[r.severite]?.label || r.severite)}</Badge></td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{r.corpsEtat?.nom || enumLabel(r.categorie, r.categorie)}</td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{r.lot?.nom || '—'}</td>
                        <td><Badge statusKey={r.statut} /></td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(r.date_limite)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setViewing(r)} title={t('champs.details')}><Eye size={14} /></button>
                          {canAct && <button className="btn btn-ghost btn-sm" onClick={() => duplicate(r)} title={t('actions.dupliquer')}><Copy size={14} /></button>}
                          {canDelete && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(r)} title={t('actions.supprimer')}><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          <Pagination total={total} page={page} limit={limit} onPage={setPage} />
        </div>
      </div>

      <ReserveCreateModal open={showCreate} onClose={() => setShowCreate(false)} chantierId={chantierId} lots={lots} onSaved={load} />
      <ReserveDetailModal reserve={viewing} onClose={() => setViewing(null)} onChanged={load} canAct={canAct} canDelete={canDelete} />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} chantierId={chantierId} onImported={load} />
    </>
  );
}

/* ============ Création (simple + série) ============ */
function ReserveCreateModal({ open, onClose, chantierId, lots, onSaved }) {
  const severites = useEnum('severites');
  const { t } = useTranslation('chantier');
  // Namespace distinct : le catalogue des métiers porte ses propres libellés,
  // partagés par l'écran d'administration et par tous les formulaires.
  const { t: tCorps } = useTranslation('corpsEtat');
  const { corpsEtat, chargement: corpsChargement } = useCorpsEtatActifs();
  const { t: tPhase } = useTranslation('phase');
  const { phases, chargement: phasesChargement } = usePhasesActives();
  const [mode, setMode] = useState('simple'); // simple | serie
  const [form, setForm] = useState({ titre: '', nombre: 5, description: '', severite: 'moyenne', priorite: 'moyenne', phaseId: '', corpsEtatId: '', lotId: '', batimentId: '', etageId: '', assigneA: '', partenaireId: '', date_limite: '' });
  const [membres, setMembres] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ titre: '', nombre: 5, description: '', severite: 'moyenne', priorite: 'moyenne', phaseId: '', corpsEtatId: '', lotId: '', batimentId: '', etageId: '', assigneA: '', partenaireId: '', date_limite: '' });
    listerMembresChantier(chantierId).then((d) => setMembres(d.items)).catch(() => {});
    listerPartenaires({ limit: 100 }).then((d) => setPartenaires(d.items)).catch(() => {});
  }, [open, chantierId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return SwalCustom.error(t('reserves.titreRequis'));
    // La phase est obligatoire. Le serveur l'impose aussi (creerReserveSchema) :
    // ce contrôle n'est qu'un raccourci pour éviter un aller-retour inutile.
    if (!form.phaseId) return SwalCustom.error(tPhase('selecteur.requise'));
    setSaving(true);
    try {
      const base = {
        description: form.description, severite: form.severite, priorite: form.priorite,
        phaseId: form.phaseId,
        corpsEtatId: form.corpsEtatId || undefined, lotId: form.lotId || undefined, batimentId: form.batimentId || undefined,
        etageId: form.etageId || undefined, assigneA: form.assigneA || undefined,
        partenaireId: form.partenaireId || undefined, date_limite: form.date_limite || undefined,
      };
      if (mode === 'simple') {
        await creerReserve(chantierId, { ...base, titre: form.titre });
        SwalCustom.success(t('reserves.creee'));
      } else {
        await creerSerieReserves(chantierId, { ...base, titre: form.titre, nombre: Number(form.nombre) });
        SwalCustom.success(t('reserves.serieCreee'));
      }
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: t('commun.creationImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('reserves.modalNouvelle')} size="lg" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : mode === 'serie' ? t('reserves.creerSerie') : t('actions.creer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          <button type="button" className={`tab-btn ${mode === 'simple' ? 'active' : ''}`} onClick={() => setMode('simple')}>{t('reserves.modeSimple')}</button>
          <button type="button" className={`tab-btn ${mode === 'serie' ? 'active' : ''}`} onClick={() => setMode('serie')}>{t('reserves.modeSerie')}</button>
        </div>
        <div className="grid-2">
          <Input label={mode === 'serie' ? t('reserves.titreBase') : t('champs.titre')} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required />
          {mode === 'serie' && <Input label={t('reserves.nombre')} type="number" min="1" max="100" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />}
        </div>
        <Textarea label={t('champs.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div className="grid-3">
          <Select label={t('reserves.severite')} value={form.severite} onChange={(e) => setForm({ ...form, severite: e.target.value })}>
            {severites.map((value) => <option key={value} value={value}>{enumLabel(value, SEVERITES[value]?.label)}</option>)}
          </Select>
          <Select label={t('reserves.priorite')} value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })}>
            {severites.map((value) => <option key={value} value={value}>{enumLabel(value, SEVERITES[value]?.label)}</option>)}
          </Select>
          <Select
            label={tPhase('selecteur.label')}
            value={form.phaseId}
            onChange={(e) => setForm({ ...form, phaseId: e.target.value })}
            required
          >
            <option value="">{phasesChargement ? tPhase('selecteur.chargement') : tPhase('selecteur.choisir')}</option>
            {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.nom}</option>)}
          </Select>
          <Select label={tCorps('selecteur.label')} value={form.corpsEtatId} onChange={(e) => setForm({ ...form, corpsEtatId: e.target.value })}>
            <option value="">{corpsChargement ? tCorps('selecteur.chargement') : tCorps('selecteur.aucun')}</option>
            {corpsEtat.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Select>
        </div>
        <div className="grid-3">
          <Select label={t('reserves.lot')} value={form.lotId} onChange={(e) => setForm({ ...form, lotId: e.target.value })} emptyOption>
            <option value="">{t('reserves.aucunM')}</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </Select>
          <Select label={t('reserves.assigneeA')} value={form.assigneA} onChange={(e) => setForm({ ...form, assigneA: e.target.value })} emptyOption>
            <option value="">{t('reserves.nonAssignee')}</option>
            {membres.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
          </Select>
          <Select label={t('commun.entreprise')} value={form.partenaireId} onChange={(e) => setForm({ ...form, partenaireId: e.target.value })} emptyOption>
            <option value="">{t('reserves.aucuneF')}</option>
            {partenaires.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Select>
        </div>
        <Input label={t('champs.dateLimite')} type="date" value={form.date_limite} onChange={(e) => setForm({ ...form, date_limite: e.target.value })} />
      </form>
    </Modal>
  );
}

/* ============ Détail réserve ============ */
/**
 * Détail d'une réserve en MODALE, depuis la liste d'un chantier.
 *
 * Ne contient plus que le cadre : la donnée vient de `useReserveDetail`, le
 * contenu de `ReserveDetailCorps` — tous deux partagés avec la page
 * `/reserves/:id`. Les deux vues ne peuvent donc plus diverger.
 */
function ReserveDetailModal({ reserve, onClose, onChanged, canAct, canDelete }) {
  const { t } = useTranslation('chantier');
  const etat = useReserveDetail(reserve?.id ?? null, { onChanged });
  const { detail } = etat;

  return (
    <Modal
      open={!!reserve}
      onClose={onClose}
      title={detail ? `${detail.numero} — ${detail.titre}` : t('reserves.fallbackTitre')}
      size="lg"
      footer={reserve && detail ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Vers la page dédiée : c'est le seul endroit d'où l'on obtient
              une URL partageable pour cette réserve. */}
          <Link to={`/reserves/${detail.id}`} className="btn btn-ghost btn-sm" onClick={onClose}>
            <ExternalLink size={14} /> {t('reserves.ouvrirPage')}
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={etat.chargerQr}>
            <QrCode size={14} /> {t('reserves.qrCode')}
          </button>
          {canAct && <button className="btn btn-secondary btn-sm" onClick={() => etat.signer('signature')}>{t('actions.signer')}</button>}
          {canAct && <button className="btn btn-primary btn-sm" onClick={() => etat.signer('validation')}>{t('actions.valider')}</button>}
          {canAct && <button className="btn btn-danger btn-sm" onClick={() => etat.signer('refus')}>{t('actions.refuser')}</button>}
        </div>
      ) : null}
    >
      <ReserveDetailCorps etat={etat} canAct={canAct} canDelete={canDelete} onChanged={onChanged} />
    </Modal>
  );
}

/* ============ Import Excel ============ */
function ImportModal({ open, onClose, chantierId, onImported }) {
  const { t } = useTranslation('chantier');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return SwalCustom.error(t('reserves.choisirFichierExcel'));
    setSaving(true);
    try {
      await importerExcelReserves(chantierId, file);
      SwalCustom.success(t('reserves.importEffectue'));
      onClose();
      onImported();
    } catch (err) { SwalCustom.error({ title: t('commun.importImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('reserves.importTitre')} size="sm" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Download size={15} /> {t('actions.importer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <input type="file" accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files[0] || null)} className="input" />
        <div className="hint">{t('reserves.importHint')}</div>
      </form>
    </Modal>
  );
}
