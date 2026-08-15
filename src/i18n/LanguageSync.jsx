import { useEffect } from 'react';
import { useUser } from '../context/useUser.js';
import { applyLanguage } from './index.js';

/**
 * Aligne la langue de l'interface sur celle du profil utilisateur.
 *
 * La langue est une donnée de compte, pas une préférence d'appareil : un
 * utilisateur qui choisit « Deutsch » depuis son poste doit retrouver
 * l'allemand sur n'importe quel autre navigateur. La source de vérité est donc
 * `utilisateur.langue` renvoyé par l'API ; ce composant réagit à chaque
 * changement de l'utilisateur en contexte (connexion, /account/me, mise à jour
 * du profil) et propage la valeur à i18next.
 *
 * Sans utilisateur connecté (pages d'authentification), la langue reste celle
 * du cache local ou du navigateur — voir i18n/index.js.
 */
export default function LanguageSync() {
  const { user } = useUser();
  const langue = user?.langue;

  useEffect(() => {
    if (langue) applyLanguage(langue);
  }, [langue]);

  return null;
}
