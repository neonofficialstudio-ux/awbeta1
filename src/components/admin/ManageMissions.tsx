
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Mission, MissionSubmission, User, SubmissionStatus } from '../../types';
import AdminMissionModal from './AdminMissionModal';
import ConfirmationModal from './ConfirmationModal';
import AdminMissionDetailsModal from './AdminMissionDetailsModal';
import { StarIcon, DetailsIcon, EditIcon, DeleteIcon, CheckIcon, HistoryIcon, FilterIcon, SearchIcon } from '../../constants';
import AvatarWithFrame from '../AvatarWithFrame';
import MissionGenerator from './MissionGenerator';
import { TelemetryPRO } from '../../services/telemetry.pro';
import { AdminMissionReviewEngine } from '../../services/admin/adminMissionReview.engine';
import { safeString } from '../../api/helpers';
import { config } from '../../core/config';
import { listSubmissionsSupabase, reviewSubmissionSupabase } from '../../api/supabase/admins/missions';
import { fetchMissionSubmissionProofUrl } from '../../api/supabase/missionsProof';
import { useAppContext } from '../../constants';

// Local lazy-loader to avoid coupling to src/api/index.ts barrel exports
const loadSupabaseAdminRepository = () =>
  import('../../api/supabase/supabase.repositories.admin');

type AdminMissionFilter = 'active' | 'expired' | 'all';

// UI Lib
import Card from '../ui/base/Card';
import Button from '../ui/base/Button';
import Badge from '../ui/base/Badge';
import Tabs from '../ui/navigation/Tabs';
import TableResponsiveWrapper from '../ui/patterns/TableResponsiveWrapper';
import Section from '../ui/layout/Section';
import Pagination from '../ui/advanced/Pagination';
import Toolbar from '../ui/advanced/Toolbar';

interface ManageMissionsProps {
  missions: Mission[];
  onSaveMission: (mission: Mission) => void;
  onDeleteMission: (missionId: string) => void;
  featuredMissionId: string | null;
  setFeaturedMissionId: (id: string | null) => void;
  missionSubmissions: MissionSubmission[]; // We might reload this via engine, but keeping prop for compatibility
  allUsers: User[];
  onReview: (submissionId: string, status: 'approved' | 'rejected') => Promise<void>;
  onEditStatus: (submissionId: string, newStatus: SubmissionStatus) => Promise<void>;
  onBatchApprove: () => Promise<void>;
  onBatchSaveMissions: (missions: Mission[]) => Promise<void>;
  initialSubTab?: string;
}

const StatusBadge: React.FC<{ status: string, scheduledFor?: string }> = ({ status, scheduledFor }) => {
    const now = new Date();
    const isScheduled = scheduledFor && new Date(scheduledFor) > now;

    if (isScheduled) {
         return <Badge label="Agendada" className="bg-blue-500/20 text-blue-400 border-blue-500/30" />;
    }

    switch (status) {
        case 'active': return <Badge label="Ativa" tier="neon" className="bg-green-500/10 text-green-400 border-green-500/30" />;
        case 'expired': return <Badge label="Expirada" className="bg-gray-500/10 text-gray-400 border-gray-500/30" />;
        case 'pending': return <Badge label="Pendente" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30" />;
        case 'approved': return <Badge label="Aprovada" className="bg-green-500/10 text-green-400 border-green-500/30" />;
        case 'rejected': return <Badge label="Rejeitada" className="bg-red-500/10 text-red-400 border-red-500/30" />;
        default: return <Badge label={status} />;
    }
};

