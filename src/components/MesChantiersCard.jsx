import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, ArrowRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { listerMesChantiers } from '../service/account/accountService.js';
import { getErrorMessage } from '../service/helpers.js';
import Badge from './Badge.jsx';
import EmptyState from './EmptyState.jsx';
import { roleLabel } from '../utils/constants.js';
import { initials } from '../utils/format.js';
import SwalCustom from '../utils/swal.config.js';

/** Rôle de l'utilisateur sur le chantier (through ChantierMembre). */
const roleSurChantier = (chantier) => chantier?.membres?.[0]?.ChantierMembre?.roleChantier || null;

/**
 * « Mes chantiers » — liste des chantiers auxquels l'utilisateur est affecté
 * (affectation multi-projets, module 1). S'appuie sur GET /account/chantiers.
 */
export default function MesChantiersCard() {
  const { t } = useTranslation('layout');
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listerMesChantiers();
      setItems(data.items);
    } catch (err) {
      SwalCustom.error({ title: t('mesChantiers.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;

  return (
    <div className="card mt-4">
      <div className="card-header">
        <h2><FolderOpen size={18} style={{ verticalAlign: -2 }} /> {t('mesChantiers.titre')}</h2>
        <span className="text-muted">{t('mesChantiers.affectations', { count: items.length })}</span>
      </div>
      <div className="card-body">
        {items.length === 0 && (
          <EmptyState title={t('mesChantiers.aucunTitre')} message={t('mesChantiers.aucunMessage')} />
        )}
        <div className="chantiers-grid">
          {items.map((c) => (
            <Link key={c.id} to={`/chantiers/${c.id}`} className="chantier-card">
              <div className="chantier-card-top">
                <div className="avatar">{initials(c.nom)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong className="chantier-card-nom">{c.nom}</strong>
                  {c.code && <div className="text-muted" style={{ fontSize: 12 }}>{c.code}</div>}
                </div>
                <Badge statusKey={c.statut} />
              </div>
              {c.adresse && (
                <div className="text-muted" style={{ fontSize: 12.5, marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <MapPin size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{c.adresse}</span>
                </div>
              )}
              <div className="chantier-card-foot">
                {roleSurChantier(c) ? (
                  <span className="badge badge-neutral">{roleLabel(roleSurChantier(c))}</span>
                ) : (
                  <span className="text-muted" style={{ fontSize: 12 }}>{t('mesChantiers.affecte')}</span>
                )}
                <span className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                  {t('mesChantiers.ouvrir')} <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
