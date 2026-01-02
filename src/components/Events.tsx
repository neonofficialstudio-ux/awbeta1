
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { Event, User, FeaturedWinner, Participation, EventMission, EventScoreLog, EventMissionSubmission, ArenaStatus, EventLiveFeedItem, EventRankingEntry } from '../types';
import { CoinIcon, XPIcon, CrownIcon, StarIcon, MissionIcon, CheckIcon, TrophyIcon, QueueIcon, InstagramIcon, SpotifyIcon, YoutubeIcon, TikTokIcon, SoundWaveIcon, EventIcon, HistoryIcon, ShieldIcon } from '../constants';
import AvatarWithFrame from './AvatarWithFrame';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { EventSync } from '../services/events/event.sync';
import { Perf } from '../services/perf.engine';
import { ModalPortal } from './ui/overlays/ModalPortal';
import EventMissionSubmissionModal from './EventMissionSubmissionModal';
import FaqItem from './ui/patterns/FaqItem';

// --- Visual Helpers ---

const HeroTitle: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <div className="text-center max-w-4xl mx-auto mb-12 pt-4">
        <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-[#FFD86B]/10 border border-[#FFD86B]/20 shadow-[0_0_20px_rgba(255,216,107,0.15)]">
                <EventIcon className="w-8 h-8 text-[#FFD86B]" />
            </div>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-white font-chakra uppercase tracking-tighter mb-4 drop-shadow-[0_0_25px_rgba(255,216,107,0.3)]">
            {title}
        </h2>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            {subtitle}
        </p>
        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-[#FFD86B] to-transparent mx-auto mt-8 opacity-50"></div>
    </div>
);

const TicketNotch: React.FC<{ position: 'left' | 'right' | 'top' | 'bottom', className?: string }> = React.memo(({ position, className = '' }) => {
    const base = "absolute w-6 h-6 bg-[#050505] rounded-full z-20";
    const positions = {
        left: "-left-3 top-1/2 -translate-y-1/2",
        right: "-right-3 top-1/2 -translate-y-1/2",
        top: "left-1/2 -translate-x-1/2 -top-3",
        bottom: "left-1/2 -translate-x-1/2 -bottom-3"
    };
    return <div className={`${base} ${positions[position]} ${className}`}></div>;
});

const DigitalCountdown: React.FC<{ targetDate?: string }> = React.memo(({ targetDate }) => {
    const calculateTimeLeft = useCallback(() => {
        if (!targetDate) return { d: '00', h: '00', m: '00', s: '00', total: 0 };
        const difference = +new Date(targetDate) - +new Date();
        if (difference > 0) {
            return {
                d: Math.floor(difference / (1000 * 60 * 60 * 24)).toString().padStart(2, '0'),
                h: Math.floor((difference / (1000 * 60 * 60)) % 24).toString().padStart(2, '0'),
                m: Math.floor((difference / 1000 / 60) % 60).toString().padStart(2, '0'),
                s: Math.floor((difference / 1000) % 60).toString().padStart(2, '0'),
                total: difference
            };
        }
        return { d: '00', h: '00', m: '00', s: '00', total: 0 };
    }, [targetDate]);

    const [time, setTime] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    if (time.total <= 0) {
         return (
            <div className="flex gap-3 text-xs md:text-sm font-mono text-red-500 bg-[#0D0D0D]/90 border border-red-500/30 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.1)] backdrop-blur-md">
                 <span className="font-black text-xl leading-none font-chakra">EVENTO ENCERRADO</span>
            </div>
         );
    }

    return (
        <div className="flex gap-3 text-xs md:text-sm font-mono text-[#FFD86B] bg-[#0D0D0D]/90 border border-[#FFD86B]/30 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(255,216,107,0.1)] backdrop-blur-md animate-fade-in-up">
            <div className="flex flex-col items-center min-w-[36px]">
                <span className="font-black text-white text-xl leading-none drop-shadow-md font-chakra">{time.d}</span>
                <span className="text-[9px] text-[#FFD86B]/60 font-bold tracking-widest mt-1">DIAS</span>
            </div>
            <span className="text-[#FFD86B]/40 font-light text-xl self-start -mt-1">:</span>
            <div className="flex flex-col items-center min-w-[36px]">
                <span className="font-black text-white text-xl leading-none drop-shadow-md font-chakra">{time.h}</span>
                <span className="text-[9px] text-[#FFD86B]/60 font-bold tracking-widest mt-1">HRS</span>
            </div>
            <span className="text-[#FFD86B]/40 font-light text-xl self-start -mt-1">:</span>
            <div className="flex flex-col items-center min-w-[36px]">
                <span className="font-black text-white text-xl leading-none drop-shadow-md font-chakra">{time.m}</span>
                <span className="text-[9px] text-[#FFD86B]/60 font-bold tracking-widest mt-1">MIN</span>
            </div>
            <span className="text-[#FFD86B]/40 font-light text-xl self-start -mt-1">:</span>
            <div className="flex flex-col items-center min-w-[36px]">
                <span className="font-black text-[#FFD86B] text-xl leading-none text-shadow-glow font-chakra animate-pulse">{time.s}</span>
                <span className="text-[9px] text-[#FFD86B]/60 font-bold tracking-widest mt-1">SEG</span>
            </div>
        </div>
    );
});

const HypeBar: React.FC<{ status?: ArenaStatus }> = React.memo(({ status }) => {
    if (!status) return null;
    
    return (
        <div className="w-full mt-6 bg-[#0A0A0A] p-5 rounded-2xl border border-[#FFD86B]/30 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.3)] group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFD86B]/5 to-transparent pointer-events-none"></div>
            <div className="flex justify-between text-[10px] font-mono text-[#B3B3B3] mb-3 uppercase tracking-widest font-bold relative z-10">
                <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#FFD86B] rounded-full animate-pulse"></span>
                    Capacidade da Arena
                </span>
                <span className="text-[#FFD86B] font-black text-shadow-glow">{status.label} ({status.current}/{status.capacity})</span>
            </div>
            <div className="h-3 w-full bg-[#151515] rounded-full overflow-hidden flex relative z-10 border border-white/10 p-[2px]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#C79B2C] via-[#FFD86B] to-[#FFF] shadow-[0_0_15px_rgba(255,216,107,0.6)] relative overflow-hidden transition-all duration-1000" style={{ width: `${status.percentage}%` }}>
                    <div className="absolute inset-0 bg-white/20 animate-[shine-sweep_2s_infinite]"></div>
                </div>
            </div>
            <div className="flex justify-between items-center mt-3 relative z-10">
                 <span className="text-[9px] text-[#808080] font-medium bg-black/40 px-2 py-0.5 rounded border border-white/5">
                     {status.onlineCount} online agora
                 </span>
                <p className="text-[11px] text-[#808080] font-medium tracking-wide">
                    A arena está enchendo rápido.
                </p>
            </div>
        </div>
    );
});

// --- Components ---

// 1. TICKET BOOTH MODAL (The Join Modal)
const TicketBoothModal: React.FC<{ 
    event: Event; 
    onClose: () => void; 
    onConfirm: (isGolden: boolean) => void; 
    userCoins: number;
    isJoining: boolean;
}> = ({ event, onClose, onConfirm, userCoins, isJoining }) => {
    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-modal-in" onClick={onClose}>
                <div 
                    className="bg-[#0D0D0D] w-full max-w-5xl rounded-[32px] border border-[#FFD86B]/30 flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Modal Background FX */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD86B] to-transparent opacity-50"></div>

                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-[#FFD86B]/10 flex justify-between items-center bg-[#121212] flex-shrink-0 relative z-10">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white font-chakra uppercase tracking-wider flex items-center gap-3">
                                <span className="text-[#FFD86B]">///</span> Bilheteria
                            </h2>
                            <p className="text-[#808080] text-xs md:text-sm mt-1 font-medium tracking-wide">Selecione sua categoria de acesso para <span className="text-white font-bold">"{event.title}"</span></p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-[#FFD86B]/50 transition-all group">
                            <span className="group-hover:scale-110 transition-transform">✕</span>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative z-10">
                        <div className="flex flex-col lg:flex-row gap-8 items-stretch justify-center">
                            
                            {/* STANDARD TICKET */}
                            <div className="flex-1 bg-[#141414] border border-white/10 rounded-2xl p-1 relative group hover:border-[#FFD86B]/30 transition-all duration-500 flex flex-col hover:-translate-y-1">
                                <div className="bg-[#0F0F0F] rounded-xl p-6 md:p-8 h-full flex flex-col relative overflow-hidden">
                                    <TicketNotch position="left" className="bg-[#0D0D0D] border-r border-white/10" />
                                    <TicketNotch position="right" className="bg-[#0D0D0D] border-l border-white/10" />
                                    
                                    <div className="text-center mb-6 border-b border-white/5 pb-6">
                                        <h3 className="text-lg font-bold text-gray-400 font-chakra uppercase tracking-[0.2em]">Acesso Padrão</h3>
                                        <div className="mt-4 flex items-center justify-center text-white">
                                            <div className="p-2 bg-[#1A1A1A] rounded-full mr-3 border border-white/10">
                                                <CoinIcon className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <span className="text-4xl md:text-5xl font-black tracking-tighter">{event.entryCost}</span>
                                        </div>
                                        <p className="text-[10px] text-[#808080] mt-2 font-bold uppercase tracking-wider">Lummi Coins</p>
                                    </div>

                                    <ul className="space-y-4 mb-8 text-sm text-gray-400 flex-grow px-2">
                                        <li className="flex items-center bg-[#181818] p-3 rounded-lg border border-white/5"><CheckIcon className="w-4 h-4 mr-3 text-[#FFD86B] flex-shrink-0"/> <span>Acesso ao Ranking Geral</span></li>
                                        <li className="flex items-center bg-[#181818] p-3 rounded-lg border border-white/5"><CheckIcon className="w-4 h-4 mr-3 text-[#FFD86B] flex-shrink-0"/> <span>Missões do Evento</span></li>
                                        <li className="flex items-center bg-[#181818] p-3 rounded-lg border border-white/5"><CheckIcon className="w-4 h-4 mr-3 text-[#FFD86B] flex-shrink-0"/> <span>Prêmios Básicos (XP & Coins)</span></li>
                                    </ul>

                                    <button 
                                        onClick={() => onConfirm(false)}
                                        disabled={isJoining || userCoins < event.entryCost}
                                        className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all bg-[#1A1A1A] hover:bg-white text-white hover:text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-auto border border-white/10"
                                    >
                                        {userCoins < event.entryCost ? 'Saldo Insuficiente' : 'Selecionar Padrão'}
                                    </button>
                                </div>
                            </div>

                            {/* GOLDEN PASS (Premium) */}
                            <div className="flex-1 relative group transform lg:-translate-y-6 lg:z-10 flex flex-col">
                                {/* Glow Behind */}
                                <div className="absolute -inset-0.5 bg-gradient-to-b from-[#FFD86B] to-[#C79B2C] rounded-[20px] blur opacity-40 group-hover:opacity-70 transition-opacity duration-500"></div>
                                
                                <div className="bg-gradient-to-b from-[#2a200a] to-[#050505] border-2 border-[#FFD86B] rounded-2xl p-1 relative overflow-hidden shadow-2xl h-full flex flex-col">
                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl">
                                        <div className="absolute top-0 -left-[100%] w-[200%] h-full bg-gradient-to-r from-transparent via-[#FFD86B]/10 to-transparent transform -skew-x-12 animate-shine-sweep"></div>
                                    </div>

                                    <div className="bg-[#080808]/90 backdrop-blur-sm rounded-xl p-6 md:p-8 h-full flex flex-col relative z-10">
                                        <TicketNotch position="left" className="bg-[#0D0D0D] border-r-2 border-[#FFD86B]" />
                                        <TicketNotch position="right" className="bg-[#0D0D0D] border-l-2 border-[#FFD86B]" />

                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#FFD86B] text-black text-[9px] font-black px-4 py-1.5 rounded-b-lg uppercase tracking-widest shadow-[0_4px_10px_rgba(255,216,107,0.4)]">
                                            Experiência Elite
                                        </div>

                                        <div className="text-center mb-8 border-b border-[#FFD86B]/20 pb-6 mt-4">
                                            <div className="flex items-center justify-center gap-2 mb-2">
                                                <CrownIcon className="w-6 h-6 text-[#FFD86B] animate-pulse-slow drop-shadow-md" />
                                                <h3 className="text-xl font-black text-[#FFD86B] font-chakra uppercase tracking-widest text-shadow-glow">Golden Pass</h3>
                                            </div>
                                            <div className="mt-4 flex items-center justify-center text-white">
                                                <div className="p-2 bg-[#FFD86B]/10 rounded-full mr-3 border border-[#FFD86B]/30">
                                                    <CoinIcon className="w-8 h-8 text-[#FFD86B]" />
                                                </div>
                                                <span className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">{event.goldenPassCost}</span>
                                            </div>
                                            <p className="text-[10px] text-[#C79B2C] mt-2 font-bold uppercase tracking-wider">Lummi Coins</p>
                                        </div>

                                        <ul className="space-y-4 mb-8 text-sm text-gray-200 flex-grow px-2">
                                            <li className="flex items-center bg-[#FFD86B]/5 p-3 rounded-lg border border-[#FFD86B]/20">
                                                <div className="bg-[#FFD86B]/20 p-1 rounded-full mr-3"><StarIcon className="w-3 h-3 text-[#FFD86B]"/></div>
                                                <span className="font-bold text-white">🏆 PRÊMIO EXTRA: {event.vipPrize || 'Item Exclusivo'}</span>
                                            </li>
                                            <li className="flex items-center bg-[#FFD86B]/5 p-3 rounded-lg border border-[#FFD86B]/20">
                                                <div className="bg-[#FFD86B]/20 p-1 rounded-full mr-3"><CheckIcon className="w-3 h-3 text-[#FFD86B]"/></div>
                                                <span className="font-medium text-gray-300">⚡ BOOST: +50% de Pontos</span>
                                            </li>
                                            <li className="flex items-center bg-[#FFD86B]/5 p-3 rounded-lg border border-[#FFD86B]/20">
                                                <div className="bg-[#FFD86B]/20 p-1 rounded-full mr-3"><CheckIcon className="w-3 h-3 text-[#FFD86B]"/></div>
                                                <span className="font-medium text-gray-300">👑 Moldura Dourada Exclusiva</span>
                                            </li>
                                            <li className="flex items-center bg-[#FFD86B]/5 p-3 rounded-lg border border-[#FFD86B]/20">
                                                <div className="bg-[#FFD86B]/20 p-1 rounded-full mr-3"><CheckIcon className="w-3 h-3 text-[#FFD86B]"/></div>
                                                <span className="font-medium text-gray-300">🛡️ Acesso ao Leaderboard das Lendas</span>
                                            </li>
                                        </ul>

                                        <button 
                                            onClick={() => onConfirm(true)}
                                            disabled={isJoining || userCoins < event.goldenPassCost}
                                            className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all transform hover:scale-[1.02] active:scale-[0.98] bg-[#FFD86B] hover:bg-[#C79B2C] text-black shadow-[0_0_25px_rgba(255,216,107,0.4)] border border-[#FFD86B] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-auto relative overflow-hidden group/btn"
                                        >
                                            <span className="relative z-10">{userCoins < event.goldenPassCost ? 'Saldo Insuficiente' : 'EMITIR GOLDEN PASS'}</span>
                                            <div className="absolute inset-0 bg-white/30 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 skew-y-6"></div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                        
                        <p className="text-center text-[10px] text-gray-600 mt-10 font-medium uppercase tracking-wide opacity-60">
                            * A compra do ingresso é final e não reembolsável. Os benefícios do Golden Pass são válidos apenas para a duração deste evento.
                        </p>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

// 2. HERO TICKET (The Main Event) - NOW STATEFUL FOR JOIN STATUS & CLOSED STATE
const HeroTicket: React.FC<{ event: Event; onJoinClick: () => void; participation?: Participation; arenaStatus?: ArenaStatus | null }> = React.memo(({ event, onJoinClick, participation, arenaStatus }) => {
    
    const isParticipating = !!participation;
    const isGolden = participation?.isGolden;
    const isClosed = event.status === 'closed';

    return (
        <div className={`relative w-full max-w-7xl mx-auto mb-12 group animate-fade-in-up px-2 md:px-0 ${isClosed ? 'grayscale opacity-90 hover:grayscale-0 hover:opacity-100 transition-all' : ''}`}>
            {/* Glow Effect Behind */}
            {!isClosed && <div className="absolute inset-0 bg-[#FFD86B]/10 blur-[120px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-1000"></div>}

            <div className={`relative bg-[#0E0E0E] border ${isClosed ? 'border-gray-800' : 'border-[#FFD86B]/30'} rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col md:flex-row min-h-[500px] md:h-[550px] transition-all duration-500 hover:border-[#FFD86B]/50 group/card`}>
                {/* Outer Gold Shine Border Animation */}
                {!isClosed && (
                    <div className="absolute inset-0 rounded-[32px] pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-[#FFD86B]/20 to-transparent opacity-0 group-hover/card:opacity-100 animate-shine-sweep" style={{ animationDuration: '5s' }}></div>
                    </div>
                )}

                {/* Left: Image Section */}
                <div className="md:w-5/12 relative overflow-hidden h-[300px] md:h-full border-b md:border-b-0 md:border-r border-[#FFD86B]/20">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E] via-transparent to-transparent z-10 opacity-90"></div>
                    <img 
                        src={event.imageUrl} 
                        alt={event.title} 
                        className="w-full h-full object-cover transition-all duration-1000 scale-105 group-hover/card:scale-110" 
                    />
                    
                    {/* Ticket Stub Holes */}
                    <div className="absolute -right-4 top-1/3 w-8 h-8 bg-[#050505] rounded-full z-20 hidden md:block shadow-[inset_2px_0_5px_rgba(0,0,0,0.8)] border-l border-[#FFD86B]/10"></div>
                    <div className="absolute -right-4 bottom-1/3 w-8 h-8 bg-[#050505] rounded-full z-20 hidden md:block shadow-[inset_2px_0_5px_rgba(0,0,0,0.8)] border-l border-[#FFD86B]/10"></div>

                    <div className="absolute top-6 left-6 z-20">
                         <span className={`px-4 py-1.5 ${isClosed ? 'bg-red-900/80 text-white' : 'bg-[#FFD86B] text-black'} text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-2 border border-white/20`}>
                             {isClosed ? (
                                 <>🔒 EVENTO ENCERRADO</>
                             ) : (
                                 <>
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                    Evento Principal
                                 </>
                             )}
                         </span>
                    </div>
                </div>

                {/* Right: Info Section */}
                <div className="md:w-7/12 p-6 md:p-10 flex flex-col relative z-10">
                    {/* Decorative Elements */}
                    {!isClosed && (
                        <div className="absolute top-6 right-6 flex gap-1 opacity-20">
                            {[...Array(6)].map((_,i) => <div key={i} className={`w-1 h-6 bg-[#FFD86B] rounded-full`} style={{opacity: Math.random() * 0.5 + 0.2}}></div>)}
                        </div>
                    )}

                    <div className="flex flex-col-reverse md:flex-row justify-between items-start gap-4 mb-6">
                         <div className="flex-1">
                             <div className="flex items-center gap-3 mb-3">
                                 <span className="px-2 py-0.5 bg-[#FFD86B]/10 text-[#FFD86B] border border-[#FFD86B]/20 rounded text-[10px] font-bold font-mono uppercase tracking-wider">ID: {event.id.toUpperCase()}</span>
                                 {!isClosed && <span className="flex items-center text-[#2ECC71] text-[10px] font-bold uppercase tracking-wider bg-[#2ECC71]/10 px-2 py-0.5 rounded border border-[#2ECC71]/20"><span className="w-1.5 h-1.5 bg-[#2ECC71] rounded-full mr-1.5 animate-pulse"></span> AO VIVO</span>}
                             </div>
                             <h1 className="text-3xl md:text-5xl font-black text-white font-chakra uppercase leading-[0.95] mb-2 drop-shadow-md tracking-tight group-hover/card:text-[#FFD86B] transition-all duration-500">
                                {event.title}
                             </h1>
                         </div>
                         <div className="hidden md:block">
                            <DigitalCountdown targetDate={event.date} />
                         </div>
                    </div>

                    <div className="relative pl-4 border-l-2 border-[#FFD86B]/30 mb-8">
                        <p className="text-[#B3B3B3] text-sm md:text-base font-medium leading-relaxed max-w-xl">
                            {event.description}
                        </p>
                    </div>

                    {/* Winners Display if Closed */}
                    {isClosed && event.winners && event.winners.length > 0 ? (
                        <div className="mb-6 p-4 bg-[#151515] rounded-xl border border-[#FFD86B]/20">
                            <h3 className="text-sm font-bold text-[#FFD86B] uppercase tracking-wider mb-3 flex items-center gap-2">
                                <CrownIcon className="w-4 h-4" /> Vencedores Oficiais
                            </h3>
                            <div className="space-y-2">
                                {event.winners.slice(0, 3).map((winner, i) => (
                                    <div key={i} className="flex items-center justify-between bg-black/30 p-2 rounded">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[#FFD86B] font-black text-sm">#{i+1}</span>
                                            <AvatarWithFrame user={winner as any} sizeClass="w-6 h-6" />
                                            <span className="text-white text-sm font-bold">{winner.userName}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 uppercase">{winner.rewardDescription}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-[#121212] p-4 rounded-xl border border-white/5 hover:border-[#FFD86B]/30 transition-colors group/prize relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/prize:opacity-10 transition-opacity">
                                    <TrophyIcon className="w-16 h-16 text-[#FFD86B]" />
                                </div>
                                <p className="text-[9px] text-[#808080] uppercase font-bold tracking-widest mb-1 group-hover/prize:text-[#FFD86B] transition-colors">Prêmio Principal</p>
                                <div className="flex items-center text-white font-bold text-sm md:text-base z-10 relative">
                                    <TrophyIcon className="w-4 h-4 text-[#FFD86B] mr-2 filter drop-shadow-sm" />
                                    {event.prize}
                                </div>
                            </div>
                            <div className="bg-[#121212] p-4 rounded-xl border border-white/5 hover:border-[#FFD86B]/30 transition-colors group/vip relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/vip:opacity-10 transition-opacity">
                                    <CrownIcon className="w-16 h-16 text-[#FFD86B]" />
                                </div>
                                <p className="text-[9px] text-[#808080] uppercase font-bold tracking-widest mb-1 group-hover/vip:text-[#FFD86B] transition-colors">Bônus VIP</p>
                                <div className="flex items-center text-white font-bold text-sm md:text-base z-10 relative">
                                    <CrownIcon className="w-4 h-4 text-[#FFD86B] mr-2 filter drop-shadow-sm" />
                                    {event.vipPrize || "N/A"}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Synced Hype Bar */}
                    {!isClosed && <HypeBar status={arenaStatus || undefined} />}

                    <div className="mt-auto pt-8 flex flex-col md:flex-row gap-4 items-center">
                         {!isParticipating && !isClosed ? (
                            <button 
                                onClick={onJoinClick}
                                className="w-full md:w-auto flex-1 px-8 py-4 bg-gradient-to-r from-[#FFD86B] to-[#C79B2C] text-black font-black uppercase tracking-[0.2em] rounded-xl hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,216,107,0.4)] transition-all text-xs md:text-sm relative overflow-hidden group/join border border-[#FFD86B]"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    <span className="text-lg">🎟️</span> Garantir Acesso
                                </span>
                                <div className="absolute inset-0 bg-white/30 translate-y-full group-hover/join:translate-y-0 transition-transform duration-300 skew-y-6"></div>
                            </button>
                         ) : isParticipating ? (
                            <div className={`w-full md:w-auto flex-1 px-8 py-4 rounded-xl font-bold uppercase tracking-[0.15em] border flex items-center justify-center gap-3 backdrop-blur-md transition-all duration-300 ${isGolden ? 'bg-[#FFD86B]/10 border-[#FFD86B] text-[#FFD86B] shadow-[0_0_20px_rgba(255,216,107,0.2)]' : 'bg-blue-900/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'}`}>
                                <CheckIcon className="w-5 h-5" />
                                <span className="text-xs md:text-sm font-chakra">{isGolden ? 'Participando com Passe VIP' : 'Participando com Passe Normal'}</span>
                            </div>
                         ) : (
                             <div className="w-full text-center text-gray-500 text-sm font-bold uppercase tracking-widest">Inscrições Encerradas</div>
                         )}
                         
                         {/* Mobile Timer */}
                         {!isClosed && (
                             <div className="md:hidden w-full">
                                <div className="flex justify-center">
                                    <DigitalCountdown targetDate={event.date} />
                                </div>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// 3. EVENT TICKET CARD (Secondary List)
const EventTicketCard: React.FC<{ event: Event }> = React.memo(({ event }) => {
    return (
        <div className="group relative bg-[#0E0E0E] border border-white/10 rounded-2xl overflow-hidden hover:-translate-y-2 hover:border-[#FFD86B]/50 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-500 cursor-pointer h-full flex flex-col">
            {/* Status Line */}
            <div className={`h-1 w-full ${event.status === 'future' ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
            
            <div className="relative h-40 overflow-hidden">
                <img src={event.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E] to-transparent"></div>
                
                <div className="absolute top-3 right-3">
                     <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border backdrop-blur-md ${event.status === 'future' ? 'bg-blue-900/60 text-blue-400 border-blue-500/30' : 'bg-gray-800/80 text-gray-400 border-gray-600/30'}`}>
                        {event.status === 'future' ? 'Em Breve' : 'Encerrado'}
                     </span>
                </div>
            </div>
            
            <div className="p-5 flex flex-col flex-grow">
                <p className="text-[10px] text-[#808080] font-mono mb-2 uppercase tracking-wider">{new Date(event.date).toLocaleDateString()}</p>
                <h4 className="text-white font-bold font-chakra uppercase text-lg leading-tight mb-4 group-hover:text-[#FFD86B] transition-colors line-clamp-2">{event.title}</h4>
                
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center text-xs font-bold text-[#FFD86B] bg-[#FFD86B]/5 px-3 py-1.5 rounded-lg border border-[#FFD86B]/10">
                        <TrophyIcon className="w-3.5 h-3.5 mr-2" />
                        <span>Prêmios</span>
                    </div>
                    <span className="text-gray-600 group-hover:text-white transition-colors">→</span>
                </div>
            </div>
        </div>
    );
});

// 3.5 CLOSED EVENT CARD (Hall of Fame Style)
const ClosedEventCard: React.FC<{ event: Event }> = React.memo(({ event }) => {
    const winner = event.winners && event.winners.length > 0 ? event.winners[0] : null;

    return (
        <div className="group relative bg-[#050505] border border-[#FFD86B]/10 rounded-2xl overflow-hidden hover:-translate-y-2 hover:border-[#FFD86B]/30 transition-all duration-500 flex flex-col h-full shadow-lg">
            {/* Top Line - Closed */}
            <div className="h-1 w-full bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800"></div>
            
            {/* Image with Grayscale unless hovered */}
            <div className="relative h-40 overflow-hidden">
                <img src={event.imageUrl} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent"></div>
                <div className="absolute top-3 left-3 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Evento Encerrado</span>
                </div>
            </div>
            
            <div className="p-5 flex flex-col flex-grow relative z-10">
                <h4 className="text-white font-bold font-chakra uppercase text-lg leading-tight mb-4 group-hover:text-[#FFD86B] transition-colors truncate">{event.title}</h4>
                
                {/* Winner Spotlight */}
                {winner ? (
                    <div className="mt-auto bg-[#0A0A0A] rounded-xl p-3 border border-white/5 flex items-center gap-3 group-hover:border-[#FFD86B]/20 transition-colors">
                        <div className="relative">
                            <img src={winner.userAvatar || "https://i.pravatar.cc/150?u=default"} className="w-10 h-10 rounded-full border border-[#FFD86B]/50" />
                            <div className="absolute -top-2 -right-1 text-xs">👑</div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-[#FFD86B] font-bold uppercase tracking-wider mb-0.5">Vencedor</p>
                            <p className="text-sm font-bold text-white truncate">{winner.userName}</p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-auto text-center p-3 text-xs text-gray-500 italic">
                        Resultados arquivados.
                    </div>
                )}
                
                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-600 flex justify-between">
                     <span>Encerrado em: {event.closedAt ? new Date(event.closedAt).toLocaleDateString() : 'N/A'}</span>
                     <span className="group-hover:text-white transition-colors cursor-pointer flex items-center gap-1"><HistoryIcon className="w-3 h-3"/> Ver Detalhes</span>
                </div>
            </div>
        </div>
    );
});

// 4. LEADERBOARD TICKET STRIP
const LeaderboardStrip: React.FC<{ entry: EventRankingEntry, user: User }> = React.memo(({ entry, user }) => {
    const isMe = entry.isCurrentUser;
    const isFirst = entry.rank === 1;

    return (
        <div className={`
            relative flex items-center p-3 rounded-xl border mb-2 transition-all duration-300 group
            ${isFirst ? 'bg-[#FFD86B]/10 border-[#FFD86B]/40 shadow-[0_0_15px_rgba(255,216,107,0.15)]' : ''}
            ${isMe && !isFirst ? 'bg-white/5 border-white/20 shadow-sm' : 'bg-[#121212]/60 border-white/5 hover:bg-[#1A1A1A] hover:border-white/10'}
        `}>
            {isFirst && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#FFD86B] rounded-r-full shadow-[0_0_10px_#FFD86B]"></div>}
            
            <div className={`
                w-8 h-8 flex items-center justify-center rounded-lg font-chakra font-black text-sm mr-3 relative overflow-hidden
                ${entry.rank === 1 ? 'bg-gradient-to-br from-[#FFD86B] to-[#C79B2C] text-black shadow-md' : entry.rank <= 3 ? 'bg-white/10 text-white border border-white/10' : 'bg-[#0A0A0A] text-gray-600 font-mono'}
            `}>
                {entry.rank === 1 && <div className="absolute inset-0 bg-white/30 animate-shine-sweep"></div>}
                {entry.rank}
            </div>
            
            <div className="relative mr-4">
                <img 
                     src={entry.userAvatar || "https://i.pravatar.cc/150?u=default"} 
                     alt={entry.userName}
                     className={`w-10 h-10 rounded-full object-cover ${isFirst ? 'ring-2 ring-[#FFD86B]' : ''}`}
                />
                {entry.passType === 'vip' && (
                    <div className="absolute -top-1 -right-1 bg-[#050505] rounded-full p-0.5 border border-[#FFD86B] shadow-sm z-10">
                        <CrownIcon className="w-2.5 h-2.5 text-[#FFD86B]"/>
                    </div>
                )}
            </div>

            <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold truncate ${isMe ? 'text-[#FFD86B]' : isFirst ? 'text-white' : 'text-gray-200'}`}>{entry.userName}</p>
                </div>
            </div>

            <div className="text-right pl-2">
                <span className={`font-mono font-black block text-lg leading-none mb-0.5 ${isFirst ? 'text-[#FFD86B] text-shadow-glow' : 'text-white'}`}>{entry.score}</span>
                <span className="text-[8px] text-[#808080] uppercase tracking-widest font-bold">PTS</span>
            </div>
        </div>
    );
});

// 5. DASHBOARD (Modified for Gold Neon Max + Live Ranking Highlight)
const EventDashboard: React.FC<{
    event: Event;
    user: User;
    leaderboard: EventRankingEntry[];
    missions: EventMission[];
    onSubmitMission: (mission: EventMission) => void;
    userSubmissions: EventMissionSubmission[];
    liveFeed: EventLiveFeedItem[];
}> = ({ event, user, leaderboard, missions, onSubmitMission, userSubmissions, liveFeed }) => {
    // HOTFIX V7.6: Initialize activeTab only once to respect user choice.
    const [activeTab, setActiveTab] = useState<'gladiators' | 'legends'>(() => {
        if (leaderboard && leaderboard.length > 0) {
             const userEntry = leaderboard.find(l => l.isCurrentUser);
             if (userEntry && userEntry.passType === 'vip') return 'legends';
        }
        return 'gladiators';
    });

    const filteredLeaderboard = useMemo(() => {
        if (!leaderboard) return [];
        return leaderboard.filter(l => activeTab === 'legends' ? l.passType === 'vip' : l.passType === 'normal').slice(0, 10);
    }, [leaderboard, activeTab]);

    const EVENT_FAQS = [
        { q: "Como funciona o ranking?", a: "O ranking é baseado nos pontos (PTS) acumulados ao completar missões do evento. Quanto mais complexa a missão, mais pontos você ganha." },
        { q: "Como envio minha prova?", a: "Clique no botão 'Enviar Prova' no card da missão. Você poderá enviar um link ou fazer upload de um print/foto dependendo do requisito." },
        { q: "O que acontece se eu perder o prazo?", a: "Missões não enviadas dentro do prazo do evento não contabilizam pontos. Fique atento ao cronômetro no topo da página." },
        { q: "Como funcionam os bônus VIP?", a: "Portadores do Golden Pass ganham um multiplicador de 1.5x em todos os pontos, além de acesso a prêmios exclusivos no final do evento." }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 animate-fade-in-up relative">
            {/* LEFT: MISSIONS (2/3) */}
            <div className="lg:col-span-2 space-y-8">
                <div>
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#FFD86B]/10">
                        <div className="p-2 bg-[#FFD86B]/10 rounded-lg border border-[#FFD86B]/20 shadow-[0_0_15px_rgba(255,216,107,0.1)]">
                            <MissionIcon className="w-6 h-6 text-[#FFD86B]" />
                        </div>
                        <h3 className="text-2xl font-black text-white font-chakra uppercase tracking-wide text-shadow-sm">
                            {event.status === 'closed' ? 'Histórico de Missões' : 'Missões do Evento'}
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {missions && missions.length > 0 ? missions.map(mission => {
                            const submission = userSubmissions ? userSubmissions.find(s => s.eventMissionId === mission.id) : undefined;
                            const isCompleted = submission?.status === 'approved';
                            const isPending = submission?.status === 'pending';
                            const isRejected = submission?.status === 'rejected';
                            const isEventClosed = event.status === 'closed';

                            return (
                                <div key={mission.id} className={`
                                    relative p-6 rounded-2xl border transition-all duration-300 group overflow-hidden flex flex-col h-full
                                    ${isCompleted 
                                        ? 'bg-[#0A0A0A] border-green-500/30 opacity-80' 
                                        : 'bg-[#0C0C0C] border-[#FFD86B]/20 hover:border-[#FFD86B] hover:shadow-[0_0_25px_rgba(255,216,107,0.15)] hover:-translate-y-1'
                                    }
                                    ${isEventClosed ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''}
                                `}>
                                    {/* Texture */}
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
                                    
                                    {isCompleted && <div className="absolute inset-0 bg-green-500/5 pointer-events-none z-0"></div>}

                                    <div className="flex gap-2 mb-3">
                                        {mission.type === 'instagram' && <InstagramIcon className="w-4 h-4 text-[#FFD86B]" />}
                                        {mission.type === 'tiktok' && <TikTokIcon className="w-4 h-4 text-[#FFD86B]" />}
                                        {mission.type === 'youtube' && <YoutubeIcon className="w-4 h-4 text-[#FFD86B]" />}
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wide truncate">{mission.title}</h4>
                                    </div>

                                    <p className="text-xs text-gray-400 mb-4 line-clamp-3 leading-relaxed">{mission.description}</p>

                                    <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
                                        <div className="flex items-center gap-3 font-mono text-xs">
                                            <span className="text-[#FFD86B] font-bold">+{mission.points} PTS</span>
                                            <span className="text-blue-400">+{mission.xp} XP</span>
                                        </div>
                                        
                                        {/* Action Button */}
                                        {isCompleted ? (
                                            <span className="text-green-400 text-xs font-bold uppercase flex items-center gap-1"><CheckIcon className="w-3 h-3"/> Concluído</span>
                                        ) : isPending ? (
                                            <span className="text-yellow-400 text-xs font-bold uppercase flex items-center gap-1 animate-pulse">● Análise</span>
                                        ) : isRejected ? (
                                             <button onClick={() => !isEventClosed && onSubmitMission(mission)} disabled={isEventClosed} className="text-red-400 hover:text-white text-xs font-bold uppercase transition-colors">Tentar Novamente</button>
                                        ) : (
                                            <button 
                                                onClick={() => onSubmitMission(mission)}
                                                disabled={isEventClosed}
                                                className={`bg-[#FFD86B]/10 hover:bg-[#FFD86B] text-[#FFD86B] hover:text-black border border-[#FFD86B]/30 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${isEventClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                Enviar Prova
                                            </button>
                                        )}
                                    </div>
                                    
                                    {mission.tier === 'vip' && (
                                        <div className="absolute top-2 right-2">
                                            <CrownIcon className="w-4 h-4 text-[#FFD86B] drop-shadow-md" />
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-[#222] rounded-xl">
                                <p className="text-gray-600 text-sm">Nenhuma missão disponível para o seu passe.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT: LEADERBOARD & FEED (1/3) */}
            <div className="space-y-6">
                
                {/* Ranking Card */}
                <div className="bg-[#121212] border border-[#FFD86B]/20 rounded-2xl p-5 shadow-lg flex flex-col h-[500px]">
                     <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                        <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <TrophyIcon className="w-4 h-4 text-[#FFD86B]" /> Ranking ao Vivo
                        </h3>
                        <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> LIVE
                        </div>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                         {filteredLeaderboard.length > 0 ? filteredLeaderboard.map((entry, idx) => (
                             <LeaderboardStrip key={entry.userId} entry={entry} user={user} />
                         )) : (
                             <p className="text-center text-gray-500 text-xs mt-10">Ranking em processamento...</p>
                         )}
                     </div>
                     
                     {/* User Rank Stick to Bottom */}
                     {leaderboard.find(l => l.isCurrentUser) && (
                         <div className="mt-2 pt-2 border-t border-[#FFD86B]/30">
                             <LeaderboardStrip entry={leaderboard.find(l => l.isCurrentUser)!} user={user} />
                         </div>
                     )}
                </div>

                {/* Live Feed */}
                <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <SoundWaveIcon className="w-3 h-3" /> Atividade da Arena
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-hidden relative">
                         {liveFeed.map(item => (
                             <div key={item.id} className="text-[10px] text-gray-300 font-mono truncate animate-fade-in-up">
                                 <span className="text-gray-600 mr-2">[{new Date(item.timestamp).toLocaleTimeString()}]</span>
                                 {item.text}
                             </div>
                         ))}
                         {liveFeed.length === 0 && <p className="text-[10px] text-gray-600 italic">Aguardando atualizações...</p>}
                         <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#151515] to-transparent"></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// Events (Main Component)
const Events: React.FC = () => {
    // Hooks & State
    const { state, dispatch } = useAppContext();
    const { activeUser } = state;
    
    // Local State for data and UI
    const [isLoading, setIsLoading] = useState(true);
    const [eventsList, setEventsList] = useState<Event[]>([]);
    const [participations, setParticipations] = useState<Participation[]>([]);
    
    // UI State
    const [showTicketBooth, setShowTicketBooth] = useState(false);
    const [joiningEvent, setJoiningEvent] = useState(false);
    const [missionToSubmit, setMissionToSubmit] = useState<EventMission | null>(null);

    // Derived from Global State (Synced via MasterSync/EventSync)
    const activeEvent = state.events.activeEvent;
    const session = state.events.session;
    const ranking = state.rankingEvent;
    const arenaStatus = state.events.arenaStatus;
    const liveFeed = state.events.liveFeed;

    const EVENT_FAQS = [
        { q: "Como funciona o ranking?", a: "O ranking é baseado nos pontos (PTS) acumulados ao completar missões do evento. Quanto mais complexa a missão, mais pontos você ganha." },
        { q: "Como envio minha prova?", a: "Clique no botão 'Enviar Prova' no card da missão. Você poderá enviar um link ou fazer upload de um print/foto dependendo do requisito." },
        { q: "O que acontece se eu perder o prazo?", a: "Missões não enviadas dentro do prazo do evento não contabilizam pontos. Fique atento ao cronômetro no topo da página." },
        { q: "Como funcionam os bônus VIP?", a: "Portadores do Golden Pass ganham um multiplicador de 1.5x em todos os pontos, além de acesso a prêmios exclusivos no final do evento." }
    ];
    
    // Initial Data Fetch
    useEffect(() => {
        if (!activeUser) return;
        
        const loadData = async () => {
            const data = await api.fetchEventsData(activeUser.id);
            setEventsList(data.events);
            setParticipations(data.participations);
            
            // Set active event if one exists and not set
            const current = data.events.find(e => e.status === 'current');
            if (current) {
                dispatch({ type: 'EVENT_SET_ACTIVE', payload: current });
                // If user is participating, ensure session is synced
                if (activeUser.joinedEvents.includes(current.id)) {
                    // Trigger sync
                    EventSync.start(current.id, activeUser.id, dispatch);
                }
            }
            
            setIsLoading(false);
        };
        
        loadData();
        
        // Clean up sync on unmount
        return () => {
            EventSync.stop();
        };
    }, [activeUser, dispatch]);

    // Derived Logic
    const userParticipation = useMemo(() => {
        if (!activeUser || !activeEvent) return undefined;
        return participations.find(p => p.userId === activeUser.id && p.eventId === activeEvent.id);
    }, [activeUser, activeEvent, participations]);

    const userHasAccess = !!userParticipation || !!session;

    const missionsForActiveEvent = useMemo(() => {
        if (!activeUser || !activeEvent) return [];
        return api.getEventMissions(activeUser.id, activeEvent.id);
    }, [activeUser, activeEvent, session]); // Session changes might unlock VIP missions

    // Need to store submissions locally since they are specific to this view
    const [localSubmissions, setLocalSubmissions] = useState<EventMissionSubmission[]>([]);

    // Update loadData to set submissions
    useEffect(() => {
        if(!activeUser) return;
        api.fetchEventsData(activeUser.id).then(data => {
            setLocalSubmissions(data.eventMissionSubmissions);
        });
    }, [activeUser]);

    const handleJoinEvent = async (isGolden: boolean) => {
        if (!activeUser || !activeEvent) return;
        setJoiningEvent(true);
        try {
            const cost = isGolden ? activeEvent.goldenPassCost : activeEvent.entryCost;
            const result = await api.joinEvent(activeUser.id, activeEvent.id, cost, isGolden);
            
            if (result.success) {
                if (result.updatedUser) dispatch({ type: 'UPDATE_USER', payload: result.updatedUser });
                if (result.participation) setParticipations(prev => [...prev, result.participation]);
                
                dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'success', title: 'Sucesso!', message: 'Você entrou na arena.' } });
                setShowTicketBooth(false);
                
                // Start Sync
                EventSync.start(activeEvent.id, activeUser.id, dispatch, true);
            } else {
                dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'error', title: 'Erro', message: result.error || 'Falha ao entrar.' } });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setJoiningEvent(false);
        }
    };

    const handleSubmitMission = async (proof: string) => {
        if (!activeUser || !activeEvent || !missionToSubmit) return;
        try {
            const result = await api.submitEventMission(activeUser.id, activeEvent.id, missionToSubmit.id, proof);
            if (result.success) {
                if (result.updatedUser) dispatch({ type: 'UPDATE_USER', payload: result.updatedUser });
                setLocalSubmissions(prev => [...prev, result.newSubmission]);
                dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'success', title: 'Enviado!', message: 'Prova enviada para análise.' } });
            }
        } catch(e) {
             dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'error', title: 'Erro', message: 'Falha ao enviar prova.' } });
        }
    };

    const otherEvents = eventsList.filter(e => e.id !== activeEvent?.id);

    if (isLoading) return <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-[#FFD86B]"></div></div>;

    return (
        <div className="pb-20">
            <HeroTitle 
                title="Eventos & Arenas" 
                subtitle="Participe de competições sazonais, suba no ranking e ganhe prêmios lendários."
            />

            {/* ACTIVE EVENT HERO */}
            {activeEvent ? (
                <>
                    <HeroTicket 
                        event={activeEvent} 
                        onJoinClick={() => setShowTicketBooth(true)}
                        participation={userParticipation}
                        arenaStatus={arenaStatus}
                    />

                    {/* DASHBOARD IF JOINED */}
                    {userHasAccess && activeUser && (
                        <EventDashboard 
                            event={activeEvent}
                            user={activeUser}
                            leaderboard={ranking}
                            missions={missionsForActiveEvent}
                            userSubmissions={localSubmissions}
                            liveFeed={liveFeed}
                            onSubmitMission={(m) => setMissionToSubmit(m)}
                        />
                    )}
                </>
            ) : (
                <div className="text-center py-20 bg-[#121212] rounded-3xl border border-white/5 mb-12">
                    <p className="text-gray-500">Nenhum evento ativo no momento.</p>
                </div>
            )}

            {/* OTHER EVENTS LIST */}
            {otherEvents.length > 0 && (
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-8">
                         <h3 className="text-2xl font-bold text-white font-chakra uppercase">Outros Eventos</h3>
                         <div className="h-px bg-white/10 flex-grow"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {otherEvents.map(evt => (
                            evt.status === 'closed' || evt.status === 'past' 
                            ? <ClosedEventCard key={evt.id} event={evt} /> 
                            : <EventTicketCard key={evt.id} event={evt} />
                        ))}
                    </div>
                </div>
            )}
            
            {/* FAQ Section */}
            <div className="mt-16 max-w-3xl mx-auto px-4">
                <h2 className="text-2xl font-bold text-center text-white mb-8 font-chakra uppercase tracking-wider flex items-center justify-center gap-2">
                    <ShieldIcon className="w-6 h-6 text-[#FFD86B]" /> Dúvidas Frequentes
                </h2>
                <div className="space-y-4">
                    {EVENT_FAQS.map((item, index) => <FaqItem key={index} question={item.q} answer={item.a} />)}
                </div>
            </div>

            {/* MODALS */}
            {showTicketBooth && activeEvent && activeUser && (
                <TicketBoothModal 
                    event={activeEvent} 
                    onClose={() => setShowTicketBooth(false)} 
                    onConfirm={handleJoinEvent}
                    userCoins={activeUser.coins}
                    isJoining={joiningEvent}
                />
            )}
            
            {missionToSubmit && (
                <EventMissionSubmissionModal
                    mission={missionToSubmit}
                    onClose={() => setMissionToSubmit(null)}
                    onSubmit={handleSubmitMission}
                />
            )}

        </div>
    );
};

export default Events;
