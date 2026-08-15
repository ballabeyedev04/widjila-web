import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Trash2, UserPlus, X } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Input } from '../../components/FormControls.jsx';
import {
  listerEquipes, creerEquipe, ajouterMembresEquipe, retirerMembreEquipe, supprimerEquipe,
  listerMembres,
} from '../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { initials } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';

export default function Equipes() {
  const { t } = useTranslation('organisation');
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [manageFor, setManageFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerEquipes();
      setEquipes(d.items);
    } catch (err) {
      SwalCustom.error({ title: t('equipes.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const remove = async (e) => {
    const res = await SwalCustom.confirm({ title: t('equipes.supprimer.titre', { nom: e.nom }), text: t('equipes.supprimer.texte'), icon: 'warning', danger: true });
    if (!res) return;
    try {
      await supprimerEquipe(e.id);
      SwalCustom.success(t('equipes.supprimer.succes'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  return (
    <>
      <PageHeader title={t('equipes.titre')} subtitle={t('equipes.sousTitre', { count: equipes.length })}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> {t('equipes.nouvelle')}</button>
      </PageHeader>

      {loading ? <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('etats.chargement')}</div></div>
        : equipes.length === 0 ? <EmptyState title={t('equipes.vide.titre')} message={t('equipes.vide.message')} />
        : (
          <div className="grid-2">
            {equipes.map((e) => (
              <div className="card" key={e.id}>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: 16 }}><Users size={17} style={{ verticalAlign: -3, marginRight: 6 }} /> {e.nom}</h2>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setManageFor(e)}><UserPlus size={14} /></button>
                      <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(e)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="text-muted" style={{ fontSize: 12.5 }}>{e.description || '—'}</p>
                  {e.chef && <p style={{ fontSize: 13 }}>{t('equipes.chefLabel')} <strong>{e.chef.prenom} {e.chef.nom}</strong></p>}
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(e.membres || []).length === 0 && <span className="text-muted" style={{ fontSize: 12.5 }}>{t('equipes.aucunMembre')}</span>}
                    {(e.membres || []).map((m) => (
                      <span key={m.id} className="chip">
                        {initials(m.prenom, m.nom)} {m.prenom} {m.nom}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      <CreateEquipeModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
      <ManageEquipeModal equipe={manageFor} onClose={() => setManageFor(null)} onChanged={load} />
    </>
  );
}

function CreateEquipeModal({ open, onClose, onCreated }) {
  const { t } = useTranslation('organisation');
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [chefId, setChefId] = useState('');
  const [all, setAll] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNom(''); setDescription(''); setChefId(''); setSelected([]);
      listerMembres({ limit: 100 }).then((d) => setAll(d.items)).catch(() => {});
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!nom.trim()) return SwalCustom.error(t('validation.champRequis', { champ: t('equipes.champs.nom') }));
    setSaving(true);
    try {
      await creerEquipe({ nom, description, chefId: chefId || undefined, membreIds: selected });
      SwalCustom.success(t('equipes.creer.succes'));
      onClose();
      onCreated();
    } catch (err) { SwalCustom.error({ title: t('equipes.creer.erreur'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('equipes.nouvelle')} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '…' : t('actions.creer')}</button>
      </>
    }>
      <form onSubmit={submit}>
        <Input label={t('equipes.champs.nom')} value={nom} onChange={(e) => setNom(e.target.value)} required />
        <div className="field">
          <label>{t('champs.description')}</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('equipes.champs.chef')}</label>
          <select className="input" value={chefId} onChange={(e) => setChefId(e.target.value)}>
            <option value="">{t('equipes.aucunOption')}</option>
            {all.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('equipes.champs.membres')}</label>
          <select className="input" value="" onChange={(e) => { const id = e.target.value; if (id && !selected.includes(id)) setSelected([...selected, id]); }}>
            <option value="">{t('equipes.ajouterMembreOption')}</option>
            {all.filter((m) => !selected.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
          </select>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {selected.map((id) => {
              const m = all.find((x) => x.id === id);
              return m && <span key={id} className="chip">{m.prenom} {m.nom} <button type="button" onClick={() => setSelected(selected.filter((x) => x !== id))}><X size={12} /></button></span>;
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ManageEquipeModal({ equipe, onClose, onChanged }) {
  const { t } = useTranslation('organisation');
  const [all, setAll] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (equipe) {
      setSelected((equipe.membres || []).map((m) => m.id));
      listerMembres({ limit: 100 }).then((d) => setAll(d.items)).catch(() => {});
    }
  }, [equipe]);

  const add = async (id) => {
    setSaving(true);
    try {
      await ajouterMembresEquipe(equipe.id, { membreIds: [id] });
      setSelected((s) => [...s, id]);
      SwalCustom.success(t('equipes.gerer.membreAjoute'));
      onChanged();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    setSaving(true);
    try {
      await retirerMembreEquipe(equipe.id, id);
      setSelected((s) => s.filter((x) => x !== id));
      SwalCustom.success(t('equipes.gerer.membreRetire'));
      onChanged();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!equipe} onClose={onClose} title={t('equipes.gerer.titre', { nom: equipe?.nom })} size="lg">
      <div className="grid-2">
        <div>
          <strong style={{ fontSize: 13 }}>{t('equipes.gerer.ajouterMembre')}</strong>
          <select className="input mt-2" value="" onChange={(e) => e.target.value && add(e.target.value)}>
            <option value="">{t('equipes.gerer.selectionner')}</option>
            {all.filter((m) => !selected.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
          </select>
        </div>
        <div>
          <strong style={{ fontSize: 13 }}>{t('equipes.gerer.membresActuels', { n: selected.length })}</strong>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selected.length === 0 && <span className="text-muted" style={{ fontSize: 13 }}>{t('equipes.gerer.aucunMembre')}</span>}
            {selected.map((id) => {
              const m = all.find((x) => x.id === id);
              return m && (
                <div key={id} className="chip" style={{ justifyContent: 'space-between' }}>
                  {m.prenom} {m.nom}
                  <button type="button" onClick={() => remove(id)} disabled={saving}><X size={12} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
