import { describe, it, expect } from 'vitest';

import {
  estRequeteVersApi, cheminSuspect, masquerSecrets, nettoyerErreur,
  versBlobAffichable, ErreurTypeFichier, motifRefusFichier, echapperHtml,
  TYPES_DOCUMENT, TAILLE_MAX_DOCUMENT,
} from './securite.js';

/**
 * Les garde-fous de sécurité du client.
 *
 * Chaque bloc correspond à une attaque précise. Les cas « doit passer » sont
 * aussi importants que les cas « doit refuser » : un garde-fou trop large qui
 * bloque l'usage normal finit toujours désactivé.
 */

const ORIGINE = 'https://app.widjila.com';

// ── 1. Le jeton ne part que vers l'API ──────────────────────────────────────

describe('estRequeteVersApi', () => {
  it('une URL relative part vers l’API : jeton joint', () => {
    expect(estRequeteVersApi('/chantiers', '/api/v1', ORIGINE)).toBe(true);
    expect(estRequeteVersApi('/uploads/plans/a.pdf', 'https://api.widjila.com/api/v1', ORIGINE)).toBe(true);
  });

  it('une URL absolue vers l’API elle-même : jeton joint', () => {
    expect(estRequeteVersApi('https://api.widjila.com/api/v1/x', 'https://api.widjila.com/api/v1', ORIGINE)).toBe(true);
  });

  it('une URL absolue vers un AUTRE domaine : jamais de jeton', () => {
    // Le cas d'une URL de stockage signée ou d'un CDN.
    expect(estRequeteVersApi('https://bucket.r2.cloudflarestorage.com/f.pdf', 'https://api.widjila.com/api/v1', ORIGINE)).toBe(false);
    expect(estRequeteVersApi('https://evil.example/vol', '/api/v1', ORIGINE)).toBe(false);
  });

  it('une URL « //hôte » (sans schéma) est absolue — pas de jeton vers un tiers', () => {
    expect(estRequeteVersApi('//evil.example/vol', '/api/v1', ORIGINE)).toBe(false);
  });

  it('même hôte mais autre port ou autre schéma : autre origine, pas de jeton', () => {
    expect(estRequeteVersApi('http://api.widjila.com/x', 'https://api.widjila.com/api/v1', ORIGINE)).toBe(false);
    expect(estRequeteVersApi('https://api.widjila.com:8443/x', 'https://api.widjila.com/api/v1', ORIGINE)).toBe(false);
  });

  it('un sous-domaine voisin n’est PAS l’API', () => {
    expect(estRequeteVersApi('https://api.widjila.com.evil.example/x', 'https://api.widjila.com/api/v1', ORIGINE)).toBe(false);
  });
});

// ── 2. Traversée de chemin ──────────────────────────────────────────────────

describe('cheminSuspect', () => {
  it.each([
    '/chantiers/../organisation/membres/1',
    '/chantiers/..',
    '../organisation',
    '/chantiers/./x',
    '/chantiers/%2e%2e/organisation',
    '/chantiers/..%2Forganisation%2Fmembres',
    '/chantiers/%252e%252e%252forganisation',   // double encodage
    '/chantiers/..\\organisation',                // barre inverse
  ])('refuse %s', (url) => {
    expect(cheminSuspect(url)).toBe(true);
  });

  it.each([
    '/chantiers',
    '/chantiers/3f1c2e9a-8b7d-4c6e-9f10-1a2b3c4d5e6f',
    '/uploads/plans/plan-de-masse.v2.pdf',   // des points DANS un nom, pas un segment
    '/plans/abc/sous-plans',
    '/reserves?search=../',                    // la chaîne de requête est libre
    '/reserves#..',
    'https://api.widjila.com/api/v1/chantiers',
  ])('laisse passer %s', (url) => {
    expect(cheminSuspect(url)).toBe(false);
  });

  it('une URL vide n’est pas suspecte', () => {
    expect(cheminSuspect('')).toBe(false);
    expect(cheminSuspect(undefined)).toBe(false);
  });
});

// ── 3. Aucune session dans les journaux ─────────────────────────────────────

describe('masquerSecrets', () => {
  it('masque les champs nommés comme des secrets, à toute profondeur', () => {
    const sortie = masquerSecrets({
      config: { headers: { Authorization: 'Bearer abc', Accept: 'application/json' } },
      corps: { mot_de_passe: 'Secret123!', email: 'a@b.c' },
      refreshToken: 'r', clientSecret: 'pi_1_secret_2',
    });

    expect(sortie.config.headers.Authorization).toBe('[masqué]');
    expect(sortie.config.headers.Accept).toBe('application/json');
    expect(sortie.corps.mot_de_passe).toBe('[masqué]');
    expect(sortie.corps.email).toBe('a@b.c');
    expect(sortie.refreshToken).toBe('[masqué]');
    expect(sortie.clientSecret).toBe('[masqué]');
  });

  it('masque un jeton qui traîne DANS une chaîne', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.c2lnbmF0dXJlLWZhdXNzZQ';
    const texte = masquerSecrets(`échec avec Bearer ${jwt} et ${jwt}`);

    expect(texte).not.toContain('eyJhbGci');
    expect(texte).toContain('Bearer [masqué]');
  });

  it('masque le secret client d’une intention de paiement', () => {
    expect(masquerSecrets('clé pi_3Nabc_secret_XYZ123')).not.toContain('secret_XYZ');
  });

  it('ne boucle pas sur une structure cyclique', () => {
    const a = { nom: 'a' };
    a.soi = a;
    expect(() => masquerSecrets(a)).not.toThrow();
  });

  it('ne modifie pas la valeur d’origine', () => {
    const origine = { headers: { Authorization: 'Bearer abc' } };
    masquerSecrets(origine);
    expect(origine.headers.Authorization).toBe('Bearer abc');
  });
});

