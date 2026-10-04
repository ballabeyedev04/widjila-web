/**
 * Le parcours « Premium sur devis », côté client.
 *
 * Trois écrans du cahier des charges tiennent ici, parce qu'ils racontent une
 * seule histoire et qu'on ne veut pas faire naviguer le client entre eux :
 *
 *   — écran 2, le FORMULAIRE de demande (société, volumes, besoins) ;
 *   — écran 3, le DEVIS reçu : numéro, montants HT/TVA/TTC, durée, limites,
 *     conditions, avec « Accepter » et « Refuser » ;
 *   — écran 4, le RÉCAPITULATIF avant paiement, qui mène à la page sécurisée
 *     de Stripe.
 *
 * Ce qui n'est PAS ici, et c'est volontaire : le chiffrage. Le client décrit
 * un besoin, il ne pose aucun prix — le formulaire ne comporte d'ailleurs
 * aucun champ de montant, et le serveur refuserait celui qui s'y glisserait.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, ArrowRight, Check, ExternalLink, FileText, Loader2, Lock, X,
} from 'lucide-react';

import { Input, Textarea } from '../../../components/FormControls.jsx';
import { formatDate, formatPrix } from '../../../utils/format.js';

/** Couleur du badge selon l'état d'avancement du devis. */
const TONS = {
  brouillon: 'badge-neutral',
  envoye: 'badge-warning',
  accepte: 'badge-success',
  refuse: 'badge-danger',
  expire: 'badge-neutral',
};

/**
 * Formulaire de demande (écran 2).
 *
 * Tous les champs sont facultatifs sauf le besoin : une entreprise qui ne
 * connaît pas encore son volume exact doit pouvoir nous écrire quand même,
 * et c'est l'échange qui précisera. Les coordonnées manquantes sont reprises
 * de l'organisation par le serveur.
 */
function FormulaireDemande({ enCours, erreur, onEnvoyer, onAnnuler }) {
  const { t } = useTranslation('plateforme');
  const [champs, setChamps] = useState({
    contact: '', email: '', telephone: '',
    nbUtilisateurs: '', nbChantiers: '', dureeSouhaitee: '', besoins: '',
  });

  const maj = (nom) => (e) => setChamps((c) => ({ ...c, [nom]: e.target.value }));

  const envoyer = (e) => {
    e.preventDefault();
    // Les nombres partent en nombres, ou pas du tout : une chaîne vide
    // serait refusée par la validation du serveur.
    const nombre = (v) => (v === '' || v === null ? null : Number(v));
    onEnvoyer({
      contact: champs.contact || null,
      email: champs.email || null,
      telephone: champs.telephone || null,
      nbUtilisateurs: nombre(champs.nbUtilisateurs),
      nbChantiers: nombre(champs.nbChantiers),
      dureeSouhaitee: nombre(champs.dureeSouhaitee),
      besoins: champs.besoins || null,
    });
  };

  return (
    <form className="devis-formulaire" onSubmit={envoyer}>
      <h3 className="devis-titre">{t('abonnement.devis.formulaireTitre')}</h3>
      <p className="devis-sous-titre">{t('abonnement.devis.formulaireSousTitre')}</p>

      <div className="devis-grille">
        <Input label={t('abonnement.devis.contact')} value={champs.contact} onChange={maj('contact')} maxLength={150} />
        <Input label={t('abonnement.devis.email')} type="email" value={champs.email} onChange={maj('email')} maxLength={180} />
        <Input label={t('abonnement.devis.telephone')} value={champs.telephone} onChange={maj('telephone')} maxLength={40} />
        <Input label={t('abonnement.devis.nbUtilisateurs')} type="number" min="1" max="10000" value={champs.nbUtilisateurs} onChange={maj('nbUtilisateurs')} />
        <Input label={t('abonnement.devis.nbChantiers')} type="number" min="1" max="10000" value={champs.nbChantiers} onChange={maj('nbChantiers')} />
        <Input label={t('abonnement.devis.dureeSouhaitee')} type="number" min="1" max="120" value={champs.dureeSouhaitee} onChange={maj('dureeSouhaitee')} />
      </div>

      <Textarea label={t('abonnement.devis.besoins')} rows={4} value={champs.besoins} onChange={maj('besoins')} maxLength={4000} />

      {erreur && <div className="payment-error" role="alert"><AlertCircle size={14} /> {erreur}</div>}

      <div className="devis-actions">
        <button type="button" className="btn btn-ghost" onClick={onAnnuler} disabled={enCours}>
          {t('abonnement.devis.annuler')}
        </button>
        <button type="submit" className="btn btn-primary" disabled={enCours}>
          {enCours
            ? <><Loader2 size={16} className="spin" /> {t('abonnement.devis.envoiEnCours')}</>
            : <>{t('abonnement.devis.envoyerDemande')} <ArrowRight size={16} /></>}
        </button>
      </div>
    </form>
  );
}

