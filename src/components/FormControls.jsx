import i18n from '../i18n/index.js';

/**
 * Composants de formulaire réutilisables (champ + libellé + erreur + hint).
 * Tous suivent le même contrat : `label`, `error`, `hint`, + props natives.
 *
 * Les libellés sont fournis par l'appelant (déjà traduits) ; seule l'option
 * vide par défaut porte une chaîne, résolue via l'instance i18next car
 * `emptyOption` est une fonction utilitaire, pas un composant React.
 */

export function Field({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="error">{error}</div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}

export function Input({ label, error, hint, required, className = '', ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <input className={`input ${error ? 'invalid' : ''} ${className}`} {...props} />
    </Field>
  );
}

export function Select({ label, error, hint, required, children, className = '', ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <select className={`select ${error ? 'invalid' : ''} ${className}`} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, required, className = '', ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <textarea className={`textarea ${error ? 'invalid' : ''} ${className}`} {...props} />
    </Field>
  );
}

export function Checkbox({ label, error, ...props }) {
  return (
    <Field error={error}>
      <label className="checkbox-row">
        <input type="checkbox" {...props} />
        <span>{label}</span>
      </label>
    </Field>
  );
}

/* Select avec option vide par défaut (placeholder) */
export const emptyOption = (label) => (
  <option value="">{label ?? i18n.t('layout:formulaire.selectionner')}</option>
);
