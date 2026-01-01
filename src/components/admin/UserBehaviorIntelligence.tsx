
import React, { useState, useMemo } from 'react';
import type { User, MissionSubmission, CoinTransaction, UsableItemQueueEntry, ProcessedUsableItemQueueEntry } from '../../types';
import { ShieldIcon, SearchIcon, UsersIcon } from '../../constants';

interface UserBehaviorIntelligenceProps {
    allUsers: User[];
    missionSubmissions: MissionSubmission[];
    allTransactions: CoinTransaction[];
    usableItemQueue: UsableItemQueueEntry[];
    processedItemQueueHistory: ProcessedUsableItemQueueEntry[];
    behaviorLog: any[]; // Assuming behaviorLog structure
}

// --- LOCAL HELPER FUNCTIONS (Pure Logic) ---

const computeMissionEfficiency = (userId: string, submissions: MissionSubmission[]) => {
    const userSubs = submissions.filter(s => s.userId === userId);
    const total = userSubs.length;
    if (total === 0) return 0;
    const approved = userSubs.filter(s => s.status === 'approved').length;
    return Math.round((approved / total) * 100);
};

const computeRejectionCount = (userId: string, submissions: MissionSubmission[]) => {
    return submissions.filter(s => s.userId === userId && s.status === 'rejected').length;
};

const computeLCGenerated = (userId: string, transactions: CoinTransaction[]) => {
    return transactions
        .filter(t => t.userId === userId && t.type === 'earn')
        .reduce((acc, t) => acc + t.amount, 0);
};

const computeLCSpent = (userId: string, transactions: CoinTransaction[]) => {
    return transactions
        .filter(t => t.userId === userId && t.type === 'spend')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);
};

const computeQueueActivity = (userId: string, queue: any[], history: any[]) => {
    const active = queue.filter(q => q.userId === userId).length;
    const historical = history.filter(h => h.userId === userId).length;
    return active + historical;
};

const computeSpamScore = (userId: string, behaviorLog: any[]) => {
    return behaviorLog.filter(b => b.userId === userId).length;
};


// --- COMPONENT ---

const StatCard: React.FC<{ title: string; value: string | number; subtext?: string; type?: 'warning' | 'neutral' }> = ({ title, value, subtext, type = 'neutral' }) => (
    <div className={`p-4 rounded-lg border ${type === 'warning' ? 'bg-red-900/20 border-red-500/50' : 'bg-gray-800/50 border-gray-700'}`}>
        <h4 className={`text-sm font-semibold mb-1 ${type === 'warning' ? 'text-red-400' : 'text-gray-400'}`}>{title}</h4>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
);

