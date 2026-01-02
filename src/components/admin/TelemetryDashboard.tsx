
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { getMissionLog } from '../../api/telemetry/missionTelemetry';
import { getEconomyLog } from '../../api/telemetry/economyTelemetry';
import { getQueueLog } from '../../api/telemetry/queueTelemetry';
import { getBehaviorLog } from '../../api/telemetry/userBehavior';
import { TrendingUpIcon, QueueIcon, MissionIcon, ShieldIcon, SearchIcon, FilterIcon } from '../../constants';
import type { User } from '../../types';
import TelemetryDetailModal, { DrilldownItem } from './TelemetryDetailModal';
import { getDisplayName } from '../../api/core/getDisplayName';

interface TelemetryDashboardProps {
    allUsers?: User[];
}

const StatCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="bg-[#181818] p-6 rounded-xl border border-gray-700 flex flex-col h-full">
        <div className="flex items-center mb-4">
            <div className="p-3 bg-gray-800 rounded-lg mr-4">
                <Icon className="w-6 h-6 text-goldenYellow-400" />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="space-y-2 text-gray-300 flex-grow">
            {children}
        </div>
    </div>
);

const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({ allUsers = [] }) => {
    // Raw Logs State
    const [rawMissionLog, setRawMissionLog] = useState<any[]>([]);
    const [rawEconomyLog, setRawEconomyLog] = useState<any[]>([]);
    const [rawQueueLog, setRawQueueLog] = useState<any[]>([]);
    const [rawBehaviorLog, setRawBehaviorLog] = useState<any[]>([]);

    // Filter States
    const [filterPeriod, setFilterPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('all');
    const [filterType, setFilterType] = useState<'all' | 'missions' | 'economy' | 'queues' | 'security'>('all');
    const [filterUserSearch, setFilterUserSearch] = useState('');

    // Drilldown State
    const [drilldownOpen, setDrilldownOpen] = useState(false);
    const [drilldownTitle, setDrilldownTitle] = useState('');
    const [drilldownData, setDrilldownData] = useState<DrilldownItem[]>([]);

    // Chart Refs
    const [chartJsLoaded, setChartJsLoaded] = useState(false);
    const missionCanvasRef = useRef<HTMLCanvasElement>(null);
    const economyCanvasRef = useRef<HTMLCanvasElement>(null);
    const queueCanvasRef = useRef<HTMLCanvasElement>(null);
    const behaviorCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstancesRef = useRef<any[]>([]);

    // Initial Data Fetch
    useEffect(() => {
        setRawMissionLog(getMissionLog());
        setRawEconomyLog(getEconomyLog());
        setRawQueueLog(getQueueLog());
        setRawBehaviorLog(getBehaviorLog());

        // Dynamically load Chart.js if not present
        if (typeof (window as any).Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.async = true;
            script.onload = () => setChartJsLoaded(true);
            document.body.appendChild(script);
        } else {
            setChartJsLoaded(true);
        }

        return () => {
            chartInstancesRef.current.forEach(chart => chart.destroy());
            chartInstancesRef.current = [];
        };
    }, []);

    // Helper: Format User Data
    const getUserInfo = (userId: string) => {
        const user = allUsers.find(u => u.id === userId);
        return {
            name: user ? user.name : userId || 'Desconhecido',
            plan: user ? user.plan : 'N/A',
        };
    };

    // Helper: Prepare Drilldown Data
    const prepareDrilldown = (type: string, rawData: any[]) => {
        const formatted: DrilldownItem[] = rawData.map((item: any) => {
            const userInfo = getUserInfo(item.userId);
            let description = '';
            let value = '';
            let status = '';

            // Mapping based on log type
            if (item.action) { // Generic action check
                description = `Action: ${item.action}`;
                if (item.payload) {
                     if (item.payload.missionId) description += ` (Mission: ${item.payload.missionId})`;
                     if (item.payload.itemId) description += ` (Item: ${item.payload.itemId})`;
                     if (item.payload.itemName) description += ` (${item.payload.itemName})`;
                     if (item.payload.score) description += ` [Risk: ${item.payload.score}, Shield: ${item.payload.shield}]`;
                }
            }

            if (item.amount !== undefined) value = `${item.amount}`;
            if (item.queueType) status = item.queueType;

            return {
                id: item.timestamp + '-' + Math.random().toString(36).substr(2, 5),
                date: new Date(item.timestamp).toLocaleString('pt-BR'),
                timestamp: item.timestamp,
                userId: item.userId,
                userName: userInfo.name,
                userPlan: userInfo.plan,
                description,
                value,
                status
            };
        });
        setDrilldownData(formatted);
        setDrilldownOpen(true);
    };


    // Filtering Logic
    const filteredData = useMemo(() => {
        const now = Date.now();
        let startTime = 0;

        switch (filterPeriod) {
            case 'today':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                startTime = today.getTime();
                break;
            case '7d': startTime = now - 7 * 24 * 60 * 60 * 1000; break;
            case '30d': startTime = now - 30 * 24 * 60 * 60 * 1000; break;
            case '90d': startTime = now - 90 * 24 * 60 * 60 * 1000; break;
            case 'all': startTime = 0; break;
        }

        const targetUserIds = filterUserSearch.trim() 
            ? allUsers.filter(u => 
                u.name.toLowerCase().includes(filterUserSearch.toLowerCase()) || 
                u.id === filterUserSearch ||
                getDisplayName({ ...u, artistic_name: u.artisticName }).toLowerCase().includes(filterUserSearch.toLowerCase())
              ).map(u => u.id)
            : null;

        const filterLog = (log: any[]) => {
            return log.filter(entry => {
                if (entry.timestamp < startTime) return false;
                if (targetUserIds !== null) {
                    // If user search is active, entry must have a matching userId
                    if (!entry.userId || !targetUserIds.includes(entry.userId)) return false;
                }
                return true;
            });
        };

        return {
            missions: filterLog(rawMissionLog),
            economy: filterLog(rawEconomyLog),
            queues: filterLog(rawQueueLog),
            behavior: filterLog(rawBehaviorLog),
        };

    }, [rawMissionLog, rawEconomyLog, rawQueueLog, rawBehaviorLog, filterPeriod, filterUserSearch, allUsers]);

    // Computed Stats derived from Filtered Data
    const stats = useMemo(() => {
        const m = filteredData.missions;
        const e = filteredData.economy;
        const q = filteredData.queues;
        const b = filteredData.behavior;

        // Mission Stats
        const missionStats = {
            totalCreated: m.filter(x => x.action === "mission_created").length,
            totalSent: m.filter(x => x.action === "mission_sent").length,
            totalApproved: m.filter(x => x.action === "mission_approved").length,
            totalRejected: m.filter(x => x.action === "mission_rejected").length,
        };

        // Economy Stats
        const economyStats = {
            totalCoinsGained: e.filter(x => x.action === "coin_gain").reduce((acc, curr) => acc + curr.amount, 0),
            totalCoinsSpent: e.filter(x => x.action === "coin_spend").reduce((acc, curr) => acc + curr.amount, 0),
            totalXpGained: e.filter(x => x.action === "xp_gain").reduce((acc, curr) => acc + curr.amount, 0),
        };

        // Queue Stats
        const completions = q.filter(x => x.action === "queue_complete" && x.payload?.createdAt);
        const totalTime = completions.reduce((acc, curr) => {
            const created = new Date(curr.payload.createdAt).getTime();
            return !isNaN(created) ? acc + (curr.timestamp - created) : acc;
        }, 0);
        const avgQueueTime = completions.length > 0 ? Math.round(totalTime / completions.length) : 0;

        const queueStats = {
            visualPending: q.filter(x => x.queueType === 'visual' && x.action === 'queue_add').length - q.filter(x => x.queueType === 'visual' && x.action === 'queue_complete').length,
            totalCompleted: completions.length,
            avgTime: avgQueueTime,
        };

        // Behavior Stats
        const behaviorCount = b.length;

        return { missionStats, economyStats, queueStats, behaviorCount };
    }, [filteredData]);


    // Render Charts & Interaction Handlers
    useEffect(() => {
        if (!chartJsLoaded) return;
        const Chart = (window as any).Chart;
        if (!Chart) return;

        // Cleanup
        chartInstancesRef.current.forEach(chart => chart.destroy());
        chartInstancesRef.current = [];

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#9ca3af' } } },
            scales: {
                y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' }, beginAtZero: true },
                x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
            },
            // Interaction logic
            onClick: (e: any, elements: any[], chart: any) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = chart.data.labels[index];
                    
                    // Dispatch based on chart instance via canvas ID
                    const canvasId = chart.canvas.id;

                    if (canvasId === 'missionChart') {
                         if (index === 0) { // Approved
                             setDrilldownTitle('Missões Aprovadas');
                             prepareDrilldown('mission_approved', filteredData.missions.filter(x => x.action === 'mission_approved'));
                         } else if (index === 1) { // Rejected
                             setDrilldownTitle('Missões Rejeitadas');
                             prepareDrilldown('mission_rejected', filteredData.missions.filter(x => x.action === 'mission_rejected'));
                         } else if (index === 2) { // Sent (Pending Proxy)
                             setDrilldownTitle('Missões Enviadas');
                             prepareDrilldown('mission_sent', filteredData.missions.filter(x => x.action === 'mission_sent'));
                         }
                    } else if (canvasId === 'economyChart') {
                        if (index === 0) { // Generated
                             setDrilldownTitle('Lummi Coins Geradas');
                             prepareDrilldown('coin_gain', filteredData.economy.filter(x => x.action === 'coin_gain'));
                        } else if (index === 1) { // Spent
                             setDrilldownTitle('Lummi Coins Gastas');
                             prepareDrilldown('coin_spend', filteredData.economy.filter(x => x.action === 'coin_spend'));
                        }
                    } else if (canvasId === 'queueChart') {
                        setDrilldownTitle('Itens de Fila Processados');
                        prepareDrilldown('queue_complete', filteredData.queues.filter(x => x.action === 'queue_complete'));
                    } else if (canvasId === 'behaviorChart') {
                        const action = label;
                        setDrilldownTitle(`Eventos de Comportamento: ${action}`);
                        prepareDrilldown(action, filteredData.behavior.filter(x => x.action === action));
                    }
                }
            }
        };

        // 1. Mission Chart
        if (missionCanvasRef.current && (filterType === 'all' || filterType === 'missions')) {
            missionCanvasRef.current.id = 'missionChart';
            const pending = Math.max(0, stats.missionStats.totalSent - (stats.missionStats.totalApproved + stats.missionStats.totalRejected));
            chartInstancesRef.current.push(new Chart(missionCanvasRef.current, {
                type: 'doughnut',
                data: {
                    labels: ['Aprovadas', 'Rejeitadas', 'Pendentes'],
                    datasets: [{
                        data: [stats.missionStats.totalApproved, stats.missionStats.totalRejected, pending],
                        backgroundColor: ['#22c55e', '#ef4444', '#eab308'],
                        borderWidth: 0,
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: undefined, 
                    plugins: { legend: { position: 'right', labels: { color: '#9ca3af' } } }
                }
            }));
        }

        // 2. Economy Chart
        if (economyCanvasRef.current && (filterType === 'all' || filterType === 'economy')) {
            economyCanvasRef.current.id = 'economyChart';
            chartInstancesRef.current.push(new Chart(economyCanvasRef.current, {
                type: 'bar',
                data: {
                    labels: ['LC Geradas', 'LC Gastas'],
                    datasets: [{
                        label: 'Total',
                        data: [stats.economyStats.totalCoinsGained, Math.abs(stats.economyStats.totalCoinsSpent)],
                        backgroundColor: ['#22c55e', '#ef4444'],
                        borderRadius: 4
                    }]
                },
                options: { ...commonOptions, plugins: { legend: { display: false } } }
            }));
        }

        // 3. Queue Chart
        if (queueCanvasRef.current && (filterType === 'all' || filterType === 'queues')) {
            queueCanvasRef.current.id = 'queueChart';
            const completions = filteredData.queues.filter(e => e.action === 'queue_complete' && e.payload?.createdAt);
            const dataPoints = completions.map(e => Math.max(0, Math.round((e.timestamp - new Date(e.payload.createdAt).getTime()) / 1000 / 60)));
            
            chartInstancesRef.current.push(new Chart(queueCanvasRef.current, {
                type: 'line',
                data: {
                    labels: dataPoints.map((_, i) => `#${i+1}`),
                    datasets: [{
                        label: 'Tempo de Processamento (min)',
                        data: dataPoints,
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { ...commonOptions, plugins: { legend: { display: false } } }
            }));
        }

        // 4. Behavior Chart
        if (behaviorCanvasRef.current && (filterType === 'all' || filterType === 'security')) {
            behaviorCanvasRef.current.id = 'behaviorChart';
            const counts: Record<string, number> = {};
            filteredData.behavior.forEach(e => counts[e.action] = (counts[e.action] || 0) + 1);
            const labels = Object.keys(counts);
            const data = Object.values(counts);

            chartInstancesRef.current.push(new Chart(behaviorCanvasRef.current, {
                type: 'bar',
                data: {
                    labels: labels.length ? labels : ['Nenhum evento'],
                    datasets: [{
                        label: 'Ocorrências',
                        data: data.length ? data : [0],
                        backgroundColor: '#f87171',
                        borderRadius: 4
                    }]
                },
                options: {
                    ...commonOptions,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } }
                }
            }));
        }

    }, [chartJsLoaded, stats, filteredData, filterType]);


    return (
        <div className="space-y-8 animate-fade-in-up">
            <TelemetryDetailModal 
                isOpen={drilldownOpen}
                onClose={() => setDrilldownOpen(false)}
                title={drilldownTitle}
                data={drilldownData}
            />

            <div className="text-center max-w-3xl mx-auto mb-8">
                <h2 className="text-3xl font-extrabold text-goldenYellow-400">Painel de Telemetria V1.2</h2>
                <p className="mt-2 text-gray-400">Anti-Cheat Master Pack ativo. Monitoramento de Risco e Escudos.</p>
            </div>

            {/* FILTERS CARD */}
            <div className="bg-[#181818] p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Período</label>
                        <select 
                            value={filterPeriod} 
                            onChange={(e) => setFilterPeriod(e.target.value as any)} 
                            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-goldenYellow-500 focus:outline-none text-sm"
                        >
                            <option value="today">Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                            <option value="90d">Últimos 90 dias</option>
                            <option value="all">Todo o período</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Tipo de Telemetria</label>
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value as any)} 
                            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-goldenYellow-500 focus:outline-none text-sm"
                        >
                            <option value="all">Todos</option>
                            <option value="missions">Missões</option>
                            <option value="economy">Economia</option>
                            <option value="queues">Filas</option>
                            <option value="security">Segurança</option>
                        </select>
                    </div>

                    <div className="flex flex-col flex-grow relative">
                        <label className="text-xs text-gray-400 mb-1">Filtrar Usuário</label>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Nome, ID ou Nome Artístico..." 
                                value={filterUserSearch} 
                                onChange={(e) => setFilterUserSearch(e.target.value)}
                                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg pl-9 pr-3 py-2 focus:border-goldenYellow-500 focus:outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* V1.2: Risk Info Section (Visible if searching specific user) */}
            {filterUserSearch && allUsers.find(u => u.id === filterUserSearch || u.name.includes(filterUserSearch)) && (
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl mb-4">
                    <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                        <ShieldIcon className="w-5 h-5" /> Análise de Risco (V1.2)
                    </h3>
                    {(() => {
                         const target = allUsers.find(u => u.id === filterUserSearch || u.name.includes(filterUserSearch));
                         if (!target) return null;
                         return (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                 <div>
                                     <span className="text-gray-400 block">Risk Score:</span>
                                     <span className="text-white font-bold text-lg">{target.riskScore || 0}</span>
                                 </div>
                                 <div>
                                     <span className="text-gray-400 block">Shield Level:</span>
                                     <span className="text-white font-bold text-lg uppercase">{target.shieldLevel || 'NORMAL'}</span>
                                 </div>
                                 <div>
                                     <span className="text-gray-400 block">Device ID:</span>
                                     <span className="text-gray-500 font-mono text-xs">{target.deviceFingerprint ? 'Registered' : 'None'}</span>
                                 </div>
                             </div>
                         );
                    })()}
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(filterType === 'all' || filterType === 'missions') && (
                    <StatCard title="Missões" icon={MissionIcon}>
                        <div className="flex justify-between"><span>Enviadas:</span><span className="font-bold text-white">{stats.missionStats.totalSent}</span></div>
                        <div className="flex justify-between"><span>Aprovadas:</span><span className="font-bold text-green-400">{stats.missionStats.totalApproved}</span></div>
                        <div className="flex justify-between"><span>Rejeitadas:</span><span className="font-bold text-red-400">{stats.missionStats.totalRejected}</span></div>
                    </StatCard>
                )}

                {(filterType === 'all' || filterType === 'economy') && (
                    <StatCard title="Economia" icon={TrendingUpIcon}>
                        <div className="flex justify-between"><span>LC Geradas:</span><span className="font-bold text-green-400">+{stats.economyStats.totalCoinsGained.toLocaleString('pt-BR')}</span></div>
                        <div className="flex justify-between"><span>LC Gastas:</span><span className="font-bold text-red-400">-{stats.economyStats.totalCoinsSpent.toLocaleString('pt-BR')}</span></div>
                        <div className="flex justify-between"><span>XP Gerado:</span><span className="font-bold text-blue-400">{stats.economyStats.totalXpGained.toLocaleString('pt-BR')}</span></div>
                    </StatCard>
                )}

                {(filterType === 'all' || filterType === 'queues') && (
                    <StatCard title="Filas (Atividade)" icon={QueueIcon}>
                        <div className="flex justify-between"><span>Concluídos no Período:</span><span className="font-bold text-white">{stats.queueStats.totalCompleted}</span></div>
                        <div className="flex justify-between text-sm text-gray-400 mt-2 pt-2 border-t border-gray-700">
                            <span>Tempo Médio:</span>
                            <span className="text-goldenYellow-400 font-mono">{stats.queueStats.avgTime}ms</span>
                        </div>
                    </StatCard>
                )}

                 {(filterType === 'all' || filterType === 'security') && (
                    <StatCard title="Segurança" icon={ShieldIcon}>
                        <div className="flex justify-between items-center h-full">
                            <span className="text-gray-400">Eventos Suspeitos:</span>
                            <span className={`text-4xl font-bold ${stats.behaviorCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{stats.behaviorCount}</span>
                        </div>
                    </StatCard>
                )}
            </div>
            
            {/* Visual Analytics Section */}
            <h3 className="text-xl font-bold text-white mt-8 px-2 border-l-4 border-goldenYellow-500">Análise Visual (Clique nos Gráficos)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {(filterType === 'all' || filterType === 'missions') && (
                     <div className="bg-[#181818] p-6 rounded-xl border border-gray-700 h-80 flex flex-col">
                         <h4 className="text-md font-bold text-gray-300 mb-4">Status das Missões</h4>
                         <div className="flex-grow relative cursor-pointer">
                            <canvas ref={missionCanvasRef}></canvas>
                         </div>
                     </div>
                 )}
                 {(filterType === 'all' || filterType === 'economy') && (
                     <div className="bg-[#181818] p-6 rounded-xl border border-gray-700 h-80 flex flex-col">
                         <h4 className="text-md font-bold text-gray-300 mb-4">Balanço Econômico</h4>
                         <div className="flex-grow relative cursor-pointer">
                            <canvas ref={economyCanvasRef}></canvas>
                         </div>
                     </div>
                 )}
                 {(filterType === 'all' || filterType === 'queues') && (
                     <div className="bg-[#181818] p-6 rounded-xl border border-gray-700 h-80 flex flex-col">
                         <h4 className="text-md font-bold text-gray-300 mb-4">Tempo de Processamento (Recente)</h4>
                         <div className="flex-grow relative cursor-pointer">
                            <canvas ref={queueCanvasRef}></canvas>
                         </div>
                     </div>
                 )}
                 {(filterType === 'all' || filterType === 'security') && (
                     <div className="bg-[#181818] p-6 rounded-xl border border-gray-700 h-80 flex flex-col">
                         <h4 className="text-md font-bold text-gray-300 mb-4">Segurança & Comportamento</h4>
                         <div className="flex-grow relative cursor-pointer">
                            <canvas ref={behaviorCanvasRef}></canvas>
                         </div>
                     </div>
                 )}
            </div>

            <div className="bg-[#121212] p-4 rounded-xl border border-gray-800 text-center text-xs text-gray-500">
                * Exibindo dados filtrados da sessão atual e logs em memória.
            </div>
        </div>
    );
};

export default TelemetryDashboard;
