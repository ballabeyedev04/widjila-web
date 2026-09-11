/**
 * Les blocs d'affichage du dépôt : bâtiment, niveau, appartement, plan.
 *
 * Extraits de `DepotPlans.jsx`. Ce sont des composants de PRÉSENTATION : ils
 * reçoivent leur contenu et remontent les gestes, sans appeler un seul
 * service. Cette propriété n'était pas lisible tant qu'ils cohabitaient avec
 * la logique de chargement et d'envoi.
 */
import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, ChevronDown, ChevronRight, DoorOpen, Eye, FileText, Layers,
  Map, Pencil, Plus, RefreshCw, Trash2, Upload,
} from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Input, Select } from '../../../components/FormControls.jsx';
import { fetchFichierBlob } from '../../../service/plan/planService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import SwalCustom from '../../../utils/swal.config.js';
import { EXTENSIONS, SECTIONS } from './commun.js';

/**
 * L'aperçu embarque pdf.js. Chargé à la demande : la page doit s'afficher sans
 * attendre la bibliothèque de rendu.
 */
const PlanVignette = lazy(() => import('../../../components/plan/PlanVignette.jsx'));

/* ══════════════════════════════════════════════════════════════════════════
 * Le plan global
 * ══════════════════════════════════════════════════════════════════════════ */

