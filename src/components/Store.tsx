
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { CoinPack, StoreItem, UsableItem, StoreTab, User, CoinPurchaseRequest, RedeemedItem } from '../types';
import { CoinIcon, LockIcon, CalculatorIcon } from '../constants';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { calculateDiscountedPrice } from '../api/economy/economy';
import CoinPurchaseSuccessModal from './CoinPurchaseSuccessModal';
import { formatNumber } from './ui/utils/format';
import { Perf } from '../services/perf.engine';
import { ModalPortal } from './ui/overlays/ModalPortal';
import FaqItem from './ui/patterns/FaqItem';

// --- UI COMPONENTS V3 (PREMIUM DOPAMINE GLOW) ---

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; className?: string }> = React.memo(({ active, onClick, children, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`
                relative w-full md:w-auto px-6 py-3 text-xs md:text-sm font-black uppercase tracking-[0.15em] rounded-[14px] transition-all duration-300 ease-out
                ${active 
                    ? 'bg-[#FFD66D] text-black border border-[#FFD66D] shadow-[0_0_25px_rgba(255,214,109,0.4)] scale-[1.02] z-10' 
                    : 'bg-[#0C0C0C] border border-[#FFD66D]/20 text-[#FFD66D]/60 hover:text-[#FFD66D] hover:border-[#FFD66D]/50 hover:shadow-[0_0_15px_rgba(255,214,109,0.15)]'
                }
                ${className}
            `}
        >
            {children}
        </button>
    );
});

// Helper to get Rarity Styles (Border + Glow)
const getRarityStyle = (rarity: string = 'Regular') => {
    switch (rarity) {
        case 'Lendário':
            return {
                border: 'border-[#FFD369]',
                shadow: 'shadow-[0_0_16px_rgba(255,211,105,0.55)]',
                badgeBg: 'bg-[#FFD369]',
                badgeText: 'text-black',
                glowColor: 'rgba(255,211,105,0.55)'
            };
        case 'Épico':
            return {
                border: 'border-[#A855F7]',
                shadow: 'shadow-[0_0_14px_rgba(168,85,247,0.45)]',
                badgeBg: 'bg-[#A855F7]',
                badgeText: 'text-white',
                glowColor: 'rgba(168,85,247,0.45)'
            };
        case 'Raro': // Adding Blue/Cyan for Raro to fit the aesthetic, falling back to Epic-ish structure if needed
            return {
                border: 'border-[#00E8FF]',
                shadow: 'shadow-[0_0_12px_rgba(0,232,255,0.45)]',
                badgeBg: 'bg-[#00E8FF]',
                badgeText: 'text-black',
                glowColor: 'rgba(0,232,255,0.45)'
            };
        default: // Regular
            return {
                border: 'border-[#D5D5D5]',
                shadow: 'shadow-[0_0_10px_rgba(213,213,213,0.35)]',
                badgeBg: 'bg-[#D5D5D5]',
                badgeText: 'text-black',
                glowColor: 'rgba(213,213,213,0.35)'
            };
    }
};

