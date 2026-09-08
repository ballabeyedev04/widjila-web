import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, ArrowLeft, FileText, Layers, Building2, Eye } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Textarea } from '../../components/FormControls.jsx';
import PlanCanvas from '../../components/plan/PlanCanvas.jsx';
import { getChantier, validerChantier, rejeterChantier } from '../../service/chantier/chantierService.js';
import { listerPlans, fetchFichierBlob } from '../../service/plan/planService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Longueur minimale du motif — même seuil que le schéma Joi du backend.
 * Les deux doivent bouger ensemble.
 */
const MOTIF_MIN = 10;

/** Style du sur-titre d'une section de plans. */
const SOUS_TITRE = {
  fontSize: 11.5,
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

/**
 * Une seule ligne par plan : sa version COURANTE.
 *
 * `GET /chantiers/:id/plans` renvoie TOUTES les révisions, à plat, triées
 * `nom ASC, version DESC` (plan.service.js#listPlans). Les afficher toutes
 * donnerait au valideur le même plan trois fois sans qu'il sache lequel fait
 * foi. On applique donc ici la règle que le serveur applique déjà ailleurs
 * (`_derniereVersion`) : `is_current` quand il est renseigné, sinon la première
 * occurrence de chaque nom — c'est-à-dire la version la plus haute, puisque le
 * tri la place en tête.
 *
 * Dédoublonner sur le NOM est exact et non approximatif : l'index unique
 * `plans_chantier_nom_version_unique` fait du couple (chantier, nom) l'identité
 * d'une lignée de plan. Deux plans de même nom dans un chantier sont deux
 * révisions du même document, jamais deux documents distincts.
 */
function derniereVersion(plans) {
  const courants = plans.filter((p) => p.is_current === true);
  const source = courants.length > 0 ? courants : plans;

  const vus = new Set();
  return source.filter((p) => {
    if (vus.has(p.nom)) return false;
    vus.add(p.nom);
    return true;
  });
}

/** Les trois sections, dans l'ordre PHYSIQUE : du sous-sol vers le ciel. */
const SECTIONS = [
  { type: 'sous_sol', cle: 'sousSols' },
  { type: 'etage', cle: 'etages' },
  { type: 'toiture', cle: 'toiture' },
];

/**
 * Examen d'une demande de chantier.
 *
 * Les plans y sont présentés par SECTIONS, comme sur mobile — SOUS-SOLS,
 * ÉTAGES, TOITURE — pour qu'un valideur retrouve exactement ce que
 * l'entreprise a déposé, dans le même ordre.
 *
 * On peut ouvrir chaque plan pour l'examiner, mais PAS y créer de réserve :
 * `PlanCanvas` est monté en mode lecture, sans `onPointClique`. Le serveur
 * refuse de toute façon toute réserve sur un plan en attente — l'interface ne
 * fait que ne pas promettre ce qui sera refusé.
 */
export default function DemandeChantierDetail() {
  const { t } = useTranslation('chantier');
  const { id } = useParams();
  const navigate = useNavigate();

  const [chantier, setChantier] = useState(null);
  const [plans, setPlans] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [planOuvert, setPlanOuvert] = useState(null);
  const [aValider, setAValider] = useState(false);
  const [aRejeter, setARejeter] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      // Les deux en parallèle : ni l'un ni l'autre ne dépend de l'autre.
      const [c, p] = await Promise.all([getChantier(id), listerPlans(id)]);
      setChantier(c);
      setPlans(p || []);
    } catch (err) {
      setErreur(getErrorMessage(err));
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => { charger(); }, [charger]);

  /**
   * Le classement des plans déposés — et la garantie qu'AUCUN n'est perdu.
   *
   * L'écran ne retenait qu'UN plan par niveau (`plans.find`) et ignorait deux
   * familles entières :
   *
   *   - les plans rattachés à un BÂTIMENT (`batimentId` seul), qui ne sont ni
   *     globaux ni portés par un niveau ;
   *   - les plans de ZONE et les plans de DÉTAIL (`parentId`), déposés sous un
   *     autre plan.
   *
   * Le valideur lisait donc « Plan non fourni » sur un niveau qui en portait
   * deux, et validait un chantier sans avoir vu une partie de ce que
   * l'entreprise avait déposé.
   *
   * Le dernier seau — `autres` — existe pour que le défaut ne revienne pas :
   * tout plan qu'aucune section ne réclame y tombe. Un rattachement d'un
   * nouveau genre ajouté demain sera visible par défaut, au lieu de disparaître
   * en silence.
   */
  const classement = useMemo(() => {
    const courants = derniereVersion(plans);
    const places = new Set();

    /** Retire du lot les plans qui satisfont le prédicat — chacun une fois. */
    const prendre = (predicat) => {
      const lot = courants.filter((p) => !places.has(p.id) && predicat(p));
      lot.forEach((p) => places.add(p.id));
      return lot;
    };

    const globaux = prendre((p) => !p.batimentId && !p.etageId && !p.zoneId && !p.parentId);

    const parNiveau = new Map();
    const parBatiment = new Map();
    for (const batiment of chantier?.batiments || []) {
      // Les niveaux D'ABORD : un plan d'étage porte souvent aussi le bâtiment,
      // et sa place est sous son niveau, pas au-dessus.
      for (const niveau of batiment.etages || []) {
        parNiveau.set(niveau.id, prendre((p) => p.etageId === niveau.id));
      }
      parBatiment.set(
        batiment.id,
        prendre((p) => p.batimentId === batiment.id && !p.etageId && !p.zoneId)
      );
    }

    return { globaux, parNiveau, parBatiment, autres: courants.filter((p) => !places.has(p.id)) };
  }, [plans, chantier]);

  /**
   * Validation — après confirmation.
   *
   * Le bouton déclenchait l'appel au PREMIER clic. C'est le geste le plus lourd
   * de l'écran : le chantier devient actif et son demandeur reçoit un courriel,
   * sans retour en arrière. La liste des demandes, elle, confirmait déjà
   * (`DemandesChantier.jsx#ModalValider`) — et les libellés de cette modale
   * existaient ici aussi, dans les traductions, sans être utilisés. L'écran où
   * l'on EXAMINE le dossier était donc le moins prudent des deux.
   */
  const valider = async () => {
    setEnCours(true);
    try {
      await validerChantier(id);
      SwalCustom.success(t('demandes.valideeSucces'));
      navigate('/chantiers/demandes');
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setEnCours(false);
      setAValider(false);
    }
  };

  if (chargement) return <SkeletonListe lignes={6} />;
  if (erreur) return <ErrorState message={erreur} onRetry={charger} />;
  if (!chantier) return <ErrorState message={t('demandes.introuvable')} onRetry={charger} />;

  const enAttente = chantier.statut === 'en_attente_validation';

  return (
    <>
      <PageHeader
        title={chantier.nom}
        subtitle={t('demandes.detailSousTitre', { code: chantier.code || '—' })}
      >
        <Link to="/chantiers/demandes" className="btn btn-ghost">
          <ArrowLeft size={16} /> {t('demandes.retour')}
        </Link>
      </PageHeader>

      {/* ── Récapitulatif ────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Fiche libelle={t('demandes.colonnes.demandeur')}>
              {chantier.demandeur
                ? <>
                    <strong>{chantier.demandeur.prenom} {chantier.demandeur.nom}</strong>
                    <div className="text-muted" style={{ fontSize: 12 }}>{chantier.demandeur.email}</div>
                  </>
                : '—'}
            </Fiche>
            <Fiche libelle={t('demandes.colonnes.deposeeLe')}>{formatDate(chantier.createdAt)}</Fiche>
            <Fiche libelle={t('champs.statut')}><Badge statusKey={chantier.statut} /></Fiche>
            {chantier.adresse && <Fiche libelle={t('champs.adresse')}>{chantier.adresse}</Fiche>}
            {chantier.budget && <Fiche libelle={t('liste.budgetLabel')}>{chantier.budget}</Fiche>}
          </div>

          {chantier.description && (
            <p style={{ marginTop: 16, marginBottom: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {chantier.description}
            </p>
          )}

          {enAttente && (
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => setAValider(true)} disabled={enCours}>
                <Check size={16} /> {t('demandes.valider')}
              </button>
              <button
                className="btn btn-ghost btn-danger-hover"
                onClick={() => setARejeter(true)}
                disabled={enCours}
              >
                <X size={16} /> {t('demandes.rejeter')}
              </button>
            </div>
          )}

          {chantier.motif_rejet && (
            <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13, color: 'var(--danger)' }}>
              <strong>{t('demandes.modalRejeter.motifLabel')} :</strong> {chantier.motif_rejet}
            </p>
          )}
        </div>
      </div>

      {/* ── Plan global ──────────────────────────────────────────────── */}
      <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>{t('demandes.planGlobal')}</h3>
      {classement.globaux.length > 0 ? (
        classement.globaux.map((plan) => (
          <LignePlan key={plan.id} plan={plan} onOuvrir={() => setPlanOuvert(plan)} icone={FileText} />
        ))
      ) : (
        <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>{t('demandes.aucunPlanGlobal')}</p>
      )}

      {/* ── Bâtiments et sections ────────────────────────────────────── */}
      <h3 style={{ fontSize: 15, margin: '24px 0 10px' }}>{t('demandes.batiments')}</h3>
      {(chantier.batiments || []).length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t('demandes.aucunBatiment')}
          message={t('demandes.aucunBatimentMessage')}
        />
      ) : (
        chantier.batiments.map((batiment) => (
          <div className="card" key={batiment.id} style={{ marginBottom: 14 }}>
            <div className="card-body">
              <h4 style={{ margin: '0 0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={16} /> {batiment.nom}
              </h4>

              {/* Les plans du BÂTIMENT lui-même — façade, coupe, plan de masse.
                  Ils n'appartiennent à aucun niveau et n'apparaissaient nulle
                  part avant cette section. */}
              {(classement.parBatiment.get(batiment.id) || []).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={SOUS_TITRE}>{t('demandes.plansBatiment')}</div>
                  {classement.parBatiment.get(batiment.id).map((plan) => (
                    <LignePlan
                      key={plan.id}
                      plan={plan}
                      icone={FileText}
                      onOuvrir={() => setPlanOuvert(plan)}
                    />
                  ))}
                </div>
              )}

              {SECTIONS.map(({ type, cle }) => {
                // La nature du niveau vient du serveur. Les étages saisis
                // avant ce champ valent tous « etage » — ils apparaissent donc
                // dans la section ÉTAGES, ce qui est le comportement voulu.
                const niveaux = (batiment.etages || []).filter(
                  (e) => (e.typeNiveau || e.type_niveau || 'etage') === type
                );
                if (niveaux.length === 0) return null;

                return (
                  <div key={type} style={{ marginBottom: 14 }}>
                    <div style={SOUS_TITRE}>{t(`demandes.sections.${cle}`)}</div>
                    {niveaux.map((niveau) => {
                      const plansDuNiveau = classement.parNiveau.get(niveau.id) || [];

                      // Aucun plan : le niveau reste annoncé, avec la mention
                      // qui manque. Le valideur doit voir le TROU — une ligne
                      // absente passerait pour un oubli d'affichage.
                      if (plansDuNiveau.length === 0) {
                        return (
                          <LignePlan
                            key={niveau.id}
                            libelle={niveau.nom}
                            description={niveau.description}
                            icone={Layers}
                            messageSansPlan={t('demandes.niveauSansPlan')}
                          />
                        );
                      }

                      // Un niveau peut en porter plusieurs — architecture,
                      // électricité, plomberie. Une ligne chacun.
                      return plansDuNiveau.map((plan) => (
                        <LignePlan
                          key={plan.id}
                          plan={plan}
                          libelle={niveau.nom}
                          description={[niveau.description, plan.nom].filter(Boolean).join(' · ')}
                          icone={Layers}
                          onOuvrir={() => setPlanOuvert(plan)}
                        />
                      ));
                    })}
                  </div>
                );
              })}

              {(batiment.etages || []).length === 0 && (
                <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
                  {t('demandes.aucunNiveau')}
                </p>
              )}
            </div>
          </div>
        ))
      )}

      {/* Tout ce qu'aucune section n'a réclamé : plans de zone, plans de détail
          rattachés à un autre plan, plans dont le niveau a été supprimé depuis.
          Rien ne doit rester invisible à qui valide. */}
      {classement.autres.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, margin: '24px 0 6px' }}>{t('demandes.autresPlans')}</h3>
          <p className="text-muted" style={{ fontSize: 12.5, margin: '0 0 8px' }}>
            {t('demandes.autresPlansAide')}
          </p>
          {classement.autres.map((plan) => (
            <LignePlan key={plan.id} plan={plan} icone={FileText} onOuvrir={() => setPlanOuvert(plan)} />
          ))}
        </>
      )}

      <ApercuPlan plan={planOuvert} onClose={() => setPlanOuvert(null)} />
      <ModalValider
        ouvert={aValider}
        chantier={chantier}
        enCours={enCours}
        onClose={() => setAValider(false)}
        onConfirmer={valider}
      />
      <ModalRejeter
        ouvert={aRejeter}
        chantier={chantier}
        onClose={() => setARejeter(false)}
        onDone={() => navigate('/chantiers/demandes')}
      />
    </>
  );
}

