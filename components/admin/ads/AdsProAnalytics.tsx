
import React, { useEffect, useState } from 'react';
import { AdsAnalytics } from '../../../api/admin/ads.analytics';
import { TrendingUpIcon, UsersIcon, CoinIcon } from '../../../constants';

// Simple Pro Card
const ProCard: React.FC<{ title: string; value: string | number; subtext?: string; accent?: string }> = ({ title, value, subtext, accent = 'border-gray-700' }) => (
    <div className={`bg-[#151515] p-5 rounded-2xl border ${accent} relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUpIcon className="w-12 h-12 text-white" />
        </div>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</h4>
        <p className="text-2xl font-black text-white font-chakra">{value}</p>
        {subtext && <p className="text-[10px] text-gray-400 mt-2 font-mono">{subtext}</p>}
    </div>
);

// Simple Bar Chart Component (CSS Based)
const SimpleBarChart: React.FC<{ data: number[]; labels: string[]; color: string }> = ({ data, labels, color }) => {
    const max = Math.max(...data, 1);
    return (
        <div className="h-32 flex items-end gap-1 mt-4 w-full">
            {data.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                    <div 
                        className={`w-full rounded-t-sm ${color} opacity-60 group-hover:opacity-100 transition-all`} 
                        style={{ height: `${(val / max) * 100}%` }}
                    ></div>
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 text-[10px] bg-black text-white px-1 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                        {val} ({labels[i]})
                    </div>
                </div>
            ))}
        </div>
    );
};

const AdsProAnalytics: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [timeSeries, setTimeSeries] = useState<any>(null);

    useEffect(() => {
        setStats(AdsAnalytics.getGlobalStats());
        setTimeSeries(AdsAnalytics.getTimeSeriesStats());
    }, []);

    if (!stats || !timeSeries) return <div className="p-8 text-center text-gray-600">Carregando Analytics PRO...</div>;

    return (
        <div className="mt-10 pt-10 border-t border-gray-800 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-[#FFD86B]/10 p-2 rounded-lg border border-[#FFD86B]/20">
                    <TrendingUpIcon className="w-6 h-6 text-[#FFD86B]" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white font-chakra uppercase tracking-wide">Analytics Premium (V2.0)</h3>
                    <p className="text-xs text-gray-500">Monitoramento avançado de performance de anúncios</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <ProCard 
                    title="Total de Views" 
                    value={stats.totalViews.toLocaleString()} 
                    subtext="Visualizações Totais" 
                    accent="border-blue-500/30 hover:border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                />
                <ProCard 
                    title="Total de Clicks" 
                    value={stats.totalClicks.toLocaleString()} 
                    subtext="Interações Diretas" 
                    accent="border-green-500/30 hover:border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                />
                <ProCard 
                    title="CTR Médio Global" 
                    value={stats.averageCTR.toFixed(2) + '%'} 
                    subtext="Taxa de Conversão" 
                    accent="border-[#FFD86B]/30 hover:border-[#FFD86B] shadow-[0_0_20px_rgba(255,216,107,0.1)]"
                />
                <ProCard 
                    title="Anúncios Ativos" 
                    value={stats.totalAds} 
                    subtext="Campanhas no Ar" 
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                
                {/* Views Chart */}
                <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Visualizações (Últimos 7 dias)</h4>
                    <SimpleBarChart data={timeSeries.views} labels={timeSeries.dates} color="bg-blue-600" />
                    <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                        <span>{timeSeries.dates[0]}</span>
                        <span>{timeSeries.dates[6]}</span>
                    </div>
                </div>

                {/* Clicks Chart */}
                <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Cliques (Últimos 7 dias)</h4>
                    <SimpleBarChart data={timeSeries.clicks} labels={timeSeries.dates} color="bg-green-600" />
                    <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                        <span>{timeSeries.dates[0]}</span>
                        <span>{timeSeries.dates[6]}</span>
                    </div>
                </div>

            </div>

            {/* Ranking Table */}
            <div className="bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-[#181818]">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Ranking de Performance</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-400">
                        <thead className="bg-[#0E0E0E] uppercase font-bold text-gray-500">
                            <tr>
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Anúncio</th>
                                <th className="px-4 py-3 text-right">Views</th>
                                <th className="px-4 py-3 text-right">Clicks</th>
                                <th className="px-4 py-3 text-right">CTR</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {stats.ranking.map((item: any, index: number) => (
                                <tr key={item.id} className="hover:bg-[#181818] transition-colors">
                                    <td className="px-4 py-3 font-mono text-gray-600">{index + 1}</td>
                                    <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                                    <td className="px-4 py-3 text-right">{item.views}</td>
                                    <td className="px-4 py-3 text-right text-green-400 font-bold">{item.clicks}</td>
                                    <td className="px-4 py-3 text-right text-[#FFD86B] font-mono">{item.ctr.toFixed(2)}%</td>
                                    <td className="px-4 py-3 text-center">
                                        {item.ctr > stats.averageCTR ? (
                                            <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-[9px] font-bold uppercase">Alta Performance</span>
                                        ) : (
                                            <span className="bg-gray-800 text-gray-500 px-2 py-1 rounded text-[9px] font-bold uppercase">Normal</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {stats.ranking.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-600">Sem dados de ranking.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default AdsProAnalytics;
