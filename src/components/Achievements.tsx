
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../constants';
import { AchievementEngine } from '../services/achievements/achievement.engine';
import type { AchievementDefinition } from '../services/achievements/achievement.types';
import { 
    StarIcon, LockIcon, CoinIcon, TrophyIcon, CheckIcon, ShieldIcon, 
    CrownIcon, MissionIcon, TrendingUpIcon, StoreIcon, XPIcon 
} from '../constants';
import FaqItem from './ui/patterns/FaqItem';

// --- Icon Mapping ---
const getAchievementIcon = (id: string, category: string) => {
    if (id.includes('rank_top1')) return CrownIcon;
    if (id.includes('rank')) return TrophyIcon;
    if (id.includes('eco')) return CoinIcon;
    if (id.includes('streak')) return TrendingUpIcon; 
    if (id.includes('lvl')) return XPIcon;
    if (category === 'mission') return MissionIcon;
    if (category === 'economy') return StoreIcon;
    return StarIcon;
};

// --- Rarity Styles Configuration ---
const getRarityTheme = (rarity: string, isUnlocked: boolean) => {
    if (!isUnlocked) {
        return {
            border: 'border-gray-800 border-dashed',
            shadow: '',
            text: 'text-gray-500',
            bg: 'bg-[#0a0a0a]',
            badge: 'bg-gray-800 text-gray-500',
            iconColor: 'text-gray-600',
            iconBg: 'bg-gray-900',
            glow: ''
        };
    }

    switch (rarity) {
        case 'Lendário':
            return {
                border: 'border-yellow-500',
                shadow: 'shadow-[0_0_25px_rgba(234,179,8,0.2)]',
                text: 'text-yellow-400',
                bg: 'bg-gradient-to-b from-yellow-900/10 to-[#121212]',
                badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50',
                iconColor: 'text-yellow-400',
                iconBg: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
                glow: 'shadow-[0_0_30px_rgba(234,179,8,0.4)]'
            };
        case 'Épico':
            return {
                border: 'border-purple-500',
                shadow: 'shadow-[0_0_25px_rgba(168,85,247,0.2)]',
                text: 'text-purple-400',
                bg: 'bg-gradient-to-b from-purple-900/10 to-[#121212]',
                badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/50',
                iconColor: 'text-purple-400',
                iconBg: 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20',
                glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]'
            };
        case 'Raro':
            return {
                border: 'border-cyan-500',
                shadow: 'shadow-[0_0_25px_rgba(6,182,212,0.2)]',
                text: 'text-cyan-400',
                bg: 'bg-gradient-to-b from-cyan-900/10 to-[#121212]',
                badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50',
                iconColor: 'text-cyan-400',
                iconBg: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
                glow: 'shadow-[0_0_30px_rgba(6,182,212,0.4)]'
            };
        case 'Incomum':
            return {
                border: 'border-green-500',
                shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.1)]',
                text: 'text-green-400',
                bg: 'bg-gradient-to-b from-green-900/10 to-[#121212]',
                badge: 'bg-green-500/20 text-green-300 border border-green-500/50',
                iconColor: 'text-green-400',
                iconBg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
                glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]'
            };
        default: // Comum
            return {
                border: 'border-gray-600',
                shadow: '',
                text: 'text-gray-300',
                bg: 'bg-[#121212]',
                badge: 'bg-gray-700 text-gray-300 border border-gray-600',
                iconColor: 'text-gray-300',
                iconBg: 'bg-gray-800',
                glow: ''
            };
    }
};

