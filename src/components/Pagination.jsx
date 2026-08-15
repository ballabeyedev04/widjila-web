import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Pagination standard : infos + boutons Précédent/Suivant + numéros. */
export default function Pagination({ page, totalPages, total, limit, onPage }) {
  const { t } = useTranslation('layout');

  if (total === 0) return null;

  const totalPagesResolved = totalPages || Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const last = totalPagesResolved;

  // Numéros visibles (fenêtre de 5 autour de la page courante)
  const start = Math.max(1, page - 2);
  const end = Math.min(last, page + 2);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination">
      <span className="pagination-info">
        {t('pagination.intervalle', { from, to, total })}
      </span>
      <div className="pagination-btns">
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label={t('actions.precedent')}>
          <ChevronLeft size={16} />
        </button>
        {start > 1 && (
          <>
            <button className="page-btn" onClick={() => onPage(1)}>1</button>
            {start > 2 && <span className="page-btn" style={{ border: 'none', background: 'transparent' }}>…</span>}
          </>
        )}
        {pages.map((p) => (
          <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>
            {p}
          </button>
        ))}
        {end < last && (
          <>
            {end < last - 1 && <span className="page-btn" style={{ border: 'none', background: 'transparent' }}>…</span>}
            <button className="page-btn" onClick={() => onPage(last)}>{last}</button>
          </>
        )}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page >= last} aria-label={t('actions.suivant')}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
