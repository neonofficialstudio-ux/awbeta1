
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Mission, User, MissionSubmission } from '../types';
import { CoinIcon, XPIcon, InstagramIcon, TikTokIcon, StarIcon, VipIcon, HistoryIcon as ClockIcon, TrendingUpIcon, CheckIcon, YoutubeIcon, ShieldIcon } from '../constants';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import SubmissionSuccessModal from './SubmissionSuccessModal';
import { getDailyMissionLimit, PLAN_MULTIPLIERS } from '../api/economy/economy';
import { MissionTimerEngine } from '../services/missions/mission.timer';
import { safeString } from '../api/helpers';
import { Perf } from '../services/perf.engine';
import { safeDate } from '../api/utils/dateSafe';
import FaqItem from './ui/patterns/FaqItem';
import { socialLinkValidator } from '../api/quality/socialLinkValidator';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// --- Visual Components ---

const StatusBadge: React.FC<{ status: 'available' | 'pending' | 'completed' | 'rejected', isExpired: boolean }> = React.memo(({ status, isExpired }) => {
    if (isExpired) {
         return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-[#151515] text-gray-500 border border-gray-800 uppercase tracking-widest backdrop-blur-sm">
                Expirada
            </span>
         );
    }
    switch (status) {
        case 'completed':
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-[#FFD86B]/10 text-[#FFD86B] border border-[#FFD86B]/30 uppercase tracking-widest shadow-[0_0_10px_rgba(255,216,107,0.1)]">
                    <CheckIcon className="w-3 h-3 mr-1.5"/> Concluída
                </span>
            );
        case 'pending':
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-white/5 text-white border border-white/10 uppercase tracking-widest animate-pulse">
                    Em Análise
                </span>
            );
        case 'available':
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-[#FFD86B] text-[#0B0B0B] border border-[#FFD86B] uppercase tracking-widest shadow-[0_0_15px_rgba(255,216,107,0.4)]">
                    Disponível
                </span>
            );
        case 'rejected':
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 uppercase tracking-widest">
                    Rejeitada
                </span>
            );
        default:
            return null;
    }
});

const RewardCapsule: React.FC<{ type: 'xp' | 'coin', value: number, boosted?: boolean }> = React.memo(({ type, value, boosted }) => {
    const isCoin = type === 'coin';

    if (isCoin) {
        return (
            <div className="flex items-center justify-center px-4 py-2 rounded-full bg-[#111111]/90 border border-[#FFD86B]/30 shadow-[0_0_15px_rgba(255,216,107,0.15)] min-w-[90px] group/coin relative overflow-hidden transition-all hover:border-[#FFD86B]/60">
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFD86B]/10 to-transparent opacity-0 group-hover/coin:opacity-100 transition-opacity"></div>
                <CoinIcon className="w-5 h-5 text-[#FFD86B] mr-2 z-10 drop-shadow-[0_0_8px_rgba(255,216,107,0.6)]" />
                <span className="text-[16px] font-black text-[#F5F5F5] font-chakra leading-none z-10 tracking-wide">
                    {value}
                </span>
                {boosted && <span className="text-[10px] ml-1 text-[#FFD86B] font-bold z-10 animate-pulse">⚡</span>}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center px-4 py-2 rounded-full bg-[#111111]/90 border border-white/10 min-w-[90px] shadow-sm group/xp transition-all hover:border-white/30">
            <XPIcon className="w-5 h-5 text-[#A855F7] mr-2 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
            <span className="text-[16px] font-bold text-[#F5F5F5] font-chakra leading-none tracking-wide">
                {value}
            </span>
        </div>
    );
});

const MultiplierDisplay: React.FC<{ multiplier: number }> = React.memo(({ multiplier }) => {
    if (multiplier <= 1) return null;

    return (
        <div 
            className="flex items-center justify-center bg-gradient-to-br from-[#FFD86B] to-[#C79B2C] text-black font-bold px-3 py-1 rounded-lg border border-[#FFD86B] shadow-[0_0_12px_rgba(255,216,107,0.4)] transform hover:scale-105 transition-transform whitespace-nowrap"
            title={`Bônus do seu plano aplicado às moedas.`}
        >
            <StarIcon className="w-3 h-3 mr-1 text-black fill-current" />
            <span className="text-xs tracking-tighter">+{multiplier}x Coins</span>
        </div>
    );
});

const MissionTimer: React.FC<{ deadline: string, createdAt?: string, cooldown?: string | null }> = React.memo(({ deadline, createdAt, cooldown }) => {
    const [timeLeft, setTimeLeft] = useState<{ hours: number, minutes: number, percent: number } | null>(null);

    useEffect(() => {
        const calculate = () => {
            const now = new Date().getTime();
            const endSafe = safeDate(deadline);
            if (!endSafe) return null;
            const end = endSafe.getTime();
            const startSafe = safeDate(createdAt);
            const start = startSafe ? startSafe.getTime() : end - (24 * 60 * 60 * 1000); 
            const totalDuration = end - start;
            const remaining = end - now;

            if (remaining <= 0) return null;

            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const percent = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));

            return { hours, minutes, percent };
        };
        setTimeLeft(calculate());
        const timer = setInterval(() => setTimeLeft(calculate()), 60000);
        return () => clearInterval(timer);
    }, [deadline, createdAt]);
    
    if (cooldown) {
        return (
            <div className="relative w-full mt-4">
                 <div className="flex items-center justify-between text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                     <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3 h-3" />
                        <span>Cooldown Ativo</span>
                     </div>
                     <span>{cooldown}</span>
                </div>
            </div>
        );
    }

    if (!timeLeft) return null;

    return (
        <div className="relative w-full mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#FFD86B] uppercase tracking-wider mb-1">
                 <div className="flex items-center gap-1.5">
                    <ClockIcon className="w-3 h-3" />
                    <span>Tempo Restante</span>
                 </div>
                 <span>{timeLeft.hours}H {timeLeft.minutes}M</span>
            </div>
            <div className="h-1.5 w-full bg-[#111111] rounded-full overflow-hidden border border-white/5">
                <div 
                    className="h-full bg-[#FFD86B] shadow-[0_0_8px_rgba(255,216,107,0.6)] rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${timeLeft.percent}%` }}
                ></div>
            </div>
        </div>
    );
});

