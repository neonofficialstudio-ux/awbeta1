
import { getRepository } from "../api/database/repository.factory";
import { MissionDB } from "../api/missions/missions.db";

const repo = getRepository();

export const AdminMissionTools = {
    /**
     * Gera dezenas de submissões falsas para testar paginação e filtros.
     */
    simulateMassiveSubmissions: async (count: number = 20) => {
        console.log(`[DEVTOOLS] Generating ${count} mock submissions...`);
        
        const missions = MissionDB.load();
        if (missions.length === 0) {
            console.error("No missions found to submit against.");
            return;
        }

        // Create a temporary user if needed or use existing
        let user = repo.select("users").find((u:any) => u.role === 'user');
        if (!user) {
            const userId = `mock-user-${Date.now()}`;
            repo.insert("users", { id: userId, name: "Mock User", role: "user", coins: 0, xp: 0, pendingMissions: [], completedMissions: [] });
            user = repo.select("users").find((u:any) => u.id === userId);
        }

        for (let i = 0; i < count; i++) {
            const mission = missions[Math.floor(Math.random() * missions.length)];
            const statusOptions: any[] = ['pending', 'pending', 'pending', 'approved', 'rejected']; // Weight towards pending
            const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

            const submission = {
                id: `sim-sub-${Date.now()}-${i}`,
                userId: user.id,
                missionId: mission.id,
                userName: `Sim User ${i}`,
                userAvatar: `https://i.pravatar.cc/150?u=${i}`,
                missionTitle: mission.title,
                submittedAt: new Date().toLocaleString('pt-BR'),
                submittedAtISO: new Date(Date.now() - Math.floor(Math.random() * 100000000)).toISOString(),
                proofUrl: Math.random() > 0.5 ? "https://instagram.com/p/mock" : "data:image/png;base64,fake",
                status: status
            };

            repo.insert("submissions", submission);
            
            // Update user state superficially
            if (status === 'pending') {
                const pending = user.pendingMissions || [];
                repo.update("users", (u:any) => u.id === user.id, (u:any) => ({...u, pendingMissions: [...pending, mission.id]}));
            }
        }

        console.log("[DEVTOOLS] Submissions generated.");
    },

    simulateAntiBypassTriggers: () => {
        console.log("[DEVTOOLS] Creating duplicate proof submissions...");
        const mission = MissionDB.load()[0];
        const proof = "https://instagram.com/p/DUPLICATE123";
        
        // Create 2 submissions with same proof
        for(let i=0; i<2; i++) {
             repo.insert("submissions", {
                id: `risk-sub-${i}`,
                userId: `user-${i}`,
                missionId: mission.id,
                userName: `Risky User ${i}`,
                missionTitle: mission.title,
                submittedAtISO: new Date().toISOString(),
                proofUrl: proof,
                status: 'pending'
            });
        }
        console.log("[DEVTOOLS] Duplicates created.");
    }
};
