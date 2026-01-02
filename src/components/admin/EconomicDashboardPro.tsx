
import React, { useEffect, useState } from 'react';
import * as analytics from '../../api/analytics/economy';
import { TrendingUpIcon, CoinIcon, QueueIcon, UsersIcon } from '../../constants';

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

const EconomicDashboardPro: React.FC = () => {
    const [metrics, setMetrics] = useState<any>(null);

    useEffect(() => {
        // Load all metrics
        const mrr = analytics.getMRR();
        const ticketMedio = analytics.getTicketMedio();
        const projecao30d = analytics.getReceitaProjetada(30);
        const mrrByPlan = analytics.getMRRByPlan();
        
        const lcGerada30d = analytics.getLCGerada(30);
        const lcGasta30d = analytics.getLCGasta(30);
        const lcCirculacao = analytics.getLCTotalCirculacao();
        const lcTravada = analytics.getLCTravadaEmFilas();
        const velocidade = analytics.getVelocidadeEconomica();
        
        const demanda = analytics.getDemandaMensalDeProducao();
        const capVsDem = analytics.getCapacidadeVsDemanda();
        const filaProj = analytics.getFilaProjetada();

        setMetrics({
            mrr, ticketMedio, projecao30d, mrrByPlan,
            lcGerada30d, lcGasta30d, lcCirculacao, lcTravada, velocidade,
            demanda, capVsDem, filaProj
        });
    }, []);

    if (!metrics) return <div className="p-8 text-center text-gray-500">Carregando dados econômicos...</div>;

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="text-center max-w-3xl mx-auto mb-8">
                <h2 className="text-3xl font-extrabold text-goldenYellow-400">Economia Pro</h2>
                <p className="mt-2 text-gray-400">Analytics avançado de Receita, Moeda Interna e Operação.</p>
            </div>

            {/* SEÇÃO 1: RECEITA REAL (R$) */}
            <div>
                <SectionTitle title="Performance Financeira (R$)" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard 
                        title="MRR Total" 
                        value={`R$ ${metrics.mrr.toLocaleString('pt-BR')}`} 
                        subtext="Receita Recorrente Mensal"
                        color="text-green-400"
                        icon={TrendingUpIcon}
                    />
                    <MetricCard 
                        title="Ticket Médio (ARPU)" 
                        value={`R$ ${metrics.ticketMedio.toFixed(2)}`} 
                        subtext="Por usuário pagante"
                        icon={UsersIcon}
                    />
                    <MetricCard 
                        title="Projeção (30 Dias)" 
                        value={`R$ ${metrics.projecao30d.toLocaleString('pt-BR')}`} 
                        subtext="Baseado no MRR atual"
                        color="text-blue-400"
                    />
                    <div className="bg-[#181818] p-5 rounded-xl border border-gray-700">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">MRR por Plano</p>
                        <div className="space-y-2 text-sm">
                            {Object.entries(metrics.mrrByPlan).map(([plan, val]: any) => (
                                <div key={plan} className="flex justify-between">
                                    <span className="text-gray-300">{plan}</span>
                                    <span className="font-mono text-white">R$ {val.toLocaleString()}</span>
                                </div>
                            ))}
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
                            <span className="text-green-400 font-mono font-bold">+{metrics.lcGerada30d.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full mb-4 overflow-hidden">
                             <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, (metrics.lcGerada30d / (metrics.lcGerada30d + metrics.lcGasta30d)) * 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-gray-400">Queimado</span>
                            <span className="text-red-400 font-mono font-bold">-{metrics.lcGasta30d.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                             <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, (metrics.lcGasta30d / (metrics.lcGerada30d + metrics.lcGasta30d)) * 100)}%` }}></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <MetricCard 
                            title="Em Circulação" 
                            value={metrics.lcCirculacao.toLocaleString()} 
                            subtext="Total nas carteiras"
                            color="text-goldenYellow-400"
                        />
                        <MetricCard 
                            title="Valor Travado" 
                            value={metrics.lcTravada.toLocaleString()} 
                            subtext="Em serviços pendentes"
                            color="text-gray-300"
                        />
                    </div>

                    <MetricCard 
                        title="Velocidade Econômica" 
                        value={`${metrics.velocidade.toFixed(1)} tx/h`} 
                        subtext="Média últimas 24h"
                        icon={TrendingUpIcon}
                    />
                </div>
            </div>

            {/* SEÇÃO 3: OPERAÇÃO */}
            <div>
                <SectionTitle title="Capacidade Operacional" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard 
                        title="Demanda Mensal" 
                        value={metrics.demanda} 
                        subtext="Pedidos visuais (30d)"
                        icon={QueueIcon}
                    />
                    <div className="bg-[#181818] p-5 rounded-xl border border-gray-700 flex flex-col justify-between">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Capacidade vs Demanda</p>
                        <div>
                            <p className={`text-2xl font-bold ${metrics.capVsDem.ratio > 100 ? 'text-red-500' : 'text-green-400'}`}>
                                {metrics.capVsDem.ratio.toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {metrics.capVsDem.demanda} pedidos / {metrics.capVsDem.capacidade} cap.
                            </p>
                        </div>
                        <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full ${metrics.capVsDem.ratio > 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, metrics.capVsDem.ratio)}%` }}></div>
                        </div>
                    </div>
                    <MetricCard 
                        title="Fila Projetada (7d)" 
                        value={metrics.filaProj} 
                        subtext="Previsão de acúmulo"
                        color={metrics.filaProj > 20 ? 'text-red-400' : 'text-white'}
                    />
                </div>
            </div>
        </div>
    );
};

export default EconomicDashboardPro;
