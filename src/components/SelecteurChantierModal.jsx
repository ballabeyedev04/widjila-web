import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, MapPin, Search } from 'lucide-react';

import Modal from './Modal.jsx';
import Badge from './Badge.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import { listerChantiers } from '../service/chantier/chantierService.js';
import { getErrorMessage, LIMITE_MAX_PAGE } from '../service/helpers.js';

/**
 * Sélecteur de chantier — jumeau web de `chantier_picker_sheet` du mobile.
 *
 * ## À quoi il sert
 *
 * Plusieurs actions du portail n'appartiennent pas à un écran de chantier mais
 * exigent quand même un chantier : relever une réserve, déposer des plans,
 * ouvrir un tableau de bord. Sur mobile, elles passent toutes par la même
 * feuille. Le web les faisait passer par le chemin long — ouvrir la liste des
 * chantiers, trouver le bon, entrer dedans, chercher l'onglet — c'est-à-dire
 * quatre écrans pour un geste que le mobile fait en deux.
 *
 * ## Ce qu'il propose, et ce qu'il ne propose pas
 *
 * Par défaut, seuls les chantiers EN ACTIVITÉ : le serveur écarte de lui-même
 * les demandes en attente et les refusées (`demandes` non renseigné, voir
 * `chantierService.listerChantiers`). C'est volontaire — un chantier qui attend
 * sa validation n'accueille encore ni réserve ni inspection, et le proposer
 * mènerait droit à un refus du serveur après trois clics.
 *
 * La recherche est envoyée au SERVEUR et non appliquée sur la page reçue :
 * filtrer localement une première page de cent lignes donne l'illusion d'une
 * recherche complète alors qu'elle ignore tout ce qui suit.
 */
export default function SelecteurChantierModal({
  open,
  onClose,
  titre,
  onChoisir,
  /**
   * Message affiché quand l'organisation n'a aucun chantier en activité.
   * Les appelants n'ont pas tous la même suite à proposer — déposer des plans
   * pour les uns, demander un chantier pour les autres.
   */
  actionVide,
}) {
  const { t } = useTranslation('chantier');

  const [chantiers, setChantiers] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async (motif) => {
    setChargement(true);
    setErreur(null);
    try {
      const d = await listerChantiers({ search: motif, limit: LIMITE_MAX_PAGE });
      setChantiers(d.items || []);
    } catch (err) {
      setErreur(getErrorMessage(err));
    } finally {
      setChargement(false);
    }
  }, []);

  // Chaque frappe ne part pas au serveur : 300 ms de silence avant l'appel.
  // Sans ce délai, taper « Résidence » lançait neuf requêtes dont huit
  // inutiles, et les réponses pouvaient revenir dans le désordre.
  useEffect(() => {
    if (!open) return undefined;
    const minuteur = setTimeout(() => charger(recherche), 300);
    return () => clearTimeout(minuteur);
  }, [open, recherche, charger]);

  // La saisie précédente ne doit pas survivre à la fermeture : rouvrir le
  // sélecteur pour un autre chantier repartirait sur un filtre invisible.
  useEffect(() => { if (!open) setRecherche(''); }, [open]);

  const liste = useMemo(() => chantiers ?? [], [chantiers]);

  return (
    <Modal open={open} onClose={onClose} title={titre || t('selecteur.titre')} size="sm">
      <div className="selecteur-chantier-recherche">
        <Search size={15} aria-hidden="true" />
        <input
          className="input"
          placeholder={t('selecteur.rechercher')}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          autoFocus
        />
      </div>

      {chargement && <p className="text-muted" style={{ fontSize: 13 }}>{t('etats.chargement')}</p>}

      {!chargement && erreur && <ErrorState message={erreur} onRetry={() => charger(recherche)} />}

      {!chargement && !erreur && liste.length === 0 && (
        <EmptyState
          icon={Building2}
          recherche={!!recherche}
          title={recherche ? t('selecteur.aucunResultat') : t('selecteur.aucunChantier')}
          message={recherche ? t('selecteur.aucunResultatAide') : t('selecteur.aucunChantierAide')}
          action={!recherche ? actionVide : undefined}
        />
      )}

      {!chargement && !erreur && liste.length > 0 && (
        <ul className="selecteur-chantier-liste">
          {liste.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onChoisir(c)}>
                <span className="selecteur-chantier-icone"><Building2 size={17} /></span>
                <span className="selecteur-chantier-textes">
                  <strong>{c.nom}</strong>
                  {(c.ville || c.adresse) && (
                    <span>
                      <MapPin size={11} aria-hidden="true" /> {c.ville || c.adresse}
                    </span>
                  )}
                </span>
                {c.statut && <Badge statusKey={c.statut} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
