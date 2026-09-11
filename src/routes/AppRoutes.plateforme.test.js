import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Parité MENU ↔ ROUTES, et garde du portail plateforme.
 *
 * Deux dérives que rien n'empêchait, et qui ne se voient ni à la compilation
 * ni au démarrage :
 *
 *   1. une entrée de menu dont le chemin n'a pas de route. Le clic mène au
 *      404. C'est exactement ce qui était arrivé à `/verify-email`, côté
 *      route publique : la page existait, l'endpoint serveur non ;
 *   2. un écran `/plateforme/*` déclaré SANS `SuperAdminRoute`. La garde est
 *      un confort d'affichage — le contrôle réel est côté serveur, et lui ne
 *      bouge pas — mais un écran de super-admin qui s'affiche pour un chef de
 *      chantier, même vide, est une promesse fausse et une fuite de la
 *      structure du portail.
 *
 * On lit les SOURCES plutôt que de monter l'application : les sept écrans
 * plateforme sont chargés en `lazy()`, et les monter tous pour vérifier une
 * table de routage coûterait bien plus que ce que ce contrôle vaut.
 */

// Le projet est en modules ES : `__dirname` n'existe pas. On repart de
// l'URL du module, ce qui reste juste quel que soit le dossier de lancement.
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDe = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

/** Les chemins déclarés dans `AppRoutes.jsx`, préfixe du layout compris. */
function routesDeclarees() {
  const src = sourceDe('routes/AppRoutes.jsx');
  return new Set(
    [...src.matchAll(/<Route\s[^>]*path="([^"]+)"/g)].map(([, chemin]) =>
      chemin.startsWith('/') ? chemin : `/${chemin}`
    )
  );
}

/**
 * Les entrées de menu déclarées dans `AdminLayout.jsx`.
 *
 * Les entrées d'ACTION en sont exclues. Deux d'entre elles — tableau de bord
 * chantier, documents — n'ont pas de route à elles : elles ouvrent le sélecteur
 * de chantier, puis mènent à l'onglet du chantier choisi. Leur `path` n'est
 * qu'une clé de liste, et le `#` qui le préfixe le dit.
 *
 * Elles ne sont pas simplement ignorées : `actionsDuMenu` vérifie plus bas que
 * tout chemin en `#` porte bien un `versChantier`. Sans cela, une faute de
 * frappe dans un vrai chemin suffirait à faire disparaître l'entrée du
 * contrôle.
 */
function cheminsDuMenu() {
  const src = sourceDe('layouts/AdminLayout.jsx');
  return [...src.matchAll(/\{\s*path:\s*'([^']+)',\s*label:/g)]
    .map(([, chemin]) => chemin)
    .filter((chemin) => !chemin.startsWith('#'));
}

/** Les entrées-actions : `path` en `#`, et la destination qu'elles construisent. */
function actionsDuMenu() {
  const src = sourceDe('layouts/AdminLayout.jsx');
  // Le bloc d'une entrée court de son `path` à l'accolade qui la ferme. Le
  // quantificateur paresseux borné évite d'avaler l'entrée suivante si l'une
  // d'elles perdait son accolade.
  return [...src.matchAll(/path:\s*'(#[^']+)',[\s\S]{0,400}?\},/g)]
    .map(([bloc, chemin]) => ({ chemin, aUneDestination: bloc.includes('versChantier:') }));
}

describe('portail plateforme — menu et routes', () => {
  const routes = routesDeclarees();
  const menu = cheminsDuMenu();

  it('la lecture des sources a bien abouti', () => {
    // Garde-fou du test : si les deux extractions tombaient à zéro, les
    // contrôles suivants passeraient sans rien comparer.
    expect(routes.size).toBeGreaterThan(20);
    expect(menu.length).toBeGreaterThan(15);
  });

  it('chaque entrée de menu mène à une route déclarée', () => {
    const orphelines = menu.filter((chemin) => !routes.has(chemin));
    expect(orphelines).toEqual([]);
  });

  it('une entrée sans route est une ACTION, et le dit', () => {
    // Le seul motif légitime de n'avoir aucune route : ouvrir le sélecteur de
    // chantier. Un `#` sans `versChantier` serait une entrée morte — un clic
    // qui ne fait rien, ce que rien d'autre ne signalerait.
    const actions = actionsDuMenu();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.filter((a) => !a.aUneDestination)).toEqual([]);
  });

  it('les sept écrans du super-admin sont dans le menu plateforme', () => {
    const attendus = [
      '/plateforme',
      '/plateforme/utilisateurs',
      '/plateforme/organisations',
      '/plateforme/demandes',
      '/plateforme/suppressions',
      '/plateforme/prix-abonnements',
      '/plateforme/audit',
    ];
    for (const chemin of attendus) expect(menu).toContain(chemin);
  });

  it('AUCUNE route /plateforme n’est déclarée sans SuperAdminRoute', () => {
    const src = sourceDe('routes/AppRoutes.jsx');

    // Chaque bloc `<Route …>…</Route>` ou `<Route … />` dont le chemin
    // commence par « plateforme » doit porter la garde dans son élément.
    const blocs = [...src.matchAll(/<Route\s+path="(plateforme[^"]*)"([\s\S]*?)\/>/g)];
    expect(blocs.length).toBe(7);

    const sansGarde = blocs
      .filter(([, , corps]) => !corps.includes('<SuperAdminRoute>'))
      .map(([, chemin]) => chemin);

    expect(sansGarde).toEqual([]);
  });

  it('`/verify-email` reste une REDIRECTION, jamais une page', () => {
    // Le parcours a été retiré du serveur : `register` pose `email_verifie`
    // et n'envoie aucun mail. Remettre une page ici afficherait « Lien
    // invalide ou expiré » à qui suit un ancien lien — un message qui accuse
    // le lien alors que c'est la route serveur qui n'existe plus.
    const src = sourceDe('routes/AppRoutes.jsx');
    expect(src).toMatch(/path="\/verify-email"\s+element=\{<Navigate to="\/login" replace \/>\}/);
    expect(src).not.toContain('VerifyEmail');
  });
});
