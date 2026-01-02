
import React, { useState, useEffect, useMemo } from 'react';
import type { RankingUser } from '../types';
import { CrownIcon, SpotifyIcon, YoutubeIcon, MissionIcon, InstagramIcon, StarIcon, HistoryIcon as ClockIcon, ShieldIcon } from '../constants';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { formatNumber } from './ui/utils/format';
import { Perf } from '../services/perf.engine';
import FaqItem from './ui/patterns/FaqItem';

// --- COMPONENTS ---

const SocialRow: React.FC<{ user: RankingUser; size?: 'sm' | 'lg' }> = React.memo(({ user, size = 'sm' }) => {
    const containerClass = size === 'lg' 
        ? 'w-12 h-12 bg-[#111] border border-[#FFD65A]/40 shadow-[0_0_15px_rgba(255,214,90,0.15)] hover:shadow-[0_0_25px_rgba(255,214,90,0.6)]' 
        : 'w-10 h-10 bg-[#151515] border border-[#FFD65A]/20 hover:border-[#FFD65A]/60';

    const iconSize = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

    const SocialLink = ({ Icon, url, label }: { Icon: any, url?: string, label: string }) => {
        const hasLink = !!url;
        return (
            <a 
                href={hasLink ? url : undefined}
                target="_blank"
                rel="noreferrer"
                className={`
                    ${containerClass} rounded-full flex items-center justify-center transition-all duration-300 group relative
                    ${hasLink ? 'text-[#FFD65A] cursor-pointer hover:scale-110 hover:bg-[#FFD65A] hover:text-black' : 'text-gray-700 opacity-20 cursor-default'}
                `}
                title={hasLink ? label : `${label} (Não vinculado)`}
                onClick={e => !hasLink && e.preventDefault()}
            >
                <Icon className={`${iconSize} filter drop-shadow-sm transition-all group-hover:drop-shadow-none`} />
            </a>
        );
    };

    return (
        <div className="flex items-center gap-2 md:gap-3 justify-center">
            <SocialLink Icon={SpotifyIcon} url={user.spotifyUrl} label="Spotify" />
            <SocialLink Icon={InstagramIcon} url={user.instagramUrl} label="Instagram" />
            <SocialLink Icon={YoutubeIcon} url={user.youtubeUrl} label="YouTube" />
        </div>
    );
});

const RankingItem: React.FC<{ user: RankingUser; rank: number }> = React.memo(({ user, rank }) => {
    return (
        <div 
            className="relative w-full bg-[#111] rounded-[18px] border border-[#FFD65A]/10 mb-3 overflow-hidden group hover:border-[#FFD65A]/40 transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${0.1 + (rank * 0.05)}s` }}
        >
            <div className="absolute inset-0 bg-[#FFD65A]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            
            <div className="flex items-center p-4 gap-4 relative z-10">
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className={`
                        w-8 h-8 flex items-center justify-center rounded-lg font-chakra font-black text-sm 
                        ${rank <= 3 ? 'bg-[#FFD65A] text-black shadow-[0_0_10px_rgba(255,214,90,0.4)]' : 'bg-[#1A1A1A] text-gray-500 border border-[#333]'}
                    `}>
                        #{formatNumber(rank)}
                    </div>
                    <div className="relative">
                        <img 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] rounded-full object-cover border-2 border-[#222] group-hover:border-[#FFD65A] transition-colors shadow-md"
                        />
                    </div>
                </div>

                <div className="flex-grow min-w-0 flex flex-col justify-center gap-1">
                    <h4 className="text-white font-bold text-base md:text-lg font-chakra uppercase tracking-tight truncate group-hover:text-[#FFD65A] transition-colors max-w-[180px] md:max-w-none">
                        {user.artisticName}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1 text-gray-300 font-medium">
                             <MissionIcon className="w-3 h-3 text-[#FFD65A]" />
                             <span className="text-[#FFD65A] font-bold">{formatNumber(user.monthlyMissionsCompleted)}</span> <span className="hidden md:inline">Missões</span>
                        </div>
                        <span className="text-gray-500 font-medium">•</span>
                        <div className="text-gray-300 font-medium">
                            Lvl {formatNumber(user.level)}
                        </div>
                    </div>
                </div>
                
                <div className="flex-shrink-0 pl-2 hidden sm:block">
                    <SocialRow user={user} size="sm" />
                </div>
            </div>
        </div>
    );
});

