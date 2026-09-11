import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Copy, MapPin, ArrowRight, X, RefreshCw } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Input, Textarea, Select, Field } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import {
  listerChantiers, modifierChantier, supprimerChantier, dupliquerChantier,
} from '../../service/chantier/chantierService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, formatBudget, toDateInputValue } from '../../utils/format.js';
import { STATUTS_CHANTIER, STATUTS_CHANTIER_CIRCUIT, ROLES_OPERATIONNELS, ROLES_DEPOSANT, peutGerer, enumLabel, ROLE_TITULAIRE } from '../../utils/constants.js';
import { useUser } from '../../context/useUser.js';
import SwalCustom from '../../utils/swal.config.js';
import { useEnum } from '../../hooks/useEnums.js';

export default function Chantiers() {
  // Statuts servis par l'API — voir hooks/useEnums.js.
  const statutsChantier = useEnum('statutsChantier');
  const { t } = useTranslation('chantier');
  const { user } = useUser();
  const role = user?.role;
  // Gestion opérationnelle (créer/modifier/dupliquer) ; suppression réservée au chef de projet.
  // `peutGerer` et non `roleAllowed` : le super-admin plateforme consulte ce
  // parc pour surveiller et pour trancher des demandes, il ne crée pas de
  // chantier dans une entreprise cliente. Pour tous les autres rôles, la règle
  // est inchangée.
  const canManage = peutGerer(role, ROLES_OPERATIONNELS);

  /**
   * Qui peut DEMANDER un chantier — miroir du groupe `DEPOSANT` du serveur,
   * celui qui garde `POST /chantiers`.
   *
   * Plus large que [canManage] : le bureau de contrôle et le maître d'ouvrage
   * déposent des demandes sans conduire les chantiers. C'est exactement la
   * règle du mobile (`user_role.dart#peutDemanderChantier`), et c'est le
   * serveur qui l'impose de toute façon.
   */
  const canDemander = peutGerer(role, ROLES_DEPOSANT);
  const canDelete = role === 'ChefProjet' || role === 'Admin' || role === ROLE_TITULAIRE;

  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: '', statut: '' });
  // Plus de `showCreate` : la modale ne sert QU'À MODIFIER. La création passe
  // par le dépôt de plans (voir `demanderChantier`), comme sur mobile.
  const [editing, setEditing] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur,} = useServerList(listerChantiers, {
    limit: 12,
    filterKeys: ['search', 'statut'],
    filters,
  });

  const remove = async (c) => {
    const res = await SwalCustom.confirm({ title: t('liste.supprimerTitre', { nom: c.nom }),
      text: t('messages.actionIrreversible'),
      icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerChantier(c.id);
      SwalCustom.success(t('liste.supprime'));
      reload();
    } catch (err) { SwalCustom.error({ title: t('commun.suppressionImpossible'), text: getErrorMessage(err) }); }
  };

  const duplicate = async (c) => {
    const res = await SwalCustom.confirm({ title: t('liste.dupliquerTitre', { nom: c.nom }),
      text: t('liste.dupliquerTexte'),
      icon: 'question' });
    if (!res) return;
    try {
      await dupliquerChantier(c.id);
      SwalCustom.success(t('liste.duplique'));
      reload();
    } catch (err) { SwalCustom.error({ title: t('commun.duplicationImpossible'), text: getErrorMessage(err) }); }
  };

  /**
   * Dépose une demande de chantier — et commence par les PLANS.
   *
   * ## Pourquoi cet écran ne crée plus directement
   *
   * Le bouton ouvrait un formulaire et appelait `POST /chantiers`. L'appel est
   * correct, mais il portait un contresens : côté serveur, toute création par
   * un compte non super-admin naît « en attente de validation »
   * (`chantier.service.js#_naitEnAttente`). L'écran annonçait donc « Nouveau
   * chantier » et « Créer » pour produire une DEMANDE — qui disparaissait
   * aussitôt de cette liste, le serveur y écartant les demandes. On croyait
   * avoir raté la création.
   *
   * ## Pourquoi les plans d'abord
   *
   * C'est le parcours du mobile, et celui que le client a demandé : plan
   * global, bâtiments, sections, puis « Envoyer », et le formulaire de demande
   * au bout. C'est aussi le seul ordre où le courriel des valideurs annonce une
   * demande COMPLÈTE — le formulaire en premier leur envoyait un chantier vide,
   * les plans arrivant après.
   *
   * La demande elle-même est créée par l'écran de dépôt, à l'appui sur
   * « Envoyer ». La modale de cette page ne sert donc plus qu'à MODIFIER un
   * chantier existant.
   */
  const demanderChantier = () => navigate('/depot-plans');

  return (
    <>
      <PageHeader title={t('liste.titre')} subtitle={t('liste.sousTitre', { n: total })}>
        {canDemander && (
          <button className="btn btn-primary" onClick={demanderChantier}>
            <Plus size={16} /> {t('liste.demander')}
          </button>
        )}
      </PageHeader>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input className="input" placeholder={t('liste.rechercher')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          {filters.search && <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}><X size={14} /></button>}
        </div>
        <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
          <option value="">{t('commun.tousStatuts')}</option>
          {/* Les demandes ont leur propre écran (« Demandes de chantier ») :
              les proposer ici aussi couperait la même file en deux endroits. */}
          {statutsChantier
            .filter((value) => !STATUTS_CHANTIER_CIRCUIT.includes(value))
            .map((value) => <option key={value} value={value}>{enumLabel(value, STATUTS_CHANTIER[value]?.label)}</option>)}
        </Select>
        <button
          className="btn btn-ghost"
          onClick={reload}
          title={t('layout:actions.rafraichir')}
          aria-label={t('layout:actions.rafraichir')}
        ><RefreshCw size={16} /></button>
      </div>

      {accessDenied ? <ErrorState variante="droits" titre={t('liste.accesRefuse')} message={erreur} />
        : erreur ? (
          /* Un échec de chargement n'est PAS un écran vide. */
          <ErrorState message={erreur} onRetry={reload} />
        )
        : loading ? <SkeletonListe lignes={6} />
        : items.length === 0 ? (
          <EmptyState
            title={t('liste.videTitre')}
            message={canDemander ? t('liste.videMessageDeposant') : t('liste.videMessage')}
            /* L'état vide portait un message qui renvoyait ailleurs sans rien
               proposer. C'est pourtant le moment exact où l'on cherche par où
               commencer — le mobile y met le même bouton. */
            action={canDemander ? (
              <button className="btn btn-primary" onClick={demanderChantier}>
                <Plus size={16} /> {t('liste.demander')}
              </button>
            ) : undefined}
          />
        )
        : (
          <>
            <div className="grid-2">
              {items.map((c) => (
                <div className="card" key={c.id}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h2 style={{ fontSize: 17 }}><Link className="link" to={`/chantiers/${c.id}`}>{c.nom}</Link></h2>
                        {c.code && <span className="text-muted" style={{ fontSize: 12 }}>{c.code}</span>}
                        {/* Le super-admin voit le portefeuille de TOUTES les
                            organisations : sans ce rappel, rien ne distingue
                            deux chantiers homonymes appartenant à deux clients. */}
                        {role === 'Admin' && c.organisation?.nom && (
                          <span className="text-muted" style={{ fontSize: 12, display: 'block' }}>{c.organisation.nom}</span>
                        )}
                      </div>
                      <Badge statusKey={c.statut} />
                    </div>
                    <p className="text-secondary" style={{ fontSize: 13, margin: '10px 0' }}>
                      {c.description || <span className="text-muted">{t('commun.aucuneDescription')}</span>}
                    </p>
                    <div className="text-muted" style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {c.adresse && <span><MapPin size={13} style={{ verticalAlign: -2 }} /> {c.adresse}</span>}
                      <span>{t('liste.dates', { debut: formatDate(c.date_debut), fin: formatDate(c.date_fin) })}</span>
                      {c.budget && <span>{t('commun.budget')} <strong>{formatBudget(c.budget)}</strong></span>}
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link className="btn btn-secondary btn-sm" to={`/chantiers/${c.id}`}>{t('liste.ouvrir')} <ArrowRight size={14} /></Link>
                      {canManage && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)} title={t('actions.modifier')}><Pencil size={14} /></button>}
                      {canManage && <button className="btn btn-ghost btn-sm" onClick={() => duplicate(c)} title={t('actions.dupliquer')}><Copy size={14} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(c)} title={t('actions.supprimer')}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination total={total} page={page} limit={12} onPage={setPage} />
          </>
        )}

      <ChantierEditionModal open={!!editing} onClose={() => setEditing(null)} chantier={editing} onSaved={reload} />
    </>
  );
}

/**
 * Modification d'un chantier EXISTANT.
 *
 * Elle a longtemps servi aussi à en créer un. Ce n'est plus le cas : une
 * création est en réalité une DEMANDE (le serveur la pose en
 * « en attente de validation » pour tout compte non super-admin), et le
 * parcours de demande commence par les plans — voir `demanderChantier`
 * plus haut. Les branches de création ont donc été retirées plutôt que
 * laissées inatteignables : une modale qui prétend savoir créer finit par
 * être rebranchée un jour, et le contresens revient avec elle.
 */
function ChantierEditionModal({ open, onClose, chantier, onSaved }) {
  const statutsChantier = useEnum('statutsChantier');
  const { t } = useTranslation('chantier');
  const { user } = useUser();
  // L'organisation est rappelée mais PAS modifiable : déplacer un chantier vers
  // un autre client emporterait ses réserves, ses plans et ses documents, alors
  // que son responsable, ses membres affectés et les entreprises assignées à
  // ses réserves resteraient dans l'organisation d'origine. Le super-admin
  // voyant le portefeuille de TOUS les clients, il lui faut au moins savoir
  // lequel il est en train de modifier.
  const afficheOrganisation = user?.role === 'Admin';
  const [form, setForm] = useState({
    // Noms alignés sur le contrat de l'API (snake_case) : le schéma Joi valide
    // avec stripUnknown, une clé en camelCase serait retirée sans erreur.
    // Le chantier n'a ni ville ni pays : le cahier des charges (Table projects)
    // et le modèle Sequelize ne portent qu'une adresse libre. Ville et pays sont
    // des attributs de l'ORGANISATION (Table organisations : city, country).
    nom: '', code: '', description: '', adresse: '',
    date_debut: '', date_fin: '', budget: '', statut: 'en_preparation',
    organisationId: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const reset = () => {
    if (!chantier) return;
    setForm({
      nom: chantier.nom || '', code: chantier.code || '', description: chantier.description || '',
      adresse: chantier.adresse || '',
      date_debut: toDateInputValue(chantier.date_debut), date_fin: toDateInputValue(chantier.date_fin),
      budget: chantier.budget ?? '', statut: chantier.statut || 'en_preparation',
    });
    setErrors({});
  };
  useEffect(() => { if (open) reset(); }, [open, chantier]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('commun.nomRequis');
    if (form.date_debut && form.date_fin && new Date(form.date_debut) > new Date(form.date_fin)) errs.date_fin = t('liste.finApresDebut');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      nom: form.nom, code: form.code || undefined, description: form.description,
      adresse: form.adresse,
      date_debut: form.date_debut || undefined, date_fin: form.date_fin || undefined,
      budget: form.budget === '' ? undefined : Number(form.budget),
      statut: form.statut,
    };
    setSaving(true);
    try {
      await modifierChantier(chantier.id, payload);
      SwalCustom.success(t('liste.misAJour'));
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: t('commun.majImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('liste.modalModifier')} size="lg" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : t('actions.enregistrer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        {afficheOrganisation && (
          <Field label={t('liste.organisationProprietaire')} hint={t('liste.organisationNonModifiable')}>
            <div className="champ-lecture">{chantier?.organisation?.nom || '—'}</div>
          </Field>
        )}
        <div className="grid-2">
          <Input label={t('liste.nomChantier')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
          <Input label={t('commun.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CH-2026-001" />
        </div>
        <Textarea label={t('champs.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div className="grid-2">
          <Input label={t('champs.adresse')} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          <Input label={t('liste.budgetLabel')} type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        </div>
        <div className="grid-2">
          <Input label={t('champs.dateDebut')} type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
          <Input label={t('champs.dateFin')} type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} error={errors.date_fin} />
        </div>
        {/* Les deux statuts du CIRCUIT de validation sont retirés : on valide ou
            l'on refuse une demande, on ne bascule pas un chantier « en attente »
            depuis une liste déroulante. Le serveur refuse ces transitions. */}
        <Select label={t('champs.statut')} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
          {statutsChantier
            .filter((value) => !STATUTS_CHANTIER_CIRCUIT.includes(value))
            .map((value) => <option key={value} value={value}>{enumLabel(value, STATUTS_CHANTIER[value]?.label)}</option>)}
        </Select>
      </form>
    </Modal>
  );
}
