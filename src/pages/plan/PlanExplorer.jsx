import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ChevronRight, Layers, Map, Maximize2, MapPin, Minimize2,
  MousePointerClick, SquareArrowOutUpRight, User,
} from 'lucide-react';

import PlanCanvas from '../../components/plan/PlanCanvas.jsx';
import PlanVignette from '../../components/plan/PlanVignette.jsx';
import NouvelleReserveModal from '../../components/plan/NouvelleReserveModal.jsx';
import { couleurSeverite } from '../../components/plan/severiteCouleurs.js';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Spinner from '../../components/Spinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useUser } from '../../context/useUser.js';
import {
  fetchFichierBlob, getPlan, listerPlansRacines, listerSousPlans,
} from '../../service/plan/planService.js';
import { listerPartenairesChantier } from '../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate } from '../../utils/format.js';
import { ROLES_RESERVE_INTERVENANTS, SEVERITES, enumLabel, peutGerer } from '../../utils/constants.js';
import '../../assets/css/plan-explorer.css';

/**
 * Parcours des plans d'un chantier, UN NIVEAU À LA FOIS — jumeau web de
 * l'écran `PlanExplorerPage` du mobile.
 *
 * ## Ce que cet écran apporte au web
 *
 * Le portail savait déjà descendre la STRUCTURE d'un chantier (bâtiment →
 * étage → appartement) : c'est `PlanNavigateur`, dans l'onglet Plans. Il ne
 * savait pas descendre l'ARBORESCENCE DES PLANS eux-mêmes (`plans.parent_id`),
 * qui est pourtant le parcours quotidien du relevé sur mobile : on ouvre un
 * plan, on descend dans ses plans de détail, et on pose la réserve à l'endroit
 * exact du défaut.
 *
 * Les deux parcours coexistent parce qu'ils répondent à deux questions
 * différentes — « dans quel appartement ? » d'un côté, « sur quel plan ? » de
 * l'autre. Un chantier dont la structure n'est pas saisie reste entièrement
 * navigable par celui-ci ; c'est d'ailleurs le cas d'une entreprise qui vient
 * de déposer ses plans avec sa demande.
 *
 * ## Le parcours
 *
 * ```
 * chantier → plans globaux → sous-plans directs → sous-plans directs → …
 *                                                        ↓
 *                                          image réelle + réserves posées
 *                                                        ↓
 *                                    clic sur une zone libre → réserve
 * ```
 *
 * À CHAQUE niveau, seuls les enfants DIRECTS du plan ouvert sont affichés.
 * C'est le serveur qui borne la descente (`/chantiers/:id/plans/racines` puis
 * `/plans/:id/sous-plans`), pas un filtre local : le client ne connaît jamais
 * plus d'un cran d'arborescence, quelle que soit la taille du chantier.
 *
 * ## Les trois gestes, distincts
 *
 *  - cliquer une TUILE de sous-plan → descendre d'un cran ;
 *  - cliquer un REPÈRE sur le plan → consulter la réserve ;
 *  - cliquer une ZONE LIBRE du plan → créer une réserve à cet endroit exact.
 *
 * Ils ne se recouvrent jamais : `PlanCanvas` arrête le clic sur une pastille
 * avant qu'il n'atteigne l'image, et ne remonte un point qu'en mode pointage.
 */

/** Vrai tant que le plan attend la validation de sa demande de chantier. */
const enAttenteValidation = (plan) => plan?.statut === 'en_attente_validation';

/** Nombre de sous-plans directs, tel que compté par le serveur. */
const nombreSousPlans = (plan) => Number(plan?.nombre_sous_plans ?? 0) || 0;

/** Nombre de réserves posées sur ce plan, tel que compté par le serveur. */
const nombreReserves = (plan) => Number(plan?.nombre_reserves ?? 0) || 0;