describe('nettoyerErreur', () => {
  it('ne garde d’une erreur de requête que méthode, chemin, statut et message', () => {
    const erreur = Object.assign(new Error('Request failed with status code 500'), {
      isAxiosError: true,
      code: 'ERR_BAD_RESPONSE',
      config: {
        method: 'post',
        url: '/reserves?token=abc',
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl' },
        data: '{"mot_de_passe":"Secret123!"}',
      },
      response: { status: 500, data: { detail: 'interne' } },
    });

    const propre = nettoyerErreur(erreur);
    const serialise = JSON.stringify({ ...propre, message: propre.message });

    expect(propre.methode).toBe('POST');
    expect(propre.chemin).toBe('/reserves');   // la chaîne de requête est retirée
    expect(propre.statut).toBe(500);
    expect(propre.config).toBeUndefined();
    expect(serialise).not.toContain('Bearer');
    expect(serialise).not.toContain('Secret123');
  });

  it('rend une erreur ordinaire telle quelle (masquée)', () => {
    const propre = nettoyerErreur(new TypeError('x est indéfini'));
    expect(propre.message).toBe('x est indéfini');
    expect(propre.name).toBe('TypeError');
  });
});

// ── 4. Afficher un fichier sans lui confier notre origine ───────────────────

describe('versBlobAffichable', () => {
  it('accepte un PDF et une image déclarés', async () => {
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    expect(await versBlobAffichable(pdf)).toBe(pdf);
    const png = new Blob(['x'], { type: 'image/png' });
    expect(await versBlobAffichable(png)).toBe(png);
  });

  it.each(['text/html', 'image/svg+xml', 'application/xhtml+xml', 'text/javascript', 'application/xml'])(
    'refuse %s — il s’exécuterait dans l’origine de l’application',
    async (type) => {
      await expect(versBlobAffichable(new Blob(['<script>alert(1)</script>'], { type })))
        .rejects.toBeInstanceOf(ErreurTypeFichier);
    },
  );

  it('retrouve le type d’un fichier sans type déclaré par ses octets', async () => {
    const sansType = new Blob(['%PDF-1.4 contenu'], { type: 'application/octet-stream' });
    const sur = await versBlobAffichable(sansType);
    expect(sur.type).toBe('application/pdf');
  });

  it('refuse un fichier sans type dont les octets ne sont pas reconnus', async () => {
    await expect(versBlobAffichable(new Blob(['<html>'], { type: '' })))
      .rejects.toBeInstanceOf(ErreurTypeFichier);
  });

  it('l’erreur porte un code exploitable par l’interface', async () => {
    const err = await versBlobAffichable(new Blob(['x'], { type: 'text/html' })).catch((e) => e);
    expect(err.code).toBe('TYPE_NON_AFFICHABLE');
  });
});

// ── 5. Contrôle avant envoi ─────────────────────────────────────────────────

describe('motifRefusFichier', () => {
  const regles = { types: TYPES_DOCUMENT, tailleMax: TAILLE_MAX_DOCUMENT };

  it('accepte un PDF de taille raisonnable', () => {
    expect(motifRefusFichier({ type: 'application/pdf', size: 1024 }, regles)).toBeNull();
  });

  it('refuse un type hors liste blanche', () => {
    expect(motifRefusFichier({ type: 'text/html', size: 10 }, regles)?.motif).toBe('type');
  });

  it('refuse un fichier trop lourd, et annonce la limite en Mo', () => {
    const refus = motifRefusFichier({ type: 'application/pdf', size: TAILLE_MAX_DOCUMENT + 1 }, regles);
    expect(refus).toEqual({ motif: 'taille', tailleMaxMo: 5 });
  });

  it('laisse au serveur un fichier sans type déclaré — il lit les octets', () => {
    expect(motifRefusFichier({ type: '', size: 10 }, regles)).toBeNull();
  });

  it('aucun fichier : rien à refuser', () => {
    expect(motifRefusFichier(null, regles)).toBeNull();
  });
});

// ── 6. Échappement ──────────────────────────────────────────────────────────

describe('echapperHtml', () => {
  it('neutralise les caractères actifs', () => {
    expect(echapperHtml('<img src=x onerror="alert(1)">'))
      .toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(echapperHtml("l'équipe & co")).toBe('l&#39;équipe &amp; co');
  });

  it('accepte nombres et valeurs absentes', () => {
    expect(echapperHtml(3)).toBe('3');
    expect(echapperHtml(null)).toBe('');
  });
});
