
import React, { useEffect, useState } from 'react';
import { TelemetryPremium } from '../../../api/telemetry/telemetryPremium';
import InvestigationModal from './InvestigationModal';
import { 
    TrendingUpIcon, UsersIcon, ShieldIcon, AlertTriangleIcon, ActivityIcon, EyeIcon, BanIcon, HistoryIcon, ServerCrashIcon, CheckCircleIcon
} from 'lucide-react';
import { useAppContext } from '../../../constants';

// Helper para traduzir severidade do backend
const translateSeverity = (severity: string) => {
    switch (severity) {
        case 'CRITICAL': return { text: 'Crítico', bg: 'bg-red-500/10', textCol: 'text-red-500', border: 'border-red-500/30' };
        case 'HIGH': return { text: 'Alto', bg: 'bg-orange-500/10', textCol: 'text-orange-500', border: 'border-orange-500/30' };
        case 'MEDIUM': return { text: 'Médio', bg: 'bg-yellow-500/10', textCol: 'text-yellow-500', border: 'border-yellow-500/30' };
        default: return { text: 'Baixo', bg: 'bg-blue-500/10', textCol: 'text-blue-500', border: 'border-blue-500/30' };
    }
};

const getRiskStyles = (severity: string) => {
    switch (severity) {
        case 'CRITICAL': return 'text-red-500 bg-red-500/10 border-red-500/30 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]';
        case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
        case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
        default: return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    }
};

const MetricCard: React.FC<{ label: string; value: string | number; icon: any; colorClass?: string }> = ({ label, value, icon: Icon, colorClass = "text-white" }) => (
    <div className="bg-[#151515] border border-gray-800 p-5 rounded-xl flex items-center justify-between hover:border-gray-700 transition-colors group relative overflow-hidden">
        <div className={`absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass} -rotate-12 scale-150 origin-bottom-right`}>
            <Icon size={80} />
        </div>
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">{label}</p>
            <h3 className={`text-3xl font-black font-chakra ${colorClass}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-[#1a1a1a] border border-gray-800 group-hover:border-gray-700 ${colorClass}`}>
            <Icon size={24} />
        </div>
    </div>
);


