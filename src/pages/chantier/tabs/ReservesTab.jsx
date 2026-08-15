import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Upload, Eye, Trash2, Copy, Download, QrCode,
  Paperclip, SignpostBig, MessagesSquare, Camera, Users,
} from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import Modal from '../../../components/Modal.jsx';
import Pagination from '../../../components/Pagination.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Select, Textarea } from '../../../components/FormControls.jsx';
import { useUser } from '../../../context/useUser.js';
import {
  ROLES_RESERVE_INTERVENANTS, ROLES_OPERATIONNELS, ROLES_OPERATIONNELS_CONTROLE, roleAllowed,
} from '../../../utils/constants.js';
import {
  listerReserves, creerReserve, creerSerieReserves, getReserve, changerStatutReserve,
  supprimerReserve, dupliquerReserve, ajouterPieceJointe, listerPiecesJointes, supprimerPieceJointe,
  signerReserve, listerSignatures, affecterReserve, listerAffectations, retirerAffectation, genererQr,
  ajouterCommentaire, listerCommentaires, ajouterMedia, listerMedias, supprimerMedia,
  exporterExcelReserves, importerExcelReserves,
} from '../../../service/reserve/reserveService.js';
import { listerLots, listerMembresChantier } from '../../../service/chantier/chantierService.js';
import { listerPartenaires } from '../../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate } from '../../../utils/format.js';
import { STATUTS_RESERVE, SEVERITES, CATEGORIES_RESERVE, enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

const STATUT_FLOW = Object.keys(STATUTS_RESERVE).filter((s) => s !== 'en_retard');

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReservesTab({ chantierId }) {
  const { t } = useTranslation('chantier');
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
              {Object.entries(STATUTS_RESERVE).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
            </Select>
            <Select value={filters.severite} onChange={(e) => setFilters({ ...filters, severite: e.target.value })} label="">
              <option value="">{t('reserves.toutesSeverites')}</option>
              {Object.entries(SEVERITES).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
            </Select>
            <Select value={filters.lotId} onChange={(e) => setFilters({ ...filters, lotId: e.target.value })} label="">
              <option value="">{t('reserves.tousLots')}</option>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </Select>
            <button className="btn btn-ghost" onClick={load}><RefreshCw size={16} /></button>
          </div>

          {loading ? <p className="text-muted">{t('etats.chargement')}</p>
            : items.length === 0 ? <EmptyState title={t('reserves.videTitre')} message={t('reserves.videMessage')} />
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('reserves.colNumero')}</th><th>{t('reserves.colReserve')}</th><th>{t('reserves.severite')}</th><th>{t('champs.categorie')}</th><th>{t('reserves.lot')}</th><th>{t('champs.statut')}</th><th>{t('reserves.echeance')}</th><th></th></tr></thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.numero}</strong></td>
                        <td>
                          <button className="link" onClick={() => setViewing(r)}>{r.titre}</button>
                          <div className="text-muted" style={{ fontSize: 12 }}>{r.entreprise?.nom || r.entreprise || '—'}</div>
                        </td>
                        <td><Badge tone={SEVERITES[r.severite]?.tone}>{enumLabel(r.severite, SEVERITES[r.severite]?.label || r.severite)}</Badge></td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{enumLabel(r.categorie, CATEGORIES_RESERVE[r.categorie])}</td>
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
  const { t } = useTranslation('chantier');
  const [mode, setMode] = useState('simple'); // simple | serie
  const [form, setForm] = useState({ titre: '', nombre: 5, description: '', severite: 'moyenne', priorite: 'moyenne', categorie: 'autre', lotId: '', batimentId: '', etageId: '', assigneA: '', entrepriseId: '', date_limite: '' });
  const [membres, setMembres] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ titre: '', nombre: 5, description: '', severite: 'moyenne', priorite: 'moyenne', categorie: 'autre', lotId: '', batimentId: '', etageId: '', assigneA: '', entrepriseId: '', date_limite: '' });
    listerMembresChantier(chantierId).then((d) => setMembres(d.items)).catch(() => {});
    listerPartenaires({ limit: 100 }).then((d) => setPartenaires(d.items)).catch(() => {});
  }, [open, chantierId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return SwalCustom.error(t('reserves.titreRequis'));
    setSaving(true);
    try {
      const base = {
        description: form.description, severite: form.severite, priorite: form.priorite,
        categorie: form.categorie, lotId: form.lotId || undefined, batimentId: form.batimentId || undefined,
        etageId: form.etageId || undefined, assigneA: form.assigneA || undefined,
        entrepriseId: form.entrepriseId || undefined, date_limite: form.date_limite || undefined,
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
            {Object.entries(SEVERITES).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
          </Select>
          <Select label={t('reserves.priorite')} value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })}>
            {Object.entries(SEVERITES).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
          </Select>
          <Select label={t('champs.categorie')} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
            {Object.entries(CATEGORIES_RESERVE).map(([value, label]) => <option key={value} value={value}>{enumLabel(value, label)}</option>)}
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
          <Select label={t('commun.entreprise')} value={form.entrepriseId} onChange={(e) => setForm({ ...form, entrepriseId: e.target.value })} emptyOption>
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
function ReserveDetailModal({ reserve, onClose, onChanged, canAct, canDelete }) {
  const { t } = useTranslation('chantier');
  const [detail, setDetail] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [commentaires, setCommentaires] = useState([]);
  const [medias, setMedias] = useState([]);
  const [qr, setQr] = useState(null);
  const [tab, setTab] = useState('infos');
  const [statut, setStatut] = useState('');
  const [motif, setMotif] = useState('');
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!reserve) return;
    setLoading(true);
    try {
      const [d, p, s, a, c, m] = await Promise.all([
        getReserve(reserve.id), listerPiecesJointes(reserve.id), listerSignatures(reserve.id),
        listerAffectations(reserve.id), listerCommentaires(reserve.id), listerMedias(reserve.id),
      ]);
      setDetail(d);
      setPieces(p.items);
      setSignatures(s.items);
      setAffectations(a.items);
      setCommentaires(c.items);
      setMedias(m.items);
    } catch (err) {
      SwalCustom.error({ title: t('reserves.erreurChargementDetail'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [reserve, t]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const changeStatut = async () => {
    if (!statut) return;
    setSaving(true);
    try {
      await changerStatutReserve(reserve.id, { statut, motif: motif || undefined });
      SwalCustom.success(t('commun.statutMisAJour'));
      setMotif(''); setStatut('');
      await loadDetail();
      onChanged();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      await ajouterCommentaire(reserve.id, { message: newComment });
      setNewComment('');
      loadDetail();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const addPiece = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await ajouterPieceJointe(reserve.id, file);
      SwalCustom.success(t('reserves.pieceAjoutee'));
      loadDetail();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    e.target.value = '';
  };

  const addMedia = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await ajouterMedia(reserve.id, file);
      SwalCustom.success(t('reserves.mediaAjoute'));
      loadDetail();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    e.target.value = '';
  };

  const getQr = async () => {
    try {
      const d = await genererQr(reserve.id);
      setQr(d.qr || d.url);
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const removeAff = async (aff) => {
    try {
      await retirerAffectation(reserve.id, aff.id);
      loadDetail();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const sign = async (type) => {
    try {
      await signerReserve(reserve.id, { type });
      SwalCustom.success(t('reserves.signatureEnregistree'));
      loadDetail();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const TABS = [
    { key: 'infos', label: t('reserves.ongletInfos'), icon: Eye },
    { key: 'pieces', label: t('reserves.ongletPieces', { n: pieces.length }), icon: Paperclip },
    { key: 'signatures', label: t('reserves.ongletSignatures', { n: signatures.length }), icon: SignpostBig },
    { key: 'affectations', label: t('reserves.ongletAffectations', { n: affectations.length }), icon: Users },
    { key: 'commentaires', label: t('reserves.ongletCommentaires', { n: commentaires.length }), icon: MessagesSquare },
    { key: 'medias', label: t('reserves.ongletMedias', { n: medias.length }), icon: Camera },
  ];

  return (
    <Modal open={!!reserve} onClose={onClose} title={detail ? `${detail.numero} — ${detail.titre}` : t('reserves.fallbackTitre')} size="lg" footer={
      reserve && detail ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={getQr}><QrCode size={14} /> {t('reserves.qrCode')}</button>
          {canAct && <button className="btn btn-secondary btn-sm" onClick={() => sign('signature')}>{t('actions.signer')}</button>}
          {canAct && <button className="btn btn-primary btn-sm" onClick={() => sign('validation')}>{t('actions.valider')}</button>}
          {canAct && <button className="btn btn-danger btn-sm" onClick={() => sign('refus')}>{t('actions.refuser')}</button>}
        </div>
      ) : null
    }>
      {loading ? <p className="text-muted">{t('etats.chargement')}</p> : detail && (
        <>
          {qr && <div style={{ textAlign: 'center', marginBottom: 12 }}><img src={qr} alt={t('reserves.qrCode')} style={{ width: 140, borderRadius: 8 }} /><p className="text-muted" style={{ fontSize: 12 }}>{t('reserves.qrLegende')}</p></div>}

          <div className="kv-list" style={{ marginBottom: 14 }}>
            <div className="kv-item"><span className="k">{t('reserves.severite')}</span><span className="v"><Badge tone={SEVERITES[detail.severite]?.tone}>{enumLabel(detail.severite, SEVERITES[detail.severite]?.label || detail.severite)}</Badge></span></div>
            <div className="kv-item"><span className="k">{t('champs.statut')}</span><span className="v"><Badge statusKey={detail.statut} /></span></div>
            <div className="kv-item"><span className="k">{t('champs.categorie')}</span><span className="v">{enumLabel(detail.categorie, CATEGORIES_RESERVE[detail.categorie])}</span></div>
            <div className="kv-item"><span className="k">{t('reserves.lot')}</span><span className="v">{detail.lot?.nom || '—'}</span></div>
            <div className="kv-item"><span className="k">{t('reserves.batiment')}</span><span className="v">{detail.batiment?.nom || '—'}</span></div>
            <div className="kv-item"><span className="k">{t('commun.entreprise')}</span><span className="v">{detail.entreprise?.nom || '—'}</span></div>
            <div className="kv-item"><span className="k">{t('reserves.assigneeA')}</span><span className="v">{detail.assigne?.prenom ? `${detail.assigne.prenom} ${detail.assigne.nom}` : '—'}</span></div>
            <div className="kv-item"><span className="k">{t('champs.dateLimite')}</span><span className="v">{formatDate(detail.date_limite)}</span></div>
          </div>

          {canAct && (
            <div className="field">
              <label>{t('reserves.changerStatut')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select className="input" value={statut} onChange={(e) => setStatut(e.target.value)}>
                  <option value="">{t('reserves.choisirStatut')}</option>
                  {STATUT_FLOW.map((s) => <option key={s} value={s}>{enumLabel(s, STATUTS_RESERVE[s].label)}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={changeStatut} disabled={!statut || saving}>{saving ? '…' : t('actions.appliquer')}</button>
              </div>
              <input className="input mt-2" placeholder={t('reserves.motif')} value={motif} onChange={(e) => setMotif(e.target.value)} />
            </div>
          )}

          <div className="tabs-bar" style={{ margin: '16px 0 12px' }}>
            {TABS.map((x) => { const Icon = x.icon; return <button key={x.key} className={`tab-btn ${tab === x.key ? 'active' : ''}`} onClick={() => setTab(x.key)}><Icon size={14} /> {x.label}</button>; })}
          </div>

          {tab === 'infos' && <p className="text-secondary">{detail.description || t('commun.aucuneDescription')}</p>}

          {tab === 'pieces' && (
            <div>
              {canAct && <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}>{t('reserves.ajouterPiece')} <input type="file" style={{ display: 'none' }} onChange={addPiece} /></label>}
              {pieces.length === 0 ? <p className="text-muted" style={{ marginTop: 10 }}>{t('reserves.aucunePiece')}</p> : (
                <ul style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pieces.map((p) => (
                    <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13 }}><Paperclip size={13} style={{ verticalAlign: -2 }} /> <a href={p.fichier_url} target="_blank" rel="noopener noreferrer">{p.nom_fichier}</a></span>
                      {canDelete && <button className="btn btn-ghost btn-sm" onClick={async () => { await supprimerPieceJointe(p.id); loadDetail(); }}><Trash2 size={13} /></button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'signatures' && (
            <div>
              {signatures.length === 0 ? <p className="text-muted">{t('reserves.aucuneSignature')}</p> : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {signatures.map((s) => (
                    <li key={s.id} style={{ fontSize: 13 }}>
                      <Badge tone={s.type === 'refus' ? 'danger' : s.type === 'validation' ? 'success' : 'primary'}>{enumLabel(s.type, s.type)}</Badge>{' '}
                      {s.signataire ? `${s.signataire.prenom} ${s.signataire.nom}` : '—'} · {formatDate(s.createdAt)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'affectations' && (
            <div>
              {canAct && <AffectationForm reserveId={reserve.id} onAdded={() => { loadDetail(); onChanged(); }} />}
              {affectations.length === 0 ? <p className="text-muted" style={{ marginTop: 8 }}>{t('reserves.aucuneAffectation')}</p> : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {affectations.map((a) => (
                    <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>{a.utilisateur ? `${a.utilisateur.prenom} ${a.utilisateur.nom}` : a.entreprise?.nom || '—'} <Badge tone="info">{t('reserves.intervenant')}</Badge></span>
                      {canDelete && <button className="btn btn-ghost btn-sm" onClick={() => removeAff(a)}><Trash2 size={13} /></button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'commentaires' && (
            <div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder={t('reserves.ajouterCommentaire')} value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} />
                <button className="btn btn-primary btn-sm" onClick={addComment}>{t('reserves.envoyer')}</button>
              </div>
              {commentaires.length === 0 ? <p className="text-muted" style={{ marginTop: 8 }}>{t('reserves.aucunCommentaire')}</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {commentaires.map((c) => (
                    <div key={c.id} className="comment-bubble">
                      <div style={{ fontSize: 12.5 }}>{c.message}</div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>{c.auteur ? `${c.auteur.prenom} ${c.auteur.nom}` : '—'} · {formatDate(c.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'medias' && (
            <div>
              <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}>{t('reserves.ajouterMedia')} <input type="file" style={{ display: 'none' }} accept="image/*,video/*" onChange={addMedia} /></label>
              <div className="grid-3" style={{ marginTop: 10 }}>
                {medias.length === 0 && <p className="text-muted">{t('reserves.aucunMedia')}</p>}
                {medias.map((m) => (
                  <div key={m.id} className="media-thumb">
                    {m.url && <img src={m.url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                    {canDelete && <button className="btn btn-ghost btn-sm" onClick={async () => { await supprimerMedia(m.id); loadDetail(); }}><Trash2 size={13} /></button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function AffectationForm({ reserveId, onAdded }) {
  const { t } = useTranslation('chantier');
  const [membres, setMembres] = useState([]);
  const [utilisateurId, setUtilisateurId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listerMembresChantierForAffectation(reserveId).then(setMembres).catch(() => {});
  }, [reserveId]);

  const submit = async () => {
    if (!utilisateurId) return SwalCustom.error(t('commun.choisirMembre'));
    setSaving(true);
    try {
      await affecterReserve(reserveId, { utilisateurId });
      SwalCustom.success(t('reserves.membreAffecte'));
      setUtilisateurId('');
      onAdded();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select className="input" value={utilisateurId} onChange={(e) => setUtilisateurId(e.target.value)}>
        <option value="">{t('commun.affecterMembre')}</option>
        {membres.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
      </select>
      <button className="btn btn-secondary btn-sm" onClick={submit} disabled={saving}>{saving ? '…' : t('reserves.affecter')}</button>
    </div>
  );
}

/* Récupère les membres du chantier (un chantier est nécessaire) */
async function listerMembresChantierForAffectation(reserveId) {
  try {
    const reserve = await getReserve(reserveId);
    if (!reserve?.chantierId) return [];
    const d = await listerMembresChantier(reserve.chantierId);
    return d.items;
  } catch {
    return [];
  }
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
