import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Building2, Layers, Boxes, Package } from 'lucide-react';

import Modal from '../../../components/Modal.jsx';
import DataTable from '../../../components/table/DataTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Select } from '../../../components/FormControls.jsx';
import { creerBatiment, creerEtage, creerZone, creerLot, listerLots } from '../../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import SwalCustom from '../../../utils/swal.config.js';

export default function StructureTab({ chantierId, chantier, canManage }) {
  const { t } = useTranslation('chantier');
  const [lots, setLots] = useState(chantier?.lots || []);
  const [show, setShow] = useState(null); // {type:'batiment'} | {type:'etage',batiment} | {type:'zone',batiment,etage} | {type:'lot'}
  const [refreshing, setRefreshing] = useState(false);

  const loadLots = async () => {
    setRefreshing(true);
    try {
      const d = await listerLots(chantierId);
      setLots(d.items);
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setRefreshing(false); }
  };

  const batiments = chantier?.batiments || [];

  const colonnesLots = [
    {
      cle: 'nom',
      titre: t('commun.nom'),
      filtre: 'texte',
      rendu: (l) => <strong>{l.nom}</strong>,
    },
    {
      cle: 'code',
      titre: t('commun.code'),
      filtre: 'texte',
      rendu: (l) => l.code || '—',
    },
    {
      cle: 'entreprise',
      titre: t('commun.entreprise'),
      filtre: 'texte',
      // `entreprise` est tantôt un objet, tantôt une chaîne selon l'endpoint
      // qui a rempli la ligne : sans cette normalisation, le filtre porterait
      // sur « [object Object] ».
      valeur: (l) => l.entreprise?.nom || l.entreprise || '',
      rendu: (l) => l.entreprise?.nom || l.entreprise || '—',
    },
    {
      cle: 'description',
      titre: t('champs.description'),
      filtre: 'texte',
      rendu: (l) => <span className="text-muted">{l.description || '—'}</span>,
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <h2><Building2 size={17} style={{ verticalAlign: -2 }} /> {t('structure.batimentsTitre')}</h2>
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShow({ type: 'batiment' })}><Plus size={14} /> {t('structure.batiment')}</button>}
        </div>
        <div className="card-body">
          {batiments.length === 0 ? <EmptyState title={t('structure.videBatimentsTitre')} message={t('structure.videBatimentsMessage')} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {batiments.map((b) => (
                <div key={b.id} className="structure-node">
                  <div className="structure-title">
                    <strong><Building2 size={15} style={{ verticalAlign: -2 }} /> {b.nom}</strong>
                    {b.code && <span className="text-muted" style={{ fontSize: 12 }}>{b.code}</span>}
                    {canManage && <button className="btn btn-ghost btn-sm" onClick={() => setShow({ type: 'etage', batiment: b })}><Plus size={13} /> {t('structure.etage')}</button>}
                  </div>
                  {(b.etages || []).map((e) => (
                    <div key={e.id} className="structure-node" style={{ marginLeft: 24 }}>
                      <div className="structure-title">
                        <strong><Layers size={14} style={{ verticalAlign: -2 }} /> {e.nom}</strong>
                        {canManage && <button className="btn btn-ghost btn-sm" onClick={() => setShow({ type: 'zone', batiment: b, etage: e })}><Plus size={13} /> {t('structure.zone')}</button>}
                      </div>
                      <div style={{ marginLeft: 24, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(e.zones || []).length === 0 && <span className="text-muted" style={{ fontSize: 12.5 }}>{t('structure.aucuneZone')}</span>}
                        {(e.zones || []).map((z) => (
                          <span key={z.id} className="chip"><Boxes size={13} style={{ verticalAlign: -2 }} /> {z.nom}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2><Package size={17} style={{ verticalAlign: -2 }} /> {t('structure.lotsTitre', { n: lots.length })}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShow({ type: 'lot' })}><Plus size={14} /> {t('structure.lot')}</button>}
            {canManage && <button className="btn btn-ghost btn-sm" onClick={loadLots} disabled={refreshing}>{t('actions.actualiser')}</button>}
          </div>
        </div>
        <div className="card-body">
          <DataTable
            donnees={lots}
            colonnes={colonnesLots}
            titreVide={t('structure.videLotsTitre')}
            messageVide={t('structure.videLotsMessage')}
            parPage={10}
            triInitial={{ cle: 'nom', sens: 'asc' }}
          />
        </div>
      </div>

      <CreateStructureModal open={!!show} onClose={() => setShow(null)} chantierId={chantierId} target={show} onSaved={() => { if (show?.type === 'lot') loadLots(); }} />
    </div>
  );
}

function CreateStructureModal({ open, onClose, chantierId, target, onSaved }) {
  const { t } = useTranslation('chantier');
  const type = target?.type;
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setNom(''); setCode(''); setDescription(''); }
  }, [open, type]);

  const submit = async () => {
    if (!nom.trim()) return SwalCustom.error(t('commun.nomRequisPoint'));
    setSaving(true);
    try {
      if (type === 'batiment') await creerBatiment(chantierId, { nom, code: code || undefined });
      if (type === 'etage') await creerEtage(chantierId, target.batiment.id, { nom, code: code || undefined });
      if (type === 'zone') await creerZone(chantierId, target.batiment.id, target.etage.id, { nom, code: code || undefined });
      if (type === 'lot') await creerLot(chantierId, { nom, code: code || undefined, description });
      SwalCustom.success(type === 'lot' ? t('structure.lotCree') : type === 'zone' ? t('structure.zoneCreee') : type === 'etage' ? t('structure.etageCree') : t('structure.batimentCree'));
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: t('commun.creationImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={type === 'lot' ? t('structure.modalLot') : type === 'zone' ? t('structure.modalZone') : type === 'etage' ? t('structure.modalEtage', { batiment: target?.batiment?.nom }) : t('structure.modalBatiment')} size="sm" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : t('actions.creer')}</button>
      </>
    }>
      <Input label={t('commun.nom')} value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
      <Input label={t('commun.code')} value={code} onChange={(e) => setCode(e.target.value)} />
      {type === 'lot' && <Input label={t('champs.description')} value={description} onChange={(e) => setDescription(e.target.value)} />}
    </Modal>
  );
}
