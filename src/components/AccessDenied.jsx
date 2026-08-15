import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AccessDenied({ message }) {
  const { t } = useTranslation('layout');
  return (
    <div className="access-denied">
      <ShieldAlert size={56} className="icon" />
      <h2>{t('messages.accesRefuse')}</h2>
      <p className="text-secondary">{message ?? t('accesRefuse.ressource')}</p>
    </div>
  );
}
