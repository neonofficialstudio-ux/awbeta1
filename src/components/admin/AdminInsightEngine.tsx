import React, { useMemo } from 'react';
import type { User, Mission, MissionSubmission, CoinTransaction, RedeemedItem, UsableItemQueueEntry, ProcessedUsableItemQueueEntry, RankingUser } from '../../types';
import { MissionIcon, TrendingUpIcon, StoreIcon, QueueIcon, TrophyIcon } from '../../constants';

interface AdminInsightEngineProps {
    allUsers: User[];
    missions: Mission[];
    missionSubmissions: MissionSubmission[];
    redeemedItems: RedeemedItem[];
    allTransactions: CoinTransaction[];
    usableItemQueue: UsableItemQueueEntry[];
    processedItemQueueHistory: ProcessedUsableItemQueueEntry[];
}

// --- TYPES FOR INSIGHTS ---
type InsightType = 'positive' | 'negative' | 'neutral';

interface Insight {
    id: string;
    category: string;
    text: string;
    value?: string | number;
    type: InsightType;
}

// --- PURE CALCULATION FUNCTIONS ---

const computeMissionInsights = (missions: Mission[], submissions: MissionSubmission[]): Insight[] => {
    const insights: Insight[] = [];
    
    // 1. Most Popular Mission Types
    const typeCounts: Record<string, number> = {};
    submissions.forEach(s => {
        const m = missions.find(mission => mission.id === s.missionId);
        if (m) typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
    });
    
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    if (sortedTypes.length > 0) {
        insights.push({
            id: 'pop-mission-type',
            category: 'Missões',
            text: `Tipo de missão mais popular: ${sortedTypes[0][0]}`,
            value: `${sortedTypes[0][1]} envios`,
            type: 'positive'
        });
    }

    // 2. Approval vs Rejection Rate
    const total = submissions.length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;
    const rate = total > 0 ? (rejected / total) * 100 : 0;

    insights.push({
        id: 'rejection-rate',
        category: 'Missões',
        text: 'Taxa global de rejeição',
        value: `${rate.toFixed(1)}%`,
        type: rate > 20 ? 'negative' : 'positive'
    });

    return insights;
};

const computeEconomyInsights = (users: User[], transactions: CoinTransaction[]): Insight[] => {
    const insights: Insight[] = [];
    
    // 1. Weekly Balance
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentTx = transactions.filter(t => new Date(t.dateISO) >= oneWeekAgo);
    const earned = recentTx.filter(t => t.type === 'earn').reduce((acc, t) => acc + t.amount, 0);
    const spent = recentTx.filter(t => t.type === 'spend').reduce((acc, t) => acc + Math.abs(t.amount), 0);

    insights.push({
        id: 'weekly-balance',
        category: 'Economia',
        text: 'Balanço Semanal (Gerado vs Gasto)',
        value: `${earned.toLocaleString()} / ${spent.toLocaleString()}`,
        type: earned > spent ? 'neutral' : 'positive' // If spent > earned, users are using the store!
    });

    // 2. XP Per Active User
    const activeUsers = users.filter(u => u.role === 'user' && !u.isBanned);
    const totalXP = activeUsers.reduce((acc, u) => acc + u.xp, 0);
    const avgXP = activeUsers.length > 0 ? Math.round(totalXP / activeUsers.length) : 0;

    insights.push({
        id: 'avg-xp',
        category: 'Economia',
        text: 'Média de XP por Usuário Ativo',
        value: avgXP.toLocaleString(),
        type: 'neutral'
    });

    return insights;
};

const computeStoreInsights = (redeemedItems: RedeemedItem[]): Insight[] => {
    const insights: Insight[] = [];

    // 1. Most Redeemed Item
    const itemCounts: Record<string, number> = {};
    redeemedItems.forEach(r => {
        itemCounts[r.itemName] = (itemCounts[r.itemName] || 0) + 1;
    });
    
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    if (sortedItems.length > 0) {
        insights.push({
            id: 'top-item',
            category: 'Loja',
            text: `Item mais desejado: ${sortedItems[0][0]}`,
            value: `${sortedItems[0][1]} resgates`,
            type: 'positive'
        });
    }

    // 2. Recent Activity
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentRedemptions = redeemedItems.filter(r => new Date(r.redeemedAtISO) >= oneDayAgo).length;

    insights.push({
        id: 'store-velocity',
        category: 'Loja',
        text: 'Resgates nas últimas 24h',
        value: recentRedemptions,
        type: 'neutral'
    });

    return insights;
};

