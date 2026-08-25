import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import SelectRecherche from './SelectRecherche.jsx';

// `globals: false` dans vitest.config.js → le nettoyage automatique de
// @testing-library/react ne s'installe pas. Sans ce démontage explicite, les
// rendus s'empilent dans le même document et les requêtes `getByRole`
// trouvent plusieurs déclencheurs.
afterEach(cleanup);

/**
 * Le panneau n'existe pas tant qu'il n'est pas ouvert : c'est ce qui distingue
 * ce composant d'un champ de recherche posé dans le formulaire.
 */
const options = [
  { id: '1', label: 'Bâtiment Diallo' },
  { id: '2', label: 'Construction Ndiaye' },
  { id: '3', label: 'Travaux Publics Sarr' },
];

const ouvrir = () => fireEvent.click(screen.getByRole('button', { name: /Sélectionner|Choisir/i }));

describe('SelectRecherche', () => {
  it('affiche le placeholder tant que rien n’est sélectionné', () => {
    render(<SelectRecherche options={options} placeholder="Choisir" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Choisir' })).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('ouvre le panneau et liste toutes les options', () => {
    render(<SelectRecherche options={options} placeholder="Choisir" onChange={() => {}} />);
    ouvrir();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('filtre la liste sur la saisie, sans tenir compte de la casse', () => {
    render(<SelectRecherche options={options} placeholder="Choisir" onChange={() => {}} />);
    ouvrir();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ndia' } });
    const restantes = screen.getAllByRole('option');
    expect(restantes).toHaveLength(1);
    expect(restantes[0].textContent).toContain('Construction Ndiaye');
  });

  it('remonte la valeur choisie au format attendu par les formulaires', () => {
    const onChange = vi.fn();
    render(<SelectRecherche options={options} placeholder="Choisir" onChange={onChange} />);
    ouvrir();
    fireEvent.click(screen.getByRole('option', { name: /Travaux Publics Sarr/ }));
    expect(onChange).toHaveBeenCalledWith({ target: { value: '3' } });
    // Le panneau se referme après la sélection.
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('valide à la touche Entrée quand un seul résultat subsiste', () => {
    const onChange = vi.fn();
    render(<SelectRecherche options={options} placeholder="Choisir" onChange={onChange} />);
    ouvrir();
    const champ = screen.getByRole('textbox');
    fireEvent.change(champ, { target: { value: 'diallo' } });
    fireEvent.keyDown(champ, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ target: { value: '1' } });
  });

  it('affiche l’état vide quand la recherche ne donne rien', () => {
    render(<SelectRecherche options={options} placeholder="Choisir" onChange={() => {}} />);
    ouvrir();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('affiche le libellé de la valeur sélectionnée', () => {
    render(<SelectRecherche options={options} value="2" placeholder="Choisir" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Construction Ndiaye/ })).toBeTruthy();
  });
});
