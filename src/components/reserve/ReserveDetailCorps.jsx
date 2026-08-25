import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye, Paperclip, SignpostBig, Users, MessagesSquare, Camera, Trash2,
} from 'lucide-react';

import Badge from '../Badge.jsx';
import { getReserve } from '../../service/reserve/reserveService.js';
import { listerMembresChantier } from '../../service/chantier/chantierService.js';
import { affecterReserve } from '../../service/reserve/reserveService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate } from '../../utils/format.js';
import {
  STATUTS_RESERVE, SEVERITES, CATEGORIES_RESERVE, enumLabel,
} from '../../utils/constants.js';
import SwalCustom from '../../utils/swal.config.js';

const STATUT_FLOW = Object.keys(STATUTS_RESERVE).filter((s) => s !== 'en_retard');

/**
 * Corps du détail d'une réserve — SANS conteneur.
 *
 * Rendu à l'identique dans la modale d'un chantier et dans la page
 * `/reserves/:id`. Ne décide ni de son cadre ni de l'emplacement des actions
 * principales (QR, signer, valider, refuser) : celles-ci vivent dans le pied
 * de la modale d'un côté, dans l'en-tête de la page de l'autre — l'appelant
 * les rend lui-même à partir des handlers du hook.
 *
 * Toute la donnée et toutes les actions viennent de `useReserveDetail`,
 * passé ici en un seul objet `etat`.
 */
