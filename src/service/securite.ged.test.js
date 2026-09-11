import { describe, it, expect } from 'vitest';

import { motifRefusFichierGed, TAILLE_MAX_DOCUMENT, TAILLE_MAX_MEDIA } from './securite.js';
import { nomDeDepot } from './document/documentService.js';

/**
 * Formulaire de la GED (onglet Documents d'un chantier).
 *
 * Il s'en tenait aux PDF et aux images alors que le serveur accepte aussi
 * Word, Excel, PowerPoint, DWG et les vidéos : l'interface refusait ce que
 * l'API savait recevoir.
 */

const fichier = (name, type, size = 1024) => ({ name, type, size });

describe('motifRefusFichierGed', () => {
  it('accepte les formats bureautiques et DAO', () => {
    expect(motifRefusFichierGed(fichier('CR.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBeNull();
    expect(motifRefusFichierGed(fichier('metre.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))).toBeNull();
    expect(motifRefusFichierGed(fichier('ancien.doc', 'application/msword'))).toBeNull();
  });

  it('un DWG sans type annoncé passe par son extension', () => {
    expect(motifRefusFichierGed(fichier('plan-rdc.dwg', ''))).toBeNull();
    expect(motifRefusFichierGed(fichier('plan-rdc.dwg', 'application/octet-stream'))).toBeNull();
  });

  it('refuse un format que le serveur refuserait', () => {
    expect(motifRefusFichierGed(fichier('setup.exe', 'application/x-msdownload'))?.motif).toBe('type');
    expect(motifRefusFichierGed(fichier('archive.zip', ''))?.motif).toBe('type');
  });

  it('plafond propre au format : 100 Mo pour une vidéo, 5 Mo sinon', () => {
    expect(motifRefusFichierGed(fichier('visite.mp4', 'video/mp4', 50 * 1024 * 1024))).toBeNull();
    expect(motifRefusFichierGed(fichier('visite.mp4', 'video/mp4', TAILLE_MAX_MEDIA + 1))?.motif).toBe('taille');
    expect(motifRefusFichierGed(fichier('DOE.pdf', 'application/pdf', TAILLE_MAX_DOCUMENT + 1))?.motif).toBe('taille');
  });
});

describe('nomDeDepot', () => {
  const choisi = { name: 'scan_0042.pdf' };

  it('le nom saisi devient le nom du fichier, extension d’origine comprise', () => {
    expect(nomDeDepot(choisi, 'PV de réception')).toBe('PV de réception.pdf');
  });

  it('ne double pas une extension déjà saisie', () => {
    expect(nomDeDepot(choisi, 'PV.pdf')).toBe('PV.pdf');
  });

  it('sans saisie, le nom d’origine est gardé', () => {
    expect(nomDeDepot(choisi, '  ')).toBe('scan_0042.pdf');
  });
});
