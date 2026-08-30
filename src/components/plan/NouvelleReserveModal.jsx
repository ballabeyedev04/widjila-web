import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, MapPin, X } from 'lucide-react';

import Modal from '../Modal.jsx';
import { Field, Input, Select, Textarea } from '../FormControls.jsx';
import { creerReserve, ajouterMedia } from '../../service/reserve/reserveService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { SEVERITES, enumLabel } from '../../utils/constants.js';
import { useCorpsEtatActifs } from '../../hooks/useCorpsEtatActifs.js';
import { usePhasesActives } from '../../hooks/usePhasesActives.js';
import SwalCustom from '../../utils/swal.config.js';
import { useEnum } from '../../hooks/useEnums.js';

/**
 * Fenêtre « Nouvelle réserve » ouverte par un clic sur le plan.
 *
 * Reprend exactement les champs obligatoires du guide client : titre,
 * observation, entreprise concernée, photo, gravité, délai de levée, et une
 * localisation NON SAISISSABLE — bâtiment, étage, appartement et point cliqué
 * sont hérités du parcours, pas retapés. C'est tout l'intérêt de créer la
 * réserve depuis le plan : la localisation ne peut pas être fausse.
 *
 * La PHOTO part en second appel (`POST /reserves/:id/medias`) : l'API de
 * création est en JSON, l'envoi de fichier en multipart. Si la réserve est
 * créée mais que la photo échoue, on garde la réserve et on le dit — perdre le
 * constat parce que la pièce jointe n'est pas passée serait le pire des deux.
 */