/** Page d'un repère — `1` pour les réserves posées avant que la page n'existe. */
const pageDe = (position) => Number(position?.page) || 1;

/* ═════════════════════════════ TUILE DE PLAN ═════════════════════════════ */

/**
 * Une tuile de plan : l'aperçu RÉEL du document, son nom, et ce qu'il porte.
 *
 * L'aperçu est le point du correctif hérité du mobile : une liste de noms de
 * fichiers oblige à ouvrir chaque plan pour savoir lequel on regarde. Sur un
 * chantier de trente appartements presque homonymes, c'est la différence entre
 * reconnaître un plan d'un coup d'œil et les ouvrir un par un.
 */
function TuilePlan({ plan, onOuvrir }) {
  const { t } = useTranslation('chantier');

  // Ce que la tuile ANNONCE : où elle mène, et ce qu'elle porte. Les deux
  // compteurs viennent du serveur — le client ne voit qu'un cran
  // d'arborescence et ne pourrait pas les déduire.
  const meta = [
    nombreSousPlans(plan) > 0 && t('explorateur.nSousPlans', { count: nombreSousPlans(plan) }),
    nombreReserves(plan) > 0 && t('explorateur.nReserves', { count: nombreReserves(plan) }),
    plan.version > 1 && `v${plan.version}`,
  ].filter(Boolean).join(' · ');

  // `div role="button"` et non `<button>` : la tuile contient l'aperçu du plan,
  // que `PlanVignette` rend dans un `<div>` — un bouton n'accepte que du
  // contenu de phrasé, et l'imbrication produit un document invalide que les
  // navigateurs réparent en sortant l'aperçu de la tuile. Le clavier est
  // reproduit à la main, faute de quoi la tuile ne serait atteignable qu'à la
  // souris.
  const ouvrir = () => onOuvrir(plan);

  return (
    <div
      className="pexp-tuile"
      role="button"
      tabIndex={0}
      onClick={ouvrir}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();   // Espace ferait défiler la page
        ouvrir();
      }}
    >
      <PlanVignette plan={plan} className="pexp-tuile-apercu" Icone={Map} tailleIcone={22} />

      <span className="pexp-tuile-corps">
        <span className="pexp-tuile-nom">{plan.nom}</span>
        <span className="pexp-tuile-meta">{meta || t('explorateur.aucunSousPlan')}</span>
        {enAttenteValidation(plan) && (
          <span className="pexp-tuile-attente">{t('explorateur.enAttenteValidation')}</span>
        )}
      </span>

      <ChevronRight size={18} className="pexp-tuile-chevron" aria-hidden="true" />
    </div>
  );
}

/* ═══════════════════════════ FICHE D'UNE RÉSERVE ═══════════════════════════ */

/**
 * Ce que montre un clic sur un repère : la réserve telle qu'elle a été saisie.
 *
 * Volontairement une fiche COURTE, pas la page complète. Au moment où l'on
 * pointe un repère sur un plan, la question est « qu'est-ce que c'est, et est-ce
 * déjà traité ? » — pas « ouvrons le dossier ». Le lien vers la fiche entière
 * reste en bas, pour ceux qui veulent la suite (commentaires, affectations,
 * historique).
 *
 * Les champs affichés sont exactement ceux que sert `GET /plans/:id` : le
 * serveur en joint juste assez pour cette fiche, et pas une colonne de plus
 * (voir `plan.service.js#getPlan`).
 */
