
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Mission, StoreItem, UsableItem, User, MissionSubmission, SubmissionStatus, RedeemedItem, Participation, UsableItemQueueEntry, CoinTransaction, Advertisement, SubscriptionPlan, SubscriptionRequest, CoinPack, CoinPurchaseRequest, AdminTab, AdminStoreTab } from '../../types';
import * as api from '../../api/index'; 
import { useAppContext } from '../../constants';
import { AdminEngine } from '../../api/admin/AdminEngine';
import type { AdminDashboardMode } from '../../api/admin/AdminEngine';
import { AntiCrashBoundary } from '../../core/AntiCrashBoundary';
import { emptyAdminDashboard } from '../../api/supabase/supabase.repositories.admin';

// Component Imports
import ManageMissions from './ManageMissions';
import ManageStore from './ManageStore';
import ManageUsers from './ManageUsers';
import EconomicsDashboard from './EconomicsDashboard';
import ManageAdvertisements from './ManageAdvertisements';
import ManageSubscriptions from './ManageSubscriptions';
import ManageRaffles from './ManageRaffles';
import ManageNotifications from './ManageNotifications';
import ManageSettings from './ManageSettings';
import AdminDashboard from './AdminDashboard';
import UserBehaviorIntelligence from './UserBehaviorIntelligence';
import AdminInsightEngine from './AdminInsightEngine';
import EconomyConsole from './EconomyConsole';
// Stress test removido (feature descontinuada)
import EconomicDashboardPro from './EconomicDashboardPro';
import TelemetryProTab from './telemetry/TelemetryProTab'; 

// UI Library
import Page from '../ui/layout/Page';
import Container from '../ui/layout/Container';
import Tabs from '../ui/navigation/Tabs';
import { 
  DashboardIcon, 
  MissionIcon, 
  UsersIcon, 
  StoreIcon, 
  QueueIcon, 
  TrendingUpIcon, 
  TicketIcon, 
  SubscriptionIcon, 
  SettingsIcon,
  ShieldIcon 
} from '../../constants';

interface AdminPanelProps {
  activeTab: AdminTab;
  adminMissionsInitialSubTab: string;
  adminStoreInitialSubTab: AdminStoreTab;
  adminQueuesInitialSubTab: string;
  adminSettingsInitialSubTab: string;
  adminUsersInitialSubTab?: 'list' | 'metrics' | 'leads';
  adminSubscriptionsInitialSubTab?: 'plans' | 'requests';
  adminEconomyInitialSubTab?: 'console' | 'pro';
  onViewUserHistory: (user: User) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const { activeTab, adminMissionsInitialSubTab, adminStoreInitialSubTab, adminSettingsInitialSubTab, adminUsersInitialSubTab, adminSubscriptionsInitialSubTab, adminEconomyInitialSubTab, onViewUserHistory } = props;
    const { state, dispatch } = useAppContext();
    const [isLoading, setIsLoading] = useState(true);
    // Never null => avoids full-tree swap that can trigger scroll/paint jank
    const [adminData, setAdminData] = useState<any>(emptyAdminDashboard);
    const [loadedMode, setLoadedMode] = useState<AdminDashboardMode>('light');

    const initialSettingsSubTab = adminSettingsInitialSubTab?.startsWith('notifications:')
        ? 'notifications'
        : adminSettingsInitialSubTab;
    const notificationsInitialType = adminSettingsInitialSubTab?.startsWith('notifications:')
        ? (adminSettingsInitialSubTab.split(':')[1] === 'private' ? 'private' : 'global')
        : undefined;
    
    // Local state
    const [activeSettingsSubTab, setActiveSettingsSubTab] = useState(initialSettingsSubTab || 'telemetry_pro');
    const [activeEconomySubTab, setActiveEconomySubTab] = useState<'console' | 'pro'>(adminEconomyInitialSubTab || 'console');

