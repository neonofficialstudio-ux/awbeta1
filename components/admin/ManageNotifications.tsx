import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { User } from '../../types';
import { SearchIcon } from '../../constants';

interface ManageNotificationsProps {
  allUsers: User[];
  onSend: (payload: { title: string; message: string; isGlobal: boolean; targetUserIds?: string[] }) => Promise<void>;
}

const ManageNotifications: React.FC<ManageNotificationsProps> = ({ allUsers, onSend }) => {
  const [type, setType] = useState<'global' | 'private'>('global');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userList = useMemo(() => allUsers.filter(u => u.role === 'user'), [allUsers]);
  
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return userList;
    const lower = searchTerm.toLowerCase();
    return userList.filter(u => u.name.toLowerCase().includes(lower) || u.artisticName.toLowerCase().includes(lower));
  }, [userList, searchTerm]);

  const selectedUsers = useMemo(() => userList.filter(u => selectedUserIds.includes(u.id)), [userList, selectedUserIds]);
  
  const handleToggleUser = (userId: string) => {
      setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
        alert("Título e mensagem são obrigatórios.");
        return;
    }
    if (type === 'private' && selectedUserIds.length === 0) {
        alert("Selecione pelo menos um usuário para uma notificação particular.");
        return;
    }
    
    setIsSending(true);
    try {
        await onSend({
            title,
            message,
            isGlobal: type === 'global',
            targetUserIds: type === 'private' ? selectedUserIds : undefined,
        });
        setTitle('');
        setMessage('');
        setSelectedUserIds([]);
        alert('Notificação enviada com sucesso!');
    } catch (error) {
        console.error("Failed to send notification:", error);
        alert("Erro ao enviar notificação.");
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
      <h3 className="text-xl font-bold mb-6">Enviar Notificação</h3>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Notificação</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" name="type" value="global" checked={type === 'global'} onChange={() => setType('global')} className="h-4 w-4 text-goldenYellow-500 bg-gray-700 border-gray-600 focus:ring-goldenYellow-500"/>
              <span className="text-gray-200">Global (para todos os usuários)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" name="type" value="private" checked={type === 'private'} onChange={() => setType('private')} className="h-4 w-4 text-goldenYellow-500 bg-gray-700 border-gray-600 focus:ring-goldenYellow-500"/>
              <span className="text-gray-200">Particular (para usuários específicos)</span>
            </label>
          </div>
        </div>
        
        {type === 'private' && (
          <div ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-300 mb-1">Destinatários</label>
            <div className="relative">
                <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-left flex justify-between items-center">
                    <span className="text-gray-400">{selectedUsers.length > 0 ? `${selectedUsers.length} usuário(s) selecionado(s)` : 'Selecione os usuários...'}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-[#181818] border border-gray-700 rounded-md shadow-lg">
                        <div className="p-2">
                             <div className="relative">
                                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-900 border-gray-600 rounded-md py-1 pl-8 pr-2 text-sm"/>
                             </div>
                        </div>
                        <ul className="max-h-60 overflow-y-auto p-2">
                            {filteredUsers.map(user => (
                                <li key={user.id} onClick={() => handleToggleUser(user.id)} className="flex items-center p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                                    <input type="checkbox" checked={selectedUserIds.includes(user.id)} readOnly className="h-4 w-4 mr-3 text-goldenYellow-500 bg-gray-600 border-gray-500 focus:ring-goldenYellow-500"/>
                                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                                    <div>
                                        <p className="text-sm font-medium">{user.name}</p>
                                        <p className="text-xs text-gray-400">{user.artisticName}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUsers.map(user => (
                        <div key={user.id} className="bg-gray-700 text-sm px-2 py-1 rounded-full flex items-center">
                            {user.name}
                            <button type="button" onClick={() => handleToggleUser(user.id)} className="ml-2 text-gray-400 hover:text-white">&times;</button>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Título</label>
          <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Mensagem</label>
          <textarea id="message" value={message} onChange={e => setMessage(e.target.value)} required rows={5} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"></textarea>
        </div>
        
        <div className="flex justify-end">
            <button type="submit" disabled={isSending} className="bg-goldenYellow-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-goldenYellow-400 transition-colors disabled:bg-gray-600 flex items-center justify-center h-10 w-48">
                {isSending ? <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'Enviar Notificação'}
            </button>
        </div>

      </form>
    </div>
  );
};

export default ManageNotifications;
