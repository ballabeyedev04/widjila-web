import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Calendar, ListChecks } from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import Modal from '../../../components/Modal.jsx';
import StatCard from '../../../components/StatCard.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Textarea } from '../../../components/FormControls.jsx';
import { statsChantier } from '../../../service/dashboard/dashboardService.js';
import { listerPhases, creerPhase, modifierPhase, supprimerPhase, getCalendrier } from '../../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate, toDateInputValue } from '../../../utils/format.js';
import { STATUTS_CHANTIER, enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

// Miroir exact de l'ENUM du modèle Phase côté backend
// (backend/src/models/phase.model.js) et du schéma Joi creerPhaseSchema.
// Toute valeur hors de cette liste est rejetée en 422 par l'API.
const PHASE_STATUTS = ['planifiee', 'en_cours', 'terminee'];
const PHASE_STATUT_DEFAUT = 'planifiee';

export default function ApercuTab({ chantierId }) {
  const { t } = useTranslation('chantier');
  const [stats, setStats] = useState(null);
  const [phases, setPhases] = useState([]);
  const [calendrier, setCalendrier] = useState([]);
  const [showPhase, setShowPhase] = useState(null); // null | {mode:'create'} | {mode:'edit', phase}
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, c] = await Promise.all([statsChantier(chantierId), listerPhases(chantierId), getCalendrier(chantierId)]);
      setStats(s);
      setPhases(p.items);
      setCalendrier(c?.evenements || []);
    } catch (err) {
      SwalCustom.error({ title: t('apercu.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, t]);
  useEffect(() => { load(); }, [load]);

  const removePhase = async (phase) => {
    const res = await SwalCustom.confirm({ title: t('apercu.supprimerPhase', { nom: phase.nom }), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerPhase(chantierId, phase.id);
      SwalCustom.success(t('apercu.phaseSupprimee'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  if (loading) return <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('etats.chargement')}</div></div>;

  return (
    <>
      <div className="stat-grid">
        <StatCard label={t('apercu.statReserves')} value={stats?.reserves?.total ?? '—'} sub={t('apercu.statOuvertes', { n: stats?.reserves?.ouvertes ?? 0 })} tone="orange" />
        <StatCard label={t('apercu.statValidees')} value={stats?.reserves?.validees ?? '—'} tone="green" />
        <StatCard label={t('apercu.statEnRetard')} value={stats?.reserves?.enRetard ?? '—'} tone="red" />
        <StatCard label={t('apercu.statPlans')} value={stats?.plans ?? '—'} tone="blue" />
        <StatCard label={t('apercu.statInspections')} value={stats?.inspections ?? '—'} tone="green" />
        <StatCard label={t('apercu.statDocuments')} value={stats?.documents ?? '—'} tone="navy" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="card-header">
            <h2><ListChecks size={17} style={{ verticalAlign: -2 }} /> {t('apercu.phasesTitre')}</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPhase({ mode: 'create' })}><Plus size={14} /> {t('actions.ajouter')}</button>
          </div>
          <div className="card-body">
            {phases.length === 0 ? <p className="text-muted">{t('apercu.aucunePhase')}</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {phases.map((p) => (
                  <div key={p.id} className="phase-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{p.nom}</strong>
                        <Badge tone={p.statut === 'terminee' ? 'success' : p.statut === 'en_cours' ? 'primary' : 'neutral'}>
                          {enumLabel(p.statut || PHASE_STATUT_DEFAUT, (p.statut || PHASE_STATUT_DEFAUT).replace(/_/g, ' '))}
                        </Badge>
                      </div>
                      <div className="text-muted" style={{ fontSize: 12.5 }}>
                        {formatDate(p.date_debut)} → {formatDate(p.date_fin)} {p.ordre ? t('apercu.ordre', { n: p.ordre }) : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowPhase({ mode: 'edit', phase: p })}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => removePhase(p)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2><Calendar size={17} style={{ verticalAlign: -2 }} /> {t('apercu.calendrierTitre')}</h2></div>
          <div className="card-body">
            {calendrier.length === 0 ? <p className="text-muted">{t('apercu.aucuneEcheance')}</p> : (
              <div className="timeline">
                {calendrier.slice(0, 15).map((e) => (
                  <div key={`${e.type}-${e.id}`} className="timeline-item">
                    <div className={`timeline-dot ${e.type}`} />
                    <div>
                      <div style={{ fontSize: 13.5 }}><strong>{e.titre}</strong> <Badge tone={e.type === 'reserve' ? 'warning' : e.type === 'inspection' ? 'info' : 'primary'}>{enumLabel(e.type, e.type)}</Badge></div>
                      <div className="text-muted" style={{ fontSize: 12.5 }}>{formatDate(e.dateDebut)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PhaseModal
        open={!!showPhase}
        onClose={() => setShowPhase(null)}
        chantierId={chantierId}
        phase={showPhase?.mode === 'edit' ? showPhase.phase : null}
        onSaved={load}
      />
    </>
  );
}

function PhaseModal({ open, onClose, chantierId, phase, onSaved }) {
  const { t } = useTranslation('chantier');
  const isEdit = !!phase;
  // Les noms de champs suivent le contrat de l'API (snake_case) : le schéma Joi
  // valide avec stripUnknown, une clé en camelCase serait retirée en silence.
  const [form, setForm] = useState({ nom: '', description: '', date_debut: '', date_fin: '', statut: PHASE_STATUT_DEFAUT, ordre: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (phase) {
      setForm({
        nom: phase.nom || '', description: phase.description || '',
        date_debut: toDateInputValue(phase.date_debut), date_fin: toDateInputValue(phase.date_fin),
        statut: phase.statut || PHASE_STATUT_DEFAUT, ordre: phase.ordre ?? '',
      });
    } else {
      setForm({ nom: '', description: '', date_debut: '', date_fin: '', statut: PHASE_STATUT_DEFAUT, ordre: '' });
    }
    setErrors({});
  }, [open, phase]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('commun.nomRequis');
    if (form.date_debut && form.date_fin && new Date(form.date_debut) > new Date(form.date_fin)) errs.date_fin = t('apercu.finApresDebut');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = { nom: form.nom, description: form.description, date_debut: form.date_debut || undefined, date_fin: form.date_fin || undefined, statut: form.statut, ordre: form.ordre === '' ? undefined : Number(form.ordre) };
      if (isEdit) { await modifierPhase(chantierId, phase.id, payload); SwalCustom.success(t('apercu.phaseMiseAJour')); }
      else { await creerPhase(chantierId, payload); SwalCustom.success(t('apercu.phaseCreee')); }
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: isEdit ? t('commun.majImpossible') : t('commun.creationImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('apercu.modalModifier') : t('apercu.modalNouvelle')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : isEdit ? t('actions.enregistrer') : t('actions.creer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="grid-2">
          <Input label={t('commun.nom')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
          <Input label={t('apercu.ordreLabel')} type="number" value={form.ordre} onChange={(e) => setForm({ ...form, ordre: e.target.value })} />
        </div>
        <Textarea label={t('champs.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div className="grid-2">
          <Input label={t('champs.dateDebut')} type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
          <Input label={t('champs.dateFin')} type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} error={errors.date_fin} />
        </div>
        <div className="field">
          <label>{t('champs.statut')}</label>
          <select className="input" value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
            {PHASE_STATUTS.map((s) => <option key={s} value={s}>{enumLabel(s, s.replace(/_/g, ' '))}</option>)}
          </select>
        </div>
      </form>
    </Modal>
  );
}
