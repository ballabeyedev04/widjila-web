import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileWarning, Paperclip } from 'lucide-react';

import { fetchFichierBlob, telechargerFichierProtege } from '../service/plan/planService.js';
import { getErrorMessage } from '../service/helpers.js';
import SwalCustom from '../utils/swal.config.js';

/**
 * Affichage et téléchargement des fichiers PRIVÉS.
 *
 * ## Le défaut corrigé
 *
 * Les photos de réserves et d'inspections étaient rendues en
 * `<img src="/uploads/…">`, et les pièces jointes en `<a href="/uploads/…">`.
 * Cela ne pouvait pas fonctionner, pour deux raisons :
 *
 *  1. l'API exige la session sur `/uploads/*` (`checkFileAccess`) — une balise
 *     `<img>` ou un lien n'en portent aucune ;
 *  2. en production, l'admin et l'API vivent sur deux domaines. Un chemin
 *     relatif visait donc le domaine de l'ADMIN, où nginx renvoie l'application
 *     elle-même (`try_files … /index.html`) : l'image recevait une page HTML.
 *
 * L'échec était ensuite masqué par `onError={… display = 'none'}` : la photo
 * disparaissait sans un mot, et personne ne pouvait savoir qu'une réserve
 * avait des photos. Les vidéos de réserve, elles, étaient rendues dans une
 * balise `<img>` — elles n'ont jamais pu s'afficher.
 *
 * ## Ce que font ces composants
 *
 * L'aperçu passe par `fetchFichierBlob`, qui joint la session, vise l'API, et
 * refuse tout type non affichable (voir `service/securite.js`). Un échec est
 * MONTRÉ, jamais caché. Le rendu suit le type réel reçu : image, vidéo ou son.
 * Le téléchargement, lui, passe par `telechargerFichierProtege`.
 */

/**
 * Aperçu d'un fichier privé — image, vidéo ou note vocale selon son type.
 *
 * @param {{ url: string, alt?: string, className?: string, style?: object }} props
 */
export function ApercuProtege({ url, alt = '', className, style }) {
  const { t } = useTranslation('common');
  const [fichier, setFichier] = useState(null);   // { src, type }
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    if (!url) return undefined;
    let vivant = true;
    let objet = null;
    setFichier(null);
    setEchec(false);

    fetchFichierBlob(url)
      .then((blob) => {
        if (!vivant) return;
        objet = URL.createObjectURL(blob);
        setFichier({ src: objet, type: blob.type || '' });
      })
      .catch(() => { if (vivant) setEchec(true); });

    // L'URL d'objet retient le fichier en mémoire : sans révocation, chaque
    // réserve ouverte laissait ses photos en mémoire jusqu'au rechargement.
    return () => {
      vivant = false;
      if (objet) URL.revokeObjectURL(objet);
    };
  }, [url]);

  if (echec) {
    return (
      <span
        className={`fichier-indisponible ${className || ''}`}
        style={style}
        role="img"
        aria-label={t('messages.apercuIndisponible')}
        title={t('messages.apercuIndisponible')}
      >
        <FileWarning size={20} aria-hidden="true" />
      </span>
    );
  }
  if (!fichier) return <span className={`fichier-chargement ${className || ''}`} style={style} aria-busy="true" />;

  if (fichier.type.startsWith('video/')) {
    return <video src={fichier.src} controls preload="metadata" className={className} style={style} />;
  }
  if (fichier.type.startsWith('audio/')) {
    return <audio src={fichier.src} controls preload="metadata" className={className} style={style} />;
  }
  return <img src={fichier.src} alt={alt} className={className} style={style} />;
}

/**
 * Lien de téléchargement d'un fichier privé.
 *
 * Télécharge plutôt qu'ouvrir : un fichier téléchargé ne s'exécute jamais dans
 * l'origine de l'application, quel que soit son contenu. C'est aussi ce qui
 * permet de télécharger un Word ou un DWG, que l'aperçu refuse.
 *
 * @param {{ url: string, nom: string }} props
 */
export function LienFichierProtege({ url, nom }) {
  const [enCours, setEnCours] = useState(false);

  const telecharger = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      await telechargerFichierProtege(url, nom);
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <button
      type="button"
      className="lien-fichier"
      onClick={telecharger}
      disabled={enCours}
      aria-busy={enCours || undefined}
    >
      <Paperclip size={13} aria-hidden="true" /> {nom}
    </button>
  );
}
