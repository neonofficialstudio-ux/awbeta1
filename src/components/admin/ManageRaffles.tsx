
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { Raffle, RaffleTicket, StoreItem, UsableItem, User, JackpotRound } from '../../types';
import type { JackpotState } from '../../state/state.types';
import AdminRaffleModal from './AdminRaffleModal';
import AdminRaffleDrawModalV2 from './AdminRaffleDrawModalV2';
import ConfirmationModal from './ConfirmationModal';
import AdminRaffleParticipantsModal from './AdminRaffleParticipantsModal';
import AdminDrawJackpotModal from './AdminDrawJackpotModal';
import { EditIcon, DeleteIcon, UsersIcon, CoinIcon, TrendingUpIcon, TrophyIcon, SettingsIcon, CheckIcon, StarIcon, TicketIcon, CrownIcon } from '../../constants';
import * as api from '../../api/index';
import { parseLocalDate, toLocalInputValue } from '../../api/utils/localDate';
import { adminPrepareRaffleDraw, adminConfirmRaffleWinner, adminForceUpdateRaffleStates, adminSetHighlightedRaffle, adminScheduleJackpot, adminAwardManual, adminPreviewDrawRaffle, adminDrawRaffleWithRef } from '../../api/admin/raffles';
import { PrizeResolver } from '../../api/raffles/prize.resolver';
import { AdminEngine } from '../../api/admin/AdminEngine';
import TableResponsiveWrapper from '../ui/patterns/TableResponsiveWrapper';
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

