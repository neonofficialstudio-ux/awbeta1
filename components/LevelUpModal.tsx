
import React from 'react';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface LevelUpModalProps {
  newLevel: number;
  onClose: () => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ newLevel, onClose }) => {
  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="levelup"
        title="Você Subiu de Nível!"
        message="Parabéns por alcançar o próximo patamar."
        icon="star_glow"
        buttonText="Continuar Jornada"
        onConfirm={onClose}
    >
        <div className="my-4 flex flex-col items-center justify-center w-full">
             <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mb-2">NOVO NÍVEL</p>
             <p 
                className="text-8xl font-black text-[#FFD447] leading-none filter drop-shadow-[0_0_15px_rgba(255,212,71,0.5)]"
             >
                {newLevel}
             </p>
             <p className="text-gray-400 text-xs mt-4">Continue assim para desbloquear novas recompensas!</p>
        </div>
    </DopamineUniversalModal>
  );
};

export default LevelUpModal;
