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

  /** Le plan GLOBAL du chantier : celui qui n'est rattaché à rien. */
  const planGlobal = useMemo(
    () => plans.find((p) => !p.batimentId && !p.etageId && !p.zoneId),
    [plans]
  );

  const planDuNiveau = useCallback(
    (etageId) => plans.find((p) => p.etageId === etageId),
    [plans]
  );

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
              <button className="btn btn-primary" onClick={valider} disabled={enCours}>
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
      {planGlobal ? (
        <LignePlan plan={planGlobal} onOuvrir={() => setPlanOuvert(planGlobal)} icone={FileText} />
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
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        color: 'var(--text-secondary)',
                        marginBottom: 6,
                      }}
                    >
                      {t(`demandes.sections.${cle}`)}
                    </div>
                    {niveaux.map((niveau) => {
                      const plan = planDuNiveau(niveau.id);
                      return (
                        <LignePlan
                          key={niveau.id}
                          plan={plan}
                          libelle={niveau.nom}
                          description={niveau.description}
                          icone={Layers}
                          onOuvrir={plan ? () => setPlanOuvert(plan) : undefined}
                          messageSansPlan={t('demandes.niveauSansPlan')}
                        />
                      );
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

      <ApercuPlan plan={planOuvert} onClose={() => setPlanOuvert(null)} />
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
