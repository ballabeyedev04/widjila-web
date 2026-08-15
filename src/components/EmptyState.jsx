import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function EmptyState({ title, message }) {
  const { t } = useTranslation('layout');
  return (
    <div className="empty-state">
      <Inbox size={52} className="icon" />
      <h3>{title ?? t('etats.aucuneDonnee')}</h3>
      <p style={{ maxWidth: 420 }}>{message ?? t('vide.message')}</p>
    </div>
  );
}
