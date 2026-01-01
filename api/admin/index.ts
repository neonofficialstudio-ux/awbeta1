
import { AdminEngine } from './AdminEngine';
import { LogEngineV4 } from './logEngineV4';

export { AdminEngine };

// Missions
export const saveMission = AdminEngine.missions.save;
export const deleteMission = AdminEngine.missions.delete;
export const setFeaturedMission = AdminEngine.missions.setFeatured;
export const reviewSubmission = AdminEngine.missions.reviewSubmission;
export const editSubmissionStatus = AdminEngine.missions.editSubmissionStatus;
export const approveAllPendingSubmissions = AdminEngine.missions.approveAllPending;
export const getMissionSnapshot = AdminEngine.missions.getSnapshot;
export const saveMissionsBatch = AdminEngine.missions.saveBatch;

// Users
export const fetchUserHistory = AdminEngine.fetchUserHistory;
export const getUserSnapshot = AdminEngine.fetchUserHistory; // Alias
export const punishUser = AdminEngine.punishUser;
export const unbanUser = AdminEngine.unbanUser;
export const adminUpdateUser = AdminEngine.adminUpdateUser;

// Store
export const saveStoreItem = AdminEngine.store.saveStoreItem;
export const deleteStoreItem = AdminEngine.store.deleteStoreItem;
export const toggleStoreItemStock = AdminEngine.store.toggleStoreItemStock;
export const saveUsableItem = AdminEngine.store.saveUsableItem;
export const deleteUsableItem = AdminEngine.store.deleteUsableItem;
export const toggleUsableItemStock = AdminEngine.store.toggleUsableItemStock;
export const saveCoinPack = AdminEngine.store.saveCoinPack;
export const deleteCoinPack = AdminEngine.store.deleteCoinPack;
export const toggleCoinPackStock = AdminEngine.store.toggleCoinPackStock;
export const setEstimatedCompletionDate = AdminEngine.store.setEstimatedCompletionDate;
export const manualRefund = AdminEngine.manualRefund;
export const completeVisualReward = AdminEngine.completeVisualReward;
export const adminSubmitPaymentLink = AdminEngine.adminSubmitPaymentLink;
export const reviewCoinPurchase = AdminEngine.reviewCoinPurchase;

// Events
export const saveEvent = AdminEngine.events.saveEvent;
export const deleteEvent = AdminEngine.events.deleteEvent;
export const saveFeaturedWinner = AdminEngine.saveFeaturedWinner;
export const deleteFeaturedWinner = AdminEngine.deleteFeaturedWinner;
export const setArtistsOfTheDay = AdminEngine.setArtistsOfTheDay;
export const setArtistCarouselDuration = AdminEngine.setArtistCarouselDuration;
export const saveEventMission = AdminEngine.events.saveEventMission;
export const deleteEventMission = AdminEngine.events.deleteEventMission;
export const reviewEventMission = AdminEngine.events.reviewEventMission;
export const addManualEventPoints = AdminEngine.addManualEventPoints;
export const approveAllPendingEventSubmissions = AdminEngine.events.approveAllPendingEventSubmissions;

// Queue
export const processQueueItem = AdminEngine.queue.processQueueItem;
export const processArtistOfTheDayQueueItem = AdminEngine.queue.processArtistOfTheDayQueueItem;
export const convertQueueItemToMission = AdminEngine.convertQueueItemToMission;
export const createMissionFromQueue = AdminEngine.createMissionFromQueue;
export const batchProcessQueueItems = (ids: string[]) => ids.forEach(id => AdminEngine.queue.processQueueItem(id)); // Helper

// Raffles & Jackpot
export const saveRaffle = AdminEngine.raffles.saveRaffle;
export const deleteRaffle = AdminEngine.raffles.deleteRaffle;
export const drawRaffleWinner = AdminEngine.raffles.drawRaffleWinner;
export const adminDrawJackpot = AdminEngine.jackpot.adminDrawJackpot;
export const adminInjectJackpot = AdminEngine.jackpot.adminInjectJackpot;
export const adminEditJackpot = AdminEngine.jackpot.adminEditJackpot;
export const fetchJackpotAnalytics = AdminEngine.jackpot.fetchJackpotAnalytics;
export const adminScheduleJackpot = AdminEngine.jackpot.adminScheduleJackpot;

// Subscriptions
export const approveSubscriptionRequest = AdminEngine.subscriptions.approveSubscriptionRequest;
export const rejectSubscriptionRequest = AdminEngine.subscriptions.rejectSubscriptionRequest;
export const saveSubscriptionPlan = AdminEngine.saveSubscriptionPlan;

// Settings & Other
export const saveAdvertisement = AdminEngine.saveAdvertisement;
export const deleteAdvertisement = AdminEngine.deleteAdvertisement;
export const updateTerms = AdminEngine.updateTerms;
export const sendAdminNotification = AdminEngine.sendAdminNotification;
export const adminRunSimulationStep = AdminEngine.adminRunSimulationStep;
export const adminGetSimulationState = AdminEngine.adminGetSimulationState;
export const resetMonthlyRanking = AdminEngine.resetMonthlyRanking;

// Audit / Logs Wrappers
export const getMissionAuditData = (id: string) => LogEngineV4.getLogs({category: 'mission'}); 
export const getEconomyAuditData = () => LogEngineV4.getLogs({category: 'economy'});
export const getUserAuditData = (id: string) => LogEngineV4.getLogs({userId: id});