export default function ReserveDetailCorps({ etat, canAct, canDelete, onChanged }) {
  const { t } = useTranslation('chantier');
  const [onglet, setOnglet] = useState('infos');
  const [statut, setStatut] = useState('');
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');

  const {
    detail, pieces, signatures, affectations, commentaires, medias, qr,
    loading, saving,
  } = etat;

  if (loading) return <p className="text-muted">{t('etats.chargement')}</p>;
  if (!detail) return null;

  const appliquerStatut = async () => {
    const ok = await etat.changerStatut(statut, motif);
    if (ok) { setStatut(''); setMotif(''); }
  };

  const envoyerCommentaire = async () => {
    const ok = await etat.commenter(commentaire);
    if (ok) setCommentaire('');
  };

  const ONGLETS = [
    { key: 'infos', label: t('reserves.ongletInfos'), icon: Eye },
    { key: 'pieces', label: t('reserves.ongletPieces', { n: pieces.length }), icon: Paperclip },
    { key: 'signatures', label: t('reserves.ongletSignatures', { n: signatures.length }), icon: SignpostBig },
    { key: 'affectations', label: t('reserves.ongletAffectations', { n: affectations.length }), icon: Users },
    { key: 'commentaires', label: t('reserves.ongletCommentaires', { n: commentaires.length }), icon: MessagesSquare },
    { key: 'medias', label: t('reserves.ongletMedias', { n: medias.length }), icon: Camera },
  ];

  return (
    <>
      {qr && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src={qr} alt={t('reserves.qrCode')} style={{ width: 140, borderRadius: 8 }} />
          <p className="text-muted" style={{ fontSize: 12 }}>{t('reserves.qrLegende')}</p>
        </div>
      )}

      <div className="kv-list" style={{ marginBottom: 14 }}>
        <div className="kv-item"><span className="k">{t('reserves.severite')}</span><span className="v"><Badge tone={SEVERITES[detail.severite]?.tone}>{enumLabel(detail.severite, SEVERITES[detail.severite]?.label || detail.severite)}</Badge></span></div>
        <div className="kv-item"><span className="k">{t('champs.statut')}</span><span className="v"><Badge statusKey={detail.statut} /></span></div>
        <div className="kv-item"><span className="k">{t('champs.categorie')}</span><span className="v">{enumLabel(detail.categorie, CATEGORIES_RESERVE[detail.categorie])}</span></div>
        <div className="kv-item"><span className="k">{t('reserves.lot')}</span><span className="v">{detail.lot?.nom || '—'}</span></div>
        <div className="kv-item"><span className="k">{t('reserves.batiment')}</span><span className="v">{detail.batiment?.nom || '—'}</span></div>
        <div className="kv-item"><span className="k">{t('commun.entreprise')}</span><span className="v">{detail.entreprise?.nom || '—'}</span></div>
        <div className="kv-item"><span className="k">{t('reserves.assigneeA')}</span><span className="v">{detail.assigne?.prenom ? `${detail.assigne.prenom} ${detail.assigne.nom}` : '—'}</span></div>
        <div className="kv-item"><span className="k">{t('champs.dateLimite')}</span><span className="v">{formatDate(detail.date_limite)}</span></div>
      </div>

      {canAct && (
        <div className="field">
          <label>{t('reserves.changerStatut')}</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="input" value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="">{t('reserves.choisirStatut')}</option>
              {STATUT_FLOW.map((s) => <option key={s} value={s}>{enumLabel(s, STATUTS_RESERVE[s].label)}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={appliquerStatut} disabled={!statut || saving}>
              {saving ? '…' : t('actions.appliquer')}
            </button>
          </div>
          <input className="input mt-2" placeholder={t('reserves.motif')} value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>
      )}

      <div className="tabs-bar" style={{ margin: '16px 0 12px' }}>
        {ONGLETS.map((x) => {
          const Icon = x.icon;
          return (
            <button key={x.key} className={`tab-btn ${onglet === x.key ? 'active' : ''}`} onClick={() => setOnglet(x.key)}>
              <Icon size={14} /> {x.label}
            </button>
          );
        })}
      </div>

      {onglet === 'infos' && <p className="text-secondary">{detail.description || t('commun.aucuneDescription')}</p>}

      {onglet === 'pieces' && (
        <div>
          {canAct && (
            <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}>
              {t('reserves.ajouterPiece')}
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => { etat.ajouterFichier(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
          )}
          {pieces.length === 0 ? <p className="text-muted" style={{ marginTop: 10 }}>{t('reserves.aucunePiece')}</p> : (
            <ul style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pieces.map((p) => (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>
                    <Paperclip size={13} style={{ verticalAlign: -2 }} />{' '}
                    <a href={p.fichier_url} target="_blank" rel="noopener noreferrer">{p.nom_fichier}</a>
                  </span>
                  {canDelete && (
                    <button className="btn btn-ghost btn-sm" onClick={() => etat.retirerFichier(p.id)}><Trash2 size={13} /></button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {onglet === 'signatures' && (
        <div>
          {signatures.length === 0 ? <p className="text-muted">{t('reserves.aucuneSignature')}</p> : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {signatures.map((s) => (
                <li key={s.id} style={{ fontSize: 13 }}>
                  <Badge tone={s.type === 'refus' ? 'danger' : s.type === 'validation' ? 'success' : 'primary'}>
                    {enumLabel(s.type, s.type)}
                  </Badge>{' '}
                  {s.signataire ? `${s.signataire.prenom} ${s.signataire.nom}` : '—'} · {formatDate(s.createdAt)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {onglet === 'affectations' && (
        <div>
          {canAct && (
            <AffectationForm
              reserveId={detail.id}
              onAdded={() => { etat.recharger(); if (onChanged) onChanged(); }}
            />
          )}
          {affectations.length === 0 ? <p className="text-muted" style={{ marginTop: 8 }}>{t('reserves.aucuneAffectation')}</p> : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {affectations.map((a) => (
                <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>
                    {a.utilisateur ? `${a.utilisateur.prenom} ${a.utilisateur.nom}` : a.entreprise?.nom || '—'}{' '}
                    <Badge tone="info">{t('reserves.intervenant')}</Badge>
                  </span>
                  {canDelete && (
                    <button className="btn btn-ghost btn-sm" onClick={() => etat.retirerAffect(a.id)}><Trash2 size={13} /></button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {onglet === 'commentaires' && (
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder={t('reserves.ajouterCommentaire')}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && envoyerCommentaire()}
            />
            <button className="btn btn-primary btn-sm" onClick={envoyerCommentaire}>{t('reserves.envoyer')}</button>
          </div>
          {commentaires.length === 0 ? <p className="text-muted" style={{ marginTop: 8 }}>{t('reserves.aucunCommentaire')}</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {commentaires.map((c) => (
                <div key={c.id} className="comment-bubble">
                  <div style={{ fontSize: 12.5 }}>{c.message}</div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {c.auteur ? `${c.auteur.prenom} ${c.auteur.nom}` : '—'} · {formatDate(c.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {onglet === 'medias' && (
        <div>
          {canAct && (
            <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}>
              {t('reserves.ajouterMedia')}
              <input
                type="file"
                style={{ display: 'none' }}
                accept="image/*,video/*"
                onChange={(e) => { etat.ajouterPhoto(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
          )}
          <div className="grid-3" style={{ marginTop: 10 }}>
            {medias.length === 0 && <p className="text-muted">{t('reserves.aucunMedia')}</p>}
            {medias.map((m) => (
              <div key={m.id} className="media-thumb">
                {m.url && <img src={m.url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                {canDelete && (
                  <button className="btn btn-ghost btn-sm" onClick={() => etat.retirerPhoto(m.id)}><Trash2 size={13} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Affecte un membre du chantier à la réserve. */
function AffectationForm({ reserveId, onAdded }) {
  const { t } = useTranslation('chantier');
  const [membres, setMembres] = useState([]);
  const [utilisateurId, setUtilisateurId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let annule = false;
    // Les membres affectables sont ceux DU CHANTIER de la réserve : il faut
    // donc relire la réserve pour connaître son chantier.
    (async () => {
      try {
        const reserve = await getReserve(reserveId);
        if (!reserve?.chantierId) return;
        const d = await listerMembresChantier(reserve.chantierId);
        if (!annule) setMembres(d.items);
      } catch { /* liste vide : le sélecteur reste sans option */ }
    })();
    return () => { annule = true; };
  }, [reserveId]);

  const submit = async () => {
    if (!utilisateurId) return SwalCustom.error(t('commun.choisirMembre'));
    setSaving(true);
    try {
      await affecterReserve(reserveId, { utilisateurId });
      SwalCustom.success(t('reserves.membreAffecte'));
      setUtilisateurId('');
      onAdded();
    } catch (err) { SwalCustom.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select className="input" value={utilisateurId} onChange={(e) => setUtilisateurId(e.target.value)}>
        <option value="">{t('commun.affecterMembre')}</option>
        {membres.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
      </select>
      <button className="btn btn-secondary btn-sm" onClick={submit} disabled={saving}>
        {saving ? '…' : t('reserves.affecter')}
      </button>
    </div>
  );
}
