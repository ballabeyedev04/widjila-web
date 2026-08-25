import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Field } from './FormControls.jsx';

/**
 * Select avec recherche intégrée AU PANNEAU (pas au formulaire).
 *
 * Un `<select>` natif oblige à parcourir toute la liste : au-delà d'une
 * poignée d'entrées — le portefeuille d'organisations de la plateforme, par
 * exemple — retrouver une ligne devient laborieux. Ici le champ de recherche
 * vit DANS le panneau déroulant : il n'encombre pas le formulaire, n'existe
 * que pendant la sélection, et se vide à chaque fermeture.
 *
 * Contrat identique à `Select` (label / error / hint / required / value /
 * onChange recevant `{ target: { value } }`) pour rester interchangeable avec
 * lui sans toucher aux appelants.
 *
 * @param {{id: string, label: string}[]} options
 */
export default function SelectRecherche({
  label, error, hint, required,
  value, onChange,
  options = [],
  placeholder,
  disabled = false,
}) {
  const { t } = useTranslation('layout');
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState('');
  const conteneurRef = useRef(null);
  const champRechercheRef = useRef(null);

  const selection = options.find((o) => String(o.id) === String(value));

  const visibles = useMemo(() => {
    const motif = recherche.trim().toLowerCase();
    if (!motif) return options;
    return options.filter((o) => o.label.toLowerCase().includes(motif));
  }, [options, recherche]);

  // Fermeture au clic extérieur : `mousedown` et non `click`, sinon le clic
  // qui ouvre le panneau le referme aussitôt (l'événement remonte après).
  useEffect(() => {
    if (!ouvert) return undefined;
    const auClic = (e) => {
      if (!conteneurRef.current?.contains(e.target)) setOuvert(false);
    };
    document.addEventListener('mousedown', auClic);
    return () => document.removeEventListener('mousedown', auClic);
  }, [ouvert]);

  // Le curseur arrive directement dans la recherche : c'est tout l'intérêt.
  useEffect(() => {
    if (ouvert) champRechercheRef.current?.focus();
    else setRecherche('');
  }, [ouvert]);

  const choisir = (id) => {
    onChange?.({ target: { value: id } });
    setOuvert(false);
  };

  const auClavier = (e) => {
    if (e.key === 'Escape') { setOuvert(false); return; }
    // Entrée valide l'unique résultat restant — la frappe suffit alors à
    // sélectionner, sans quitter le clavier pour la souris.
    if (e.key === 'Enter') {
      e.preventDefault();
      if (visibles.length === 1) choisir(visibles[0].id);
    }
  };

  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <div className="select-recherche" ref={conteneurRef}>
        <button
          type="button"
          className={`select-recherche-declencheur ${error ? 'invalid' : ''}`}
          onClick={() => setOuvert((o) => !o)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={ouvert}
        >
          <span className={selection ? '' : 'text-muted'}>
            {selection ? selection.label : (placeholder ?? t('formulaire.selectionner'))}
          </span>
          <ChevronDown size={16} />
        </button>

        {ouvert && (
          <div className="select-recherche-panneau">
            <div className="select-recherche-champ">
              <Search size={14} />
              <input
                ref={champRechercheRef}
                className="input"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onKeyDown={auClavier}
                placeholder={t('formulaire.rechercher')}
              />
            </div>

            <ul className="select-recherche-liste" role="listbox">
              {visibles.length === 0 ? (
                <li className="select-recherche-vide">{t('formulaire.aucunResultat')}</li>
              ) : visibles.map((o) => {
                const actif = String(o.id) === String(value);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={`select-recherche-option ${actif ? 'actif' : ''}`}
                      onClick={() => choisir(o.id)}
                      role="option"
                      aria-selected={actif}
                    >
                      <span>{o.label}</span>
                      {actif && <Check size={14} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Field>
  );
}
