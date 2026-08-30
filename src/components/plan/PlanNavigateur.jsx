import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Layers, DoorOpen, Plus, MapPin, ChevronRight } from 'lucide-react';

import PlanCanvas from './PlanCanvas.jsx';
import PlanVignette from './PlanVignette.jsx';
import NouvelleReserveModal from './NouvelleReserveModal.jsx';
import HotspotEditeur from './HotspotEditeur.jsx';
import EmptyState from '../EmptyState.jsx';
import Badge from '../Badge.jsx';
import { listerPlans, getPlan, fetchFichierBlob } from '../../service/plan/planService.js';
import { listerPartenairesChantier } from '../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { STATUTS_RESERVE, enumLabel } from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Parcours de consultation d'un chantier, tel que décrit par le guide client :
 *
 *   plan global → bâtiment → étages & sous-sols → appartements → plein écran
 *
 * et, au bout, le geste qui justifie tout le reste : un clic n'importe où sur
 * le plan de l'appartement ouvre « Nouvelle réserve » avec la localisation
 * déjà remplie et le point cliqué conservé.
 *
 * DESCENDRE D'UN NIVEAU se fait de deux façons, volontairement redondantes :
 *   - en cliquant une ZONE dessinée sur le plan (hotspot), quand quelqu'un a
 *     pris le temps de les tracer — c'est la maquette ;
 *   - en cliquant une TUILE de la grille, toujours disponible.
 * Le parcours ne dépend donc jamais d'une mise en place qui n'aurait pas été
 * faite : un chantier sans hotspot reste entièrement navigable.
 */

/** Couleur du repère d'une réserve — reprend la palette de gravité du thème. */
const COULEUR_SEVERITE = {
  faible: 'var(--info)',
  moyenne: 'var(--warning)',
  haute: 'var(--danger)',
  critique: 'var(--danger)',
};

/**
 * Regroupe les étages comme la maquette : sous-sols, étages, toiture.
 * `niveau` porte le sens (négatif = sous-sol) ; à défaut, tout tombe dans
 * « étages », ce qui reste une liste juste, seulement moins bien rangée.
 */
function grouperEtages(etages = []) {
  const tries = [...etages].sort((a, b) => (a.niveau ?? 0) - (b.niveau ?? 0));
  return {
    sousSols: tries.filter((e) => (e.niveau ?? 0) < 0),
    etages: tries.filter((e) => (e.niveau ?? 0) >= 0 && !/toiture/i.test(e.nom || '')),
    toiture: tries.filter((e) => /toiture/i.test(e.nom || '')),
  };
}

