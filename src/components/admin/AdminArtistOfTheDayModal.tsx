
import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import { getDisplayName } from '../../api/core/getDisplayName';

interface AdminArtistsOfTheDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  currentArtistIds: string[];
  onSave: (userIds: string[]) => Promise<void>; // V8.1 Async
}

const AdminArtistsOfTheDayModal: React.FC<AdminArtistsOfTheDayModalProps> = ({ isOpen, onClose, allUsers, currentArtistIds, onSave }) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(currentArtistIds);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedUserIds(currentArtistIds);
  }, [currentArtistIds, isOpen]);

  if (!isOpen) return null;

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    await onSave(selectedUserIds);
    setIsLoading(false);
    onClose();
  };
  
  const handleRemoveAll = async () => {
    setIsLoading(true);
    await onSave([]);
    setIsLoading(false);
    onClose();
  }

  const userList = allUsers.filter(u => u.role === 'user');

  return (
    <ModalPortal>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9000] p-4" onClick={onClose}>
        <div 
            className="bg-[#121212] rounded-2xl border border-gray-700 p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl md:text-2xl font-black text-[#FFD86B] font-chakra uppercase tracking-wide">
                    Selecionar Artistas do Dia
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">&times;</button>
            </div>
            
            <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 border-y border-gray-800 py-4 my-4">
                {userList.map(user => (
                    <label 
                        key={user.id}
                        className={`flex items-center p-3 rounded-xl cursor-pointer border transition-all duration-200
                            ${selectedUserIds.includes(user.id) ? 'bg-[#FFD86B]/10 border-[#FFD86B]/40' : 'bg-[#181818] border-transparent hover:bg-[#222]'}
                        `}
                    >
                        <input 
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => handleToggleUser(user.id)}
                            className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-[#FFD86B] focus:ring-[#FFD86B] transition-all"
                        />
                        <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full mx-4 object-cover border border-[#333]" />
                        <div>
                            <p className={`font-bold text-sm ${selectedUserIds.includes(user.id) ? 'text-white' : 'text-gray-400'}`}>
                                {getDisplayName({ ...user, artistic_name: user.artisticName })}
                            </p>
                            <p className="text-xs text-gray-500">{user.name}</p>
                        </div>
                    </label>
                ))}
                {userList.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">Nenhum usuário encontrado.</p>
                )}
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 pt-2">
                <button 
                    onClick={handleRemoveAll}
                    disabled={isLoading}
                    className="text-xs text-red-400 font-bold hover:text-red-300 hover:underline uppercase tracking-wide px-2"
                >
                    Remover Todos
                </button>
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="flex-1 md:flex-none py-3 px-6 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors text-xs uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex-1 md:flex-none py-3 px-8 rounded-xl bg-[#FFD86B] text-black font-black hover:bg-[#F6C560] transition-all text-xs uppercase tracking-widest shadow-lg shadow-[#FFD86B]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : 'Salvar Seleção'}
                    </button>
                </div>
            </div>
        </div>
        </div>
    </ModalPortal>
  );
};

export default AdminArtistsOfTheDayModal;
