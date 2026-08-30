import { describe, it, expect } from 'vitest';
import { doitDeconnecter } from './api.js';

/**
 * Tests — décision de déconnexion après échec du renouvellement de session.
 *
 * C'est une règle de SÉCURITÉ, et elle arbitre entre deux erreurs de sens
 * opposé :
 *
 *   - déconnecter trop peu : une session RÉVOQUÉE (mot de passe changé,
 *     compte désactivé, rôle retiré, sessions révoquées) reste ouverte à
 *     l'écran. L'utilisateur garde ses menus — d'administration compris —
 *     pendant que chaque appel échoue en silence. Le backend refuse bien tout
 *     accès, mais l'interface ment sur l'état de la session ;
 *
 *   - déconnecter trop : une coupure réseau passagère éjecte un utilisateur
 *     en 3G sur un chantier, alors que sa session est parfaitement valide.
 *
 * Le critère est donc : le serveur a-t-il RÉPONDU que le refresh est refusé ?
 */

describe('le serveur refuse explicitement', () => {
  // 400 est le cas le plus fréquent, et le plus facile à oublier :
  // `auth.controller.js#refresh` lève un BadRequestError — pas un 401 —
  // quand le refreshToken est absent ou invalide, et efface le cookie.
  it.each([400, 401, 403])('déconnecte sur %i, même si le jeton local est encore valide', (statut) => {
    expect(doitDeconnecter(statut, false)).toBe(true);
  });
});

describe('le serveur n’a pas tranché', () => {
  it('ne déconnecte PAS sur une coupure réseau si le jeton local est valide', () => {
    // `undefined` = aucune réponse HTTP : axios n'a pas joint le serveur.
    expect(doitDeconnecter(undefined, false)).toBe(false);
  });

  it.each([500, 502, 503, 504])('ne déconnecte PAS sur une %i passagère', (statut) => {
    expect(doitDeconnecter(statut, false)).toBe(false);
  });

  it('déconnecte quand même si le jeton local est périmé', () => {
    // Plus rien ne permet de travailler : garder l'interface ouverte
    // n'afficherait que des erreurs.
    expect(doitDeconnecter(undefined, true)).toBe(true);
    expect(doitDeconnecter(500, true)).toBe(true);
  });
});

describe('cas limites', () => {
  it('ne déconnecte pas sur un 404 avec jeton valide', () => {
    // Un 404 sur /auth/refresh signalerait une erreur de déploiement, pas une
    // session révoquée : mieux vaut laisser l'utilisateur en place.
    expect(doitDeconnecter(404, false)).toBe(false);
  });

  it('ne déconnecte pas sur un 429 avec jeton valide', () => {
    // Limitation de débit : la session est bonne, il faut seulement attendre.
    expect(doitDeconnecter(429, false)).toBe(false);
  });
});
