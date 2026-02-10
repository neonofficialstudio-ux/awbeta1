
import React, { useState, useEffect } from 'react';
import type { MissionSubmission, RedeemedItem, UsableItemQueueEntry, CoinTransaction, ArtistOfTheDayQueueEntry, User, Mission } from '../../types';
import { DashboardIcon, SettingsIcon } from '../../constants';
import SystemHealthMonitor from './SystemHealthMonitor';
import TelemetryDashboard from './TelemetryDashboard';
import toast from 'react-hot-toast';
import AdminArtistsOfTheDayModal from './AdminArtistOfTheDayModal';
import { getDisplayName } from '../../api/core/getDisplayName';

// Import New V4.2 Sections
import StatsPanel from "./sections/StatsPanel";
import InsightsPanel from "./sections/InsightsPanel";
import QueuePanel from "./sections/QueuePanel";
import TelemetryPanel from "./sections/TelemetryPanel";
import HeatmapPanel from "./sections/HeatmapPanel";
import WeeklyMissionsPanel from "./sections/WeeklyMissionsPanel";
import AuditPanel from "./sections/AuditPanel";
import { adminPainelData } from '../../api/admin/painel';

interface AdminDashboardProps {
  missionSubmissions: MissionSubmission[];
  redeemedItems: RedeemedItem[];
  usableItemQueue: UsableItemQueueEntry[];
  allTransactions: CoinTransaction[];
  artistOfTheDayQueue: ArtistOfTheDayQueueEntry[];
  allUsers: User[];
  missions: Mission[];
}

