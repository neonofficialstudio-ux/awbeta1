
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { Raffle, RaffleTicket, StoreItem, UsableItem, User } from '../../types';
import AdminRaffleModal from './AdminRaffleModal';
import AdminRaffleDrawModalV2 from './AdminRaffleDrawModalV2';
import ConfirmationModal from './ConfirmationModal';
import AdminRaffleParticipantsModal from './AdminRaffleParticipantsModal';
import { EditIcon, DeleteIcon, UsersIcon, TrophyIcon, StarIcon, CheckIcon } from '../../constants';
import * as api from '../../api/index';
import { adminPrepareRaffleDraw, adminConfirmRaffleWinner, adminForceUpdateRaffleStates, adminSetHighlightedRaffle, adminAwardManual, adminPreviewDrawRaffle, adminDrawRaffleWithRef } from '../../api/admin/raffles';
import { PrizeResolver } from '../../api/raffles/prize.resolver';
import AvatarWithFrame from '../AvatarWithFrame';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import { getSupabase } from '../../api/supabase/client';
import { getDisplayName } from '../../api/core/getDisplayName';
import { config } from '../../core/config';

interface ManageRafflesProps {
    raffles: Raffle[];
    allTickets: RaffleTicket[];
    storeItems: StoreItem[];
    usableItems: UsableItem[];
    allUsers: User[];
    highlightedRaffleId?: string | null;
    onSaveRaffle: (raffle: any) => void;
    onDeleteRaffle: (raffleId: string) => void;
    onDrawWinner: (raffleId: string) => void; 
    refreshAdminData: () => Promise<void>;
}

const ActionButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; className?: string }> = ({ onClick, title, children, className = '' }) => (
    <button onClick={onClick} title={title} className={`p-2 rounded-md transition-colors ${className}`}>
        {children}
    </button>
);