const AchievementCard: React.FC<{ achievement: AchievementDefinition & { unlocked: boolean }, user: any }> = ({ achievement, user }) => {
    const isUnlocked = achievement.unlocked;
    const theme = getRarityTheme(achievement.rarity, isUnlocked);
    const IconComponent = getAchievementIcon(achievement.id, achievement.category);
    
    // Progress Logic (Visual Proxy)
    let currentProgress = 0;
    const target = achievement.conditionValue;
    let showProgress = !isUnlocked; 

    switch(achievement.trigger) {
        case 'mission_complete':
            currentProgress = user.totalMissionsCompleted;
            break;
        case 'level_up':
            currentProgress = user.level;
            break;
        case 'check_in_streak':
            currentProgress = user.weeklyCheckInStreak;
            break;
        case 'ranking':
             // Ranking is inverse (lower is better), complex to show bar, hide it
            showProgress = false;
            break;
        case 'coin_accumulated':
            currentProgress = user.coins; // Approximation
            break;
        default:
            showProgress = false;
    }

    const progressPercent = target > 0 ? Math.min(100, Math.max(0, (currentProgress / target) * 100)) : 0;

    return (
        <div className={`
            relative group flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:z-10
            ${theme.bg} ${theme.border} ${theme.shadow}
            ${!isUnlocked ? 'opacity-80' : ''}
        `}>
            {/* Top Badge */}
            <div className="absolute top-2 right-2 md:top-3 md:right-3 z-20">
                 <span className={`text-[8px] md:text-[10px] font-bold uppercase px-2 py-0.5 rounded backdrop-blur-md ${theme.badge}`}>
                    {achievement.rarity}
                </span>
            </div>

            {/* Icon Container (Replacing Image) */}
            <div className="flex justify-center mt-6 mb-2 relative">
                {/* Glow Effect Behind Icon */}
                {isUnlocked && (
                    <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 ${theme.iconBg}`}></div>
                )}
                
                <div className={`
                    relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center 
                    border-2 ${theme.border} ${theme.iconBg} ${isUnlocked ? theme.glow : ''}
                    transition-all duration-500 group-hover:scale-110
                `}>
                    {isUnlocked ? (
                        <IconComponent className={`w-10 h-10 md:w-12 md:h-12 ${theme.iconColor} drop-shadow-md`} />
                    ) : (
                        <LockIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-600" />
                    )}
                    
                    {/* Checkmark Badge for Unlocked */}
                    {isUnlocked && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-black rounded-full p-1 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 border-2 border-[#121212]">
                            <CheckIcon className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 pt-2 flex-grow flex flex-col text-center">
                <h3 className={`text-sm md:text-base font-bold font-chakra leading-tight mb-2 ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                    {achievement.title}
                </h3>
                <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed line-clamp-3 mb-3">
                    {achievement.description}
                </p>
                
                <div className="mt-auto flex items-center justify-center gap-2 bg-black/20 py-1.5 rounded-lg border border-white/5">
                    <CoinIcon className={`w-3 h-3 md:w-4 md:h-4 ${isUnlocked ? 'text-goldenYellow-400' : 'text-gray-600'}`} />
                    <span className={`text-[10px] md:text-xs font-bold ${isUnlocked ? 'text-goldenYellow-400' : 'text-gray-600'}`}>
                        +{achievement.rewardCoins} Coins
                    </span>
                </div>

                {showProgress && (
                    <div className="mt-3 text-left">
                         <div className="flex justify-between text-[8px] md:text-[10px] text-gray-400 mb-1 uppercase font-bold tracking-wider">
                            <span>Progresso</span>
                            <span>{currentProgress} / {target}</span>
                         </div>
                         <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                             <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }}
                             />
                         </div>
                    </div>
                )}
                
                {isUnlocked && (
                    <div className="mt-3 pt-2 border-t border-white/5">
                        <p className={`text-[9px] md:text-[10px] uppercase tracking-widest font-black ${theme.text}`}>Desbloqueado</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const faqData = [
    { question: "Para que servem as conquistas?", answer: "Elas são medalhas que comprovam seus marcos na carreira. Além do prestígio, cada conquista desbloqueada concede um bônus imediato de Coins e XP." },
    { question: "Como desbloqueio conquistas secretas?", answer: "Algumas conquistas não revelam seus critérios até serem desbloqueadas. Continue explorando a plataforma, completando missões variadas e interagindo com a comunidade." },
    { question: "Perco minhas conquistas se mudar de plano?", answer: "Não. Suas conquistas são permanentes e ficam atreladas à sua conta, independente do seu plano de assinatura." },
    { question: "Onde vejo minhas recompensas?", answer: "As Coins e XP das conquistas são adicionadas automaticamente ao seu saldo assim que o desbloqueio acontece." }
];

const Achievements: React.FC = () => {
    const { state } = useAppContext();
    const { activeUser } = state;
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeUser) {
            // Use Real Engine
            const data = AchievementEngine.getUserAchievements(activeUser.id);
            setAchievements(data);
            setLoading(false);
        }
    }, [activeUser]);

    const stats = useMemo(() => {
        const unlocked = achievements.filter(a => a.unlocked).length;
        const total = achievements.length;
        const earnedCoins = achievements.filter(a => a.unlocked).reduce((acc, curr) => acc + curr.rewardCoins, 0);
        const percent = total > 0 ? (unlocked / total) * 100 : 0;
        
        return { unlocked, total, earnedCoins, percent };
    }, [achievements]);

    if (loading) return <div className="p-10 text-center text-gray-500">Carregando conquistas...</div>;

    // Sort: Unlocked First, then by Rarity Weight
    const sorted = [...achievements].sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        // If same status, sort by condition value (easier first)
        return a.conditionValue - b.conditionValue;
    });

    return (
        <div className="pb-20 animate-fade-in-up">
            {/* HERO SECTION */}
            <div className="relative bg-gradient-to-b from-gray-900 via-[#121212] to-black rounded-3xl p-6 md:p-12 mb-8 md:mb-12 border border-gray-800 overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-black/0 to-black/0 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="p-3 md:p-4 bg-gradient-to-br from-goldenYellow-500 to-amber-700 rounded-full mb-4 md:mb-6 shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-pulse-slow">
                        <TrophyIcon className="w-8 h-8 md:w-12 md:h-12 text-black" />
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-black font-chakra text-white mb-2 tracking-tight">
                        SALA DE TROFÉUS
                    </h2>
                    <p className="text-gray-400 text-sm md:text-lg max-w-2xl">Colecione marcos da sua carreira e ganhe recompensas exclusivas.</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-10 w-full max-w-4xl">
                        <div className="flex flex-col items-center">
                            <span className="text-3xl md:text-4xl font-bold text-white font-chakra">{stats.unlocked} <span className="text-gray-600 text-lg md:text-2xl">/ {stats.total}</span></span>
                            <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Desbloqueados</span>
                        </div>
                        
                        <div className="col-span-2 md:col-span-1 flex flex-col justify-center w-full px-4 order-3 md:order-2">
                            <div className="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                                <span>Dominação</span>
                                <span className="text-goldenYellow-400">{stats.percent.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden shadow-inner border border-gray-700">
                                <div 
                                    className="h-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out"
                                    style={{ width: `${stats.percent}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col items-center order-2 md:order-3">
                            <div className="flex items-center gap-2">
                                <span className="text-3xl md:text-4xl font-bold text-goldenYellow-400 font-chakra text-shadow-glow">+{stats.earnedCoins}</span>
                                <CoinIcon className="w-5 h-5 md:w-6 md:h-6 text-goldenYellow-500" />
                            </div>
                            <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Coins Acumulados</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACHIEVEMENTS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {sorted.map(ach => (
                    <AchievementCard 
                        key={ach.id}
                        achievement={ach}
                        user={activeUser}
                    />
                ))}
            </div>

            {achievements.length === 0 && (
                 <div className="text-center py-20 opacity-50">
                    <p>Nenhuma conquista encontrada.</p>
                 </div>
            )}

            {/* FAQ Section */}
            <div className="mt-16 md:mt-24 max-w-3xl mx-auto px-4">
                <h2 className="text-xl md:text-2xl font-bold text-center text-white mb-6 md:mb-8 font-chakra uppercase tracking-wider flex items-center justify-center gap-2">
                    <ShieldIcon className="w-5 h-5 md:w-6 md:h-6 text-[#FFD65A]" /> Dúvidas Frequentes
                </h2>
                <div className="space-y-3 md:space-y-4">
                    {faqData.map((item, index) => <FaqItem key={index} question={item.question} answer={item.answer} />)}
                </div>
            </div>
        </div>
    );
};

export default Achievements;