function Fiche({ libelle, children }) {
  return (
    <div style={{ minWidth: 160 }}>
      <div className="text-muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {libelle}
      </div>
      <div style={{ marginTop: 4, fontSize: 14 }}>{children}</div>
    </div>
  );
}

/** Une ligne de plan — ouvrable, ou signalée comme manquante. */
function LignePlan({ plan, libelle, description, icone: Icone, onOuvrir, messageSansPlan }) {
  const { t } = useTranslation('chantier');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        border: '1px solid var(--border)',
        borderRadius: 10,
        marginBottom: 6,
      }}
    >
      <Icone size={16} style={{ color: plan ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {libelle || plan?.nom}
        </div>
        {description && (
          <div className="text-muted" style={{ fontSize: 12 }}>{description}</div>
        )}
        {!plan && messageSansPlan && (
          <div className="text-muted" style={{ fontSize: 12 }}>{messageSansPlan}</div>
        )}
      </div>
      {plan && (
        <button className="btn btn-sm btn-ghost" onClick={onOuvrir}>
          <Eye size={14} /> {t('demandes.examiner')}
        </button>
      )}
    </div>
  );
}

/**
 * Aperçu d'un plan — LECTURE SEULE.
 *
 * `PlanCanvas` est monté sans `onPointClique` et en mode lecture : aucun clic
 * ne peut ouvrir un formulaire de réserve. C'est ce que demande le client, et
 * le serveur refuse de toute façon toute réserve sur un plan en attente — on
 * évite simplement de promettre un geste qui serait refusé.
 */
