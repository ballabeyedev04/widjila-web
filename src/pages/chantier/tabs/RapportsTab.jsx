import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, FileText, Download, BarChart3 } from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import Modal from '../../../components/Modal.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Select } from '../../../components/FormControls.jsx';
import { genererRapport, listerRapports, getRapport, supprimerRapport } from '../../../service/rapport/rapportService.js';
import { listerLots } from '../../../service/chantier/chantierService.js';
import { listerPartenaires } from '../../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate } from '../../../utils/format.js';
import { useUser } from '../../../context/useUser.js';
import { ROLES_PILOTAGE, ROLES_OPERATIONNELS, roleAllowed, enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

// Libellés dans le namespace i18n `chantier` (rapports.types.<valeur>).
const TYPES_RAPPORT = ['reserves', 'entreprise', 'batiment', 'qualite', 'visite', 'opr'];

export default function RapportsTab({ chantierId }) {
  const { t } = useTranslation('chantier');
  const { user } = useUser();
  const role = user?.role;
  const canGen = roleAllowed(role, ROLES_PILOTAGE);
  const canDelete = roleAllowed(role, ROLES_OPERATIONNELS);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerRapports(chantierId);
      setItems(d.items);
    } catch (err) {
      SwalCustom.error({ title: t('rapports.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, t]);
  useEffect(() => { load(); }, [load]);

  const remove = async (r) => {
    const res = await SwalCustom.confirm({ title: t('rapports.supprimerTitre'), icon: 'warning', danger: true });
    if (!res) return;
    try { await supprimerRapport(r.id); SwalCustom.success(t('rapports.supprime')); load(); }
    catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>{t('rapports.titre', { n: items.length })}</h2>
          {canGen && <button className="btn btn-primary btn-sm" onClick={() => setShowGen(true)}><Plus size={14} /> {t('rapports.generer')}</button>}
        </div>
        <div className="card-body">
          {loading ? <p className="text-muted">{t('etats.chargement')}</p>
            : items.length === 0 ? <EmptyState title={t('rapports.videTitre')} message={t('rapports.videMessage')} />
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t('champs.type')}</th><th>{t('champs.statut')}</th><th>{t('rapports.colGenereLe')}</th><th></th></tr></thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id}>
                        <td><Badge tone="info">{TYPES_RAPPORT.includes(r.type) ? t(`rapports.types.${r.type}`) : r.type}</Badge></td>
                        <td className="text-muted">{enumLabel(r.statut, r.statut)}</td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(r.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setViewing(r)}><Download size={14} /></button>
                          {canDelete && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(r)}><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>

      <GenererRapportModal open={showGen} onClose={() => setShowGen(false)} chantierId={chantierId} onGenerated={load} />
      <RapportViewerModal rapport={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

function GenererRapportModal({ open, onClose, chantierId, onGenerated }) {
  const { t } = useTranslation('chantier');
  const [form, setForm] = useState({ type: 'reserves', statut: '', entrepriseId: '', batimentId: '' });
  const [batiments, setBatiments] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ type: 'reserves', statut: '', entrepriseId: '', batimentId: '' });
    listerLots(chantierId).then((d) => setBatiments(d.items)).catch(() => {});
    listerPartenaires({ limit: 100 }).then((d) => setPartenaires(d.items)).catch(() => {});
  }, [open, chantierId]);

  const submit = async () => {
    setSaving(true);
    try {
      await genererRapport(chantierId, {
        type: form.type,
        statut: form.statut || undefined,
        entrepriseId: form.entrepriseId || undefined,
        batimentId: form.batimentId || undefined,
      });
      SwalCustom.success(t('rapports.genere'));
      onClose();
      onGenerated();
    } catch (err) { SwalCustom.error({ title: t('commun.generationImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('rapports.modalGenerer')} size="sm" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><BarChart3 size={15} /> {t('rapports.btnGenerer')}</button>
      </>
    }>
      <Select label={t('rapports.typeRapport')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        {TYPES_RAPPORT.map((v) => <option key={v} value={v}>{t(`rapports.types.${v}`)}</option>)}
      </Select>
      {form.type === 'reserves' && (
        <Select label={t('rapports.filtrerStatut')} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} emptyOption>
          <option value="">{t('commun.tousStatuts')}</option>
          {['creee', 'affectee', 'en_cours', 'corrigee', 'a_verifier', 'validee', 'refusee', 'rouverte', 'cloturee'].map((s) => <option key={s} value={s}>{enumLabel(s, s.replace(/_/g, ' '))}</option>)}
        </Select>
      )}
      {form.type === 'entreprise' && (
        <Select label={t('commun.entreprise')} value={form.entrepriseId} onChange={(e) => setForm({ ...form, entrepriseId: e.target.value })} emptyOption>
          <option value="">{t('etats.toutes')}</option>
          {partenaires.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </Select>
      )}
      {form.type === 'batiment' && (
        <Select label={t('rapports.batimentLot')} value={form.batimentId} onChange={(e) => setForm({ ...form, batimentId: e.target.value })} emptyOption>
          <option value="">{t('etats.tous')}</option>
          {batiments.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </Select>
      )}
    </Modal>
  );
}

function RapportViewerModal({ rapport, onClose }) {
  const { t } = useTranslation('chantier');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rapport) return;
    setLoading(true);
    (async () => {
      try {
        const d = await getRapport(rapport.id);
        setDetail(d);
      } catch (err) { SwalCustom.error(getErrorMessage(err)); }
      finally { setLoading(false); }
    })();
  }, [rapport]);

  const url = detail?.fichier_url || null;

  return (
    <Modal open={!!rapport} onClose={onClose} title={detail ? t('rapports.viewerTitre', { type: TYPES_RAPPORT.includes(detail.type) ? t(`rapports.types.${detail.type}`) : (detail.type || '') }) : t('rapports.fallbackTitre')} size="lg" footer={
      url ? <a className="btn btn-primary btn-sm" href={url} target="_blank" rel="noreferrer"><Download size={14} /> {t('rapports.telechargerPdf')}</a> : null
    }>
      {loading ? <p className="text-muted">{t('etats.chargement')}</p> : url ? (
        <iframe title={t('rapports.fallbackTitre')} src={url} style={{ width: '100%', height: 520, border: '1px solid var(--border)', borderRadius: 10 }} />
      ) : (
        <p className="text-muted">{t('rapports.indisponible')}</p>
      )}
    </Modal>
  );
}
