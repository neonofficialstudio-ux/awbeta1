
import React, { useRef, useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Notifications from '../components/Notifications';
import ToastSystem from '../components/ToastSystem';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { isSupabaseProvider } from '../api/core/backendGuard';
import type { User, StoreItem, UsableItem, InventoryTab } from '../types';
import { usePageTitle } from '../components/ui/hooks/usePageTitle';
import { useScrollRestoration } from '../components/ui/hooks/useScrollRestoration';
import NotFoundState from '../components/ui/feedback/NotFoundState';
import PageSkeleton from '../components/ui/feedback/PageSkeleton';
import { readUrlState, writeUrlState, getStableUrlKey } from './urlState';

// Modals
import RedemptionSuccessModal from '../components/RedemptionSuccessModal';
import WelcomeModal from '../components/WelcomeModal';
import LevelUpModal from '../components/LevelUpModal';
import RewardClaimedModal from '../components/RewardClaimedModal';
import ArtistOfTheDayModal from '../components/ArtistOfTheDayModal';
import AdminUserHistoryModal from '../components/admin/AdminUserHistoryModal';
import SubscriptionSuccessModal from '../components/SubscriptionSuccessModal';
import RaffleWinnerModal from '../components/RaffleWinnerModal';
import AdminNotificationModal from '../components/AdminNotificationModal';
import AchievementUnlockedModal from '../components/AchievementUnlockedModal';

// Lazy Load Views
const Dashboard = React.lazy(() => import('../components/Dashboard'));
const Missions = React.lazy(() => import('../components/Missions'));
const Store = React.lazy(() => import('../components/Store'));
const Inventory = React.lazy(() => import('../components/Inventory'));
const Ranking = React.lazy(() => import('../components/Ranking'));
const Achievements = React.lazy(() => import('../components/Achievements'));
const Raffles = React.lazy(() => import('../components/Raffles'));
const Subscriptions = React.lazy(() => import('../components/Subscriptions'));
const Profile = React.lazy(() => import('../components/Profile'));
const AdminPanel = React.lazy(() => import('../components/admin/AdminPanel'));

const MenuIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const MainLayout: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { currentView, activeUser, isAdmin, showWelcomeModal, adminActiveTab, adminMissionsInitialSubTab, adminStoreInitialSubTab, adminQueuesInitialSubTab, adminSettingsInitialSubTab, adminUsersInitialSubTab, adminSubscriptionsInitialSubTab, adminEconomyInitialSubTab, unseenAdminNotifications } = state;
    const mainContentRef = useRef<HTMLElement>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Dynamic Title
    const viewTitles: Record<string, string> = {
        'dashboard': 'Dashboard',
        'missions': 'Missões',
        'store': 'Loja',
        'inventory': 'Inventário',
        'ranking': 'Ranking',
        'achievements': 'Conquistas',
        'raffles': 'Sorteios',
        'subscriptions': 'Assinaturas',
        'profile': 'Perfil',
        'admin': 'Admin'
    };
    usePageTitle(viewTitles[currentView] || 'Portal');

    // Local Modal States
    const [redemptionSuccessInfo, setRedemptionSuccessInfo] = useState<{ item: StoreItem | UsableItem; updatedUser: User } | null>(null);
    const [levelUpInfo, setLevelUpInfo] = useState<{ newLevel: number } | null>(null);
    const [rewardModalInfo, setRewardModalInfo] = useState<{ artistName: string; linkType: 'spotify' | 'youtube'; updatedUser: User } | null>(null);
    const [showArtistOfTheDayModal, setShowArtistOfTheDayModal] = useState(false);
    const [artistOfTheDayAnnouncementId, setArtistOfTheDayAnnouncementId] = useState<string | null>(null);
    const [viewingUserHistory, setViewingUserHistory] = useState<User | null>(null);
    const [historyData, setHistoryData] = useState<any>(null);
    const [subscriptionUpgradeInfo, setSubscriptionUpgradeInfo] = useState<{ newPlan: string } | null>(null);
    const [raffleWinInfo, setRaffleWinInfo] = useState<{ itemName: string; itemImageUrl: string } | null>(null);
    const [currentAdminNotification, setCurrentAdminNotification] = useState<any | null>(null);
    const [unseenAchievementId, setUnseenAchievementId] = useState<string | null>(null);

    const getAdminScrollSubKey = () => {
        // Usa apenas o subtab relevante para a aba ativa do Admin.
        // Isso evita que o scrollKey mude quando subtabs de outras seções mudam.
        switch (adminActiveTab) {
            case 'missions':
                return adminMissionsInitialSubTab || '';
            case 'store':
                return adminStoreInitialSubTab || '';
            case 'queues':
                return adminQueuesInitialSubTab || '';
            case 'settings':
                return adminSettingsInitialSubTab || '';
            case 'economy_console':
                // Se você tiver adminEconomyInitialSubTab no estado global,
                // pode trocar aqui para ele. Se não tiver, deixa vazio.
                return '';
            case 'subscriptions':
                // Se existir adminSubscriptionsInitialSubTab no estado global, use.
                // Por enquanto, vazio para manter chave estável.
                return '';
            case 'users':
                // Se existir adminUsersInitialSubTab no estado global, use.
                return '';
            default:
                return '';
        }
    };

    const scrollKey =
        currentView === 'admin'
            ? `admin:${adminActiveTab}:${getAdminScrollSubKey()}`
            : `view:${currentView}`;

    useScrollRestoration({
        getEl: () => mainContentRef.current,
        key: scrollKey,
    });

    // URL <-> Store Sync
    const lastAppliedUrlKeyRef = useRef<string>('');
    const isApplyingUrlRef = useRef(false);

    useEffect(() => {
        const applyFromUrl = () => {
            try {
                const urlKey = getStableUrlKey();
                if (urlKey === lastAppliedUrlKeyRef.current) return;
                lastAppliedUrlKeyRef.current = urlKey;

                const urlState = readUrlState();
                if (!urlState.view) return;

                isApplyingUrlRef.current = true;

                if (urlState.view !== currentView) {
                    dispatch({ type: 'SET_VIEW', payload: urlState.view });
                }

                if (urlState.view === 'admin' && urlState.adminTab) {
                    dispatch({
                        type: 'SET_ADMIN_TAB',
                        payload: { tab: urlState.adminTab, subTab: urlState.adminSubTab || undefined },
                    });
                }
            } finally {
                setTimeout(() => {
                    isApplyingUrlRef.current = false;
                }, 0);
            }
        };

        applyFromUrl();

        const onPopState = () => applyFromUrl();
        window.addEventListener('popstate', onPopState);

        return () => window.removeEventListener('popstate', onPopState);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isApplyingUrlRef.current) return;

        const next = {
            view: currentView,
            adminTab: currentView === 'admin' ? adminActiveTab : undefined,
            adminSubTab:
                currentView === 'admin'
                    ? (adminActiveTab === 'missions'
                        ? adminMissionsInitialSubTab
                        : adminActiveTab === 'store'
                            ? adminStoreInitialSubTab
                            : adminActiveTab === 'settings'
                                ? adminSettingsInitialSubTab
                                : adminActiveTab === 'queues'
                                    ? adminQueuesInitialSubTab
                                    : adminActiveTab === 'users'
                                        ? adminUsersInitialSubTab
                                        : adminActiveTab === 'subscriptions'
                                            ? adminSubscriptionsInitialSubTab
                                            : adminActiveTab === 'economy_console'
                                                ? adminEconomyInitialSubTab
                                                : undefined)
                    : undefined,
        };

        writeUrlState(next, { replace: true });
        lastAppliedUrlKeyRef.current = getStableUrlKey();
    }, [
        currentView,
        adminActiveTab,
        adminMissionsInitialSubTab,
        adminStoreInitialSubTab,
        adminQueuesInitialSubTab,
        adminSettingsInitialSubTab,
        adminUsersInitialSubTab,
        adminSubscriptionsInitialSubTab,
        adminEconomyInitialSubTab,
    ]);

    // Mobile menu lock
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => document.body.classList.remove('modal-open');
    }, [isMobileMenuOpen]);

    const handleAccessDenied = useCallback(() => {
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
        dispatch({ 
            type: 'ADD_TOAST', 
            payload: { 
                id: `admin-denied-${Date.now()}`, 
                type: 'error', 
                title: 'Acesso negado', 
                message: 'Você não tem permissão para acessar esta área.' 
            } 
        });
    }, [dispatch]);

    useEffect(() => {
        if (currentView === 'admin' && isAdmin === false) {
            handleAccessDenied();
        }
    }, [currentView, isAdmin, handleAccessDenied]);

    // Level Up, Notification & Achievement Watchers
    const prevLevelRef = useRef<number | undefined>(undefined);
    useEffect(() => {
        if (!activeUser) return;

        const key = `aw_levelup_seen_${activeUser.id}`;
        const seenLevel = Number(localStorage.getItem(key) || 0);

        // primeira hidratação: trava o ref
        if (prevLevelRef.current === undefined) {
            prevLevelRef.current = activeUser.level;
        }

        // só mostra se esse level ainda não foi exibido
        if (activeUser.level > seenLevel) {
            // marca como visto imediatamente (evita repetir em reload)
            localStorage.setItem(key, String(activeUser.level));

            // opcional: só disparar quando realmente subiu durante a sessão
            // se quiser mostrar mesmo no primeiro load quando level>seen, mantém assim.
            setLevelUpInfo({ newLevel: activeUser.level });
            dispatch({
                type: 'ADD_TOAST',
                payload: {
                    id: Date.now().toString(),
                    type: 'success',
                    title: 'Level Up!',
                    message: `Você alcançou o nível ${activeUser.level}!`
                }
            });
        }

        prevLevelRef.current = activeUser.level;

        if (activeUser.unseenPlanUpgrade) {
            setSubscriptionUpgradeInfo({ newPlan: activeUser.plan });
            api.markPlanUpgradeAsSeen(activeUser.id).then(response => {
                if (response.updatedUser) dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
            });
        }

        if (activeUser.unseenRaffleWin) {
            setRaffleWinInfo(activeUser.unseenRaffleWin);
        }

        if (activeUser.unseenAchievements && activeUser.unseenAchievements.length > 0 && !unseenAchievementId) {
            setUnseenAchievementId(activeUser.unseenAchievements[0]);
        }
    }, [activeUser, dispatch, unseenAchievementId]);

    const safeUnseenAdminNotifications = Array.isArray(unseenAdminNotifications)
        ? unseenAdminNotifications
        : [];

    useEffect(() => {
        if (safeUnseenAdminNotifications.length > 0 && !currentAdminNotification) {
            setCurrentAdminNotification(safeUnseenAdminNotifications[0]);
        }
    }, [safeUnseenAdminNotifications, currentAdminNotification]);

    const handleViewUserHistory = async (user: User) => {
        setViewingUserHistory(user);
        const data = await api.fetchUserHistory(user.id);
        setHistoryData(data);
    };

    const handleCloseArtistOfTheDayModal = async (navigateToDashboard = false) => {
        if (isSupabaseProvider() && artistOfTheDayAnnouncementId) {
            try {
                localStorage.setItem(`aw_aod_seen:${artistOfTheDayAnnouncementId}`, '1');
            } catch {}
        } else {
            if (artistOfTheDayAnnouncementId) {
                try {
                    localStorage.setItem(`aw_aod_seen:${artistOfTheDayAnnouncementId}`, '1');
                } catch {}
            }
        }

        setShowArtistOfTheDayModal(false);
        setArtistOfTheDayAnnouncementId(null);
        if (navigateToDashboard) dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
    };

    const handleNavigateToInventory = (tab: InventoryTab) => {
        dispatch({ type: 'SET_INVENTORY_TAB', payload: tab });
        setRedemptionSuccessInfo(null);
    };

    const handleCloseAdminNotificationModal = async () => {
        if (activeUser && currentAdminNotification) {
            const { updatedUser } = await api.markAdminNotificationAsSeen(activeUser.id, currentAdminNotification.id);
            if(updatedUser) dispatch({ type: 'UPDATE_USER', payload: updatedUser });
            const remainingNotifications = unseenAdminNotifications.slice(1);
            dispatch({ type: 'SET_UNSEEN_ADMIN_NOTIFICATIONS', payload: remainingNotifications });
            setCurrentAdminNotification(null);
        }
    };
    
    const handleCloseAchievementModal = async () => {
        if (activeUser && unseenAchievementId) {
            const { updatedUser } = await api.markAchievementAsSeen(activeUser.id, unseenAchievementId);
            if (updatedUser) dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        }
        setUnseenAchievementId(null);
    };

    const renderView = () => {
        switch (currentView) {
            case 'dashboard': return <Dashboard onShowArtistOfTheDay={(id) => { setArtistOfTheDayAnnouncementId(id); setShowArtistOfTheDayModal(true); }} onShowRewardModal={(info) => setRewardModalInfo(info)} />;
            case 'missions': return <Missions />;
            case 'store': return <Store onRedeemSuccess={setRedemptionSuccessInfo} />;
            case 'inventory': return <Inventory />;
            case 'ranking': return <Ranking />;
            case 'achievements': return <Achievements />;
            case 'raffles': return <Raffles />;
            case 'subscriptions': return <Subscriptions />;
            case 'profile': return <Profile />;
            case 'admin':
                if (isAdmin === null) return <PageSkeleton />;
                if (!isAdmin) return <NotFoundState onGoHome={() => dispatch({type: 'SET_VIEW', payload: 'dashboard'})} />;
                return <AdminPanel
                    activeTab={adminActiveTab}
                    adminMissionsInitialSubTab={adminMissionsInitialSubTab}
                    adminStoreInitialSubTab={adminStoreInitialSubTab}
                    adminQueuesInitialSubTab={adminQueuesInitialSubTab}
                    adminSettingsInitialSubTab={adminSettingsInitialSubTab}
                    adminUsersInitialSubTab={adminUsersInitialSubTab}
                    adminSubscriptionsInitialSubTab={adminSubscriptionsInitialSubTab}
                    adminEconomyInitialSubTab={adminEconomyInitialSubTab}
                    onViewUserHistory={handleViewUserHistory}
                />;
            default: return <NotFoundState onGoHome={() => dispatch({type: 'SET_VIEW', payload: 'dashboard'})} />;
        }
    };

    // Priority Queue for Modals to prevent overlapping
    const renderActiveModal = () => {
        // 1. Admin/User History (Explicit Action)
        if (viewingUserHistory && historyData) {
            return <AdminUserHistoryModal user={viewingUserHistory} onClose={() => setViewingUserHistory(null)} {...historyData} />;
        }

        // 2. High Priority Events (Welcome, Level Up, Win)
        if (showWelcomeModal) {
            return <WelcomeModal onClose={() => dispatch({ type: 'SET_WELCOME_MODAL_VISIBILITY', payload: false })} onNavigate={() => { dispatch({ type: 'SET_VIEW', payload: 'dashboard' }); dispatch({ type: 'SET_WELCOME_MODAL_VISIBILITY', payload: false }); }} />;
        }
        if (levelUpInfo) {
             return <LevelUpModal newLevel={levelUpInfo.newLevel} onClose={() => setLevelUpInfo(null)} />;
        }
        if (raffleWinInfo) {
             return <RaffleWinnerModal {...raffleWinInfo} onClose={async () => { if(activeUser) { const res = await api.markRaffleWinAsSeen(activeUser.id); if(res.updatedUser) dispatch({type: 'UPDATE_USER', payload: res.updatedUser}); } setRaffleWinInfo(null); }} onNavigate={() => { dispatch({ type: 'SET_INVENTORY_TAB', payload: 'visual' }); setRaffleWinInfo(null); }} />;
        }
        if (subscriptionUpgradeInfo) {
             return <SubscriptionSuccessModal newPlanName={subscriptionUpgradeInfo.newPlan} onClose={() => setSubscriptionUpgradeInfo(null)} />;
        }

        // 3. Action Feedback (Medium Priority)
        // Shows immediately after an action (Store purchase, Link click)
        if (redemptionSuccessInfo) {
             return <RedemptionSuccessModal item={redemptionSuccessInfo.item} onClose={() => setRedemptionSuccessInfo(null)} onNavigateToInventory={handleNavigateToInventory} />;
        }
        if (rewardModalInfo) {
             return <RewardClaimedModal artistName={rewardModalInfo.artistName} linkType={rewardModalInfo.linkType} onClose={() => { if (rewardModalInfo?.updatedUser) dispatch({ type: 'UPDATE_USER', payload: rewardModalInfo.updatedUser }); setRewardModalInfo(null); }} />;
        }

        // 4. System Notifications
        if (currentAdminNotification) {
             return <AdminNotificationModal notification={currentAdminNotification} onClose={handleCloseAdminNotificationModal} />;
        }

        // 5. Gamification / Low Priority
        // These can wait until critical info is acknowledged
        if (showArtistOfTheDayModal) {
             return <ArtistOfTheDayModal onClose={() => handleCloseArtistOfTheDayModal(false)} onNavigate={() => handleCloseArtistOfTheDayModal(true)} />;
        }
        
        if (unseenAchievementId) {
             return (
                <AchievementUnlockedModal 
                    achievementId={unseenAchievementId} 
                    onClose={handleCloseAchievementModal}
                    onNavigate={() => { handleCloseAchievementModal(); dispatch({ type: 'SET_VIEW', payload: 'achievements' }); }}
                />
            );
        }
        
        return null;
    };

    if (!activeUser) return null; 

    return (
        <div className="bg-bg-base text-text-primary min-h-screen flex font-sans relative overflow-hidden antialiased">
            
            <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden fixed top-4 left-4 z-[50] p-3 bg-bg-surfaceLight/90 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(0,0,0,0.4)] border border-border-base text-brand-gold hover:text-white hover:bg-brand-gold/10 transition-all duration-300 active:scale-95"
            >
                <MenuIcon className="w-6 h-6" />
            </button>

            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            
            <main ref={mainContentRef} className="flex-1 relative flex flex-col h-screen overflow-y-auto custom-scrollbar scroll-smooth z-20">
                <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 pt-4 pb-40 md:pb-16 min-h-full flex flex-col relative">
                    <Header />
                    <div className="mt-6 md:mt-8 flex-1 space-y-6 md:space-y-8">
                        <Suspense fallback={<PageSkeleton />}>
                            {renderView()}
                        </Suspense>
                    </div>
                    <footer className="mt-16 pt-8 border-t border-border-base text-center text-text-muted text-xs md:text-sm space-y-1 pb-6">
                        <p className="font-bold tracking-wider text-text-secondary">ARTIST WORLD</p>
                        <p className="opacity-60">© {new Date().getFullYear()} Todos os direitos reservados.</p>
                    </footer>
                </div>
            </main>
            
            <Notifications />
            <ToastSystem />
            
            {/* Render only the highest priority active modal */}
            {renderActiveModal()}

        </div>
    );
};
