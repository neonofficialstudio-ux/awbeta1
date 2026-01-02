
import React, { useState, useEffect } from 'react';
import type { Event, Participation, User, FeaturedWinner, EventMission, EventMissionSubmission, ManualEventPointsLog, StoreItem, UsableItem, UnifiedAwardEntry } from '../../types';
import AdminEventModal from './AdminEventModal';
import AdminParticipantsModal from './AdminParticipantsModal';
import ConfirmationModal from './ConfirmationModal';
import AdminWinnerModal from './AdminWinnerModal';
import AdminArtistsOfTheDayModal from './AdminArtistOfTheDayModal';
import AdminEventMissionModal from './AdminEventMissionModal';
import AdminEventFinalizeModal from './AdminEventFinalizeModal';
import { EditIcon, DeleteIcon, CheckIcon, SearchIcon, LockIcon, CrownIcon, TrophyIcon, StarIcon, HistoryIcon } from '../../constants';
import { getDisplayName } from '../../api/core/getDisplayName';

// UI Components
import Tabs from '../ui/navigation/Tabs';
import Card from '../ui/base/Card';
import Button from '../ui/base/Button';
import Badge from '../ui/base/Badge';
import TableResponsiveWrapper from '../ui/patterns/TableResponsiveWrapper';
import Toolbar from '../ui/advanced/Toolbar';
import Input from '../ui/base/Input';
import Select from '../ui/base/Select';
import * as api from '../../api/index';

interface ManageEventsProps {
    events: Event[];
    onSaveEvent: (event: Event) => void;
    onDeleteEvent: (eventId: string) => void;
    participations: Participation[];
    allUsers: User[];
    featuredWinners: FeaturedWinner[];
    onSaveFeaturedWinner: (winner: FeaturedWinner) => void;
    onDeleteFeaturedWinner: (winnerId: string) => void;
    artistsOfTheDayIds: string[];
    // Update prop signature to allow async return for modal loading state
    setArtistsOfTheDayIds: (ids: string[]) => Promise<void> | void; 
    artistCarouselDuration: number;
    setArtistCarouselDuration: (duration: number) => void;
    eventMissions: EventMission[];
    onSaveEventMission: (mission: EventMission) => void;
    onDeleteEventMission: (missionId: string) => void;
    eventMissionSubmissions: EventMissionSubmission[];
    onReviewEventMission: (submissionId: string, status: 'approved' | 'rejected') => void;
    onAddManualEventPoints: (userId: string, eventId: string, points: number, reason: string) => Promise<void>;
    manualEventPointsLog: ManualEventPointsLog[];
    onBatchApproveEventMissions: () => Promise<void>;
    
    // New Props for Wizard
    storeItems: StoreItem[];
    usableItems: UsableItem[];
    
    // V8.2 Prop
    unifiedAwards?: UnifiedAwardEntry[];
}
type EventAdminTab = 'events' | 'winners' | 'missions' | 'review';

const StatusBadge: React.FC<{ status: Event['status'] | EventMissionSubmission['status'] }> = ({ status }) => {
    switch(status) {
        case 'current': return <Badge label="Atual" tier="neon" className="bg-green-500/10 text-green-400 border-green-500/30" />;
        case 'past': return <Badge label="Passado" className="bg-gray-500/10 text-gray-400 border-gray-500/30" />;
        case 'future': return <Badge label="Futuro" className="bg-blue-500/10 text-blue-400 border-blue-500/30" />;
        case 'closed': return <Badge label="Encerrado" className="bg-red-900/20 text-red-400 border-red-500/30" />;
        case 'pending': return <Badge label="Pendente" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30" />;
        case 'approved': return <Badge label="Aprovada" className="bg-green-500/10 text-green-400 border-green-500/30" />;
        case 'rejected': return <Badge label="Rejeitada" className="bg-red-500/10 text-red-400 border-red-500/30" />;
        default: return <Badge label={status} />;
    }
}

