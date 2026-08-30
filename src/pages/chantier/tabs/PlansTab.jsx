import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Upload, Trash2, Eye, FileText, MapPin, Clock, Layers, GitCompare, Compass, List } from 'lucide-react';

import Modal from '../../../components/Modal.jsx';

/**
 * Le parcours de consultation embarque pdf.js (~450 Ko) pour rendre les plans.
 * Chargé statiquement, ce poids partait dans le bundle principal et retardait
 * l'affichage de l'écran de connexion — pour une bibliothèque dont seuls les
 * utilisateurs qui ouvrent un plan ont besoin. `lazy` le range dans un chunk
 * séparé, téléchargé à la première ouverture de l'onglet.
 */
const PlanNavigateur = lazy(() => import('../../../components/plan/PlanNavigateur.jsx'));

/**
 * L'aperçu embarque pdf.js, comme le parcours : il est donc chargé à la
 * demande lui aussi, pour que la liste s'affiche sans attendre la
 * bibliothèque de rendu.
 */
const PlanVignette = lazy(() => import('../../../components/plan/PlanVignette.jsx'));
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Select } from '../../../components/FormControls.jsx';
import {
  uploaderPlan, listerPlans, supprimerPlan, listerVersions, listerAnnotations,
  creerAnnotation, supprimerAnnotation, fetchFichierBlob,
} from '../../../service/plan/planService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate } from '../../../utils/format.js';
import { enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

const TYPES_ANNOTATION = ['marqueur', 'dessin', 'mesure', 'texte', 'lien', 'cercle', 'rectangle', 'fleche'];

export default function PlansTab({ chantierId, chantier, canManage, canCreerReserve }) {
  const { t } = useTranslation('chantier');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewing, setViewing] = useState(null);
  // « Parcourir » est le mode par défaut : c'est le parcours décrit par le
  // guide client (plan global → bâtiment → étage → appartement → réserve).
  // « Tous les plans » conserve la gestion documentaire — import, versions,
  // annotations, suppression — qui n'a pas sa place dans un parcours de
  // consultation mais reste indispensable à ceux qui déposent les plans.
  const [vue, setVue] = useState('parcourir');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerPlans(chantierId);
      setPlans(d.items);
    } catch (err) {
      SwalCustom.error({ title: t('plans.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, t]);
  useEffect(() => { load(); }, [load]);

  const remove = async (p) => {
    const res = await SwalCustom.confirm({ title: t('plans.supprimerTitre', { nom: p.nom }), text: t('plans.supprimerTexte'), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerPlan(p.id);
      SwalCustom.success(t('plans.supprime'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <>
      <div className="tabs-bar" style={{ marginBottom: 14 }}>
        <button className={`tab ${vue === 'parcourir' ? 'active' : ''}`} onClick={() => setVue('parcourir')}>
          <Compass size={15} /> {t('plans.parcourir')}
        </button>
        <button className={`tab ${vue === 'liste' ? 'active' : ''}`} onClick={() => setVue('liste')}>
          <List size={15} /> {t('plans.tousLesPlans')}
        </button>
      </div>

      {vue === 'parcourir' && chantier && (
        <Suspense fallback={<p className="text-muted">{t('etats.chargement')}</p>}>
          <PlanNavigateur chantier={chantier} canManage={canManage} canCreerReserve={canCreerReserve} />
        </Suspense>
      )}

      {vue === 'liste' && (
      <div className="card">
        <div className="card-header">
          <h2>{t('plans.titre', { n: plans.length })}</h2>
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}><Plus size={14} /> {t('plans.importer')}</button>}
        </div>
        <div className="card-body">
          {loading ? <p className="text-muted">{t('etats.chargement')}</p>
            : plans.length === 0 ? <EmptyState title={t('plans.videTitre')} message={t('plans.videMessage')} />
            : (
              <div className="grid-3">
                {plans.map((p) => (
                  <div key={p.id} className="plan-card">
                    <div className="plan-thumb" onClick={() => setViewing(p)}>
                      {/* La première page du document, plutôt qu'un
                          pictogramme : c'est ce qui permet de reconnaître un
                          plan sans l'ouvrir. Le repli reste l'icône, dans le
                          Suspense comme en cas d'échec de rendu. */}
                      <Suspense fallback={<FileText size={34} />}>
                        <PlanVignette
                          plan={p}
                          className="plan-thumb-apercu"
                          Icone={p.format === 'pdf' ? FileText : Layers}
                          tailleIcone={34}
                        />
                      </Suspense>
                      <span className="plan-format">{p.format?.toUpperCase() || '—'}</span>
                    </div>
                    <div className="plan-meta">
                      <strong>{p.nom}</strong>
                      <div className="text-muted" style={{ fontSize: 12 }}>V{p.numeroVersion || p.version || 1} · {formatDate(p.createdAt)}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        <MapPin size={12} style={{ verticalAlign: -2 }} /> {p.zone?.nom || t('plans.chantierEntier')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewing(p)}><Eye size={13} /> {t('actions.voir')}</button>
                      {canManage && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(p)}><Trash2 size={13} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} chantierId={chantierId} chantier={chantier} onSaved={load} />
      <PlanViewerModal plan={viewing} onClose={() => setViewing(null)} canManage={canManage} onChanged={load} />
    </>
  );
}

function UploadModal({ open, onClose, chantierId, chantier, onSaved }) {
  const { t } = useTranslation('chantier');
  const [fichier, setFichier] = useState(null);
  const [nom, setNom] = useState('');
  const [format, setFormat] = useState('');
  // Niveau décrit par le plan. Laisser les trois vides = plan global du
  // chantier, qui est le point d'entrée du parcours de consultation.
  const [batimentId, setBatimentId] = useState('');
  const [etageId, setEtageId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [saving, setSaving] = useState(false);

  const batiments = chantier?.batiments || [];
  const batiment = batiments.find((b) => b.id === batimentId);
  const etages = batiment?.etages || [];
  const etage = etages.find((e) => e.id === etageId);
  const zones = etage?.zones || [];

  useEffect(() => {
    if (open) {
      setFichier(null); setNom(''); setFormat('');
      setBatimentId(''); setEtageId(''); setZoneId('');
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!fichier) return SwalCustom.error(t('commun.choisirFichier'));
    if (!nom.trim()) return SwalCustom.error(t('plans.nomPlanRequis'));
    setSaving(true);
    try {
      // On n'envoie QUE le niveau le plus fin renseigné : le backend en déduit
      // les niveaux parents (une zone porte son étage et son bâtiment). Les
      // envoyer tous les trois n'apporterait rien et multiplierait les
      // occasions d'incohérence.
      await uploaderPlan(chantierId, {
        fichier,
        nom,
        format: format || undefined,
        zoneId: zoneId || undefined,
        etageId: !zoneId && etageId ? etageId : undefined,
        batimentId: !zoneId && !etageId && batimentId ? batimentId : undefined,
      });
      SwalCustom.success(t('plans.importe'));
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: t('commun.importImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('plans.importer')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Upload size={16} /> {t('actions.importer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="upload-drop">
          <input type="file" onChange={(e) => { setFichier(e.target.files[0] || null); if (e.target.files[0] && !nom) setNom(e.target.files[0].name.replace(/\.[^.]+$/, '')); }} />
          <Upload size={22} />
          <span>{fichier ? fichier.name : t('plans.deposer')}</span>
        </div>
        <Input label={t('plans.nomPlan')} value={nom} onChange={(e) => setNom(e.target.value)} required />
        <Select label={t('plans.format')} value={format} onChange={(e) => setFormat(e.target.value)} emptyOption>
          <option value="pdf">PDF</option>
          <option value="dwg">DWG</option>
          <option value="ifc">IFC</option>
        </Select>

        {/* Rattachement : chaque niveau réinitialise ceux du dessous, sans
            quoi on pouvait garder l'appartement d'un étage après avoir changé
            de bâtiment — et déposer le plan sous une localisation absurde. */}
        <Select
          label={t('plans.batiment')}
          value={batimentId}
          onChange={(e) => { setBatimentId(e.target.value); setEtageId(''); setZoneId(''); }}
        >
          <option value="">{t('plans.chantierEntier')}</option>
          {batiments.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </Select>

        {batimentId && (
          <Select
            label={t('plans.etage')}
            value={etageId}
            onChange={(e) => { setEtageId(e.target.value); setZoneId(''); }}
          >
            <option value="">{t('plans.batimentEntier')}</option>
            {etages.map((e2) => <option key={e2.id} value={e2.id}>{e2.nom}</option>)}
          </Select>
        )}

        {etageId && (
          <Select label={t('plans.zone')} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">{t('plans.etageEntier')}</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.nom}</option>)}
          </Select>
        )}
      </form>
    </Modal>
  );
}

/* ============ Visionneuse plan + annotations ============ */
function PlanViewerModal({ plan, onClose, canManage, onChanged }) {
  const { t } = useTranslation('chantier');
  const [src, setSrc] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [versions, setVersions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setSrc(null);
    setLoading(true);
    let url = null;
    (async () => {
      try {
        const [blob, ann, vers] = await Promise.all([
          fetchFichierBlob(plan.fichier_url),
          listerAnnotations(plan.id),
          listerVersions(plan.id),
        ]);
        url = URL.createObjectURL(blob);
        setSrc(url);
        setAnnotations(ann.items);
        setVersions(vers.items || []);
      } catch (err) {
        SwalCustom.error({ title: t('plans.erreurAffichage'), text: getErrorMessage(err) });
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [plan, t]);

  const removeAnn = async (a) => {
    const res = await SwalCustom.confirm({ title: t('plans.supprimerAnnotation'), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerAnnotation(a.id);
      SwalCustom.success(t('plans.annotationSupprimee'));
      const d = await listerAnnotations(plan.id);
      setAnnotations(d.items);
      onChanged();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <Modal open={!!plan} onClose={onClose} title={plan?.nom} size="lg" footer={
      canManage && plan ? <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><MapPin size={14} /> {t('plans.ajouterAnnotation')}</button> : null
    }>
      <div className="plan-viewer">
        <div className="plan-stage">
          {loading && <p className="text-muted">{t('plans.chargementPlan')}</p>}
          {src && (
            <>
              {plan.format === 'pdf'
                ? <iframe title={plan.nom} src={src} style={{ width: '100%', height: 520, border: 'none' }} />
                : (
                  <img
                    src={src}
                    alt={plan.nom}
                    style={{ maxWidth: '100%', maxHeight: 520 }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              {annotations.map((a) => (
                <span
                  key={a.id}
                  className="annotation-marker"
                  style={{ left: `${a.x ?? 50}%`, top: `${a.y ?? 50}%`, background: a.donnees?.couleur || '#f2600c' }}
                  title={a.donnees?.libelle || enumLabel(a.type, a.type)}
                >
                  <MapPin size={14} />
                </span>
              ))}
            </>
          )}
        </div>
        <div className="plan-side">
          <h4 style={{ margin: '0 0 10px' }}>{t('plans.annotations', { n: annotations.length })}</h4>
          {annotations.length === 0 && <p className="text-muted" style={{ fontSize: 13 }}>{t('plans.aucuneAnnotation')}</p>}
          {annotations.map((a) => (
            <div key={a.id} className="annotation-item">
              <span className={`badge badge-neutral`}>{enumLabel(a.type, a.type)}</span>
              <span className="annotation-desc">{a.donnees?.libelle || `(${a.x ?? '?'}%, ${a.y ?? '?'}%)`}</span>
              {canManage && <button className="btn btn-ghost btn-sm" onClick={() => removeAnn(a)}><Trash2 size={13} /></button>}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 10px' }}>
            <h4 style={{ margin: 0 }}>{t('plans.versions', { n: versions.length })}</h4>
            {versions.length >= 2 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setCompareOpen(true)}><GitCompare size={13} /> {t('plans.comparer')}</button>
            )}
          </div>
          {versions.length === 0 && <p className="text-muted" style={{ fontSize: 13 }}>{t('plans.versionInitiale')}</p>}
          {versions.map((v) => (
            <div key={v.id} className="text-muted" style={{ fontSize: 13, padding: '4px 0' }}>
              <Clock size={12} style={{ verticalAlign: -2 }} /> V{v.version || '?'} — {formatDate(v.createdAt)}
            </div>
          ))}
        </div>
      </div>

      {plan && <AddAnnotationModal open={showAdd} onClose={() => setShowAdd(false)} planId={plan.id} onSaved={async () => { const d = await listerAnnotations(plan.id); setAnnotations(d.items); onChanged(); }} />}
      {plan && <CompareVersionsModal open={compareOpen} onClose={() => setCompareOpen(false)} versions={versions} />}
    </Modal>
  );
}

function AddAnnotationModal({ open, onClose, planId, onSaved }) {
  const { t } = useTranslation('chantier');
  const [form, setForm] = useState({ type: 'marqueur', x: 50, y: 50, libelle: '', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ type: 'marqueur', x: 50, y: 50, libelle: '', latitude: '', longitude: '' });
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        type: form.type,
        x: form.x === '' ? undefined : Number(form.x),
        y: form.y === '' ? undefined : Number(form.y),
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        donnees: form.libelle.trim() ? { libelle: form.libelle.trim() } : null,
      };
      await creerAnnotation(planId, body);
      SwalCustom.success(t('plans.annotationAjoutee'));
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: t('commun.creationImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('plans.ajouterAnnotation')} size="sm" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : t('actions.ajouter')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <Select label={t('champs.type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES_ANNOTATION.map((ta) => <option key={ta} value={ta}>{enumLabel(ta, ta)}</option>)}
        </Select>
        <div className="grid-2">
          <Input label={t('plans.x')} type="number" min="0" max="100" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} />
          <Input label={t('plans.y')} type="number" min="0" max="100" value={form.y} onChange={(e) => setForm({ ...form, y: e.target.value })} />
        </div>
        <div className="grid-2">
          <Input label={t('plans.latitude')} type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
          <Input label={t('plans.longitude')} type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
        </div>
        <Input label={t('plans.libelle')} value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} />
      </form>
    </Modal>
  );
}

/* ============ Comparaison visuelle de deux versions d'un plan ============ */
const versionLabel = (v) => `V${v.version || v.numeroVersion || '?'}`;

function VersionPanel({ titre, date, src, format, name }) {
  const { t } = useTranslation('chantier');
  return (
    <div className="compare-panel">
      <div className="compare-panel-head">
        <strong>{titre}</strong>
        <span className="text-muted" style={{ fontSize: 12 }}>{date ? formatDate(date) : ''}</span>
      </div>
      <div className="compare-stage">
        {src && format === 'pdf'
          ? <iframe title={name} src={src} />
          : src
            ? <img src={src} alt={name} />
            : <p className="text-muted" style={{ fontSize: 13 }}>{t('plans.aucuneVersionChargee')}</p>}
      </div>
    </div>
  );
}

function CompareVersionsModal({ open, onClose, versions }) {
  const { t } = useTranslation('chantier');
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sélection par défaut : première vs dernière version à l'ouverture.
  useEffect(() => {
    if (open && versions.length) {
      setLeftId((id) => id || versions[0].id);
      setRightId((id) => id || versions[versions.length - 1].id);
    }
  }, [open, versions]);

  const leftVersion = versions.find((v) => v.id === leftId);
  const rightVersion = versions.find((v) => v.id === rightId);

  // Charge les deux fichiers dès que la sélection change, avec nettoyage des URLs.
  useEffect(() => {
    if (!open || !leftVersion || !rightVersion) return undefined;
    let urls = [];
    setLoading(true);
    (async () => {
      try {
        const [lb, rb] = await Promise.all([
          fetchFichierBlob(leftVersion.fichier_url),
          fetchFichierBlob(rightVersion.fichier_url),
        ]);
        urls = [URL.createObjectURL(lb), URL.createObjectURL(rb)];
        setLeft({ src: urls[0], format: leftVersion.format, version: leftVersion.version, createdAt: leftVersion.createdAt });
        setRight({ src: urls[1], format: rightVersion.format, version: rightVersion.version, createdAt: rightVersion.createdAt });
      } catch (err) {
        SwalCustom.error({ title: t('plans.erreurVersions'), text: getErrorMessage(err) });
      } finally {
        setLoading(false);
      }
    })();
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [open, leftVersion, rightVersion, t]);

  return (
    <Modal open={open} onClose={onClose} title={t('plans.comparerTitre')} size="lg">
      <div className="compare-controls">
        <Select label={t('plans.versionA')} value={leftId} onChange={(e) => setLeftId(e.target.value)}>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>{versionLabel(v)} — {formatDate(v.createdAt)}</option>
          ))}
        </Select>
        <span className="compare-arrow">→</span>
        <Select label={t('plans.versionB')} value={rightId} onChange={(e) => setRightId(e.target.value)}>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>{versionLabel(v)} — {formatDate(v.createdAt)}</option>
          ))}
        </Select>
      </div>

      {loading && <p className="text-muted" style={{ fontSize: 13 }}>{t('plans.chargementVersions')}</p>}

      <div className="compare-grid">
        <VersionPanel titre={left ? versionLabel(left) : t('plans.versionA')} date={left?.createdAt} src={left?.src} format={left?.format} name={t('plans.versionA')} />
        <VersionPanel titre={right ? versionLabel(right) : t('plans.versionB')} date={right?.createdAt} src={right?.src} format={right?.format} name={t('plans.versionB')} />
      </div>
    </Modal>
  );
}
