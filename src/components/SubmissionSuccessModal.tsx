
import React from 'react';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface SubmissionSuccessModalProps {
  onClose: () => void;
  missionTitle: string;
}

const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({ onClose, missionTitle }) => {
  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="prova_enviada"
        title="Envio Recebido!"
        message="Sua comprovação foi enviada para análise."
        icon="upload_glow"
        buttonText="Entendido"
        onConfirm={onClose}
    >
        <div className="bg-[#151515] rounded-xl p-4 border border-white/10 w-full text-center">
             <p className="text-xs text-[#808080] uppercase tracking-wider font-bold mb-1">Missão</p>
             <p className="font-bold text-white font-chakra text-lg leading-tight">{missionTitle}</p>
             <div className="mt-3 pt-3 border-t border-white/5">
                 <p className="text-xs text-gray-500">Você será notificado assim que a revisão for concluída.</p>
             </div>
        </div>
    </DopamineUniversalModal>
  );
};

export default SubmissionSuccessModal;
