import React, { useState } from 'react';
import type { Raffle } from '../../types';
import { TicketIcon } from '../../constants';

interface AdminDrawWinnerModalProps {
  raffle: Raffle;
  onClose: () => void;
  onConfirmDraw: (raffleId: string) => void;
}

const AdminDrawWinnerModal: React.FC<AdminDrawWinnerModalProps> = ({ raffle, onClose, onConfirmDraw }) => {
  const [isDrawing, setIsDrawing] = useState(false);

  const handleDraw = () => {
    setIsDrawing(true);
    // Simulate a draw with a delay for suspense
    setTimeout(() => {
      onConfirmDraw(raffle.id);
      // No need to close here, the parent component will handle it after the state update
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={isDrawing ? undefined : onClose}>
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-8 max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
        <TicketIcon className="w-16 h-16 mx-auto text-goldenYellow-400 mb-4" />
        <h2 className="text-2xl font-bold text-goldenYellow-400 mb-2">Realizar Sorteio</h2>
        <p className="text-gray-400 mb-6">Você está prestes a sortear o vencedor para o item:</p>
        
        <div className="bg-gray-800/50 p-4 rounded-lg mb-6 text-left">
            <p className="font-bold text-lg text-white">{raffle.itemName}</p>
            <p className="text-sm text-gray-500">Sorteio ID: {raffle.id}</p>
        </div>

        {!isDrawing ? (
            <>
                <p className="text-sm text-yellow-300/80 mb-6">Esta ação é irreversível e irá finalizar o sorteio, adicionando o prêmio ao inventário do vencedor.</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={onClose} className="py-2 px-6 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold">Cancelar</button>
                    <button onClick={handleDraw} className="py-2 px-8 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500">Realizar Sorteio</button>
                </div>
            </>
        ) : (
            <div className="py-10">
                <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-goldenYellow-500 mx-auto"></div>
                <p className="text-lg font-semibold text-white mt-4 animate-pulse">Sorteando o grande vencedor...</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminDrawWinnerModal;