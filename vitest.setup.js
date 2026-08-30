import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Démonte les composants rendus après chaque test.
 *
 * React Testing Library le fait automatiquement — mais SEULEMENT si un
 * `afterEach` global est disponible, c'est-à-dire avec `globals: true`. Cette
 * configuration utilise `globals: false` (les fonctions de test sont importées
 * explicitement, ce qui est plus clair) : le nettoyage automatique ne se
 * déclenchait donc jamais.
 *
 * Conséquence, invisible et vicieuse : chaque `render()` d'un fichier
 * s'ajoutait au même DOM. Un test cherchant l'absence d'un élément trouvait
 * celui rendu par le test PRÉCÉDENT et échouait ; à l'inverse, un test pouvait
 * réussir grâce au rendu d'un autre. Les résultats dépendaient de l'ordre
 * d'écriture des tests.
 *
 * Sans effet sur les tests qui n'utilisent pas `render` : `cleanup()` sur un
 * DOM vide ne fait rien.
 */
afterEach(() => {
  cleanup();
});
