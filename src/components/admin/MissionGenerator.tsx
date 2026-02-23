
import React, { useState, useRef, useEffect } from 'react';
import type { Mission } from '../../types';
import { prepareGeneratedMission } from '../../api/helpers';
import AdminMissionModal from './AdminMissionModal';
import { EditIcon, CheckIcon } from '../../constants';
import { generateIndividualMissionAPI, generateWeeklyMissionsAPI } from '../../api/missions/public';
import { TelemetryPRO } from '../../services/telemetry.pro';

interface GeneratedMission {
    id: string;
    title: string;
    type: string; // A-F
    duration: 'curta' | 'média' | 'longa';
    description: string;
    platform: string;
    xp: number;
    coins: number;
}

interface MissionGeneratorProps {
    onMissionCreate: (mission: Mission | null) => void;
    onBatchCreate: (missions: Mission[]) => Promise<void>;
}

const MissionGenerator: React.FC<MissionGeneratorProps> = ({ onMissionCreate, onBatchCreate }) => {
    const [activeMode, setActiveMode] = useState<'single' | 'weekly'>('single');
    
    // Single Mode State
    const [missionType, setMissionType] = useState('A');
    const [missionDuration, setMissionDuration] = useState<'curta' | 'média' | 'longa'>('curta');
    const [missionFormat, setMissionFormat] = useState<'video' | 'story' | 'ambos' | 'foto'>('video');
    const [generatedMission, setGeneratedMission] = useState<GeneratedMission | null>(null);
    
    // Weekly Mode State & Staging
    const [stagedMissions, setStagedMissions] = useState<Mission[]>([]);
    const [weekStartDate, setWeekStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [editingStagedMission, setEditingStagedMission] = useState<Mission | null>(null);
    
    // Common State
    const [isLoading, setIsLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [generatedHistory, setGeneratedHistory] = useState<GeneratedMission[]>([]);

    useEffect(() => {
        if (generatedMission) {
            setGeneratedHistory(prev => [generatedMission, ...prev].slice(0, 5));
        }
    }, [generatedMission]);

    // V4.3 INTEGRATION: Single Generator
    const generateMission = async () => {
        setIsLoading(true);
        setGeneratedMission(null);
        TelemetryPRO.event("admin_generator_single_start", { type: missionType, duration: missionDuration });

        try {
            // Use V4.3 API
            const result = generateIndividualMissionAPI({
                type: missionType,
                duration: missionDuration === 'média' ? 'media' : missionDuration,
                format: missionFormat,
                title: `Gerado: Tipo ${missionType}`,
                description: `Missão gerada via Engine V4.3 com foco em ${missionFormat}.`
            });

            // Map API result to UI State
            const mission: GeneratedMission = {
                id: result.id,
                title: result.title,
                type: missionType,
                duration: missionDuration,
                description: result.description,
                platform: result.platform || 'Instagram',
                xp: result.xp,
                coins: result.coins,
            };

            setGeneratedMission(mission);
        } catch (e) {
            console.error("Generator Error", e);
        } finally {
            setIsLoading(false);
        }
    };

    // V4.3 INTEGRATION: Weekly Generator
    const generateWeeklyCampaign = async () => {
        setIsLoading(true);
        TelemetryPRO.event("admin_generator_weekly_start", { startDate: weekStartDate });
        
        try {
            // Use V4.3 API
            const batch = generateWeeklyMissionsAPI(weekStartDate);
            
            // Map and ensure dates are correct relative to start date
            const newBatch: Mission[] = batch.map((m: any) => ({
                ...m,
                status: 'active' // Override scheduled status for staging area visibility
            }));

            setStagedMissions(newBatch);
        } catch (e) {
            console.error("Weekly Generator Error", e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCreateMission = () => {
        if (!generatedMission) return;
        const missionToCreate = prepareGeneratedMission(generatedMission);
        // Enforce V4.1 Validation before creating
        onMissionCreate(missionToCreate);
    };

    const handleBatchPublish = async () => {
        if (stagedMissions.length === 0) return;
        setIsLoading(true);
        TelemetryPRO.event("admin_batch_publish_start", { count: stagedMissions.length });
        await onBatchCreate(stagedMissions);
        setStagedMissions([]);
        setIsLoading(false);
        alert('Campanha Semanal publicada com sucesso!');
        TelemetryPRO.event("admin_batch_publish_complete");
    };
    
    const handleUpdateStagedMission = (updatedMission: Mission) => {
        setStagedMissions(prev => prev.map(m => m.id === updatedMission.id ? updatedMission : m));
        setEditingStagedMission(null);
    };

    const handleBulkScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDateStr = e.target.value;
        setWeekStartDate(newDateStr);
        if (stagedMissions.length > 0) {
            // FIX: Use T00:00:00 to prevent timezone shifts (-1 day)
            const baseDate = new Date(`${newDateStr}T00:00:00`);
            const updated = stagedMissions.map((m, index) => {
                 const scheduleDate = new Date(baseDate);
                 scheduleDate.setDate(baseDate.getDate() + index); // Sequential days
                 
                 const deadline = new Date(scheduleDate);
                 deadline.setDate(deadline.getDate() + 1);

                 return {
                     ...m,
                     scheduledFor: scheduleDate.toISOString(),
                     deadline: deadline.toISOString()
                 };
            });
            setStagedMissions(updated);
        }
    }

    const copyJsonToClipboard = () => {
        if (!generatedMission) return;
        const jsonToCopy = {
            ...generatedMission,
            duration: {
                'curta': 'curta',
                'média': 'media',
                'longa': 'longa'
            }[generatedMission.duration]
        };
        navigator.clipboard.writeText(JSON.stringify(jsonToCopy, null, 2)).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
        <button
            onClick={onClick}
            className={`px-6 py-2 font-bold text-sm rounded-lg transition-all duration-300 flex-1 md:flex-none ${
                active ? 'bg-gray-800 text-white border border-gray-600 shadow-md' : 'bg-transparent text-gray-500 hover:text-gray-300'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold mb-2">Gerador Modular de Missões (V4.3 Engine)</h3>
                    <p className="text-gray-400 text-sm">Selecione o modo de operação para criar conteúdo.</p>
                </div>
                <div className="flex bg-black p-1 rounded-lg mt-4 md:mt-0 w-full md:w-auto">
                    <TabButton active={activeMode === 'single'} onClick={() => setActiveMode('single')}>Individual</TabButton>
                    <TabButton active={activeMode === 'weekly'} onClick={() => setActiveMode('weekly')}>Campanha Semanal</TabButton>
                </div>
            </div>
            
            {activeMode === 'single' && (
                <>
                    <div className="bg-[#181818] p-6 rounded-lg border border-gray-700 flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1 w-full">
                            <label htmlFor="missionType" className="block text-sm font-medium text-gray-300 mb-1">Tipo da Missão</label>
                            <select id="missionType" value={missionType} onChange={e => setMissionType(e.target.value)} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-3 focus:ring-2 focus:ring-goldenYellow-500">
                                <option value="A">A — Expansão de Universo</option>
                                <option value="B">B — Processo Criativo</option>
                                <option value="C">C — Performance</option>
                                <option value="D">D — Storytelling Pessoal</option>
                                <option value="E">E — Estudo/Técnica</option>
                                <option value="F">F — Estética Visual</option>
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label htmlFor="missionDuration" className="block text-sm font-medium text-gray-300 mb-1">Duração</label>
                            <select id="missionDuration" value={missionDuration} onChange={e => setMissionDuration(e.target.value as any)} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-3 focus:ring-2 focus:ring-goldenYellow-500">
                                <option value="curta">Curta</option>
                                <option value="média">Média</option>
                                <option value="longa">Longa</option>
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label htmlFor="missionFormat" className="block text-sm font-medium text-gray-300 mb-1">Formato</label>
                            <select id="missionFormat" value={missionFormat} onChange={e => setMissionFormat(e.target.value as any)} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-3 focus:ring-2 focus:ring-goldenYellow-500">
                                <option value="video">Video</option>
                                <option value="story">Story</option>
                                <option value="foto">Foto</option>
                                <option value="ambos">Ambos</option>
                            </select>
                        </div>
                        <button 
                            onClick={generateMission} 
                            disabled={isLoading}
                            className="w-full md:w-auto bg-goldenYellow-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-goldenYellow-400 transition-colors disabled:bg-gray-600 flex items-center justify-center h-[52px]"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'Gerar'}
                        </button>
                    </div>

                    {generatedMission && (
                        <div className="mt-8 bg-gradient-to-br from-gray-800/50 to-black/30 p-6 rounded-xl border-2 border-goldenYellow-500/50 animate-fade-in-up relative">
                            <div className="space-y-4">
                                <h4 className="text-3xl font-bold text-goldenYellow-300 text-shadow-glow">{generatedMission.title}</h4>
                                <div className="flex items-center flex-wrap gap-3 text-sm">
                                    <span className="bg-gray-700 px-3 py-1 rounded-full font-semibold">TIPO: {generatedMission.type}</span>
                                    <span className="bg-gray-700 px-3 py-1 rounded-full font-semibold">DURAÇÃO: {generatedMission.duration}</span>
                                    <span className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full font-semibold">XP Sugerido: {generatedMission.xp}</span>
                                    <span className="bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full font-semibold">LC Sugerido: {generatedMission.coins}</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-300 uppercase tracking-wider text-xs mb-1">Descrição da Missão</p>
                                    <p className="text-white whitespace-pre-wrap">{generatedMission.description}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-300 uppercase tracking-wider text-xs mb-1">Plataforma Sugerida</p>
                                    <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-semibold text-sm capitalize">{generatedMission.platform}</span>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={handleCreateMission}
                                    className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-green-500 transition-colors"
                                >
                                    Criar Missão a partir desta Sugestão
                                </button>
                                <button 
                                    onClick={copyJsonToClipboard}
                                    className="bg-gray-700 text-white font-bold py-1 px-3 rounded-lg text-xs hover:bg-gray-600 transition-colors"
                                >
                                    {copySuccess ? 'Copiado!' : 'Copiar JSON'}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeMode === 'weekly' && (
                <div className="space-y-6">
                    {stagedMissions.length === 0 ? (
                         <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700 text-center">
                            <div className="mb-6">
                                <label htmlFor="weekStart" className="block text-sm font-bold text-gray-300 mb-2">Data de Início da Semana:</label>
                                <input 
                                    type="date" 
                                    id="weekStart" 
                                    value={weekStartDate} 
                                    onChange={(e) => setWeekStartDate(e.target.value)} 
                                    className="bg-gray-900 text-white border border-gray-600 rounded px-4 py-2"
                                />
                            </div>
                            <p className="text-gray-300 mb-4">
                                Gera automaticamente um pacote de 6 missões distribuídas a partir da data selecionada.
                                <br/><span className="text-xs text-gray-500">Start (Média) → Engajamento (Curta) → Desafio (Longa) → Social (Curta) → Hype (Média) → Bônus (Média)</span>
                            </p>
                            <button 
                                onClick={generateWeeklyCampaign}
                                disabled={isLoading}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg shadow-lg shadow-purple-500/20"
                            >
                                {isLoading ? 'Gerando...' : 'Gerar Cronograma V4.3'}
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fade-in-up">
                             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                 <div>
                                    <h4 className="text-lg font-bold text-white">Área de Revisão ({stagedMissions.length} missões)</h4>
                                    <p className="text-xs text-gray-400">Clique nos cards para editar. As missões ainda não foram salvas.</p>
                                 </div>
                                 <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-400">Reagendar Início:</label>
                                        <input 
                                            type="date" 
                                            value={weekStartDate} 
                                            onChange={handleBulkScheduleChange} 
                                            className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setStagedMissions([])} className="text-red-400 text-sm hover:underline px-3">Cancelar</button>
                                        <button 
                                            onClick={handleBatchPublish}
                                            disabled={isLoading}
                                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center"
                                        >
                                            <CheckIcon className="w-4 h-4 mr-2" />
                                            {isLoading ? 'Publicando...' : 'Confirmar e Agendar Semana'}
                                        </button>
                                    </div>
                                 </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stagedMissions.map((mission, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => setEditingStagedMission(mission)}
                                        className="bg-gray-800 p-4 rounded-lg border border-gray-700 relative group cursor-pointer hover:border-goldenYellow-500 transition-all"
                                    >
                                        <div className="absolute top-2 right-2 text-xs font-bold text-gray-500 bg-black/30 px-2 py-1 rounded">
                                            {mission.scheduledFor ? new Date(mission.scheduledFor).toLocaleDateString('pt-BR') : 'Sem data'}
                                        </div>
                                        <h5 className="font-bold text-goldenYellow-400 text-sm mb-1 truncate pr-16">{mission.title}</h5>
                                        <p className="text-xs text-gray-300 line-clamp-3 mb-3 h-12">{mission.description}</p>
                                        <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-gray-700">
                                            <span className="text-blue-300">{mission.xp} XP</span>
                                            <span className="text-yellow-300">{mission.coins} LC</span>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg">
                                            <span className="text-white font-bold flex items-center"><EditIcon className="w-4 h-4 mr-2"/> Editar</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeMode === 'single' && generatedHistory.length > 0 && (
                <div className="mt-8">
                    <h4 className="font-bold text-gray-300 mb-2">Últimas 5 Missões Geradas</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        {generatedHistory.map((hist, index) => (
                            <li key={index} className="bg-gray-800/50 p-2 rounded-md opacity-80">
                                <span className="font-semibold text-gray-300">{hist.title}:</span> {hist.description.split('\n')[0]}...
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {editingStagedMission && (
                <AdminMissionModal 
                    mission={editingStagedMission} 
                    onClose={() => setEditingStagedMission(null)} 
                    onSave={handleUpdateStagedMission}
                />
            )}
        </div>
    );
};

export default MissionGenerator;
