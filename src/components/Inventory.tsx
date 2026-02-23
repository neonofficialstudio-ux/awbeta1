
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { RedeemedItem, StoreItem, UsableItem, User, UsableItemQueueEntry, InventoryTab, VisualRewardFormData, ArtistOfTheDayQueueEntry } from '../types';
import { MicIcon, CubeIcon, StoreIcon, StarIcon, InstagramIcon, TikTokIcon, YoutubeIcon, GlobeIcon } from '../constants';
import VisualRewardFormModal from './VisualRewardFormModal';
import QueueSuccessModal from './QueueSuccessModal';
import { useAppContext } from '../constants';
import { fetchInventoryData, getMyRequests, getQueuePosition, queueForArtistOfTheDay, submitVisualRewardForm, useUsableItem } from '../api/store';
import { ModalPortal } from './ui/overlays/ModalPortal';
import FaqItem from './ui/patterns/FaqItem';
import { socialLinkValidator } from '../api/quality/socialLinkValidator';
import { useProductionQueue } from '../hooks/useProductionQueue';
import { config } from '../core/config';

// --- Visual Styles & FX ---
// Injected styles for specific animations requested
const fxStyles = {
    goldPulse: "animate-[gold-pulse_1s_ease-out_1]",
    glowAura: "shadow-[0_0_20px_rgba(255,211,105,0.3)] hover:shadow-[0_0_30px_rgba(255,211,105,0.5)]",
    neonText: "text-[#FFD36B] drop-shadow-[0_0_5px_rgba(255,211,105,0.8)]",
};

const faqData = [
    { question: "Como ativo um item utilizável?", answer: "Clique no botão 'Ativar' no card do item e cole o link da sua publicação (Instagram, TikTok ou YouTube) para iniciar o processo." },
    { question: "Quanto tempo demora a produção de um item visual?", answer: "O tempo varia de acordo com a complexidade e a demanda da fila. Geralmente entre 3 a 7 dias úteis. Você pode acompanhar o status na aba 'Histórico'." },
    { question: "Posso cancelar um pedido?", answer: "Pedidos em 'Aguardando' na fila podem ser cancelados se você entrar em contato com o suporte. Itens 'Em Produção' não podem ser cancelados." },
    { question: "Onde recebo o arquivo final?", answer: "Assim que estiver pronto, o link para download aparecerá no card do item na aba 'Histórico' e você receberá uma notificação." }
];

const spFmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
});
const fmtSP = (iso?: string | null) => (iso ? spFmt.format(new Date(iso)) : '');

const InventoryTabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => {
    return (
        <button
            onClick={onClick}
            className={`
                relative flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-300 rounded-xl whitespace-nowrap
                ${active 
                    ? 'bg-[#FFD36B] text-black shadow-[0_0_20px_rgba(255,211,105,0.4)] border border-[#FFD36B] scale-[1.02] z-10' 
                    : 'text-gray-500 hover:text-[#FFD36B] bg-[#0E0E0E]/50 border border-[#333] hover:border-[#FFD36B]/30'
                }
            `}
        >
            {children}
        </button>
    );
};

