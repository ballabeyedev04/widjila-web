/**
 * Déduplication des écritures EN VOL — un même envoi ne part jamais deux fois.
 *
 * ## Le problème
 *
 * Trente-neuf gestionnaires de formulaire suivent le même schéma :
 *
 *     const submit = async () => {
 *       setSaving(true);
 *       await creerQuelqueChose(...);
 *     };
 *     <button disabled={saving} onClick={submit} />
 *
 * `setSaving(true)` ne prend effet qu'au rendu SUIVANT : deux clics survenus
 * avant ce rendu — un double clic, une touche Entrée maintenue, un écran
 * tactile qui rebondit — déclenchent DEUX fois le gestionnaire, et `disabled`
 * arrive trop tard. Résultat : deux réserves identiques, deux membres, deux
 * demandes de chantier. Sur le parcours de paiement, deux intentions de débit.
 *
 * Ajouter `if (saving) return;` en tête ne corrige rien : les deux invocations
 * viennent du MÊME rendu et y lisent la même valeur figée `false`. Seule une
 * référence mutable, partagée entre les invocations, bloque réellement la
 * seconde — c'est ce que fait `useActionUnique` pour un bouton donné.
 *
 * ## Pourquoi corriger ICI plutôt que dans chaque formulaire
 *
 * « Le même écrit ne doit pas partir deux fois » est une règle de la couche
 * réseau, pas une règle d'écran. La poser trente-neuf fois, c'est la poser
 * trente-huit fois et l'oublier une — et le prochain formulaire écrit repart
 * sans elle. Ici, elle s'applique à tout ce qui existe et à tout ce qui
 * viendra.
 *
 * ## Ce que la fenêtre couvre, et ce qu'elle ne couvre pas
 *
 * On ne déduplique que ce qui est ENCORE EN VOL : une requête identique dont
 * la précédente n'a pas encore répondu. Deux créations volontairement
 * identiques — deux réserves du même titre, saisies l'une après l'autre — sont
 * toujours séparées par une réponse reçue (le formulaire se ferme au succès) :
 * elles ne sont donc jamais confondues. La fenêtre vise exactement le double
 * clic, et rien d'autre.
 *
 * Les LECTURES ne sont pas déduplicées : `useServerList` gère déjà ses
 * réponses obsolètes par identifiant de requête, et deux `GET` concurrents sur
 * la même URL sont parfaitement légitimes (deux composants montés en même
 * temps).
 *
 * ## Ce que reçoit l'appelant dupliqué
 *
 * La MÊME promesse. Le second gestionnaire aboutit donc au même résultat que
 * le premier : la modale se referme, la liste se recharge. Un message de succès
 * peut s'afficher deux fois — sans conséquence. C'est la DONNÉE écrite en
 * double qu'il fallait empêcher, pas l'accusé de réception.
 */

/** Les méthodes qui MODIFIENT l'état côté serveur. */
const METHODES_ECRITURE = ['post', 'put', 'patch', 'delete'];

/**
 * Empreinte d'un corps de requête.
 *
 * `FormData` n'est pas sérialisable : on le décrit par ses clés, et par le nom
 * et la taille des fichiers qu'il porte. Deux dépôts du même fichier sur la
 * même route, dans la même seconde, sont un double clic — pas une intention.
 *
 * Toute forme qu'on ne sait pas décrire renvoie `null` : la requête part alors
 * sans déduplication. Mieux vaut laisser passer un doublon rare que bloquer un
 * envoi légitime qu'on aurait mal identifié.
 */
function empreinte(corps) {
  if (corps === undefined || corps === null) return '';

  if (typeof FormData !== 'undefined' && corps instanceof FormData) {
    const parts = [];
    for (const [cle, valeur] of corps.entries()) {
      parts.push(
        typeof File !== 'undefined' && valeur instanceof File
          // Nom et TAILLE, sans `lastModified` : deux `File` construits à
          // quelques millisecondes d'intervalle depuis le même choix de
          // fichier portent des horodatages différents, et l'empreinte ne
          // reconnaîtrait plus le doublon qu'elle est censée attraper.
          ? `${cle}=${valeur.name}:${valeur.size}`
          : `${cle}=${valeur}`,
      );
    }
    return parts.sort().join('&');
  }

  if (typeof corps === 'string') return corps;

  try {
    return JSON.stringify(corps);
  } catch {
    return null;   // structure cyclique ou exotique — on ne déduplique pas
  }
}

/**
 * Enveloppe les méthodes d'écriture d'une instance axios.
 *
 * @param {import('axios').AxiosInstance} instance
 * @returns {import('axios').AxiosInstance} la même instance, méthodes enveloppées
 */
export function installerDeduplication(instance) {
  const enVol = new Map();

  for (const methode of METHODES_ECRITURE) {
    const original = instance[methode].bind(instance);

    instance[methode] = (url, ...reste) => {
      // `delete` prend la config en second argument, les autres le corps :
      // seul `post`/`put`/`patch` a un corps à empreindre.
      const corps = methode === 'delete' ? undefined : reste[0];
      const signature = empreinte(corps);

      // Corps indescriptible : on n'invente pas de clé, la requête part telle
      // quelle.
      if (signature === null) return original(url, ...reste);

      const cle = `${methode} ${url} ${signature}`;
      const dejaEnVol = enVol.get(cle);
      if (dejaEnVol) return dejaEnVol;

      const promesse = original(url, ...reste).finally(() => {
        // Retirée DÈS la réponse, succès ou échec : un envoi qui a échoué doit
        // pouvoir être refait immédiatement — c'est précisément ce que fait
        // l'utilisateur après une erreur réseau.
        enVol.delete(cle);
      });

      enVol.set(cle, promesse);
      return promesse;
    };
  }

  return instance;
}

export default installerDeduplication;
