import { useState, useMemo, useEffect, useCallback } from 'react';

/**
 * Moteur d'un tableau dynamique — recherche, filtres par colonne, tri,
 * pagination.
 *
 * ── Portée : à lire avant d'utiliser ────────────────────────────────────────
 * Ce moteur travaille sur les données QU'IL A EN MAIN. Il n'est donc correct
 * que pour un jeu de données COMPLET côté client.
 *
 * Sur une liste paginée par le serveur (voir `useServerList`), filtrer les 20
 * lignes de la page courante donnerait un résultat faux : chercher « Awa »
 * afficherait 2 lignes alors que la base en contient 40, sans que rien ne le
 * signale. C'est pire que pas de filtre du tout. Ces tableaux gardent donc
 * leur filtrage serveur.
 *
 * Séparé du composant de rendu : la logique reste testable sans DOM, et une
 * page qui veut son propre habillage peut réutiliser le moteur seul.
 */
export function useDataTable({
  donnees = [],
  colonnes = [],
  parPageInitial = 10,
  triInitial = null, // { cle, sens: 'asc' | 'desc' }
}) {
  const [recherche, setRecherche] = useState('');
  const [filtres, setFiltres] = useState({});
  const [tri, setTri] = useState(triInitial);
  const [page, setPage] = useState(1);
  const [parPage, setParPage] = useState(parPageInitial);

  /**
   * Valeur BRUTE d'une cellule, pour filtrer et trier.
   *
   * Distincte de l'affichage : une colonne peut rendre un badge ou un lien,
   * dont on ne saurait tirer ni ordre ni texte. `valeur` la fournit ; à
   * défaut, on lit la propriété `cle` de la ligne.
   */
  const valeurBrute = useCallback((ligne, colonne) => {
    if (typeof colonne.valeur === 'function') return colonne.valeur(ligne);
    return ligne?.[colonne.cle];
  }, []);

  const enTexte = useCallback((v) => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString();
    return String(v);
  }, []);

  const lignesFiltrees = useMemo(() => {
    const motif = recherche.trim().toLowerCase();

    // Colonnes réellement filtrables — recalculé ici pour ne pas dépendre de
    // l'ordre de déclaration.
    const colonnesRecherchables = colonnes.filter((c) => c.recherchable !== false);

    return donnees.filter((ligne) => {
      // 1. Recherche globale : au moins une colonne doit contenir le motif.
      if (motif) {
        const trouve = colonnesRecherchables.some((c) =>
          enTexte(valeurBrute(ligne, c)).toLowerCase().includes(motif)
        );
        if (!trouve) return false;
      }

      // 2. Filtres par colonne : TOUS doivent passer (ET, pas OU) — c'est ce
      // qu'attend quiconque combine deux critères pour affiner.
      for (const [cle, valeurFiltre] of Object.entries(filtres)) {
        if (valeurFiltre === '' || valeurFiltre === null || valeurFiltre === undefined) continue;

        const colonne = colonnes.find((c) => c.cle === cle);
        if (!colonne) continue;

        const brute = valeurBrute(ligne, colonne);

        // Un filtre `select` compare à l'identique : « validee » ne doit pas
        // matcher « invalidee » par inclusion.
        if (colonne.filtre === 'select') {
          if (enTexte(brute) !== enTexte(valeurFiltre)) return false;
        } else {
          if (!enTexte(brute).toLowerCase().includes(String(valeurFiltre).toLowerCase())) return false;
        }
      }

      return true;
    });
  }, [donnees, colonnes, recherche, filtres, valeurBrute, enTexte]);

  const lignesTriees = useMemo(() => {
    if (!tri?.cle) return lignesFiltrees;
    const colonne = colonnes.find((c) => c.cle === tri.cle);
    if (!colonne) return lignesFiltrees;

    const signe = tri.sens === 'desc' ? -1 : 1;

    // Copie avant tri : `Array.prototype.sort` mute, et muter `donnees`
    // réordonnerait le tableau du parent à son insu.
    return [...lignesFiltrees].sort((a, b) => {
      const va = valeurBrute(a, colonne);
      const vb = valeurBrute(b, colonne);

      // Les valeurs absentes finissent toujours EN BAS, quel que soit le sens :
      // remonter des cellules vides en tête d'un tri décroissant n'aide
      // personne.
      const aVide = va === null || va === undefined || va === '';
      const bVide = vb === null || vb === undefined || vb === '';
      if (aVide && bVide) return 0;
      if (aVide) return 1;
      if (bVide) return -1;

      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * signe;
      if (va instanceof Date && vb instanceof Date) return (va - vb) * signe;

      // `localeCompare` avec `numeric` : « R-2 » se place avant « R-10 »,
      // là où une comparaison lexicale ferait l'inverse.
      return enTexte(va).localeCompare(enTexte(vb), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * signe;
    });
  }, [lignesFiltrees, tri, colonnes, valeurBrute, enTexte]);

  const total = lignesTriees.length;
  const totalPages = Math.max(1, Math.ceil(total / parPage));

  // Après un filtrage, la page courante peut ne plus exister : on y remédie
  // au lieu d'afficher un tableau vide sur une page 7 devenue inatteignable.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const lignesPage = useMemo(() => {
    const debut = (page - 1) * parPage;
    return lignesTriees.slice(debut, debut + parPage);
  }, [lignesTriees, page, parPage]);

  /** Bascule asc → desc → aucun tri. Le troisième état rend l'ordre d'origine. */
  const basculerTri = useCallback((cle) => {
    setTri((actuel) => {
      if (actuel?.cle !== cle) return { cle, sens: 'asc' };
      if (actuel.sens === 'asc') return { cle, sens: 'desc' };
      return null;
    });
  }, []);

  const definirFiltre = useCallback((cle, valeur) => {
    setFiltres((f) => ({ ...f, [cle]: valeur }));
    setPage(1); // un filtre change le jeu : rester en page 5 n'a pas de sens
  }, []);

  const definirRecherche = useCallback((texte) => {
    setRecherche(texte);
    setPage(1);
  }, []);

  const reinitialiser = useCallback(() => {
    setRecherche('');
    setFiltres({});
    setPage(1);
  }, []);

  const aDesFiltres = recherche.trim() !== ''
    || Object.values(filtres).some((v) => v !== '' && v !== null && v !== undefined);

  return {
    lignes: lignesPage,
    total,
    totalDonnees: donnees.length,
    page, setPage, totalPages,
    parPage, setParPage,
    recherche, definirRecherche,
    filtres, definirFiltre,
    tri, basculerTri,
    aDesFiltres, reinitialiser,
  };
}

export default useDataTable;
