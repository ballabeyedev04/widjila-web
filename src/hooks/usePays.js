import { useEffect, useState } from 'react';
import { chargerPays } from '../service/referentiel/referentielService.js';

/**
 * Catalogue des pays du formulaire d'inscription.
 *
 * ── Pourquoi il vient du serveur ──────────────────────────────────────────
 * Les identifiants d'entreprise varient d'un pays à l'autre — SIRET en France,
 * NINEA au Sénégal, NIF au Mali, NCC et IDU en Côte d'Ivoire. Recopier cette
 * table ici la ferait diverger de celle que le backend applique réellement, et
 * l'écart ne se verrait qu'au moment d'un refus d'inscription.
 *
 * ── Pas de repli local ────────────────────────────────────────────────────
 * Contrairement aux énumérations, il n'y a AUCUNE liste de secours : proposer
 * un pays que le serveur ne connaît pas produirait une inscription refusée.
 * Tant que l'appel n'a pas répondu, le sélecteur reste vide et le formulaire
 * le dit.
 *
 * Cache de module : ces données ne changent qu'avec une livraison.
 */
let cache = null;
let enVol = null;

export function usePays() {
  const [pays, setPays] = useState(cache ?? []);
  const [chargement, setChargement] = useState(!cache);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (cache) return undefined;

    let vivant = true;
    enVol = enVol ?? chargerPays();

    enVol
      .then((liste) => {
        if (Array.isArray(liste) && liste.length) cache = liste;
        if (vivant) {
          setPays(cache ?? []);
          setChargement(false);
        }
      })
      .catch((err) => {
        if (vivant) {
          setErreur(err);
          setChargement(false);
        }
      })
      .finally(() => { enVol = null; });

    return () => { vivant = false; };
  }, []);

  return { pays, chargement, erreur };
}

/** Vide le cache — réservé aux tests, qui doivent repartir d'un état neuf. */
export function _reinitialiserCachePays() {
  cache = null;
  enVol = null;
}
