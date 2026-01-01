
import React from 'react';
import { ShieldIcon } from '../../../constants';

interface NotFoundStateProps {
  onGoHome?: () => void;
}

const NotFoundState: React.FC<NotFoundStateProps> = ({ onGoHome }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in-up">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-red-500/20 blur-[60px] rounded-full"></div>
        <ShieldIcon className="w-32 h-32 text-[#333] relative z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-black text-white z-20 font-chakra">
            404
        </div>
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-2 font-chakra uppercase tracking-wide">
          Área Desconhecida
      </h2>
      <p className="text-gray-400 max-w-md mb-8">
          A página que você está procurando não existe ou foi movida para outra dimensão do Artist World.
      </p>

      {onGoHome && (
          <button 
            onClick={onGoHome}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FFD447] to-[#C79B2C] text-black font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,212,71,0.3)]"
          >
              Voltar ao Dashboard
          </button>
      )}
    </div>
  );
};

export default NotFoundState;
