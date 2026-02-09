
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Raffle, RaffleTicket, User } from '../types';
import { refreshAfterEconomyAction } from '../core/refreshAfterEconomyAction';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { CoinIcon, TicketIcon, CrownIcon, HistoryIcon, CheckIcon, ShieldIcon } from '../constants';
import AvatarWithFrame from './AvatarWithFrame';
import RiotUpcomingList from './raffles/RiotUpcomingList';
import { RaffleEngineV2 } from '../api/raffles/raffle.engine';
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

  /* ✅ AAA micro-animations (landing) */
  @keyframes awFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .aw-anim {
    opacity: 0;
    animation: awFadeUp 700ms ease forwards;
  }
  .aw-delay-1 { animation-delay: 80ms; }
  .aw-delay-2 { animation-delay: 170ms; }
  .aw-delay-3 { animation-delay: 260ms; }
  .aw-delay-4 { animation-delay: 350ms; }
`;

// ✅ Landing Hero (Arena de Sorteios) — estilo "Assinaturas" (Riot/AAA)
const ArenaLandingHero: React.FC<{ hasActive: boolean }> = ({ hasActive }) => {
  const scrollToActive = () => {
    const el = document.getElementById('evento-ativo');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="pt-4 md:pt-6 mb-12 md:mb-16 relative">
      {/* Back Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[720px] bg-[#FFD36A]/10 blur-[110px] rounded-full pointer-events-none" />
      <div className="text-center max-w-5xl mx-auto relative z-10">
        <h1 className="aw-anim aw-delay-1 text-4xl md:text-6xl font-black text-[#FFD36A] font-chakra uppercase tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,211,106,0.5)]">
          ARENA DE SORTEIOS
        </h1>

        <div className="aw-anim aw-delay-2 flex items-center justify-center mb-6">
          <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#FF3CE6]" />
          <div className="mx-4 text-[#FF3CE6] animate-pulse">◆</div>
          <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#3CFFF8]" />
        </div>

        <h2 className="aw-anim aw-delay-3 text-lg md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed font-bold">
          Onde talento, estratégia e sorte se encontram.
        </h2>
        <p className="aw-anim aw-delay-4 text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium mt-3">
          Eventos oficiais do Artist World com <span className="text-white font-bold">prêmios reais</span>. Um vencedor por evento.
        </p>

        <div className="aw-anim aw-delay-4 mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={scrollToActive}
            className="px-8 py-3 rounded-xl bg-[#FFD36A] text-black font-black uppercase tracking-[0.22em] text-xs hover:shadow-[0_0_30px_rgba(255,211,106,0.35)] transition-all active:scale-[0.99]"
          >
            PARTICIPAR AGORA
          </button>
          <p className="text-xs text-gray-500">
            {hasActive ? 'Role para ver o evento ativo.' : 'Sem evento ativo? Veja os próximos e prepare seus LC.'}
          </p>
        </div>
      </div>
    </section>
  );
};

// ✅ Como funciona (Riot-style) — 4 cards de clareza/credibilidade
const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      title: 'Compre tickets com LC',
      icon: '🎟️',
      text: 'Use suas Lummi Coins para entrar no evento.',
    },
    {
      title: 'Evento com prazo real',
      icon: '⏳',
      text: 'Cada sorteio tem horário final público.',
    },
    {
      title: 'Apuração registrada',
      icon: '🎯',
      text: 'O sistema define 1 vencedor de forma determinística e auditável.',
    },
    {
      title: 'Entrega instantânea',
      icon: '🏆',
      text: 'Coins caem no saldo ou item vai direto pro inventário.',
    },
  ];

  return (
    <section className="mb-12 md:mb-16">
      <div className="aw-anim aw-delay-1 text-center mb-8">
        <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.45em] text-[#C8AA6E]">COMO FUNCIONA</p>
        <h3 className="text-2xl md:text-3xl font-black text-white font-chakra uppercase tracking-wide mt-2">
          Entenda em 10 segundos
        </h3>
        <p className="text-gray-400 text-sm mt-2">Simples. Transparente. Competitivo.</p>
      </div>

      <div className="aw-anim aw-delay-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl border border-[#FFD36A]/20 bg-[#121212] p-5 backdrop-blur-sm shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFD36A]/10 border border-[#FFD36A]/25 flex items-center justify-center text-lg">
                {s.icon}
              </div>
              <p className="text-white font-black uppercase tracking-wide text-sm">
                {s.title}
              </p>
            </div>
            <p className="text-xs text-white/55 mt-3 leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

// ✅ Empty State Premium (quando não há Sorteio Standard ativo)
const NoActiveStandardRaffle: React.FC<{ hasUpcoming?: boolean }> = ({ hasUpcoming }) => {
  const hints = [
    'Estamos preparando o próximo evento.',
    'Novos prêmios chegam em breve.',
    'Quando um sorteio abre, os primeiros tickets costumam ser os mais disputados.',
  ];
  const hint = hints[Math.floor(Math.random() * hints.length)];

  return (
    <div className="w-full mb-16 relative z-10 px-2 md:px-0">
      <div className="rounded-[28px] p-8 md:p-10 bg-gradient-to-br from-[#0c0f14] to-[#050608] border border-[#9d4dff]/40 shadow-[0_0_40px_rgba(157,77,255,0.18)] overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(157,77,255,0.25), transparent 55%), radial-gradient(circle at 70% 60%, rgba(255,214,90,0.18), transparent 55%)',
          }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#9d4dff] mb-2">EVENTOS</p>
            <h3 className="text-2xl md:text-3xl font-black text-white font-chakra uppercase leading-tight">
              Nenhum sorteio ativo agora
            </h3>
            <p className="text-gray-400 mt-2 font-medium">
              {hint} {hasUpcoming ? 'Veja os próximos sorteios logo abaixo.' : 'Em breve você verá novos eventos aqui.'}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-[#9d4dff]/10 border border-[#9d4dff]/30 text-[#cdb3ff]">
                Notificações no painel
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-[#FFD447]/10 border border-[#FFD447]/25 text-[#FFE25A]">
                Prêmios exclusivos
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/70">
                Tickets com coins
              </span>
            </div>
          </div>

          <div className="min-w-[240px]">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-[10px] text-white/50 uppercase font-black tracking-[0.3em]">
                Dica
              </p>
              <p className="text-white font-black mt-2">
                Volte amanhã e garanta seus tickets cedo.
              </p>
              <p className="text-xs text-white/50 mt-2">
                Quem compra primeiro geralmente fica com mais chances no final.
              </p>
              <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-[#9d4dff]/60 animate-pulse" style={{ width: '62%' }} />
              </div>
              <p className="text-[10px] text-white/40 mt-2 font-mono">
                status: aguardando novo sorteio
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
// (Jackpot removido do produto: UI/fluxo descontinuados)

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
    const eventTitle = (raffle as any)?.meta?.title || raffle.itemName;
    const prizeType = (raffle.prizeType || '').toLowerCase();
    const prizeText =
        prizeType === 'coins' ? `${Number(raffle.coinReward || 0)} LC`
        : prizeType === 'hybrid' ? `${raffle.itemName} + ${Number(raffle.coinReward || 0)} LC`
        : prizeType === 'manual_text' ? (raffle.customRewardText || raffle.itemName)
        : raffle.itemName;

    const winnerLabel =
        (winner as any)?.artisticName ||
        (winner as any)?.artistic_name ||
        winner?.displayName ||
        winner?.name ||
        raffle.winnerName ||
        '?';

    return (
        <div className="flex-shrink-0 w-80 bg-[#0E0E0E] border border-[#FFD447]/20 rounded-xl p-4 flex items-center gap-4 shadow-[0_0_15px_rgba(255,212,71,0.05)] hover:shadow-[0_0_20px_rgba(255,212,71,0.15)] hover:border-[#FFD447]/40 transition-all duration-300 group">
             <div className="relative">
                 <AvatarWithFrame user={winner || { name: raffle.winnerName || '?', avatarUrl: raffle.winnerAvatar || '' } as any} sizeClass="w-16 h-16" className="ring-2 ring-[#FFD447]/50" />
                 <div className="absolute -bottom-1 -right-1 bg-[#FFD447] text-black rounded-full p-1 border border-black shadow-lg"><CrownIcon className="w-3 h-3" /></div>
             </div>
             <div className="overflow-hidden min-w-0 flex-1">
                 <p className="text-[9px] text-[#FFD447] font-bold uppercase tracking-widest mb-1">🎉 Vencedor Confirmado</p>
                 <h4 className="text-white font-bold truncate text-lg leading-tight">{winnerLabel}</h4>
                 <p className="text-[11px] text-gray-500 truncate">Evento: <span className="text-gray-300">{eventTitle}</span></p>
                 <p className="text-xs text-gray-400 truncate mt-0.5">Prêmio: <span className="text-gray-200">{prizeText}</span></p>
                 <p className="text-[10px] text-gray-600 mt-2 font-mono border-t border-white/5 pt-1">
                     {raffle.winnerDefinedAt ? new Date(raffle.winnerDefinedAt).toLocaleString('pt-BR') : 'Data N/A'}
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
    { question: "Como funcionam os sorteios?", answer: "Você compra tickets usando Lummi Coins. Cada ticket representa uma chance." },
    { question: "Como o vencedor é escolhido?", answer: "Quando o evento encerra, o sistema define um vencedor de forma determinística e auditável." },
    { question: "O que eu ganho se vencer?", answer: "Pode ser um item, coins ou ambos. Itens vão para o Inventário e coins caem no saldo automaticamente." },
    { question: "Existe limite de tickets?", answer: "Alguns eventos possuem limite por usuário para manter o equilíbrio." },
    { question: "Posso participar de vários eventos ao mesmo tempo?", answer: "Sim. Você escolhe onde quer concentrar seus tickets." },
    { question: "E se ninguém comprar tickets?", answer: "O evento encerra sem vencedor e um novo sorteio é preparado." }
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
    const [highlightedRaffleId, setHighlightedRaffleId] = useState<string | null>(null); // V1.0

    const pollIntervalRef = useRef<number | null>(null);
    const isPollingActiveRef = useRef(false);

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            window.clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        isPollingActiveRef.current = false;
    }, []);

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
        } catch (error) {
            console.error("Failed to fetch raffles:", error);
        } finally {
            setIsLoading(false);
        }
    }, [activeUser]);

    const startPolling = useCallback(() => {
        // Só inicia se tiver usuário e não estiver rodando
        if (!activeUser) return;
        if (isPollingActiveRef.current) return;

        // Não pollar se a aba estiver oculta
        if (document.visibilityState !== 'visible') return;

        isPollingActiveRef.current = true;

        // 🔥 Redução forte: 15s -> 60s
        pollIntervalRef.current = window.setInterval(() => {
            // segurança extra: se esconder a aba, para
            if (document.visibilityState !== 'visible') {
                stopPolling();
                return;
            }
            void fetchData();
        }, 60_000);
    }, [activeUser, fetchData, stopPolling]);

    useEffect(() => {
        if (!activeUser) {
            stopPolling();
            return;
        }

        // Sempre faz 1 fetch ao entrar na tela
        void fetchData();

        // Inicia polling (somente se visível)
        startPolling();

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                // ao voltar pra aba, faz um fetch imediato e retoma polling
                void fetchData();
                startPolling();
            } else {
                // ao sair da aba, corta polling
                stopPolling();
            }
        };

        const onFocus = () => {
            // quando volta o foco, fetch + polling
            if (document.visibilityState === 'visible') {
                void fetchData();
                startPolling();
            }
        };

        const onBlur = () => {
            // quando perde foco, para polling
            stopPolling();
        };

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
            stopPolling();
        };
    }, [activeUser, fetchData, startPolling, stopPolling]);

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
            // 🔁 Fonte da verdade: Supabase
            // Sempre refetch após economia
            await refreshAfterEconomyAction(activeUser.id, dispatch);
             dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'success', title: 'Boa Sorte!', message: `Você comprou ${quantity} ticket(s)!` } });
        } catch (error) { console.error(error); } finally { setRaffleToBuy(null); }
    };
    
    if (isLoading || !activeUser) return <div className="flex justify-center min-h-[60vh] items-center"><div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-yellow-500"></div></div>;

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

            <div className="max-w-6xl mx-auto px-4 md:px-6">
                {/* 0. LANDING (Arena) */}
                <ArenaLandingHero hasActive={!!featuredStandardRaffle} />
                <div className="aw-anim aw-delay-2"><HowItWorksSection /></div>

            {/* 1. EVENTO EM DESTAQUE */}
            <section id="evento-ativo" className="scroll-mt-24">
                <div className="aw-anim aw-delay-3 text-center mb-6">
                    <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.45em] text-[#C8AA6E]">EVENTO EM ANDAMENTO</p>
                    <h3 className="text-2xl md:text-3xl font-black text-white font-chakra uppercase tracking-wide mt-2">
                        🔥 Participe agora
                        </h3>
                        <p className="text-gray-400 text-sm mt-2">
                            Entre no evento ativo e concorra ao prêmio — só quem tem ticket pode vencer.
                        </p>
                    </div>

                    {featuredStandardRaffle ? (
                        <StandardRaffleHero
                            raffle={featuredStandardRaffle}
                            myTickets={myTickets.filter(t => t.raffleId === featuredStandardRaffle!.id).length}
                            totalTickets={allTickets.filter(t => t.raffleId === featuredStandardRaffle!.id).length}
                            userCoins={activeUser.coins}
                            onBuy={setRaffleToBuy}
                        />
                    ) : (
                        <NoActiveStandardRaffle
                            hasUpcoming={raffles.some(r => r.status === 'scheduled' || (r.startsAt && new Date(r.startsAt) > new Date()))}
                        />
                    )}
                </section>

                {/* 2. HALL OF FAME (Winners) */}
                {winnerRaffles.length > 0 && (
                    <div className="mb-12 bg-[#151515] p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#FFD447]/10 rounded-lg border border-[#FFD447]/20"><HistoryIcon className="w-5 h-5 text-[#FFD447]" /></div>
                            <div>
                              <h3 className="text-xl font-bold text-white uppercase tracking-wider font-chakra">Hall da Fama</h3>
                              <p className="text-xs text-white/50 mt-1">Vencedores oficiais • prêmio registrado automaticamente</p>
                            </div>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {winnerRaffles.map(raffle => {
                                const winner = allUsers.find(u => u.id === raffle.winnerId);
                                return <WinnerCard key={raffle.id} raffle={raffle} winner={winner} />;
                            })}
                        </div>
                    </div>
                )}

                {/* 3. UPCOMING RAFFLES (Riot Style - Handles Scheduled Filter Internally) */}
                {/* FIX V1.0: Exclude highlighted raffle to avoid duplication if it is scheduled */}
                <RiotUpcomingList raffles={raffles.filter(r => r.id !== featuredStandardRaffle?.id)} />
                
                {/* 4. OTHER ACTIVE RAFFLES (GRID - V1.0 Spec) */}
                {displayRaffles.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center gap-3 mb-3 pl-2 border-l-4 border-green-500">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Outros eventos em andamento</h3>
                        </div>
                        <p className="text-xs text-white/50 px-2 mb-6">
                            Mais de um evento ativo? Distribua seus tickets estrategicamente e aumente suas chances.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {displayRaffles.map(raffle => {
                                const myCount = myTickets.filter(t => t.raffleId === raffle.id).length;
                                const totalCount = allTickets.filter(t => t.raffleId === raffle.id).length;
                                return <TicketCard key={raffle.id} raffle={raffle} myTickets={myCount} totalTickets={totalCount} userCoins={activeUser.coins} onBuy={setRaffleToBuy} />;
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
        </div>
    );
};
export default Raffles;