function FicheReserve({ reserve, onClose }) {
  const { t } = useTranslation('chantier');
  if (!reserve) return null;

  const auteur = reserve.createur
    ? `${reserve.createur.prenom ?? ''} ${reserve.createur.nom ?? ''}`.trim()
    : null;
  const apercu = reserve.medias?.[0]?.thumbnail_url || reserve.medias?.[0]?.url;

  return (
    <Modal
      open
      onClose={onClose}
      title={`${reserve.numero ? `${reserve.numero} · ` : ''}${reserve.titre}`}
      size="sm"
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('actions.fermer')}</button>
          <Link className="btn btn-primary" to={`/reserves/${reserve.id}`}>
            <SquareArrowOutUpRight size={14} /> {t('explorateur.ouvrirFiche')}
          </Link>
        </>
      )}
    >
      <div className="pexp-fiche-badges">
        <Badge statusKey={reserve.statut} />
        <Badge tone={SEVERITES[reserve.severite]?.tone || 'neutral'}>
          {enumLabel(reserve.severite, SEVERITES[reserve.severite]?.label)}
        </Badge>
      </div>

      {apercu && <img className="pexp-fiche-photo" src={apercu} alt="" />}

      <p className="pexp-fiche-observation">
        {reserve.description || t('explorateur.sansObservation')}
      </p>

      <dl className="pexp-fiche-infos">
        {auteur && (
          <div>
            <dt><User size={13} aria-hidden="true" /> {t('explorateur.releveePar')}</dt>
            <dd>{auteur}</dd>
          </div>
        )}
        {reserve.createdAt && (
          <div>
            <dt>{t('explorateur.releveeLe')}</dt>
            <dd>{formatDate(reserve.createdAt)}</dd>
          </div>
        )}
        {reserve.date_limite && (
          <div>
            <dt>{t('explorateur.echeance')}</dt>
            <dd>{formatDate(reserve.date_limite)}</dd>
          </div>
        )}
        {reserve.position && (
          <div>
            <dt><MapPin size={13} aria-hidden="true" /> {t('explorateur.pointPose')}</dt>
            <dd>
              {`x ${reserve.position.x} · y ${reserve.position.y}`}
              {pageDe(reserve.position) > 1
                && ` · ${t('explorateur.page', { n: pageDe(reserve.position) })}`}
            </dd>
          </div>
        )}
      </dl>
    </Modal>
  );
}

/* ══════════════════════════════ PLAN OUVERT ══════════════════════════════ */

/**
 * Un plan ouvert : son IMAGE RÉELLE, ses sous-plans et ses réserves.
 *
 * L'image reste affichée MÊME quand le plan a des sous-plans : c'est ce qui
 * distingue « naviguer » de « consulter ». Un plan de bâtiment se regarde
 * aussi, et on peut vouloir y poser une réserve sans descendre jusqu'à
 * l'appartement.
 */