const UserBehaviorIntelligence: React.FC<UserBehaviorIntelligenceProps> = ({
    allUsers,
    missionSubmissions,
    allTransactions,
    usableItemQueue,
    processedItemQueueHistory,
    behaviorLog = [] // Default to empty if not provided
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // --- DERIVED DATA ---
    const userMetrics = useMemo(() => {
        return allUsers
            .filter(u => u.role === 'user')
            .map(user => {
                const efficiency = computeMissionEfficiency(user.id, missionSubmissions);
                const rejections = computeRejectionCount(user.id, missionSubmissions);
                const lcGenerated = computeLCGenerated(user.id, allTransactions);
                const lcSpent = computeLCSpent(user.id, allTransactions);
                const queueCount = computeQueueActivity(user.id, usableItemQueue, processedItemQueueHistory);
                const spamCount = computeSpamScore(user.id, behaviorLog);
                
                // Risk Score (Simple Heuristic)
                let riskScore = 0;
                if (efficiency < 50 && user.totalMissionsCompleted > 5) riskScore += 2;
                if (rejections > 5) riskScore += 3;
                if (spamCount > 0) riskScore += 5;

                return {
                    ...user,
                    efficiency,
                    rejections,
                    lcGenerated,
                    lcSpent,
                    queueCount,
                    spamCount,
                    riskScore
                };
            });
    }, [allUsers, missionSubmissions, allTransactions, usableItemQueue, processedItemQueueHistory, behaviorLog]);

    // --- ALERTS ---
    const alerts = useMemo(() => {
        const highRisk = userMetrics.filter(u => u.riskScore >= 5);
        const highRejection = userMetrics.filter(u => u.rejections > 10);
        const inactiveHighLevel = userMetrics.filter(u => u.level > 10 && !u.lastCheckIn); // Example heuristic

        return { highRisk, highRejection, inactiveHighLevel };
    }, [userMetrics]);

    // --- TOP LISTS ---
    const topCreators = [...userMetrics].sort((a, b) => b.lcGenerated - a.lcGenerated).slice(0, 5);
    const topSpenders = [...userMetrics].sort((a, b) => b.lcSpent - a.lcSpent).slice(0, 5);
    const topEfficient = [...userMetrics].filter(u => u.totalMissionsCompleted > 10).sort((a, b) => b.efficiency - a.efficiency).slice(0, 5);


    // --- FILTERED LIST FOR TABLE ---
    const filteredList = userMetrics.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.artisticName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-bold text-goldenYellow-400 flex items-center">
                        <ShieldIcon className="w-6 h-6 mr-2" />
                        Inteligência de Comportamento
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Análise profunda de padrões de uso e risco.</p>
                 </div>
            </div>

            {/* SECTION 1: ALERTS & RISKS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                    title="Usuários de Alto Risco" 
                    value={alerts.highRisk.length} 
                    subtext="Comportamento suspeito detectado" 
                    type={alerts.highRisk.length > 0 ? 'warning' : 'neutral'}
                />
                 <StatCard 
                    title="Alta Taxa de Rejeição" 
                    value={alerts.highRejection.length} 
                    subtext="> 10 missões rejeitadas" 
                    type={alerts.highRejection.length > 0 ? 'warning' : 'neutral'}
                />
                 <StatCard 
                    title="Top Gerador de LC" 
                    value={topCreators[0]?.name || '-'} 
                    subtext={`${topCreators[0]?.lcGenerated.toLocaleString() || 0} LC geradas`} 
                />
            </div>

            {/* SECTION 2: TOP PERFORMERS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#181818] p-6 rounded-xl border border-gray-700">
                    <h3 className="font-bold text-white mb-4 flex items-center"><UsersIcon className="w-4 h-4 mr-2 text-goldenYellow-400"/> Top Geradores de Valor (LC)</h3>
                    <ul className="space-y-2">
                        {topCreators.map((u, i) => (
                            <li key={u.id} className="flex justify-between items-center text-sm p-2 bg-gray-800/30 rounded">
                                <span className="text-gray-300">{i+1}. {u.name}</span>
                                <span className="font-bold text-green-400">+{u.lcGenerated.toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-[#181818] p-6 rounded-xl border border-gray-700">
                    <h3 className="font-bold text-white mb-4 flex items-center"><UsersIcon className="w-4 h-4 mr-2 text-blue-400"/> Top Consumidores (LC Gasto)</h3>
                    <ul className="space-y-2">
                        {topSpenders.map((u, i) => (
                            <li key={u.id} className="flex justify-between items-center text-sm p-2 bg-gray-800/30 rounded">
                                <span className="text-gray-300">{i+1}. {u.name}</span>
                                <span className="font-bold text-red-400">-{u.lcSpent.toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* SECTION 3: BEHAVIOR PROFILES TABLE */}
            <div className="bg-[#181818] p-6 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Perfis de Comportamento</h3>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar artista..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded-lg py-1 pl-9 pr-3 text-sm text-white focus:border-goldenYellow-500 focus:outline-none"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3">Artista</th>
                                <th className="px-4 py-3 text-center">Nível</th>
                                <th className="px-4 py-3 text-center">Eficiência</th>
                                <th className="px-4 py-3 text-center">Rejeições</th>
                                <th className="px-4 py-3 text-center">Alertas</th>
                                <th className="px-4 py-3 text-center">Risco</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.map(user => (
                                <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-medium text-white">
                                        {user.name}
                                        <div className="text-xs text-gray-500">{user.plan}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-goldenYellow-400 font-bold">{user.level}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.efficiency > 80 ? 'bg-green-900/30 text-green-400' : user.efficiency < 50 ? 'bg-red-900/30 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
                                            {user.efficiency}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">{user.rejections}</td>
                                    <td className="px-4 py-3 text-center">
                                        {user.spamCount > 0 ? (
                                            <span className="text-red-400 font-bold">{user.spamCount}</span>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {user.riskScore >= 5 ? (
                                            <span className="text-red-500 font-bold uppercase text-xs">Alto</span>
                                        ) : user.riskScore >= 2 ? (
                                            <span className="text-yellow-500 font-bold uppercase text-xs">Médio</span>
                                        ) : (
                                            <span className="text-green-500 font-bold uppercase text-xs">Baixo</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredList.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhum usuário encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserBehaviorIntelligence;
