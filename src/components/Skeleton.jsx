/**
 * Squelettes de chargement.
 *
 * Remplacent le `Spinner` centré sur les écrans dont on connaît d'avance la
 * structure : le squelette montre la forme à venir, ce qui supprime le saut de
 * mise en page à l'arrivée des données et rend l'attente plus courte à
 * l'usage, même à durée égale.
 *
 * L'animation est désactivée sous `prefers-reduced-motion` (voir la feuille
 * de styles) — un scintillement permanent est une gêne réelle pour une partie
 * des utilisateurs.
 */

export function SkeletonLigne({ largeur = '100%', hauteur = 14, radius = 6 }) {
  return <span className="skel" style={{ width: largeur, height: hauteur, borderRadius: radius }} />;
}

/** Silhouette d'une carte KPI. */
export function SkeletonStat() {
  return (
    <div className="stat-card skel-card">
      <div className="stat-head">
        <SkeletonLigne largeur={40} hauteur={40} radius={12} />
      </div>
      <div className="stat-corps">
        <SkeletonLigne largeur="55%" hauteur={26} />
        <SkeletonLigne largeur="75%" hauteur={12} />
      </div>
    </div>
  );
}

/** Grille de cartes KPI. */
export function SkeletonStatGrid({ nombre = 4 }) {
  return (
    <div className="stat-grid">
      {Array.from({ length: nombre }, (_, i) => <SkeletonStat key={i} />)}
    </div>
  );
}

/** Bloc de la taille d'un graphique. */
export function SkeletonChart({ hauteur = 220 }) {
  return <div className="skel skel-chart" style={{ height: hauteur }} />;
}

/** Lignes d'une liste ou d'un tableau. */
export function SkeletonListe({ lignes = 5 }) {
  return (
    <div className="skel-liste">
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="skel-liste-ligne">
          <SkeletonLigne largeur={34} hauteur={34} radius={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <SkeletonLigne largeur={`${60 - i * 4}%`} />
            <SkeletonLigne largeur={`${40 - i * 3}%`} hauteur={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
