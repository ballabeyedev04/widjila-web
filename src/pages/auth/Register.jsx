import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Building, Phone, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

import { register, validatePassword } from '../../service/auth/authService.js';
import { usePays } from '../../hooks/usePays.js';
import { getErrorMessage } from '../../service/helpers.js';
import '../../assets/css/auth.css';
import SwalCustom from '../../utils/swal.config.js';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  // Catalogue des pays et de leurs identifiants — servi par l'API, jamais
  // recopié ici : une table locale divergerait de celle que le backend
  // applique, et l'écart ne se verrait qu'au moment d'un refus d'inscription.
  const { pays, chargement: paysEnCours, erreur: paysErreur } = usePays();

  /** Identifiants attendus pour un code pays donné. */
  const champsDuPays = (code) => pays.find((p) => p.code === code)?.champs ?? [];

  /** Toutes les clés d'identifiant, tous pays confondus. */
  const toutesLesCles = [...new Set(pays.flatMap((p) => p.champs.map((c) => c.cle)))];

  const [form, setForm] = useState({
    // Utilisateur
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    mot_de_passe: '',
    confirm_mot_de_passe: '',
    fonction: '',
    role: 'Client',
    // Organisation
    organisationNom: '',
    raison_sociale: '',
    // Les identifiants d'entreprise ne sont plus listés ici : ils dépendent du
    // pays et sont ajoutés au formulaire quand celui-ci est choisi.
    organisationTelephone: '',
    organisationEmail: '',
    organisationAdresse: '',
    organisationVille: '',
    // Vide, et non « France » : présélectionner un pays ferait passer des
    // inscriptions sous un pays que le visiteur n'a jamais choisi, et
    // afficherait d'emblée des champs qui ne le concernent peut-être pas.
    organisationPays: '',
    // RGPD art. 7 — consentement explicite. Le formulaire se contentait d'une
    // mention passive « en vous inscrivant vous acceptez… » : un consentement
    // ni actif ni prouvable. Case décochée par défaut (aucune case pré-cochée),
    // bloquante à la soumission.
    consentement: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fonction pure (ne touche pas à l'état) : retourne le message d'erreur pour
  // un champ donné, ou `undefined` s'il est valide. Utilisée à la fois par la
  // validation au fil de la saisie et par la validation finale à la
  // soumission — une seule source de vérité, plus de désynchronisation
  // possible entre les deux.
  const getFieldError = (name, value, formValues) => {
    // Identifiant d'entreprise : le motif vient du catalogue, donc du serveur.
    // Le recopier ici le ferait diverger de la règle réellement appliquée, et
    // l'écart ne se verrait qu'au moment d'un refus.
    //
    // Aucun n'est OBLIGATOIRE : une entreprise en cours d'immatriculation n'a
    // pas encore ses numéros, les exiger l'empêcherait de s'inscrire.
    const identifiant = champsDuPays(formValues?.organisationPays ?? form.organisationPays)
      .find((c) => c.cle === name);
    if (identifiant) {
      const v = (value ?? '').trim();
      if (!v) return undefined;
      return new RegExp(identifiant.motif).test(v)
        ? undefined
        : t('register.validation.identifiantFormat', { aide: identifiant.aide });
    }

    switch (name) {
      case 'nom':
        return !value.trim() ? t('register.validation.nomRequis') : undefined;
      case 'prenom':
        return !value.trim() ? t('register.validation.prenomRequis') : undefined;
      case 'email':
        if (!value.trim()) return t('register.validation.emailRequis');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('validation.emailInvalide');
        return undefined;
      case 'telephone':
        return value && !/^\+?[0-9\s-]{7,20}$/.test(value) ? t('register.validation.telephoneInvalide') : undefined;
      case 'mot_de_passe':
        if (!value) return t('register.validation.motDePasseRequis');
        if (!validatePassword(value)) return t('register.validation.motDePasseFormat');
        return undefined;
      case 'confirm_mot_de_passe':
        if (!value) return t('register.validation.confirmationRequise');
        if (value !== formValues.mot_de_passe) return t('validation.motsDePasseDifferents');
        return undefined;
      case 'organisationNom':
        return !value.trim() ? t('register.validation.organisationRequise') : undefined;
      // Les identifiants d'entreprise sont validés d'après le catalogue
      // (`champsPays`), chacun avec le motif que le serveur applique lui-même :
      // un seul endroit à corriger si une administration change son format.
      case 'organisationPays':
        return !value ? t('register.validation.paysRequis') : undefined;
      case 'consentement':
        return !value ? t('register.validation.consentementRequis') : undefined;
      default:
        return undefined;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let valeur = type === 'checkbox' ? checked : value;
    // SIRET : la saisie n'accepte que des chiffres et se bloque à 14 —
    // impossible de taper un 15e caractère ou de coller un texte plus long.
    if (name === 'siret') valeur = value.replace(/\D/g, '').slice(0, 14);

    const nextForm = { ...form, [name]: valeur };

    // Changer de pays RETIRE les identifiants devenus hors sujet. Sans cela,
    // un NINEA saisi puis passage en France partirait quand même au serveur,
    // qui le refuse — pour une valeur devenue invisible à l'écran.
    if (name === 'organisationPays') {
      const gardes = new Set(champsDuPays(valeur).map((c) => c.cle));
      for (const champ of toutesLesCles) {
        if (!gardes.has(champ)) delete nextForm[champ];
      }
    }

    setForm(nextForm);

    // Correction du bug « le message d'erreur ne disparaît pas » : on repart
    // à chaque frappe des erreurs précédentes et on RETIRE la clé dès que le
    // champ redevient valide, au lieu de ne faire qu'ajouter des erreurs.
    setErrors((prev) => {
      const next = { ...prev };
      const error = getFieldError(name, valeur, nextForm);
      if (error) next[name] = error;
      else delete next[name];

      // Si le mot de passe change, la confirmation déjà saisie doit être
      // revérifiée (elle peut devenir valide ou invalide selon la nouvelle
      // valeur), sinon son message reste figé sur l'ancien mot de passe.
      if (name === 'mot_de_passe' && nextForm.confirm_mot_de_passe) {
        const confirmError = getFieldError('confirm_mot_de_passe', nextForm.confirm_mot_de_passe, nextForm);
        if (confirmError) next.confirm_mot_de_passe = confirmError;
        else delete next.confirm_mot_de_passe;
      }
      return next;
    });
  };

  // Récapitule si le formulaire est actuellement soumettable — recalculé à
  // chaque rendu à partir de `form` uniquement (jamais de `errors`, qui peut
  // contenir des messages pour des champs pas encore touchés). Sert à la fois
  // à griser le bouton et à la garde de soumission ci-dessous.
  const isFormValid = Object.keys(form).every((key) => !getFieldError(key, form[key], form));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation finale : reconstruite entièrement à partir de `form` (pas de
    // `errors`, périmé d'un cycle de rendu) pour éviter qu'une soumission
    // passe alors qu'un champ est en fait invalide.
    const freshErrors = {};
    Object.keys(form).forEach((key) => {
      const error = getFieldError(key, form[key], form);
      if (error) freshErrors[key] = error;
    });
    setErrors(freshErrors);
    if (Object.keys(freshErrors).length > 0) return;

    setLoading(true);
    try {
      // `consentement` n'est pas transmis : aucun champ ne l'accueille côté
      // serveur pour l'instant (le schéma Joi le retirerait silencieusement).
      // Conserver une preuve horodatée du consentement suppose une colonne
      // dédiée côté backend — hors périmètre de ce correctif.
      const payload = { ...form };
      delete payload.consentement;
      const result = await register(payload);
      if (result.success) {
        SwalCustom.success({
          title: t('register.succesTitre'),
          text: t('register.succesTexte'),
        });
        navigate('/login', { replace: true });
      }
    } catch (err) {
      SwalCustom.error({ title: t('register.erreurTitre'), text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const userFields = [
    { name: 'nom', label: t('champs.nom'), icon: User, required: true },
    { name: 'prenom', label: t('champs.prenom'), icon: User, required: true },
    { name: 'email', label: t('champs.email'), icon: Mail, type: 'email', required: true },
    { name: 'telephone', label: t('register.champs.telephoneOptionnel'), icon: Phone, required: false },
    { name: 'fonction', label: t('register.champs.fonctionOptionnel'), icon: KeyRound, required: false },
  ];

  // Le PAYS n'est plus dans cette liste : c'est un sélecteur, rendu à part et
  // placé EN PREMIER — il commande les identifiants affichés ensuite.
  const orgFields = [
    { name: 'organisationNom', label: t('register.champs.organisationNom'), icon: Building, required: true },
    { name: 'raison_sociale', label: t('register.champs.raisonSociale'), icon: Building, required: false },

    // Identifiants du pays choisi. Le motif de validation et le texte d'aide
    // viennent du serveur : un seul endroit à corriger si une administration
    // change son format.
    ...champsDuPays(form.organisationPays).map((c) => ({
      name: c.cle,
      label: c.libelle,
      icon: Building,
      required: false,
      aide: c.aide,
      motif: c.motif,
      ...(c.cle === 'siret' ? { maxLength: 14, inputMode: 'numeric' } : {}),
    })),

    { name: 'organisationTelephone', label: t('register.champs.organisationTelephone'), icon: Phone, required: false },
    { name: 'organisationEmail', label: t('register.champs.organisationEmail'), icon: Mail, type: 'email', required: false },
    { name: 'organisationAdresse', label: t('champs.adresse'), icon: Building, required: false },
    { name: 'organisationVille', label: t('register.champs.organisationVille'), icon: Building, required: false },
  ];

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-accent-bar" />
        <div className="auth-body">
          <div className="auth-logo">
            <div className="logo-icon"><ShieldCheck size={22} /></div>
            <div>
              <div className="auth-title">Suivie Chantier</div>
              <div className="auth-subtitle">{t('register.entete')}</div>
            </div>
          </div>

          <h1 className="auth-title-lg">{t('register.titre')}</h1>
          <p className="auth-subtitle">{t('register.intro')}</p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Section Utilisateur */}
            <fieldset style={{ marginBottom: 24, padding: '16px', border: '1px solid var(--border)', borderRadius: 10 }}>
              <legend style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', padding: '0 8px' }}>
                <User size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> {t('register.sectionUtilisateur')}
              </legend>
              <div className="grid-2">
                {userFields.map(({ name, label, icon: Icon, type = 'text', required }) => (
                  <div key={name} className="field" style={{ marginBottom: 0 }}>
                    <label>
                      {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                      <input
                        className={`input ${errors[name] ? 'invalid' : ''}`}
                        style={{ paddingLeft: 38 }}
                        type={type}
                        name={name}
                        value={form[name]}
                        onChange={handleChange}
                        placeholder={label}
                        required={required}
                        autoComplete={name === 'email' ? 'email' : name === 'telephone' ? 'tel' : 'off'}
                      />
                    </div>
                    {errors[name] && <div className="error">{errors[name]}</div>}
                  </div>
                ))}
              </div>

              <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
                <label>{t('champs.motDePasse')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    className={`input ${errors.mot_de_passe ? 'invalid' : ''}`}
                    style={{ paddingLeft: 38, paddingRight: 40 }}
                    type={showPassword ? 'text' : 'password'}
                    name="mot_de_passe"
                    value={form.mot_de_passe}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    style={{ position: 'absolute', right: 10, top: 9, background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4 }}
                    aria-label={showPassword ? t('commun.masquer') : t('commun.afficher')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.mot_de_passe && <div className="error">{errors.mot_de_passe}</div>}
              </div>

              <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
                <label>{t('register.champs.confirmerMotDePasse')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    className={`input ${errors.confirm_mot_de_passe ? 'invalid' : ''}`}
                    style={{ paddingLeft: 38, paddingRight: 40 }}
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_mot_de_passe"
                    value={form.confirm_mot_de_passe}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    style={{ position: 'absolute', right: 10, top: 9, background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4 }}
                    aria-label={showConfirmPassword ? t('commun.masquer') : t('commun.afficher')}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirm_mot_de_passe && <div className="error">{errors.confirm_mot_de_passe}</div>}
              </div>
            </fieldset>

            {/* Section Organisation */}
            <fieldset style={{ marginBottom: 24, padding: '16px', border: '1px solid var(--border)', borderRadius: 10 }}>
              <legend style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', padding: '0 8px' }}>
                <Building size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> {t('register.sectionOrganisation')}
              </legend>
              {/* ── Le PAYS d'abord ───────────────────────────────────────
                  Il décide des identifiants demandés juste après : le placer
                  plus bas obligeait à ressaisir, et laissait afficher des
                  champs sans rapport avec le pays. */}
              <div className="field" style={{ marginBottom: 16 }}>
                <label>
                  {t('register.champs.organisationPays')}{' '}
                  <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="input"
                  name="organisationPays"
                  value={form.organisationPays}
                  onChange={handleChange}
                  disabled={paysEnCours}
                >
                  <option value="">
                    {paysEnCours ? t('register.paysChargement') : t('register.paysChoisir')}
                  </option>
                  {pays.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.nom} — {p.champs.map((c) => c.libelle).join(' · ')}
                    </option>
                  ))}
                </select>
                {errors.organisationPays && <div className="error">{errors.organisationPays}</div>}
                {/* Sans catalogue, aucun pays n'est proposable : on le DIT,
                    plutôt que d'afficher une liste vide inexplicable. */}
                {paysErreur && <div className="error">{t('register.paysIndisponibles')}</div>}
              </div>

              <div className="grid-2">
                {orgFields.map(({ name, label, icon: Icon, type = 'text', required, maxLength, inputMode, aide }) => (
                  <div key={name} className="field" style={{ marginBottom: 0 }}>
                    <label>
                      {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={17} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                      <input
                        className={`input ${errors[name] ? 'invalid' : ''}`}
                        style={{ paddingLeft: 38 }}
                        type={type}
                        name={name}
                        value={form[name] ?? ''}
                        onChange={handleChange}
                        placeholder={label}
                        required={required}
                        maxLength={maxLength}
                        inputMode={inputMode}
                        autoComplete={name === 'organisationEmail' ? 'email' : 'off'}
                      />
                    </div>
                    {errors[name] && <div className="error">{errors[name]}</div>}
                    {!errors[name] && aide && (
                      <div className="hint" style={{ fontSize: 11.5 }}>{aide}</div>
                    )}
                  </div>
                ))}
              </div>
            </fieldset>

            {/* RGPD art. 7 — acceptation explicite, active et bloquante.
                Remplace la mention passive « en vous inscrivant vous acceptez… ». */}
            <div className="field" style={{ marginBottom: 16 }}>
              <label
                htmlFor="consentement"
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 400 }}
              >
                <input
                  id="consentement"
                  type="checkbox"
                  name="consentement"
                  checked={form.consentement}
                  onChange={handleChange}
                  required
                  aria-invalid={errors.consentement ? 'true' : 'false'}
                  aria-describedby={errors.consentement ? 'consentement-error' : undefined}
                  style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: 'var(--primary)' }}
                />
                <span>
                  <KeyRound size={13} style={{ verticalAlign: -1, marginRight: 4 }} />
                  {t('register.consentementAvant')}
                  <Link to="/condition-utilisation" target="_blank" rel="noopener noreferrer" className="auth-link">{t('register.cguLien')}</Link>
                  {t('register.consentementEntre')}
                  <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="auth-link">{t('register.confidentialiteLien')}</Link>
                  {t('register.consentementApres')}
                  <span style={{ color: 'var(--danger)' }}> *</span>
                </span>
              </label>
              {errors.consentement && <div className="error" id="consentement-error">{errors.consentement}</div>}
            </div>

            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading || !isFormValid} style={{ marginTop: 8 }}>
              {loading ? t('register.creationEnCours') : t('register.creerMonCompte')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: 24 }}>
            <span>{t('register.dejaCompte')}</span>
            <Link className="auth-link" to="/login" style={{ marginLeft: 8 }}>{t('register.seConnecter')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}