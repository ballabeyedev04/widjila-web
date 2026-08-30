import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, RefreshCw, CreditCard, Check } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { Field, Input, Select, Textarea } from '../../components/FormControls.jsx';
import {
  listerPlansAbonnement, creerPlanAbonnement, modifierPlanAbonnement,
  basculerActifPlanAbonnement, supprimerPlanAbonnement,
} from '../../service/abonnement/planAbonnementService.js';
import { getErrorMessage } from '../../service/helpers.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Prix abonnements — le catalogue des formules, administrable.
 *
 * Remplace les trois formules qui vivaient en dur dans le service backend
 * (Starter 29 € / Pro 79 € / Business 199 €) : changer un tarif demandait une
 * livraison, et l'administrateur n'avait aucun moyen d'agir.
 *
 * ── Deux garanties à connaître, rappelées à l'écran ───────────────────────
 * 1. Modifier un prix ne touche AUCUNE souscription passée : le montant
 *    encaissé est figé dans l'historique. Les abonnés en cours gardent leur
 *    tarif jusqu'à leur renouvellement.
 * 2. Une formule déjà souscrite ne peut pas être supprimée — le serveur
 *    refuse. On la DÉSACTIVE : elle quitte l'offre, les abonnés la gardent.
 */
export default function PlateformePrixAbonnements() {
  const { t } = useTranslation('plateforme');

  const [plans, setPlans] = useState([]);
  const [fonctionnalites, setFonctionnalites] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [edition, setEdition] = useState(null);   // formule en cours d'édition
  const [creation, setCreation] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const d = await listerPlansAbonnement();
      setPlans(d.plans);
      setFonctionnalites(d.fonctionnalites);
      setErreur(null);
    } catch (err) {
      setErreur(getErrorMessage(err));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const basculer = async (plan) => {
    try {
      await basculerActifPlanAbonnement(plan.id, !plan.actif);
      SwalCustom.success(plan.actif ? t('prixAbonnements.desactivee') : t('prixAbonnements.activee'));
      charger();
    } catch (err) {
      SwalCustom.error({ title: t('prixAbonnements.actionImpossible'), text: getErrorMessage(err) });
    }
  };

  const supprimer = async (plan) => {
    const ok = await SwalCustom.confirm({
      title: t('prixAbonnements.supprimerTitre', { nom: plan.nom }),
      // Le serveur refuse si des souscriptions y renvoient : on l'annonce
      // AVANT, pour que la désactivation apparaisse comme la voie normale.
      text: t('prixAbonnements.supprimerTexte'),
      icon: 'warning',
      danger: true,
    });
    if (!ok) return;
    try {
      await supprimerPlanAbonnement(plan.id);
      SwalCustom.success(t('prixAbonnements.supprimee'));
      charger();
    } catch (err) {
      SwalCustom.error({ title: t('prixAbonnements.suppressionImpossible'), text: getErrorMessage(err) });
    }
  };

  const prixAffiche = (plan) => (plan.surDevis
    ? t('prixAbonnements.surDevis')
    : `${plan.prix} ${plan.devise} ${plan.periode === 'an' ? t('prixAbonnements.parAn') : t('prixAbonnements.parMois')}`);

  const limiteAffichee = (valeur) => (valeur == null
    ? t('prixAbonnements.illimite')
    : String(valeur));

  return (
    <>
      <PageHeader title={t('prixAbonnements.titre')} subtitle={t('prixAbonnements.sousTitre', { count: plans.length })}>
        <button
          className="btn btn-ghost"
          onClick={charger}
          title={t('layout:actions.rafraichir')}
          aria-label={t('layout:actions.rafraichir')}
        ><RefreshCw size={16} /></button>
        <button className="btn btn-primary" onClick={() => setCreation(true)}>
          <Plus size={16} /> {t('prixAbonnements.nouvelle')}
        </button>
      </PageHeader>

      <div className="info-bandeau">
        <Check size={15} />
        <span>{t('prixAbonnements.garantiePrix')}</span>
      </div>

      {erreur ? <ErrorState message={erreur} onRetry={charger} />
        : chargement ? (
          <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            {t('prixAbonnements.chargement')}
          </div></div>
        )
        : plans.length === 0 ? (
          <EmptyState
            title={t('prixAbonnements.videTitre')}
            message={t('prixAbonnements.videMessage')}
            icon={CreditCard}
          />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('prixAbonnements.colOrdre')}</th>
                    <th>{t('prixAbonnements.colFormule')}</th>
                    <th>{t('prixAbonnements.colPrix')}</th>
                    <th>{t('prixAbonnements.colUtilisateurs')}</th>
                    <th>{t('prixAbonnements.colChantiers')}</th>
                    <th>{t('prixAbonnements.colFonctionnalites')}</th>
                    <th>{t('prixAbonnements.colStatut')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="text-muted" style={{ fontSize: 13, width: 60 }}>{plan.ordre}</td>
                      <td>
                        <strong>{plan.nom}</strong>
                        <div className="text-muted" style={{ fontSize: 12 }}><code>{plan.code}</code></div>
                      </td>
                      <td>
                        {plan.surDevis
                          ? <Badge tone="warning">{t('prixAbonnements.surDevis')}</Badge>
                          : <strong>{prixAffiche(plan)}</strong>}
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{limiteAffichee(plan.limiteUtilisateurs)}</td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{limiteAffichee(plan.limiteChantiers)}</td>
                      <td>
                        <div className="fonctionnalites-puces">
                          {(plan.fonctionnalites || []).map((code) => (
                            <span key={code} className="chip" title={fonctionnalites[code] || code}>
                              {fonctionnalites[code] || code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge tone={plan.actif ? 'success' : 'neutral'}>
                          {plan.actif ? t('prixAbonnements.active') : t('prixAbonnements.inactive')}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => basculer(plan)}>
                          {plan.actif ? t('prixAbonnements.desactiver') : t('prixAbonnements.activer')}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEdition(plan)} title={t('prixAbonnements.modifier')}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => supprimer(plan)} title={t('prixAbonnements.supprimer')}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      <FormuleModal
        open={creation || !!edition}
        onClose={() => { setCreation(false); setEdition(null); }}
        plan={edition}
        fonctionnalites={fonctionnalites}
        onSaved={charger}
      />
    </>
  );
}

/* ============ Création / édition d'une formule ============ */
function FormuleModal({ open, onClose, plan, fonctionnalites, onSaved }) {
  const { t } = useTranslation('plateforme');
  const modification = !!plan;

  const [form, setForm] = useState({
    code: '', nom: '', description: '', prix: '', devise: 'EUR', periode: 'mois',
    limiteUtilisateurs: '', limiteChantiers: '', fonctionnalites: [],
    stripePriceId: '', actif: true, ordre: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      code: plan?.code || '',
      nom: plan?.nom || '',
      description: plan?.description || '',
      // Champ vide = « sur devis ». On ne met pas 0, qui décrirait une offre
      // gratuite.
      prix: plan?.prix == null ? '' : String(plan.prix),
      devise: plan?.devise || 'EUR',
      periode: plan?.periode || 'mois',
      limiteUtilisateurs: plan?.limiteUtilisateurs == null ? '' : String(plan.limiteUtilisateurs),
      limiteChantiers: plan?.limiteChantiers == null ? '' : String(plan.limiteChantiers),
      fonctionnalites: plan?.fonctionnalites || [],
      stripePriceId: plan?.stripePriceId || '',
      actif: plan ? plan.actif : true,
      ordre: plan?.ordre ?? 0,
    });
  }, [open, plan]);

  const maj = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });

  const basculerFonctionnalite = (code) => {
    setForm((f) => ({
      ...f,
      fonctionnalites: f.fonctionnalites.includes(code)
        ? f.fonctionnalites.filter((c) => c !== code)
        : [...f.fonctionnalites, code],
    }));
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.nom.trim()) return SwalCustom.error(t('prixAbonnements.nomRequis'));
    if (!modification && !form.code.trim()) return SwalCustom.error(t('prixAbonnements.codeRequis'));

    setSaving(true);
    try {
      // Champ vide → `null` : c'est ainsi qu'on déclare « sur devis » pour le
      // prix et « illimité » pour une limite. Envoyer 0 dirait tout autre chose.
      const corps = {
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        prix: form.prix === '' ? null : Number(form.prix),
        devise: form.devise,
        periode: form.periode,
        limiteUtilisateurs: form.limiteUtilisateurs === '' ? null : Number(form.limiteUtilisateurs),
        limiteChantiers: form.limiteChantiers === '' ? null : Number(form.limiteChantiers),
        fonctionnalites: form.fonctionnalites,
        stripePriceId: form.stripePriceId.trim() || null,
        actif: form.actif === true || form.actif === 'true',
        ordre: Number(form.ordre) || 0,
      };

      if (modification) {
        // Le CODE n'est pas modifiable : il sert de clé dans l'historique des
        // souscriptions, le renommer orphelinerait les lignes enregistrées.
        await modifierPlanAbonnement(plan.id, corps);
        SwalCustom.success(t('prixAbonnements.modifiee'));
      } else {
        await creerPlanAbonnement({ ...corps, code: form.code.trim().toLowerCase() });
        SwalCustom.success(t('prixAbonnements.creee'));
      }
      onClose();
      onSaved();
    } catch (err) {
      SwalCustom.error({
        title: modification ? t('prixAbonnements.modificationImpossible') : t('prixAbonnements.creationImpossible'),
        text: getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modification ? t('prixAbonnements.modalModifier', { nom: plan?.nom }) : t('prixAbonnements.modalNouvelle')}
      size="lg"
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('prixAbonnements.annuler')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? '…' : modification ? t('prixAbonnements.enregistrer') : t('prixAbonnements.creer')}
          </button>
        </>
      )}
    >
      <form onSubmit={submit}>
        <div className="grid-2">
          <Input label={t('prixAbonnements.champNom')} value={form.nom} onChange={maj('nom')} required autoFocus />
          <Input
            label={t('prixAbonnements.champCode')}
            value={form.code}
            onChange={maj('code')}
            disabled={modification}
            placeholder="essentiel"
            hint={modification ? t('prixAbonnements.codeFige') : t('prixAbonnements.codeAide')}
          />
        </div>

        <Textarea label={t('prixAbonnements.champDescription')} value={form.description} onChange={maj('description')} rows={2} />

        <div className="grid-3">
          <Input
            label={t('prixAbonnements.champPrix')}
            type="number"
            min="0"
            step="0.01"
            value={form.prix}
            onChange={maj('prix')}
            hint={t('prixAbonnements.prixAide')}
          />
          <Input label={t('prixAbonnements.champDevise')} value={form.devise} onChange={maj('devise')} maxLength={3} />
          <Select label={t('prixAbonnements.champPeriode')} value={form.periode} onChange={maj('periode')}>
            <option value="mois">{t('prixAbonnements.parMois')}</option>
            <option value="an">{t('prixAbonnements.parAn')}</option>
          </Select>
        </div>

        <div className="grid-3">
          <Input
            label={t('prixAbonnements.champLimiteUtilisateurs')}
            type="number"
            min="1"
            value={form.limiteUtilisateurs}
            onChange={maj('limiteUtilisateurs')}
            hint={t('prixAbonnements.limiteAide')}
          />
          <Input
            label={t('prixAbonnements.champLimiteChantiers')}
            type="number"
            min="1"
            value={form.limiteChantiers}
            onChange={maj('limiteChantiers')}
            hint={t('prixAbonnements.limiteAide')}
          />
          <Input label={t('prixAbonnements.champOrdre')} type="number" min="0" value={form.ordre} onChange={maj('ordre')} />
        </div>

        <Field label={t('prixAbonnements.champFonctionnalites')} hint={t('prixAbonnements.fonctionnalitesAide')}>
          <div className="fonctionnalites-choix">
            {Object.entries(fonctionnalites).map(([code, libelle]) => (
              <label key={code} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.fonctionnalites.includes(code)}
                  onChange={() => basculerFonctionnalite(code)}
                />
                <span>{libelle}</span>
              </label>
            ))}
          </div>
        </Field>

        <div className="grid-2">
          <Input
            label={t('prixAbonnements.champStripePriceId')}
            value={form.stripePriceId}
            onChange={maj('stripePriceId')}
            placeholder="price_..."
            hint={t('prixAbonnements.stripeAide')}
          />
          <Select
            label={t('prixAbonnements.champStatut')}
            value={String(form.actif)}
            onChange={(e) => setForm({ ...form, actif: e.target.value === 'true' })}
          >
            <option value="true">{t('prixAbonnements.active')}</option>
            <option value="false">{t('prixAbonnements.inactive')}</option>
          </Select>
        </div>
      </form>
    </Modal>
  );
}
