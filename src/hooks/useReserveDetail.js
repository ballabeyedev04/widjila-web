import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getReserve, changerStatutReserve, ajouterPieceJointe, listerPiecesJointes,
  supprimerPieceJointe, signerReserve, listerSignatures, listerAffectations,
  retirerAffectation, genererQr, ajouterCommentaire, listerCommentaires,
  ajouterMedia, listerMedias, supprimerMedia,
} from '../service/reserve/reserveService.js';
import { getErrorMessage } from '../service/helpers.js';
import SwalCustom from '../utils/swal.config.js';

/**
 * Charge une réserve et tout ce qui l'accompagne, et expose les actions
 * associées.
 *
 * Extrait de `ReservesTab` pour être partagé par les DEUX présentations :
 * la modale ouverte depuis un chantier, et la page `/reserves/:id` qui a une
 * URL partageable. Sans ce hook, les deux auraient divergé au premier
 * correctif appliqué d'un seul côté.
 *
 * `reserveId` peut être `null` (modale fermée, paramètre d'URL absent) :
 * rien n'est chargé tant qu'il l'est.
 */
export function useReserveDetail(reserveId, { onChanged } = {}) {
  const { t } = useTranslation('chantier');

  const [detail, setDetail] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [commentaires, setCommentaires] = useState([]);
  const [medias, setMedias] = useState([]);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);

  const recharger = useCallback(async () => {
    if (!reserveId) return;
    setLoading(true);
    setIntrouvable(false);
    try {
      const [d, p, s, a, c, m] = await Promise.all([
        getReserve(reserveId), listerPiecesJointes(reserveId), listerSignatures(reserveId),
        listerAffectations(reserveId), listerCommentaires(reserveId), listerMedias(reserveId),
      ]);
      setDetail(d);
      setPieces(p.items);
      setSignatures(s.items);
      setAffectations(a.items);
      setCommentaires(c.items);
      setMedias(m.items);
    } catch (err) {
      // 404 traité à part : sur la PAGE, un identifiant erroné dans l'URL est
      // un cas courant (lien périmé, réserve supprimée). Une alerte modale
      // n'y répondrait pas — l'appelant affiche un état « introuvable ».
      if (err?.response?.status === 404) {
        setIntrouvable(true);
      } else {
        SwalCustom.error({ title: t('reserves.erreurChargementDetail'), text: getErrorMessage(err) });
      }
    } finally {
      setLoading(false);
    }
  }, [reserveId, t]);

  useEffect(() => { recharger(); }, [recharger]);

  // Remet l'état à zéro quand on change de réserve : sans cela, la modale
  // rouverte sur une AUTRE réserve afficherait un instant les pièces et
  // commentaires de la précédente.
  useEffect(() => {
    if (reserveId) return;
    setDetail(null); setPieces([]); setSignatures([]);
    setAffectations([]); setCommentaires([]); setMedias([]); setQr(null);
  }, [reserveId]);

  /** Notifie le parent (rafraîchir la liste) après une modification. */
  const signaler = () => { if (onChanged) onChanged(); };

  const changerStatut = async (statut, motif) => {
    if (!statut) return false;
    setSaving(true);
    try {
      await changerStatutReserve(reserveId, { statut, motif: motif || undefined });
      SwalCustom.success(t('commun.statutMisAJour'));
      await recharger();
      signaler();
      return true;
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const commenter = async (message) => {
    if (!message?.trim()) return false;
    try {
      await ajouterCommentaire(reserveId, { message });
      await recharger();
      return true;
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
      return false;
    }
  };

  const ajouterFichier = async (fichier) => {
    if (!fichier) return;
    try {
      await ajouterPieceJointe(reserveId, fichier);
      SwalCustom.success(t('reserves.pieceAjoutee'));
      await recharger();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const retirerFichier = async (pieceId) => {
    try {
      await supprimerPieceJointe(pieceId);
      await recharger();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const ajouterPhoto = async (fichier) => {
    if (!fichier) return;
    try {
      await ajouterMedia(reserveId, fichier);
      SwalCustom.success(t('reserves.mediaAjoute'));
      await recharger();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const retirerPhoto = async (mediaId) => {
    try {
      await supprimerMedia(mediaId);
      await recharger();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const chargerQr = async () => {
    try {
      const d = await genererQr(reserveId);
      setQr(d.qr || d.url);
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const retirerAffect = async (affectationId) => {
    try {
      await retirerAffectation(reserveId, affectationId);
      await recharger();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const signer = async (type) => {
    try {
      await signerReserve(reserveId, { type });
      SwalCustom.success(t('reserves.signatureEnregistree'));
      await recharger();
      signaler();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return {
    detail, pieces, signatures, affectations, commentaires, medias, qr,
    loading, saving, introuvable,
    recharger, changerStatut, commenter, ajouterFichier, retirerFichier,
    ajouterPhoto, retirerPhoto, chargerQr, retirerAffect, signer,
  };
}

export default useReserveDetail;
