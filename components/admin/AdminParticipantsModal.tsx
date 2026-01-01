import React, { useMemo } from 'react';
import type { Event, Participation, User } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';

interface AdminParticipantsModalProps {
  item: Event;
  participations: Participation[];
  allUsers: User[];
  onClose: () => void;
}

const AdminParticipantsModal: React.FC<AdminParticipantsModalProps> = ({ item, participations, allUsers, onClose }) => {
  const participants = useMemo(() => {
    return participations
      .filter(p => p.eventId === item.id)
      .map(p => {
        const user = allUsers.find(u => u.id === p.userId);
        return {
          ...p,
          user,
        };
      })
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
  }, [item, participations, allUsers]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-2xl w-full">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-2xl font-bold text-goldenYellow-400">Inscritos em "{item.title}"</h2>
                <p className="text-gray-400">{participants.length} participante(s)</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl font-bold">&times;</button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2">
            {participants.length > 0 ? (
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-800/50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">Usuário</th>
                            <th scope="col" className="px-6 py-3">Data de Inscrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map(p => (
                            <tr key={p.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                                <td className="px-6 py-4">
                                    {p.user ? (
                                        <div className="flex items-center">
                                            <AvatarWithFrame user={p.user} sizeClass="w-10 h-10" className="mr-3" />
                                            <div>
                                                <div className="font-medium text-white">{p.user.name}</div>
                                                <div className="text-xs text-gray-500">{p.user.email}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">Usuário não encontrado</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">{new Date(p.joinedAt).toLocaleString('pt-BR')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum usuário se inscreveu ainda.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminParticipantsModal;