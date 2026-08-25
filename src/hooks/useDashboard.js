import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  statsGlobales, evolution, statsParEntreprise,
} from '../service/dashboard/dashboardService.js';
import { getErrorMessage } from '../service/helpers.js';
import { STATUTS_RESERVE, SEVERITES, enumLabel } from '../utils/constants.js';
import { COULEUR_STATUT, COULEUR_SEVERITE, TEINTES, couleurPourIndex } from '../components/charts/chartTokens.js';

/** Statuts qui ferment le cycle de vie d'une réserve — miroir du back. */
const STATUTS_FERMES = ['validee', 'cloturee'];

/** `2026-08` → `août` dans la langue active. */
function libelleMois(cle, langue) {
  const [annee, mois] = String(cle).split('-').map(Number);
  if (!annee || !mois) return cle;
  return new Intl.DateTimeFormat(langue, { month: 'short' }).format(new Date(annee, mois - 1, 1));
}

/**
 * Charge et met en forme les données du tableau de bord.
 *
 * Toutes les valeurs viennent d'endpoints EXISTANTS — aucune donnée inventée,
 * aucun appel ajouté côté serveur :
 *   - `GET /dashboard`               → statsGlobales
 *   - `GET /dashboard/evolution`     → série mensuelle + comparaison annuelle
 *   - `GET /dashboard/par-entreprise`→ classement des entreprises
 *
 * Les deux derniers sont chargés en « best-effort » : ils alimentent des
 * sections secondaires, et leur indisponibilité (droits insuffisants selon le
 * rôle, panne partielle) ne doit pas priver l'utilisateur de ses KPI
 * principaux. Chaque bloc sait donc dire qu'il n'a rien à montrer.
 */
export function useDashboard({ langue = 'fr', avecEntreprises = true } = {}) {
  const [stats, setStats] = useState(null);
  const [evo, setEvo] = useState(null);
  const [entreprises, setEntreprises] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  const requestIdRef = useRef(0);

  const charger = useCallback(async () => {
    const id = ++requestIdRef.current;
    setLoading(true);
    setErreur(null);

    // `allSettled` et non `all` : l'échec d'une section secondaire ne doit pas
    // faire tomber tout l'écran.
    const [rStats, rEvo, rEnt] = await Promise.allSettled([
      statsGlobales(),
      evolution(),
      avecEntreprises ? statsParEntreprise() : Promise.resolve(null),
    ]);

    if (requestIdRef.current !== id) return; // réponse périmée

    if (rStats.status === 'fulfilled') {
      setStats(rStats.value);
    } else {
      setErreur(getErrorMessage(rStats.reason));
    }
    setEvo(rEvo.status === 'fulfilled' ? rEvo.value : null);
    setEntreprises(rEnt.status === 'fulfilled' ? rEnt.value : null);
    setLoading(false);
  }, [avecEntreprises]);

  useEffect(() => { charger(); }, [charger]);

  /** Indicateurs dérivés, calculés une seule fois par jeu de données. */
  const derive = useMemo(() => {
    if (!stats) return null;

    const reserves = stats.reserves || {};
    const total = reserves.total || 0;
    const validees = reserves.validees || 0;

    // Taux de résolution : part des réserves refermées. `null` quand il n'y a
    // aucune réserve — afficher « 0 % » sur un chantier qui démarre serait un
    // faux signal d'alarme.
    const tauxResolution = total > 0 ? Math.round((validees / total) * 100) : null;

    const parStatut = Object.entries(stats.parStatut || {})
      .map(([cle, valeur]) => ({
        cle,
        valeur,
        label: enumLabel(cle, STATUTS_RESERVE[cle]?.label || cle),
        couleur: COULEUR_STATUT[cle] || TEINTES.neutre,
      }))
      .sort((a, b) => b.valeur - a.valeur);

    const parSeverite = Object.entries(stats.parSeverite || {})
      .map(([cle, valeur]) => ({
        cle,
        valeur,
        label: enumLabel(cle, SEVERITES[cle]?.label || cle),
        couleur: COULEUR_SEVERITE[cle] || TEINTES.neutre,
      }))
      .sort((a, b) => b.valeur - a.valeur);

    // Chantiers les plus chargés, plafonnés à 6 : au-delà, un classement
    // cesse d'être lisible d'un coup d'œil et devient un tableau.
    const topChantiers = [...(stats.parChantier || [])]
      .sort((a, b) => (b.reserves?.ouvertes || 0) - (a.reserves?.ouvertes || 0))
      .slice(0, 6)
      .map((c, i) => ({
        cle: c.id,
        label: c.nom,
        valeur: c.reserves?.ouvertes || 0,
        sousTitre: `${c.reserves?.total || 0} au total`,
        couleur: couleurPourIndex(i),
        lien: `/chantiers/${c.id}`,
      }));

    const topEntreprises = [...(entreprises || [])]
      .slice(0, 6)
      .map((e, i) => ({
        cle: e.entrepriseId,
        label: e.nom,
        valeur: e.ouvertes || 0,
        sousTitre: `${e.total || 0} au total`,
        couleur: couleurPourIndex(i),
      }));

    const series = evo?.series || [];
    const timeline = {
      labels: series.map((p) => libelleMois(p.mois, langue)),
      series: [
        {
          label: 'Créées',
          valeurs: series.map((p) => p.creees || 0),
          couleur: TEINTES.primaire,
        },
        {
          label: 'Validées',
          valeurs: series.map((p) => p.validees || 0),
          couleur: TEINTES.succes,
        },
      ],
    };

    return {
      reserves,
      tauxResolution,
      parStatut,
      parSeverite,
      topChantiers,
      topEntreprises,
      timeline,
      // Variation annuelle du volume de réserves — `null` si le serveur n'a
      // pas d'année précédente à comparer.
      variationAnnuelle: evo?.comparaison?.variationPct ?? null,
      aDesDonnees: (stats.chantiers || 0) > 0,
      STATUTS_FERMES,
    };
  }, [stats, evo, entreprises, langue]);

  return { stats, derive, loading, erreur, recharger: charger };
}

export default useDashboard;
