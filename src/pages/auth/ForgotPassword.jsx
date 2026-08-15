import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, Send } from 'lucide-react';

import { oublierMotDePasse } from '../../service/account/accountService.js';
import { getErrorMessage } from '../../service/helpers.js';
import '../../assets/css/auth.css';
import SwalCustom from '../../utils/swal.config.js';

export default function ForgotPassword() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      SwalCustom.error(t('validation.emailInvalide'));
      return;
    }
    setLoading(true);
    try {
      await oublierMotDePasse({ email });
      setSent(true); // Message générique (anti-énumération de comptes)
    } catch (err) {
      SwalCustom.error({ title: t('forgotPassword.erreurTitre'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-accent-bar" />
        <div className="auth-body">
          <div className="auth-logo">
            <div className="logo-icon"><Mail size={20} /></div>
            <div>
              <div className="auth-title">{t('forgotPassword.enteteTitre')}</div>
              <div className="auth-subtitle">{t('forgotPassword.enteteSousTitre')}</div>
            </div>
          </div>

          {!sent ? (
            <>
              <h1 className="auth-title-lg">{t('forgotPassword.titre')}</h1>
              <p className="auth-subtitle">{t('forgotPassword.intro')}</p>
              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label>{t('forgotPassword.emailLabel')}</label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    autoComplete="email"
                  />
                </div>
                <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
                  {loading ? t('etats.envoi') : t('forgotPassword.envoyer')}
                  {!loading && <Send size={17} />}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="auth-title-lg">{t('forgotPassword.envoyeTitre')}</h1>
              <p className="auth-subtitle">
                {t('forgotPassword.envoyeAvant')}<strong>{email}</strong>{t('forgotPassword.envoyeApres')}
              </p>
              <Link to="/reset-password" className="btn btn-primary w-full btn-lg">
                {t('forgotPassword.allerReinitialisation')}
              </Link>
            </>
          )}

          <div className="auth-footer">
            <Link className="auth-link" to="/login"><ArrowLeft size={14} style={{ verticalAlign: -2 }} /> {t('forgotPassword.retourConnexion')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
