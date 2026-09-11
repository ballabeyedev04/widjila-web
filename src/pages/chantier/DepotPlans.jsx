import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, Layers, DoorOpen, Plus, Upload, Trash2, Eye, RefreshCw,
  FileText, ChevronDown, ChevronRight, Pencil, Send, Map,
} from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { reporter } from '../../utils/monitoring.js';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Input, Select, Textarea, Field } from '../../components/FormControls.jsx';
import { getChantier, creerChantier, creerBatiment, creerEtage, creerZone, modifierZone, supprimerZone } from '../../service/chantier/chantierService.js';
import { listerPlans, uploaderPlan, supprimerPlan, remplacerFichierPlan } from '../../service/plan/planService.js';
import {
  listerCodesNiveau, creerCodeNiveau, listerCodesAppartement, creerCodeAppartement,
} from '../../service/referentiel/referentielService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import { ROLES_DEPOSANT, roleAllowed } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';
import AccessDenied from '../../components/AccessDenied.jsx';
import '../../assets/css/depot-plans.css';
import { NiveauModal, AppartementModal, DemandeChantierModal } from './depot/Modales.jsx';
import { EXTENSIONS, formatDe, idTemp } from './depot/commun.js';
import {
  BlocPlanGlobal, CarteBatiment, BoutonAjoutBatiment,
} from './depot/Blocs.jsx';

/**
 * L'aperçu embarque pdf.js. Chargé à la demande, comme dans l'onglet Plans :
 * la page doit s'afficher sans attendre la bibliothèque de rendu.
 */
const PlanVignette = lazy(() => import('../../components/plan/PlanVignette.jsx'));

/**
 * Dépôt des plans d'un chantier — le parcours de l'entreprise, tel qu'il
 * existe déjà sur le mobile.
 *
 * ## Ce que cet écran ajoute au web
 *
 * L'onglet « Structure » créait des bâtiments, des niveaux et des zones ;
 * l'onglet « Plans » téléversait des fichiers. Les deux étaient séparés, et
 * l'upload ne transmettait que `zoneId` : un plan de bâtiment ou de niveau
 * partait sans rattachement et retombait au rang de plan global. La
 * hiérarchie bâtiment › niveau › appartement — celle que le parcours de
 * consultation redescend, et sur laquelle le client insiste — n'était pas
 * constructible depuis le web.
 *
 * Ici, la structure et son plan se créent d'un seul geste, et chaque plan
 * part rattaché à ce qu'il décrit.
 *
 * ## Les codes viennent du serveur
 *
 * Niveaux (« SS1 », « RDC », « R+1 ») et appartements (« A001 » … « A015 »)
 * sont servis par l'API, comme sur le mobile. Ils étaient saisis en texte
 * libre : « R+1 », « R + 1 » et « Etage 1 » désignaient le même niveau et en
 * produisaient trois. Le « + » ajoute un code pour TOUTE l'organisation —
 * jamais au catalogue standard, qui le pousserait à tous les clients.
 *
 * ## Deux modes
 *
 * **Chantier existant** : chaque ajout part au serveur sur-le-champ. Un dépôt
 * interrompu se complète en rouvrant l'écran.
 *
 * **Brouillon** (aucun chantier dans l'URL) : le parcours du client commence
 * par les PLANS et finit par le formulaire de demande — les valideurs
 * reçoivent ainsi une demande complète, et non un chantier vide dont les
 * plans arriveraient après. Rien ne part au serveur avant « Envoyer », et un
 * abandon en cours de route ne laisse donc aucun chantier orphelin.
 */

