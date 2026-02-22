
import { EventRankingEngineV5 } from "../../services/events/eventRanking.engine";
import { EventLiveFeed } from "./event.livefeed";
class EventSyncManager {
    private intervals: Record<string, any> = {};
    private dispatch: any = null;
    private currentEventId: string | null = null;
    private currentUserId: string | null = null;

    /**
     * Starts the sync loop for a specific event.
     * Should be called when the Event View mounts.
     */
    public start(eventId: string, userId: string, dispatch: any, force: boolean = false) {
        if (!force && this.currentEventId === eventId && this.intervals[eventId]) {
            // Update dispatch if provided, as UI components might remount/change dispatch reference
            if (dispatch) this.dispatch = dispatch;
            return; 
        }
        
        this.stop(); // Stop previous if any
        if (dispatch) this.dispatch = dispatch;
        this.currentEventId = eventId;
        this.currentUserId = userId;

        console.log(`[EventSync] Starting sync for event ${eventId}`);

        // 1. Immediate Fetch
        this.syncRanking();
        this.syncArena();

        // 2. Set Intervals
        this.intervals['ranking'] = setInterval(() => this.syncRanking(), 7000); // 7s
        this.intervals['arena'] = setInterval(() => this.syncArena(), 5000); // 5s
        
        // HOTFIX V7.5: Disable fake live feed generation
        // this.intervals['feed'] = setInterval(() => this.syncFeed(), 3500); // 3.5s
    }

    public stop() {
        Object.values(this.intervals).forEach(clearInterval);
        this.intervals = {};
        this.currentEventId = null;
        this.currentUserId = null;
        console.log(`[EventSync] Stopped`);
    }

    private syncRanking() {
        if (!this.currentEventId || !this.dispatch) return;
        const ranking = EventRankingEngineV5.getEventRanking(this.currentEventId, this.currentUserId || undefined);
        this.dispatch({ type: 'RANKING_SYNC_EVENT', payload: ranking });
    }

    private syncArena() {
        if (!this.currentEventId || !this.dispatch) return;

        // Eventos desativados (Supabase-only). Mantém o shape esperado pelo reducer/UI.
        const status = {
            capacity: 0,
            current: 0,
            percentage: 0,
            isFull: true,
            label: "EVENTOS DESATIVADOS",
            onlineCount: 0,
        };

        this.dispatch({ type: "EVENT_SET_ARENA_STATUS", payload: status });
    }

    private syncFeed() {
        if (!this.currentEventId || !this.dispatch) return;
        const feedItem = EventLiveFeed.generateUpdate(this.currentEventId);
        if (feedItem) {
            this.dispatch({ type: 'EVENT_ADD_FEED_ITEM', payload: feedItem });
        }
    }
}

export const EventSync = new EventSyncManager();
