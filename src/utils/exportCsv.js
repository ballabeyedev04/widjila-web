/**
 * Export CSV : BOM UTF-8 (compatibilité Excel avec accents) + séparateur ;.
 * `headers` = tableau de libellés, `rows` = tableau de tableaux.
 */
export const exportCsv = ({ fileName = 'export.csv', headers = [], rows = [] }) => {
  const escape = (cell) => {
    const s = cell === null || cell === undefined ? '' : String(cell);
    return `"${s.replace(/"/g, '""')}"`;
  };

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
