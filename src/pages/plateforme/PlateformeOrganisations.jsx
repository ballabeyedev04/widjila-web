import { useEffect, useState } from 'react';
import { Search, Eye, CheckCircle2, Ban, X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Select } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import { listerOrganisations, modifierOrganisationAdmin } from '../../service/admin/adminService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, initials } from '../../utils/format.js';
import { enumLabel } from '../../utils/constants.js';
import { listerPlansAbonnement } from '../../service/abonnement/planAbonnementService.js';
import SwalCustom from '../../utils/swal.config.js';

const STATUTS_ORG = {
  active: { label: 'Active', tone: 'success' },
  suspendue: { label: 'Suspendue', tone: 'danger' },
  en_attente: { label: 'En attente', tone: 'warning' },
};

/**
 * Organisations de la plateforme — CONSULTATION et suspension, rien d'autre.
 *
 * ## Ce que le super-admin ne fait pas ici
 *
 * Il ne crée pas d'organisation : une organisation naît d'une inscription,
 * validée depuis « Demandes d'inscription ». En créer une à la main
 * produirait une coquille sans compte propriétaire, que personne ne pourrait
 * ensuite réclamer.
 *
 * Il ne modifie pas non plus les informations : raison sociale, SIRET,
 * adresse et coordonnées appartiennent au client, qui les tient à jour depuis
 * son propre espace. Les corriger de l'extérieur, c'est écrire dans le dos de
 * quelqu'un — et prendre la responsabilité d'un identifiant légal qu'on n'a
 * pas vérifié.
 *
 * Il ne supprime pas : une organisation porte des chantiers, des réserves et
 * des comptes. La suspendre coupe l'accès sans rien détruire, et se défait.
 *
 * ## Ce qu'il fait
 *
 * Consulter la fiche complète, et suspendre ou réactiver l'accès. Les deux
 * gestes passent par `modifierOrganisationAdmin`, qui les inscrit au journal
 * d'audit.
 */
