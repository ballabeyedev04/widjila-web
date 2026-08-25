import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';

import { useUser } from '../../context/useUser.js';
import { roleLabel } from '../../utils/constants.js';
import { initials } from '../../utils/format.js';

/** Salutation selon l'heure locale du poste. */
function cleSalutation() {
  const h = new Date().getHours();
  if (h < 12) return 'matin';
  if (h < 18) return 'apresMidi';
  return 'soir';
}

/**
 * Bandeau d'accueil du tableau de bord.
 *
 * Volontairement compact : il oriente (qui je suis, quel jour, ce qui
 * m'attend) mais ne doit pas repousser les KPI sous la ligne de flottaison.
 * C'est la raison pour laquelle le résumé d'activité tient sur une ligne au
 * lieu d'occuper des cartes dédiées.
 */
export default function EnteteBienvenue({ resume, onRecharger, chargement = false }) {
  const { t, i18n } = useTranslation('plateforme');
  const { user } = useUser();

  const dateDuJour = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());

  return (
    <header className="accueil">
      <div className="accueil-identite">
        <div className="accueil-avatar">{initials(user?.prenom, user?.nom)}</div>
        <div className="accueil-textes">
          <h1>
            {t(`dashboard.salutation.${cleSalutation()}`, { prenom: user?.prenom || '' })}
          </h1>
          <p className="accueil-meta">
            <span className="accueil-role">{roleLabel(user?.role)}</span>
            <span className="accueil-sep" aria-hidden="true">·</span>
            <span className="accueil-date">{dateDuJour}</span>
          </p>
          {resume && <p className="accueil-resume">{resume}</p>}
        </div>
      </div>

      <button
        className="btn btn-secondary accueil-refresh"
        onClick={onRecharger}
        disabled={chargement}
      >
        <RefreshCw size={15} className={chargement ? 'tourne' : undefined} />
        {t('actions.actualiser')}
      </button>
    </header>
  );
}
