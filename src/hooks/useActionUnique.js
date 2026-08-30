import { useCallback, useRef, useState } from 'react';

/**
 * Exécute une action asynchrone en garantissant qu'elle ne part QU'UNE FOIS,
 * même sur un double clic.
 *
 * ── Pourquoi `disabled={saving}` ne suffit pas ────────────────────────────
 * `setSaving(true)` ne prend effet qu'au rendu SUIVANT. Deux clics survenus
 * avant ce rendu déclenchent donc deux fois le gestionnaire, et l'attribut
 * `disabled` arrive trop tard.
 *
 * ── Pourquoi `if (saving) return;` ne suffit pas non plus ─────────────────
 * C'est le piège : les deux invocations du gestionnaire proviennent du MÊME
 * rendu, et y lisent donc la même valeur figée `saving === false`. La garde
 * laisse passer les deux appels — elle donne l'illusion d'une protection.
 *
 * Seule une `ref` est mise à jour immédiatement et partagée entre les
 * invocations : c'est elle qui bloque réellement le second appel.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────
 *   const { executer, enCours } = useActionUnique();
 *   <button disabled={enCours} onClick={() => executer(async () => {
 *     await supprimer(id);
 *   })} />
 *
 * `enCours` sert à l'affichage (bouton désactivé, libellé « … ») ; la `ref`
 * interne sert à la correction.
 *
 * L'action est TOUJOURS relâchée, y compris si elle lève — sans quoi une
 * erreur réseau condamnerait le bouton jusqu'au rechargement de la page.
 */
export function useActionUnique() {
  const enVol = useRef(false);
  const [enCours, setEnCours] = useState(false);

  const executer = useCallback(async (action) => {
    if (enVol.current) return undefined;
    enVol.current = true;
    setEnCours(true);
    try {
      return await action();
    } finally {
      enVol.current = false;
      setEnCours(false);
    }
  }, []);

  return { executer, enCours };
}
