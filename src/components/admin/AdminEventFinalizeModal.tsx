
import React, { useState, useEffect, useMemo } from 'react';
import type { Event, StoreItem, UsableItem, User, EventPrizeConfig } from '../../types';
import { EventEngineUnified as EventEngineV7 } from '../../api/events/EventEngineUnified';
import { AdminEngine } from '../../api/admin/AdminEngine';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import AvatarWithFrame from '../AvatarWithFrame';
import { CrownIcon, CheckIcon, LockIcon, TrophyIcon } from '../../constants';
import { useAppContext } from '../../constants';
import EventAdminConfirmModal from './EventAdminConfirmModal';

interface AdminEventFinalizeModalProps {
  event: Event;
  onClose: () => void;
  storeItems: (StoreItem | UsableItem)[];
}

// Local type for sorting state
interface RankedUser {
    userId: string;
    userName: string;
    userAvatar: string;
    score: number;
    passType: 'normal' | 'vip';
    rank: number; // Editable rank
    isSelected: boolean; // For winner selection
}

const AdminEventFinalizeModal: React.FC<AdminEventFinalizeModalProps> = ({ event, onClose, storeItems }) => {
    const { state } = useAppContext();
    const adminId = state.activeUser?.id || 'admin';

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [rankingList, setRankingList] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Prize Config State
    const [prizes, setPrizes] = useState<{ normal: EventPrizeConfig; vip: EventPrizeConfig }>({
        normal: { coins: 500, xp: 1000, itemId: '' },
        vip: { coins: 1000, xp: 2000, itemId: '' }
    });

    // Step 1: Load and Freeze Ranking
    useEffect(() => {
        const loadRanking = async () => {
            // Initial load
            // Note: freezeEventRanking might not be implemented in V7/Unified, using getRanking as base
            // If freeze is required, it should be called via AdminEngine backend logic, but here we just fetch current state
            // EventEngineV7.getEventRanking returns a Promise due to withLatency
            const rawRanking = await EventEngineV7.getEventRanking(event.id);
            // Map to local state for editing
            const editable: RankedUser[] = rawRanking.map((r: any, i: number) => ({
                userId: r.userId,
                userName: r.userName,
                userAvatar: r.userAvatar,
                score: r.score,
                passType: r.passType,
                rank: i + 1,
                isSelected: i < 3 // Default select top 3
            }));
            setRankingList(editable);
            setIsLoading(false);
        };
        
        loadRanking();
    }, [event.id]);

    // Handlers for Ranking Manipulation
    const moveUser = (index: number, direction: -1 | 1) => {
        if (index + direction < 0 || index + direction >= rankingList.length) return;
        
        const newList = [...rankingList];
        const temp = newList[index];
        newList[index] = newList[index + direction];
        newList[index + direction] = temp;
        
        // Reassign ranks based on new order
        newList.forEach((u, i) => u.rank = i + 1);
        setRankingList(newList);
    };

    const toggleSelection = (index: number) => {
        const newList = [...rankingList];
        newList[index].isSelected = !newList[index].isSelected;
        setRankingList(newList);
    };

    // Handlers for Prize Config
    const updatePrize = (type: 'normal' | 'vip', field: keyof EventPrizeConfig, value: any) => {
        setPrizes(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
    };

    // Trigger Confirmation Modal
    const handleRequestFinalize = () => {
        setIsConfirmModalOpen(true);
    };

    // Execute Final Submission (Called by Modal)
    const handleExecuteFinalize = async () => {
        setIsSubmitting(true);
        try {
            // Extract selected winners
            const winners = rankingList
                .filter(u => u.isSelected)
                .map(u => ({ userId: u.userId, rank: u.rank, passType: u.passType }));

            // Enrich prize config with item names for log
            const enrichedPrizes = { ...prizes };
            if (enrichedPrizes.normal.itemId) {
                const item = storeItems.find(i => i.id === enrichedPrizes.normal.itemId);
                if (item) enrichedPrizes.normal.itemName = item.name;
            }
            if (enrichedPrizes.vip.itemId) {
                const item = storeItems.find(i => i.id === enrichedPrizes.vip.itemId);
                if (item) enrichedPrizes.vip.itemName = item.name;
            }

            await AdminEngine.adminDeliverEventPrizes({
                eventId: event.id,
                winners,
                prizes: enrichedPrizes,
                adminId
            });
            
            // Close Modals
            setIsConfirmModalOpen(false);
            onClose();
            // Optionally trigger a global refresh or alert here, but the engine handles notifications
            
        } catch (e: any) {
            console.error("Finalization Error:", e);
            alert("Erro ao finalizar: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedCount = rankingList.filter(u => u.isSelected).length;

    if (isLoading) return null;

    return (
        <>
            <ModalPortal>
                <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="bg-[#121212] w-full max-w-4xl rounded-[24px] border border-[#FFD86B]/30 flex flex-col max-h-[90vh] shadow-2xl relative overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-[#333] bg-[#181818] flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-white font-chakra uppercase tracking-wide">
                                    Finalizar Evento: <span className="text-[#FFD86B]">{event.title}</span>
                                </h2>
                                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
                                    Passo {step} de 3
                                </p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#222] text-gray-400 hover:text-white">✕</button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0E0E0E]">
                            
                            {/* STEP 1: RANKING ADJUSTMENT */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-blue-300 text-sm mb-4">
                                        <strong className="block mb-1">Instruções:</strong>
                                        O ranking foi congelado. Use os controles para ajustar posições em caso de empate técnico ou desqualificação manual. Marque os usuários que devem receber prêmios.
                                    </div>

                                    <div className="space-y-2">
                                        {rankingList.map((user, index) => (
                                            <div key={user.userId} className={`flex items-center p-3 rounded-lg border transition-colors ${user.isSelected ? 'bg-[#FFD86B]/10 border-[#FFD86B]/50' : 'bg-[#181818] border-[#333]'}`}>
                                                <div className="w-8 flex flex-col gap-1 mr-3">
                                                    <button onClick={() => moveUser(index, -1)} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-20">▲</button>
                                                    <button onClick={() => moveUser(index, 1)} disabled={index === rankingList.length - 1} className="text-gray-500 hover:text-white disabled:opacity-20">▼</button>
                                                </div>
                                                
                                                <div className="w-8 h-8 flex items-center justify-center bg-[#222] rounded font-bold text-white mr-4">
                                                    {user.rank}
                                                </div>
                                                
                                                <div className="flex items-center gap-3 flex-grow">
                                                    <img src={user.userAvatar} className="w-10 h-10 rounded-full border border-[#444]" />
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{user.userName}</p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span>{user.score} PTS</span>
                                                            {user.passType === 'vip' && <span className="text-[#FFD86B] border border-[#FFD86B]/30 px-1 rounded text-[9px] uppercase">VIP</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <span className="text-xs text-gray-400 uppercase font-bold">Vencedor</span>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={user.isSelected} 
                                                            onChange={() => toggleSelection(index)}
                                                            className="w-5 h-5 rounded border-gray-600 bg-[#222] text-[#FFD86B] focus:ring-[#FFD86B]" 
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                        {rankingList.length === 0 && <p className="text-center text-gray-500 py-10">Nenhum participante encontrado.</p>}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: PRIZE CONFIG */}
                            {step === 2 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Normal Config */}
                                    <div className="bg-[#181818] p-6 rounded-xl border border-[#333]">
                                        <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">Prêmios: Passe Normal</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Lummi Coins</label>
                                                <input type="number" value={prizes.normal.coins} onChange={e => updatePrize('normal', 'coins', Number(e.target.value))} className="w-full bg-[#111] border border-[#444] rounded p-2 text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 uppercase font-bold mb-1">XP</label>
                                                <input type="number" value={prizes.normal.xp} onChange={e => updatePrize('normal', 'xp', Number(e.target.value))} className="w-full bg-[#111] border border-[#444] rounded p-2 text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Item Extra (Opcional)</label>
                                                <select value={prizes.normal.itemId || ''} onChange={e => updatePrize('normal', 'itemId', e.target.value)} className="w-full bg-[#111] border border-[#444] rounded p-2 text-white text-sm">
                                                    <option value="">Nenhum</option>
                                                    {storeItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.price} LC)</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* VIP Config */}
                                    <div className="bg-[#181818] p-6 rounded-xl border border-[#FFD86B]/30 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2"><CrownIcon className="w-24 h-24 text-[#FFD86B]/5" /></div>
                                        <h3 className="text-lg font-bold text-[#FFD86B] mb-4 border-b border-[#FFD86B]/20 pb-2">Prêmios: Golden Pass (VIP)</h3>
                                        <div className="space-y-4 relative z-10">
                                            <div>
                                                <label className="block text-xs text-[#FFD86B]/70 uppercase font-bold mb-1">Lummi Coins (VIP)</label>
                                                <input type="number" value={prizes.vip.coins} onChange={e => updatePrize('vip', 'coins', Number(e.target.value))} className="w-full bg-[#111] border border-[#FFD86B]/30 rounded p-2 text-white focus:border-[#FFD86B]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[#FFD86B]/70 uppercase font-bold mb-1">XP (VIP)</label>
                                                <input type="number" value={prizes.vip.xp} onChange={e => updatePrize('vip', 'xp', Number(e.target.value))} className="w-full bg-[#111] border border-[#FFD86B]/30 rounded p-2 text-white focus:border-[#FFD86B]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[#FFD86B]/70 uppercase font-bold mb-1">Item Lendário (Opcional)</label>
                                                <select value={prizes.vip.itemId || ''} onChange={e => updatePrize('vip', 'itemId', e.target.value)} className="w-full bg-[#111] border border-[#FFD86B]/30 rounded p-2 text-white text-sm focus:border-[#FFD86B]">
                                                    <option value="">Nenhum</option>
                                                    {storeItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.price} LC)</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: REVIEW */}
                            {step === 3 && (
                                <div className="space-y-6 text-center">
                                    <div className="p-6 bg-[#1A1A1A] rounded-2xl border border-gray-700 inline-block w-full max-w-lg">
                                        <TrophyIcon className="w-12 h-12 text-[#FFD86B] mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-white mb-2">Pronto para Finalizar?</h3>
                                        <p className="text-gray-400 text-sm">
                                            Você selecionou <span className="text-white font-bold">{selectedCount} vencedor(es)</span>.
                                        </p>
                                        <div className="mt-6 text-left bg-[#111] p-4 rounded-lg text-xs space-y-2 border border-[#333]">
                                            <p className="text-gray-500 uppercase font-bold">Resumo da Entrega:</p>
                                            <p className="text-white">• {selectedCount} notificações serão enviadas.</p>
                                            <p className="text-white">• Créditos de XP/Coins serão processados.</p>
                                            <p className="text-white">• Evento será marcado como encerrado.</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-start gap-3 max-w-lg mx-auto text-left">
                                        <LockIcon className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p>Esta ação é definitiva. Certifique-se de que o ranking está correto e os prêmios conferidos.</p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[#333] bg-[#181818] flex justify-between items-center">
                            <button 
                                onClick={() => setStep(prev => Math.max(1, prev - 1) as any)}
                                disabled={step === 1 || isSubmitting}
                                className="px-6 py-3 rounded-xl bg-[#222] text-gray-300 font-bold hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Voltar
                            </button>
                            
                            <div className="flex gap-2">
                                {step === 1 && (
                                    <div className="text-xs text-gray-500 self-center mr-4">Selecione os vencedores para continuar</div>
                                )}
                                {step < 3 ? (
                                    <button 
                                        onClick={() => setStep(prev => prev + 1 as any)}
                                        disabled={selectedCount === 0}
                                        className="px-8 py-3 rounded-xl bg-[#FFD86B] text-black font-black uppercase tracking-wider hover:bg-[#F6C560] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Próximo ➜
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleRequestFinalize}
                                        disabled={isSubmitting}
                                        className="px-8 py-3 rounded-xl bg-green-600 text-white font-black uppercase tracking-wider hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
                                    >
                                        <CheckIcon className="w-5 h-5" /> Entregar Prêmios e Encerrar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </ModalPortal>

            {/* CONFIRMATION MODAL */}
            <EventAdminConfirmModal 
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleExecuteFinalize}
                isProcessing={isSubmitting}
                title="Confirmar Encerramento"
                description={
                    <>
                        <p>Você está prestes a encerrar o evento <strong>"{event.title}"</strong>.</p>
                        <ul className="text-left list-disc pl-6 mt-4 space-y-2 text-gray-300">
                            <li>O ranking será congelado permanentemente.</li>
                            <li><strong>{selectedCount}</strong> usuários receberão seus prêmios.</li>
                            <li>Notificações serão enviadas automaticamente.</li>
                            <li>O evento sairá da lista de ativos.</li>
                        </ul>
                    </>
                }
            />
        </>
    );
};

export default AdminEventFinalizeModal;
