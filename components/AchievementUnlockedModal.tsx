
import React, { useEffect, useState } from 'react';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';
import { ACHIEVEMENTS_CATALOG } from '../services/achievements/achievement.data';
import { CoinIcon, XPIcon } from '../constants';

interface AchievementUnlockedModalProps {
  achievementId: string;
  onClose: () => void;
  onNavigate: () => void;
}

const AchievementUnlockedModal: React.FC<AchievementUnlockedModalProps> = ({ achievementId, onClose, onNavigate }) => {
  const [achievement, setAchievement] = useState<any>(null);

  useEffect(() => {
    // Find static data for this achievement
    const ach = ACHIEVEMENTS_CATALOG.find(a => a.id === achievementId);
    setAchievement(ach);
  }, [achievementId]);

  if (!achievement) return null;

  // Rarity Colors
  const rarityColors: Record<string, string> = {
        'Lendário': 'text-[#FFD36A] border-[#FFD36A] shadow-[0_0_20px_rgba(255,211,106,0.5)]',
        'Épico': 'text-[#A66BFF] border-[#A66BFF] shadow-[0_0_20px_rgba(166,107,255,0.5)]',
        'Raro': 'text-[#3CFFF8] border-[#3CFFF8] shadow-[0_0_20px_rgba(60,255,248,0.5)]',
        'Incomum': 'text-[#3CFF9A] border-[#3CFF9A]',
        'Comum': 'text-gray-400 border-gray-600'
  };

  const themeClass = rarityColors[achievement.rarity] || rarityColors['Comum'];

  // Custom Icon Rendering
  const CustomIcon = (
      <div className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center bg-[#0E0E0E] ${themeClass} mb-4`}>
           <div className={`absolute inset-0 rounded-full opacity-20 blur-md ${themeClass.split(' ')[1].replace('text-', 'bg-')}`}></div>
           {/* Fallback Image or Icon mapping if available in catalog, for now using placeholder logic similar to Achievements component */}
           <img 
              src={`https://picsum.photos/seed/${achievementId}/200`} 
              alt="Icon" 
              className="w-full h-full rounded-full object-cover p-1 opacity-90"
           />
      </div>
  );

  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="achievement_unlocked"
        title="Conquista Desbloqueada!"
        message={`Você provou seu valor e desbloqueou "${achievement.title}".`}
        icon={CustomIcon}
        buttonText="Ver Coleção"
        onConfirm={onNavigate}
        particleCount={30}
    >
        <div className="w-full my-2 bg-[#1A1A1A] rounded-xl p-4 border border-[#333] relative overflow-hidden">
             {/* Rarity Badge */}
             <div className="absolute top-0 right-0 px-3 py-1 bg-black/50 text-[9px] font-black uppercase rounded-bl-xl border-l border-b border-[#333]">
                 {achievement.rarity}
             </div>

             <h4 className={`text-lg font-black font-chakra uppercase mb-1 ${themeClass.split(' ')[0]}`}>{achievement.title}</h4>
             <p className="text-xs text-gray-400 mb-4 leading-relaxed">{achievement.description}</p>
             
             <div className="flex items-center justify-center gap-3 border-t border-white/5 pt-3">
                 {achievement.rewardCoins > 0 && (
                     <div className="flex items-center gap-1.5 bg-[#FFD36A]/10 px-2 py-1 rounded border border-[#FFD36A]/20">
                         <CoinIcon className="w-4 h-4 text-[#FFD36A]" />
                         <span className="text-xs font-bold text-white">+{achievement.rewardCoins}</span>
                     </div>
                 )}
                 {achievement.rewardXP > 0 && (
                     <div className="flex items-center gap-1.5 bg-[#A66BFF]/10 px-2 py-1 rounded border border-[#A66BFF]/20">
                         <XPIcon className="w-4 h-4 text-[#A66BFF]" />
                         <span className="text-xs font-bold text-white">+{achievement.rewardXP}</span>
                     </div>
                 )}
             </div>
        </div>
    </DopamineUniversalModal>
  );
};

export default AchievementUnlockedModal;
