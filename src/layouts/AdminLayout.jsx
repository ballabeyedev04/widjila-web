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
  ClipboardCheck,
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
  UploadCloud,
  PlusCircle,
  BarChart3,
  FolderOpen,
  WifiOff,
} from 'lucide-react';

import SwalCustom from '../utils/swal.config.js';
import SelecteurChantierModal from '../components/SelecteurChantierModal.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { logout as authLogout } from '../service/auth/authService.js';
import { compterNonLues } from '../service/notification/notificationService.js';
// Les deux files d'attente du super-admin — voir `refreshFilesAttente`.
import {
  compterDemandesEnAttente,
  compterSuppressionsEnAttente,
} from '../service/admin/adminService.js';
import { useUser } from '../context/useUser.js';
import { useEtatReseau } from '../hooks/useEtatReseau.js';
import { useSubscription, getTrialDisplayInfo } from '../context/SubscriptionContext.jsx';
import { roleLabel, roleAllowed, peutGerer, ROLES_GESTION, ROLES_GESTION_MEMBRES, ROLES_PARTENAIRES, ROLES_DEPOSANT, ROLES_RESERVE_INTERVENANTS, ROLES_OPERATIONNELS_CONTROLE } from '../utils/constants.js';
import { initials } from '../utils/format.js';
import '../assets/css/layout.css';

const isAdmin = (user) => user?.role === 'Admin';

function MenuItem({ item, isActive, onClick, collapsed, badge = 0 }) {
  return (
    <div className={`menu-item-wrapper ${collapsed ? 'collapsed' : ''}`}>
      <button
        className={`menu-item ${isActive ? 'active' : ''}`}
        onClick={() => onClick(item)}
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
  // Le réseau, annoncé plutôt que subi — voir `useEtatReseau`.
  const enLigne = useEtatReseau();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [nonLues, setNonLues] = useState(0);
  // Les deux files d'attente du super-admin. `null` tant qu'on ne sait pas :
  // afficher 0 avant la réponse annoncerait « rien à faire » à quelqu'un qui a
  // peut-être dix demandes en attente.
  const [aTraiter, setATraiter] = useState({ inscriptions: 0, suppressions: 0 });
  /**
   * Sélecteur de chantier — `null` quand il est fermé, sinon l'action en cours.
   *
   * Trois entrées le partagent : « Nouvelle réserve » de la barre du haut, et
   * les deux raccourcis du menu qui exigent un chantier (tableau de bord,
   * documents). C'est le même mécanisme que le menu « Plus » du mobile, où
   * toutes les destinations rattachées à un chantier passent par la même
   * feuille de sélection.
   *
   * L'objet porte le titre à afficher et la destination à construire une fois
   * le chantier choisi : `{ titre, versChantier }`.
   */
  const [choixChantier, setChoixChantier] = useState(null);

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

  /* ---------- Files d'attente du super-admin ---------- */
  //
  // Deux compteurs, chargés ENSEMBLE et indépendamment l'un de l'autre : la
  // panne de l'un ne doit pas masquer l'autre. Un échec laisse simplement la
  // pastille à zéro — mieux vaut une pastille absente qu'un menu qui refuse de
  // s'afficher parce qu'un compteur n'a pas répondu.
  //
  // Seulement pour le super-admin : ces deux endpoints lui sont réservés
  // (`requireRole('Admin')`), et les appeler pour un autre rôle produirait un
  // 403 à chaque ouverture de page.
  const refreshFilesAttente = useCallback(async () => {
    if (!admin) return;
    const [inscriptions, suppressions] = await Promise.all([
      compterDemandesEnAttente().catch(() => 0),
      compterSuppressionsEnAttente().catch(() => 0),
    ]);
    setATraiter({
      inscriptions: Number(inscriptions) || 0,
      suppressions: Number(suppressions) || 0,
    });
  }, [admin]);
  useEffect(() => { refreshFilesAttente(); }, [refreshFilesAttente]);

  /* ---------- Menu ---------- */
  // Chaque entrée liste les rôles autorisés ('all' = tous les utilisateurs).
  // Le menu est filtré selon le rôle connecté : chaque utilisateur ne voit
  // que son « portail » (aligné sur les groupes backend src/config/roles.js).
  const baseMenu = [
    { path: '/dashboard', label: t('nav.tableauDeBord'), icon: LayoutDashboard, roles: 'all' },
    { path: '/chantiers', label: t('nav.chantiers'), icon: HardHat, roles: 'all' },
    { path: '/chantiers/demandes', label: t('nav.demandesChantier'), icon: ClipboardCheck, roles: 'all' },
    // Dépôt guidé des plans — le parcours de l'entreprise, identique au
    // mobile. Réservé à DEPOSANT : un client ou un sous-traitant y arriverait
    // pour finir sur un 403 au premier envoi.
    { path: '/depot-plans', label: t('nav.depotPlans'), icon: UploadCloud, roles: ROLES_DEPOSANT },
    { path: '/reserves', label: t('nav.toutesReserves'), icon: AlertTriangle, roles: 'all' },
    { path: '/plans', label: t('nav.tousPlans'), icon: Map, roles: 'all' },
    // ── Les deux raccourcis qui EXIGENT un chantier ──────────────────────
    //
    // Ils n'ont pas de route à eux : ils ouvrent le sélecteur, puis mènent à
    // l'onglet correspondant du chantier choisi. C'est exactement le menu
    // « Plus » du mobile, où « Tableau de bord chantier » et « Documents »
    // passent par la même feuille de sélection.
    //
    // Sans eux, atteindre les documents d'un chantier demandait quatre écrans :
    // la liste, la fiche, la barre d'onglets, l'onglet. Le mobile le fait en
    // deux, et c'est la même donnée.
    //
    // `path` ne sert ici que de clé de liste : aucune route ne lui correspond,
    // et `estActif` ne peut donc jamais l'allumer — ce sont des actions, pas
    // des destinations.
    {
      path: '#tableau-de-bord-chantier',
      label: t('nav.tableauBordChantier'),
      icon: BarChart3,
      roles: 'all',
      versChantier: (id) => `/chantiers/${id}`,
    },
    {
      path: '#documents-chantier',
      label: t('nav.documents'),
      icon: FolderOpen,
      // OPERATIONNEL_CONTROLE, comme le serveur (`document.route.js`) et comme
      // le mobile : proposer l'entrée aux autres les mènerait à un 403.
      roles: ROLES_OPERATIONNELS_CONTROLE,
      versChantier: (id) => `/chantiers/${id}?tab=documents`,
    },
    { path: '/membres', label: t('nav.membres'), icon: Users, roles: ROLES_GESTION_MEMBRES },
    { path: '/equipes', label: t('nav.equipes'), icon: UserPlus, roles: ROLES_GESTION },
    { path: '/corps-etat', label: t('nav.corpsEtat'), icon: Wrench, roles: ROLES_GESTION },
    { path: '/phases', label: t('nav.phases'), icon: ListOrdered, roles: ROLES_GESTION },
    { path: '/types-document', label: t('nav.typesDocument'), icon: FileType, roles: ROLES_GESTION },
    { path: '/types-intervenant', label: t('nav.typesIntervenant'), icon: Contact, roles: ROLES_GESTION },
    { path: '/types-inspection', label: t('nav.typesInspection'), icon: ClipboardList, roles: ROLES_GESTION },
    { path: '/partenaires', label: t('nav.partenaires'), icon: Handshake, roles: ROLES_PARTENAIRES },
    { path: '/organisation', label: t('nav.organisation'), icon: Building2, roles: ROLES_GESTION },
    // Abonnement — ouvert à TOUS les rôles, sans garde, exactement comme le
    // menu « Plus » du mobile.
    //
    // Chacun a un intérêt légitime à voir la formule en cours et ce qu'il reste
    // de quota : c'est ce qui explique un refus de créer un chantier. Seule la
    // FACTURATION est réservée, et l'écran masque cette section de lui-même
    // selon le rôle plutôt que de se rendre inaccessible en entier.
    //
    // La page vit HORS de la coquille (route publique : un visiteur doit
    // pouvoir consulter les offres avant de s'inscrire). C'est déjà là que mène
    // le badge « essai expiré » de la barre du haut — le menu ne fait qu'offrir
    // le même chemin sans attendre l'expiration.
    { path: '/abonnement', label: t('nav.abonnement'), icon: CreditCard, roles: 'all' },
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

  // ── Ce que voit le SUPER-ADMIN plateforme ────────────────────────────────
  //
  // `roleAllowed` renvoie `true` pour 'Admin' sur n'importe quelle entrée : il
  // voyait donc l'intégralité du menu métier — y compris membres, équipes,
  // partenaires, organisation et référentiels, qui relèvent d'une entreprise
  // cliente et dont il n'a pas l'usage.
  //
  // Le filtre est une liste EXPLICITE, et non plus « seulement ses écrans
  // personnels » : cette première version retirait aussi les demandes de
  // chantier, les chantiers, les réserves et les plans, alors que ce sont
  // précisément les écrans de son métier — trancher les demandes et
  // surveiller ce qui se passe sur la plateforme.
  //
  // Ces quatre écrans-là fonctionnent bien pour lui, contrairement à ce que
  // supposait la version précédente : leurs contrôleurs traitent le cas du
  // super-admin (`estSuperAdmin`) et lui renvoient TOUTES les organisations,
  // pas une organisation vide. Voir chantier.controller.js#listerChantiers.
  //
  // Ce qu'il y voit reste en LECTURE : les boutons de création et de
  // modification lui sont retirés par `peutGerer` (utils/constants.js).
  const MENU_ADMIN = [
    '/chantiers',            // supervision du parc, toutes organisations
    '/chantiers/demandes',   // sa file d'attente : valider ou refuser
    '/reserves',             // supervision
    '/plans',                // supervision
    '/notifications',        // ne relève d'aucune organisation
    '/profil',               // mot de passe, double authentification
  ];

  const menuVisible = admin
    ? baseMenu.filter((item) => MENU_ADMIN.includes(item.path))
    : baseMenu.filter(
        (item) => item.roles === 'all' || roleAllowed(user?.role, item.roles)
      );

  const onNavigate = (item) => {
    setMobileOpen(false);
    // Une entrée qui exige un chantier ouvre le sélecteur au lieu de naviguer.
    if (item.versChantier) {
      setChoixChantier({ titre: item.label, versChantier: item.versChantier });
      return;
    }
    navigate(item.path);
  };

  /* ---------- Relever une réserve, depuis n'importe quel écran ---------- */
  //
  // C'est le bouton « + » central de la barre du mobile, porté au web : de loin
  // le geste le plus fréquent sur un chantier, et le seul qui méritait d'être
  // atteignable sans passer par la liste des chantiers puis l'onglet Plans.
  //
  // Le parcours est le MÊME que sur mobile — chantier, puis explorateur de
  // plans, puis un clic à l'endroit du défaut. On ne saute pas le plan : une
  // réserve se situe, et « fissure » sans dire où n'aide personne. Le plan
  // porte déjà sa place dans le chantier, le serveur en déduit bâtiment, étage
  // et zone (`reserve.service.js#_heriterLocalisationDuPlan`).
  //
  // Réservé à RESERVE_INTERVENANTS, le groupe que garde le serveur : le
  // proposer aux autres les mènerait jusqu'au plan pour finir sur un 403.
  const peutReleverReserve = peutGerer(user?.role, ROLES_RESERVE_INTERVENANTS);

  /**
   * Conduit à la destination de l'action en cours, le chantier étant choisi.
   *
   * Le nom suit en query : les écrans d'arrivée n'ont pas le chantier chargé,
   * et un titre sec ferait perdre le contexte juste après le sélecteur. Le
   * séparateur suit ce que la destination porte déjà.
   */
  const ouvrirSurChantier = (chantier) => {
    const action = choixChantier;
    setChoixChantier(null);
    if (!action) return;
    const destination = action.versChantier(chantier.id);
    const separateur = destination.includes('?') ? '&' : '?';
    navigate(`${destination}${separateur}nom=${encodeURIComponent(chantier.nom || '')}`);
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
      // Rechargement COMPLET plutôt que `navigate` — CORRECTIF (audit
      // sécurité, données après déconnexion). Une navigation interne garde
      // en mémoire tout ce que les modules ont mis en cache pour la session :
      // phases et corps d'état de l'organisation, vignettes de plans, état
      // d'abonnement… La personne suivante qui se connectait dans le même
      // onglet voyait d'abord les référentiels de l'organisation précédente.
      // `replace` : la page de l'ancienne session ne reste pas dans
      // l'historique, « précédent » n'y ramène pas.
      window.location.replace('/login');
    }
  };

  // Le plus SPÉCIFIQUE gagne : sans le tri, `/plateforme` l'emporterait sur
  // `/plateforme/audit` selon l'ordre de déclaration du menu.
  // Les entrées-actions (`versChantier`) sont écartées : leur `path` est une
  // clé de liste, pas une route, et elles ne titrent donc aucun écran.
  const pageTitle = [...menuVisible, ...(admin ? plateformeMenu : [])]
    .filter((m) => !m.versChantier && estActif(activePath, m.path))
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
            <NavSection
              title={t('sidebar.groupePlateforme')}
              items={plateformeMenu}
              activePath={activePath}
              onNavigate={onNavigate}
              collapsed={collapsed && !isMobile}
              /* Les deux files d'attente du super-admin, annoncées dans le
                 menu. Sans elles, il fallait ouvrir chaque page pour savoir
                 s'il y avait du travail — or les demandes d'inscription
                 bloquent des comptes, et les demandes de suppression ont un
                 délai légal. */
              badges={{
                '/plateforme/demandes': aTraiter.inscriptions,
                '/plateforme/suppressions': aTraiter.suppressions,
              }}
            />
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

            {peutReleverReserve && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setChoixChantier({
                  titre: t('topbar.nouvelleReserve'),
                  versChantier: (id) => `/chantiers/${id}/plans/explorer`,
                })}
              >
                <PlusCircle size={15} />
                <span className="btn-label-responsive">{t('topbar.nouvelleReserve')}</span>
              </button>
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

        {/* ── Réseau coupé ──
            Une coupure produisait exactement la même alerte rouge qu'une panne
            serveur, alors que les deux appellent des gestes opposés : l'une se
            règle en attendant, l'autre en prévenant le support. Le cas est le
            quotidien du produit — un conducteur de travaux en 3G, sous un
            bâtiment en béton.

            `role="status"` et non `alert` : c'est un état qui dure, pas un
            événement ponctuel ; `alert` interromprait la lecture en cours à
            chaque bascule du réseau. */}
        {!enLigne && (
          <div className="bandeau-hors-ligne" role="status" aria-live="polite">
            <WifiOff size={16} aria-hidden="true" />
            <span>
              <strong>{t('reseau.horsLigneTitre')}</strong> {t('reseau.horsLigneTexte')}
            </span>
          </div>
        )}

        {/* Région principale nommée : `aria-live="polite"` fait annoncer le
            changement d'écran, qui n'était signalé par rien pour une synthèse
            vocale — la navigation dans une application à page unique ne
            recharge pas le document. */}
        <main className="content" id="contenu-principal" tabIndex={-1} aria-live="polite">
          {/* Une page qui plante ne fait plus tomber le menu : l'erreur reste
              dans la zone de contenu, et changer de page l'efface. */}
          <ErrorBoundary compact resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Monté par la COQUILLE et non par un écran : le bouton qui l'ouvre vit
          dans la barre du haut, présente sur toutes les pages. */}
      {choixChantier && (
        <SelecteurChantierModal
          open
          onClose={() => setChoixChantier(null)}
          titre={choixChantier.titre}
          onChoisir={ouvrirSurChantier}
          actionVide={roleAllowed(user?.role, ROLES_DEPOSANT) ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setChoixChantier(null); navigate('/depot-plans'); }}
            >
              <UploadCloud size={14} /> {t('nav.depotPlans')}
            </button>
          ) : undefined}
        />
      )}
    </div>
  );
}
