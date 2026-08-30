import * as pdfjsLib from 'pdfjs-dist';

/**
 * Configuration du worker pdf.js — isolée dans son propre module.
 *
 * Deux raisons de ne pas la laisser dans le composant :
 *   - `PlanCanvas` et `PlanVignette` rendent tous deux du PDF ; une
 *     configuration dupliquée finirait par diverger, et le rendu marcherait
 *     d'un côté sans marcher de l'autre ;
 *   - les tests peuvent la remplacer par un stub sans neutraliser tout
 *     `pdfjs-dist` — la seule résolution de l'asset suffisait à faire expirer
 *     le démarrage du worker de test.
 *
 * POURQUOI SERVIR LE WORKER DEPUIS `public/` plutôt que l'importer depuis
 * `node_modules` (via `new URL(...)` ou `?url`) :
 *
 * Le worker est un `.mjs`. Le serveur de développement de Vite traite tout
 * `.mjs` — y compris sous `node_modules/` — comme un module de l'application :
 * il le fait passer par sa chaîne de transformation et y injecte son client
 * HMR. Le fichier servi passe alors de 1,2 Mo à 6,6 Mo. Mesuré sur ce projet,
 * le premier `getDocument` d'un plan met 921 ms par cette voie contre 177 ms
 * depuis `public/`, pour un contenu strictement identique.
 *
 * Le worker DÉMARRE dans les deux cas — le client HMR de Vite tolère
 * aujourd'hui le contexte Worker, rien n'est cassé. C'est donc un choix de
 * performance en développement, et de robustesse : un fichier tiers minifié
 * n'a aucune raison de traverser la chaîne de transformation de notre
 * application, ni d'y dépendre d'un détail d'implémentation de Vite.
 *
 * En production, les deux voies donnent le même résultat : Vite émet le
 * worker comme asset séparé, non transformé.
 *
 * Le fichier est déposé dans `public/` par `scripts/copier-worker-pdf.js`,
 * exécuté par `predev` et `prebuild` — c'est donc toujours celui de la
 * version de `pdfjs-dist` réellement installée.
 *
 * `BASE_URL` et non `/` en dur : l'application peut être servie depuis un
 * sous-chemin (`vite build --base=/admin/`), auquel cas une adresse absolue
 * pointerait à côté.
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

/**
 * Options communes à tout `getDocument`, partagées par `PlanCanvas` et
 * `PlanVignette`.
 *
 * `standardFontDataUrl` : un PDF n'est pas tenu d'embarquer les quatorze
 * polices « standard » du format (Helvetica, Times, Courier…). Beaucoup
 * d'exports CAO ne le font pas. Sans ce chemin, pdf.js substitue une police
 * approchante : les cotes et les libellés de pièces se décalent, parfois
 * jusqu'à devenir illisibles sur une vignette. Les fichiers sont déposés dans
 * `public/` par `scripts/copier-worker-pdf.js`.
 *
 * Factorisé ici pour la même raison que `workerSrc` : deux configurations
 * dupliquées finiraient par diverger, et le rendu marcherait d'un côté sans
 * marcher de l'autre.
 *
 * @param {Uint8Array} donnees — octets du document
 */
export function optionsDocument(donnees) {
  return {
    data: donnees,

    // ── SÉCURITÉ — GHSA-hq66-cqwq-w95j (CVSS 8.6) ────────────────────────
    //
    // Un PDF peut embarquer du JavaScript. pdf.js l'exécute par défaut
    // (`enableScripting: true`), dans le contexte de NOTRE domaine : un plan
    // piégé, téléversé par n'importe quel membre, s'exécuterait donc dans le
    // navigateur de tous ceux qui l'ouvrent — avec accès à la session.
    //
    // C'est la première des deux parades documentées par l'avis. Elle ne
    // coûte rien ici : une application de suivi de chantier n'a aucune raison
    // d'exécuter le script d'un plan. La seconde parade — une CSP restreignant
    // `script-src` — relève du serveur qui sert l'application.
    //
    // ⚠️ Ce n'est PAS un correctif complet. Les versions 5.6.83 à 6.2.107 de
    // `pdfjs-dist` restent vulnérables ; la correction amont est 6.2.108+,
    // une montée de version MAJEURE qui change l'API de rendu. Elle demande
    // une vérification visuelle du rendu des plans avant d'être livrée.
    enableScripting: false,

    // Défense en profondeur : interdit à pdf.js de recourir à `eval` pour les
    // polices de type 1 — vecteur d'une faille antérieure (CVE-2024-4367).
    // Sans effet sur le rendu des plans testés.
    isEvalSupported: false,

    standardFontDataUrl: `${import.meta.env.BASE_URL}standard_fonts/`,
  };
}

export default pdfjsLib.GlobalWorkerOptions;