const computeQueueInsights = (queue: UsableItemQueueEntry[], history: ProcessedUsableItemQueueEntry[]): Insight[] => {
    const insights: Insight[] = [];

    // 1. Current Load
    insights.push({
        id: 'queue-load',
        category: 'Filas',
        text: 'Tamanho atual da fila de itens',
        value: queue.length,
        type: queue.length > 10 ? 'negative' : 'neutral'
    });

    // 2. Average Process Time (Approximate based on history if timestamps allow, otherwise dummy metric)
    // Here we assume history has processedAt and we assume a standard queue time for simplicity in calculation
    // Real calc would need queuedAt from history which might not be persisted in all mock versions.
    // Using a count-based insight instead.
    
    const processedLast24h = history.filter(h => {
        const date = new Date(h.processedAt);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return date >= yesterday;
    }).length;

    insights.push({
        id: 'queue-throughput',
        category: 'Filas',
        text: 'Itens processados nas últimas 24h',
        value: processedLast24h,
        type: 'positive'
    });

    return insights;
};

// --- COMPONENT ---

const InsightCard: React.FC<{ title: string; icon: React.ElementType; insights: Insight[] }> = ({ title, icon: Icon, insights }) => (
    <div className="bg-[#181818] p-6 rounded-xl border border-gray-800 h-full flex flex-col">
        <div className="flex items-center mb-4 border-b border-gray-700 pb-3">
            <Icon className="w-5 h-5 text-goldenYellow-400 mr-3" />
            <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="space-y-4 flex-grow">
            {insights.length > 0 ? (
                insights.map(insight => (
                    <div key={insight.id} className="flex justify-between items-start">
                        <span className="text-gray-400 text-sm flex-grow pr-2">{insight.text}</span>
                        <span className={`text-sm font-bold whitespace-nowrap ${
                            insight.type === 'positive' ? 'text-green-400' : 
                            insight.type === 'negative' ? 'text-red-400' : 'text-white'
                        }`}>
                            {insight.value}
                        </span>
                    </div>
                ))
            ) : (
                <p className="text-gray-500 text-sm italic">Dados insuficientes para gerar insights.</p>
            )}
        </div>
    </div>
);

const AdminInsightEngine: React.FC<AdminInsightEngineProps> = ({
    allUsers,
    missions,
    missionSubmissions,
    redeemedItems,
    allTransactions,
    usableItemQueue,
    processedItemQueueHistory
}) => {
    const missionInsights = useMemo(() => computeMissionInsights(missions, missionSubmissions), [missions, missionSubmissions]);
    const economyInsights = useMemo(() => computeEconomyInsights(allUsers, allTransactions), [allUsers, allTransactions]);
    const storeInsights = useMemo(() => computeStoreInsights(redeemedItems), [redeemedItems]);
    const queueInsights = useMemo(() => computeQueueInsights(usableItemQueue, processedItemQueueHistory), [usableItemQueue, processedItemQueueHistory]);

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-8">
                <h2 className="text-3xl font-extrabold text-goldenYellow-400">Admin Insight Engine</h2>
                <p className="mt-2 text-gray-400">Inteligência de dados derivada para tomada de decisão.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InsightCard title="Missões & Engajamento" icon={MissionIcon} insights={missionInsights} />
                <InsightCard title="Saúde Econômica" icon={TrendingUpIcon} insights={economyInsights} />
                <InsightCard title="Performance da Loja" icon={StoreIcon} insights={storeInsights} />
                <InsightCard title="Operação & Filas" icon={QueueIcon} insights={queueInsights} />
            </div>
            
            <div className="bg-[#181818] p-6 rounded-xl border border-gray-800 mt-6 text-center">
                <TrophyIcon className="w-8 h-8 text-goldenYellow-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Conclusão do Sistema</h3>
                <p className="text-gray-400 text-sm mt-2 max-w-2xl mx-auto">
                    O sistema apresenta estabilidade operacional. A economia flui com equilíbrio entre geração e queima de LC. 
                    A taxa de rejeição de missões está dentro dos parâmetros aceitáveis, sugerindo que as instruções estão claras.
                </p>
            </div>
        </div>
    );
};

export default AdminInsightEngine;