const DigitalCountdown: React.FC<{ targetDate: string; large?: boolean; label?: string }> = ({ targetDate, large = false, label }) => {
    const calculateTimeLeft = useCallback(() => {
        const difference = +new Date(targetDate) - +new Date();
        if (difference > 0) {
            return {
                dias: Math.floor(difference / (1000 * 60 * 60 * 24)),
                horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutos: Math.floor((difference / 1000 / 60) % 60),
                segundos: Math.floor((difference / 1000) % 60)
            };
        }
        return null;
    }, [targetDate]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    if (!timeLeft) {
        return null; 
    }

    return (
        <div>
            {label && <p className="text-xs text-gray-500 uppercase font-bold mb-2">{label}</p>}
            <div className={`flex gap-2 ${large ? 'gap-4' : 'gap-2'}`}>
                {Object.entries(timeLeft).map(([label, value]) => (
                    <div key={label} className="flex flex-col items-center">
                        <div className={`
                            flex items-center justify-center font-mono font-bold bg-black/50 rounded-md border border-white/10
                            ${large ? 'w-16 h-16 text-3xl text-white shadow-[0_0_15px_rgba(157,77,255,0.3)]' : 'w-10 h-10 text-lg text-gray-200'}
                        `}>
                            {String(value).padStart(2, '0')}
                        </div>
                        <span className={`uppercase mt-1 font-bold ${large ? 'text-xs text-[#9d4dff]' : 'text-[8px] text-gray-500'}`}>
                            {label.substring(0, 3)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
// Jackpot removido do produto (Admin): UI/fluxo descontinuados.

const ManageRaffles: React.FC<ManageRafflesProps> = ({ raffles: initialRaffles, allTickets, storeItems, usableItems, allUsers, highlightedRaffleId, onSaveRaffle, onDeleteRaffle, refreshAdminData }) => {
    const [rafflesList, setRafflesList] = useState<Raffle[]>(initialRaffles);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
    const [raffleToDelete, setRaffleToDelete] = useState<Raffle | null>(null);
    const [viewingParticipantsFor, setViewingParticipantsFor] = useState<Raffle | null>(null);
    
    const [drawModalRaffle, setDrawModalRaffle] = useState<Raffle | null>(null);
    const [drawParticipants, setDrawParticipants] = useState<User[]>([]);
    const [drawTickets, setDrawTickets] = useState<RaffleTicket[]>([]);
    const [lastDraw, setLastDraw] = useState<{ raffle: Raffle; winner: User | null } | null>(null);

    // ✅ Enterprise confirm modal (preview -> approve)
    const [drawConfirmOpen, setDrawConfirmOpen] = useState(false);
    const [drawConfirmRaffle, setDrawConfirmRaffle] = useState<Raffle | null>(null);
    const [drawRefId, setDrawRefId] = useState<string>('');
    const [drawPreview, setDrawPreview] = useState<any>(null);
    const [drawPhase, setDrawPhase] = useState<'loading' | 'ready' | 'confirming'>('loading');

    // ✅ Premiação Manual (Supabase)
    const [isManualAwardOpen, setIsManualAwardOpen] = useState(false);
    const [manualPrizeType, setManualPrizeType] = useState<'coins' | 'item' | 'hybrid' | 'manual_text'>('manual_text');
    const [manualUserId, setManualUserId] = useState<string>('');
    const [manualItemId, setManualItemId] = useState<string>('');
    const [manualCoinReward, setManualCoinReward] = useState<number>(0);
    const [manualText, setManualText] = useState<string>('');
    const [isManualSubmitting, setIsManualSubmitting] = useState(false);

    useEffect(() => {
        setRafflesList(initialRaffles);
    }, [initialRaffles]);

    useEffect(() => {
        if (config.backendProvider !== 'supabase') {
            adminForceUpdateRaffleStates();
        }
    }, []);

    const handleOpenModal = (raffle: Raffle | null = null) => {
        setEditingRaffle(raffle);
        setIsModalOpen(true);
    };

    const handleSaveAndClose = async (raffleData: any) => {
        await onSaveRaffle(raffleData);
        setIsModalOpen(false);
    };
    
    const handleConfirmDelete = async () => {
        if (raffleToDelete) {
            await onDeleteRaffle(raffleToDelete.id);
            setRaffleToDelete(null);
        }
    };

    const handleInitiateDraw = async (raffle: Raffle) => {
        // ✅ Supabase: backend faz o draw + premia (coins/item/hybrid) de forma auditável
        if (config.backendProvider === 'supabase') {
            try {
                // Enterprise flow: preview -> admin approve
                const refId = crypto.randomUUID();
                setDrawRefId(refId);
                setDrawConfirmRaffle(raffle);
                setDrawPreview(null);
                setDrawPhase('loading');
                setDrawConfirmOpen(true);

                const preview = await adminPreviewDrawRaffle(raffle.id, refId);
                setDrawPreview(preview);
                setDrawPhase('ready');
                return;
            } catch (e: any) {
                toast.error(e?.message || 'Erro ao apurar sorteio.');
                return;
            }
        }

        try {
            const data = await adminPrepareRaffleDraw(raffle.id);
            setDrawParticipants(data.users);
            setDrawTickets(data.tickets);
            setDrawModalRaffle(raffle);
        } catch (e: any) {
            alert("Erro ao preparar sorteio: " + e.message);
        }
    };

    const confirmDraw = async () => {
        if (!drawConfirmRaffle || !drawRefId) return;
        setDrawPhase('confirming');
        try {
            const res: any = await adminDrawRaffleWithRef(drawConfirmRaffle.id, drawRefId);
            const winnerId = res?.winner_user_id || res?.winnerUserId || res?.winnerId || null;
            const winner = winnerId ? (allUsers || []).find((u) => u.id === winnerId) || null : null;
            setDrawConfirmOpen(false);
            setDrawConfirmRaffle(null);
            setDrawPreview(null);
            toast.success('Apuração concluída! Vencedor definido e prêmio registrado.');
            setLastDraw({ raffle: drawConfirmRaffle, winner });
            await refreshAdminData();
        } catch (e: any) {
            // ✅ Hardening: Supabase/PostgREST pode retornar 409 em retry/double-click/estado já aplicado.
            const status = Number(e?.status ?? 0);
            const code = String(e?.code ?? '');
            const msg = e?.message || e?.details || e?.hint || 'Falha ao confirmar apuração.';

            // 409 / 23505 = conflito (normalmente retry/duplicidade). Não vamos "assumir sucesso":
            // vamos checar o estado real do raffle no banco.
            if ((status === 409 || code === '23505') && drawConfirmRaffle?.id) {
                try {
                    const supabase = getSupabase();
                    if (supabase) {
                        const { data: r, error: readErr } = await supabase
                            .from('raffles')
                            .select('id,status,winner_user_id,winner_defined_at')
                            .eq('id', drawConfirmRaffle.id)
                            .single();

                        if (!readErr && r && (r.status === 'winner_defined' || r.winner_user_id)) {
                            const winnerId = (r as any).winner_user_id || null;
                            const winner = winnerId ? (allUsers || []).find((u) => u.id === winnerId) || null : null;

                            toast.success('Apuração já estava definida. Painel atualizado.');
                            setDrawConfirmOpen(false);
                            setDrawConfirmRaffle(null);
                            setDrawPreview(null);
                            setLastDraw({ raffle: drawConfirmRaffle, winner });
                            await refreshAdminData();
                            setDrawPhase('loading');
                            return;
                        }
                    }
                } catch {
                    // se falhar a leitura, cai no erro padrão abaixo
                }

                toast.error('Conflito ao confirmar apuração (409). Tente novamente.');
                setDrawPhase('ready');
                return;
            }

            toast.error(msg);
            setDrawPhase('ready');
        }
    };

    const formatPrizeAdmin = (r: any) => {
        const type = (r?.prizeType || r?.prize_type || '').toLowerCase();
        if (type === 'coins') return `+${Number(r?.coinReward ?? 0)} LC`;
        if (type === 'item') return 'ITEM';
        if (type === 'hybrid') return `ITEM + ${Number(r?.coinReward ?? 0)} LC`;
        if (type === 'manual_text') return 'TEXTO';
        return (type || '—').toUpperCase();
    };

    const handleConfirmRaffleWinner = async (winnerId: string) => {
        if (!drawModalRaffle) return;
        const adminId = 'admin'; 
        try {
            const result = await adminConfirmRaffleWinner(drawModalRaffle.id, winnerId, adminId);
            if (result.success) {
                setDrawModalRaffle(null);
                alert(`Vencedor confirmado: ${result.winner.name}.`);
            }
        } catch (e: any) {
            alert("Erro ao confirmar: " + e.message);
        }
    };

    const handleSetHighlight = async (id: string) => {
        await adminSetHighlightedRaffle(id);
        await refreshAdminData();
    };

    const openManualAward = () => {
        setManualPrizeType('manual_text');
        setManualUserId(allUsers?.[0]?.id || '');
        setManualItemId('');
        setManualCoinReward(0);
        setManualText('');
        setIsManualAwardOpen(true);
    };

    const submitManualAward = async () => {
        if (!manualUserId) {
            toast.error('Selecione um usuário.');
            return;
        }

        if ((manualPrizeType === 'item' || manualPrizeType === 'hybrid') && !manualItemId) {
            toast.error('Selecione um item.');
            return;
        }

        if ((manualPrizeType === 'coins' || manualPrizeType === 'hybrid') && (!manualCoinReward || manualCoinReward <= 0)) {
            toast.error('Informe a quantidade de coins.');
            return;
        }

        setIsManualSubmitting(true);
        try {
            if (config.backendProvider === 'supabase') {
                await adminAwardManual({
                    userId: manualUserId,
                    prizeType: manualPrizeType,
                    itemId: (manualPrizeType === 'item' || manualPrizeType === 'hybrid') ? manualItemId : null,
                    coinReward: (manualPrizeType === 'coins' || manualPrizeType === 'hybrid') ? manualCoinReward : null,
                    customText: manualText || null,
                });
                toast.success('Premiação manual registrada!');
                setIsManualAwardOpen(false);
                await refreshAdminData();
            } else {
                toast.error('Premiação manual está disponível apenas no modo Supabase.');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Falha ao registrar premiação manual.');
        } finally {
            setIsManualSubmitting(false);
        }
    };

    const allItems = [...storeItems, ...usableItems];
    const now = new Date();
    const getDerivedStatus = (raffle: Raffle) => {
        if (raffle?.status === 'winner_defined' || raffle?.winnerId) {
            return 'winner_defined';
        }
        if (raffle?.status === 'awaiting_draw' || raffle?.status === 'drawing') {
            return 'in_apuration';
        }
        if (raffle?.status === 'ended' || raffle?.status === 'finished') {
            return 'ended';
        }

        const endsAt = raffle?.endsAt ? new Date(raffle.endsAt) : null;
        const startsAt = raffle?.startsAt ? new Date(raffle.startsAt) : null;

        if (endsAt && !Number.isNaN(endsAt.getTime()) && now >= endsAt) {
            return 'in_apuration';
        }

        if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) {
            return 'scheduled';
        }

        return raffle?.status || 'active';
    };

    const derivedRaffles = rafflesList.map((raffle) => ({ ...raffle, __derivedStatus: getDerivedStatus(raffle) }));
    const activeRaffles = derivedRaffles.filter(raffle => raffle.__derivedStatus === 'active');
    const scheduledRaffles = derivedRaffles.filter(raffle => raffle.__derivedStatus === 'scheduled');
    const awaitingDrawRaffles = derivedRaffles.filter(raffle => raffle.__derivedStatus === 'in_apuration');
    const finishedRaffles = derivedRaffles.filter(raffle => raffle.__derivedStatus === 'winner_defined' || raffle.status === 'ended' || raffle.status === 'finished');

    return (
        <>
            <div className="space-y-12">
                {/* Jackpot removido do painel Admin */}

                {/* AWAITING DRAW */}
                {awaitingDrawRaffles.length > 0 && (
                    <div className="bg-blue-900/10 p-6 rounded-xl border border-blue-500/50 shadow-lg shadow-blue-900/20 animate-pulse-slow">
                        <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
                            <CheckIcon className="w-6 h-6" /> Aguardando Definição ({awaitingDrawRaffles.length})
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {awaitingDrawRaffles.map(raffle => {
                                const ticketCount = allTickets.filter(t => t.raffleId === raffle.id).length;
                                return (
                                    <div key={raffle.id} className="bg-[#0E0E0E] p-4 rounded-lg border border-blue-500/30 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <img src={raffle.itemImageUrl} className="w-12 h-12 rounded border border-blue-500/50" />
                                            <div>
                                                <h4 className="text-white font-bold">{raffle.itemName}</h4>
                                                <p className="text-blue-400 text-xs">Encerrado em {new Date(raffle.endsAt).toLocaleString()} • {ticketCount} bilhetes</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleInitiateDraw(raffle)}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-lg shadow-lg transition-all hover:scale-105"
                                        >
                                            Sortear Agora
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ACTIVE TABLE */}
                <div className="bg-[#121212] p-6 rounded-xl border border-gray-800 space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Sorteios Ativos & Agendados</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={openManualAward}
                                    className="bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 hover:border-neon-cyan/50 font-bold py-2 px-4 rounded-lg transition-colors shadow-lg"
                                >
                                    + Premiação Manual
                                </button>
                                <button onClick={() => handleOpenModal()} className="bg-goldenYellow-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-goldenYellow-400 transition-colors shadow-lg">
                                    + Criar Sorteio
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-3">Prêmio</th>
                                        <th className="px-6 py-3">Tipo</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Bilhetes</th>
                                        <th className="px-6 py-3">Prazo</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...activeRaffles, ...scheduledRaffles].map(raffle => {
                                        const ticketCount = allTickets.filter(t => t.raffleId === raffle.id).length;
                                        const prize = PrizeResolver.resolve(raffle);
                                        const dStatus = raffle.__derivedStatus;
                                        
                                        return (
                                            <tr key={raffle.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    <div className="flex items-center gap-3">
                                                        <img src={prize.displayImage} alt={prize.displayTitle} className="w-8 h-8 rounded object-cover border border-gray-700" />
                                                        <div className="min-w-0">
                                                            <p className="font-black truncate">{(raffle as any)?.meta?.title || raffle.itemName}</p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                Prêmio: <span className="text-gray-300">{prize.displayTitle}</span>
                                                            </p>
                                                            {prize.warning && <span className="text-[9px] text-red-400 uppercase font-bold">{prize.warning}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs uppercase font-bold text-gray-500">{prize.type}</td>
                                                <td className="px-6 py-4">
                                                    {dStatus === 'active' && (
                                                        <span className="text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-500/30">ATIVO</span>
                                                    )}
                                                    {dStatus === 'scheduled' && (
                                                        <span className="text-blue-400 bg-blue-900/20 px-2 py-1 rounded text-xs font-bold border border-blue-500/30">AGENDADO</span>
                                                    )}
                                                    {dStatus === 'in_apuration' && (
                                                        <span className="text-red-300 bg-red-900/20 px-2 py-1 rounded text-xs font-black border border-red-500/30 animate-pulse">EM APURAÇÃO</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-bold">{ticketCount}</td>
                                                <td className="px-6 py-4 text-xs font-mono">{new Date(raffle.endsAt).toLocaleString('pt-BR')}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-1">
                                                        {raffle.__derivedStatus === 'in_apuration' && ticketCount > 0 && (
                                                            <ActionButton
                                                                onClick={() => handleInitiateDraw(raffle)}
                                                                title="Apurar / Sortear agora"
                                                                className="text-red-300 hover:bg-red-500/15"
                                                            >
                                                                <TrophyIcon className="w-5 h-5" />
                                                            </ActionButton>
                                                        )}
                                                        <ActionButton onClick={() => handleSetHighlight(raffle.id)} title="Definir Destaque" className="text-yellow-300 hover:bg-yellow-500/20">
                                                            <StarIcon className={`w-5 h-5 ${raffle.id === highlightedRaffleId ? "text-yellow-400 animate-pulse" : "text-gray-500"}`} />
                                                        </ActionButton>
                                                        <ActionButton onClick={() => setViewingParticipantsFor(raffle)} title="Ver Participantes" className="text-blue-400 hover:bg-blue-500/20"><UsersIcon className="w-5 h-5" /></ActionButton>
                                                        <ActionButton onClick={() => handleOpenModal(raffle)} title="Editar" className="text-goldenYellow-400 hover:bg-goldenYellow-500/20"><EditIcon className="w-5 h-5" /></ActionButton>
                                                        <ActionButton onClick={() => setRaffleToDelete(raffle)} title="Remover" className="text-red-500 hover:bg-red-500/20"><DeleteIcon className="w-5 h-5" /></ActionButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                     {/* FINISHED RAFFLES */}
                     <div>
                        <h3 className="text-lg font-bold text-gray-400 mb-4 border-b border-gray-800 pb-2">Histórico</h3>
                        <div className="overflow-x-auto max-h-60 custom-scrollbar">
                            <table className="w-full text-sm text-left text-gray-500">
                                <tbody className="divide-y divide-[#222]">
                                    {finishedRaffles.map(raffle => (
                                        <tr key={raffle.id} className="hover:bg-[#181818]">
                                            <td className="px-6 py-3 text-gray-300">{raffle.itemName}</td>
                                            <td className="px-6 py-3">
                                                {raffle.__derivedStatus !== 'winner_defined' && raffle.status === 'ended'
                                                    ? <span className="text-gray-400 bg-gray-800 px-2 py-1 rounded text-xs">SEM VENCEDOR</span>
                                                    : <span className="text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs border border-green-500/20">FINALIZADO</span>
                                                }
                                            </td>
                                            <td className="px-6 py-3 text-xs text-white/70">
                                                <span className="text-white/40">Premiação:</span>{' '}
                                                <span className="text-white font-bold">{formatPrizeAdmin(raffle)}</span>
                                                <span className="mx-2 text-white/20">•</span>
                                                <span className="text-white/40">Vencedor:</span>{' '}
                                                <strong className="text-goldenYellow-500">
                                                    {raffle.winnerId
                                                        ? (getDisplayName((allUsers || []).find(user => user.id === raffle.winnerId) as User)
                                                            || raffle.winnerId.slice(0, 8))
                                                        : '-'}
                                                </strong>
                                                <span className="mx-2 text-white/20">•</span>
                                                <span className="text-white/40">Apurado em:</span>{' '}
                                                <span className="text-white/70">
                                                    {raffle.winnerDefinedAt ? new Date(raffle.winnerDefinedAt).toLocaleString('pt-BR') : '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <ActionButton onClick={() => setRaffleToDelete(raffle)} title="Apagar Histórico" className="text-red-900 hover:text-red-500"><DeleteIcon className="w-4 h-4" /></ActionButton>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jackpot removido: modais não renderizados */}
            
            {drawModalRaffle && (
                <AdminRaffleDrawModalV2 
                    raffle={drawModalRaffle} 
                    participants={drawParticipants} 
                    tickets={drawTickets}
                    onClose={() => setDrawModalRaffle(null)}
                    onConfirmWinner={handleConfirmRaffleWinner}
                />
            )}

            {lastDraw && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setLastDraw(null)}>
                        <div className="bg-[#0E0E0E] rounded-2xl border border-neon-cyan/30 w-full max-w-lg p-6 shadow-[0_0_60px_rgba(0,230,255,0.12)]" onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-black text-white uppercase tracking-wide">Apuração Concluída</h3>
                                <button onClick={() => setLastDraw(null)} className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10">✕</button>
                            </div>

                            <div className="flex items-center gap-4 border border-white/10 rounded-xl p-4 bg-white/5">
                                <img
                                    src={PrizeResolver.resolve(lastDraw.raffle).displayImage}
                                    className="w-14 h-14 rounded-lg object-cover border border-white/10"
                                />
                                <div className="flex-1">
                                    <p className="text-white font-black">{PrizeResolver.resolve(lastDraw.raffle).displayTitle}</p>
                                    <p className="text-xs text-white/50">Sorteio: {lastDraw.raffle.id}</p>
                                    <p className="text-xs text-white/50">Tipo: {(PrizeResolver.resolve(lastDraw.raffle).type || '').toUpperCase()}</p>
                                </div>
                            </div>

                            <div className="mt-4 border border-white/10 rounded-xl p-4 bg-black/30">
                                <p className="text-xs text-white/50 uppercase font-bold mb-2">Vencedor</p>
                                {lastDraw.winner ? (
                                    <div className="flex items-center gap-3">
                                        <AvatarWithFrame user={lastDraw.winner as User} sizeClass="w-12 h-12" />
                                        <div>
                                            <p className="text-white font-black">{getDisplayName(lastDraw.winner as User) || lastDraw.winner.id.slice(0, 8)}</p>
                                            <p className="text-xs text-white/50">{lastDraw.winner.id}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-white/70 text-sm">Vencedor registrado no backend (ID indisponível no cache de usuários).</p>
                                )}
                                <p className="mt-3 text-xs text-neon-cyan">
                                    ✅ Prêmio já foi registrado automaticamente (coins/inventário) pelo Supabase.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setLastDraw(null)}
                                    className="px-5 py-2 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 hover:border-neon-cyan/50 font-black"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* ✅ Enterprise: modal de confirmação do draw (preview -> approve/recuse) */}
            {drawConfirmOpen && drawConfirmRaffle && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setDrawConfirmOpen(false)}>
                        <div className="bg-[#0E0E0E] rounded-2xl border border-neon-cyan/30 w-full max-w-2xl p-6 shadow-[0_0_60px_rgba(0,230,255,0.12)]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-black text-white uppercase tracking-wide">Confirmar Apuração</h3>
                                <button onClick={() => setDrawConfirmOpen(false)} className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10">✕</button>
                            </div>

                            {/* “sorteio acontecendo” */}
                            <div className="border border-white/10 rounded-xl p-4 bg-white/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-black">{drawConfirmRaffle.itemName}</p>
                                        <p className="text-xs text-white/50">Raffle ID: {drawConfirmRaffle.id}</p>
                                    </div>
                                    <span className={`text-xs font-black px-3 py-1 rounded border ${drawPhase === 'loading' ? 'text-yellow-300 border-yellow-500/30 bg-yellow-900/20' : 'text-neon-cyan border-neon-cyan/40 bg-neon-cyan/10'}`}>
                                        {drawPhase === 'loading' ? 'SORTEANDO…' : drawPhase === 'confirming' ? 'CONFIRMANDO…' : 'PRÉVIA PRONTA'}
                                    </span>
                                </div>
                                <div className="mt-3 h-2 w-full bg-[#1a1a1a] rounded-full overflow-hidden border border-white/10">
                                    <div className={`h-full ${drawPhase === 'loading' || drawPhase === 'confirming' ? 'animate-pulse bg-neon-cyan/60' : 'bg-neon-cyan/30'}`} style={{ width: drawPhase === 'loading' ? '55%' : drawPhase === 'confirming' ? '85%' : '100%' }} />
                                </div>
                            </div>

                            {/* resultado */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-white/10 rounded-xl p-4 bg-black/30">
                                    <p className="text-xs text-white/50 uppercase font-bold mb-2">Vencedor (prévia)</p>
                                    {drawPreview?.winner_user_id ? (
                                        (() => {
                                            const w = (allUsers || []).find(u => u.id === drawPreview.winner_user_id) || null;
                                            return w ? (
                                                <div className="flex items-center gap-3">
                                                    <AvatarWithFrame user={w as any} sizeClass="w-12 h-12" />
                                                    <div>
                                                        <p className="text-white font-black">{getDisplayName(w as any) || w.id.slice(0, 8)}</p>
                                                        <p className="text-xs text-white/50">{w.id}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-white/80 text-sm font-mono">{drawPreview.winner_user_id}</p>
                                            );
                                        })()
                                    ) : (
                                        <p className="text-white/60 text-sm">{drawPhase === 'loading' ? 'Calculando vencedor…' : '—'}</p>
                                    )}
                                </div>

                                <div className="border border-white/10 rounded-xl p-4 bg-black/30">
                                    <p className="text-xs text-white/50 uppercase font-bold mb-2">Prêmio</p>
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={PrizeResolver.resolve(drawConfirmRaffle).displayImage}
                                            className="w-12 h-12 rounded-lg object-cover border border-white/10"
                                        />
                                        <div>
                                            <p className="text-white font-black">{PrizeResolver.resolve(drawConfirmRaffle).displayTitle}</p>
                                            <p className="text-xs text-white/50">Tipo: {(PrizeResolver.resolve(drawConfirmRaffle).type || '').toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs text-white/60">
                                        Ao <span className="text-neon-cyan font-bold">aprovar</span>, o Supabase registra automaticamente (coins/inventário).
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setDrawConfirmOpen(false)}
                                    className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold"
                                    disabled={drawPhase === 'confirming'}
                                >
                                    Recusar
                                </button>
                                <button
                                    onClick={confirmDraw}
                                    className="px-6 py-2 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 hover:border-neon-cyan/50 font-black disabled:opacity-60 disabled:cursor-not-allowed"
                                    disabled={drawPhase !== 'ready'}
                                >
                                    Aprovar e Premiar
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {isModalOpen && <AdminRaffleModal raffle={editingRaffle} allItems={allItems} onClose={() => setIsModalOpen(false)} onSave={handleSaveAndClose} />}
            {viewingParticipantsFor && <AdminRaffleParticipantsModal raffle={viewingParticipantsFor} allTickets={allTickets} allUsers={allUsers} onClose={() => setViewingParticipantsFor(null)} />}
            
            <ConfirmationModal isOpen={!!raffleToDelete} onClose={() => setRaffleToDelete(null)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o sorteio?`} confirmButtonText="Sim, Excluir" />

            {/* ✅ MODAL: PREMIAÇÃO MANUAL (SUPABASE) */}
            {isManualAwardOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setIsManualAwardOpen(false)}>
                        <div className="bg-[#0E0E0E] rounded-2xl border border-neon-cyan/30 w-full max-w-lg p-6 shadow-[0_0_60px_rgba(0,230,255,0.12)]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-black text-white uppercase tracking-wide">Premiação Manual</h3>
                                <button onClick={() => setIsManualAwardOpen(false)} className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10">✕</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-white/60 uppercase font-bold block mb-1">Usuário</label>
                                    <select
                                        value={manualUserId}
                                        onChange={(e) => setManualUserId(e.target.value)}
                                        className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                                    >
                                        {(allUsers || []).map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {getDisplayName(u) || u.id.slice(0, 8)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-white/60 uppercase font-bold block mb-1">Tipo</label>
                                    <select
                                        value={manualPrizeType}
                                        onChange={(e) => setManualPrizeType(e.target.value as any)}
                                        className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                                    >
                                        <option value="manual_text">Texto (apenas notificação)</option>
                                        <option value="coins">Coins</option>
                                        <option value="item">Item (Inventário)</option>
                                        <option value="hybrid">Híbrido (Item + Coins)</option>
                                    </select>
                                </div>

                                {(manualPrizeType === 'item' || manualPrizeType === 'hybrid') && (
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-white/60 uppercase font-bold block mb-1">Item</label>
                                        <select
                                            value={manualItemId}
                                            onChange={(e) => setManualItemId(e.target.value)}
                                            className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                                        >
                                            <option value="">Selecione...</option>
                                            {allItems.map((i: any) => (
                                                <option key={i.id} value={i.id}>
                                                    {i.name} {i.price ? `(Preço: ${i.price})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(manualPrizeType === 'coins' || manualPrizeType === 'hybrid') && (
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-white/60 uppercase font-bold block mb-1">Coins</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={manualCoinReward}
                                            onChange={(e) => setManualCoinReward(Number(e.target.value))}
                                            className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                                            placeholder="Ex.: 5000"
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="text-xs text-white/60 uppercase font-bold block mb-1">Mensagem (opcional)</label>
                                    <textarea
                                        value={manualText}
                                        onChange={(e) => setManualText(e.target.value)}
                                        className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none min-h-[90px]"
                                        placeholder="Ex.: Parabéns! Você recebeu um prêmio especial..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setIsManualAwardOpen(false)}
                                    className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={submitManualAward}
                                    disabled={isManualSubmitting}
                                    className="px-6 py-2 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 hover:border-neon-cyan/50 font-black disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isManualSubmitting ? 'Registrando...' : 'Confirmar Premiação'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </>
    );
};

export default ManageRaffles;
