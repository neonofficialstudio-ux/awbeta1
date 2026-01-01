
import React, { useState, useEffect } from 'react';
import { queueListAPI } from '../../../api/queue';
import { QueueIcon } from '../../../constants';
import type { QueueItem } from '../../../types';

export default function QueuePanel() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = queueListAPI();
    setQueue(data);
    setLoading(false);
  }, []);

  if (loading) return <div className="animate-pulse h-20 bg-slate-dark rounded-xl"></div>;

  return (
    <div className="bg-slate-dark border border-white/5 rounded-2xl p-6 shadow-lg hover:border-gold-cinematic/20 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-deep rounded-lg border border-gold-cinematic/30">
                <QueueIcon className="w-5 h-5 text-gold-cinematic" />
            </div>
            <h3 className="font-bold text-white text-lg font-chakra tracking-wide">Fila de Produção</h3>
        </div>
        <span className="bg-navy-deep text-gold-cinematic border border-gold-cinematic/20 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">{queue.length} itens</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-navy-deep">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="text-xs text-gray-500 uppercase bg-black/20 border-b border-white/5">
             <tr>
                 <th className="px-4 py-3">Prioridade</th>
                 <th className="px-4 py-3">Item</th>
                 <th className="px-4 py-3">Status</th>
                 <th className="px-4 py-3 text-right">ID</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {queue.slice(0, 5).map((item: any) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                        <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded-md border ${item.priority === 3 || item.priority > 3 ? 'bg-red-900/20 text-red-400 border-red-500/30' : 'bg-slate-700/30 text-gray-300 border-white/10'}`}>
                            {item.priority >= 3 ? 'Alta' : 'Normal'}
                        </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-200">{item.itemName || 'Item Genérico'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-blue-400">{item.status}</td>
                    <td className="px-4 py-3 text-xs font-mono opacity-50 text-right">{item.id.slice(0,6)}...</td>
                </tr>
            ))}
            {queue.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600 italic">Fila vazia. Ocioso.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {queue.length > 5 && (
          <div className="text-center mt-4 text-xs font-bold text-gray-500 hover:text-white cursor-pointer uppercase tracking-widest transition-colors">
              Ver mais {queue.length - 5} itens...
          </div>
      )}
    </div>
  );
}
