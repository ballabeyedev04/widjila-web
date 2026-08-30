import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Building2, Layers, Boxes, Package, Pencil, Trash2 } from 'lucide-react';

import Modal from '../../../components/Modal.jsx';
import DataTable from '../../../components/table/DataTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Select } from '../../../components/FormControls.jsx';
import {
  creerBatiment, creerEtage, creerZone, creerLot, listerLots,
  modifierBatiment, supprimerBatiment,
  modifierEtage, supprimerEtage,
  modifierZone, supprimerZone,
} from '../../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

/** Types de zone — miroir de l'ENUM `type` (backend/src/models/zone.model.js). */
const TYPES_ZONE = ['logement', 'piece', 'zone', 'local'];

/**
 * @param {Function} [onStructureChange] Recharge le chantier après création,
 *   modification ou suppression d'un bâtiment, d'un étage ou d'une zone. Ces
 *   trois-là vivent DANS l'objet chantier (renvoyé imbriqué par
 *   `getChantier`) : sans ce rappel au parent, la liste reste figée après un
 *   201 et l'écran affiche « Aucun bâtiment » alors que l'enregistrement a
 *   réussi. Les lots, eux, ont leur propre endpoint et se rechargent
 *   localement via `loadLots`.
 */
export default function StructureTab({ chantierId, chantier, canManage, onStructureChange }) {
  const { t } = useTranslation('chantier');
  const [lots, setLots] = useState(chantier?.lots || []);
  // Total côté SERVEUR : ce tableau pagine côté client, il ne voit que la
  // page reçue. Sans ce total, les lignes au-delà disparaissaient sans
  // le moindre signe — voir la prop `totalServeur` de DataTable.
  const [totalLots, setTotalLots] = useState(null);
  // { mode:'creer'|'modifier', type:'batiment'|'etage'|'zone'|'lot', batiment?, etage?, cible? }
  const [show, setShow] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadLots = async () => {
    setRefreshing(true);
    try {
      const d = await listerLots(chantierId);
      setLots(d.items);
      setTotalLots(d.total);
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setRefreshing(false); }
  };

  const batiments = chantier?.batiments || [];

  /**
   * Suppression d'un élément de structure.
   *
   * Le serveur REFUSE tant qu'une réserve est rattachée à l'élément ou à l'un
   * de ses descendants, et son message porte le nombre exact. On l'affiche tel
   * quel : « 7 réserves sont rattachées à cet élément » dit à l'utilisateur ce
   * qu'il doit faire, là où un « suppression impossible » générique le
   * laisserait chercher.
   */
  const supprimer = async ({ type, batiment, etage, cible }) => {
    const res = await SwalCustom.confirm({
      title: t('structure.supprimerTitre', { nom: cible.nom }),
      text: type === 'zone' ? t('structure.supprimerZoneTexte') : t('structure.supprimerCascadeTexte'),
      icon: 'warning',
      danger: true,
    });
    if (!res) return;

    try {
      if (type === 'batiment') await supprimerBatiment(chantierId, cible.id);
      if (type === 'etage') await supprimerEtage(chantierId, batiment.id, cible.id);
      if (type === 'zone') await supprimerZone(chantierId, batiment.id, etage.id, cible.id);
      SwalCustom.success(t('structure.supprime'));
      onStructureChange?.();
    } catch (err) {
      SwalCustom.error({ title: t('structure.suppressionImpossible'), text: getErrorMessage(err) });
    }
  };

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
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShow({ mode: 'creer', type: 'batiment' })}><Plus size={14} /> {t('structure.batiment')}</button>}
        </div>
        <div className="card-body">
          {batiments.length === 0 ? <EmptyState title={t('structure.videBatimentsTitre')} message={t('structure.videBatimentsMessage')} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {batiments.map((b) => (
                <div key={b.id} className="structure-node">
                  <div className="structure-title">
                    <strong><Building2 size={15} style={{ verticalAlign: -2 }} /> {b.nom}</strong>
                    {b.code && <span className="text-muted" style={{ fontSize: 12 }}>{b.code}</span>}
                    {canManage && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShow({ mode: 'creer', type: 'etage', batiment: b })}><Plus size={13} /> {t('structure.etage')}</button>
                        <ActionsNoeud
                          onModifier={() => setShow({ mode: 'modifier', type: 'batiment', cible: b })}
                          onSupprimer={() => supprimer({ type: 'batiment', cible: b })}
                          t={t}
                        />
                      </>
                    )}
                  </div>
                  {(b.etages || []).map((e) => (
                    <div key={e.id} className="structure-node" style={{ marginLeft: 24 }}>
                      <div className="structure-title">
                        <strong><Layers size={14} style={{ verticalAlign: -2 }} /> {e.nom}</strong>
                        <span className="text-muted" style={{ fontSize: 12 }}>{t('structure.niveauCourt', { n: e.niveau ?? 0 })}</span>
                        {canManage && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShow({ mode: 'creer', type: 'zone', batiment: b, etage: e })}><Plus size={13} /> {t('structure.zone')}</button>
                            <ActionsNoeud
                              onModifier={() => setShow({ mode: 'modifier', type: 'etage', batiment: b, cible: e })}
                              onSupprimer={() => supprimer({ type: 'etage', batiment: b, cible: e })}
                              t={t}
                            />
                          </>
                        )}
                      </div>
                      <div style={{ marginLeft: 24, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(e.zones || []).length === 0 && <span className="text-muted" style={{ fontSize: 12.5 }}>{t('structure.aucuneZone')}</span>}
                        {(e.zones || []).map((z) => (
                          <span key={z.id} className="chip">
                            <Boxes size={13} style={{ verticalAlign: -2 }} /> {z.nom}
                            {canManage && (
                              <>
                                <button
                                  className="chip-action"
                                  onClick={() => setShow({ mode: 'modifier', type: 'zone', batiment: b, etage: e, cible: z })}
                                  aria-label={t('actions.modifier')}
                                  title={t('actions.modifier')}
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  className="chip-action danger"
                                  onClick={() => supprimer({ type: 'zone', batiment: b, etage: e, cible: z })}
                                  aria-label={t('actions.supprimer')}
                                  title={t('actions.supprimer')}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </>
                            )}
                          </span>
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
            {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShow({ mode: 'creer', type: 'lot' })}><Plus size={14} /> {t('structure.lot')}</button>}
            {canManage && <button className="btn btn-ghost btn-sm" onClick={loadLots} disabled={refreshing}>{t('actions.actualiser')}</button>}
          </div>
        </div>
        <div className="card-body">
          <DataTable
            totalServeur={totalLots}
            donnees={lots}
            colonnes={colonnesLots}
            titreVide={t('structure.videLotsTitre')}
            messageVide={t('structure.videLotsMessage')}
            parPage={10}
            triInitial={{ cle: 'nom', sens: 'asc' }}
          />
        </div>
      </div>

      <StructureModal
        open={!!show}
        onClose={() => setShow(null)}
        chantierId={chantierId}
        target={show}
        onSaved={() => { if (show?.type === 'lot') loadLots(); else onStructureChange?.(); }}
      />
    </div>
  );
}

/** Les deux actions d'un nœud (bâtiment, étage) — modifier et supprimer. */
function ActionsNoeud({ onModifier, onSupprimer, t }) {
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={onModifier} aria-label={t('actions.modifier')} title={t('actions.modifier')}>
        <Pencil size={13} />
      </button>
      <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={onSupprimer} aria-label={t('actions.supprimer')} title={t('actions.supprimer')}>
        <Trash2 size={13} />
      </button>
    </>
  );
}

/**
 * Création ET modification d'un élément de structure.
 *
 * Les champs suivent EXACTEMENT les schémas du serveur, ce qui n'était pas le
 * cas auparavant : le formulaire envoyait un `code` pour les étages et les
 * zones, que `stripUnknown` retirait en silence. Conséquence — un étage
 * n'obtenait jamais son `niveau` (tous à 0), et le parcours de consultation ne
 * pouvait donc pas séparer les SOUS-SOLS des étages ; une zone n'obtenait
 * jamais son `type`, et tout apparaissait comme « zone » plutôt que
 * « logement ».
 */
function StructureModal({ open, onClose, chantierId, target, onSaved }) {
  const { t } = useTranslation('chantier');
  const type = target?.type;
  const modification = target?.mode === 'modifier';
  const cible = target?.cible;

  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [niveau, setNiveau] = useState('0');
  const [typeZone, setTypeZone] = useState('zone');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNom(cible?.nom || '');
    setCode(cible?.code || '');
    setNiveau(String(cible?.niveau ?? 0));
    setTypeZone(cible?.type || 'zone');
    setDescription(cible?.description || '');
  }, [open, type, cible]);

  const submit = async () => {
    if (!nom.trim()) return SwalCustom.error(t('commun.nomRequisPoint'));
    setSaving(true);
    try {
      if (modification) {
        if (type === 'batiment') {
          await modifierBatiment(chantierId, cible.id, { nom, code });
        } else if (type === 'etage') {
          await modifierEtage(chantierId, target.batiment.id, cible.id, { nom, niveau: Number(niveau) || 0 });
        } else if (type === 'zone') {
          await modifierZone(chantierId, target.batiment.id, target.etage.id, cible.id, { nom, type: typeZone });
        }
        SwalCustom.success(t('structure.modifie'));
      } else {
        if (type === 'batiment') await creerBatiment(chantierId, { nom, code: code || undefined });
        if (type === 'etage') await creerEtage(chantierId, target.batiment.id, { nom, niveau: Number(niveau) || 0 });
        if (type === 'zone') await creerZone(chantierId, target.batiment.id, target.etage.id, { nom, type: typeZone });
        if (type === 'lot') await creerLot(chantierId, { nom, code: code || undefined, description });
        SwalCustom.success(
          type === 'lot' ? t('structure.lotCree')
            : type === 'zone' ? t('structure.zoneCreee')
              : type === 'etage' ? t('structure.etageCree')
                : t('structure.batimentCree')
        );
      }
      onClose();
      onSaved();
    } catch (err) {
      SwalCustom.error({
        title: modification ? t('commun.modificationImpossible') : t('commun.creationImpossible'),
        text: getErrorMessage(err),
      });
    } finally { setSaving(false); }
  };

  const titre = modification
    ? t('structure.modalModifier', { nom: cible?.nom || '' })
    : type === 'lot' ? t('structure.modalLot')
      : type === 'zone' ? t('structure.modalZone')
        : type === 'etage' ? t('structure.modalEtage', { batiment: target?.batiment?.nom })
          : t('structure.modalBatiment');

  return (
    <Modal open={open} onClose={onClose} title={titre} size="sm" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? '…' : modification ? t('actions.enregistrer') : t('actions.creer')}
        </button>
      </>
    }>
      <Input label={t('commun.nom')} value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />

      {(type === 'batiment' || type === 'lot') && (
        <Input label={t('commun.code')} value={code} onChange={(e) => setCode(e.target.value)} />
      )}

      {type === 'etage' && (
        <Input
          label={t('structure.niveau')}
          type="number"
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          hint={t('structure.niveauAide')}
        />
      )}

      {type === 'zone' && (
        <Select label={t('champs.type')} value={typeZone} onChange={(e) => setTypeZone(e.target.value)}>
          {TYPES_ZONE.map((tz) => <option key={tz} value={tz}>{enumLabel(tz, tz)}</option>)}
        </Select>
      )}

      {type === 'lot' && <Input label={t('champs.description')} value={description} onChange={(e) => setDescription(e.target.value)} />}
    </Modal>
  );
}
