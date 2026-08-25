import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, QrCode, Building2 } from 'lucide-react';

import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ReserveDetailCorps from '../../components/reserve/ReserveDetailCorps.jsx';
import useReserveDetail from '../../hooks/useReserveDetail.js';
import { useUser } from '../../context/useUser.js';
import { ROLES_RESERVE_INTERVENANTS, ROLES_OPERATIONNELS, roleAllowed } from '../../utils/constants.js';

/**
 * Page dédiée d'une réserve — l'URL est PARTAGEABLE.
 *
 * C'est sa raison d'être : la modale du chantier affiche exactement le même
 * contenu, mais son adresse reste celle du chantier. Envoyer une réserve
 * précise à un collègue imposait de lui décrire le chemin pour la retrouver.
 *
 * Aucune logique dupliquée : même hook et même corps que la modale.
 */
export default function ReserveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('chantier');
  const { user } = useUser();
  const role = user?.role;

  const canAct = roleAllowed(role, ROLES_RESERVE_INTERVENANTS);
  const canDelete = roleAllowed(role, ROLES_OPERATIONNELS);

  const etat = useReserveDetail(id);
  const { detail, loading, introuvable } = etat;

  // Un identifiant erroné dans l'URL est le cas normal ici (lien périmé,
  // réserve supprimée depuis) : on l'annonce au lieu de laisser une page vide.
  if (introuvable) {
    return (
      <>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          <ArrowLeft size={15} /> {t('actions.retour')}
        </button>
        <EmptyState
          title={t('reserves.introuvableTitre')}
          message={t('reserves.introuvableMessage')}
        />
      </>
    );
  }

  return (
    <>
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> {t('actions.retour')}
          </button>

          <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.25 }}>
            {loading && !detail
              ? t('etats.chargement')
              : detail
                ? <><span className="text-muted">{detail.numero}</span> — {detail.titre}</>
                : ''}
          </h1>

          {detail?.chantier && (
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13.5 }}>
              <Building2 size={14} style={{ verticalAlign: -2 }} />{' '}
              <Link to={`/chantiers/${detail.chantier.id}`}>{detail.chantier.nom}</Link>
              {detail.chantier.code && <span> · {detail.chantier.code}</span>}
              {' · '}
              <Badge statusKey={detail.statut} />
            </p>
          )}
        </div>

        {detail && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <button className="btn btn-secondary btn-sm" onClick={etat.chargerQr}>
              <QrCode size={14} /> {t('reserves.qrCode')}
            </button>
            {canAct && <button className="btn btn-secondary btn-sm" onClick={() => etat.signer('signature')}>{t('actions.signer')}</button>}
            {canAct && <button className="btn btn-primary btn-sm" onClick={() => etat.signer('validation')}>{t('actions.valider')}</button>}
            {canAct && <button className="btn btn-danger btn-sm" onClick={() => etat.signer('refus')}>{t('actions.refuser')}</button>}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          <ReserveDetailCorps etat={etat} canAct={canAct} canDelete={canDelete} />
        </div>
      </div>
    </>
  );
}
