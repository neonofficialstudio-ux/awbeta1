
import React, { useMemo } from 'react';
import { TrendingUpIcon, CoinIcon, QueueIcon, UsersIcon } from '../../constants';
import type { User, CoinTransaction, CoinPurchaseRequest } from '../../types';

const MetricCard: React.FC<{ title: string; value: string | number; subtext?: string; color?: string; icon?: React.ElementType }> = ({ title, value, subtext, color = 'text-white', icon: Icon }) => (
    <div className="bg-[#181818] p-5 rounded-xl border border-gray-700 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">{title}</p>
            {Icon && <Icon className="w-5 h-5 text-gray-500" />}
        </div>
        <div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
    </div>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-lg font-bold text-goldenYellow-400 mb-4 flex items-center uppercase tracking-wider border-b border-gray-800 pb-2">
        {title}
    </h3>
);

interface EconomicDashboardProProps {
    allUsers: User[];
    allTransactions: CoinTransaction[];
    coinPurchaseRequests: CoinPurchaseRequest[];
}

const EconomicDashboardPro: React.FC<EconomicDashboardProProps> = ({ allUsers, allTransactions, coinPurchaseRequests }) => {
    const last30dStart = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const lcGerada30d = useMemo(() => {
        return allTransactions
            .filter(t => t.type === 'earn' && new Date(t.dateISO) >= last30dStart)
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    }, [allTransactions, last30dStart]);

    const lcGasta30d = useMemo(() => {
        return allTransactions
            .filter(t => t.type === 'spend' && new Date(t.dateISO) >= last30dStart)
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    }, [allTransactions, last30dStart]);

    const lcCirculacao = useMemo(() => allUsers.reduce((acc, u) => acc + (Number(u.coins) || 0), 0), [allUsers]);
    const totalUsers = useMemo(() => allUsers.filter(u => u.role === 'user').length, [allUsers]);

    const receitaAprovada30d = useMemo(() => {
        return coinPurchaseRequests
            .filter(r => r.status === 'approved' && new Date(r.requestedAt) >= last30dStart)
            .reduce((acc, r) => acc + (Number(r.price) || 0), 0);
    }, [coinPurchaseRequests, last30dStart]);

    const receitaAprovadaAllTime = useMemo(() => {
        return coinPurchaseRequests
            .filter(r => r.status === 'approved')
            .reduce((acc, r) => acc + (Number(r.price) || 0), 0);
    }, [coinPurchaseRequests]);

    const aprovadas30dCount = useMemo(() => {
        return coinPurchaseRequests.filter(r => r.status === 'approved' && new Date(r.requestedAt) >= last30dStart).length;
    }, [coinPurchaseRequests, last30dStart]);

    const ticketMedio = useMemo(() => {
        if (aprovadas30dCount <= 0) return 0;
        return receitaAprovada30d / aprovadas30dCount;
    }, [receitaAprovada30d, aprovadas30dCount]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="text-center max-w-3xl mx-auto mb-8">
                <h2 className="text-3xl font-extrabold text-goldenYellow-400">Economia Pro</h2>
                <p className="mt-2 text-gray-400">Métricas reais (Supabase): Receita por compra de coins + saúde da moeda.</p>
            </div>

            {/* SEÇÃO 1: RECEITA REAL (R$) */}
            <div>
                <SectionTitle title="Performance Financeira (R$)" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard 
                        title="Receita Aprovada (30d)" 
                        value={`R$ ${receitaAprovada30d.toLocaleString('pt-BR')}`} 
                        subtext="Somatório de coin_purchase_requests aprovadas"
                        color="text-green-400"
                        icon={TrendingUpIcon}
                    />
                    <MetricCard 
                        title="Ticket Médio (ARPU)" 
                        value={`R$ ${ticketMedio.toFixed(2).replace('.', ',')}`} 
                        subtext="Média por compra aprovada (30d)"
                        icon={UsersIcon}
                    />
                    <MetricCard 
                        title="Receita Aprovada (All-time)" 
                        value={`R$ ${receitaAprovadaAllTime.toLocaleString('pt-BR')}`} 
                        subtext="Somatório histórico (aprovadas)"
                        color="text-blue-400"
                    />
                    <div className="bg-[#181818] p-5 rounded-xl border border-gray-700">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Resumo</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-300">Compras aprovadas (30d)</span>
                                <span className="font-mono text-white">{aprovadas30dCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-300">Usuários (role=user)</span>
                                <span className="font-mono text-white">{totalUsers}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: ECONOMIA INTERNA (LC) */}
            <div>
                <SectionTitle title="Saúde da Moeda (Lummi Coin)" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#181818] p-6 rounded-xl border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-white">Fluxo Mensal (30d)</h4>
                            <CoinIcon className="w-5 h-5 text-goldenYellow-500" />
                        </div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-gray-400">Gerado</span>
                            <span className="text-green-400 font-mono font-bold">+{lcGerada30d.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full mb-4 overflow-hidden">
                             <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, (lcGerada30d / Math.max(1, (lcGerada30d + lcGasta30d))) * 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-gray-400">Queimado</span>
                            <span className="text-red-400 font-mono font-bold">-{lcGasta30d.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                             <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, (lcGasta30d / Math.max(1, (lcGerada30d + lcGasta30d))) * 100)}%` }}></div>
                        </div>
                    </div>

                    <MetricCard 
                        title="LC em circulação" 
                        value={lcCirculacao.toLocaleString()} 
                        subtext="Soma do saldo atual (profiles)"
                        icon={CoinIcon}
                    />

                    <MetricCard 
                        title="Leitura Supabase"
                        value="OK"
                        subtext="Dados vindo do adminData (Supabase)"
                        icon={QueueIcon}
                    />
                </div>
            </div>
        </div>
    );
};

export default EconomicDashboardPro;
