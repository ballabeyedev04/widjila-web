import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useDataTable } from './useDataTable.js';

/**
 * Le moteur décide de ce que l'utilisateur voit. Une erreur ici ne casse rien
 * de visible : elle produit un tableau qui MENT — des lignes manquantes, un
 * tri faux, une page introuvable. D'où la densité de cas.
 */

const COLONNES = [
  { cle: 'nom', titre: 'Nom', filtre: 'texte' },
  { cle: 'statut', titre: 'Statut', filtre: 'select' },
  { cle: 'total', titre: 'Total' },
  { cle: 'actions', titre: '', triable: false, recherchable: false },
];

const DONNEES = [
  { id: '1', nom: 'Résidence Alpha', statut: 'validee', total: 12 },
  { id: '2', nom: 'Villa Beta', statut: 'en_cours', total: 3 },
  { id: '3', nom: 'Tour Gamma', statut: 'validee', total: 45 },
  { id: '4', nom: 'Hangar Delta', statut: 'invalidee', total: null },
];

const monter = (options = {}) =>
  renderHook(() => useDataTable({ donnees: DONNEES, colonnes: COLONNES, ...options }));

describe('recherche globale', () => {
  it('cherche dans toutes les colonnes recherchables', () => {
    const { result } = monter();
    act(() => result.current.definirRecherche('gamma'));
    expect(result.current.lignes.map((l) => l.id)).toEqual(['3']);
  });

  it('ignore la casse et les espaces de bord', () => {
    const { result } = monter();
    act(() => result.current.definirRecherche('  VILLA  '));
    expect(result.current.total).toBe(1);
  });

  it('cherche aussi dans les colonnes non textuelles', () => {
    const { result } = monter();
    act(() => result.current.definirRecherche('45'));
    expect(result.current.lignes.map((l) => l.id)).toEqual(['3']);
  });

  it('exclut les colonnes marquées non recherchables', () => {
    // La colonne d'actions ne porte aucune donnée : la fouiller ferait
    // remonter des lignes sans rapport.
    const { result } = renderHook(() => useDataTable({
      donnees: [{ id: '1', nom: 'A', actions: 'supprimer' }],
      colonnes: COLONNES,
    }));
    act(() => result.current.definirRecherche('supprimer'));
    expect(result.current.total).toBe(0);
  });
});

describe('filtres par colonne', () => {
  it('filtre en texte par inclusion', () => {
    const { result } = monter();
    act(() => result.current.definirFiltre('nom', 'a'));
    expect(result.current.total).toBe(4); // toutes contiennent un « a »
  });

  it('un filtre select compare à l\'IDENTIQUE', () => {
    // Par inclusion, « validee » ferait remonter « invalidee » — le tableau
    // afficherait un dossier refusé parmi les validés.
    const { result } = monter();
    act(() => result.current.definirFiltre('statut', 'validee'));
    expect(result.current.lignes.map((l) => l.id)).toEqual(['1', '3']);
  });

  it('combine les filtres en ET', () => {
    const { result } = monter();
    act(() => {
      result.current.definirFiltre('statut', 'validee');
      result.current.definirFiltre('nom', 'tour');
    });
    expect(result.current.lignes.map((l) => l.id)).toEqual(['3']);
  });

  it('un filtre vidé cesse de s\'appliquer', () => {
    const { result } = monter();
    act(() => result.current.definirFiltre('statut', 'validee'));
    expect(result.current.total).toBe(2);
    act(() => result.current.definirFiltre('statut', ''));
    expect(result.current.total).toBe(4);
  });

  it('cumule recherche globale et filtre de colonne', () => {
    const { result } = monter();
    act(() => {
      result.current.definirRecherche('a');
      result.current.definirFiltre('statut', 'en_cours');
    });
    expect(result.current.lignes.map((l) => l.id)).toEqual(['2']);
  });
});

