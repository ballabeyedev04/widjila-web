import { useTranslation } from 'react-i18next';

export default function Spinner({ label }) {
  const { t } = useTranslation('layout');
  return (
    <div className="spinner-wrap">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p className="text-muted mt-2" style={{ fontSize: 13 }}>{label ?? t('etats.chargement')}</p>
      </div>
    </div>
  );
}
