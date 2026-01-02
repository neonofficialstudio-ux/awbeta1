
import React, { useState, useEffect } from 'react';
import type { Mission, StoreItem, UsableItem, User, MissionSubmission, SubmissionStatus, RedeemedItem, Event, Participation, UsableItemQueueEntry, CoinTransaction, FeaturedWinner, Advertisement, SubscriptionPlan, SubscriptionRequest, EventMission, EventMissionSubmission, ManualEventPointsLog, CoinPack, CoinPurchaseRequest, AdminTab, AdminStoreTab } from '../../types';
import * as api from '../../api/index'; 
import { useAppContext } from '../../constants';
import { AdminEngine } from '../../api/admin/AdminEngine';
import { AntiCrashBoundary } from '../../core/AntiCrashBoundary';

// Component Imports
import ManageMissions from './ManageMissions';
import ManageStore from './ManageStore';
import ManageUsers from './ManageUsers';
import ManageEvents from './ManageEvents';
import ManageQueues from './ManageQueues';
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
import StressAndPerformance from './StressAndPerformance'; 
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
  EventIcon, 
  QueueIcon, 
  TrendingUpIcon, 
  TicketIcon, 
  SubscriptionIcon, 
  SettingsIcon,
  ShieldIcon 
} from '../../constants';
import { refreshEventSettings } from '../../state/eventSettings';

interface AdminPanelProps {
  activeTab: AdminTab;
  adminMissionsInitialSubTab: string;
  adminStoreInitialSubTab: AdminStoreTab;
  adminQueuesInitialSubTab: string;
  adminSettingsInitialSubTab: string;
  onViewUserHistory: (user: User) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const { activeTab, adminMissionsInitialSubTab, adminStoreInitialSubTab, adminQueuesInitialSubTab, adminSettingsInitialSubTab, onViewUserHistory } = props;
    const { state, dispatch } = useAppContext();
    const [isLoading, setIsLoading] = useState(true);
    const [adminData, setAdminData] = useState<any>(null);
    
    // Local state
    const [activeSettingsSubTab, setActiveSettingsSubTab] = useState(adminSettingsInitialSubTab || 'telemetry_pro');
    const [activeEconomySubTab, setActiveEconomySubTab] = useState<'console' | 'pro' | 'stress'>('console');

    const refreshAdminData = async () => {
        try {
            // V7 Engine Call - Background update
            const data = AdminEngine.getDashboardData();
            setAdminData(data);
        } catch (error) {
            console.error("Failed to refresh admin data:", error);
        }
    };

    useEffect(() => {
        // Initial load only
        setIsLoading(true);
        refreshAdminData().finally(() => {
            setIsLoading(false);
        });
    }, []);

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
    
    const onUnbanUser = (userId: string) => handleAdminAction(api.unbanUser(userId));

    if (isLoading || !adminData) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-gold-cinematic shadow-[0_0_20px_rgba(246,197,96,0.5)]"></div>
            </div>
        );
    }

    // Safe destructuring with defaults
    const { 
        missionSubmissions = [], 
        coinPurchaseRequests = [], 
        subscriptionRequests = [], 
        usableItemQueue = [], 
        artistOfTheDayQueue = [] 
    } = adminData;
    
    // Notification Counts
    const pendingSubmissionsCount = missionSubmissions.filter((s: MissionSubmission) => s.status === 'pending').length;
    const pendingCoinPurchases = coinPurchaseRequests.filter((req: CoinPurchaseRequest) => req.status === 'pending_approval' || req.status === 'pending_link_generation').length;
    
    // Normalize requests list and filter for pending count (Also used for passing to ManageSubscriptions)
    const normalizedRequests = Array.isArray(subscriptionRequests) ? subscriptionRequests : [];
    const pendingRequests = normalizedRequests.filter((r: any) => r.status === 'pending_approval');
    const pendingRequestsCount = pendingRequests.length;

    const totalPendingQueues = usableItemQueue.length + artistOfTheDayQueue.length;

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
        { id: 'events', label: 'Eventos', icon: <EventIcon className="w-4 h-4" /> },
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
                                        { id: 'stress', label: 'Stress & Performance' },
                                    ]}
                                />
                            </div>
                            {activeEconomySubTab === 'console' && <EconomyConsole {...adminData} />}
                            {activeEconomySubTab === 'pro' && <EconomicDashboardPro />}
                            {activeEconomySubTab === 'stress' && <StressAndPerformance />}
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
                return <AntiCrashBoundary><ManageUsers {...adminData} onUpdateUser={(u: User) => handleAdminAction(api.adminUpdateUser(u))} onPunishUser={(p: any) => handleAdminAction(api.punishUser(p))} onUnbanUser={onUnbanUser} onResetMonthlyRanking={() => handleAdminAction(api.resetMonthlyRanking())} onViewUserHistory={onViewUserHistory} /></AntiCrashBoundary>;
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
                /></AntiCrashBoundary>;
            case 'events':
                return <AntiCrashBoundary><ManageEvents 
                    {...adminData} 
                    onSaveEvent={(e: Event) => handleAdminAction(api.saveEvent(e))} 
                    onDeleteEvent={(id: string) => handleAdminAction(api.deleteEvent(id))} 
                    onSaveFeaturedWinner={(w: FeaturedWinner) => handleAdminAction(api.saveFeaturedWinner(w))} 
                    onDeleteFeaturedWinner={(id: string) => handleAdminAction(api.deleteFeaturedWinner(id))} 
                    setArtistsOfTheDayIds={(ids: string[]) => handleAdminAction(api.setArtistsOfTheDay(ids))} 
                    setArtistCarouselDuration={async (d: number) => {
                        await handleAdminAction(api.setArtistCarouselDuration(d));
                        await refreshEventSettings(dispatch);
                    }} 
                    onSaveEventMission={(m: EventMission) => handleAdminAction(api.saveEventMission(m))} 
                    onDeleteEventMission={(id: string) => handleAdminAction(api.deleteEventMission(id))} 
                    onReviewEventMission={(id: string, s: 'approved' | 'rejected') => handleAdminAction(api.reviewEventMission(id, s))} 
                    onAddManualEventPoints={(userId: string, eventId: string, points: number, reason: string) => handleAdminAction(api.addManualEventPoints(userId, eventId, points, reason))} 
                    onBatchApproveEventMissions={() => handleAdminAction(api.approveAllPendingEventSubmissions())}
                    unifiedAwards={adminData.unifiedAwards}
                /></AntiCrashBoundary>;
            case 'queues':
                return <AntiCrashBoundary><ManageQueues 
                    {...adminData} 
                    onProcessItemQueue={(id: string) => handleAdminAction(api.processQueueItem(id))} 
                    onProcessSpotlightQueue={(id: string) => handleAdminAction(api.processArtistOfTheDayQueueItem(id))} 
                    initialSubTab={adminQueuesInitialSubTab} 
                    onConvertItemToMission={(id: string) => handleAdminAction(api.convertQueueItemToMission(id))}
                    onCreateMissionFromQueue={(id: string, mission: Mission) => handleAdminAction(api.createMissionFromQueue(id, mission))}
                /></AntiCrashBoundary>;
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
