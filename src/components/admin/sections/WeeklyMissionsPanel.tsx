
import React, { useState, useEffect } from 'react';
import { listAllMissions, loadSupabaseAdminRepository } from '../../../api/index'; // Updated import path to api/index where listAllMissions is exported
import { MissionIcon } from '../../../constants';
import { config } from '../../../core/config';


export default function WeeklyMissionsPanel() {
  const [missions, setMissions] = useState<any[]>([]);

  useEffect(() => {
    const fetchMissions = async () => {
        try {
            let allMissions: any[] = [];
            if (config.backendProvider === 'supabase') {
                const { missions } = await (await loadSupabaseAdminRepository()).fetchAdminMissions();
                allMissions = missions || [];
            } else {
                allMissions = await listAllMissions();
            }
            // Filter for what looks like generated weekly missions (usually contain slot info or scheduled)
            const weekly = allMissions.filter((x: any) => !x.eventId && (x.slot || (x.status === 'scheduled' && !x.userId)));
            setMissions(weekly.slice(0, 6)); // Show only this week's batch usually
        } catch (error) {
            console.error('[WeeklyMissionsPanel] Failed to load missions', error);
            setMissions([]);
        }
    };
    fetchMissions();
  }, []);

  return (
    <div className="bg-[#181818] border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
             <MissionIcon className="w-5 h-5 text-green-400" />
             <h3 className="font-bold text-white text-lg">Cronograma Semanal</h3>
        </div>
        <div className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-700">
            V4.1 Generator
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {missions.map(m => (
          <div key={m.id} className="bg-gray-800/50 border border-gray-700 p-3 rounded-lg flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-900/20 px-1.5 rounded">{m.slot || 'Extra'}</span>
                <span className="text-[10px] text-gray-500">{m.scheduledFor ? new Date(m.scheduledFor).toLocaleDateString('pt-BR', { weekday: 'short' }) : 'N/A'}</span>
            </div>
            <p className="text-sm font-medium text-gray-200 line-clamp-1 mb-1">{m.title}</p>
            <div className="mt-auto pt-2 flex justify-between items-center text-xs text-gray-500 font-mono border-t border-gray-700/50">
                <span>Tipo {m.type}</span>
                <span>{m.xp} XP</span>
            </div>
          </div>
        ))}
        {missions.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-600 border-2 border-dashed border-gray-800 rounded-lg">
                Nenhum cronograma ativo. Gere missões no painel "Gerenciador".
            </div>
        )}
      </div>
    </div>
  );
}
