import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, X, Upload, Trash2, FileText, Archive, RotateCcw, PenTool, Download, Clock } from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import Modal from '../../../components/Modal.jsx';
import DataTable from '../../../components/table/DataTable.jsx';
import { Input, Select } from '../../../components/FormControls.jsx';
import {
  uploaderDocument, listerDocuments, archiverDocument, restaurerDocument,
  signerDocument, listerSignaturesDocument, supprimerDocument,
} from '../../../service/document/documentService.js';
import { fetchFichierBlob } from '../../../service/plan/planService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate } from '../../../utils/format.js';
import { TYPES_DOCUMENT, STATUTS_DOCUMENT, enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

export default function DocumentsTab({ chantierId, canManage }) {
  const { t } = useTranslation('chantier');
  const [filters, setFilters] = useState({ search: '', type: '', statut: '' });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerDocuments(chantierId, { page: 1, limit: 50, ...filters });
      setItems(d.items);
      setTotal(d.total);
    } catch (err) {
      SwalCustom.error({ title: t('documents.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, filters, t]);
  useEffect(() => { load(); }, [load]);

  const archive = async (d) => {
    try {
      await archiverDocument(d.id);
      SwalCustom.success(t('documents.archive'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };
  const restore = async (d) => {
    try {
      await restaurerDocument(d.id);
      SwalCustom.success(t('documents.restaure'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };
  const remove = async (d) => {
    const res = await SwalCustom.confirm({ title: t('documents.supprimerTitre', { nom: d.nom }), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerDocument(d.id);
      SwalCustom.success(t('documents.supprime'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const colonnes = [
    {
      cle: 'icone',
      titre: '',
      triable: false,
      recherchable: false,
      largeur: 40,
      rendu: () => <FileText size={18} style={{ color: 'var(--text-muted)' }} />,
    },
    {
      cle: 'nom',
      titre: t('documents.colDocument'),
      filtre: 'texte',
      // La description entre dans la recherche : c'est souvent là que se
      // trouve le mot qu'on cherche, pas dans le nom de fichier.
      valeur: (d) => `${d.nom ?? ''} ${d.description ?? ''}`.trim(),
      rendu: (d) => (
        <>
          <button className="link" onClick={() => setViewing(d)}>{d.nom}</button>
          {d.description && <div className="text-muted" style={{ fontSize: 12 }}>{d.description}</div>}
        </>
      ),
    },
    {
      cle: 'type',
      titre: t('champs.type'),
      filtre: 'select',
      options: Object.keys(TYPES_DOCUMENT).map((v) => ({
        valeur: v,
        label: enumLabel(v, TYPES_DOCUMENT[v]),
      })),
      valeur: (d) => d.type,
      rendu: (d) => <span className="badge badge-neutral">{enumLabel(d.type, TYPES_DOCUMENT[d.type] || d.type)}</span>,
    },
    {
      cle: 'version',
      titre: t('documents.colVersion'),
      valeur: (d) => Number(d.numeroVersion ?? d.version ?? 1),
      rendu: (d) => <span className="text-muted" style={{ fontSize: 13 }}>{d.numeroVersion || d.version || 1}</span>,
    },
    {
      cle: 'statut',
      titre: t('champs.statut'),
      filtre: 'texte',
      valeur: (d) => d.statut,
      rendu: (d) => <Badge statusKey={d.statut} />,
    },
    {
      cle: 'createdAt',
      titre: t('documents.colImporteLe'),
      valeur: (d) => (d.createdAt ? new Date(d.createdAt) : null),
      rendu: (d) => <span className="text-muted" style={{ fontSize: 13 }}>{formatDate(d.createdAt)}</span>,
    },
    {
      cle: 'actions',
      titre: '',
      triable: false,
      recherchable: false,
      alignement: 'droite',
      rendu: (d) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setViewing(d)} title={t('actions.voir')}><Download size={14} /></button>
          {canManage && (
            <>
              {d.statut === 'archive'
                ? <button className="btn btn-ghost btn-sm" onClick={() => restore(d)} title={t('actions.restaurer')}><RotateCcw size={14} /></button>
                : <button className="btn btn-ghost btn-sm" onClick={() => archive(d)} title={t('actions.archiver')}><Archive size={14} /></button>}
              <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(d)} title={t('actions.supprimer')}><Trash2 size={14} /></button>
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>{t('documents.titre', { n: total })}</h2>
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}><Plus size={14} /> {t('documents.importer')}</button>}
        </div>
        <div className="card-body">
          <div className="filter-bar" style={{ marginBottom: 14 }}>
            <div className="search-box">
              <Search size={16} />
              <input className="input" placeholder={t('documents.rechercher')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              {filters.search && <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}><X size={14} /></button>}
            </div>
            <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} label="">
              <option value="">{t('commun.tousTypes')}</option>
              {Object.entries(TYPES_DOCUMENT).map(([value, label]) => <option key={value} value={value}>{enumLabel(value, label)}</option>)}
            </Select>
            <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
              <option value="">{t('commun.tousStatuts')}</option>
              {Object.entries(STATUTS_DOCUMENT).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
            </Select>
          </div>

          <DataTable
            donnees={items}
            colonnes={colonnes}
            chargement={loading}
            titreVide={t('documents.videTitre')}
            messageVide={t('documents.videMessage')}
            parPage={10}
            triInitial={{ cle: 'createdAt', sens: 'desc' }}
          />
        </div>
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} chantierId={chantierId} onSaved={load} />
      <DocumentViewerModal document={viewing} onClose={() => setViewing(null)} canManage={canManage} onChanged={load} />
    </>
  );
}

function UploadModal({ open, onClose, chantierId, onSaved }) {
  const { t } = useTranslation('chantier');
  const [fichier, setFichier] = useState(null);
  const [nom, setNom] = useState('');
  const [type, setType] = useState('autre');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setFichier(null); setNom(''); setType('autre'); setDescription(''); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!fichier) return SwalCustom.error(t('commun.choisirFichier'));
    if (!nom.trim()) return SwalCustom.error(t('commun.nomRequisPoint'));
    setSaving(true);
    try {
      await uploaderDocument(chantierId, { fichier, nom, type, description: description || undefined });
      SwalCustom.success(t('documents.importe'));
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: t('commun.importImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('documents.modalImporter')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><Upload size={16} /> {t('actions.importer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <div className="upload-drop">
          <input type="file" onChange={(e) => { setFichier(e.target.files[0] || null); if (e.target.files[0] && !nom) setNom(e.target.files[0].name.replace(/\.[^.]+$/, '')); }} />
          <Upload size={22} />
          <span>{fichier ? fichier.name : t('documents.deposer')}</span>
        </div>
        <Input label={t('commun.nom')} value={nom} onChange={(e) => setNom(e.target.value)} required />
        <div className="grid-2">
          <Select label={t('champs.type')} value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPES_DOCUMENT).map(([value, label]) => <option key={value} value={value}>{enumLabel(value, label)}</option>)}
          </Select>
          <Input label={t('champs.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}

function DocumentViewerModal({ document, onClose, canManage, onChanged }) {
  const { t } = useTranslation('chantier');
  const [src, setSrc] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!document) return;
    setSrc(null);
    setLoading(true);
    let url = null;
    (async () => {
      try {
        const [blob, sig] = await Promise.all([fetchFichierBlob(document.fichier_url), listerSignaturesDocument(document.id)]);
        url = URL.createObjectURL(blob);
        setSrc(url);
        setSignatures(sig.items);
      } catch (err) {
        SwalCustom.error({ title: t('documents.erreurAffichage'), text: getErrorMessage(err) });
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [document, t]);

  const sign = async () => {
    try {
      await signerDocument(document.id);
      SwalCustom.success(t('documents.signe'));
      const sig = await listerSignaturesDocument(document.id);
      setSignatures(sig.items);
      onChanged();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const preview = document?.fichier_url?.match(/\.(png|jpe?g|webp|gif)$/i);

  return (
    <Modal open={!!document} onClose={onClose} title={document?.nom} size="lg" footer={
      canManage && document ? <button className="btn btn-primary btn-sm" onClick={sign}><PenTool size={14} /> {t('documents.signerDocument')}</button> : null
    }>
      {loading ? <p className="text-muted">{t('etats.chargement')}</p> : (
        <>
          {src && (preview
            ? <img src={src} alt={document.nom} style={{ maxWidth: '100%', maxHeight: 480, borderRadius: 10 }} />
            : <iframe title={document.nom} src={src} style={{ width: '100%', height: 480, border: '1px solid var(--border)', borderRadius: 10 }} />)}
          <h4 style={{ margin: '16px 0 8px' }}>{t('documents.signatures', { n: signatures.length })}</h4>
          {signatures.length === 0 ? <p className="text-muted" style={{ fontSize: 13 }}>{t('documents.nonSigne')}</p> : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {signatures.map((s) => (
                <li key={s.id} style={{ fontSize: 13 }}>
                  <PenTool size={13} style={{ verticalAlign: -2 }} /> {s.signataire ? `${s.signataire.prenom} ${s.signataire.nom}` : '—'} · <Clock size={12} style={{ verticalAlign: -2 }} /> {formatDate(s.createdAt)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