// --- Main Card Component ---

const MissionCard: React.FC<{ 
    mission: Mission,
    status: 'available' | 'pending' | 'completed' | 'rejected',
    onSubmit: (missionId: string, proof: string) => Promise<void>,
    hasReachedDailyLimit: boolean;
    userPlan: User['plan'];
    cooldown?: string | null;
}> = React.memo(({ mission, status, onSubmit, hasReachedDailyLimit, userPlan, cooldown }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [link, setLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const isExpired = mission.status === 'expired';
    
    // Explicit Format Handling
    const format = mission.format || 'link';

    const MissionTypeIcon = useMemo(() => {
        switch (mission.type) {
            case 'instagram': return InstagramIcon;
            case 'tiktok': return TikTokIcon;
            case 'creative': return StarIcon;
            case 'special': return VipIcon;
            case 'youtube': return YoutubeIcon;
            default: return StarIcon;
        }
    }, [mission.type]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSubmissionError(null);
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (file.size > MAX_FILE_SIZE_BYTES) {
                setSubmissionError(`O arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB.`);
                setSelectedFile(null);
                setPreviewUrl(null);
                event.target.value = '';
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleLinkChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSubmissionError(null);
        setLink(event.target.value);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setLink('');
        setIsSubmitting(false);
        setSubmissionError(null);
    };

    const handleConfirmSubmit = async () => {
        if (isSubmitting) return;
        
        let proof = "";
        
        if (format === 'confirmation') {
             proof = "CONFIRMED_BY_USER";
        } else if (format === 'photo') {
             proof = previewUrl || "";
        } else {
             proof = link.trim();
        }

        if (proof) {
            // Strict Validation for Links if format is 'link' and platform is specified
            if (format === 'link' && proof) {
                if (!socialLinkValidator.isValid(proof)) {
                    // Only enforce specific regex if it looks like a social link mission
                    if (mission.type === 'instagram' || mission.type === 'tiktok' || mission.type === 'youtube') {
                        setSubmissionError("Por favor, insira um link válido da plataforma correta.");
                        return;
                    }
                }
            }

            setIsSubmitting(true);
            setSubmissionError(null);
            try {
                await onSubmit(mission.id, proof);
                handleCloseModal();
            } catch (error: any) {
                setSubmissionError(error.message || 'Ocorreu um erro desconhecido.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    // UI Helpers
    const getModalTitle = () => {
        if (format === 'photo') return "Enviar Comprovante (Imagem)";
        if (format === 'confirmation') return "Validação de Missão"; // Changed title for impact
        return "Enviar Link da Missão";
    };

    const getButton = () => {
        if (isExpired) return <button disabled className="w-full bg-[#151515] text-gray-600 font-bold py-4 px-4 rounded-xl cursor-not-allowed border border-gray-800 text-sm uppercase tracking-wide font-chakra">Expirada</button>;
        if (cooldown) return <button disabled className="w-full bg-[#151515] text-blue-400/70 font-bold py-4 px-4 rounded-xl cursor-not-allowed border border-blue-900/30 text-sm uppercase tracking-wide font-chakra flex items-center justify-center gap-2"><ClockIcon className="w-4 h-4"/> Em Cooldown</button>;
        
        switch (status) {
            case 'completed': return <button disabled className="w-full bg-[#111111] text-[#FFD86B] font-bold py-4 px-4 rounded-xl cursor-not-allowed border border-[#FFD86B]/20 flex items-center justify-center uppercase text-sm tracking-wide shadow-inner font-chakra opacity-80"><CheckIcon className="w-4 h-4 mr-2"/> Missão Concluída</button>;
            case 'pending': return <button disabled className="w-full bg-white/5 text-white font-bold py-4 px-4 rounded-xl cursor-not-allowed border border-white/10 text-sm uppercase tracking-wide shadow-inner font-chakra animate-pulse">Aguardando Análise</button>;
            case 'available':
                if (hasReachedDailyLimit) return <button disabled className="w-full bg-[#151515] text-gray-500 font-bold py-4 px-4 rounded-xl cursor-not-allowed border border-gray-800 text-sm uppercase tracking-wide font-chakra">Limite Diário Atingido</button>;
                return (
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="w-full relative overflow-hidden rounded-xl font-black text-sm uppercase tracking-widest py-4 bg-gradient-to-r from-[#FFD86B] to-[#C79B2C] text-[#050505] border border-[#FFD86B] shadow-[0_0_20px_rgba(255,216,107,0.2)] hover:shadow-[0_0_35px_rgba(255,216,107,0.5)] hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] transition-all duration-300 group font-chakra animate-pulse-slow"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {format === 'confirmation' ? 'Confirmar' : 'Enviar Prova'} 
                            <span className="group-hover:translate-x-1 transition-transform">➜</span>
                        </span>
                        <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-6"></div>
                    </button>
                );
            case 'rejected':
                return <button onClick={() => setIsModalOpen(true)} className="w-full relative overflow-hidden rounded-xl font-black text-sm uppercase tracking-widest py-4 bg-red-900/20 text-red-400 border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:bg-red-900/40 active:scale-[0.98] transition-all duration-300 group font-chakra">Tentar Novamente</button>;
            default: return null;
        }
    }

    const isEventMission = !!(mission as any).eventId;
    const multiplier = PLAN_MULTIPLIERS[userPlan] || 1;
    const finalXp = mission.xp; 
    const finalCoins = isEventMission ? mission.coins : Math.floor(mission.coins * multiplier);
    const showMultiplier = !isEventMission && multiplier > 1;
    const isSpecial = mission.type === 'special';

    return (
        <>
            <div className={`relative flex flex-col h-full rounded-[20px] overflow-hidden transition-all duration-500 group bg-[#050505] ${isExpired ? 'opacity-60 grayscale border border-gray-800' : 'border-2 border-[#FFD86B]/30 hover:border-[#FFD86B] hover:shadow-[0_0_30px_rgba(255,216,107,0.15)] hover:-translate-y-2'} ${isSpecial ? 'ring-1 ring-[#FFD86B]/40' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] z-0"></div>
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/sound-waves.png')] z-0"></div>

                <div className="p-6 pb-2 relative z-10">
                     <div className="flex justify-between items-start mb-4">
                        <div className={`p-4 rounded-full border backdrop-blur-sm shadow-lg transition-colors duration-300 bg-[#111111] border-[#FFD86B]/30 text-[#FFD86B] group-hover:text-white group-hover:bg-[#FFD86B] group-hover:border-[#FFD86B] group-hover:shadow-[0_0_20px_rgba(255,216,107,0.5)] flex items-center justify-center`}>
                             <MissionTypeIcon className="w-7 h-7 transform group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <StatusBadge status={status} isExpired={isExpired} />
                     </div>
                     <h3 className={`text-xl md:text-2xl font-bold leading-tight font-chakra line-clamp-2 min-h-[3.5rem] mb-2 text-transparent bg-clip-text bg-gradient-to-b from-[#FFD86B] to-white drop-shadow-sm ${isSpecial ? 'uppercase tracking-wide' : ''}`}>{mission.title}</h3>
                     {status === 'available' && !isExpired && <MissionTimer deadline={mission.deadline} createdAt={mission.createdAt} cooldown={cooldown} />}
                </div>

                <div className="px-6 flex-grow flex flex-col relative z-10">
                    <p className="text-sm text-gray-400 mb-6 min-h-[48px] flex-grow leading-relaxed line-clamp-3 font-medium mt-2">{mission.description}</p>
                    <div className="flex flex-wrap items-center justify-between mb-6 border-t border-white/5 pt-5 w-full gap-y-3 gap-x-2">
                        <div className="flex items-center gap-2">
                            <RewardCapsule type="coin" value={finalCoins} boosted={showMultiplier} />
                            <RewardCapsule type="xp" value={finalXp} boosted={false} />
                        </div>
                        {showMultiplier && <div className="ml-auto"><MultiplierDisplay multiplier={multiplier} /></div>}
                    </div>
                </div>
                
                <div className="p-5 mt-auto bg-[#080a0c]/80 backdrop-blur-md relative z-10 flex flex-col gap-3 border-t border-white/5">
                    {mission.actionUrl && (
                         <a href={mission.actionUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 text-center rounded-xl py-3.5 px-4 font-bold transition-all duration-300 text-[15px] md:text-[15px] mobile:text-[16px] uppercase tracking-wide font-chakra mb-3 relative overflow-hidden group/post border border-[#FFD86B]/40 text-[#FFD86B] hover:bg-[#FFD86B]/10 hover:border-[#FFD86B] hover:shadow-[0_0_15px_rgba(255,216,107,0.2)]">
                             {mission.type === 'instagram' ? <InstagramIcon className="w-4 h-4" /> : mission.type === 'tiktok' ? <TikTokIcon className="w-4 h-4" /> : mission.type === 'youtube' ? <YoutubeIcon className="w-4 h-4" /> : <span className="text-lg leading-none mb-1">↗</span>}
                             Ver Conteúdo
                             <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:post:opacity-20 transition-opacity duration-500"></div>
                         </a>
                    )}
                    {getButton()}
                </div>
                {isSpecial && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD86B]/10 to-transparent -skew-x-12 animate-shine-sweep pointer-events-none"></div>}
            </div>

            {isModalOpen && (
                 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div onClick={(e) => e.stopPropagation()} className="bg-[#151515] w-full max-w-lg rounded-3xl border border-[#FFD86B]/30 relative flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(255,216,107,0.15)] animate-modal-in overflow-hidden ring-1 ring-[#FFD86B]/20">
                        
                        {/* Header only for non-confirmation or standard header */}
                        {format !== 'confirmation' && (
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#1a1a1a] to-[#121212]">
                                <div>
                                    <h2 className="text-xl font-bold text-[#FFD86B] font-chakra tracking-wide text-shadow-glow">{getModalTitle()}</h2>
                                    <p className="text-gray-400 text-xs mt-1">Siga as instruções para validar.</p>
                                </div>
                                <button onClick={handleCloseModal} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">✕</button>
                            </div>
                        )}

                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                            
                            {/* CASE 1: PHOTO */}
                            {format === 'photo' && (
                                <>
                                    <div className="border-2 border-dashed border-gray-700 rounded-xl mb-8 p-8 text-center min-h-[160px] flex items-center justify-center bg-[#0a0a0a] hover:border-[#FFD86B]/50 transition-colors group relative cursor-pointer">
                                        <input type="file" id={`file-upload-${mission.id}`} className="hidden" accept="image/*" onChange={handleFileChange} />
                                        {!previewUrl ? (
                                            <label htmlFor={`file-upload-${mission.id}`} className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                                                <div className="p-4 bg-[#1a1a1a] rounded-full mb-4 group-hover:scale-110 transition-transform border border-gray-700 shadow-lg group-hover:border-[#FFD86B]/30">
                                                    <svg className="w-8 h-8 text-gray-400 group-hover:text-[#FFD86B] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                </div>
                                                <p className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#FFD86B] transition-colors">Upload de Print/Foto</p>
                                                <p className="text-xs text-gray-500 mt-1">JPG, PNG (Max: {MAX_FILE_SIZE_MB}MB)</p>
                                            </label>
                                        ) : (
                                            <div className="relative w-full h-full flex items-center justify-center group/preview">
                                                <img src={previewUrl} alt="Pré-visualização" className="max-h-48 rounded-lg object-contain shadow-md border border-gray-700" />
                                                <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); setSubmissionError(null); }} className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 border-2 border-[#121212]">✕</button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            
                            {/* CASE 2: LINK */}
                            {format === 'link' && (
                                <div className="mb-6 text-left">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Link da Publicação</label>
                                    <div className="relative group/input">
                                        <input 
                                            type="text" 
                                            placeholder="https://..." 
                                            value={link} 
                                            onChange={handleLinkChange} 
                                            className="w-full bg-[#0a0a0a] rounded-xl border border-gray-700 text-white p-4 pl-4 text-sm focus:border-[#FFD86B] focus:ring-1 focus:ring-[#FFD86B] outline-none transition-all placeholder-gray-600 font-mono shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CASE 3: CONFIRMATION (ENHANCED) */}
                            {format === 'confirmation' && (
                                <div className="text-center mb-8 animate-fade-in-up relative z-10">
                                    {/* Visual Anchor - Removed Oval Border, kept glow */}
                                    <div className="relative w-20 h-20 mx-auto mb-8 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-[#FFD86B] rounded-full blur-2xl opacity-10 animate-pulse pointer-events-none"></div>
                                        <CheckIcon className="w-16 h-16 text-[#FFD86B] drop-shadow-[0_0_15px_rgba(255,216,107,0.8)] z-10" />
                                    </div>

                                    <h3 className="text-2xl font-black text-white font-chakra uppercase tracking-wide mb-2 text-shadow-glow relative z-20">
                                        Missão Cumprida?
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto relative z-20">
                                        Confirme apenas se você realmente completou a tarefa.
                                    </p>

                                    {/* The Warning Block */}
                                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mb-6 flex gap-3 text-left items-start relative z-20">
                                        <ShieldIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-red-300 font-bold text-xs uppercase tracking-wide mb-1">
                                                Sistema Anti-Fraude Ativo
                                            </p>
                                            <p className="text-red-200/70 text-[11px] leading-relaxed">
                                                Falsas confirmações resultarão em <span className="text-white font-bold underline">suspensão da conta</span> e perda de XP.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Error Msg */}
                            {submissionError && (
                                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg mb-6 flex items-center gap-3 animate-shake">
                                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="text-red-300 text-xs font-bold text-left">{submissionError}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 mt-4">
                                {format === 'confirmation' ? (
                                    <div className="flex gap-4">
                                         <button 
                                            onClick={handleCloseModal} 
                                            className="flex-1 py-4 rounded-xl bg-transparent border border-gray-700 text-gray-400 font-bold hover:bg-white/5 uppercase text-xs tracking-wider transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleConfirmSubmit}
                                            disabled={isSubmitting}
                                            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#FFD86B] to-[#F6C560] text-black font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(255,216,107,0.3)] hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
                                        >
                                            {isSubmitting ? 'Verificando...' : 'Sim, Completei'}
                                            <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500 skew-y-12"></div>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={handleConfirmSubmit} 
                                            disabled={(format === 'link' && !link.trim()) || (format === 'photo' && !selectedFile) || isSubmitting || !!submissionError} 
                                            className="w-full py-4 rounded-xl bg-[#FFD86B] text-black font-black hover:bg-[#E9BD3C] transition-all shadow-lg shadow-[#FFD86B]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 font-chakra"
                                        >
                                            {isSubmitting ? <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'Confirmar Envio'}
                                        </button>
                                        <button 
                                            onClick={handleCloseModal} 
                                            className="w-full py-3 rounded-xl bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors font-bold text-gray-400 hover:text-white text-xs uppercase tracking-wider"
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

// ... Rest of the file (DailyMissionTracker, FaqData, Missions Component) remains similar but uses MissionCard ...

const DailyMissionTracker: React.FC<{ user: User; submissions: MissionSubmission[] }> = ({ user, submissions }) => {
    const limit = getDailyMissionLimit(user.plan);
    const isUnlimited = limit === null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const submissionsToday = submissions.filter(s => s.userId === user.id && new Date(s.submittedAtISO).getTime() >= today.getTime()).length;
    const percentage = !isUnlimited && limit > 0 ? (submissionsToday / limit) * 100 : 0;
    const limitReached = !isUnlimited && submissionsToday >= limit;

    return (
        <div className={`bg-gradient-to-r from-[#151515] to-[#0B0B0C] p-8 rounded-2xl border border-[#FFD86B]/10 mb-10 transition-all shadow-lg relative overflow-hidden group ${limitReached ? 'border-red-500/30' : 'hover:border-[#FFD86B]/20'}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD86B]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-8">
                <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white font-chakra tracking-tight">Limite Diário</h3>
                    <p className="text-gray-400 mt-2 text-sm md:text-base max-w-xl leading-relaxed">Plano Atual: <span className="font-bold text-[#FFD86B] uppercase tracking-wide">{user.plan}</span>. {isUnlimited ? ' Você tem envios ilimitados!' : ` Você pode enviar até ${limit} missões por dia.`}</p>
                </div>
                <div className="flex items-center gap-6 bg-[#0a0a0a] px-8 py-5 rounded-xl border border-white/5 min-w-[240px] justify-between md:justify-end shadow-inner">
                    <div className="text-right">
                        <p className="text-4xl font-black text-white font-chakra leading-none">{isUnlimited ? '∞' : `${submissionsToday} / ${limit}`}</p>
                        <p className="text--[10px] font-bold text-gray-500 uppercase tracking-widest mt-1.5">Envios Hoje</p>
                    </div>
                    <div className="h-12 w-px bg-white/10"></div>
                     <div className={`p-4 rounded-full ${limitReached ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[#FFD86B]/10 text-[#FFD86B] border border-[#FFD86B]/20'}`}>
                        {limitReached ? <ClockIcon className="w-8 h-8" /> : <TrendingUpIcon className="w-8 h-8" />}
                    </div>
                </div>
            </div>
            {!isUnlimited && (
                <div className="mt-8 relative">
                    <div className="w-full bg-[#0a0a0a] rounded-full h-3 overflow-hidden border border-white/5">
                        <div className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${limitReached ? 'bg-red-500' : 'bg-gradient-to-r from-[#F5B544] to-[#FFD86B]'}`} style={{ width: `${percentage}%` }}><div className="absolute inset-0 bg-white/20 animate-[shine-sweep_2s_infinite]"></div></div>
                    </div>
                     {limitReached && <p className="text-center text-xs text-red-400 mt-3 font-bold uppercase tracking-wide flex items-center justify-center gap-2"><ClockIcon className="w-3.5 h-3.5" /> Limite atingido. Volte amanhã!</p>}
                </div>
            )}
        </div>
    );
};

const faqData = [
    { question: "Como minhas missões são revisadas?", answer: "Nossa equipe revisa manualmente cada envio para garantir que as instruções foram seguidas. O processo geralmente leva até 24 horas. Você receberá uma notificação assim que sua missão for aprovada ou rejeitada." },
    { question: "O que acontece se meu envio for rejeitado?", answer: "Se sua comprovação for rejeitada, a missão voltará a ficar disponível para você tentar novamente, desde que ainda esteja dentro do prazo. Certifique-se de que sua imagem ou link de comprovação esteja claro e siga todas as regras da missão." },
    { question: "Existe um limite de quantas missões posso fazer?", answer: "Sim, o número de missões que você pode enviar por dia depende do seu plano de assinatura. Você pode ver seu limite diário no topo da página de missões. Assinantes do plano 'Hitmaker' têm envios ilimitados!" },
    { question: "Quando novas missões são adicionadas?", answer: "As missões serão adicionadas regularmente, em média a cada 2 dias. Fique de olho na plataforma para não perder nenhuma oportunidade!" },
    { question: "Para que servem XP e Lummi Coins?", answer: "XP (Pontos de Experiência) servem para aumentar seu nível de artista. A cada 5 níveis, você ganha um bônus de Lummi Coins! As Lummi Coins são a moeda da plataforma, que você pode usar na loja para resgatar serviços visuais incríveis, como avatares 3D, animações e muito mais." }
];

const Missions: React.FC = () => {
    useEffect(() => {
        Perf.mark('missions_mount');
        Perf.trackRender('Missions');
        return () => { Perf.end('missions_mount'); };
    }, []);

    const { state, dispatch } = useAppContext();
    const { activeUser: user } = state;
    const [missions, setMissions] = useState<Mission[]>([]);
    const [missionSubmissions, setMissionSubmissions] = useState<MissionSubmission[]>([]);
    const [hasReachedDailyLimit, setHasReachedDailyLimit] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submissionSuccessInfo, setSubmissionSuccessInfo] = useState<{ missionTitle: string } | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            Perf.mark('missions_data_fetch');
            try {
                const data = await api.fetchMissions(user.id);
                setMissions(data.missions);
                setMissionSubmissions(data.submissions);
                setHasReachedDailyLimit(data.hasReachedDailyLimit);
            } catch (error) {
                console.error("Failed to fetch missions data:", error);
                setError("Não foi possível carregar as missões. Por favor, tente novamente mais tarde.");
            } finally {
                setIsLoading(false);
                Perf.end('missions_data_fetch');
            }
        };
        fetchData();
    }, [user]); 

    const handleSubmitMission = useCallback(async (missionId: string, proof: string) => {
        if (!user) return;
        try {
            const response = await api.submitMission(user.id, missionId, proof);
            if (response.success) {
                setMissionSubmissions(prev => [response.newSubmission!, ...prev]);
                if (response.updatedUser) dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
                const submittedMission = missions.find(m => m.id === missionId);
                if (submittedMission) setSubmissionSuccessInfo({ missionTitle: submittedMission.title });
            }
        } catch(e: any) {
            console.error("Mission submission failed", e);
            throw new Error(e.message);
        }
    }, [user, missions, dispatch]);

    if (isLoading || !user) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#FFD86B]"></div></div>;
    if (error) return <div className="flex flex-col items-center justify-center min-h-[60vh] bg-red-900/5 border border-red-500/20 rounded-xl p-8 text-center"><h3 className="text-2xl font-bold text-red-500 mb-2">Ocorreu um Erro</h3><p className="text-gray-400">{error}</p></div>;

    const getMissionStatus = (missionId: string) => {
        if (user.completedMissions.includes(missionId)) return 'completed';
        if (user.pendingMissions.includes(missionId)) return 'pending';
        if (user.completedEventMissions && user.completedEventMissions.includes(missionId)) return 'completed';
        if (user.pendingEventMissions && user.pendingEventMissions.includes(missionId)) return 'pending';
        return 'available';
    }
    
    const getCooldown = (missionId: string) => MissionTimerEngine.getCooldownDisplay(user.id, missionId);

    return (
        <div className="space-y-10 md:space-y-14 pb-12 animate-fade-in-up">
            <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
                <h2 className="text-4xl md:text-5xl font-black text-[#FFD86B] font-chakra tracking-tight mb-4 text-shadow-glow">SUAS MISSÕES</h2>
                <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">Complete tarefas para ganhar XP, subir de nível e acumular Coins para a loja.</p>
            </div>

            <DailyMissionTracker user={user} submissions={missionSubmissions} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {missions.map(mission => (
                    <MissionCard key={mission.id} mission={mission} status={getMissionStatus(mission.id)} onSubmit={handleSubmitMission} hasReachedDailyLimit={hasReachedDailyLimit} userPlan={user.plan} cooldown={getCooldown(mission.id)} />
                ))}
            </div>
            
            <div className="mt-24 md:mt-32 max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-center text-white mb-10 font-chakra uppercase tracking-wider flex items-center justify-center gap-2">Dúvidas Frequentes</h2>
                <div className="space-y-4">
                    {faqData.map((item, index) => <FaqItem key={index} question={item.question} answer={item.answer} />)}
                </div>
            </div>

            {submissionSuccessInfo && <SubmissionSuccessModal onClose={() => setSubmissionSuccessInfo(null)} missionTitle={submissionSuccessInfo.missionTitle} />}
        </div>
    );
};

export default Missions;
