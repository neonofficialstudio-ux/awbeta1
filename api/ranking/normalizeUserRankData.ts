
import type { User, RankingUser } from '../../types';

const DEFAULT_AVATAR = "https://i.pravatar.cc/150?u=default";

/**
 * Validates and formats a social link.
 * Returns undefined if invalid to prevent broken icons in UI.
 */
const sanitizeLink = (url: string | undefined, platform: string): string | undefined => {
    if (!url || typeof url !== 'string' || url.trim() === '') return undefined;
    if (!url.startsWith('http')) return undefined;
    if (!url.toLowerCase().includes(platform)) return undefined;
    return url.trim();
};

/**
 * Maps a raw DB User to a UI-ready RankingUser object.
 * Handles fallbacks and formatting without altering the UI component logic.
 */
export const normalizeUserRankData = (user: User, rank: number, isCurrentUser: boolean): RankingUser => {
    return {
        rank: rank,
        name: user.name || "Artista Desconhecido",
        artisticName: user.artisticName || user.name || "Artista",
        avatarUrl: user.avatarUrl || DEFAULT_AVATAR,
        level: Math.max(1, user.level || 1),
        
        // Ensure valid numbers for progress bars
        monthlyMissionsCompleted: Math.max(0, user.monthlyMissionsCompleted || 0),
        
        isCurrentUser: isCurrentUser,
        plan: user.plan || 'Free Flow',
        
        // Strict social link validation to fix "missing icons" bug
        spotifyUrl: sanitizeLink(user.spotifyUrl, 'spotify'),
        youtubeUrl: sanitizeLink(user.youtubeUrl, 'youtube'),
        instagramUrl: sanitizeLink(user.instagramUrl, 'instagram'),
        tiktokUrl: sanitizeLink(user.tiktokUrl, 'tiktok'),
    };
};
