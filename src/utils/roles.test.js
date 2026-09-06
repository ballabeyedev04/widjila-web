import { describe, it, expect } from 'vitest';

import * as constants from './constants.js';
import { ROLE_TITULAIRE, roleAllowed, peutGerer } from './constants.js';

/**
 * Le titulaire « Entreprise » n'est oublié dans aucun groupe de rôles.
 *
 * ## Pourquoi ce fichier existe
 *
 * Le même défaut est revenu trois fois, sous trois visages : l'entreprise ne
 * pouvait pas payer son abonnement, ne voyait pas ses paiements, ne voyait pas
 * ses chantiers. À chaque fois, la cause était un groupe de rôles écrit sans
 * elle — et le symptôme, un menu absent ou un bouton visible avec un 403
 * derrière.
 *
 * Le compte créé par l'inscription publique porte ce rôle : il ouvre
 * l'organisation, la paie, y invite ses équipes. C'est le rôle le plus élevé
 * après le super-admin plateforme.
 *
 * Ce fichier balaie TOUS les groupes exportés, y compris ceux qui n'existent
 * pas encore : un groupe ajouté demain sans le titulaire échoue ici.
 */

/** Tous les groupes de rôles exportés par `constants.js`. */
const groupes = Object.entries(constants).filter(
  ([nom, valeur]) => nom.startsWith('ROLES_') && Array.isArray(valeur)
);

describe('les groupes de rôles', () => {
  it('sont bien tous balayés — le test ne passe pas à vide', () => {
    expect(groupes.length).toBeGreaterThanOrEqual(6);
  });

  it.each(groupes.map(([nom]) => nom))('%s contient le titulaire', (nom) => {
    expect(constants[nom]).toContain(ROLE_TITULAIRE);
  });

  it('aucun groupe ne perd les rôles qu’il couvrait déjà', () => {
    // Élargir ne doit RIEN retirer.
    expect(constants.ROLES_OPERATIONNELS).toContain('ChefProjet');
    expect(constants.ROLES_GESTION).toContain('Admin');
    expect(constants.ROLES_PILOTAGE).toContain('MaitreOuvrage');
    expect(constants.ROLES_RESERVE_INTERVENANTS).toContain('Pilote');
  });

  it('n’ouvre rien au sous-traitant, qui garde son accès étroit', () => {
    // Il n'a droit qu'aux deux routes ouvertes pour lui côté serveur.
    for (const [, roles] of groupes) {
      expect(roles).not.toContain('SousTraitant');
    }
  });
});

describe('roleAllowed', () => {
  it('laisse passer le titulaire partout où le groupe le liste', () => {
    for (const [, roles] of groupes) {
      expect(roleAllowed(ROLE_TITULAIRE, roles)).toBe(true);
    }
  });

  it('laisse toujours passer le super-admin plateforme', () => {
    // Il n'est listé dans aucun groupe métier : c'est le middleware — ici la
    // fonction — qui le laisse passer.
    expect(roleAllowed('Admin', [])).toBe(true);
  });

  it('refuse un rôle absent du groupe', () => {
    expect(roleAllowed('Client', constants.ROLES_GESTION)).toBe(false);
  });
});

describe('peutGerer', () => {
  it('ouvre la gestion métier au titulaire', () => {
    // C'est son organisation : il y crée ses chantiers et ses réserves.
    expect(peutGerer(ROLE_TITULAIRE, constants.ROLES_OPERATIONNELS)).toBe(true);
  });

  it('la ferme au super-admin plateforme, qui supervise sans produire', () => {
    // La seule différence avec `roleAllowed`, et elle est voulue : l'admin
    // consulte le parc de ses clients, il n'y crée pas de chantier.
    expect(peutGerer('Admin', constants.ROLES_OPERATIONNELS)).toBe(false);
  });

  it('se comporte comme `roleAllowed` pour tous les autres rôles', () => {
    for (const role of ['ChefProjet', 'ConducteurTravaux', 'Client', 'SousTraitant']) {
      expect(peutGerer(role, constants.ROLES_OPERATIONNELS)).toBe(
        roleAllowed(role, constants.ROLES_OPERATIONNELS)
      );
    }
  });
});

describe('la page d’accueil du titulaire', () => {
  it('le mène à un écran qu’il peut réellement ouvrir', () => {
    // Une redirection vers un écran interdit renverrait l'utilisateur sur une
    // page d'erreur dès la connexion — le pire premier contact possible.
    expect(constants.ROLE_HOME[ROLE_TITULAIRE]).toBeDefined();
    expect(constants.ROLE_HOME[ROLE_TITULAIRE].startsWith('/plateforme')).toBe(false);
  });
});
