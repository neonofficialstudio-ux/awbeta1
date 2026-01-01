
import React, { useState, useEffect } from 'react';
import { getPerformanceLogs, clearPerformanceLogs, type PerformanceLogEntry } from '../../api/logs/performance';
import { SearchIcon, FilterIcon, DeleteIcon } from '../../constants';

const LogTypeBadge: React.FC<{ type: string }> = ({ type }) => {
    const colors: Record<string, string> = {
        mission: 'bg-blue-500/20 text-blue-400',
        store: 'bg-green-500/20 text-green-400',
        xp: 'bg-purple-500/20 text-purple-400',
        economy: 'bg-yellow-500/20 text-yellow-400',
        error: 'bg-red-500/20 text-red-400',
        simulation: 'bg-gray-500/20 text-gray-400',
        inventory: 'bg-indigo-500/20 text-indigo-400',
        system: 'bg-orange-500/20 text-orange-400',
    };
    const colorClass = colors[type] || 'bg-gray-700 text-gray-300';
    
    return (
        <span className={`px-2 py-1 text-xs font-mono font-bold rounded ${colorClass}`}>
            {type.toUpperCase()}
        </span>
    );
};

const PerformanceLogs: React.FC = () => {
    const [logs, setLogs] = useState<PerformanceLogEntry[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);

    const refreshLogs = () => {
        setLogs(getPerformanceLogs());
    };

    useEffect(() => {
        refreshLogs();
        let interval: number | undefined;
        
        if (autoRefresh) {
             interval = window.setInterval(refreshLogs, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    const handleClearLogs = () => {
        if (confirm('Tem certeza que deseja limpar todos os logs de performance?')) {
            clearPerformanceLogs();
            refreshLogs();
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesType = filterType === 'all' || log.type === filterType;
        const matchesSearch = !searchTerm || 
            log.source.toLowerCase().includes(searchTerm.toLowerCase()) || 
            JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        Performance Logs
                        <span className="text-sm font-normal text-gray-500 px-2 py-1 bg-gray-800 rounded-full">{logs.length} events</span>
                    </h2>
                    <p className="text-gray-400 text-sm">Monitoramento em tempo real de eventos internos do sistema.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
                        <span className={`text-xs px-2 ${autoRefresh ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}>● LIVE</span>
                        <button 
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${autoRefresh ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-gray-800 text-gray-400'}`}
                        >
                            {autoRefresh ? 'Pause' : 'Resume'}
                        </button>
                    </div>
                    <button 
                        onClick={handleClearLogs}
                        className="flex items-center px-3 py-2 bg-red-900/20 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-900/40 transition-colors text-sm font-bold"
                    >
                        <DeleteIcon className="w-4 h-4 mr-2" />
                        Limpar Logs
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#181818] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <FilterIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-300">Filtros:</span>
                </div>
                
                <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-gray-900 text-white text-sm border border-gray-600 rounded px-3 py-2 focus:border-goldenYellow-500 focus:outline-none"
                >
                    <option value="all">Todos os Tipos</option>
                    <option value="mission">Mission</option>
                    <option value="economy">Economy</option>
                    <option value="store">Store</option>
                    <option value="xp">XP</option>
                    <option value="error">Error</option>
                    <option value="simulation">Simulation</option>
                    <option value="system">System</option>
                </select>

                <div className="relative flex-grow md:flex-grow-0 md:w-64">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar em source ou details..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-900 text-white border border-gray-600 rounded pl-9 pr-3 py-2 text-sm focus:border-goldenYellow-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-[#0d0d0d] border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400 font-mono">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-900 border-b border-gray-800">
                            <tr>
                                <th className="px-4 py-3 w-32">Timestamp</th>
                                <th className="px-4 py-3 w-24">Type</th>
                                <th className="px-4 py-3 w-48">Source</th>
                                <th className="px-4 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                                        {(() => {
                                            const d = new Date(log.timestamp);
                                            return `${d.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${d.getMilliseconds().toString().padStart(3, '0')}`;
                                        })()}
                                    </td>
                                    <td className="px-4 py-2">
                                        <LogTypeBadge type={log.type} />
                                    </td>
                                    <td className="px-4 py-2 text-white font-semibold">
                                        {log.source}
                                    </td>
                                    <td className="px-4 py-2 text-gray-300 break-all">
                                        {JSON.stringify(log.details)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                                        Nenhum log encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PerformanceLogs;
