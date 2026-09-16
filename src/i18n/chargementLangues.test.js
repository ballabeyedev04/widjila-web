import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import i18n, {
  applyLanguage, chargerLangue, NAMESPACES, SUPPORTED_LANGUAGES, FALLBACK_LANGUAGE,
  langueInitialePrete,
} from './index.js';

/**
 * Le chargement des traductions, langue par langue.
 *
 * ## Ce que ces tests verrouillent
 *
 * Les quatre langues vivaient dans un seul fichier par namespace : un lecteur
 * francophone téléchargeait aussi l'anglais, l'allemand et l'espagnol — 356 Ko
 * de source, dont trois quarts inutiles pour lui, dans le paquet d'entrée.
 * Elles sont désormais dans des fichiers séparés, et seules les traductions du
 * repli partent d'office.
 *
 * Ce découpage introduit un chemin ASYNCHRONE qui n'existait pas : basculer
 * vers l'allemand demande maintenant un téléchargement. Trois choses doivent
 * rester vraies, et c'est ce que ces tests tiennent :
 *
 *   1. LE REPLI EST LÀ SANS ATTENDRE. Le premier rendu ne doit jamais afficher
 *      de clés brutes (`explorateur.nSousPlans`) à la place des libellés.
 *   2. UNE BASCULE ABOUTIT VRAIMENT. Après `applyLanguage('de')`, les libellés
 *      sont allemands — pas la traduction de repli servie silencieusement.
 *   3. AUCUN NAMESPACE NE MANQUE dans aucune langue. Un fichier oublié au
 *      découpage laisserait un écran entier en français au milieu d'une
 *      interface allemande, sans erreur.
 */

const LANGUE_INITIALE = i18n.language;

beforeAll(async () => {
  // La bascule automatique vers la langue du navigateur part au chargement
  // du module, en arrière-plan : l'attendre AVANT de fixer le français, sinon
  // elle retombe après et remplace le repli — c'est ce qui rendait le test
  // « rend un vrai libellé » dépendant de la langue du poste (vert en
  // français, rouge sur un runner en `en-US`).
  await langueInitialePrete;
  await i18n.changeLanguage(FALLBACK_LANGUAGE);
});

afterAll(async () => {
  await i18n.changeLanguage(LANGUE_INITIALE);
});

// ── 1. La langue de repli, disponible immédiatement ─────────────────────────

describe('langue de repli', () => {
  it('expose ses namespaces sans le moindre chargement', () => {
    expect(NAMESPACES.length).toBeGreaterThan(5);
    expect(NAMESPACES).toContain('chantier');
    expect(NAMESPACES).toContain('common');
  });

  it('rend un vrai libellé, pas la clé', () => {
    const libelle = i18n.t('chantier:explorateur.titre');

    expect(libelle).toBe('Explorer');
    expect(libelle).not.toContain('explorateur.');
  });
});

// ── 2. Les langues secondaires arrivent réellement ──────────────────────────

describe('langues secondaires', () => {
  it.each(SUPPORTED_LANGUAGES.filter((l) => l !== FALLBACK_LANGUAGE))(
    'charge « %s » et sert ses propres libellés',
    async (langue) => {
      await applyLanguage(langue);

      expect(i18n.language).toBe(langue);
      // `explorateur.titre` est traduit différemment dans les quatre langues :
      // si le repli était servi en douce, on lirait « Explorer ».
      const attendu = { en: 'Explore', de: 'Erkunden', es: 'Explorar' }[langue];
      expect(i18n.t('chantier:explorateur.titre')).toBe(attendu);

      await applyLanguage(FALLBACK_LANGUAGE);
    },
  );

  it('charge TOUS les namespaces, pas seulement le premier', async () => {
    await applyLanguage('de');

    // Un fichier oublié au découpage laisserait cet écran en français au
    // milieu d'une interface allemande — sans erreur, sans rien signaler.
    const manquants = NAMESPACES.filter((ns) => !i18n.hasResourceBundle('de', ns));
    expect(manquants).toEqual([]);

    await applyLanguage(FALLBACK_LANGUAGE);
  });

  it('reste idempotent : recharger une langue déjà chargée ne casse rien', async () => {
    await chargerLangue('es');
    await chargerLangue('es');
    await applyLanguage('es');

    expect(i18n.t('chantier:explorateur.titre')).toBe('Explorar');

    await applyLanguage(FALLBACK_LANGUAGE);
  });
});

// ── 3. Ce qui ne doit rien casser ───────────────────────────────────────────

describe('entrées invalides', () => {
  it('ignore une langue non supportée sans changer l’interface', async () => {
    await applyLanguage('jp');

    expect(i18n.language).toBe(FALLBACK_LANGUAGE);
  });

  it('ignore une valeur vide', async () => {
    await applyLanguage('');
    await applyLanguage(null);

    expect(i18n.language).toBe(FALLBACK_LANGUAGE);
  });

  it('accepte une étiquette régionale (« de-AT » → « de »)', async () => {
    await applyLanguage('de-AT');

    expect(i18n.language).toBe('de');

    await applyLanguage(FALLBACK_LANGUAGE);
  });
});

// ── 4. L'attribut de langue du document ─────────────────────────────────────

describe('document', () => {
  it('<html lang> suit la langue active', async () => {
    await applyLanguage('en');
    expect(document.documentElement.getAttribute('lang')).toBe('en');

    await applyLanguage(FALLBACK_LANGUAGE);
    expect(document.documentElement.getAttribute('lang')).toBe(FALLBACK_LANGUAGE);
  });
});
