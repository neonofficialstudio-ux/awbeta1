import React from 'react';
import type { ArtistOfTheDayQueueEntry, ProcessedArtistOfTheDayQueueEntry } from '../../types';

interface ManageSpotlightQueueProps {
  queue: ArtistOfTheDayQueueEntry[];
  onProcess: (queueId: string) => void;
  history: ProcessedArtistOfTheDayQueueEntry[];
}

const ManageSpotlightQueue: React.FC<ManageSpotlightQueueProps> = ({ queue, onProcess, history }) => {
  return (
    <div className="space-y-8">
      <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-bold mb-6">Fila de Destaque "Artista do Dia" ({queue.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
              <tr>
                <th scope="col" className="px-2 py-3 text-center">#</th>
                <th scope="col" className="px-6 py-3">Usuário</th>
                <th scope="col" className="px-6 py-3">Item</th>
                <th scope="col" className="px-6 py-3">Na Fila Desde</th>
                <th scope="col" className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {queue.length > 0 ? (
                  queue.map((item, index) => (
                      <tr key={item.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="px-2 py-4 text-center font-bold">{index + 1}</td>
                          <td className="px-6 py-4">
                              <div className="flex items-center">
                                  <img src={item.userAvatar} alt={item.userName} className="w-10 h-10 rounded-full mr-3" />
                                  <div>
                                      <div className="font-medium text-white">{item.userName}</div>
                                      <div className="text-xs text-gray-500">{item.userId}</div>
                                  </div>
                              </div>
                          </td>
                          <td className="px-6 py-4 font-semibold">{item.itemName}</td>
                          <td className="px-6 py-4">{new Date(item.queuedAt).toLocaleString('pt-BR')}</td>
                          <td className="px-6 py-4">
                              <button 
                                  onClick={() => onProcess(item.id)}
                                  className="bg-green-500/80 text-white font-bold py-1 px-3 rounded-md text-sm hover:bg-green-500"
                              >
                                  Promover a Destaque
                              </button>
                          </td>
                      </tr>
                  ))
              ) : (
                  <tr><td colSpan={5} className="text-center py-8">A fila de destaque está vazia.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-bold mb-6">Histórico de Artistas Destacados</h3>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-800/50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3">Usuário</th>
                <th scope="col" className="px-6 py-3">Item</th>
                <th scope="col" className="px-6 py-3">Promovido em</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                  history.map(item => (
                      <tr key={item.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="px-6 py-4">
                              <div className="flex items-center">
                                  <img src={item.userAvatar} alt={item.userName} className="w-10 h-10 rounded-full mr-3" />
                                  <span className="font-medium text-white">{item.userName}</span>
                              </div>
                          </td>
                          <td className="px-6 py-4 font-semibold">{item.itemName}</td>
                          <td className="px-6 py-4">{new Date(item.processedAt).toLocaleString('pt-BR')}</td>
                      </tr>
                  ))
              ) : (
                  <tr><td colSpan={3} className="text-center py-8">Nenhum artista foi promovido ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageSpotlightQueue;