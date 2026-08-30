import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (cle) => cle }),
}));

import Modal from './Modal.jsx';

/**
 * Tests — accessibilité de la modale.
 *
 * `aria-modal` annonce à la synthèse vocale que le reste de la page est
 * inerte, mais ne rend RIEN inerte au clavier. Sans piège de focus, Tab
 * continuait de parcourir les champs situés DERRIÈRE la modale : un
 * utilisateur au clavier saisissait dans un formulaire masqué, sans repère
 * visuel, et ne revenait aux boutons qu'après avoir tabulé toute la page.
 *
 * Rien de tout cela ne se voit à la souris — d'où ces tests.
 */

afterEach(cleanup);

/** Page avec un bouton déclencheur, pour observer le retour du focus. */
function Page({ ouverte, onClose = () => {} }) {
  return (
    <>
      <button data-testid="declencheur">Ouvrir</button>
      <Modal open={ouverte} onClose={onClose} title="Modifier le membre">
        <input data-testid="premier" />
        <input data-testid="second" />
      </Modal>
    </>
  );
}

describe('nom accessible', () => {
  it('la boîte est reliée à son titre', () => {
    render(<Page ouverte />);
    const dialogue = screen.getByRole('dialog');

    const idTitre = dialogue.getAttribute('aria-labelledby');
    expect(idTitre).toBeTruthy();
    // Sans cela, la synthèse vocale annonce « boîte de dialogue » sans dire
    // laquelle.
    expect(document.getElementById(idTitre).textContent).toBe('Modifier le membre');
  });

  it('déclare aria-modal', () => {
    render(<Page ouverte />);
    expect(screen.getByRole('dialog')).toHaveProperty('ariaModal', 'true');
  });
});

describe('focus', () => {
  it('entre dans la modale à l’ouverture', () => {
    render(<Page ouverte />);
    // Le premier champ, pas la boîte : c'est là que l'utilisateur va.
    expect(document.activeElement).toBe(screen.getByTestId('premier'));
  });

  it('revient au déclencheur à la fermeture', () => {
    const { rerender } = render(<Page ouverte={false} />);
    const declencheur = screen.getByTestId('declencheur');
    declencheur.focus();

    rerender(<Page ouverte />);
    expect(document.activeElement).not.toBe(declencheur);

    rerender(<Page ouverte={false} />);
    // Sans restauration, le focus retombe sur <body> et la navigation clavier
    // repart du haut de la page.
    expect(document.activeElement).toBe(declencheur);
  });

  it('Tab depuis le dernier élément revient au premier', () => {
    render(<Page ouverte />);
    const dialogue = screen.getByRole('dialog');
    // Le bouton de fermeture ouvre le cycle : il précède le corps dans le DOM.
    const focusables = [...dialogue.querySelectorAll('button,input')];
    focusables[focusables.length - 1].focus();

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(focusables[0]);
  });

  it('Maj+Tab depuis le premier élément va au dernier', () => {
    render(<Page ouverte />);
    const dialogue = screen.getByRole('dialog');
    const focusables = [...dialogue.querySelectorAll('button,input')];

    focusables[0].focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
  });
});

describe('fermeture', () => {
  it('Échap ferme', () => {
    const onClose = vi.fn();
    render(<Page ouverte onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('Échap ne fait rien quand la modale est fermée', () => {
    // L'écouteur doit être retiré : sinon plusieurs modales fermées
    // répondraient toutes à une seule touche.
    const onClose = vi.fn();
    render(<Page ouverte={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('rend le défilement à la page', () => {
    const { rerender } = render(<Page ouverte />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Page ouverte={false} />);
    // Un `overflow: hidden` oublié fige la page entière après fermeture.
    expect(document.body.style.overflow).toBe('');
  });
});
