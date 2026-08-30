import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Building, Phone, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

import { register, validatePassword } from '../../service/auth/authService.js';
import { getErrorMessage } from '../../service/helpers.js';
import '../../assets/css/auth.css';
import SwalCustom from '../../utils/swal.config.js';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

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
    siret: '',
    rccm: '',
    ninea: '',
    organisationTelephone: '',
    organisationEmail: '',
    organisationAdresse: '',
    organisationVille: '',
    organisationPays: 'France',
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
      case 'siret':
        return value && !/^\d{14}$/.test(value) ? t('register.validation.siretInvalide') : undefined;
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

  const orgFields = [
    { name: 'organisationNom', label: t('register.champs.organisationNom'), icon: Building, required: true },
    { name: 'raison_sociale', label: t('register.champs.raisonSociale'), icon: Building, required: false },
    { name: 'siret', label: t('register.champs.siret'), icon: Building, required: false, maxLength: 14, inputMode: 'numeric' },
    { name: 'rccm', label: t('register.champs.rccm'), icon: Building, required: false },
    { name: 'ninea', label: t('register.champs.ninea'), icon: Building, required: false },
    { name: 'organisationTelephone', label: t('register.champs.organisationTelephone'), icon: Phone, required: false },
    { name: 'organisationEmail', label: t('register.champs.organisationEmail'), icon: Mail, type: 'email', required: false },
    { name: 'organisationAdresse', label: t('champs.adresse'), icon: Building, required: false },
    { name: 'organisationVille', label: t('register.champs.organisationVille'), icon: Building, required: false },
    { name: 'organisationPays', label: t('register.champs.organisationPays'), icon: Building, required: false },
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
              <div className="grid-2">
                {orgFields.map(({ name, label, icon: Icon, type = 'text', required, maxLength, inputMode }) => (
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
                        maxLength={maxLength}
                        inputMode={inputMode}
                        autoComplete={name === 'organisationEmail' ? 'email' : 'off'}
                      />
                    </div>
                    {errors[name] && <div className="error">{errors[name]}</div>}
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