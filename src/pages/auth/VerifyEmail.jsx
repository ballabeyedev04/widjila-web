import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MailCheck, MailX, Loader2 } from 'lucide-react';
import { verifyEmail } from '../../service/auth/authService.js';
import '../../assets/css/auth.css';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { t } = useTranslation('auth');
  const token = params.get('token') || '';
  const [status, setStatus] = useState('loading'); // loading | success | error
  // `message` : texte fourni par l'API (non traduisible).
  // `messageKey` : clé de repli traduite quand l'API ne fournit rien.
  const [message, setMessage] = useState('');
  const [messageKey, setMessageKey] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) {
        setStatus('error');
        setMessage('');
        setMessageKey('verifyEmail.jetonManquant');
        return;
      }
      try {
        const res = await verifyEmail(token);
        if (mounted) {
          setStatus('success');
          setMessage(res?.message || '');
          setMessageKey('verifyEmail.succesMessage');
        }
      } catch (err) {
        if (mounted) {
          setStatus('error');
          setMessage(err?.response?.data?.message || '');
          setMessageKey('verifyEmail.lienInvalide');
        }
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const texteMessage = message || (messageKey ? t(messageKey) : '');

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-accent-bar" />
        <div className="auth-body" style={{ textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <Loader2 size={44} style={{ color: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
              <h1 className="auth-title-lg mt-4">{t('verifyEmail.enCours')}</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <MailCheck size={48} style={{ color: 'var(--success)' }} />
              <h1 className="auth-title-lg mt-4">{t('verifyEmail.succesTitre')}</h1>
              <p className="auth-subtitle">{texteMessage}</p>
              <Link to="/login" className="btn btn-primary btn-lg w-full">{t('verifyEmail.seConnecter')}</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <MailX size={48} style={{ color: 'var(--danger)' }} />
              <h1 className="auth-title-lg mt-4">{t('verifyEmail.erreurTitre')}</h1>
              <p className="auth-subtitle">{texteMessage}</p>
              <Link to="/login" className="btn btn-primary btn-lg w-full">{t('verifyEmail.retourConnexion')}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
