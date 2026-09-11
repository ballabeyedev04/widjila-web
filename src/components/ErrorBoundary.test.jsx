import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import ErrorBoundary from './ErrorBoundary.jsx';

/**
 * Filet d'erreurs de rendu.
 *
 * Défauts corrigés :
 *   - une seule frontière, autour de toute l'application : une page qui
 *     plantait faisait disparaître le menu, et naviguer ne réparait rien ;
 *   - le message technique s'affichait en production, sans aucune référence
 *     à citer au support.
 */

const MESSAGE_TECHNIQUE = "Cannot read properties of undefined (reading 'id')";

function Bombe({ exploser }) {
  if (exploser) throw new Error(MESSAGE_TECHNIQUE);
  return <p>contenu sain</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('ErrorBoundary', () => {
  it('affiche un écran d’erreur avec une référence, la même que dans le rapport envoyé', () => {
    const console_ = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ErrorBoundary compact resetKey="/chantiers"><Bombe exploser /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toBeTruthy();
    const reference = screen.getByText(/^[0-9A-Z]{8}$/).textContent;
    const rapport = console_.mock.calls.find((appel) => appel[0] === '[monitoring]');
    expect(rapport).toBeDefined();
    expect(rapport[2]).toMatchObject({ source: 'ErrorBoundary', reference });
    // Libellés dans la langue active des tests (anglais ou français).
    expect(screen.getByRole('button', { name: /Recharger la page|Reload page/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Réessayer|Try again/ })).toBeTruthy();
  });

  it('changer de page efface l’erreur de la page quittée', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ErrorBoundary compact resetKey="/chantiers"><Bombe exploser /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeTruthy();

    rerender(<ErrorBoundary compact resetKey="/reserves"><Bombe exploser={false} /></ErrorBoundary>);

    expect(screen.getByText('contenu sain')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('en production, le message technique n’est pas montré à l’utilisateur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('PROD', true);

    render(<ErrorBoundary><Bombe exploser /></ErrorBoundary>);

    expect(screen.queryByText(MESSAGE_TECHNIQUE)).toBeNull();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
