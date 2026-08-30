import { describe, it, expect, vi } from 'vitest';

// `pdfjs-dist` est simulé : l'importer réellement tirerait le worker, que
// l'environnement de test ne sait pas démarrer. Seules les OPTIONS produites
// nous intéressent ici.
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {} }));

import { optionsDocument } from './pdfWorker.js';

/**
 * Tests — durcissement de pdf.js.
 *
 * L'application affiche des PDF TÉLÉVERSÉS par les utilisateurs. Un PDF peut
 * embarquer du JavaScript, que pdf.js exécute par défaut dans le contexte de
 * notre domaine (avis GHSA-hq66-cqwq-w95j, CVSS 8.6). Un plan piégé déposé par
 * n'importe quel membre s'exécuterait donc chez tous ceux qui l'ouvrent.
 *
 * Ces options sont la parade documentée. Le test existe parce qu'une option de
 * sécurité retirée par mégarde ne casse RIEN de visible : les plans
 * continueraient de s'afficher normalement, et la faille reviendrait sans que
 * personne ne s'en aperçoive.
 */
describe('optionsDocument', () => {
  const options = optionsDocument(new Uint8Array([1, 2, 3]));

  it('désactive l’exécution du JavaScript embarqué', () => {
    expect(options.enableScripting).toBe(false);
  });

  it('interdit le recours à eval pour les polices', () => {
    // Défense en profondeur : vecteur d'une faille antérieure (CVE-2024-4367).
    expect(options.isEvalSupported).toBe(false);
  });

  it('transmet les octets du document tels quels', () => {
    expect(options.data).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('fournit le chemin des polices standard', () => {
    // Sans lui, un PDF sans polices embarquées — cas courant des exports CAO —
    // est rendu avec des substituts et les cotes se décalent.
    expect(options.standardFontDataUrl).toContain('standard_fonts/');
  });
});
