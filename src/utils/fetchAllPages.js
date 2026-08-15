/**
 * Itère toutes les pages d'une liste paginée pour un export complet.
 * `fetchFn(page, limit)` doit renvoyer un payload avec un tableau de données.
 */
export const fetchAllPages = async (fetchFn, { limit = 100, listKey = 'items', maxPages = 500 } = {}) => {
  const all = [];
  let page = 1;
  let total = 0;

  do {
    const payload = await fetchFn(page, limit);
    const items = payload?.[listKey] || [];
    total = payload?.total ?? items.length;
    all.push(...items);
    page += 1;
  } while (all.length < total && page <= maxPages && total > 0);

  return all;
};
