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

function utcDateISO(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  missionSubmissions,
  redeemedItems,
  usableItemQueue,
  allTransactions,
  artistOfTheDayQueue,
  allUsers,
  missions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('ops_v4');
  const [v4Data, setV4Data] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Artist of Day admin UI state
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);
  const [currentDayUtc, setCurrentDayUtc] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [scheduleRows, setScheduleRows] = useState<Array<{ day_utc: string; artist_id: string }>>([]);
  const [schedulePickDay, setSchedulePickDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of allUsers || []) map.set(u.id, u);
    return map;
  }, [allUsers]);

  const scheduleRange = useMemo(() => {
    const from = utcDateISO(new Date());
    const toDate = new Date();
    toDate.setUTCDate(toDate.getUTCDate() + 14);
    const to = utcDateISO(toDate);
    return { from, to };
  }, []);

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

  // A) refetch helper (Atual + metrics + schedule) — sem burst
  const refreshArtistOfDayAdmin = async () => {
    try {
      const api = await import('../../api/index');
      const payload = await api.getArtistOfDay();
      const artistId = payload?.artist?.id || null;
      setCurrentArtistId(artistId);
      setCurrentDayUtc(payload?.day_utc || null);

      const [m, sched] = await Promise.all([
        api.adminGetArtistOfDayMetrics(payload?.day_utc),
        api.adminListArtistOfDaySchedule(scheduleRange.from, scheduleRange.to, 60),
      ]);

      setMetrics(m || null);
      setScheduleRows((sched || []).map((r: any) => ({ day_utc: r.day_utc, artist_id: r.artist_id })));
    } catch (e: any) {
      console.error('[ArtistOfDay][admin] refresh failed', e);
      toast.error(e?.message || 'Falha ao atualizar Artista do Dia');
    }
  };

  // Carrega só quando entra na sub-aba (evita requests à toa)
  useEffect(() => {
    if (activeSubTab !== 'artist_of_day') return;
    void refreshArtistOfDayAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab]);

  const currentUser = currentArtistId ? usersById.get(currentArtistId) : null;

  const openSetTodayModal = () => {
    setSchedulePickDay(null);
    setIsArtistModalOpen(true);
  };

  const openScheduleDayModal = (dayUtc: string) => {
    setSchedulePickDay(dayUtc);
    setIsArtistModalOpen(true);
  };

  const onModalSave = async (userIds: string[]) => {
    // Modal existente é multi — aqui usamos só 1 (primeiro)
    const picked = userIds?.[0] || null;
    if (!picked) {
      toast.error('Selecione 1 artista');
      return;
    }

    setBusy(true);
    try {
      const api = await import('../../api/index');

      if (schedulePickDay) {
        await api.adminScheduleArtistOfDay(schedulePickDay, picked);
        toast.success(`✅ Agendado para ${schedulePickDay}`);
      } else {
        await api.adminSetArtistOfDay(picked);
        toast.success('✅ Artista do Dia definido!');
      }

      await refreshArtistOfDayAdmin();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao salvar');
    } finally {
      setBusy(false);
      setIsArtistModalOpen(false);
      setSchedulePickDay(null);
    }
  };

  const onClearToday = async () => {
    setBusy(true);
    try {
      const api = await import('../../api/index');
      await api.adminClearArtistOfDay();
      toast.success('✅ Artista do Dia removido (hoje)');
      await refreshArtistOfDayAdmin();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao remover');
    } finally {
      setBusy(false);
    }
  };

  const onClearScheduleDay = async (dayUtc: string) => {
    setBusy(true);
    try {
      const api = await import('../../api/index');
      await api.adminClearArtistOfDayScheduleDay(dayUtc);
      toast.success(`✅ Agenda removida (${dayUtc})`);
      await refreshArtistOfDayAdmin();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao remover agenda');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-gold-cinematic border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 px-1">
        <SubTabButton active={activeSubTab === 'ops_v4'} onClick={() => setActiveSubTab('ops_v4')}>
          Live Ops Center
        </SubTabButton>
        <SubTabButton active={activeSubTab === 'artist_of_day'} onClick={() => setActiveSubTab('artist_of_day')}>
          Artista do Dia
        </SubTabButton>
        <SubTabButton active={activeSubTab === 'health'} onClick={() => setActiveSubTab('health')}>
          System Health
        </SubTabButton>
        <SubTabButton active={activeSubTab === 'telemetry_classic'} onClick={() => setActiveSubTab('telemetry_classic')}>
          Telemetria
        </SubTabButton>
      </div>

      {/* Live Ops Center */}
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

      {/* NEW: Artista do Dia (Admin) */}
      {activeSubTab === 'artist_of_day' && (
        <div className="animate-fade-in-up grid grid-cols-1 gap-6">
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#FFD86B] uppercase tracking-wide">Artista do Dia</h3>
                <p className="text-xs text-gray-400 mt-1">Fonte: manual do dia → agenda → fallback event_settings. (UTC)</p>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={refreshArtistOfDayAdmin}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-200 text-xs font-bold hover:bg-gray-700 disabled:opacity-50"
                >
                  Atualizar
                </button>
                <button
                  disabled={busy}
                  onClick={openSetTodayModal}
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-gray-400">Hoje (UTC)</p>
                <p className="text-sm text-white font-bold mt-1">{currentDayUtc || '—'}</p>
                <p className="text-xs text-gray-400 mt-3">Artista atual</p>
                <p className="text-sm text-white font-bold mt-1">
                  {currentUser?.artisticName || currentUser?.name || (currentArtistId ? currentArtistId : '—')}
                </p>
                <p className="text-[11px] text-gray-500 mt-1 break-all">{currentArtistId || ''}</p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-gray-400">Métricas (hoje)</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Cliques</span>
                    <span className="text-white font-bold">{metrics?.total_clicks ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Usuários únicos</span>
                    <span className="text-white font-bold">{metrics?.unique_viewers ?? 0}</span>
                  </div>
                  <div className="mt-3 text-xs text-gray-400">Por plataforma (cliques / únicos)</div>
                  <div className="text-xs text-gray-200">
                    Spotify: <b>{metrics?.by_platform?.spotify?.clicks ?? 0}</b> / <b>{metrics?.by_platform?.spotify?.unique ?? 0}</b>
                  </div>
                  <div className="text-xs text-gray-200">
                    YouTube: <b>{metrics?.by_platform?.youtube?.clicks ?? 0}</b> / <b>{metrics?.by_platform?.youtube?.unique ?? 0}</b>
                  </div>
                  <div className="text-xs text-gray-200">
                    Instagram: <b>{metrics?.by_platform?.instagram?.clicks ?? 0}</b> / <b>{metrics?.by_platform?.instagram?.unique ?? 0}</b>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-gray-400">Agenda (próximos 14 dias)</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Range: {scheduleRange.from} → {scheduleRange.to}
                </p>

                <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                  {Array.from({ length: 15 }).map((_, i) => {
                    const d = new Date();
                    d.setUTCDate(d.getUTCDate() + i);
                    const dayUtc = utcDateISO(d);
                    const row = scheduleRows.find((r) => r.day_utc === dayUtc) || null;
                    const u = row ? usersById.get(row.artist_id) : null;
                    const label = u?.artisticName || u?.name || (row?.artist_id ?? '—');

                    return (
                      <div key={dayUtc} className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-300 font-bold">{dayUtc}</div>
                          <div className="text-[11px] text-gray-400 truncate">{row ? label : 'Sem agendamento'}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={busy}
                            onClick={() => openScheduleDayModal(dayUtc)}
                            className="px-3 py-1 rounded-lg bg-gray-800 text-gray-200 text-[11px] font-bold hover:bg-gray-700 disabled:opacity-50"
                          >
                            Definir
                          </button>
                          <button
                            disabled={busy || !row}
                            onClick={() => onClearScheduleDay(dayUtc)}
                            className="px-3 py-1 rounded-lg bg-red-500/80 text-black text-[11px] font-black hover:bg-red-400 disabled:opacity-50"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-gray-500 mt-3">
                  Observação: a agenda só entra em ação quando não existe “set manual” em <code>artist_of_day</code>.
                </p>
              </div>
            </div>
          </div>

          <AdminArtistsOfTheDayModal
            isOpen={isArtistModalOpen}
            onClose={() => {
              setIsArtistModalOpen(false);
              setSchedulePickDay(null);
            }}
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

      {activeSubTab === 'telemetry_classic' && <TelemetryDashboard allUsers={allUsers} />}
    </div>
  );
};

export default AdminDashboard;
