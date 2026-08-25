import { Link } from 'react-router-dom';
import { formatNombre } from '../../utils/format.js';
import { ChartVide } from './AreaChart.jsx';

/**
 * Classement à barres horizontales.
 *
 * Préféré à un histogramme vertical pour les listes nommées (chantiers,
 * entreprises) : les libellés se lisent à l'horizontale, sans rotation à 45°
 * qui rend un axe illisible dès qu'un nom dépasse quinze caractères.
 *
 * @param {{cle: string, label: string, valeur: number, sousTitre?: string,
 *          couleur: string, lien?: string}[]} donnees
 */
export default function BarList({ donnees = [], hauteur = 220, suffixe }) {
  const lignes = donnees.filter((d) => d.valeur != null);
  if (lignes.length === 0) return <ChartVide hauteur={hauteur} />;

  // Échelle relative au PLUS GRAND de la liste, pas au total : sur dix
  // chantiers, des barres calculées sur le total feraient toutes 10 % et le
  // classement deviendrait indéchiffrable.
  const max = Math.max(1, ...lignes.map((d) => d.valeur));

  return (
    <ul className="barlist">
      {lignes.map((d) => {
        const contenu = (
          <>
            <div className="barlist-tete">
              <span className="barlist-label" title={d.label}>{d.label}</span>
              <span className="barlist-valeur">
                {formatNombre(d.valeur)}{suffixe}
              </span>
            </div>
            <div className="barlist-piste">
              <div
                className="barlist-barre"
                style={{
                  width: `${Math.max(2, (d.valeur / max) * 100)}%`,
                  background: d.couleur,
                }}
              />
            </div>
            {d.sousTitre && <span className="barlist-sous">{d.sousTitre}</span>}
          </>
        );

        return (
          <li key={d.cle} className="barlist-ligne">
            {d.lien ? <Link to={d.lien} className="barlist-lien">{contenu}</Link> : contenu}
          </li>
        );
      })}
    </ul>
  );
}
