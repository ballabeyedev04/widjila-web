import { describe, it, expect, vi, beforeEach } from 'vitest';

import SwalCustom from './swal.config.js';

/**
 * La boîte de confirmation — et les options qu'elle jetait.
 *
 * ## Le défaut d'origine
 *
 * `confirm()` ne déstructurait que cinq clés : `title`, `text`, `icon`,
 * `danger`, `confirmText`. Tout le reste disparaissait, sans erreur ni
 * avertissement — le plus insidieux des comportements, puisque l'appelant
 * croit avoir configuré quelque chose.
 *
 * Conséquence visible en production : l'avertissement de fin d'essai
 * (`Login.jsx`) passe `html`, `confirmButtonText` et `cancelButtonText`. Les
 * trois étaient jetés. Un utilisateur dont l'essai expirait dans deux jours
 * voyait une boîte au CORPS VIDE — le message qui explique l'échéance
 * n'arrivait jamais — avec « Confirmer » et « Annuler » à la place de « Voir
 * les plans » et « Plus tard ».
 *
 * Ces tests interrogent ce qui est réellement transmis à SweetAlert, et non
 * l'apparence : c'est le passage des options qui était cassé.
 */

vi.mock('../i18n/index.js', () => ({
  default: { t: (cle) => `[${cle}]` },
}));

/** Ce que `confirm()` a réellement demandé à SweetAlert. */
let dernieresOptions = null;

vi.mock('sweetalert2', () => ({
  default: {
    mixin: () => ({
      fire: vi.fn(async (options) => {
        dernieresOptions = options;
        return { isConfirmed: true };
      }),
    }),
  },
}));

beforeEach(() => { dernieresOptions = null; });

// ── Les options autrefois jetées ────────────────────────────────────────────

describe('options transmises', () => {
  it('transmet `html` — le corps du message n’est plus perdu', async () => {
    await SwalCustom.confirm({ title: 'Essai', html: '<b>Il reste 2 jours.</b>' });

    expect(dernieresOptions.html).toBe('<b>Il reste 2 jours.</b>');
  });

  it('transmet les libellés des deux boutons', async () => {
    await SwalCustom.confirm({
      confirmButtonText: 'Voir les plans',
      cancelButtonText: 'Plus tard',
    });

    expect(dernieresOptions.confirmButtonText).toBe('Voir les plans');
    expect(dernieresOptions.cancelButtonText).toBe('Plus tard');
  });

  it('reproduit exactement l’appel de l’avertissement de fin d’essai', async () => {
    // Le cas réel qui était cassé, tel que `Login.jsx` l'écrit.
    await SwalCustom.confirm({
      title: 'Votre essai se termine',
      html: 'Il vous reste <b>2 jours</b> — jusqu’au 12/09/2026.',
      icon: 'warning',
      confirmButtonText: 'Voir les plans',
      cancelButtonText: 'Plus tard',
    });

    // `titleText` et non `title` : le titre part en TEXTE (swal.securite.test.js).
    expect(dernieresOptions.titleText).toBe('Votre essai se termine');
    expect(dernieresOptions.html).toContain('2 jours');
    expect(dernieresOptions.confirmButtonText).toBe('Voir les plans');
    expect(dernieresOptions.cancelButtonText).toBe('Plus tard');
  });
});

// ── Ce qui marchait déjà et ne doit pas régresser ───────────────────────────

describe('comportement conservé', () => {
  it('`text` reste servi quand il n’y a pas de `html`', async () => {
    await SwalCustom.confirm({ text: 'Cette action est irréversible.' });

    expect(dernieresOptions.text).toBe('Cette action est irréversible.');
    expect(dernieresOptions.html).toBeUndefined();
  });

  it('`html` l’emporte sur `text` — un appelant qui met en forme le veut vraiment', async () => {
    await SwalCustom.confirm({ text: 'brut', html: '<b>mis en forme</b>' });

    expect(dernieresOptions.html).toBe('<b>mis en forme</b>');
    expect(dernieresOptions.text).toBeUndefined();
  });

  it('`confirmText` reste accepté — c’est la forme courte historique', async () => {
    await SwalCustom.confirm({ confirmText: 'Supprimer' });

    expect(dernieresOptions.confirmButtonText).toBe('Supprimer');
  });

  it('`danger` colore le bouton de confirmation', async () => {
    await SwalCustom.confirm({ danger: true });

    expect(dernieresOptions.customClass.confirmButton).toBe('swal-confirm-danger');
  });

  it('affiche toujours le bouton d’annulation — sans lui ce n’est pas une confirmation', async () => {
    await SwalCustom.confirm({});

    expect(dernieresOptions.showCancelButton).toBe(true);
  });

  it('retombe sur les libellés traduits quand rien n’est fourni', async () => {
    await SwalCustom.confirm();

    expect(dernieresOptions.titleText).toBe('[common:messages.confirmationTitre]');
    expect(dernieresOptions.title).toBeUndefined();
    expect(dernieresOptions.confirmButtonText).toBe('[common:actions.confirmer]');
    expect(dernieresOptions.cancelButtonText).toBe('[common:actions.annuler]');
  });

  it('rend un booléen, jamais l’objet de SweetAlert', async () => {
    const resultat = await SwalCustom.confirm({ title: 'x' });

    expect(resultat).toBe(true);
  });
});
