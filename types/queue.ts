
import { Metadata } from "./shared";

export type QueueStatus = 'pending' | 'processing' | 'done';

export interface QueueItem {
  id: string;
  userId: string;
  itemId: string; // Redeemed Item ID
  itemName: string;
  rarity?: string;
  status: QueueStatus;
  priority: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Metadata;
  
  // UI Compatibility Fields
  userName?: string;
  userAvatar?: string;
  postUrl?: string;
  progress?: number;
}

export interface UsableItemQueueEntry extends QueueItem {
  // Legacy compatibility
  redeemedItemId: string;
  queuedAt: string;
  postUrl: string;
}

export interface ProcessedUsableItemQueueEntry extends UsableItemQueueEntry {
  processedAt: string;
}

export interface ArtistOfTheDayQueueEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  redeemedItemId: string;
  itemName: string;
  queuedAt: string;
}

export interface ProcessedArtistOfTheDayQueueEntry extends ArtistOfTheDayQueueEntry {
  processedAt: string;
}
