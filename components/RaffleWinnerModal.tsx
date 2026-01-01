
import React, { useEffect } from 'react';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';
import { useAppContext } from '../constants';
import * as api from '../api/index';

interface RaffleWinnerModalProps {
  itemName: string;
  itemImageUrl: string;
  onClose: () => void;
  onNavigate: () => void;
}

const RaffleWinnerModal: React.FC<RaffleWinnerModalProps> = ({ itemName, itemImageUrl, onClose, onNavigate }) => {
  const { state, dispatch } = useAppContext();
  const { activeUser } = state;

  useEffect(() => {
    if (activeUser?.unseenRaffleWin) {
      // Remove do estado global imediatamente
      dispatch({
        type: "UPDATE_USER",
        payload: { ...activeUser, unseenRaffleWin: undefined }
      });

      // Marca como visto no MockDB
      api.markRaffleWinAsSeen(activeUser.id);
    }
  }, []);
  
  const CustomIcon = (
    <div className="relative mb-2 group">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#FFD447] shadow-[0_0_30px_rgba(255,212,71,0.4)] mx-auto">
            <img 
                src={itemImageUrl} 
                alt={itemName} 
                className="w-full h-full object-cover"
            />
        </div>
    </div>
  );

  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="vencedor_sorteio"
        title="Parabéns, Você Venceu!"
        message="A sorte estava ao seu lado!"
        icon={CustomIcon}
        buttonText="Ver no Inventário"
        onConfirm={onNavigate}
    >
        <div className="w-full my-2">
            <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">SEU PRÊMIO</p>
            <p className="text-xl font-black text-white mb-4 font-chakra uppercase">{itemName}</p>
            <div className="bg-[#FFD447]/10 border border-[#FFD447]/20 p-3 rounded-lg">
                 <p className="text-[#FFD447] text-xs font-bold">O item foi adicionado ao seu inventário.</p>
            </div>
        </div>
    </DopamineUniversalModal>
  );
};

export default RaffleWinnerModal;
