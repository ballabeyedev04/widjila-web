import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import DataTable from '../../../components/table/DataTable.jsx';
import { listerMembresChantier, assignerMembres, retirerMembreChantier } from '../../../service/chantier/chantierService.js';
import { listerMembres } from '../../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { initials } from '../../../utils/format.js';
import { ROLES, roleLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';

export default function MembresTab({ chantierId, canManage }) {
  const { t } = useTranslation('chantier');
  const [membres, setMembres] = useState([]);
  const [orgMembres, setOrgMembres] = useState([]);
  const [role, setRole] = useState('');
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerMembresChantier(chantierId);
      setMembres(d.items);
    } catch (err) {
      SwalCustom.error({ title: t('membres.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, t]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listerMembres({ limit: 100 }).then((d) => setOrgMembres(d.items)).catch(() => {});
  }, []);

  const add = async () => {
    if (!selected) return SwalCustom.error(t('membres.selectionnerMembre'));
    try {
      await assignerMembres(chantierId, { membreIds: [selected], roleChantier: role || undefined });
      SwalCustom.success(t('membres.affecte'));
      setSelected('');
      load();
    } catch (err) { SwalCustom.error({ title: t('membres.affectationImpossible'), text: getErrorMessage(err) }); }
  };

  const remove = async (m) => {
    try {
      await retirerMembreChantier(chantierId, m.id);
      SwalCustom.success(t('membres.retire'));
      load();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  const available = orgMembres.filter((m) => !membres.some((x) => x.id === m.id));

  const colonnes = [
    {
      cle: 'avatar',
      titre: '',
      triable: false,
      recherchable: false,
      largeur: 52,
      rendu: (m) => <div className="avatar">{initials(m.prenom, m.nom)}</div>,
    },
    {
      cle: 'membre',
      titre: t('membres.colMembre'),
      filtre: 'texte',
      // Prénom ET nom concaténés : chercher « Awa Diallo » doit fonctionner,
      // alors qu'aucun champ ne contient les deux.
      valeur: (m) => `${m.prenom ?? ''} ${m.nom ?? ''}`.trim(),
      rendu: (m) => <strong>{m.prenom} {m.nom}</strong>,
    },
    {
      cle: 'role',
      titre: t('champs.role'),
      filtre: 'select',
      options: Object.keys(ROLES).map((r) => ({ valeur: r, label: roleLabel(r) })),
      valeur: (m) => m.role,
      rendu: (m) => <Badge role={m.role} />,
    },
    {
      cle: 'roleChantier',
      titre: t('membres.colRoleChantier'),
      filtre: 'texte',
      rendu: (m) => <span className="text-muted" style={{ fontSize: 13 }}>{m.roleChantier || '—'}</span>,
    },
    {
      cle: 'actions',
      titre: '',
      triable: false,
      recherchable: false,
      alignement: 'droite',
      rendu: (m) => (canManage
        ? <button className="btn btn-ghost btn-sm btn-danger-hover" onClick={() => remove(m)}><Trash2 size={14} /></button>
        : null),
    },
  ];

  return (
    <div className="card">
      <div className="card-header"><h2>{t('membres.titre', { n: membres.length })}</h2></div>
      <div className="card-body">
        {canManage && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="input" style={{ flex: 1, minWidth: 220 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">{t('commun.affecterMembre')}</option>
              {available.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom} · {roleLabel(m.role)}</option>)}
            </select>
            <input className="input" placeholder={t('membres.rolePlaceholder')} value={role} onChange={(e) => setRole(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <button className="btn btn-primary btn-sm" onClick={add}><UserPlus size={14} /> {t('membres.affecter')}</button>
          </div>
        )}

        <DataTable
          donnees={membres}
          colonnes={colonnes}
          chargement={loading}
          titreVide={t('membres.videTitre')}
          messageVide={t('membres.videMessage')}
          parPage={10}
          triInitial={{ cle: 'membre', sens: 'asc' }}
        />
      </div>
    </div>
  );
}
