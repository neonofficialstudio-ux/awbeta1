
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import type { SubscriptionPlan, User, IconComponent } from '../types';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import ConfirmationModal from './admin/ConfirmationModal';
import { StarIcon, CheckIcon, CrownIcon, ShieldIcon, TrendingUpIcon, CoinIcon, XPIcon, QueueIcon, DiscountIcon, VipIcon, MissionIcon, StoreIcon } from '../constants';
import { PLANS } from '../api/subscriptions/constants';
import { normalizePlanId } from '../api/subscriptions/normalizePlan';
import { getMyPlanBenefits, type MyPlanBenefits } from '../api/subscriptions/planBenefits';
import { getAllPlanOffers, type PlanOffer } from '../api/subscriptions/planOffers';
import FaqItem from './ui/patterns/FaqItem';
import { createPagbankCheckout, verifyPagbankCheckout } from '../api/subscriptions/pagbankCheckout';
import { ProfileSupabase } from '../api/supabase/profile';

// --- THEME CONFIGURATION ---

const PLAN_THEMES: Record<string, {
    borderColor: string;
    glowColor: string;
    accentColor: string;
    bgGradient: string;
    microText: string;
    iconAnimation: string;
}> = {
    'Free Flow': {
        borderColor: 'border-[#3CFFF8]', // Cyan Electric
        glowColor: 'shadow-[0_0_30px_rgba(60,255,248,0.15)]',
        accentColor: 'text-[#3CFFF8]',
        bgGradient: 'from-[#0D0F12] via-[#14171C] to-[#0D0F12]', // Darker base
        microText: "Comece sua jornada",
        iconAnimation: 'animate-pulse',
    },
    'Artista em Ascensão': {
        borderColor: 'border-[#FF3CE6]', // Pink Neon
        glowColor: 'shadow-[0_0_30px_rgba(255,60,230,0.15)]',
        accentColor: 'text-[#FF3CE6]',
        bgGradient: 'from-[#1a0b2e] via-[#14171C] to-[#0D0F12]', // Slight purple tint
        microText: "Dê seu primeiro salto",
        iconAnimation: 'animate-bounce',
    },
    'Artista Profissional': {
        borderColor: 'border-[#A66BFF]', // Purple Royal
        glowColor: 'shadow-[0_0_40px_rgba(166,107,255,0.2)]',
        accentColor: 'text-[#A66BFF]',
        bgGradient: 'from-[#1e1b4b] via-[#14171C] to-[#0D0F12]', // Deep blue/purple
        microText: "Cresça de verdade",
        iconAnimation: 'animate-pulse', 
    },
    'Hitmaker': {
        borderColor: 'border-[#3CFF9A]', // Emerald Pulse
        glowColor: 'shadow-[0_0_50px_rgba(60,255,154,0.25)]',
        accentColor: 'text-[#3CFF9A]',
        bgGradient: 'from-[#064e3b] via-[#14171C] to-[#0D0F12]', // Emerald tint
        microText: "Busque o topo",
        iconAnimation: 'animate-[pulse_2s_ease-in-out_infinite]',
    }
};

const DEFAULT_THEME = PLAN_THEMES['Free Flow'];

// --- COMPONENTS ---

