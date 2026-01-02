import React, { useState, useMemo } from 'react';
import type { Raffle, RaffleTicket, User } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';
import { SearchIcon } from '../../constants';

interface AdminRaffleParticipantsModalProps {
  raffle: Raffle;
  allTickets: RaffleTicket[];
  allUsers: User[];
  onClose: () => void;
}

type Participant = {
  user: User;
  ticketCount: number;
};

const AdminRaffleParticipantsModal: React.FC<AdminRaffleParticipantsModalProps> = ({ raffle, allTickets, allUsers, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const participants = useMemo(() => {
    const ticketCounts: Record<string, number> = {};
    allTickets
      .filter(t => t.raffleId === raffle.id)
      .forEach(ticket => {
        ticketCounts[ticket.userId] = (ticketCounts[ticket.userId] || 0) + 1;
      });

    return Object.entries(ticketCounts)
      .map(([userId, ticketCount]) => {
        const user = allUsers.find(u => u.id === userId);
        return user ? { user, ticketCount } : null;
      })
      .filter((p): p is Participant => p !== null)
      .sort((a, b) => b.ticketCount - a.ticketCount);
  }, [raffle.id, allTickets, allUsers]);

  const filteredParticipants = useMemo(() => {
    if (!searchTerm.trim()) {
      return participants;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return participants.filter(p =>
      p.user.name.toLowerCase().includes(lowercasedFilter)
    );
  }, [participants, searchTerm]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-2xl w-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-goldenYellow-400">Participantes: {raffle.itemName}</h2>
            <p className="text-gray-400">{participants.length} participante(s) | {allTickets.filter(t=>t.raffleId === raffle.id).length} bilhete(s) no total</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl font-bold">&times;</button>
        </div>
        
        <div className="relative mb-4">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <input
                type="text"
                placeholder="Buscar participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-goldenYellow-500"
            />
        </div>

        <div className="flex-grow max-h-[60vh] overflow-y-auto pr-2">
          {filteredParticipants.length > 0 ? (
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-300 uppercase bg-gray-800/50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3">Usuário</th>
                  <th scope="col" className="px-6 py-3 text-right">Bilhetes</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map(({ user, ticketCount }) => (
                  <tr key={user.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <AvatarWithFrame user={user} sizeClass="w-10 h-10" className="mr-3" />
                        <div>
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-lg text-goldenYellow-300">{ticketCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum participante encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRaffleParticipantsModal;