import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, HardHat, AlertTriangle, TrendingUp, RefreshCw,
  UserCheck, ClipboardCheck, Paperclip, CheckCircle2, XCircle, ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { reporter } from '../../utils/monitoring.js';
import { statsPlateforme, croissanceInscriptions } from '../../service/admin/adminService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatNombre } from '../../utils/format.js';
import { enumLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Une file d'attente : un compte, une destination.
 *
 * Le chiffre ne sert à rien s'il ne mène pas à l'écran qui permet d'agir.
 * Un tableau de bord de validation qui affiche « 5 demandes en attente » sans
 * lien oblige à retrouver l'écran soi-même — et c'est précisément à ce
 * moment-là qu'on remet la tâche à plus tard.
 */
function CarteAttente({ icone: Icone, libelle, valeur, aide, vers, ton }) {
  const navigate = useNavigate();
  const vide = !valeur;

  return (
    <button
      type="button"
      className={`carte-attente${vide ? ' carte-attente-vide' : ''}`}
      onClick={() => navigate(vers)}
    >
      {/* `stat-icon` : la MEME palette que les compteurs de volume, plutot
          qu'un jeu de tons parallele. Deux echelles de couleur pour le meme
          ecran finiraient par diverger. */}
      <span className={`carte-attente-icone stat-icon ${ton}`}><Icone size={20} /></span>
      <span className="carte-attente-corps">
        <span className="carte-attente-valeur">{formatNombre(valeur || 0)}</span>
        <span className="carte-attente-libelle">{libelle}</span>
        {aide && <span className="carte-attente-aide">{aide}</span>}
      </span>
      <ArrowRight size={16} className="carte-attente-fleche" aria-hidden />
    </button>
  );
}

export default function PlateformeDashboard() {
  const { t } = useTranslation('plateforme');
  const [stats, setStats] = useState(null);
  const [croissance, setCroissance] = useState([]);
  const [croissanceEnErreur, setCroissanceEnErreur] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [accesRefuse, setAccesRefuse] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    setAccesRefuse(false);
    try {
      // La courbe de croissance est un ornement ; les compteurs sont le
      // travail. Son échec ne doit pas emporter la page — d'où le `catch`
      // local plutôt qu'un `Promise.all` où le premier refus annule tout.
      const [s, c] = await Promise.all([
        statsPlateforme(),
        // Échec de la courbe : la page reste, mais la panne est SIGNALÉE et
        // montrée comme telle — elle s'affichait « aucune inscription », une
        // absence de données là où il y avait une erreur.
        croissanceInscriptions(6).catch((err) => {
          reporter(err, { source: 'PlateformeDashboard.croissance' });
          return undefined;
        }),
      ]);
      setStats(s);
      setCroissanceEnErreur(c === undefined);
      setCroissance(c?.croissance || []);
    } catch (err) {
      // Le 403 n'est PAS une panne : c'est un compte qui n'a pas ce droit.
      // Les deux méritent des mots différents, sans quoi on cherche une panne
      // là où il n'y a qu'une question d'habilitation.
      setAccesRefuse(err?.response?.status === 403);
      setErreur(getErrorMessage(err));
      SwalCustom.error({ title: t('superAdmin.erreurStats'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 50 }}>{t('etats.chargement')}</div></div>;
  // L'écran d'accueil du super-admin ne peut pas se contenter de disparaître.
  // Il rendait `null` : une alerte passait, puis plus rien — ni cause, ni
  // moyen de réessayer.
  if (accesRefuse) {
    return <ErrorState variante="droits" titre={t('superAdmin.accesRefuse')} message={erreur} />;
  }
  if (erreur || !stats) {
    return <ErrorState message={erreur || t('superAdmin.erreurStats')} onRetry={load} />;
  }

  const maxAbonnement = Math.max(1, ...Object.values(stats.parAbonnement || {}));
  const maxCroissance = Math.max(1, ...croissance.map((c) => c.inscriptions));

  const aValider = stats.aValider || {};
  const rejetes = stats.rejetes || {};
  const rienAFaire = !aValider.inscriptions && !aValider.chantiers && !aValider.plans;

  return (
    <>
      <PageHeader title={t('superAdmin.titre')} subtitle={t('superAdmin.sousTitre')}>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} /> {t('actions.actualiser')}</button>
      </PageHeader>

      {/* ── Ce qui attend une décision ────────────────────────────────────
          En PREMIER, et avant les volumes. Ce compte ne crée ni chantier ni
          réserve : son travail est de trancher des demandes, et des gens
          attendent la réponse à l'autre bout. Un écran qui ouvrait sur le
          nombre total d'organisations décrivait l'ampleur du parc, jamais le
          travail du jour. */}
      <section className="bloc-attente">
        <h2 className="bloc-attente-titre">
          {t('superAdmin.attente.titre')}
          {rienAFaire && <span className="bloc-attente-calme">{t('superAdmin.attente.rienAFaire')}</span>}
        </h2>

        <div className="grille-attente">
          <CarteAttente
            icone={UserCheck}
            ton="blue"
            libelle={t('superAdmin.attente.inscriptions')}
            valeur={aValider.inscriptions}
            vers="/plateforme/demandes"
          />
          <CarteAttente
            icone={ClipboardCheck}
            ton="orange"
            libelle={t('superAdmin.attente.chantiers')}
            valeur={aValider.chantiers}
            vers="/chantiers/demandes"
          />
          {/* Les plans se vérifient DANS la demande à laquelle ils sont
              joints, pas dans une liste à part : c'est en regardant le
              chantier qu'on juge si les documents sont complets. Le raccourci
              mène donc là, et l'aide le dit. */}
          <CarteAttente
            icone={Paperclip}
            ton="navy"
            libelle={t('superAdmin.attente.plans')}
            aide={t('superAdmin.attente.plansAide')}
            valeur={aValider.plans}
            vers="/chantiers/demandes"
          />
        </div>
      </section>

      {/* ── Décisions déjà rendues ────────────────────────────────────────
          Un journal de ce qui a été tranché : utile pour se relire, mais rien
          n'y attend d'action — d'où une présentation plus discrète. */}
      <div className="stat-grid">
        <StatCard icon={CheckCircle2} label={t('superAdmin.stats.chantiersActifs')} value={stats.chantiersActifs} tone="green" />
        <StatCard icon={XCircle} label={t('superAdmin.stats.chantiersRejetes')} value={rejetes.chantiers || 0} tone="red" />
        <StatCard icon={XCircle} label={t('superAdmin.stats.inscriptionsRejetees')} value={rejetes.inscriptions || 0} tone="orange" />
      </div>

      {/* ── Volume du parc ────────────────────────────────────────────────── */}
      <h2 className="section-titre">{t('superAdmin.parc')}</h2>
      <div className="stat-grid">
        <StatCard icon={Building2} label={t('superAdmin.stats.organisations')} value={stats.organisations} tone="navy" />
        <StatCard icon={Users} label={t('superAdmin.stats.utilisateurs')} value={stats.utilisateurs} tone="blue" />
        <StatCard icon={HardHat} label={t('superAdmin.stats.chantiers')} value={stats.chantiers} tone="green" />
        <StatCard icon={AlertTriangle} label={t('superAdmin.stats.reserves')} value={stats.reserves} tone="orange" />
        <StatCard icon={AlertTriangle} label={t('superAdmin.stats.reservesOuvertes')} value={stats.reservesOuvertes} tone="red" />
      </div>

      <div className="grid-2-panel">
        <div className="card">
          <div className="card-header"><h2>{t('superAdmin.orgParAbonnement')}</h2></div>
          <div className="card-body">
            {Object.entries(stats.parAbonnement || {}).length === 0 && <p className="text-muted">{t('superAdmin.aucuneDonnee')}</p>}
            {/* Les clés viennent de la BASE (`organisation.abonnement`) : ce
                sont les codes réels du catalogue. La table locale qu'on
                interrogeait ici listait « Starter / Business / Enterprise »,
                qui n'existent pas — elle ne répondait donc jamais, et le code
                brut s'affichait déjà. On l'affiche maintenant franchement. */}
            {Object.entries(stats.parAbonnement || {}).map(([key, n]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span>{enumLabel(key, key)}</span><strong>{n}</strong>
                </div>
                <div style={{ height: 9, background: '#eef1f4', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${(n / maxAbonnement) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2><TrendingUp size={17} style={{ verticalAlign: -3 }} /> {t('superAdmin.croissance')}</h2></div>
          <div className="card-body">
            {croissanceEnErreur ? <ErrorState message={t('superAdmin.erreurStats')} onRetry={load} />
              : croissance.length === 0 ? <p className="text-muted">{t('superAdmin.aucuneInscription')}</p> : (
              <div className="bar-chart">
                {croissance.map((c) => (
                  <div key={c.mois} className="bar-col">
                    <div className="bar-track">
                      <div className="bar-fill" style={{ height: `${(c.inscriptions / maxCroissance) * 100}%` }} />
                    </div>
                    <span className="bar-label">{c.mois}</span>
                    <strong className="bar-value">{c.inscriptions}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header"><h2>{t('superAdmin.reservesParStatut')}</h2></div>
        <div className="card-body">
          <div className="kv-list" style={{ columns: 2 }}>
            {Object.entries(stats.reservesParStatut || {}).map(([statut, n]) => (
              <div key={statut} className="kv-item">
                <span className="k">{enumLabel(statut, statut.replace(/_/g, ' '))}</span>
                <span className="v">{formatNombre(n)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