function ApercuPlan({ plan, onClose }) {
  const { t } = useTranslation('chantier');
  const [blob, setBlob] = useState(null);
  const [erreur, setErreur] = useState(null);

  const url = plan?.fichier_url;
  useEffect(() => {
    if (!url) return undefined;
    let vivant = true;
    setBlob(null);
    setErreur(null);

    (async () => {
      try {
        const b = await fetchFichierBlob(url);
        if (vivant) setBlob(b);
      } catch (err) {
        if (vivant) setErreur(getErrorMessage(err));
      }
    })();

    return () => { vivant = false; };
  }, [url]);

  if (!plan) return null;

  return (
    <Modal open onClose={onClose} title={plan.nom} size="lg">
      {erreur ? (
        <ErrorState message={erreur} />
      ) : !blob ? (
        <SkeletonListe lignes={4} />
      ) : (
        <>
          <PlanCanvas blob={blob} format={plan.format} mode="lecture" hauteur={520} />
          <p className="text-muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            {t('demandes.lectureSeule')}
          </p>
        </>
      )}
    </Modal>
  );
}

/**
 * Confirmation avant validation.
 *
 * Même contrat que dans la liste des demandes : mêmes libellés, même
 * enchaînement. Un valideur qui passe de la liste au détail retrouve le geste
 * qu'il connaît, et ne peut plus activer un chantier d'un clic réflexe.
 */
