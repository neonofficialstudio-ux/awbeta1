
// api/simulation/releaseReadiness.ts

interface SimulationInput {
  stressResults?: any;      // StressMetrics
  userLoadResults?: any;    // SimulationResult
  heatmap?: any;            // HeatmapReport
  anomalies?: any;          // WatchdogReport
  missionImpactSamples?: any[]; // Array of ImpactAnalysis
}

interface ReadinessReport {
  summary: {
    level: "ALPHA" | "BETA_FECHADO" | "BETA_ABERTO" | "NAO_PRONTO";
    confidence: number; // 0–100
  };
  scores: {
    economyHealth: number;       // 0–100
    missionSystemHealth: number; // 0–100
    stabilityHealth: number;     // 0–100
    growthHealth: number;        // 0–100
    riskFromAnomalies: number;   // 0–100 (Higher is worse risk)
  };
  risks: string[];
  strengths: string[];
  recommendations: string[];
}

export function analyzeReleaseReadiness(input: SimulationInput): ReadinessReport {
  const risks: string[] = [];
  const strengths: string[] = [];
  const recommendations: string[] = [];

  // 1. Calculate Component Scores
  const economyScore = evaluateEconomy(input, risks, strengths);
  const missionScore = evaluateMissions(input, risks, strengths);
  const stabilityScore = evaluateStability(input, risks, strengths);
  const growthScore = evaluateGrowth(input, risks, strengths);
  const anomalyRiskScore = evaluateAnomalies(input, risks, strengths);

  // 2. Calculate Overall Confidence
  // Formula: Weighted average of health scores minus risk penalty
  const healthAverage = (economyScore + missionScore + stabilityScore + growthScore) / 4;
  const riskPenalty = anomalyRiskScore * 1.5; // Risk weighs heavy
  let confidence = Math.max(0, Math.min(100, healthAverage - riskPenalty));

  // 3. Determine Readiness Level
  let level: ReadinessReport['summary']['level'] = "NAO_PRONTO";

  if (confidence >= 90 && anomalyRiskScore < 10) {
    level = "BETA_ABERTO";
  } else if (confidence >= 70 && anomalyRiskScore < 30) {
    level = "BETA_FECHADO";
  } else if (confidence >= 40) {
    level = "ALPHA";
  } else {
    level = "NAO_PRONTO";
  }

  // 4. Generate Recommendations
  if (economyScore < 60) recommendations.push("Revisar balanceamento de XP/LC (risco de inflação/deflação).");
  if (missionScore < 60) recommendations.push("Diversificar tipos de missões e ajustar recompensas.");
  if (stabilityScore < 80) recommendations.push("Otimizar performance do servidor ou reduzir complexidade das ações.");
  if (anomalyRiskScore > 20) recommendations.push("Resolver anomalias críticas detectadas pelo Watchdog antes do release.");
  if (input.stressResults && !input.userLoadResults) recommendations.push("Executar simulação de Carga de Usuário para validar crescimento.");

  return {
    summary: {
      level,
      confidence: Math.round(confidence),
    },
    scores: {
      economyHealth: Math.round(economyScore),
      missionSystemHealth: Math.round(missionScore),
      stabilityHealth: Math.round(stabilityScore),
      growthHealth: Math.round(growthScore),
      riskFromAnomalies: Math.round(anomalyRiskScore),
    },
    risks,
    strengths,
    recommendations,
  };
}

// --- Sub-Evaluators ---

function evaluateEconomy(input: SimulationInput, risks: string[], strengths: string[]): number {
  let score = 100;

  if (input.stressResults) {
    const { totalLcGained, totalXpGained, actionsByType } = input.stressResults;
    const totalActions = actionsByType?.mission + actionsByType?.store + actionsByType?.checkin || 1;
    
    // Check Inflation Risk
    // Rough heuristic: If LC gained is massive compared to store actions
    const storeActions = actionsByType?.store || 0;
    if (storeActions > 0 && totalLcGained > storeActions * 5000) { // Earning way more than spending capacity
       score -= 20;
       risks.push("Economia: Risco de inflação de LC detectado em teste de estresse.");
    } else if (storeActions > 0) {
       strengths.push("Economia: Fluxo de LC parece suportar demanda da loja.");
    }
  }

  if (input.heatmap?.economy) {
     const { coinGenerationPeaks } = input.heatmap.economy;
     // If peaks vary too wildly
     if (coinGenerationPeaks.length > 0 && coinGenerationPeaks[0].value > 50000) {
        score -= 10;
        risks.push("Economia: Picos extremos de geração de moeda detectados.");
     }
  }

  return Math.max(0, score);
}

