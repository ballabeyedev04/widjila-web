import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, RefreshCw, Send, Calculator } from 'lucide-react';

import PageHeader from '../../components/PageHeader.jsx';
import Modal from '../../components/Modal.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { Input, Select, Textarea } from '../../components/FormControls.jsx';
import { listerDevisAdmin, chiffrerDevis, envoyerDevis } from '../../service/abonnement/devisAdminService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { formatDate, formatPrix } from '../../utils/format.js';
import SwalCustom from '../../utils/swal.config.js';
import '../../assets/css/abonnement.css';

/**
 * Devis d'abonnement — l'écran du super-admin.
 *
 * C'est ici que le parcours « Premium sur devis » prend son sens : le client
 * décrit un besoin, nous le chiffrons, nous l'envoyons. Rien d'autre dans le
 * produit ne pose de montant.
 *
 * ── Deux garanties, rappelées à l'écran ───────────────────────────────────
 *
 *  1. le CHIFFRAGE et l'ENVOI sont deux gestes distincts. On prépare, on
 *     relit, puis on transmet : un devis part sous les yeux d'un client, il
 *     ne se rattrape pas.
 *  2. la TVA et le TTC sont calculés par le serveur à partir du HT et du
 *     taux. Ils ne se saisissent pas : c'est le TTC qui sera débité, et une
 *     faute de frappe s'y paierait comptant.
 */

const TONS = {
  brouillon: 'neutral',
  envoye: 'warning',
  accepte: 'success',
  refuse: 'danger',
  expire: 'neutral',
};