const RarityBadgeV3: React.FC<{ rarity: string }> = React.memo(({ rarity }) => {
    const style = getRarityStyle(rarity);
    return (
        <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${style.badgeBg} ${style.badgeText} shadow-sm`}>
            {rarity}
        </span>
    );
});

const DiscountBadge: React.FC<{ percent: number }> = ({ percent }) => (
    <span className="bg-[#6BFF8A] text-black text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_rgba(107,255,138,0.65)] uppercase tracking-wide flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></span>
        Desconto Ativo -{percent}%
    </span>
);

// --- PURCHASE CONFIRMATION MODAL (MOBILE HYBRID V1) ---
const PurchaseConfirmationModal: React.FC<{
    item: StoreItem | UsableItem;
    user: User;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ item, user, onConfirm, onCancel }) => {
    const finalPrice = calculateDiscountedPrice(item.price, user.plan);
    const canAfford = user.coins >= finalPrice;
    const rarity = 'rarity' in item ? item.rarity : 'Especial'; 

    // Scroll Lock Effect
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Rarity Visuals
    const rarityConfig = {
        'Lendário': { color: 'text-[#FFD369]', bg: 'bg-[#FFD369]/20', border: 'border-[#FFD369]', glow: 'shadow-[0_0_20px_rgba(255,211,105,0.4)]' },
        'Épico': { color: 'text-[#A855F7]', bg: 'bg-[#A855F7]/20', border: 'border-[#A855F7]', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]' },
        'Raro': { color: 'text-[#00E8FF]', bg: 'bg-[#00E8FF]/20', border: 'border-[#00E8FF]', glow: 'shadow-[0_0_20px_rgba(0,232,255,0.4)]' },
        'Regular': { color: 'text-gray-300', bg: 'bg-gray-500/20', border: 'border-gray-500', glow: 'shadow-none' },
        'Especial': { color: 'text-white', bg: 'bg-white/10', border: 'border-white/30', glow: 'shadow-none' }
    };

    // @ts-ignore
    const rStyle = rarityConfig[rarity] || rarityConfig['Regular'];

    return (
        <ModalPortal>
            <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
            >
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in" 
                    onClick={onCancel}
                ></div>

                {/* Modal Card */}
                <div 
                    className="
                        relative z-10 w-full max-w-[400px] bg-[#0e0e0e] border border-[#FFD369] rounded-[22px] 
                        shadow-[0_0_25px_rgba(255,211,105,0.35)] overflow-hidden flex flex-col
                        animate-mobile-snap md:animate-pop-in
                    "
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Glow Line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD369] to-transparent shadow-[0_0_10px_#FFD369]"></div>

                    {/* Close Button (Large for mobile) */}
                    <button 
                        onClick={onCancel}
                        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-[#FFD369] hover:bg-white/10 transition-colors z-30 border border-transparent hover:border-[#FFD369]/30"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Header / Image */}
                    <div className="relative w-full h-40 md:h-48 bg-[#050505] flex items-center justify-center overflow-hidden">
                        <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0e0e0e]/60 to-transparent opacity-90"></div>
                        
                        {/* Floating Icon/Thumb */}
                        <div className={`relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 ${rStyle.border} ${rStyle.glow} overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-500`}>
                            <img src={item.imageUrl} className="w-full h-full object-cover" />
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center relative z-10">
                        
                        {/* Rarity Tag */}
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border mb-3 ${rStyle.bg} ${rStyle.color} ${rStyle.border} ${rStyle.glow}`}>
                            {rarity}
                        </span>

                        <h3 className="text-xl md:text-2xl font-bold text-white font-chakra leading-tight mb-2 px-2">
                            {item.name}
                        </h3>
                        
                        <p className="text-xs text-gray-400 leading-relaxed mb-6 line-clamp-3 max-w-[90%]">
                            {item.description}
                        </p>

                        {/* Divider */}
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#FFD369]/30 to-transparent mb-5"></div>

                        {/* Price Calculation */}
                        <div className="flex flex-col gap-1 mb-6">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Valor a Pagar</span>
                            <div className="flex items-center justify-center gap-2">
                                <CoinIcon className="w-6 h-6 text-[#FFD369]" />
                                <span className="text-3xl md:text-4xl font-black text-[#FFD369] font-chakra text-shadow-glow">
                                    {formatNumber(finalPrice)}
                                </span>
                            </div>
                            {canAfford ? (
                                <div className="text-[10px] font-medium text-green-400 mt-1 bg-green-900/20 px-3 py-1 rounded-lg border border-green-500/30">
                                    Saldo após: {formatNumber(user.coins - finalPrice)} Coins
                                </div>
                            ) : (
                                <div className="text-[10px] font-medium text-red-400 mt-1 bg-red-900/20 px-3 py-1 rounded-lg border border-red-500/30">
                                    Faltam {formatNumber(finalPrice - user.coins)} Coins
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col md:flex-row gap-3 w-full">
                            <button 
                                onClick={onConfirm}
                                disabled={!canAfford}
                                className={`
                                    w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.15em]
                                    text-black shadow-[0_0_20px_rgba(255,211,105,0.3)] transition-all active:scale-[0.98]
                                    flex items-center justify-center gap-2
                                    ${canAfford 
                                        ? 'bg-gradient-to-r from-[#FFD369] to-[#FFB743] hover:shadow-[0_0_30px_rgba(255,211,105,0.5)] hover:scale-[1.02]' 
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none border border-gray-700'}
                                `}
                            >
                                {canAfford ? 'Confirmar Compra' : 'Saldo Insuficiente'}
                            </button>
                            <button 
                                onClick={onCancel}
                                className="w-full md:w-auto md:flex-1 py-4 rounded-xl bg-transparent border border-gray-700 text-gray-400 font-bold text-xs uppercase tracking-wider hover:bg-[#1a1a1a] hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

const CoinProofModal: React.FC<{
    request: CoinPurchaseRequest;
    onClose: () => void;
    onSubmit: (requestId: string, proofDataUrl: string) => void;
}> = ({ request, onClose, onSubmit }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleConfirmSubmit = () => {
        if (previewUrl) {
            onSubmit(request.id, previewUrl);
            onClose();
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
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in" onClick={onClose}></div>

                {/* Modal Card - Gold Glass Neon */}
                <div className="relative z-10 w-full max-w-[420px] bg-[#0d0d0d]/90 border border-[#FFD369] shadow-[0_0_30px_rgba(255,211,105,0.25)] rounded-[22px] overflow-hidden flex flex-col animate-mobile-snap md:animate-pop-in">
                    {/* Top Glow */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD369] to-transparent shadow-[0_0_10px_#FFD369]"></div>
                    
                    <div className="p-6 md:p-8 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-full bg-[#FFD369]/10 border border-[#FFD369]/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(255,211,105,0.15)]">
                            <svg className="w-7 h-7 text-[#FFD369]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        
                        <h2 className="text-2xl font-black text-white font-chakra uppercase tracking-wide mb-1">Comprovante</h2>
                        <p className="text-xs text-[#B3B3B3] mb-6">Envie o comprovante para o pacote <span className="text-[#FFD369] font-bold">"{request.packName}"</span>.</p>
                        
                        {/* Upload Area */}
                        <div className="w-full border-2 border-dashed border-[#333] hover:border-[#FFD369]/50 bg-black/30 rounded-xl mb-6 relative group transition-all duration-300 h-48 flex items-center justify-center overflow-hidden">
                            {!previewUrl ? (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-4">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    <div className="p-3 bg-[#1a1a1a] rounded-full mb-2 group-hover:scale-110 transition-transform border border-white/5">
                                        <svg className="w-6 h-6 text-gray-400 group-hover:text-[#FFD369]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-white uppercase tracking-wider">Clique para enviar</span>
                                    <span className="text-[10px] text-gray-600 mt-1">Imagem ou PDF</span>
                                </label>
                            ) : (
                                <div className="relative w-full h-full">
                                    <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                                    <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center border border-black shadow-lg hover:scale-110 transition-transform">✕</button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col w-full gap-3">
                            <button 
                                onClick={handleConfirmSubmit} 
                                disabled={!selectedFile} 
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD369] to-[#FFB743] text-black font-black text-sm uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,211,105,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all active:scale-[0.98]"
                            >
                                Enviar Comprovante
                            </button>
                            <button 
                                onClick={onClose} 
                                className="w-full py-3.5 rounded-xl bg-transparent border border-[#333] text-gray-400 hover:text-white hover:border-white/20 font-bold text-xs uppercase tracking-wider transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

const CustomCoinPurchaseCard: React.FC<{ 
    onBuy: (coins: number, price: number) => void;
    pendingRequest: CoinPurchaseRequest | undefined;
    onOpenPaymentLink: (requestId: string) => void;
    onPayNow: (requestId: string) => void;
    onCancel: (request: CoinPurchaseRequest) => void;
    onUploadProof: (request: CoinPurchaseRequest) => void;
}> = React.memo(({ onBuy, pendingRequest, onOpenPaymentLink, onPayNow, onCancel, onUploadProof }) => {
    const [customCoins, setCustomCoins] = useState<number | ''>(10);
    const COIN_PRICE_BASE = 5; // R$ 5
    const COIN_AMOUNT_BASE = 10; // per 10 coins

    const price = (typeof customCoins === 'number' ? customCoins : 0) / COIN_AMOUNT_BASE * COIN_PRICE_BASE;

    const handleCoinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomCoins(value === '' ? '' : parseInt(value, 10));
    };

    const handleBlur = () => {
        if (typeof customCoins === 'number') {
            const roundedCoins = Math.round(customCoins / 10) * 10;
            const finalCoins = Math.max(10, roundedCoins);
            setCustomCoins(finalCoins);
        } else {
            setCustomCoins(10);
        }
    };

    const handleBuyClick = () => {
        if (typeof customCoins === 'number' && customCoins > 0) {
            onBuy(customCoins, price);
        }
    };

    // Glass Gold Container Style
    const containerStyle = "bg-[#0D0D0D] p-8 rounded-[22px] border border-[#FFD369]/30 text-center relative overflow-hidden transition-all hover:border-[#FFD369] hover:shadow-[0_0_25px_rgba(255,211,105,0.15)] group flex flex-col items-center min-h-[380px] backdrop-blur-sm";

    if (pendingRequest) {
        const isPendingLink = pendingRequest.status === 'pending_link_generation';
        const isPendingPayment = pendingRequest.status === 'pending_payment';
        const isAwaitingProof = pendingRequest.status === 'awaiting_proof'; // legacy
        const isUnderReview = pendingRequest.status === 'pending_approval' || pendingRequest.status === 'proof_submitted' as any;

        return (
            <div className={containerStyle}>
                <div className="p-5 bg-[#FFD369]/10 rounded-full mb-6 animate-pulse border border-[#FFD369]/30 shadow-[0_0_15px_rgba(255,211,105,0.1)]">
                    <CalculatorIcon className="w-10 h-10 text-[#FFD369]" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white font-chakra uppercase tracking-wide">Pedido Personalizado</h3>
                <p className="text-[#B3B3B3] text-xs font-medium">Solicitação de <span className="text-[#FFD369]">{pendingRequest.coins}</span> moedas ativa.</p>
                 <p className="text-3xl font-black text-white my-6 font-chakra text-shadow-glow">
                    {pendingRequest.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                
                {/* Status Actions */}
                {isPendingLink && (
                     <button 
                        onClick={() => onPayNow(pendingRequest.id)}
                        className="w-full mt-auto bg-gradient-to-r from-[#FFD369] to-[#FFB743] text-black font-black py-3.5 px-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,211,105,0.4)] transition-all uppercase text-xs tracking-widest"
                    >
                        Pagar Agora
                    </button>
                )}

                {(isPendingPayment || isAwaitingProof) && (
                    <div className="w-full flex flex-col gap-2 mt-auto">
                        <button
                            onClick={() => window.open(pendingRequest.paymentLink || '#', '_blank')}
                            className="w-full py-3 rounded-lg bg-[#FFD369] text-black font-bold uppercase text-xs tracking-widest hover:bg-[#FFC107] transition-colors"
                        >
                            Ver Link de Pagamento
                        </button>
                         <button
                            onClick={() => onUploadProof(pendingRequest)}
                            className="w-full py-3 rounded-lg bg-[#A855F7] text-white font-bold uppercase text-xs tracking-widest hover:bg-[#9333EA] transition-colors"
                        >
                            Enviar Comprovante
                        </button>
                         <button
                            onClick={() => onCancel(pendingRequest)}
                            className="w-full py-3 rounded-lg bg-transparent border border-red-500/50 text-red-400 font-bold uppercase text-xs tracking-widest hover:bg-red-900/20 transition-colors"
                        >
                            Cancelar Pedido
                        </button>
                    </div>
                )}

                {isUnderReview && (
                     <div className="w-full mt-auto py-3 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/30 text-[#A855F7] text-center text-xs font-bold uppercase tracking-widest">
                        Em Análise
                     </div>
                )}
            </div>
        )
    }
    
    return (
         <div className={containerStyle}>
            <div className="p-5 bg-white/5 rounded-full mb-6 group-hover:bg-[#FFD369]/10 transition-colors border border-white/10 group-hover:border-[#FFD369]/30">
                <CalculatorIcon className="w-10 h-10 text-[#808080] group-hover:text-[#FFD369] transition-colors" />
            </div>
            <h3 className="text-xl font-bold mb-1 text-white font-chakra uppercase">Personalizado</h3>
            <p className="text-xs text-[#808080] mb-8 uppercase tracking-widest font-bold">Defina seu valor</p>
            
            <div className="w-full mb-6">
                <label htmlFor="custom-coins" className="block text-xs font-bold text-[#808080] uppercase mb-2 text-left tracking-wider">Quantidade de Coins</label>
                <div className="relative group/input">
                    <input
                        type="number"
                        id="custom-coins"
                        value={customCoins}
                        onChange={handleCoinsChange}
                        onBlur={handleBlur}
                        min="10"
                        step="10"
                        placeholder="Ex: 100"
                        className="w-full bg-[#151515] rounded-xl border border-white/10 text-white p-4 text-center text-2xl font-bold focus:ring-1 focus:ring-[#FFD369] focus:border-[#FFD369] outline-none transition-all font-chakra group-hover/input:border-white/20 shadow-inner"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <CoinIcon className="w-6 h-6 text-[#FFD369] opacity-50" />
                    </div>
                </div>
            </div>
            
            <div className="mb-8 w-full flex justify-between items-center px-1 border-t border-white/10 pt-4">
                <span className="text-xs text-[#B3B3B3] font-bold uppercase tracking-wider">Total a Pagar</span>
                <span className="text-xl font-black text-white font-chakra">
                    {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
            
            <button 
                onClick={handleBuyClick}
                disabled={!customCoins || customCoins < 10}
                className="w-full mt-auto bg-gradient-to-r from-[#FFD369] to-[#FFB743] text-black font-black py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,211,105,0.2)] hover:shadow-[0_0_25px_rgba(255,211,105,0.4)] hover:scale-[1.02] uppercase text-xs tracking-widest disabled:shadow-none disabled:bg-gray-800 disabled:text-gray-500"
            >
                Solicitar Compra
            </button>
        </div>
    );
});

const CoinPackCard: React.FC<{ pack: CoinPack, onBuy: (pack: CoinPack) => void; coinPurchaseRequests: CoinPurchaseRequest[] }> = React.memo(({ pack, onBuy, coinPurchaseRequests }) => {
    const isPending = coinPurchaseRequests.some(r => r.packId === pack.id && !['approved', 'rejected', 'cancelled'].includes(r.status));
    
    return (
        <div className={`relative bg-[#0D0D0D] rounded-[22px] border border-[#FFD369]/30 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,211,105,0.15)] hover:border-[#FFD369] group ${pack.isOutOfStock || isPending ? 'opacity-70 pointer-events-none grayscale' : ''} flex flex-col h-[380px]`}>
            <div className="absolute inset-0 z-0">
                {pack.imageUrl ? (
                    <>
                        <img src={pack.imageUrl} alt={pack.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-40 group-hover:opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/80 to-transparent" />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#151515]">
                         <CoinIcon className="w-24 h-24 text-[#222]" />
                    </div>
                )}
            </div>
            
            {/* Popular Badge */}
            {pack.coins >= 500 && (
                <div className="absolute top-4 right-4 z-20 bg-[#FFD369] text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(255,211,105,0.5)]">
                    Mais Popular
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full p-8">
                <div className="text-center mb-auto">
                    <h3 className="text-2xl font-black text-white uppercase tracking-wide font-chakra text-shadow-sm group-hover:text-[#FFD369] transition-colors">{pack.name}</h3>
                    <div className="h-1 w-12 bg-[#FFD369] mx-auto rounded-full mt-4 opacity-60 group-hover:w-24 transition-all duration-500"></div>
                </div>

                <div className="text-center my-6">
                    <div className="flex items-baseline justify-center gap-2">
                        <span className="text-6xl font-black text-[#FFD369] font-chakra text-shadow-glow">{formatNumber(pack.coins)}</span>
                    </div>
                    <p className="text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase mt-2 flex items-center justify-center gap-2">
                        <CoinIcon className="w-4 h-4 text-[#FFD369]" /> Lummi Coins
                    </p>
                </div>
                
                <div className="mt-auto pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                         <span className="text-xs text-[#808080] font-bold uppercase tracking-wider">Preço</span>
                         <span className="text-2xl font-bold text-white font-chakra">R$ {pack.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button 
                        onClick={() => onBuy(pack)} 
                        disabled={pack.isOutOfStock || isPending}
                        className="w-full bg-gradient-to-r from-[#FFD369] to-[#FFB743] text-black font-black py-3.5 px-4 rounded-xl uppercase text-xs tracking-widest shadow-[0_0_15px_rgba(255,211,105,0.3)] hover:shadow-[0_0_25px_rgba(255,211,105,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500"
                    >
                        {pack.isOutOfStock ? 'Esgotado' : isPending ? 'Pedido Aberto' : 'Comprar Agora'}
                    </button>
                </div>
            </div>
        </div>
    );
});

// StoreItemCard updated to Shop V3 (Premium Dopamine Glow)
const StoreItemCard: React.FC<{ item: StoreItem; onRedeem: (item: StoreItem) => void; onPreview: (url: string) => void; user: User; }> = React.memo(({ item, onRedeem, onPreview, user }) => {
    const finalPrice = calculateDiscountedPrice(item.price, user.plan);
    const canAfford = user.coins >= finalPrice;
    const isOutOfStock = item.isOutOfStock;
    
    const hasDiscount = item.price > finalPrice;
    const discountPercent = hasDiscount ? Math.round(((item.price - finalPrice) / item.price) * 100) : 0;
    const showDiscountBadge = (user.plan === 'Artista Profissional' || user.plan === 'Hitmaker') && hasDiscount;
    
    const rarityStyle = getRarityStyle(item.rarity);

    return (
        <div 
            className={`
                group relative flex flex-col h-full bg-[#0C0C0C] rounded-[20px] overflow-hidden transition-all duration-300 
                border-2 hover:scale-[1.02] active:scale-[0.97] active:shadow-none
                ${rarityStyle.border} ${rarityStyle.shadow}
                ${isOutOfStock ? 'opacity-60 grayscale pointer-events-none' : ''}
            `}
        >
             {/* Image Container */}
             <div className="relative aspect-video w-full overflow-hidden">
                <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" 
                />
                {/* Vertical Overlay: Black -> 80% */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent opacity-90" />

                {/* Rarity Tag */}
                <div className="absolute top-3 right-3 z-20">
                   <RarityBadgeV3 rarity={item.rarity} />
                </div>
                
                {/* Preview Button */}
                {item.previewUrl && (
                    <button onClick={(e) => { e.stopPropagation(); onPreview(item.previewUrl!); }} className="absolute bottom-3 left-3 z-20 text-[10px] font-bold uppercase tracking-wider flex items-center hover:underline text-white bg-black/60 px-2.5 py-1.5 rounded border border-white/20 hover:bg-black/80 transition-all backdrop-blur-sm hover:border-[#FFD369]">
                        <span className="mr-1.5 text-[#FFD369]">▶</span> Ver Preview
                    </button>
                )}

                {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-[2px] z-30">
                        <span className="text-white font-bold text-sm uppercase tracking-widest border-2 border-white px-6 py-2 rounded rotate-12">Esgotado</span>
                    </div>
                )}
             </div>

             {/* Content */}
             <div className="p-[22px] flex flex-col flex-grow -mt-2 relative z-10">
                <h3 className="text-lg font-bold text-white font-chakra leading-tight mb-2 line-clamp-2 min-h-[3rem] drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                    {item.name}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mb-6 flex-grow line-clamp-3 font-medium">
                    {item.description}
                </p>

                {/* Price & Action */}
                <div className="mt-auto pt-4 border-t border-white/10">
                   <div className="flex flex-col mb-4">
                         {/* Old Price (Crossed out) */}
                         {hasDiscount && (
                             <span className="text-xs text-[#FF6B6B] line-through font-bold opacity-75 mb-1 block">
                                {formatNumber(item.price)}
                             </span>
                         )}
                         
                         {/* Current Price Badge */}
                         <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                                 <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#FFD369]/10 to-transparent px-2 py-1 rounded-lg border border-[#FFD369]/20 w-fit">
                                    <CoinIcon className="w-5 h-5 text-[#FFD369]" />
                                    <span className="text-xl font-black font-chakra text-[#FFD369] text-shadow-glow">
                                      {formatNumber(finalPrice)}
                                    </span>
                                 </div>
                                 {showDiscountBadge && (
                                     <div className="mt-1.5">
                                         <DiscountBadge percent={discountPercent} />
                                     </div>
                                 )}
                             </div>
                         </div>
                   </div>

                   <button 
                        onClick={() => onRedeem(item)}
                        disabled={!canAfford || isOutOfStock}
                        className={`
                            w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD369] to-[#FFB743] text-black font-black text-sm uppercase tracking-wider 
                            shadow-[0_0_12px_rgba(255,211,105,0.55)] hover:shadow-[0_0_20px_rgba(255,211,105,0.75)] 
                            transition-all active:scale-95 hover:scale-[1.04] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                            flex items-center justify-center gap-2 group/btn border border-[#FFD369]
                        `}
                   >
                      {isOutOfStock ? 'Esgotado' : (
                          <>
                            Resgatar
                            <span className="group-hover/btn:translate-x-1 transition-transform text-lg leading-none">➜</span>
                          </>
                      )}
                   </button>
                </div>
             </div>
        </div>
    );
});

// UsableItemCard updated to Shop V3 (Standardized to Regular/Rare style)
const UsableItemCard: React.FC<{ item: UsableItem; onRedeem: (item: UsableItem) => void; user: User; onUpgradeClick: () => void; }> = React.memo(({ item, onRedeem, user, onUpgradeClick }) => {
    const finalPrice = calculateDiscountedPrice(item.price, user.plan);
    const canAfford = user.coins >= finalPrice;
    const isLocked = user.plan === 'Free Flow';
    const isOutOfStock = item.isOutOfStock;
    
    const hasDiscount = item.price > finalPrice;
    const discountPercent = hasDiscount ? Math.round(((item.price - finalPrice) / item.price) * 100) : 0;
    const showDiscountBadge = (user.plan === 'Artista Profissional' || user.plan === 'Hitmaker') && hasDiscount;

    // Default style for Usable items (Silver/Regular)
    const style = getRarityStyle('Regular');

    return (
        <div 
            className={`
                group relative flex flex-col h-full bg-[#0C0C0C] rounded-[20px] overflow-hidden transition-all duration-300 
                border-2 hover:scale-[1.02] active:scale-[0.97] active:shadow-none
                ${style.border} ${style.shadow}
                ${isOutOfStock ? 'opacity-60 grayscale pointer-events-none' : ''}
            `}
        >
             {/* Image Container */}
             <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#050505]">
                <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100 ${isLocked ? 'blur-[2px] grayscale' : ''}`} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent opacity-90" />

                {isLocked && (
                     <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center z-20 backdrop-blur-sm">
                        <div className="p-3 bg-[#0C0C0C] rounded-full border border-[#FFD369]/30 mb-3 shadow-[0_0_15px_rgba(255,211,105,0.2)]">
                            <LockIcon className="w-6 h-6 text-[#FFD369]" />
                        </div>
                        <span className="text-white font-bold text-xs uppercase tracking-widest border border-white/20 px-3 py-1 rounded-full bg-white/5">Exclusivo</span>
                    </div>
                )}
                
                 {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-[2px] z-30">
                        <span className="text-white font-bold text-sm uppercase tracking-widest border-2 border-white px-6 py-2 rounded rotate-12">Esgotado</span>
                    </div>
                )}
             </div>

             {/* Content */}
             <div className="p-[22px] flex flex-col flex-grow -mt-6 relative z-10">
                <h3 className="text-lg font-bold text-white font-chakra leading-tight mb-2 line-clamp-2 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{item.name}</h3>
                <p className="text-xs text-white/70 leading-relaxed mb-6 flex-grow line-clamp-3 font-medium">{item.description}</p>

                {/* Price & Action */}
                <div className="mt-auto pt-4 border-t border-white/10">
                   <div className="flex flex-col mb-4">
                         {hasDiscount && (
                             <span className="text-xs text-[#FF6B6B] line-through font-bold opacity-75 mb-1 block">
                                {formatNumber(item.price)}
                             </span>
                         )}
                         
                         <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                                 <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#FFD369]/10 to-transparent px-2 py-1 rounded-lg border border-[#FFD369]/20 w-fit">
                                    <CoinIcon className="w-5 h-5 text-[#FFD369]" />
                                    <span className="text-xl font-black font-chakra text-[#FFD369] text-shadow-glow">
                                      {formatNumber(finalPrice)}
                                    </span>
                                 </div>
                                 {showDiscountBadge && (
                                     <div className="mt-1.5">
                                         <DiscountBadge percent={discountPercent} />
                                     </div>
                                 )}
                             </div>
                         </div>
                   </div>

                   {isLocked ? (
                         <button 
                            onClick={onUpgradeClick}
                            className="w-full py-3.5 rounded-xl bg-[#FFD369]/10 text-[#FFD369] border border-[#FFD369]/30 font-bold text-sm uppercase tracking-wide hover:bg-[#FFD369] hover:text-black transition-all hover:shadow-[0_0_15px_rgba(255,211,105,0.3)]"
                        >
                            Fazer Upgrade
                        </button>
                    ) : (
                        <button 
                            onClick={() => onRedeem(item)}
                            disabled={!canAfford || isOutOfStock}
                            className={`
                                w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFD369] to-[#FFB743] text-black font-black text-sm uppercase tracking-wider 
                                shadow-[0_0_12px_rgba(255,211,105,0.55)] hover:shadow-[0_0_20px_rgba(255,211,105,0.75)] 
                                transition-all active:scale-95 hover:scale-[1.04] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                                flex items-center justify-center gap-2 group/btn border border-[#FFD369]
                            `}
                        >
                            {isOutOfStock ? 'Esgotado' : (
                                <>
                                    Resgatar
                                    <span className="group-hover/btn:translate-x-1 transition-transform text-lg leading-none">➜</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
             </div>
        </div>
    );
});

const PreviewModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <ModalPortal>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4" onClick={onClose}>
        <div className="bg-[#121212] p-1 rounded-2xl border border-[#FFD369]/20 relative w-full max-w-4xl aspect-video shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-text-secondary hover:text-white font-bold text-sm z-10 flex items-center gap-2 uppercase tracking-widest transition-colors">
            Fechar ✕
        </button>
        <iframe
            width="100%"
            height="100%"
            src={url.replace("watch?v=", "embed/")}
            title="Preview Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-xl"
        ></iframe>
        </div>
    </div>
  </ModalPortal>
);


interface StoreProps {
    onRedeemSuccess: (info: { item: StoreItem | UsableItem; updatedUser: User }) => void;
}

const faqData = [
    {
        question: "Como consigo mais Lummi Coins?",
        answer: "Você ganha Lummi Coins completando missões, fazendo check-in diário, subindo de nível e participando de eventos. Você também pode comprar pacotes de moedas na aba 'Comprar Lummi Coins'."
    },
    {
        question: "O que significam as raridades?",
        answer: "A raridade indica a exclusividade e complexidade de um item. Itens Lendários são os mais raros e geralmente oferecem as recompensas visuais mais elaboradas."
    },
    {
        question: "Resgatei uma recompensa visual. E agora?",
        answer: "Após resgatar uma recompensa visual, ela aparecerá no seu Inventário. Você precisará ir até lá e clicar em 'Utilizar' para preencher um formulário com os detalhes da sua música e ideia. Depois disso, nossa equipe de produção começará a trabalhar no seu item!"
    },
    {
        question: "Por que alguns itens estão bloqueados?",
        answer: "Alguns dos nossos itens mais poderosos são benefícios exclusivos para artistas com planos pagos ('Artista em Ascensão' ou superior). Você pode fazer um upgrade na página de Assinaturas para desbloquear o acesso."
    },
    {
        question: "Como funciona a compra de moedas?",
        answer: "Após solicitar um pacote de moedas, você será direcionado para efetuar o pagamento. Depois, basta enviar o comprovante na aba 'Meus Pedidos'. Nossa equipe irá revisar e aprovar o pedido, e as moedas serão adicionadas à sua conta."
    }
];

const StatusBadge: React.FC<{ status: CoinPurchaseRequest['status'] }> = ({ status }) => {
    const styles = {
        pending_link_generation: 'bg-blue-900/20 text-blue-400 border-blue-500/30',
        pending_payment: 'bg-[#FFD369]/10 text-[#FFD369] border-[#FFD369]/30 animate-pulse',
        waiting_payment: 'bg-[#FFD369]/10 text-[#FFD369] border-[#FFD369]/30 animate-pulse', // Alias
        awaiting_proof: 'bg-[#FFD369]/10 text-[#FFD369] border-[#FFD369]/30',
        proof_submitted: 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30', // Mapped to pending_approval
        pending_approval: 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30',
        approved: 'bg-[#6BFF8A]/10 text-[#6BFF8A] border-[#6BFF8A]/30',
        rejected: 'bg-red-900/20 text-red-400 border-red-500/30',
        cancelled: 'bg-gray-800 text-gray-400 border-gray-600',
    };
    const text = {
        pending_link_generation: 'Criado - Aguardando',
        pending_payment: 'Aguardando Pagamento',
        waiting_payment: 'Aguardando Pagamento',
        awaiting_proof: 'Aguardando Comprovante',
        proof_submitted: 'Em Análise',
        pending_approval: 'Em Análise',
        approved: 'Aprovado',
        rejected: 'Rejeitado',
        cancelled: 'Cancelado',
    };
    // @ts-ignore
    return <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${styles[status] || styles.cancelled}`}>{text[status] || status}</span>
};

const Store: React.FC<StoreProps> = ({ onRedeemSuccess }) => {
    useEffect(() => {
        Perf.mark('store_mount');
        Perf.trackRender('Store');
        return () => { Perf.end('store_mount'); };
    }, []);

    const { state, dispatch } = useAppContext();
    const { activeUser: currentUser, storeInitialTab } = state;
    
    const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
    const [usableItems, setUsableItems] = useState<UsableItem[]>([]);
    const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
    const [coinPurchaseRequests, setCoinPurchaseRequests] = useState<CoinPurchaseRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastLoadRef = useRef<number>(0);
    const CACHE_TTL_MS = 30_000;

    const [activeTab, setActiveTab] = useState<StoreTab>(storeInitialTab);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [requestForProof, setRequestForProof] = useState<CoinPurchaseRequest | null>(null);
    const [purchaseSuccessInfo, setPurchaseSuccessInfo] = useState<{ packName: string } | null>(null);
    
    // New state for Confirmation Modal
    const [itemToConfirm, setItemToConfirm] = useState<StoreItem | UsableItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchData = useCallback(async (force = false) => {
        if (!currentUser) return;
        const now = Date.now();
        if (!force && lastLoadRef.current && now - lastLoadRef.current < CACHE_TTL_MS) {
            return;
        }
        lastLoadRef.current = now;
        setIsLoading(true);
        setError(null);
        Perf.mark('store_fetch');
        try {
            const result = await api.fetchStoreData(currentUser.id);
            if (result.success && result.data) {
                setStoreItems(result.data.storeItems);
                setUsableItems(result.data.usableItems);
                setCoinPacks(result.data.coinPacks);
                setCoinPurchaseRequests(result.data.coinPurchaseRequests);
            } else {
                 setError("Failed to load data");
            }
        } catch (error) {
            console.error("Failed to fetch store data:", error);
            setError("Não foi possível carregar os dados da loja. Tente novamente mais tarde.");
        } finally {
            setIsLoading(false);
            Perf.end('store_fetch');
        }
    }, [currentUser]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        lastLoadRef.current = 0;
    }, [currentUser?.id]);

    useEffect(() => {
        setActiveTab(storeInitialTab);
    }, [storeInitialTab]);
    
    const processApiResponse = (response: any) => {
        if (response.updatedUser) {
            dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
        }
        if (response.notifications) {
            dispatch({ type: 'ADD_NOTIFICATIONS', payload: response.notifications });
        }
    };

    const handleRedeemItem = useCallback(async (item: StoreItem | UsableItem) => {
        if (!currentUser || isProcessing) return; // Race guard
        setIsProcessing(true);
        
        // Use updated API that delegates to StoreEngine
        const response = await api.redeemItem(currentUser.id, item.id);

        if (!response?.success) {
            const err = (response?.error || '').toString();

            if (err === 'item_already_owned') {
                dispatch({
                    type: 'ADD_TOAST',
                    payload: {
                        id: Date.now().toString(),
                        type: 'info',
                        title: 'Você já possui este item',
                        message: 'Esse item já está no seu inventário.',
                    }
                });
            } else if (err === 'insufficient_balance') {
                dispatch({
                    type: 'ADD_TOAST',
                    payload: {
                        id: Date.now().toString(),
                        type: 'error',
                        title: 'Saldo insuficiente',
                        message: 'Você não tem LC suficiente para comprar este item.',
                    }
                });
            } else {
                dispatch({
                    type: 'ADD_TOAST',
                    payload: {
                        id: Date.now().toString(),
                        type: 'error',
                        title: 'Compra não concluída',
                        message: err || 'Não foi possível finalizar a compra.',
                    }
                });
            }

            setIsProcessing(false);
            return;
        }
        
        if (response.notifications) {
            dispatch({ type: 'ADD_NOTIFICATIONS', payload: response.notifications });
        }
        
        if (response.success && response.updatedUser) {
            // Critical: Dispatch User Update immediately
            dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
            onRedeemSuccess({ item, updatedUser: response.updatedUser });
            await fetchData(true);
        }
        setIsProcessing(false);
    }, [currentUser, isProcessing, dispatch, onRedeemSuccess, fetchData]);
    
    // Helper to open modal
    const handleRequestPurchase = useCallback((item: StoreItem | UsableItem) => {
        setItemToConfirm(item);
    }, []);

    // Handler for modal confirmation
    const handleConfirmPurchase = useCallback(() => {
        if (itemToConfirm) {
            handleRedeemItem(itemToConfirm);
            setItemToConfirm(null);
        }
    }, [itemToConfirm, handleRedeemItem]);

    const handleNavigateToSubscriptions = useCallback(() => {
        dispatch({ type: 'SET_VIEW', payload: 'subscriptions' });
    }, [dispatch]);

    // Creates the request in pending state
    const handleBuyCoinPack = async (pack: CoinPack) => {
        if (!currentUser || isProcessing) return;
        setIsProcessing(true);
        const response = await api.buyCoinPack(currentUser.id, pack);
        processApiResponse(response);
        if (response.success) {
            setPurchaseSuccessInfo({ packName: pack.name });
            await fetchData(true);
        }
        setIsProcessing(false);
    };

    // Transitions from pending to waiting payment (generates link)
    const handlePayNow = async (requestId: string) => {
         if (!currentUser || isProcessing) return;
         setIsProcessing(true);
         const response = await api.initiatePayment(requestId);
         if(response.success) {
             await fetchData(true);
         }
         setIsProcessing(false);
    };

    const handleBuyCustomCoinPack = async (coins: number, price: number) => {
        if (!currentUser) return;
        const response = await api.buyCustomCoinPack(currentUser.id, coins, price);
        processApiResponse(response);
        if (response.success) await fetchData(true);
    };
    
    const handleSubmitCoinPurchaseProof = async (requestId: string, proofDataUrl: string) => {
        if (!currentUser) return;
        const response = await api.submitCoinPurchaseProof(currentUser.id, requestId, proofDataUrl);
        processApiResponse(response);
        if(response.updatedRequest) await fetchData(true);
    };

    const handleOpenPaymentLink = async (requestId: string) => {
        const request = coinPurchaseRequests.find(r => r.id === requestId);
        if (request?.paymentLink) {
            window.open(request.paymentLink, '_blank');
        }
        const response = await api.openPaymentLink(requestId);
        if(response.updatedRequest) await fetchData(true);
    };
    
    const handleCancelCoinPurchase = async (request: CoinPurchaseRequest) => {
        const response = await api.cancelCoinPurchaseRequest(request.id);
        processApiResponse(response);
        if(response.updatedRequest) await fetchData(true);
    };

    const handlePurchaseSuccessNavigate = () => {
        fetchData(true); 
        setPurchaseSuccessInfo(null);
        setActiveTab('orders');
    };

    const handleClosePurchaseSuccessModal = () => {
        fetchData(true);
        setPurchaseSuccessInfo(null);
    };

    if (isLoading || !currentUser) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[#FFD369] shadow-[0_0_20px_rgba(255,211,105,0.4)]"></div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-brand-red/5 border border-brand-red/20 rounded-xl p-8 text-center">
                <h3 className="text-2xl font-bold text-brand-red">Ocorreu um Erro</h3>
                <p className="text-text-secondary mt-2">{error}</p>
            </div>
        );
    }

    const pendingUserActionCount = coinPurchaseRequests.filter(r => r.status === 'pending_payment' || r.status === 'awaiting_proof' || r.status === 'pending_link_generation').length;
    const pendingCustomRequest = coinPurchaseRequests.find(r => r.packId.startsWith('custom-') && !['approved', 'rejected', 'cancelled'].includes(r.status));

    const ActionButtons = ({ request }: { request: CoinPurchaseRequest }) => {
         // FIX-PACK LOJA V1.0: Updated Flow Logic
         
         // 1. Pagar Agora (Starts Payment Flow)
         if (request.status === 'pending_link_generation') {
             return (
                <div className="flex flex-col gap-2 w-full">
                    <button 
                         onClick={() => handlePayNow(request.id)}
                         className="w-full py-3 rounded-lg bg-gradient-to-r from-[#FFD369] to-[#F6C560] text-black font-bold uppercase text-xs tracking-widest hover:shadow-lg transition-all active:scale-95 shadow-md"
                    >
                        Pagar Agora
                    </button>
                    <button 
                        onClick={() => handleCancelCoinPurchase(request)} 
                        className="w-full py-3 rounded-lg bg-transparent border border-red-500/30 text-red-400 font-bold uppercase text-xs tracking-widest hover:bg-red-900/10 transition-colors"
                    >
                        Cancelar Pedido
                    </button>
                </div>
             );
         }

         const isWaitingPayment = request.status === 'pending_payment'; // Mapped to "waiting_payment" visual
         const isAwaitingProof = request.status === 'awaiting_proof';

         // 2. Payment Flow (Link + Proof)
         if (isWaitingPayment || isAwaitingProof) {
             return (
                 <div className="flex flex-col gap-2 w-full">
                    {(request.paymentLink && request.paymentLink !== '#') && (
                        <button 
                            onClick={() => window.open(request.paymentLink, '_blank')} 
                            className="w-full py-3 rounded-lg bg-[#FFD369] text-black font-bold uppercase text-xs tracking-widest hover:bg-[#FFC107] transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                             <span>🔗 Ver Link de Pagamento</span>
                        </button>
                    )}
                    
                    <button 
                        onClick={() => setRequestForProof(request)} 
                        className="w-full py-3 rounded-lg bg-[#A855F7] text-white font-bold uppercase text-xs tracking-widest hover:bg-[#9333EA] transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <span>📤 Enviar Comprovante</span>
                    </button>

                    <button 
                        onClick={() => handleCancelCoinPurchase(request)} 
                        className="w-full py-3 rounded-lg bg-transparent border border-red-500/50 text-red-400 font-bold uppercase text-xs tracking-widest hover:bg-red-900/20 transition-colors"
                    >
                        Cancelar Pedido
                    </button>
                 </div>
             );
         }

         if (request.status === 'pending_approval' || request.status === 'proof_submitted' as any) {
             return <div className="w-full py-3 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/30 text-[#A855F7] text-center text-xs font-bold uppercase tracking-widest">Comprovante enviado — Aguardando aprovação</div>
         }

         if (request.status === 'approved') {
             return <div className="w-full py-3 rounded-lg bg-[#27AE60]/10 border border-[#27AE60]/30 text-[#27AE60] text-center text-xs font-bold uppercase tracking-widest">Pagamento aprovado — Coins adicionadas!</div>
         }

         if (request.status === 'rejected') {
             return <div className="w-full py-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-center text-xs font-bold uppercase tracking-widest">Pagamento rejeitado</div>
         }
         
         return null;
    };

    return (
        <div className="animate-fade-in-up space-y-10 md:space-y-14 pb-12">
            
            {/* HEADER */}
            <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
                <h2 className="text-4xl md:text-6xl font-black text-white font-chakra tracking-tight mb-2 drop-shadow-lg uppercase text-shadow-glow">LOJA</h2>
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#FFD369] to-transparent mx-auto mb-4 opacity-70"></div>
                <p className="text-base md:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed font-medium">
                    Use seus Lummi Coins para adquirir recursos visuais, boosts e itens exclusivos para sua carreira.
                </p>
            </div>
            
            {/* TABS NAV (V1.0 Gold Neon Update) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-5 max-w-6xl mx-auto mb-12 relative z-20 px-2 md:px-0">
                <div className="flex flex-col md:flex-row w-full md:w-auto gap-3 md:gap-4 items-center">
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto max-w-[92%] md:max-w-none mx-auto md:mx-0">
                        <TabButton active={activeTab === 'redeem'} onClick={() => setActiveTab('redeem')}>Recompensas</TabButton>
                        <TabButton active={activeTab === 'usable'} onClick={() => setActiveTab('usable')}>Utilizáveis</TabButton>
                        <TabButton active={activeTab === 'buy'} onClick={() => setActiveTab('buy')}>Comprar Coins</TabButton>
                    </div>
                </div>
                
                <div className="w-full md:w-auto max-w-[92%] md:max-w-none mx-auto md:mx-0 md:ml-auto relative">
                     <button
                        onClick={() => setActiveTab('orders')}
                        className={`
                            w-full md:w-auto md:min-w-[180px] py-2.5 px-6 rounded-[14px] text-center font-bold uppercase tracking-wider transition-all duration-200 ease-out
                            flex items-center justify-center gap-3 text-xs md:text-sm
                            bg-[#0C0C0C] border border-[#FFD369]/35 text-[#F7D98F] shadow-[0_0_12px_rgba(255,204,0,0.25)] 
                            hover:shadow-[0_0_16px_rgba(255,204,0,0.45)] hover:border-[#FFD369]/60 hover:-translate-y-[1px]
                            ${activeTab === 'orders' ? 'ring-1 ring-[#FFD369] bg-[#FFD369]/10' : ''}
                        `}
                        style={{ height: '80%' }} 
                    >
                         <span className="text-[#F7D98F]/45 text-lg">🧾</span>
                         Meus Pedidos
                        {pendingUserActionCount > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFD369] text-[#0C0C0C] text-[10px] font-black shadow-sm ml-1">
                                {pendingUserActionCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {activeTab === 'redeem' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 gap-y-8">
                    {storeItems.map((item) => <StoreItemCard key={item.id} item={item} onRedeem={handleRequestPurchase} user={currentUser} onPreview={setPreviewUrl} />)}
                </div>
            )}

            {activeTab === 'usable' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 gap-y-8">
                    {usableItems.map((item) => <UsableItemCard key={item.id} item={item} onRedeem={handleRequestPurchase} user={currentUser} onUpgradeClick={handleNavigateToSubscriptions} />)}
                </div>
            )}

            {activeTab === 'buy' && (
                 <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 gap-y-8">
                        <CustomCoinPurchaseCard 
                            onBuy={handleBuyCustomCoinPack} 
                            pendingRequest={pendingCustomRequest} 
                            onOpenPaymentLink={handleOpenPaymentLink} 
                            onPayNow={handlePayNow}
                            onCancel={handleCancelCoinPurchase}
                            onUploadProof={setRequestForProof}
                        />
                        {coinPacks.map((pack) => (
                            <CoinPackCard key={pack.id} pack={pack} onBuy={handleBuyCoinPack} coinPurchaseRequests={coinPurchaseRequests} />
                        ))}
                    </div>
                 </>
            )}

            {activeTab === 'orders' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 gap-y-8">
                    {coinPurchaseRequests.length > 0 ? coinPurchaseRequests.map(request => (
                         <div key={request.id} className="bg-[#0D0D0D] p-6 rounded-[22px] border border-[#FFD369]/30 flex flex-col h-full relative overflow-hidden shadow-lg hover:border-[#FFD369]/60 transition-colors">
                             <div className="flex justify-between items-start mb-4">
                                 <div>
                                     <p className="text-xs text-[#808080] font-bold uppercase tracking-wider mb-1">Pacote</p>
                                     <h3 className="text-lg font-bold text-white font-chakra uppercase">{request.packName}</h3>
                                 </div>
                                 <StatusBadge status={request.status} />
                             </div>
                             
                             <div className="mb-6">
                                 <p className="text-xs text-[#808080] font-bold uppercase tracking-wider mb-1">Valor</p>
                                 <div className="flex items-center gap-2">
                                    <CoinIcon className="w-4 h-4 text-[#FFD369]" />
                                    <span className="text-xl font-bold text-white">{request.coins}</span>
                                    <span className="text-sm text-[#808080]">| R$ {request.price.toFixed(2).replace('.', ',')}</span>
                                 </div>
                             </div>
                             
                             <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-3">
                                 <ActionButtons request={request} />
                             </div>
                         </div>
                    )) : (
                        <div className="col-span-full text-center py-20 border-2 border-dashed border-[#333] rounded-[22px] bg-[#0D0D0D]/50">
                            <p className="text-[#808080] text-sm font-bold uppercase tracking-widest">Nenhum pedido encontrado.</p>
                        </div>
                    )}
                </div>
            )}

            {purchaseSuccessInfo && (
                <CoinPurchaseSuccessModal 
                    packName={purchaseSuccessInfo.packName} 
                    onClose={handleClosePurchaseSuccessModal} 
                    onNavigate={handlePurchaseSuccessNavigate} 
                />
            )}

            {requestForProof && (
                <CoinProofModal
                    request={requestForProof}
                    onClose={() => setRequestForProof(null)}
                    onSubmit={handleSubmitCoinPurchaseProof}
                />
            )}

            {previewUrl && (
                <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
            )}

            {/* Confirmation Modal for Purchase (Hybrid Mobile) */}
            {itemToConfirm && (
                 <PurchaseConfirmationModal 
                    item={itemToConfirm}
                    user={currentUser}
                    onConfirm={handleConfirmPurchase}
                    onCancel={() => setItemToConfirm(null)}
                 />
            )}
            
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

export default Store;
