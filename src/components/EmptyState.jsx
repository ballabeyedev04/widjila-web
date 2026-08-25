import { Inbox, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Écran vide.
 *
 * Rétrocompatible : `<EmptyState title message />` se comporte comme avant.
 *
 * La nouveauté qui compte est [recherche] : « aucune donnée » et « aucun
 * résultat pour ce filtre » sont deux situations opposées. La première appelle
 * une création, la seconde un élargissement de la recherche. Les confondre
 * envoie l'utilisateur créer un doublon de ce qu'il cherchait.
 */
export default function EmptyState({
  title,
  message,
  icon: IconePersonnalisee,
  recherche = false,
  action,
}) {
  const { t } = useTranslation('layout');

  const Icone = IconePersonnalisee ?? (recherche ? SearchX : Inbox);

  return (
    <div className="empty-state">
      <span className="empty-state-illus">
        <Icone size={30} />
      </span>

      <h3>{title ?? t(recherche ? 'etats.aucunResultat' : 'etats.aucuneDonnee')}</h3>
      <p style={{ maxWidth: 420 }}>{message ?? t('vide.message')}</p>

      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