describe('tri', () => {
  it('bascule asc → desc → aucun', () => {
    const { result } = monter();
    act(() => result.current.basculerTri('total'));
    expect(result.current.tri).toEqual({ cle: 'total', sens: 'asc' });
    act(() => result.current.basculerTri('total'));
    expect(result.current.tri).toEqual({ cle: 'total', sens: 'desc' });
    act(() => result.current.basculerTri('total'));
    expect(result.current.tri).toBeNull();
  });

  it('trie les nombres numériquement, pas alphabétiquement', () => {
    const { result } = monter();
    act(() => result.current.basculerTri('total'));
    // Alphabétiquement, « 12 » précéderait « 3 ».
    expect(result.current.lignes.map((l) => l.total)).toEqual([3, 12, 45, null]);
  });

  it('place les valeurs ABSENTES en bas dans les DEUX sens', () => {
    const { result } = monter();
    act(() => result.current.basculerTri('total'));
    expect(result.current.lignes[3].total).toBeNull();
    act(() => result.current.basculerTri('total'));
    expect(result.current.lignes[3].total).toBeNull();
  });

  it('trie « R-2 » avant « R-10 »', () => {
    const { result } = renderHook(() => useDataTable({
      donnees: [{ id: 'a', ref: 'R-10' }, { id: 'b', ref: 'R-2' }],
      colonnes: [{ cle: 'ref', titre: 'Réf' }],
    }));
    act(() => result.current.basculerTri('ref'));
    expect(result.current.lignes.map((l) => l.ref)).toEqual(['R-2', 'R-10']);
  });

  it('ne mute pas le tableau source', () => {
    const source = [...DONNEES];
    const { result } = renderHook(() => useDataTable({ donnees: source, colonnes: COLONNES }));
    act(() => result.current.basculerTri('total'));
    expect(source.map((l) => l.id)).toEqual(['1', '2', '3', '4']);
  });

  it('utilise `valeur()` quand la colonne rend du JSX', () => {
    const { result } = renderHook(() => useDataTable({
      donnees: [
        { id: '1', personne: { nom: 'Zoe' } },
        { id: '2', personne: { nom: 'Ali' } },
      ],
      colonnes: [{ cle: 'personne', titre: 'Qui', valeur: (l) => l.personne.nom }],
    }));
    act(() => result.current.basculerTri('personne'));
    expect(result.current.lignes.map((l) => l.id)).toEqual(['2', '1']);
  });
});

describe('pagination', () => {
  const beaucoup = Array.from({ length: 25 }, (_, i) => ({ id: String(i), nom: `Item ${i}` }));
  const colonnes = [{ cle: 'nom', titre: 'Nom' }];

  it('découpe en pages', () => {
    const { result } = renderHook(() => useDataTable({ donnees: beaucoup, colonnes, parPageInitial: 10 }));
    expect(result.current.lignes).toHaveLength(10);
    expect(result.current.totalPages).toBe(3);
  });

  it('la dernière page contient le reste', () => {
    const { result } = renderHook(() => useDataTable({ donnees: beaucoup, colonnes, parPageInitial: 10 }));
    act(() => result.current.setPage(3));
    expect(result.current.lignes).toHaveLength(5);
  });

  it('un filtre ramène à la page 1', () => {
    const { result } = renderHook(() => useDataTable({ donnees: beaucoup, colonnes, parPageInitial: 10 }));
    act(() => result.current.setPage(3));
    act(() => result.current.definirRecherche('Item 1'));
    expect(result.current.page).toBe(1);
  });

  it('recadre une page devenue inatteignable', () => {
    // Sans ce recadrage, filtrer depuis la page 3 laissait un tableau vide
    // sur une page qui n'existe plus.
    const { result } = renderHook(() => useDataTable({ donnees: beaucoup, colonnes, parPageInitial: 10 }));
    act(() => result.current.setPage(3));
    act(() => result.current.definirFiltre('nom', 'Item 7'));
    expect(result.current.page).toBe(1);
    expect(result.current.lignes.length).toBeGreaterThan(0);
  });

  it('changer le nombre par page recalcule le total', () => {
    const { result } = renderHook(() => useDataTable({ donnees: beaucoup, colonnes, parPageInitial: 10 }));
    act(() => result.current.setParPage(25));
    expect(result.current.totalPages).toBe(1);
  });
});

describe('états', () => {
  it('distingue jeu vide et filtrage sans résultat', () => {
    const { result } = monter();
    expect(result.current.totalDonnees).toBe(4);
    act(() => result.current.definirRecherche('zzzzz'));
    expect(result.current.total).toBe(0);
    // `totalDonnees` reste à 4 : l'appelant peut donc dire « aucun résultat »
    // au lieu de « aucune donnée ».
    expect(result.current.totalDonnees).toBe(4);
  });

  it('signale la présence de filtres actifs', () => {
    const { result } = monter();
    expect(result.current.aDesFiltres).toBe(false);
    act(() => result.current.definirFiltre('nom', 'a'));
    expect(result.current.aDesFiltres).toBe(true);
  });

  it('réinitialiser efface tout sauf le tri', () => {
    const { result } = monter();
    act(() => {
      result.current.definirRecherche('villa');
      result.current.definirFiltre('statut', 'en_cours');
      result.current.basculerTri('nom');
    });
    act(() => result.current.reinitialiser());
    expect(result.current.aDesFiltres).toBe(false);
    expect(result.current.total).toBe(4);
    // Le tri est une préférence d'affichage, pas un filtre : l'effacer
    // surprendrait après un simple « réinitialiser les filtres ».
    expect(result.current.tri).toEqual({ cle: 'nom', sens: 'asc' });
  });

  it('supporte un jeu de données vide', () => {
    const { result } = renderHook(() => useDataTable({ donnees: [], colonnes: COLONNES }));
    expect(result.current.lignes).toEqual([]);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.page).toBe(1);
  });
});
