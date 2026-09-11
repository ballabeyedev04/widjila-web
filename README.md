# Widjila — portail web

Portail d'administration de Suivi Chantier : pilotage des chantiers, des
réserves, des plans, des inspections et des abonnements. React 19 + Vite,
JavaScript avec vérification de types sur la couche de service.

Le mobile (Flutter) et l'API (Node/Express) vivent dans deux dépôts séparés :
`widjila-mobile` et `widjila-backend`.

---

## Démarrer

```bash
npm install
cp .env.example .env      # laisser VITE_API_BASE_URL VIDE en développement
npm run dev               # http://127.0.0.1:5175
```

Le backend doit tourner en parallèle sur le port 3000. `vite.config.js`
proxifie `/api` et `/uploads` vers lui : **aucune configuration CORS n'est
nécessaire en développement**, et c'est la raison pour laquelle
`VITE_API_BASE_URL` doit rester vide. Une URL absolue court-circuite ce proxy.

En production, l'admin et l'API sont sur deux domaines distincts —
`VITE_API_BASE_URL` porte alors l'URL absolue de l'API, et `CORS_ORIGIN` côté
backend doit lister le domaine de l'admin.

---

## Commandes

| Commande            | Ce qu'elle fait                                            |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Serveur de développement, port 5175                        |
| `npm run typecheck` | Vérification de types (`tsc --noEmit`) — voir plus bas     |
| `npm run lint`      | ESLint sur tout le dépôt                                    |
| `npm test`          | Suite de tests (Vitest + Testing Library)                   |
| `npm run build`     | Build de production dans `dist/`                            |
| `npm run preview`   | Sert le build produit, pour vérifier avant déploiement      |

Les quatre premières sont exécutées par la CI avant tout déploiement
(`.github/workflows/deploy.yml`) : un échec de l'une d'elles bloque la mise en
production.

---

## Variables d'environnement

| Variable                       | Rôle                                                     |
| ------------------------------ | -------------------------------------------------------- |
| `VITE_API_BASE_URL`            | URL de l'API. **Vide en dev** (proxy Vite).              |
| `VITE_STRIPE_PUBLISHABLE_KEY`  | Clé **publique** Stripe. Aucune clé secrète ici.          |
| `VITE_SENTRY_DSN`              | Monitoring d'erreurs. **Sans lui, rien ne remonte.**      |
| `VITE_DEV_API_PORT`            | Port du backend local, si différent de 3000.              |

Tout ce qui commence par `VITE_` **part dans le bundle du navigateur** et est
lisible par n'importe qui. Aucun secret ne doit y figurer.

`.env` n'est jamais commité (voir `.gitignore`) et doit exister sur le serveur
avant le build : Vite substitue ces valeurs à la compilation, pas à l'exécution.

---

## Architecture

```
src/
├── main.jsx              Point d'entrée — i18n et monitoring avant le rendu
├── App.jsx               Providers : erreurs → utilisateur → abonnement → routage
├── routes/
│   ├── AppRoutes.jsx     Table de routage. Trois écrans immédiats, le reste différé
│   └── ProtectedRoute    Gardes d'AFFICHAGE — jamais de sécurité (voir plus bas)
├── layouts/
│   └── AdminLayout       Coquille : menu latéral, barre du haut, bandeau réseau
├── pages/                Un dossier par domaine métier
│   └── <domaine>/
│       ├── Ecran.jsx     L'écran : chargement, état, agencement
│       └── sections/     Ses modales et blocs, quand l'écran dépasse ~500 lignes
├── components/           Composants partagés entre plusieurs domaines
│   ├── plan/             Visionneuse de plan (pdf.js), repères, hotspots
│   ├── charts/           Graphiques en SVG pur — aucune librairie
│   └── table/            Tableau de données
├── hooks/                Logique réutilisable (listes paginées, réseau, énumérations)
├── service/              TOUS les appels réseau. Un fichier par domaine d'API
├── context/              Utilisateur connecté, statut d'abonnement
├── i18n/locales/<lang>/  Un fichier par langue ET par namespace
└── utils/                Fonctions pures : formats, constantes métier, alertes
```

### Ce qui vit où

- **Un composant n'appelle jamais `axios` directement.** Tout passe par
  `service/`, qui centralise l'authentification, les délais d'attente, la
  déduplication des écritures et le renouvellement de session.
- **`utils/constants.js` est le miroir de `backend/src/config/roles.js`.** Les
  groupes de rôles y sont recopiés, et tout écart entre les deux produit soit
  un bouton qui mène à un 403, soit une fonctionnalité invisible à qui y a
  droit.
- **Les écrans de plus de ~500 lignes sont découpés** en `sections/`. Le seuil
  n'a rien de sacré ; ce qui compte est qu'un fichier ne mélange pas plusieurs
  sujets.

---

## Sécurité — ce que le front ne fait PAS

> **Les gardes de `ProtectedRoute` ne sont pas une frontière de sécurité.**

Elles tournent dans le navigateur de l'utilisateur, donc sous son contrôle
total. Un jeton modifié dans les outils de développement, un `fetch()` appelé
directement : rien de tout cela n'est empêché ici. Elles évitent seulement
d'AFFICHER une page à quelqu'un qui n'a manifestement pas le droit de la voir.

**Toute autorisation qui compte est vérifiée côté backend**, par les
middlewares `auth`, `checkActiveUser`, `requireRole` et `checkOrganisation` sur
chaque route. Ajouter un écran ici sans que l'endpoint correspondant vérifie
lui-même les droits ne protège rien.

Autres points structurants :

- le jeton d'accès vit en `sessionStorage`, le jeton de rafraîchissement en
  cookie `httpOnly` — c'est lui la source de vérité de la session ;
