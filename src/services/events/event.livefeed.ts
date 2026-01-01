
import type { EventLiveFeedItem } from "../../types/event";
import { getRepository } from "../../api/database/repository.factory";

const repo = getRepository();

const TEMPLATES = [
    { type: 'rank_change', text: "🔥 @USER subiu para o Top 10!" },
    { type: 'rank_change', text: "🚀 @USER assumiu a liderança!" },
    { type: 'new_participant', text: "👋 @USER entrou na Arena!" },
    { type: 'vip_entry', text: "👑 @USER adquiriu o Golden Pass!" },
    { type: 'arena_notice', text: "⚠️ Arena atingiu 90% da capacidade." },
    { type: 'arena_notice', text: "⚡ Bônus de XP ativado por 1 hora!" },
];

export const EventLiveFeed = {
    /**
     * Generates a pseudo-random feed item based on current event activity.
     * In production, this would digest real-time socket events.
     */
    generateUpdate: (eventId: string): EventLiveFeedItem | null => {
        if (Math.random() > 0.4) return null; // Not always generating to avoid spam

        const users = repo.select("users");
        const participations = repo.select("participations").filter((p: any) => p.eventId === eventId);
        
        if (participations.length === 0) return null;

        const randomParticipant = participations[Math.floor(Math.random() * participations.length)];
        const user = users.find((u: any) => u.id === randomParticipant.userId);
        
        if (!user) return null;

        // Pick template based on user status or random
        let template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
        
        // Refine logic
        if (randomParticipant.isGolden && Math.random() > 0.7) {
            template = TEMPLATES.find(t => t.type === 'vip_entry') || template;
        }

        return {
            id: `feed-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            type: template.type as any,
            text: template.text.replace('@USER', user.artisticName || user.name),
            timestamp: Date.now()
        };
    }
};
