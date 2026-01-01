
import { getRepository } from "../database/repository.factory";
import { getLedgerByUsersAPI } from "../economy/ledger";

const repo = getRepository();

export const UserInspectorV3 = {
    getFullProfile: (userId: string) => {
        const user = repo.select("users").find((u: any) => u.id === userId);
        if (!user) return null;

        const transactions = getLedgerByUsersAPI(userId);
        const submissions = repo.select("submissions").filter((s: any) => s.userId === userId);
        const redemptions = repo.select("redeemedItems").filter((r: any) => r.userId === userId);
        const events = repo.select("participations").filter((p: any) => p.userId === userId);
        const queue = repo.select("queue").filter((q: any) => q.userId === userId);

        return {
            profile: user,
            stats: {
                totalTx: transactions.length,
                totalSubmissions: submissions.length,
                totalRedemptions: redemptions.length,
                eventsJoined: events.length
            },
            history: {
                transactions: transactions.slice(0, 50), // Limit for performace
                submissions: submissions.slice(0, 50),
                redemptions,
                queue
            }
        };
    }
};
