
import React from 'react';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface SubscriptionSuccessModalProps {
  newPlanName: string;
  onClose: () => void;
}

const SubscriptionSuccessModal: React.FC<SubscriptionSuccessModalProps> = ({ newPlanName, onClose }) => {
  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="assinatura_atualizada"
        title="Bem-vindo à Elite!"
        message="Seu upgrade foi concluído com sucesso."
        icon="crown_glow"
        buttonText="Começar a Explorar"
        onConfirm={onClose}
    >
        <div className="w-full my-4 p-6 bg-gradient-to-br from-[#1A1A1A] to-[#0E0E0E] rounded-xl border border-[#FFD447]/30 relative overflow-hidden">
             <div className="absolute inset-0 bg-[#FFD447]/5 animate-pulse"></div>
             <p className="text-gray-400 text-xs uppercase tracking-widest relative z-10">SEU NOVO PLANO</p>
             <p className="text-2xl md:text-3xl font-black text-white mt-2 relative z-10 font-chakra">
                {newPlanName}
             </p>
        </div>
        <p className="text-gray-400 text-xs mb-2">Novos horizontes se abrem para você no Artist World. Explore seus novos benefícios!</p>
    </DopamineUniversalModal>
  );
};

export default SubscriptionSuccessModal;
