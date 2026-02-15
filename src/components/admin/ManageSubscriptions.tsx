
import React, { useState, useEffect, useRef } from "react";
import type { SubscriptionPlan } from "../../types";
import AdminSubscriptionModal from "./AdminSubscriptionModal";
import { EditIcon } from "../../constants";
import Tabs from '../ui/navigation/Tabs';
import { useAppContext } from '../../constants';

interface ManageSubscriptionsProps {
    initialSubTab?: 'plans' | 'requests';
    subscriptionRequests: any[];
    subscriptionStats: any;
    subscriptionHistory: any[];
    subscriptionPlans?: SubscriptionPlan[]; // New
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    onSavePlan?: (plan: SubscriptionPlan) => void; // New
}

export default function ManageSubscriptions({
    initialSubTab,
    subscriptionRequests = [],
    subscriptionStats = {},
    subscriptionHistory = [],
    subscriptionPlans = [],
    onApprove,
    onReject,
    onSavePlan
}: ManageSubscriptionsProps) {
    const [activeTab, setActiveTab] = useState<'plans' | 'requests'>(initialSubTab || 'plans');
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    const { dispatch } = useAppContext();
    const lastRef = useRef<string>('');

    useEffect(() => {
        if (lastRef.current === activeTab) return;
        lastRef.current = activeTab;
        dispatch({ type: 'SET_ADMIN_TAB', payload: { tab: 'subscriptions', subTab: activeTab } });
    }, [activeTab, dispatch]);

    useEffect(() => {
        // Sync logic if needed
    }, [subscriptionRequests]);

    const handleAction = async (id: string, action: (id: string) => Promise<void>) => {
        if (processingId) return;
        
        setHiddenIds(prev => new Set(prev).add(id));
        setProcessingId(id);

        try {
            await action(id);
        } catch (error) {
            console.error("Erro ao processar assinatura:", error);
            setHiddenIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            alert("Erro ao processar. Tente novamente.");
        } finally {
            setProcessingId(null);
        }
    };

    const displayRequests = subscriptionRequests.filter(req => !hiddenIds.has(req.id));

    return (
        <div className="w-full flex flex-col gap-6 animate-fade-in-up">
            
            <div className="mb-4">
                <Tabs 
                    items={[
                        { id: 'plans', label: 'Gerenciar Planos' },
                        { id: 'requests', label: 'Solicitações & Histórico', count: subscriptionRequests.length }
                    ]}
                    activeTab={activeTab}
                    onChange={(id) => setActiveTab(id as any)}
                    variant="solid"
                />
            </div>

            {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
                    {subscriptionPlans.map(plan => (
                        <div key={plan.name} className={`
                            relative bg-[#181818] border rounded-xl p-6 flex flex-col h-full group transition-all duration-300
                            ${plan.name === 'Hitmaker' ? 'border-[#FFD447]/50 shadow-[0_0_20px_rgba(255,212,71,0.15)]' : 'border-gray-800 hover:border-gray-600'}
                        `}>
                            {/* Header */}
                            <div className="mb-4 text-center">
                                {plan.highlight && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-[#FFD447] text-black px-2 py-0.5 rounded-full mb-2 inline-block">
                                        Destaque
                                    </span>
                                )}
                                <h3 className={`text-xl font-bold font-chakra uppercase ${plan.name === 'Hitmaker' ? 'text-[#FFD447]' : 'text-white'}`}>
                                    {plan.name}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">{plan.price}</p>
                            </div>

                            {/* Details */}
                            <div className="flex-grow space-y-4 mb-6 border-t border-gray-800 pt-4">
                                <div className="text-xs">
                                    <p className="text-gray-500 uppercase font-bold tracking-wider mb-1">Missões Diárias</p>
                                    <p className="text-white">{plan.dailyMissions}</p>
                                </div>
                                <div className="text-xs">
                                     <p className="text-gray-500 uppercase font-bold tracking-wider mb-1">Link Pagamento</p>
                                     <p className="text-blue-400 truncate cursor-pointer hover:underline" title={plan.paymentLink || 'Não configurado'}>
                                         {plan.paymentLink || 'Não configurado'}
                                     </p>
                                </div>
                            </div>

                            {/* Action */}
                            <button
                                onClick={() => setEditingPlan(plan)}
                                className="w-full py-3 rounded-lg bg-[#222] hover:bg-[#333] border border-[#444] hover:border-[#666] text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn"
                            >
                                <EditIcon className="w-4 h-4 text-gray-400 group-hover/btn:text-white" />
                                Editar Configurações
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="flex flex-col gap-8 animate-fade-in-up">
                    {/* Pendentes */}
                    <div className="card-block bg-[#181818] border border-gray-800 rounded-xl p-6">
                        <h3 className="block-title text-xl font-bold text-white mb-6 flex items-center gap-2">
                            Pedidos de Upgrade Pendentes 
                            <span className="bg-goldenYellow-500/20 text-goldenYellow-400 text-xs px-2 py-1 rounded-full border border-goldenYellow-500/30">
                                {displayRequests.length}
                            </span>
                        </h3>
                        
                        {displayRequests.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                                Nenhum pedido pendente no momento.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table-modern w-full text-left text-sm text-gray-400">
                                    <thead className="text-xs uppercase bg-gray-800/50 text-gray-300">
                                        <tr>
                                            <th className="px-4 py-3">Usuário</th>
                                            <th className="px-4 py-3">De/Para</th>
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3">Comprovante</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {displayRequests.map((req) => (
                                            <tr key={req.id} className="hover:bg-gray-800/30 transition-colors animate-fade-in-up">
                                                <td className="px-4 py-3 font-medium text-white">{req.userName}</td>
                                                <td className="px-4 py-3">
                                                    <span className="opacity-70">{req.currentPlan}</span> 
                                                    <span className="mx-2 text-gray-600">→</span> 
                                                    <span className="text-goldenYellow-400 font-bold">{req.requestedPlan}</span>
                                                </td>
                                                <td className="px-4 py-3">{new Date(req.requestedAt).toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-3">
                                                    {req.proofUrl ? (
                                                        <a 
                                                            href={req.proofUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-400 hover:text-blue-300 hover:underline font-medium flex items-center gap-1"
                                                        >
                                                            Ver Prova ↗
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-600 italic">Sem anexo</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); handleAction(req.id, onApprove); }}
                                                            disabled={!!processingId}
                                                            className="px-3 py-1.5 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wide min-w-[80px]"
                                                        >
                                                            Aprovar
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); handleAction(req.id, onReject); }}
                                                            disabled={!!processingId}
                                                            className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-600/50 font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wide min-w-[80px]"
                                                        >
                                                            Rejeitar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Histórico */}
                    <div className="card-block bg-[#181818] border border-gray-800 rounded-xl p-6">
                        <h3 className="block-title text-xl font-bold text-white mb-6">Histórico Recente</h3>

                        {subscriptionHistory.length === 0 ? (
                            <p className="text-gray-500 text-sm">Nenhum histórico disponível.</p>
                        ) : (
                            <div className="overflow-x-auto max-h-80 custom-scrollbar">
                                <table className="table-modern w-full text-left text-sm text-gray-400">
                                    <thead className="text-xs uppercase bg-gray-800/50 text-gray-300 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Usuário</th>
                                            <th className="px-4 py-3">Plano</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {subscriptionHistory.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-800/30">
                                                <td className="px-4 py-3 text-white">{log.userName}</td>
                                                <td className="px-4 py-3 text-xs">{log.newPlan || log.requestedPlan}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                        (log.eventType === 'UPGRADE' || log.status === 'approved') ? 'bg-green-900/20 text-green-400 border-green-500/30' : 
                                                        'bg-red-900/20 text-red-400 border-red-500/30'
                                                    }`}>
                                                        {log.eventType || (log.status === 'approved' ? 'Aprovado' : 'Rejeitado')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-mono">{new Date(log.changedAt || log.date || log.requestedAt).toLocaleString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Distribuição */}
                    <div className="card-block bg-[#181818] border border-gray-800 rounded-xl p-6">
                        <h3 className="block-title text-xl font-bold text-white mb-6">Distribuição de Assinantes</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(subscriptionStats).map(([plan, count]: any) => (
                                <div key={plan} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-300">{plan}</span>
                                    <span className="text-xl font-bold text-white">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {editingPlan && onSavePlan && (
                <AdminSubscriptionModal 
                    plan={editingPlan} 
                    onClose={() => setEditingPlan(null)} 
                    onSave={(p) => { onSavePlan(p); setEditingPlan(null); }} 
                />
            )}
        </div>
    );
}
