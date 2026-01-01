
import React from 'react';
import { ShieldIcon, XIcon, GlobeIcon, SmartphoneIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon, BanIcon, ActivityIcon, CpuIcon } from 'lucide-react';

interface InvestigationModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    onBan: () => void;
    onSafe: () => void;
}

// Helper para traduzir status do log
const translateFlag = (flag: string) => {
    switch (flag) {
        case 'OK': return { text: 'Normal', color: 'text-green-400 bg-green-400/10 border-green-400/20' };
        case 'FAST': return { text: 'Suspeito (Rápido)', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' };
        case 'IMPOSSIBLE_TIME': return { text: 'Anomalia Crítica', color: 'text-red-400 bg-red-400/10 border-red-400/20 animate-pulse' };
        default: return { text: flag, color: 'text-gray-400' };
    }
};

const InvestigationModal: React.FC<InvestigationModalProps> = ({ isOpen, onClose, data, onBan, onSafe }) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4">
            <div className="bg-[#0f0f0f] border border-red-500/30 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_-12px_rgb(239,68,68,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header com Gradiente */}
                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-red-950/50 to-[#141414] border-b border-red-500/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30 shadow-inner shadow-red-500/10">
                            <AlertTriangleIcon className="text-red-400 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-white font-black font-chakra uppercase tracking-wider text-lg">Dossiê de Ameaça</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-red-300/70 text-xs font-mono uppercase font-bold">Alvo:</span>
                                <code className="text-red-100 bg-red-900/20 px-2 py-0.5 rounded text-xs font-mono">{data.userId}</code>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <XIcon size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Seção Superior: Scores e Dados Básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Score Card */}
                         <div className="bg-[#151515] p-4 rounded-xl border border-red-500/20 flex items-center justify-between relative overflow-hidden">
                             <div className="absolute right-0 bottom-0 opacity-10">
                                 <ShieldIcon size={80} className="text-red-500" />
                             </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Risco Calculado</p>
                                <h4 className="text-4xl font-black text-red-400 font-chakra mt-1">98<span className="text-lg text-red-500/50">/100</span></h4>
                            </div>
                        </div>
                         {/* Info Cards */}
                        <div className="bg-[#151515] p-4 rounded-xl border border-gray-800 flex flex-col justify-center">
                             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                 <ClockIcon size={12}/> Idade da Conta
                             </p>
                             <p className="text-white font-mono text-lg">{data.accountAge}</p>
                        </div>
                         <div className="bg-[#151515] p-4 rounded-xl border border-gray-800 flex flex-col justify-center">
                             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                 <CpuIcon size={12}/> Saldo Atual
                             </p>
                             <p className="text-yellow-400 font-mono text-lg font-bold">{data.walletBalance.toLocaleString()} <span className="text-xs text-yellow-600">Coins</span></p>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Coluna Esquerda: Pegada Digital */}
                        <div className="space-y-4">
                            <h4 className="text-gray-200 font-bold uppercase text-sm flex items-center gap-2 border-b border-gray-800 pb-2">
                                <ActivityIcon size={16} className="text-blue-400"/>
                                Pegada Digital & Rede
                            </h4>
                            
                            <div className="bg-[#151515] rounded-xl border border-gray-800 divide-y divide-gray-800 overflow-hidden">
                                {/* Cadeia de IP */}
                                <div className="p-4 flex items-start gap-4">
                                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                        <GlobeIcon className="text-blue-400 w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-300 text-xs font-bold uppercase mb-2">Rota de Conexão (IPs)</p>
                                        <ul className="space-y-1">
                                            {data.ipChain.map((ip: string, i: number) => (
                                                <li key={i} className="text-[11px] text-gray-400 font-mono bg-[#111] px-2 py-1 rounded border border-gray-800/50 flex items-center before:content-['>'] before:text-blue-500/50 before:mr-2">
                                                    {ip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Assinatura de Dispositivo */}
                                <div className="p-4 flex items-start gap-4">
                                    <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                        <SmartphoneIcon className="text-purple-400 w-4 h-4" />
                                    </div>
                                    <div>
                                         <p className="text-gray-300 text-xs font-bold uppercase mb-2">Hardware ID & User Agent</p>
                                         <div className="space-y-2">
                                             <div>
                                                 <span className="text-[10px] text-gray-500 font-bold uppercase">Device ID:</span>
                                                 <p className="text-[11px] text-purple-300 font-mono bg-purple-900/20 px-2 py-1 rounded">{data.deviceId}</p>
                                             </div>
                                             <div>
                                                 <span className="text-[10px] text-gray-500 font-bold uppercase">Concurrency:</span>
                                                 <span className="text-xs text-gray-300 ml-2 font-mono">{data.hardwareConcurrency} cores</span>
                                             </div>
                                            <div>
                                                 <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">User Agent Detectado:</span>
                                                 <p className="text-[10px] text-gray-400 font-mono bg-[#111] p-2 rounded border border-gray-800 leading-tight break-all">
                                                     {data.userAgent}
                                                 </p>
                                            </div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna Direita: Logs e Análise */}
                        <div className="space-y-4 flex flex-col">
                             <h4 className="text-gray-200 font-bold uppercase text-sm flex items-center gap-2 border-b border-gray-800 pb-2">
                                <ClockIcon size={16} className="text-orange-400"/>
                                Registro de Atividades Recentes
                            </h4>

                            <div className="bg-[#151515] rounded-xl border border-gray-800 overflow-hidden flex-1">
                                <table className="w-full text-left">
                                    <thead className="bg-[#111] text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Ação / Evento</th>
                                            <th className="px-4 py-3 text-right">Status da Análise</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {data.recentActions.map((act: any, i: number) => {
                                            const status = translateFlag(act.flag);
                                            return (
                                            <tr key={i} className="text-xs font-mono hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-gray-300">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                        {act.action}
                                                    </div>
                                                    <span className="text-[10px] text-gray-600 pl-3 block mt-0.5">Há {Math.floor((Date.now() - act.timestamp)/1000)}s atrás</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${status.color}`}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Caixa de Análise da IA */}
                            <div className="bg-gradient-to-br from-red-950/30 to-red-900/10 border border-red-500/30 p-4 rounded-xl shadow-sm relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 opacity-20"><AlertTriangleIcon size={64} className="text-red-500"/></div>
                                <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 relative z-10">
                                    <ShieldIcon size={14} /> Parecer do Sistema Anti-Cheat
                                </p>
                                <p className="text-red-200/80 text-sm leading-relaxed font-medium relative z-10">
                                    "Padrão de velocidade sobre-humana detectado na conclusão de missões (IMPOSSIBLE_TIME). O saldo da carteira é matematicamente incompatível com a idade da conta, sugerindo injeção de pacotes ou exploit de economia."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-800 bg-[#111] flex justify-between items-center">
                     <p className="text-gray-500 text-xs font-mono">
                        ID da Investigação: <span className="text-gray-400">IVG-{Math.floor(Math.random()*99999)}</span>
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={onSafe}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all border border-gray-700 hover:border-green-500/50 group"
                        >
                            <CheckCircleIcon size={16} className="text-gray-500 group-hover:text-green-500 transition-colors" />
                            Falso Positivo (Liberar)
                        </button>
                        <button 
                            onClick={onBan}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-red-900/20 hover:shadow-red-600/40 border border-red-500 group"
                        >
                            <BanIcon size={16} className="group-hover:animate-pulse"/>
                            CONFIRMAR BANIMENTO
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvestigationModal;
