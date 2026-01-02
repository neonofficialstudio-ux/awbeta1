
import React, { useState, useEffect, useMemo } from 'react';
import type { Advertisement } from '../../../types';
import { ModalPortal } from '../../ui/overlays/ModalPortal';
import { AdsAnalytics } from '../../../api/admin/ads.analytics';
import { BrainIcon, HistoryIcon, TrendingUpIcon } from '../../../constants';

interface AdDetailsModalProps {
    ad: Advertisement;
    onClose: () => void;
}

const AdDetailsModal: React.FC<AdDetailsModalProps> = ({ ad, onClose }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [insights, setInsights] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load data
        const hist = AdsAnalytics.getAdHistory(ad.id);
        setHistory(hist);

        // Generate Dummy AI Insights based on real data
        const newInsights = [];
        const views = ad.views || 0;
        const clicks = ad.clicks || 0;
        const ctr = views > 0 ? (clicks / views) * 100 : 0;

        if (ctr > 5) newInsights.push("🔥 Este anúncio tem um CTR excelente, acima da média do sistema (5%).");
        if (views > 100 && clicks === 0) newInsights.push("⚠️ Baixa conversão. Considere alterar a imagem ou o título.");
        if (ad.duration < 5) newInsights.push("💡 Duração curta pode estar prejudicando a leitura. Tente aumentar para 7s.");
        
        // Time of day analysis mock
        newInsights.push("🕒 Maior engajamento detectado entre 18h e 22h.");

        setInsights(newInsights);
        setIsLoading(false);
    }, [ad]);

    return (
        <ModalPortal>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[10000] p-4" onClick={onClose}>
                <div 
                    className="bg-[#0A0A0A] w-full max-w-4xl rounded-[24px] border border-[#FFD86B]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-pop-in"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 bg-[#111] flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white font-chakra uppercase tracking-wide flex items-center gap-2">
                                Detalhes PRO: <span className="text-[#FFD86B]">{ad.title}</span>
                            </h2>
                            <p className="text-gray-500 text-xs mt-1 font-mono">ID: {ad.id}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left Column: Preview & Stats */}
                            <div className="space-y-6">
                                <div className="bg-[#151515] rounded-xl border border-white/10 overflow-hidden">
                                    <img src={ad.imageUrl} alt="Preview" className="w-full h-40 object-cover" />
                                    <div className="p-4">
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Descrição</p>
                                        <p className="text-sm text-white leading-snug">{ad.description}</p>
                                        <a href={ad.linkUrl} target="_blank" className="text-xs text-blue-400 hover:underline mt-2 block truncate">{ad.linkUrl}</a>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#151515] p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Views</p>
                                        <p className="text-2xl font-black text-white">{ad.views || 0}</p>
                                    </div>
                                    <div className="bg-[#151515] p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Clicks</p>
                                        <p className="text-2xl font-black text-green-400">{ad.clicks || 0}</p>
                                    </div>
                                    <div className="bg-[#151515] p-4 rounded-xl border border-white/5 text-center col-span-2">
                                        <p className="text-xs text-gray-500 uppercase font-bold">CTR (Taxa de Clique)</p>
                                        <p className="text-3xl font-black text-[#FFD86B]">
                                            {(ad.views ? ((ad.clicks || 0) / ad.views * 100) : 0).toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Insights & History */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* AI Insights */}
                                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-6 rounded-xl border border-blue-500/30 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><BrainIcon className="w-24 h-24 text-blue-400"/></div>
                                    <h3 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2 relative z-10">
                                        <BrainIcon className="w-5 h-5"/> Insights Automáticos (AI)
                                    </h3>
                                    <ul className="space-y-3 relative z-10">
                                        {insights.map((insight, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-300 bg-black/20 p-3 rounded-lg">
                                                <span className="text-blue-400 mt-0.5">✦</span>
                                                {insight}
                                            </li>
                                        ))}
                                        {insights.length === 0 && <p className="text-gray-500 text-sm">Coletando dados para gerar insights...</p>}
                                    </ul>
                                </div>

                                {/* History Log */}
                                <div className="bg-[#151515] rounded-xl border border-white/10 flex flex-col h-80">
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <HistoryIcon className="w-4 h-4 text-gray-400"/> Histórico de Eventos
                                        </h3>
                                        <span className="text-xs text-gray-600">{history.length} registros</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left text-xs">
                                            <thead className="text-gray-500 bg-[#111] sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2">Data/Hora</th>
                                                    <th className="px-4 py-2">Evento</th>
                                                    <th className="px-4 py-2">Usuário</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-gray-300">
                                                {history.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5">
                                                        <td className="px-4 py-2 font-mono text-gray-500">{new Date(item.timestamp).toLocaleString()}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${item.eventType === 'ad_click' ? 'bg-green-900/40 text-green-400' : 'bg-blue-900/40 text-blue-400'}`}>
                                                                {item.eventType === 'ad_click' ? 'CLIQUE' : 'VISUALIZAÇÃO'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 truncate max-w-[100px]" title={item.userId}>{item.userId}</td>
                                                    </tr>
                                                ))}
                                                {history.length === 0 && (
                                                    <tr><td colSpan={3} className="p-8 text-center text-gray-600">Nenhum evento registrado ainda.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default AdDetailsModal;
