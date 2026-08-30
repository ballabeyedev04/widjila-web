import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  HardHat,
  Wrench,
  ListOrdered,
  FileType,
  Contact,
  Users,
  UserPlus,
  Handshake,
  Building2,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ShieldCheck,
  FileSearch,
  UserRound,
  UserCheck,
  UserX,
  AlertTriangle,
  Map,
  AlertCircle,
  Zap,
  CreditCard,
} from 'lucide-react';

import SwalCustom from '../utils/swal.config.js';
import { logout as authLogout } from '../service/auth/authService.js';
import { compterNonLues } from '../service/notification/notificationService.js';
import { useUser } from '../context/useUser.js';
import { useSubscription, getTrialDisplayInfo } from '../context/SubscriptionContext.jsx';
import { roleLabel, roleAllowed, ROLES_GESTION, ROLES_GESTION_MEMBRES } from '../utils/constants.js';
import { initials } from '../utils/format.js';
import '../assets/css/layout.css';

const isAdmin = (user) => user?.role === 'Admin';

function MenuItem({ item, isActive, onClick, collapsed, badge = 0 }) {
  return (
    <div className={`menu-item-wrapper ${collapsed ? 'collapsed' : ''}`}>
      <button
        className={`menu-item ${isActive ? 'active' : ''}`}
        onClick={() => onClick(item.path)}
        aria-current={isActive ? 'page' : undefined}
      >
        <item.icon size={19} className="menu-icon" />
        {!collapsed && <span className="menu-label">{item.label}</span>}
        {badge > 0 && (
          <span className={`menu-badge ${collapsed ? 'point' : ''}`}>
            {collapsed ? '' : badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
      {collapsed && (
        <div className="menu-tooltip">
          {item.label}{badge > 0 ? ` (${badge})` : ''}
        </div>
      )}
    </div>
  );
}

/**
 * Une entrée est active si le chemin courant lui appartient.
 *
 * L'égalité stricte utilisée jusqu'ici éteignait le menu dès qu'on descendait
 * d'un niveau : ouvrir un chantier (`/chantiers/:id`) ou une réserve
 * n'éclairait plus rien, et l'utilisateur perdait sa position.
 *
 * Les chemins qui en préfixent d'autres sont traités à part : sans cela,
 * `/plateforme` resterait allumé sur `/plateforme/audit`, et les deux entrées
 * s'afficheraient actives en même temps.
 */
const EXACTS = ['/dashboard', '/plateforme'];

function estActif(cheminCourant, cheminMenu) {
  if (EXACTS.includes(cheminMenu)) return cheminCourant === cheminMenu;
  return cheminCourant === cheminMenu || cheminCourant.startsWith(`${cheminMenu}/`);
}

function NavSection({ title, items, activePath, onNavigate, collapsed, badges = {} }) {
  return (
    <div className="nav-groupe">
      {!collapsed && <div className="nav-group-label">{title}</div>}
      {items.map((item) => (
        <MenuItem
          key={item.path}
          item={item}
          isActive={estActif(activePath, item.path)}
          onClick={onNavigate}
          collapsed={collapsed}
          badge={badges[item.path] || 0}
        />
      ))}
    </div>
  );
}

export default function AdminLayout() {
  const { t } = useTranslation('layout');
  const { user, clearUser } = useUser();
  // Seul `status` est lu ici : le bandeau d'essai. Le chargement et le
  // rafraîchissement sont pilotés par le contexte lui-même.
  const { status: subStatus } = useSubscription();
  const trialInfo = getTrialDisplayInfo(subStatus);
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [nonLues, setNonLues] = useState(0);

  const activePath = location.pathname;

  const admin = isAdmin(user);

  /* ---------- Détection mobile ---------- */
  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIsMobile(window.innerWidth <= 900), 150);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /* ---------- Compteur de notifications ---------- */
  const refreshNonLues = useCallback(async () => {
    try {
      const count = await compterNonLues();
      setNonLues(Number(count) || 0);
    } catch {
      /* silencieux : le bell reste à 0 */
    }
  }, []);
  useEffect(() => { refreshNonLues(); }, [refreshNonLues]);

  /* ---------- Menu ---------- */
  // Chaque entrée liste les rôles autorisés ('all' = tous les utilisateurs).
  // Le menu est filtré selon le rôle connecté : chaque utilisateur ne voit
  // que son « portail » (aligné sur les groupes backend src/config/roles.js).
  const baseMenu = [
    { path: '/dashboard', label: t('nav.tableauDeBord'), icon: LayoutDashboard, roles: 'all' },
    { path: '/chantiers', label: t('nav.chantiers'), icon: HardHat, roles: 'all' },
    { path: '/reserves', label: t('nav.toutesReserves'), icon: AlertTriangle, roles: 'all' },
    { path: '/plans', label: t('nav.tousPlans'), icon: Map, roles: 'all' },
    { path: '/membres', label: t('nav.membres'), icon: Users, roles: ROLES_GESTION_MEMBRES },
    { path: '/equipes', label: t('nav.equipes'), icon: UserPlus, roles: ROLES_GESTION },
    { path: '/corps-etat', label: t('nav.corpsEtat'), icon: Wrench, roles: ROLES_GESTION },
    { path: '/phases', label: t('nav.phases'), icon: ListOrdered, roles: ROLES_GESTION },
    { path: '/types-document', label: t('nav.typesDocument'), icon: FileType, roles: ROLES_GESTION },
    { path: '/types-intervenant', label: t('nav.typesIntervenant'), icon: Contact, roles: ROLES_GESTION },
    { path: '/types-inspection', label: t('nav.typesInspection'), icon: ClipboardList, roles: ROLES_GESTION },
    { path: '/partenaires', label: t('nav.partenaires'), icon: Handshake, roles: ['Admin', 'ChefProjet', 'ConducteurTravaux', 'MaitreOuvrage', 'MaitreOeuvre'] },
    { path: '/organisation', label: t('nav.organisation'), icon: Building2, roles: ROLES_GESTION },
    { path: '/notifications', label: t('nav.notifications'), icon: Bell, roles: 'all' },
    { path: '/profil', label: t('nav.monProfil'), icon: UserRound, roles: 'all' },
  ];

  const plateformeMenu = [
    { path: '/plateforme', label: t('nav.vuePlateforme'), icon: ShieldCheck },
    { path: '/plateforme/utilisateurs', label: t('nav.utilisateurs'), icon: Users },
    { path: '/plateforme/organisations', label: t('nav.organisations'), icon: Building2 },
    { path: '/plateforme/demandes', label: t('nav.demandesInscription'), icon: UserCheck },
    { path: '/plateforme/suppressions', label: t('nav.demandesSuppression'), icon: UserX },
    { path: '/plateforme/prix-abonnements', label: t('nav.prixAbonnements'), icon: CreditCard },
    { path: '/plateforme/audit', label: t('nav.journalAudit'), icon: FileSearch },
  ];

  // Filtre le menu selon le rôle (l'Admin voit tout — roleAllowed passe toujours).
  const menuVisible = baseMenu.filter((item) =>
    item.roles === 'all' || roleAllowed(user?.role, item.roles)
  );

  const onNavigate = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    const result = await SwalCustom.confirm({ title: t('deconnexion.titre'),
      text: t('deconnexion.confirmation'),
      icon: 'question' });
    if (!result) return;
    try {
      await authLogout();
    } finally {
      clearUser();
      SwalCustom.success(t('deconnexion.succes'));
      navigate('/login', { replace: true });
    }
  };

  // Le plus SPÉCIFIQUE gagne : sans le tri, `/plateforme` l'emporterait sur
  // `/plateforme/audit` selon l'ordre de déclaration du menu.
  const pageTitle = [...menuVisible, ...(admin ? plateformeMenu : [])]
    .filter((m) => estActif(activePath, m.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.label
    || t('topbar.titreParDefaut');

  return (
    <div className="dashboard">
      {/* Premier élément tabulable de la page, invisible à la souris. Sans lui,
          un utilisateur au clavier retraverse tout le menu latéral à chaque
          changement d'écran avant d'atteindre le contenu. */}
      <a href="#contenu-principal" className="skip-link">{t('sidebar.allerAuContenu')}</a>
      {isMobile && mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      {isMobile && !mobileOpen && (
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label={t('sidebar.ouvrirMenu')}>
          <Menu size={20} />
        </button>
      )}

      <aside
        className={`sidebar ${collapsed && !isMobile ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${mobileOpen ? 'open' : ''}`}
      >
        <div className="sidebar-header">
          <div className="logo-area">
            <div className="logo-icon">
              <ClipboardList size={20} />
            </div>
            {(!collapsed || isMobile) && (
              <div>
                <div className="logo-text">Suivie Chantier</div>
                <div className="logo-sub">{t('sidebar.espaceAdmin')}</div>
              </div>
            )}
          </div>
          {isMobile && (
            <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label={t('actions.fermer')}>
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <NavSection
            title={t('sidebar.groupePilotage')}
            items={menuVisible}
            activePath={activePath}
            onNavigate={onNavigate}
            collapsed={collapsed && !isMobile}
            /* Le compteur n'existait que sur la cloche de la barre du haut :
               invisible dès qu'on avait déroulé une page longue. */
            badges={{ '/notifications': nonLues }}
          />
          {admin && (
            <NavSection title={t('sidebar.groupePlateforme')} items={plateformeMenu} activePath={activePath} onNavigate={onNavigate} collapsed={collapsed && !isMobile} />
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{user?.photoProfil ? <img src={user.photoProfil} alt="" /> : initials(user?.nom, user?.prenom)}</div>
            {(!collapsed || isMobile) && (
              <div style={{ overflow: 'hidden' }}>
                <div className="user-name">{user?.prenom} {user?.nom}</div>
                <div className="user-role">{roleLabel(user?.role)}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {!isMobile && (
        <button
          className={`sidebar-toggle-btn ${collapsed ? 'collapsed' : ''}`}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={t('sidebar.basculerMenu')}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}

      <div className="main-col">
        <header className="topbar">
          <h1 className="topbar-title">{pageTitle}</h1>
          <div className="topbar-right">
            {/* Badge d'abonnement / trial */}
            {trialInfo && trialInfo.type !== 'unknown' && (
              <div className="topbar-subscription">
                {trialInfo.type === 'subscribed' && (
                  <span className="badge badge-success" title={t('topbar.abonnementActif')}>
                    <CreditCard size={12} /> {trialInfo.plan || t('topbar.planActif')}
                  </span>
                )}
                {trialInfo.type === 'trial' && (
                  <span className="badge badge-warning" title={t('topbar.essaiRestant', { count: trialInfo.jours })}>
                    <Zap size={12} /> {t('topbar.essaiCourt', { jours: trialInfo.jours })}
                  </span>
                )}
                {trialInfo.type === 'expired' && (
                  <button className="badge badge-danger" onClick={() => navigate('/abonnement')} title={t('topbar.essaiExpireTitre')}>
                    <AlertCircle size={12} /> {t('topbar.essaiExpire')}
                  </button>
                )}
              </div>
            )}

            <button className="bell-btn" onClick={() => navigate('/notifications')} aria-label={t('topbar.notifications')}>
              <Bell size={18} />
              {nonLues > 0 && <span className="bell-badge">{nonLues > 99 ? '99+' : nonLues}</span>}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              <LogOut size={15} /> <span className="btn-label-responsive">{t('deconnexion.titre')}</span>
            </button>
          </div>
        </header>

        {/* Région principale nommée : `aria-live="polite"` fait annoncer le
            changement d'écran, qui n'était signalé par rien pour une synthèse
            vocale — la navigation dans une application à page unique ne
            recharge pas le document. */}
        <main className="content" id="contenu-principal" tabIndex={-1} aria-live="polite">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