/** Formulaire de chiffrage — pré-rempli de ce que le client a demandé. */
function ModaleChiffrage({ devis, onFermer, onEnregistre }) {
  const { t } = useTranslation('plateforme');
  const demande = devis.demande || {};

  const [champs, setChamps] = useState({
    montantHt: devis.montantHt ?? '',
    tauxTva: devis.tauxTva ?? 20,
    // La durée et les volumes SOUHAITÉS servent de point de départ : on
    // chiffre presque toujours ce que le client a demandé, quitte à l'ajuster.
    dureeMois: devis.dureeMois ?? demande.dureeSouhaitee ?? 12,
    limiteUtilisateurs: devis.limiteUtilisateurs ?? demande.nbUtilisateurs ?? '',
    limiteChantiers: devis.limiteChantiers ?? demande.nbChantiers ?? '',
    conditions: devis.conditions ?? '',
  });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const maj = (nom) => (e) => setChamps((c) => ({ ...c, [nom]: e.target.value }));

  // Aperçu du TTC, calculé à l'identique du serveur — pour voir ce qui sera
  // débité AVANT d'enregistrer, pas pour le lui transmettre.
  const ht = Number(champs.montantHt) || 0;
  const tva = Math.round(ht * (Number(champs.tauxTva) || 0)) / 100;
  const ttc = Math.round((ht + tva) * 100) / 100;

  const enregistrer = async (puisEnvoyer) => {
    setEnCours(true);
    setErreur(null);
    try {
      // `null` = illimité, et c'est distinct d'un champ laissé vide côté
      // serveur : une chaîne vide serait refusée par la validation.
      const nombreOuNull = (v) => (v === '' || v === null ? null : Number(v));
      let maj = await chiffrerDevis(devis.id, {
        montantHt: Number(champs.montantHt),
        tauxTva: Number(champs.tauxTva),
        dureeMois: Number(champs.dureeMois),
        limiteUtilisateurs: nombreOuNull(champs.limiteUtilisateurs),
        limiteChantiers: nombreOuNull(champs.limiteChantiers),
        conditions: champs.conditions || null,
      });
      if (puisEnvoyer) maj = await envoyerDevis(devis.id);
      onEnregistre(maj);
      SwalCustom.success(t(puisEnvoyer ? 'devisAdmin.envoye' : 'devisAdmin.chiffre'));
    } catch (err) {
      setErreur(getErrorMessage(err));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modal open onClose={onFermer} title={t('devisAdmin.chiffrerTitre', { numero: devis.numero })}>
      {/* Ce que le client a demandé : c'est la pièce qui justifie le prix. */}
      <div className="devis-carte" style={{ marginBottom: 18 }}>
        <p className="devis-date">{t('devisAdmin.demandeDe', { organisation: devis.organisation?.nom || '—' })}</p>
        <dl className="recap-lignes">
          {demande.contact && <div className="recap-ligne"><dt>{t('abonnement.devis.contact')}</dt><dd>{demande.contact}</dd></div>}
          {demande.email && <div className="recap-ligne"><dt>{t('abonnement.devis.email')}</dt><dd>{demande.email}</dd></div>}
          {demande.telephone && <div className="recap-ligne"><dt>{t('abonnement.devis.telephone')}</dt><dd>{demande.telephone}</dd></div>}
          {demande.nbUtilisateurs != null && <div className="recap-ligne"><dt>{t('abonnement.devis.nbUtilisateurs')}</dt><dd>{demande.nbUtilisateurs}</dd></div>}
          {demande.nbChantiers != null && <div className="recap-ligne"><dt>{t('abonnement.devis.nbChantiers')}</dt><dd>{demande.nbChantiers}</dd></div>}
          {demande.dureeSouhaitee != null && <div className="recap-ligne"><dt>{t('abonnement.devis.dureeSouhaitee')}</dt><dd>{demande.dureeSouhaitee}</dd></div>}
        </dl>
        {demande.besoins && <p className="devis-conditions">{demande.besoins}</p>}
      </div>

      <div className="devis-grille">
        <Input
          label={t('devisAdmin.montantHt')}
          type="number" min="0" step="0.01"
          value={champs.montantHt} onChange={maj('montantHt')} required
        />
        <Select label={t('devisAdmin.tauxTva')} value={champs.tauxTva} onChange={maj('tauxTva')}>
          <option value="0">0 %</option>
          <option value="18">18 %</option>
          <option value="20">20 %</option>
        </Select>
        <Input
          label={t('devisAdmin.dureeMois')}
          type="number" min="1" max="120"
          value={champs.dureeMois} onChange={maj('dureeMois')} required
        />
        <Input
          label={t('devisAdmin.limiteUtilisateurs')}
          type="number" min="1"
          hint={t('devisAdmin.videIllimite')}
          value={champs.limiteUtilisateurs} onChange={maj('limiteUtilisateurs')}
        />
        <Input
          label={t('devisAdmin.limiteChantiers')}
          type="number" min="1"
          hint={t('devisAdmin.videIllimite')}
          value={champs.limiteChantiers} onChange={maj('limiteChantiers')}
        />
      </div>

      <Textarea
        label={t('devisAdmin.conditions')}
        rows={3} value={champs.conditions} onChange={maj('conditions')} maxLength={8000}
      />

      {/* Le montant réellement débité, affiché avant d'enregistrer. */}
      <p className="devis-regle" style={{ color: 'var(--text)' }}>
        <Calculator size={15} /> {t('devisAdmin.apercuTtc', {
          ttc: formatPrix(ttc, devis.devise || 'EUR'),
          tva: formatPrix(tva, devis.devise || 'EUR'),
        })}
      </p>

      {erreur && <div className="payment-error" role="alert">{erreur}</div>}

      <div className="devis-actions">
        <button type="button" className="btn btn-ghost" onClick={onFermer} disabled={enCours}>
          {t('abonnement.devis.annuler')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => enregistrer(false)} disabled={enCours}>
          {t('devisAdmin.enregistrer')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => enregistrer(true)} disabled={enCours}>
          <Send size={15} /> {t('devisAdmin.enregistrerEtEnvoyer')}
        </button>
      </div>
    </Modal>
  );
}

export default function PlateformeDevis() {
  const { t } = useTranslation('plateforme');

  const [devis, setDevis] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [chiffrage, setChiffrage] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const { devis: lignes } = await listerDevisAdmin({ statut: filtreStatut || undefined });
      setDevis(lignes);
    } catch (err) {
      setErreur(getErrorMessage(err));
    } finally {
      setChargement(false);
    }
  }, [filtreStatut]);

  useEffect(() => { charger(); }, [charger]);

  const remplacer = (maj) => setDevis((liste) => liste.map((d) => (d.id === maj.id ? { ...d, ...maj } : d)));

  return (
    <>
      <PageHeader
        title={t('devisAdmin.titre')}
        subtitle={t('devisAdmin.sousTitre')}
        actions={(
          <button type="button" className="btn btn-ghost" onClick={charger} disabled={chargement}>
            <RefreshCw size={15} /> {t('devisAdmin.actualiser')}
          </button>
        )}
      />

      <div style={{ marginBottom: 16, maxWidth: 260 }}>
        <Select
          label={t('devisAdmin.filtreStatut')}
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
        >
          <option value="">{t('devisAdmin.tousStatuts')}</option>
          {['brouillon', 'envoye', 'accepte', 'refuse', 'expire'].map((s) => (
            <option key={s} value={s}>{t(`abonnement.devis.statut.${s}`)}</option>
          ))}
        </Select>
      </div>

      {erreur && <ErrorState message={erreur} onRetry={charger} />}

      {!erreur && !chargement && devis.length === 0 && (
        <EmptyState title={t('devisAdmin.aucunTitre')} message={t('devisAdmin.aucunMessage')} />
      )}

      <div className="devis-liste">
        {devis.map((d) => (
          <article key={d.id} className="devis-carte">
            <header className="devis-entete">
              <div>
                <h3 className="devis-numero"><FileText size={16} /> {d.numero}</h3>
                <p className="devis-date">
                  {d.organisation?.nom || '—'} · {t('abonnement.devis.demandeLe', { date: formatDate(d.creeLe) })}
                </p>
              </div>
              <Badge tone={TONS[d.statut] || 'neutral'}>{t(`abonnement.devis.statut.${d.statut}`)}</Badge>
            </header>

            {d.chiffre ? (
              <dl className="recap-lignes">
                <div className="recap-ligne">
                  <dt>{t('abonnement.devis.montantTtc')}</dt>
                  <dd><strong>{formatPrix(d.montantTtc, d.devise)}</strong></dd>
                </div>
                <div className="recap-ligne">
                  <dt>{t('abonnement.devis.duree')}</dt>
                  <dd>{t('abonnement.devis.dureeMois', { n: d.dureeMois })}</dd>
                </div>
                <div className="recap-ligne">
                  <dt>{t('abonnement.devis.utilisateurs')}</dt>
                  <dd>{d.limiteUtilisateurs == null ? t('abonnement.illimite') : d.limiteUtilisateurs}</dd>
                </div>
                {d.payeLe && (
                  <div className="recap-ligne">
                    <dt>{t('abonnement.devis.regleLe', { date: '' }).replace(/\s*\{\{.*$/, '')}</dt>
                    <dd>{formatDate(d.payeLe)}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="devis-attente">{t('devisAdmin.aChiffrer')}</p>
            )}

            {d.motifRefus && (
              <p className="devis-conditions">{t('abonnement.devis.motifRefus', { motif: d.motifRefus })}</p>
            )}

            {/* Chiffrage possible tant que le client n'a pas répondu. Au-delà,
                on établit un nouveau devis : réécrire une offre acceptée
                reviendrait à changer un contrat après signature. */}
            {['brouillon', 'envoye'].includes(d.statut) && (
              <div className="devis-actions">
                <button type="button" className="btn btn-primary" onClick={() => setChiffrage(d)}>
                  <Calculator size={15} /> {d.chiffre ? t('devisAdmin.modifier') : t('devisAdmin.chiffrer')}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {chiffrage && (
        <ModaleChiffrage
          devis={chiffrage}
          onFermer={() => setChiffrage(null)}
          onEnregistre={(maj) => { remplacer(maj); setChiffrage(null); }}
        />
      )}
    </>
  );
}
