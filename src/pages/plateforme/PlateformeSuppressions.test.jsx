import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../i18n/index.js';

import PlateformeSuppressions from './PlateformeSuppressions.jsx';
import {
  listerDemandesSuppression, traiterDemandeSuppression,
} from '../../service/admin/adminService.js';

/**
 * Demandes de suppression de compte — RGPD.
 *
 * Ces demandes arrivent de la page publique, déposées par des visiteurs NON
 * authentifiés, et le règlement accorde 30 jours pour répondre. Deux points
 * tiennent la conformité de cet écran :
 *
 *   - un REJET sans motif écrit n'est pas défendable en cas de contrôle ; le
 *     formulaire l'exige avant tout appel ;
 *   - l'échéance doit se voir AVANT d'être dépassée : l'alerte se déclenche à
 *     21 jours, pas à 30.
 */

vi.mock('../../service/admin/adminService.js', () => ({
  listerDemandesSuppression: vi.fn(),
  traiterDemandeSuppression: vi.fn(),
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

/** Une demande déposée il y a `jours` jours. */
const demande = (jours = 2, reste = {}) => ({
  id: 'sup-1',
  email: 'visiteur@exemple.test',
  objet: 'Je souhaite la suppression de mon compte.',
  statut: 'en_attente',
  createdAt: new Date(Date.now() - jours * 86400000).toISOString(),
  ...reste,
});

describe('PlateformeSuppressions', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    listerDemandesSuppression.mockResolvedValue({ items: [demande()], total: 1 });
  });

  it('liste les demandes en attente', async () => {
    render(<PlateformeSuppressions />);

    expect(await screen.findByText('visiteur@exemple.test')).toBeTruthy();
  });

  it('s’ouvre sur les demandes NON traitées', async () => {
    render(<PlateformeSuppressions />);

    await waitFor(() => expect(listerDemandesSuppression).toHaveBeenCalled());
    expect(listerDemandesSuppression.mock.calls[0][0]).toMatchObject({ statut: 'en_attente' });
  });

  it('alerte AVANT l’échéance légale, pas après', async () => {
    // 30 jours est le délai de réponse ; l'alerte à 21 laisse le temps d'agir.
    listerDemandesSuppression.mockResolvedValue({ items: [demande(22)], total: 1 });

    render(<PlateformeSuppressions />);

    expect(await screen.findByText(/22 jours/)).toBeTruthy();
  });

  it('n’alerte pas sur une demande récente', async () => {
    render(<PlateformeSuppressions />);

    await screen.findByText('visiteur@exemple.test');
    expect(screen.queryByText(/jours/)).toBeNull();
  });

  describe('décision', () => {
    it('refuse un rejet SANS motif — sans appeler le serveur', async () => {
      render(<PlateformeSuppressions />);

      fireEvent.click(await screen.findByRole('button', { name: /Rejeter/ }));
      fireEvent.click(screen.getByRole('button', { name: /Confirmer/ }));

      // Le message du champ, pas son libellé : c'est lui qui explique le refus.
      await screen.findByText('Un motif est obligatoire pour rejeter une demande.');
      expect(traiterDemandeSuppression).not.toHaveBeenCalled();
    });

    it('enregistre le rejet une fois le motif écrit', async () => {
      traiterDemandeSuppression.mockResolvedValue({});
      render(<PlateformeSuppressions />);

      fireEvent.click(await screen.findByRole('button', { name: /Rejeter/ }));
      fireEvent.change(screen.getByRole('textbox', { name: /Motif du rejet/ }), {
        target: { value: 'Identité non vérifiée : aucune réponse au courriel de confirmation.' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Confirmer/ }));

      await waitFor(() =>
        expect(traiterDemandeSuppression).toHaveBeenCalledWith(
          'sup-1',
          'rejetee',
          'Identité non vérifiée : aucune réponse au courriel de confirmation.'
        )
      );
    });

    it('accepte une note VIDE pour une demande traitée', async () => {
      // La note n'est obligatoire que pour un refus : traiter une demande
      // légitime ne demande pas de justification écrite.
      traiterDemandeSuppression.mockResolvedValue({});
      render(<PlateformeSuppressions />);

      fireEvent.click(await screen.findByRole('button', { name: /Marquer traitée|traitée/ }));
      fireEvent.click(screen.getByRole('button', { name: /Confirmer/ }));

      await waitFor(() =>
        expect(traiterDemandeSuppression).toHaveBeenCalledWith('sup-1', 'traitee', '')
      );
    });

    it('ne part qu’UNE fois même sur double clic', async () => {
      // Le traitement est irréversible : le compte est pseudonymisé puis
      // supprimé. `disabled` n'arrive qu'au rendu suivant — d'où useActionUnique.
      let resoudre;
      traiterDemandeSuppression.mockImplementation(() => new Promise((r) => { resoudre = r; }));
      render(<PlateformeSuppressions />);

      fireEvent.click(await screen.findByRole('button', { name: /Marquer traitée|traitée/ }));
      const confirmer = screen.getByRole('button', { name: /Confirmer/ });
      fireEvent.click(confirmer);
      fireEvent.click(confirmer);

      await waitFor(() => expect(traiterDemandeSuppression).toHaveBeenCalledTimes(1));
      resoudre({});
    });
  });

  it('distingue un accès refusé d’une file vide', async () => {
    const err = new Error('interdit');
    err.response = { status: 403, data: { message: 'Réservé au super-admin.' } };
    listerDemandesSuppression.mockRejectedValue(err);

    render(<PlateformeSuppressions />);

    expect(await screen.findByText(/Accès refusé/)).toBeTruthy();
  });
});