const TelemetryProTab: React.FC = () => {
    const { dispatch } = useAppContext();
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    
    const [investigationData, setInvestigationData] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [criticalAlert, setCriticalAlert] = useState(false);
    const [terminalLines, setTerminalLines] = useState<string[]>(["INITIALIZING SEC_OPS V4.2..."]);
    const [loading, setLoading] = useState(true);

    const refreshData = () => {
        const stats = TelemetryPremium.getStats();
        setData({...stats});
    };

    useEffect(() => {
        const bootSequence = async () => {
            await new Promise(r => setTimeout(r, 300));
            setTerminalLines(prev => [...prev, "CONNECTING TO TELEMETRY STREAM..."]);
            await new Promise(r => setTimeout(r, 400));
            setTerminalLines(prev => [...prev, "ESTABLISHING SECURE HANDSHAKE..."]);
            await new Promise(r => setTimeout(r, 400));
            
            refreshData();
            setLoading(false);
        };
        bootSequence();
    }, []);

    const handleInjectChaos = () => {
        TelemetryPremium.injectChaos();
        refreshData();
        setCriticalAlert(true);
        setTimeout(() => setCriticalAlert(false), 2000);
        
        dispatch({
            type: 'ADD_TOAST',
            payload: {
                id: Date.now().toString(),
                title: 'ALERTA DE SEGURANÇA',
                message: 'Múltiplas assinaturas de bot detectadas!',
                type: 'error'
            }
        });
    };

    const handleInvestigate = (userId: string) => {
        const details = TelemetryPremium.getUserInvestigation(userId);
        setInvestigationData(details);
        setIsModalOpen(true);
    };

    const handleBan = (userId: string) => {
        TelemetryPremium.banUser(userId);
        setIsModalOpen(false);
        refreshData();
        dispatch({
            type: 'ADD_TOAST',
            payload: {
                id: Date.now().toString(),
                title: 'Ameaça Neutralizada',
                message: `Usuário ${userId} foi banido com sucesso.`,
                type: 'success'
            }
        });
    };

    const handleSafe = (userId: string) => {
        TelemetryPremium.markAsSafe(userId);
        setIsModalOpen(false);
        refreshData();
        dispatch({
            type: 'ADD_TOAST',
            payload: {
                id: Date.now().toString(),
                title: 'Falso Positivo',
                message: `Usuário ${userId} marcado como seguro.`,
                type: 'info'
            }
        });
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[500px] flex-col gap-4 bg-[#09090b] rounded-xl border border-[#27272a]">
            <ActivityIcon className="animate-spin text-[#FFD86B] w-8 h-8" />
            <div className="font-mono text-xs text-[#a1a1aa] space-y-1 w-64">
                {terminalLines.map((line, i) => (
                    <p key={i} className="animate-fade-in-up">
                        <span className="text-[#FFD86B] mr-2">➜</span>{line}
                    </p>
                ))}
                <span className="animate-pulse">_</span>
            </div>
        </div>
    );

    if (!data) return null;

    return (
        <div className={`space-y-6 animate-fade-in text-gray-200 min-h-screen pb-20 transition-colors duration-300 rounded-lg ${criticalAlert ? 'bg-red-900/10 ring-2 ring-red-500' : ''}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800 pb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3 font-chakra">
                        <ShieldIcon className={`text-[#FFD86B] ${criticalAlert ? 'animate-bounce text-red-500' : ''}`} size={32} />
                        Centro de Operações de Segurança (SecOps)
                    </h2>
                    <p className="text-gray-500 text-sm mt-2 font-mono flex items-center gap-2">
                        STATUS DO SISTEMA: 
                        <span className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs border ${criticalAlert ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-green-500 bg-green-500/10 border-green-500/20'}`}>
                            <span className={`w-2 h-2 rounded-full animate-pulse ${criticalAlert ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {criticalAlert ? 'ALERTA CRÍTICO' : 'OPERACIONAL'}
                        </span>
                        <span className="text-gray-600">|</span>
                        AMBIENTE: <span className="text-gray-300">Produção (Simulação)</span>
                    </p>
                </div>
                <button 
                    onClick={handleInjectChaos}
                    className="bg-gradient-to-r from-red-600/10 to-red-500/5 hover:from-red-600/20 hover:to-red-500/10 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-xl border border-red-500/30 hover:border-red-500/50 font-mono transition-all flex items-center gap-2 group shadow-lg shadow-red-900/10"
                >
                    <ServerCrashIcon size={16} className="group-hover:rotate-12 transition-transform"/>
                    INJETAR TRÁFEGO MALICIOSO (TESTE)
                </button>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard 
                    label="Ameaças Ativas Detectadas" 
                    value={data.securityThreats.length} 
                    icon={AlertTriangleIcon}
                    colorClass={data.securityThreats.length > 0 ? "text-red-500" : "text-green-500"}
                />
                <MetricCard 
                    label="Usuários Banidos (Hoje)" 
                    value={data.bannedHistory.length} 
                    icon={BanIcon}
                    colorClass="text-orange-500"
                />
                <MetricCard 
                    label="Total de Eventos Analisados" 
                    value={data.total.toLocaleString()} 
                    icon={ActivityIcon}
                    colorClass="text-[#FFD86B]"
                />
            </div>

            {/* Navegação e Tabela */}
            <div className="mt-8">
                {/* Abas */}
                <div className="flex gap-6 border-b border-gray-800 mb-0">
                    <button 
                        onClick={() => setActiveTab('active')}
                        className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'active' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                        Fila de Ameaças em Tempo Real
                        {activeTab === 'active' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FFD86B] shadow-[0_0_10px_rgb(255,216,107)]"></span>}
                        {data.securityThreats.length > 0 && (
                             <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-black">{data.securityThreats.length}</span>
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'history' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                        Histórico de Punições
                        {activeTab === 'history' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgb(239,68,68)]"></span>}
                    </button>
                </div>

                {/* Tabela Principal */}
                <div className="bg-[#151515] border border-gray-800 rounded-b-xl rounded-tr-xl overflow-hidden min-h-[400px] shadow-xl shadow-black/20">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#0A0A0A] text-xs font-mono text-gray-500 uppercase tracking-wider border-b border-gray-800">
                            <tr>
                                <th className="px-6 py-5 font-bold">Usuário / ID</th>
                                <th className="px-6 py-5 font-bold">{activeTab === 'active' ? 'Nível de Risco' : 'Data da Punição'}</th>
                                <th className="px-6 py-5 font-bold">Gatilho da Detecção</th>
                                <th className="px-6 py-5 text-right font-bold">Ações Disponíveis</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50 bg-[#121212]">
                            {activeTab === 'active' ? (
                                data.securityThreats.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                                                <CheckCircleIcon size={40} className="text-green-500"/>
                                                <div>
                                                    <p className="text-gray-300 font-bold uppercase tracking-widest">Sistema Limpo</p>
                                                    <p className="text-gray-600 font-mono text-xs mt-1">Nenhuma anomalia detectada no momento.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data.securityThreats.map((user: any) => {
                                        const severity = translateSeverity(user.severity);
                                        return (
                                        <tr key={user.id} className="hover:bg-[#1A1A1A] transition-colors group border-l-2 border-transparent hover:border-l-[#FFD86B]">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                     <span className="font-black text-gray-100 uppercase font-chakra tracking-wide">{user.name}</span>
                                                     <span className="text-gray-600 font-mono text-xs mt-1 flex items-center gap-1">
                                                         ID: <code className="text-gray-500 bg-[#0a0a0a] px-1 rounded">{user.id}</code>
                                                     </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col items-start gap-2">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${severity.bg} ${severity.textCol} ${severity.border} flex items-center gap-1`}>
                                                        {user.severity === 'CRITICAL' && <AlertTriangleIcon size={10} className="animate-pulse"/>}
                                                        {severity.text}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-mono font-bold">SCORE: {user.riskScore}/100</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-gray-300 font-medium text-sm flex items-center gap-2">
                                                    <ActivityIcon size={14} className="text-gray-600" />
                                                    {user.reason}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={() => handleInvestigate(user.id)}
                                                    className="bg-[#FFD86B]/10 hover:bg-[#FFD86B]/20 text-[#FFD86B] hover:text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg border border-[#FFD86B]/30 transition-all inline-flex items-center gap-2 group/btn shadow-sm hover:shadow-[#FFD86B]/20"
                                                >
                                                    <EyeIcon size={14} className="group-hover/btn:scale-110 transition-transform"/> 
                                                    Abrir Dossiê
                                                </button>
                                            </td>
                                        </tr>
                                    )})
                                )
                            ) : (
                                // Tabela de Histórico
                                data.bannedHistory.length === 0 ? (
                                     <tr><td colSpan={4} className="p-10 text-center text-gray-600 font-mono uppercase text-xs">Nenhum registro de banimento encontrado.</td></tr>
                                ) : (
                                    data.bannedHistory.map((user: any) => (
                                        <tr key={user.id} className="hover:bg-[#1A1A1A] transition-colors opacity-70 hover:opacity-100">
                                            <td className="px-6 py-5">
                                                 <div className="flex flex-col">
                                                    <span className="text-gray-400 font-bold uppercase line-through decoration-red-500/50 decoration-2">{user.name}</span>
                                                    <span className="text-gray-600 font-mono text-xs">{user.id}</span>
                                                 </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-400 font-mono text-xs font-bold">
                                                        {new Date(user.bannedAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="text-gray-600 font-mono text-[10px]">
                                                        às {new Date(user.bannedAt).toLocaleTimeString('pt-BR')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-red-400/80 font-medium text-sm italic flex items-center gap-2">
                                                <BanIcon size={12}/> {user.reason}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <span className="text-gray-600 text-[10px] font-mono uppercase border border-gray-800 px-2 py-1 rounded bg-[#0a0a0a]">
                                                    Admin: {user.admin || 'Sistema'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Investigação */}
            <InvestigationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={investigationData}
                onBan={() => investigationData && handleBan(investigationData.userId)}
                onSafe={() => investigationData && handleSafe(investigationData.userId)}
            />
        </div>
    );
};

export default TelemetryProTab;
