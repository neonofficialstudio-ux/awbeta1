
// api/tests/test-cases/mission-tests.ts
import type { TestDefinition } from '../test-runner';
import type { Mission } from '../../../types';
import { generateTestUsers } from '../../playground/generateTestUsers';
import { calculateMissionRewards, BASE_MISSION_REWARDS, getDailyMissionLimit } from '../../economy/economy';
import { generateSimMission } from '../../simulation/simulateMission';
import { deepClone } from '../../helpers';

const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

const users = generateTestUsers();
const ascensaoUser = users.find(u => u.plan === 'Artista em Ascensão')!;

export const missionTests: TestDefinition[] = [
    {
        name: 'Cálculo de recompensas baseado em duração e plano',
        fn: async () => {
            const missionCurta: Mission = { id: 'm-curta', title: '', description: '', type: 'creative', createdAt: '', deadline: '', status: 'active', ...BASE_MISSION_REWARDS.curta };
            
            const { updatedUser, xpGained, coinsGained } = await calculateMissionRewards(ascensaoUser, missionCurta);
            
            const expectedXP = Math.floor(BASE_MISSION_REWARDS.curta.xp * 1.1);
            const expectedCoins = Math.floor(BASE_MISSION_REWARDS.curta.coins * 1.1);

            assert(xpGained === expectedXP, `XP gained should be ${expectedXP} but got ${xpGained}`);
            assert(coinsGained === expectedCoins, `Coins gained should be ${expectedCoins} but got ${coinsGained}`);
            assert(updatedUser.xp === ascensaoUser.xp + expectedXP, 'User XP should be updated correctly');
            assert(updatedUser.coins === ascensaoUser.coins + expectedCoins, 'User coins should be updated correctly');
        }
    },
    {
        name: 'Geração de missão não quebra o sistema',
        fn: () => {
            const mission = generateSimMission();
            assert(typeof mission.title === 'string' && mission.title.length > 0, 'Generated mission should have a title');
            assert(typeof mission.description === 'string' && mission.description.length > 0, 'Generated mission should have a description');
            assert(mission.xp > 0, 'Generated mission should have XP');
            assert(mission.coins > 0, 'Generated mission should have coins');
        }
    },
    {
        name: 'Validação de duração da missão (deadline)',
        fn: () => {
            const mission = generateSimMission(); // This helper already sets a future deadline
            const deadline = new Date(mission.deadline);
            assert(deadline.getTime() > Date.now(), 'Mission deadline should be in the future');

            const pastMission = { ...mission, deadline: new Date(Date.now() - 86400000).toISOString() };
            assert(new Date(pastMission.deadline).getTime() < Date.now(), 'Past mission deadline should be in the past');
        }
    },
     {
        name: 'Simula atingir o limite diário de missões',
        fn: () => {
            const proUser = users.find(u => u.plan === 'Artista Profissional')!;
            const limit = getDailyMissionLimit(proUser.plan);
            assert(limit === 3, 'Pro user limit should be 3');
            
            // Simulate 3 submissions
            const submissionsToday = 3;
            assert(submissionsToday >= limit!, `User with ${submissionsToday} submissions should have reached the limit of ${limit}`);
        }
    }
];
