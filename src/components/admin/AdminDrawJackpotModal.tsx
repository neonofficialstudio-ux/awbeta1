
import React, { useState, useEffect } from 'react';
import type { JackpotTicket, User } from '../../types';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import { CrownIcon, CoinIcon, UsersIcon } from '../../constants';
import { getDisplayName } from '../../api/core/getDisplayName';
import AvatarWithFrame from '../AvatarWithFrame';

interface AdminDrawJackpotModalProps {
  tickets: JackpotTicket[];
  allUsers: User[];
  currentPot: number;
  onClose: () => void;
  onConfirmDraw: (nextStartDate?: string) => void;
}

const AdminDrawJackpotModal: React.FC<AdminDrawJackpotModalProps> = ({ tickets, allUsers, currentPot, onClose, onConfirmDraw }) => {
  const [step, setStep] = useState<'confirm' | 'spinning' | 'winner'>('confirm');
  const [displayedUser, setDisplayedUser] = useState<User | null>(null);
  const [winner, setWinner] = useState<User | null>(null);
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    if (step === 'spinning') {
        let count = 0;
        const interval = setInterval(() => {
            const randomTicket = tickets[Math.floor(Math.random() * tickets.length)];
            const randomUser = allUsers.find(u => u.id === randomTicket.userId);
            if (randomUser) setDisplayedUser(randomUser);
            count++;
            if (count > 20) { // Spin for ~2 seconds
                clearInterval(interval);
                determineWinner();
            }
        }, 100);
        return () => clearInterval(interval);
    }
  }, [step]);

  const determineWinner = () => {
      // Determine winner logic (matches backend logic for consistency display)
      // In a real app, backend should determine this and return it, but for the modal flow we simulate selection visually first
      const winnerTicket = tickets[Math.floor(Math.random() * tickets.length)];
      const winnerUser = allUsers.find(u => u.id === winnerTicket.userId);
      
      if (winnerUser) {
          setWinner(winnerUser);
          setDisplayedUser(winnerUser);
          const userTickets = tickets.filter(t => t.userId === winnerUser.id).length;
          setTicketCount(userTickets);
          setStep('winner');
      }
  };

  const handleConfirm = () => {
      // Execute backend call
      onConfirmDraw();
      // Close modal happens via parent refresh usually, but we can close local
      onClose(); 
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <div 
            className="bg-[#121212] w-full max-w-lg rounded-3xl border-2 border-yellow-500/30 shadow-[0_0_60px_rgba(234,179,8,0.2)] overflow-hidden flex flex-col animate-pop-in relative"
            onClick={e => e.stopPropagation()}
        >
            {/* Background FX */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>

            {step === 'confirm' && (
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                        <CrownIcon className="w-10 h-10 text-yellow-500" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-white font-chakra uppercase tracking-wider mb-2">
                        Sorteio do Jackpot
                    </h2>
                    <p className="text-gray-400 text-sm mb-8">
                        Você está prestes a sortear o prêmio acumulado.
                    </p>

                    <div className="bg-[#0E0E0E] border border-yellow-500/20 p-6 rounded-2xl mb-8">
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                            <span className="text-xs text-gray-400 uppercase font-bold">Prêmio Total</span>
                            <div className="flex items-center gap-2 text-yellow-400 font-black text-xl">
                                <CoinIcon className="w-5 h-5" />
                                {currentPot.toLocaleString()}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400 uppercase font-bold">Participantes</span>
                            <div className="flex items-center gap-2 text-white font-bold">
                                <UsersIcon className="w-5 h-5 text-gray-500" />
                                {new Set(tickets.map(t => t.userId)).size}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 rounded-xl bg-gray-800 text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-gray-700 transition-colors">Cancelar</button>
                        <button onClick={() => setStep('spinning')} className="flex-1 py-4 rounded-xl bg-yellow-500 text-black font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20">Iniciar Sorteio</button>
                    </div>
                </div>
            )}

            {step === 'spinning' && (
                <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="relative mb-8">
                         <div className="absolute -inset-4 border-2 border-yellow-500 rounded-full animate-spin border-t-transparent"></div>
                         {displayedUser ? (
                             <AvatarWithFrame user={displayedUser} sizeClass="w-32 h-32" />
                         ) : (
                             <div className="w-32 h-32 bg-gray-800 rounded-full"></div>
                         )}
                    </div>
                    <h3 className="text-xl font-bold text-yellow-500 animate-pulse">Sorteando...</h3>
                    {displayedUser && <p className="text-white mt-2 font-mono">{getDisplayName({ ...displayedUser, artistic_name: displayedUser.artisticName })}</p>}
                </div>
            )}

            {step === 'winner' && winner && (
                <div className="p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
                    
                    <p className="text-yellow-500 text-xs font-black uppercase tracking-[0.3em] mb-6">VENCEDOR SELECIONADO</p>
                    
                    <div className="relative inline-block mb-6">
                        <div className="absolute -inset-6 bg-yellow-500/20 blur-xl rounded-full"></div>
                        <AvatarWithFrame user={winner} sizeClass="w-32 h-32" className="ring-4 ring-yellow-500 shadow-2xl relative z-10" />
                        <div className="absolute -top-4 -right-4 bg-yellow-500 text-black p-2 rounded-full z-20 shadow-lg animate-bounce">
                            <CrownIcon className="w-6 h-6" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-white font-chakra mb-1">{getDisplayName({ ...winner, artistic_name: winner.artisticName })}</h2>
                    <p className="text-gray-400 text-sm mb-8">{winner.name}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-[#0E0E0E] p-4 rounded-xl border border-white/10">
                             <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Tickets</p>
                             <p className="text-xl font-bold text-white">{ticketCount}</p>
                        </div>
                        <div className="bg-[#0E0E0E] p-4 rounded-xl border border-yellow-500/30">
                             <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Prêmio</p>
                             <p className="text-xl font-bold text-yellow-400">{currentPot.toLocaleString()} LC</p>
                        </div>
                    </div>

                    <button 
                        onClick={handleConfirm}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black text-sm uppercase tracking-widest hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all transform hover:scale-[1.02]"
                    >
                        Confirmar e Premiar
                    </button>
                </div>
            )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default AdminDrawJackpotModal;
