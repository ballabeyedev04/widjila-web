import { useTranslation } from 'react-i18next';
import {
  HardHat, AlertTriangle, CalendarClock, CheckCircle2, ClipboardList,
  ClipboardCheck, FileImage, FileText, Users, TrendingUp, PieChart,
  Building2, Layers, ShieldAlert, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import MesChantiersCard from '../../components/MesChantiersCard.jsx';
import SectionCarte from '../../components/dashboard/SectionCarte.jsx';
import EnteteBienvenue from '../../components/dashboard/EnteteBienvenue.jsx';
import AreaChart from '../../components/charts/AreaChart.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import BarList from '../../components/charts/BarList.jsx';
import { SkeletonStatGrid, SkeletonChart } from '../../components/Skeleton.jsx';
import { useDashboard } from '../../hooks/useDashboard.js';
import { useUser } from '../../context/useUser.js';
import { profilPourRole, BLOCS } from './rolesDashboard.js';
import { formatNombre } from '../../utils/format.js';

/** Table des icônes — le profil ne référence qu'un nom, pas un composant. */
const ICONES = {
  HardHat, AlertTriangle, CalendarClock, CheckCircle2, ClipboardList,
  ClipboardCheck, FileImage, FileText, Users,
};

export default function Dashboard() {
  const { t, i18n } = useTranslation('plateforme');
  const { user } = useUser();
  const profil = profilPourRole(user?.role);

  const { stats, derive, loading, erreur, recharger } = useDashboard({
    langue: i18n.language,
    // Le classement par entreprise n'est proposé qu'aux profils qui le
    // consultent : inutile de payer une requête pour un bloc jamais affiché.
    avecEntreprises: profil.blocs.includes(BLOCS.TOP_ENTREPRISES),
  });

  /** Valeurs des KPI, résolues depuis les données dérivées. */
  const valeurKpi = (cle) => {
    if (!stats || !derive) return null;
    switch (cle) {
      case 'chantiers': return stats.chantiers ?? 0;
      case 'reservesOuvertes': return derive.reserves.ouvertes ?? 0;
      case 'reservesEnRetard': return derive.reserves.enRetard ?? 0;
      case 'reservesTotal': return derive.reserves.total ?? 0;
      case 'tauxResolution': return derive.tauxResolution;
      case 'inspections': return stats.inspections ?? 0;
      case 'plans': return stats.plans ?? 0;
      case 'documents': return stats.documents ?? 0;
      case 'utilisateurs': return stats.utilisateurs ?? 0;
      default: return null;
    }
  };

  const rendreKpis = (liste) => liste.map((k) => {
    const valeur = valeurKpi(k.cle);
    // Un indicateur non calculable (taux sans aucune réserve) est masqué :
    // afficher « 0 % » laisserait croire à une contre-performance mesurée.
    if (valeur === null || valeur === undefined) return null;

    return (
      <StatCard
        key={k.cle}
        icon={ICONES[k.icone]}
        label={t(`dashboard.stats.${k.i18n}`)}
        value={valeur}
        suffixe={k.suffixe}
        tone={k.tone}
        inverse={k.inverse}
        lien={k.lien}
        // La variation annuelle ne vaut que pour le VOLUME de réserves : la
        // rattacher à un compteur de plans ou d'utilisateurs serait faux.
        variation={k.cle === 'reservesTotal' ? derive.variationAnnuelle : undefined}
        accent={k.cle === 'reservesEnRetard' && valeur > 0}
      />
    );
  });

  if (loading) {
    return (
      <div className="dashboard">
        <EnteteBienvenue chargement onRecharger={recharger} />
        <SkeletonStatGrid nombre={4} />
        <div className="dash-grille">
          <div className="dash-col-2"><SkeletonChart hauteur={260} /></div>
          <div><SkeletonChart hauteur={260} /></div>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="dashboard">
        <EnteteBienvenue onRecharger={recharger} />
        <div className="etat-erreur">
          <ShieldAlert size={30} />
          <h3>{t('dashboard.erreurStats')}</h3>
          <p>{erreur}</p>
          <button className="btn btn-primary" onClick={recharger}>
            {t('actions.reessayer')}
          </button>
        </div>
      </div>
    );
  }

  if (!derive?.aDesDonnees) {
    return (
      <div className="dashboard">
        <EnteteBienvenue onRecharger={recharger} />
        <EmptyState
          title={t('dashboard.aucuneStatTitre')}
          message={t('dashboard.aucuneStatMessage')}
        />
      </div>
    );
  }

  const enRetard = derive.reserves.enRetard || 0;
  const ouvertes = derive.reserves.ouvertes || 0;

  const resume = t('dashboard.resume', {
    ouvertes: formatNombre(ouvertes),
    chantiers: formatNombre(stats.chantiers || 0),
  });

  const affiche = (bloc) => profil.blocs.includes(bloc);

  return (
    <div className="dashboard">
      <EnteteBienvenue resume={resume} onRecharger={recharger} />

      <div className="stat-grid">{rendreKpis(profil.kpis)}</div>

      {/* Alertes : placées AVANT les graphiques. Ce qui demande une décision
          passe avant ce qui demande une analyse. */}
      {affiche(BLOCS.ALERTES) && enRetard > 0 && (
        <Link to="/reserves" className="bandeau-alerte">
          <span className="bandeau-alerte-icone"><CalendarClock size={18} /></span>
          <div>
            <strong>{t('dashboard.alerteRetardTitre', { count: enRetard })}</strong>
            <p>{t('dashboard.alerteRetardTexte')}</p>
          </div>
          <ArrowRight size={17} />
        </Link>
      )}

      <div className="dash-grille">
        {affiche(BLOCS.EVOLUTION) && (
          <SectionCarte
            className="dash-col-2"
            titre={t('dashboard.evolutionTitre')}
            sousTitre={t('dashboard.evolutionSousTitre')}
            icone={TrendingUp}
          >
            <AreaChart
              series={derive.timeline.series}
              labels={derive.timeline.labels}
              hauteur={250}
            />
          </SectionCarte>
        )}

        {affiche(BLOCS.STATUTS) && (
          <SectionCarte
            titre={t('dashboard.statutsTitre')}
            sousTitre={t('dashboard.statutsSousTitre')}
            icone={PieChart}
            lien="/reserves"
            libelleLien={t('actions.voirTout')}
          >
            <DonutChart
              donnees={derive.parStatut}
              libelleCentre={t('dashboard.stats.reservesTotal')}
              hauteur={250}
            />
          </SectionCarte>
        )}

        {affiche(BLOCS.SEVERITES) && (
          <SectionCarte
            titre={t('dashboard.severitesTitre')}
            sousTitre={t('dashboard.severitesSousTitre')}
            icone={Layers}
          >
            <DonutChart
              donnees={derive.parSeverite}
              libelleCentre={t('dashboard.stats.reservesTotal')}
              hauteur={250}
            />
          </SectionCarte>
        )}

        {affiche(BLOCS.TOP_CHANTIERS) && (
          <SectionCarte
            titre={t('dashboard.topChantiersTitre')}
            sousTitre={t('dashboard.topChantiersSousTitre')}
            icone={HardHat}
            lien="/chantiers"
            libelleLien={t('actions.voirTout')}
          >
            <BarList donnees={derive.topChantiers} />
          </SectionCarte>
        )}

        {affiche(BLOCS.TOP_ENTREPRISES) && (
          <SectionCarte
            titre={t('dashboard.topEntreprisesTitre')}
            sousTitre={t('dashboard.topEntreprisesSousTitre')}
            icone={Building2}
          >
            <BarList donnees={derive.topEntreprises} />
          </SectionCarte>
        )}
      </div>

      {profil.kpisSecondaires.length > 0 && (
        <SectionCarte
          titre={t('dashboard.ressourcesTitre')}
          sousTitre={t('dashboard.ressourcesSousTitre')}
          icone={ClipboardList}
          pleineLargeur
        >
          <div className="stat-grid stat-grid-compact">
            {rendreKpis(profil.kpisSecondaires)}
          </div>
        </SectionCarte>
      )}

      {affiche(BLOCS.MES_CHANTIERS) && <MesChantiersCard />}
    </div>
  );
}
