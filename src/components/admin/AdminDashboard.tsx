// src/components/admin/AdminDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import type { MissionSubmission, RedeemedItem, UsableItemQueueEntry, CoinTransaction, ArtistOfTheDayQueueEntry, User, Mission } from '../../types';
import SystemHealthMonitor from './SystemHealthMonitor';
import TelemetryDashboard from './TelemetryDashboard';

import StatsPanel from './sections/StatsPanel';
import InsightsPanel from './sections/InsightsPanel';
import QueuePanel from './sections/QueuePanel';
import TelemetryPanel from './sections/TelemetryPanel';
import HeatmapPanel from './sections/HeatmapPanel';
import WeeklyMissionsPanel from './sections/WeeklyMissionsPanel';
import AuditPanel from './sections/AuditPanel';
import { adminPainelData } from '../../api/admin/painel';

import AdminArtistsOfTheDayModal from './AdminArtistOfTheDayModal';
import toast from 'react-hot-toast';

type AdminSubTab = 'ops_v4' | 'artist_of_day' | 'health' | 'telemetry_classic';

interface AdminDashboardProps {
  missionSubmissions: MissionSubmission[];
  redeemedItems: RedeemedItem[];
  usableItemQueue: UsableItemQueueEntry[];
  allTransactions: CoinTransaction[];
  artistOfTheDayQueue: ArtistOfTheDayQueueEntry[];
  allUsers: User[];
  missions: Mission[];
}

const SubTabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`relative px-6 py-2.5 font-bold transition-all duration-300 text-sm rounded-full border ${
      active
        ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/50 shadow-[0_0_15px_rgba(0,232,255,0.3)]'
        : 'bg-slate-dark text-gray-400 border-white/10 hover:text-white hover:border-white/30'
    }`}
  >
    {children}
  </button>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  missionSubmissions, redeemedItems, usableItemQueue, allTransactions, artistOfTheDayQueue,
  allUsers, missions,
}) => {
  void artistOfTheDayQueue;

  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('ops_v4');
  const [v4Data, setV4Data] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);
  const [schedulePickDay, setSchedulePickDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [aodSchedule, setAodSchedule] = useState<any[]>([]);
  const [aodMetrics, setAodMetrics] = useState<any>(null);
  const [aodMetricsDay, setAodMetricsDay] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isAodLoading, setIsAodLoading] = useState(false);

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of allUsers || []) map.set(u.id, u);
    return map;
  }, [allUsers]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await adminPainelData();
        setV4Data(data);
      } catch (error) {
        console.error('[AdminDashboard] Failed to load painel data', error);
        setV4Data(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const loadAodSchedule = async () => {
    try {
      setIsAodLoading(true);
      const api = await import('../../api/index');
      const rows = await api.adminListArtistOfDaySchedule(undefined, undefined, 21);
      setAodSchedule(rows || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao carregar agenda do Artista do Dia');
    } finally {
      setIsAodLoading(false);
    }
  };

  const loadAodMetrics = async (dayUtc?: string) => {
    try {
      const api = await import('../../api/index');
      const res = await api.getArtistOfDayMetrics(dayUtc);
      setAodMetrics(res);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao carregar métricas');
    }
  };

  const refreshCurrentArtist = async () => {
    try {
      const api = await import('../../api/index');
      const payload = await api.getArtistOfDay();
      setCurrentArtistId(payload?.artist?.id || null);
    } catch (e) {
      console.error('[ArtistOfDay][admin] refresh current failed', e);
    }
  };

  useEffect(() => {
    if (activeSubTab !== 'artist_of_day') return;
    void refreshCurrentArtist();
    void loadAodSchedule();
    void loadAodMetrics(aodMetricsDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab]);

  const currentUser = currentArtistId ? usersById.get(currentArtistId) : null;

  const onModalSave = async (userIds: string[]) => {
    try {
      if (!userIds?.length) {
        toast.error('Selecione 1 usuário');
        return;
      }
      const pickedId = userIds[0];
      const api = await import('../../api/index');

      setBusy(true);

      if (schedulePickDay) {
        await api.adminScheduleArtistOfDay(schedulePickDay, pickedId);
        toast.success('✅ Agendado!');
        setIsArtistModalOpen(false);
        setSchedulePickDay(null);
        await loadAodSchedule();
        await refreshCurrentArtist();
        return;
      }

      await api.adminSetArtistOfDay(pickedId);
      toast.success('✅ Artista do Dia definido!');
      await refreshCurrentArtist();
      await loadAodMetrics(aodMetricsDay);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao salvar Artista do Dia');
    } finally {
      setBusy(false);
      setIsArtistModalOpen(false);
    }
  };

  const onClearToday = async () => {
    setBusy(true);
    try {
      const api = await import('../../api/index');
      await api.adminClearArtistOfDay();
      toast.success('✅ Artista do Dia removido (hoje)');
      await refreshCurrentArtist();
      await loadAodMetrics(aodMetricsDay);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao remover');
    } finally {
      setBusy(false);
    }
  };

  const handleUnschedule = async (dayUtc: string) => {
    try {
      const api = await import('../../api/index');
      await api.adminUnscheduleArtistOfDay(dayUtc);
      toast.success('Agendamento removido');
      await loadAodSchedule();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao remover agendamento');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-gold-cinematic border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 px-1">
        <SubTabButton active={activeSubTab === 'ops_v4'} onClick={() => setActiveSubTab('ops_v4')}>Live Ops Center</SubTabButton>
        <SubTabButton active={activeSubTab === 'artist_of_day'} onClick={() => setActiveSubTab('artist_of_day')}>Artista do Dia</SubTabButton>
        <SubTabButton active={activeSubTab === 'health'} onClick={() => setActiveSubTab('health')}>System Health</SubTabButton>
        <SubTabButton active={activeSubTab === 'telemetry_classic'} onClick={() => setActiveSubTab('telemetry_classic')}>Telemetria</SubTabButton>
      </div>

      {activeSubTab === 'ops_v4' && v4Data && (
        <div className="animate-fade-in-up grid grid-cols-1 gap-6">
          <StatsPanel data={v4Data.analytics} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <WeeklyMissionsPanel />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TelemetryPanel telemetry={v4Data.telemetry} />
                <HeatmapPanel heatmap={v4Data.heatmap} />
              </div>
            </div>
            <div className="space-y-6">
              <InsightsPanel insights={v4Data.insights} />
              <QueuePanel />
              <AuditPanel />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'artist_of_day' && (
        <div className="animate-fade-in-up grid grid-cols-1 gap-6">
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-[#FFD86B] uppercase tracking-wide">Artista do Dia</h3>
                <p className="text-xs text-gray-400 mt-1">Atual: {currentUser?.artisticName || currentUser?.name || currentArtistId || '—'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => { setSchedulePickDay(null); setIsArtistModalOpen(true); }}
                  className="px-4 py-2 rounded-xl bg-[#FFD86B] text-black text-xs font-black hover:bg-[#F6C560] disabled:opacity-50"
                >
                  Definir (Hoje)
                </button>
                <button
                  disabled={busy}
                  onClick={onClearToday}
                  className="px-4 py-2 rounded-xl bg-red-500/90 text-black text-xs font-black hover:bg-red-400 disabled:opacity-50"
                >
                  Remover (Hoje)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#101010] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-black uppercase tracking-wide">Agenda (UTC)</h3>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10"
                      onClick={() => loadAodSchedule()}
                    >
                      Atualizar
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg bg-[#FFD86B] text-black text-xs font-black hover:bg-[#F6C560]"
                      onClick={() => { setSchedulePickDay(new Date().toISOString().slice(0, 10)); setIsArtistModalOpen(true); }}
                    >
                      Agendar (Hoje)
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="date"
                    value={schedulePickDay || ''}
                    onChange={(e) => setSchedulePickDay(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
                  />
                  <button
                    className="px-4 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 text-xs font-bold hover:bg-neon-cyan/20"
                    onClick={() => {
                      if (!schedulePickDay) return toast.error('Selecione um dia');
                      setIsArtistModalOpen(true);
                    }}
                  >
                    Escolher Artista
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 text-xs font-bold hover:bg-red-500/20"
                    onClick={() => {
                      if (!schedulePickDay) return toast.error('Selecione um dia');
                      void handleUnschedule(schedulePickDay);
                    }}
                  >
                    Remover do Dia
                  </button>
                </div>

                {isAodLoading ? (
                  <div className="text-gray-400 text-sm">Carregando...</div>
                ) : (
                  <div className="space-y-2">
                    {aodSchedule.length === 0 && (
                      <div className="text-gray-500 text-sm">Sem agendamentos futuros.</div>
                    )}
                    {aodSchedule.map((row: any) => (
                      <div key={row.day_utc} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-sm">
                          <div className="text-white font-bold">{row.day_utc}</div>
                          <div className="text-gray-400 text-xs">artist_id: {row.artist_id}</div>
                        </div>
                        <button
                          className="px-3 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 text-xs font-bold hover:bg-red-500/20"
                          onClick={() => void handleUnschedule(row.day_utc)}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#101010] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-black uppercase tracking-wide">Métricas (low-burst)</h3>
                  <button
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10"
                    onClick={() => loadAodMetrics(aodMetricsDay)}
                  >
                    Atualizar
                  </button>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="date"
                    value={aodMetricsDay}
                    onChange={(e) => setAodMetricsDay(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
                  />
                  <button
                    className="px-4 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 text-xs font-bold hover:bg-neon-cyan/20"
                    onClick={() => loadAodMetrics(aodMetricsDay)}
                  >
                    Ver
                  </button>
                </div>

                {!aodMetrics ? (
                  <div className="text-gray-500 text-sm">Sem dados.</div>
                ) : aodMetrics?.has_artist === false ? (
                  <div className="text-gray-500 text-sm">Nenhum artista definido nesse dia.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-gray-400 uppercase">Unique viewers</div>
                      <div className="text-2xl font-black text-white">{aodMetrics.unique_viewers ?? 0}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-gray-400 uppercase">Total clicks</div>
                      <div className="text-2xl font-black text-white">{aodMetrics.total_clicks ?? 0}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-gray-400 uppercase">Bonus awards</div>
                      <div className="text-2xl font-black text-white">{aodMetrics.bonus_awards ?? 0}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-gray-400 uppercase">By platform</div>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(aodMetrics.clicks_by_platform || {}, null, 2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <AdminArtistsOfTheDayModal
            isOpen={isArtistModalOpen}
            onClose={() => { setIsArtistModalOpen(false); setSchedulePickDay(null); }}
            allUsers={allUsers}
            currentArtistIds={currentArtistId ? [currentArtistId] : []}
            onSave={onModalSave}
          />
        </div>
      )}

      {activeSubTab === 'health' && (
        <SystemHealthMonitor
          allUsers={allUsers}
          missions={missions}
          missionSubmissions={missionSubmissions}
          redeemedItems={redeemedItems}
          allTransactions={allTransactions}
          usableItemQueue={usableItemQueue}
        />
      )}

      {activeSubTab === 'telemetry_classic' && (
        <TelemetryDashboard allUsers={allUsers} />
      )}
    </div>
  );
};

export default AdminDashboard;