export default function DepotPlans() {
  const { chantierId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('chantier');
  const { user } = useUser();

  const brouillon = !chantierId;

  const [chantier, setChantier] = useState(null);
  const [plans, setPlans] = useState([]);
  const [codesNiveau, setCodesNiveau] = useState([]);
  const [codesAppartement, setCodesAppartement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [referentielsIndisponibles, setReferentielsIndisponibles] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [demande, setDemande] = useState(false);

  /**
   * L'arbre en attente — brouillon UNIQUEMENT.
   *
   * `{ planGlobal: File|null, batiments: [{ tempId, nom, code, fichier,
   *    niveaux: [{ tempId, typeNiveau, codeNiveau, fichier,
   *      appartements: [{ tempId, code, fichiers: File[] }] }] }] }`
   *
   * Les objets `File` restent en mémoire : le navigateur ne donne pas de
   * chemin exploitable, et relire le fichier plus tard n'est pas possible.
   */
  const [attente, setAttente] = useState({ planGlobal: null, batiments: [] });

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      // Les codes de niveau et d'appartement NOURRISSENT les listes de
      // sélection. Leur échec reste non bloquant — on peut déposer sans eux —
      // mais il n'est plus MUET : les listes vides passaient pour « aucun
      // code défini », et personne n'était prévenu de la panne.
      let referentielsEnEchec = false;
      const repli = (err) => {
        referentielsEnEchec = true;
        reporter(err, { source: 'DepotPlans.referentiels' });
        return [];
      };
      const [niveaux, appartements] = await Promise.all([
        listerCodesNiveau().catch(repli),
        listerCodesAppartement().catch(repli),
      ]);
      setCodesNiveau(niveaux);
      setCodesAppartement(appartements);
      setReferentielsIndisponibles(referentielsEnEchec);

      if (!brouillon) {
        const [c, p] = await Promise.all([getChantier(chantierId), listerPlans(chantierId)]);
        setChantier(c);
        setPlans(p.items);
      }
    } catch (err) {
      setErreur(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [chantierId, brouillon]);
  useEffect(() => { charger(); }, [charger]);

  if (!roleAllowed(user?.role, ROLES_DEPOSANT)) return <AccessDenied />;

  /** Recharge structure + plans après une écriture serveur. */
  const rafraichir = async () => {
    const [c, p] = await Promise.all([getChantier(chantierId), listerPlans(chantierId)]);
    setChantier(c);
    setPlans(p.items);
  };

  /** Exécute une écriture serveur en signalant clairement son échec. */
  const agir = async (action, titre) => {
    setEnvoi(true);
    try {
      await action();
      if (!brouillon) await rafraichir();
      return true;
    } catch (err) {
      SwalCustom.error({ title: titre, text: getErrorMessage(err) });
      return false;
    } finally {
      setEnvoi(false);
    }
  };

  // ── Le plan GLOBAL : celui qui n'est rattaché à rien ────────────────────
  const planGlobalServeur = plans.find((p) => !p.batimentId && !p.etageId && !p.zoneId && !p.parentId);

  const deposerPlanGlobal = async (fichier) => {
    if (brouillon) { setAttente((a) => ({ ...a, planGlobal: fichier })); return; }
    await agir(
      () => uploaderPlan(chantierId, { fichier, nom: fichier.name, format: formatDe(fichier.name) }),
      t('depot.envoiImpossible'),
    );
  };

  // ── Bâtiments ───────────────────────────────────────────────────────────
  const ajouterBatiment = async ({ nom, code, fichier }) => {
    if (brouillon) {
      setAttente((a) => ({
        ...a,
        batiments: [...a.batiments, { tempId: idTemp(), nom, code, fichier, niveaux: [] }],
      }));
      return true;
    }
    return agir(async () => {
      const b = await creerBatiment(chantierId, { nom, ...(code ? { code } : {}) });
      if (fichier) {
        await uploaderPlan(chantierId, {
          fichier, nom: fichier.name, format: formatDe(fichier.name), batimentId: b.id,
        });
      }
    }, t('depot.batimentImpossible'));
  };

  // ── Niveaux ─────────────────────────────────────────────────────────────
  const ajouterNiveau = async (batiment, { typeNiveau, codeNiveau, fichier, appartements }) => {
    if (brouillon) {
      setAttente((a) => ({
        ...a,
        batiments: a.batiments.map((b) => (b.tempId === batiment.tempId ? {
          ...b,
          niveaux: [...b.niveaux, {
            tempId: idTemp(),
            typeNiveau,
            codeNiveau,
            fichier,
            appartements: (appartements || []).map((ap) => ({
              tempId: idTemp(), code: ap.code, fichiers: ap.fichiers || [],
            })),
          }],
        } : b)),
      }));
      return true;
    }
    return agir(async () => {
      const e = await creerEtage(chantierId, batiment.id, {
        nom: codeNiveau, typeNiveau, codeNiveau,
      });
      if (fichier) {
        await uploaderPlan(chantierId, {
          fichier, nom: fichier.name, format: formatDe(fichier.name),
          batimentId: batiment.id, etageId: e.id,
        });
      }
      for (const ap of appartements || []) {
        const z = await creerZone(chantierId, batiment.id, e.id, { nom: ap.code, type: 'logement' });
        for (const f of ap.fichiers || []) {
          await uploaderPlan(chantierId, {
            fichier: f, nom: f.name, format: formatDe(f.name),
            batimentId: batiment.id, etageId: e.id, zoneId: z.id,
          });
        }
      }
    }, t('depot.niveauImpossible'));
  };

  // ── Appartements ────────────────────────────────────────────────────────
  const ajouterAppartement = async (batiment, niveau, { code, fichiers }) => {
    if (brouillon) {
      setAttente((a) => ({
        ...a,
        batiments: a.batiments.map((b) => (b.tempId !== batiment.tempId ? b : {
          ...b,
          niveaux: b.niveaux.map((n) => (n.tempId !== niveau.tempId ? n : {
            ...n,
            appartements: [...n.appartements, { tempId: idTemp(), code, fichiers: fichiers || [] }],
          })),
        })),
      }));
      return true;
    }
    return agir(async () => {
      const z = await creerZone(chantierId, batiment.id, niveau.id, { nom: code, type: 'logement' });
      for (const f of fichiers || []) {
        await uploaderPlan(chantierId, {
          fichier: f, nom: f.name, format: formatDe(f.name),
          batimentId: batiment.id, etageId: niveau.id, zoneId: z.id,
        });
      }
    }, t('depot.appartementImpossible'));
  };

  const renommerAppartement = async (batiment, niveau, appartement, code) => {
    if (brouillon) {
      setAttente((a) => ({
        ...a,
        batiments: a.batiments.map((b) => (b.tempId !== batiment.tempId ? b : {
          ...b,
          niveaux: b.niveaux.map((n) => (n.tempId !== niveau.tempId ? n : {
            ...n,
            appartements: n.appartements.map((ap) => (ap.tempId === appartement.tempId ? { ...ap, code } : ap)),
          })),
        })),
      }));
      return true;
    }
    return agir(
      () => modifierZone(chantierId, batiment.id, niveau.id, appartement.id, { nom: code }),
      t('depot.appartementImpossible'),
    );
  };

  const retirerAppartement = async (batiment, niveau, appartement) => {
    const ok = await SwalCustom.confirm({
      title: t('depot.supprimerAppartement', { nom: appartement.code || appartement.nom }),
      icon: 'warning', danger: true,
    });
    if (!ok) return;
    if (brouillon) {
      setAttente((a) => ({
        ...a,
        batiments: a.batiments.map((b) => (b.tempId !== batiment.tempId ? b : {
          ...b,
          niveaux: b.niveaux.map((n) => (n.tempId !== niveau.tempId ? n : {
            ...n,
            appartements: n.appartements.filter((ap) => ap.tempId !== appartement.tempId),
          })),
        })),
      }));
      return;
    }
    // Le serveur REFUSE tant qu'une réserve est rattachée, et son message
    // porte le nombre exact : on l'affiche tel quel.
    await agir(
      () => supprimerZone(chantierId, batiment.id, niveau.id, appartement.id),
      t('depot.suppressionImpossible'),
    );
  };

  // ── Plans d'un appartement ──────────────────────────────────────────────
  const ajouterPlansAppartement = async (batiment, niveau, appartement, fichiers) => {
    if (brouillon) {
      setAttente((a) => ({
        ...a,
        batiments: a.batiments.map((b) => (b.tempId !== batiment.tempId ? b : {
          ...b,
          niveaux: b.niveaux.map((n) => (n.tempId !== niveau.tempId ? n : {
            ...n,
            appartements: n.appartements.map((ap) => (ap.tempId !== appartement.tempId ? ap : {
              ...ap, fichiers: [...ap.fichiers, ...fichiers],
            })),
          })),
        })),
      }));
      return;
    }
    await agir(async () => {
      for (const f of fichiers) {
        await uploaderPlan(chantierId, {
          fichier: f, nom: f.name, format: formatDe(f.name),
          batimentId: batiment.id, etageId: niveau.id, zoneId: appartement.id,
        });
      }
    }, t('depot.envoiImpossible'));
  };

  const remplacerPlan = async (plan, fichier) => {
    await agir(
      () => remplacerFichierPlan(plan.id, { fichier, format: formatDe(fichier.name) }),
      t('depot.remplacementImpossible'),
    );
  };

  const retirerPlan = async (plan) => {
    const ok = await SwalCustom.confirm({
      title: t('depot.supprimerPlan', { nom: plan.nom }), icon: 'warning', danger: true,
    });
    if (!ok) return;
    await agir(() => supprimerPlan(plan.id), t('depot.suppressionImpossible'));
  };

  const retirerFichierAttente = (batiment, niveau, appartement, index) => {
    setAttente((a) => ({
      ...a,
      batiments: a.batiments.map((b) => (b.tempId !== batiment.tempId ? b : {
        ...b,
        niveaux: b.niveaux.map((n) => (n.tempId !== niveau.tempId ? n : {
          ...n,
          appartements: n.appartements.map((ap) => (ap.tempId !== appartement.tempId ? ap : {
            ...ap, fichiers: ap.fichiers.filter((_, i) => i !== index),
          })),
        })),
      })),
    }));
  };

  // ── Catalogues : ajouter un code manquant ───────────────────────────────
  const nouveauCodeNiveau = async (code, typeNiveau) => {
    const cree = await creerCodeNiveau({ code, typeNiveau });
    setCodesNiveau((c) => [...c, cree]);
    return cree;
  };

  const nouveauCodeAppartement = async (code) => {
    const cree = await creerCodeAppartement({ code });
    setCodesAppartement((c) => [...c, cree]);
    return cree;
  };

  // ── Envoi du brouillon ──────────────────────────────────────────────────
  const aQuelqueChoseAEnvoyer = !!attente.planGlobal || attente.batiments.length > 0;

  /**
   * Crée le chantier PUIS téléverse tout ce qui attend.
   *
   * L'ordre compte : le chantier doit exister pour porter un plan. Il est donc
   * créé au moment de l'envoi, jamais à l'ouverture de l'écran — un abandon en
   * cours de dépôt ne laisse ainsi aucune demande vide derrière lui.
   */
  const envoyerBrouillon = async (formulaire) => {
    setEnvoi(true);
    try {
      const c = await creerChantier(formulaire);
      const nouvelId = c.id;

      if (attente.planGlobal) {
        await uploaderPlan(nouvelId, {
          fichier: attente.planGlobal,
          nom: attente.planGlobal.name,
          format: formatDe(attente.planGlobal.name),
        });
      }

      for (const b of attente.batiments) {
        const batiment = await creerBatiment(nouvelId, { nom: b.nom, ...(b.code ? { code: b.code } : {}) });
        if (b.fichier) {
          await uploaderPlan(nouvelId, {
            fichier: b.fichier, nom: b.fichier.name, format: formatDe(b.fichier.name),
            batimentId: batiment.id,
          });
        }
        for (const n of b.niveaux) {
          const etage = await creerEtage(nouvelId, batiment.id, {
            nom: n.codeNiveau, typeNiveau: n.typeNiveau, codeNiveau: n.codeNiveau,
          });
          if (n.fichier) {
            await uploaderPlan(nouvelId, {
              fichier: n.fichier, nom: n.fichier.name, format: formatDe(n.fichier.name),
              batimentId: batiment.id, etageId: etage.id,
            });
          }
          for (const ap of n.appartements) {
            const zone = await creerZone(nouvelId, batiment.id, etage.id, { nom: ap.code, type: 'logement' });
            for (const f of ap.fichiers) {
              await uploaderPlan(nouvelId, {
                fichier: f, nom: f.name, format: formatDe(f.name),
                batimentId: batiment.id, etageId: etage.id, zoneId: zone.id,
              });
            }
          }
        }
      }

      SwalCustom.success(t('depot.envoye'));
      setDemande(false);
      navigate(`/depot-plans/${nouvelId}`);
    } catch (err) {
      SwalCustom.error({ title: t('depot.envoiImpossible'), text: getErrorMessage(err) });
    } finally {
      setEnvoi(false);
    }
  };

  if (loading) return <SkeletonListe lignes={4} />;
  if (erreur) return <ErrorState message={erreur} onRetry={charger} />;

  const batiments = brouillon ? attente.batiments : (chantier?.batiments || []);
  const titre = brouillon ? t('depot.titreNouveau') : (chantier?.nom || t('depot.titre'));

  return (
    <>
      <PageHeader title={titre} subtitle={t('depot.sousTitre')}>
        {brouillon && (
          <button
            className="btn btn-primary"
            disabled={!aQuelqueChoseAEnvoyer || envoi}
            onClick={() => setDemande(true)}
          >
            <Send size={16} /> {t('depot.envoyer')}
          </button>
        )}
      </PageHeader>

      {brouillon && (
        <p className="text-muted" style={{ fontSize: 13, marginTop: -8 }}>
          {t('depot.aideBrouillon')}
        </p>
      )}

      {referentielsIndisponibles && (
        <ErrorState
          variante="reseau"
          titre={t('depot.referentielsIndisponiblesTitre')}
          message={t('depot.referentielsIndisponibles')}
          onRetry={charger}
        />
      )}

      <BlocPlanGlobal
        plan={planGlobalServeur}
        fichierAttente={attente.planGlobal}
        onChoisir={deposerPlanGlobal}
        onRetirerAttente={() => setAttente((a) => ({ ...a, planGlobal: null }))}
        onSupprimer={retirerPlan}
        occupe={envoi}
      />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2><Building2 size={17} style={{ verticalAlign: -3 }} /> {t('depot.batiments', { n: batiments.length })}</h2>
          <BoutonAjoutBatiment onAjouter={ajouterBatiment} occupe={envoi} />
        </div>
        <div className="card-body">
          {batiments.length === 0 ? (
            <EmptyState
              title={t('depot.aucunBatiment')}
              message={t('depot.aucunBatimentMessage')}
            />
          ) : batiments.map((b) => (
            <CarteBatiment
              key={b.id || b.tempId}
              batiment={b}
              brouillon={brouillon}
              plans={plans}
              codesNiveau={codesNiveau}
              codesAppartement={codesAppartement}
              occupe={envoi}
              onAjouterNiveau={ajouterNiveau}
              onAjouterAppartement={ajouterAppartement}
              onRenommerAppartement={renommerAppartement}
              onRetirerAppartement={retirerAppartement}
              onAjouterPlans={ajouterPlansAppartement}
              onRemplacerPlan={remplacerPlan}
              onRetirerPlan={retirerPlan}
              onRetirerFichierAttente={retirerFichierAttente}
              onNouveauCodeNiveau={nouveauCodeNiveau}
              onNouveauCodeAppartement={nouveauCodeAppartement}
            />
          ))}
        </div>
      </div>

      <DemandeChantierModal
        open={demande}
        onClose={() => setDemande(false)}
        onEnvoyer={envoyerBrouillon}
        occupe={envoi}
      />
    </>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
 * Listes de codes : choisir dans le catalogue, ou en ajouter un
 * ══════════════════════════════════════════════════════════════════════════ */


