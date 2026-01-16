
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Raffle, RaffleTicket, User, JackpotRound } from '../types';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { CoinIcon, TicketIcon, CrownIcon, HistoryIcon, CheckIcon, ShieldIcon } from '../constants';
import AvatarWithFrame from './AvatarWithFrame';
import { MasterSync } from '../state/masterSync';
import RiotUpcomingList from './raffles/RiotUpcomingList';
import { RaffleEngineV2 } from '../api/raffles/raffle.engine';
import { ModalPortal } from './ui/overlays/ModalPortal'; // Ensure this import exists
import Button from './ui/base/Button';
import FaqItem from './ui/patterns/FaqItem';

// --- STYLES & ANIMATIONS (ARCANE RIOT + PURPLE BOOST) ---
const ArcaneStyles = `
  @keyframes auraPulse {
    0% { box-shadow: 0 0 15px rgba(255, 226, 90, 0.1), inset 0 0 20px rgba(157, 0, 255, 0.05); border-color: rgba(255, 226, 90, 0.3); }
    50% { box-shadow: 0 0 40px rgba(255, 226, 90, 0.4), inset 0 0 60px rgba(157, 0, 255, 0.2); border-color: rgba(255, 226, 90, 0.8); }
    100% { box-shadow: 0 0 15px rgba(255, 226, 90, 0.1), inset 0 0 20px rgba(157, 0, 255, 0.05); border-color: rgba(255, 226, 90, 0.3); }
  }
  
  @keyframes shimmerGold {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes particleFloat {
    0% { opacity: 0; transform: translateY(10px) scale(0.5); }
    50% { opacity: 1; transform: translateY(-10px) scale(1); }
    100% { opacity: 0; transform: translateY(-30px) scale(0.5); }
  }

  @keyframes arcaneGlow {
    0%   { box-shadow: 0 0 12px #9d4dff50; border-color: #9d4dff40; }
    50%  { box-shadow: 0 0 28px #9d4dff88; border-color: #9d4dff; }
    100% { box-shadow: 0 0 12px #9d4dff50; border-color: #9d4dff40; }
  }

  .arcane-card {
    background: radial-gradient(ellipse at center, #0c0f14 0%, #050608 100%);
    animation: auraPulse 4s infinite ease-in-out;
    position: relative;
    overflow: hidden;
  }
  
  .standard-main-card {
    background: radial-gradient(circle at top left, #1a072e, #09020f);
    animation: arcaneGlow 6s ease-in-out infinite;
    border: 2px solid #9d4dff;
  }
  
  .arcane-btn-bg {
    background: linear-gradient(90deg, #C8AA6E, #F0E6D2, #C8AA6E);
    background-size: 200% auto;
    animation: shimmerGold 3s linear infinite;
  }

  .arcane-particle {
    position: absolute;
    background: #FFD447;
    border-radius: 50%;
    pointer-events: none;
    animation: particleFloat 4s infinite ease-in-out;
  }
`;

// --- UTILS ---
const isRaffleEnded = (raffle: Raffle) => {
  return new Date(raffle.endsAt).getTime() <= Date.now();
};

