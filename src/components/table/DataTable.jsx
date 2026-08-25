import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, ArrowUp, ArrowDown, ChevronsUpDown, SlidersHorizontal } from 'lucide-react';

import EmptyState from '../EmptyState.jsx';
import ErrorState from '../ErrorState.jsx';
import { SkeletonListe } from '../Skeleton.jsx';
import { useDataTable } from './useDataTable.js';

/**
 * Tableau dynamique réutilisable : recherche globale, filtre par colonne,
 * tri, pagination, et les quatre états (chargement, erreur, vide, sans
 * résultat).
 *
 * ── Contrat des colonnes ────────────────────────────────────────────────────
 *   cle          identifiant unique, et propriété lue par défaut
 *   titre        en-tête affiché
 *   rendu(l)     JSX de la cellule — sinon la valeur brute est affichée
 *   valeur(l)    valeur BRUTE pour trier/filtrer, quand `rendu` produit du JSX
 *   triable      false pour interdire le tri (colonne d'actions)
 *   filtre       'texte' | 'select' | false (défaut : false)
 *   options      [{valeur, label}] — requis si filtre === 'select'
 *   recherchable false pour exclure de la recherche globale
 *   largeur      style CSS appliqué à la colonne
 *   alignement   'droite' pour les nombres et les actions
 *
 * Ne convient qu'aux jeux de données COMPLETS côté client : voir l'en-tête de
 * `useDataTable` pour la raison.
 */