const PlanBadge: React.FC<{text: string, className: string}> = ({text, className}) => (
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-b-xl z-30 shadow-lg border-b border-x border-white/10 backdrop-blur-md ${className} animate-fade-in-up`}>
        {text}
    </div>
);

const PlanFeatureItem: React.FC<{ text: string; icon: IconComponent | undefined, accentColor: string }> = ({ text, icon: Icon, accentColor }) => {
    // Safe Fallback for Icon to prevent crash
    const ValidIcon = Icon || StarIcon;
    return (
        <li className="flex items-start gap-3 text-sm text-gray-300 group/item transition-all duration-300 hover:translate-x-1">
            <div className={`mt-0.5 p-1 rounded-full bg-white/5 border border-white/10 group-hover/item:border-${accentColor.replace('text-', '')} transition-colors`}>
                <ValidIcon className={`w-3 h-3 ${accentColor} group-hover/item:scale-110 transition-transform`} />
            </div>
            <span className="leading-relaxed font-medium text-gray-400 group-hover/item:text-white transition-colors">{text}</span>
        </li>
    );
};

const PlanCard: React.FC<{ 
    plan: SubscriptionPlan; 
    currentUser: User; 
    isCheckoutDisabled: boolean;
    isCheckoutLoading: boolean;
    onStartCheckout: (plan: SubscriptionPlan) => void;
}> = ({ plan, currentUser, isCheckoutDisabled, isCheckoutLoading, onStartCheckout }) => {
    const { icon: Icon } = plan;
    const PlanIcon = Icon || StarIcon; // Safe fallback
    
    const isCurrentPlan = plan.name === currentUser.plan;
    const theme = PLAN_THEMES[plan.name] || DEFAULT_THEME;
    // Dynamic Border Logic
    const borderClass = isCurrentPlan 
        ? 'border-[#FFD36A] shadow-[0_0_30px_rgba(255,211,106,0.4)] scale-[1.02] z-20 ring-1 ring-[#FFD36A]/50' 
        : `${theme.borderColor} hover:${theme.borderColor} hover:${theme.glowColor} border-opacity-30 hover:border-opacity-100 hover:scale-[1.02] hover:-translate-y-2`;

    const buttonBase = `
        w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.15em] 
        transition-all duration-300 transform active:scale-[0.98] 
        shadow-lg relative overflow-hidden group/btn border
    `;

    const renderButton = () => {
        if (isCurrentPlan) {
            return (
                <button disabled className={`${buttonBase} bg-[#0F2816] border-[#3CFF9A] text-[#3CFF9A] cursor-default shadow-[0_0_15px_rgba(60,255,154,0.2)]`}>
                    <span className="flex items-center justify-center gap-2 relative z-10">
                        <CheckIcon className="w-5 h-5 animate-bounce"/> SEU PLANO ATUAL
                    </span>
                    {/* Aura Gold Effect behind active button */}
                    <div className="absolute inset-0 bg-[#3CFF9A]/10 animate-pulse-slow"></div>
                </button>
            );
        }

        if (plan.name === 'Free Flow') {
             return (
                 <div className="w-full py-4 text-center text-xs text-gray-600 font-mono uppercase tracking-widest border border-transparent">
                     Plano Inicial
                 </div>
             );
        }
        
        const isDisabled = isCheckoutDisabled;

        return (
             <button 
                onClick={() => onStartCheckout(plan)}
                disabled={isDisabled}
                className={`${buttonBase} ${isDisabled ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-[#FFB631] to-[#FFD36A] text-[#0D0F12] border-[#FFD36A] hover:shadow-[0_0_30px_rgba(255,211,106,0.6)] hover:brightness-110'}`}
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {isCheckoutLoading ? <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'ASSINAR'}
                </span>
                {!isDisabled && <div className="absolute inset-0 bg-white/40 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 skew-y-12 ease-out"></div>}
            </button>
        );
    };

    return (
        <div className={`
            relative flex flex-col h-full transition-all duration-500 group rounded-[32px] 
            bg-gradient-to-b ${theme.bgGradient} border-2 ${borderClass} overflow-hidden
            backdrop-blur-md
        `}>
            {/* Background Noise Texture */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>
            
            {/* Shine Effect on Hover */}
            <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shine-sweep duration-1000"></div>
            </div>
            
            {/* Hitmaker Special Glow */}
            {plan.name === 'Hitmaker' && (
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#3CFF9A]/20 blur-[80px] rounded-full pointer-events-none animate-pulse-slow"></div>
            )}

            {/* Badges */}
            {plan.highlight && !isCurrentPlan && <PlanBadge text="Mais Popular" className="bg-[#A66BFF] text-white border-[#A66BFF]/50 shadow-[#A66BFF]/40" />}
            {isCurrentPlan && <div className="absolute top-4 right-4 w-3 h-3 bg-[#3CFF9A] rounded-full shadow-[0_0_10px_#3CFF9A] animate-pulse z-30"></div>}

            <div className="p-8 flex flex-col h-full relative z-10">
                
                {/* Header Icon */}
                <div className="flex justify-center mb-6">
                    <div className={`
                        p-5 rounded-2xl bg-black/40 border border-white/10 shadow-2xl 
                        group-hover:scale-110 transition-transform duration-500
                        group-hover:border-${theme.accentColor.replace('text-', '')}/50
                        relative overflow-hidden
                    `}>
                         <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-${theme.accentColor.replace('text-', '')}`}></div>
                         <PlanIcon className={`w-10 h-10 ${theme.accentColor} ${theme.iconAnimation} drop-shadow-lg`} />
                    </div>
                </div>

                {/* Title & Emotional Microtext */}
                <div className="text-center mb-6">
                    <h3 className={`text-2xl font-black font-chakra uppercase tracking-wide text-white group-hover:text-shadow-glow transition-all`}>
                        {plan.name}
                    </h3>
                    <p className={`text-xs font-bold uppercase tracking-[0.15em] mt-2 ${theme.accentColor} opacity-80 group-hover:opacity-100 transition-opacity`}>
                        {theme.microText}
                    </p>
                </div>

                {/* Price */}
                <div className="text-center mb-8 relative">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <div className="relative inline-block bg-[#0D0F12]/80 px-4 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                        {plan.price.includes('/') ? (
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl md:text-5xl font-black font-chakra text-white tracking-tighter drop-shadow-md">{plan.price.split('/')[0]}</span>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">/{plan.price.split('/')[1]}</span>
                            </div>
                        ) : (
                            <span className="text-4xl font-black font-chakra text-white">{plan.price}</span>
                        )}
                    </div>
                </div>
                
                {/* Separator */}
                <div className={`h-px w-full bg-gradient-to-r from-transparent via-${theme.accentColor.replace('text-', '')}/30 to-transparent mb-8 opacity-50 group-hover:opacity-100 transition-opacity`}></div>

                {/* Features */}
                <ul className="space-y-4 mb-10 flex-grow">
                    {plan.features.map((feature, index) => (
                        <PlanFeatureItem key={index} text={feature.text} icon={feature.icon} accentColor={theme.accentColor} />
                    ))}
                </ul>

                {/* Action */}
                <div className="mt-auto">
                    {renderButton()}
                </div>
            </div>
            
            {/* Bottom Gradient Fade */}
            <div className={`absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-${theme.accentColor.replace('text-', '')}/5 to-transparent pointer-events-none`}></div>
        </div>
    );
};

const UnlockItem: React.FC<{ icon: IconComponent; title: string; delay: string }> = ({ icon: Icon, title, delay }) => (
    <div 
        className="flex items-center gap-4 p-4 bg-[#121212] border border-[#FFD36A]/20 rounded-xl animate-fade-in-up hover:border-[#FFD36A] hover:bg-[#FFD36A]/5 transition-all group"
        style={{ animationDelay: delay }}
    >
        <div className="p-3 rounded-full bg-[#FFD36A]/10 border border-[#FFD36A]/20 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-[#FFD36A]" />
        </div>
        <span className="font-bold text-white font-chakra uppercase tracking-wide text-sm">{title}</span>
    </div>
);

const Subscriptions: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { activeUser: currentUser } = state;
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<{ message: string; code?: string } | null>(null);
  const [verificationState, setVerificationState] = useState<'idle' | 'verifying' | 'success' | 'timeout'>('idle');
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{ checkoutId: string; referenceId: string } | null>(null);
  const [myBenefits, setMyBenefits] = useState<MyPlanBenefits | null>(null);
  const [planOffers, setPlanOffers] = useState<PlanOffer[]>([]);

  const faqItems = [
    {
        question: "Como funcionam os pagamentos?",
        answer: "Os pagamentos são realizados no checkout externo PagBank. Ao retornar para a plataforma, confirmamos automaticamente e liberamos o seu plano."
    },
    {
        question: "Posso cancelar a qualquer momento?",
        answer: "Sim, você pode cancelar sua assinatura a qualquer momento. Ao cancelar, você retornará ao plano 'Free Flow' e seus benefícios de assinante permanecerão ativos até o final do ciclo de pagamento atual."
    },
    {
        question: "O que acontece se eu fizer um upgrade?",
        answer: "Ao fazer um upgrade, seu novo plano e benefícios se tornam ativos assim que o pagamento for aprovado. O valor pago é referente ao período do novo plano, sem pro-rata do plano anterior."
    },
    {
        question: "Os descontos na loja são aplicados automaticamente?",
        answer: "Sim! Se o seu plano inclui descontos na loja, os preços dos itens já aparecerão com o desconto aplicado para você."
    },
    {
        question: "O que são Lummi Coins e como posso ganhá-las?",
        answer: "Lummi Coins são a moeda virtual da plataforma. Você as ganha completando missões, fazendo check-in diário e subindo de nível. Com elas, você pode resgatar serviços visuais exclusivos na Loja, como avatares 3D e animações, além de itens que impulsionam sua carreira. Elas não expiram!"
    },
  ];

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const [{ plans: plansData }, myB, offers] = await Promise.all([
        api.fetchSubscriptionsPageData(currentUser.id),
        getMyPlanBenefits(),
        getAllPlanOffers(),
      ]);
      
      // PATCH: SUBSCRIPTIONS_FIX_V2 (normalize + dedupe + ensure Free Flow has complete info)
      const normalizeFeature = (s: string) => {
        const raw = String(s ?? '').trim();
        const k = raw
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s%/x]/g, '')
          .trim();

        // Coins multiplier
        const mCoins = raw.match(/(?:coins|multiplicador de coins)\s*x?\s*(\d+)/i);
        if (mCoins?.[1]) {
          const n = Number(mCoins[1]);
          return { key: `coins_x_${n}`, text: `Coins x${n}`, icon: TrendingUpIcon };
        }

        // Mission limit
        if (k.includes('miss') && k.includes('ilimit')) {
          return { key: 'missions_unlimited', text: 'Missões ilimitadas', icon: MissionIcon };
        }
        const mMiss = raw.match(/(?:ate|até)\s*(\d+)\s*miss/i);
        if (mMiss?.[1]) {
          const n = Number(mMiss[1]);
          return { key: `missions_day_${n}`, text: `Até ${n} missões/dia`, icon: MissionIcon };
        }

        // Store discount
        const mDisc = raw.match(/(\d+)\s*%.*(loja)/i) || raw.match(/desconto.*?(\d+)\s*%/i);
        if (mDisc?.[1]) {
          const p = Number(mDisc[1]);
          return { key: `store_discount_${p}`, text: `Desconto na Loja ${p}%`, icon: DiscountIcon };
        }

        // Common perks
        if (k.includes('recompens') && k.includes('visual')) {
          return { key: 'visual_rewards', text: 'Acesso a Recompensas Visuais', icon: StoreIcon };
        }
        if (k.includes('fila') && k.includes('prior')) {
          return { key: 'queue_priority', text: 'Fila Prioritária', icon: QueueIcon };
        }
        if (k.includes('vip') && k.includes('evento')) {
          return { key: 'events_vip', text: 'Acesso VIP a Eventos', icon: CrownIcon };
        }
        if (k.includes('acesso') && k.includes('loja')) {
          return { key: 'store_access', text: 'Acesso total à Loja', icon: StoreIcon };
        }
        if (k.includes('acesso') && k.includes('bas')) {
          return { key: 'basic_access', text: 'Acesso Básico', icon: StarIcon };
        }

        // Fallback: keep text but stable key
        return { key: `txt_${k}`, text: raw, icon: StarIcon };
      };

      const mergeFeatures = (items: Array<{ text: string; icon: any }>) => {
        const map = new Map<string, { text: string; icon: any }>();
        for (const it of items) {
          const nf = normalizeFeature(it.text);
          if (!map.has(nf.key)) map.set(nf.key, { text: nf.text, icon: nf.icon });
        }
        return Array.from(map.values());
      };

      const enrichedPlans = plansData.map((p) => {
        const offer = offers.find((o) => o.plan === p.name);
        const planId = normalizePlanId(p.name);
        const config = PLANS[planId];

        const base: Array<{ text: string; icon: any }> = [];

        // 1) Legacy frontend features (if present)
        if (p.features?.length) base.push(...p.features);

        // 2) Backend offer bullets
        if (offer?.bullets?.length) {
          for (const b of offer.bullets) base.push({ text: b, icon: StarIcon });
        }

        // 3) Deterministic perks from offer/config (source of truth)
        if (config.features.visualRewards) base.push({ text: 'Acesso a Recompensas Visuais', icon: StoreIcon });
        if (config.features.queuePriority) base.push({ text: 'Fila Prioritária', icon: QueueIcon });
        if (config.features.eventsAccess === 'vip') base.push({ text: 'Acesso VIP a Eventos', icon: CrownIcon });

        if (offer?.coins_multiplier) base.push({ text: `Coins x${offer.coins_multiplier}`, icon: TrendingUpIcon });
        if (offer?.daily_mission_limit === null && p.name !== 'Free Flow') {
          base.push({ text: 'Missões ilimitadas', icon: MissionIcon });
        } else if (offer?.daily_mission_limit !== undefined && offer?.daily_mission_limit !== null) {
          base.push({ text: `Até ${offer.daily_mission_limit} missões/dia`, icon: MissionIcon });
        }
        if ((offer?.store_discount_percent ?? 0) > 0) {
          base.push({ text: `Desconto na Loja ${offer.store_discount_percent}%`, icon: DiscountIcon });
        }

        // Always show access messaging
        if (p.name === 'Free Flow') {
          base.push({ text: 'Acesso Básico', icon: StarIcon });
        } else {
          base.push({ text: 'Acesso total à Loja', icon: StoreIcon });
        }

        const feats = mergeFeatures(base);
        return { ...p, features: feats };
      });
      
      setMyBenefits(myB);
      setPlanOffers(offers);
      setPlans(enrichedPlans);
    } catch (error) {
      console.error("Failed to fetch subscription data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
        setIsLoading(true);
        fetchData();
    }
  }, [currentUser]);
  
  const processApiResponse = (response: any) => {
    if (response.updatedUser) {
        dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
    }
    if (response.notifications) {
        dispatch({ type: 'ADD_NOTIFICATIONS', payload: response.notifications });
    }
  };

  const resetCheckoutState = () => {
    setIsCheckoutOpen(false);
    setCheckoutPlan(null);
    setCheckoutStatus(null);
    setCheckoutError(null);
    setIsCheckoutSubmitting(false);
  };

  const handleStartCheckout = (plan: SubscriptionPlan) => {
    setCheckoutPlan(plan);
    setIsCheckoutOpen(true);
    setCheckoutStatus(null);
    setCheckoutError(null);
  };

  const clearCheckoutSession = () => {
    sessionStorage.removeItem('aw_checkout_id');
    sessionStorage.removeItem('aw_reference_id');
  };

  const getCheckoutErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      const typedError = error as Error & { code?: string };
      return {
        message: typedError.message || 'Falha ao processar o pagamento.',
        code: typedError.code,
      };
    }
    return { message: 'Falha ao processar o pagamento.' };
  };

  const handleOpenPagbankCheckout = async () => {
    if (!currentUser || !checkoutPlan) return;
    try {
      setCheckoutError(null);
      setCheckoutStatus('Preparando checkout PagBank...');
      setIsCheckoutSubmitting(true);
      const checkout = await createPagbankCheckout(checkoutPlan.name, currentUser.id);
      sessionStorage.setItem('aw_checkout_id', checkout.checkout_id);
      sessionStorage.setItem('aw_reference_id', checkout.reference_id);
      window.location.href = checkout.checkout_url;
    } catch (error) {
      console.error('[checkout] pagbank_checkout_failed', error);
      setCheckoutStatus(null);
      setCheckoutError(getCheckoutErrorMessage(error));
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  const runCheckoutVerification = useCallback(
    async (checkoutId: string, referenceId: string) => {
      if (!currentUser) return false;
      setVerificationState('verifying');
      setVerificationMessage('Confirmando pagamento...');
      const delays = [2000, 4000, 8000, 8000, 8000];

      for (const delay of delays) {
        try {
          const result = await verifyPagbankCheckout(checkoutId, referenceId);
          if (result?.active) {
            clearCheckoutSession();
            setPendingCheckout(null);
            const profileResult = await ProfileSupabase.fetchMyProfile(currentUser.id);
            if (profileResult.success && profileResult.user) {
              dispatch({ type: 'UPDATE_USER', payload: profileResult.user });
            }
            toast.success('Plano ativado!');
            setVerificationState('success');
            setVerificationMessage('Pagamento confirmado. Seu plano está ativo.');
            setTimeout(() => {
              setVerificationState('idle');
              setVerificationMessage(null);
            }, 2000);
            return true;
          }
        } catch (error) {
          console.error('[checkout] pagbank_verify_failed', error);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      setVerificationState('timeout');
      setVerificationMessage("Pagamento em processamento. Clique em 'Verificar novamente'.");
      return false;
    },
    [currentUser, dispatch],
  );

  const checkoutSearchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  useEffect(() => {
    if (!currentUser) return;
    const checkoutId =
      checkoutSearchParams.get('checkout_id') ?? sessionStorage.getItem('aw_checkout_id');
    const referenceId =
      checkoutSearchParams.get('reference_id') ?? sessionStorage.getItem('aw_reference_id');

    if (checkoutId && referenceId) {
      setPendingCheckout({ checkoutId, referenceId });
      runCheckoutVerification(checkoutId, referenceId);
    }
  }, [checkoutSearchParams, currentUser, runCheckoutVerification]);

  const handleCancelSubscription = async () => {
    if (!currentUser) return;
    setIsCancelling(true);
    try {
        const response = await api.cancelSubscription(currentUser.id);
        processApiResponse(response);
        setIsCancelModalOpen(false);
    } catch (error) {
        console.error("Failed to cancel subscription", error);
    } finally {
        setIsCancelling(false);
    }
  };

  if (isLoading || !currentUser) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#FFD36A] shadow-[0_0_20px_rgba(255,211,106,0.4)]"></div>
        </div>
    );
  }

  const isCheckoutVerifying = verificationState === 'verifying';
  const isCheckoutSuccess = verificationState === 'success';
  const isCheckoutTimeout = verificationState === 'timeout';

  return (
      <div className="animate-fade-in-up pb-32 relative">
        
        {/* 1. HERO SECTION */}
        <div className="text-center max-w-5xl mx-auto pt-6 mb-16 relative">
            {/* Back Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[600px] bg-[#FFD36A]/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <h2 className="text-4xl md:text-6xl font-black text-[#FFD36A] font-chakra uppercase tracking-tighter mb-4 relative z-10 drop-shadow-[0_0_15px_rgba(255,211,106,0.5)]">
                ESCOLHA SUA EVOLUÇÃO
            </h2>
            
            <div className="relative z-10 flex items-center justify-center mb-6">
                 <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#FF3CE6]"></div>
                 <div className="mx-4 text-[#FF3CE6] animate-pulse">◆</div>
                 <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#3CFFF8]"></div>
            </div>

            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium relative z-10">
                Assinaturas feitas para artistas que buscam <span className="text-white font-bold">crescer, aparecer e dominar.</span>
            </p>
        </div>
        
        {/* Cancellation Notice */}
        {currentUser.cancellationPending && currentUser.subscriptionExpiresAt && (
            <div className="max-w-3xl mx-auto p-6 bg-red-900/20 border border-red-500/30 rounded-2xl text-center backdrop-blur-sm mb-10 animate-fade-in-up">
                <h3 className="text-lg font-bold text-red-400 mb-2 uppercase tracking-wide">Cancelamento Agendado</h3>
                <p className="text-red-200 text-sm mb-1">
                    Sua assinatura do plano <span className="font-bold">"{currentUser.plan}"</span> será encerrada em:
                </p>
                <p className="text-2xl font-bold text-white font-mono">
                    {new Date(currentUser.subscriptionExpiresAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
        )}

        {myBenefits ? (
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 mb-4">
            <div className="text-sm text-white/60">Seu plano</div>
            <div className="text-xl font-semibold">{myBenefits.plan}</div>

            <div className="mt-2 text-sm text-white/80">
              Coins: <b>x{myBenefits.coins_multiplier}</b> •{" "}
              Missões:{" "}
              <b>
                {myBenefits.daily_mission_limit === null
                  ? "Ilimitadas"
                  : `${myBenefits.daily_mission_limit}/dia`}
              </b>
              {myBenefits.store_discount_percent > 0 ? (
                <> • Loja: <b>{myBenefits.store_discount_percent}% OFF</b></>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 2. PLANS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1500px] mx-auto items-stretch px-2 md:px-0 mb-24">
            {plans.map(plan => (
                <PlanCard 
                    key={plan.name} 
                    plan={plan} 
                    currentUser={currentUser} 
                    isCheckoutDisabled={isCheckoutOpen || isCheckoutSubmitting}
                    isCheckoutLoading={isCheckoutSubmitting && checkoutPlan?.name === plan.name}
                    onStartCheckout={handleStartCheckout}
                />
            ))}
        </div>

        {/* 3. UNLOCK FEATURES SECTION */}
        <div className="max-w-4xl mx-auto mb-24 relative">
            <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-black text-white font-chakra uppercase tracking-wide">
                    🔥 O que você desbloqueia com Upgrade?
                </h3>
                <p className="text-gray-400 text-sm mt-2">Acelere seus resultados com benefícios exclusivos.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <UnlockItem icon={CoinIcon} title="Mais Coins Mensais" delay="0.1s" />
                <UnlockItem icon={XPIcon} title="Boost de XP (até 10x)" delay="0.2s" />
                <UnlockItem icon={MissionIcon} title="Missões Diárias Extras" delay="0.3s" />
                <UnlockItem icon={VipIcon} title="Acesso VIP a Eventos" delay="0.4s" />
                <UnlockItem icon={DiscountIcon} title="Descontos na Loja" delay="0.5s" />
                <UnlockItem icon={QueueIcon} title="Prioridade na Fila" delay="0.6s" />
            </div>
        </div>

        {/* 4. MANAGEMENT & FAQ */}
        <div className="max-w-3xl mx-auto px-4">
            {currentUser.plan !== 'Free Flow' && !currentUser.cancellationPending && (
                <div className="bg-[#121212] border border-[#FFD36A]/20 rounded-2xl p-8 text-center backdrop-blur-md shadow-2xl relative overflow-hidden group mb-16">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white font-chakra uppercase tracking-wide mb-2">Gerenciar Assinatura</h3>
                        <p className="text-[#808080] text-sm mb-6">
                            Você está atualmente no plano <span className="text-[#FFD36A] font-bold">{currentUser.plan}</span>.
                        </p>
                        <button
                            onClick={() => setIsCancelModalOpen(true)}
                            className="px-8 py-3 rounded-xl border border-red-500/30 text-red-400 font-bold text-xs uppercase tracking-widest hover:bg-red-500/10 hover:border-red-500 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                        >
                            Cancelar Assinatura
                        </button>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold text-center text-white mb-8 font-chakra uppercase tracking-wider flex items-center justify-center gap-2">
                <ShieldIcon className="w-6 h-6 text-[#FFD36A]" /> Dúvidas Frequentes
            </h2>
            <div className="space-y-4">
                {faqItems.map((item, index) => <FaqItem key={index} question={item.question} answer={item.answer} />)}
            </div>
        </div>

        {/* CHECKOUT VERIFICATION */}
        {verificationState !== 'idle' && (
            <div
                className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                style={{ zIndex: 10000 }}
            >
                <div className="w-full max-w-md bg-[#0F1116] border border-[#FFD36A]/40 rounded-2xl p-8 shadow-[0_0_40px_rgba(255,211,106,0.25)] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')] pointer-events-none"></div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            {isCheckoutVerifying && (
                                <div className="w-5 h-5 border-2 border-t-transparent border-[#FFD36A] rounded-full animate-spin"></div>
                            )}
                            {isCheckoutSuccess && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/15 text-green-300 text-xs font-black uppercase tracking-[0.2em]">
                                    Ativo
                                </span>
                            )}
                            {isCheckoutTimeout && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-200 text-xs font-black uppercase tracking-[0.2em]">
                                    Em processamento
                                </span>
                            )}
                            <h3 className="text-xl font-black text-white uppercase tracking-wide">
                                {isCheckoutVerifying && 'Confirmando pagamento'}
                                {isCheckoutSuccess && 'Pagamento aprovado'}
                                {isCheckoutTimeout && 'Pagamento em análise'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {verificationMessage}
                        </p>
                        {isCheckoutTimeout && (
                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                      if (pendingCheckout) {
                                        runCheckoutVerification(
                                          pendingCheckout.checkoutId,
                                          pendingCheckout.referenceId,
                                        );
                                      }
                                    }}
                                    className="w-full py-3 rounded-lg bg-gradient-to-r from-[#FFB631] to-[#FFD36A] text-[#0D0F12] font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(255,211,106,0.4)]"
                                >
                                    Verificar novamente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                      setVerificationState('idle');
                                      setVerificationMessage(null);
                                    }}
                                    className="w-full py-3 rounded-lg border border-gray-700 text-gray-300 uppercase text-xs font-bold tracking-widest hover:border-gray-500 hover:text-white transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MODALS */}
        {isCheckoutOpen && checkoutPlan && (
            <div
                className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                style={{ zIndex: 10000 }}
            >
                <div className="w-full max-w-lg bg-[#121212] border border-[#FFD36A]/30 rounded-2xl p-8 shadow-2xl relative">
                    <button
                        type="button"
                        onClick={resetCheckoutState}
                        disabled={isCheckoutSubmitting}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors disabled:cursor-not-allowed"
                        aria-label="Fechar"
                    >
                        ✕
                    </button>
                    <h3 className="text-2xl font-bold text-white font-chakra uppercase tracking-wide mb-2">
                        Assinar {checkoutPlan.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-6">
                        Você será redirecionado para o checkout seguro do PagBank para concluir sua assinatura.
                    </p>

                    {checkoutError && (
                        <div className="mt-4 text-sm text-red-400 font-semibold">
                            {checkoutError.message}
                        </div>
                    )}
                    {checkoutStatus && (
                        <div className="mt-4 text-sm text-[#FFD36A] font-semibold">
                            {checkoutStatus}
                        </div>
                    )}

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={resetCheckoutState}
                            disabled={isCheckoutSubmitting}
                            className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-300 uppercase text-xs font-bold tracking-widest hover:border-gray-500 hover:text-white transition-colors disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenPagbankCheckout}
                            disabled={isCheckoutSubmitting}
                            className="flex-1 py-3 rounded-lg bg-gradient-to-r from-[#FFB631] to-[#FFD36A] text-[#0D0F12] font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(255,211,106,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isCheckoutSubmitting ? 'Redirecionando...' : 'Prosseguir para PagBank'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <ConfirmationModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            onConfirm={handleCancelSubscription}
            title="Confirmar Cancelamento"
            message={
                <>
                    <p className="text-white text-lg mb-2">Tem certeza que deseja cancelar?</p>
                    <p className="text-sm text-gray-400">Você retornará ao plano 'Free Flow' após o término do período atual. Seus benefícios de assinante continuarão ativos até lá.</p>
                </>
            }
            confirmButtonText={isCancelling ? 'Cancelando...' : 'Sim, Confirmar'}
            confirmButtonClass="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wide text-xs py-3 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
        />

    </div>
  );
};

export default Subscriptions;
