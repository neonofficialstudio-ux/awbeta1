
import React, { useCallback } from 'react';
import type { View, StoreTab } from '../types';
import { DashboardIcon, MissionIcon, StoreIcon, RankingIcon, SubscriptionIcon, AdminIcon, ProfileIcon, InventoryIcon, TicketIcon, StarIcon } from '../constants';
import { useAppContext } from '../constants';

// Logout Icon
const LogoutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);


interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = React.memo(({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
        flex items-center w-full px-4 py-3.5 text-sm font-medium transition-all duration-300 rounded-xl group relative overflow-hidden
        ${isActive
            ? 'bg-brand-gold text-black shadow-glow-gold translate-x-1'
            : 'text-text-secondary hover:bg-bg-surfaceLight hover:text-white hover:translate-x-1'
        }
    `}
  >
    <Icon 
        className={`
            w-5 h-5 mr-3 transition-colors duration-300
            ${isActive ? 'text-black' : 'text-text-muted group-hover:text-brand-gold'}
        `} 
    />
    <span className="font-semibold tracking-wide relative z-10">{label}</span>
    
    {/* Active Indicator Dot */}
    {isActive && (
        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-black opacity-70 animate-pulse"></div>
    )}
    
    {/* Hover Glow Effect */}
    {!isActive && (
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    )}
  </button>
));

const Sidebar: React.FC<SidebarProps> = React.memo(({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { state, dispatch } = useAppContext();
  const { currentView, isAdmin: adminAccess } = state;
  const isAdmin = adminAccess === true;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'missions', label: 'Missões', icon: MissionIcon },
    { id: 'store', label: 'Loja', icon: StoreIcon },
    { id: 'inventory', label: 'Inventário', icon: InventoryIcon },
    { id: 'ranking', label: 'Ranking', icon: RankingIcon },
    { id: 'achievements', label: 'Conquistas', icon: StarIcon },
    { id: 'raffles', label: 'Sorteios', icon: TicketIcon },
    { id: 'subscriptions', label: 'Assinaturas', icon: SubscriptionIcon },
    { id: 'profile', label: 'Perfil', icon: ProfileIcon },
  ];

  const adminNavItem = { id: 'admin', label: 'Admin Panel', icon: AdminIcon };

  // Safe Navigation with requestAnimationFrame
  const handleNavClick = useCallback((view: View) => {
    requestAnimationFrame(() => {
        if (view === 'store') {
          dispatch({ type: 'SET_STORE_TAB', payload: 'redeem' as StoreTab });
        } else {
          dispatch({ type: 'SET_VIEW', payload: view });
        }
        setIsMobileMenuOpen(false);
    });
  }, [dispatch, setIsMobileMenuOpen]);

  const handleLogoutClick = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
    setIsMobileMenuOpen(false);
  }, [dispatch, setIsMobileMenuOpen]);

  return (
    <aside 
        className={`
            fixed inset-y-0 left-0 z-[60] w-[80%] max-w-[300px] bg-bg-surface border-r border-border-base 
            flex flex-col transition-all duration-300 ease-out shadow-2xl
            md:static md:w-72 md:translate-x-0 md:opacity-100 md:z-auto
            ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}
        `}
    >
        <div className="px-6 pt-8 md:pt-8 pb-6 flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-brand-gold font-chakra tracking-wider text-shadow-glow hover:scale-105 transition-transform cursor-default">
                    ARTIST WORLD
                </h2>
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest mt-1 opacity-60">
                    Open Beta
                </p>
            </div>
            {/* Mobile Close Button - Inside Drawer */}
            <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-2 bg-bg-surfaceLight/50 rounded-full text-text-muted hover:text-white transition-colors border border-border-base"
            >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <nav className="flex-grow flex flex-col overflow-y-auto custom-scrollbar px-4 space-y-1 pb-4">
            {navItems.map((item) => (
                <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={currentView === item.id}
                    onClick={() => handleNavClick(item.id as View)}
                />
            ))}
            
            {isAdmin && (
                <>
                    <div className="my-4 border-t border-border-base mx-2 opacity-50"></div>
                    <NavItem
                        icon={adminNavItem.icon}
                        label={adminNavItem.label}
                        isActive={currentView === adminNavItem.id}
                        onClick={() => handleNavClick(adminNavItem.id as View)}
                    />
                </>
            )}
        </nav>
        
        <div className="p-4 mt-auto border-t border-border-base bg-bg-surfaceLight/30"> 
            <button
                onClick={handleLogoutClick}
                className="flex items-center w-full px-4 py-3 text-sm font-bold text-text-secondary rounded-lg hover:bg-brand-red/10 hover:text-brand-red transition-all group border border-transparent hover:border-brand-red/20 active:scale-95"
            >
                <LogoutIcon className="w-5 h-5 mr-3 text-brand-red opacity-70 group-hover:opacity-100 transition-opacity" />
                <span>Sair da Conta</span>
            </button>
        </div>
    </aside>
  );
});

export default Sidebar;
