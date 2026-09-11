import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, FileText, Download, BarChart3, Eye, Mail, AlertTriangle } from 'lucide-react';

import Badge from '../../../components/Badge.jsx';
import Modal from '../../../components/Modal.jsx';
import DataTable from '../../../components/table/DataTable.jsx';
import { Input, Select } from '../../../components/FormControls.jsx';
import {
  genererRapport, listerRapports, getRapport, supprimerRapport,
  preparerEnvoiRapport, envoyerRapportParMail,
} from '../../../service/rapport/rapportService.js';
import { fetchFichierBlob } from '../../../service/plan/planService.js';
import { listerLots } from '../../../service/chantier/chantierService.js';
import { listerPartenairesChantier } from '../../../service/organisation/organisationService.js';
import { getErrorMessage } from '../../../service/helpers.js';
import { formatDate } from '../../../utils/format.js';
import { useUser } from '../../../context/useUser.js';
import { ROLES_PILOTAGE, ROLES_OPERATIONNELS, roleAllowed, enumLabel } from '../../../utils/constants.js';
import SwalCustom from '../../../utils/swal.config.js';
// Les chargements secondaires de cet écran n'interrompent rien en cas
// d'échec — mais ils le SIGNALENT, au lieu de laisser une liste vide
// que rien ne distingue d'une liste en panne.
import { reporter } from '../../../utils/monitoring.js';

// Libellés dans le namespace i18n `chantier` (rapports.types.<valeur>).
const TYPES_RAPPORT = ['reserves', 'entreprise', 'batiment', 'qualite', 'visite', 'opr'];

/**
 * Ouvre le PDF d'un rapport.
 *
 * Les rapports vivent dans le stockage PROTÉGÉ (`/uploads/rapports/…`) : une
 * `<iframe src>` ou un `<a href>` y accéderait sans le jeton d'authentification
 * — et, en production, sur le domaine de l'admin plutôt que sur celui de l'API.
 * Le fichier est donc récupéré par l'instance axios, qui porte le Bearer, puis
 * exposé comme URL d'objet locale.
 *
 * @returns {Promise<string>} une URL d'objet, à révoquer par l'appelant.
 */
async function ouvrirPdf(fichierUrl) {
  const blob = await fetchFichierBlob(fichierUrl);
  // `type` forcé : un blob sans type s'ouvre en téléchargement au lieu de
  // s'afficher dans la visionneuse intégrée du navigateur.
  return URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
}

