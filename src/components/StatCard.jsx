import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatNombre } from '../utils/format.js';

/**
 * Carte KPI.
 *
 * Rétrocompatible : les appels existants `<StatCard icon label value tone />`
 * continuent de fonctionner à l'identique. Les nouveautés (tendance, sous-
 * titre, lien) sont toutes facultatives.
 *
 * @param {number} [variation] — évolution en %, signée. `null`/absent = pas de
 *   comparaison disponible ; on n'affiche alors RIEN plutôt qu'un « +0 % »
 *   qui laisserait croire à une stabilité mesurée.
 * @param {boolean} [inverse] — quand la hausse est une MAUVAISE nouvelle
 *   (réserves en retard, refus). Sans cela, une flèche verte accompagnerait
 *   une dégradation.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'navy',
  sousTitre,
  // `sub` : nom historique du même prop, encore utilisé par `ApercuTab`.
  // Sans cet alias, le sous-libellé (« 12 ouvertes ») disparaissait
  // silencieusement — la carte s'affichait, juste amputée.
  sub,
  variation,
  inverse = false,
  lien,
  accent = false,
  // Unité accolée à la valeur (« % »). Passée à part, et NON concaténée par
  // l'appelant : `formatNombre` s'appuie sur `Intl.NumberFormat`, qui renvoie
  // « NaN » dès qu'on lui donne une chaîne comme « 85% ».
  suffixe = '',
}) {
  const aVariation = typeof variation === 'number' && Number.isFinite(variation);
  const hausse = aVariation && variation > 0;
  const stable = aVariation && variation === 0;

  // Une hausse est bonne par défaut, mauvaise si `inverse`.
  const bonneNouvelle = hausse ? !inverse : inverse;
  const tonVariation = stable ? 'neutre' : bonneNouvelle ? 'positif' : 'negatif';
  const IconeTendance = stable ? Minus : hausse ? TrendingUp : TrendingDown;

  const legende = sousTitre ?? sub;

  const corps = (
    <>
      {/* Rendu SEULEMENT s'il y a quelque chose à y mettre : sans icône ni
          tendance (cas d'`ApercuTab`), un conteneur vide ajouterait le `gap`
          de la carte en espace mort au-dessus du chiffre. */}
      {(Icon || aVariation) && (
        <div className="stat-head">
          {Icon && (
            <div className={`stat-icon ${tone}`}>
              <Icon size={20} />
            </div>
          )}
          {aVariation && (
            <span className={`stat-trend ${tonVariation}`}>
              <IconeTendance size={13} />
              {variation > 0 ? '+' : ''}{variation}%
            </span>
          )}
        </div>
      )}

      <div className="stat-corps">
        <div className="stat-value">
          {formatNombre(value)}
          {suffixe && <span className="stat-unite">{suffixe}</span>}
        </div>
        <div className="stat-label">{label}</div>
        {legende && <div className="stat-sous">{legende}</div>}
      </div>
    </>
  );

  const classes = `stat-card${accent ? ' stat-card-accent' : ''}${lien ? ' stat-card-lien' : ''}`;

  return lien
    ? <Link to={lien} className={classes}>{corps}</Link>
    : <div className={classes}>{corps}</div>;
}
