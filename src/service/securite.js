/**
 * Garde-fous de sécurité côté navigateur.
 *
 * ── Ce que ce module est, et ce qu'il n'est pas ───────────────────────────
 *
 * Rien de ce qui s'exécute ici n'est une frontière de sécurité : le navigateur
 * appartient à l'utilisateur, qui peut modifier ce code à volonté. Toute
 * autorisation qui compte est vérifiée par l'API (`auth`, `requireRole`,
 * `checkOrganisation`, `checkFileAccess`).
 *
 * Ces fonctions servent à autre chose : empêcher que l'APPLICATION elle-même
 * devienne l'outil de l'attaque. Un lien piégé qui lui fait appeler une autre
 * route que prévu, un jeton qu'elle joint à une requête vers un autre domaine,
 * un fichier qu'elle affiche dans sa propre origine, un journal d'erreurs qui
 * transporte une session — autant de cas où le serveur n'est pas en cause et
 * où seul le client peut refuser.
 *
 * Toutes les fonctions sont PURES (pas de dépendance à axios ni à React) :
 * elles se testent sans monter l'application.
 */

/* ════════════════════════════════════════════════════════════════════════
 *  1. Le jeton ne part que vers l'API
 * ════════════════════════════════════════════════════════════════════════ */

/** Même règle qu'axios (`isAbsoluteURL`) : `http:`, `https:` ou `//hôte`. */
const URL_ABSOLUE = /^([a-z][a-z\d+\-.]*:)?\/\//i;

/**
 * La requête part-elle vers l'origine de l'API ?
 *
 * ## Pourquoi ce contrôle
 *
 * L'intercepteur joignait `Authorization: Bearer …` à TOUTE requête passée par
 * le client HTTP, quelle que soit sa destination. Or axios ignore `baseURL`
 * dès que l'URL est absolue : une URL servie par le serveur — une adresse de
 * stockage signée, un lien de CDN — emportait la session de l'utilisateur vers
 * un domaine tiers, qui la verrait dans ses journaux d'accès.
 *
 * Ce n'est pas théorique dans ce projet : le serveur expose déjà une fonction
 * d'URL signée (`storage.service.js#urlTemporaire`). Le jour où un fichier
 * privé est servi par ce biais, chaque aperçu enverrait le jeton à Cloudflare.
 *
 * ## La règle
 *
 * Reproduit exactement la façon dont axios choisit sa cible : une URL relative
 * part vers `baseURL`, une URL absolue part vers elle-même. Le jeton n'est
 * joint que si cette cible a la même origine (schéma + hôte + port) que l'API.
 *
 * @param {string} url            URL de la requête, telle que passée à axios.
 * @param {string} baseURL        `baseURL` de l'instance.
 * @param {string} origineCourante Origine de la page (`window.location.origin`),
 *   pour résoudre une `baseURL` relative comme `/api/v1`.
 * @returns {boolean}
 */
export function estRequeteVersApi(url, baseURL, origineCourante) {
  try {
    const origineApi = new URL(baseURL || '/', origineCourante).origin;
    if (!URL_ABSOLUE.test(url || '')) return true;          // relative → baseURL
    return new URL(url, origineCourante).origin === origineApi;
  } catch {
    // URL indéchiffrable : dans le doute, on ne joint pas la session.
    return false;
  }
}

/* ════════════════════════════════════════════════════════════════════════
 *  2. Traversée de chemin côté client (CSPT)
 * ════════════════════════════════════════════════════════════════════════ */

/** Segment `.` ou `..`, en début de chemin, entre deux `/`, ou en fin. */
const SEGMENT_POINT = /(^|\/)\.{1,2}(\/|$)/;

