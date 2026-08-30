import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, MapPin } from 'lucide-react';

import Modal from '../Modal.jsx';
import PlanCanvas from './PlanCanvas.jsx';
import { Input, Select } from '../FormControls.jsx';
import {
  listerHotspots, creerHotspot, supprimerHotspot,
} from '../../service/plan/planService.js';
import { getErrorMessage } from '../../service/helpers.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Éditeur des zones cliquables d'un plan — l'outil de MISE EN PLACE, réservé
 * aux rôles qui déposent les plans.
 *
 * Ce que le poseur doit faire : cliquer l'endroit du plan où se trouve le
 * bâtiment (ou l'étage, ou l'appartement), choisir la cible, valider. Rien
 * d'autre. La saisie de coordonnées à la main — qui existait pour les
 * annotations — est ici volontairement absente : personne ne sait dire qu'un
 * bâtiment est « à 43,7 % en x », alors que tout le monde sait le montrer.
 *
 * LES CIBLES PROPOSÉES DÉPENDENT DU NIVEAU du plan édité :
 *   plan global   → les bâtiments du chantier
 *   plan bâtiment → les étages de CE bâtiment
 *   plan d'étage  → les zones de CET étage
 * Proposer les 400 zones du chantier sur le plan global n'aiderait personne et
 * laisserait poser des repères incohérents (que le backend refuserait de toute
 * façon, mais après coup).
 */
export default function HotspotEditeur({
  open, onClose, plan, blob, hotspots: initiaux = [], structure = [], niveau = {}, onChange,
}) {
  const { t } = useTranslation('chantier');
  const [hotspots, setHotspots] = useState(initiaux);
  const [point, setPoint] = useState(null);
  const [cibleId, setCibleId] = useState('');
  const [libelle, setLibelle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setHotspots(initiaux); }, [initiaux]);

  const recharger = async () => {
    try {
      const d = await listerHotspots(plan.id);
      setHotspots(d.items || []);
      onChange?.();
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    }
  };

  /** Niveau ciblé par ce plan, et cibles sélectionnables correspondantes. */
  const { cibleType, cibles } = useMemo(() => {
    if (niveau.etage) {
      return { cibleType: 'zone', cibles: niveau.etage.zones || [] };
    }
    if (niveau.batiment) {
      return { cibleType: 'etage', cibles: niveau.batiment.etages || [] };
    }
    return { cibleType: 'batiment', cibles: structure };
  }, [niveau.etage, niveau.batiment, structure]);

  const dejaPointees = new Set(hotspots.map((h) => h.cible_id));
  // Une cible déjà repérée reste listée mais signalée : la masquer ferait
  // croire à une donnée manquante quand on cherche à la repositionner.
  const disponibles = cibles;

  const enregistrer = async () => {
    if (!point) return SwalCustom.error(t('plans.cliquezDabordSurLePlan'));
    if (!cibleId) return SwalCustom.error(t('plans.choisissezUneCible'));
    setSaving(true);
    try {
      await creerHotspot(plan.id, {
        cible_type: cibleType,
        cible_id: cibleId,
        libelle: libelle.trim() || undefined,
        x: point.x,
        y: point.y,
      });
      SwalCustom.success(t('plans.repereAjoute'));
      setPoint(null);
      setCibleId('');
      setLibelle('');
      await recharger();
    } catch (err) {
      SwalCustom.error({ title: t('commun.creationImpossible'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const retirer = async (h) => {
    const ok = await SwalCustom.confirm({ title: t('plans.supprimerRepere'), icon: 'warning', danger: true });
    if (!ok) return;
    try {
      await supprimerHotspot(h.id);
      SwalCustom.success(t('plans.repereSupprime'));
      await recharger();
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    }
  };

  const nomCible = (h) => {
    const trouve = cibles.find((c) => c.id === h.cible_id);
    return h.libelle || trouve?.nom || '—';
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('plans.zonesCliquables')}
      size="lg"
      footer={<button className="btn btn-secondary" onClick={onClose}>{t('actions.fermer')}</button>}
    >
      <div className="pnav-scene">
        <div>
          <div className="pnav-aide">
            <MapPin size={15} /> {t('plans.aideHotspot')}
          </div>
          <PlanCanvas
            blob={blob}
            format={plan.format}
            hotspots={hotspots}
            marqueurs={point ? [{ id: 'nouveau', x: point.x, y: point.y, actif: true }] : []}
            mode="pointage"
            hauteur={440}
            onPointClique={(x, y) => setPoint({ x, y })}
          />
        </div>

        <div>
          <Select
            label={t('plans.cible')}
            value={cibleId}
            onChange={(e) => setCibleId(e.target.value)}
          >
            <option value="">{t('plans.choisirCible')}</option>
            {disponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}{dejaPointees.has(c.id) ? ` — ${t('plans.dejaRepere')}` : ''}
              </option>
            ))}
          </Select>

          <Input
            label={t('plans.libelleRepere')}
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder={t('plans.libelleReperePlaceholder')}
          />

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={enregistrer}
            disabled={saving || !point || !cibleId}
            style={{ width: '100%' }}
          >
            {saving ? '…' : t('plans.ajouterRepere')}
          </button>

          <h4 style={{ margin: '18px 0 10px' }}>{t('plans.reperesPoses', { n: hotspots.length })}</h4>
          {hotspots.length === 0 && (
            <p className="text-muted" style={{ fontSize: 13 }}>{t('plans.aucunRepere')}</p>
          )}
          <div className="pnav-liste">
            {hotspots.map((h) => (
              <div key={h.id} className="pnav-ligne" style={{ cursor: 'default' }}>
                <span className="pnav-ligne-corps">
                  <span className="pnav-ligne-titre">{nomCible(h)}</span>
                  <span className="pnav-ligne-meta">
                    x {Math.round(h.x)} · y {Math.round(h.y)}
                  </span>
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => retirer(h)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
