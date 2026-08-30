import { useEffect, useState } from 'react';
import { chargerEnums } from '../service/referentiel/referentielService.js';
import * as REPLI from '../utils/constants.js';

/**
 * Énumérations métier, servies par le backend plutôt que recopiées.
 *
 * ── Le problème résolu ────────────────────────────────────────────────────
 * Les listes de statuts, sévérités et types vivaient en double : une fois
 * dans les colonnes ENUM de la base, une fois en dur dans `constants.js`. Un
 * statut ajouté côté serveur restait invisible ici — le filtre ne le
 * proposait pas — et rien ne le signalait.
 *
 * ── Pourquoi un REPLI local subsiste ──────────────────────────────────────
 * L'appel est asynchrone. Sans repli, chaque filtre et chaque badge serait
 * vide le temps du premier chargement, et le resterait si le réseau tombe.
 * Le repli n'est PAS une seconde source de vérité : il ne sert qu'à couvrir
 * l'instant précédant la réponse, après quoi le serveur fait foi — y compris
 * pour les valeurs que le repli ne connaît pas.
 *
 * ── Cache de module ───────────────────────────────────────────────────────
 * Ces listes ne changent qu'avec une migration et un déploiement : les
 * recharger à chaque montage serait une requête par écran, pour une réponse
 * toujours identique. Le cache vit le temps de l'onglet.
 */

/** Codes reçus du serveur, partagés par tous les appels du hook. */
let cache = null;
/** Requête en vol, pour que dix composants montés ensemble n'en fassent qu'une. */
let enVol = null;

/** Ordre de repli, extrait des maps de présentation locales. */
const REPLI_CODES = {
  roles: Object.keys(REPLI.ROLES),
  statutsUtilisateur: Object.keys(REPLI.STATUTS_UTILISATEUR),
  statutsChantier: Object.keys(REPLI.STATUTS_CHANTIER),
  statutsReserve: Object.keys(REPLI.STATUTS_RESERVE),
  severites: Object.keys(REPLI.SEVERITES),
  priorites: Object.keys(REPLI.PRIORITES),
  typesInspection: Object.keys(REPLI.TYPES_INSPECTION),
  statutsInspection: Object.keys(REPLI.STATUTS_INSPECTION),
  statutsConvocation: Object.keys(REPLI.STATUTS_CONVOCATION),
  typesDocument: Object.keys(REPLI.TYPES_DOCUMENT),
  statutsDocument: Object.keys(REPLI.STATUTS_DOCUMENT),
  typesPartenaire: Object.keys(REPLI.TYPES_PARTENAIRE),
};

/**
 * Charge les énumérations une seule fois par onglet.
 *
 * Un échec est volontairement SILENCIEUX : le repli local couvre l'affichage,
 * et une bannière d'erreur pour des libellés de badge inquiéterait
 * l'utilisateur sans rien lui permettre de faire.
 */
export function useEnums() {
  const [enums, setEnums] = useState(cache ?? REPLI_CODES);

  useEffect(() => {
    if (cache) return;

    let vivant = true;
    enVol = enVol ?? chargerEnums();

    enVol
      .then((recus) => {
        if (recus && Object.keys(recus).length) cache = recus;
        if (vivant && cache) setEnums(cache);
      })
      .catch(() => { /* repli local — voir l'en-tête */ })
      .finally(() => { enVol = null; });

    return () => { vivant = false; };
  }, []);

  return enums;
}

/**
 * Codes d'une énumération donnée, dans l'ordre servi par le serveur.
 *
 * @param {string} nom clé de la vue publique (`statutsReserve`, `roles`…)
 * @returns {string[]} codes bruts, à traduire avec `enumLabel`
 */
export function useEnum(nom) {
  const enums = useEnums();
  return enums[nom] ?? REPLI_CODES[nom] ?? [];
}

/** Vide le cache — réservé aux tests, qui doivent repartir d'un état neuf. */
export function _reinitialiserCacheEnums() {
  cache = null;
  enVol = null;
}