function ModalValider({ ouvert, chantier, enCours, onClose, onConfirmer }) {
  const { t } = useTranslation('chantier');
  if (!ouvert) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={t('demandes.modalValider.titre')}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={enCours}>
            {t('actions.annuler')}
          </button>
          <button className="btn btn-primary" onClick={onConfirmer} disabled={enCours}>
            <Check size={16} /> {t('demandes.modalValider.confirmer')}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>{t('demandes.modalValider.intro', { nom: chantier.nom })}</p>
    </Modal>
  );
}

function ModalRejeter({ ouvert, chantier, onClose, onDone }) {
  const { t } = useTranslation('chantier');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (motif.trim().length < MOTIF_MIN) {
      setErreur(t('demandes.modalRejeter.motifRequis', { min: MOTIF_MIN }));
      return;
    }
    setSaving(true);
    try {
      await rejeterChantier(chantier.id, motif.trim());
      SwalCustom.success(t('demandes.rejeteeSucces'));
      onClose();
      onDone();
    } catch (err) {
      SwalCustom.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!ouvert) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={t('demandes.modalRejeter.titre')}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            {t('actions.annuler')}
          </button>
          <button className="btn btn-primary btn-danger-hover" onClick={submit} disabled={saving}>
            <X size={16} /> {t('demandes.modalRejeter.confirmer')}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>{t('demandes.modalRejeter.intro', { nom: chantier.nom })}</p>
      <Textarea
        label={t('demandes.modalRejeter.motifLabel')}
        hint={t('demandes.modalRejeter.motifAide')}
        placeholder={t('demandes.modalRejeter.motifPlaceholder')}
        required
        rows={5}
        maxLength={2000}
        error={erreur}
        value={motif}
        onChange={(e) => { setMotif(e.target.value); if (erreur) setErreur(''); }}
      />
    </Modal>
  );
}
