import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import i18n from '../../i18n/index.js';

import PlateformeAudit from './PlateformeAudit.jsx';
import { listerAuditLogs } from '../../service/admin/adminService.js';

/**
 * Journal d'audit — la trace de ce que le super-admin a décidé.
 *
 * Le défaut corrigé ici : l'intertitre de journée se calculait sur le jour
 * UTC (`toISOString`), alors que l'heure et le titre sont rendus par `Intl`
 * dans le fuseau du lecteur. À l'est de Greenwich, une même journée locale se
 * coupait en deux et son titre s'affichait deux fois ; à l'ouest, un
 * changement de journée n'était pas marqué du tout. Un journal sert à
 * reconstituer une chronologie : c'est précisément ce que cela cassait.
 */

vi.mock('../../service/admin/adminService.js', () => ({
  listerAuditLogs: vi.fn(),
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

const log = (id, quand, reste = {}) => ({
  id,
  action: 'utilisateur.role.change',
  cibleType: 'utilisateur',
  createdAt: quand,
  adminNom: 'Awa Sow',
  ip: '10.0.0.1',
  ...reste,
});

/** Les intertitres de journée, dans l'ordre du tableau. */
const intertitres = () =>
  [...document.querySelectorAll('tr.audit-jour td')].map((td) => td.textContent);

describe('PlateformeAudit', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('liste les événements avec leur auteur', async () => {
    listerAuditLogs.mockResolvedValue({
      items: [log('a1', '2026-09-08T10:00:00.000Z')],
      total: 1,
    });

    render(<PlateformeAudit />);

    expect(await screen.findByText('Awa Sow')).toBeTruthy();
  });

  it('groupe par journée LOCALE, sans répéter une date', async () => {
    // Deux entrées séparées de deux heures. Selon le fuseau du lecteur, elles
    // peuvent tomber de part et d'autre de minuit UTC sans changer de jour
    // local — l'ancien calcul insérait alors deux fois le même intertitre.
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    const deuxHeuresAvant = new Date(base.getTime() - 2 * 3600000);

    listerAuditLogs.mockResolvedValue({
      items: [log('a1', base.toISOString()), log('a2', deuxHeuresAvant.toISOString())],
      total: 2,
    });

    render(<PlateformeAudit />);

    await waitFor(() => expect(intertitres()).toHaveLength(1));
    expect(new Set(intertitres()).size).toBe(1);
  });

  it('marque bien le changement de journée locale', async () => {
    // Le contrôle symétrique : deux jours locaux distincts doivent produire
    // deux intertitres — sans quoi le correctif aurait supprimé la coupure.
    const aujourdHui = new Date();
    aujourdHui.setHours(12, 0, 0, 0);
    const hier = new Date(aujourdHui.getTime() - 24 * 3600000);

    listerAuditLogs.mockResolvedValue({
      items: [log('a1', aujourdHui.toISOString()), log('a2', hier.toISOString())],
      total: 2,
    });

    render(<PlateformeAudit />);

    await waitFor(() => expect(intertitres()).toHaveLength(2));
  });

  it('annonce un journal vide sans laisser croire à une panne', async () => {
    listerAuditLogs.mockResolvedValue({ items: [], total: 0 });

    render(<PlateformeAudit />);

    expect(await screen.findByText("Aucun événement d'audit")).toBeTruthy();
  });

  it('distingue un accès refusé d’un journal vide', async () => {
    const err = new Error('interdit');
    err.response = { status: 403, data: { message: 'Réservé au super-admin.' } };
    listerAuditLogs.mockRejectedValue(err);

    render(<PlateformeAudit />);

    expect(await screen.findByText(/Accès refusé/)).toBeTruthy();
  });
});
