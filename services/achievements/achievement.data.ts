
import type { AchievementDefinition } from './achievement.types';

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
    // --- MISSÕES ---
    {
        id: 'mission_1',
        title: 'Primeiros Passos',
        description: 'Complete sua primeira missão.',
        rarity: 'Comum',
        rewardCoins: 5,
        rewardXP: 50,
        trigger: 'mission_complete',
        conditionValue: 1,
        category: 'mission'
    },
    {
        id: 'mission_10',
        title: 'Artista Ativo',
        description: 'Complete 100 missões.',
        rarity: 'Incomum',
        rewardCoins: 15,
        rewardXP: 100,
        trigger: 'mission_complete',
        conditionValue: 100,
        category: 'mission'
    },
    {
        id: 'mission_25',
        title: 'Dedicação Total',
        description: 'Complete 50 missões consecutivas.',
        rarity: 'Raro',
        rewardCoins: 20,
        rewardXP: 250,
        trigger: 'mission_complete',
        conditionValue: 50,
        category: 'mission'
    },
    {
        id: 'mission_50',
        title: 'Lenda das Missões',
        description: 'Complete 1000 missões.',
        rarity: 'Épico',
        rewardCoins: 30,
        rewardXP: 500,
        trigger: 'mission_complete',
        conditionValue: 1000,
        category: 'mission'
    },

    // --- ECONOMIA ---
    {
        id: 'eco_first_buy',
        title: 'Colecionador',
        description: 'Faça sua primeira compra na loja.',
        rarity: 'Incomum',
        rewardCoins: 5,
        rewardXP: 50,
        trigger: 'store_redeem',
        conditionValue: 1,
        category: 'economy'
    },
    {
        id: 'eco_rich',
        title: 'Magnata',
        description: 'Acumule um total de 10.000 Coins (lifetime).',
        rarity: 'Raro',
        rewardCoins: 30,
        rewardXP: 200,
        trigger: 'coin_accumulated',
        conditionValue: 10000,
        category: 'economy'
    },

    // --- CHECK-IN ---
    {
        id: 'streak_7',
        title: 'Mês Produtivo',
        description: 'Faça check-in por 30 dias seguidos.',
        rarity: 'Raro',
        rewardCoins: 15,
        rewardXP: 100,
        trigger: 'check_in_streak',
        conditionValue: 30,
        category: 'social'
    },

    // --- RANKING ---
    {
        id: 'rank_top10',
        title: 'No Topo',
        description: 'Entre no Top 10 do Ranking.',
        rarity: 'Épico',
        rewardCoins: 20,
        rewardXP: 300,
        trigger: 'ranking',
        conditionValue: 10, // Rank <= 10
        category: 'ranking'
    },
    {
        id: 'rank_top1',
        title: 'O Número Um',
        description: 'Alcance o 1º lugar no Ranking.',
        rarity: 'Lendário',
        rewardCoins: 30,
        rewardXP: 1000,
        trigger: 'ranking',
        conditionValue: 1,
        category: 'ranking'
    },

    // --- NÍVEL ---
    {
        id: 'lvl_5',
        title: 'Subindo de Nível',
        description: 'Alcance o nível 5.',
        rarity: 'Comum',
        rewardCoins: 5,
        rewardXP: 0,
        trigger: 'level_up',
        conditionValue: 5,
        category: 'social'
    },
    {
        id: 'lvl_10',
        title: 'Força Crescente',
        description: 'Alcance o nível 10.',
        rarity: 'Incomum',
        rewardCoins: 15,
        rewardXP: 0,
        trigger: 'level_up',
        conditionValue: 10,
        category: 'social'
    }
];
