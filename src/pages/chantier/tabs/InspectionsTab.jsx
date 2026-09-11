import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, X, Eye, Trash2, ClipboardCheck, Camera, UserPlus, ListChecks, Pencil, Check, XCircle, Users,
} from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import Modal from '../../../components/Modal.jsx';
import DataTable from '../../../components/table/DataTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Select, Textarea } from '../../../components/FormControls.jsx';
import {
  listerInspections, supprimerInspection,
} from '../../../service/inspection/inspectionService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate } from '../../../utils/format.js';
import { TYPES_INSPECTION, STATUTS_INSPECTION, STATUTS_CONVOCATION, enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';
import { useEnum } from '../../../hooks/useEnums.js';
import {
  InspectionCreateModal, InspectionDetailModal, ModelesModal,
} from './inspections/Modales.jsx';

export default function InspectionsTab({ chantierId, canManage }) {
  // Types et statuts servis par l'API — voir hooks/useEnums.js.
  const typesInspection = useEnum('typesInspection');
  const statutsInspection = useEnum('statutsInspection');
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

  const colonnes = [
    {
      cle: 'type',
      titre: t('champs.type'),
      filtre: 'select',
      options: typesInspection.map((v) => ({
        valeur: v,
        label: enumLabel(v, TYPES_INSPECTION[v]),
      })),
      valeur: (i) => i.type,
      rendu: (i) => (
        <Badge tone={i.type === 'opr' ? 'warning' : i.type === 'visite_contradictoire' ? 'info' : 'primary'}>
          {enumLabel(i.type, TYPES_INSPECTION[i.type] || i.type)}
        </Badge>
      ),
    },
    {
      cle: 'date_visite',
      titre: t('champs.date'),
      valeur: (i) => (i.date_visite ? new Date(i.date_visite) : null),
      rendu: (i) => formatDate(i.date_visite),
    },
    {
      cle: 'statut',
      titre: t('champs.statut'),
      filtre: 'texte',
      valeur: (i) => i.statut,
      rendu: (i) => <Badge statusKey={i.statut} />,
    },
    {
      cle: 'checklist',
      titre: t('inspections.colChecklist'),
      // Trie sur l'AVANCEMENT (part cochée) et non sur le nombre brut :
      // 8/10 doit passer devant 9/40, sinon le classement récompense les
      // longues checklists au lieu des visites les plus avancées.
      valeur: (i) => {
        const total = (i.checklist || []).length;
        if (!total) return 0;
        return (i.checklist || []).filter((c) => c.coche).length / total;
      },
      rendu: (i) => (
        <span className="text-muted" style={{ fontSize: 13 }}>
          {(i.checklist || []).filter((c) => c.coche).length}/{(i.checklist || []).length}
        </span>
      ),
    },
    {
      cle: 'inspecteur',
      titre: t('inspections.colInspecteur'),
      filtre: 'texte',
      valeur: (i) => (i.inspecteur ? `${i.inspecteur.prenom} ${i.inspecteur.nom}` : ''),
      rendu: (i) => (
        <span className="text-muted" style={{ fontSize: 13 }}>
          {i.inspecteur ? `${i.inspecteur.prenom} ${i.inspecteur.nom}` : '—'}
        </span>
      ),
    },
    {
      cle: 'actions',
      titre: '',
      triable: false,
      recherchable: false,
      alignement: 'droite',
      rendu: (i) => (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setViewing(i)}><Eye size={14} /></button>
          {canManage && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(i)}><Trash2 size={14} /></button>}
        </>
      ),
    },
  ];

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
              {typesInspection.map((value) => <option key={value} value={value}>{enumLabel(value, TYPES_INSPECTION[value])}</option>)}
            </Select>
            <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
              <option value="">{t('commun.tousStatuts')}</option>
              {statutsInspection.map((value) => <option key={value} value={value}>{enumLabel(value, STATUTS_INSPECTION[value]?.label)}</option>)}
            </Select>
          </div>

          <DataTable
            donnees={items}
            colonnes={colonnes}
            chargement={loading}
            titreVide={t('inspections.videTitre')}
            messageVide={t('inspections.videMessage')}
            parPage={10}
            triInitial={{ cle: 'date_visite', sens: 'desc' }}
          />
        </div>
      </div>

      <InspectionCreateModal open={showCreate} onClose={() => setShowCreate(false)} chantierId={chantierId} onSaved={load} />
      <InspectionDetailModal inspection={viewing} onClose={() => setViewing(null)} onChanged={load} canManage={canManage} />
      <ModelesModal open={showModeles} onClose={() => setShowModeles(false)} canManage={canManage} />
    </>
  );
}


