import { useEffect, useState } from 'react';

/**
 * L'appareil est-il en ligne ?
 *
 * ## Pourquoi ce hook existe
 *
 * L'application ne savait rien du réseau : aucune occurrence de
 * `navigator.onLine`, aucun écouteur `online`/`offline`. Une coupure produisait
 * donc exactement la même chose qu'une panne serveur — une alerte rouge
 * « Erreur de chargement » — alors que les deux appellent des gestes opposés :
 * l'une se règle en attendant le réseau, l'autre en prévenant le support.
 *
 * C'est le cas d'usage principal du produit : un conducteur de travaux sur un
 * chantier, en 3G instable, sous un bâtiment en béton. Lui dire « le réseau est
 * coupé » lui évite de refaire trois fois la même saisie en pensant que
 * l'application est cassée.
 *
 * ## Ce que ce hook ne prétend PAS savoir
 *
 * `navigator.onLine` répond à « une interface réseau est-elle active ? », pas à
 * « le serveur est-il joignable ? ». Un wifi capté sans accès Internet est
 * annoncé « en ligne ». Il est donc fiable dans un seul sens : quand il dit
 * FAUX, on est certainement hors ligne. C'est précisément le cas qu'on veut
 * signaler ; le reste continue de passer par les erreurs de requête.
 */
export function useEtatReseau() {
  const [enLigne, setEnLigne] = useState(
    // `navigator` peut manquer côté test ou rendu serveur : on suppose alors
    // la connexion présente, pour ne pas afficher un bandeau d'alarme à tort.
    () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
  );

  useEffect(() => {
    const passerEnLigne = () => setEnLigne(true);
    const passerHorsLigne = () => setEnLigne(false);

    window.addEventListener('online', passerEnLigne);
    window.addEventListener('offline', passerHorsLigne);

    // Relu au montage : l'état a pu changer entre le premier rendu et
    // l'installation des écouteurs.
    setEnLigne(navigator.onLine !== false);

    return () => {
      window.removeEventListener('online', passerEnLigne);
      window.removeEventListener('offline', passerHorsLigne);
    };
  }, []);

  return enLigne;
}

export default useEtatReseau;
