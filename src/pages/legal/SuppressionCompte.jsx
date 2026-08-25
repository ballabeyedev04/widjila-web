import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Trash2, CheckCircle2, Smartphone, Mail, Clock } from 'lucide-react';

import { deposerDemandeSuppression } from '../../service/public/suppressionCompteService.js';
import { getErrorMessage } from '../../service/helpers.js';
import '../../assets/css/legal.css';
import '../../assets/css/suppression-compte.css';

/**
 * Page PUBLIQUE de demande de suppression de compte.
 *
 * Exigence Google Play : l'URL doit être atteignable sans connexion et sans
 * avoir l'application installée — un utilisateur qui a désinstallé doit
 * pouvoir demander la suppression. Elle est donc hors `ProtectedRoute`, et
 * n'appelle aucune route authentifiée.
 *
 * Le tableau « ce qui est supprimé / ce qui est conservé » n'est pas
 * décoratif : le backend PSEUDONYMISE (art. 17 RGPD) plutôt qu'il n'efface,
 * parce que les réserves et commentaires engagent la responsabilité d'autres
 * intervenants sur un chantier. Annoncer « tout est supprimé » serait une
 * déclaration inexacte — c'est le point que Google vérifie le plus.
 */
export default function SuppressionCompte() {
  const [form, setForm] = useState({ email: '', objet: '' });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreurGlobale, setErreurGlobale] = useState('');

  const valider = () => {
    const e = {};
    const email = form.email.trim();
    if (!email) e.email = 'Votre adresse email est obligatoire.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Cette adresse email n'est pas valide.";

    const objet = form.objet.trim();
    if (!objet) e.objet = "L'objet de votre demande est obligatoire.";
    else if (objet.length < 10) e.objet = 'Merci de détailler votre demande (10 caractères minimum).';
    else if (objet.length > 2000) e.objet = 'Votre message ne peut pas dépasser 2000 caractères.';

    setErreurs(e);
    return Object.keys(e).length === 0;
  };

  const soumettre = async (ev) => {
    ev.preventDefault();
    setErreurGlobale('');
    if (!valider()) return;

    setEnvoi(true);
    try {
      await deposerDemandeSuppression({ email: form.email.trim(), objet: form.objet.trim() });
      setEnvoye(true);
    } catch (err) {
      setErreurGlobale(getErrorMessage(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="legal-page">
      <div className="legal-header">
        <Link to="/login" className="legal-back">
          <ArrowLeft size={15} /> Retour à la connexion
        </Link>
        <div className="legal-brand">
          <span className="logo-icon"><ShieldCheck size={17} /></span>
          Widjila — Suivie Chantier
        </div>
      </div>

      <div className="legal-card">
        <div className="legal-eyebrow">Confidentialité</div>
        <h1>Supprimer mon compte et mes données</h1>
        <p className="legal-maj">Widjila — Suivie Chantier · Délai de traitement : 30 jours maximum</p>

        <section>
          <p>
            Vous pouvez demander à tout moment la suppression de votre compte et des données
            personnelles associées. Deux chemins s'offrent à vous selon que vous avez encore
            l'application ou non.
          </p>
        </section>

        {/* Google exige que le chemin IN-APP soit décrit, pas seulement le formulaire. */}
        <section>
          <h2>1. Depuis l'application (immédiat)</h2>
          <div className="sc-etapes">
            <div className="sc-etape">
              <span className="sc-etape-num"><Smartphone size={15} /></span>
              <div>
                <strong>Suppression directe</strong>
                <p>
                  Ouvrez l'application, puis&nbsp;: <em>Paramètres</em> → <em>Sécurité</em> →
                  <em> Supprimer mon compte</em>. La suppression est appliquée immédiatement,
                  sans intervention de notre part.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>2. Par formulaire (si vous n'avez plus l'application)</h2>
          <p>
            Si vous avez désinstallé l'application ou ne parvenez plus à vous connecter,
            utilisez le formulaire ci-dessous. Nous vérifierons votre identité avant toute
            suppression, afin d'éviter qu'un tiers ne supprime votre compte à votre place.
          </p>

          {envoye ? (
            <div className="sc-succes" role="status">
              <CheckCircle2 size={40} />
              <h3>Votre demande a bien été enregistrée</h3>
              <p>
                Nous avons reçu votre demande pour <strong>{form.email.trim()}</strong> et vous
                répondrons à cette adresse sous <strong>30 jours maximum</strong>.
              </p>
              <p className="sc-succes-note">
                Pensez à vérifier vos courriers indésirables — notre réponse peut s'y trouver.
              </p>
            </div>
          ) : (
            <form className="sc-form" onSubmit={soumettre} noValidate>
              {erreurGlobale && <div className="sc-erreur-globale" role="alert">{erreurGlobale}</div>}

              <div className="sc-champ">
                <label htmlFor="sc-email">
                  Adresse email du compte <span aria-hidden="true">*</span>
                </label>
                <input
                  id="sc-email"
                  type="email"
                  autoComplete="email"
                  className={erreurs.email ? 'sc-input sc-input-erreur' : 'sc-input'}
                  placeholder="vous@exemple.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  aria-invalid={!!erreurs.email}
                  aria-describedby={erreurs.email ? 'sc-email-err' : undefined}
                  disabled={envoi}
                />
                {erreurs.email && <span className="sc-erreur" id="sc-email-err">{erreurs.email}</span>}
                <span className="sc-aide">Indiquez l'adresse avec laquelle vous vous connectiez.</span>
              </div>

              <div className="sc-champ">
                <label htmlFor="sc-objet">
                  Objet de la demande <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="sc-objet"
                  rows={5}
                  className={erreurs.objet ? 'sc-input sc-input-erreur' : 'sc-input'}
                  placeholder="Précisez votre demande : suppression complète du compte, suppression de certaines données…"
                  value={form.objet}
                  onChange={(e) => setForm({ ...form, objet: e.target.value })}
                  aria-invalid={!!erreurs.objet}
                  aria-describedby={erreurs.objet ? 'sc-objet-err' : undefined}
                  disabled={envoi}
                  maxLength={2000}
                />
                {erreurs.objet && <span className="sc-erreur" id="sc-objet-err">{erreurs.objet}</span>}
                <span className="sc-aide">{form.objet.length} / 2000 caractères</span>
              </div>

              <button type="submit" className="sc-submit" disabled={envoi}>
                <Trash2 size={16} />
                {envoi ? 'Envoi en cours…' : 'Envoyer ma demande'}
              </button>
            </form>
          )}
        </section>

        {/* Le point que Google vérifie le plus attentivement. */}
        <section>
          <h2>3. Quelles données sont supprimées ?</h2>
          <div className="sc-tableau-wrap">
            <table className="sc-tableau">
              <thead>
                <tr>
                  <th>Donnée</th>
                  <th>Traitement</th>
                  <th>Délai</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Nom, prénom, email, téléphone, fonction</td>
                  <td><span className="sc-tag sc-tag-supprime">Supprimé</span></td>
                  <td>Immédiat</td>
                </tr>
                <tr>
                  <td>Photo de profil</td>
                  <td><span className="sc-tag sc-tag-supprime">Supprimée</span></td>
                  <td>Immédiat</td>
                </tr>
                <tr>
                  <td>Mot de passe et sessions actives</td>
                  <td><span className="sc-tag sc-tag-supprime">Supprimés</span></td>
                  <td>Immédiat</td>
                </tr>
                <tr>
                  <td>Jetons de notification (appareils)</td>
                  <td><span className="sc-tag sc-tag-supprime">Supprimés</span></td>
                  <td>Immédiat</td>
                </tr>
                <tr>
                  <td>Réserves, commentaires et photos de chantier</td>
                  <td><span className="sc-tag sc-tag-anonymise">Anonymisés</span></td>
                  <td>Immédiat</td>
                </tr>
                <tr>
                  <td>Journaux de connexion et d'audit</td>
                  <td><span className="sc-tag sc-tag-conserve">Conservés</span></td>
                  <td>12 mois</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="sc-note">
            <Clock size={17} />
            <p>
              <strong>Pourquoi certaines données sont anonymisées plutôt qu'effacées.</strong> Les
              réserves et commentaires que vous avez créés documentent des défauts constatés sur un
              chantier et engagent la responsabilité d'autres intervenants (entreprises, maîtrise
              d'œuvre). Les effacer réécrirait l'historique d'un projet auquel vous n'êtes plus la
              seule partie. Votre nom en est retiré : ces éléments ne vous sont plus rattachables.
              Les journaux d'audit sont conservés 12 mois au titre de nos obligations de sécurité,
              puis supprimés automatiquement.
            </p>
          </div>
        </section>

        <section>
          <h2>4. Une question ?</h2>
          <p className="sc-contact">
            <Mail size={16} />
            Écrivez-nous à <a href="mailto:ballabeye.dev04@gmail.com">ballabeye.dev04@gmail.com</a> — nous
            répondons sous 30 jours conformément au RGPD (art. 12.3).
          </p>
          <p className="legal-maj" style={{ marginTop: 20 }}>
            Voir aussi notre <Link to="/politique-confidentialite">politique de confidentialité</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
