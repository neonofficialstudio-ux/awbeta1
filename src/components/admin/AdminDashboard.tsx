
import React, { useState, useEffect } from 'react';
import type { MissionSubmission, RedeemedItem, UsableItemQueueEntry, CoinTransaction, ArtistOfTheDayQueueEntry, User, Mission } from '../../types';
import { DashboardIcon, SettingsIcon } from '../../constants';
import SystemHealthMonitor from './SystemHealthMonitor';
import TelemetryDashboard from './TelemetryDashboard';

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
    const [activeSubTab, setActiveSubTab] = useState<'ops_v4' | 'health' | 'telemetry_classic'>('ops_v4');
    const [v4Data, setV4Data] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch V4.2 Data Structure
        const data = adminPainelData();
        setV4Data(data);
        setIsLoading(false);
    }, []);

    if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-gold-cinematic border-t-transparent rounded-full mx-auto"></div></div>;

    return (
        <div>
             <div className="flex gap-3 mb-8 overflow-x-auto pb-2 px-1">
                <SubTabButton active={activeSubTab === 'ops_v4'} onClick={() => setActiveSubTab('ops_v4')}>Live Ops Center</SubTabButton>
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
