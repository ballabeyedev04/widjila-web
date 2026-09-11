import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../i18n/index.js';

import { ApercuProtege, LienFichierProtege } from './FichierProtege.jsx';
import { fetchFichierBlob, telechargerFichierProtege } from '../service/plan/planService.js';

/**
 * Les fichiers privés — photos de réserves et d'inspections, pièces jointes.
 *
 * Ce que ces tests verrouillent :
 *
 *   1. L'APERÇU PASSE PAR `fetchFichierBlob`, donc avec la session et vers
 *      l'API. Les photos étaient rendues en `<img src="/uploads/…">` : sans
 *      jeton, sur le domaine de l'admin — elles ne s'affichaient jamais.
 *   2. UN ÉCHEC SE VOIT. L'ancien `onError` masquait l'image : personne ne
 *      savait qu'une réserve avait des photos.
 *   3. LE RENDU SUIT LE TYPE : une vidéo de réserve était mise dans une `<img>`.
 *   4. UNE PIÈCE JOINTE SE TÉLÉCHARGE, elle ne s'ouvre pas dans l'application
 *      — et par `telechargerFichierProtege`, qui accepte aussi un Word ou un
 *      DWG que l'aperçu refuse.
 */

vi.mock('../service/plan/planService.js', () => ({
  fetchFichierBlob: vi.fn(),
  telechargerFichierProtege: vi.fn(),
}));
vi.mock('../utils/swal.config.js', () => ({ default: { error: vi.fn() } }));

beforeAll(async () => {
  await i18n.changeLanguage('fr');
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:faux';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:faux');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('ApercuProtege', () => {
  it('charge le fichier avec la session, puis l’affiche', async () => {
    fetchFichierBlob.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));

    const { container } = render(<ApercuProtege url="/uploads/reserves/p.jpg" alt="Fissure" />);

    await waitFor(() => expect(container.querySelector('img')).toBeTruthy());
    expect(fetchFichierBlob).toHaveBeenCalledWith('/uploads/reserves/p.jpg');
    expect(container.querySelector('img').getAttribute('src')).toBe('blob:faux');
  });

  it('une VIDÉO est rendue comme une vidéo, pas dans une <img>', async () => {
    fetchFichierBlob.mockResolvedValue(new Blob(['x'], { type: 'video/mp4' }));

    const { container } = render(<ApercuProtege url="/uploads/reserves/v.mp4" />);

    await waitFor(() => expect(container.querySelector('video')).toBeTruthy());
    expect(container.querySelector('img')).toBeNull();
  });

  it('une note vocale est rendue comme un son', async () => {
    fetchFichierBlob.mockResolvedValue(new Blob(['x'], { type: 'audio/mpeg' }));

    const { container } = render(<ApercuProtege url="/uploads/reserves/n.mp3" />);

    await waitFor(() => expect(container.querySelector('audio')).toBeTruthy());
  });

  it('un échec est MONTRÉ, pas masqué', async () => {
    fetchFichierBlob.mockRejectedValue(new Error('403'));

    render(<ApercuProtege url="/uploads/reserves/p.jpg" />);

    expect(await screen.findByRole('img', { name: /Aperçu indisponible/i })).toBeTruthy();
  });

  it('libère l’URL d’objet au démontage', async () => {
    fetchFichierBlob.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));

    const { container, unmount } = render(<ApercuProtege url="/uploads/a.png" />);
    await waitFor(() => expect(container.querySelector('img')).toBeTruthy());
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:faux');
  });
});

describe('LienFichierProtege', () => {
  it('télécharge avec la session, sous le nom d’origine', async () => {
    telechargerFichierProtege.mockResolvedValue(undefined);

    render(<LienFichierProtege url="/uploads/pieces/pv.docx" nom="PV-reception.docx" />);
    fireEvent.click(screen.getByRole('button', { name: /PV-reception\.docx/ }));

    await waitFor(() => expect(telechargerFichierProtege).toHaveBeenCalledWith(
      '/uploads/pieces/pv.docx',
      'PV-reception.docx',
    ));
    // L'aperçu refuserait un Word : le téléchargement ne doit pas passer par lui.
    expect(fetchFichierBlob).not.toHaveBeenCalled();
  });

  it('n’est pas un lien nu vers /uploads', () => {
    const { container } = render(<LienFichierProtege url="/uploads/pieces/pv.pdf" nom="pv.pdf" />);

    // Un <a href="/uploads/…"> partait sans session, vers le domaine de l'admin.
    expect(container.querySelector('a[href]')).toBeNull();
  });
});
