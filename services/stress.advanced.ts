
import { getRepository } from "../api/database/repository.factory";

export const StressEngineAdvanced = {
  missionStorm(count = 1000) {
    const repo = getRepository();
    const start = Date.now();
    for (let i = 0; i < count; i++) {
      repo.insert("missions", {
        id: `stress-m-${Date.now()}-${i}`,
        userId: `stress-u-${i % 100}`,
        status: "pending",
        type: "STRESS_TEST",
        timestamp: Date.now()
      });
    }
    return { inserted: count, duration: Date.now() - start };
  },

  heavyUserCreation(count = 500) {
    const repo = getRepository();
    const start = Date.now();
    for (let i = 0; i < count; i++) {
      repo.insert("users", { 
          id: `stress-new-u-${i}`, 
          lc: 0, 
          xp: 0, 
          plan: "Free Flow",
          created_at: new Date().toISOString()
      });
    }
    return { users: count, duration: Date.now() - start };
  },

  queuePressure(count = 500) {
    const repo = getRepository();
    const start = Date.now();
    for (let i = 0; i < count; i++) {
      repo.insert("queue", { 
          id: `q-stress-${i}`, 
          status: "waiting",
          priority: Math.floor(Math.random() * 10)
      });
    }
    return { queued: count, duration: Date.now() - start };
  }
};
