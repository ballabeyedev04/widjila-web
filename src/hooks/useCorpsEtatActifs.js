import { useState, useEffect } from 'react';

import { listerCorpsEtatActifs } from '../service/corpsEtat/corpsEtatService.js';

/**
 * Catalogue des corps d'état ACTIFS — alimente les listes déroulantes des
 * formulaires de réserve.
 *
 * MIS EN CACHE POUR LA SESSION : trois écrans peuvent afficher un sélecteur de
 * métier en même temps (la liste des réserves, le formulaire ouvert depuis le
 * plan, le détail d'une réserve). Sans cache, chacun redemanderait le même
 * catalogue à chaque montage — pour une donnée de référence qui ne change
 * qu'à l'occasion d'une modification dans l'espace d'administration.
 *
 * Le cache est INVALIDÉ par `invaliderCorpsEtat()`, appelé par l'écran
 * d'administration après toute écriture : sans cela, un métier qu'on vient
 * d'ajouter n'apparaîtrait dans les formulaires qu'au prochain rechargement
 * de l'onglet.
 */

let cache = null;
let requeteEnCours = null;

/** Vide le cache — à appeler après toute modification du catalogue. */
export function invaliderCorpsEtat() {
  cache = null;
  requeteEnCours = null;
}

async function charger() {
  if (cache) return cache;
  // Une seule requête même si trois composants montent en même temps : sans
  // cette mémorisation, le « cache » n'éviterait que les montages ULTÉRIEURS.
  if (!requeteEnCours) {
    requeteEnCours = listerCorpsEtatActifs()
      .then((d) => {
        cache = d.items || [];
        return cache;
      })
      .finally(() => { requeteEnCours = null; });
  }
  return requeteEnCours;
}

/**
 * @returns {{ corpsEtat: Array, chargement: boolean, erreur: unknown }}
 */
export function useCorpsEtatActifs() {
  const [corpsEtat, setCorpsEtat] = useState(cache || []);
  const [chargement, setChargement] = useState(!cache);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (cache) { setCorpsEtat(cache); setChargement(false); return undefined; }

    let vivant = true;
    setChargement(true);
    charger()
      .then((liste) => { if (vivant) { setCorpsEtat(liste); setErreur(null); } })
      // Un échec ici ne doit pas empêcher de saisir une réserve : le champ
      // reste vide et facultatif, le reste du formulaire fonctionne.
      .catch((err) => { if (vivant) setErreur(err); })
      .finally(() => { if (vivant) setChargement(false); });

    return () => { vivant = false; };
  }, []);

  return { corpsEtat, chargement, erreur };
}
