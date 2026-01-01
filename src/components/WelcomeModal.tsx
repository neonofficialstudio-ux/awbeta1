import React from 'react';
import { CoinIcon, StarIcon } from '../constants';
import { WELCOME_BONUS_COINS } from '../api/economy/economy';

interface WelcomeModalProps {
  onClose: () => void;
  onNavigate: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose, onNavigate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-[#1c1c1c] to-[#121212] rounded-2xl border-2 border-goldenYellow-500/50 p-8 text-center relative overflow-hidden shadow-2xl shadow-goldenYellow-500/20 max-w-md w-full animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: '0.4s' }}
      >
        {/* Star particles for effect */}
        {[...Array(6)].map((_, i) => (
            <StarIcon key={i} className="absolute text-goldenYellow-500 opacity-0 animate-pulse" style={{
                width: `${Math.random() * 12 + 8}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: '2.5s'
            }} />
        ))}
        
        <h2 className="text-4xl font-bold text-goldenYellow-400 mb-4 tracking-wide" style={{ textShadow: '0 0 15px rgba(251, 191, 36, 0.6)' }}>
          Sua Lenda Começa Agora!
        </h2>
        <p className="text-gray-300 mb-6 text-lg">Bem-vindo à elite de artistas do Artist World.</p>
        
        <div className="my-8 p-6 bg-gray-900/50 rounded-lg border border-gray-800">
            <p className="text-gray-400">Como bônus de boas-vindas, você recebeu:</p>
            <div className="flex items-center justify-center space-x-3 mt-3">
                <CoinIcon className="w-10 h-10 text-goldenYellow-400 animate-pulse-slow" />
                <span className="text-4xl font-bold text-white">+{WELCOME_BONUS_COINS}</span>
                <span className="text-2xl font-semibold text-gray-300">Lummi Coins</span>
            </div>
        </div>

        <p className="text-gray-400 mb-8">Complete missões, ganhe mais moedas e troque por recompensas incríveis para sua carreira.</p>
        
        <button 
            onClick={onNavigate} 
            className="w-full bg-goldenYellow-500 text-black font-bold py-4 px-6 rounded-lg hover:bg-goldenYellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-goldenYellow-500/30"
        >
          Explorar Minhas Primeiras Missões
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;
