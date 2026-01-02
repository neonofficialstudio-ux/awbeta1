
import React, { useState, useEffect } from 'react';
import { getStressLogs, clearStressLogs } from '../../api/simulation/logs/stress-log';
import stressTest from '../../api/simulation/stressEngine';
import { CoinIcon, MissionIcon, StoreIcon, QueueIcon, CheckIcon, TrendingUpIcon } from '../../constants';

// Simple SVG Icons for UI
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);
const ActivityIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

const MiniStatBox: React.FC<{ label: string; value: number | string; color?: string }> = ({ label, value, color = 'text-white' }) => (
    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
);

const BarChart: React.FC<{ data: { label: string; value: number; color: string }[]; total: number }> = ({ data, total }) => (
    <div className="flex flex-col gap-2 w-full">
        {data.map((d, i) => {
            const percent = total > 0 ? (d.value / total) * 100 : 0;
            return (
                <div key={i} className="w-full">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{d.label}</span>
                        <span>{d.value.toLocaleString()} ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${d.color} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                    </div>
                </div>
            )
        })}
    </div>
);

const StressAndPerformance: React.FC = () => {
    const [results, setResults] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const fetchData = () => {
        const lastRes = stressTest.lastResults();
        if (lastRes) setResults(lastRes);
        setLogs(getStressLogs());
    };

    useEffect(() => {
        fetchData();
        // Poll for logs if running or just periodically
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleRun = async (users: number) => {
        if (isRunning) return;
        setIsRunning(true);
        
        // Minimal delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const config = { 
                users, 
                actionsPerUser: 5, 
                includeMissions: true, 
                includeStore: true, 
                includeQueue: true, 
                includeCheckIn: true, 
                randomness: true 
            };
            // Use direct import instead of window.AW.stress
            const res = await stressTest.run(config);
            setResults(res);
            setLogs(getStressLogs());
        } catch (e) {
            console.error("Stress test failed", e);
        } finally {
            setIsRunning(false);
        }
    };

    const handleExport = () => {
        const exportData = {
            lastResults: results,
            logs: logs
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `stress_export_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleClear = () => {
        clearStressLogs();
        setLogs([]);
    };

    // Derived Data for Charts
    const totalOps = results ? results.totalActions : 0;
    const chartData = results ? [
        { label: 'Missões', value: results.actionsByType.mission, color: 'bg-blue-500' },
        { label: 'Loja', value: results.actionsByType.store, color: 'bg-green-500' },
        { label: 'Check-ins', value: results.actionsByType.checkin, color: 'bg-yellow-500' },
        { label: 'Filas', value: results.actionsByType.queue, color: 'bg-purple-500' },
    ] : [];
    
    const failureData = results ? [
        { label: 'Missões', value: results.missionFailures, color: 'bg-red-500' },
        { label: 'Loja', value: results.storeFailures, color: 'bg-red-500' },
        { label: 'Filas', value: results.queueFailures, color: 'bg-red-500' },
        { label: 'Check-in', value: results.checkinFailures, color: 'bg-red-500' },
    ] : [];
    const totalFailures = failureData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-8">
                <h2 className="text-3xl font-extrabold text-goldenYellow-400">Stress Engine Visualizer</h2>
                <p className="mt-2 text-gray-400">Simulação de carga massiva e testes de integridade do sistema.</p>
            </div>

            {/* --- CONTROLS --- */}
            <div className="bg-[#181818] p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center"><ActivityIcon className="w-5 h-5 mr-2 text-blue-400"/> Controles de Simulação</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[50, 100, 250, 500].map(count => (
                        <button
                            key={count}
                            onClick={() => handleRun(count)}
                            disabled={isRunning}
                            className="flex items-center justify-center py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg border border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRunning ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"></div> : <PlayIcon className="w-4 h-4 mr-2 text-green-400"/>}
                            Simular {count} Users
                        </button>
                    ))}
                </div>
            </div>

            {/* --- RESULTS --- */}
            {results ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 1. Last Test Summary */}
                    <div className="bg-[#181818] p-6 rounded-xl border border-gray-700 lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Resultado do Último Teste</h3>
                            <span className="text-xs text-gray-500 font-mono">{results.executionTimeMs.toFixed(0)}ms</span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <MiniStatBox label="Ações Totais" value={results.totalActions} />
                            <MiniStatBox label="XP Gerado" value={results.totalXpGained.toLocaleString()} color="text-blue-400" />
                            <MiniStatBox label="LC (Balanço)" value={results.totalLcGained.toLocaleString()} color="text-yellow-400" />
                            <MiniStatBox label="Falhas Totais" value={totalFailures} color={totalFailures > 0 ? 'text-red-500' : 'text-green-500'} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-sm font-bold text-gray-300 mb-3">Distribuição de Ações</h4>
                                <BarChart data={chartData} total={totalOps} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-300 mb-3">Distribuição de Falhas</h4>
                                {totalFailures > 0 ? (
                                    <BarChart data={failureData} total={totalFailures} />
                                ) : (
                                    <p className="text-sm text-green-500 bg-green-900/20 p-2 rounded border border-green-900/50 text-center">Nenhuma falha registrada.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Detailed Metrics Table */}
                    <div className="bg-[#181818] p-6 rounded-xl border border-gray-700">
                         <h3 className="text-lg font-bold text-white mb-4">Métricas Detalhadas</h3>
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                                    <tr>
                                        <th className="px-2 py-2">Métrica</th>
                                        <th className="px-2 py-2 text-right">Valor</th>
                                        <th className="px-2 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    <tr>
                                        <td className="px-2 py-2">Taxa de Sucesso</td>
                                        <td className="px-2 py-2 text-right font-bold text-white">{((1 - (totalFailures/totalOps)) * 100).toFixed(1)}%</td>
                                        <td className="px-2 py-2 text-center"><span className="text-green-500 font-bold">OK</span></td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-2">Média XP/User</td>
                                        <td className="px-2 py-2 text-right text-white">{(results.totalXpGained / (totalOps/5)).toFixed(0)}</td>
                                        <td className="px-2 py-2 text-center"><span className="text-blue-400 font-bold">INFO</span></td>
                                    </tr>
                                     <tr>
                                        <td className="px-2 py-2">Throughput (ops/s)</td>
                                        <td className="px-2 py-2 text-right text-white">{((totalOps / results.executionTimeMs) * 1000).toFixed(0)}</td>
                                        <td className="px-2 py-2 text-center"><span className="text-green-500 font-bold">FAST</span></td>
                                    </tr>
                                </tbody>
                            </table>
                         </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center border-2 border-dashed border-gray-700 rounded-xl">
                    <ActivityIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg">Nenhum teste executado nesta sessão.</p>
                    <p className="text-gray-500 text-sm">Inicie uma simulação acima para ver os dados.</p>
                </div>
            )}

            {/* --- LOGS & EXPORT --- */}
            <div className="bg-[#181818] p-6 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Logs de Execução ({logs.length})</h3>
                    <div className="flex gap-2">
                        <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-400 underline">Limpar Logs</button>
                        <button onClick={handleExport} disabled={!results} className="flex items-center text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 transition-colors disabled:opacity-50">
                            <DownloadIcon className="w-3 h-3 mr-1" /> Exportar JSON
                        </button>
                    </div>
                </div>
                
                <div className="h-64 overflow-y-auto bg-[#0d0d0d] rounded-lg border border-gray-800 p-2 font-mono text-xs">
                    {logs.length > 0 ? logs.slice().reverse().map((log, i) => (
                        <div key={i} className={`mb-1 p-1 rounded flex gap-2 ${log.status === 'failure' ? 'bg-red-900/20 text-red-400' : 'text-gray-400 hover:bg-gray-800'}`}>
                            <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className={`font-bold w-20 uppercase ${log.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>{log.type}</span>
                            <span className="flex-grow truncate text-gray-300">{JSON.stringify(log.payload)}</span>
                            {log.duration && <span className="text-gray-600">{log.duration.toFixed(1)}ms</span>}
                        </div>
                    )) : (
                        <p className="text-gray-600 text-center py-10">Aguardando logs...</p>
                    )}
                </div>
            </div>

        </div>
    );
};

export default StressAndPerformance;
