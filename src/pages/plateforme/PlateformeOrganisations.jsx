import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, X, Building2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { SkeletonListe } from '../../components/Skeleton.jsx';
import { Input, Select } from '../../components/FormControls.jsx';
import { useServerList } from '../../hooks/useServerList.js';
import {
  listerOrganisations, creerOrganisationAdmin, modifierOrganisationAdmin, supprimerOrganisationAdmin,
} from '../../service/admin/adminService.js';
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

export default function PlateformeOrganisations() {
  const { t } = useTranslation('plateforme');
  const [filters, setFilters] = useState({ search: '', statut: '', abonnement: '' });

  // Formules RÉELLEMENT vendues, lues dans le catalogue administrable.
  //
  // Elles étaient écrites en dur — « Starter / Pro / Business / Enterprise » —
  // alors que le catalogue en base contient « essentiel / pro / entreprise ».
  // Le formulaire proposait donc des codes qui n'existent nulle part, et un
  // filtre sur « Starter » ne ramenait jamais rien. Modifier un prix ou
  // renommer une formule côté administration ne se reflétait pas davantage.
  const [formules, setFormules] = useState([]);

  useEffect(() => {
    let vivant = true;
    listerPlansAbonnement()
      .then(({ plans }) => { if (vivant) setFormules(plans || []); })
      // Échec silencieux : la liste reste vide, l'écran des organisations
      // continue de fonctionner. Une erreur bloquante pour un menu déroulant
      // secondaire empêcherait de gérer les organisations.
      .catch(() => {});
    return () => { vivant = false; };
  }, []);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const { items, total, page, setPage, loading, reload, accessDenied, error: erreur,} = useServerList(listerOrganisations, {
    limit: 12,
    filterKeys: ['search', 'statut', 'abonnement'],
    filters,
  });

  const remove = async (o) => {
    const res = await SwalCustom.confirm({ title: t('organisations.confirmerSuppression', { nom: o.nom }), text: t('organisations.confirmerSuppressionTexte'), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerOrganisationAdmin(o.id);
      SwalCustom.success(t('organisations.supprimee'));
      reload();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <>
      <PageHeader title={t('organisations.titre')} subtitle={t('organisations.sousTitre', { total })}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> {t('organisations.creer')}</button>
      </PageHeader>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input className="input" placeholder={t('superAdmin.recherchePlaceholder')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          {filters.search && <button className="icon-clear" onClick={() => setFilters({ ...filters, search: '' })}><X size={14} /></button>}
        </div>
        <Select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} label="">
          <option value="">{t('organisations.filtres.tousStatuts')}</option>
          {Object.entries(STATUTS_ORG).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
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
                  <thead><tr><th></th><th>{t('organisations.organisation')}</th><th>{t('organisations.colonnes.contact')}</th><th>{t('organisations.abonnement')}</th><th>{t('champs.statut')}</th><th>{t('organisations.colonnes.creeeLe')}</th><th></th></tr></thead>
                  <tbody>
                    {items.map((o) => (
                      <tr key={o.id}>
                        <td style={{ width: 52 }}><div className="avatar">{initials(o.nom)}</div></td>
                        <td><strong>{o.nom}</strong>{o.secteur_activite && <div className="text-muted" style={{ fontSize: 12 }}>{o.secteur_activite}</div>}</td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{o.email || o.telephone || '—'}</td>
                        {/* Le code stocké fait foi : une organisation peut porter une
                              formule retirée de la vente, son nom doit rester lisible. */}
                        <td><Badge tone="info">{formules.find((f) => f.code === o.abonnement)?.nom || o.abonnement || '—'}</Badge></td>
                        <td><Badge statusKey={o.statut} /></td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{formatDate(o.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(o)}><Pencil size={14} /></button>
                          <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(o)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination total={total} page={page} limit={12} onPage={setPage} />
          </>
        )}

      <OrganisationModal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null); }} organisation={editing} onSaved={reload} formules={formules} />
    </>
  );
}

function OrganisationModal({ open, onClose, organisation, onSaved, formules = [] }) {
  const { t } = useTranslation('plateforme');
  const isEdit = !!organisation;
  // Pas de formule par défaut écrite en dur : « Starter » n'existe pas au
  // catalogue, et la valeur partait telle quelle au serveur. Vide, puis la
  // première formule réelle dès que le catalogue est chargé (voir plus bas).
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', adresse: '', secteur_activite: '', abonnement: '', statut: 'active' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // `formules[0]?.code` et non un code écrit en dur : la formule d'entrée est
  // la PREMIÈRE du catalogue, celle que l'administrateur a placée en tête par
  // son champ `ordre`. Renommer ou réordonner les formules reste donc sans
  // effet ici. En édition, la valeur enregistrée prime — y compris si elle
  // désigne une formule retirée de la vente.
  const formuleParDefaut = formules[0]?.code || '';

  useEffect(() => {
    if (!open) return;
    if (organisation) {
      setForm({
        nom: organisation.nom || '', email: organisation.email || '', telephone: organisation.telephone || '',
        adresse: organisation.adresse || '', secteur_activite: organisation.secteur_activite || '',
        abonnement: organisation.abonnement || formuleParDefaut, statut: organisation.statut || 'active',
      });
    } else {
      setForm({ nom: '', email: '', telephone: '', adresse: '', secteur_activite: '', abonnement: formuleParDefaut, statut: 'active' });
    }
    setErrors({});
  }, [open, organisation, formuleParDefaut]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('organisations.modal.nomRequis');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('validation.emailInvalide');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (isEdit) {
        await modifierOrganisationAdmin(organisation.id, form);
        SwalCustom.success(t('organisations.modal.succesMaj'));
      } else {
        await creerOrganisationAdmin(form);
        SwalCustom.success(t('organisations.modal.succesCreation'));
      }
      onClose();
      onSaved();
    } catch (err) { SwalCustom.error({ title: isEdit ? t('organisations.modal.erreurMaj') : t('organisations.modal.erreurCreation'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('organisations.modal.titreEdition') : t('organisations.modal.titreCreation')} size="lg" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : isEdit ? t('actions.enregistrer') : t('actions.creer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <Input label={t('champs.nom')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={errors.nom} required />
        <div className="grid-2">
          <Input label={t('champs.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <Input label={t('champs.telephone')} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
        </div>
        <Input label={t('champs.adresse')} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
        <Input label={t('organisations.modal.secteurActivite')} value={form.secteur_activite} onChange={(e) => setForm({ ...form, secteur_activite: e.target.value })} />
        <div className="grid-2">
          <Select label={t('organisations.abonnement')} value={form.abonnement} onChange={(e) => setForm({ ...form, abonnement: e.target.value })}>
            {/* Formule enregistrée mais absente du catalogue (retirée de la
                vente) : sans cette option, le select afficherait la première
                formule et la ferait basculer au premier enregistrement. */}
            {form.abonnement && !formules.some((f) => f.code === form.abonnement) && (
              <option value={form.abonnement}>{form.abonnement}</option>
            )}
            {formules.map((f) => <option key={f.code} value={f.code}>{f.nom}</option>)}
          </Select>
          <Select label={t('champs.statut')} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
            {Object.entries(STATUTS_ORG).map(([value, def]) => <option key={value} value={value}>{enumLabel(value, def.label)}</option>)}
          </Select>
        </div>
      </form>
    </Modal>
  );
}