const UsableItemUrlModal: React.FC<{
    itemName: string;
    itemPlatform?: 'instagram' | 'tiktok' | 'youtube' | 'all';
    onClose: () => void;
    onSubmit: (url: string) => Promise<void>;
}> = ({ itemName, itemPlatform = 'all', onClose, onSubmit }) => {
    const [url, setUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);
    
    // Dynamic placeholder
    const getPlaceholder = () => {
        switch(itemPlatform) {
            case 'instagram': return 'https://instagram.com/p/...';
            case 'tiktok': return 'https://tiktok.com/@user/video/...';
            case 'youtube': return 'https://youtube.com/watch?v=...';
            default: return 'Cole o link da publicação...';
        }
    };
    
    const PlatformIcon = () => {
        switch(itemPlatform) {
            case 'instagram': return <InstagramIcon className="w-8 h-8 text-pink-500 mb-2 mx-auto" />;
            case 'tiktok': return <TikTokIcon className="w-8 h-8 text-white mb-2 mx-auto" />;
            case 'youtube': return <YoutubeIcon className="w-8 h-8 text-red-500 mb-2 mx-auto" />;
            default: return null;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const trimmedUrl = url.trim();

        if (trimmedUrl) {
            // Validate Logic
            if (itemPlatform !== 'all') {
                const detected = socialLinkValidator.getPlatform(trimmedUrl);
                if (detected !== itemPlatform) {
                    setError(`Este item requer um link do ${itemPlatform.toUpperCase()}.`);
                    return;
                }
            } else {
                 if (!socialLinkValidator.isValid(trimmedUrl)) {
                     setError("Link inválido. Insira um link suportado (Instagram, TikTok, YouTube).");
                     return;
                 }
            }
            
            setIsSubmitting(true);
            await onSubmit(trimmedUrl);
            setIsSubmitting(false);
        }
    };

    return (
        <ModalPortal>
            <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/90 backdrop-blur-lg transition-opacity animate-fade-in" onClick={onClose}></div>

                {/* Modal Card - Gold Neon V1 */}
                <div className="relative z-10 w-full max-w-[420px] bg-[#0E0E0E] border border-[#FFD36B] shadow-[0_0_30px_rgba(255,211,105,0.3)] rounded-[26px] overflow-hidden flex flex-col animate-mobile-snap md:animate-pop-in">
                    {/* Top Glow */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD36B] to-transparent shadow-[0_0_15px_#FFD36B]"></div>
                    
                    <div className="p-8 text-center">
                        <PlatformIcon />
                        <h2 className="text-2xl font-black text-white mb-2 font-chakra uppercase tracking-wide flex items-center justify-center gap-2">
                            <span className="text-[#FFD36B] text-shadow-glow">///</span> {itemName}
                        </h2>
                        <p className="text-xs text-[#B3B3B3] mb-8 font-medium">
                            {itemPlatform !== 'all' 
                                ? `Cole o link do seu post no ${itemPlatform} para ativar.`
                                : "Cole o link do post que você deseja turbinar."
                            }
                        </p>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="relative mb-4 group">
                                <div className="absolute inset-0 bg-[#FFD36B]/5 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => { setUrl(e.target.value); setError(null); }}
                                    placeholder={getPlaceholder()}
                                    required
                                    className={`w-full bg-[#151515] border rounded-xl text-white p-4 text-center focus:outline-none transition-all font-mono text-sm relative z-10 shadow-inner placeholder-[#555] ${error ? 'border-red-500 focus:border-red-500' : 'border-[#333] focus:border-[#FFD36B] focus:ring-1 focus:ring-[#FFD36B]'}`}
                                />
                            </div>
                            
                            {error && (
                                <div className="bg-red-900/20 text-red-400 text-xs p-3 rounded-lg border border-red-500/30 mb-4 font-bold animate-shake">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button type="submit" disabled={!url.trim() || isSubmitting} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD36B] to-[#FFB743] text-black font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(255,211,105,0.45)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:scale-[1.02]">
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'Confirmar Ativação'}
                                </button>
                                <button type="button" onClick={onClose} className="w-full py-3.5 rounded-xl bg-transparent text-[#808080] font-bold uppercase tracking-wider text-xs hover:text-white border border-transparent hover:border-[#333] transition-all">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

const getCardStyle = (item: StoreItem | UsableItem) => {
    const isGodTier = item.id === 's-fullclip';
    const isArtist = item.id.includes('artist') || ('rarity' in item && ['Épico', 'Lendário'].includes(item.rarity));
    const isScenes = item.id.includes('scenes') || ('rarity' in item && item.rarity === 'Raro');
    
    if (isGodTier) {
        return {
            border: 'border-[#A855F7]',
            glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
            badge: 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/50',
            button: 'bg-gradient-to-r from-[#A47DFF] to-[#7A31FF] text-white shadow-lg hover:shadow-[#A855F7]/40'
        };
    } else if (isArtist) {
        return {
            border: 'border-[#FFD369]',
            glow: 'shadow-[0_0_20px_rgba(255,211,105,0.3)]',
            badge: 'bg-[#FFD369]/20 text-[#FFD369] border-[#FFD369]/50',
            button: 'bg-gradient-to-r from-[#FFD369] to-[#FFB743] text-black font-bold shadow-lg hover:shadow-[#FFD369]/40'
        };
    } else if (isScenes) {
        return {
            border: 'border-[#00E8FF]',
            glow: 'shadow-[0_0_20px_rgba(0,232,255,0.3)]',
            badge: 'bg-[#00E8FF]/20 text-[#00E8FF] border-[#00E8FF]/50',
            button: 'bg-[#00E8FF]/10 text-[#00E8FF] border border-[#00E8FF]/50 hover:bg-[#00E8FF] hover:text-black font-bold'
        };
    } else {
        return {
            border: 'border-[#333]',
            glow: '',
            badge: 'bg-[#333] text-[#B3B3B3] border-[#444]',
            button: 'bg-[#1A1A1A] text-white hover:bg-[#333] border border-[#333]'
        };
    }
};

const VisualRewardCard: React.FC<{ redeemedItem: RedeemedItem; storeItem: StoreItem; onUse: (redeemedItem: RedeemedItem) => void; }> = ({ redeemedItem, storeItem, onUse }) => {
    const style = getCardStyle(storeItem);

    return (
        <div className={`bg-[#0D0D0D] rounded-[20px] border-2 ${style.border} ${style.glow} overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1 relative h-full`}>
            <div className="absolute top-3 right-3 z-10">
                 <span className={`text-[10px] uppercase tracking-wider font-black px-3 py-1 rounded-md backdrop-blur-sm border ${style.badge}`}>
                    {storeItem.rarity}
                </span>
            </div>
            <div className="relative aspect-video overflow-hidden bg-[#050505]">
                <img src={storeItem.imageUrl} alt={storeItem.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] to-transparent"></div>
            </div>
            <div className="p-6 flex-grow flex flex-col -mt-6 relative z-10">
                <h3 className="text-lg font-black text-white leading-tight font-chakra line-clamp-2 min-h-[3.5rem] mb-2 uppercase tracking-wide">{storeItem.name}</h3>
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-[9px] bg-[#1A1A1A] px-2 py-1 rounded text-[#808080] font-mono border border-[#333]">
                        ID: {redeemedItem.id.split('-')[1]}
                    </span>
                    <span className="text-[9px] text-[#808080]">
                        • {redeemedItem.redeemedAt}
                    </span>
                </div>
                
                {redeemedItem.status === 'Redeemed' && (
                    <button 
                        onClick={() => onUse(redeemedItem)}
                        className={`mt-auto w-full py-3.5 px-4 rounded-xl text-xs tracking-[0.15em] uppercase font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${style.button}`}
                    >
                        Iniciar Produção
                    </button>
                )}

                {redeemedItem.status === 'InProgress' && (
                    <button
                        disabled
                        className="mt-auto w-full py-3.5 px-4 rounded-xl text-xs tracking-[0.15em] uppercase font-black border border-[#A855F7]/30 bg-[#A855F7]/10 text-[#A855F7] cursor-not-allowed"
                    >
                        Em Produção
                    </button>
                )}

                {redeemedItem.status === 'Used' && (
                    <button
                        onClick={() => { if (redeemedItem.completionUrl) window.open(redeemedItem.completionUrl, '_blank'); }}
                        disabled={!redeemedItem.completionUrl}
                        className={`mt-auto w-full py-3.5 px-4 rounded-xl text-xs tracking-[0.15em] uppercase font-black transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${redeemedItem.completionUrl ? 'bg-[#6BFF8A] hover:bg-[#4ADE80] text-black shadow-[0_0_12px_rgba(107,255,138,0.35)]' : 'bg-[#1A1A1A] text-[#666] border border-[#333] cursor-not-allowed'}`}
                    >
                        {redeemedItem.completionUrl ? 'Abrir Entrega' : 'Entrega Indisponível'}
                    </button>
                )}
            </div>
        </div>
    );
};

const UsableItemCard: React.FC<{ 
    redeemedItem: RedeemedItem; 
    usableItem: UsableItem; 
    onUse: (redeemedItemId: string, item: UsableItem) => void; 
    onQueueForArtistOfTheDay: (redeemedItemId: string) => Promise<void>;
    queueInfoByRequestId: Record<string, any>;
    fmtDate: (iso?: string | null) => string;
}> = ({ redeemedItem, usableItem, onUse, onQueueForArtistOfTheDay, queueInfoByRequestId, fmtDate }) => {
    
    const [isQueuing, setIsQueuing] = useState(false);
    
    // Platform Icon Helper
    const PlatformIcon = ({ platform }: { platform?: string }) => {
        switch(platform) {
            case 'instagram': return <div className="text-pink-500 bg-pink-500/10 p-1.5 rounded-full border border-pink-500/30"><InstagramIcon className="w-4 h-4"/></div>;
            case 'tiktok': return <div className="text-white bg-white/10 p-1.5 rounded-full border border-white/30"><TikTokIcon className="w-4 h-4"/></div>;
            case 'youtube': return <div className="text-red-500 bg-red-500/10 p-1.5 rounded-full border border-red-500/30"><YoutubeIcon className="w-4 h-4"/></div>;
            default: return null;
        }
    };
    
    const handleUseClick = async () => {
        // Check for Artist of the Day specific item (Legacy ID: ui-spotlight)
        // FIX V1.0: Canonical usage type check for Spotlight Queue routing
        const isSpotlightItem = usableItem.id === 'ui-spotlight';

        if (isSpotlightItem) {
            // V13.7: Block usage as item is discontinued
            // setIsQueuing(true);
            // try {
            //     await onQueueForArtistOfTheDay(redeemedItem.id);
            // } catch (e) {
            //     console.error("Failed to queue for spotlight", e);
            // } finally {
            //     setIsQueuing(false);
            // }
        } else {
            // Pass full item object for platform check
            onUse(redeemedItem.id, usableItem);
        }
    };
    
    // V13.7: Legacy Check
    const isLegacyDiscontinued = usableItem.id === 'ui-spotlight';
    const reqId = (redeemedItem as any).productionRequestId as string | undefined;
    const queueInfo = reqId ? queueInfoByRequestId[reqId] : null;

    return (
        <div className={`bg-[#0D0D0D] rounded-[20px] border border-[#333] overflow-hidden flex flex-col group transition-all hover:border-[#FFD369]/50 hover:shadow-[0_0_20px_rgba(255,211,105,0.1)] h-full relative`}>
             <div className="absolute top-3 right-3 z-20">
                 <PlatformIcon platform={usableItem.platform} />
             </div>
             
             <div className="relative aspect-[4/3] bg-[#050505] overflow-hidden">
                <img src={usableItem.imageUrl} alt={usableItem.name} className={`w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-500 grayscale ${isLegacyDiscontinued ? '' : 'group-hover:grayscale-0'}`} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0D0D0D]"></div>
                {isLegacyDiscontinued && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-600 px-3 py-1 rounded bg-black">Descontinuado</span>
                    </div>
                )}
            </div>
            <div className="p-6 flex-grow flex flex-col -mt-10 relative z-10">
                <h3 className="text-lg font-bold text-white font-chakra uppercase tracking-wide leading-tight group-hover:text-[#FFD369] transition-colors">{usableItem.name}</h3>
                <p className="text-xs text-[#808080] mt-2 mb-6 line-clamp-2">{usableItem.description}</p>
                {queueInfo && (
                    <div className="mb-3 mt-1 bg-[#0E1014] border border-[#242A33] rounded-2xl px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-300">Posição na fila</span>
                            <span className="font-mono text-white">
                                {queueInfo.position_in_queue ?? '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <span>Ativos:</span>
                            <span className="font-mono">{queueInfo.total_active ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <span>À frente:</span>
                            <span className="font-mono">{queueInfo.active_ahead ?? 0}</span>
                        </div>
                        <div className="mt-1 text-[#8BD3FF] font-semibold">
                            Em produção (em andamento)
                        </div>
                    </div>
                )}
                <button 
                    onClick={handleUseClick}
                    disabled={isQueuing || isLegacyDiscontinued || Boolean(queueInfo && (queueInfo.status === 'queued' || queueInfo.status === 'in_progress'))}
                    className={`mt-auto w-full font-bold py-3.5 px-4 rounded-xl border text-xs uppercase tracking-widest flex items-center justify-center shadow-lg transition-all
                        ${isLegacyDiscontinued 
                            ? 'bg-[#111] text-gray-600 border-[#222] cursor-not-allowed' 
                            : 'bg-[#1A1A1A] text-white border-[#333] hover:bg-[#FFD369] hover:text-black hover:border-[#FFD369]'
                        }
                    `}
                >
                    {isQueuing ? <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : isLegacyDiscontinued ? 'Item Legado' : (queueInfo ? 'Em Fila / Andamento' : 'Ativar Item')}
                </button>
            </div>
        </div>
    );
};

// PRODUCTION QUEUE MODAL / PANEL (GOLD NEON REDESIGN V1)
const ItemQueue: React.FC<{ queue: UsableItemQueueEntry[]; currentUser: User; }> = ({ queue, currentUser }) => {
    const currentUserPosition = queue.findIndex(item => item.userId === currentUser.id) + 1;

    if (queue.length === 0) return null;

    return (
        <div className="bg-[#0E0E0E]/80 backdrop-blur-xl p-0 rounded-[26px] border border-[#FFD36B] shadow-[0_0_40px_rgba(255,211,105,0.15)] mt-12 relative overflow-hidden animate-[fade-in-up_0.5s_ease-out]">
            {/* Top Glow Line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#FFD36B] to-transparent shadow-[0_0_20px_#FFD36B]"></div>
            
            <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#FFD36B]/10 rounded-xl border border-[#FFD36B]/40 shadow-[0_0_15px_rgba(255,211,105,0.2)]">
                            <svg className="w-6 h-6 text-[#FFD36B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-wider font-chakra">Fila de Produção</h3>
                            <p className="text-[10px] text-[#FFD36B] font-bold uppercase tracking-widest mt-0.5">Tempo Real</p>
                        </div>
                    </div>
                    <div className="hidden md:block h-px flex-grow mx-6 bg-gradient-to-r from-[#FFD36B]/30 to-transparent"></div>
                    <span className="text-xs font-bold text-[#808080] bg-[#151515] px-3 py-1 rounded-full border border-[#333]">
                        {queue.length} item(s)
                    </span>
                </div>

                {currentUserPosition > 0 && (
                     <div className="bg-gradient-to-r from-[#FFD36B]/20 to-[#FFD36B]/5 border border-[#FFD36B]/40 p-5 rounded-2xl mb-8 flex items-center justify-between shadow-[0_0_25px_rgba(255,211,105,0.15)] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FFD36B] shadow-[0_0_15px_#FFD36B]"></div>
                        <div className="relative z-10">
                            <p className="font-black text-[#FFD36B] text-lg uppercase tracking-wide drop-shadow-sm">Sua Posição: #{currentUserPosition}</p>
                            <p className="text-xs text-[#FFD36B]/70 mt-1 font-medium">Seu pedido está em processamento prioritário.</p>
                        </div>
                        <div className="w-3 h-3 bg-[#FFD36B] rounded-full animate-pulse shadow-[0_0_15px_#FFD36B]"></div>
                        <div className="absolute inset-0 bg-white/5 skew-x-12 translate-x-[-100%] group-hover:animate-shine-sweep"></div>
                    </div>
                )}
                
                <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {queue.map((item, index) => {
                        const isCurrentUser = item.userId === currentUser.id;
                        return (
                        <div 
                            key={item.id} 
                            className={`
                                flex items-center justify-between p-4 rounded-2xl border transition-all duration-300
                                ${isCurrentUser 
                                    ? 'bg-[#FFD36B]/5 border-[#FFD36B]/50 shadow-[0_0_15px_rgba(255,211,105,0.1)]' 
                                    : 'bg-[#151515] border-[#222] opacity-80 hover:opacity-100 hover:border-[#FFD36B]/20'}
                            `}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm border ${isCurrentUser ? 'border-[#FFD36B] text-[#FFD36B] bg-[#FFD36B]/10' : 'border-[#333] text-[#555] bg-[#0E0E0E]'}`}>
                                    {(index + 1).toString().padStart(2, '0')}
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className={`w-11 h-11 rounded-full p-[2px] ${isCurrentUser ? 'bg-gradient-to-br from-[#FFD36B] to-[#FFB743]' : 'bg-[#333]'}`}>
                                         <img src={item.userAvatar} className="w-full h-full rounded-full object-cover border-2 border-[#0E0E0E]" />
                                     </div>
                                     <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${isCurrentUser ? 'text-white' : 'text-[#CCC]'}`}>{item.userName}</span>
                                        <span className={`text-[10px] uppercase tracking-wider font-bold ${isCurrentUser ? 'text-[#FFD36B] text-shadow-glow' : 'text-[#666]'}`}>
                                            {item.itemName}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="hidden md:flex flex-col items-end gap-2">
                                 <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                     item.status === 'done' ? 'bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/30' :
                                     item.status === 'processing' ? 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30' :
                                     'bg-[#FFD36B]/10 text-[#FFD36B] border-[#FFD36B]/30'
                                 }`}>
                                     {item.status === 'done' ? 'Concluído' : item.status === 'processing' ? 'Em Andamento' : 'Aguardando'}
                                 </span>
                                 
                                 <div className="w-24 h-1.5 bg-[#0E0E0E] rounded-full overflow-hidden border border-[#333]">
                                     <div 
                                        className="h-full bg-gradient-to-r from-[#FFD36B] to-[#FFB743] transition-all duration-500" 
                                        style={{ width: `${item.progress || 0}%` }}
                                    ></div>
                                 </div>
                             </div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
}

// UPDATED HISTORY CARD WITH "CONCLUÍDO" FX V2
const HistoryItemCard: React.FC<{
    redeemedItem: RedeemedItem;
    itemDetails: StoreItem | UsableItem | undefined;
    queueInfoByRequestId: Record<string, any>;
    fmtDate: (iso?: string | null) => string;
}> = ({ redeemedItem, itemDetails, queueInfoByRequestId, fmtDate }) => {
    const statusConfig = {
        InProgress: { color: 'text-[#A855F7]', bg: 'bg-[#A855F7]/10', border: 'border-[#A855F7]/30', label: 'Em Produção', icon: '⚙️' },
        Used: { color: 'text-[#6BFF8A]', bg: 'bg-[#6BFF8A]/10', border: 'border-[#6BFF8A]/50', label: 'Concluído', icon: '✅' },
        Refunded: { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30', label: 'Reembolsado', icon: '↩️' },
        Redeemed: { color: 'text-[#FFD36B]', bg: 'bg-[#FFD36B]/10', border: 'border-[#FFD36B]/30', label: 'Disponível', icon: '📦' }
    };
    
    const status = statusConfig[redeemedItem.status as keyof typeof statusConfig] || statusConfig['Redeemed'];
    const isCompleted = redeemedItem.status === 'Used';

    const handleOpenLink = () => {
        if (redeemedItem.completionUrl) {
            window.open(redeemedItem.completionUrl, '_blank');
        }
    };

    const isUsable = redeemedItem.productionCategory === 'usable' || ('platform' in (itemDetails || {}) && !(itemDetails as any).rarity);
    const hasSubmittedLink = Boolean(redeemedItem.submittedLink);
    const reqId = (redeemedItem as any).productionRequestId as string | undefined;
    const queueInfo = reqId ? queueInfoByRequestId[reqId] : null;

    const handleOpenSubmitted = () => {
        if (redeemedItem.submittedLink) window.open(redeemedItem.submittedLink, '_blank');
    };

    return (
        <div className={`
            bg-[#0D0D0D] rounded-[20px] border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between 
            group transition-all duration-500 gap-4 relative overflow-hidden
            ${isCompleted 
                ? 'border-[#6BFF8A]/40 hover:border-[#6BFF8A] shadow-[0_0_15px_rgba(107,255,138,0.1)] hover:shadow-[0_0_25px_rgba(107,255,138,0.25)]' 
                : 'border-[#222] hover:border-[#FFD36B]/30 hover:shadow-[0_0_15px_rgba(0,0,0,0.5)]'}
            ${isCompleted ? 'hover:scale-[1.01]' : ''}
        `}>
            {/* Special FX Aura for Completed */}
            {isCompleted && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#6BFF8A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            )}

            <div className="flex items-center gap-5 w-full sm:w-auto relative z-10">
                <div className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border transition-all duration-300 ${isCompleted ? 'border-[#6BFF8A]/50 shadow-[0_0_15px_rgba(107,255,138,0.3)]' : 'border-[#333] group-hover:border-[#FFD36B]/40'}`}>
                    {itemDetails?.imageUrl ? (
                        <img src={itemDetails.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" />
                    ) : (
                        <div className="w-full h-full bg-[#151515] flex items-center justify-center text-[#333]">?</div>
                    )}
                </div>
                <div className="min-w-0">
                    <h4 className={`font-bold text-base uppercase tracking-wide font-chakra truncate transition-colors ${isCompleted ? 'text-white group-hover:text-[#6BFF8A]' : 'text-white'}`}>{redeemedItem.itemName}</h4>
                    <p className="text-xs text-[#808080] mt-1 font-mono">
                        {fmtSP(redeemedItem.redeemedAtISO)}
                    </p>
                    
                    {redeemedItem.status === 'InProgress' && redeemedItem.estimatedCompletionDate && (
                        <div className="mt-2 inline-flex items-center text-[10px] text-[#A855F7] font-bold uppercase tracking-wider bg-[#A855F7]/10 px-2 py-0.5 rounded border border-[#A855F7]/20">
                            <span className="w-1.5 h-1.5 bg-[#A855F7] rounded-full animate-pulse mr-2"></span>
                            Entrega: {new Date(redeemedItem.estimatedCompletionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                    )}
                    
                    {/* VISUAIS: Abrir Entrega */}
                    {!isUsable && (redeemedItem.status === 'Used' || redeemedItem.status === 'Redeemed') && (
                        <button 
                            onClick={handleOpenLink}
                            disabled={!redeemedItem.completionUrl}
                            className={`
                                mt-2 text-[10px] font-bold uppercase tracking-wider text-black px-4 py-1.5 rounded-lg transition-all shadow-lg flex items-center gap-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                                ${isCompleted ? 'bg-[#6BFF8A] hover:bg-[#4ADE80] shadow-[0_0_10px_rgba(107,255,138,0.4)]' : 'bg-[#FFD36B] hover:bg-[#FFB743] shadow-[0_0_10px_rgba(255,211,105,0.3)]'}
                            `}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {redeemedItem.completionUrl ? 'Abrir Entrega' : 'Entrega Indisponível'}
                        </button>
                    )}

                    {/* UTILIZÁVEIS: Abrir Link Enviado + detalhes */}
                    {isUsable && (
                        <div className="mt-2 space-y-2">
                            <div className="text-[10px] text-[#808080] font-mono">
                                {redeemedItem.submittedKind ? <>Tipo: <span className="text-white">{redeemedItem.submittedKind}</span></> : null}
                                {redeemedItem.deliveredAt ? <> · Concluído: <span className="text-white">{fmtSP(redeemedItem.deliveredAt)}</span></> : null}
                            </div>

                            {queueInfo && (queueInfo.status === 'queued' || queueInfo.status === 'in_progress') && (
                                <div className="text-[10px] text-[#B3B3B3] font-mono bg-black/30 border border-[#333] rounded-xl px-3 py-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white font-bold">Fila:</span>
                                        {queueInfo.status === 'queued' ? (
                                            <span className="text-white">
                                                #{queueInfo.position_in_queue} • Ativos: {queueInfo.total_active}
                                            </span>
                                        ) : (
                                            <span className="text-[#FFD36B] font-bold">Em andamento</span>
                                        )}
                                    </div>
                                    <div className="mt-1 text-[#808080]">
                                        Criado: {fmtDate(queueInfo.created_at)}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleOpenSubmitted}
                                disabled={!hasSubmittedLink}
                                className={`
                                    text-[10px] font-bold uppercase tracking-wider text-black px-4 py-1.5 rounded-lg transition-all shadow-lg flex items-center gap-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                                    bg-[#FFD36B] hover:bg-[#FFB743] shadow-[0_0_10px_rgba(255,211,105,0.3)]
                                `}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7v7m0-7L10 14m-4 7h7" />
                                </svg>
                                {hasSubmittedLink ? 'Abrir Link Enviado' : 'Link não encontrado'}
                            </button>

                            {!!redeemedItem.deliveredNotes && (
                                <div className="text-[11px] text-[#B3B3B3] bg-[#111]/60 border border-[#222] rounded-lg px-3 py-2">
                                    <span className="text-[#FFD36B] font-bold">Notas:</span> {redeemedItem.deliveredNotes}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <span className={`
                text-[10px] font-black uppercase px-3 py-1 rounded-full border whitespace-nowrap self-start sm:self-center shadow-sm transition-all duration-300 relative z-10
                ${status.bg} ${status.color} ${status.border}
                ${isCompleted ? 'animate-[pulse_3s_infinite] shadow-[0_0_10px_rgba(107,255,138,0.2)]' : ''}
            `}>
                <span className="mr-1.5">{status.icon}</span>
                {status.label}
            </span>
        </div>
    );
};

const EmptyVaultState: React.FC<{ message: string, onGoToStore: () => void }> = ({ message, onGoToStore }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-[#333] rounded-[22px] bg-[#0D0D0D]/50 hover:border-[#FFD36B]/30 transition-colors group">
        <div className="w-24 h-24 bg-[#151515] rounded-full flex items-center justify-center mb-6 border border-[#222] shadow-inner group-hover:scale-110 transition-transform duration-500 group-hover:border-[#FFD36B]/20">
            <CubeIcon className="w-10 h-10 text-[#333] group-hover:text-[#FFD36B] transition-colors" />
        </div>
        <h3 className="text-xl font-black text-white font-chakra uppercase tracking-wide mb-2">Cofre Vazio</h3>
        <p className="text-[#808080] max-w-xs mb-8 text-sm">{message}</p>
        <button 
            onClick={onGoToStore}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FFD36B] to-[#FFB743] text-black font-black rounded-xl hover:shadow-[0_0_25px_rgba(255,211,105,0.4)] transition-all uppercase text-xs tracking-widest transform hover:scale-105 active:scale-95 relative overflow-hidden"
        >
            <StoreIcon className="w-4 h-4" />
            Ir para a Loja
        </button>
    </div>
);

const Inventory: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { activeUser: currentUser, inventoryInitialTab } = state;
    const isSupabase = config.backendProvider === 'supabase';

    const [redeemedItems, setRedeemedItems] = useState<RedeemedItem[]>([]);
    const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
    const [usableItems, setUsableItems] = useState<UsableItem[]>([]);
    const [usableRequests, setUsableRequests] = useState<any[]>([]);
    const [usablePositions, setUsablePositions] = useState<Record<string, any>>({});
    const [queueLoading, setQueueLoading] = useState(false);
    const lastLoadRef = useRef<number>(0);
    const CACHE_TTL_MS = 30_000; // 30s
    
    // Use the new hook for the queue instead of static fetch
    const liveUsableItemQueue = useProductionQueue();
    
    const [artistOfTheDayQueue, setArtistOfTheDayQueue] = useState<ArtistOfTheDayQueueEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<InventoryTab>(inventoryInitialTab);
    const [usableItemToActivate, setUsableItemToActivate] = useState<{ id: string; platform?: 'instagram' | 'tiktok' | 'youtube' | 'all'; name: string } | null>(null);
    const [visualItemToUse, setVisualItemToUse] = useState<RedeemedItem | null>(null);
    const [queueSuccessInfo, setQueueSuccessInfo] = useState<{ itemName: string; isSpotlight: boolean; isVisualReward: boolean; } | null>(null);

    const loadUsableQueueInfo = useCallback(async () => {
        if (!isSupabase || !currentUser?.id) return;

        try {
            setQueueLoading(true);
            const reqRes = await getMyRequests('usable');
            if (!reqRes.success) return;

            const reqs = reqRes.data || [];
            setUsableRequests(reqs);

            const active = reqs.filter((r: any) => r.status === 'queued' || r.status === 'in_progress');
            const entries = await Promise.all(
                active.map(async (r: any) => {
                    const posRes = await getQueuePosition(r.id);
                    return [r.id, posRes.success ? posRes.data : null] as const;
                })
            );

            const map: Record<string, any> = {};
            for (const [id, val] of entries) {
                if (val) map[id] = val;
            }
            setUsablePositions(map);
        } finally {
            setQueueLoading(false);
        }
    }, [isSupabase, currentUser?.id]);

    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && lastLoadRef.current && (now - lastLoadRef.current) < CACHE_TTL_MS) {
            // evita loading infinito quando o cache impede novo fetch
            setIsLoading(false);
            return;
        }
        lastLoadRef.current = now;
        if (!currentUser) {
            setIsLoading(false);
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            const result = await fetchInventoryData(currentUser.id);
            if (result.success && result.data) {
                setRedeemedItems(result.data.redeemedItems);
                setStoreItems(result.data.storeItems);
                setUsableItems(result.data.usableItems);
                // Queue is handled by hook now, but we keep others
                setArtistOfTheDayQueue(result.data.artistOfTheDayQueue);
            } else {
                setError("Failed to load data");
            }
        } catch (e) {
            console.error("Failed to fetch inventory data:", e);
            setError("Não foi possível carregar seu inventário.");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);
    
    useEffect(() => {
        fetchData(false);
    }, [fetchData]); 

    useEffect(() => {
        // quando o componente monta novamente, tenta refetch leve apenas se TTL expirou
        // (se quiser forçar ao entrar, altere para fetchData(true))
        fetchData(false);
    }, [fetchData]);

    useEffect(() => {
        setActiveTab(inventoryInitialTab);
    }, [inventoryInitialTab]);

    useEffect(() => {
        if (activeTab === 'usable' || activeTab === 'history') {
            loadUsableQueueInfo();
        }
    }, [activeTab, loadUsableQueueInfo]);

    const processApiResponse = (response: any) => {
        if (response.updatedUser) {
            dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
        }
        if (response.notifications) {
            dispatch({ type: 'ADD_NOTIFICATIONS', payload: response.notifications });
        }
    };

    const handleVisualRewardSubmit = async (redeemedItemId: string, formData: VisualRewardFormData) => {
        if (!currentUser) return;
        const response = await submitVisualRewardForm(currentUser.id, redeemedItemId, formData);
        processApiResponse(response);
        if (response.updatedItem) {
            await fetchData(true);
            const item = redeemedItems.find(i => i.id === redeemedItemId);
            if (item) {
                setQueueSuccessInfo({ itemName: item.itemName, isSpotlight: false, isVisualReward: true });
            }
        }
        setVisualItemToUse(null);
    };

    const handleUseUsable = async (url: string) => {
        if (!currentUser || !usableItemToActivate) return;
        
        // Validation moved to Modal
        const response = await useUsableItem(currentUser.id, usableItemToActivate.id, url);
        processApiResponse(response);
        
        if (response.success) {
            await fetchData(true);
            setQueueSuccessInfo({ itemName: usableItemToActivate.name, isSpotlight: false, isVisualReward: false });
        }
        setUsableItemToActivate(null);
    };

    const handleQueueForArtistOfTheDay = async (redeemedItemId: string) => {
        if (!currentUser) return;
        // V13.7: Block queue logic for discontinued items
        // const response = await queueForArtistOfTheDay(currentUser.id, redeemedItemId);
        // processApiResponse(response);
        // if (response.success) {
        //    await fetchData();
        //    const item = redeemedItems.find(i => i.id === redeemedItemId);
        //    if (item) {
        //        setQueueSuccessInfo({ itemName: item.itemName, isSpotlight: true, isVisualReward: false });
        //    }
        // }
    };

    const handleGoToStore = () => {
        dispatch({ type: 'SET_STORE_TAB', payload: 'redeem' });
    };

    if (isLoading || !currentUser) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#FFD36B] shadow-[0_0_20px_rgba(255,211,105,0.4)]"></div>
            </div>
        );
    }

    const activeInventory = redeemedItems.filter(item => item.status === 'Redeemed');
    const historyInventory = redeemedItems.filter(item => item.status !== 'Redeemed')
            .sort((a, b) => new Date(b.redeemedAtISO).getTime() - new Date(a.redeemedAtISO).getTime());
    
    const visualRewards = activeInventory.map(ri => {
            const storeItem = storeItems.find(si => si.id === ri.itemId);
            return storeItem ? { redeemedItem: ri, storeItem } : null;
        }).filter((item): item is { redeemedItem: RedeemedItem; storeItem: StoreItem } => item !== null);
        
    // Also check for legacy usable items even if not in 'usableItems' catalog anymore (e.g. 'ui-spotlight')
    // We create a dummy object for display if needed, to support legacy inventory view
    const userUsableItems = activeInventory.map(ri => {
            let usableItem = usableItems.find(ui => ui.id === ri.itemId);
            
            // Fallback for legacy removed items
            if (!usableItem && ri.itemId === 'ui-spotlight') {
                usableItem = { 
                    id: 'ui-spotlight', 
                    name: 'Destaque: Artista do Dia', 
                    description: 'Item legado - Descontinuado.', 
                    price: 0, 
                    imageUrl: 'https://via.placeholder.com/200?text=Legacy', 
                    isOutOfStock: true 
                };
            }
            
            // Map legacy microphone item to 'all' if platform is missing
            if (usableItem && !usableItem.platform) {
                 usableItem = { ...usableItem, platform: 'all' };
            }

            return usableItem ? { redeemedItem: ri, usableItem } : null;
        }).filter((item): item is { redeemedItem: RedeemedItem; usableItem: UsableItem } => item !== null);
    
    const handleActivateUsableItem = (redeemedItemId: string, item: UsableItem) => {
        setUsableItemToActivate({ id: redeemedItemId, platform: item.platform, name: item.name });
    };

    return (
        <div className="min-h-screen pb-20 animate-fade-in-up">
            {/* Modals */}
            {usableItemToActivate && (
                <UsableItemUrlModal 
                    itemName={usableItemToActivate.name}
                    itemPlatform={usableItemToActivate.platform}
                    onClose={() => setUsableItemToActivate(null)}
                    onSubmit={handleUseUsable}
                />
            )}
            {visualItemToUse && (
                <VisualRewardFormModal
                    item={visualItemToUse}
                    onClose={() => setVisualItemToUse(null)}
                    onSubmit={handleVisualRewardSubmit}
                />
            )}
            {queueSuccessInfo && (
                <QueueSuccessModal
                    onClose={() => setQueueSuccessInfo(null)}
                    itemName={queueSuccessInfo.itemName}
                    isSpotlight={queueSuccessInfo.isSpotlight}
                    isVisualReward={queueSuccessInfo.isVisualReward}
                />
            )}

            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
                <h2 className="text-4xl md:text-5xl font-black text-white font-chakra mb-3 text-shadow-glow uppercase">Inventário</h2>
                <p className="text-[#B3B3B3] text-base md:text-lg">Gerencie seus ativos digitais e serviços desbloqueados.</p>
            </div>
            
            {/* Tabs (Segmented Control) */}
            <div className="max-w-3xl mx-auto mb-10 bg-[#0E0E0E]/80 p-1.5 rounded-xl flex flex-col sm:flex-row gap-2 border border-[#333] backdrop-blur-xl shadow-2xl">
                <InventoryTabButton active={activeTab === 'visual'} onClick={() => setActiveTab('visual')}>
                    Visuais <span className="ml-2 bg-black/50 px-2 py-0.5 rounded text-[10px] border border-[#333] font-mono">{visualRewards.length}</span>
                </InventoryTabButton>
                <InventoryTabButton active={activeTab === 'usable'} onClick={() => setActiveTab('usable')}>
                    Utilizáveis <span className="ml-2 bg-black/50 px-2 py-0.5 rounded text-[10px] border border-[#333] font-mono">{userUsableItems.length}</span>
                </InventoryTabButton>
                <InventoryTabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                    Histórico
                </InventoryTabButton>
            </div>

            {/* Content Area */}
            <div className="max-w-[1600px] mx-auto px-0">
                {activeTab === 'visual' && (
                    <div>
                        {visualRewards.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                {visualRewards.map(item => item && <VisualRewardCard key={item.redeemedItem.id} {...item} onUse={setVisualItemToUse} />)}
                            </div>
                        ) : (
                           <EmptyVaultState message="Nenhuma recompensa visual disponível." onGoToStore={handleGoToStore} />
                        )}
                    </div>
                )}

                {activeTab === 'usable' && (
                     <div>
                        {userUsableItems.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                {userUsableItems.map(item => item && (
                                    <UsableItemCard
                                        key={item.redeemedItem.id}
                                        {...item}
                                        onUse={handleActivateUsableItem}
                                        onQueueForArtistOfTheDay={handleQueueForArtistOfTheDay}
                                        queueInfoByRequestId={usablePositions}
                                        fmtDate={fmtSP}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyVaultState message="Você não possui itens ativáveis no momento." onGoToStore={handleGoToStore} />
                        )}
                        
                        {/* Updated Item Queue to use live hook */}
                        {!isSupabase && (liveUsableItemQueue.length > 0) && (
                            <div className="grid grid-cols-1 gap-8 mt-16">
                                <ItemQueue queue={liveUsableItemQueue} currentUser={currentUser} />
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'history' && (
                     <div>
                        {historyInventory.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {historyInventory.map(ri => {
                                    const itemDetails = [...storeItems, ...usableItems].find(item => item.id === ri.itemId);
                                    return (
                                        <HistoryItemCard
                                            key={ri.id}
                                            redeemedItem={ri}
                                            itemDetails={itemDetails}
                                            queueInfoByRequestId={usablePositions}
                                            fmtDate={fmtSP}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 border-2 border-dashed border-[#333] rounded-[22px] bg-[#0D0D0D]/50">
                                <p className="text-[#808080] text-sm">Nenhum histórico de uso recente.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* FAQ Section */}
            <div className="mt-24 max-w-3xl mx-auto">
                <h3 className="text-2xl font-bold text-center text-white mb-8 font-chakra uppercase tracking-wider">Perguntas Frequentes</h3>
                <div className="space-y-4">
                    {faqData.map((item, index) => <FaqItem key={index} question={item.question} answer={item.answer} />)}
                </div>
            </div>
        </div>
    );
};

export default Inventory;