function VuePlanOuvert({
  plan, chantierId, cheminLisible, sousPlans, entreprises,
  pointageAutorise, onOuvrirSousPlan, onReserveCreee,
}) {
  const { t } = useTranslation('chantier');

  const [blob, setBlob] = useState(null);
  const [erreurImage, setErreurImage] = useState(null);
  const [page, setPage] = useState(1);
  const [nbPages, setNbPages] = useState(1);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [reserveOuverte, setReserveOuverte] = useState(null);
  // Le point que l'utilisateur vient de désigner, tant que le formulaire est
  // ouvert. Sans lui on remplit le formulaire sans plus voir OÙ la réserve va
  // se poser, alors que c'est la seule question qui compte à cet instant :
  // « est-ce bien là que j'ai visé ? »
  const [pointProvisoire, setPointProvisoire] = useState(null);

  // Le plan peut-il recevoir une réserve ? Le rôle ET un plan qui n'attend pas
  // sa validation — le serveur refuse toute réserve sur un plan en attente
  // (`reserve.service.js#_verifierLocalisation`). Un seul point de vérité : le
  // bandeau et le clic sur l'image lisent la même condition, faute de quoi
  // l'un peut rester actif quand l'autre a disparu.
  const peutPointer = pointageAutorise && !enAttenteValidation(plan);

  /* ---------- Fichier du plan ---------- */
  useEffect(() => {
    let vivant = true;
    setBlob(null);
    setErreurImage(null);
    setPage(1);

    // On télécharge TOUJOURS, quel que soit `plan.format` : ce champ vaut
    // 'pdf' par défaut côté serveur pour tout dépôt sans format explicite,
    // alors que png, jpg et webp sont acceptés. C'est `PlanCanvas` qui décide,
    // sur les OCTETS reçus, s'il sait afficher le fichier.
    fetchFichierBlob(plan.fichier_url)
      .then((b) => { if (vivant) setBlob(b); })
      .catch((err) => { if (vivant) setErreurImage(getErrorMessage(err)); });

    return () => { vivant = false; };
  }, [plan.id, plan.fichier_url]);

  /* ---------- Repères posés sur la PAGE affichée ---------- */
  //
  // Le filtre par page est indispensable sur un PDF multi-pages : sans lui, les
  // repères de la page 7 se dessinaient sur la page 1, chacun à ses bonnes
  // coordonnées mais sur la mauvaise feuille. Un repère faux envoie constater un
  // défaut là où il n'y en a pas — c'est pire qu'un repère absent.
  const marqueurs = useMemo(() => {
    const poses = (plan.reserves || [])
      .filter((r) => r.position && pageDe(r.position) === page)
      .map((r) => ({
        id: r.id,
        x: r.position.x,
        y: r.position.y,
        couleur: couleurSeverite(r.severite),
        libelle: `${r.numero ? `${r.numero} — ` : ''}${r.titre}`,
        actif: r.id === reserveOuverte?.id,
      }));

    // Le point provisoire porte l'identifiant réservé `__provisoire` : il
    // n'existe qu'à l'écran, ne correspond à aucune réserve, et disparaît que
    // le formulaire aboutisse ou non.
    if (pointProvisoire) {
      poses.push({
        id: '__provisoire',
        x: pointProvisoire.x,
        y: pointProvisoire.y,
        couleur: 'var(--primary)',
        libelle: t('explorateur.pointProvisoire'),
        actif: true,
      });
    }
    return poses;
  }, [plan.reserves, page, reserveOuverte, pointProvisoire, t]);

  /* ---------- Gestes ---------- */
  // Posé AVANT l'ouverture de la fenêtre : le repère doit être à l'écran au
  // moment où elle monte, pas après.
  const ouvrirFormulaire = (x, y) => setPointProvisoire({ x, y });

  // Retiré dans tous les cas : la réserve créée revient par le rechargement,
  // avec son identifiant et sa vraie couleur. L'abandon, lui, ne doit rien
  // laisser derrière.
  const fermerFormulaire = () => setPointProvisoire(null);

  const apresCreation = async () => {
    setPointProvisoire(null);
    // Le nouveau repère doit apparaître IMMÉDIATEMENT, sur CE plan, sans
    // refaire le parcours : c'est tout l'intérêt de poser la réserve depuis le
    // plan.
    await onReserveCreee();
  };

  // Les réserves SANS position figurent aussi : elles existent sur ce plan,
  // simplement sans repère. Les masquer les rendrait introuvables depuis
  // l'écran qui porte pourtant leur plan.
  const reservesDeLaPage = (plan.reserves || []).filter(
    (r) => !r.position || pageDe(r.position) === page,
  );

  return (
    <div className={`pexp-ouvert ${pleinEcran ? 'plein-ecran' : ''}`}>
      {/* ---------- Bandeau d'aide et outils ---------- */}
      <div className={`pexp-aide ${peutPointer ? 'active' : ''}`}>
        {peutPointer ? (
          <>
            <MousePointerClick size={15} aria-hidden="true" />
            <span>{t('explorateur.aideCliquer')}</span>
          </>
        ) : (
          <span>
            {enAttenteValidation(plan)
              ? t('explorateur.enAttenteValidation')
              : t('explorateur.aideLectureSeule')}
          </span>
        )}

        <span className="pexp-aide-outils">
          {nbPages > 1 && (
            <span className="pexp-pagination">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t('explorateur.pagePrecedente')}
              >
                &lsaquo;
              </button>
              <span>{t('explorateur.pageSurTotal', { page, total: nbPages })}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= nbPages}
                onClick={() => setPage((p) => Math.min(nbPages, p + 1))}
                aria-label={t('explorateur.pageSuivante')}
              >
                &rsaquo;
              </button>
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPleinEcran((v) => !v)}
          >
            {pleinEcran ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {pleinEcran ? t('explorateur.reduire') : t('explorateur.pleinEcran')}
          </button>
        </span>
      </div>

      {/* ---------- Le plan ---------- */}
      {erreurImage
        ? <ErrorState message={erreurImage} titre={t('plans.erreurAffichage')} />
        : (
          <PlanCanvas
            blob={blob}
            format={plan.format}
            page={page}
            marqueurs={marqueurs}
            mode={peutPointer ? 'pointage' : 'lecture'}
            hauteur={pleinEcran ? '78vh' : 560}
            onPagesConnues={setNbPages}
            onPointClique={ouvrirFormulaire}
            onMarqueurClique={(m) => {
              if (m.id === '__provisoire') return;
              setReserveOuverte((plan.reserves || []).find((r) => r.id === m.id) || null);
            }}
          />
        )}

      {/* ---------- Sous-plans et réserves ---------- */}
      {!pleinEcran && (
        <div className="pexp-panneau">
          {sousPlans.length > 0 && (
            <section>
              <h3 className="pexp-section-titre">
                {t('explorateur.sousPlans', { count: sousPlans.length })}
              </h3>
              <div className="pexp-grille">
                {sousPlans.map((sp) => (
                  <TuilePlan key={sp.id} plan={sp} onOuvrir={onOuvrirSousPlan} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="pexp-section-titre">
              {t('plans.reservesSurPlan', { n: reservesDeLaPage.length })}
            </h3>
            {reservesDeLaPage.length === 0
              ? <p className="text-muted" style={{ fontSize: 13 }}>{t('plans.aucuneReserveSurPlan')}</p>
              : (
                <ul className="pexp-reserves">
                  {reservesDeLaPage.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setReserveOuverte(r)}>
                        <span
                          className="pexp-puce"
                          style={{ background: couleurSeverite(r.severite) }}
                          aria-hidden="true"
                        />
                        <span className="pexp-reserve-nom">
                          {r.numero ? `${r.numero} — ` : ''}{r.titre}
                        </span>
                        <Badge statusKey={r.statut} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </div>
      )}

      {/* ---------- Fenêtres ---------- */}
      <NouvelleReserveModal
        open={!!pointProvisoire}
        onClose={fermerFormulaire}
        chantierId={chantierId}
        /* Bâtiment, étage et zone ne sont PAS envoyés : le serveur les déduit
           du plan (`reserve.service.js#_heriterLocalisationDuPlan`). Les
           renvoyer d'ici ne ferait que risquer de le contredire — le plan est
           la source de vérité de sa propre localisation. */
        localisation={{ plan, chemin: cheminLisible }}
        position={pointProvisoire ? { ...pointProvisoire, page } : null}
        entreprises={entreprises}
        onCreee={apresCreation}
      />

      <FicheReserve reserve={reserveOuverte} onClose={() => setReserveOuverte(null)} />
    </div>
  );
}

/* ═══════════════════════════════ L'ÉCRAN ═══════════════════════════════ */

export default function PlanExplorer() {
  const { t } = useTranslation('chantier');
  const { chantierId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const chantierNom = params.get('nom') || '';
  const planIdInitial = params.get('planId');

  /** Chemin descendu depuis le chantier. Vide = plans globaux. */
  const [chemin, setChemin] = useState([]);
  /** Les plans du niveau COURANT — jamais plus d'un cran. */
  const [niveau, setNiveau] = useState([]);
  /** Détail du plan ouvert : son image et ses réserves positionnées. */
  const [detail, setDetail] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const planOuvert = chemin.length ? chemin[chemin.length - 1] : null;

  // Le serveur réserve la pose d'une réserve aux rôles RESERVE_INTERVENANTS :
  // rendre le plan actif pour les autres promettrait un 403 après saisie.
  const peutCreerReserve = peutGerer(user?.role, ROLES_RESERVE_INTERVENANTS);

  /* ---------- Entreprises proposées dans « Nouvelle réserve » ---------- */
  //
  // Un échec ici ne doit pas empêcher de créer la réserve : la liste reste vide
  // et le champ, qui est facultatif, le reste aussi.
  useEffect(() => {
    let vivant = true;
    listerPartenairesChantier(chantierId)
      .then((d) => { if (vivant) setEntreprises(d.items || []); })
      .catch(() => { /* champ entreprise laissé vide */ });
    return () => { vivant = false; };
  }, [chantierId]);

  /* ---------- Chargement d'un niveau ---------- */
  //
  // Deux requêtes au plus, et seulement celles qui servent : à la racine la
  // liste des plans globaux ; sur un plan ouvert son détail (image + réserves)
  // et — SI le compteur du serveur annonce des enfants — ses sous-plans. Le
  // compteur évite une requête sur la feuille de l'arborescence, qui est le cas
  // le plus fréquent : la très grande majorité des plans n'a pas de sous-plan.
  const chargerNiveau = useCallback(async (ouvert) => {
    setChargement(true);
    setErreur(null);
    try {
      if (!ouvert) {
        const d = await listerPlansRacines(chantierId);
        setNiveau(d.items || []);
        setDetail(null);
        return;
      }

      // Un échec du DÉTAIL est bloquant : sans image ni réserves il n'y a rien
      // à montrer de ce plan, et rien sur quoi cliquer.
      const complet = await getPlan(ouvert.id);
      setDetail(complet);

      let enfants = [];
      if (nombreSousPlans(complet) > 0 || nombreSousPlans(ouvert) > 0) {
        try {
          const d = await listerSousPlans(ouvert.id);
          enfants = d.items || [];
        } catch {
          // Non bloquant : le plan reste consultable et on peut toujours y
          // poser une réserve. Seule la descente est perdue.
        }
      }
      setNiveau(enfants);
    } catch (err) {
      setErreur(getErrorMessage(err));
    } finally {
      setChargement(false);
    }
  }, [chantierId]);

  /* ---------- Point d'entrée ---------- */
  //
  // `planId` en query place l'explorateur DIRECTEMENT sur un plan, au lieu de
  // partir des plans globaux : c'est ce dont a besoin la vue « Tous les plans »,
  // où l'on clique un plan précis et où l'on doit arriver dessus, pas au sommet
  // d'une arborescence qu'il faudrait redescendre.
  //
  // Plan introuvable (supprimé entre-temps, identifiant erroné) : on retombe
  // sur les plans globaux plutôt que sur une page d'erreur. L'utilisateur
  // voulait voir des plans, il en voit.
  //
  // La garde retient la VALEUR déjà amorcée, et non un simple booléen : sur
  // cette route, arriver sur un autre plan ne remonte pas le composant — seuls
  // les paramètres d'URL changent. Un booléen aurait laissé l'écran sur le plan
  // précédent, sans rien recharger et sans rien dire.
  const amorce = useRef(null);
  useEffect(() => {
    const cle = planIdInitial || '__racines';
    if (amorce.current === cle) return;
    amorce.current = cle;
    setChemin([]);

    if (!planIdInitial) {
      chargerNiveau(null);
      return;
    }
    getPlan(planIdInitial)
      .then((p) => {
        if (!p) return chargerNiveau(null);
        setChemin([p]);
        return chargerNiveau(p);
      })
      .catch(() => chargerNiveau(null));
  }, [planIdInitial, chargerNiveau]);

  /* ---------- Descendre / remonter ---------- */
  const ouvrir = (plan) => {
    // Vidés AVANT le chargement : sans cela le niveau précédent reste à l'écran
    // le temps de la requête, et l'on voit brièvement les sous-plans du plan que
    // l'on vient de quitter.
    setChemin((c) => [...c, plan]);
    setNiveau([]);
    setDetail(null);
    chargerNiveau(plan);
  };

  const remonter = () => {
    if (chemin.length === 0) {
      navigate(chantierId ? `/chantiers/${chantierId}?tab=plans` : '/plans');
      return;
    }
    const suivant = chemin.slice(0, -1);
    setChemin(suivant);
    setNiveau([]);
    setDetail(null);
    chargerNiveau(suivant.length ? suivant[suivant.length - 1] : null);
  };

  /**
   * Recharge le DÉTAIL seul — après la création d'une réserve.
   *
   * Pas `chargerNiveau` : celui-ci repasse par l'écran de chargement et ferait
   * disparaître le plan une seconde, juste après le geste. Ici, seuls les
   * repères changent.
   */
  const rechargerReserves = useCallback(async () => {
    if (!planOuvert) return;
    try {
      setDetail(await getPlan(planOuvert.id));
    } catch { /* le plan reste affiché tel quel */ }
  }, [planOuvert]);

  /* ---------- Fil d'Ariane ---------- */
  const cheminLisible = [chantierNom, ...chemin.map((p) => p.nom)].filter(Boolean).join(' › ');
  const titre = planOuvert?.nom || chantierNom || t('explorateur.plansGlobaux');
  // Le chantier puis tous les plans traversés SAUF le dernier, que le titre
  // affiche déjà juste au-dessus.
  const fil = [chantierNom, ...chemin.map((p) => p.nom)].filter(Boolean);
  const sousTitre = (fil.length > 1 ? fil.slice(0, -1) : fil).join(' › ');

  return (
    <div className="pexp">
      <div className="pexp-bandeau">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={remonter}
          aria-label={t('actions.retour')}
        >
          <ArrowLeft size={17} />
        </button>
        <span className="pexp-bandeau-icone"><Map size={18} /></span>
        <span className="pexp-bandeau-textes">
          <strong>{titre}</strong>
          {sousTitre && <span>{sousTitre}</span>}
        </span>
        {planOuvert?.version > 1 && <Badge tone="info"><Layers size={11} /> {`v${planOuvert.version}`}</Badge>}
      </div>

      {chargement && <Spinner label={t('plans.chargementPlan')} />}

      {!chargement && erreur && (
        <ErrorState message={erreur} onRetry={() => chargerNiveau(planOuvert)} />
      )}

      {!chargement && !erreur && !planOuvert && (
        niveau.length === 0
          ? (
            <EmptyState
              icon={Map}
              title={t('plans.videTitre')}
              message={t('plans.aucunPlanGlobal')}
            />
          )
          : (
            <>
              <h2 className="pexp-section-titre">{t('explorateur.plansGlobaux')}</h2>
              <div className="pexp-grille">
                {niveau.map((p) => <TuilePlan key={p.id} plan={p} onOuvrir={ouvrir} />)}
              </div>
            </>
          )
      )}

      {!chargement && !erreur && planOuvert && (
        <VuePlanOuvert
          /* La clé force un état neuf à chaque changement de plan : sans elle,
             le blob et le zoom du plan précédent survivaient un rendu sur le
             suivant. */
          key={planOuvert.id}
          plan={detail || planOuvert}
          chantierId={chantierId}
          cheminLisible={cheminLisible}
          sousPlans={niveau}
          entreprises={entreprises}
          pointageAutorise={peutCreerReserve}
          onOuvrirSousPlan={ouvrir}
          onReserveCreee={rechargerReserves}
        />
      )}
    </div>
  );
}
