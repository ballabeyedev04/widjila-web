import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import SwalCustom from '../utils/swal.config.js';

/**
 * Hook générique de liste paginée côté serveur (recherche + filtres).
 *
 * Deux façons de piloter les filtres, au choix de la page :
 *
 *  1. Filtres pilotés par la page (usage majoritaire) — la page détient l'état
 *     et le passe en option. Le hook l'utilise tel quel :
 *
 *       const [filters, setFilters] = useState({ search: '', role: '' });
 *       const { items } = useServerList(listerMembres, { filters });
 *
 *  2. Filtres pilotés par le hook — la page consomme `search`/`setSearch` et
 *     `filters`/`setFilters` retournés par le hook.
 *
 * Comportements :
 *  - Tout changement de filtre est débouncé (400 ms) puis ramène à la page 1 —
 *    une frappe dans la recherche ne déclenche donc pas un appel par caractère.
 *  - Anti-race : les réponses obsolètes sont ignorées (requestIdRef).
 *  - 403 → `accessDenied=true` (la page affiche <AccessDenied>).
 *  - 401 → refresh silencieux géré par l'intercepteur axios.
 *  - Autres erreurs → SweetAlert + message.
 *
 * @param {object}   [options.filters]    Filtres pilotés par la page (mode 1).
 * @param {string[]} [options.filterKeys] Restreint les clés qui déclenchent un
 *                                        rechargement. Par défaut, toutes.
 */
export function useServerList(fetchFn, {
  limit = 10,
  debounceMs = 400,
  extraDeps = [],
  filterKeys = [],
  filters: externalFilters,
} = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [internalFilters, setInternalFilters] = useState({});
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);

  // Les filtres de la page l'emportent ; sinon on retombe sur l'état interne,
  // dans lequel `search` est une clé comme une autre.
  const activeFilters = useMemo(
    () => externalFilters ?? { ...internalFilters, search },
    [externalFilters, internalFilters, search]
  );

  // Empreintes stables : ce sont elles, et non l'identité des objets, qui
  // décident d'un rechargement. Sans cela, un littéral recréé à chaque rendu
  // (`extraDeps = []`) relancerait la requête en boucle.
  const filterKeysKey = JSON.stringify(filterKeys);
  const extraKey = JSON.stringify(extraDeps);

  const filtersKey = useMemo(() => {
    const source = activeFilters || {};
    const suivies = filterKeys.length ? filterKeys : Object.keys(source).sort();
    return JSON.stringify(suivies.map((k) => [k, source[k] ?? '']));
    // `filterKeys` est suivi par son empreinte `filterKeysKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, filterKeysKey]);

  // Filtres réellement appliqués : instantané pris à la fin du debounce.
  // Les garder en état (et non dans une ref) évite toute lecture de ref
  // pendant le rendu, et garantit que la requête part avec la valeur exacte
  // qui a déclenché le rechargement.
  const [applied, setApplied] = useState(() => ({ key: filtersKey, filters: activeFilters }));

  useEffect(() => {
    if (filtersKey === applied.key) return undefined;
    const timer = setTimeout(() => {
      setApplied({ key: filtersKey, filters: activeFilters });
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [filtersKey, applied.key, activeFilters, debounceMs]);

  const load = useCallback(async (targetPage, source = {}) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setAccessDenied(false);
    try {
      const payload = await fetchFn({
        page: targetPage,
        limit,
        ...source,
        search: (source.search ?? '').trim(),
      });
      if (requestIdRef.current !== requestId) return; // réponse obsolète
      setItems(payload?.items ?? payload?.membres ?? payload?.liste ?? []);
      setTotal(payload?.total ?? 0);
    } catch (err) {
      if (err?.response?.status === 403) {
        setAccessDenied(true);
      } else if (err?.response?.status !== 401) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Erreur lors du chargement des données';
        setError(message);
        SwalCustom.error(message);
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [fetchFn, limit]);

  useEffect(() => {
    load(page, applied.filters);
    // `extraKey` est l'empreinte de `extraDeps` : elle déclenche le
    // rechargement sans que l'identité du tableau n'entre en jeu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, page, applied, extraKey]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const nextPage = useCallback(() => {
    if (page < totalPages) setPage((p) => p + 1);
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  const reload = useCallback(() => load(page, applied.filters), [load, page, applied]);

  // Objet stabilisé pour éviter les re-renders inutiles
  const memo = useMemo(() => ({
    items, setItems, total, loading, accessDenied, error,
    // `setPage` est destructuré par toutes les pages consommatrices : sans lui
    // dans l'objet retourné, les boutons de pagination appelaient undefined().
    reload, page, setPage, totalPages, nextPage, prevPage,
    search, setSearch, filters: activeFilters, setFilters: setInternalFilters,
  }), [items, total, loading, accessDenied, error, reload, page, totalPages,
    nextPage, prevPage, search, activeFilters]);

  return memo;
}