export function BlocPlanGlobal({ plan, fichierAttente, onChoisir, onRetirerAttente, onSupprimer, occupe }) {
  const { t } = useTranslation('chantier');
  const depose = plan || fichierAttente;

  return (
    <div className="card">
      <div className="card-header">
        <h2><Map size={17} style={{ verticalAlign: -3 }} /> {t('depot.planGlobal')}</h2>
        {!depose && <ChoixFichier label={t('depot.deposer')} onChoisir={(f) => onChoisir(f[0])} disabled={occupe} />}
      </div>
      <div className="card-body">
        {!depose ? (
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{t('depot.planGlobalAide')}</p>
        ) : plan ? (
          <LignePlan plan={plan} onSupprimer={onSupprimer} occupe={occupe} />
        ) : (
          <LigneFichierAttente nom={fichierAttente.name} onRetirer={onRetirerAttente} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Un bâtiment, dépliable sur ses trois sections
 * ══════════════════════════════════════════════════════════════════════════ */

export function CarteBatiment({
  batiment, brouillon, plans, codesNiveau, codesAppartement, occupe,
  onAjouterNiveau, onAjouterAppartement, onRenommerAppartement, onRetirerAppartement,
  onAjouterPlans, onRemplacerPlan, onRetirerPlan, onRetirerFichierAttente,
  onNouveauCodeNiveau, onNouveauCodeAppartement,
}) {
  const { t } = useTranslation('chantier');
  const [ouvert, setOuvert] = useState(true);

  const niveaux = brouillon ? batiment.niveaux : (batiment.etages || []);
  const planBatiment = plans.find((p) => p.batimentId === batiment.id && !p.etageId && !p.zoneId);

  const parSection = (type) => niveaux.filter((n) => (n.typeNiveau || 'etage') === type);

  return (
    <div className="depot-batiment">
      <button type="button" className="depot-batiment-entete" onClick={() => setOuvert((o) => !o)}>
        {ouvert ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Building2 size={16} />
        <span className="depot-batiment-nom">{batiment.nom}</span>
        {batiment.code && <Badge tone="info">{batiment.code}</Badge>}
        <span className="text-muted" style={{ fontSize: 12 }}>
          {t('depot.niveauxCompte', { n: niveaux.length })}
        </span>
      </button>

      {ouvert && (
        <div className="depot-batiment-corps">
          {planBatiment ? (
            <LignePlan plan={planBatiment} onSupprimer={onRetirerPlan} onRemplacer={onRemplacerPlan} occupe={occupe} />
          ) : batiment.fichier ? (
            <LigneFichierAttente nom={batiment.fichier.name} />
          ) : null}

          {SECTIONS.map(({ type, cle }) => (
            <SectionNiveaux
              key={type}
              titre={t(`depot.section.${cle}`)}
              type={type}
              niveaux={parSection(type)}
              batiment={batiment}
              brouillon={brouillon}
              plans={plans}
              codesNiveau={codesNiveau}
              codesAppartement={codesAppartement}
              occupe={occupe}
              onAjouterNiveau={onAjouterNiveau}
              onAjouterAppartement={onAjouterAppartement}
              onRenommerAppartement={onRenommerAppartement}
              onRetirerAppartement={onRetirerAppartement}
              onAjouterPlans={onAjouterPlans}
              onRemplacerPlan={onRemplacerPlan}
              onRetirerPlan={onRetirerPlan}
              onRetirerFichierAttente={onRetirerFichierAttente}
              onNouveauCodeNiveau={onNouveauCodeNiveau}
              onNouveauCodeAppartement={onNouveauCodeAppartement}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Une section — SOUS-SOLS, ÉTAGES ou TOITURE
 * ══════════════════════════════════════════════════════════════════════════ */

export function SectionNiveaux({
  titre, type, niveaux, batiment, brouillon, plans, codesNiveau, codesAppartement, occupe,
  onAjouterNiveau, onNouveauCodeNiveau, ...reste
}) {
  const { t } = useTranslation('chantier');
  const [saisie, setSaisie] = useState(false);

  return (
    <div className="depot-section">
      <div className="depot-section-entete">
        <span className="depot-section-titre">{titre}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setSaisie(true)}
          disabled={occupe}
        >
          <Plus size={14} /> {t('depot.ajouterNiveau')}
        </button>
      </div>

      {niveaux.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 8px' }}>{t('depot.aucunNiveau')}</p>
      ) : niveaux.map((n) => (
        <LigneNiveau
          key={n.id || n.tempId}
          niveau={n}
          batiment={batiment}
          brouillon={brouillon}
          plans={plans}
          codesAppartement={codesAppartement}
          occupe={occupe}
          onNouveauCodeAppartement={reste.onNouveauCodeAppartement}
          {...reste}
        />
      ))}

      <NiveauModal
        open={saisie}
        onClose={() => setSaisie(false)}
        type={type}
        codesNiveau={codesNiveau}
        codesAppartement={codesAppartement}
        occupe={occupe}
        onNouveauCodeNiveau={onNouveauCodeNiveau}
        onNouveauCodeAppartement={reste.onNouveauCodeAppartement}
        onValider={async (valeurs) => {
          const ok = await onAjouterNiveau(batiment, { ...valeurs, typeNiveau: type });
          if (ok) setSaisie(false);
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Un niveau, dépliable sur ses appartements
 * ══════════════════════════════════════════════════════════════════════════ */

export function LigneNiveau({
  niveau, batiment, brouillon, plans, codesAppartement, occupe,
  onAjouterAppartement, onRenommerAppartement, onRetirerAppartement,
  onAjouterPlans, onRemplacerPlan, onRetirerPlan, onRetirerFichierAttente,
  onNouveauCodeAppartement,
}) {
  const { t } = useTranslation('chantier');
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState(false);

  const appartements = brouillon ? niveau.appartements : (niveau.zones || []);
  const planNiveau = plans.find((p) => p.etageId === niveau.id && !p.zoneId);
  const nom = brouillon ? niveau.codeNiveau : (niveau.codeNiveau || niveau.nom);

  return (
    <div className="depot-niveau">
      <button type="button" className="depot-niveau-entete" onClick={() => setOuvert((o) => !o)}>
        {ouvert ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <Layers size={15} />
        <span className="depot-niveau-nom">{nom}</span>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {t('depot.appartementsCompte', { n: appartements.length })}
        </span>
        {(planNiveau || niveau.fichier) && <Badge tone="success">{t('depot.planDepose')}</Badge>}
      </button>

      {ouvert && (
        <div className="depot-niveau-corps">
          {planNiveau ? (
            <LignePlan plan={planNiveau} onSupprimer={onRetirerPlan} onRemplacer={onRemplacerPlan} occupe={occupe} />
          ) : niveau.fichier ? (
            <LigneFichierAttente nom={niveau.fichier.name} />
          ) : null}

          {appartements.map((ap) => (
            <CarteAppartement
              key={ap.id || ap.tempId}
              appartement={ap}
              niveau={niveau}
              batiment={batiment}
              brouillon={brouillon}
              plans={plans}
              codesAppartement={codesAppartement}
              occupe={occupe}
              onRenommer={onRenommerAppartement}
              onRetirer={onRetirerAppartement}
              onAjouterPlans={onAjouterPlans}
              onRemplacerPlan={onRemplacerPlan}
              onRetirerPlan={onRetirerPlan}
              onRetirerFichierAttente={onRetirerFichierAttente}
              onNouveauCodeAppartement={onNouveauCodeAppartement}
            />
          ))}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setSaisie(true)}
            disabled={occupe}
          >
            <Plus size={14} /> {t('depot.ajouterAppartement')}
          </button>

          <AppartementModal
            open={saisie}
            onClose={() => setSaisie(false)}
            codesAppartement={codesAppartement}
            occupe={occupe}
            onNouveauCode={onNouveauCodeAppartement}
            onValider={async (valeurs) => {
              const ok = await onAjouterAppartement(batiment, niveau, valeurs);
              if (ok) setSaisie(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Un appartement et ses plans
 * ══════════════════════════════════════════════════════════════════════════ */

export function CarteAppartement({
  appartement, niveau, batiment, brouillon, plans, codesAppartement, occupe,
  onRenommer, onRetirer, onAjouterPlans, onRemplacerPlan, onRetirerPlan,
  onRetirerFichierAttente, onNouveauCodeAppartement,
}) {
  const { t } = useTranslation('chantier');
  const [renommage, setRenommage] = useState(false);

  const code = brouillon ? appartement.code : appartement.nom;
  const plansAppartement = brouillon
    ? []
    : plans.filter((p) => p.zoneId === appartement.id);

  return (
    <div className="depot-appartement">
      <div className="depot-appartement-entete">
        <DoorOpen size={15} />
        <span className="depot-appartement-nom">{code}</span>
        <div className="depot-appartement-actions">
          <ChoixFichier
            icone
            multiple
            label={t('depot.ajouterPlan')}
            onChoisir={(fichiers) => onAjouterPlans(batiment, niveau, appartement, fichiers)}
            disabled={occupe}
          />
          <button
            type="button" className="btn btn-ghost btn-sm"
            title={t('depot.renommer')} aria-label={t('depot.renommer')}
            onClick={() => setRenommage(true)} disabled={occupe}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button" className="btn btn-ghost btn-sm btn-danger-hover"
            title={t('actions.supprimer')} aria-label={t('actions.supprimer')}
            onClick={() => onRetirer(batiment, niveau, appartement)} disabled={occupe}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {plansAppartement.length === 0 && (!brouillon || appartement.fichiers.length === 0) ? (
        <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>{t('depot.aucunPlanAppartement')}</p>
      ) : (
        <>
          {plansAppartement.map((p) => (
            <LignePlan key={p.id} plan={p} onSupprimer={onRetirerPlan} onRemplacer={onRemplacerPlan} occupe={occupe} />
          ))}
          {brouillon && appartement.fichiers.map((f, i) => (
            <LigneFichierAttente
              key={`${f.name}-${i}`}
              nom={f.name}
              onRetirer={() => onRetirerFichierAttente(batiment, niveau, appartement, i)}
            />
          ))}
        </>
      )}

      <AppartementModal
        open={renommage}
        onClose={() => setRenommage(false)}
        codesAppartement={codesAppartement}
        occupe={occupe}
        codeInitial={code}
        sansFichier
        onNouveauCode={onNouveauCodeAppartement}
        onValider={async ({ code: nouveau }) => {
          const ok = await onRenommer(batiment, niveau, appartement, nouveau);
          if (ok) setRenommage(false);
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Un plan déjà déposé — vignette, aperçu, remplacement, retrait
 * ══════════════════════════════════════════════════════════════════════════ */

export function LignePlan({ plan, onSupprimer, onRemplacer, occupe }) {
  const { t } = useTranslation('chantier');
  const [apercu, setApercu] = useState(null);

  const ouvrirApercu = async () => {
    try {
      const blob = await fetchFichierBlob(plan.fichier_url);
      setApercu(URL.createObjectURL(blob));
    } catch (err) {
      SwalCustom.error({ title: t('depot.apercuImpossible'), text: getErrorMessage(err) });
    }
  };

  const fermerApercu = () => {
    if (apercu) URL.revokeObjectURL(apercu);
    setApercu(null);
  };

  return (
    <div className="depot-plan">
      <Suspense fallback={<div className="depot-plan-vignette-vide"><FileText size={18} /></div>}>
        <PlanVignette plan={plan} className="depot-plan-vignette" />
      </Suspense>
      <span className="depot-plan-nom">{plan.nom}</span>
      <span className="text-muted" style={{ fontSize: 12 }}>{plan.format?.toUpperCase() || ''}</span>
      <div className="depot-plan-actions">
        <button
          type="button" className="btn btn-ghost btn-sm"
          title={t('depot.apercu')} aria-label={t('depot.apercu')}
          onClick={ouvrirApercu}
        >
          <Eye size={14} />
        </button>
        {onRemplacer && (
          <ChoixFichier
            icone
            iconeComposant={RefreshCw}
            label={t('depot.remplacer')}
            onChoisir={(f) => onRemplacer(plan, f[0])}
            disabled={occupe}
          />
        )}
        <button
          type="button" className="btn btn-ghost btn-sm btn-danger-hover"
          title={t('actions.supprimer')} aria-label={t('actions.supprimer')}
          onClick={() => onSupprimer(plan)} disabled={occupe}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <Modal open={!!apercu} onClose={fermerApercu} title={plan.nom} size="lg">
        {apercu && (
          <iframe
            title={plan.nom}
            src={apercu}
            style={{ width: '100%', height: 520, border: '1px solid var(--border)', borderRadius: 10 }}
          />
        )}
      </Modal>
    </div>
  );
}

/** Un fichier CHOISI mais pas encore parti — il n'existe pas côté serveur. */
export function LigneFichierAttente({ nom, onRetirer }) {
  const { t } = useTranslation('chantier');
  return (
    <div className="depot-plan">
      <div className="depot-plan-vignette-vide"><FileText size={18} /></div>
      <span className="depot-plan-nom">{nom}</span>
      <Badge tone="warning">{t('depot.enAttente')}</Badge>
      {onRetirer && (
        <div className="depot-plan-actions">
          <button
            type="button" className="btn btn-ghost btn-sm btn-danger-hover"
            title={t('actions.retirer')} aria-label={t('actions.retirer')}
            onClick={onRetirer}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Sélecteur de fichier — un `<input type="file">` habillé en bouton
 * ══════════════════════════════════════════════════════════════════════════ */

export function ChoixFichier({ label, onChoisir, disabled, multiple, icone, iconeComposant: Icone = Upload }) {
  const [cle, setCle] = useState(0);

  return (
    <label className={`btn btn-ghost btn-sm ${disabled ? 'disabled' : ''}`} title={label} aria-label={label}>
      <Icone size={14} />
      {!icone && <span>{label}</span>}
      <input
        // La CLÉ change après chaque choix : sans elle, rechoisir le MÊME
        // fichier ne déclenche aucun `change` — le navigateur considère que
        // la valeur n'a pas bougé, et le second dépôt ne partirait jamais.
        key={cle}
        type="file"
        accept={EXTENSIONS}
        multiple={multiple}
        disabled={disabled}
        style={{ display: 'none' }}
        onChange={(e) => {
          const fichiers = Array.from(e.target.files || []);
          if (fichiers.length) onChoisir(fichiers);
          setCle((k) => k + 1);
        }}
      />
    </label>
  );
}

/**
 * Un choix de code servi par le référentiel, avec un « + » pour compléter.
 *
 * Le champ n'est pas libre : deux saisies pour le même niveau — « R+1 » et
 * « R + 1 » — produisaient deux niveaux. Ce qui manque s'ajoute au catalogue
 * de l'organisation, et sert ensuite à tout le monde.
 */
export function ChoixCode({ label, codes, valeur, onChange, onNouveau, disabled }) {
  const { t } = useTranslation('chantier');
  const [ajout, setAjout] = useState(false);
  const [nouveau, setNouveau] = useState('');
  const [enCours, setEnCours] = useState(false);

  const valider = async () => {
    const code = nouveau.trim();
    if (!code) return;
    setEnCours(true);
    try {
      const cree = await onNouveau(code);
      onChange(cree?.code || code);
      setAjout(false);
      setNouveau('');
    } catch (err) {
      SwalCustom.error({ title: t('depot.codeImpossible'), text: getErrorMessage(err) });
    } finally { setEnCours(false); }
  };

  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Select
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ flex: 1 }}
        >
          <option value="">{t('depot.choisirCode')}</option>
          {codes.map((c) => (
            <option key={c.id} value={c.code}>{c.nom ? `${c.code} — ${c.nom}` : c.code}</option>
          ))}
        </Select>
        <button
          type="button" className="btn btn-secondary btn-sm"
          title={t('depot.ajouterCode')} aria-label={t('depot.ajouterCode')}
          onClick={() => setAjout((a) => !a)} disabled={disabled}
        >
          <Plus size={14} />
        </button>
      </div>

      {ajout && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Input
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            placeholder={t('depot.nouveauCode')}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={valider} disabled={enCours}>
            {t('actions.ajouter')}
          </button>
        </div>
      )}
    </Field>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Ajout d'un bâtiment
 * ══════════════════════════════════════════════════════════════════════════ */

export function BoutonAjoutBatiment({ onAjouter, occupe }) {
  const { t } = useTranslation('chantier');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: '', code: '' });
  const [fichier, setFichier] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({ nom: '', code: '' });
    setFichier(null);
  }, [open]);

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)} disabled={occupe}>
        <Plus size={14} /> {t('depot.ajouterBatiment')}
      </button>

      <Modal
        open={open} onClose={() => setOpen(false)} title={t('depot.modalBatiment')} size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setOpen(false)}>{t('actions.annuler')}</button>
            <button
              className="btn btn-primary"
              disabled={!form.nom.trim() || occupe}
              onClick={async () => {
                const ok = await onAjouter({ nom: form.nom.trim(), code: form.code.trim(), fichier });
                if (ok) setOpen(false);
              }}
            >
              {t('actions.ajouter')}
            </button>
          </>
        }
      >
        <Input label={t('structure.batiment')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
        <Input label={t('commun.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A" />
        <Field label={t('depot.planBatiment')} hint={t('depot.planFacultatif')}>
          {fichier ? (
            <LigneFichierAttente nom={fichier.name} onRetirer={() => setFichier(null)} />
          ) : (
            <ChoixFichier label={t('depot.choisirFichier')} onChoisir={(f) => setFichier(f[0])} disabled={occupe} />
          )}
        </Field>
      </Modal>
    </>
  );
}
