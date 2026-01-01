
import { View } from './shared';

export type NotificationType = 
  | "mission_approved"
  | "mission_rejected"
  | "mission_pending"
  | "coins_added"
  | "coins_spent"
  | "xp_added"
  | "rank_changed"
  | "event_update"
  | "queue_update"
  | "admin_alert"
  | "level_up"
  | "system_info";

export interface AWNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string; // Display string
  createdAt: number; // Sorting
  read: boolean;
  toast?: boolean; // Should trigger immediate toast
  linkTo?: {
    view: View;
    tab?: string;
    subTab?: string;
  };
  metadata?: any;
}
