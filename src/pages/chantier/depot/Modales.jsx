/**
 * Les trois fenêtres de saisie du dépôt de plans.
 *
 * Extraites de `DepotPlans.jsx`, qui atteignait 1 323 lignes — le plus gros
 * fichier du dépôt. Elles ne partagent avec l'écran que des props : ajouter un
 * niveau, un appartement, ou compléter la demande de chantier sont trois
 * formulaires indépendants du parcours qui les ouvre.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Modal from '../../../components/Modal.jsx';
import { Input, Select, Textarea, Field } from '../../../components/FormControls.jsx';
import SwalCustom from '../../../utils/swal.config.js';
import { SECTIONS, idTemp } from './commun.js';

/* ══════════════════════════════════════════════════════════════════════════
 * Saisie d'un niveau — code, plan, et ses appartements d'un seul geste
 * ══════════════════════════════════════════════════════════════════════════ */

export function NiveauModal({
  open, onClose, type, codesNiveau, codesAppartement, occupe,
  onNouveauCodeNiveau, onNouveauCodeAppartement, onValider,
}) {
  const { t } = useTranslation('chantier');
  const [codeNiveau, setCodeNiveau] = useState('');
  const [fichier, setFichier] = useState(null);
  const [appartements, setAppartements] = useState([]);

  useEffect(() => {
    if (!open) return;
    setCodeNiveau('');
    setFichier(null);
    setAppartements([]);
  }, [open]);

  const codes = codesNiveau.filter((c) => (c.typeNiveau || c.type_niveau) === type);

  return (
    <Modal
      open={open} onClose={onClose} title={t('depot.modalNiveau')} size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
          <button
            className="btn btn-primary"
            disabled={!codeNiveau || occupe}
            onClick={() => onValider({ codeNiveau, fichier, appartements })}
          >
            {t('actions.ajouter')}
          </button>
        </>
      }
    >
      <ChoixCode
        label={t('depot.codeNiveau')}
        codes={codes}
        valeur={codeNiveau}
        onChange={setCodeNiveau}
        onNouveau={(code) => onNouveauCodeNiveau(code, type)}
        disabled={occupe}
      />

      <Field label={t('depot.planNiveau')} hint={t('depot.planFacultatif')}>
        {fichier ? (
          <LigneFichierAttente nom={fichier.name} onRetirer={() => setFichier(null)} />
        ) : (
          <ChoixFichier label={t('depot.choisirFichier')} onChoisir={(f) => setFichier(f[0])} disabled={occupe} />
        )}
      </Field>

      <Field label={t('depot.appartements')} hint={t('depot.appartementsAide')}>
        {appartements.map((ap, i) => (
          <div key={ap.cle} className="depot-appartement-saisie">
            <ChoixCode
              label=""
              codes={codesAppartement}
              valeur={ap.code}
              onChange={(code) => setAppartements((l) => l.map((x, j) => (j === i ? { ...x, code } : x)))}
              onNouveau={onNouveauCodeAppartement}
              disabled={occupe}
            />
            <ChoixFichier
              multiple
              label={t('depot.ajouterPlan')}
              onChoisir={(fichiers) => setAppartements((l) => l.map((x, j) => (
                j === i ? { ...x, fichiers: [...x.fichiers, ...fichiers] } : x
              )))}
              disabled={occupe}
            />
            {ap.fichiers.map((f, k) => (
              <LigneFichierAttente
                key={`${f.name}-${k}`}
                nom={f.name}
                onRetirer={() => setAppartements((l) => l.map((x, j) => (
                  j === i ? { ...x, fichiers: x.fichiers.filter((_, m) => m !== k) } : x
                )))}
              />
            ))}
            <button
              type="button" className="btn btn-ghost btn-sm btn-danger-hover"
              onClick={() => setAppartements((l) => l.filter((_, j) => j !== i))}
            >
              <Trash2 size={14} /> {t('actions.retirer')}
            </button>
          </div>
        ))}
        <button
          type="button" className="btn btn-ghost btn-sm"
          onClick={() => setAppartements((l) => [...l, { cle: idTemp(), code: '', fichiers: [] }])}
          disabled={occupe}
        >
          <Plus size={14} /> {t('depot.ajouterAppartement')}
        </button>
      </Field>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Saisie d'un appartement
 * ══════════════════════════════════════════════════════════════════════════ */

export function AppartementModal({
  open, onClose, codesAppartement, occupe, onNouveauCode, onValider,
  codeInitial = '', sansFichier = false,
}) {
  const { t } = useTranslation('chantier');
  const [code, setCode] = useState(codeInitial);
  const [fichiers, setFichiers] = useState([]);

  useEffect(() => {
    if (!open) return;
    setCode(codeInitial);
    setFichiers([]);
  }, [open, codeInitial]);

  return (
    <Modal
      open={open} onClose={onClose}
      title={sansFichier ? t('depot.modalRenommerAppartement') : t('depot.modalAppartement')}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('actions.annuler')}</button>
          <button
            className="btn btn-primary"
            disabled={!code || occupe}
            onClick={() => onValider({ code, fichiers })}
          >
            {sansFichier ? t('actions.enregistrer') : t('actions.ajouter')}
          </button>
        </>
      }
    >
      <ChoixCode
        label={t('depot.codeAppartement')}
        codes={codesAppartement}
        valeur={code}
        onChange={setCode}
        onNouveau={onNouveauCode}
        disabled={occupe}
      />

      {!sansFichier && (
        <Field label={t('depot.plansAppartement')} hint={t('depot.planFacultatif')}>
          <ChoixFichier
            multiple
            label={t('depot.choisirFichier')}
            onChoisir={(f) => setFichiers((l) => [...l, ...f])}
            disabled={occupe}
          />
          {fichiers.map((f, i) => (
            <LigneFichierAttente
              key={`${f.name}-${i}`}
              nom={f.name}
              onRetirer={() => setFichiers((l) => l.filter((_, j) => j !== i))}
            />
          ))}
        </Field>
      )}
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Le formulaire de demande — il vient APRÈS les plans
 * ══════════════════════════════════════════════════════════════════════════ */

export function DemandeChantierModal({ open, onClose, onEnvoyer, occupe }) {
  const { t } = useTranslation('chantier');
  const [form, setForm] = useState({ nom: '', code: '', description: '', adresse: '', date_debut: '', date_fin: '' });
  const [erreurs, setErreurs] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({ nom: '', code: '', description: '', adresse: '', date_debut: '', date_fin: '' });
    setErreurs({});
  }, [open]);

  const soumettre = () => {
    const errs = {};
    if (!form.nom.trim()) errs.nom = t('commun.nomRequis');
    if (form.date_debut && form.date_fin && new Date(form.date_debut) > new Date(form.date_fin)) {
      errs.date_fin = t('liste.finApresDebut');
    }
    setErreurs(errs);
    if (Object.keys(errs).length) return;

    onEnvoyer({
      nom: form.nom,
      code: form.code || undefined,
      description: form.description || undefined,
      adresse: form.adresse || undefined,
      date_debut: form.date_debut || undefined,
      date_fin: form.date_fin || undefined,
    });
  };

  return (
    <Modal
      open={open} onClose={onClose} title={t('depot.modalDemande')} size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={occupe}>{t('actions.annuler')}</button>
          <button className="btn btn-primary" onClick={soumettre} disabled={occupe}>
            <Send size={15} /> {occupe ? t('depot.envoiEnCours') : t('depot.envoyer')}
          </button>
        </>
      }
    >
      <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>{t('depot.aideDemande')}</p>
      <div className="grid-2">
        <Input label={t('liste.nomChantier')} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} error={erreurs.nom} required />
        <Input label={t('commun.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CH-2026-001" />
      </div>
      <Textarea label={t('champs.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      <Input label={t('champs.adresse')} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
      <div className="grid-2">
        <Input label={t('champs.dateDebut')} type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
        <Input label={t('champs.dateFin')} type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} error={erreurs.date_fin} />
      </div>
    </Modal>
  );
}