type ArtistOfDayRpcPayload = {
  success?: boolean;
  has_artist?: boolean;
  day_utc?: string;
  artist?: {
    id: string;
    display_name?: string | null;
    artistic_name?: string | null;
    avatar_url?: string | null;
    level?: number | null;
    spotify_url?: string | null;
    youtube_url?: string | null;
    instagram_url?: string | null;
  } | null;
  clicked?: Record<string, boolean> | null;
};

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
    allUsers, missions 
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'ops_v4' | 'health' | 'telemetry_classic' | 'artist_of_day'>('ops_v4');
    const [v4Data, setV4Data] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Artist of Day (Admin) ---
    const [aodPayload, setAodPayload] = useState<ArtistOfDayRpcPayload | null>(null);
    const [aodIsLoading, setAodIsLoading] = useState(false);
    const [aodModalOpen, setAodModalOpen] = useState(false);

    useEffect(() => {
        // Fetch V4.2 Data Structure
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

    const loadArtistOfDay = async () => {
        setAodIsLoading(true);
        try {
            const api = await import('../../api/index');
            const res = await api.getArtistOfDay();
            setAodPayload((res || null) as any);
        } catch (e: any) {
            console.error('[AdminDashboard] getArtistOfDay failed', e);
            setAodPayload(null);
            toast.error(e?.message || 'Falha ao carregar Artista do Dia');
        } finally {
            setAodIsLoading(false);
        }
    };

    // Carrega ao entrar na sub-aba
    useEffect(() => {
        if (activeSubTab !== 'artist_of_day') return;
        void loadArtistOfDay();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSubTab]);

    if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-gold-cinematic border-t-transparent rounded-full mx-auto"></div></div>;

    const currentArtistId = (aodPayload?.has_artist && aodPayload?.artist?.id) ? aodPayload.artist.id : null;
    const currentArtistName =
      aodPayload?.artist
        ? (aodPayload.artist.display_name || aodPayload.artist.artistic_name || 'Artista')
        : null;

    const userList = Array.isArray(allUsers) ? allUsers.filter(u => u?.role === 'user') : [];
    const currentArtistUser: User | undefined = currentArtistId
      ? userList.find(u => u.id === currentArtistId)
      : undefined;

    const currentDisplayName = currentArtistUser
      ? getDisplayName({ ...currentArtistUser, artistic_name: currentArtistUser.artisticName })
      : (currentArtistName || '—');

    return (
        <div>
             <div className="flex gap-3 mb-8 overflow-x-auto pb-2 px-1">
                <SubTabButton active={activeSubTab === 'ops_v4'} onClick={() => setActiveSubTab('ops_v4')}>Live Ops Center</SubTabButton>
                <SubTabButton active={activeSubTab === 'artist_of_day'} onClick={() => setActiveSubTab('artist_of_day')}>Artista do Dia</SubTabButton>
                <SubTabButton active={activeSubTab === 'health'} onClick={() => setActiveSubTab('health')}>System Health</SubTabButton>
                <SubTabButton active={activeSubTab === 'telemetry_classic'} onClick={() => setActiveSubTab('telemetry_classic')}>Telemetria</SubTabButton>
            </div>

            {/* NEW V4.2 OPERATIONS CENTER */}
            {activeSubTab === 'ops_v4' && v4Data && (
                <div className="animate-fade-in-up grid grid-cols-1 gap-6">
                    
                    {/* Top Stats */}
                    <StatsPanel data={v4Data.analytics} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column (2/3) */}
                        <div className="lg:col-span-2 space-y-6">
                             <WeeklyMissionsPanel />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TelemetryPanel telemetry={v4Data.telemetry} />
                                <HeatmapPanel heatmap={v4Data.heatmap} />
                             </div>
                        </div>

                        {/* Right Column (1/3) */}
                        <div className="space-y-6">
                            <InsightsPanel insights={v4Data.insights} />
                            <QueuePanel />
                            <AuditPanel />
                        </div>
                    </div>
                </div>
            )}

            {/* ADMIN: ARTIST OF THE DAY */}
            {activeSubTab === 'artist_of_day' && (
                <div className="animate-fade-in-up grid grid-cols-1 gap-6">
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-[#FFD86B] font-chakra uppercase tracking-wide">
                                    Controle — Artista do Dia
                                </h2>
                                <p className="text-gray-400 text-sm mt-1">
                                    Define manualmente o artista em destaque do dia (UTC) via RPC <span className="text-gray-300">admin_set_artist_of_day</span>.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAodModalOpen(true)}
                                    className="px-4 py-2 rounded-xl bg-[#FFD86B] text-black font-black text-xs uppercase tracking-widest hover:bg-[#F6C560] transition"
                                >
                                    Selecionar Artista
                                </button>
                                <button
                                    onClick={() => loadArtistOfDay()}
                                    disabled={aodIsLoading}
                                    className="px-4 py-2 rounded-xl bg-gray-800 text-gray-200 font-bold text-xs uppercase tracking-widest hover:bg-gray-700 transition disabled:opacity-50"
                                >
                                    {aodIsLoading ? 'Atualizando...' : 'Recarregar'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2 bg-[#121212] border border-white/10 rounded-2xl p-5">
                                <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Status Hoje (UTC)</p>
                                <div className="mt-3 flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-black/40 border border-[#FFD86B]/30 overflow-hidden flex items-center justify-center">
                                        {(currentArtistUser?.avatarUrl || (aodPayload?.artist?.avatar_url || '')) ? (
                                            <img
                                                src={currentArtistUser?.avatarUrl || (aodPayload?.artist?.avatar_url || '')}
                                                alt="avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-[#FFD86B] font-black">★</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-black text-lg truncate">
                                            {aodPayload?.has_artist ? currentDisplayName : 'Sem destaque hoje'}
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                            {aodPayload?.day_utc ? `Dia (UTC): ${aodPayload.day_utc}` : 'Dia (UTC): —'}
                                        </p>
                                        <p className="text-gray-500 text-xs mt-1 truncate">
                                            ID: {currentArtistId || '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5">
                                <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Dica</p>
                                <p className="text-gray-300 text-sm mt-3 leading-relaxed">
                                    Se não aparecer no Dashboard do app, confirme que o artista selecionado tem
                                    <span className="text-gray-200 font-bold"> perfil válido</span> e que o front está em
                                    <span className="text-gray-200 font-bold"> backendProvider = supabase</span>.
                                </p>
                                <p className="text-gray-500 text-xs mt-3">
                                    O destaque é por dia (UTC) e substitui o artista anterior.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Modal reutilizado (lista de users) — salva apenas 1 */}
                    <AdminArtistsOfTheDayModal
                        isOpen={aodModalOpen}
                        onClose={() => setAodModalOpen(false)}
                        allUsers={allUsers}
                        currentArtistIds={currentArtistId ? [currentArtistId] : []}
                        onSave={async (ids) => {
                            try {
                                const nextId = Array.isArray(ids) && ids.length ? ids[0] : null;
                                if (!nextId) {
                                    toast.error('Selecione 1 artista para definir o destaque.');
                                    return;
                                }
                                const api = await import('../../api/index');
                                await api.adminSetArtistOfDay(nextId);
                                toast.success('✅ Artista do Dia definido!');
                                await loadArtistOfDay();
                            } catch (e: any) {
                                console.error(e);
                                toast.error(e?.message || 'Falha ao definir Artista do Dia');
                            }
                        }}
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
