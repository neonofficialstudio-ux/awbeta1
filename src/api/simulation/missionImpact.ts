
import type { Mission } from '../../types';
import { BASE_MISSION_REWARDS } from '../economy/economy';

interface ImpactAnalysis {
  score: {
    economy: number;       // 0–100
    missionFlow: number;   // 0–100
    ranking: number;       // 0–100
    store: number;         // 0–100
    narrative: number;     // 0–100
    adminLoad: number;     // 0–100
  };
  riskLevel: "OK" | "ATENÇÃO" | "ALTO" | "CRÍTICO";
  warnings: string[];
  recommendations: string[];
}

const THRESHOLDS = {
    HIGH_XP: 300,
    HIGH_COINS: 100,
    SHORT_DESC: 20,
    FORBIDDEN_TERMS: ['sorteio', 'pix', 'dinheiro', 'fake', 'bot'],
};

/**
 * Analyzes a generated mission to predict its systemic impact.
 * Does not modify the mission, only returns analytics.
 */
export const analyzeMissionImpact = (mission: Mission): ImpactAnalysis => {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const scores = {
        economy: 0,
        missionFlow: 0,
        ranking: 0,
        store: 0,
        narrative: 0,
        adminLoad: 0,
    };

    // 1. Economy Analysis
    const xpScore = Math.min(100, (mission.xp / 400) * 100);
    const coinsScore = Math.min(100, (mission.coins / 150) * 100);
    scores.economy = Math.round((xpScore + coinsScore) / 2);

    if (mission.xp > THRESHOLDS.HIGH_XP) {
        warnings.push(`XP sugerido (${mission.xp}) é muito alto. Pode inflacionar o nível médio.`);
        recommendations.push('Considerar reduzir XP para < 300.');
    }
    if (mission.coins > THRESHOLDS.HIGH_COINS) {
        warnings.push(`LC sugerida (${mission.coins}) é alta. Pode acelerar compras na loja.`);
        recommendations.push('Verificar se a dificuldade justifica a recompensa em LC.');
    }

    // 2. Mission Flow & Admin Load
    // Social media missions generally require manual link checking -> Higher load
    if (['instagram', 'tiktok'].includes(mission.type)) {
        scores.adminLoad += 60;
        scores.missionFlow += 70; // High engagement potential
    } else {
        scores.adminLoad += 30; // Creative/Special usually image based
        scores.missionFlow += 40;
    }

    // Description length affects clarity and review speed
    if (mission.description.length < 50) {
        scores.adminLoad += 20; // Harder to verify intent if description is vague
        warnings.push('Descrição curta pode gerar dúvidas e aumentar rejeições.');
        recommendations.push('Detalhar melhor o que é esperado na descrição.');
    }

    // Cap scores
    scores.adminLoad = Math.min(100, scores.adminLoad);
    scores.missionFlow = Math.min(100, scores.missionFlow);

    // 3. Ranking Impact
    // Directly correlated to XP
    scores.ranking = xpScore;
    if (scores.ranking > 80) {
        warnings.push('Alto impacto no Ranking. Usuários Free podem ficar para trás rapidamente.');
    }

    // 4. Store Impact
    // Directly correlated to Coins
    scores.store = coinsScore;
    if (scores.store > 80) {
        warnings.push('Alto fluxo de LC para a loja. Monitorar estoque de itens limitados.');
    }

    // 5. Narrative / Safety
    let narrativeScore = 50; // Base
    if (mission.description.length > 100) narrativeScore += 30;
    if (mission.title.length > 20) narrativeScore += 20;
    
    // Check forbidden terms
    const lowerDesc = (mission.title + " " + mission.description).toLowerCase();
    const foundForbidden = THRESHOLDS.FORBIDDEN_TERMS.filter(term => lowerDesc.includes(term));
    
    if (foundForbidden.length > 0) {
        narrativeScore = 0;
        warnings.push(`Termos proibidos detectados: ${foundForbidden.join(', ')}.`);
        recommendations.push('Remover termos de engajamento artificial ou proibidos.');
    }
    
    scores.narrative = Math.min(100, narrativeScore);

    // 6. Risk Level Calculation
    let riskLevel: ImpactAnalysis['riskLevel'] = "OK";
    const avgScore = (scores.economy + scores.adminLoad + scores.ranking + scores.store) / 4;

    if (foundForbidden.length > 0) {
        riskLevel = "CRÍTICO";
    } else if (avgScore > 80) {
        riskLevel = "ALTO";
    } else if (avgScore > 60 || warnings.length > 2) {
        riskLevel = "ATENÇÃO";
    }

    return {
        score: scores,
        riskLevel,
        warnings,
        recommendations
    };
};
