/**
 * Adapte la réponse de `GET /abonnement/plan-details` à ce que lit l'onglet
 * « Abonnement » de la page Organisation.
 *
 * L'onglet lisait `isSubscribed`, `allPlans` et `planActuelDetails` — un
 * format que le serveur ne renvoie plus : il sert `{ droits, usage,
 * souscription, plans }` (`subscription.service.js#getPlanDetails`). Chaque
 * lecture tombait donc sur `undefined` :
 *   - aucune formule affichée, et la branche « aucun plan » levait une
 *     ReferenceError (`EmptyState` n'était pas importé) — l'onglet plantait ;
 *   - après un paiement, la confirmation attendait `isSubscribed`, qui
 *     n'arrivait jamais : l'écran annonçait « non confirmé » à chaque fois.
 *
 * L'ancien format reste accepté tel quel : si le serveur le renvoie, ses
 * valeurs priment.
 *
 * @param {any} res  Réponse déballée de `getPlanDetails()`.
 * @returns {any}    Détails au format de l'onglet, ou `null`.
 */
export function versDetailsOnglet(res) {
  if (!res) return null;
  const droits = res.droits || {};
  const plans = res.allPlans || res.plans || [];
  const abonne = res.isSubscribed ?? droits.source === 'abonnement';

  return {
    ...res,
    isSubscribed: abonne,
    trialEnded: res.trialEnded ?? (!abonne && !droits.essaiEnCours),
    joursRestantsTrial: res.joursRestantsTrial ?? droits.joursRestants ?? 0,
    trialEndsAt: res.trialEndsAt ?? (droits.essaiEnCours ? droits.dateFin : null),
    planActuel: res.planActuel ?? droits.planNom ?? null,
    // Retrouvée par CODE : l'identifiant d'une formule est un UUID, le code
    // (`pro`) est la clé stable que portent les droits.
    planActuelDetails: res.planActuelDetails
      ?? (abonne ? plans.find((p) => p.code === droits.planCode) ?? null : null),
    allPlans: plans,
  };
}