/**
 * Le devis lui-même (écran 3), puis le départ vers le paiement (écran 4).
 *
 * Les boutons suivent ce que le SERVEUR autorise (`peutEtreAccepte`,
 * `peutEtrePaye`) : les recalculer ici ferait diverger l'écran de la règle
 * réelle au premier changement de statut.
 */
function CarteDevis({ devis, enCours, onAccepter, onRefuser, onPayer }) {
  const { t } = useTranslation('plateforme');
  const [refusEnCours, setRefusEnCours] = useState(false);
  const [motif, setMotif] = useState('');

  const ligne = (libelle, valeur) => (
    <div className="recap-ligne"><dt>{libelle}</dt><dd>{valeur}</dd></div>
  );

  return (
    <article className="devis-carte">
      <header className="devis-entete">
        <div>
          <h3 className="devis-numero"><FileText size={16} /> {devis.numero}</h3>
          <p className="devis-date">{t('abonnement.devis.demandeLe', { date: formatDate(devis.creeLe) })}</p>
        </div>
        <span className={`badge ${TONS[devis.statut] || 'badge-neutral'}`}>
          {t(`abonnement.devis.statut.${devis.statut}`)}
        </span>
      </header>

      {!devis.chiffre ? (
        // Demande reçue, pas encore chiffrée : on le dit, sans inventer de
        // délai qu'on ne tiendrait peut-être pas.
        <p className="devis-attente">
          <Loader2 size={14} className="spin" /> {t('abonnement.devis.enPreparation')}
        </p>
      ) : (
        <dl className="recap-lignes">
          {ligne(t('abonnement.devis.montantHt'), formatPrix(devis.montantHt, devis.devise))}
          {devis.tauxTva > 0 && ligne(
            t('abonnement.devis.tva', { taux: devis.tauxTva }),
            formatPrix(devis.montantTva, devis.devise),
          )}
          {ligne(
            t('abonnement.devis.montantTtc'),
            <strong>{formatPrix(devis.montantTtc, devis.devise)}</strong>,
          )}
          {ligne(t('abonnement.devis.duree'), t('abonnement.devis.dureeMois', { n: devis.dureeMois }))}
          {ligne(
            t('abonnement.devis.utilisateurs'),
            devis.limiteUtilisateurs == null ? t('abonnement.illimite') : devis.limiteUtilisateurs,
          )}
          {devis.limiteChantiers != null
            && ligne(t('abonnement.devis.chantiers'), devis.limiteChantiers)}
          {devis.expireLe && ligne(
            t('abonnement.devis.validiteJusquau'),
            formatDate(devis.expireLe),
          )}
        </dl>
      )}

      {devis.conditions && <p className="devis-conditions">{devis.conditions}</p>}

      {devis.payeLe && (
        <p className="devis-regle"><Check size={14} /> {t('abonnement.devis.regleLe', { date: formatDate(devis.payeLe) })}</p>
      )}

      {devis.motifRefus && (
        <p className="devis-conditions">{t('abonnement.devis.motifRefus', { motif: devis.motifRefus })}</p>
      )}

      {/* ── Accepter / Refuser (écran 3) ── */}
      {devis.peutEtreAccepte && !refusEnCours && (
        <div className="devis-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setRefusEnCours(true)} disabled={enCours}>
            <X size={15} /> {t('abonnement.devis.refuser')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onAccepter(devis)} disabled={enCours}>
            <Check size={15} /> {t('abonnement.devis.accepter')}
          </button>
        </div>
      )}

      {refusEnCours && (
        <div className="devis-refus">
          <Textarea label={t('abonnement.devis.motifFacultatif')} rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={2000} />
          <div className="devis-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setRefusEnCours(false)} disabled={enCours}>
              {t('abonnement.devis.annuler')}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => onRefuser(devis, motif)} disabled={enCours}>
              {t('abonnement.devis.confirmerRefus')}
            </button>
          </div>
        </div>
      )}

      {/* ── Paiement (écran 4) ── */}
      {devis.peutEtrePaye && (
        <>
          <p className="recap-redirection">
            <Lock size={14} /> {t('abonnement.recap.redirection')}
          </p>
          <button
            type="button"
            className="btn btn-primary w-full btn-lg"
            onClick={() => onPayer(devis)}
            disabled={enCours}
          >
            {enCours
              ? <><Loader2 size={16} className="spin" /> {t('abonnement.recap.redirectionEnCours')}</>
              : <>{t('abonnement.devis.procederPaiement')} <ExternalLink size={16} /></>}
          </button>
        </>
      )}
    </article>
  );
}

