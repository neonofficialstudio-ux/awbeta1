
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { UsableItemQueueEntry, ProcessedUsableItemQueueEntry, ArtistOfTheDayQueueEntry, ProcessedArtistOfTheDayQueueEntry, User, Mission, RedeemedItem } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';
import { CheckIcon, PromoteIcon, MissionIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import AdminMissionModal from './AdminMissionModal';
import AdminRewardDetailsModal from './AdminRewardDetailsModal';
import { getSupabase } from '../../api/supabase/client';
import { config } from '../../core/config';
import { useAppContext } from '../../constants';

// UI Components
import Card from '../ui/base/Card';
import Button from '../ui/base/Button';
import Modal from '../ui/base/Modal';
import Tabs from '../ui/navigation/Tabs';
import TableResponsiveWrapper from '../ui/patterns/TableResponsiveWrapper';

interface ManageQueuesProps {
  usableItemQueue: UsableItemQueueEntry[];
  onProcessItemQueue: (queueId: string) => Promise<void>;
  processedItemQueueHistory: ProcessedUsableItemQueueEntry[];
  artistOfTheDayQueue: ArtistOfTheDayQueueEntry[]; // Deprecated but kept for signature compat
  onProcessSpotlightQueue: (queueId: string) => Promise<void>; // Deprecated
  processedArtistOfTheDayQueue: ProcessedArtistOfTheDayQueueEntry[];
  initialSubTab?: QueueSubTab;
  allUsers: User[];
  onConvertItemToMission: (queueId: string) => Promise<void>;
  onCreateMissionFromQueue: (queueId: string, mission: Mission) => Promise<void>;
}

type QueueSubTab = 'items' | 'production';
type StatusQuickFilter = 'all' | 'queued' | 'in_progress' | 'overdue';

const ManageQueues: React.FC<ManageQueuesProps> = ({
  usableItemQueue: propUsableItemQueue,
  onProcessItemQueue,
  processedItemQueueHistory: propProcessedItemQueueHistory,
  initialSubTab,
  allUsers,
  onConvertItemToMission,
  onCreateMissionFromQueue
}) => {
  const { dispatch } = useAppContext();
  const lastRef = useRef<string>('');
  const [activeSubTab, setActiveSubTab] = useState<QueueSubTab>('items');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isSupabase = config.backendProvider === 'supabase';

  const [productionQueue, setProductionQueue] = useState<any[]>([]);
  const [productionHistory, setProductionHistory] = useState<any[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);
  const [productionStatusFilter, setProductionStatusFilter] = useState<StatusQuickFilter>('all');
  const [usableQueue, setUsableQueue] = useState<any[]>([]);
  const [usableHistory, setUsableHistory] = useState<any[]>([]);
  const [usableLoading, setUsableLoading] = useState(false);
  const [usableError, setUsableError] = useState<string | null>(null);
  const [usableStatusFilter, setUsableStatusFilter] = useState<StatusQuickFilter>('all');
  const usableDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const statusLabelPt = (status: string) => {
    switch (status) {
      case 'queued':
        return 'Na fila';
      case 'in_progress':
        return 'Em produção';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-[#1A1F2A] text-[#FFD369] border-[#2B3342]';
      case 'in_progress':
        return 'bg-[#1A1F2A] text-[#8BD3FF] border-[#2B3342]';
      case 'delivered':
        return 'bg-[#102018] text-[#6CFFB3] border-[#1F3A2C]';
      case 'cancelled':
        return 'bg-[#201018] text-[#FF8B8B] border-[#3A1F2C]';
      default:
        return 'bg-[#101216] text-gray-200 border-[#2B3342]';
    }
  };

  // SLA / Atrasos (client-only)
  const tryParseDate = (v: any): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === 'number') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v === 'string') {
      // ✅ Aceita ISO e também YYYY-MM-DD (date-only)
      // IMPORTANT: new Date('YYYY-MM-DD') é UTC -> pode mostrar "dia anterior" no Brasil.
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const da = Number(m[3]);
        // Usa 12:00 local para evitar qualquer shift por timezone/DST
        const dLocal = new Date(y, mo - 1, da, 12, 0, 0);
        return isNaN(dLocal.getTime()) ? null : dLocal;
      }

      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const getDeadline = (req: any): Date | null => {
    // tenta chaves comuns em briefing/result (jsonb)
    const candidates = [
      req?.briefing?.deadline,
      req?.briefing?.deadline_date,
      req?.briefing?.due_date,
      req?.briefing?.estimated_completion_date,
      req?.briefing?.estimatedCompletionDate,
      req?.result?.deadline,
      req?.result?.deadline_date,
      req?.result?.due_date,
      req?.result?.estimated_completion_date,
      req?.result?.estimatedCompletionDate,
    ];
    for (const c of candidates) {
      const d = tryParseDate(c);
      if (d) return d;
    }
    return null;
  };

  const isOverdue = (req: any): boolean => {
    const status = req?.status;
    if (status !== 'queued' && status !== 'in_progress') return false;

    const now = Date.now();
    const deadline = getDeadline(req);
    if (deadline) return deadline.getTime() < now;

    // Fallback determinístico por idade (SLA interno)
    const createdAt = tryParseDate(req?.created_at)?.getTime() ?? null;
    if (!createdAt) return false;

    const ageMs = now - createdAt;
    const QUEUED_OVERDUE_MS = 24 * 60 * 60 * 1000; // 24h
    const INPROGRESS_OVERDUE_MS = 72 * 60 * 60 * 1000; // 72h

    if (status === 'queued') return ageMs > QUEUED_OVERDUE_MS;
    return ageMs > INPROGRESS_OVERDUE_MS;
  };

  const hasExplicitSla = (req: any): boolean => Boolean(getDeadline(req));

  const slaBadge = (req: any) => {
    const overdue = isOverdue(req);
    const hasSla = hasExplicitSla(req);
    if (overdue) {
      return (
        <span
          className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-[#201018] text-[#FF8B8B] border-[#3A1F2C]"
          title={hasSla ? 'Prazo expirado (deadline)' : 'Atraso (SLA interno por idade)'}
        >
          Atrasado
        </span>
      );
    }
    if (!hasSla && (req?.status === 'queued' || req?.status === 'in_progress')) {
      return (
        <span
          className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-[#101216] text-white/55 border-[#2A2D33]"
          title="Sem prazo definido (SLA)"
        >
          Sem SLA
        </span>
      );
    }
    return null;
  };
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverReq, setDeliverReq] = useState<any | null>(null);
  const [deliverUrl, setDeliverUrl] = useState('');

  // ✅ Filtros inteligentes — Histórico de Conclusão (Utilizáveis)
  const [usablePeriod, setUsablePeriod] = useState<'all' | '7d' | '30d'>('all');
  const [usableStatus, setUsableStatus] = useState<string>('all');
  const [usableCategory, setUsableCategory] = useState<string>('all');
  const [usableUser, setUsableUser] = useState<string>('all');
  const [usableItem, setUsableItem] = useState<string>('all');

  // ✅ Filtros inteligentes — Histórico de Conclusão (Produção)
  const [prodPeriod, setProdPeriod] = useState<'all' | '7d' | '30d'>('all');
  const [prodStatus, setProdStatus] = useState<string>('all');
  const [prodCategory, setProdCategory] = useState<string>('all');
  const [prodUser, setProdUser] = useState<string>('all');
  const [prodItem, setProdItem] = useState<string>('all');

  const getHistoryDate = (req: any): Date | null => {
    const raw = req?.result?.delivered_at || req?.updated_at || req?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const buildOptionSets = (rows: any[]) => {
    const statuses = new Set<string>();
    const categories = new Set<string>();
    const users = new Set<string>();
    const items = new Set<string>();
    (rows || []).forEach((r: any) => {
      if (r?.status) statuses.add(String(r.status));
      const cat = r?.category || (r?.briefing ? 'usable' : 'visual_reward');
      if (cat) categories.add(String(cat));
      const userLabel =
        r?.profiles?.artistic_name ||
        r?.profiles?.display_name ||
        r?.profiles?.name ||
        r?.user_id?.slice(0, 8) ||
        '';
      if (userLabel) users.add(String(userLabel));
      const itemLabel = r?.store_items?.name || r?.store_item_id?.slice(0, 8) || '';
      if (itemLabel) items.add(String(itemLabel));
    });
    const sortAlpha = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
    return {
      statuses: Array.from(statuses).sort(sortAlpha),
      categories: Array.from(categories).sort(sortAlpha),
      users: Array.from(users).sort(sortAlpha),
      items: Array.from(items).sort(sortAlpha),
    };
  };

  const usableOptionSets = useMemo(() => buildOptionSets(usableHistory), [usableHistory]);
  const prodOptionSets = useMemo(() => buildOptionSets(productionHistory), [productionHistory]);

  const filterRows = (
    rows: any[],
    period: 'all' | '7d' | '30d',
    status: string,
    category: string,
    user: string,
    item: string
  ) => {
    const now = new Date();
    const cutoff =
      period === '7d'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : period === '30d'
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : null;

    return (rows || []).filter((r: any) => {
      if (cutoff) {
        const d = getHistoryDate(r);
        if (!d || d < cutoff) return false;
      }
      if (status !== 'all' && String(r?.status) !== status) return false;
      const cat = String(r?.category || (r?.briefing ? 'usable' : 'visual_reward'));
      if (category !== 'all' && cat !== category) return false;
      const userLabel =
        r?.profiles?.artistic_name ||
        r?.profiles?.display_name ||
        r?.profiles?.name ||
        r?.user_id?.slice(0, 8) ||
        '';
      if (user !== 'all' && String(userLabel) !== user) return false;
      const itemLabel = r?.store_items?.name || r?.store_item_id?.slice(0, 8) || '';
      if (item !== 'all' && String(itemLabel) !== item) return false;
      return true;
    });
  };

  const filteredUsableHistory = useMemo(
    () => filterRows(usableHistory, usablePeriod, usableStatus, usableCategory, usableUser, usableItem),
    [usableHistory, usablePeriod, usableStatus, usableCategory, usableUser, usableItem]
  );

  const filteredProductionHistory = useMemo(
    () => filterRows(productionHistory, prodPeriod, prodStatus, prodCategory, prodUser, prodItem),
    [productionHistory, prodPeriod, prodStatus, prodCategory, prodUser, prodItem]
  );
  const [deliverNotes, setDeliverNotes] = useState('');
  const [deliverSaving, setDeliverSaving] = useState(false);
  const [usableDoneOpen, setUsableDoneOpen] = useState(false);
  const [usableDoneReq, setUsableDoneReq] = useState<any | null>(null);
  const [usableDoneNotes, setUsableDoneNotes] = useState('');
  const [usableDoneSaving, setUsableDoneSaving] = useState(false);
  const productionDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  
  // Defensively initialize queues to prevent undefined map errors
  const usableItemQueue = propUsableItemQueue || [];
  const processedItemQueueHistory = propProcessedItemQueueHistory || [];

  const [viewingDetails, setViewingDetails] = useState<RedeemedItem | null>(null);
  
  // Mission Modal State
  const [itemToConvert, setItemToConvert] = useState<UsableItemQueueEntry | null>(null);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [missionForModal, setMissionForModal] = useState<Mission | null>(null);

  useEffect(() => {
    if (initialSubTab === 'items') {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);


  useEffect(() => {
    if (lastRef.current === activeSubTab) return;
    lastRef.current = activeSubTab;
    dispatch({ type: 'SET_ADMIN_TAB', payload: { tab: 'queues', subTab: activeSubTab } });
  }, [activeSubTab, dispatch]);

  const loadProductionQueue = async () => {
    if (!isSupabase) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setProdError(null);
      setProdLoading(true);

      const { data, error } = await supabase
        .from('production_requests')
        .select(`
          id,
          user_id,
          inventory_id,
          store_item_id,
          category,
          status,
          created_at,
          profiles:profiles(id,name,display_name,artistic_name,avatar_url),
          store_items:store_items(id,name,rarity,image_url)
        `)
        .eq('category', 'visual_reward')
        .in('status', ['queued', 'in_progress', 'delivered'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      const all = data || [];
      setProductionQueue(all.filter((r: any) => r.status !== 'delivered' && r.status !== 'cancelled'));
      setProductionHistory(all.filter((r: any) => r.status === 'delivered'));
    } catch (e: any) {
      setProdError(e?.message || 'Falha ao carregar fila de produção');
    } finally {
      setProdLoading(false);
    }
  };

  const loadUsableQueue = async () => {
    if (!isSupabase) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setUsableError(null);
      setUsableLoading(true);

      const { data, error } = await supabase
        .from('production_requests')
        .select(`
          id,
          user_id,
          inventory_id,
          store_item_id,
          category,
          status,
          created_at,
          updated_at,
          profiles:profiles(id,name,display_name,artistic_name,avatar_url),
          store_items:store_items(id,name,rarity,image_url)
        `)
        .eq('category', 'usable')
        .in('status', ['queued', 'in_progress', 'delivered'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      const all = data || [];
      setUsableQueue(all.filter((r: any) => r.status !== 'delivered' && r.status !== 'cancelled'));
      setUsableHistory(all.filter((r: any) => r.status === 'delivered'));
    } catch (e: any) {
      setUsableError(e?.message || 'Falha ao carregar fila de itens utilizáveis');
    } finally {
      setUsableLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabase) return;

    if (activeSubTab === 'items') {
      loadUsableQueue();
    }
    if (activeSubTab === 'production') {
      loadProductionQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, isSupabase]);

  // Reset filtros ao trocar de sub-aba (melhora UX e evita “filtro preso”)
  useEffect(() => {
    if (activeSubTab === 'items') setUsableStatusFilter('all');
    if (activeSubTab === 'production') setProductionStatusFilter('all');
  }, [activeSubTab]);

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
      active
        ? 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan'
        : 'bg-[#101216] border-[#2A2D33] text-[#B3B3B3] hover:text-white hover:border-white/20'
    }`;

  const SummaryCard = ({
    label,
    value,
    active,
    onClick,
  }: {
    label: string;
    value: number;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-all
        ${
          active
            ? 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan'
            : 'bg-[#0E1014] border-[#22252B] text-white/70 hover:border-white/20'
        }`}
    >
      <span className="text-xs uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </button>
  );

  const usableCounts = useMemo(() => {
    const queued = usableQueue.filter((r: any) => r.status === 'queued').length;
    const inProgress = usableQueue.filter((r: any) => r.status === 'in_progress').length;
    const overdue = usableQueue.filter((r: any) => isOverdue(r)).length;
    return { total: usableQueue.length, queued, inProgress, overdue };
  }, [usableQueue, isOverdue]);

  const filteredUsableQueue = useMemo(() => {
    if (usableStatusFilter === 'all') return usableQueue;
    if (usableStatusFilter === 'overdue') return usableQueue.filter((r: any) => isOverdue(r));
    return usableQueue.filter((r: any) => r.status === usableStatusFilter);
  }, [usableQueue, usableStatusFilter, isOverdue]);

  const productionCounts = useMemo(() => {
    const queued = productionQueue.filter((r: any) => r.status === 'queued').length;
    const inProgress = productionQueue.filter((r: any) => r.status === 'in_progress').length;
    const overdue = productionQueue.filter((r: any) => isOverdue(r)).length;
    return { total: productionQueue.length, queued, inProgress, overdue };
  }, [productionQueue, isOverdue]);

  const filteredProductionQueue = useMemo(() => {
    if (productionStatusFilter === 'all') return productionQueue;
    if (productionStatusFilter === 'overdue') return productionQueue.filter((r: any) => isOverdue(r));
    return productionQueue.filter((r: any) => r.status === productionStatusFilter);
  }, [productionQueue, productionStatusFilter, isOverdue]);

  const handleProcessItem = async (queueId: string) => {
    setProcessingId(queueId);
    await onProcessItemQueue(queueId);
    setProcessingId(null);
  };

  const handleCopyBriefing = (briefing: any) => {
    try {
      const text = JSON.stringify(briefing, null, 2);
      navigator.clipboard.writeText(text);
      toast.success('Briefing copiado');
    } catch {
      toast.error('Erro ao copiar briefing');
    }
  };

  const updateProductionRequest = async (id: string, patch: any) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('production_requests')
      .update(patch)
      .eq('id', id);

    if (error) throw error;
  };

  const notifyUser = async (userId: string, title: string, body: string, meta: any = {}) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        read: false,
        type: 'info',
        action_url: '/inventory',
        meta
      });

    if (error) throw error;
  };

  const handleStart = async (req: any) => {
    try {
      await updateProductionRequest(req.id, { status: 'in_progress' });
      await notifyUser(req.user_id, 'Produção iniciada', 'Seu pedido entrou em produção.', { request_id: req.id });
      if (req.category === 'usable') {
        await loadUsableQueue();
      } else {
        await loadProductionQueue();
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Falha ao iniciar produção');
    }
  };

  const handleUsableDoneOpen = (req: any) => {
    setUsableDoneReq(req);
    setUsableDoneNotes(req?.result?.notes ?? '');
    setUsableDoneOpen(true);
  };

  const closeUsableDoneModal = () => {
    if (usableDoneSaving) return;
    setUsableDoneOpen(false);
    setUsableDoneReq(null);
    setUsableDoneNotes('');
  };

  const confirmUsableDone = async () => {
    if (!usableDoneReq) return;

    try {
      setUsableDoneSaving(true);

      const result = {
        ...(usableDoneReq.result || {}),
        notes: usableDoneNotes?.trim() || null,
        delivered_at: new Date().toISOString(),
      };

      await updateProductionRequest(usableDoneReq.id, { status: 'delivered', result });

      await notifyUser(
        usableDoneReq.user_id,
        'Item processado',
        'Seu item utilizável foi processado pela equipe.',
        { request_id: usableDoneReq.id }
      );

      closeUsableDoneModal();
      await loadUsableQueue();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Falha ao concluir item utilizável');
    } finally {
      setUsableDoneSaving(false);
    }
  };

  const handleDeliver = async (req: any) => {
    // abre modal (não muda status aqui)
    setDeliverReq(req);
    setDeliverUrl(req?.result?.delivery_url ?? '');
    setDeliverNotes(req?.result?.notes ?? '');
    setDeliverOpen(true);
  };

  const confirmDeliver = async () => {
    if (!deliverReq) return;

    const url = deliverUrl.trim();
    if (!url) {
      alert('Cole o link da entrega para continuar.');
      return;
    }

    try {
      setDeliverSaving(true);

      const result = {
        ...(deliverReq.result || {}),
        delivery_url: url,
        delivered_at: new Date().toISOString(),
        notes: deliverNotes?.trim() || null,
      };

      await updateProductionRequest(deliverReq.id, { status: 'delivered', result });

      await notifyUser(
        deliverReq.user_id,
        'Entrega disponível',
        'Seu pedido foi entregue. Clique para acessar.',
        { request_id: deliverReq.id, delivery_url: url }
      );

      setDeliverOpen(false);
      setDeliverReq(null);
      setDeliverUrl('');
      setDeliverNotes('');

      await loadProductionQueue();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Falha ao marcar como entregue');
    } finally {
      setDeliverSaving(false);
    }
  };

  const closeDeliverModal = () => {
    if (deliverSaving) return;
    setDeliverOpen(false);
    setDeliverReq(null);
    setDeliverUrl('');
    setDeliverNotes('');
  };

  const handleConvertClick = (item: UsableItemQueueEntry) => {
      setItemToConvert(item);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const preFilledMission: any = {
          title: `Apoie: ${item.userName}`,
          description: `Apoie nosso artista parceiro!\n\nCurta e comente no post linkado para fortalecer a comunidade e ganhar recompensas.`,
          actionUrl: item.postUrl,
          type: 'instagram',
          xp: 15,
          coins: 1,
          deadline: tomorrow.toISOString().split('T')[0],
          status: 'active'
      };
      
      setMissionForModal(preFilledMission);
      setIsMissionModalOpen(true);
  };

  const handleSaveConvertedMission = async (missionData: Mission) => {
      if (itemToConvert) {
          setIsMissionModalOpen(false);
          setProcessingId(itemToConvert.id);
          await onCreateMissionFromQueue(itemToConvert.id, missionData);
          setProcessingId(null);
          setItemToConvert(null);
          setMissionForModal(null);
      }
  };
  
  const handleCloseModal = () => {
      setIsMissionModalOpen(false);
      setItemToConvert(null);
      setMissionForModal(null);
  }

  return (
    <div>
      <Tabs 
        items={[
            { id: 'items', label: 'Itens Utilizáveis', count: isSupabase ? usableQueue.length : usableItemQueue.length },
            ...(isSupabase ? [{ id: 'production', label: 'Produção', count: productionQueue.length }] : []),
        ]}
        activeTab={activeSubTab}
        onChange={(id) => setActiveSubTab(id as any)}
        variant="solid"
        className="mb-6"
      />

      <div className="animate-fade-in-up space-y-8">
        {activeSubTab === 'items' && (
          <>
            {isSupabase ? (
              <>
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard
                    label="Total"
                    value={usableCounts.total}
                    active={usableStatusFilter === 'all'}
                    onClick={() => setUsableStatusFilter('all')}
                  />
                  <SummaryCard
                    label="Na fila"
                    value={usableCounts.queued}
                    active={usableStatusFilter === 'queued'}
                    onClick={() => setUsableStatusFilter('queued')}
                  />
                  <SummaryCard
                    label="Em produção"
                    value={usableCounts.inProgress}
                    active={usableStatusFilter === 'in_progress'}
                    onClick={() => setUsableStatusFilter('in_progress')}
                  />
                  <SummaryCard
                    label="Atrasados"
                    value={usableCounts.overdue}
                    active={usableStatusFilter === 'overdue'}
                    onClick={() => setUsableStatusFilter('overdue')}
                  />
                </div>
                <Card>
                  <Card.Header>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">Fila Ativa</h3>
                        <p className="text-xs text-white/50">
                          FIFO por data de criação • filtros por status • SLA client-only (deadline quando existir, senão idade)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className={pillClass(usableStatusFilter === 'all')}
                          onClick={() => setUsableStatusFilter('all')}
                          title="Mostrar todos"
                        >
                          Todos <span className="opacity-70">({usableCounts.total})</span>
                        </button>
                        <button
                          type="button"
                          className={pillClass(usableStatusFilter === 'queued')}
                          onClick={() => setUsableStatusFilter('queued')}
                          title="Somente na fila"
                        >
                          Na fila <span className="opacity-70">({usableCounts.queued})</span>
                        </button>
                        <button
                          type="button"
                          className={pillClass(usableStatusFilter === 'in_progress')}
                          onClick={() => setUsableStatusFilter('in_progress')}
                          title="Somente em produção"
                        >
                          Em produção <span className="opacity-70">({usableCounts.inProgress})</span>
                        </button>
                        <button
                          type="button"
                          className={pillClass(usableStatusFilter === 'overdue')}
                          onClick={() => setUsableStatusFilter('overdue')}
                          title="Somente atrasados"
                        >
                          Atrasados <span className="opacity-70">({usableCounts.overdue})</span>
                        </button>

                        <Button variant="secondary" size="sm" onClick={loadUsableQueue}>
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  </Card.Header>

                  <Card.Body noPadding>
                    {usableLoading && <div className="p-4 text-sm text-gray-300">Carregando...</div>}
                    {usableError && <div className="p-4 text-sm text-red-300">{usableError}</div>}

                    <TableResponsiveWrapper>
                      <table className="w-full text-sm text-left text-[#B3B3B3]">
                        <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                          <tr>
                            <th className="px-4 py-3">Criado</th>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Artista</th>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Link</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Briefing</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredUsableQueue.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-8 text-center text-gray-600 italic">
                                {usableQueue.length === 0
                                  ? 'Fila vazia.'
                                  : 'Nenhum item para este filtro.'}
                              </td>
                            </tr>
                          ) : (
                            filteredUsableQueue.map((req: any, idx: number) => {
                              const userLabel = req.profiles?.artistic_name || req.profiles?.display_name || req.profiles?.name || req.user_id?.slice(0, 8);
                              const itemLabel = req.store_items?.name || req.store_item_id?.slice(0, 8);
                              const kind = req.briefing?.kind || req.briefing?.usable_kind || '-';
                              const link = req.briefing?.link || '-';

                              return (
                                <tr key={req.id} className="border-b border-[#20242B] hover:bg-[#101216]">
                                  <td className="px-4 py-3">
                                    {req.created_at ? usableDateFormatter.format(new Date(req.created_at)) : '-'}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-gray-300">
                                    #{idx + 1}
                                  </td>
                                  <td className="px-4 py-3">{userLabel}</td>
                                  <td className="px-4 py-3">{itemLabel}</td>
                                  <td className="px-4 py-3">{kind}</td>
                                  <td className="px-4 py-3">
                                    {link === '-' ? (
                                      <span>-</span>
                                    ) : (
                                      <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#5DADE2] hover:underline truncate block max-w-xs"
                                      >
                                        Abrir link
                                      </a>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs border ${statusBadgeClass(req.status)}`}>
                                      {statusLabelPt(req.status)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyBriefing(req.briefing)}
                                      className="text-xs text-neon-cyan hover:underline"
                                    >
                                      Copiar briefing
                                    </button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleStart(req)}
                                        disabled={req.status !== 'queued'}
                                      >
                                        Iniciar
                                      </Button>

                                      <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleUsableDoneOpen(req)}
                                        disabled={req.status === 'delivered' || req.status === 'cancelled'}
                                      >
                                        Concluir
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </TableResponsiveWrapper>
                  </Card.Body>
                </Card>

                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-bold text-white">Histórico de Conclusão ({usableHistory.length})</h3>
                  </Card.Header>

                  <Card.Body noPadding>
                    {/* ✅ Filtros inteligentes (Utilizáveis) */}
                    <div className="px-4 pt-4 pb-2">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-[11px] uppercase text-white/40 mb-1">Período</label>
                          <select
                            value={usablePeriod}
                            onChange={(e) => setUsablePeriod(e.target.value as any)}
                            className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                          >
                            <option value="all">Tudo</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-white/40 mb-1">Status</label>
                          <select
                            value={usableStatus}
                            onChange={(e) => setUsableStatus(e.target.value)}
                            className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                          >
                            <option value="all">Todos</option>
                            {usableOptionSets.statuses.map((s) => (
                              <option key={s} value={s}>
                                {statusLabelPt(s as any) || s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-white/40 mb-1">Categoria</label>
                          <select
                            value={usableCategory}
                            onChange={(e) => setUsableCategory(e.target.value)}
                            className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                          >
                            <option value="all">Todas</option>
                            {usableOptionSets.categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-white/40 mb-1">Usuário</label>
                          <select
                            value={usableUser}
                            onChange={(e) => setUsableUser(e.target.value)}
                            className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                          >
                            <option value="all">Todos</option>
                            {usableOptionSets.users.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-white/40 mb-1">Item</label>
                          <select
                            value={usableItem}
                            onChange={(e) => setUsableItem(e.target.value)}
                            className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                          >
                            <option value="all">Todos</option>
                            {usableOptionSets.items.map((i) => (
                              <option key={i} value={i}>
                                {i}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                        <span>
                          Exibindo <span className="text-white/80 font-semibold">{filteredUsableHistory.length}</span> de{' '}
                          <span className="text-white/80 font-semibold">{usableHistory.length}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setUsablePeriod('all');
                            setUsableStatus('all');
                            setUsableCategory('all');
                            setUsableUser('all');
                            setUsableItem('all');
                          }}
                          className="text-neon-cyan hover:underline"
                        >
                          Limpar filtros
                        </button>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <TableResponsiveWrapper>
                        <table className="w-full text-sm text-left text-[#B3B3B3]">
                          <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33] sticky top-0">
                            <tr>
                              <th className="px-4 py-3">Concluído</th>
                              <th className="px-4 py-3">Usuário</th>
                              <th className="px-4 py-3">Item</th>
                              <th className="px-4 py-3">Tipo</th>
                              <th className="px-4 py-3">Link</th>
                              <th className="px-4 py-3">Notas</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredUsableHistory.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-600 italic">
                                  Nenhum histórico.
                                </td>
                              </tr>
                            ) : (
                              filteredUsableHistory.map((req: any) => {
                                const userLabel = req.profiles?.artistic_name || req.profiles?.display_name || req.profiles?.name || req.user_id?.slice(0, 8);
                                const itemLabel = req.store_items?.name || req.store_item_id?.slice(0, 8);
                                const kind = req.briefing?.kind || '-';
                                const link = req.briefing?.link || '-';
                                const notes = req.result?.notes || '-';
                                const deliveredAt = req.result?.delivered_at || req.updated_at || req.created_at;

                                return (
                                  <tr key={req.id} className="border-b border-[#20242B] hover:bg-[#101216]">
                                    <td className="px-4 py-3">
                                      {deliveredAt ? usableDateFormatter.format(new Date(deliveredAt)) : '-'}
                                    </td>
                                    <td className="px-4 py-3">{userLabel}</td>
                                    <td className="px-4 py-3">{itemLabel}</td>
                                    <td className="px-4 py-3">{kind}</td>
                                    <td className="px-4 py-3">
                                      {link === '-' ? (
                                        <span>-</span>
                                      ) : (
                                        <a
                                          href={link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#5DADE2] hover:underline truncate block max-w-xs"
                                        >
                                          Abrir link
                                        </a>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 truncate max-w-xs">{notes}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </TableResponsiveWrapper>
                    </div>
                  </Card.Body>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <Card.Header><h3 className="text-lg font-bold text-white">Fila Ativa ({usableItemQueue.length})</h3></Card.Header>
                  <Card.Body noPadding>
                    <TableResponsiveWrapper>
                        <table className="w-full text-sm text-left text-[#B3B3B3]">
                        <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                            <tr>
                            <th className="px-4 py-3 text-center">#</th>
                            <th className="px-6 py-3">Usuário</th>
                            <th className="px-6 py-3">Item</th>
                            <th className="px-6 py-3">Link</th>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2D33]">
                            {usableItemQueue.length > 0 ? (
                                usableItemQueue.map((item, index) => {
                                const user = allUsers.find(u => u.id === item.userId);
                                const isProcessing = processingId === item.id;
                                return (
                                    <tr key={item.id} className="hover:bg-[#23262B] transition-colors">
                                        <td className="px-4 py-3 text-center font-bold">{index + 1}</td>
                                        <td className="px-6 py-3">
                                            {user && (
                                            <div className="flex items-center">
                                                <AvatarWithFrame user={user} sizeClass="w-10 h-10" className="mr-3" />
                                                <div>
                                                    <div className="font-medium text-white">{item.userName}</div>
                                                    <div className="text-xs text-[#808080]">{item.userId.slice(0,8)}...</div>
                                                </div>
                                            </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 font-semibold text-[#FFD447]">{item.itemName}</td>
                                        <td className="px-6 py-3">
                                            <a href={item.postUrl} target="_blank" rel="noopener noreferrer" className="text-[#5DADE2] hover:underline truncate block max-w-xs">
                                                Link Externo
                                            </a>
                                        </td>
                                        <td className="px-6 py-3 text-xs">{new Date(item.queuedAt).toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    onClick={() => handleConvertClick(item)} 
                                                    disabled={isProcessing} 
                                                    className="text-[#F1C40F]"
                                                    title="Gerar Missão"
                                                >
                                                    {isProcessing ? '...' : <MissionIcon className="w-4 h-4" />}
                                                </Button>
                                                <Button 
                                                    variant="success" 
                                                    size="sm" 
                                                    onClick={() => handleProcessItem(item.id)} 
                                                    disabled={isProcessing}
                                                    title="Concluir"
                                                >
                                                    {isProcessing ? '...' : <CheckIcon className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr><td colSpan={6} className="text-center py-8 text-[#808080]">Fila vazia.</td></tr>
                            )}
                        </tbody>
                        </table>
                    </TableResponsiveWrapper>
                  </Card.Body>
                </Card>
                
                <Card>
                  <Card.Header><h3 className="text-lg font-bold text-white">Histórico de Conclusão</h3></Card.Header>
                  <Card.Body noPadding>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        <TableResponsiveWrapper>
                            <table className="w-full text-sm text-left text-[#B3B3B3]">
                            <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33] sticky top-0">
                                <tr>
                                <th className="px-6 py-3">Usuário</th>
                                <th className="px-6 py-3">Item</th>
                                <th className="px-6 py-3">Concluído em</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2A2D33]">
                                {processedItemQueueHistory.length > 0 ? (
                                    processedItemQueueHistory.map(item => {
                                    const user = allUsers.find(u => u.id === item.userId);
                                    return (
                                        <tr key={item.id} className="hover:bg-[#23262B]">
                                            <td className="px-6 py-3">
                                            {user && (
                                                <div className="flex items-center">
                                                    <AvatarWithFrame user={user} sizeClass="w-8 h-8" className="mr-3" />
                                                    <span className="font-medium text-white">{item.userName}</span>
                                                </div>
                                            )}
                                            </td>
                                            <td className="px-6 py-3 font-semibold">{item.itemName}</td>
                                            <td className="px-6 py-3 text-xs">{new Date(item.processedAt).toLocaleString('pt-BR')}</td>
                                        </tr>
                                    )})
                                ) : (
                                    <tr><td colSpan={3} className="text-center py-8 text-[#808080]">Nenhum histórico.</td></tr>
                                )}
                            </tbody>
                            </table>
                        </TableResponsiveWrapper>
                    </div>
                  </Card.Body>
                </Card>
              </>
            )}
          </>
        )}

        {activeSubTab === 'production' && (
          <div className="space-y-8">
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Total"
                value={productionCounts.total}
                active={productionStatusFilter === 'all'}
                onClick={() => setProductionStatusFilter('all')}
              />
              <SummaryCard
                label="Na fila"
                value={productionCounts.queued}
                active={productionStatusFilter === 'queued'}
                onClick={() => setProductionStatusFilter('queued')}
              />
              <SummaryCard
                label="Em produção"
                value={productionCounts.inProgress}
                active={productionStatusFilter === 'in_progress'}
                onClick={() => setProductionStatusFilter('in_progress')}
              />
              <SummaryCard
                label="Atrasados"
                value={productionCounts.overdue}
                active={productionStatusFilter === 'overdue'}
                onClick={() => setProductionStatusFilter('overdue')}
              />
            </div>
            <Card>
              <Card.Header>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Fila de Produção</h3>
                    <p className="text-xs text-white/50">
                      Visual rewards • FIFO • filtros por status • SLA client-only (deadline quando existir, senão idade)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={pillClass(productionStatusFilter === 'all')}
                      onClick={() => setProductionStatusFilter('all')}
                      title="Mostrar todos"
                    >
                      Todos <span className="opacity-70">({productionCounts.total})</span>
                    </button>
                    <button
                      type="button"
                      className={pillClass(productionStatusFilter === 'queued')}
                      onClick={() => setProductionStatusFilter('queued')}
                      title="Somente na fila"
                    >
                      Na fila <span className="opacity-70">({productionCounts.queued})</span>
                    </button>
                    <button
                      type="button"
                      className={pillClass(productionStatusFilter === 'in_progress')}
                      onClick={() => setProductionStatusFilter('in_progress')}
                      title="Somente em produção"
                    >
                      Em produção <span className="opacity-70">({productionCounts.inProgress})</span>
                    </button>
                    <button
                      type="button"
                      className={pillClass(productionStatusFilter === 'overdue')}
                      onClick={() => setProductionStatusFilter('overdue')}
                      title="Somente atrasados"
                    >
                      Atrasados <span className="opacity-70">({productionCounts.overdue})</span>
                    </button>

                    <Button variant="secondary" size="sm" onClick={loadProductionQueue}>
                      Atualizar
                    </Button>
                  </div>
                </div>
              </Card.Header>

              <Card.Body noPadding>
                {prodLoading && (
                  <div className="p-4 text-sm text-gray-300">Carregando...</div>
                )}

                {prodError && (
                  <div className="p-4 text-sm text-red-300">{prodError}</div>
                )}

                <TableResponsiveWrapper>
                  <table className="w-full text-sm text-left text-[#B3B3B3]">
                    <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                      <tr>
                        <th className="px-4 py-3">Criado</th>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Artista</th>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Prazo</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProductionQueue.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-600 italic">
                            {productionQueue.length === 0
                              ? 'Nenhum pedido na fila.'
                              : 'Nenhum pedido para este filtro.'}
                          </td>
                        </tr>
                      ) : (
                        filteredProductionQueue.map((req: any, idx: number) => {
                          const userLabel = req.profiles?.artistic_name || req.profiles?.display_name || req.profiles?.name || req.user_id?.slice(0, 8);
                          const itemLabel = req.store_items?.name || req.store_item_id?.slice(0, 8);
                          const deadline = getDeadline(req);

                          const detailsItem: RedeemedItem = {
                            id: req.inventory_id || req.id,
                            userId: req.user_id,
                            userName: userLabel,
                            itemId: req.store_item_id || '',
                            itemName: itemLabel,
                            itemPrice: 0,
                            redeemedAt: req.created_at ? productionDateFormatter.format(new Date(req.created_at)) : '-',
                            redeemedAtISO: req.created_at || new Date().toISOString(),
                            coinsBefore: 0,
                            coinsAfter: 0,
                            status: req.status === 'in_progress' ? 'InProgress' : 'Redeemed',
                            productionStartedAt: req.status === 'in_progress' ? (req.updated_at || req.created_at) : undefined,
                            estimatedCompletionDate: (req?.result?.estimated_completion_date || (deadline ? deadline.toISOString() : undefined)) as any,
                            completionUrl: (req?.result?.delivery_url || req?.result?.deliveryUrl) as any,
                            productionRequestId: req.id,
                            productionCategory: 'visual_reward',
                          };

                          return (
                            <tr key={req.id} className="border-b border-[#20242B] hover:bg-[#101216]">
                              <td className="px-4 py-3">
                                {req.created_at ? productionDateFormatter.format(new Date(req.created_at)) : '-'}
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-300">#{idx + 1}</td>
                              <td className="px-4 py-3">{userLabel}</td>
                              <td className="px-4 py-3">{itemLabel}</td>
                              <td className="px-4 py-3">
                                {deadline ? deadline.toLocaleDateString('pt-BR') : <span className="text-white/50">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs border ${statusBadgeClass(req.status)}`}>
                                  {statusLabelPt(req.status)}
                                </span>
                                {slaBadge(req)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setViewingDetails(detailsItem)}
                                  >
                                    Ver detalhes
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleStart(req)}
                                    disabled={req.status !== 'queued'}
                                  >
                                    Iniciar
                                  </Button>
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleDeliver(req)}
                                    disabled={req.status !== 'in_progress'}
                                  >
                                    Entregar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </TableResponsiveWrapper>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h3 className="text-lg font-bold text-white">Histórico de Conclusão (Produção) ({productionHistory.length})</h3>
              </Card.Header>

              <Card.Body noPadding>
                {/* ✅ Filtros inteligentes (Produção) */}
                <div className="px-4 pt-4 pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase text-white/40 mb-1">Período</label>
                      <select
                        value={prodPeriod}
                        onChange={(e) => setProdPeriod(e.target.value as any)}
                        className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                      >
                        <option value="all">Tudo</option>
                        <option value="7d">Últimos 7 dias</option>
                        <option value="30d">Últimos 30 dias</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase text-white/40 mb-1">Status</label>
                      <select
                        value={prodStatus}
                        onChange={(e) => setProdStatus(e.target.value)}
                        className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                      >
                        <option value="all">Todos</option>
                        {prodOptionSets.statuses.map((s) => (
                          <option key={s} value={s}>
                            {statusLabelPt(s as any) || s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase text-white/40 mb-1">Categoria</label>
                      <select
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                      >
                        <option value="all">Todas</option>
                        {prodOptionSets.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase text-white/40 mb-1">Usuário</label>
                      <select
                        value={prodUser}
                        onChange={(e) => setProdUser(e.target.value)}
                        className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                      >
                        <option value="all">Todos</option>
                        {prodOptionSets.users.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase text-white/40 mb-1">Item</label>
                      <select
                        value={prodItem}
                        onChange={(e) => setProdItem(e.target.value)}
                        className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                      >
                        <option value="all">Todos</option>
                        {prodOptionSets.items.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                    <span>
                      Exibindo <span className="text-white/80 font-semibold">{filteredProductionHistory.length}</span>{' '}
                      de <span className="text-white/80 font-semibold">{productionHistory.length}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setProdPeriod('all');
                        setProdStatus('all');
                        setProdCategory('all');
                        setProdUser('all');
                        setProdItem('all');
                      }}
                      className="text-neon-cyan hover:underline"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>

                <TableResponsiveWrapper>
                  <table className="w-full text-sm text-left text-[#B3B3B3]">
                    <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                      <tr>
                        <th className="px-4 py-3">Concluído</th>
                        <th className="px-4 py-3">Artista</th>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProductionHistory.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-600 italic">
                            Nenhum histórico.
                          </td>
                        </tr>
                      ) : (
                        filteredProductionHistory.map((req: any) => {
                          const userLabel = req.profiles?.artistic_name || req.profiles?.display_name || req.profiles?.name || req.user_id?.slice(0, 8);
                          const itemLabel = req.store_items?.name || req.store_item_id?.slice(0, 8);
                          const deliveredAt = req.result?.delivered_at || req.updated_at || req.created_at;

                          return (
                            <tr key={req.id} className="border-b border-[#20242B] hover:bg-[#101216]">
                              <td className="px-4 py-3">
                                {deliveredAt ? productionDateFormatter.format(new Date(deliveredAt)) : '-'}
                              </td>
                              <td className="px-4 py-3">{userLabel}</td>
                              <td className="px-4 py-3">{itemLabel}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs border ${statusBadgeClass(req.status || 'delivered')}`}>
                                  {statusLabelPt((req.status || 'delivered') as any)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </TableResponsiveWrapper>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
      
      {isMissionModalOpen && (
          <AdminMissionModal
              mission={missionForModal}
              onClose={handleCloseModal}
              onSave={handleSaveConvertedMission}
          />
      )}

      <Modal
        isOpen={usableDoneOpen}
        onClose={closeUsableDoneModal}
        title="Concluir item utilizável"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Observações (opcional)</label>
            <textarea
              value={usableDoneNotes}
              onChange={(e) => setUsableDoneNotes(e.target.value)}
              rows={4}
              placeholder="Notas internas ou mensagem curta para o artista..."
              className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeUsableDoneModal} disabled={usableDoneSaving}>
              Cancelar
            </Button>
            <Button variant="success" onClick={confirmUsableDone} disabled={usableDoneSaving}>
              {usableDoneSaving ? 'Concluindo...' : 'Confirmar conclusão'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deliverOpen}
        onClose={closeDeliverModal}
        title="Entregar produção"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Link da entrega</label>
            <input
              value={deliverUrl}
              onChange={(e) => setDeliverUrl(e.target.value)}
              placeholder="https://drive.google.com/... ou https://youtube.com/..."
              className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              Obrigatório. Use Drive/YouTube/Dropbox/WeTransfer ou link equivalente.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Observações (opcional)</label>
            <textarea
              value={deliverNotes}
              onChange={(e) => setDeliverNotes(e.target.value)}
              rows={4}
              placeholder="Notas para o artista (ex.: instruções, versão, detalhes da entrega)..."
              className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeDeliverModal} disabled={deliverSaving}>
              Cancelar
            </Button>
            <Button variant="success" onClick={confirmDeliver} disabled={deliverSaving}>
              {deliverSaving ? 'Entregando...' : 'Confirmar entrega'}
            </Button>
          </div>
        </div>
      </Modal>

      {viewingDetails && (
        <AdminRewardDetailsModal
          item={viewingDetails}
          onClose={() => setViewingDetails(null)}
        />
      )}

    </div>
  );
};

export default ManageQueues;
