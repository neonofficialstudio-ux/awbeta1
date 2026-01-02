
import React, { useState, useMemo } from 'react';
import { CoinIcon, XPIcon, MissionIcon, StoreIcon, TrendingUpIcon } from '../../constants';
import { readLogFile } from '../../api/logs/virtualDisk';
import type { User, Mission, MissionSubmission, StoreItem, UsableItem, CoinTransaction, RedeemedItem } from '../../types';
import { SanitizeString } from '../../core/sanitizer.core';

interface EconomyConsoleProps {
    allUsers: User[];
    missions: Mission[];
    missionSubmissions: MissionSubmission[];
    storeItems: StoreItem[];
    usableItems: UsableItem[];
    allTransactions: CoinTransaction[];
    redeemedItems: RedeemedItem[];
}

const MiniCard: React.FC<{ title: string; value: string | number; icon?: React.ElementType; color?: string }> = ({ title, value, icon: Icon, color = 'text-white' }) => (
    <div className="bg-[#181818] border border-gray-700 rounded-lg p-4 flex items-center justify-between">
        <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        {Icon && <div className="bg-gray-800 p-2 rounded-md"><Icon className="w-5 h-5 text-gray-400" /></div>}
    </div>
);

const ConsoleTable: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
    <div className="overflow-x-auto bg-[#181818] border border-gray-700 rounded-lg">
        <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-800/50 border-b border-gray-700">
                <tr>
                    {headers.map((h, i) => <th key={i} className="px-6 py-3 font-bold">{h}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {children}
            </tbody>
        </table>
    </div>
);

const EconomyConsole: React.FC<EconomyConsoleProps> = ({ allUsers, missions, missionSubmissions, storeItems, usableItems, allTransactions, redeemedItems }) => {
    const [logFile, setLogFile] = useState<'sanity' | 'auto-heal'>('sanity');
    
    // --- A) Economy Summary ---
    const totalCoins = useMemo(() => allUsers.reduce((acc, u) => acc + u.coins, 0), [allUsers]);
    const totalXp = useMemo(() => allUsers.reduce((acc, u) => acc + u.xp, 0), [allUsers]);
    const totalRedemptions = redeemedItems.length;
    const totalCompleted = useMemo(() => missionSubmissions.filter(s => s.status === 'approved').length, [missionSubmissions]);
    const totalUsersCount = allUsers.filter(u => u.role === 'user').length;

    // --- B) Daily Pulse ---
    const todayPulse = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        
        const coinsGenerated = allTransactions
            .filter(t => t.type === 'earn' && SanitizeString(t.dateISO).startsWith(today))
            .reduce((acc, t) => acc + t.amount, 0);

        const xpGenerated = missionSubmissions
            .filter(s => s.status === 'approved' && SanitizeString(s.submittedAtISO).startsWith(today))
            .reduce((acc, s) => {
                const m = missions.find(mis => mis.id === s.missionId);
                return acc + (m ? m.xp : 0);
            }, 0);

        const missionsToday = missionSubmissions.filter(s => SanitizeString(s.submittedAtISO).startsWith(today) && s.status === 'approved').length;
        const purchasesToday = redeemedItems.filter(r => SanitizeString(r.redeemedAtISO).startsWith(today)).length;

        return { coinsGenerated, xpGenerated, missionsToday, purchasesToday };
    }, [allTransactions, missionSubmissions, missions, redeemedItems]);

    // --- C) Store Insights ---
    const storeStats = useMemo(() => {
        const allItems = [...storeItems, ...usableItems];
        return allItems.map(item => {
            const purchases = redeemedItems.filter(r => r.itemId === item.id);
            const count = purchases.length;
            const totalDrained = purchases.reduce((acc, r) => acc + r.itemPrice, 0);
            return {
                ...item,
                category: 'rarity' in item ? 'Visual' : 'Utilizável',
                count,
                totalDrained
            };
        }).sort((a, b) => b.totalDrained - a.totalDrained);
    }, [storeItems, usableItems, redeemedItems]);

    // --- D) Missions Insights ---
    const missionStats = useMemo(() => {
        return missions.map(mission => {
            const completions = missionSubmissions.filter(s => s.missionId === mission.id && s.status === 'approved');
            const count = completions.length;
            const lcGen = count * ('coins' in mission ? mission.coins : 0);
            const xpGen = count * mission.xp;
            
            return {
                ...mission,
                count,
                lcGen,
                xpGen
            };
        }).sort((a, b) => b.count - a.count);
    }, [missions, missionSubmissions]);

    // --- E) Log Content ---
    const logContent = useMemo(() => {
        const filename = logFile === 'sanity' ? 'logs/sanity-check.log' : 'logs/auto-heal.log';
        const content = readLogFile(filename);
        const lines = SanitizeString(content).split('\n');
        return lines.slice(-50).join('\n'); // Last 50 lines
    }, [logFile]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-goldenYellow-400 font-chakra">Economy Console</h2>
                <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-600 rounded text-xs font-mono uppercase">System Online</span>
            </div>

            {/* BLOCK A: SUMMARY */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MiniCard title="Coins em Circulação" value={totalCoins.toLocaleString()} icon={CoinIcon} color="text-goldenYellow-400" />
                <MiniCard title="XP Total Gerado" value={totalXp.toLocaleString()} icon={XPIcon} color="text-blue-400" />
                <MiniCard title="Total Usuários" value={totalUsersCount} />
                <MiniCard title="Missões Concluídas" value={totalCompleted} icon={MissionIcon} />
                <MiniCard title="Resgates Totais" value={totalRedemptions} icon={StoreIcon} />
            </div>

            {/* BLOCK B: DAILY PULSE */}
            <div className="bg-[#181818] border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center"><TrendingUpIcon className="w-5 h-5 mr-2 text-goldenYellow-400"/> Daily Economy Pulse (Hoje)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-gray-700">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">LC Gerado</p>
                        <p className="text-2xl font-bold text-green-400">+{todayPulse.coinsGenerated.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">XP Gerado (Est.)</p>
                        <p className="text-2xl font-bold text-blue-400">+{todayPulse.xpGenerated.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Missões</p>
                        <p className="text-2xl font-bold text-white">{todayPulse.missionsToday}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Compras Loja</p>
                        <p className="text-2xl font-bold text-yellow-400">{todayPulse.purchasesToday}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* BLOCK C: STORE INSIGHTS */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Store Insights</h3>
                    <div className="max-h-80 overflow-y-auto border border-gray-700 rounded-lg">
                        <ConsoleTable headers={['Item', 'Tipo', 'Preço', 'Vendas', 'LC Drenado']}>
                            {storeStats.map(item => (
                                <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-white truncate max-w-[150px]">{item.name}</td>
                                    <td className="px-6 py-3 text-xs">{item.category}</td>
                                    <td className="px-6 py-3 text-goldenYellow-400 font-mono">{item.price}</td>
                                    <td className="px-6 py-3 text-center">{item.count}</td>
                                    <td className="px-6 py-3 text-red-400 font-mono text-right">-{item.totalDrained.toLocaleString()}</td>
                                </tr>
                            ))}
                        </ConsoleTable>
                    </div>
                </div>

                {/* BLOCK D: MISSION INSIGHTS */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Missions Insights</h3>
                    <div className="max-h-80 overflow-y-auto border border-gray-700 rounded-lg">
                        <ConsoleTable headers={['Missão', 'Tipo', 'Completada', 'Gerado (LC/XP)']}>
                            {missionStats.map(m => (
                                <tr key={m.id} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-white truncate max-w-[150px]">{m.title}</td>
                                    <td className="px-6 py-3 text-xs uppercase bg-gray-800 rounded px-2 py-1">{m.type}</td>
                                    <td className="px-6 py-3 text-center font-bold">{m.count}</td>
                                    <td className="px-6 py-3 text-right text-xs font-mono">
                                        <span className="text-green-400">{m.lcGen} LC</span> / <span className="text-blue-400">{m.xpGen} XP</span>
                                    </td>
                                </tr>
                            ))}
                        </ConsoleTable>
                    </div>
                </div>
            </div>

            {/* BLOCK E: LOG VIEWER */}
            <div className="bg-[#0d0d0d] border border-gray-700 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                        System Logs
                    </h3>
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => setLogFile('sanity')} 
                            className={`px-3 py-1 text-xs font-bold rounded uppercase tracking-wider transition-colors ${logFile === 'sanity' ? 'bg-goldenYellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                        >
                            Sanity Check
                        </button>
                        <button 
                            onClick={() => setLogFile('auto-heal')} 
                            className={`px-3 py-1 text-xs font-bold rounded uppercase tracking-wider transition-colors ${logFile === 'auto-heal' ? 'bg-goldenYellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                        >
                            Auto Heal
                        </button>
                    </div>
                </div>
                <div className="bg-black rounded-lg p-4 font-mono text-xs h-64 overflow-y-auto border border-gray-800 shadow-inner">
                    <pre className="text-green-500 whitespace-pre-wrap">{logContent}</pre>
                </div>
            </div>
        </div>
    );
};

export default EconomyConsole;
