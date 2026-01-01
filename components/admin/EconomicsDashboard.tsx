import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { User, CoinTransaction, SubscriptionPlan } from '../../types';
import { CoinIcon, TrophyIcon, CrownIcon } from '../../constants';

// UI Components
import MetricCard from '../ui/patterns/MetricCard';
import ChartContainer from '../ui/advanced/ChartContainer';
import Toolbar from '../ui/advanced/Toolbar';
import Select from '../ui/base/Select';
import TableResponsiveWrapper from '../ui/patterns/TableResponsiveWrapper';
import Card from '../ui/base/Card';

interface EconomicsDashboardProps {
  allUsers: User[];
  allTransactions: CoinTransaction[];
  subscriptionPlans: SubscriptionPlan[];
}

type TimeFilter = 'today' | '7d' | '30d';
type UserEarningsFilter = 'today' | 'week' | 'month';

// Simplified Chart Logic (Pure SVG/HTML to avoid huge library deps in mock)
const FlowChart: React.FC<{ data: { label: string; earned: number; spent: number }[] }> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; earned: number; spent: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const maxValue = useMemo(() => Math.max(...data.flatMap(d => [d.earned, d.spent]), 1), [data]);

    const getPath = (values: number[], color: string) => {
        if (values.length < 2) return '';
        const width = 1000;
        const height = 300;
        const step = width / (values.length - 1);

        const points = values.map((value, i) => {
            const x = i * step;
            const y = height - (value / maxValue) * height;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || data.length === 0) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const index = Math.round((x / rect.width) * (data.length - 1));
        const point = data[index];
        if (point) {
            setTooltip({ x: e.clientX, y: e.clientY, ...point });
        }
    };

    return (
        <ChartContainer 
            title="Fluxo de Moedas" 
            description="Ganhos e Gastos ao longo do tempo"
            className="bg-slate-dark border-white/5 shadow-lg"
            actions={
                <div className="flex justify-end space-x-4 text-xs font-bold uppercase tracking-wider">
                    <div className="flex items-center text-green-400"><div className="w-2 h-2 rounded-full bg-green-400 mr-2 shadow-[0_0_5px_#4ade80]"></div>Ganhas</div>
                    <div className="flex items-center text-red-400"><div className="w-2 h-2 rounded-full bg-red-400 mr-2 shadow-[0_0_5px_#f87171]"></div>Gastas</div>
                </div>
            }
        >
            <div className="relative w-full h-full">
                <svg ref={svgRef} className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
                    {/* Grid lines */}
                    {[...Array(5)].map((_, i) => (
                        <line key={i} x1="0" y1={`${(i / 4) * 300}`} x2="1000" y2={`${(i / 4) * 300}`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    ))}
                    <path d={getPath(data.map(d => d.earned), '#4ade80')} stroke="#4ade80" fill="none" strokeWidth="3" strokeLinecap="round" style={{filter: 'drop-shadow(0 0 5px rgba(74, 222, 128, 0.5))'}} />
                    <path d={getPath(data.map(d => d.spent), '#f87171')} stroke="#f87171" fill="none" strokeWidth="3" strokeLinecap="round" style={{filter: 'drop-shadow(0 0 5px rgba(248, 113, 113, 0.5))'}} />
                </svg>
                
                {tooltip && (
                    <div className="absolute bg-black/90 border border-white/20 p-3 rounded-lg text-xs shadow-xl pointer-events-none transition-opacity z-10 backdrop-blur-md" style={{ top: 10, left: 10 }}>
                        <p className="font-bold mb-1 text-white font-mono">{tooltip.label}</p>
                        <p className="text-green-400 font-bold">Ganho: {tooltip.earned.toLocaleString('pt-br')}</p>
                        <p className="text-red-400 font-bold">Gasto: {tooltip.spent.toLocaleString('pt-br')}</p>
                    </div>
                )}
            </div>
        </ChartContainer>
    );
};

const PieChart: React.FC<{ data: { name: string; value: number }[]; title: string; isCurrency?: boolean; }> = ({ data, title, isCurrency = false }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    const colors = ['#F6C560', '#FF1CF7', '#00E8FF', '#FBBF24', '#A855F7', '#EC4899', '#EF4444', '#3B82F6'];

    let cumulativePercent = 0;
    const segments = data.map((item, index) => {
        const percent = total > 0 ? (item.value / total) * 100 : 0;
        const segment = { ...item, percent, color: colors[index % colors.length], offset: cumulativePercent };
        cumulativePercent += percent;
        return segment;
    });

    return (
        <ChartContainer title={title} height="350px" className="bg-slate-dark border-white/5">
            <div className="flex-grow flex flex-col md:flex-row items-center justify-between h-full">
                <div className="relative w-48 h-48 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow-lg">
                        {segments.map(segment => (
                            <circle
                                key={segment.name}
                                cx="18" cy="18" r="15.915"
                                fill="transparent"
                                stroke={segment.color}
                                strokeWidth="4"
                                strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
                                strokeDashoffset={-segment.offset}
                                transform="rotate(-90 18 18)"
                                className="transition-all duration-500"
                            />
                        ))}
                    </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total</span>
                        <span className="font-bold text-lg text-white font-chakra">
                            {isCurrency ? `R$ ${total.toFixed(2).replace('.', ',')}` : total.toLocaleString('pt-br')}
                        </span>
                    </div>
                </div>
                <ul className="text-sm space-y-2 mt-4 md:mt-0 overflow-y-auto max-h-[200px] w-full md:w-auto custom-scrollbar pr-2">
                    {segments.map(segment => (
                        <li key={segment.name} className="flex items-center justify-between w-full md:justify-start gap-4 p-2 rounded hover:bg-white/5 transition-colors">
                            <div className="flex items-center">
                                <span className="w-2 h-2 rounded-full mr-2 shadow-[0_0_5px]" style={{ backgroundColor: segment.color, boxShadow: `0 0 5px ${segment.color}` }}></span>
                                <span className="text-gray-300 truncate max-w-[150px] text-xs font-bold uppercase">{segment.name}</span>
                            </div>
                            <span className="font-bold text-white ml-2 text-xs font-mono">
                                {isCurrency ? `R$ ${segment.value.toFixed(2).replace('.', ',')}` : `${segment.value.toLocaleString('pt-br')} (${segment.percent.toFixed(1)}%)`}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </ChartContainer>
    );
};

const SOURCE_NAMES: Record<string, string> = {
    mission_completion: 'Missões',
    daily_check_in: 'Check-in Diário',
    weekly_bonus: 'Bônus Semanal',
    level_up_bonus: 'Bônus de Nível',
    store_redemption: 'Loja',
    event_entry: 'Eventos',
    manual_refund: 'Reembolsos',
    initial_grant: 'Bônus Inicial',
    admin_adjustment: 'Ajuste Admin',
    artist_link_click: 'Clique em Artista',
    coin_purchase: 'Compra de Moedas',
    event_refund: 'Reembolso de Evento',
    jackpot_entry: 'Jackpot',
    jackpot_win: 'Jackpot Win',
};

const parsePrice = (priceStr: string): number => {
    if (priceStr.toLowerCase() === 'gratuito') return 0;
    const match = priceStr.match(/R\$\s*([\d,]+)/);
    if (match && match[1]) return parseFloat(match[1].replace(',', '.'));
    return 0;
};

const EconomicsDashboard: React.FC<EconomicsDashboardProps> = ({ allUsers, allTransactions, subscriptionPlans }) => {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
    const [userEarningsFilter, setUserEarningsFilter] = useState<UserEarningsFilter>('week');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // ... (Logic remains unchanged from original file, just rendering updates)
    // Re-implementing necessary memos for rendering
    
    const filteredTransactions = useMemo(() => {
        if (!searchTerm) return allTransactions;
        const lower = searchTerm.toLowerCase();
        return allTransactions.filter(t => 
            t.description.toLowerCase().includes(lower) ||
            (allUsers.find(u => u.id === t.userId)?.name.toLowerCase().includes(lower))
        );
    }, [allTransactions, searchTerm, allUsers]);

    const paginatedTransactions = useMemo(() => {
        return filteredTransactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    const timeFilteredTransactions = useMemo(() => {
        const now = new Date();
        const startDate = new Date();
        if (timeFilter === 'today') startDate.setHours(0, 0, 0, 0);
        else if (timeFilter === '7d') startDate.setDate(now.getDate() - 7);
        else if (timeFilter === '30d') startDate.setDate(now.getDate() - 30);
        
        if (timeFilter !== 'today') startDate.setHours(0, 0, 0, 0);
        return allTransactions.filter(t => new Date(t.dateISO) >= startDate);
    }, [allTransactions, timeFilter]);
    
    const userEarningsData = useMemo(() => {
        const now = new Date();
        const startDate = new Date();
        
        if (userEarningsFilter === 'today') startDate.setHours(0, 0, 0, 0);
        else if (userEarningsFilter === 'week') { startDate.setDate(now.getDate() - now.getDay()); startDate.setHours(0, 0, 0, 0); }
        else if (userEarningsFilter === 'month') { startDate.setDate(1); startDate.setHours(0, 0, 0, 0); }
        
        const relevantTransactions = allTransactions.filter(t => new Date(t.dateISO) >= startDate && t.type === 'earn');
        const earningsByUser = relevantTransactions.reduce((acc, t) => {
            acc[t.userId] = (acc[t.userId] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(earningsByUser)
            .map(([userId, totalEarned]) => {
                const user = allUsers.find(u => u.id === userId);
                return user ? { ...user, totalEarned } : null;
            })
            .filter((u): u is User & { totalEarned: number } => u !== null && u.role === 'user')
            .sort((a,b) => b.totalEarned - a.totalEarned);

    }, [allUsers, allTransactions, userEarningsFilter]);

    const coinStats = useMemo(() => {
        const earned = timeFilteredTransactions.filter(t => t.type === 'earn').reduce((sum, t) => sum + t.amount, 0);
        const spent = timeFilteredTransactions.filter(t => t.type === 'spend').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const net = earned - spent;
        return { earned, spent, net };
    }, [timeFilteredTransactions]);

    const totalCoinsInCirculation = useMemo(() => allUsers.reduce((acc, user) => acc + user.coins, 0), [allUsers]);

    const specificRevenueStats = useMemo(() => {
        const jackpotRevenue = timeFilteredTransactions
            .filter(t => t.source === 'jackpot_entry')
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        const goldenRevenue = timeFilteredTransactions
            .filter(t => t.source === 'event_entry' && t.description.includes('Golden Pass'))
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        return { jackpotRevenue, goldenRevenue };
    }, [timeFilteredTransactions]);

    const flowChartData = useMemo(() => {
        const now = new Date();
        if (timeFilter === 'today') {
            const data: { label: string; earned: number; spent: number }[] = [];
            for (let i = 0; i < 24; i++) {
                const hourTransactions = timeFilteredTransactions.filter(t => new Date(t.dateISO).getHours() === i);
                const earned = hourTransactions.filter(t => t.type === 'earn').reduce((s, t) => s + t.amount, 0);
                const spent = hourTransactions.filter(t => t.type === 'spend').reduce((s, t) => s + Math.abs(t.amount), 0);
                data.push({ label: `${String(i).padStart(2, '0')}h`, earned, spent });
            }
            return data;
        }
        const days = timeFilter === '7d' ? 7 : 30;
        const data: { label: string; earned: number; spent: number }[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const dayTransactions = allTransactions.filter(t => {
                const txDate = new Date(t.dateISO);
                txDate.setHours(0, 0, 0, 0);
                return txDate.getTime() === date.getTime();
            });
            const earned = dayTransactions.filter(t => t.type === 'earn').reduce((s, t) => s + t.amount, 0);
            const spent = dayTransactions.filter(t => t.type === 'spend').reduce((s, t) => s + Math.abs(t.amount), 0);
            
            data.push({ label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), earned, spent });
        }
        return data;
    }, [allTransactions, timeFilter, timeFilteredTransactions]);

    const generationSourceData = useMemo(() => {
        const sources = allTransactions.filter(t => t.type === 'earn').reduce((acc, t) => {
            const name = SOURCE_NAMES[t.source] || 'Outros';
            acc[name] = (acc[name] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a,b) => Number(b.value) - Number(a.value));
    }, [allTransactions]);

    const spendingSourceData = useMemo(() => {
        const sources = allTransactions.filter(t => t.type === 'spend').reduce((acc, t) => {
            let name = SOURCE_NAMES[t.source] || 'Outros';
            if (t.source === 'jackpot_entry') name = 'Jackpot';
            else if (t.source === 'event_entry') name = t.description.includes('Golden Pass') ? 'Golden Pass' : 'Eventos (Standard)';
            else if (t.source === 'store_redemption') name = 'Loja (Geral)';
            else if (t.source === 'raffle_ticket') name = 'Sorteios';
            acc[name] = (acc[name] || 0) + Math.abs(t.amount);
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a,b) => Number(b.value) - Number(a.value));
    }, [allTransactions]);
    
    const revenueByPlanData = useMemo(() => {
        const revenueMap: Record<string, number> = {};
        subscriptionPlans.forEach(plan => { if (plan.name !== 'Free Flow') revenueMap[plan.name] = 0; });
        allUsers.forEach(user => {
            if (user.plan !== 'Free Flow' && user.role === 'user') {
                const plan = subscriptionPlans.find(p => p.name === user.plan);
                if (plan) {
                    const price = parsePrice(plan.price);
                    revenueMap[user.plan] = (revenueMap[user.plan] || 0) + price;
                }
            }
        });
        return Object.entries(revenueMap).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => Number(b.value) - Number(a.value));
    }, [allUsers, subscriptionPlans]);


    return (
        <div className="space-y-8 animate-fade-in-up">
            
            {/* TOOLBAR */}
            <Toolbar 
                start={<h3 className="text-xl font-bold text-white font-chakra">Painel de Economia</h3>}
                end={
                    <Select 
                        options={[
                            { value: 'today', label: 'Hoje' },
                            { value: '7d', label: 'Últimos 7 dias' },
                            { value: '30d', label: 'Últimos 30 dias' },
                        ]}
                        value={timeFilter}
                        onChange={(v) => setTimeFilter(v as any)}
                        className="w-48 bg-navy-deep border-white/10 text-white"
                    />
                }
            />
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="Circulação Total" 
                    value={totalCoinsInCirculation.toLocaleString('pt-BR')} 
                    subtext="em carteiras"
                    color="gold"
                />
                <MetricCard 
                    title="Queima Total" 
                    value={coinStats.spent.toLocaleString('pt-BR')} 
                    subtext="neste período"
                    color="neutral"
                />
                <MetricCard 
                    title="Receita Jackpot" 
                    value={specificRevenueStats.jackpotRevenue.toLocaleString('pt-BR')}
                    subtext="entradas"
                    color="purple"
                />
                <MetricCard 
                    title="Receita Golden" 
                    value={specificRevenueStats.goldenRevenue.toLocaleString('pt-BR')}
                    subtext="passes vip"
                    color="gold"
                />
            </div>

            {/* MAIN CHART */}
            <FlowChart data={flowChartData} />

            {/* USER EARNINGS */}
            <Card className="bg-slate-dark border-white/5 shadow-lg">
                <Card.Header className="flex justify-between items-center border-white/5">
                    <h3 className="text-lg font-bold text-white font-chakra">Top Ganhadores</h3>
                    <Select 
                        options={[
                            { value: 'today', label: 'Hoje' },
                            { value: 'week', label: 'Semana' },
                            { value: 'month', label: 'Mês' },
                        ]}
                        value={userEarningsFilter}
                        onChange={(v) => setUserEarningsFilter(v as any)}
                        className="w-40 bg-navy-deep border-white/10 text-white"
                        fullWidth={false}
                    />
                </Card.Header>
                <Card.Body noPadding>
                     <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-500 uppercase bg-navy-deep/80 border-b border-white/5">
                                    <tr>
                                        <th className="px-4 py-4 text-center">#</th>
                                        <th className="px-4 py-4">Usuário</th>
                                        <th className="px-4 py-4">Plano</th>
                                        <th className="px-4 py-4 text-right">Total Ganho</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-navy-deep">
                                {userEarningsData.map((user, index) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-center font-bold">{index + 1}</td>
                                            <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                                            <td className="px-4 py-3 text-xs font-mono uppercase text-gray-500">{user.plan}</td>
                                            <td className="px-4 py-3 text-right font-bold text-green-400">
                                            +{user.totalEarned.toLocaleString('pt-br')}
                                            </td>
                                        </tr>
                                ))}
                                </tbody>
                            </table>
                        </TableResponsiveWrapper>
                     </div>
                </Card.Body>
            </Card>

            {/* PIE CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <PieChart data={revenueByPlanData} title="Receita (MRR)" isCurrency />
                 <PieChart data={generationSourceData} title="Fontes (Geração)" />
                 <PieChart data={spendingSourceData} title="Destinos (Queima)" />
            </div>

            {/* TRANSACTION LOG */}
            <Card className="bg-slate-dark border-white/5 shadow-lg">
                <Card.Header className="border-white/5">
                    <Toolbar 
                        start={<h3 className="text-lg font-bold text-white font-chakra">Log de Transações</h3>}
                        end={
                             <div className="relative">
                                 <input
                                    type="text"
                                    placeholder="Buscar transação..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full md:w-64 bg-navy-deep border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-gold-cinematic text-sm pl-9"
                                />
                                <div className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500">🔍</div>
                            </div>
                        }
                    />
                </Card.Header>
                <Card.Body noPadding>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-500 uppercase bg-navy-deep/80 border-b border-white/5 sticky top-0 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Usuário</th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-navy-deep">
                                    {paginatedTransactions.map(t => {
                                        const user = allUsers.find(u => u.id === t.userId);
                                        return (
                                            <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">{new Date(t.dateISO).toLocaleString('pt-BR')}</td>
                                                <td className="px-6 py-4 font-medium text-white">{user?.name || t.userId}</td>
                                                <td className="px-6 py-4 text-gray-400">{t.description}</td>
                                                <td className={`px-6 py-4 text-right font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString('pt-BR')}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </TableResponsiveWrapper>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default EconomicsDashboard;