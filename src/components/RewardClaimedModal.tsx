
import React from 'react';
import { CoinIcon, SpotifyIcon, YoutubeIcon } from '../constants';
import DopamineUniversalModal from './ui/advanced/DopamineUniversalModal';

interface RewardClaimedModalProps {
  artistName: string;
  linkType: 'spotify' | 'youtube';
  onClose: () => void;
}

const RewardClaimedModal: React.FC<RewardClaimedModalProps> = ({ artistName, linkType, onClose }) => {
  const Icon = linkType === 'spotify' ? SpotifyIcon : YoutubeIcon;
  const colorClass = linkType === 'spotify' ? 'text-[#1DB954]' : 'text-[#FF0000]';
  
  const CustomIcon = <Icon className={`w-16 h-16 ${colorClass}`} />;

  return (
    <DopamineUniversalModal
        isOpen={true}
        onClose={onClose}
        type="recompensa_link"
        title="Recompensa Coletada!"
        message={`Você apoiou ${artistName}!`}
        icon={CustomIcon}
        buttonText="Fechar"
        onConfirm={onClose}
    >
        <div className="my-2 p-4 bg-gray-900/50 rounded-lg border border-gray-800 flex items-center justify-center space-x-3 w-full">
            <CoinIcon className="w-8 h-8 text-[#FFD447]" />
            <span className="text-3xl font-bold text-white">+1</span>
            <span className="text-xl font-semibold text-gray-300">Lummi Coin</span>
        </div>
        <p className="text-gray-400 mt-2 text-xs">Aproveite para ouvir o som e conhecer mais sobre o trabalho dele(a).</p>
    </DopamineUniversalModal>
  );
};

export default RewardClaimedModal;
