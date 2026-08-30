import { useState, useEffect } from 'react';

import { listerPhasesActives } from '../service/phase/phaseService.js';

/**
 * Phases ACTIVES du référentiel — alimente le sélecteur OBLIGATOIRE des
 * formulaires de réserve.
 *
 * Mis en cache pour la session, avec la même logique que
 * `useCorpsEtatActifs` : plusieurs écrans affichent un sélecteur de phase en
 * même temps, et le référentiel ne change qu'à l'occasion d'une modification
 * dans l'espace d'administration.
 *
 * `invaliderPhases()` est appelé par l'écran d'administration après toute
 * écriture : sans cela, une phase qu'on vient d'ajouter n'apparaîtrait dans
 * les formulaires qu'au prochain rechargement de l'onglet.
 */

let cache = null;
let requeteEnCours = null;

export function invaliderPhases() {
  cache = null;
  requeteEnCours = null;
}

async function charger() {
  if (cache) return cache;
  // Une seule requête même si plusieurs composants montent en même temps.
  if (!requeteEnCours) {
    requeteEnCours = listerPhasesActives()
      .then((d) => {
        cache = d.items || [];
        return cache;
      })
      .finally(() => { requeteEnCours = null; });
  }
  return requeteEnCours;
}

/**
 * @returns {{ phases: Array, chargement: boolean, erreur: unknown }}
 */
export function usePhasesActives() {
  const [phases, setPhases] = useState(cache || []);
  const [chargement, setChargement] = useState(!cache);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (cache) { setPhases(cache); setChargement(false); return undefined; }

    let vivant = true;
    setChargement(true);
    charger()
      .then((liste) => { if (vivant) { setPhases(liste); setErreur(null); } })
      // Contrairement au catalogue des métiers, un échec ICI est bloquant :
      // la phase est obligatoire, on ne peut pas laisser enregistrer sans.
      // Le formulaire affiche l'erreur et propose de réessayer.
      .catch((err) => { if (vivant) setErreur(err); })
      .finally(() => { if (vivant) setChargement(false); });

    return () => { vivant = false; };
  }, []);

  return { phases, chargement, erreur };
}