- aucune injection HTML nulle part : pas de `dangerouslySetInnerHTML`, pas
  d'`innerHTML`, pas d'`eval` ;
- le jeton n'est joint qu'aux requêtes vers l'API — jamais à une URL absolue
  d'un autre domaine (`service/securite.js#estRequeteVersApi`) ;
- un chemin de requête contenant une traversée (`..`, même encodée) est refusé
  avant l'envoi : un lien piégé ne peut pas faire viser une autre ressource
  que celle affichée (`cheminSuspect`) ;
- un fichier n'est affiché dans l'application que s'il est d'un type sûr (PDF,
  image, vidéo, son) : une URL `blob:` hérite de notre origine
  (`versBlobAffichable`) ;
- la déconnexion est annoncée à tous les onglets, et le renouvellement de
  session est sérialisé entre eux (jeton de rafraîchissement à usage unique) ;
- les journaux et le monitoring ne reçoivent jamais d'en-tête `Authorization`
  ni de jeton (`masquerSecrets`) ;
- le paiement se fait uniquement par carte (Stripe), sur l'écran Abonnement —
  le mobile y renvoie aussi. Un succès n'est annoncé que confirmé par le
  serveur, jamais sur la foi d'un paramètre d'URL ;
- les en-têtes de sécurité (CSP, HSTS, `frame-ancestors 'none'`…) sont posés
  par nginx — voir `backend/deploy/nginx-admin.conf`. **La CSP est ce qui rend
  acceptable le jeton en `sessionStorage`** : toute exception `unsafe-inline`
  ajoutée à `script-src` transformerait ce point en vulnérabilité réelle.

---

## Vérification de types sans TypeScript

Le projet est en JavaScript. `tsconfig.json` active `checkJs` sur
`src/service/` et `src/utils/` — la couche qui porte les contrats d'API — à
partir des annotations JSDoc, sans qu'aucun fichier soit renommé en `.ts`.

Ce n'est pas un principe. Un audit a trouvé, dans le code de production, un
champ envoyé sous un nom que le serveur ignore : `motDePasse` au lieu de
`mot_de_passe`, retiré en silence par `stripUnknown` côté Joi. Le mot de passe
saisi à la création d'un membre n'a donc jamais été celui du compte, et rien —
ni erreur, ni journal, ni test — ne pouvait le révéler.

Pour étendre la portée, ajouter un chemin à `include` dans `tsconfig.json` et
corriger ce qui remonte. Fichier par fichier, jamais d'un bloc.

---

## Internationalisation

Quatre langues : français (repli), anglais, allemand, espagnol.

Un fichier **par langue et par namespace** : `locales/fr/chantier.js`. Ce
découpage n'est pas cosmétique — quand les quatre langues vivaient dans le même
module, un lecteur francophone téléchargeait aussi les trois autres, soit
356 Ko de traductions inutiles dans le paquet d'entrée.

Seul le français est chargé d'office ; les autres arrivent quand on bascule
dessus (`applyLanguage`, qui est donc asynchrone).

Ajouter une clé demande de la poser **dans les quatre fichiers**. Une clé
absente ne provoque aucune erreur : i18next affiche la clé brute — invisible en
développement, où l'on travaille en français.

La langue est une donnée de COMPTE (`utilisateur.langue`), pas une préférence
d'appareil : `localStorage` n'en est qu'un cache pour éviter un clignotement au
démarrage.

---

## Tests

```bash
npm test                          # tout
npx vitest run src/pages/auth     # un dossier
npx vitest                        # mode veille
```

La couverture vise le RISQUE, pas le pourcentage. Ce qui est tenu par des
tests, dans l'ordre de ce que ça coûterait :

- l'authentification — connexion, double authentification, rôle d'arrivée, et
  la règle de déconnexion après échec de renouvellement ;
- la déduplication des écritures — qu'un double clic n'écrive qu'une fois ;
- les champs obligatoires d'une réserve, et le parcours de demande de chantier ;
- l'accessibilité des formulaires d'authentification (aucun champ orphelin) ;
- le chargement des quatre langues ;
- les gardes de rôle et la cohérence menu / routes.

---

## Déploiement

Automatique sur `push` vers `main` : le pipeline enchaîne lint, vérification de
types, tests puis build, et **ne déploie que si les quatre passent**. Le VPS
récupère le code, reconstruit et sert `dist/` par nginx.

Le premier déploiement demande un `git clone` manuel sur le serveur et un
`.env` rempli — le workflow ne fait que mettre à jour ensuite.

---

## En cas de problème

**Tous les appels API échouent en développement.** `VITE_API_BASE_URL` est
probablement renseignée : la vider fait repasser par le proxy Vite. Vérifier
aussi que le backend écoute bien sur 3000.

**Une page affiche des clés au lieu des libellés** (`chantier.liste.titre`). La
clé manque dans le fichier de langue courant. Les quatre fichiers d'un
namespace doivent porter les mêmes clés.

**Les appels sont bloqués en production, pas en développement.** La CSP
(`nginx-admin.conf`) liste les domaines joignables. Si le domaine de l'API a
changé, `connect-src` ne le connaît pas — le placeholder n'est substitué qu'à
l'installation initiale du serveur.

**Une modification de style ne s'applique pas.** Vérifier que la variable CSS
existe : une variable non déclarée rend la déclaration entière invalide, en
silence. Les jetons du thème sont dans `index.css`.

**Aucune erreur ne remonte alors qu'un écran plante.** `VITE_SENTRY_DSN` n'est
pas renseignée sur le serveur : le monitoring est câblé mais inerte sans elle.
