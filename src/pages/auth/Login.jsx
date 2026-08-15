import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, Mail, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

import { login, verifierMfa, validateLoginForm } from '../../service/auth/authService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import { homeForRole } from '../../utils/constants.js';
import { getStatus } from '../../service/subscription/subscriptionService.js';
import '../../assets/css/auth.css';
import SwalCustom from '../../utils/swal.config.js';

const CODE_LENGTH = 6;

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { setUser } = useUser();

  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [mfaStep, setMfaStep] = useState(false);
  const [mfaUtilisateur, setMfaUtilisateur] = useState(null);
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
  const [mfaLoading, setMfaLoading] = useState(false);
  const inputsRef = useRef([]);

  /**
   * Vérifie le statut d'abonnement et affiche une alerte si l'essai expire bientôt.
   * Ne bloque pas la navigation — l'utilisateur peut continuer et aller sur /abonnement.
   */
  const checkTrialAndWarn = async (utilisateur) => {
    try {
      const statusRes = await getStatus();
      if (!statusRes) return;
      const { isSubscribed, trialEnded, joursRestantsTrial, trialEndsAt, planActuel } = statusRes;
      if (isSubscribed || trialEnded) return; // abonnement actif ou déjà expiré (géré ailleurs)
      if (joursRestantsTrial !== undefined && joursRestantsTrial <= 2 && joursRestantsTrial > 0) {
        const dateFin = trialEndsAt
          ? new Date(trialEndsAt).toLocaleDateString('fr-FR')
          : t('login.essai.bientot');
        const result = await SwalCustom.confirm({
          title: t('login.essai.titre'),
          html: t('login.essai.html', {
            jours: joursRestantsTrial,
            unite: joursRestantsTrial > 1 ? t('login.essai.jours') : t('login.essai.jour'),
            date: dateFin,
          }),
          icon: 'warning',
          confirmButtonText: t('login.essai.voirPlans'),
          cancelButtonText: t('login.essai.plusTard'),
          showCancelButton: true,
          reverseButtons: true,
        });
        if (result) {
          navigate('/abonnement', { replace: true });
          return;
        }
      }
    } catch {
      // Silencieux : ne pas bloquer la connexion si l'appel échoue
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateLoginForm(identifiant, motDePasse);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const result = await login({ identifiant, mot_de_passe: motDePasse });
      if (result.mfaRequise) {
        setMfaStep(true);
        setMfaUtilisateur(result.utilisateur);
        SwalCustom.info(t('login.mfa.info'));
      } else {
        setUser(result.utilisateur);
        SwalCustom.success(t('login.succes'));
        await checkTrialAndWarn(result.utilisateur);
        navigate(homeForRole(result.utilisateur?.role), { replace: true });
      }
    } catch (err) {
      SwalCustom.error({ title: t('login.erreurTitre'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...mfaCode];
    next[index] = digit;
    setMfaCode(next);
    if (digit && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !mfaCode[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    const code = mfaCode.join('');
    if (code.length !== CODE_LENGTH) {
      SwalCustom.error(t('login.mfa.codeIncomplet'));
      return;
    }
    setMfaLoading(true);
    try {
      const result = await verifierMfa({ code });
      setUser(result.utilisateur);
      SwalCustom.success(t('login.succes'));
      await checkTrialAndWarn(result.utilisateur);
      navigate(homeForRole(result.utilisateur?.role), { replace: true });
    } catch (err) {
      SwalCustom.error({ title: t('login.mfa.codeInvalideTitre'), text: getErrorMessage(err) });
      setMfaCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-accent-bar" />
        <div className="auth-body">
          <div className="auth-logo">
            <div className="logo-icon"><ShieldCheck size={22} /></div>
            <div>
              <div className="auth-title">Suivie Chantier</div>
              <div className="auth-subtitle">{t('login.espaceAdmin')}</div>
            </div>
          </div>

          {!mfaStep ? (
            <>
              <h1 className="auth-title-lg">{t('login.titre')}</h1>
              <p className="auth-subtitle">{t('login.sousTitre')}</p>

              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label>{t('login.identifiantLabel')}</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                    <input
                      className={`input ${errors.identifiant ? 'invalid' : ''}`}
                      style={{ paddingLeft: 38 }}
                      value={identifiant}
                      onChange={(e) => setIdentifiant(e.target.value)}
                      placeholder={t('login.identifiantPlaceholder')}
                      autoComplete="username"
                    />
                  </div>
                  {errors.identifiant && <div className="error">{errors.identifiant}</div>}
                </div>

                <div className="field">
                  <label>{t('champs.motDePasse')}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                    <input
                      className={`input ${errors.motDePasse ? 'invalid' : ''}`}
                      style={{ paddingLeft: 38, paddingRight: 40 }}
                      type={showPassword ? 'text' : 'password'}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      style={{ position: 'absolute', right: 10, top: 9, background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4 }}
                      aria-label={showPassword ? t('commun.masquer') : t('commun.afficher')}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.motDePasse && <div className="error">{errors.motDePasse}</div>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                  <Link className="auth-link" to="/forgot-password">{t('login.motDePasseOublie')}</Link>
                </div>

                <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
                  {loading ? t('login.connexionEnCours') : t('login.seConnecter')}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="auth-title-lg">{t('login.mfa.titre')}</h1>
              <p className="auth-subtitle">
                {t('login.mfa.sousTitre', {
                  prenom: mfaUtilisateur?.prenom ?? '',
                  nom: mfaUtilisateur?.nom ?? '',
                })}
              </p>

              <form onSubmit={handleMfaSubmit} noValidate>
                <div className="mfa-code">
                  {mfaCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputsRef.current[i] = el; }}
                      className="mfa-digit"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      aria-label={t('login.mfa.chiffre', { index: i + 1 })}
                    />
                  ))}
                </div>
                <p className="mfa-hint">{t('login.mfa.indice')}</p>

                <button className="btn btn-primary w-full btn-lg" type="submit" disabled={mfaLoading} style={{ marginTop: 18 }}>
                  {mfaLoading ? t('etats.verification') : t('login.mfa.verifier')}
                  {!mfaLoading && <KeyRound size={18} />}
                </button>

                <button
                  type="button"
                  className="auth-link"
                  style={{ marginTop: 16, width: '100%' }}
                  onClick={() => { setMfaStep(false); setMfaCode(['', '', '', '', '', '']); }}
                >
                  {t('login.mfa.retour')}
                </button>
              </form>
            </>
          )}

          <div className="auth-footer">
            {t('login.copyright', { annee: new Date().getFullYear() })}
            <div style={{ marginTop: 12 }}>
              {t('login.pasDeCompte')} <Link className="auth-link" to="/register">{t('login.creerCompte')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
