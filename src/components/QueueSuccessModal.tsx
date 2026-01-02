
import React from 'react';
import { MicIcon, StarIcon } from '../constants';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface QueueSuccessModalProps {
  onClose: () => void;
  itemName: string;
  isSpotlight: boolean;
  isVisualReward: boolean;
}

const QueueSuccessModal: React.FC<QueueSuccessModalProps> = ({ onClose, itemName, isSpotlight, isVisualReward }) => {
  // Determine Title
  const title = isVisualReward ? "Produção Iniciada!" : "Adicionado à Fila!";
  
  // Determine Icon (using custom icon mapping or direct component inside helper)
  // DopamineUniversalModal handles ReactNode as icon.
  const Icon = isVisualReward ? StarIcon : MicIcon;

  const CustomIcon = <Icon className="w-12 h-12 text-[#FFD447]" />;

  // Determine Follow-up text
  const followUpText = isVisualReward
    ? "Acompanhe o andamento no seu Histórico."
    : isSpotlight
        ? "Você será notificado quando for sua vez."
        : "Acompanhe sua posição na aba 'Itens Utilizáveis'.";

  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="entrar_na_fila"
        title={title}
        message={`Sua solicitação para "${itemName}" foi registrada.`}
        icon={CustomIcon}
        buttonText="Entendido"
        onConfirm={onClose}
    >
         <div className="w-full border-t border-[#FFD447]/10 pt-4 mt-2">
            <p className="text-[#BBBBBB] text-xs font-medium tracking-wide">
                {followUpText}
            </p>
         </div>
    </DopamineUniversalModal>
  );
};

export default QueueSuccessModal;