const ManageMissions: React.FC<ManageMissionsProps> = ({ 
    missions, onSaveMission, onDeleteMission, featuredMissionId, setFeaturedMissionId, 
    missionSubmissions: initialSubmissions, allUsers, onReview, onEditStatus, onBatchApprove, onBatchSaveMissions, initialSubTab
}) => {
  const { dispatch } = useAppContext();
  const lastRef = useRef<string>('');

  // State Management
  const [activeTab, setActiveTab] = useState<'manage' | 'review' | 'generator'>(initialSubTab as any || 'manage');
  const [submissions, setSubmissions] = useState<MissionSubmission[]>(initialSubmissions);
  const [missionsData, setMissionsData] = useState<Mission[]>(missions);
  const [missionFilter, setMissionFilter] = useState<AdminMissionFilter>('active');
  const [isLoadingMissions, setIsLoadingMissions] = useState(false);
  const [isArchivingExpired, setIsArchivingExpired] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | 'all'>('pending');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // To force re-render on engine updates

  // Selection & Batch
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const [viewingDetailsFor, setViewingDetailsFor] = useState<Mission | null>(null);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [isProofLoading, setIsProofLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const applyLocalMissionFilter = useCallback((source: Mission[], filter: AdminMissionFilter) => {
      if (filter === 'all') return source;
      const isActiveFilter = filter === 'active';
      return source.filter((mission) => {
          const status = mission.status;
          const isActive = mission.isActive ?? mission.active ?? (status === 'active' || status === 'scheduled');
          return isActiveFilter ? isActive : !isActive || status === 'expired';
      });
  }, []);

  const loadMissions = useCallback(async (filter: AdminMissionFilter) => {
      if (config.backendProvider === 'supabase') {
          setIsLoadingMissions(true);
          try {
              const response = await (await loadSupabaseAdminRepository()).fetchAdminMissions(filter);
              if (response?.success) {
                  setMissionsData(response.missions || []);
              } else {
                  console.error('[ManageMissions] Failed to load supabase missions', response?.error);
                  setMissionsData([]);
              }
          } catch (err) {
              console.error('[ManageMissions] Unexpected supabase missions error', err);
              setMissionsData([]);
          } finally {
              setIsLoadingMissions(false);
          }
          return;
      }
      setMissionsData(applyLocalMissionFilter(missions, filter));
  }, [applyLocalMissionFilter, missions, config.backendProvider]);

  useEffect(() => {
      void loadMissions(missionFilter);
  }, [loadMissions, missionFilter]);

  // Initial Load & Refresh
  useEffect(() => {
      const loadData = async () => {
          if (config.backendProvider === 'supabase') {
              try {
                  const missionLookup = new Map(missionsData.map((m) => [m.id, m]));
                  const statusFilter = filterStatus !== 'all' ? filterStatus : undefined;
                  const response = await listSubmissionsSupabase({ status: statusFilter as any, limit: 200, offset: 0 });
                  if (!response.success) {
                      console.error('[ManageMissions] Failed to load supabase submissions', response.error);
                  }
                  let filtered = [...(response.submissions || [])];

                  if (filterType && filterType !== 'all') {
                      filtered = filtered.filter((s) => {
                          const mission = missionLookup.get(s.missionId);
                          return mission && mission.type === filterType;
                      });
                  }

                  if (filterSearch) {
                      const lower = filterSearch.toLowerCase();
                      filtered = filtered.filter((s) => 
                          s.userName.toLowerCase().includes(lower) ||
                          s.missionTitle.toLowerCase().includes(lower) ||
                          s.userId.includes(lower)
                      );
                  }

                  filtered.sort((a, b) => new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime());
                  setSubmissions(filtered);
                  if (page !== 1) setPage(1);
                  return;
              } catch (err) {
                  console.error('[ManageMissions] Unexpected supabase submissions error', err);
              }
          }

          const data = AdminMissionReviewEngine.fetchSubmissions({
              status: filterStatus,
              type: filterType,
              search: filterSearch
          });
          setSubmissions(data);
      };
      loadData();
  }, [filterStatus, filterType, filterSearch, refreshKey, missionsData, page]);


  useEffect(() => {
      if (lastRef.current === activeTab) return;
      lastRef.current = activeTab;
      dispatch({ type: 'SET_ADMIN_TAB', payload: { tab: 'missions', subTab: activeTab } });
  }, [activeTab, dispatch]);

  // Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          // Select all visible on current page or all filtered? Usually current page for safety.
          // Let's select ALL filtered to be powerful.
          const allIds = submissions.map(s => s.id);
          setSelectedIds(new Set(allIds));
      } else {
          setSelectedIds(new Set());
      }
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
      if (selectedIds.size === 0) return;
      setIsProcessingBatch(true);
      
      const ids = Array.from(selectedIds) as string[];
      if (config.backendProvider === 'supabase') {
          for (const id of ids) {
              const response = await reviewSubmissionSupabase(id, action === 'approve' ? 'approved' : 'rejected');
              if (!response.success) {
                  console.error('[ManageMissions] Supabase bulk review failed', response.error);
              }
          }

          // ✅ REFRESH após bulk para evitar estado stale no admin
          try {
              // @ts-ignore
              if (typeof loadSubmissions === 'function') await loadSubmissions();
              // @ts-ignore
              if (typeof fetchSubmissions === 'function') await fetchSubmissions();
              // @ts-ignore
              if (typeof refetch === 'function') await refetch();
          } catch (err) {
              console.warn('[ManageMissions] post-bulk-review refetch skipped/failed', err);
          }

          setSelectedIds(new Set());
          setIsProcessingBatch(false);
          setRefreshKey(prev => prev + 1);
          return;
      }

      if (action === 'approve') {
          await AdminMissionReviewEngine.bulkApprove(ids, "admin");
      } else {
          await AdminMissionReviewEngine.bulkReject(ids, "admin");
      }
      
      setSelectedIds(new Set());
      setIsProcessingBatch(false);
      setRefreshKey(prev => prev + 1); // Refresh list
  };

  const handleSingleReview = async (id: string, status: 'approved' | 'rejected') => {
      if (config.backendProvider === 'supabase') {
          const response = await reviewSubmissionSupabase(id, status);
          if (!response.success) {
              console.error('[ManageMissions] Supabase review failed', response.error);
          }

          // ✅ REFRESH: evitar estado stale no admin após RPC atômica
          // Recarrega a lista de submissões/missões se as funções existirem no arquivo.
          // (não muda UI; apenas refetch)
          try {
              // @ts-ignore
              if (typeof loadSubmissions === 'function') await loadSubmissions();
              // @ts-ignore
              if (typeof fetchSubmissions === 'function') await fetchSubmissions();
              // @ts-ignore
              if (typeof refetch === 'function') await refetch();
          } catch (err) {
              // silencioso: não quebra o fluxo do admin
              console.warn('[ManageMissions] post-review refetch skipped/failed', err);
          }
          setRefreshKey(prev => prev + 1);
          return;
      }

      if (status === 'approved') await AdminMissionReviewEngine.approve(id, "admin");
      else await AdminMissionReviewEngine.reject(id, "admin");
      setRefreshKey(prev => prev + 1);
  };

  const handleArchiveExpired = async () => {
      if (config.backendProvider !== 'supabase') return;
      setIsArchivingExpired(true);
      try {
          const response = await (await loadSupabaseAdminRepository()).archiveExpiredMissions();
          if (!response?.success) {
              console.error('[ManageMissions] Supabase archive expired failed', response?.error);
          } else {
              await loadMissions(missionFilter);
              setRefreshKey(prev => prev + 1);
          }
      } catch (err) {
          console.error('[ManageMissions] Unexpected archive expired error', err);
      } finally {
          setIsArchivingExpired(false);
      }
  };

  // Pagination Logic
  const paginatedData = useMemo(() => {
      const start = (page - 1) * ITEMS_PER_PAGE;
      return submissions.slice(start, start + ITEMS_PER_PAGE);
  }, [submissions, page]);

  const totalPages = Math.ceil(submissions.length / ITEMS_PER_PAGE);

  // Modal Handlers
  const handleOpenModal = (mission: Mission | null = null) => { setEditingMission(mission); setIsModalOpen(true); };
  const handleCloseModal = () => { setEditingMission(null); setIsModalOpen(false); };
  const handleSaveAndClose = (m: Mission) => { onSaveMission(m); handleCloseModal(); };
  const requestDeleteMission = (id: string) => { setMissionToDelete(id); setShowConfirmModal(true); };
  const handleConfirmDelete = () => { if (missionToDelete) { onDeleteMission(missionToDelete); setMissionToDelete(null); setShowConfirmModal(false); } };
  const handleShowProof = async (submission: MissionSubmission) => {
      if (config.backendProvider !== 'supabase') {
          setProofModalUrl(submission.proofUrl);
          return;
      }

      setIsProofLoading(true);
      try {
          const proofUrl = await fetchMissionSubmissionProofUrl(submission.id);
          if (proofUrl) {
              setProofModalUrl(proofUrl);
          } else {
              console.warn('[ManageMissions] Proof URL not found for submission', submission.id);
          }
      } catch (err) {
          console.error('[ManageMissions] Failed to fetch proof URL', err);
      } finally {
          setIsProofLoading(false);
      }
  };

  return (
    <div>
      <Tabs 
        items={[
            { id: 'manage', label: 'Gerenciar Missões' },
            { id: 'review', label: 'Revisão Turbo', count: submissions.filter(s => s.status === 'pending').length },
            { id: 'generator', label: 'Gerador V4.3' }
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        className="mb-6"
        variant="solid"
      />

      <Section className="animate-fade-in-up" noPadding>
        {/* --- TAB: MANAGE --- */}
        {activeTab === 'manage' && (
            <div className="p-6 bg-slate-dark border border-white/5 rounded-xl shadow-lg">
              <Toolbar 
                start={
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xl font-bold text-white font-chakra">Catálogo de Missões</h3>
                    <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => setMissionFilter('active')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${missionFilter === 'active' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                        >
                          Ativas
                        </button>
                        <button 
                          onClick={() => setMissionFilter('expired')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${missionFilter === 'expired' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                        >
                          Expiradas
                        </button>
                        <button 
                          onClick={() => setMissionFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${missionFilter === 'all' ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                        >
                          Todas
                        </button>
                    </div>
                  </div>
                }
                end={
                  <div className="flex flex-wrap gap-2 justify-end">
                    {config.backendProvider === 'supabase' && (
                      <Button 
                        onClick={handleArchiveExpired} 
                        disabled={isArchivingExpired || isLoadingMissions}
                        className="bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 hover:border-neon-cyan/50 font-bold"
                      >
                        {isArchivingExpired ? 'Arquivando...' : 'Arquivar expiradas agora'}
                      </Button>
                    )}
                    <Button onClick={() => handleOpenModal()} leftIcon={<span className="text-xl leading-none">+</span>} className="bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 hover:border-neon-cyan/50 font-bold">
                      Adicionar Missão
                    </Button>
                  </div>
                }
              />
              {config.backendProvider === 'supabase' && isLoadingMissions && (
                <div className="text-xs text-gray-400 px-1 pb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Atualizando catálogo...
                </div>
              )}
              <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden shadow-inner">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs text-gray-500 uppercase bg-navy-deep/80 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4">Destaque</th>
                      <th className="px-6 py-4">Título</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Metrics</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-navy-deep">
                    {missionsData.map(mission => (
                        <tr key={mission.id} className="hover:bg-white/5 transition-colors group">
                           <td className="px-6 py-4 text-center">
                            <button onClick={() => setFeaturedMissionId(mission.id)} className={`p-2 rounded-full transition-all ${featuredMissionId === mission.id ? 'bg-gold-cinematic/20 text-gold-cinematic' : 'text-gray-600 hover:text-white'}`}>
                              <StarIcon className="w-5 h-5" />
                            </button>
                          </td>
                          <td className="px-6 py-4">
                              <p className="font-bold text-white truncate max-w-[200px]">{mission.title}</p>
                              <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase">{mission.xp} XP • {mission.coins} Coins</p>
                          </td>
                          <td className="px-6 py-4"><StatusBadge status={mission.status} scheduledFor={mission.scheduledFor} /></td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                               - {/* Metrics placeholder */}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(mission)}><EditIcon className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => requestDeleteMission(mission.id)} className="text-red-500"><DeleteIcon className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </TableResponsiveWrapper>
            </div>
        )}

        {/* --- TAB: REVIEW TURBO --- */}
        {activeTab === 'review' && (
            <div className="p-6 space-y-6 bg-slate-dark border border-white/5 rounded-xl shadow-lg relative">
                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#FFD447] text-black px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-pop-in border-2 border-white/20">
                        <span className="font-bold text-sm">{selectedIds.size} selecionados</span>
                        <div className="h-4 w-px bg-black/20"></div>
                        <button onClick={() => handleBulkAction('approve')} disabled={isProcessingBatch} className="font-bold hover:underline flex items-center gap-1"><CheckIcon className="w-4 h-4"/> Aprovar</button>
                        <button onClick={() => handleBulkAction('reject')} disabled={isProcessingBatch} className="font-bold hover:underline text-red-800 flex items-center gap-1"><DeleteIcon className="w-4 h-4"/> Rejeitar</button>
                    </div>
                )}

                {/* Filter Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-navy-deep/50 p-4 rounded-xl border border-white/5">
                    <div className="flex gap-3 overflow-x-auto pb-1 w-full md:w-auto">
                        <button onClick={() => setFilterStatus('pending')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${filterStatus === 'pending' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>Pendentes</button>
                        <button onClick={() => setFilterStatus('approved')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${filterStatus === 'approved' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>Aprovadas</button>
                        <button onClick={() => setFilterStatus('rejected')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${filterStatus === 'rejected' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>Rejeitadas</button>
                        <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${filterStatus === 'all' ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>Todas</button>
                    </div>
                    <div className="relative w-full md:w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar usuário ou missão..." 
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-gold-cinematic outline-none"
                        />
                    </div>
                </div>

                <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden bg-navy-deep">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-500 uppercase bg-black/20 border-b border-white/5">
                            <tr>
                                <th className="px-4 py-4 w-10 text-center">
                                    <input type="checkbox" onChange={handleSelectAll} checked={submissions.length > 0 && selectedIds.size === submissions.length} className="rounded border-gray-600 bg-gray-800 text-gold-cinematic focus:ring-0"/>
                                </th>
                                <th className="px-4 py-4">Usuário</th>
                                <th className="px-4 py-4">Missão</th>
                                <th className="px-4 py-4">Prova</th>
                                <th className="px-4 py-4">Risco</th>
                                <th className="px-4 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {paginatedData.length > 0 ? paginatedData.map(sub => {
                                const risk = AdminMissionReviewEngine.checkRisk(sub);
                                return (
                                    <tr key={sub.id} className={`hover:bg-white/5 transition-colors ${selectedIds.has(sub.id) ? 'bg-white/5' : ''}`}>
                                        <td className="px-4 py-4 text-center">
                                            <input type="checkbox" checked={selectedIds.has(sub.id)} onChange={() => handleSelectOne(sub.id)} className="rounded border-gray-600 bg-gray-800 text-gold-cinematic focus:ring-0"/>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={sub.userAvatar} className="w-8 h-8 rounded-full border border-white/10" />
                                                <span className="font-medium text-white">{sub.userName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 max-w-[200px] truncate">{sub.missionTitle}</td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => handleShowProof(sub)}
                                                disabled={isProofLoading}
                                                className="text-xs font-bold text-neon-cyan hover:underline border border-neon-cyan/30 px-2 py-1 rounded disabled:opacity-60"
                                            >
                                                {isProofLoading ? 'Carregando...' : 'Ver Prova'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            {risk.isRisk ? (
                                                <span className="text-xs text-red-400 font-bold flex items-center gap-1" title={risk.reason}>
                                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Check
                                                </span>
                                            ) : <span className="text-xs text-green-500 opacity-50">OK</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {sub.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleSingleReview(sub.id, 'approved')} className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-colors"><CheckIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => handleSingleReview(sub.id, 'rejected')} className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-black transition-colors"><DeleteIcon className="w-4 h-4"/></button>
                                                </div>
                                            )}
                                            {sub.status !== 'pending' && <StatusBadge status={sub.status} />}
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-500 italic">Nenhuma submissão encontrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </TableResponsiveWrapper>
                
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
        )}

        {/* --- TAB: GENERATOR --- */}
        {activeTab === 'generator' && (
            <div className="p-6 bg-slate-dark border border-white/5 rounded-xl shadow-lg">
                <MissionGenerator 
                    onMissionCreate={handleOpenModal} 
                    onBatchCreate={onBatchSaveMissions}
                />
            </div>
        )}
      </Section>

      {/* Modals */}
      {isModalOpen && (
        <AdminMissionModal
            mission={editingMission}
            onClose={handleCloseModal}
            onSave={handleSaveAndClose}
        />
      )}
      
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message="Você tem certeza que deseja excluir esta missão? A ação é irreversível."
        confirmButtonText="Sim, Excluir"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {proofModalUrl && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => setProofModalUrl(null)}>
              <div className="relative max-w-4xl max-h-[90vh] border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-black flex flex-col">
                  <div className="absolute top-4 right-4 z-10">
                      <button className="bg-black/50 text-white rounded-full w-10 h-10 font-bold border border-white/20 hover:bg-white/20 transition-colors">✕</button>
                  </div>
                  {safeString(proofModalUrl).startsWith('http') && !safeString(proofModalUrl).includes('instagram') ? (
                      <iframe src={proofModalUrl} className="w-full h-[80vh]" />
                  ) : (
                      <img src={proofModalUrl} alt="Prova" className="max-w-full max-h-full object-contain" />
                  )}
                  <div className="bg-black/80 p-4 text-center">
                      <a href={proofModalUrl} target="_blank" rel="noreferrer" className="text-gold-cinematic hover:underline font-bold text-sm">Abrir link original ↗</a>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ManageMissions;
