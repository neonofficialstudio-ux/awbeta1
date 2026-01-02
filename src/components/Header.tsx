
import React from 'react';
import { CoinIcon, XPIcon } from '../constants';
import { useAppContext } from '../constants';
import AvatarWithFrame from './AvatarWithFrame';
import CountUp from './CountUp';
import { formatNumber } from './ui/utils/format';

// Premium Gold Stat Component
const GoldStat: React.FC<{ 
    icon: React.ElementType; 
    value: number; 
    label?: string;
    onClick?: () => void;
}> = ({ icon: Icon, value, label, onClick }) => (
  <div 
    onClick={onClick}
    className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B0B0C]/80 border border-[#FFCF5A]/30 
        backdrop-blur-md shadow-[0_0_10px_rgba(255,207,90,0.1)] transition-all duration-300 group
        ${onClick ? 'cursor-pointer active:scale-95 hover:border-[#FFCF5A]/60 hover:bg-[#FFCF5A]/5' : ''}
    `}
  >
    <Icon className="w-4 h-4 text-[#FFCF5A] drop-shadow-[0_0_5px_rgba(255,207,90,0.5)] group-hover:scale-110 transition-transform" />
    <div className="flex flex-col leading-none">
        {label && <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{label}</span>}
        {/* Start prop removed to allow CountUp to manage its own history state */}
        <CountUp end={value} duration={1200} className="font-bold text-sm text-[#F5F5F5] font-chakra" />
    </div>
  </div>
);

const Header: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { activeUser: user } = state;

  if (!user) return null;

  const handleCoinClick = () => dispatch({ type: 'SET_STORE_TAB', payload: 'buy' });
  const handleProfileClick = () => dispatch({ type: 'SET_VIEW', payload: 'profile' });

  return (
    <header className="flex items-center justify-between w-full bg-[#0B0F17]/95 backdrop-blur-xl border border-[#FFCF5A]/10 sticky top-0 md:top-2 z-30 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all duration-300">
      
      {/* Left Side: Title or Spacer */}
      <div className="flex items-center gap-4 pl-14 md:pl-0">
          {/* Desktop Title */}
          <div className="hidden md:block">
              <h1 className="text-xl font-bold font-chakra text-white tracking-wider flex items-center gap-2">
                  ARTIST WORLD <span className="text-[#FFCF5A]/50 text-sm">///</span>
                  <span className="text-[10px] bg-[#FFCF5A]/10 px-2 py-0.5 rounded text-[#FFCF5A] font-mono uppercase border border-[#FFCF5A]/20">GOLD</span>
              </h1>
          </div>

          {/* Mobile Stats (Right of Hamburger) */}
          <div className="flex md:hidden items-center gap-2 animate-fade-in-up">
              <GoldStat 
                icon={CoinIcon} 
                value={user.coins} 
                onClick={handleCoinClick}
              />
              <GoldStat 
                icon={XPIcon} 
                value={user.xp} 
              />
          </div>
      </div>

      {/* Right Side: Desktop Stats & Profile */}
      <div className="flex items-center justify-end gap-3 md:gap-6">
        {/* Desktop Stats */}
        <div className="hidden md:flex items-center gap-3">
             <GoldStat 
                icon={CoinIcon} 
                value={user.coins} 
                onClick={handleCoinClick}
             />
             <GoldStat 
                icon={XPIcon} 
                value={user.xp} 
             />
        </div>

        <div className="h-8 w-px bg-[#FFCF5A]/10 hidden md:block mx-2"></div>

        {/* Profile Button */}
        <button 
            onClick={handleProfileClick} 
            className="group relative flex items-center gap-3 p-1 pr-1 md:pr-3 rounded-full hover:bg-[#FFCF5A]/5 transition-all duration-300 border border-transparent hover:border-[#FFCF5A]/20"
        >
          <div className="relative shrink-0">
            {/* Avatar Fix V1.0 - Enforced circular shape with overlay border */}
            <div className="relative w-10 h-10 rounded-full border-2 border-yellow-400 overflow-hidden flex-shrink-0 shadow-[0_0_12px_rgba(255,204,0,0.6)] transition-all duration-300">
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full !rounded-full !overflow-hidden"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#FFCF5A] rounded-full border-2 border-black shadow-[0_0_5px_rgba(255,207,90,0.8)] animate-pulse z-10"></div>
          </div>
          <div className="hidden md:block text-left">
            <p className="font-bold text-sm text-white group-hover:text-[#FFCF5A] transition-colors truncate max-w-[100px] font-chakra">{user.artisticName}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-white transition-colors">Ver Perfil</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
