import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Building, Phone, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

import { register, validatePassword, validateIdentifiant } from '../../service/auth/authService.js';
import { getErrorMessage } from '../../service/helpers.js';
import { useUser } from '../../context/useUser.js';
import '../../assets/css/auth.css';
import SwalCustom from '../../utils/swal.config.js';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { setUser } = useUser();

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

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    switch (name) {
      case 'nom':
        if (!value.trim()) newErrors.nom = t('register.validation.nomRequis');
        break;
      case 'prenom':
        if (!value.trim()) newErrors.prenom = t('register.validation.prenomRequis');
        break;
      case 'email':
        if (!value.trim()) newErrors.email = t('register.validation.emailRequis');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = t('validation.emailInvalide');
        break;
      case 'telephone':
        if (value && !/^\+?[0-9\s-]{7,20}$/.test(value)) newErrors.telephone = t('register.validation.telephoneInvalide');
        break;
      case 'mot_de_passe':
        if (!value) newErrors.mot_de_passe = t('register.validation.motDePasseRequis');
        else if (!validatePassword(value)) newErrors.mot_de_passe = t('register.validation.motDePasseFormat');
        break;
      case 'confirm_mot_de_passe':
        if (!value) newErrors.confirm_mot_de_passe = t('register.validation.confirmationRequise');
        else if (value !== form.mot_de_passe) newErrors.confirm_mot_de_passe = t('validation.motsDePasseDifferents');
        break;
      case 'organisationNom':
        if (!value.trim()) newErrors.organisationNom = t('register.validation.organisationRequise');
        break;
      case 'siret':
        if (value && !/^\d{14}$/.test(value.replace(/\s/g, ''))) newErrors.siret = t('register.validation.siretInvalide');
        break;
      // Acceptation des CGU / politique de confidentialité : seul champ dont
      // l'erreur est retirée dès qu'il redevient valide, pour que le message
      // disparaisse au moment où l'utilisateur coche la case.
      case 'consentement':
        if (!value) newErrors.consentement = t('register.validation.consentementRequis');
        else delete newErrors.consentement;
        break;
    }
    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const valeur = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: valeur }));
    validateField(name, valeur);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Consentement obligatoire (RGPD art. 7) — contrôlé AVANT tout le reste et
    // directement sur `form` : `errors` est un état React encore périmé à cet
    // instant, s'appuyer dessus laisserait passer une soumission non consentie.
    if (!form.consentement) {
      setErrors((prev) => ({ ...prev, consentement: t('register.validation.consentementRequis') }));
      return;
    }

    // Validation finale
    const newErrors = {};
    Object.keys(form).forEach((key) => validateField(key, form[key]));
    if (Object.keys(errors).length > 0) return;

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
    { name: 'siret', label: t('register.champs.siret'), icon: Building, required: false },
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {orgFields.map(({ name, label, icon: Icon, type = 'text', required }) => (
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
                        autoComplete={name === 'organisationEmail' ? 'email' : 'off'}
                      />
                    </div>
                    {errors[name] && <div className="error">{errors[name]}</div>}
                  </div>
                ))}
              </div>
            </fieldset>

            {/* RGPD art. 7 — acceptation explicite, active et bloquante.
                Remplace la mention passive « en vous inscrivant vous acceptez… ».
                Les deux liens pointent encore sur « # » : les pages Conditions
                d'utilisation et Politique de confidentialité RESTENT À ÉCRIRE
                (contenu juridique + routes), hors périmètre de ce correctif. */}
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
                  <Link to="#" className="auth-link">{t('register.cguLien')}</Link>
                  {t('register.consentementEntre')}
                  <Link to="#" className="auth-link">{t('register.confidentialiteLien')}</Link>
                  {t('register.consentementApres')}
                  <span style={{ color: 'var(--danger)' }}> *</span>
                </span>
              </label>
              {errors.consentement && <div className="error" id="consentement-error">{errors.consentement}</div>}
            </div>

            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
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