/**
 * Section complète : l'offre sur devis, la demande, et les devis reçus.
 *
 * `devis` vient du serveur et fait foi ; cet écran ne décide de rien.
 */
export default function DevisSection({
  devis = [], enCours, erreur, formuleOuverte,
  onOuvrirFormulaire, onFermerFormulaire, onDemander, onAccepter, onRefuser, onPayer,
}) {
  const { t } = useTranslation('plateforme');

  // Une demande est déjà en cours : le serveur en refuserait une seconde, et
  // proposer le bouton reviendrait à promettre ce qu'on refuse ensuite.
  const demandeEnCours = devis.some((d) => ['brouillon', 'envoye'].includes(d.statut));

  return (
    <section className="devis-section" aria-label={t('abonnement.devis.ariaLabel')}>
      <h2 className="devis-section-titre">{t('abonnement.devis.titre')}</h2>

      {formuleOuverte ? (
        <FormulaireDemande
          enCours={enCours}
          erreur={erreur}
          onEnvoyer={onDemander}
          onAnnuler={onFermerFormulaire}
        />
      ) : (
        <>
          {/* Une action refusée (paiement d'un devis périmé, acceptation
              hors délai) doit se voir : sans ce bandeau, le bouton paraissait
              n'avoir rien fait. Dans le formulaire, l'erreur reste à côté des
              champs — c'est là qu'on la corrige. */}
          {erreur && (
            <div className="payment-error" role="alert">
              <AlertCircle size={14} /> {erreur}
            </div>
          )}
          {devis.length === 0 && (
            <p className="devis-vide">{t('abonnement.devis.aucun')}</p>
          )}
          {!demandeEnCours && (
            <button type="button" className="btn btn-primary" onClick={onOuvrirFormulaire} disabled={enCours}>
              {t('abonnement.devis.demander')} <ArrowRight size={16} />
            </button>
          )}
        </>
      )}

      <div className="devis-liste">
        {devis.map((d) => (
          <CarteDevis
            key={d.id}
            devis={d}
            enCours={enCours}
            onAccepter={onAccepter}
            onRefuser={onRefuser}
            onPayer={onPayer}
          />
        ))}
      </div>
    </section>
  );
}
