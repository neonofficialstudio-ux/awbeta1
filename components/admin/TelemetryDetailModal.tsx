
import React, { useState, useMemo } from 'react';
import { FilterIcon } from '../../constants';

export interface DrilldownItem {
    id: string;
    date: string;
    timestamp: number;
    userId: string;
    userName: string;
    userPlan: string;
    description: string;
    value: string;
    status?: string;
}

interface TelemetryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: DrilldownItem[];
}

const TelemetryDetailModal: React.FC<TelemetryDetailModalProps> = ({ isOpen, onClose, title, data }) => {
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [planFilter, setPlanFilter] = useState<string>('all');
    
    const filteredData = useMemo(() => {
        let processed = [...data];

        // Filter by Plan
        if (planFilter !== 'all') {
            processed = processed.filter(item => item.userPlan === planFilter);
        }

        // Sort by Date
        processed.sort((a, b) => {
            return sortDirection === 'asc' 
                ? a.timestamp - b.timestamp 
                : b.timestamp - a.timestamp;
        });

        return processed;
    }, [data, sortDirection, planFilter]);

    const handleExportCSV = () => {
        const headers = ['Data', 'Usuário', 'Plano', 'Descrição', 'Valor', 'Status', 'ID'];
        const rows = filteredData.map(item => [
            item.date,
            item.userName,
            item.userPlan,
            item.description,
            item.value,
            item.status || '-',
            item.id
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `telemetry_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 w-full max-w-5xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-goldenYellow-400">{title}</h2>
                        <p className="text-gray-400 text-sm mt-1">{filteredData.length} registro(s) encontrado(s)</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl font-bold">&times;</button>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700 items-center">
                    <div className="flex items-center gap-2">
                        <FilterIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300 font-semibold">Filtros:</span>
                    </div>

                    <select 
                        value={planFilter} 
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="bg-gray-800 text-white text-sm border border-gray-600 rounded px-2 py-1 focus:border-goldenYellow-500 focus:outline-none"
                    >
                        <option value="all">Todos os Planos</option>
                        <option value="Free Flow">Free Flow</option>
                        <option value="Artista em Ascensão">Artista em Ascensão</option>
                        <option value="Artista Profissional">Artista Profissional</option>
                        <option value="Hitmaker">Hitmaker</option>
                    </select>

                    <button 
                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="bg-gray-800 text-white text-sm border border-gray-600 rounded px-3 py-1 hover:bg-gray-700 transition-colors"
                    >
                        Data: {sortDirection === 'asc' ? 'Mais Antigos' : 'Mais Recentes'}
                    </button>

                    <div className="flex-grow"></div>

                    <button 
                        onClick={handleExportCSV}
                        className="bg-green-600 text-white text-sm font-bold px-4 py-1 rounded hover:bg-green-500 transition-colors"
                    >
                        Exportar .CSV
                    </button>
                </div>

                {/* Data Table */}
                <div className="flex-grow overflow-auto border border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-800 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Usuário</th>
                                <th className="px-4 py-3">Descrição</th>
                                <th className="px-4 py-3 text-right">Valor</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 bg-[#181818]">
                            {filteredData.length > 0 ? filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-800/50">
                                    <td className="px-4 py-3 whitespace-nowrap">{item.date}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{item.userName}</div>
                                        <div className="text-xs text-gray-500">{item.userPlan}</div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{item.description}</td>
                                    <td className="px-4 py-3 text-right font-mono text-white">{item.value}</td>
                                    <td className="px-4 py-3 text-center">
                                        {item.status ? (
                                            <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">
                                                {item.status}
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        Nenhum dado encontrado para os filtros selecionados.
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

export default TelemetryDetailModal;
