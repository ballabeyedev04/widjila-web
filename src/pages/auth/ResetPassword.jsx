import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

import { reinitialiserMotDePasse } from '../../service/account/accountService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { validatePassword } from '../../service/auth/authService.js';
import '../../assets/css/auth.css';
import SwalCustom from '../../utils/swal.config.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return SwalCustom.error(t('validation.emailInvalide'));
    if (!/^[A-Z0-9]{6}$/.test(otp)) return SwalCustom.error(t('resetPassword.codeInvalide'));
    if (!validatePassword(nouveauMotDePasse)) {
      return SwalCustom.error(t('validation.motDePasseFaible'));
    }
    if (nouveauMotDePasse !== confirm) return SwalCustom.error(t('validation.motsDePasseDifferents'));

    setLoading(true);
    try {
      await reinitialiserMotDePasse({ email, otp, nouveau_mot_de_passe: nouveauMotDePasse });
      SwalCustom.success(t('resetPassword.succes'));
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      SwalCustom.error({ title: t('resetPassword.erreurTitre'), text: getErrorMessage(err) });
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
            <div className="logo-icon"><KeyRound size={20} /></div>
            <div>
              <div className="auth-title">{t('resetPassword.enteteTitre')}</div>
              <div className="auth-subtitle">{t('resetPassword.enteteSousTitre')}</div>
            </div>
          </div>

          <h1 className="auth-title-lg">{t('resetPassword.titre')}</h1>
          <p className="auth-subtitle">{t('resetPassword.intro')}</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label>{t('resetPassword.emailLabel')}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="field">
              <label>{t('resetPassword.codeLabel')}</label>
              {/* Le code envoyé par le serveur est ALPHANUMÉRIQUE en majuscules
                  (alphabet ABCDEFGHJKLMNPQRSTUVWXYZ23456789, sans O/0/I/1).
                  Filtrer sur les chiffres rendait la réinitialisation impossible. */}
              <input
                className="input"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                placeholder="A1B2C3"
                style={{ letterSpacing: 6, fontWeight: 700 }}
              />
            </div>
            <div className="field">
              <label>{t('resetPassword.nouveauMotDePasse')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={nouveauMotDePasse}
                  onChange={(e) => setNouveauMotDePasse(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: 'absolute', right: 10, top: 9, background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4 }}
                  aria-label={t('commun.afficherMasquer')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="hint">{t('resetPassword.indiceMotDePasse')}</div>
            </div>
            <div className="field">
              <label>{t('resetPassword.confirmerMotDePasse')}</label>
              <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>

            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
              {loading ? t('resetPassword.enCours') : t('resetPassword.soumettre')}
            </button>
          </form>

          <div className="auth-footer">
            <Link className="auth-link" to="/login">{t('resetPassword.retourConnexion')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