export default function PlateformeOrganisations() {
  const { t } = useTranslation('plateforme');
  const [filters, setFilters] = useState({ search: '', statut: '', abonnement: '' });

  // Formules RÉELLEMENT vendues, lues dans le catalogue administrable.
  const [formules, setFormules] = useState([]);

  useEffect(() => {
    let vivant = true;
    listerPlansAbonnement()
      .then(({ plans }) => { if (vivant) setFormules(plans || []); })
      // Échec silencieux : la liste reste vide, l'écran continue de
      // fonctionner. Une erreur bloquante pour un menu déroulant secondaire
      // empêcherait de consulter les organisations.
      .catch(() => {});
    return () => { vivant = false; };
  }, []);

  const [consultee, setConsultee] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur } =
    useServerList(listerOrganisations, {
      limit: 12,
      filterKeys: ['search', 'statut', 'abonnement'],
      filters,
    });

  /**
   * Suspend ou réactive l'accès d'une organisation.
   *
   * Une confirmation précède la SUSPENSION seule : elle coupe l'accès à tous
   * les comptes du client d'un coup. La réactivation, elle, ne fait que
   * rendre ce qui avait été retiré.
   */
  const changerStatut = async (o, statut) => {
    if (statut === 'suspendue') {
      const ok = await SwalCustom.confirm({
        title: t('organisations.confirmerSuspension', { nom: o.nom }),
        text: t('organisations.confirmerSuspensionTexte'),
        icon: 'warning',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await modifierOrganisationAdmin(o.id, { statut });
      SwalCustom.success(
        statut === 'active' ? t('organisations.reactivee') : t('organisations.suspendue')
      );
      reload();
    } catch (err) {
      SwalCustom.error({ title: t('organisations.erreurStatut'), text: getErrorMessage(err) });
    }
  };

  return (
    <>
      {/* Aucun bouton de création : une organisation naît d'une inscription
          validée, jamais d'une saisie manuelle. */}
      <PageHeader title={t('organisations.titre')} subtitle={t('organisations.sousTitre', { total })} />

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            placeholder={t('superAdmin.recherchePlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}>
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
          <option value="">{t('organisations.filtres.tousStatuts')}</option>
          {Object.entries(STATUTS_ORG).map(([value, def]) => (
            <option key={value} value={value}>{enumLabel(value, def.label)}</option>
          ))}
        </Select>
        <Select value={filters.abonnement} onChange={(e) => setFilters({ ...filters, abonnement: e.target.value })} label="">
          <option value="">{t('organisations.filtres.tousAbonnements')}</option>
          {formules.map((f) => <option key={f.code} value={f.code}>{f.nom}</option>)}
        </Select>
        <button
          className="btn btn-ghost"
          onClick={reload}
          title={t('layout:actions.rafraichir')}
          aria-label={t('layout:actions.rafraichir')}
        ><RefreshCw size={16} /></button>
      </div>

      {accessDenied ? <ErrorState variante="droits" titre={t('superAdmin.accesRefuse')} message={erreur} />
        : erreur ? (
          /* Un échec de chargement n'est PAS un écran vide : sans cette
             branche, une panne réseau s'affichait « aucune donnée ». */
          <ErrorState message={erreur} onRetry={reload} />
        )
        : loading ? <SkeletonListe lignes={6} />
        : items.length === 0 ? <EmptyState title={t('organisations.aucuneOrganisation')} />
        : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>{t('organisations.organisation')}</th>
                      <th>{t('organisations.colonnes.contact')}</th>
                      <th>{t('organisations.abonnement')}</th>
                      <th>{t('champs.statut')}</th>
                      <th>{t('organisations.colonnes.creeeLe')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((o) => {
                      const estActive = o.statut === 'active';
                      return (
                        <tr key={o.id}>
                          <td style={{ width: 52 }}><div className="avatar">{initials(o.nom)}</div></td>
                          <td><strong>{o.nom}</strong>
                            {o.raison_sociale && o.raison_sociale !== o.nom && (
                              <div className="text-muted" style={{ fontSize: 12 }}>{o.raison_sociale}</div>
                            )}
                          </td>
                          <td className="text-muted" style={{ fontSize: 13 }}>{o.email || o.telephone || '—'}</td>
                          {/* Le code stocké fait foi : une organisation peut porter une
                              formule retirée de la vente, son nom doit rester lisible. */}
                          <td><Badge tone="info">{formules.find((f) => f.code === o.abonnement)?.nom || o.abonnement || '—'}</Badge></td>
                          <td><Badge statusKey={o.statut} /></td>
                          <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(o.createdAt)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setConsultee(o)}
                              title={t('organisations.actions.consulter')}
                              aria-label={t('organisations.actions.consulter')}
                            ><Eye size={14} /></button>

                            {/* Les deux gestes restent VISIBLES en permanence, celui
                                qui ne s'applique pas étant désactivé : masquer une
                                action selon l'état ferait bouger les boutons d'une
                                ligne à l'autre, et on cliquerait de travers. */}
                            <button
                              className="btn btn-ghost btn-sm"
                              disabled={estActive}
                              onClick={() => changerStatut(o, 'active')}
                              title={estActive ? t('organisations.dejaActive') : t('organisations.actions.activer')}
                              aria-label={t('organisations.actions.activer')}
                            ><CheckCircle2 size={14} /></button>

                            <button
                              className="btn btn-ghost btn-sm btn-danger-hover"
                              disabled={!estActive}
                              onClick={() => changerStatut(o, 'suspendue')}
                              title={estActive ? t('organisations.actions.desactiver') : t('organisations.dejaSuspendue')}
                              aria-label={t('organisations.actions.desactiver')}
                            ><Ban size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination total={total} page={page} limit={12} onPage={setPage} />
          </>
        )}

      <FicheOrganisation
        organisation={consultee}
        onClose={() => setConsultee(null)}
        formules={formules}
      />
    </>
  );
}

/** Une ligne de la fiche — masquée quand la valeur est absente. */
function Ligne({ libelle, valeur }) {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  return (
    <div className="fiche-ligne">
      <span className="fiche-libelle">{libelle}</span>
      <span className="fiche-valeur">{valeur}</span>
    </div>
  );
}

/**
 * Fiche complète, en LECTURE SEULE.
 *
 * Les identifiants légaux varient selon le pays — SIRET et TVA en France,
 * NINEA au Sénégal, RCCM et NCC en Côte d'Ivoire, NIF au Mali. Chaque ligne
 * disparaît quand elle est vide : afficher « SIRET : — » à une entreprise
 * sénégalaise donnerait à croire qu'il manque une information, alors que ce
 * champ ne la concerne pas.
 */
function FicheOrganisation({ organisation, onClose, formules = [] }) {
  const { t } = useTranslation('plateforme');
  if (!organisation) return null;

  const o = organisation;
  const formule = formules.find((f) => f.code === o.abonnement)?.nom || o.abonnement;

  return (
    <Modal
      open
      onClose={onClose}
      title={o.nom}
      size="lg"
      footer={<button className="btn btn-secondary" onClick={onClose}>{t('actions.fermer')}</button>}
    >
      <section className="fiche-section">
        <h4 className="fiche-titre">{t('organisations.fiche.identite')}</h4>
        <Ligne libelle={t('champs.nom')} valeur={o.nom} />
        <Ligne libelle={t('organisations.fiche.raisonSociale')} valeur={o.raison_sociale} />
        <Ligne libelle={t('champs.statut')} valeur={<Badge statusKey={o.statut} />} />
        <Ligne libelle={t('organisations.colonnes.creeeLe')} valeur={formatDate(o.createdAt)} />
      </section>

      <section className="fiche-section">
        <h4 className="fiche-titre">{t('organisations.fiche.contact')}</h4>
        <Ligne libelle={t('champs.email')} valeur={o.email} />
        <Ligne libelle={t('champs.telephone')} valeur={o.telephone} />
        <Ligne libelle={t('champs.adresse')} valeur={o.adresse} />
        <Ligne libelle={t('organisations.fiche.ville')} valeur={o.ville} />
        <Ligne libelle={t('organisations.fiche.pays')} valeur={o.pays} />
      </section>

      <section className="fiche-section">
        <h4 className="fiche-titre">{t('organisations.fiche.identifiants')}</h4>
        <Ligne libelle="SIRET" valeur={o.siret} />
        <Ligne libelle={t('organisations.fiche.numTva')} valeur={o.num_tva} />
        <Ligne libelle="RCCM" valeur={o.rccm} />
        <Ligne libelle="NINEA" valeur={o.ninea} />
        <Ligne libelle="NIF" valeur={o.nif} />
        <Ligne libelle="NCC" valeur={o.ncc} />
        <Ligne libelle="IDU" valeur={o.idu} />
      </section>

      <section className="fiche-section">
        <h4 className="fiche-titre">{t('organisations.abonnement')}</h4>
        <Ligne libelle={t('organisations.fiche.formule')} valeur={formule} />
        <Ligne
          libelle={t('organisations.fiche.abonne')}
          valeur={o.is_subscribed ? t('organisations.fiche.oui') : t('organisations.fiche.non')}
        />
        <Ligne libelle={t('organisations.fiche.essaiJusquau')} valeur={o.trial_ends_at ? formatDate(o.trial_ends_at) : null} />
      </section>
    </Modal>
  );
}