    const refreshAdminData = useCallback(async (mode: AdminDashboardMode = 'full') => {
        setIsLoading(true);

        try {
            const data = await Promise.resolve(AdminEngine.getDashboardData(mode));
            setAdminData((prev: any) => ({
                ...emptyAdminDashboard,
                ...(prev || {}),
                ...(data || {}),
            }));
            setLoadedMode(mode);
        } catch (error) {
            console.warn('[AdminPanel] refresh threw:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial load: light mode for fast first paint
        refreshAdminData('light');
    }, [refreshAdminData]);

    // Upgrade to full only when user navigates to heavy tabs
    useEffect(() => {
        const heavyTabs: AdminTab[] = ['economy_console', 'missions', 'users', 'store', 'queues', 'raffles', 'subscriptions', 'settings', 'behavior', 'insights', 'economics'];
        if (!heavyTabs.includes(activeTab)) return;
        if (loadedMode === 'full') return;
        // fire-and-forget upgrade; keep UI stable (no early-return)
        void refreshAdminData('full');
    }, [activeTab, loadedMode, refreshAdminData]);

    // Updated to handle sync/async returns
    const handleAdminAction = async (actionResult: any | Promise<any>) => {
        try {
            const response = await Promise.resolve(actionResult);
            if (response && response.updatedUser) {
                if (state.activeUser && state.activeUser.id === response.updatedUser.id) {
                    dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
                }
            }
            if (response && response.notifications) {
                dispatch({ type: 'ADD_NOTIFICATIONS', payload: response.notifications });
            }
            // Silent Refresh to keep UI stable
            await refreshAdminData();
        } catch(e) {
            console.error("Admin action failed:", e);
        }
    };

    useEffect(() => {
        if (!adminData) return;
        if (activeTab !== 'settings') return;
        if ((adminSettingsInitialSubTab || '') === (activeSettingsSubTab || '')) return;

        dispatch({
            type: 'SET_ADMIN_TAB',
            payload: { tab: 'settings', subTab: activeSettingsSubTab },
        });
    }, [adminData, activeTab, adminSettingsInitialSubTab, activeSettingsSubTab, dispatch]);

    useEffect(() => {
        if (!adminData) return;
        if (activeTab !== 'economy_console') return;

        dispatch({
            type: 'SET_ADMIN_TAB',
            payload: { tab: 'economy_console', subTab: activeEconomySubTab },
        });
    }, [adminData, activeTab, activeEconomySubTab, dispatch]);
    
    const onUnbanUser = (userId: string) => handleAdminAction(api.unbanUser(userId));

    // Safe destructuring + hard normalization (prevents ".filter is not a function" crashes)
    // Hooks abaixo agora sempre rodam (adminData nunca é null)
    const missionSubmissions = useMemo(
        () => (Array.isArray(adminData?.missionSubmissions) ? adminData.missionSubmissions : []),
        [adminData?.missionSubmissions]
    );
    const coinPurchaseRequests = useMemo(
        () => (Array.isArray(adminData?.coinPurchaseRequests) ? adminData.coinPurchaseRequests : []),
        [adminData?.coinPurchaseRequests]
    );
    const subscriptionRequests = useMemo(
        () => (Array.isArray(adminData?.subscriptionRequests) ? adminData.subscriptionRequests : []),
        [adminData?.subscriptionRequests]
    );
    const usableItemQueue = useMemo(
        () => (Array.isArray(adminData?.usableItemQueue) ? adminData.usableItemQueue : []),
        [adminData?.usableItemQueue]
    );
    const artistOfTheDayQueue = useMemo(
        () => (Array.isArray(adminData?.artistOfTheDayQueue) ? adminData.artistOfTheDayQueue : []),
        [adminData?.artistOfTheDayQueue]
    );
    
    // Notification Counts (memoized + safe)
    const pendingSubmissionsCount = useMemo(() => {
        return missionSubmissions.filter((s: MissionSubmission) => s?.status === 'pending').length;
    }, [missionSubmissions]);

    const pendingCoinPurchases = useMemo(() => {
        return coinPurchaseRequests.filter((req: CoinPurchaseRequest) =>
            req?.status === 'pending_approval' || req?.status === 'pending_link_generation'
        ).length;
    }, [coinPurchaseRequests]);

    const pendingRequestsCount = useMemo(() => {
        return subscriptionRequests.filter((r: any) => r?.status === 'pending_approval').length;
    }, [subscriptionRequests]);

    const pendingRequests = useMemo(() => {
        return subscriptionRequests.filter((r: any) => r?.status === 'pending_approval');
    }, [subscriptionRequests]);

    const totalPendingQueues = useMemo(() => {
        return usableItemQueue.length + artistOfTheDayQueue.length;
    }, [usableItemQueue.length, artistOfTheDayQueue.length]);
    const handleTabChange = (id: string) => {
      dispatch({ type: 'SET_ADMIN_TAB', payload: { tab: id as AdminTab } });
    };

    // Tabs Configuration
    const mainTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-4 h-4" /> },
        { id: 'economy_console', label: 'Economia', icon: <TrendingUpIcon className="w-4 h-4" /> },
        { id: 'missions', label: 'Missões', count: pendingSubmissionsCount, icon: <MissionIcon className="w-4 h-4" /> },
        { id: 'users', label: 'Usuários', icon: <UsersIcon className="w-4 h-4" /> },
        { id: 'store', label: 'Loja', count: pendingCoinPurchases, icon: <StoreIcon className="w-4 h-4" /> },
        { id: 'queues', label: 'Filas', count: totalPendingQueues, icon: <QueueIcon className="w-4 h-4" /> },
        { id: 'raffles', label: 'Sorteios', icon: <TicketIcon className="w-4 h-4" /> },
        { id: 'subscriptions', label: 'Planos', count: pendingRequestsCount, icon: <SubscriptionIcon className="w-4 h-4" /> },
        { id: 'settings', label: 'Config', icon: <SettingsIcon className="w-4 h-4" /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <AntiCrashBoundary><AdminDashboard 
                    {...adminData} 
                    allUsers={adminData.allUsers}
                    missions={adminData.missions}
                /></AntiCrashBoundary>;
            case 'economy_console':
                return (
                    <AntiCrashBoundary>
                        <div className="flex flex-col gap-6">
                            <div className="border-b border-white/10 mb-2">
                                <Tabs 
                                    variant="underline"
                                    activeTab={activeEconomySubTab}
                                    onChange={(id) => setActiveEconomySubTab(id as any)}
                                    items={[
                                        { id: 'console', label: 'Console Geral' },
                                        { id: 'pro', label: 'Economy Pro' },
                                    ]}
                                />
                            </div>
                            {activeEconomySubTab === 'console' && <EconomyConsole {...adminData} />}
                            {activeEconomySubTab === 'pro' && <EconomicDashboardPro {...adminData} />}
                        </div>
                    </AntiCrashBoundary>
                );
            case 'behavior': // Route safety
                return <AntiCrashBoundary><UserBehaviorIntelligence 
                    allUsers={adminData.allUsers} 
                    missionSubmissions={adminData.missionSubmissions}
                    allTransactions={adminData.allTransactions}
                    usableItemQueue={adminData.usableItemQueue}
                    processedItemQueueHistory={adminData.processedItemQueueHistory || []}
                    behaviorLog={adminData.behaviorLog || []}
                /></AntiCrashBoundary>;
            case 'insights': // Route safety
                return <AntiCrashBoundary><AdminInsightEngine 
                    allUsers={adminData.allUsers}
                    missions={adminData.missions}
                    missionSubmissions={adminData.missionSubmissions}
                    redeemedItems={adminData.redeemedItems}
                    allTransactions={adminData.allTransactions}
                    usableItemQueue={adminData.usableItemQueue}
                    processedItemQueueHistory={adminData.processedItemQueueHistory || []}
                /></AntiCrashBoundary>;
            case 'missions':
                return <AntiCrashBoundary><ManageMissions 
                    {...adminData}
                    initialSubTab={adminMissionsInitialSubTab}
                    onSaveMission={(m: Mission) => handleAdminAction(api.saveMission(m))} 
                    onDeleteMission={(id: string) => handleAdminAction(api.deleteMission(id))} 
                    setFeaturedMissionId={(id: string | null) => handleAdminAction(api.setFeaturedMission(id))} 
                    onReview={async (id: string, s: 'approved' | 'rejected') => handleAdminAction(api.reviewSubmission(id, s))} 
                    onEditStatus={async (id: string, s: SubmissionStatus) => handleAdminAction(api.editSubmissionStatus(id, s))}
                    onBatchApprove={() => handleAdminAction(api.approveAllPendingSubmissions())}
                    onBatchSaveMissions={(missions: Mission[]) => handleAdminAction(api.saveMissionsBatch(missions))}
                /></AntiCrashBoundary>;
            case 'users':
                return (
                    <AntiCrashBoundary>
                        <ManageUsers
                            {...adminData}
                            initialSubTab={adminUsersInitialSubTab}
                            onUpdateUser={(u: User) => handleAdminAction(api.adminUpdateUser(u))}
                            onPunishUser={(p: any) => handleAdminAction(api.punishUser(p))}
                            onUnbanUser={onUnbanUser}
                            // ✅ agora serve apenas para atualizar os dados do admin após fechar/premiar
                            onResetMonthlyRanking={refreshAdminData}
                            onViewUserHistory={onViewUserHistory}
                        />
                    </AntiCrashBoundary>
                );
            case 'store':
                return <AntiCrashBoundary><ManageStore 
                    {...adminData} 
                    onSaveStoreItem={(i: StoreItem) => handleAdminAction(api.saveStoreItem(i))} 
                    onDeleteStoreItem={(id: string) => handleAdminAction(api.deleteStoreItem(id))} 
                    onToggleStoreItemStock={(id: string) => handleAdminAction(api.toggleStoreItemStock(id))} 
                    onSaveUsableItem={(i: UsableItem) => handleAdminAction(api.saveUsableItem(i))} 
                    onDeleteUsableItem={(id: string) => handleAdminAction(api.deleteUsableItem(id))} 
                    onToggleUsableItemStock={(id: string) => handleAdminAction(api.toggleUsableItemStock(id))} 
                    onSaveCoinPack={(p: CoinPack) => handleAdminAction(api.saveCoinPack(p))} 
                    onToggleCoinPackStock={(id: string) => handleAdminAction(api.toggleCoinPackStock(id))} 
                    onReviewCoinPurchase={(id: string, s: 'approved' | 'rejected') => handleAdminAction(api.reviewCoinPurchase(id, s))} 
                    initialSubTab={adminStoreInitialSubTab} 
                    onAdminSubmitPaymentLink={(id: string, link: string) => handleAdminAction(api.adminSubmitPaymentLink(id, link))}
                    onRefund={(id: string) => handleAdminAction(api.manualRefund(id))} 
                    onComplete={(id: string, url?: string) => handleAdminAction(api.completeVisualReward(id, url))}
                    onSetDeadline={(id: string, date: string) => handleAdminAction(api.setEstimatedCompletionDate(id, date))}
                    // ✅ Reuso dos handlers do módulo Filas dentro da Central de Operações (Loja)
                    onProcessItemQueue={(id: string) => handleAdminAction(api.processQueueItem(id))}
                    onProcessSpotlightQueue={(id: string) => handleAdminAction(api.processArtistOfTheDayQueueItem(id))}
                    onConvertItemToMission={(id: string) => handleAdminAction(api.convertQueueItemToMission(id))}
                    onCreateMissionFromQueue={(id: string, mission: any) => handleAdminAction(api.createMissionFromQueue(id, mission))}
                /></AntiCrashBoundary>;
            case 'queues':
                // ✅ Atalho enterprise: Filas = Loja → Operação → Filas (fonte única)
                return (
                  <AntiCrashBoundary>
                    <ManageStore
                      {...adminData}
                      initialSubTab={'queues' as any}
                      onSaveStoreItem={(i: StoreItem) => handleAdminAction(api.saveStoreItem(i))}
                      onDeleteStoreItem={(id: string) => handleAdminAction(api.deleteStoreItem(id))}
                      onToggleStoreItemStock={(id: string) => handleAdminAction(api.toggleStoreItemStock(id))}
                      onSaveUsableItem={(i: UsableItem) => handleAdminAction(api.saveUsableItem(i))}
                      onDeleteUsableItem={(id: string) => handleAdminAction(api.deleteUsableItem(id))}
                      onToggleUsableItemStock={(id: string) => handleAdminAction(api.toggleUsableItemStock(id))}
                      onSaveCoinPack={(p: CoinPack) => handleAdminAction(api.saveCoinPack(p))}
                      onToggleCoinPackStock={(id: string) => handleAdminAction(api.toggleCoinPackStock(id))}
                      onReviewCoinPurchase={(id: string, s: 'approved' | 'rejected') => handleAdminAction(api.reviewCoinPurchase(id, s))}
                      onAdminSubmitPaymentLink={(id: string, link: string) => handleAdminAction(api.adminSubmitPaymentLink(id, link))}
                      onRefund={(id: string) => handleAdminAction(api.manualRefund(id))}
                      onComplete={(id: string, url?: string) => handleAdminAction(api.completeVisualReward(id, url))}
                      onSetDeadline={(id: string, date: string) => handleAdminAction(api.setEstimatedCompletionDate(id, date))}
                      onProcessItemQueue={(id: string) => handleAdminAction(api.processQueueItem(id))}
                      onProcessSpotlightQueue={(id: string) => handleAdminAction(api.processArtistOfTheDayQueueItem(id))}
                      onConvertItemToMission={(id: string) => handleAdminAction(api.convertQueueItemToMission(id))}
                      onCreateMissionFromQueue={(id: string, mission: Mission) => handleAdminAction(api.createMissionFromQueue(id, mission))}
                    />
                  </AntiCrashBoundary>
                );
            case 'economics': // Route safety
                return <AntiCrashBoundary><EconomicsDashboard {...adminData} /></AntiCrashBoundary>;
            case 'raffles':
                return <AntiCrashBoundary><ManageRaffles 
                    {...adminData}
                    highlightedRaffleId={adminData.highlightedRaffleId || null}
                    refreshAdminData={refreshAdminData}
                    onSaveRaffle={(r: any) => handleAdminAction(api.saveRaffle(r))}
                    onDeleteRaffle={(id: string) => handleAdminAction(api.deleteRaffle(id))}
                    onDrawWinner={(id: string) => handleAdminAction(api.drawRaffleWinner(id))}
                /></AntiCrashBoundary>;
            case 'subscriptions':
                return (
                    <AntiCrashBoundary>
                        <ManageSubscriptions
                            initialSubTab={adminSubscriptionsInitialSubTab}
                            subscriptionRequests={pendingRequests}
                            subscriptionStats={adminData.subscriptionStats}
                            subscriptionHistory={adminData.subscriptionHistory}
                            subscriptionPlans={adminData.subscriptionPlans}
                            onSavePlan={(plan) => handleAdminAction(api.saveSubscriptionPlan(plan))}
                            onApprove={async (id) => {
                                await handleAdminAction(api.approveSubscriptionRequest(id));
                                await refreshAdminData();
                            }}
                            onReject={async (id) => {
                                await handleAdminAction(api.rejectSubscriptionRequest(id));
                                await refreshAdminData();
                            }}
                        />
                    </AntiCrashBoundary>
                );
            case 'settings':
                return (
                    <AntiCrashBoundary>
                        <div className="flex flex-col gap-6">
                            <div className="border-b border-white/10 mb-2">
                                 <Tabs 
                                    variant="underline"
                                    activeTab={activeSettingsSubTab}
                                    onChange={setActiveSettingsSubTab}
                                    items={[
                                        { id: 'telemetry_pro', label: 'Telemetria PRO', icon: <ShieldIcon className="w-4 h-4 text-blue-400" /> },
                                        { id: 'advertisements', label: 'Anúncios' },
                                        { id: 'notifications', label: 'Notificações' },
                                        { id: 'terms', label: 'Termos' },
                                    ]}
                                />
                            </div>
                            
                            {activeSettingsSubTab === 'telemetry_pro' && (
                                <TelemetryProTab />
                            )}
                            {activeSettingsSubTab === 'advertisements' && (
                                <ManageAdvertisements 
                                    {...adminData} 
                                    onSave={(ad: Advertisement) => handleAdminAction(api.saveAdvertisement(ad))} 
                                    onDelete={(id: string) => handleAdminAction(api.deleteAdvertisement(id))} 
                                />
                            )}
                            {activeSettingsSubTab === 'notifications' && (
                                <ManageNotifications 
                                    initialType={notificationsInitialType}
                                    allUsers={adminData.allUsers} 
                                    onSend={(payload: any) => handleAdminAction(api.sendAdminNotification(payload))} 
                                />
                            )}
                            {activeSettingsSubTab === 'terms' && (
                                <ManageSettings 
                                    {...adminData} 
                                    onUpdateTerms={(t: string) => handleAdminAction(api.updateTerms(t))} 
                                />
                            )}
                        </div>
                    </AntiCrashBoundary>
                );
            default:
                return null;
        }
    }

    return (
        <AntiCrashBoundary>
            <Page 
                title="NEXUS ADMIN V7.0" 
                subtitle="Centro de Comando Operacional (LiveOps)"
                className="pb-20 bg-navy-deep/30"
            >
                <Container fluid className="px-0 sm:px-4 lg:px-8">
                    {isLoading && (
                        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-gold-cinematic shadow-[0_0_20px_rgba(246,197,96,0.35)]"></div>
                        </div>
                    )}
                    <div className="mb-8 sticky top-0 bg-navy-deep/95 backdrop-blur-md z-30 py-3 -mx-4 px-4 md:mx-0 md:px-0 border-b border-neon-cyan/20 shadow-lg">
                        <Tabs 
                            items={mainTabs} 
                            activeTab={activeTab} 
                            onChange={handleTabChange} 
                            variant="underline"
                            className="pb-0"
                        />
                    </div>

                    <div className="min-h-[500px] animate-fade-in-up">
                        {renderContent()}
                    </div>
                </Container>
            </Page>
        </AntiCrashBoundary>
    );
};

export default AdminPanel;
