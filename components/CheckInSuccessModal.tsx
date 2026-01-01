
import React from 'react';
import { CoinIcon } from '../constants';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface CheckInSuccessModalProps {
  onClose: () => void;
  coinsGained: number;
  isBonus: boolean;
  streak: number;
}

const CheckInSuccessModal: React.FC<CheckInSuccessModalProps> = ({ onClose, coinsGained, isBonus, streak }) => {
  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="checkin_success"
        title="Check-in Realizado!"
        message={`Você ganhou +${coinsGained} Lummi Coins!`}
        icon="check_glow"
        buttonText="Continuar"
    >
        <div className="bg-[#151515] rounded-xl p-4 border border-[#222] mb-2 w-full relative overflow-hidden">
            <div className="flex items-center justify-center space-x-3">
                <CoinIcon className="w-8 h-8 text-[#FFD447] animate-spin-slow" />
                <span className="text-3xl font-black text-white font-chakra">+{coinsGained}</span>
                <span className="text-lg font-bold text-gray-400">Coins</span>
            </div>
            {isBonus && (
                <p className="text-xs text-[#00E8FF] mt-2 font-bold uppercase tracking-wide animate-pulse">
                    ✨ Bônus de Sequência Ativo!
                </p>
            )}
            <div className="mt-3 pt-3 border-t border-white/5 text-center">
                 <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">
                    Sequência Atual: <span className="text-white font-bold">{streak} {streak === 1 ? 'dia' : 'dias'}</span>
                </p>
            </div>
        </div>
    </DopamineUniversalModal>
  );
};

export default CheckInSuccessModal;
