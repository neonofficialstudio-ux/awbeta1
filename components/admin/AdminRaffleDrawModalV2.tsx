
import React, { useState, useEffect, useRef } from 'react';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import type { Raffle, User, RaffleTicket } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';
import { TicketIcon, CrownIcon, CheckIcon } from '../../constants';

interface AdminRaffleDrawModalV2Props {
    raffle: Raffle;
    participants: User[];
    tickets: RaffleTicket[];
    onClose: () => void;
    onConfirmWinner: (winnerId: string) => void;
}

const AdminRaffleDrawModalV2: React.FC<AdminRaffleDrawModalV2Props> = ({ raffle, participants, tickets, onClose, onConfirmWinner }) => {
    const [stage, setStage] = useState<'intro' | 'shuffling' | 'reveal' | 'confirmed'>('intro');
    const [displayedUser, setDisplayedUser] = useState<User | null>(null);
    const [finalWinner, setFinalWinner] = useState<User | null>(null);
    const shuffleInterval = useRef<any>(null);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (shuffleInterval.current) clearInterval(shuffleInterval.current);
        };
    }, []);

    const startShuffle = () => {
        setStage('shuffling');
        let counter = 0;
        const totalDuration = 4000; // 4s shuffle
        const speed = 80; // ms

        shuffleInterval.current = setInterval(() => {
            const randomTicket = tickets[Math.floor(Math.random() * tickets.length)];
            const randomUser = participants.find(u => u.id === randomTicket.userId);
            if (randomUser) setDisplayedUser(randomUser);
            
            counter += speed;
            if (counter >= totalDuration) {
                clearInterval(shuffleInterval.current);
                selectWinner();
            }
        }, speed);
    };

    const selectWinner = () => {
        // Determine winner based on weighted probability (1 ticket = 1 chance)
        const winningTicket = tickets[Math.floor(Math.random() * tickets.length)];
        const winner = participants.find(u => u.id === winningTicket.userId);
        
        if (winner) {
            setFinalWinner(winner);
            setDisplayedUser(winner);
            setStage('reveal');
        } else {
            // Fallback safety
            alert("Erro ao selecionar vencedor. Tente novamente.");
            onClose();
        }
    };

    const handleConfirm = () => {
        if (finalWinner) {
            onConfirmWinner(finalWinner.id);
            setStage('confirmed'); // Optional visual feedback before close
        }
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
                <div className="relative bg-[#0E0E0E] w-full max-w-lg rounded-[32px] border-2 border-[#FFD86B]/30 shadow-[0_0_80px_rgba(255,216,107,0.15)] overflow-hidden flex flex-col">
                    
                    {/* Cinematic Header */}
                    <div className="relative h-32 bg-gradient-to-b from-[#2A220A] to-[#0E0E0E] flex items-center justify-center border-b border-[#FFD86B]/10">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                        <div className="text-center z-10">
                             <p className="text-[#FFD86B] text-[10px] font-black uppercase tracking-[0.3em] mb-2 animate-pulse">Sorteio Oficial</p>
                             <h2 className="text-2xl font-black text-white font-chakra uppercase tracking-wider drop-shadow-lg">{raffle.itemName}</h2>
                        </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-10 flex flex-col items-center min-h-[300px] justify-center">
                        
                        {stage === 'intro' && (
                            <div className="text-center space-y-6 animate-pop-in">
                                <div className="w-24 h-24 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-inner">
                                    <TicketIcon className="w-10 h-10 text-[#FFD86B]" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg">{tickets.length} Bilhetes Vendidos</p>
                                    <p className="text-gray-500 text-sm mt-1">{participants.length} Participantes Únicos</p>
                                </div>
                                <button 
                                    onClick={startShuffle}
                                    className="px-10 py-4 bg-[#FFD86B] text-black font-black rounded-xl uppercase tracking-widest hover:scale-105 hover:shadow-[0_0_30px_rgba(255,216,107,0.5)] transition-all duration-300"
                                >
                                    Iniciar Sorteio
                                </button>
                            </div>
                        )}

                        {stage === 'shuffling' && (
                            <div className="text-center space-y-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#FFD86B]/20 blur-xl rounded-full animate-pulse"></div>
                                    {displayedUser && <AvatarWithFrame user={displayedUser} sizeClass="w-32 h-32" className="relative z-10" />}
                                </div>
                                <h3 className="text-2xl font-black text-white font-chakra animate-pulse tracking-wide">
                                    {displayedUser?.artisticName || '...'}
                                </h3>
                            </div>
                        )}

                        {stage === 'reveal' && finalWinner && (
                            <div className="text-center space-y-6 animate-pop-spring">
                                <div className="relative inline-block">
                                    <div className="absolute -inset-10 bg-gradient-to-tr from-[#FFD86B]/0 via-[#FFD86B]/30 to-[#FFD86B]/0 rounded-full animate-spin-slow opacity-50"></div>
                                    <AvatarWithFrame user={finalWinner} sizeClass="w-40 h-40" className="relative z-10 border-4 border-[#FFD86B] shadow-2xl" />
                                    <div className="absolute -top-6 -right-4 bg-[#FFD86B] text-black p-3 rounded-full shadow-lg animate-bounce z-20">
                                        <CrownIcon className="w-6 h-6" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[#FFD86B] font-bold text-xs uppercase tracking-widest mb-2">Vencedor Selecionado</p>
                                    <h3 className="text-4xl font-black text-white font-chakra tracking-tight leading-none mb-1">{finalWinner.artisticName}</h3>
                                    <p className="text-gray-500 text-sm font-mono">{finalWinner.name}</p>
                                </div>
                                
                                <div className="bg-[#151515] p-4 rounded-xl border border-[#333] w-full text-xs text-gray-400">
                                    <p>ID: {finalWinner.id}</p>
                                    <p>Tickets: {tickets.filter(t => t.userId === finalWinner.id).length} ({((tickets.filter(t => t.userId === finalWinner.id).length / tickets.length) * 100).toFixed(1)}% chance)</p>
                                </div>

                                <div className="flex gap-3 w-full">
                                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#333] text-gray-400 hover:bg-white/5 hover:text-white font-bold text-xs uppercase tracking-wide transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl bg-green-500 text-black font-black text-xs uppercase tracking-wide hover:bg-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all">
                                        Confirmar Premiação
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default AdminRaffleDrawModalV2;