function evaluateMissions(input: SimulationInput, risks: string[], strengths: string[]): number {
  let score = 100;

  // Analyze samples from Mission Impact Analyzer if available
  if (input.missionImpactSamples && input.missionImpactSamples.length > 0) {
    const highRiskMissions = input.missionImpactSamples.filter(m => m.riskLevel === 'ALTO' || m.riskLevel === 'CRÍTICO');
    if (highRiskMissions.length > 0) {
      score -= (highRiskMissions.length * 5);
      risks.push(`Missões: ${highRiskMissions.length} missões geradas com risco ALTO ou CRÍTICO.`);
    } else {
      strengths.push("Missões: Amostras de impacto mostram baixo risco sistêmico.");
    }

    const avgAdminLoad = input.missionImpactSamples.reduce((acc, curr) => acc + curr.score.adminLoad, 0) / input.missionImpactSamples.length;
    if (avgAdminLoad > 70) {
      score -= 10;
      risks.push("Missões: Carga administrativa prevista é alta.");
    }
  }

  if (input.heatmap?.missions) {
      const types = input.heatmap.missions.mostUsedTypes;
      if (types && types.length === 1) {
          score -= 10;
          risks.push("Missões: Baixa diversidade de tipos de missão.");
      }
  }

  return Math.max(0, score);
}

function evaluateStability(input: SimulationInput, risks: string[], strengths: string[]): number {
  let score = 100;

  if (input.stressResults) {
    const { totalActions, missionFailures, storeFailures, queueFailures, checkinFailures } = input.stressResults;
    const totalFailures = (missionFailures || 0) + (storeFailures || 0) + (queueFailures || 0) + (checkinFailures || 0);
    
    if (totalActions > 0) {
        const failureRate = totalFailures / totalActions;
        if (failureRate > 0.05) { // > 5% failure
            score -= 40;
            risks.push(`Estabilidade: Taxa de falha alta (${(failureRate * 100).toFixed(1)}%) sob estresse.`);
        } else if (failureRate > 0.01) { // > 1% failure
            score -= 10;
            risks.push(`Estabilidade: Falhas esporádicas detectadas (${(failureRate * 100).toFixed(1)}%).`);
        } else {
            strengths.push("Estabilidade: Sistema resiliente sob carga simulada.");
        }
    }
  }

  return Math.max(0, score);
}

function evaluateGrowth(input: SimulationInput, risks: string[], strengths: string[]): number {
  let score = 100;

  if (input.userLoadResults) {
      // Check if economy held up during growth
      const finalUsers = input.userLoadResults.finalUserCount;
      if (finalUsers < 10) {
          score -= 20; // Simulation too small
          risks.push("Crescimento: Simulação de carga de usuários foi muito pequena para concluir.");
      } else {
          strengths.push(`Crescimento: Sistema simulado com sucesso para ${finalUsers} usuários.`);
      }
  } else {
      score = 50; // No data
  }

  if (input.heatmap?.growth?.anomalies?.length > 0) {
      score -= (input.heatmap.growth.anomalies.length * 5);
      risks.push(`Crescimento: ${input.heatmap.growth.anomalies.length} anomalias de crescimento detectadas no heatmap.`);
  }

  return Math.max(0, score);
}

function evaluateAnomalies(input: SimulationInput, risks: string[], strengths: string[]): number {
  let riskScore = 0;

  if (input.anomalies?.anomalies) {
      const critical = input.anomalies.anomalies.filter((a: any) => a.severity === 'critical').length;
      const high = input.anomalies.anomalies.filter((a: any) => a.severity === 'high').length;
      const medium = input.anomalies.anomalies.filter((a: any) => a.severity === 'medium').length;

      riskScore += (critical * 40);
      riskScore += (high * 15);
      riskScore += (medium * 5);

      if (critical > 0) {
          risks.push(`Anomalias: ${critical} anomalias CRÍTICAS detectadas. Bloqueio de release recomendado.`);
      }
      if (high > 0) {
          risks.push(`Anomalias: ${high} anomalias de ALTA severidade detectadas.`);
      }
      if (riskScore === 0) {
          strengths.push("Anomalias: Nenhuma anomalia significativa detectada pelo Watchdog.");
      }
  }

  return Math.min(100, riskScore);
}
