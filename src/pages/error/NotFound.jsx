import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation('plateforme');

  return (
    <div className="not-found">
      <div className="not-found-code">404</div>
      <h1>{t('messages.pageIntrouvable')}</h1>
      <p className="text-muted">{t('notFound.message')}</p>
      <Link className="btn btn-primary" to="/dashboard">{t('notFound.retour')}</Link>
    </div>
  );
}
