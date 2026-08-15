import { useTranslation } from 'react-i18next';
import { ROLES, STATUTS_CHANTIER, STATUTS_RESERVE, STATUTS_UTILISATEUR, STATUTS_INSPECTION, STATUTS_CONVOCATION, enumLabel } from '../utils/constants.js';

const TONE_MAP = {
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  info: 'badge-info',
  primary: 'badge-primary',
  neutral: 'badge-neutral',
};

const DICT = {
  ...STATUTS_CHANTIER,
  ...STATUTS_RESERVE,
  ...STATUTS_UTILISATEUR,
  ...STATUTS_INSPECTION,
  ...STATUTS_CONVOCATION,
  ...ROLES,
};

/**
 * Badge coloré pour statuts / rôles / libellés arbitraires.
 * - `statusKey` : résolu via les dictionnaires métier (statut chantier, réserve…).
 * - `role` : badge de rôle utilisateur.
 * - sinon `tone` + `children` pour un libellé libre.
 *
 * `useTranslation` n'est pas utilisé pour ses valeurs mais pour abonner le
 * composant aux changements de langue : sans lui, les badges garderaient le
 * libellé rendu avant la bascule.
 */
export default function Badge({ tone, statusKey, role, children }) {
  useTranslation('enums');

  let cls = TONE_MAP[tone] || 'badge-neutral';
  let label = children;

  if (statusKey) {
    const def = DICT[statusKey] || { label: statusKey, tone: 'neutral' };
    cls = TONE_MAP[def.tone] || 'badge-neutral';
    label = enumLabel(statusKey, def.label);
  } else if (role) {
    const def = ROLES[role] || { label: role, tone: 'neutral' };
    cls = TONE_MAP[def.tone] || 'badge-neutral';
    label = enumLabel(role, def.label);
  }

  return <span className={`badge ${cls}`}>{label}</span>;
}
