/**
 * Charge TOUTES les pages d'une liste paginée, pour les sélecteurs.
 *
 * ## Le problème qu'elle corrige
 *
 * Huit écrans remplissaient une liste déroulante ainsi :
 *
 *     listerChantiers({ limit: 100 }).then((d) => setChantiers(d.items));
 *
 * Or le serveur PLAFONNE à 100 (`pagination.middleware.js#LIMITE_MAX`) — et il
 * le fait en silence : `limit: 200` est ramené à 100 sans le dire. Passé le
 * centième chantier, le filtre « Tous les chantiers » cesse d'en proposer
 * certains. Rien ne le signale : ni message, ni compteur, ni erreur. On croit
 * que le chantier a disparu.
 *
 * Le même défaut touchait les membres, les partenaires et les organisations.
 *
 * ## Pourquoi tout charger plutôt que paginer le sélecteur
 *
 * Ce sont des listes de RÉFÉRENCE, consultées pour choisir une valeur : on ne
 * feuillette pas une liste déroulante, on y cherche un nom. Les paginer
 * reviendrait à masquer la moitié des choix derrière un geste que personne ne
 * fait. À l'échelle réelle de ces données — quelques centaines d'entrées au
 * plus — deux ou trois requêtes suffisent.
 *
 * `maxPages` borne malgré tout la boucle : une pagination cassée côté serveur
 * (total qui n'arrive jamais, page qui se répète) ne doit pas se transformer en
 * requêtes à l'infini depuis le navigateur d'un client.
 *
 * @param {(params: object) => Promise<{items: unknown[], total: number}>} lister
 *   La fonction de service, appelée avec `{ page, limit, ...filtres }`.
 * @param {object} [options]
 * @param {object} [options.filtres]  Filtres transmis tels quels à chaque page.
 * @param {number} [options.maxPages] Garde-fou (défaut : 20 pages, soit 2000 entrées).
 * @returns {Promise<unknown[]>}
 */
export async function chargerToutesLesPages(lister, { filtres = {}, maxPages = 20 } = {}) {
  // 100 : le plafond du serveur. Demander plus ne sert à rien — il le ramène à
  // cette valeur —, demander moins multiplie les allers-retours.
  const LIMITE = 100;

  const tout = [];
  let page = 1;
  let total = 0;

  do {
    // Séquentiel et assumé : la page N+1 n'est demandée qu'une fois le total
    // connu, c'est-à-dire après la réponse de la page N.
    const reponse = await lister({ ...filtres, page, limit: LIMITE });
    const lot = reponse?.items ?? [];
    total = Number(reponse?.total) || 0;
    tout.push(...lot);

    // Un lot vide arrête la boucle même si le serveur annonce un total plus
    // grand : sans cette garde, un `total` erroné ferait tourner `maxPages`
    // requêtes pour ne rien ramener.
    if (lot.length === 0) break;

    page += 1;
  } while (tout.length < total && page <= maxPages);

  return tout;
}

export default chargerToutesLesPages;
