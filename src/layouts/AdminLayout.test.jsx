import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../i18n/index.js';
import AdminLayout from './AdminLayout.jsx';
import { useUser } from '../context/useUser.js';
import {
  compterDemandesEnAttente,
  compterSuppressionsEnAttente,
} from '../service/admin/adminService.js';

/**
 * Le menu du super-admin plateforme.
 *
 * Ce menu a dérivé deux fois dans des directions opposées : il a d'abord
 * montré l'INTÉGRALITÉ des écrans métier — membres, équipes, partenaires,
 * référentiels d'une entreprise cliente — parce que `roleAllowed` laisse
 * passer 'Admin' partout ; puis, en corrigeant, il s'est réduit aux seuls
 * écrans personnels et a emporté les demandes de chantier, c'est-à-dire le
 * cœur de son travail.
 *
 * Ces tests fixent les deux bords. Ce qui doit être là, et ce qui ne doit pas
 * y être — la seconde liste comptant autant que la première.
 */

vi.mock('../context/useUser.js', () => ({ useUser: vi.fn() }));

vi.mock('../context/SubscriptionContext.jsx', () => ({
  useSubscription: () => ({ status: null }),
  getTrialDisplayInfo: () => null,
}));

vi.mock('../service/notification/notificationService.js', () => ({
  compterNonLues: vi.fn().mockResolvedValue(0),
}));

vi.mock('../service/auth/authService.js', () => ({ logout: vi.fn() }));

// Les deux files d'attente du super-admin. Doublées ici pour deux raisons :
// sans elles, le layout partirait en requête réseau à chaque montage de test,
// et surtout on veut CHOISIR les compteurs pour vérifier les pastilles.
vi.mock('../service/admin/adminService.js', () => ({
  compterDemandesEnAttente: vi.fn().mockResolvedValue(0),
  compterSuppressionsEnAttente: vi.fn().mockResolvedValue(0),
}));

