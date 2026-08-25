import { formatNombre } from '../../utils/format.js';
import { ChartVide } from './AreaChart.jsx';

/**
 * Anneau de répartition, en SVG pur.
 *
 * Construit avec `stroke-dasharray` sur des cercles concentriques plutôt
 * qu'avec des chemins d'arcs : moins de trigonométrie, et le trait garde une
 * épaisseur constante quelle que soit la taille de rendu.
 *
 * @param {{cle: string, label: string, valeur: number, couleur: string}[]} donnees
 */
export default function DonutChart({ donnees = [], total, libelleCentre, hauteur = 220 }) {
  const parts = donnees.filter((d) => d.valeur > 0);
  const somme = total ?? parts.reduce((acc, d) => acc + d.valeur, 0);

  if (!somme) return <ChartVide hauteur={hauteur} />;

  const rayon = 60;
  const circonference = 2 * Math.PI * rayon;

  // Décalages calculés EN AMONT du rendu : accumuler une variable dans le
  // `map` reviendrait à muter pendant le rendu, ce que le compilateur React
  // interdit — le résultat dépendrait alors du nombre de passes.
  const segments = parts.reduce((acc, d) => {
    const longueur = (d.valeur / somme) * circonference;
    const precedent = acc.length ? acc[acc.length - 1] : null;
    const debut = precedent ? precedent.debut + precedent.longueur : 0;
    return [...acc, { ...d, longueur, debut }];
  }, []);

  return (
    <div className="donut-wrap" style={{ minHeight: hauteur }}>
      <div className="donut-graph">
        <svg viewBox="0 0 160 160" role="img" aria-label={libelleCentre}>
          {/* Piste de fond : sans elle, un anneau presque vide donnerait
              l'impression d'un graphique cassé plutôt que d'un faible taux. */}
          <circle
            cx="80"
            cy="80"
            r={rayon}
            fill="none"
            stroke="var(--border)"
            strokeWidth="18"
          />
          {segments.map((d) => (
            <circle
              key={d.cle}
              cx="80"
              cy="80"
              r={rayon}
              fill="none"
              stroke={d.couleur}
              strokeWidth="18"
              strokeDasharray={`${d.longueur} ${circonference - d.longueur}`}
              strokeDashoffset={-d.debut}
              // Rotation d'un quart de tour : le premier secteur démarre en
              // haut, là où l'œil commence, et non à droite.
              transform="rotate(-90 80 80)"
              strokeLinecap="butt"
            />
          ))}
        </svg>

        <div className="donut-centre">
          <strong>{formatNombre(somme)}</strong>
          {libelleCentre && <span>{libelleCentre}</span>}
        </div>
      </div>

      <ul className="donut-legende">
        {segments.map((d) => (
          <li key={d.cle}>
            <i style={{ background: d.couleur }} />
            <span className="donut-legende-label">{d.label}</span>
            <span className="donut-legende-valeur">{formatNombre(d.valeur)}</span>
            <span className="donut-legende-pct">{Math.round((d.valeur / somme) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
