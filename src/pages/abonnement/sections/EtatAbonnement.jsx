/**
 * L'état de l'abonnement : ce que la formule permet, et ce qui a été réglé.
 *
 * Ces deux sections répondent à « où en suis-je ? », là où le reste de l'écran
 * répond à « que proposez-vous ? ». Deux questions différentes, deux blocs
 * séparés — et un fichier de 811 lignes ramené à ce qu'il décrit vraiment.
 */
import { useTranslation } from 'react-i18next';
import { HardHat, ReceiptText, Users } from 'lucide-react';

import { formatDate } from '../../../utils/format.js';

/**
 * Montant formaté avec le symbole de sa devise.
 *
 * Deux décimales SEULEMENT quand elles portent une information : « 49 € » se
 * lit mieux que « 49,00 € », et « 49,90 € » reste exact. Même règle que sur
 * mobile, pour que les deux écrans annoncent le même prix à l'identique.
 */
function montant(valeur, devise = 'EUR') {
  const nombre = Number(valeur) || 0;
  const symbole = { EUR: '\u20ac', USD: '$', XOF: 'FCFA' }[String(devise).toUpperCase()]
    || String(devise).toUpperCase();
  const texte = Number.isInteger(nombre)
    ? String(nombre)
    : nombre.toFixed(2).replace('.', ',');
  return `${texte} ${symbole}`;
}

/**
 * Une jauge d'usage : ce qui est consommé, sur ce qui est permis.
 *
 * `limite` nulle vaut ILLIMITÉ (voir `droits.service.js#getDroits`, où le plan
 * Entreprise et l'essai gratuit renvoient `null`). Afficher « 3 sur 0 » dans ce
 * cas ferait croire à un quota épuisé, exactement à l'envers de la vérité.
 */
export function JaugeUsage({ icone: Icone, libelle, usage }) {
  const { t } = useTranslation('plateforme');
  const courant = Number(usage?.courant) || 0;
  const limite = usage?.limite;
  const illimite = limite === null || limite === undefined;
  const pourcentage = illimite ? 0 : Math.min(100, Math.round((courant / Math.max(1, limite)) * 100));
  const atteint = !illimite && courant >= limite;

  return (
    <div className="usage-jauge">
      <div className="usage-jauge-entete">
        <span className="usage-jauge-libelle"><Icone size={14} /> {libelle}</span>
        <span className={`usage-jauge-valeur ${atteint ? 'atteint' : ''}`}>
          {illimite ? t('abonnement.illimite') : t('abonnement.surTotal', { courant, total: limite })}
        </span>
      </div>
      {!illimite && (
        <div className="usage-jauge-piste">
          <span
            className={`usage-jauge-remplissage ${atteint ? 'atteint' : ''}`}
            style={{ width: `${pourcentage}%` }}
          />
        </div>
      )}
      {atteint && <span className="usage-jauge-alerte">{t('abonnement.quotaAtteint')}</span>}
    </div>
  );
}

/**
 * Ce que la formule en cours PERMET, et ce qu'il en reste.
 *
 * Cette carte manquait au web alors que le mobile l'affiche depuis toujours.
 * Son absence avait un coût concret : un compte qui se voyait refuser la
 * création d'un chantier lisait « abonnement actif » sur cet écran et n'avait
 * aucun moyen d'apprendre qu'il était à 5 chantiers sur 5.
 */
export function CarteUsage({ droits, usage }) {
  const { t } = useTranslation('plateforme');
  if (!droits) return null;

  return (
    <section className="abonnement-usage" aria-label={t('abonnement.votreFormule')}>
      <header>
        <div>
          <h2>{t('abonnement.votreFormule')}</h2>
          <p>{droits.planNom || t('abonnement.planEnCours')}</p>
        </div>
        {droits.dateFin && (
          <span className="badge badge-neutral">
            {droits.essaiEnCours
              ? t('abonnement.essaiJusquau', { date: formatDate(droits.dateFin) })
              : t('abonnement.renouvellementLe', { date: formatDate(droits.dateFin) })}
          </span>
        )}
      </header>

      <div className="abonnement-usage-jauges">
        <JaugeUsage icone={Users} libelle={t('abonnement.utilisateurs')} usage={usage?.utilisateurs} />
        <JaugeUsage icone={HardHat} libelle={t('abonnement.chantiers')} usage={usage?.chantiers} />
      </div>
    </section>
  );
}

/**
 * Historique des paiements — ce que l'organisation a réellement réglé.
 *
 * Réservé au groupe FACTURATION : le serveur répond 403 aux autres, l'écran ne
 * charge donc la section que lorsque le rôle en fait partie (voir le
 * chargement dans `Abonnement`).
 *
 * Le TOTAL n'additionne que les lignes réellement encaissées, et prend la
 * devise de la plus récente d'entre elles : additionner des montants de devises
 * différentes ne voudrait rien dire. En pratique une organisation n'en a
 * qu'une.
 */
export function SectionHistorique({ lignes }) {
  const { t } = useTranslation('plateforme');

  const payees = lignes.filter((l) => l.statut === 'active' || l.statut === 'expiree');
  const total = payees.reduce((somme, l) => somme + (Number(l.prixPaye) || 0), 0);
  const devise = payees[0]?.devise || 'EUR';

  return (
    <section className="abonnement-historique" aria-label={t('abonnement.historiqueTitre')}>
      <header>
        <h2><ReceiptText size={16} /> {t('abonnement.historiqueTitre')}</h2>
        {total > 0 && (
          <span className="abonnement-historique-total">
            {t('abonnement.totalRegle')} · {montant(total, devise)}
          </span>
        )}
      </header>

      {lignes.length === 0 ? (
        <div className="abonnement-historique-vide">
          <ReceiptText size={28} />
          <strong>{t('abonnement.historiqueVide')}</strong>
          <span>{t('abonnement.historiqueVideDescription')}</span>
        </div>
      ) : (
        <ul className="abonnement-historique-liste">
          {lignes.map((l) => (
            <li key={l.id}>
              <span className="abonnement-historique-plan">
                <strong>{l.planNom || l.planCode}</strong>
                <span>{t('abonnement.souscritLe', { date: formatDate(l.creeLe || l.dateDebut) })}</span>
              </span>
              <span className="abonnement-historique-montant">
                {l.prixPaye === null ? '\u2014' : montant(l.prixPaye, l.devise)}
                {l.periode && (
                  <span className="abonnement-historique-periode">
                    {l.periode === 'annuel' ? t('abonnement.parAnCourt') : t('abonnement.parMoisCourt')}
                  </span>
                )}
              </span>
              <span className={`badge badge-${{
                active: 'success', en_attente: 'warning', expiree: 'neutral',
                annulee: 'neutral', echec: 'danger',
              }[l.statut] || 'neutral'}`}
              >
                {t(`abonnement.statut.${l.statut}`, { defaultValue: l.statut })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
