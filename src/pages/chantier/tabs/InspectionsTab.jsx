import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, X, Eye, Trash2, ClipboardCheck, Camera, UserPlus, ListChecks, Pencil, Check, XCircle, Users,
} from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import Modal from '../../../components/Modal.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Select, Textarea } from '../../../components/FormControls.jsx';
import {
  listerInspections, creerInspection, getInspection, modifierInspection, supprimerInspection,
  cocherChecklist, ajouterPhotoInspection, listerPhotosInspection,
  listerModeles, creerModele, modifierModele, supprimerModele,
  listerConvocations, convier, repondreConvocation, retirerConvocation,
} from '../../../service/inspection/inspectionService.js';
import { listerMembresChantier } from '../../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate } from '../../../utils/format.js';
import { TYPES_INSPECTION, STATUTS_INSPECTION, STATUTS_CONVOCATION, enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

export default function InspectionsTab({ chantierId, canManage }) {
  const { t } = useTranslation('chantier');
  const [filters, setFilters] = useState({ search: '', type: '', statut: '' });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [showModeles, setShowModeles] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerInspections(chantierId, { page: 1, limit: 50, ...filters });
      setItems(d.items);
      setTotal(d.total);
    } catch (err) {
      SwalCustom.error({ title: t('inspections.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, filters, t]);
  useEffect(() => { load(); }, [load]);

  const remove = async (i) => {
    const res = await SwalCustom.confirm({ title: t('inspections.supprimerTitre'), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerInspection(i.id);
      SwalCustom.success(t('inspections.supprimee'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>{t('inspections.titre', { n: total })}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowModeles(true)}><ListChecks size={14} /> {t('inspections.modeles')}</button>
            {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> {t('inspections.nouvelle')}</button>}
          </div>
        </div>
        <div className="card-body">
          <div className="filter-bar" style={{ marginBottom: 14 }}>
            <div className="search-box">
              <Search size={16} />
              <input className="input" placeholder={t('commun.rechercher')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              {filters.search && <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}><X size={14} /></button>}
            </div>
            <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} label="">
              <option value="">{t('commun.tousTypes')}</option>
              {Object.entries(TYPES_INSPECTION).map(([value, label]) => <option key={value} value={value}>{enumLabel(value, label)}</option>)}
            </Select>
            <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
              <option value="">{t('commun.tousStatuts')}</option>
              {Object.entries(STATUTS_INSPECTION).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
            </Select>
          </div>

          {loading ? <p className="text-muted">{t('etats.chargement')}</p>
            : items.length === 0 ? <EmptyState title={t('inspections.videTitre')} message={t('inspections.videMessage')} />
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('champs.type')}</th><th>{t('champs.date')}</th><th>{t('champs.statut')}</th><th>{t('inspections.colChecklist')}</th><th>{t('inspections.colInspecteur')}</th><th></th></tr></thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id}>
                        <td><Badge tone={i.type === 'opr' ? 'warning' : i.type === 'visite_contradictoire' ? 'info' : 'primary'}>{enumLabel(i.type, TYPES_INSPECTION[i.type] || i.type)}</Badge></td>
                        <td>{formatDate(i.date_visite)}</td>
                        <td><Badge statusKey={i.statut} /></td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{(i.checklist || []).filter((c) => c.coche).length}/{(i.checklist || []).length}</td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{i.inspecteur ? `${i.inspecteur.prenom} ${i.inspecteur.nom}` : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setViewing(i)}><Eye size={14} /></button>
                          {canManage && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(i)}><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>

      <InspectionCreateModal open={showCreate} onClose={() => setShowCreate(false)} chantierId={chantierId} onSaved={load} />
      <InspectionDetailModal inspection={viewing} onClose={() => setViewing(null)} onChanged={load} canManage={canManage} />
      <ModelesModal open={showModeles} onClose={() => setShowModeles(false)} canManage={canManage} />
    </>
  );
}

/* ============ Création ============ */
function InspectionCreateModal({ open, onClose, chantierId, onSaved }) {
  const { t } = useTranslation('chantier');
  const [form, setForm] = useState({ type: 'inspection', date_visite: '', inspecteurId: '', modeleId: '' });
  const [checklist, setChecklist] = useState([{ libelle: '', coche: false, commentaire: '' }]);
  const [membres, setMembres] = useState([]);
  const [modeles, setModeles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ type: 'inspection', date_visite: '', inspecteurId: '', modeleId: '' });
    setChecklist([{ libelle: '', coche: false, commentaire: '' }]);
    listerMembresChantier(chantierId).then((d) => setMembres(d.items)).catch(() => {});
    listerModeles().then((d) => setModeles(d.items)).catch(() => {});
  }, [open, chantierId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.date_visite) return SwalCustom.error(t('inspections.dateRequise'));
    const items = checklist.filter((c) => c.libelle.trim());
    if (items.length === 0 && !form.modeleId) return SwalCustom.error(t('inspections.pointOuModeleRequis'));
    setSaving(true);
    try {
      await creerInspection(chantierId, {
        type: form.type, date_visite: form.date_visite,
        inspecteurId: form.inspecteurId || undefined,
        modeleId: form.modeleId || undefined,
        checklist: items.map((c) => ({ libelle: c.libelle.trim() })),
      });
      SwalCustom.success(t('inspections.planifiee'));
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: t('commun.creationImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  const addLine = () => setChecklist([...checklist, { libelle: '', coche: false, commentaire: '' }]);
  const setLine = (i, v) => setChecklist(checklist.map((c, idx) => (idx === i ? { ...c, ...v } : c)));

  return (
    <Modal open={open} onClose={onClose} title={t('inspections.modalNouvelle')} size="lg" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : t('inspections.planifier')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="grid-3">
          <Select label={t('champs.type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPES_INSPECTION).map(([value, label]) => <option key={value} value={value}>{enumLabel(value, label)}</option>)}
          </Select>
          <Input label={t('inspections.dateVisite')} type="date" value={form.date_visite} onChange={(e) => setForm({ ...form, date_visite: e.target.value })} required />
          <Select label={t('inspections.inspecteur')} value={form.inspecteurId} onChange={(e) => setForm({ ...form, inspecteurId: e.target.value })} emptyOption>
            <option value="">{t('inspections.nonDefini')}</option>
            {membres.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
          </Select>
        </div>
        <div className="field">
          <label>{t('inspections.modeleChecklist')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input" value={form.modeleId} onChange={(e) => {
              const id = e.target.value;
              setForm({ ...form, modeleId: id });
              if (id) {
                const m = modeles.find((x) => x.id === id);
                if (m?.items?.length) setChecklist((m.items || []).map((it) => ({ libelle: typeof it === 'string' ? it : it?.libelle || '', coche: false, commentaire: '' })));
              } else {
                setChecklist([{ libelle: '', coche: false, commentaire: '' }]);
              }
            }}>
              <option value="">{t('inspections.aucunModele')}</option>
              {modeles.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>{t('inspections.pointsControle')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {checklist.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input className="input" placeholder={t('inspections.point', { n: i + 1 })} value={c.libelle} onChange={(e) => setLine(i, { libelle: e.target.value })} />
                {checklist.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChecklist(checklist.filter((_, idx) => idx !== i))}><X size={14} /></button>}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={addLine}><Plus size={14} /> {t('inspections.ajouterPoint')}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ============ Détail ============ */
function InspectionDetailModal({ inspection, onClose, onChanged, canManage }) {
  const { t } = useTranslation('chantier');
  const [detail, setDetail] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [convocations, setConvocations] = useState([]);
  const [membres, setMembres] = useState([]);
  const [compteRendu, setCompteRendu] = useState('');
  const [newStatut, setNewStatut] = useState('');
  const [tab, setTab] = useState('checklist');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!inspection) return;
    setLoading(true);
    try {
      const [d, p, c] = await Promise.all([
        getInspection(inspection.id), listerPhotosInspection(inspection.id), listerConvocations(inspection.id),
      ]);
      setDetail(d);
      setPhotos(p.items);
      setConvocations(c.items);
      setCompteRendu(d.compte_rendu || '');
      if (d.chantierId) listerMembresChantier(d.chantierId).then((r) => setMembres(r.items)).catch(() => {});
    } catch (err) {
      SwalCustom.error({ title: t('inspections.erreurChargementDetail'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [inspection, t]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  const toggleChecklist = async (item, coche) => {
    try {
      await cocherChecklist(inspection.id, item.id, { coche, commentaire: item.commentaire || undefined });
      setDetail((d) => ({ ...d, checklist: d.checklist.map((x) => (x.id === item.id ? { ...x, coche } : x)) }));
      onChanged();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const saveCompteRendu = async () => {
    setSaving(true);
    try {
      await modifierInspection(inspection.id, { compte_rendu: compteRendu });
      SwalCustom.success(t('inspections.compteRenduEnregistre'));
      onChanged();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const changeStatut = async () => {
    if (!newStatut) return;
    try {
      await modifierInspection(inspection.id, { statut: newStatut });
      SwalCustom.success(t('commun.statutMisAJour'));
      setNewStatut('');
      loadDetail();
      onChanged();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const invite = async (utilisateurId) => {
    try {
      await convier(inspection.id, { utilisateurId });
      SwalCustom.success(t('inspections.membreConvie'));
      loadDetail();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const setConv = async (cv, statut) => {
    try {
      await repondreConvocation(inspection.id, cv.id, { statut });
      SwalCustom.success(t('inspections.convocationMiseAJour'));
      loadDetail();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const addPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await ajouterPhotoInspection(inspection.id, file);
      SwalCustom.success(t('inspections.photoAjoutee'));
      loadDetail();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    e.target.value = '';
  };

  const TABS = [
    { key: 'checklist', label: t('inspections.ongletChecklist'), icon: ListChecks },
    { key: 'compte_rendu', label: t('inspections.ongletCompteRendu'), icon: ClipboardCheck },
    { key: 'convocations', label: t('inspections.ongletConvocations', { n: convocations.length }), icon: Users },
    { key: 'photos', label: t('inspections.ongletPhotos', { n: photos.length }), icon: Camera },
  ];

  return (
    <Modal open={!!inspection} onClose={onClose} title={detail ? `${enumLabel(detail.type, TYPES_INSPECTION[detail.type] || detail.type)} — ${formatDate(detail.date_visite)}` : t('inspections.fallbackTitre')} size="lg">
      {loading ? <p className="text-muted">{t('etats.chargement')}</p> : detail && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <Badge statusKey={detail.statut} />
            <span className="text-muted" style={{ fontSize: 13 }}>{t('inspections.inspecteurLabel')} {detail.inspecteur ? `${detail.inspecteur.prenom} ${detail.inspecteur.nom}` : '—'}</span>
            {canManage && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
                <select className="input" style={{ width: 160 }} value={newStatut} onChange={(e) => setNewStatut(e.target.value)}>
                  <option value="">{t('inspections.changerStatutPlaceholder')}</option>
                  {Object.entries(STATUTS_INSPECTION).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={changeStatut} disabled={!newStatut}>{t('inspections.ok')}</button>
              </div>
            )}
          </div>

          <div className="tabs-bar" style={{ marginBottom: 12 }}>
        {TABS.map((x) => { const Icon = x.icon; return <button key={x.key} className={`tab-btn ${tab === x.key ? 'active' : ''}`} onClick={() => setTab(x.key)}><Icon size={14} /> {x.label}</button>; })}
      </div>

          {tab === 'checklist' && (
            <div>
              {!detail.checklist?.length ? <p className="text-muted">{t('inspections.aucunPoint')}</p> : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detail.checklist.map((item) => (
                    <li key={item.id || item.libelle} className="checklist-row">
                      <button
                        type="button"
                        className={`check-box ${item.coche ? 'checked' : ''}`}
                        onClick={() => toggleChecklist(item, !item.coche)}
                        disabled={!canManage}
                      >
                        {item.coche ? <Check size={13} /> : null}
                      </button>
                      <span style={{ textDecoration: item.coche ? 'line-through' : 'none', color: item.coche ? 'var(--text-muted)' : 'inherit' }}>{item.libelle}</span>
                      {item.commentaire && <span className="text-muted" style={{ fontSize: 12, display: 'block' }}>{item.commentaire}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'compte_rendu' && (
            <div>
              <Textarea label={t('inspections.compteRendu')} value={compteRendu} onChange={(e) => setCompteRendu(e.target.value)} rows={8} placeholder={t('inspections.compteRenduPlaceholder')} />
              <button className="btn btn-primary btn-sm" onClick={saveCompteRendu} disabled={saving}>{saving ? '…' : t('inspections.enregistrerCompteRendu')}</button>
            </div>
          )}

          {tab === 'convocations' && (
            <div>
              {canManage && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="input" defaultValue="" onChange={(e) => { if (e.target.value) { invite(e.target.value); e.target.value = ''; } }}>
                    <option value="">{t('inspections.convierMembre')}</option>
                    {membres.filter((m) => !convocations.some((c) => c.utilisateurId === m.id)).map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
                  </select>
                </div>
              )}
              {convocations.length === 0 ? <p className="text-muted" style={{ marginTop: 8 }}>{t('inspections.aucuneConvocation')}</p> : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {convocations.map((cv) => (
                    <li key={cv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span><strong>{cv.utilisateur?.prenom} {cv.utilisateur?.nom}</strong> <Badge statusKey={cv.statut} /></span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {canManage && <>
                          <button className="btn btn-ghost btn-sm" onClick={() => setConv(cv, 'present')}><Check size={14} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setConv(cv, 'absent')}><XCircle size={14} /></button>
                          <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={async () => { await retirerConvocation(inspection.id, cv.id); loadDetail(); }}><Trash2 size={14} /></button>
                        </>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'photos' && (
            <div>
              {canManage && <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}><Camera size={14} /> {t('inspections.ajouterPhoto')} <input type="file" accept="image/*" style={{ display: 'none' }} onChange={addPhoto} /></label>}
              <div className="grid-3" style={{ marginTop: 10 }}>
                {photos.length === 0 && <p className="text-muted">{t('inspections.aucunePhoto')}</p>}
                {photos.map((p) => (
                  <div key={p.id} className="media-thumb">
                    <img src={p.url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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

/* ============ Modèles de checklist ============ */
function ModelesModal({ open, onClose, canManage }) {
  const { t } = useTranslation('chantier');
  const [modeles, setModeles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const d = await listerModeles();
      setModeles(d.items);
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [open]);
  useEffect(() => { load(); }, [load]);

  const remove = async (m) => {
    const res = await SwalCustom.confirm({ title: t('inspections.supprimerModele', { nom: m.nom }), icon: 'warning', danger: true });
    if (!res) return;
    try { await supprimerModele(m.id); SwalCustom.success(t('inspections.modeleSupprime')); load(); }
    catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('inspections.modelesTitre')} size="lg" footer={
      canManage ? <button className="btn btn-primary btn-sm" onClick={() => setEditing({})}><Plus size={14} /> {t('inspections.nouveauModele')}</button> : null
    }>
      {loading ? <p className="text-muted">{t('etats.chargement')}</p>
        : modeles.length === 0 ? <EmptyState title={t('inspections.videModelesTitre')} message={t('inspections.videModelesMessage')} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {modeles.map((m) => (
              <div key={m.id} className="model-row">
                <div style={{ flex: 1 }}>
                  <strong>{m.nom}</strong> <Badge tone="info">{t('inspections.nbPoints', { n: m.items?.length || 0 })}</Badge>
                  {m.description && <div className="text-muted" style={{ fontSize: 12 }}>{m.description}</div>}
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(m)}><Pencil size={14} /></button>
                    <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(m)}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      <ModeleModal modele={editing} onClose={() => setEditing(null)} onSaved={load} canManage={canManage} />
    </Modal>
  );
}

function ModeleModal({ modele, onClose, onSaved, canManage }) {
  const { t } = useTranslation('chantier');
  const isEdit = !!modele?.id;
  const [form, setForm] = useState({ nom: '', description: '', items: [''] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modele) {
      setForm({ nom: modele.nom || '', description: modele.description || '', items: (modele.items || []).map((i) => (typeof i === 'string' ? i : i?.libelle || '')) });
    }
  }, [modele]);

  const submit = async () => {
    if (!form.nom.trim()) return SwalCustom.error(t('commun.nomRequisPoint'));
    const items = form.items.filter((i) => i.trim());
    if (items.length === 0) return SwalCustom.error(t('inspections.pointRequis'));
    setSaving(true);
    try {
      if (isEdit) { await modifierModele(modele.id, { nom: form.nom, description: form.description, items }); SwalCustom.success(t('inspections.modeleMisAJour')); }
      else { await creerModele({ nom: form.nom, description: form.description, items }); SwalCustom.success(t('inspections.modeleCree')); }
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!modele} onClose={onClose} title={isEdit ? t('inspections.modalModeleModifier') : t('inspections.modalModeleNouveau')} footer={
      canManage ? <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : t('actions.enregistrer')}</button>
      </> : null
    }>
      <Input label={t('commun.nom')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
      <Input label={t('champs.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="field">
        <label>{t('inspections.pointsControle')}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {form.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input className="input" value={item} onChange={(e) => setForm({ ...form, items: form.items.map((x, idx) => (idx === i ? e.target.value : x)) })} placeholder={t('inspections.point', { n: i + 1 })} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })}><X size={14} /></button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setForm({ ...form, items: [...form.items, ''] })}><Plus size={14} /> {t('actions.ajouter')}</button>
      </div>
    </Modal>
  );
}
