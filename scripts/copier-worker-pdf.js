/**
 * Copie le worker pdf.js de node_modules vers public/.
 *
 * POURQUOI CETTE ÉTAPE plutôt qu'un simple import :
 *
 * Le worker est un fichier `.mjs`. Le serveur de développement de Vite traite
 * tout `.mjs` — y compris sous `node_modules/` — comme un module de
 * l'application : il le fait passer par sa chaîne de transformation et y
 * injecte son client HMR. Le fichier servi passe de 1,2 Mo à 6,6 Mo, et le
 * premier `getDocument` d'un plan met alors 921 ms contre 177 ms depuis
 * `public/` (mesuré sur ce projet, contenu identique).
 *
 * Le worker fonctionne dans les deux cas : c'est un choix de performance en
 * développement, et de robustesse — un fichier tiers minifié n'a pas à
 * traverser la chaîne de transformation de notre application, ni à dépendre
 * d'un détail d'implémentation de Vite. `public/` est le seul emplacement
 * servi VERBATIM en développement et recopié tel quel au build.
 *
 * Le fichier est relu depuis `node_modules` à chaque exécution : il ne peut
 * donc pas diverger de la version réellement installée de `pdfjs-dist`, ce
 * qu'un fichier versionné dans le dépôt finirait par faire.
 *
 * Lancé automatiquement par `predev` et `prebuild` (voir package.json).
 */
import { copyFileSync, cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

const source = join(racine, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const destination = join(racine, 'public', 'pdf.worker.min.mjs');

if (!existsSync(source)) {
  // On échoue franchement : un worker manquant ne se voit qu'à l'ouverture
  // d'un plan, où pdf.js bascule silencieusement sur le fil principal et fige
  // l'interface pendant l'analyse du document. Mieux vaut bloquer ici, où le
  // message est lisible.
  console.error(
    `[pdf.js] Worker introuvable : ${source}\n` +
    'Lancez `npm install` avant de démarrer ou de construire.'
  );
  process.exit(1);
}

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log('[pdf.js] Worker copié dans public/pdf.worker.min.mjs');

/**
 * Polices standard de pdf.js.
 *
 * POURQUOI elles sont nécessaires : un PDF n'est pas tenu d'embarquer les
 * quatorze polices « standard » du format (Helvetica, Times, Courier…). C'est
 * le cas de beaucoup d'exports CAO — et des rapports que le backend produit
 * lui-même avec pdfkit. Sans ces fichiers, pdf.js signale
 * « The standard font "…" is not available » et substitue une police
 * approchante : les cotes et les libellés de pièces se décalent, parfois
 * jusqu'à devenir illisibles sur une vignette.
 *
 * Elles vivent dans `public/` pour la même raison que le worker : servies
 * verbatim, sans passer par la chaîne de transformation de Vite.
 *
 * Absence TOLÉRÉE, contrairement au worker : pdf.js dégrade proprement
 * (substitution) là où un worker manquant fige l'interface. On avertit sans
 * bloquer le démarrage.
 */
const sourcePolices = join(racine, 'node_modules', 'pdfjs-dist', 'standard_fonts');
const destinationPolices = join(racine, 'public', 'standard_fonts');

if (existsSync(sourcePolices)) {
  cpSync(sourcePolices, destinationPolices, { recursive: true });
  console.log('[pdf.js] Polices standard copiées dans public/standard_fonts/');
} else {
  console.warn(
    `[pdf.js] Polices standard introuvables : ${sourcePolices}
` +
    'Les PDF sans polices embarquées seront rendus avec des substituts.'
  );
}
