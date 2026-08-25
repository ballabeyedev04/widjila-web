import { useId } from 'react';
import { TEINTES } from './chartTokens.js';

/**
 * Courbe d'évolution à une ou deux séries, en SVG pur.
 *
 * Aucune librairie : les graphiques du projet sont peu nombreux et simples,
 * là où une dépendance comme Recharts pèserait plus lourd que tout le reste
 * du bundle et imposerait ses propres couleurs. Ici tout vient des variables
 * CSS de la charte.
 *
 * Responsive par `viewBox` : le SVG se redimensionne avec son conteneur sans
 * mesure JavaScript ni écouteur de redimensionnement.
 *
 * @param {{label: string, valeurs: number[], couleur: string}[]} series
 * @param {string[]} labels — légendes de l'axe horizontal (mois, jours…)
 */
export default function AreaChart({ series = [], labels = [], hauteur = 220 }) {
  const id = useId();

  const sansDonnees =
    series.length === 0 || series.every((s) => (s.valeurs || []).every((v) => !v));
  if (sansDonnees) return <ChartVide hauteur={hauteur} />;

  // Repère interne fixe : les coordonnées sont calculées une fois, le
  // navigateur se charge de la mise à l'échelle.
  const L = 520;
  const H = 180;
  const margeBas = 22;
  const margeHaut = 8;
  const utile = H - margeBas - margeHaut;

  const nbPoints = Math.max(...series.map((s) => s.valeurs.length), 1);
  // `|| 1` : une série entièrement à zéro diviserait par zéro et produirait
  // des coordonnées NaN — le tracé disparaîtrait sans erreur visible.
  const max = Math.max(1, ...series.flatMap((s) => s.valeurs));

  const x = (i) => (nbPoints === 1 ? L / 2 : (i / (nbPoints - 1)) * L);
  const y = (v) => margeHaut + utile - (v / max) * utile;

  return (
    <div className="chart-wrap" style={{ height: hauteur }}>
      <svg
        viewBox={`0 0 ${L} ${H}`}
        preserveAspectRatio="none"
        className="chart-svg"
        role="img"
        aria-label={series.map((s) => s.label).join(', ')}
      >
        <defs>
          {series.map((s, idx) => (
            <linearGradient key={idx} id={`${id}-g${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.couleur} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.couleur} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Lignes de repère : 4 paliers suffisent à situer une valeur sans
            transformer le fond en papier millimétré. */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1="0"
            x2={L}
            y1={margeHaut + utile * p}
            y2={margeHaut + utile * p}
            stroke="var(--border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {series.map((s, idx) => {
          const pts = s.valeurs.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          const aire = `${x(0)},${margeHaut + utile} ${pts} ${x(s.valeurs.length - 1)},${margeHaut + utile}`;
          return (
            <g key={idx}>
              <polygon points={aire} fill={`url(#${id}-g${idx})`} />
              <polyline
                points={pts}
                fill="none"
                stroke={s.couleur}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                // Sans cela, l'étirement horizontal du viewBox épaissirait le
                // trait de façon inégale selon la largeur de l'écran.
                vectorEffect="non-scaling-stroke"
                className="chart-line"
              />
            </g>
          );
        })}
      </svg>

      {labels.length > 0 && (
        <div className="chart-axis">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}

      <div className="chart-legend">
        {series.map((s, idx) => (
          <span key={idx} className="chart-legend-item">
            <i style={{ background: s.couleur }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChartVide({ hauteur = 220, message }) {
  return (
    <div className="chart-vide" style={{ height: hauteur }}>
      <span>{message ?? '—'}</span>
    </div>
  );
}

export { TEINTES };