// --- SUB-COMPONENTS (Countdowns, Cards) ---

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
    nextDraw: string;
    lastRound?: JackpotRound;
    allUsers: User[];
    status: string;
    nextStartDate?: string;
    userTicketCount: number;
    ticketLimits?: { perUser?: number; global?: number };
}> = ({ currentValue, ticketPrice, onBuyTicket, userCoins, isBuying, tickets, nextDraw, lastRound, allUsers, status, nextStartDate, userTicketCount, ticketLimits }) => {
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    
    const limit = ticketLimits?.perUser || 0;
    const globalLimit = ticketLimits?.global || 0;
    const currentTickets = userTicketCount;
    const remainingByLimit = limit > 0 ? Math.max(0, limit - currentTickets) : Infinity;
    const remainingByGlobal = globalLimit > 0 ? Math.max(0, globalLimit - tickets.length) : Infinity;
    const remaining = Math.min(remainingByLimit, remainingByGlobal);
    
    const chance = tickets.length > 0 ? (currentTickets / tickets.length) * 100 : 0;
    const chanceDisplay = chance > 0 && chance < 0.1 ? "< 0.1%" : `${chance.toFixed(1)}%`;
    const isActive = status === 'active';

    let lastWinnerUser: User | undefined = undefined;
    if (lastRound) lastWinnerUser = allUsers.find(u => u.id === lastRound.winnerId);

    return (
        <div className="w-full mb-16 relative z-10 px-2 md:px-0">
            <div className="arcane-card rounded-[32px] p-8 md:p-12 relative group">
                
                {/* Animated Particles (CSS) */}
                <div className="absolute top-1/4 left-1/4 w-1 h-1 arcane-particle" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-3/4 right-1/4 w-1 h-1 arcane-particle" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-10 left-1/2 w-1.5 h-1.5 arcane-particle" style={{ animationDelay: '2.5s' }}></div>

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
                
                {/* Limit Info (V13.7) */}
                {isActive && (
                    <div className="text-center mb-6">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest bg-black/30 inline-block px-4 py-1 rounded-full border border-white/5">
                            Seu Limite: <span className="text-white">{limit === 0 ? 'Ilimitado' : limit}</span> • Comprados: <span className="text-[#FFD447]">{currentTickets}</span> • Restam: <span className="text-green-400">{limit === 0 ? '∞' : remaining}</span>
                        </p>
                    </div>
                )}

                {/* Interaction Area */}
                <div className="flex flex-col items-center gap-6 relative z-20">
                    <button 
                        onClick={() => setIsBuyModalOpen(true)}
                        disabled={isBuying || !isActive || remaining <= 0}
                        className={`
                            px-12 py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-2xl
                            ${isActive && remaining > 0
                                ? 'arcane-btn-bg text-[#050505] hover:scale-105 hover:shadow-[0_0_40px_rgba(255,212,71,0.4)]' 
                                : 'bg-[#1A1A1A] text-gray-500 cursor-not-allowed border border-gray-800'}
                        `}
                    >
                        {isBuying ? 'Processando...' : !isActive ? 'Aguardando Próximo Ciclo' : remaining <= 0 ? '🔒 Limite Atingido' : 'Entrar no Pote'}
                    </button>
                    
                    <div className="flex items-center gap-8 bg-[#0A0A0A]/80 border border-[#FFD447]/20 rounded-2xl px-8 py-3 backdrop-blur-md shadow-inner">
                        <div className="flex flex-col items-center border-r border-[#333] pr-8">
                             <span className="text-[9px] text-[#808080] uppercase font-bold tracking-widest mb-1">Seus Tickets</span>
                             <span className="text-2xl font-black text-white">{currentTickets}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-[#808080] uppercase font-bold tracking-widest mb-1">Chance</span>
                            <span className={`text-xl font-bold ${chance > 5 ? 'text-[#2ECC71]' : 'text-[#C8AA6E]'}`}>{chanceDisplay}</span>
                        </div>
                    </div>
                </div>

                {/* Last Winner (Footer) */}
                {lastRound && (
                    <div className="mt-10 flex justify-center animate-fade-in-up">
                        <div className="p-2 pr-6 bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A] border border-[#FFD447]/10 rounded-full flex items-center gap-4 shadow-lg">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-[#FFD447] rounded-full blur opacity-20 animate-pulse"></div>
                                <AvatarWithFrame user={lastWinnerUser || { name: lastRound.winnerName, avatarUrl: "https://i.pravatar.cc/150?u=default", plan: 'Free Flow' } as any} sizeClass="w-10 h-10" className="relative z-10 ring-2 ring-[#FFD447]/50" />
                            </div>
                            <div className="text-left">
                                <p className="text-[8px] text-[#C8AA6E] uppercase font-black tracking-widest">Último Vencedor</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-sm">{lastRound.winnerName}</span>
                                    <span className="text-xs text-2xl font-mono font-bold bg-[#2ECC71]/10 px-1.5 rounded">+{lastRound.prizeAmount.toLocaleString()} LC</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Gradient Fade */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none"></div>
            </div>

            {/* V13.6 Buy Modal */}
            {isBuyModalOpen && (
                <JackpotBuyModal
                    ticketPrice={ticketPrice}
                    currentTickets={currentTickets}
                    userLimit={limit}
                    userCoins={userCoins}
                    onClose={() => setIsBuyModalOpen(false)}
                    onConfirm={(qty) => {
                        onBuyTicket(qty);
                        setIsBuyModalOpen(false);
                    }}
                    isProcessing={isBuying}
                />
            )}
        </div>
    );
};

// --- STANDARD RAFFLE MAIN CARD (RESTORED + ARCANE BOOST) ---
const StandardRaffleHero: React.FC<{
    raffle: Raffle;
    myTickets: number;
    totalTickets: number;
    userCoins: number;
    onBuy: (raffle: Raffle) => void;
}> = ({ raffle, myTickets, totalTickets, userCoins, onBuy }) => {
    
    const now = Date.now();
    const start = raffle.startsAt ? new Date(raffle.startsAt).getTime() : 0;
    const end = new Date(raffle.endsAt).getTime();
    
    const hasStarted = start <= now;
    const hasEnded = end <= now;
    const canAfford = userCoins >= raffle.ticketPrice;
    const limit = raffle.ticketLimitPerUser || 0;
    const hasReachedLimit = limit > 0 && myTickets >= limit;
    const percent = limit > 0 ? (myTickets / limit) * 100 : 0;

    const raffleTitle = (raffle as any)?.meta?.title || raffle.itemName;
    const prizeType = (raffle.prizeType || '').toLowerCase();
    const prizeText =
        prizeType === 'coins' ? `${Number(raffle.coinReward || 0)} LC`
        : prizeType === 'hybrid' ? `${raffle.itemName} + ${Number(raffle.coinReward || 0)} LC`
        : prizeType === 'manual_text' ? (raffle.customRewardText || raffle.itemName)
        : raffle.itemName;

    // Highlight Logic: Determine target date (Start or End) and Label
    const targetDate = !hasStarted && raffle.startsAt ? raffle.startsAt : raffle.endsAt;
    const label = !hasStarted ? "INICIA EM" : "TEMPO RESTANTE";

    return (
        <div className="w-full mb-16 relative z-10 px-2 md:px-0 animate-fade-in-up">
            <div className="standard-main-card rounded-[32px] overflow-hidden shadow-2xl relative group flex flex-col lg:flex-row min-h-[500px]">
                
                {/* LEFT: IMAGE */}
                <div className="lg:w-5/12 relative h-[300px] lg:h-auto overflow-hidden border-b lg:border-b-0 lg:border-r-2 border-[#9d4dff]/30">
                    <img 
                        src={raffle.itemImageUrl} 
                        alt={raffle.itemName} 
                        className={`w-full h-full object-cover transition-transform duration-1000 ${hasEnded ? 'grayscale opacity-50' : 'opacity-90 group-hover:scale-105'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#09020f] via-transparent to-transparent"></div>
                    
                    {hasEnded && (
                         <div className="absolute top-6 right-6">
                            <span className="text-red-400 font-bold text-sm uppercase tracking-wide bg-red-900/80 px-3 py-1 rounded border border-red-500/30 shadow-lg">
                                ENCERRADO
                            </span>
                        </div>
                    )}
                    
                    {!hasStarted && (
                         <div className="absolute top-6 right-6">
                            <span className="text-blue-300 font-bold text-sm uppercase tracking-wide bg-blue-900/80 px-3 py-1 rounded border border-blue-500/30 shadow-lg">
                                AGENDADO
                            </span>
                        </div>
                    )}

                    <div className="absolute top-6 left-6">
                        <div className="px-4 py-1.5 bg-[#9d4dff] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_0_15px_#9d4dff] border border-white/20">
                            Destaque Oficial
                        </div>
                    </div>
                </div>

                {/* RIGHT: INFO */}
                <div className="lg:w-7/12 p-8 md:p-12 flex flex-col relative z-10 bg-[#09020f]/90 backdrop-blur-xl">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl md:text-5xl font-black text-white font-chakra uppercase leading-none mb-2 drop-shadow-[0_0_10px_rgba(157,77,255,0.5)]">
                                {raffleTitle}
                            </h2>
                            <p className="text-[#B3B3B3] text-sm font-medium">Sorteio Standard • ID: {raffle.id.slice(0,6)}</p>
                            <p className="text-[#B3B3B3] text-sm mt-2">
                                <span className="text-white/60 font-bold">Prêmio:</span>{' '}
                                <span className="text-white/90 font-semibold">{prizeText}</span>
                            </p>
                        </div>
                        <div className="text-right hidden md:block">
                            {!hasEnded && <DigitalCountdown targetDate={targetDate} large label={label} />}
                        </div>
                    </div>

                    {/* Timer Mobile */}
                    <div className="md:hidden mb-8">
                        {!hasEnded && <DigitalCountdown targetDate={targetDate} label={label} />}
                    </div>

                    {/* Progress Bar */}
                    {!hasEnded && hasStarted && (
                        <div className="mb-8">
                             <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-[#9d4dff]">
                                 <span>Seus Bilhetes: {myTickets} {limit > 0 ? `/ ${limit}` : ''}</span>
                                 <span>{totalTickets} Vendidos no total</span>
                             </div>
                             <div className="h-2 w-full bg-[#1a072e] rounded-full overflow-hidden border border-[#9d4dff]/30">
                                 <div 
                                    className="h-full bg-gradient-to-r from-[#9d4dff] to-[#d946ef] shadow-[0_0_10px_#9d4dff]" 
                                    style={{ width: `${Math.min(100, percent)}%` }}
                                 ></div>
                             </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-auto border-t border-[#9d4dff]/20 pt-8 flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex flex-col items-center md:items-start">
                            <p className="text-[10px] text-[#808080] uppercase font-bold tracking-widest mb-1">Preço do Ticket</p>
                            <div className="flex items-center gap-2">
                                <CoinIcon className="w-8 h-8 text-[#9d4dff]" />
                                <span className="text-4xl font-black text-white font-chakra">{raffle.ticketPrice}</span>
                            </div>
                        </div>

                        {hasEnded && !raffle.winnerId && (
                            <button disabled className="flex-1 w-full py-5 rounded-xl font-black text-sm uppercase tracking-[0.2em] bg-gray-800 text-yellow-300 border border-yellow-500 cursor-not-allowed opacity-70">
                                EM APURAÇÃO
                            </button>
                        )}

                        {hasEnded && raffle.winnerId && (
                            <button disabled className="flex-1 w-full py-5 rounded-xl font-black text-sm uppercase tracking-[0.2em] bg-gray-800 text-gray-400 border border-gray-600 cursor-not-allowed opacity-70">
                                ENCERRADO
                            </button>
                        )}

                        {hasEnded && raffle.winnerId && (
                            <div className="flex-1 w-full text-center md:text-right">
                                <p className="text-xs text-white/50 uppercase font-bold tracking-widest">Vencedor</p>
                                <p className="text-white font-black">
                                    {raffle.winnerName || (raffle.winnerId ? raffle.winnerId.slice(0, 8) : '—')}
                                </p>
                                <p className="text-xs text-white/50">
                                    {raffle.winnerDefinedAt ? new Date(raffle.winnerDefinedAt).toLocaleString('pt-BR') : ''}
                                </p>
                            </div>
                        )}

                        {!hasStarted && (
                            <button disabled className="flex-1 w-full py-5 rounded-xl font-black text-sm uppercase tracking-[0.2em] bg-gray-700 text-gray-300 border border-gray-600 cursor-not-allowed opacity-70">
                                AGENDADO
                            </button>
                        )}

                        {hasStarted && !hasEnded && (
                            <button 
                                onClick={() => onBuy(raffle)}
                                disabled={hasReachedLimit || !canAfford}
                                className={`
                                    flex-1 w-full py-5 rounded-xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-xl
                                    ${hasReachedLimit 
                                        ? 'bg-[#1a072e] text-[#555] cursor-not-allowed border border-[#333]' 
                                        : !canAfford 
                                            ? 'bg-[#1a072e] text-gray-500 border border-red-900/50 cursor-not-allowed'
                                            : 'bg-[#9d4dff] hover:bg-[#8b3dff] text-white border border-[#d946ef]/50 hover:shadow-[0_0_30px_rgba(157,77,255,0.4)] hover:-translate-y-1' 
                                    }
                                `}
                            >
                                {hasReachedLimit ? 'Limite Atingido' : !canAfford ? 'Saldo Insuficiente' : 'Comprar Agora'}
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- TICKET CARD (Enhanced for V2 Statuses) ---
const TicketCard: React.FC<{ raffle: Raffle; myTickets: number; totalTickets: number; userCoins: number; onBuy: (raffle: Raffle) => void; }> = ({ raffle, myTickets, totalTickets, userCoins, onBuy }) => {
    const now = Date.now();
    const start = raffle.startsAt ? new Date(raffle.startsAt).getTime() : 0;
    const end = new Date(raffle.endsAt).getTime();
    
    const hasStarted = start <= now;
    const hasEnded = end <= now;
    const hasReachedLimit = raffle.ticketLimitPerUser > 0 && myTickets >= raffle.ticketLimitPerUser;
    const canAfford = userCoins >= raffle.ticketPrice;
    
    return (
        <div className={`relative bg-[#121212] rounded-2xl overflow-hidden group flex flex-col transition-all duration-300 hover:-translate-y-1 border ${hasEnded && !raffle.winnerId ? 'border-yellow-500/40' : 'border-gray-800'}`}>
            
            {/* Badge Logic - Removed duplicates */}
            {hasEnded && (
                <div className="absolute top-0 left-0 w-full bg-red-900/80 text-white text-[10px] font-black uppercase tracking-widest text-center py-1 z-30">
                    ENCERRADO
                </div>
            )}
             {!hasStarted && !hasEnded && (
                <div className="absolute top-0 left-0 w-full bg-blue-900/80 text-blue-200 text-[10px] font-black uppercase tracking-widest text-center py-1 z-30">
                    AGENDADO
                </div>
            )}


            <div className="h-56 relative overflow-hidden">
                <img src={raffle.itemImageUrl} alt={raffle.itemName} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${hasEnded ? 'grayscale opacity-50' : ''}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent"></div>
                {hasStarted && !hasEnded && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 flex items-center gap-1"><CoinIcon className="w-3 h-3 text-goldenYellow-400" /><span className="text-xs font-bold text-white">{raffle.ticketPrice}</span></div>
                )}
            </div>
            
            <div className="p-5 pt-2 flex-grow flex flex-col border-x border-b border-gray-800 rounded-b-2xl">
                <div className="flex-grow">
                    <h3 className="text-lg font-bold text-white font-chakra leading-tight mb-2 group-hover:text-goldenYellow-400 transition-colors">{raffle.itemName}</h3>
                    
                    {!hasEnded && (
                        <div className="flex justify-between items-center mb-4">
                            <DigitalCountdown targetDate={raffle.endsAt} />
                            <span className="text-[10px] text-gray-500 font-bold bg-gray-900 px-2 py-1 rounded">{totalTickets} VENDIDOS</span>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-800 space-y-3">
                     {!hasEnded && (
                        <>
                            <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider mb-1">
                                <span className="text-gray-400">Seus Tickets</span>
                                <span className={myTickets > 0 ? "text-goldenYellow-400" : "text-gray-600"}>{myTickets} <span className="text-gray-600">/ {raffle.ticketLimitPerUser || '∞'}</span></span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden mb-3">
                                <div className={`h-full transition-all duration-500 ${myTickets > 0 ? 'bg-goldenYellow-500' : 'bg-gray-700'}`} style={{ width: `${raffle.ticketLimitPerUser > 0 ? Math.min(100, (myTickets/raffle.ticketLimitPerUser)*100) : 0}%` }}></div>
                            </div>
                        </>
                     )}

                    {/* BUTTON LOGIC V2.0 */}
                    {hasEnded && !raffle.winnerId && (
                        <button disabled className="w-full bg-gray-800 text-yellow-300 py-3 rounded-lg border border-yellow-500/30 font-bold text-xs uppercase tracking-widest opacity-80">
                            EM APURAÇÃO
                        </button>
                    )}

                    {hasEnded && raffle.winnerId && (
                        <button disabled className="w-full bg-gray-800 text-gray-500 py-3 rounded-lg border border-gray-700 font-bold text-xs uppercase tracking-widest cursor-not-allowed">
                            ENCERRADO
                        </button>
                    )}

                    {!hasStarted && (
                        <button disabled className="w-full bg-gray-800 text-gray-400 py-3 rounded-lg border border-gray-600 font-bold text-xs uppercase tracking-widest cursor-not-allowed">
                            AGENDADO
                        </button>
                    )}

                    {hasStarted && !hasEnded && (
                        <button 
                            onClick={() => onBuy(raffle)} 
                            disabled={hasReachedLimit || !canAfford} 
                            className={`w-full py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all duration-200 ${hasReachedLimit ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : canAfford ? 'bg-gradient-to-r from-goldenYellow-500 to-orange-600 text-black hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.02]' : 'bg-gray-800 text-gray-400 border border-red-900/50 hover:border-red-500/50'}`}
                        >
                            {hasReachedLimit ? 'Limite Atingido' : !canAfford ? 'Saldo Insuficiente' : 'Comprar Ticket'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// 3.5 WINNER CARD (Hall of Fame)
const WinnerCard: React.FC<{ raffle: Raffle; winner: User | undefined }> = ({ raffle, winner }) => {
    return (
        <div className="flex-shrink-0 w-80 bg-[#0E0E0E] border border-[#FFD447]/20 rounded-xl p-4 flex items-center gap-4 shadow-[0_0_15px_rgba(255,212,71,0.05)] hover:shadow-[0_0_20px_rgba(255,212,71,0.15)] hover:border-[#FFD447]/40 transition-all duration-300 group">
             <div className="relative">
                 <AvatarWithFrame user={winner || { name: raffle.winnerName || '?', avatarUrl: raffle.winnerAvatar || '' } as any} sizeClass="w-16 h-16" className="ring-2 ring-[#FFD447]/50" />
                 <div className="absolute -bottom-1 -right-1 bg-[#FFD447] text-black rounded-full p-1 border border-black shadow-lg"><CrownIcon className="w-3 h-3" /></div>
             </div>
             <div className="overflow-hidden min-w-0 flex-1">
                 <p className="text-[9px] text-[#FFD447] font-bold uppercase tracking-widest mb-1">🎉 Vencedor Confirmado</p>
                 <h4 className="text-white font-bold truncate text-lg leading-tight">{raffle.winnerName}</h4>
                 <p className="text-xs text-gray-400 truncate mt-0.5">Prêmio: <span className="text-gray-200">{raffle.itemName}</span></p>
                 <p className="text-[10px] text-gray-600 mt-2 font-mono border-t border-white/5 pt-1">
                     {raffle.winnerDefinedAt ? new Date(raffle.winnerDefinedAt).toLocaleDateString() : 'Data N/A'}
                 </p>
             </div>
        </div>
    );
};

// Buy Modal (Simplified for brevity)
const BuyTicketsModal: React.FC<{ raffle: Raffle; myTicketCount: number; userCoins: number; onClose: () => void; onConfirm: (quantity: number) => Promise<void>; }> = ({ raffle, myTicketCount, userCoins, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);
    const [isBuying, setIsBuying] = useState(false);
    const totalCost = raffle.ticketPrice * quantity;
    const maxByCoins = Math.floor(userCoins / raffle.ticketPrice);
    const maxByLimit = raffle.ticketLimitPerUser > 0 ? raffle.ticketLimitPerUser - myTicketCount : Infinity;
    const maxCanBuy = Math.max(0, Math.min(maxByCoins, maxByLimit));

    useEffect(() => { if (quantity > maxCanBuy) setQuantity(maxCanBuy > 0 ? maxCanBuy : 1); }, [quantity, maxCanBuy]);

    const handleConfirm = async () => { setIsBuying(true); await onConfirm(quantity); };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#181818] rounded-2xl border border-gray-800 p-8 max-w-md w-full text-center relative overflow-hidden animate-pop-in" onClick={(e) => e.stopPropagation()}>
                <TicketIcon className="w-12 h-12 mx-auto text-goldenYellow-400 mb-4 animate-bounce" />
                <h2 className="text-xl font-black text-white font-chakra uppercase mb-2">Confirmar Compra</h2>
                <p className="text-gray-400 mb-6 text-sm">Ticket para <span className="text-white font-bold">{raffle.itemName}</span></p>
                {maxCanBuy > 0 ? (
                    <>
                        <div className="flex items-center justify-center space-x-6 my-6 bg-black/40 p-3 rounded-xl border border-gray-800">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 bg-gray-700 rounded-full hover:bg-gray-600">-</button>
                            <span className="text-3xl font-black text-white">{quantity}</span>
                            <button onClick={() => setQuantity(q => Math.min(maxCanBuy, q + 1))} disabled={quantity >= maxCanBuy} className="w-8 h-8 bg-gray-700 rounded-full hover:bg-gray-600 disabled:opacity-50">+</button>
                        </div>
                        <div className="flex justify-between items-center mb-6 px-2"><span className="text-xs text-gray-400">Total:</span><span className="text-goldenYellow-400 font-bold">{totalCost} LC</span></div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 text-xs font-bold uppercase">Cancelar</button>
                            <button onClick={handleConfirm} disabled={isBuying} className="flex-1 py-3 rounded-xl bg-goldenYellow-500 text-black text-xs font-black uppercase hover:bg-goldenYellow-400">{isBuying ? '...' : 'Confirmar'}</button>
                        </div>
                    </>
                ) : (
                     <>
                        <p className="my-6 text-red-400 font-bold text-xs bg-red-900/20 p-3 rounded border border-red-900/50">Não é possível comprar mais tickets (Limite ou Saldo).</p>
                        <button onClick={onClose} className="w-full py-3 rounded-xl bg-gray-800 text-white font-bold text-xs uppercase">Voltar</button>
                    </>
                )}
            </div>
        </div>
    );
};

const faqData = [
    { question: "Como funcionam os Sorteios?", answer: "Você usa suas Lummi Coins para comprar tickets. Quanto mais tickets comprar, maiores suas chances de ganhar." },
    { question: "O que é o Jackpot?", answer: "O Jackpot é um prêmio acumulado em Coins. Todo mundo que compra tickets contribui para o valor total, e um único vencedor leva tudo no final do ciclo." },
    { question: "Posso participar de múltiplos sorteios?", answer: "Sim! Você pode comprar tickets para quantos sorteios ativos desejar, desde que tenha saldo de Coins suficiente." },
    { question: "Como recebo o prêmio?", answer: "Se você ganhar um item, ele aparecerá no seu Inventário. Se ganhar o Jackpot ou Coins, o saldo é creditado automaticamente na sua conta." },
    { question: "Existe limite de tickets?", answer: "Alguns sorteios possuem limites de tickets por usuário para garantir equilíbrio. Verifique o detalhe de cada sorteio." }
];

// --- MAIN PAGE ---
const Raffles: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { activeUser } = state;
    
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [myTickets, setMyTickets] = useState<RaffleTicket[]>([]);
    const [allTickets, setAllTickets] = useState<RaffleTicket[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [raffleToBuy, setRaffleToBuy] = useState<Raffle | null>(null);
    const [isBuyingJackpot, setIsBuyingJackpot] = useState(false);
    const [highlightedRaffleId, setHighlightedRaffleId] = useState<string | null>(null); // V1.0

    // Fetch Data
    const fetchData = useCallback(async () => {
        if (!activeUser) return;
        try {
            // Self-Healing: Run Status Check on Fetch
            RaffleEngineV2.checkRaffleTimers(); 
            
            // Update V1.0: Return highlightedRaffleId
            const data = await api.fetchRafflesData(activeUser.id);
            setRaffles(data.raffles);
            setMyTickets(data.myTickets);
            setAllTickets(data.allTickets);
            setAllUsers(data.allUsers);
            setHighlightedRaffleId(data.highlightedRaffleId); // V1.0

            await MasterSync.syncJackpot(dispatch);
        } catch (error) {
            console.error("Failed to fetch raffles:", error);
        } finally {
            setIsLoading(false);
        }
    }, [activeUser, dispatch]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // Poll every 15s for status updates
        const jpListener = () => { if (activeUser) MasterSync.syncJackpot(dispatch); };
        window.addEventListener('AW_JACKPOT_UPDATE', jpListener);
        return () => { clearInterval(interval); window.removeEventListener('AW_JACKPOT_UPDATE', jpListener); };
    }, [fetchData, activeUser, dispatch]);

    const handleBuyTickets = async (quantity: number) => {
        if (!activeUser || !raffleToBuy) return;
        
        if (isRaffleEnded(raffleToBuy)) {
             dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'error', title: 'Sorteio Encerrado', message: 'Este sorteio já foi encerrado.' } });
             setRaffleToBuy(null);
             return;
        }

        try {
            const response = await api.buyRaffleTickets(activeUser.id, raffleToBuy.id, quantity);
            if (response.updatedUser) dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
            if (response.notifications) dispatch({ type: 'ADD_NOTIFICATIONS', payload: response.notifications });
            await fetchData();
             dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'success', title: 'Boa Sorte!', message: `Você comprou ${quantity} ticket(s)!` } });
        } catch (error) { console.error(error); } finally { setRaffleToBuy(null); }
    };
    
    const handleBuyJackpotTicketBulk = async (qty: number) => {
        if (!activeUser) return;
        if ((state.jackpotData as any)?.disabled) {
            dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'info', title: 'Jackpot em breve', message: 'O jackpot ainda não está disponível.' } });
            return;
        }
        setIsBuyingJackpot(true);
        try {
            // Use V13.6 Bulk API
            const res = await api.buyJackpotTicketsBulk(activeUser.id, qty);
            if ((res as any)?.disabled) {
                dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'info', title: 'Jackpot em breve', message: (res as any).message || 'O jackpot estará disponível em breve.' } });
                return;
            }
            
            if (res.success) {
                const existingJackpot = state.jackpotData && !(state.jackpotData as any).disabled ? state.jackpotData : null;
                const payload = existingJackpot ? { ...existingJackpot, currentValue: res.jackpotValue } : { currentValue: res.jackpotValue, ticketPrice: 0, nextDraw: '', tickets: [], history: [], status: 'active' as const };
                dispatch({ type: 'SET_JACKPOT_DATA', payload });
                if(res.updatedUser) dispatch({ type: 'UPDATE_USER', payload: res.updatedUser });
                dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'success', title: 'Tickets Confirmados!', message: res.message || `${qty} tickets adicionados!` } });
            } else {
                dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'error', title: 'Erro', message: res.message } });
            }
        } catch (e) { console.error(e); } finally { setIsBuyingJackpot(false); }
    }
    
    if (isLoading || !activeUser) return <div className="flex justify-center min-h-[60vh] items-center"><div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-yellow-500"></div></div>;
    
    const isJackpotDisabled = !!(state.jackpotData as any)?.disabled;
    const jackpotDisabledMessage = isJackpotDisabled ? (state.jackpotData as any)?.message || "Jackpot em breve" : "";
    const jackpot = !state.jackpotData || isJackpotDisabled
        ? { currentValue: 15000, ticketPrice: 100, nextDraw: '', tickets: [], history: [], status: 'active' as const, ticketLimits: { perUser: 0, global: 0 } }
        : state.jackpotData as any;
    const lastJackpotRound = !isJackpotDisabled && jackpot.history && jackpot.history.length > 0 ? jackpot.history[0] : undefined;
    
    const userLimit = !isJackpotDisabled ? jackpot.ticketLimits?.perUser || 0 : 0;
    const userTicketCount = !isJackpotDisabled ? jackpot.tickets.filter((t: any) => t.userId === activeUser.id).length : 0;

    // --- RAFFLE DISPLAY LOGIC V1.0 ---
    
    // 1. Identify Hero (Highlighted > First Active)
    const highlighted = raffles.find(r => r.id === highlightedRaffleId);
    const firstActive = raffles.find(r => r.status === 'active');
    
    const featuredStandardRaffle = highlighted || firstActive || null;

    // 2. Filter Lists (V1.0 Spec)
    // Other Active Raffles: Active only, exclude Hero, exclude Scheduled, exclude Finished
    // FIX V1.0: Exclude future/scheduled ones strictly here
    const displayRaffles = raffles.filter(r => 
        r.id !== featuredStandardRaffle?.id && 
        r.status === 'active' &&
        !(r.startsAt && new Date(r.startsAt) > new Date()) // Ensure not scheduled future start
    );

    // Hall of Fame: Finished only
    const winnerRaffles = raffles.filter(r => !!r.winnerId).sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime());

    return (
        <div className="pb-24 animate-fade-in-up">
            {/* --- STYLE INJECTION --- */}
            <style>{ArcaneStyles}</style>

            {/* 1. MAIN JACKPOT HERO (Arcane Ultra Edition) */}
            {isJackpotDisabled ? (
                <div className="w-full mb-16 relative z-10 px-2 md:px-0">
                    <div className="rounded-[32px] p-8 md:p-12 bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border border-yellow-500/40 shadow-[0_0_25px_rgba(234,179,8,0.1)] text-center">
                        <p className="text-3xl font-black text-yellow-300 uppercase tracking-[0.3em]">Jackpot: em breve</p>
                        <p className="text-gray-400 mt-2 font-medium">{jackpotDisabledMessage || 'Estamos preparando o Jackpot na infraestrutura Supabase.'}</p>
                    </div>
                </div>
            ) : (
                <MainRaffleHero 
                    currentValue={jackpot.currentValue} 
                    ticketPrice={jackpot.ticketPrice} 
                    onBuyTicket={handleBuyJackpotTicketBulk} 
                    userCoins={activeUser.coins} 
                    isBuying={isBuyingJackpot} 
                    tickets={jackpot.tickets} 
                    nextDraw={jackpot.nextDraw} 
                    lastRound={lastJackpotRound}
                    allUsers={allUsers}
                    status={jackpot.status}
                    nextStartDate={jackpot.nextStartDate}
                    userTicketCount={userTicketCount}
                    ticketLimits={jackpot.ticketLimits}
                />
            )}
            
            {/* 2. STANDARD RAFFLE MAIN CARD (Restored V1.0 with V2 Logic) */}
            {featuredStandardRaffle && (
                <StandardRaffleHero
                    raffle={featuredStandardRaffle}
                    myTickets={myTickets.filter(t => t.raffleId === featuredStandardRaffle!.id).length}
                    totalTickets={allTickets.filter(t => t.raffleId === featuredStandardRaffle!.id).length}
                    userCoins={activeUser.coins}
                    onBuy={setRaffleToBuy}
                />
            )}

            {/* 3. UPCOMING RAFFLES (Riot Style - Handles Scheduled Filter Internally) */}
            {/* FIX V1.0: Exclude highlighted raffle to avoid duplication if it is scheduled */}
            <RiotUpcomingList raffles={raffles.filter(r => r.id !== featuredStandardRaffle?.id)} />
            
            {/* 4. OTHER ACTIVE RAFFLES (GRID - V1.0 Spec) */}
            {displayRaffles.length > 0 && (
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-6 pl-2 border-l-4 border-green-500">
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider">Outros Sorteios Ativos</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {displayRaffles.map(raffle => {
                            const myCount = myTickets.filter(t => t.raffleId === raffle.id).length;
                            const totalCount = allTickets.filter(t => t.raffleId === raffle.id).length;
                            return <TicketCard key={raffle.id} raffle={raffle} myTickets={myCount} totalTickets={totalCount} userCoins={activeUser.coins} onBuy={setRaffleToBuy} />;
                        })}
                    </div>
                </div>
            )}
            
            {/* 5. HALL OF FAME (Winners) */}
            {winnerRaffles.length > 0 && (
                <div className="mb-12 bg-[#151515] p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#FFD447]/10 rounded-lg border border-[#FFD447]/20"><HistoryIcon className="w-5 h-5 text-[#FFD447]" /></div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider font-chakra">Hall da Fama</h3>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {winnerRaffles.map(raffle => {
                            const winner = allUsers.find(u => u.id === raffle.winnerId);
                            return <WinnerCard key={raffle.id} raffle={raffle} winner={winner} />;
                        })}
                    </div>
                </div>
            )}
            
            {/* FAQ Section */}
            <div className="mt-16 max-w-3xl mx-auto px-4">
                <h2 className="text-2xl font-bold text-center text-white mb-8 font-chakra uppercase tracking-wider flex items-center justify-center gap-2">
                    <ShieldIcon className="w-6 h-6 text-[#FFD65A]" /> Dúvidas Frequentes
                </h2>
                <div className="space-y-4">
                    {faqData.map((item, index) => <FaqItem key={index} question={item.question} answer={item.answer} />)}
                </div>
            </div>

            {raffleToBuy && <BuyTicketsModal raffle={raffleToBuy} myTicketCount={myTickets.filter(t => t.raffleId === raffleToBuy.id).length} userCoins={activeUser.coins} onClose={() => setRaffleToBuy(null)} onConfirm={handleBuyTickets} />}
        </div>
    );
};
export default Raffles;
