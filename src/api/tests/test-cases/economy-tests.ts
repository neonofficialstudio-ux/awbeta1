// api/tests/test-cases/economy-tests.ts
import type { TestDefinition } from '../test-runner';
import { generateTestUsers } from '../../playground/generateTestUsers';
import { PLAN_MULTIPLIERS, LEVEL_UP_BONUS_AMOUNT, LEVEL_UP_BONUS_MILESTONE, getDailyMissionLimit, calculateLevelFromXp } from '../../economy/economy';
import { simulateCheckInCycle } from '../../simulation/simulateCheckIn';
import { deepClone } from '../../helpers';

const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

const users = generateTestUsers();
const freeUser = users.find(u => u.plan === 'Free Flow')!;
const ascensaoUser = users.find(u => u.plan === 'Artista em Ascensão')!;
const proUser = users.find(u => u.plan === 'Artista Profissional')!;
const hitmakerUser = users.find(u => u.plan === 'Hitmaker')!;

export const economyTests: TestDefinition[] = [
    {
        name: 'Verifica multiplicadores por plano',
        fn: () => {
            assert(PLAN_MULTIPLIERS['Free Flow'] === 1.0, 'Free Flow multiplier should be 1.0');
            assert(PLAN_MULTIPLIERS['Artista em Ascensão'] === 1.1, 'Ascensão multiplier should be 1.1');
            assert(PLAN_MULTIPLIERS['Artista Profissional'] === 1.25, 'Profissional multiplier should be 1.25');
            assert(PLAN_MULTIPLIERS['Hitmaker'] === 1.5, 'Hitmaker multiplier should be 1.5');
        }
    },
    {
        name: 'Testa ganho de XP/LC com multiplicadores',
        fn: () => {
            const baseXP = 100;
            const baseCoins = 50;
            assert(Math.floor(baseXP * PLAN_MULTIPLIERS['Artista em Ascensão']) === 110, 'Ascensão XP calculation failed');
            assert(Math.floor(baseCoins * PLAN_MULTIPLIERS['Artista Profissional']) === 62, 'Profissional Coins calculation failed');
            assert(Math.floor(baseXP * PLAN_MULTIPLIERS['Hitmaker']) === 150, 'Hitmaker XP calculation failed');
        }
    },
    {
        name: 'Testa bônus de level-up a cada 5 níveis',
        fn: () => {
            let testUser = deepClone(freeUser);
            testUser.level = 4;
            testUser.xp = 9990; // 10 xp away from level 5
            const initialCoins = testUser.coins;
            
            // Give enough XP to level up past 5
            testUser.xp += 20; 
            const { level, xpToNextLevel } = calculateLevelFromXp(testUser.xp);
            testUser.level = level;
            testUser.xpToNextLevel = xpToNextLevel;
            
            let finalCoins = initialCoins;
            if (testUser.level >= 5) {
                finalCoins += LEVEL_UP_BONUS_AMOUNT;
            }

            assert(testUser.level === 5, 'User should have leveled up to 5');
            assert(finalCoins === initialCoins + LEVEL_UP_BONUS_AMOUNT, `Coins should be ${initialCoins + LEVEL_UP_BONUS_AMOUNT}, but got ${finalCoins}`);
        }
    },
    {
        name: 'Testa bônus de check-in no 7º dia',
        fn: async () => {
            const { finalUser, cycleLog } = await simulateCheckInCycle(freeUser);
            const day7Log = cycleLog.find(log => log.day === 7);
            
            assert(day7Log !== undefined, 'Day 7 log not found');
            assert(day7Log!.isBonus === true, 'Day 7 should grant a bonus');
            assert(day7Log!.coinsGained > 10, 'Day 7 should have more than base coins');
            assert(finalUser.weeklyCheckInStreak === 0, 'Streak should reset after day 7');
        }
    },
    {
        name: 'Testa limites diários de missão',
        fn: () => {
            assert(getDailyMissionLimit('Free Flow') === 1, 'Free Flow limit should be 1');
            assert(getDailyMissionLimit('Artista em Ascensão') === 2, 'Ascensão limit should be 2');
            assert(getDailyMissionLimit('Artista Profissional') === 3, 'Profissional limit should be 3');
            assert(getDailyMissionLimit('Hitmaker') === null, 'Hitmaker limit should be null (unlimited)');
        }
    }
];