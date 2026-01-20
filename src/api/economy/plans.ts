
import { PLAN_MULTIPLIERS, PLAN_LIMITS } from "./economy-constants";

export function getPlanDetailsAPI() {
    const canonicalPlans = [
        "Free Flow",
        "Artista em Ascensão",
        "Artista Profissional",
        "Hitmaker"
    ];

    return canonicalPlans.map(key => {
        const multiplier = PLAN_MULTIPLIERS[key] || 1;
        const limits = PLAN_LIMITS[key];
        const missions = limits?.missionsPerDay === 'unlimited' ? 'Ilimitado' : limits?.missionsPerDay;
        
        const prices: Record<string, string> = {
            "Free Flow": "Gratuito",
            "Artista em Ascensão": "R$39/mês",
            "Artista Profissional": "R$79/mês",
            "Hitmaker": "R$119/mês"
        };
        
        return {
            id: key.toLowerCase().replace(/ /g, '_'),
            name: key,
            multiplier: multiplier,
            dailyMissions: missions,
            price: prices[key] || "Sob Consulta",
            maxLCCap: key === 'Free Flow' ? 200 : key === 'Artista em Ascensão' ? 400 : key === 'Artista Profissional' ? 600 : 2000
        };
    });
}