export default function DataTable({
  donnees = [],
  colonnes = [],
  cleLigne = (l) => l.id,
  parPage = 10,
  triInitial = null,
  chargement = false,
  erreur = null,
  onRetry,
  titreVide,
  messageVide,
  actionVide,
  rechercheGlobale = true,
  placeholderRecherche,
  actions,
  onLigneClic,
  compact = false,
}) {
  const { t } = useTranslation('layout');
  const idBase = useId();

  const table = useDataTable({ donnees, colonnes, parPageInitial: parPage, triInitial });

  const colonnesFiltrables = colonnes.filter((c) => c.filtre === 'texte' || c.filtre === 'select');

  // ── États non nominaux ────────────────────────────────────────────────────
  if (erreur) return <ErrorState message={erreur} onRetry={onRetry} />;
  if (chargement) return <SkeletonListe lignes={6} />;

  // Jeu de données réellement vide : distinct d'un filtrage sans résultat.
  if (table.totalDonnees === 0) {
    return <EmptyState title={titreVide} message={messageVide} action={actionVide} />;
  }

  const iconeTri = (colonne) => {
    if (colonne.triable === false) return null;
    if (table.tri?.cle !== colonne.cle) return <ChevronsUpDown size={12} className="tri-inactif" />;
    return table.tri.sens === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="datatable">
      {(rechercheGlobale || colonnesFiltrables.length > 0 || actions) && (
        <div className="datatable-barre">
          {rechercheGlobale && (
            <div className="datatable-recherche">
              <Search size={15} />
              <input
                className="input"
                type="search"
                value={table.recherche}
                placeholder={placeholderRecherche ?? t('actions.rechercher')}
                onChange={(e) => table.definirRecherche(e.target.value)}
                aria-label={placeholderRecherche ?? t('actions.rechercher')}
              />
            </div>
          )}

          {table.aDesFiltres && (
            <button className="btn btn-ghost btn-sm" onClick={table.reinitialiser}>
              <X size={14} /> {t('actions.reinitialiser')}
            </button>
          )}

          {actions && <div className="datatable-actions">{actions}</div>}
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className={`table${compact ? ' table-compact' : ''}`}>
            <thead>
              <tr>
                {colonnes.map((c) => (
                  <th
                    key={c.cle}
                    style={{ width: c.largeur, textAlign: c.alignement === 'droite' ? 'right' : undefined }}
                    aria-sort={
                      table.tri?.cle === c.cle
                        ? (table.tri.sens === 'asc' ? 'ascending' : 'descending')
                        : undefined
                    }
                  >
                    {c.triable === false ? (
                      c.titre
                    ) : (
                      <button
                        type="button"
                        className={`th-tri${table.tri?.cle === c.cle ? ' actif' : ''}`}
                        onClick={() => table.basculerTri(c.cle)}
                      >
                        {c.titre} {iconeTri(c)}
                      </button>
                    )}
                  </th>
                ))}
              </tr>

              {/* Ligne de filtres — une case par colonne qui le déclare. Les
                  autres reçoivent une cellule vide pour que l'alignement des
                  colonnes reste exact. */}
              {colonnesFiltrables.length > 0 && (
                <tr className="datatable-filtres">
                  {colonnes.map((c) => (
                    <th key={c.cle}>
                      {c.filtre === 'texte' && (
                        <input
                          className="input input-filtre"
                          type="search"
                          value={table.filtres[c.cle] ?? ''}
                          onChange={(e) => table.definirFiltre(c.cle, e.target.value)}
                          placeholder={c.titre}
                          aria-label={`${t('actions.filtrer')} — ${c.titre}`}
                          id={`${idBase}-f-${c.cle}`}
                        />
                      )}
                      {c.filtre === 'select' && (
                        <select
                          className="input input-filtre"
                          value={table.filtres[c.cle] ?? ''}
                          onChange={(e) => table.definirFiltre(c.cle, e.target.value)}
                          aria-label={`${t('actions.filtrer')} — ${c.titre}`}
                          id={`${idBase}-f-${c.cle}`}
                        >
                          <option value="">{t('etats.tous')}</option>
                          {(c.options ?? []).map((o) => (
                            <option key={o.valeur} value={o.valeur}>{o.label}</option>
                          ))}
                        </select>
                      )}
                    </th>
                  ))}
                </tr>
              )}
            </thead>

            <tbody>
              {table.lignes.map((ligne) => (
                <tr
                  key={cleLigne(ligne)}
                  className={onLigneClic ? 'table-row-click' : undefined}
                  onClick={onLigneClic ? () => onLigneClic(ligne) : undefined}
                >
                  {colonnes.map((c) => (
                    <td
                      key={c.cle}
                      style={{ textAlign: c.alignement === 'droite' ? 'right' : undefined }}
                    >
                      {c.rendu ? c.rendu(ligne) : (ligne?.[c.cle] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Filtrage sans résultat : message DIFFÉRENT du jeu vide, puisqu'il
            appelle un élargissement de la recherche et non une création. */}
        {table.lignes.length === 0 && (
          <div className="datatable-sans-resultat">
            <SlidersHorizontal size={22} />
            <p>{t('etats.aucunResultat')}</p>
            <button className="btn btn-secondary btn-sm" onClick={table.reinitialiser}>
              {t('actions.reinitialiser')}
            </button>
          </div>
        )}
      </div>

      {/* Pagination masquée s'il n'y a qu'une page : une seule page affichée
          en permanence est du bruit. */}
      {table.totalPages > 1 && (
        <PaginationTable table={table} />
      )}
    </div>
  );
}

function PaginationTable({ table }) {
  const { t } = useTranslation('layout');
  const { page, totalPages, setPage, total, parPage, setParPage } = table;

  // Fenêtre glissante de 5 numéros : au-delà, la barre déborde sur mobile.
  const debut = Math.max(1, Math.min(page - 2, totalPages - 4));
  const fin = Math.min(totalPages, debut + 4);
  const numeros = [];
  for (let i = debut; i <= fin; i += 1) numeros.push(i);

  return (
    <div className="datatable-pagination">
      <span className="datatable-compte">
        {t('pagination.resultats', { count: total })}
      </span>

      <div className="datatable-pages">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          {t('actions.precedent')}
        </button>

        {debut > 1 && <span className="datatable-ellipse">…</span>}

        {numeros.map((n) => (
          <button
            key={n}
            className={`btn btn-sm ${n === page ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPage(n)}
            aria-current={n === page ? 'page' : undefined}
          >
            {n}
          </button>
        ))}

        {fin < totalPages && <span className="datatable-ellipse">…</span>}

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
        >
          {t('actions.suivant')}
        </button>
      </div>

      <select
        className="input input-filtre datatable-parpage"
        value={parPage}
        onChange={(e) => { setParPage(Number(e.target.value)); setPage(1); }}
        aria-label={t('pagination.parPage')}
      >
        {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}