const ManageEvents: React.FC<ManageEventsProps> = (props) => {
    const [activeTab, setActiveTab] = useState<EventAdminTab>('events');
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [viewingParticipantsFor, setViewingParticipantsFor] = useState<Event | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'event' | 'winner' | 'eventMission'; title: string } | null>(null);
    const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
    const [editingWinner, setEditingWinner] = useState<FeaturedWinner | null>(null);
    const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
    const [isEventMissionModalOpen, setIsEventMissionModalOpen] = useState(false);
    const [editingEventMission, setEditingEventMission] = useState<EventMission | null>(null);
    const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    
    const [selectedEventForMissions, setSelectedEventForMissions] = useState<string>('');
    const [isBatchApproving, setIsBatchApproving] = useState(false);
    const [isConfirmBatchOpen, setIsConfirmBatchOpen] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [pointsToAdd, setPointsToAdd] = useState<number | ''>('');
    const [reason, setReason] = useState<string>('');
    const [isSubmittingPoints, setIsSubmittingPoints] = useState(false);
    
    // Local state for rotation duration to prevent UI blocking
    const [localDuration, setLocalDuration] = useState<number>(props.artistCarouselDuration || 10);

    // V7.9 Wizard State
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [eventToFinalize, setEventToFinalize] = useState<Event | null>(null);

    const { manualEventPointsLog } = props;
    const currentEvents = props.events.filter(e => e.status === 'current' || e.status === 'future');
    const userList = props.allUsers.filter(u => u.role === 'user');
    
    // V8.1: Helper to derive artist objects from IDs
    const artistsOfTheDay = props.allUsers.filter(u => props.artistsOfTheDayIds.includes(u.id));

    // Sync local state with prop
    useEffect(() => {
        setLocalDuration(props.artistCarouselDuration);
    }, [props.artistCarouselDuration]);

    useEffect(() => {
        if (userList.length > 0 && !selectedUserId) {
            setSelectedUserId(userList[0].id);
        }
        if (currentEvents.length > 0 && !selectedEventId) {
            setSelectedEventId(currentEvents[0].id);
        }
    }, [userList, currentEvents, selectedUserId, selectedEventId]);

    useEffect(() => {
        // Ensure an event is selected if the list isn't empty
        if (props.events.length > 0) {
            if (!selectedEventForMissions) {
                // Prefer active events
                const activeOrFuture = props.events.find(e => e.status === 'current') || props.events.find(e => e.status === 'future');
                if (activeOrFuture) {
                    setSelectedEventForMissions(activeOrFuture.id);
                } else {
                    setSelectedEventForMissions(props.events[0].id);
                }
            } else {
                // Verify selection still exists
                const exists = props.events.some(e => e.id === selectedEventForMissions);
                if (!exists) {
                     setSelectedEventForMissions(props.events[0].id);
                }
            }
        }
    }, [props.events, selectedEventForMissions]);

    const handleAddPointsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId || !selectedEventId || pointsToAdd === '' || !reason.trim()) {
            alert("Por favor, preencha todos os campos.");
            return;
        }
        setIsSubmittingPoints(true);
        await props.onAddManualEventPoints(selectedUserId, selectedEventId, Number(pointsToAdd), reason);
        setPointsToAdd('');
        setReason('');
        setIsSubmittingPoints(false);
        alert('Pontos adicionados com sucesso!');
    };

    const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
        setProcessingId(submissionId);
        await props.onReviewEventMission(submissionId, status);
        setProcessingId(null);
    }

    const handleBatchApprove = async () => {
        setIsConfirmBatchOpen(false);
        setIsBatchApproving(true);
        await props.onBatchApproveEventMissions();
        setIsBatchApproving(false);
    };
    
    const handleOpenFinalizeWizard = (event: Event) => {
        setEventToFinalize(event);
        setIsFinalizeModalOpen(true);
    }

    const handleViewProof = (proofUrl: string) => {
        if (proofUrl.startsWith('http')) {
            window.open(proofUrl, '_blank', 'noopener,noreferrer');
        } else {
            setProofModalUrl(proofUrl);
        }
    };

    const pendingEventSubmissions = props.eventMissionSubmissions.filter(s => s.status === 'pending');
    const reviewedEventSubmissions = props.eventMissionSubmissions.filter(s => s.status !== 'pending').sort((a,b) => new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime());
    
    
    // Filter missions based on selected event
    const filteredMissions = props.eventMissions.filter(m => m.eventId === selectedEventForMissions);

    const handleOpenEventModal = (event: Event | null = null) => {
        setEditingEvent(event);
        setIsEventModalOpen(true);
    };

    const handleOpenWinnerModal = (winner: FeaturedWinner | null = null) => {
        setEditingWinner(winner);
        setIsWinnerModalOpen(true);
    }
    
    const handleOpenEventMissionModal = (mission: EventMission | null = null) => {
        setEditingEventMission(mission);
        setIsEventMissionModalOpen(true);
    }

    const handleSaveEventAndClose = (event: Event) => {
        props.onSaveEvent(event);
        setIsEventModalOpen(false);
        setEditingEvent(null);
    };

    const handleSaveWinnerAndClose = (winner: FeaturedWinner) => {
        props.onSaveFeaturedWinner(winner);
        setIsWinnerModalOpen(false);
        setEditingWinner(null);
    }

    const handleSaveEventMissionAndClose = (mission: EventMission) => {
        props.onSaveEventMission(mission);
        setIsEventMissionModalOpen(false);
        setEditingEventMission(null);
    };
    
    const requestDelete = (item: Event | FeaturedWinner | EventMission, type: 'event' | 'winner' | 'eventMission') => {
        const title = 'prizeTitle' in item ? item.prizeTitle : item.title;
        setItemToDelete({ id: item.id, type, title });
    };

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'event') props.onDeleteEvent(itemToDelete.id);
        if (itemToDelete.type === 'winner') props.onDeleteFeaturedWinner(itemToDelete.id);
        if (itemToDelete.type === 'eventMission') props.onDeleteEventMission(itemToDelete.id);
        setItemToDelete(null);
    };

    // V8.1: Wrap setArtistsOfTheDayIds to handle Promise if necessary
    const handleSaveArtists = async (ids: string[]) => {
         await props.setArtistsOfTheDayIds(ids);
         // Refresh handled by parent's AdminPanel state update logic (handleAdminAction)
    };

    const handleDurationBlur = () => {
        if (localDuration !== props.artistCarouselDuration) {
            props.setArtistCarouselDuration(Math.max(3, localDuration));
        }
    };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <Card>
        <Card.Header>
            <Toolbar 
                start={<h3 className="text-lg font-bold text-white">Artistas do Dia</h3>}
                end={
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <label htmlFor="carouselDuration" className="text-[#808080]">Slide (s):</label>
                            <Input 
                                id="carouselDuration"
                                type="number"
                                value={localDuration}
                                onChange={(e) => setLocalDuration(Number(e.target.value))}
                                onBlur={handleDurationBlur}
                                className="w-20 text-center"
                                min="3"
                                max="60"
                            />
                        </div>
                        <Button onClick={() => setIsArtistModalOpen(true)}>Selecionar</Button>
                    </div>
                }
            />
        </Card.Header>
        <Card.Body>
            {artistsOfTheDay.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {artistsOfTheDay.map(artist => (
                        <div key={artist.id} className="flex items-center bg-[#14171C] p-3 rounded-lg border border-[#2A2D33]">
                            <img src={artist.avatarUrl} alt={artist.name} className="w-10 h-10 rounded-full mr-3 object-cover" />
                            <div className="min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{getDisplayName({ ...artist, artistic_name: artist.artisticName })}</p>
                                <p className="text-xs text-[#808080] truncate">{artist.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-[#808080] text-center text-sm italic">Nenhum artista selecionado.</p>
            )}
        </Card.Body>
      </Card>

      <div>
        <Tabs 
            variant="solid"
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
            items={[
                { id: 'events', label: 'Eventos' },
                { id: 'winners', label: 'Histórico de Premiações' },
                { id: 'missions', label: 'Missões' },
                { id: 'review', label: 'Revisão', count: pendingEventSubmissions.length },
            ]}
            className="mb-6"
        />
        
        {activeTab === 'events' && (
            <Card>
                 <Card.Header>
                    <Toolbar 
                        start={<h3 className="text-lg font-bold text-white">Todos os Eventos</h3>}
                        end={<Button onClick={() => handleOpenEventModal()} leftIcon={<span>+</span>}>Novo Evento</Button>}
                    />
                </Card.Header>
                <Card.Body noPadding>
                    <TableResponsiveWrapper>
                        <table className="w-full text-sm text-left text-[#B3B3B3]">
                            <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                                <tr>
                                    <th className="px-6 py-3">Título</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Inscritos</th>
                                    <th className="px-6 py-3">Prêmio</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2A2D33]">
                            {props.events.map(event => {
                                const participantCount = props.participations.filter(p => p.eventId === event.id).length;
                                
                                return (
                                    <tr key={event.id} className="hover:bg-[#23262B] transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{event.title}</td>
                                        <td className="px-6 py-4"><StatusBadge status={event.status} /></td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => setViewingParticipantsFor(event)} className="text-[#FFD447] hover:underline disabled:text-[#808080] disabled:no-underline" disabled={participantCount === 0}>
                                            {participantCount}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">{event.prize}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Close Button for Current Events - Trigger Wizard V7.9 */}
                                                {event.status === 'current' && (
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        onClick={() => handleOpenFinalizeWizard(event)} 
                                                        className="text-red-400 border-red-900/30 hover:bg-red-900/20"
                                                        title="Encerrar e Premiar (Wizard)"
                                                    >
                                                        <LockIcon className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenEventModal(event)} className="text-[#FFD447]">
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => requestDelete(event, 'event')} className="text-[#C0392B]">
                                                    <DeleteIcon className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </TableResponsiveWrapper>
                </Card.Body>
            </Card>
        )}

        {/* V8.2 UNIFIED AWARDS TAB */}
        {activeTab === 'winners' && (
            <Card>
                <Card.Header>
                    <Toolbar 
                        start={<h3 className="text-lg font-bold text-white">Histórico Universal de Premiações</h3>}
                        end={<Button onClick={() => handleOpenWinnerModal()} leftIcon={<span>+</span>}>Adicionar Manual</Button>}
                    />
                </Card.Header>
                 <Card.Body noPadding>
                    <TableResponsiveWrapper>
                        <table className="w-full text-sm text-left text-[#B3B3B3]">
                            <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Usuário</th>
                                    <th className="px-6 py-3">Origem</th>
                                    <th className="px-6 py-3">Prêmio</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2A2D33]">
                            {props.unifiedAwards?.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-600">Nenhuma premiação registrada.</td></tr>
                            )}
                            {props.unifiedAwards?.map(award => (
                                <tr key={award.id} className="hover:bg-[#23262B]">
                                    <td className="px-6 py-4 font-mono text-xs">{new Date(award.dateISO).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border
                                            ${award.type === 'event' ? 'bg-purple-900/20 text-purple-400 border-purple-500/30' :
                                              award.type === 'jackpot' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' :
                                              award.type === 'raffle' ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' :
                                              'bg-gray-800 text-gray-400 border-gray-600'}`}>
                                            {award.type === 'event' && <TrophyIcon className="w-3 h-3 inline mr-1"/>}
                                            {award.type === 'jackpot' && <CrownIcon className="w-3 h-3 inline mr-1"/>}
                                            {award.type === 'raffle' && <StarIcon className="w-3 h-3 inline mr-1"/>}
                                            {award.type === 'manual' && <HistoryIcon className="w-3 h-3 inline mr-1"/>}
                                            {award.type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                        <img src={award.userAvatar || "https://i.pravatar.cc/150?u=default"} className="w-6 h-6 rounded-full border border-white/10" />
                                        {award.userName}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">{award.sourceTitle}</td>
                                    <td className="px-6 py-4 text-white font-bold">{award.rewardDescription}</td>
                                    <td className="px-6 py-4 text-right">
                                        {/* View/Delete actions disabled for history integrity except legacy cleanups */}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </TableResponsiveWrapper>
                </Card.Body>
            </Card>
        )}

        {activeTab === 'missions' && (
            <Card>
                <Card.Header>
                    <Toolbar 
                        start={
                             <div className="flex flex-col sm:flex-row items-center gap-4">
                                <h3 className="text-lg font-bold text-white">Missões de Evento</h3>
                                <select 
                                    value={selectedEventForMissions} 
                                    onChange={(e) => setSelectedEventForMissions(e.target.value)}
                                    className="bg-[#14171C] text-white border border-[#2A2D33] rounded-lg px-3 py-2 text-sm focus:border-[#FFD447] outline-none"
                                >
                                    {props.events.map(event => (
                                        <option key={event.id} value={event.id}>{event.title} ({event.status})</option>
                                    ))}
                                    {props.events.length === 0 && <option value="">Nenhum evento criado</option>}
                                </select>
                            </div>
                        }
                        end={
                             <Button onClick={() => handleOpenEventMissionModal()} disabled={!selectedEventForMissions} leftIcon={<span>+</span>}>
                                Nova Missão
                            </Button>
                        }
                    />
                </Card.Header>
                <Card.Body noPadding>
                    <TableResponsiveWrapper>
                        <table className="w-full text-sm text-left text-[#B3B3B3]">
                            <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                                <tr>
                                    <th className="px-6 py-3">Título</th>
                                    <th className="px-6 py-3">Evento</th>
                                    <th className="px-6 py-3">Pontos</th>
                                    <th className="px-6 py-3">XP</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-[#2A2D33]">
                                {filteredMissions.length > 0 ? (
                                    filteredMissions.map(mission => {
                                        const event = props.events.find(e => e.id === mission.eventId);
                                        return (
                                             <tr key={mission.id} className="hover:bg-[#23262B]">
                                                <td className="px-6 py-4 font-medium text-white">{mission.title}</td>
                                                <td className="px-6 py-4">{event?.title || 'N/A'}</td>
                                                <td className="px-6 py-4 text-[#FFD447] font-bold">{mission.points}</td>
                                                <td className="px-6 py-4 font-bold text-[#5DADE2]">{mission.xp}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => handleOpenEventMissionModal(mission)} className="text-[#FFD447]">
                                                            <EditIcon className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => requestDelete(mission, 'eventMission')} className="text-[#C0392B]">
                                                            <DeleteIcon className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr><td colSpan={5} className="text-center py-8 text-[#808080]">Nenhuma missão encontrada para este evento.</td></tr>
                                )}
                             </tbody>
                        </table>
                    </TableResponsiveWrapper>
                </Card.Body>
            </Card>
        )}

        {activeTab === 'review' && (
            <div className="space-y-8">
                <Card>
                    <Card.Header>
                        <Toolbar 
                            start={<h3 className="text-lg font-bold text-white">Revisão de Missões de Evento ({pendingEventSubmissions.length})</h3>}
                            end={
                                <Button 
                                    onClick={() => setIsConfirmBatchOpen(true)} 
                                    disabled={pendingEventSubmissions.length === 0 || isBatchApproving}
                                    variant="success"
                                >
                                    {isBatchApproving ? 'Processando...' : 'Aprovar Todas'}
                                </Button>
                            }
                        />
                    </Card.Header>
                    <Card.Body noPadding>
                        <TableResponsiveWrapper>
                            <table className="w-full text-sm text-left text-[#B3B3B3]">
                                <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                                    <tr>
                                        <th className="px-6 py-3">Usuário</th>
                                        <th className="px-6 py-3">Evento / Missão</th>
                                        <th className="px-6 py-3">Data</th>
                                        <th className="px-6 py-3">Prova</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2A2D33]">
                                    {pendingEventSubmissions.length > 0 ? (
                                        pendingEventSubmissions.map(sub => {
                                            const event = props.events.find(e => e.id === sub.eventId);
                                            const isProcessing = processingId === sub.id;
                                            return (
                                                <tr key={sub.id} className="hover:bg-[#23262B]">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={sub.userAvatar} className="w-8 h-8 rounded-full border border-[#333]" />
                                                            <div>
                                                                <p className="font-medium text-white">{sub.userName}</p>
                                                                <p className="text-xs text-[#808080]">ID: {sub.userId.slice(0,6)}...</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs font-bold text-[#FFD447] uppercase mb-1">{event?.title || sub.eventId}</div>
                                                        <div className="text-white">{sub.missionTitle}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-[#808080]">{new Date(sub.submittedAtISO).toLocaleString('pt-BR')}</td>
                                                    <td className="px-6 py-4">
                                                        <button onClick={() => handleViewProof(sub.proofUrl)} className="text-[#5DADE2] hover:underline text-xs font-bold flex items-center gap-1">
                                                            <SearchIcon className="w-3 h-3"/> Ver Prova
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="success" size="sm" onClick={() => handleReview(sub.id, 'approved')} disabled={isProcessing}>
                                                                <CheckIcon className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="danger" size="sm" onClick={() => handleReview(sub.id, 'rejected')} disabled={isProcessing}>
                                                                <DeleteIcon className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    ) : (
                                        <tr><td colSpan={5} className="text-center py-12 text-[#808080]">Nenhuma submissão pendente.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </TableResponsiveWrapper>
                    </Card.Body>
                </Card>

                {/* Merged History Section */}
                <div className="space-y-8">
                     {/* Submissions History */}
                     <Card>
                        <Card.Header><h3 className="text-lg font-bold text-white">Histórico de Submissões</h3></Card.Header>
                         <Card.Body noPadding>
                             <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                <TableResponsiveWrapper>
                                    <table className="w-full text-sm text-left text-[#B3B3B3]">
                                        <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33] sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">Usuário</th>
                                                <th className="px-6 py-3">Missão</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#2A2D33]">
                                            {reviewedEventSubmissions.map(sub => (
                                                 <tr key={sub.id} className="hover:bg-[#23262B]">
                                                    <td className="px-6 py-3 text-white font-medium">{sub.userName}</td>
                                                    <td className="px-6 py-3">{sub.missionTitle}</td>
                                                    <td className="px-6 py-3"><StatusBadge status={sub.status} /></td>
                                                    <td className="px-6 py-3 text-xs">{new Date(sub.submittedAtISO).toLocaleString('pt-BR')}</td>
                                                </tr>
                                            ))}
                                            {reviewedEventSubmissions.length === 0 && <tr><td colSpan={4} className="text-center py-6">Nenhum histórico disponível.</td></tr>}
                                        </tbody>
                                    </table>
                                </TableResponsiveWrapper>
                            </div>
                         </Card.Body>
                     </Card>

                     {/* Manual Points Log */}
                     <Card>
                        <Card.Header><h3 className="text-lg font-bold text-white">Log de Pontuação Manual</h3></Card.Header>
                         <Card.Body noPadding>
                             <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                <TableResponsiveWrapper>
                                    <table className="w-full text-sm text-left text-[#B3B3B3]">
                                        <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33] sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">Admin</th>
                                                <th className="px-6 py-3">Usuário Alvo</th>
                                                <th className="px-6 py-3">Evento</th>
                                                <th className="px-6 py-3 text-right">Pontos</th>
                                                <th className="px-6 py-3">Motivo</th>
                                                <th className="px-6 py-3">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#2A2D33]">
                                            {manualEventPointsLog.map(log => (
                                                 <tr key={log.id} className="hover:bg-[#23262B]">
                                                    <td className="px-6 py-3 text-[#FFD447] font-bold">{log.adminName}</td>
                                                    <td className="px-6 py-3 text-white">{log.userName}</td>
                                                    <td className="px-6 py-3">{log.eventName}</td>
                                                    <td className="px-6 py-3 text-right text-green-400 font-mono">+{log.pointsAdded}</td>
                                                    <td className="px-6 py-3 text-xs italic">{log.reason}</td>
                                                    <td className="px-6 py-3 text-xs">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                                </tr>
                                            ))}
                                            {manualEventPointsLog.length === 0 && <tr><td colSpan={6} className="text-center py-6">Nenhum registro manual.</td></tr>}
                                        </tbody>
                                    </table>
                                </TableResponsiveWrapper>
                            </div>
                         </Card.Body>
                     </Card>
                 </div>
            </div>
        )}

      </div>

      {/* Modals */}
      {isEventModalOpen && <AdminEventModal event={editingEvent} onClose={() => { setIsEventModalOpen(false); setEditingEvent(null); }} onSave={handleSaveEventAndClose} />}
      
      {/* Updated to new Manual Award Modal Logic */}
      {isWinnerModalOpen && (
          <AdminWinnerModal 
              winner={editingWinner} 
              allUsers={props.allUsers} 
              onClose={() => { setIsWinnerModalOpen(false); setEditingWinner(null); }} 
              onSave={handleSaveWinnerAndClose} 
              events={props.events}
              storeItems={[...props.storeItems, ...props.usableItems]}
          />
      )}
      
      {isEventMissionModalOpen && <AdminEventMissionModal mission={editingEventMission} events={props.events} onClose={() => { setIsEventMissionModalOpen(false); setEditingEventMission(null); }} onSave={handleSaveEventMissionAndClose} preSelectedEventId={selectedEventForMissions} />}
      {viewingParticipantsFor && <AdminParticipantsModal item={viewingParticipantsFor} participations={props.participations} allUsers={props.allUsers} onClose={() => setViewingParticipantsFor(null)} />}
      {isArtistModalOpen && <AdminArtistsOfTheDayModal isOpen={isArtistModalOpen} onClose={() => setIsArtistModalOpen(false)} allUsers={props.allUsers} currentArtistIds={props.artistsOfTheDayIds} onSave={handleSaveArtists} />}
      {proofModalUrl && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4" onClick={() => setProofModalUrl(null)}>
                <img src={proofModalUrl} alt="Prova" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" />
            </div>
      )}
      
      {/* V7.9 Finalization Wizard */}
      {isFinalizeModalOpen && eventToFinalize && (
          <AdminEventFinalizeModal
            event={eventToFinalize}
            onClose={() => { setIsFinalizeModalOpen(false); setEventToFinalize(null); }}
            storeItems={[...props.storeItems, ...props.usableItems]} // Pass all items as potential rewards
          />
      )}
      
      <ConfirmationModal
        isOpen={isConfirmBatchOpen}
        onClose={() => setIsConfirmBatchOpen(false)}
        onConfirm={handleBatchApprove}
        title="Confirmar Aprovação em Lote"
        message={`Tem certeza que deseja aprovar TODAS as ${pendingEventSubmissions.length} submissões pendentes? Esta ação é irreversível.`}
        confirmButtonText={isBatchApproving ? "Processando..." : "Sim, Aprovar Tudo"}
      />

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`Confirmar Exclusão`}
        message={
            <>
                <p>Você tem certeza que deseja excluir permanentemente o item <span className="font-bold text-white">"{itemToDelete?.title}"</span>?</p>
                <p className="mt-2 font-bold text-red-400">Esta ação não pode ser desfeita.</p>
            </>
        }
      />
    </div>
  );
};

export default ManageEvents;
