// services/missions/artistOfDay.engine.ts
import type { User } from '../../types/user';
import { EconomyEngineV6 } from '../../api/economy/economyEngineV6';
import { NotificationDispatcher } from '../../services/notifications/notification.dispatcher';
import { updateUserInDb } from '../../api/helpers';

export const ArtistOfDayEngine = {
  initialize(user: User): User {
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize or Reset if new day
    if (!user.artistDailyMission || user.artistDailyMission.lastUpdated !== today) {
      user.artistDailyMission = {
        requiredLinks: ["spotify", "youtube"],
        completedLinks: [],
        reward: 1,
        isComplete: false,
        lastUpdated: today
      };
    }

    // Data Corruption Prevention (Patch V7.1)
    const mission = user.artistDailyMission;
    if (!Array.isArray(mission.completedLinks)) mission.completedLinks = [];
    if (!Array.isArray(mission.requiredLinks)) mission.requiredLinks = ["spotify", "youtube"];
    
    return user;
  },

  clickLink: async (user: User, platform: string, artistName: string = "Artista") => {
    // Ensure initialized
    if (!user.artistDailyMission) {
        user = ArtistOfDayEngine.initialize(user);
    }
    
    // Deep clone to avoid mutation issues before save
    const updatedUser = { ...user, artistDailyMission: { ...user.artistDailyMission! } };
    const mission = updatedUser.artistDailyMission;

    if (mission.isComplete) return { user: updatedUser, notifications: [] };
    
    // Validate platform
    if (!mission.requiredLinks.includes(platform)) return { user: updatedUser, notifications: [] };
    if (mission.completedLinks.includes(platform)) return { user: updatedUser, notifications: [] };

    // Add progress
    mission.completedLinks = [...mission.completedLinks, platform];
    const notifications: any[] = [];

    // Check Completion
    if (mission.completedLinks.length === mission.requiredLinks.length) {
      mission.isComplete = true;
      
      // Grant Reward
      const ecoResult = await EconomyEngineV6.addCoins(updatedUser.id, mission.reward, `Artista do Dia: ${artistName}`);
      if (ecoResult.success && ecoResult.updatedUser) {
          updatedUser.coins = ecoResult.updatedUser.coins; // Sync coins
      }

      // Create Notification/Toast
      const notif = NotificationDispatcher.systemInfo(
          updatedUser.id, 
          "Missão Concluída!", 
          `Você explorou ${artistName} e ganhou +${mission.reward} Lummi Coin!`
      );
      notifications.push(notif);
    }

    // Persist state
    updateUserInDb(updatedUser);

    return { user: updatedUser, notifications };
  }
};