export default function PlanNavigateur({ chantier, canManage, canCreerReserve }) {
  const { t } = useTranslation('chantier');

  const [plans, setPlans] = useState([]);
  const [entreprises, setEntreprises] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Position dans l'arborescence. `null` partout = niveau chantier.
  const [chemin, setChemin] = useState({ batiment: null, etage: null, zone: null });

  const load = useCallback(async () => {
    setChargement(true);
    try {
      const d = await listerPlans(chantier.id);
      setPlans(d.items || []);
    } catch (err) {
      SwalCustom.error({ title: t('plans.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setChargement(false);
    }
  }, [chantier.id, t]);

  useEffect(() => { load(); }, [load]);

  // Entreprises proposées dans « Nouvelle réserve ». Un échec ici ne doit pas
  // empêcher de créer la réserve : la liste reste vide, le champ facultatif.
  useEffect(() => {
    let vivant = true;
    listerPartenairesChantier(chantier.id)
      .then((d) => { if (vivant) setEntreprises(d.items || []); })
      .catch(() => { /* champ entreprise laissé vide */ });
    return () => { vivant = false; };
  }, [chantier.id]);

  /* ---------- Indexation des plans par niveau ---------- */
  const parNiveau = useMemo(() => {
    // Une seule version par niveau : la plus récente. La liste renvoie toutes
    // les révisions (tri nom ASC, version DESC) ; en afficher plusieurs ferait
    // apparaître le même appartement deux fois dans la grille.
    const garder = (map, cle, plan) => {
      if (!cle) return;
      const actuel = map.get(cle);
      if (!actuel || (plan.version || 0) > (actuel.version || 0)) map.set(cle, plan);
    };

    const global = [];
    const parBatiment = new Map();
    const parEtage = new Map();
    const parZone = new Map();

    for (const p of plans) {
      if (p.zoneId) garder(parZone, p.zoneId, p);
      else if (p.etageId) garder(parEtage, p.etageId, p);
      else if (p.batimentId) garder(parBatiment, p.batimentId, p);
      else global.push(p);
    }

    // Plan global : la version la plus récente du premier plan sans rattachement.
    const planGlobal = global.sort((a, b) => (b.version || 0) - (a.version || 0))[0] || null;
    return { planGlobal, parBatiment, parEtage, parZone };
  }, [plans]);

  const batiments = chantier.batiments || [];

  /* ---------- Navigation ---------- */
  const allerAuChantier = () => setChemin({ batiment: null, etage: null, zone: null });
  const allerAuBatiment = (batiment) => setChemin({ batiment, etage: null, zone: null });
  const allerAEtage = (etage) => setChemin((c) => ({ ...c, etage, zone: null }));
  const allerAZone = (zone) => setChemin((c) => ({ ...c, zone }));

  /**
   * Descend là où pointe une zone cliquable du plan.
   * La cible est retrouvée dans la structure déjà chargée — un hotspot dont la
   * cible a disparu ne fait donc rien plutôt que de casser la navigation.
   */
  const suivreHotspot = (hotspot) => {
    const { cible_type: type, cible_id: id } = hotspot;

    if (type === 'batiment') {
      const b = batiments.find((x) => x.id === id);
      if (b) allerAuBatiment(b);
      return;
    }
    if (type === 'etage') {
      for (const b of batiments) {
        const e = (b.etages || []).find((x) => x.id === id);
        if (e) { setChemin({ batiment: b, etage: e, zone: null }); return; }
      }
      return;
    }
    for (const b of batiments) {
      for (const e of b.etages || []) {
        const z = (e.zones || []).find((x) => x.id === id);
        if (z) { setChemin({ batiment: b, etage: e, zone: z }); return; }
      }
    }
  };

  if (chargement) return <p className="text-muted">{t('etats.chargement')}</p>;

  const filAriane = (
    <nav className="pnav-fil" aria-label={t('plans.filAriane')}>
      <button type="button" onClick={allerAuChantier} disabled={!chemin.batiment}>
        {chantier.nom}
      </button>
      {chemin.batiment && (
        <>
          <ChevronRight size={13} className="pnav-sep" />
          <button type="button" onClick={() => allerAuBatiment(chemin.batiment)} disabled={!chemin.etage}>
            {chemin.batiment.nom}
          </button>
        </>
      )}
      {chemin.etage && (
        <>
          <ChevronRight size={13} className="pnav-sep" />
          <button type="button" onClick={() => allerAEtage(chemin.etage)} disabled={!chemin.zone}>
            {chemin.etage.nom}
          </button>
        </>
      )}
      {chemin.zone && (
        <>
          <ChevronRight size={13} className="pnav-sep" />
          <button type="button" disabled>{chemin.zone.nom}</button>
        </>
      )}
    </nav>
  );

  /* ---------- Niveau 4 : l'appartement en plein écran ---------- */
  if (chemin.zone) {
    return (
      <div className="card">
        <div className="card-body">
          {filAriane}
          <VuePlan
            plan={parNiveau.parZone.get(chemin.zone.id)}
            chantierId={chantier.id}
            localisation={{ batiment: chemin.batiment, etage: chemin.etage, zone: chemin.zone }}
            entreprises={entreprises}
            canManage={canManage}
            canCreerReserve={canCreerReserve}
            structure={batiments}
            onPlansChanges={load}
          />
        </div>
      </div>
    );
  }

  /* ---------- Niveau 3 : les appartements d'un étage ---------- */
  if (chemin.etage) {
    const zones = chemin.etage.zones || [];
    return (
      <div className="card">
        <div className="card-body">
          {filAriane}
          {/* Le plan de l'étage lui-même, quand il existe : c'est de là que
              partent les zones cliquables vers chaque appartement. */}
          {parNiveau.parEtage.get(chemin.etage.id) && (
            <div style={{ marginBottom: 18 }}>
              <VuePlan
                plan={parNiveau.parEtage.get(chemin.etage.id)}
                chantierId={chantier.id}
                localisation={{ batiment: chemin.batiment, etage: chemin.etage }}
                entreprises={entreprises}
                canManage={canManage}
                canCreerReserve={canCreerReserve}
                structure={batiments}
                onHotspotClique={suivreHotspot}
                onPlansChanges={load}
                hauteur={420}
              />
            </div>
          )}

          <h3 className="section-titre">{t('plans.appartements', { n: zones.length })}</h3>
          {zones.length === 0
            ? <EmptyState title={t('plans.aucuneZoneTitre')} message={t('plans.aucuneZoneMessage')} />
            : (
              <div className="pnav-grille">
                {zones.map((z) => (
                  <Tuile
                    key={z.id}
                    nom={z.nom}
                    meta={enumLabel(z.type, z.type)}
                    plan={parNiveau.parZone.get(z.id)}
                    Icone={DoorOpen}
                    onClick={() => allerAZone(z)}
                    sansPlan={t('plans.sansPlan')}
                  />
                ))}
              </div>
            )}
        </div>
      </div>
    );
  }

  /* ---------- Niveau 2 : les étages d'un bâtiment ---------- */
  if (chemin.batiment) {
    const groupes = grouperEtages(chemin.batiment.etages);
    const sections = [
      { cle: 'sousSols', titre: t('plans.sousSols'), items: groupes.sousSols },
      { cle: 'etages', titre: t('plans.etages'), items: groupes.etages },
      { cle: 'toiture', titre: t('plans.toiture'), items: groupes.toiture },
    ].filter((s) => s.items.length);

    return (
      <div className="card">
        <div className="card-body">
          {filAriane}
          {parNiveau.parBatiment.get(chemin.batiment.id) && (
            <div style={{ marginBottom: 18 }}>
              <VuePlan
                plan={parNiveau.parBatiment.get(chemin.batiment.id)}
                chantierId={chantier.id}
                localisation={{ batiment: chemin.batiment }}
                entreprises={entreprises}
                canManage={canManage}
                canCreerReserve={canCreerReserve}
                structure={batiments}
                onHotspotClique={suivreHotspot}
                onPlansChanges={load}
                hauteur={420}
              />
            </div>
          )}

          {sections.length === 0
            ? <EmptyState title={t('plans.aucunEtageTitre')} message={t('plans.aucunEtageMessage')} />
            : sections.map((s) => (
              <div key={s.cle} style={{ marginBottom: 20 }}>
                <h3 className="section-titre">{s.titre}</h3>
                <div className="pnav-grille">
                  {s.items.map((e) => (
                    <Tuile
                      key={e.id}
                      nom={e.nom}
                      meta={t('plans.nZones', { n: (e.zones || []).length })}
                      plan={parNiveau.parEtage.get(e.id)}
                      Icone={Layers}
                      onClick={() => allerAEtage(e)}
                      sansPlan={t('plans.sansPlan')}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  /* ---------- Niveau 1 : le plan global du chantier ---------- */
  return (
    <div className="card">
      <div className="card-body">
        {filAriane}
        {parNiveau.planGlobal
          ? (
            <div style={{ marginBottom: 18 }}>
              <VuePlan
                plan={parNiveau.planGlobal}
                chantierId={chantier.id}
                localisation={{}}
                entreprises={entreprises}
                canManage={canManage}
                canCreerReserve={canCreerReserve}
                structure={batiments}
                onHotspotClique={suivreHotspot}
                onPlansChanges={load}
                hauteur={460}
              />
            </div>
          )
          : (
            <div className="pnav-aide" style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}>
              <MapPin size={15} /> {t('plans.aucunPlanGlobal')}
            </div>
          )}

        <h3 className="section-titre">{t('plans.batiments', { n: batiments.length })}</h3>
        {batiments.length === 0
          ? <EmptyState title={t('plans.aucunBatimentTitre')} message={t('plans.aucunBatimentMessage')} />
          : (
            <div className="pnav-grille">
              {batiments.map((b) => (
                <Tuile
                  key={b.id}
                  nom={b.nom}
                  meta={t('plans.nEtages', { n: (b.etages || []).length })}
                  plan={parNiveau.parBatiment.get(b.id)}
                  Icone={Building2}
                  onClick={() => allerAuBatiment(b)}
                  sansPlan={t('plans.sansPlan')}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tuile de navigation — montre le plan quand il existe, l'icône sinon.
   ══════════════════════════════════════════════════════════════════════════ */
function Tuile({ nom, meta, plan, Icone, onClick, sansPlan }) {
  return (
    <button type="button" className="pnav-tuile" onClick={onClick}>
      {plan
        ? <PlanVignette plan={plan} />
        : <div className="pnav-tuile-apercu"><Icone size={26} /></div>}
      <div>
        <div className="pnav-tuile-nom">{nom}</div>
        <div className="pnav-tuile-meta">{plan ? meta : sansPlan}</div>
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Vue d'un plan : document interactif + réserves posées dessus.
   ══════════════════════════════════════════════════════════════════════════ */
function VuePlan({
  plan, chantierId, localisation, entreprises, canManage, canCreerReserve,
  structure, onHotspotClique, onPlansChanges, hauteur = 560,
}) {
  const { t } = useTranslation('chantier');
  const [blob, setBlob] = useState(null);
  const [detail, setDetail] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [mode, setMode] = useState('lecture');
  const [pointClique, setPointClique] = useState(null);
  const [editeurHotspots, setEditeurHotspots] = useState(false);
  const [reserveActive, setReserveActive] = useState(null);

  // `planId` extrait AVANT le useCallback : le compilateur React n'accepte pas
  // `plan?.id` comme dépendance (il en déduit `plan` entier, plus large que ce
  // qui est écrit) et renonce alors à optimiser tout le composant.
  const planId = plan?.id;
  const rechargerDetail = useCallback(async () => {
    if (!planId) return;
    try {
      setDetail(await getPlan(planId));
    } catch (err) {
      setErreur(getErrorMessage(err));
    }
  }, [planId]);

  const fichierUrl = plan?.fichier_url;
  useEffect(() => {
    if (!fichierUrl) return undefined;
    let vivant = true;
    setBlob(null);
    setErreur(null);

    (async () => {
      try {
        const b = await fetchFichierBlob(fichierUrl);
        if (vivant) setBlob(b);
      } catch (err) {
        if (vivant) setErreur(getErrorMessage(err));
      }
    })();

    rechargerDetail();
    return () => { vivant = false; };
  }, [fichierUrl, rechargerDetail]);

  if (!plan) return null;
  if (erreur) return <p className="text-muted">{erreur}</p>;

  const reserves = detail?.reserves || [];
  const hotspots = detail?.hotspots || plan.hotspots || [];

  const marqueurs = reserves
    .filter((r) => r.position)
    .map((r) => ({
      id: r.id,
      x: r.position.x,
      y: r.position.y,
      couleur: COULEUR_SEVERITE[r.severite] || 'var(--primary)',
      libelle: `${r.numero} — ${r.titre}`,
      actif: reserveActive === r.id,
    }));

  // Le pointage n'a de sens qu'au niveau d'un appartement : c'est la règle du
  // guide client (« la position cliquée doit être conservée comme localisation
  // de la réserve »). Sur un plan global ou d'étage, un clic sert à descendre
  // d'un niveau, pas à poser un défaut.
  const pointageDisponible = canCreerReserve && !!localisation.zone;

  return (
    <>
      <div className="pnav-scene">
        <div>
          {mode === 'pointage' && (
            <div className="pnav-aide">
              <MapPin size={15} /> {t('plans.cliquezPourPlacer')}
            </div>
          )}

          <PlanCanvas
            blob={blob}
            format={plan.format}
            marqueurs={marqueurs}
            hotspots={mode === 'pointage' ? [] : hotspots}
            mode={mode}
            hauteur={hauteur}
            onPointClique={(x, y) => setPointClique({ x, y })}
            onMarqueurClique={(m) => setReserveActive(m.id)}
            onHotspotClique={onHotspotClique}
          />
        </div>

        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {pointageDisponible && (
              <button
                type="button"
                className={`btn btn-sm ${mode === 'pointage' ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => setMode((m) => (m === 'pointage' ? 'lecture' : 'pointage'))}
              >
                <Plus size={14} /> {mode === 'pointage' ? t('actions.annuler') : t('plans.nouvelleReserve')}
              </button>
            )}
            {canManage && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditeurHotspots(true)}>
                <MapPin size={14} /> {t('plans.zonesCliquables')}
              </button>
            )}
          </div>

          <h4 style={{ margin: '0 0 10px' }}>{t('plans.reservesSurPlan', { n: reserves.length })}</h4>
          {reserves.length === 0 && (
            <p className="text-muted" style={{ fontSize: 13 }}>{t('plans.aucuneReserveSurPlan')}</p>
          )}
          <div className="pnav-liste">
            {reserves.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`pnav-ligne ${reserveActive === r.id ? 'actif' : ''}`}
                onClick={() => setReserveActive(r.id)}
              >
                <span className="pnav-puce" style={{ background: COULEUR_SEVERITE[r.severite] || 'var(--primary)' }} />
                <span className="pnav-ligne-corps">
                  <span className="pnav-ligne-titre">{r.titre}</span>
                  <span className="pnav-ligne-meta">
                    {r.numero}
                    {r.position ? ` · x ${Math.round(r.position.x)} · y ${Math.round(r.position.y)}` : ''}
                  </span>
                </span>
                <Badge tone={STATUTS_RESERVE[r.statut]?.tone}>
                  {enumLabel(r.statut, STATUTS_RESERVE[r.statut]?.label || r.statut)}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      <NouvelleReserveModal
        open={!!pointClique}
        onClose={() => setPointClique(null)}
        chantierId={chantierId}
        localisation={{ ...localisation, plan }}
        position={pointClique}
        entreprises={entreprises}
        onCreee={() => { setMode('lecture'); rechargerDetail(); }}
      />

      {editeurHotspots && (
        <HotspotEditeur
          open={editeurHotspots}
          onClose={() => setEditeurHotspots(false)}
          plan={plan}
          blob={blob}
          hotspots={hotspots}
          structure={structure}
          niveau={localisation}
          onChange={() => { rechargerDetail(); onPlansChanges?.(); }}
        />
      )}
    </>
  );
}

export { COULEUR_SEVERITE };
