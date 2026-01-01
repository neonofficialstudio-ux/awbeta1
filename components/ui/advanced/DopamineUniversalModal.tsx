
import React, { useEffect } from 'react';
import { CoinIcon, TrophyIcon, StarIcon, CheckIcon, StoreIcon, QueueIcon, MessageIcon, CrownIcon } from '../../../constants';
import { ModalPortal } from '../overlays/ModalPortal';

// Define icons mapping based on string key for flexibility
const IconMap: Record<string, React.ElementType> = {
  coin_glow: CoinIcon,
  trophy_glow: TrophyIcon,
  upload_glow: CheckIcon,
  shopping_glow: StoreIcon,
  star_glow: StarIcon,
  queue_glow: QueueIcon,
  message_glow: MessageIcon,
  check_glow: CheckIcon,
  crown_glow: CrownIcon,
};

export interface DopamineUniversalModalProps {
  isOpen?: boolean;
  onClose: () => void;
  type?: string; // e.g. 'checkin_success', optional logic controller
  title: string;
  message: string;
  icon?: string | React.ReactNode; // Key from IconMap OR direct component
  buttonText?: string;
  onConfirm?: () => void;
  children?: React.ReactNode;
  particleCount?: number;
}

const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 2,
}));

const DopamineUniversalModal: React.FC<DopamineUniversalModalProps> = ({
  isOpen = true,
  onClose,
  title,
  message,
  icon,
  buttonText = "Continuar",
  onConfirm,
  children,
  particleCount = 15
}) => {

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
        onConfirm();
    } else {
        onClose();
    }
  };

  // Resolve Icon
  let IconComponent: React.ElementType | React.ReactNode = null;
  if (typeof icon === 'string' && IconMap[icon]) {
      IconComponent = IconMap[icon];
  } else if (React.isValidElement(icon)) {
      IconComponent = icon;
  } else if (typeof icon === 'function') {
      IconComponent = icon;
  }

  return (
    <ModalPortal>
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
        >
        {/* Backdrop - Dark Glass */}
        <div 
            className="fixed inset-0 bg-[#050505]/80 backdrop-blur-lg transition-opacity duration-300 animate-[fade-in-up_0.2s]"
            onClick={onClose}
            aria-hidden="true"
        ></div>

        {/* Modal Container - Gold Neon Aesthetics */}
        <div 
            className="
                relative w-full max-w-sm md:max-w-md mx-auto
                bg-[#0E0E0F] border border-[#FFD447]/30 rounded-[32px]
                shadow-[0_0_60px_rgba(255,212,71,0.15)]
                flex flex-col items-center text-center
                p-8 overflow-hidden
                animate-modal-in
                transform-gpu
            "
            onClick={(e) => e.stopPropagation()}
        >
            {/* Particles FX */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]">
                {particles.slice(0, particleCount).map(p => (
                    <div 
                        key={p.id}
                        className="absolute bg-[#FFD447] rounded-full opacity-0 animate-[float_4s_ease-in-out_infinite]"
                        style={{
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            left: `${p.left}%`,
                            bottom: '-10px',
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            opacity: 0.3
                        }}
                    ></div>
                ))}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD447] to-transparent shadow-[0_0_15px_#FFD447]"></div>
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#FFD447]/5 blur-[80px] rounded-full pointer-events-none"></div>
            </div>

            {/* Close Button */}
            <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-[#666] hover:text-white transition-colors rounded-full hover:bg-white/10 z-20"
            aria-label="Fechar"
            >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>

            {/* Main Content */}
            <div className="relative z-10 w-full flex flex-col items-center">
                
                {/* Animated Icon */}
                {IconComponent && (
                    <div className="mb-6 mt-2 relative group">
                        <div className="absolute inset-0 bg-[#FFD447] blur-2xl opacity-20 animate-pulse rounded-full"></div>
                        <div className="relative bg-[#1A1A1A]/80 p-5 rounded-[24px] border border-[#FFD447]/20 shadow-lg backdrop-blur-sm group-hover:scale-105 transition-transform duration-500">
                            {React.isValidElement(IconComponent) ? IconComponent : React.createElement(IconComponent as React.ElementType, { className: "w-12 h-12 text-[#FFD447] drop-shadow-[0_0_10px_rgba(255,212,71,0.5)]" })}
                        </div>
                    </div>
                )}

                <h2 className="text-2xl md:text-3xl font-black text-white font-chakra uppercase tracking-wide mb-3 text-shadow-glow leading-[1.1]">
                    {title}
                </h2>
                
                <p className="text-[#B3B3B3] text-sm md:text-base font-medium leading-relaxed max-w-[90%] mb-6">
                    {message}
                </p>

                {children && (
                    <div className="w-full mb-8 animate-fade-in-up">
                        {children}
                    </div>
                )}

                {/* Main Action Button */}
                <button
                    onClick={handleConfirm}
                    className="
                        w-full py-4 rounded-xl 
                        bg-gradient-to-r from-[#FFD447] to-[#F6C560] 
                        text-[#0B0B0B] font-black uppercase tracking-[0.15em] text-xs md:text-sm
                        shadow-[0_0_25px_rgba(255,212,71,0.25)]
                        hover:shadow-[0_0_40px_rgba(255,212,71,0.4)] 
                        hover:scale-[1.02] active:scale-[0.98] 
                        transition-all duration-300 relative overflow-hidden group
                    "
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {buttonText}
                    </span>
                    <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                </button>
                
                {onConfirm && (
                    <button
                        onClick={onClose}
                        className="mt-4 text-xs font-bold text-[#666] hover:text-white uppercase tracking-widest transition-colors"
                    >
                        Cancelar / Fechar
                    </button>
                )}
            </div>

        </div>
        </div>
    </ModalPortal>
  );
};

export default DopamineUniversalModal;