/**
 * Le chemin de la requête contient-il une traversée ?
 *
 * ## L'attaque
 *
 * Les écrans construisent leurs URL d'API à partir de paramètres de route :
 * `getChantier(id)` appelle `/chantiers/${id}`. React Router DÉCODE ces
 * paramètres. Un lien piégé comme
 *
 *     https://app…/chantiers/..%2F..%2Forganisation%2Fmembres%2F<id>
 *
 * donne `id = "../../organisation/membres/<id>"`, l'écran appelle
 * `/chantiers/../../organisation/membres/<id>`, et le navigateur NORMALISE ce
 * chemin avant l'envoi : la requête part vers `/organisation/membres/<id>`,
 * avec la session de la victime. Si l'écran propose ensuite « Supprimer », la
 * même construction mène un `DELETE` sur une autre ressource que celle
 * affichée — c'est la famille d'attaques dite CSPT.
 *
 * L'API reste juge de ce que la victime a le DROIT de faire ; le problème est
 * que l'application lui fait faire autre chose que ce qu'elle croit faire.
 *
 * ## La règle
 *
 * Aucun identifiant de ce produit ne contient de point isolé ni de barre
 * oblique inverse : ce sont des UUID, des codes, ou des chemins de fichiers
 * générés par le serveur. Un segment `.` / `..`, même encodé une ou deux fois,
 * ou une barre inverse (que les navigateurs traitent comme `/`), n'a donc
 * aucune raison légitime d'apparaître dans le chemin d'une requête.
 *
 * Seul le CHEMIN est examiné — la chaîne de requête et le fragment peuvent
 * légitimement contenir n'importe quoi (une recherche « ../ » par exemple).
 *
 * @param {string} url
 * @returns {boolean} `true` si la requête doit être refusée.
 */