const JackpotCountdown: React.FC<{ targetDate: string; status: string; nextStart?: string }> = ({ targetDate, status, nextStart }) => {
    const [timeLeft, setTimeLeft] = useState<any>(null);

    useEffect(() => {
        const tick = () => {
            let target = status === 'active' ? targetDate : (nextStart || '');
            const difference = +new Date(target) - +new Date();
            
            if (difference > 0) {
                setTimeLeft({
                    hoursTotal: Math.floor(difference / (1000 * 60 * 60)),
                    d: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    h: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    m: Math.floor((difference / 1000 / 60) % 60),
                    s: Math.floor((difference / 1000) % 60),
                });
            } else {
                setTimeLeft(null);
            }
        };

        tick(); // Initial call
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [targetDate, status, nextStart]);

    if (status === 'in_apuration') {
        return <span className="text-red-500 font-black uppercase tracking-widest animate-pulse">APURANDO VENCEDOR...</span>;
    }
    
    if (status === 'waiting_start') {
        if (timeLeft) {
            const timeString = timeLeft.d > 0 
            ? `${timeLeft.d}d ${timeLeft.h}h` 
            : `${String(timeLeft.h).padStart(2,'0')}:${String(timeLeft.m).padStart(2,'0')}:${String(timeLeft.s).padStart(2,'0')}`;
             return (
                 <div className="flex flex-col items-center">
                     <span className="text-[10px] font-black uppercase tracking-[0.25em] mb-1 text-gray-500">PRÓXIMO CICLO EM</span>
                     <span className="text-lg font-mono font-bold text-white">{timeString}</span>
                 </div>
             );
        } else {
            return <span className="text-gray-400 font-bold uppercase tracking-widest">AGUARDANDO INÍCIO</span>;
        }
    }

    if (!timeLeft) {
         // Active but timed out locally
        return <span className="text-red-600 font-black uppercase tracking-widest animate-pulse">ENCERRADO - APURAÇÃO</span>;
    }

    let colorClass = "text-[#FFE25A]";
    let pulseClass = "";
    
    if (timeLeft.hoursTotal < 1) {
        colorClass = "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]";
        pulseClass = "animate-pulse";
    } else if (timeLeft.hoursTotal < 24) {
        colorClass = "text-orange-400";
    }

    const timeString = timeLeft.d > 0 
        ? `${timeLeft.d}d ${timeLeft.h}h` 
        : `${String(timeLeft.h).padStart(2,'0')}:${String(timeLeft.m).padStart(2,'0')}:${String(timeLeft.s).padStart(2,'0')}`;

    return (
        <div className="flex flex-col items-center">
            <span className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1 ${timeLeft.hoursTotal < 24 ? 'text-red-400' : 'text-gray-500'}`}>
                {timeLeft.hoursTotal < 1 ? 'ÚLTIMA CHANCE' : 'PRÓXIMO SORTEIO'}
            </span>
            <span className={`text-lg font-mono font-bold ${colorClass} ${pulseClass}`}>
                {timeString}
            </span>
        </div>
    );
}

// --- NEW V13.6 JACKPOT BUY MODAL ---
const JackpotBuyModal: React.FC<{ 
    ticketPrice: number; 
    currentTickets: number; 
    userLimit: number; 
    userCoins: number; 
    onClose: () => void; 
    onConfirm: (quantity: number) => void; 
    isProcessing: boolean;
}> = ({ ticketPrice, currentTickets, userLimit, userCoins, onClose, onConfirm, isProcessing }) => {
    const [quantity, setQuantity] = useState(1);
    
    // V3.1 Update: Limit calculation logic
    const maxByCoins = Math.floor(userCoins / ticketPrice);
    
    // If limit is 0, it's unlimited (effectively huge number)
    const effectiveLimit = userLimit > 0 ? userLimit : 999999;
    const maxByLimit = Math.max(0, effectiveLimit - currentTickets);
    
    const maxCanBuy = Math.max(0, Math.min(maxByCoins, maxByLimit));
    const totalCost = quantity * ticketPrice;

    useEffect(() => {
        // Adjust quantity if it exceeds limits on mount or prop change
        if (quantity > maxCanBuy) setQuantity(maxCanBuy > 0 ? maxCanBuy : 1);
    }, [maxCanBuy]);

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-[#0E0E0E] rounded-3xl border-2 border-[#FFD447]/30 w-full max-w-md p-8 shadow-[0_0_60px_rgba(255,212,71,0.15)] relative flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/10">✕</button>
                    
                    <div className="text-center mb-8">
                         <div className="w-16 h-16 bg-[#FFD447]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#FFD447]/30">
                             <TicketIcon className="w-8 h-8 text-[#FFD447]" />
                         </div>
                         <h2 className="text-2xl font-black text-white font-chakra uppercase tracking-wide">Comprar Tickets</h2>
                         <p className="text-gray-400 text-sm mt-1">Aumente suas chances no Jackpot</p>
                    </div>

                    {maxCanBuy <= 0 ? (
                        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-center mb-6">
                            <p className="text-red-300 font-bold text-sm">
                                {maxByLimit <= 0 ? "Limite individual de tickets atingido." : "Saldo insuficiente para novos tickets."}
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-4 mb-8 bg-[#151515] p-4 rounded-2xl border border-[#333]">
                            <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 bg-[#222] rounded-lg text-white hover:bg-[#333] border border-[#444] font-bold text-xl"
                            >-</button>
                            
                            <div className="text-center w-24">
                                <input 
                                    type="number" 
                                    value={quantity} 
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val)) setQuantity(Math.min(maxCanBuy, Math.max(1, val)));
                                    }}
                                    className="w-full bg-transparent text-center text-3xl font-black text-white outline-none" 
                                />
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Quantidade</p>
                            </div>

                            <button 
                                onClick={() => setQuantity(Math.min(maxCanBuy, quantity + 1))}
                                className="w-10 h-10 bg-[#222] rounded-lg text-white hover:bg-[#333] border border-[#444] font-bold text-xl"
                            >+</button>
                        </div>
                    )}
                    
                    <div className="space-y-2 mb-8 text-sm">
                        <div className="flex justify-between text-gray-400">
                            <span>Preço Unitário</span>
                            <span className="text-white font-bold">{ticketPrice} LC</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                            <span>Seus Tickets Atuais</span>
                            <span className="text-[#FFD447] font-bold">{currentTickets} / {userLimit === 0 ? '∞' : userLimit}</span>
                        </div>
                        <div className="h-px bg-white/10 my-2"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-white font-bold uppercase">Total a Pagar</span>
                            <div className="flex items-center gap-2 text-[#FFD447] font-black text-xl">
                                <CoinIcon className="w-5 h-5" />
                                {totalCost.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onConfirm(quantity)}
                        disabled={isProcessing || maxCanBuy <= 0}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFD447] to-[#F6C560] text-black font-black uppercase tracking-widest hover:shadow-[0_0_30px_rgba(255,212,71,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {isProcessing ? "Processando..." : "Confirmar Compra"}
                    </button>
                </div>
            </div>
        </ModalPortal>
    );
}

// --- MAIN RAFFLE HERO (JACKPOT) ---
const MainRaffleHero: React.FC<{ 
    currentValue: number; 
    ticketPrice: number;
    onBuyTicket: (qty: number) => void; 
    userCoins: number; 
    isBuying: boolean;
    tickets: any[];
    userId: string;
    nextDraw: string;
    lastRound?: JackpotRound;
    allUsers: User[];
    status: string;
    nextStartDate?: string;
    planLimit: number; // Renamed concept to limit, but passed value is user limit
}> = ({ currentValue, ticketPrice, onBuyTicket, userCoins, isBuying, tickets, userId, nextDraw, lastRound, allUsers, status, nextStartDate, planLimit }) => {
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    
    // V13.7: Centralized Logic for Limits
    const { bought: currentTickets, limit, remaining } = api.fetchJackpotAnalytics ? { bought: 0, limit: 0, remaining: 0 } : { bought: 0, limit: 0, remaining: 0 }; 
    
    const chance = tickets.length > 0 ? (currentTickets / tickets.length) * 100 : 0;
    const chanceDisplay = chance > 0 && chance < 0.1 ? "< 0.1%" : `${chance.toFixed(1)}%`;
    const isActive = status === 'active';

    let lastWinnerUser: User | undefined = undefined;
    if (lastRound) lastWinnerUser = allUsers.find(u => u.id === lastRound.winnerId);

    return (
        <div className="w-full mb-16 relative z-10 px-2 md:px-0">
            <div className="bg-gray-900 border border-gray-700 rounded-[32px] p-8 md:p-12 relative group">
                
                {/* Header / Timer */}
                <div className="flex flex-col items-center justify-center relative z-20 mb-8">
                    <div className="bg-black/60 backdrop-blur-md border border-[#FFD447]/20 px-6 py-2 rounded-full mb-6 shadow-lg">
                        <JackpotCountdown targetDate={nextDraw} status={status} nextStart={nextStartDate} />
                    </div>
                    
                    <h3 className="text-[#C8AA6E] text-sm font-bold uppercase tracking-[0.4em] mb-2 text-center drop-shadow-md">
                        Jackpot da Comunidade
                    </h3>
                    
                    <div className="flex items-center justify-center gap-4 md:gap-6 transform group-hover:scale-105 transition-transform duration-500">
                        <CrownIcon className="w-12 h-12 md:w-16 md:h-16 text-[#FFD447] drop-shadow-[0_0_25px_rgba(255,212,71,0.6)] animate-pulse-slow" />
                        <p className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFF] via-[#FFD447] to-[#C8AA6E] font-chakra drop-shadow-[0_0_30px_rgba(255,212,71,0.2)]">
                            {currentValue.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-3xl md:text-4xl font-black text-[#C8AA6E] mt-4">LC</p>
                    </div>
                </div>

                {/* Interaction Area (Admin View - simplified) */}
                <div className="flex flex-col items-center gap-6 relative z-20">
                     <div className="flex items-center gap-8 bg-[#0A0A0A]/80 border border-[#FFD447]/20 rounded-2xl px-8 py-3 backdrop-blur-md shadow-inner">
                        <div className="flex flex-col items-center border-r border-[#333] pr-8">
                             <span className="text-[9px] text-[#808080] uppercase font-bold tracking-widest mb-1">Tickets Totais</span>
                             <span className="text-2xl font-black text-white">{tickets.length}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-[#808080] uppercase font-bold tracking-widest mb-1">Preço</span>
                            <span className="text-xl font-bold text-[#C8AA6E]">{ticketPrice} LC</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Gradient Fade */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none"></div>
            </div>
        </div>
    );
};

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
    
    const [jackpotState, setJackpotState] = useState<JackpotState | null>(null);
    const [isEditJackpotModalOpen, setIsEditJackpotModalOpen] = useState(false);
    const [newJackpotValue, setNewJackpotValue] = useState<string>('');
    const [newJackpotDate, setNewJackpotDate] = useState<string>('');
    const [newTicketPrice, setNewTicketPrice] = useState<string>(''); 
    
    // V13.5 Limits (Updated V3.1)
    const [newGlobalLimit, setNewGlobalLimit] = useState<string>('0');
    const [newUserLimit, setNewUserLimit] = useState<string>('0'); // New User Limit

    const [isInjectModalOpen, setIsInjectModalOpen] = useState(false);
    const [injectionAmount, setInjectionAmount] = useState<string>('500');
    const [isDrawJackpotModalOpen, setIsDrawJackpotModalOpen] = useState(false);
    
    // V13.0: Schedule New Jackpot State
    const [isScheduleJackpotModalOpen, setIsScheduleJackpotModalOpen] = useState(false);
    const [scheduleStart, setScheduleStart] = useState('');
    const [scheduleEnd, setScheduleEnd] = useState('');
    const [scheduleInitValue, setScheduleInitValue] = useState('15000');
    const [schedulePrice, setSchedulePrice] = useState('100');
    
    // V13.5 Detailed Stats
    const [detailedStats, setDetailedStats] = useState<any>(null);

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
        refreshJackpot();
    }, []);

    const refreshJackpot = async () => {
        const data = await api.fetchJackpotState();
        if ((data as any)?.disabled) {
            setJackpotState({ disabled: true, message: (data as any).message || "Jackpot em breve" });
            setDetailedStats(null);
            return;
        }

        setJackpotState(data as JackpotState);
        
        // Pre-fill edit form
        setNewJackpotValue(String((data as any).currentValue));
        setNewJackpotDate((data as any).nextDraw ? toLocalInputValue((data as any).nextDraw) : '');
        setNewTicketPrice(String((data as any).ticketPrice));
        
        // V13.5 & 13.6: Correctly hydrate limits from fetched state
        if ((data as any).ticketLimits) {
             setNewGlobalLimit(String((data as any).ticketLimits.global || 0));
             setNewUserLimit(String((data as any).ticketLimits.perUser || 0)); // Set User Limit
        }
        
        // Fetch detailed stats
        if (config.backendProvider !== 'supabase' && AdminEngine.jackpot.getDetailedStats) {
             const detailed = AdminEngine.jackpot.getDetailedStats();
             setDetailedStats(detailed);
        } else {
             setDetailedStats(null);
        }
    };

    const handleInjectJackpot = async () => {
        const amount = parseInt(injectionAmount);
        if (isNaN(amount) || amount <= 0) { alert("Valor inválido."); return; }
        await api.adminInjectJackpot(amount);
        setIsInjectModalOpen(false);
        refreshJackpot();
    };

    const handleSaveJackpotConfig = async () => {
        const val = parseInt(newJackpotValue);
        const price = parseInt(newTicketPrice);
        const globalLim = parseInt(newGlobalLimit);
        const userLim = parseInt(newUserLimit);
        
        if (isNaN(val) || val < 0) { alert("Valor do pote inválido"); return; }
        if (isNaN(price) || price < 1) { alert("Preço do ticket inválido"); return; }
        if (!newJackpotDate) { alert("Data inválida"); return; }
        
        const dateObject = parseLocalDate(newJackpotDate);
        
        await api.adminEditJackpot({ 
            newValue: val, 
            newDate: dateObject.toISOString(), 
            ticketPrice: price,
            ticketLimits: {
                global: isNaN(globalLim) ? 0 : globalLim,
                perUser: isNaN(userLim) ? 0 : userLim // Save user limit
            }
        });
        
        setIsEditJackpotModalOpen(false);
        refreshJackpot();
    };
    
    const handleScheduleJackpot = async () => {
        if (!scheduleStart || !scheduleEnd) { alert("Datas obrigatórias"); return; }
        const start = parseLocalDate(scheduleStart);
        const end = parseLocalDate(scheduleEnd);
        
        if (end <= start) { alert("Data final deve ser após a inicial"); return; }
        
        const initVal = parseInt(scheduleInitValue);
        const price = parseInt(schedulePrice);
        
        if (isNaN(initVal) || initVal < 0) { alert("Valor inicial inválido"); return; }
        if (isNaN(price) || price < 1) { alert("Preço inválido"); return; }

        await adminScheduleJackpot({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            initialValue: initVal,
            ticketPrice: price
        });

        setIsScheduleJackpotModalOpen(false);
        refreshJackpot();
    };

    const handleExecuteJackpotDraw = async () => {
        try {
            const result = await api.adminDrawJackpot();
            if (result.success) refreshJackpot();
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

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
    const isJackpotDisabled = !!(jackpotState as any)?.disabled;
    const jackpotDisabledMessage = isJackpotDisabled ? (jackpotState as any)?.message || "Jackpot em breve" : "";

    return (
        <>
            <div className="space-y-12">
                {/* JACKPOT SECTION */}
                <div className="bg-[#0a0a0a]/80 border-2 border-yellow-500 rounded-xl p-6 relative overflow-hidden backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.15)] animate-fade-in-up">
                     <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2 font-chakra uppercase tracking-wider">
                                <TrophyIcon className="w-8 h-8 text-yellow-400" /> Jackpot Operations
                            </h2>
                            {isJackpotDisabled ? (
                                <p className="text-sm mt-1 font-mono font-bold text-yellow-400">{jackpotDisabledMessage || 'Jackpot em breve no Supabase'}</p>
                            ) : jackpotState && (
                                <p className={`text-sm mt-1 font-mono font-bold ${jackpotState.status === 'active' ? 'text-green-400' : jackpotState.status === 'waiting_start' ? 'text-blue-400' : 'text-red-400'}`}>
                                    STATUS: {jackpotState.status.toUpperCase().replace('_', ' ')}
                                </p>
                            )}
                        </div>
                        {!isJackpotDisabled && jackpotState && (
                            <>
                                <button onClick={() => setIsEditJackpotModalOpen(true)} className="absolute top-6 right-6 p-2 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors" title="Configurar"><SettingsIcon className="w-5 h-5" /></button>
                                <div className="flex items-center gap-8 bg-black/40 p-4 rounded-lg border border-yellow-500/30">
                                    <div><p className="text-xs text-gray-400 uppercase font-bold">Valor Atual</p><div className="flex items-center gap-2"><CoinIcon className="w-6 h-6 text-yellow-400" /><span className="text-3xl font-black text-white text-shadow-glow">{jackpotState.currentValue.toLocaleString()}</span></div></div>
                                    <div className="h-10 w-px bg-yellow-500/30"></div>
                                    <div><p className="text-xs text-gray-400 uppercase font-bold">Tickets</p><div className="flex items-center gap-2"><TrendingUpIcon className="w-6 h-6 text-green-400" /><span className="text-3xl font-black text-white">{jackpotState.tickets.length}</span></div></div>
                                </div>
                            </>
                        )}
                     </div>
                     <div className="mt-4 flex flex-col md:flex-row gap-4">
                        {isJackpotDisabled ? (
                            <div className="flex-1 py-4 bg-yellow-900/30 border border-yellow-600/50 text-yellow-300 font-bold rounded-lg text-center uppercase tracking-wider text-sm">
                                {jackpotDisabledMessage || 'Jackpot em breve no Supabase'}
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setIsInjectModalOpen(true)} className="flex-1 py-4 bg-green-900/30 border border-green-500/50 hover:bg-green-500 hover:text-black text-green-400 font-bold rounded-lg transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2 group"><TrendingUpIcon className="w-5 h-5 group-hover:animate-bounce" /> Injetar Valor</button>
                                
                                {/* Contextual Action Button */}
                                {jackpotState?.status === 'active' ? (
                                     <button onClick={() => setIsDrawJackpotModalOpen(true)} disabled={jackpotState.tickets.length === 0} className="flex-1 py-4 bg-gradient-to-r from-red-900/40 to-yellow-900/40 border border-red-500/50 hover:from-red-600 hover:to-yellow-600 hover:text-white text-red-200 font-bold rounded-lg transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><TrophyIcon className="w-5 h-5" /> {jackpotState.tickets.length === 0 ? 'Sem Tickets' : 'Sortear Jackpot'}</button>
                                ) : (
                                     <button onClick={() => {
                                         // Default dates for convenience
                                         const now = new Date();
                                         setScheduleStart(toLocalInputValue(now));
                                         now.setDate(now.getDate() + 7);
                                         setScheduleEnd(toLocalInputValue(now));
                                         setIsScheduleJackpotModalOpen(true);
                                     }} className="flex-1 py-4 bg-blue-900/30 border border-blue-500/50 hover:bg-blue-500 hover:text-white text-blue-300 font-bold rounded-lg transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2"><CheckIcon className="w-5 h-5" /> Agendar Novo Ciclo</button>
                                )}
                            </>
                        )}
                     </div>
                </div>
                
                {/* V13.5: DETAILED STATS TABLE */}
                {detailedStats && (
                    <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden animate-fade-in-up">
                         <div className="p-4 border-b border-gray-800 bg-[#181818] flex justify-between items-center">
                             <h3 className="text-lg font-bold text-white">Participantes do Jackpot ({detailedStats.totalParticipants})</h3>
                             <span className="text-xs text-gray-500 font-mono">{detailedStats.totalTickets} Tickets Vendidos</span>
                         </div>
                         
                         <TableResponsiveWrapper>
                             <table className="w-full text-sm text-left text-gray-400">
                                 <thead className="text-xs text-gray-500 uppercase bg-[#0E0E0E]">
                                     <tr>
                                         <th className="px-6 py-3">Participante</th>
                                         <th className="px-6 py-3">Tickets</th>
                                         <th className="px-6 py-3">Limite</th>
                                         <th className="px-6 py-3">Chance</th>
                                         <th className="px-6 py-3 text-center">Risco</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-800">
                                     {detailedStats.participants.slice(0, 10).map((p: any) => (
                                         <tr key={p.userId} className="hover:bg-[#181818]">
                                             <td className="px-6 py-3 font-medium text-white flex items-center gap-3">
                                                <AvatarWithFrame user={p as any} sizeClass="w-8 h-8" />
                                                <div>
                                                    <p>{getDisplayName({ ...p, artistic_name: p.artisticName })}</p>
                                                    <p className="text-xs text-gray-600 font-normal">{p.name}</p>
                                                </div>
                                            </td>
                                             <td className="px-6 py-3 font-mono text-[#FFD86B] font-bold">{p.ticketCount}</td>
                                             <td className="px-6 py-3 text-xs">{newUserLimit === '0' ? 'Ilimitado' : newUserLimit}</td>
                                             <td className="px-6 py-3 text-xs">{p.chance.toFixed(2)}%</td>
                                             <td className="px-6 py-3 text-center">
                                                 {p.isSuspicious ? (
                                                     <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded text-[9px] font-bold border border-red-500/30">SUSPEITO</span>
                                                 ) : (
                                                     <span className="text-green-500 text-xs">-</span>
                                                 )}
                                             </td>
                                         </tr>
                                     ))}
                                     {detailedStats.participants.length === 0 && (
                                         <tr><td colSpan={5} className="p-6 text-center text-gray-600 italic">Nenhum participante.</td></tr>
                                     )}
                                 </tbody>
                             </table>
                         </TableResponsiveWrapper>
                         {detailedStats.participants.length > 10 && (
                             <div className="p-3 text-center text-xs text-gray-600 border-t border-gray-800 bg-[#181818]">
                                 + {detailedStats.participants.length - 10} outros participantes
                             </div>
                         )}
                    </div>
                )}

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
                                                        {raffle.__derivedStatus === 'in_apuration' && (
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
            
             {/* MODAL: CONFIGURAÇÃO (UPDATED V13.6 FIXES) */}
             {isEditJackpotModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsEditJackpotModalOpen(false)}>
                    <div 
                        className="bg-[#121212] p-6 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto" 
                        onClick={e => e.stopPropagation()} // FIX: Prevent closing when clicking inside
                    >
                        <h3 className="text-xl font-bold text-white mb-4">Configurar Jackpot</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Valor Inicial</label>
                                    <input type="number" value={newJackpotValue} onChange={e => setNewJackpotValue(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Preço Ticket</label>
                                    <input type="number" value={newTicketPrice} onChange={e => setNewTicketPrice(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Data do Sorteio</label>
                                <input type="datetime-local" value={newJackpotDate} onChange={e => setNewJackpotDate(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
                            </div>
                            
                            {/* Limits Section V13.5 (Updated V3.1) */}
                            <div className="pt-4 border-t border-gray-800">
                                <h4 className="text-sm font-bold text-yellow-500 mb-3 uppercase tracking-wide">Limites de Compra</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Limite Global (0 = Ilimitado)</label>
                                        <input type="number" value={newGlobalLimit} onChange={e => setNewGlobalLimit(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
                                        <p className="text-[10px] text-gray-500 mt-1">Total máximo de tickets vendidos para o jackpot inteiro.</p>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Limite por Usuário (0 = Ilimitado)</label>
                                        <input type="number" value={newUserLimit} onChange={e => setNewUserLimit(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
                                        <p className="text-[10px] text-gray-500 mt-1">Máximo de tickets que um único usuário pode ter.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
                            <button onClick={() => setIsEditJackpotModalOpen(false)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">Cancelar</button>
                            <button onClick={handleSaveJackpotConfig} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

             {/* MODAL: INJETAR */}
             {isInjectModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsInjectModalOpen(false)}>
                     <div className="bg-[#121212] p-6 rounded-xl border border-gray-700 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                         <h3 className="text-lg font-bold text-goldenYellow-400 mb-4">Injetar Valor</h3>
                         <input type="number" value={injectionAmount} onChange={e => setInjectionAmount(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-lg font-bold mb-4" />
                         <div className="flex justify-end gap-3">
                             <button onClick={() => setIsInjectModalOpen(false)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">Cancelar</button>
                             <button onClick={handleInjectJackpot} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold">Confirmar</button>
                         </div>
                     </div>
                </div>
             )}
             
             {/* MODAL: AGENDAR NOVO JACKPOT (V13) */}
             {isScheduleJackpotModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9000] p-4" onClick={() => setIsScheduleJackpotModalOpen(false)}>
                     <div className="bg-[#121212] p-8 rounded-xl border border-blue-500/50 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                         <h3 className="text-xl font-black text-blue-400 mb-6 flex items-center gap-2 uppercase tracking-wide">
                             <CheckIcon className="w-6 h-6" /> Agendar Novo Ciclo
                         </h3>
                         
                         <div className="space-y-4">
                             <div>
                                 <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Início do Ciclo</label>
                                 <input type="datetime-local" value={scheduleStart} onChange={e => setScheduleStart(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none" />
                             </div>
                             <div>
                                 <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Data do Sorteio (Fim)</label>
                                 <input type="datetime-local" value={scheduleEnd} onChange={e => setScheduleEnd(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Pote Inicial</label>
                                     <input type="number" value={scheduleInitValue} onChange={e => setScheduleInitValue(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none" />
                                 </div>
                                 <div>
                                     <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Preço Ticket</label>
                                     <input type="number" value={schedulePrice} onChange={e => setSchedulePrice(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none" />
                                 </div>
                             </div>
                         </div>

                         <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-800">
                             <button onClick={() => setIsScheduleJackpotModalOpen(false)} className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm uppercase tracking-wide">Cancelar</button>
                             <button onClick={handleScheduleJackpot} className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wide shadow-lg shadow-blue-500/20">Confirmar Agendamento</button>
                         </div>
                     </div>
                </div>
             )}

            {isDrawJackpotModalOpen && jackpotState && (
                <AdminDrawJackpotModal tickets={jackpotState.tickets} allUsers={allUsers} currentPot={jackpotState.currentValue} onClose={() => setIsDrawJackpotModalOpen(false)} onConfirmDraw={handleExecuteJackpotDraw} />
            )}
            
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
