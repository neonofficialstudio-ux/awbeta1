
import type { Notification, MissionSubmission, Mission } from '../types';
import { withLatency, createNotification, updateUserInDb } from './helpers';
import { getDailyMissionLimit } from './economy/economy';
import { validateMissionSubmission } from './quality/validateInputs';
import { logMissionEvent } from './telemetry/missionTelemetry';
import { checkLinkSafety, applyContentRules, sanitizeLink } from './quality';
import { detectMissionSpam, detectExpiredAttempt } from "./telemetry/userBehavior";
import { getRepository } from './database/repository.factory';
import { SanityGuard } from '../services/sanity.guard';

const repo = getRepository();

export const fetchDashboardData = () => withLatency(async () => {
    const now = new Date();
    
    // Busca dados via Repositório (Abstrai se é Supabase ou Mock)
    const rawMissions = await repo.selectAsync("missions");
    const rawAds = await repo.selectAsync("advertisements");
    const rawUsers = await repo.selectAsync("users");
    
    // Processa Missões (Checagem de Expiração)
    const activeMissions = rawMissions.map((m: any) => {
      const mission = SanityGuard.mission(m);
      const deadline = new Date(mission.deadline);
      if (now > deadline && mission.status === 'active') {
        return { ...mission, status: 'expired' as const };
      }
      return mission;
    });

    // Missão em Destaque
    const featuredMission = activeMissions.find(m => m.type === 'special' && m.status === 'active') || activeMissions.find(m => m.status === 'active') || null;

    // Artistas do Dia
    // No modo Supabase, isso viria de uma tabela de configuração, aqui simulamos filtrando ids conhecidos
    const artistsOfTheDay = rawUsers.filter((u: any) => u.isArtistOfTheDay === true || u.id === 'user-1'); 

    return {
        advertisements: rawAds.filter((ad: any) => ad.isActive),
        featuredMission,
        artistsOfTheDay: artistsOfTheDay.map(SanityGuard.user),
        artistCarouselDuration: 10,
        artistsOfTheDayIds: artistsOfTheDay.map((u:any) => u.id),
        processedArtistOfTheDayQueue: [],
    };
});

export const fetchMissions = (userId: string) => withLatency(async () => {
    const users = await repo.selectAsync("users");
    const user = users.find((u: any) => u.id === userId);
    
    if (!user) throw new Error("User not found");
    const safeUser = SanityGuard.user(user);

    const limit = getDailyMissionLimit(safeUser.plan);
    let hasReachedDailyLimit = false;

    // Busca Submissões e Missões
    const allSubmissions = await repo.selectAsync("submissions");
    const userSubmissions = allSubmissions.filter((s: any) => s.userId === userId);

    if (limit !== null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const submissionsToday = userSubmissions.filter((s: any) => {
             const d = new Date(s.submittedAtISO);
             return !isNaN(d.getTime()) && d >= today;
        }).length;
        
        if (submissionsToday >= limit) {
            hasReachedDailyLimit = true;
        }
    }

    const now = new Date();
    const allMissions = await repo.selectAsync("missions");
    
    // Filtra missões visíveis (não agendadas para o futuro)
    const visibleMissions = allMissions
        .map((m: any) => SanityGuard.mission(m))
        .filter((mission: Mission) => {
            if (!mission.scheduledFor) return true;
            return new Date(mission.scheduledFor) <= now;
        });

    return {
        missions: visibleMissions,
        submissions: userSubmissions,
        hasReachedDailyLimit,
    };
});

export const submitMission = (userId: string, missionId: string, proof: string) => withLatency(async () => {
    // 1. Validações
    const sanitizedProof = proof.startsWith('data:') ? proof : sanitizeLink(proof);
    
    // Segurança de Conteúdo
    const rulesCheck = applyContentRules({ proof: sanitizedProof }, userId);
    if (!rulesCheck.ok) throw new Error(rulesCheck.reason);

    if (!proof.startsWith('data:')) {
        const safetyCheck = checkLinkSafety(sanitizedProof);
        if (!safetyCheck.safe) throw new Error(safetyCheck.reason);
    }
    
    const users = await repo.selectAsync("users");
    const missions = await repo.selectAsync("missions");
    
    const user = users.find((u: any) => u.id === userId);
    const mission = missions.find((m: any) => m.id === missionId);
    
    if (!user || !mission) throw new Error("User or mission not found");

    const safeUser = SanityGuard.user(user);
    const safeMission = SanityGuard.mission(mission);

    // Anti-spam/duplicata
    if (safeUser.pendingMissions.includes(missionId) || safeUser.completedMissions.includes(missionId)) {
        throw new Error("Você já enviou ou completou esta missão.");
    }

    if (new Date() > new Date(safeMission.deadline)) {
        detectExpiredAttempt(userId);
        throw new Error("Esta missão expirou.");
    }

    // Limite Diário
    const limit = getDailyMissionLimit(safeUser.plan);
    const allSubmissions = await repo.selectAsync("submissions");
    
    if (limit !== null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const submissionsToday = allSubmissions.filter((s: any) => 
          s.userId === userId && new Date(s.submittedAtISO) >= today
      ).length;

      if (submissionsToday >= limit) {
        throw new Error(`Limite diário atingido.`);
      }
    }

    // Validação de Formato
    let missionFormat = safeMission.format || 'link';
    const validationResult = validateMissionSubmission({ proof: sanitizedProof, missionFormat });
    if (!validationResult.ok) {
        throw new Error(validationResult.reason);
    }

    // 2. Execução (Inserção via Repository)
    const newSubmission: MissionSubmission = {
      id: `ms-${Date.now()}`, 
      userId, 
      missionId, 
      userName: safeUser.name, 
      userAvatar: safeUser.avatarUrl,
      missionTitle: safeMission.title, 
      submittedAt: 'agora mesmo', 
      submittedAtISO: new Date().toISOString(),
      proofUrl: sanitizedProof, 
      status: 'pending',
    };
    
    await repo.insertAsync("submissions", newSubmission);
    
    // Atualiza Usuário (Pendente)
    const updatedUser = { 
        ...safeUser, 
        pendingMissions: [...safeUser.pendingMissions, missionId] 
    };
    await repo.updateAsync("users", (u: any) => u.id === userId, (u: any) => updatedUser);

    // Telemetria
    logMissionEvent({ timestamp: Date.now(), missionId, userId, action: "mission_sent" });

    return { 
        updatedUser: updatedUser, 
        newSubmission, 
        notifications: [], 
        hasReachedDailyLimit: false 
    };
});

export const dailyCheckIn = (userId: string) => {
    // Stub legado - Lógica movida para Users API / Economy Engine
    return { success: false };
};

export const fetchAchievementsData = () => withLatency(async () => {
    return await repo.selectAsync("achievements");
});