export default function NouvelleReserveModal({
  open,
  onClose,
  chantierId,
  /** { batiment, etage, zone, plan } — hérités du parcours de navigation. */
  localisation = {},
  /** { x, y } en % de la page — le point cliqué sur le plan. */
  position,
  /** Entreprises sélectionnables (partenaires du chantier). */
  entreprises = [],
  onCreee,
}) {
  const { t } = useTranslation('chantier');
  // Gravités servies par l'API — voir hooks/useEnums.js.
  const severites = useEnum('severites');
  const { t: tCorps } = useTranslation('corpsEtat');
  const { corpsEtat, chargement: corpsChargement } = useCorpsEtatActifs();
  const { t: tPhase } = useTranslation('phase');
  const { phases, chargement: phasesChargement } = usePhasesActives();
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputPhoto = useRef(null);

  const vierge = {
    titre: '', description: '', partenaireId: '',
    severite: 'moyenne', phaseId: '', corpsEtatId: '', date_limite: '',
  };

  useEffect(() => {
    if (open) { setForm(vierge); setPhoto(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // L'aperçu est une URL d'objet : sans révocation, chaque photo choisie
  // laissait un blob en mémoire jusqu'au rechargement de l'onglet.
  useEffect(() => {
    if (!photo) { setApercu(null); return undefined; }
    const url = URL.createObjectURL(photo);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const f = form || vierge;
  const maj = (champ) => (e) => setForm({ ...f, [champ]: e.target.value });

  const cheminLocalisation = [
    localisation.batiment?.nom,
    localisation.etage?.nom,
    localisation.zone?.nom,
  ].filter(Boolean).join(' › ');

  const submit = async (e) => {
    e?.preventDefault();
    if (!f.titre.trim()) return SwalCustom.error(t('reserves.titreRequis'));
    // Obligatoire côté serveur aussi (creerReserveSchema) : ce contrôle évite
    // simplement un aller-retour réseau pour un champ vide.
    if (!f.phaseId) return SwalCustom.error(tPhase('selecteur.requise'));
    setSaving(true);
    try {
      const reserve = await creerReserve(chantierId, {
        titre: f.titre.trim(),
        description: f.description.trim() || undefined,
        severite: f.severite,
        // La gravité pilote aussi la priorité de traitement : le guide client
        // ne demande qu'un seul curseur, en exposer deux ici obligerait
        // l'utilisateur à trancher une distinction qu'on ne lui a pas
        // expliquée. Elle reste modifiable séparément dans le détail.
        priorite: f.severite,
        phaseId: f.phaseId,
        corpsEtatId: f.corpsEtatId || undefined,
        partenaireId: f.partenaireId || undefined,
        date_limite: f.date_limite || undefined,
        batimentId: localisation.batiment?.id || undefined,
        etageId: localisation.etage?.id || undefined,
        zoneId: localisation.zone?.id || undefined,
        planId: localisation.plan?.id || undefined,
        position: position ? { x: position.x, y: position.y, zoom: 1 } : undefined,
      });

      if (photo && reserve?.id) {
        try {
          await ajouterMedia(reserve.id, photo);
        } catch (err) {
          SwalCustom.error({
            title: t('reserves.photoNonEnvoyee'),
            text: getErrorMessage(err),
          });
        }
      }

      SwalCustom.success(t('reserves.creee'));
      onClose();
      onCreee?.(reserve);
    } catch (err) {
      SwalCustom.error({ title: t('commun.creationImpossible'), text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('reserves.nouvelleReserve')}
      size="sm"
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? '…' : t('reserves.enregistrerReserve')}
          </button>
        </>
      )}
    >
      <form onSubmit={submit}>
        <Input
          label={t('reserves.titreReserve')}
          value={f.titre}
          onChange={maj('titre')}
          placeholder={t('reserves.titrePlaceholder')}
          required
          autoFocus
        />

        <Select
          label={tPhase('selecteur.label')}
          value={f.phaseId}
          onChange={maj('phaseId')}
          required
        >
          <option value="">{phasesChargement ? tPhase('selecteur.chargement') : tPhase('selecteur.choisir')}</option>
          {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.nom}</option>)}
        </Select>

        <Textarea
          label={t('reserves.observation')}
          value={f.description}
          onChange={maj('description')}
          placeholder={t('reserves.observationPlaceholder')}
          rows={3}
        />

        <Select label={t('reserves.entrepriseConcernee')} value={f.partenaireId} onChange={maj('partenaireId')}>
          <option value="">{t('reserves.aucuneF')}</option>
          {entreprises.map((en) => (
            <option key={en.id} value={en.id}>{en.nom}</option>
          ))}
        </Select>

        {/* ---------- Photo ---------- */}
        <Field label={t('reserves.photo')}>
          <div className="reserve-photo-ligne">
            {apercu
              ? (
                <div className="reserve-photo-apercu">
                  <img src={apercu} alt="" />
                  <button type="button" className="reserve-photo-retirer" onClick={() => setPhoto(null)} aria-label={t('actions.supprimer')}>
                    <X size={13} />
                  </button>
                </div>
              )
              : <div className="reserve-photo-vide"><Camera size={20} /></div>}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputPhoto.current?.click()}>
              <Camera size={14} /> {t('reserves.ajouterPhoto')}
            </button>
            <input
              ref={inputPhoto}
              type="file"
              accept="image/*"
              /* `capture` déclenche l'appareil photo sur un portable ou une
                 tablette de chantier, et est simplement ignoré sur un poste
                 fixe — qui retombe sur le sélecteur de fichiers. */
              capture="environment"
              hidden
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
          </div>
        </Field>

        <div className="grid-2">
          <Select label={t('reserves.gravite')} value={f.severite} onChange={maj('severite')}>
            {severites.map((v) => (
              <option key={v} value={v}>{enumLabel(v, SEVERITES[v]?.label)}</option>
            ))}
          </Select>
          <Input label={t('reserves.delaiLevee')} type="date" value={f.date_limite} onChange={maj('date_limite')} />
        </div>

        <Select label={tCorps('selecteur.label')} value={f.corpsEtatId} onChange={maj('corpsEtatId')}>
          <option value="">{corpsChargement ? tCorps('selecteur.chargement') : tCorps('selecteur.aucun')}</option>
          {corpsEtat.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </Select>

        {/* ---------- Localisation, héritée du parcours ---------- */}
        <Field label={t('reserves.localisation')}>
          <div className="reserve-localisation">
            <MapPin size={14} />
            <span>{cheminLocalisation || t('reserves.chantierEntier')}</span>
            {position && (
              <span className="reserve-localisation-point">
                x {position.x} · y {position.y}
              </span>
            )}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
