
import React from 'react';
import type { StoreItem, UsableItem, InventoryTab } from '../types';
import { CheckIcon } from '../constants';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface RedemptionSuccessModalProps {
  item: StoreItem | UsableItem;
  onClose: () => void;
  onNavigateToInventory: (tab: InventoryTab) => void;
}

const RedemptionSuccessModal: React.FC<RedemptionSuccessModalProps> = ({ item, onClose, onNavigateToInventory }) => {
  const isVisualReward = 'rarity' in item; 
  const inventoryTab: InventoryTab = isVisualReward ? 'visual' : 'usable';

  // Determine styling based on rarity
  const getRarityStyles = () => {
    if ('rarity' in item) {
        switch (item.rarity) {
            case 'Lendário': return 'shadow-[0_0_40px_rgba(255,211,105,0.5)] border-[#FFD369]';
            case 'Épico': return 'shadow-[0_0_40px_rgba(168,85,247,0.5)] border-[#A855F7]';
            case 'Raro': return 'shadow-[0_0_40px_rgba(0,232,255,0.5)] border-[#00E8FF]';
            default: return 'shadow-[0_0_30px_rgba(255,255,255,0.2)] border-gray-400';
        }
    }
    return 'shadow-[0_0_30px_rgba(255,211,105,0.3)] border-[#FFD369]/50';
  };
  
  const rarityColor = 'rarity' in item 
    ? (item.rarity === 'Lendário' ? 'text-[#FFD369]' : item.rarity === 'Épico' ? 'text-[#A855F7]' : item.rarity === 'Raro' ? 'text-[#00E8FF]' : 'text-gray-300')
    : 'text-[#FFD369]';

  const customIcon = (
     <div className="relative mb-2 group z-10">
        <div className={`relative w-24 h-24 rounded-[22px] overflow-hidden border-2 bg-black ${getRarityStyles()} transition-transform duration-500 group-hover:scale-105 mx-auto`}>
            <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-[#27AE60] text-white rounded-full p-1.5 border-4 border-[#0E0E0E] shadow-xl animate-[pop-in_0.5s_0.3s_both]">
            <CheckIcon className="w-4 h-4" />
        </div>
    </div>
  );

  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="item_resgatado"
        title="Item Resgatado!"
        message={item.name}
        icon={customIcon}
        buttonText="Ir para o Inventário ➜"
        onConfirm={() => onNavigateToInventory(inventoryTab)}
    >
        <div className="w-full mb-2">
            {'rarity' in item && (
                <span className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-4 border px-2 py-0.5 rounded w-fit mx-auto ${rarityColor} border-current opacity-80`}>
                    {item.rarity}
                </span>
            )}
            <div className="bg-[#151515]/80 rounded-xl p-4 border border-[#222] w-full relative backdrop-blur-sm">
                <p className="text-[#B3B3B3] text-sm leading-relaxed font-medium">
                    {isVisualReward 
                        ? "Item enviado para sua fila de produção. Configure os detalhes no inventário."
                        : "Item adicionado à sua coleção. Ative-o quando quiser pelo inventário."}
                </p>
            </div>
        </div>
    </DopamineUniversalModal>
  );
};

export default RedemptionSuccessModal;
