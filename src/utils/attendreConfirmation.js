/**
 * Attend que le SERVEUR confirme un paiement — sans jamais l'affirmer à sa place.
 *
 * ## Pourquoi une fonction partagée
 *
 * Le portail encaisse par carte (Stripe) à deux endroits : l'écran Abonnement
 * et l'onglet Abonnement de l'organisation. Chacun avait son propre formulaire
 * et sa propre idée de ce qu'est un paiement réussi, et elles avaient divergé :
 *
 *  - l'écran Abonnement interrogeait le serveur jusqu'à ce que le webhook ait
 *    activé l'abonnement ;
 *  - l'onglet rechargeait une fois, immédiatement — c'est-à-dire presque
 *    toujours AVANT le webhook — et traitait un paiement `processing` comme une
 *    erreur ;
 *  - et l'onglet annonçait « Paiement réussi ! Votre abonnement est actif » à
 *    quiconque ouvrait `?payment=success`, sans rien vérifier.
 *
 * Deux implémentations d'un encaissement, c'est la garantie qu'elles finissent
 * par ne plus dire la même chose. Il n'en reste qu'une.
 *
 * ## Le principe
 *
 * `stripe.confirmCardPayment` rend `succeeded` dès que la banque autorise le
 * débit ; l'abonnement n'est activé que par le webhook, quelques centaines de
 * millisecondes à quelques secondes plus tard. On interroge donc le serveur à
 * intervalles croissants — le cas normal se règle au premier ou au deuxième
 * essai — puis on renonce SANS affirmer d'échec, ce que l'on ignore.
 *
 * @param {() => Promise<boolean>} verifier  Rend `true` quand le serveur
 *   confirme. Une exception (réseau instable) compte comme « pas encore ».
 * @param {object} [options]
 * @param {number[]} [options.attentes]  Attentes successives, en ms.
 * @param {(ms: number) => Promise<void>} [options.dormir]  Injectable pour les tests.
 * @returns {Promise<boolean>}
 */
export async function attendreConfirmation(verifier, {
  attentes = [0, 900, 1600, 2600, 3800, 5000],
  dormir = (ms) => new Promise((resoudre) => { setTimeout(resoudre, ms); }),
} = {}) {
  for (const attente of attentes) {
    if (attente) await dormir(attente);
    try {
      if (await verifier()) return true;
    } catch {
      // Réseau instable : on retente. Ce n'est pas une réponse du serveur.
    }
  }
  return false;
}

export default attendreConfirmation;
