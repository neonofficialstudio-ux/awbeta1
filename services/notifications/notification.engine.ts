
import { getRepository } from "../../api/database/repository.factory";
import type { AWNotification, NotificationType } from "./notification.types";
import { TelemetryPRO } from "../telemetry.pro";

const repo = getRepository();

// Anti-Duplication Cache (Hash -> Timestamp)
const recentHashes = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000; // 5 seconds

const generateHash = (userId: string, title: string, description: string): string => {
    return `${userId}:${title}:${description}`;
};

export const NotificationEngine = {
    /**
     * Creates a new persistent notification in the database.
     * Includes anti-spam deduplication.
     */
    create: (
        userId: string, 
        type: NotificationType, 
        title: string, 
        description: string, 
        linkTo?: AWNotification['linkTo'],
        metadata?: any
    ): AWNotification => {
        // 1. Anti-Duplication Check
        const hash = generateHash(userId, title, description);
        const now = Date.now();
        const lastSeen = recentHashes.get(hash);

        if (lastSeen && (now - lastSeen < DEDUP_WINDOW_MS)) {
            console.warn(`[NotificationEngine] Suppressed duplicate: ${title}`);
            // Return a dummy notification to satisfy type but don't save
            return {
                id: 'dedup-suppressed',
                userId,
                type,
                title,
                description,
                timestamp: "Agora",
                createdAt: now,
                read: true,
                toast: false
            };
        }
        
        recentHashes.set(hash, now);

        // 2. Create Notification
        const notification: AWNotification = {
            id: `notif-${now}-${Math.random().toString(36).substr(2, 5)}`,
            userId,
            type,
            title,
            description,
            timestamp: "Agora",
            createdAt: now,
            read: false,
            toast: true,
            linkTo,
            metadata
        };

        repo.insert("notifications", notification);
        TelemetryPRO.event("notification_created", { userId, type, title });

        return notification;
    },

    /**
     * Retrieves notifications for a user, sorted by newest.
     */
    getUserNotifications: (userId: string, limit = 50): AWNotification[] => {
        const all = repo.select("notifications") as AWNotification[];
        return all
            .filter(n => n.userId === userId && n.id !== 'dedup-suppressed')
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    },

    /**
     * Marks a specific notification as read.
     */
    markAsRead: (userId: string, notificationId: string) => {
        repo.update(
            "notifications", 
            (n: any) => n.id === notificationId && n.userId === userId, 
            (n: any) => ({ ...n, read: true })
        );
    },

    /**
     * Marks all notifications for a user as read.
     */
    markAllAsRead: (userId: string) => {
        const userNotifs = NotificationEngine.getUserNotifications(userId, 1000); 
        userNotifs.forEach(n => {
            if (!n.read) {
                repo.update("notifications", (item: any) => item.id === n.id, (item: any) => ({ ...item, read: true }));
            }
        });
    },

    /**
     * Clears all notifications for a user (Maintenance).
     */
    clearAll: (userId: string) => {
        repo.delete("notifications", (n: any) => n.userId === userId);
    },
    
    /**
     * Returns unread count.
     */
    getUnreadCount: (userId: string): number => {
        const all = repo.select("notifications") as AWNotification[];
        return all.filter(n => n.userId === userId && !n.read).length;
    }
};
