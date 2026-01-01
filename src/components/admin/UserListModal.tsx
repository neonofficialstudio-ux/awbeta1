import React from 'react';
import type { User } from '../../types';

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  title: string;
}

const UserListModal: React.FC<UserListModalProps> = ({ isOpen, onClose, users, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-goldenYellow-400">{title}</h2>
            <p className="text-gray-400">{users.length} usuário(s) encontrado(s)</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl font-bold">&times;</button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {users.length > 0 ? (
            <ul className="space-y-3">
              {users.map(user => (
                <li key={user.id} className="flex items-center bg-gray-800/50 p-3 rounded-lg">
                  <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full mr-4" />
                  <div className="flex-grow">
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum usuário encontrado para esta categoria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserListModal;
