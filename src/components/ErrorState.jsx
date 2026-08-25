import { WifiOff, RefreshCw, ShieldAlert, ServerCrash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Écran d'erreur d'une page ou d'une section.
 *
 * Comble un manque réel : jusqu'ici, un échec de chargement déclenchait une
 * alerte SweetAlert qui disparaissait au premier clic, puis la page retombait
 * sur l'état VIDE. L'utilisateur lisait donc « aucune donnée » alors que la
 * requête avait échoué — deux situations opposées, l'une appelant un
 * rechargement, l'autre une création.
 *
 * L'icône suit la nature de la panne : on ne propose pas la même chose selon
 * qu'il faut se reconnecter, réessayer, ou demander des droits.
 */
export default function ErrorState({
  message,
  onRetry,
  variante = 'serveur', // 'serveur' | 'reseau' | 'droits'
  titre,
}) {
  const { t } = useTranslation('layout');

  const Icone = { reseau: WifiOff, droits: ShieldAlert, serveur: ServerCrash }[variante] ?? ServerCrash;

  return (
    <div className={`etat-erreur etat-erreur-${variante}`} role="alert">
      <span className="etat-erreur-icone"><Icone size={26} /></span>

      <h3>{titre ?? t('erreur.titre', { defaultValue: 'Chargement impossible' })}</h3>
      {message && <p>{message}</p>}

      {/* Pas de bouton sur un refus de droits : réessayer ne changera rien,
          et le proposer entretiendrait l'illusion du contraire. */}
      {onRetry && variante !== 'droits' && (
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={15} /> {t('actions.reessayer')}
        </button>
      )}
    </div>
  );
}