const TopOneCard: React.FC<{ user: RankingUser }> = React.memo(({ user }) => (
    <div className="relative w-full mb-8 group perspective-1000 animate-fade-in-up z-10">
        <div className="absolute inset-0 bg-[#FFD65A]/20 blur-[60px] rounded-[32px] opacity-60 group-hover:opacity-80 transition-opacity duration-700"></div>
        
        <div className="relative bg-[radial-gradient(ellipse_at_top,#1b1b1b_0%,#0c0c0c_100%)] border-2 border-[#FFD65A]/60 rounded-[32px] p-8 md:p-10 shadow-[0_0_45px_rgba(255,214,90,0.2)] overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
            
            <div className="relative z-20 flex flex-col items-center text-center">
                <div className="relative mb-8 mt-4">
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-[float_4s_ease-in-out_infinite]">
                         <CrownIcon className="w-14 h-14 md:w-16 md:h-16 text-[#FFD65A] drop-shadow-[0_0_25px_rgba(255,214,90,0.8)]" />
                    </div>
                    
                    <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full p-1.5 bg-gradient-to-b from-[#FFD65A] to-[#C79B2C] shadow-[0_0_50px_rgba(255,214,90,0.4)] z-10">
                        <img 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            className="w-full h-full rounded-full object-cover border-[4px] border-[#050505]"
                        />
                         <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#FFD65A] text-black text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-[0_0_15px_rgba(255,214,90,0.5)] whitespace-nowrap border-2 border-[#050505]">
                            Líder da Temporada
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white font-chakra tracking-tight uppercase drop-shadow-lg leading-none mb-8 mt-2">
                    {user.artisticName}
                </h1>

                <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-8">
                    <div className="bg-gradient-to-b from-[#1A1A1A] to-[#0D0D0D] p-4 rounded-2xl border border-[#FFD65A]/20 backdrop-blur-sm flex flex-col items-center justify-center group hover:border-[#FFD65A]/40 transition-all hover:-translate-y-1 shadow-lg">
                        <MissionIcon className="w-6 h-6 text-[#FFD65A]/50 mb-2 group-hover:text-[#FFD65A] transition-colors filter drop-shadow-sm" />
                        <span className="block text-2xl md:text-3xl font-black text-white font-chakra tracking-tight">{formatNumber(user.monthlyMissionsCompleted)}</span>
                        <span className="text-[9px] md:text-[10px] text-[#808080] uppercase font-bold tracking-widest mt-1 group-hover:text-[#FFD65A]/80 transition-colors">Missões Feitas</span>
                    </div>
                    <div className="bg-gradient-to-b from-[#1A1A1A] to-[#0D0D0D] p-4 rounded-2xl border border-[#FFD65A]/20 backdrop-blur-sm flex flex-col items-center justify-center group hover:border-[#FFD65A]/40 transition-all hover:-translate-y-1 shadow-lg">
                        <StarIcon className="w-6 h-6 text-[#FFD65A]/50 mb-2 group-hover:text-[#FFD65A] transition-colors filter drop-shadow-sm" />
                        <span className="block text-2xl md:text-3xl font-black text-[#FFD65A] font-chakra tracking-tight">{formatNumber(user.level)}</span>
                        <span className="text-[9px] md:text-[10px] text-[#808080] uppercase font-bold tracking-widest mt-1 group-hover:text-[#FFD65A]/80 transition-colors">Nível Atual</span>
                    </div>
                </div>

                <div className="pt-2">
                    <SocialRow user={user} size="lg" />
                </div>
            </div>
        </div>
    </div>
));

const faqData = [
    { question: "Como funciona a pontuação?", answer: "Sua pontuação é baseada na quantidade de missões realizadas (fator principal) e XP total acumulado (critério de desempate)." },
    { question: "Quando o ranking reseta?", answer: "O ranking 'Mensal' reseta automaticamente no primeiro dia de cada mês. O ranking 'Geral' é vitalício." },
    { question: "O que ganho ficando em 1º lugar?", answer: "O líder do ranking mensal recebe destaque na plataforma, uma conquista exclusiva 'O Número Um' e um bônus generoso de Lummi Coins." },
    { question: "Como ver minha posição exata?", answer: "Se você estiver fora do Top 10, sua posição aparecerá no rodapé da lista ou destacada no seu card de usuário." }
];

// --- MAIN PAGE ---
const Ranking: React.FC = () => {
    useEffect(() => {
        Perf.mark('ranking_mount');
        Perf.trackRender('Ranking');
        return () => {};
    }, []);

    const { state } = useAppContext();
    const { activeUser } = state;
    const [ranking, setRanking] = useState<RankingUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<'mensal' | 'geral'>('mensal');

    useEffect(() => {
        const fetchRanking = async () => {
            Perf.mark('ranking_fetch');
            setIsLoading(true);
            try {
                // PATCH: Pass timeFilter to API to fetch correct ranking type (mensal vs geral)
                let rankingData = await api.fetchRankingData(timeFilter);
                if (activeUser) {
                    rankingData = rankingData.map(user => ({
                        ...user,
                        isCurrentUser: user.name === activeUser.name, // Fallback matching if API doesn't return flag
                    }));
                }
                setRanking(rankingData);
            } catch (err) {
                console.error("Failed to fetch ranking:", err);
                setError("Não foi possível carregar o Hall of Fame.");
            } finally {
                setIsLoading(false);
                Perf.end('ranking_fetch');
                Perf.end('ranking_mount'); // End initial mount measure on data load
            }
        };
        fetchRanking();
    }, [activeUser, timeFilter]); 

    if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[#FFD65A]"></div></div>;
    if (error) return <div className="text-center text-red-500 p-10 font-bold bg-red-900/10 rounded-xl border border-red-500/30">{error}</div>;

    const rankOne = ranking.length > 0 ? ranking[0] : null;
    const restOfRanking = ranking.slice(1);

    return (
        <div className="pb-24 min-h-screen -mx-4 md:-mx-8 px-4 md:px-8 pt-0 relative overflow-x-hidden bg-[#050505]">
            
            {/* HERO SECTION */}
            <div className="text-center max-w-5xl mx-auto pt-6 mb-8 relative animate-fade-in-up">
                {/* Back Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[600px] bg-[#FFD65A]/10 blur-[100px] rounded-full pointer-events-none"></div>
                
                <h2 className="text-4xl md:text-6xl font-black text-[#FFD65A] font-chakra uppercase tracking-tighter mb-4 relative z-10 drop-shadow-[0_0_15px_rgba(255,211,106,0.5)]">
                    HALL DA FAMA
                </h2>
                
                <div className="relative z-10 flex items-center justify-center mb-6">
                        <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#FF3CE6]"></div>
                        <div className="mx-4 text-[#FF3CE6] animate-pulse">◆</div>
                        <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#3CFFF8]"></div>
                </div>

                <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium relative z-10">
                    Descubra os artistas que estão fazendo história e <span className="text-white font-bold">conquiste seu lugar no topo.</span>
                </p>
            </div>

            <div className="max-w-3xl mx-auto">
                
                {/* FILTERS */}
                <div className="flex justify-center gap-3 mb-8 animate-fade-in-up pt-8" style={{ animationDelay: '0.15s' }}>
                    {['Mensal', 'Geral'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTimeFilter(filter.toLowerCase() as any)}
                            className={`
                                px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 border
                                ${timeFilter === filter.toLowerCase() 
                                    ? 'bg-[#FFD65A] text-black border-[#FFD65A] shadow-[0_0_20px_rgba(255,214,90,0.4)]' 
                                    : 'bg-[#0E0E0E] text-gray-500 border-[#222] hover:border-[#FFD65A]/30 hover:text-white'}
                            `}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* RANKING LIST */}
                <div className="relative z-10 mb-20">
                    {rankOne && <TopOneCard user={rankOne} />}

                    <div className="space-y-3">
                        {restOfRanking.length > 0 ? (
                            restOfRanking.map((user, idx) => (
                                <RankingItem key={user.artisticName + idx} user={user} rank={idx + 2} />
                            ))
                        ) : (
                            <div className="text-center py-16 border-2 border-dashed border-[#222] rounded-[20px] bg-[#0E0E0E]/50">
                                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">A arena está vazia além do líder.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold text-center text-white mb-8 font-chakra uppercase tracking-wider flex items-center justify-center gap-2">
                        <ShieldIcon className="w-6 h-6 text-[#FFD65A]" /> Dúvidas Frequentes
                    </h2>
                    <div className="space-y-4">
                        {faqData.map((item, index) => <FaqItem key={index} question={item.question} answer={item.answer} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Ranking;