export default function RapportsTab({ chantierId }) {
  const { t } = useTranslation('chantier');
  const { user } = useUser();
  const role = user?.role;
  const canGen = roleAllowed(role, ROLES_PILOTAGE);
  const canDelete = roleAllowed(role, ROLES_OPERATIONNELS);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // Total côté SERVEUR : ce tableau pagine côté client, il ne voit que la
  // page reçue. Sans ce total, les lignes au-delà disparaissaient sans
  // le moindre signe — voir la prop `totalServeur` de DataTable.
  const [totalServeur, setTotalServeur] = useState(null);
  const [showGen, setShowGen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listerRapports(chantierId);
      setItems(d.items);
      setTotalServeur(d.total);
    } catch (err) {
      SwalCustom.error({ title: t('rapports.erreurChargement'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [chantierId, t]);
  useEffect(() => { load(); }, [load]);

  /**
   * Téléchargement direct, sans passer par l'aperçu.
   *
   * Le détail est relu si nécessaire : la liste ne porte pas toujours
   * `fichier_url`, et un bouton qui échoue en silence vaut moins que pas de
   * bouton du tout.
   */
  const telecharger = async (r) => {
    try {
      const detail = r.fichier_url ? r : await getRapport(r.id);
      if (!detail?.fichier_url) throw new Error(t('rapports.indisponible'));
      const url = await ouvrirPdf(detail.fichier_url);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${detail.type || 'chantier'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Révocation différée : le navigateur interrompt le téléchargement si
      // l'URL d'objet disparaît avant qu'il ne l'ait lue.
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      SwalCustom.error({ title: t('rapports.apercuImpossible'), text: getErrorMessage(err) });
    }
  };

  const remove = async (r) => {
    const res = await SwalCustom.confirm({ title: t('rapports.supprimerTitre'), icon: 'warning', danger: true });
    if (!res) return;
    try { await supprimerRapport(r.id); SwalCustom.success(t('rapports.supprime')); load(); }
    catch (err) { SwalCustom.error(getErrorMessage(err)); }
  };

  /**
   * Colonnes du tableau.
   *
   * `valeur` est fourni partout où `rendu` produit du JSX : sans lui, le tri
   * et la recherche porteraient sur un objet React, donc sur rien.
   */
  const colonnes = [
    {
      cle: 'type',
      titre: t('champs.type'),
      filtre: 'select',
      options: TYPES_RAPPORT.map((v) => ({ valeur: v, label: t(`rapports.types.${v}`) })),
      valeur: (r) => r.type,
      rendu: (r) => (
        <Badge tone="info">{TYPES_RAPPORT.includes(r.type) ? t(`rapports.types.${r.type}`) : r.type}</Badge>
      ),
    },
    {
      cle: 'statut',
      titre: t('champs.statut'),
      filtre: 'texte',
      rendu: (r) => <span className="text-muted">{enumLabel(r.statut, r.statut)}</span>,
    },
    {
      cle: 'createdAt',
      titre: t('rapports.colGenereLe'),
      // Date native et non chaîne formatée : trier sur « 03/12 » classerait
      // par jour avant de classer par mois.
      valeur: (r) => (r.createdAt ? new Date(r.createdAt) : null),
      rendu: (r) => <span className="text-muted" style={{ fontSize: 13 }}>{formatDate(r.createdAt)}</span>,
    },
    {
      cle: 'actions',
      titre: '',
      triable: false,
      recherchable: false,
      alignement: 'droite',
      rendu: (r) => (
        <>
          <button className="btn btn-ghost btn-sm" title={t('rapports.previsualiser')} aria-label={t('rapports.previsualiser')} onClick={() => setViewing(r)}><Eye size={14} /></button>
          <button className="btn btn-ghost btn-sm" title={t('rapports.telecharger')} aria-label={t('rapports.telecharger')} onClick={() => telecharger(r)}><Download size={14} /></button>
          {canGen && (
            <button className="btn btn-ghost btn-sm" title={t('rapports.envoyerMail')} aria-label={t('rapports.envoyerMail')} onClick={() => setSending(r)}><Mail size={14} /></button>
          )}
          {canDelete && (
            <button className="btn btn-ghost btn-sm btn-danger-hover" title={t('actions.supprimer')} aria-label={t('actions.supprimer')} onClick={() => remove(r)}><Trash2 size={14} /></button>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>{t('rapports.titre', { n: items.length })}</h2>
          {canGen && <button className="btn btn-primary btn-sm" onClick={() => setShowGen(true)}><Plus size={14} /> {t('rapports.generer')}</button>}
        </div>
        <div className="card-body">
          <DataTable
            totalServeur={totalServeur}
            donnees={items}
            colonnes={colonnes}
            chargement={loading}
            titreVide={t('rapports.videTitre')}
            messageVide={t('rapports.videMessage')}
            placeholderRecherche={t('actions.rechercher')}
            parPage={10}
            triInitial={{ cle: 'createdAt', sens: 'desc' }}
          />
        </div>
      </div>

      <GenererRapportModal open={showGen} onClose={() => setShowGen(false)} chantierId={chantierId} onGenerated={load} />
      <RapportViewerModal rapport={viewing} onClose={() => setViewing(null)} />
      <EnvoyerRapportModal rapport={sending} onClose={() => setSending(null)} />
    </>
  );
}

function GenererRapportModal({ open, onClose, chantierId, onGenerated }) {
  const { t } = useTranslation('chantier');
  // `partenaireId` et non `entrepriseId` : le premier désigne une fiche de
  // l'annuaire du chantier, le second une organisation cliente de la
  // plateforme. Le formulaire propose des partenaires — voir
  // `models/reserve.model.js`, où les deux champs coexistent volontairement.
  const [form, setForm] = useState({ type: 'reserves', statut: '', partenaireId: '', batimentId: '' });
  const [batiments, setBatiments] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ type: 'reserves', statut: '', partenaireId: '', batimentId: '' });
    listerLots(chantierId).then((d) => setBatiments(d.items)).catch((err) => reporter(err, { source: 'RapportsTab' }));
    // Les partenaires DU CHANTIER : l'envoi par e-mail cherche l'entreprise
    // visée dans ce chantier, une fiche venue d'ailleurs serait écartée sans
    // rien dire.
    listerPartenairesChantier(chantierId).then((d) => setPartenaires(d.items)).catch((err) => reporter(err, { source: 'RapportsTab' }));
  }, [open, chantierId]);

  const submit = async () => {
    setSaving(true);
    try {
      await genererRapport(chantierId, {
        type: form.type,
        statut: form.statut || undefined,
        partenaireId: form.partenaireId || undefined,
        batimentId: form.batimentId || undefined,
      });
      SwalCustom.success(t('rapports.genere'));
      onClose();
      onGenerated();
    } catch (err) { SwalCustom.error({ title: t('commun.generationImpossible'), text: getErrorMessage(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('rapports.modalGenerer')} size="sm" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}><BarChart3 size={15} /> {t('rapports.btnGenerer')}</button>
      </>
    }>
      <Select label={t('rapports.typeRapport')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        {TYPES_RAPPORT.map((v) => <option key={v} value={v}>{t(`rapports.types.${v}`)}</option>)}
      </Select>
      {form.type === 'reserves' && (
        <Select label={t('rapports.filtrerStatut')} value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} emptyOption>
          <option value="">{t('commun.tousStatuts')}</option>
          {['creee', 'affectee', 'prise_en_charge', 'en_cours', 'corrigee', 'a_verifier', 'validee', 'refusee', 'rouverte', 'cloturee'].map((s) => <option key={s} value={s}>{enumLabel(s, s.replace(/_/g, ' '))}</option>)}
        </Select>
      )}
      {form.type === 'entreprise' && (
        <Select label={t('commun.entreprise')} value={form.partenaireId} onChange={(e) => setForm({ ...form, partenaireId: e.target.value })} emptyOption>
          <option value="">{t('etats.toutes')}</option>
          {partenaires.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </Select>
      )}
      {form.type === 'batiment' && (
        <Select label={t('rapports.batimentLot')} value={form.batimentId} onChange={(e) => setForm({ ...form, batimentId: e.target.value })} emptyOption>
          <option value="">{t('etats.tous')}</option>
          {batiments.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </Select>
      )}
    </Modal>
  );
}

function RapportViewerModal({ rapport, onClose }) {
  const { t } = useTranslation('chantier');
  const [detail, setDetail] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rapport) { setDetail(null); setBlobUrl(null); return undefined; }
    setLoading(true);
    let objectUrl = null;
    let annule = false;

    (async () => {
      try {
        const d = await getRapport(rapport.id);
        if (annule) return;
        setDetail(d);
        if (!d?.fichier_url) return;
        objectUrl = await ouvrirPdf(d.fichier_url);
        // La modale a pu être refermée pendant le téléchargement : afficher
        // le PDF d'un rapport que l'utilisateur ne regarde plus, ou laisser
        // fuir l'URL d'objet, sont deux défauts pour le prix d'un.
        if (annule) { URL.revokeObjectURL(objectUrl); objectUrl = null; return; }
        setBlobUrl(objectUrl);
      } catch (err) {
        if (!annule) SwalCustom.error({ title: t('rapports.apercuImpossible'), text: getErrorMessage(err) });
      } finally {
        if (!annule) setLoading(false);
      }
    })();

    return () => {
      annule = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rapport, t]);

  const titre = detail
    ? t('rapports.viewerTitre', { type: TYPES_RAPPORT.includes(detail.type) ? t(`rapports.types.${detail.type}`) : (detail.type || '') })
    : t('rapports.fallbackTitre');

  return (
    <Modal open={!!rapport} onClose={onClose} title={titre} size="lg" footer={
      blobUrl ? (
        <a className="btn btn-primary btn-sm" href={blobUrl} download={`rapport-${detail?.type || 'chantier'}.pdf`}>
          <Download size={14} /> {t('rapports.telechargerPdf')}
        </a>
      ) : null
    }>
      {loading ? <p className="text-muted">{t('etats.chargement')}</p> : blobUrl ? (
        <iframe title={titre} src={blobUrl} style={{ width: '100%', height: 520, border: '1px solid var(--border)', borderRadius: 10 }} />
      ) : (
        <p className="text-muted">{t('rapports.indisponible')}</p>
      )}
    </Modal>
  );
}

/**
 * Vérification AVANT envoi.
 *
 * Le client a été explicite : « ne pas envoyer automatiquement le mail sans
 * validation de l'utilisateur ». Cette modale montre exactement ce qui
 * partira — destinataire, copies, objet, message, pièce jointe — et n'envoie
 * qu'au clic sur « Envoyer ».
 *
 * Les adresses sont celles calculées par le SERVEUR. On peut en décocher, pas
 * en saisir : accepter une adresse libre ferait de la route un relais capable
 * d'expédier un document interne n'importe où.
 */
function EnvoyerRapportModal({ rapport, onClose }) {
  const { t } = useTranslation('chantier');
  const [envoi, setEnvoi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // Adresses décochées — transmises telles quelles au serveur, qui retire.
  const [exclues, setExclues] = useState([]);

  useEffect(() => {
    if (!rapport) { setEnvoi(null); setExclues([]); return undefined; }
    let annule = false;
    setLoading(true);
    setExclues([]);
    (async () => {
      try {
        const e = await preparerEnvoiRapport(rapport.id);
        if (!annule) setEnvoi(e);
      } catch (err) {
        if (!annule) {
          SwalCustom.error({ title: t('rapports.envoiImpossible'), text: getErrorMessage(err) });
          onClose();
        }
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => { annule = true; };
  }, [rapport, t, onClose]);

  const basculer = (adresse) => setExclues((prec) => (
    prec.includes(adresse) ? prec.filter((a) => a !== adresse) : [...prec, adresse]
  ));

  const avecEmail = (liste) => (liste || []).filter((d) => d.email);
  const destinataires = avecEmail(envoi?.destinataires);
  const copies = avecEmail(envoi?.copies);
  // Un envoi sans destinataire principal n'a pas de sens : le rapport
  // s'adresse à l'entreprise qui doit lever les réserves.
  const peutEnvoyer = destinataires.some((d) => !exclues.includes(d.email));

  const confirmer = async () => {
    setSending(true);
    try {
      const res = await envoyerRapportParMail(rapport.id, { exclure: exclues });
      SwalCustom.success(res?.message || t('rapports.envoiReussi'));
      onClose();
    } catch (err) {
      SwalCustom.error({ title: t('rapports.envoiImpossible'), text: getErrorMessage(err) });
    } finally { setSending(false); }
  };

  return (
    <Modal open={!!rapport} onClose={onClose} title={t('rapports.envoiTitre')} size="md" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
        <button className="btn btn-primary" onClick={confirmer} disabled={sending || loading || !peutEnvoyer}>
          <Mail size={15} /> {sending ? t('rapports.envoiEnCours') : t('rapports.envoiConfirmer')}
        </button>
      </>
    }>
      {loading && <p className="text-muted">{t('rapports.envoiChargement')}</p>}

      {!loading && envoi && (
        <div style={{ display: 'grid', gap: 16 }}>
          <ListeAdresses
            titre={t('rapports.envoiDestinataires')}
            vide={t('rapports.envoiAucunDestinataire')}
            entrees={destinataires}
            exclues={exclues}
            onBasculer={basculer}
          />
          <ListeAdresses
            titre={t('rapports.envoiCopies')}
            vide={t('rapports.envoiAucuneCopie')}
            entrees={copies}
            exclues={exclues}
            onBasculer={basculer}
          />

          {envoi.sansEmail?.length > 0 && (
            <p className="text-muted" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{t('rapports.envoiSansEmail', { noms: envoi.sansEmail.join(', ') })}</span>
            </p>
          )}

          <div>
            <div className="form-label">{t('rapports.envoiObjet')}</div>
            <p style={{ margin: 0 }}>{envoi.objet}</p>
          </div>

          <div>
            <div className="form-label">{t('rapports.envoiMessage')}</div>
            <p className="text-muted" style={{ margin: 0, whiteSpace: 'pre-line', fontSize: 13 }}>{envoi.message}</p>
          </div>

          <div>
            <div className="form-label">{t('rapports.envoiPieceJointe')}</div>
            <p style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
              <FileText size={15} /> {envoi.pieceJointe?.nom}
            </p>
          </div>

          <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{t('rapports.envoiAvertissement')}</p>
        </div>
      )}
    </Modal>
  );
}

/** Une liste d'adresses décochables — destinataires ou copies. */
function ListeAdresses({ titre, vide, entrees, exclues, onBasculer }) {
  const { t } = useTranslation('chantier');
  return (
    <div>
      <div className="form-label">{titre}</div>
      {entrees.length === 0 ? (
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{vide}</p>
      ) : (
        <>
          {entrees.map((e) => (
            <label key={e.email} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!exclues.includes(e.email)}
                onChange={() => onBasculer(e.email)}
              />
              <span>{e.nom}</span>
              <span className="text-muted" style={{ fontSize: 13 }}>{e.email}</span>
            </label>
          ))}
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>{t('rapports.envoiDecocher')}</p>
        </>
      )}
    </div>
  );
}
