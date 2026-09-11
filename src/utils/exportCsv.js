/**
 * Export CSV : BOM UTF-8 (compatibilité Excel avec accents) + séparateur ;.
 * `headers` = tableau de libellés, `rows` = tableau de tableaux.
 */
/**
 * Une cellule CSV, guillemets doublés — et SANS formule exécutable.
 *
 * CORRECTIF (audit sécurité — injection de formule) : les exports reprennent
 * des textes saisis par d'autres (noms, titres de réserves, raisons
 * sociales). Une cellule qui commence par `=`, `+`, `-`, `@`, une tabulation
 * ou un retour chariot est lue comme une FORMULE par Excel et LibreOffice :
 * `=HYPERLINK("https://…";"Cliquer")`, ou pire, s'exécute à l'ouverture chez
 * l'administrateur qui a exporté. Une apostrophe en tête la ramène à du texte
 * (recommandation OWASP). Les nombres ne sont pas concernés : `-5` reste un
 * nombre.
 */
export const celluleCsv = (cell) => {
  let s = cell === null || cell === undefined ? '' : String(cell);
  if (typeof cell === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const exportCsv = ({ fileName = 'export.csv', headers = [], rows = [] }) => {
  const escape = celluleCsv;

  const lines = [headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))];
  const bom = '﻿';
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
