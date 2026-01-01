import React from 'react';
import { StarIcon, CrownIcon } from '../constants';

interface ArtistOfTheDayModalProps {
  onClose: () => void;
  onNavigate: () => void;
}

const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    Icon: Math.random() > 0.5 ? StarIcon : CrownIcon,
    size: Math.random() * 20 + 10,
    top: `${Math.random() * 80 + 10}%`,
    left: `${Math.random() * 80 + 10}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${Math.random() * 1.2 + 1}s`,
}));


const ArtistOfTheDayModal: React.FC<ArtistOfTheDayModalProps> = ({ onClose, onNavigate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-[#1c1c1c] to-[#121212] rounded-2xl border-2 border-goldenYellow-500/50 p-8 text-center relative overflow-hidden shadow-2xl shadow-goldenYellow-500/20 max-w-md w-full animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
         {particles.map(p => (
            <p.Icon key={p.id} className="absolute text-goldenYellow-400 opacity-0 animate-celebrate-float" style={{
                width: `${p.size}px`,
                top: p.top,
                left: p.left,
                animationDelay: p.delay,
                animationDuration: p.duration,
            }} />
        ))}
        
        <CrownIcon className="w-24 h-24 mx-auto text-goldenYellow-400" />
        
        <h2 className="text-4xl font-bold text-goldenYellow-400 mt-4 mb-4 tracking-wide" style={{ textShadow: '0 0 15px rgba(251, 191, 36, 0.6)' }}>
          Você está em Destaque!
        </h2>
        <p className="text-gray-300 mb-6 text-lg">Parabéns! Você é um dos Artistas do Dia.</p>
        
        <div className="my-8">
            <p className="text-gray-400">Seu perfil está em destaque no Dashboard principal da plataforma para todos os usuários verem. Aproveite a visibilidade para ganhar novos fãs e interações!</p>
        </div>
        
        <button 
            onClick={onNavigate} 
            className="w-full bg-goldenYellow-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-goldenYellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-goldenYellow-500/30"
        >
          Ver meu Destaque
        </button>
      </div>
    </div>
  );
};

export default ArtistOfTheDayModal;
