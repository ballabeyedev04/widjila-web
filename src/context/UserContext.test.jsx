import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { UserProvider } from './UserContext.jsx';
import { useUser } from './useUser.js';
import {
  getUser, getStoredToken, tenterReconnexionSilencieuse, consommerTransfertWeb,
} from '../service/api.js';

/**
 * Le fournisseur de session — et l'ORDRE dans lequel il la cherche.
 *
 *  1. un code de transfert venu du mobile (« Choisir cette formule ») ;
 *  2. une session déjà présente dans l'onglet ;
 *  3. la reconnexion silencieuse par le cookie de rafraîchissement.
 *
 * Le transfert passe en premier : la personne vient de demander, depuis SON
 * compte mobile, à payer pour son organisation. Et tant que rien n'est
 * tranché, `pretAuthentification` reste faux — c'est ce qui empêche la page
 * d'abonnement d'appeler l'API sans jeton (cascade 401 → refresh 400 → login).
 */

vi.mock('../service/api.js', () => ({
  getUser: vi.fn(),
  setUser: vi.fn(),
  clearUser: vi.fn(),
  getStoredToken: vi.fn(),
  tenterReconnexionSilencieuse: vi.fn(),
  ecouterFinDeSession: vi.fn(() => () => {}),
  consommerTransfertWeb: vi.fn(),
}));

vi.mock('../utils/monitoring.js', () => ({
  identifierUtilisateur: vi.fn(),
  effacerUtilisateur: vi.fn(),
}));

const BALLA = { id: 'u1', prenom: 'Balla', nom: 'Beye', role: 'Entreprise' };
const AWA = { id: 'u2', prenom: 'Awa', nom: 'Sow', role: 'ChefProjet' };

function Sonde() {
  const { user, pretAuthentification, transfertEchoue } = useUser();
  return (
    <p>
      {`pret=${pretAuthentification} user=${user?.prenom ?? 'aucun'} transfertEchoue=${Boolean(transfertEchoue)}`}
    </p>
  );
}

const afficher = () => render(<UserProvider><Sonde /></UserProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockReturnValue(null);
  getStoredToken.mockReturnValue(null);
  tenterReconnexionSilencieuse.mockResolvedValue(null);
  consommerTransfertWeb.mockResolvedValue(null);
});

describe('arrivée depuis le mobile', () => {
  it('le transfert réussi ouvre la session — sans reconnexion silencieuse', async () => {
    consommerTransfertWeb.mockResolvedValue({ utilisateur: BALLA });

    afficher();

    expect(await screen.findByText('pret=true user=Balla transfertEchoue=false')).toBeTruthy();
    expect(tenterReconnexionSilencieuse).not.toHaveBeenCalled();
  });

  it('le transfert PASSE AVANT une autre session déjà ouverte dans l’onglet', async () => {
    getUser.mockReturnValue(AWA);
    getStoredToken.mockReturnValue('jeton-awa');
    consommerTransfertWeb.mockResolvedValue({ utilisateur: BALLA });

    afficher();

    expect(await screen.findByText('pret=true user=Balla transfertEchoue=false')).toBeTruthy();
  });

  it('code refusé : l’échec est signalé, et on retombe sur la reconnexion', async () => {
    consommerTransfertWeb.mockResolvedValue({ echec: true });

    afficher();

    expect(await screen.findByText('pret=true user=aucun transfertEchoue=true')).toBeTruthy();
    expect(tenterReconnexionSilencieuse).toHaveBeenCalledTimes(1);
  });
});

describe('arrivée ordinaire', () => {
  it('session déjà en mémoire : rien à reconnecter', async () => {
    getUser.mockReturnValue(AWA);
    getStoredToken.mockReturnValue('jeton-awa');

    afficher();

    expect(await screen.findByText('pret=true user=Awa transfertEchoue=false')).toBeTruthy();
    expect(tenterReconnexionSilencieuse).not.toHaveBeenCalled();
  });

  it('onglet rouvert : la reconnexion silencieuse restaure la session', async () => {
    tenterReconnexionSilencieuse.mockResolvedValue(AWA);

    afficher();

    expect(await screen.findByText('pret=true user=Awa transfertEchoue=false')).toBeTruthy();
  });

  it('tant que la session n’est pas tranchée, « prêt » reste faux', async () => {
    let terminer;
    consommerTransfertWeb.mockReturnValue(new Promise((r) => { terminer = r; }));

    afficher();

    expect(screen.getByText('pret=false user=aucun transfertEchoue=false')).toBeTruthy();
    terminer(null);
    await waitFor(() => expect(screen.getByText(/pret=true/)).toBeTruthy());
  });
});
