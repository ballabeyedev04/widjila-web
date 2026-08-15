import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  HardHat,
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
  AlertCircle,
  Zap,
  CreditCard,
} from 'lucide-react';

import SwalCustom from '../utils/swal.config.js';
import { logout as authLogout } from '../service/auth/authService.js';
import { compterNonLues } from '../service/notification/notificationService.js';
import { useUser } from '../context/useUser.js';
import { useSubscription, getTrialDisplayInfo } from '../context/SubscriptionContext.jsx';
import { roleLabel, roleAllowed } from '../utils/constants.js';
import { initials } from '../utils/format.js';
import '../assets/css/layout.css';

const isAdmin = (user) => user?.role === 'Admin';

function MenuItem({ item, isActive, onClick, collapsed }) {
  return (
    <div className={`menu-item-wrapper ${collapsed ? 'collapsed' : ''}`}>
      <button className={`menu-item ${isActive ? 'active' : ''}`} onClick={() => onClick(item.path)}>
        <item.icon size={19} className="menu-icon" />
        {!collapsed && <span className="menu-label">{item.label}</span>}
      </button>
      {collapsed && <div className="menu-tooltip">{item.label}</div>}
    </div>
  );
}

function NavSection({ title, items, activePath, onNavigate, collapsed }) {
  return (
    <>
      {!collapsed && <div className="nav-group-label">{title}</div>}
      {items.map((item) => (
        <MenuItem
          key={item.path}
          item={item}
          isActive={activePath === item.path}
          onClick={onNavigate}
          collapsed={collapsed}
        />
      ))}
    </>
  );
}

export default function AdminLayout() {
  const { t } = useTranslation('layout');
  const { user, clearUser } = useUser();
  const { status: subStatus, isLoading: subLoading, refreshStatus } = useSubscription();
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
    { path: '/membres', label: t('nav.membres'), icon: Users, roles: ['Admin', 'ChefProjet', 'MaitreOuvrage'] },
    { path: '/equipes', label: t('nav.equipes'), icon: UserPlus, roles: ['Admin', 'ChefProjet', 'MaitreOuvrage'] },
    { path: '/partenaires', label: t('nav.partenaires'), icon: Handshake, roles: ['Admin', 'ChefProjet', 'ConducteurTravaux', 'MaitreOuvrage', 'MaitreOeuvre'] },
    { path: '/organisation', label: t('nav.organisation'), icon: Building2, roles: ['Admin', 'ChefProjet', 'MaitreOuvrage'] },
    { path: '/notifications', label: t('nav.notifications'), icon: Bell, roles: 'all' },
    { path: '/profil', label: t('nav.monProfil'), icon: UserRound, roles: 'all' },
  ];

  const plateformeMenu = [
    { path: '/plateforme', label: t('nav.vuePlateforme'), icon: ShieldCheck },
    { path: '/plateforme/utilisateurs', label: t('nav.utilisateurs'), icon: Users },
    { path: '/plateforme/organisations', label: t('nav.organisations'), icon: Building2 },
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

  const pageTitle = [...menuVisible, ...(admin ? plateformeMenu : [])].find(
    (m) => activePath.startsWith(m.path) && (m.path === '/dashboard' ? activePath === '/dashboard' : true)
  )?.label || t('topbar.titreParDefaut');

  return (
    <div className="dashboard">
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
          <NavSection title={t('sidebar.groupePilotage')} items={menuVisible} activePath={activePath} onNavigate={onNavigate} collapsed={collapsed && !isMobile} />
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
              <LogOut size={15} /> {t('deconnexion.titre')}
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
