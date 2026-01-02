
import { EventEngineUnified, EventEngineV7 } from "./EventEngineUnified";
import { rankingAPI } from "../ranking/index";
import { withLatency } from "../helpers";

// --- CORE API ---
export const fetchEventsData = EventEngineUnified.fetchEventsData;
export const fetchRankingData = (type: 'mensal' | 'geral' = 'mensal') => withLatency(() => rankingAPI.getRanking(undefined, type));
export const joinEvent = EventEngineUnified.joinEvent;
export const submitEventMission = EventEngineUnified.submitEventMission;
export const artistLinkClick = EventEngineUnified.artistLinkClick;
export const markArtistOfTheDayAsSeen = EventEngineUnified.markArtistOfTheDayAsSeen;
export const fetchRafflesData = EventEngineUnified.fetchRafflesData;

// --- ARTIST OF THE DAY ---
export const fetchArtistsOfTheDayFull = EventEngineUnified.fetchArtistsOfTheDayFull;
export const fetchArtistOfTheDayConfig = EventEngineUnified.fetchArtistOfTheDayConfig;
export const claimArtistOfDayReward = EventEngineUnified.claimArtistOfDayReward;

// --- HELPERS & LEGACY ENDPOINTS ---
export const getEventMissions = EventEngineUnified.getEventMissions;
export const getVipEventMissions = EventEngineUnified.getVipEventMissions;
export const getEventRanking = EventEngineUnified.getEventRanking;
export const getEventData = EventEngineUnified.getEventData;

// --- ENGINES ---
export { EventEngineUnified, EventEngineV7 };
// export { EventEngineV7 } from "./eventEngineV7"; // Removed
export { EventRankingEngineV5 as EventRankingEngine } from "../../services/events/eventRanking.engine";
export { EventFAQ } from "./eventFAQ";
