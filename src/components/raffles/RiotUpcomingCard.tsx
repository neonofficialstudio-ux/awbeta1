
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Raffle } from '../../types';
import { safeDate } from '../../api/utils/dateSafe';
import { TicketIcon, CrownIcon, CoinIcon, HistoryIcon as ClockIcon } from '../../constants';

interface RiotUpcomingCardProps {
    raffle: Raffle;
}

const RiotUpcomingCard: React.FC<RiotUpcomingCardProps> = ({ raffle }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

    // --- 3D TILT EFFECT ---
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate rotation based on cursor position
        const rotateY = ((x / rect.width) - 0.5) * 8; // Max 8deg rotation
        const rotateX = ((y / rect.height) - 0.5) * -8;

        setRotate({ x: rotateX, y: rotateY });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setRotate({ x: 0, y: 0 });
    }, []);

    // --- COUNTDOWN LOGIC ---
    useEffect(() => {
        const calculateTime = () => {
            if (!raffle.startsAt) return null;
            const start = safeDate(raffle.startsAt);
            if (!start) return null;

            const now = new Date();
            const diff = start.getTime() - now.getTime();

            if (diff <= 0) return null; // Should move to active list via parent re-render

            return {
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff / (1000 * 60 * 60)) % 24),
                m: Math.floor((diff / 1000 / 60) % 60),
                s: Math.floor((diff / 1000) % 60),
            };
        };

        setTimeLeft(calculateTime());
        const interval = setInterval(() => {
            const tl = calculateTime();
            setTimeLeft(tl);
            if (!tl) clearInterval(interval); // Stop if expired
        }, 1000);

        return () => clearInterval(interval);
    }, [raffle.startsAt]);

    if (!timeLeft) return null; // Don't render if expired or invalid

    const isJackpot = raffle.ticketLimitPerUser > 100 || raffle.ticketPrice > 50; // Heuristic for "Premium"
    const accentColor = isJackpot ? 'border-[#C8AA6E] text-[#C8AA6E]' : 'border-[#0AC8B9] text-[#0AC8B9]';
    const glowColor = isJackpot ? 'shadow-[0_0_30px_rgba(200,170,110,0.15)]' : 'shadow-[0_0_30px_rgba(10,200,185,0.15)]';
    const bgGradient = isJackpot 
        ? 'bg-[linear-gradient(135deg,#1c1c1d_0%,#0A0A0A_100%)]' 
        : 'bg-[linear-gradient(135deg,#0d1b21_0%,#0A0A0A_100%)]';

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`
                relative group w-full aspect-[4/5] rounded-xl overflow-hidden cursor-wait
                transition-all duration-200 ease-out
                border-2 ${accentColor} ${glowColor} ${bgGradient}
            `}
            style={{
                transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)`,
                boxShadow: isJackpot 
                    ? '0 20px 50px -10px rgba(0,0,0,0.8), 0 0 20px rgba(200,170,110,0.1)'
                    : '0 20px 50px -10px rgba(0,0,0,0.8), 0 0 20px rgba(10,200,185,0.1)'
            }}
        >
            {/* --- BACKGROUND IMAGE --- */}
            <div className="absolute inset-0 z-0">
                <img 
                    src={raffle.itemImageUrl} 
                    alt={raffle.itemName} 
                    className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-700 group-hover:scale-110 transform" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#010A13] via-[#010A13]/80 to-transparent"></div>
                {/* Hextech Pattern Overlay */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
            </div>

            {/* --- CONTENT --- */}
            <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between">
                
                {/* Top Badge */}
                <div className="flex justify-between items-start">
                    <div className={`
                        flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md
                        ${isJackpot ? 'bg-[#C8AA6E]/10 border-[#C8AA6E]/30' : 'bg-[#0AC8B9]/10 border-[#0AC8B9]/30'}
                    `}>
                        {isJackpot ? <CrownIcon className="w-3 h-3" /> : <TicketIcon className="w-3 h-3" />}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isJackpot ? 'text-[#F0E6D2]' : 'text-[#CDFAFA]'}`}>
                            {isJackpot ? 'Premium' : 'Standard'}
                        </span>
                    </div>
                    <div className="bg-black/60 backdrop-blur border border-white/10 rounded-lg px-2 py-1">
                         <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {new Date(raffle.startsAt!).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                         </span>
                    </div>
                </div>

                {/* Center - Info */}
                <div className="text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-2xl font-black text-white font-chakra uppercase leading-[0.9] drop-shadow-lg mb-2 line-clamp-2">
                        {raffle.itemName}
                    </h3>
                    
                    {/* Cost Badge */}
                    <div className="inline-flex items-center justify-center gap-1.5 border-y border-white/10 py-1 px-4">
                         <CoinIcon className={`w-4 h-4 ${isJackpot ? 'text-[#C8AA6E]' : 'text-[#0AC8B9]'}`} />
                         <span className="text-lg font-bold text-white font-mono">{raffle.ticketPrice}</span>
                    </div>
                </div>

                {/* Bottom - Countdown HUD */}
                <div className="mt-auto">
                     <div className={`
                        w-full bg-black/40 backdrop-blur-md border-t ${isJackpot ? 'border-[#C8AA6E]/30' : 'border-[#0AC8B9]/30'}
                        rounded-lg p-3 flex justify-between items-center
                     `}>
                        <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest animate-pulse">Inicia em</span>
                        <div className="flex gap-2 font-mono text-sm font-bold text-white">
                             <span className="bg-black/50 px-1.5 rounded border border-white/5">{String(timeLeft.d).padStart(2,'0')}d</span>
                             <span className="bg-black/50 px-1.5 rounded border border-white/5">{String(timeLeft.h).padStart(2,'0')}h</span>
                             <span className="bg-black/50 px-1.5 rounded border border-white/5">{String(timeLeft.m).padStart(2,'0')}m</span>
                             <span className={`px-1.5 rounded border ${isJackpot ? 'bg-[#C8AA6E]/20 border-[#C8AA6E]' : 'bg-[#0AC8B9]/20 border-[#0AC8B9]'} text-white`}>
                                 {String(timeLeft.s).padStart(2,'0')}s
                             </span>
                        </div>
                     </div>
                </div>

            </div>

            {/* --- SHINE OVERLAY --- */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 animate-shine-sweep"></div>
            </div>
        </div>
    );
};

export default RiotUpcomingCard;