vi.mock('../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

const afficherPour = (role) => {
  useUser.mockReturnValue({
    user: { id: 'u1', nom: 'Admin', prenom: 'Suivi', role, email: 'a@b.fr' },
    clearUser: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <AdminLayout />
    </MemoryRouter>
  );
};

/** Une entrée de menu, désignée par son libellé exact. */
const entree = (libelle) => screen.queryAllByText(libelle).length > 0;

describe('menu du super-admin plateforme', () => {
  // Les libellés attendus sont ceux du français, langue principale du produit.
  beforeAll(() => i18n.changeLanguage('fr'));
  beforeEach(() => vi.clearAllMocks());

  it('donne accès aux demandes de chantier', async () => {
    afficherPour('Admin');

    // L'écran où il valide ou refuse les demandes : sans lui, il n'y accédait
    // plus que par le raccourci du tableau de bord.
    await waitFor(() => expect(entree('Demandes de chantier')).toBe(true));
  });

  it('donne accès aux écrans de supervision', async () => {
    afficherPour('Admin');

    // Ces trois écrans lui renvoient TOUTES les organisations : leurs
    // contrôleurs traitent le cas du super-admin, ils ne sont donc ni vides
    // ni sans objet pour lui.
    await waitFor(() => expect(entree('Chantiers')).toBe(true));
    expect(entree('Toutes les réserves')).toBe(true);
    expect(entree('Tous les plans')).toBe(true);
  });

  it('garde ses écrans personnels et la section plateforme', async () => {
    afficherPour('Admin');

    await waitFor(() => expect(entree('Vue plateforme')).toBe(true));
    expect(entree("Demandes d'inscription")).toBe(true);
    expect(entree('Journal audit') || entree("Journal d'audit")).toBe(true);
    expect(entree('Mon profil')).toBe(true);
  });

  it("n'affiche pas les écrans internes d'une entreprise cliente", async () => {
    afficherPour('Admin');

    // Ceux-ci relèvent de l'organisation, à laquelle ce compte n'appartient
    // pas. Le client les a explicitement écartés.
    await waitFor(() => expect(entree('Vue plateforme')).toBe(true));
    expect(entree('Membres')).toBe(false);
    expect(entree('Équipes')).toBe(false);
    expect(entree('Partenaires')).toBe(false);
    expect(entree('Mon organisation') || entree('Organisation')).toBe(false);
  });
});

describe('menu des comptes métier', () => {
  beforeAll(() => i18n.changeLanguage('fr'));
  beforeEach(() => vi.clearAllMocks());

  it("n'est pas touché par le filtre du super-admin", async () => {
    afficherPour('ChefProjet');

    // Le filtre ne s'applique qu'au rôle 'Admin' : un chef de projet garde
    // l'intégralité de son portail.
    await waitFor(() => expect(entree('Chantiers')).toBe(true));
    expect(entree('Membres')).toBe(true);
    expect(entree('Équipes')).toBe(true);
  });

  it("ne voit pas la section plateforme", async () => {
    afficherPour('ChefProjet');

    await waitFor(() => expect(entree('Chantiers')).toBe(true));
    expect(entree('Vue plateforme')).toBe(false);
    expect(entree("Demandes d'inscription")).toBe(false);
  });
});

describe('menu du titulaire « Entreprise »', () => {
  beforeAll(() => i18n.changeLanguage('fr'));
  beforeEach(() => vi.clearAllMocks());

  // C'est le compte créé par l'inscription publique : il ouvre
  // l'organisation, la paie, y invite ses équipes. Chaque menu qui lui
  // manquait venait d'un groupe de rôles écrit sans lui — trois fois de suite.

  it('voit tout le portail métier', async () => {
    afficherPour('Entreprise');

    await waitFor(() => expect(entree('Chantiers')).toBe(true));
    expect(entree('Demandes de chantier')).toBe(true);
    expect(entree('Toutes les réserves')).toBe(true);
    expect(entree('Tous les plans')).toBe(true);
  });

  it('voit la gestion de son organisation', async () => {
    afficherPour('Entreprise');

    // Ces entrées étaient gardées par ROLES_GESTION, qui l'excluait.
    await waitFor(() => expect(entree('Membres')).toBe(true));
    expect(entree('Équipes')).toBe(true);
    expect(entree('Partenaires')).toBe(true);
  });

  it('voit les référentiels de son organisation', async () => {
    afficherPour('Entreprise');

    await waitFor(() => expect(entree('Corps d’état')).toBe(true));
    expect(entree('Phases')).toBe(true);
  });

  it('ne voit pas la section plateforme', async () => {
    // Valider les inscriptions ou tarifer les formules n'est pas son affaire.
    afficherPour('Entreprise');

    await waitFor(() => expect(entree('Chantiers')).toBe(true));
    expect(entree('Vue plateforme')).toBe(false);
    expect(entree("Demandes d'inscription")).toBe(false);
    expect(entree('Organisations')).toBe(false);
  });
});

describe('les files d’attente du super-admin sont annoncées', () => {
  /**
   * Les deux compteurs existaient dans le service, les endpoints existaient
   * côté serveur — et personne ne les appelait. Le super-admin devait ouvrir
   * chaque page pour découvrir s'il avait du travail.
   *
   * C'est un vrai manque pour quelqu'un dont le métier EST de valider : une
   * demande d'inscription bloque un compte qui ne peut pas se connecter, et
   * une demande de suppression a un délai légal.
   */
  beforeEach(() => {
    // Les compteurs d'appels sont remis à zéro : sans cela, le test qui
    // vérifie qu'un AUTRE rôle n'appelle pas ces endpoints hériterait des
    // appels du test précédent.
    compterDemandesEnAttente.mockClear().mockResolvedValue(0);
    compterSuppressionsEnAttente.mockClear().mockResolvedValue(0);
  });

  it('affiche le nombre de demandes d’inscription en attente', async () => {
    compterDemandesEnAttente.mockResolvedValue(7);

    afficherPour('Admin');

    await waitFor(() => expect(screen.getByText('7')).toBeTruthy());
  });

  it('affiche le nombre de demandes de suppression en attente', async () => {
    compterSuppressionsEnAttente.mockResolvedValue(3);

    afficherPour('Admin');

    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
  });

  it('n’interroge PAS ces deux endpoints pour un autre rôle', async () => {
    // Ils sont réservés au super-admin (`requireRole('Admin')`) : les appeler
    // pour un chef de projet produirait un 403 à chaque ouverture de page.
    afficherPour('ChefProjet');

    // `entree` et non `getByText` : depuis que le menu porte aussi « Tableau de
    // bord chantier », un motif partiel trouve deux entrées et `getByText` lève
    // « found multiple elements ». Ce test ne veut savoir qu'une chose — que le
    // menu métier est bien monté avant de vérifier les appels.
    await waitFor(() => expect(entree('Tableau de bord')).toBe(true));
    expect(compterDemandesEnAttente).not.toHaveBeenCalled();
    expect(compterSuppressionsEnAttente).not.toHaveBeenCalled();
  });

  it('une file VIDE n’affiche aucune pastille', async () => {
    // Une pastille « 0 » ferait chercher un travail qui n'existe pas.
    afficherPour('Admin');

    await waitFor(() => expect(entree('Vue plateforme')).toBe(true));
    expect(screen.queryByText('0')).toBeNull();
  });

  it('un compteur en PANNE ne casse pas le menu', async () => {
    // Le menu doit s'afficher même si l'un des deux endpoints ne répond pas :
    // mieux vaut une pastille absente qu'un portail qui refuse de s'ouvrir.
    compterDemandesEnAttente.mockRejectedValue(new Error('503'));

    afficherPour('Admin');

    await waitFor(() => expect(entree('Vue plateforme')).toBe(true));
  });
});
