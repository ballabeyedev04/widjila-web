import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// i18n : on rend la valeur de repli du libellé, interpolations comprises.
// Charger la vraie configuration tirerait tout le catalogue pour un test qui
// ne porte pas sur la traduction.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Rend la clé suivie de ses interpolations : le test vérifie que les
    // BONNES valeurs sont transmises, pas la formulation du libellé — celle-ci
    // vit dans `i18n/locales/layout.js`, dans les quatre langues.
    t: (cle, options = {}) => `${cle} ${options.affiches ?? ''} ${options.total ?? ''}`,
  }),
}));

import DataTable from './DataTable.jsx';

/**
 * Tests — avertissement de troncature.
 *
 * Ce tableau pagine côté CLIENT : il ne voit que ce qu'on lui a donné. Les
 * onglets chantier chargeaient leurs listes en une seule page, plafonnée par
 * le serveur — et paginaient ces quelques lignes comme si elles étaient le
 * tout. Au-delà, les enregistrements devenaient invisibles sans le moindre
 * signe : l'utilisateur concluait qu'un rapport ou un lot avait disparu.
 *
 * L'avertissement n'est pas cosmétique : c'est ce qui distingue « il n'y en a
 * pas plus » de « on ne vous montre pas tout ».
 */

const COLONNES = [{ cle: 'nom', titre: 'Nom' }];
const lignes = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), nom: `Ligne ${i}` }));

describe('avertissement de troncature', () => {
  it('avertit quand le serveur en détient davantage', () => {
    render(<DataTable donnees={lignes(20)} colonnes={COLONNES} totalServeur={45} />);

    const bandeau = screen.getByRole('status');
    expect(bandeau.textContent).toContain('20');
    expect(bandeau.textContent).toContain('45');
  });

  it('n’avertit PAS quand la liste est complète', () => {
    render(<DataTable donnees={lignes(20)} colonnes={COLONNES} totalServeur={20} />);

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('n’avertit pas quand le total n’est pas fourni', () => {
    // Comportement inchangé pour les appelants qui ne passent pas la prop :
    // sans information, mieux vaut se taire qu'alarmer à tort.
    render(<DataTable donnees={lignes(20)} colonnes={COLONNES} />);

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('n’avertit pas sur un total incohérent (serveur < reçu)', () => {
    // Peut arriver après une suppression concurrente : annoncer « 20 sur 5 »
    // n'aiderait personne.
    render(<DataTable donnees={lignes(20)} colonnes={COLONNES} totalServeur={5} />);

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reste muet sur un jeu vide', () => {
    // L'état vide a son propre écran ; un bandeau par-dessus serait du bruit.
    render(
      <DataTable donnees={[]} colonnes={COLONNES} totalServeur={45} titreVide="Aucun élément" />
    );

    expect(screen.queryByRole('status')).toBeNull();
  });
});