export function cheminSuspect(url) {
  if (!url) return false;
  let chemin = String(url).split(/[?#]/)[0];
  // Une URL absolue : on ne regarde que son chemin, pas son schéma ni son hôte.
  if (URL_ABSOLUE.test(chemin)) chemin = chemin.replace(URL_ABSOLUE, '/').replace(/^\/[^/]*/, '');

  for (let passe = 0; passe < 3; passe += 1) {
    if (SEGMENT_POINT.test(chemin) || chemin.includes('\\')) return true;
    let decode;
    try {
      decode = decodeURIComponent(chemin);
    } catch {
      // Encodage malformé : le navigateur ne le décodera pas davantage, il ne
      // peut donc plus produire de segment `..`. On s'arrête là.
      return false;
    }
    if (decode === chemin) return false;
    chemin = decode;
  }
  // Encodé plus de trois fois : aucune URL légitime n'en a besoin.
  return true;
}

/* ════════════════════════════════════════════════════════════════════════
 *  3. Aucune session dans les journaux
 * ════════════════════════════════════════════════════════════════════════ */

/** Clés dont la valeur ne doit JAMAIS quitter le navigateur. */
const CLE_SENSIBLE = /authorization|cookie|token|jeton|password|mot_de_passe|motdepasse|secret|otp|clientsecret|client_secret/i;

/** `Bearer eyJ…` et, plus largement, tout ce qui a la forme d'un JWT. */
/** @type {Array<[RegExp, string]>} */
const MOTIFS_SECRETS = [
  [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [masqué]'],
  [/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, '[jeton masqué]'],
  // Secret client Stripe d'une intention de paiement.
  [/pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+/g, '[secret de paiement masqué]'],
];

/**
 * Copie d'une valeur dont les secrets ont été masqués.
 *
 * ## Pourquoi
 *
 * Une erreur axios transporte sa configuration complète — y compris
 * `config.headers.Authorization`. L'écrire telle quelle dans la console
 * (`console.warn('…', err)`), c'est l'écrire en clair ; et le monitoring
 * capture les appels à la console comme fil d'Ariane de chaque rapport
 * d'erreur. La session d'un utilisateur finissait ainsi dans un outil tiers,
 * lisible par quiconque y a accès, et valable une heure.
 *
 * Masque par CLÉ (tout champ nommé comme un secret) et par FORME (toute chaîne
 * qui ressemble à un jeton), à profondeur bornée pour ne jamais boucler sur
 * une structure cyclique.
 *
 * @template T
 * @param {T} valeur
 * @param {number} [profondeur]
 * @returns {T}
 */
export function masquerSecrets(valeur, profondeur = 0) {
  if (valeur === null || valeur === undefined) return valeur;
  if (typeof valeur === 'string') {
    return /** @type {T} */ (/** @type {unknown} */ (
      MOTIFS_SECRETS.reduce((texte, [motif, remplacement]) => texte.replace(motif, remplacement), /** @type {string} */ (valeur))
    ));
  }
  if (typeof valeur !== 'object') return valeur;
  if (profondeur > 8) return /** @type {T} */ (/** @type {unknown} */ ('[profondeur max]'));

  if (Array.isArray(valeur)) {
    return /** @type {T} */ (/** @type {unknown} */ (valeur.map((v) => masquerSecrets(v, profondeur + 1))));
  }

  // Une `Error` garde son nom, son message et sa pile — masqués — et perd le
  // reste : ce sont ces champs-là que les outils affichent.
  if (valeur instanceof Error) {
    const copie = new Error(masquerSecrets(valeur.message, profondeur + 1));
    copie.name = valeur.name;
    copie.stack = masquerSecrets(valeur.stack, profondeur + 1);
    return /** @type {T} */ (/** @type {unknown} */ (copie));
  }

  /** @type {Record<string, unknown>} */
  const sortie = {};
  for (const [cle, v] of Object.entries(valeur)) {
    sortie[cle] = CLE_SENSIBLE.test(cle) ? '[masqué]' : masquerSecrets(v, profondeur + 1);
  }
  return /** @type {T} */ (/** @type {unknown} */ (sortie));
}

/**
 * Ramène une erreur de requête à ce qu'il est utile de journaliser.
 *
 * Garde : le nom, le message, la méthode, le chemin (sans chaîne de requête),
 * le statut HTTP et le code d'erreur. Jette : la configuration (en-têtes,
 * jeton), le corps envoyé (mots de passe, données personnelles) et la réponse.
 * Une erreur qui ne vient pas d'une requête est rendue telle quelle, masquée.
 *
 * @param {unknown} erreur
 * @returns {unknown}
 */
export function nettoyerErreur(erreur) {
  if (!erreur || typeof erreur !== 'object') return masquerSecrets(erreur);
  const e = /** @type {Record<string, any>} */ (erreur);
  const estRequete = Boolean(e.isAxiosError || e.config || e.response);
  if (!estRequete) return masquerSecrets(erreur);

  const propre = /** @type {Error & Record<string, unknown>} */ (
    new Error(masquerSecrets(String(e.message || 'Erreur de requête')))
  );
  propre.name = e.name || 'ErreurRequete';
  propre.stack = masquerSecrets(e.stack);
  propre.methode = typeof e.config?.method === 'string' ? e.config.method.toUpperCase() : undefined;
  propre.chemin = typeof e.config?.url === 'string' ? e.config.url.split('?')[0] : undefined;
  propre.statut = e.response?.status;
  propre.code = e.code;
  return propre;
}

/* ════════════════════════════════════════════════════════════════════════
 *  4. Afficher un fichier sans lui confier notre origine
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Les types que l'interface accepte d'afficher DANS SA PROPRE ORIGINE.
 *
 * Miroir exact de la liste blanche d'envoi du serveur
 * (`config/security.js#uploadConfig.allowedMimeTypes`) : un fichier qui a pu
 * être déposé peut être affiché, un autre non.
 */
export const TYPES_AFFICHABLES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/webm',
]);

/** Erreur levée quand un fichier reçu n'est pas d'un type affichable. */
export class ErreurTypeFichier extends Error {
  /** @param {string} typeRecu */
  constructor(typeRecu) {
    super(`Type de fichier non affichable : ${typeRecu}`);
    this.name = 'ErreurTypeFichier';
    this.code = 'TYPE_NON_AFFICHABLE';
    this.typeRecu = typeRecu;
  }
}

/**
 * Type réel d'un fichier, lu dans ses premiers octets.
 *
 * Sert UNIQUEMENT à récupérer un type sûr quand le serveur n'en déclare pas
 * (`application/octet-stream`, fichiers anciens relayés depuis le disque) — un
 * type ainsi reconnu est forcément dans la liste blanche.
 *
 * @param {Blob} blob
 * @returns {Promise<string|null>}
 */
async function detecterType(blob) {
  if (!blob || typeof blob.slice !== 'function') return null;
  let octets;
  try {
    octets = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  } catch {
    return null;
  }
  const ascii = (debut, fin) => String.fromCharCode(...octets.slice(debut, fin));
  if (ascii(0, 4) === '%PDF') return 'application/pdf';
  if (octets[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (octets[0] === 0xFF && octets[1] === 0xD8 && octets[2] === 0xFF) return 'image/jpeg';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp') return 'video/mp4';
  return null;
}

/**
 * Rend un blob sûr à afficher, ou refuse.
 *
 * ## Pourquoi
 *
 * Un aperçu passe par `URL.createObjectURL(blob)`. Or une URL `blob:` hérite de
 * l'ORIGINE de la page qui la crée : un fichier HTML ou SVG ouvert ainsi dans
 * une `<iframe>` exécuterait ses scripts DANS l'application — avec accès à la
 * session de l'utilisateur. Le rendu dépend du TYPE du blob, pas de son
 * contenu : un blob typé `application/pdf` est rendu comme un PDF quoi qu'il
 * contienne, jamais comme une page.
 *
 * Le serveur filtre déjà les dépôts par octets magiques. Ce contrôle est la
 * seconde ligne : il tient même si un fichier ancien, une migration ou une
 * page d'erreur (HTML) arrive à la place du document attendu.
 *
 * @param {Blob} blob
 * @returns {Promise<Blob>}
 * @throws {ErreurTypeFichier}
 */
export async function versBlobAffichable(blob) {
  const declare = String(blob?.type || '').split(';')[0].trim().toLowerCase();
  if (TYPES_AFFICHABLES.has(declare)) return blob;

  // Rien de déclaré, ou un type générique : on regarde ce que c'est vraiment.
  if (!declare || declare === 'application/octet-stream' || declare === 'binary/octet-stream') {
    const reel = await detecterType(blob);
    if (reel) return new Blob([blob], { type: reel });
  }
  throw new ErreurTypeFichier(declare || 'inconnu');
}

/* ════════════════════════════════════════════════════════════════════════
 *  5. Fichiers choisis par l'utilisateur, avant envoi
 * ════════════════════════════════════════════════════════════════════════ */

/** Plafonds du serveur (`config/security.js#uploadConfig`). */
export const TAILLE_MAX_DOCUMENT = 5 * 1024 * 1024;
export const TAILLE_MAX_MEDIA = 100 * 1024 * 1024;

/** Types acceptés pour un document, un plan ou une pièce jointe. */
export const TYPES_DOCUMENT = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

/** Types acceptés pour une photo ou une vidéo de réserve. */
export const TYPES_MEDIA = [
  'image/png', 'image/jpeg', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
];

/**
 * Types acceptés dans la GED d'un chantier (onglet Documents).
 *
 * Miroir de `backend/src/middlewares/upload.middleware.js#MIME_DOCUMENT` : la
 * GED reçoit aussi Word, Excel, PowerPoint, DWG et des vidéos. Le formulaire
 * s'en tenait aux PDF et images, et refusait donc ce que le serveur accepte.
 */
export const TYPES_GED = [
  ...TYPES_DOCUMENT,
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/acad', 'application/x-acad', 'application/dwg', 'application/x-dwg', 'image/vnd.dwg', 'image/x-dwg',
  'video/mp4', 'video/webm', 'video/quicktime',
];

/**
 * Extensions de la GED — pour l'attribut `accept`, et pour trancher quand le
 * navigateur ne donne aucun type (le cas du DWG sur la plupart des postes).
 */
export const EXTENSIONS_GED = [
  '.pdf', '.png', '.jpg', '.jpeg', '.webp',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.dwg',
  '.mp4', '.mov', '.webm',
];

/**
 * Motif de refus d'un fichier de GED, ou `null`. Le plafond dépend du format,
 * comme côté serveur : 100 Mo pour une vidéo, 5 Mo sinon.
 *
 * @param {File|null|undefined} fichier
 * @returns {null | { motif: 'type' | 'taille', tailleMaxMo: number }}
 */
export function motifRefusFichierGed(fichier) {
  if (!fichier) return null;
  const type = String(fichier.type || '').toLowerCase();
  const nom = String(fichier.name || '').toLowerCase();
  const extension = nom.includes('.') ? nom.slice(nom.lastIndexOf('.')) : '';
  const video = type.startsWith('video/') || ['.mp4', '.mov', '.webm'].includes(extension);
  const tailleMax = video ? TAILLE_MAX_MEDIA : TAILLE_MAX_DOCUMENT;
  const tailleMaxMo = Math.round(tailleMax / 1048576);

  // Type générique ou absent : l'extension tranche. Le serveur, lui, relit
  // de toute façon les octets.
  const typeConnu = type && type !== 'application/octet-stream';
  const accepte = typeConnu ? TYPES_GED.includes(type) : EXTENSIONS_GED.includes(extension);
  if (!accepte) return { motif: 'type', tailleMaxMo };
  if (fichier.size > tailleMax) return { motif: 'taille', tailleMaxMo };
  return null;
}

/**
 * Motif d'un fichier refusé avant envoi, ou `null` s'il est acceptable.
 *
 * Ce n'est PAS un contrôle de sécurité — le serveur refait tout, octets
 * magiques compris. C'est un contrôle de bon sens : refuser un fichier de
 * 80 Mo AVANT de le téléverser en 3G, plutôt qu'après deux minutes d'envoi et
 * un refus du serveur.
 *
 * @param {File|null|undefined} fichier
 * @param {{ types: string[], tailleMax: number }} regles
 * @returns {null | { motif: 'type' | 'taille', tailleMaxMo: number }}
 */
export function motifRefusFichier(fichier, { types, tailleMax }) {
  if (!fichier) return null;
  const type = String(fichier.type || '').toLowerCase();
  // Un type vide (certains navigateurs pour des extensions rares) est laissé au
  // serveur, qui lit les octets : le refuser ici bloquerait des fichiers sains.
  if (type && !types.includes(type)) return { motif: 'type', tailleMaxMo: Math.round(tailleMax / 1048576) };
  if (fichier.size > tailleMax) return { motif: 'taille', tailleMaxMo: Math.round(tailleMax / 1048576) };
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
 *  6. Échappement HTML
 * ════════════════════════════════════════════════════════════════════════ */

const ENTITES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Échappe une valeur destinée à un gabarit HTML.
 *
 * React échappe tout ce qu'il affiche ; ce n'est vrai QUE pour React. Les
 * boîtes de dialogue SweetAlert acceptent une option `html` qui, elle, est
 * injectée telle quelle. Toute valeur interpolée dans un tel gabarit doit
 * passer par ici.
 *
 * @param {unknown} valeur
 * @returns {string}
 */
export function echapperHtml(valeur) {
  return String(valeur ?? '').replace(/[&<>"']/g, (c) => ENTITES[/** @type {keyof typeof ENTITES} */ (c)]);
}
