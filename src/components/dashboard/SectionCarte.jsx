import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Conteneur d'une section de tableau de bord : titre, sous-titre, lien
 * d'approfondissement, contenu.
 *
 * Existe pour que les huit sections du dashboard partagent exactement le même
 * rythme vertical et la même typographie. Répéter la structure à la main dans
 * chaque page produit inévitablement des écarts de 2 px qui se voient.
 */
export default function SectionCarte({
  titre,
  sousTitre,
  icone: Icone,
  lien,
  libelleLien,
  actions,
  children,
  pleineLargeur = false,
  className = '',
}) {
  return (
    <section className={`section-carte${pleineLargeur ? ' pleine-largeur' : ''} ${className}`}>
      <header className="section-carte-tete">
        <div className="section-carte-titre">
          {Icone && <span className="section-carte-icone"><Icone size={16} /></span>}
          <div>
            <h2>{titre}</h2>
            {sousTitre && <p>{sousTitre}</p>}
          </div>
        </div>

        <div className="section-carte-actions">
          {actions}
          {lien && (
            <Link to={lien} className="section-carte-lien">
              {libelleLien} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </header>

      <div className="section-carte-corps">{children}</div>
    </section>
  );
}
