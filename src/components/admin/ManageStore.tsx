
import React, { useState, useEffect, useMemo } from 'react';
import type { StoreItem, UsableItem, CoinPack, CoinPurchaseRequest, User, RedeemedItem, AdminStoreTab } from '../../types';
import AdminStoreItemModal from './AdminStoreItemModal';
import AdminUsableItemModal from './AdminUsableItemModal';
import AdminCoinPackModal from './AdminCoinPackModal';
import ConfirmationModal from './ConfirmationModal';
import ReviewCoinPurchases from './ReviewCoinPurchases';
import RedeemedItemsLog from './RedeemedItemsLog';
import StoreAuditCenter from './StoreAuditCenter';
import AdminRewardDetailsModal from './AdminRewardDetailsModal';
import { EditIcon, DeleteIcon, CoinIcon, DetailsIcon, InstagramIcon, TikTokIcon, YoutubeIcon, GlobeIcon } from '../../constants'; // Added icons
import * as storeAPI from '../../api/admin/store';
import { getSupabase } from '../../api/supabase/client';
import { config } from '../../core/config';

// UI Components
import Tabs from '../ui/navigation/Tabs';
import ManageQueues from './ManageQueues';
import Card from '../ui/base/Card';
import Button from '../ui/base/Button';
import Badge from '../ui/base/Badge';
import Section from '../ui/layout/Section';
import Toolbar from '../ui/advanced/Toolbar';
import MetricCard from '../ui/patterns/MetricCard';
import TableResponsiveWrapper from '../ui/patterns/TableResponsiveWrapper';

interface ManageStoreProps {
  storeItems: StoreItem[];
  onSaveStoreItem: (item: StoreItem) => void;
  onDeleteStoreItem: (itemId: string) => void;
  onToggleStoreItemStock: (itemId: string) => void;
  usableItems: UsableItem[];
  onSaveUsableItem: (item: UsableItem) => void;
  onDeleteUsableItem: (itemId: string) => void;
  onToggleUsableItemStock: (itemId: string) => void;
  coinPacks: CoinPack[];
  onSaveCoinPack: (pack: CoinPack) => void;
  onToggleCoinPackStock: (packId: string) => void;
  coinPurchaseRequests: CoinPurchaseRequest[];
  onReviewCoinPurchase: (requestId: string, status: 'approved' | 'rejected') => void;
  allUsers: User[];
  initialSubTab?: AdminStoreTab;
  onAdminSubmitPaymentLink: (requestId: string, paymentLink: string) => void;
  redeemedItems: RedeemedItem[];
  onRefund: (redeemedItemId: string) => Promise<void>;
  onComplete: (redeemedItemId: string, completionUrl?: string) => Promise<void>; // Updated signature
  onSetDeadline: (redeemedItemId: string, date: string) => Promise<void>;

  // ✅ Para embutir "Filas" dentro da Central de Operações (Loja) sem duplicar lógica
  usableItemQueue: any[];
  processedItemQueueHistory: any[];
  artistOfTheDayQueue: any[];
  processedArtistOfTheDayQueue: any[];
  onProcessItemQueue: (queueId: string) => Promise<void>;
  onProcessSpotlightQueue: (queueId: string) => Promise<void>;
  onConvertItemToMission: (queueId: string) => Promise<void>;
  onCreateMissionFromQueue: (queueId: string, mission: any) => Promise<void>;
}

// ... [ProductionMetrics component omitted for brevity, assume unchanged] ...
// Copied back in full to ensure file integrity
const ProductionMetrics: React.FC<{
  redeemedItems: RedeemedItem[];
  storeItems: StoreItem[];
  onViewDetails: (item: RedeemedItem) => void;
}> = ({ redeemedItems, storeItems, onViewDetails }) => {
  const visualRewardItemIds = useMemo(() => new Set(storeItems.map(item => item.id)), [storeItems]);
  const visualRewards = useMemo(() => redeemedItems.filter(item => visualRewardItemIds.has(item.itemId)), [redeemedItems, visualRewardItemIds]);

  const metrics = useMemo(() => {
    const completed = visualRewards.filter(r => r.status === 'Used');
    const inProgress = visualRewards.filter(r => r.status === 'InProgress');

    let totalProductionTimeMs = 0;
    let itemsWithProductionTime = 0;

    completed.forEach(item => {
      if (item.productionStartedAt && item.completedAt) {
        const startTime = new Date(item.productionStartedAt);
        const endTime = new Date(item.completedAt);
        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
          totalProductionTimeMs += (endTime.getTime() - startTime.getTime());
          itemsWithProductionTime++;
        }
      }
    });

    const avgTimeMs = itemsWithProductionTime > 0 ? totalProductionTimeMs / itemsWithProductionTime : 0;
    const avgDays = avgTimeMs / (1000 * 60 * 60 * 24);

    const deadlines = inProgress.map(item => item.estimatedCompletionDate).filter(Boolean) as string[];
    const now = new Date();
    const overdue = deadlines.filter(d => new Date(d) < now).length;
    
    return {
      totalCompleted: completed.length,
      currentlyInProgress: inProgress.length,
      averageProductionTimeDays: avgDays.toFixed(1),
      overdueItems: overdue,
    };
  }, [visualRewards]);

  const itemsInProgress = useMemo(() => visualRewards.filter(r => r.status === 'InProgress'), [visualRewards]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Concluído" value={metrics.totalCompleted} />
          <MetricCard title="Em Produção" value={metrics.currentlyInProgress} color="blue" />
          <MetricCard title="Tempo Médio (Dias)" value={metrics.averageProductionTimeDays} />
          <MetricCard title="Atrasados" value={metrics.overdueItems} color={metrics.overdueItems > 0 ? 'gold' : 'neutral'} />
      </div>
      
      <Card className="bg-slate-dark border-white/5">
          <Card.Header className="border-white/5"><h4 className="text-lg font-bold text-white">Fila de Produção Ativa</h4></Card.Header>
          <Card.Body noPadding>
            {itemsInProgress.length > 0 ? (
                <div className="divide-y divide-white/5">
                    {itemsInProgress.map(item => (
                         <div key={item.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="mb-2 sm:mb-0">
                                <p className="font-semibold text-white text-sm">{item.itemName}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-mono">
                                    <span>Cliente: {item.userName}</span>
                                    <span>•</span>
                                    <span>Início: {item.productionStartedAt ? new Date(item.productionStartedAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                                </div>
                                {item.estimatedCompletionDate && (
                                    <p className="text-xs text-red-400 font-bold mt-1">
                                        Prazo: {new Date(item.estimatedCompletionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </p>
                                )}
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => onViewDetails(item)} className="border-white/10 hover:border-neon-cyan/50 hover:text-neon-cyan">Ver Detalhes</Button>
                         </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-gray-500">A fila de produção está vazia.</div>
            )}
          </Card.Body>
      </Card>
    </div>
  );
};

const ManageStore: React.FC<ManageStoreProps> = ({ 
    storeItems: initialStoreItems, onSaveStoreItem, onDeleteStoreItem, onToggleStoreItemStock,
    usableItems: initialUsableItems, onSaveUsableItem, onDeleteUsableItem, onToggleUsableItemStock,
    coinPacks: initialCoinPacks, onSaveCoinPack, onToggleCoinPackStock, coinPurchaseRequests, onReviewCoinPurchase,
    allUsers, initialSubTab, onAdminSubmitPaymentLink, redeemedItems,
    onRefund, onComplete, onSetDeadline,
    usableItemQueue,
    processedItemQueueHistory,
    artistOfTheDayQueue,
    processedArtistOfTheDayQueue,
    onProcessItemQueue,
    onProcessSpotlightQueue,
    onConvertItemToMission,
    onCreateMissionFromQueue,
}) => {
  const [activeTab, setActiveTab] = useState<AdminStoreTab>(initialSubTab || 'visual');
  const isSupabase = config.backendProvider === 'supabase';

  type StoreOpsSection = 'catalog' | 'operations' | 'audit';

  const SECTION_BY_TAB: Record<AdminStoreTab, StoreOpsSection> = {
    visual: 'catalog',
    usable: 'catalog',
    coins: 'catalog',
    queues: 'operations',
    redemptions: 'operations',
    metrics: 'operations',
    review_purchases: 'audit',
    audit_logs: 'audit',
  };

  const DEFAULT_TAB_BY_SECTION: Record<StoreOpsSection, AdminStoreTab> = {
    catalog: 'visual',
    operations: 'queues',
    audit: 'review_purchases',
  };

  const [lastTabBySection, setLastTabBySection] = useState<Record<StoreOpsSection, AdminStoreTab>>({
    catalog: initialSubTab && SECTION_BY_TAB[initialSubTab] === 'catalog' ? initialSubTab : 'visual',
    operations: initialSubTab && SECTION_BY_TAB[initialSubTab] === 'operations' ? initialSubTab : 'queues',
    audit: initialSubTab && SECTION_BY_TAB[initialSubTab] === 'audit' ? initialSubTab : 'review_purchases',
  });

  const activeSection = SECTION_BY_TAB[activeTab];

  const setSection = (section: StoreOpsSection) => {
    const next = lastTabBySection[section] || DEFAULT_TAB_BY_SECTION[section];
    setActiveTab(next);
  };
  
  // Local state for immediate UI updates
  const [localStoreItems, setStoreItems] = useState<StoreItem[]>(initialStoreItems);
  const [localUsableItems, setUsableItems] = useState<UsableItem[]>(initialUsableItems);
  const [localCoinPacks, setCoinPacks] = useState<CoinPack[]>(initialCoinPacks);

  // Sync props to local state (if parent refreshes)
  useEffect(() => { setStoreItems(initialStoreItems); }, [initialStoreItems]);
  useEffect(() => { setUsableItems(initialUsableItems); }, [initialUsableItems]);
  useEffect(() => { setCoinPacks(initialCoinPacks); }, [initialCoinPacks]);

  const [isStoreItemModalOpen, setIsStoreItemModalOpen] = useState(false);
  const [editingStoreItem, setEditingStoreItem] = useState<StoreItem | null>(null);
  const [isUsableItemModalOpen, setIsUsableItemModalOpen] = useState(false);
  const [editingUsableItem, setEditingUsableItem] = useState<UsableItem | null>(null);
  const [isCoinPackModalOpen, setIsCoinPackModalOpen] = useState(false);
  const [editingCoinPack, setEditingCoinPack] = useState<CoinPack | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'visual' | 'usable' } | null>(null);
  const [viewingDetails, setViewingDetails] = useState<RedeemedItem | null>(null);

  const pendingCoinPurchases = coinPurchaseRequests.filter(req => 
      req.status === 'pending_approval' || 
      req.status === 'pending_link_generation' ||
      (req.status as any) === 'proof_submitted'
  ).length;

  const [opsRequests, setOpsRequests] = useState<any[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

  const tryParseDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const getDeadline = (req: any): Date | null => {
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
      const parsed = tryParseDate(c);
      if (parsed) return parsed;
    }
    return null;
  };

  const isOverdue = (req: any): boolean => {
    const status = req?.status;
    if (status !== 'queued' && status !== 'in_progress') return false;

    const deadline = getDeadline(req);
    if (deadline) return deadline.getTime() < Date.now();

    const createdAt = tryParseDate(req?.created_at)?.getTime() ?? null;
    if (!createdAt) return false;

    const ageMs = Date.now() - createdAt;
    const queuedOverdueMs = 24 * 60 * 60 * 1000;
    const inProgressOverdueMs = 72 * 60 * 60 * 1000;

    if (status === 'queued') return ageMs > queuedOverdueMs;
    return ageMs > inProgressOverdueMs;
  };

  const statusPt = (status: string) => {
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

  const loadOpsRequests = async () => {
    if (!isSupabase) return;
    const supabase = getSupabase();
    if (!supabase) {
      setOpsError('Supabase client not initialized');
      return;
    }

    try {
      setOpsError(null);
      setOpsLoading(true);

      const { data, error } = await supabase
        .from('production_requests')
        .select(`
          id,
          user_id,
          store_item_id,
          category,
          status,
          briefing,
          result,
          created_at,
          updated_at,
          profiles:profiles(id,name,display_name,artistic_name,avatar_url),
          store_items:store_items(id,name,rarity,image_url)
        `)
        .in('category', ['visual_reward', 'usable'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpsRequests(data || []);
    } catch (e: any) {
      setOpsError(e?.message || 'Falha ao carregar histórico operacional');
    } finally {
      setOpsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabase) return;
    if (activeTab === 'redemptions' || activeTab === 'metrics') {
      void loadOpsRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isSupabase]);

  type StoreItemWithPriceCoins = StoreItem & { price_coins: number };

  const normalizedStoreItems = useMemo<StoreItemWithPriceCoins[]>(
      () => localStoreItems.map(item => ({
          ...item,
          price_coins: Number((item as any).price ?? (item as any).price_coins ?? (item as any).priceCoins ?? 0),
      })),
      [localStoreItems]
  );

  const opsMetrics = useMemo(() => {
    if (!isSupabase) return null;

    const completed = opsRequests.filter((r: any) => r.status === 'delivered');
    const inProgress = opsRequests.filter((r: any) => r.status === 'in_progress');

    const durations: number[] = completed
      .map((r: any) => {
        const startedAt = tryParseDate(r?.created_at);
        const deliveredAt = tryParseDate(r?.result?.delivered_at || r?.updated_at);
        if (!startedAt || !deliveredAt) return null;
        return deliveredAt.getTime() - startedAt.getTime();
      })
      .filter((v: number | null): v is number => v !== null && v >= 0);

    const avgDays =
      durations.length === 0
        ? 0
        : durations.reduce((sum, v) => sum + v, 0) / durations.length / (1000 * 60 * 60 * 24);

    const overdueItems = opsRequests.filter((r: any) => isOverdue(r)).length;

    return {
      totalCompleted: completed.length,
      currentlyInProgress: inProgress.length,
      averageProductionTimeDays: avgDays.toFixed(1),
      overdueItems,
    };
  }, [isSupabase, opsRequests]);

  // Helper to prevent duplicates
  const normalizeList = <T extends { id: string }>(arr: T[]): T[] => {
      return arr.filter((v, i, self) => i === self.findIndex(x => x.id === v.id));
  };
  
  // Platform Icon Helper
  const PlatformIcon = ({ platform }: { platform?: string }) => {
      switch(platform) {
          case 'instagram': return <div className="text-pink-500" title="Instagram"><InstagramIcon className="w-4 h-4"/></div>;
          case 'tiktok': return <div className="text-white" title="TikTok"><TikTokIcon className="w-4 h-4"/></div>;
          case 'youtube': return <div className="text-red-500" title="YouTube"><YoutubeIcon className="w-4 h-4"/></div>;
          default: return <div className="text-gray-500" title="Todas"><GlobeIcon className="w-4 h-4"/></div>;
      }
  };

  // --- VISUAL ITEMS ---
  const handleSaveStoreItem = (item: StoreItem) => {
      storeAPI.createItem(item);
      
      onSaveStoreItem(item);
      
      setStoreItems(prev => {
          const exists = prev.some(i => i.id === item.id);
          if (exists) return prev.map(i => i.id === item.id ? item : i);
          return [...prev, item];
      });
      
      setIsStoreItemModalOpen(false);
      setEditingStoreItem(null);
  };

  const handleDeleteStoreItem = () => {
      if (itemToDelete && itemToDelete.type === 'visual') {
          storeAPI.deleteItem(itemToDelete.id);
          onDeleteStoreItem(itemToDelete.id);
          setStoreItems(prev => prev.filter(i => i.id !== itemToDelete.id));
          setShowConfirmModal(false);
          setItemToDelete(null);
      }
  };

  // --- USABLE ITEMS ---
  const handleSaveUsableItemWrapper = (item: UsableItem) => {
      storeAPI.createUsableItem(item); // Use storeAPI which delegates to AdminEngine correctly
      onSaveUsableItem(item);
      setUsableItems(prev => {
          const exists = prev.some(i => i.id === item.id);
          if (exists) return prev.map(i => i.id === item.id ? item : i);
          return [...prev, item];
      });

      setIsUsableItemModalOpen(false);
      setEditingUsableItem(null);
  };

  // --- COIN PACKS (FIX V3.2 UI PERSISTENCE) ---
  const handleDeletePackage = async (id: string) => {
      if (!window.confirm("Deseja realmente excluir este pacote?")) return;

      try {
          const result = await storeAPI.deleteCoinPack(id);
          if (result.success) {
              setCoinPacks(prev => [...prev.filter(p => p.id !== id)]);
          } else {
              alert("Erro ao excluir pacote.");
          }
      } catch (e) {
          console.error("Failed to delete package", e);
      }
  };

  const handleSaveCoinPackWrapper = async (pack: CoinPack) => {
      try {
          const result = await storeAPI.saveCoinPack(pack); 
          if (result.success && result.packages) {
              setCoinPacks(normalizeList(result.packages));
          }
          setIsCoinPackModalOpen(false);
          setEditingCoinPack(null);
      } catch (e) {
          console.error("Failed to save package", e);
          alert("Erro ao salvar pacote.");
      } finally {
          setIsCoinPackModalOpen(false);
          setEditingCoinPack(null);
      }
  };

  const handleOpenStoreItemModal = (item: StoreItem | null = null) => {
    setEditingStoreItem(item ? { ...item } : null);
    setIsStoreItemModalOpen(true);
  };
  const handleOpenUsableItemModal = (item: UsableItem | null = null) => {
    setEditingUsableItem(item ? { ...item } : null);
    setIsUsableItemModalOpen(true);
  };
   const handleOpenCoinPackModal = (pack: CoinPack | null = null) => {
    setEditingCoinPack(pack ? { ...pack } : null);
    setIsCoinPackModalOpen(true);
  };

  const requestDelete = (id: string, type: 'visual' | 'usable') => {
    setItemToDelete({ id, type });
    setShowConfirmModal(true);
  };

  const handleConfirmDeleteWrapper = () => {
    if (itemToDelete) {
      if (itemToDelete.type === 'visual') handleDeleteStoreItem();
      if (itemToDelete.type === 'usable') {
           storeAPI.deleteUsableItem(itemToDelete.id);
           onDeleteUsableItem(itemToDelete.id);
           setUsableItems(prev => prev.filter(i => i.id !== itemToDelete.id));
           setShowConfirmModal(false);
           setItemToDelete(null);
      }
    }
  };
  
  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white font-chakra">Central de Operações — Loja</h2>
            <p className="text-sm text-white/60">
              Catálogo, operação e auditoria — dados 100% do Supabase (sem mock).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSection('catalog')}
              className={
                'px-4 py-2 rounded-[14px] border text-sm font-semibold transition-all ' +
                (activeSection === 'catalog'
                  ? 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan'
                  : 'bg-navy-deep/60 border-white/10 text-white/70 hover:text-white hover:border-white/20')
              }
            >
              Catálogo
            </button>

            <button
              type="button"
              onClick={() => setSection('operations')}
              className={
                'px-4 py-2 rounded-[14px] border text-sm font-semibold transition-all flex items-center gap-2 ' +
                (activeSection === 'operations'
                  ? 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan'
                  : 'bg-navy-deep/60 border-white/10 text-white/70 hover:text-white hover:border-white/20')
              }
            >
              Operação
            </button>

            <button
              type="button"
              onClick={() => setSection('audit')}
              className={
                'px-4 py-2 rounded-[14px] border text-sm font-semibold transition-all flex items-center gap-2 ' +
                (activeSection === 'audit'
                  ? 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan'
                  : 'bg-navy-deep/60 border-white/10 text-white/70 hover:text-white hover:border-white/20')
              }
            >
              Auditoria
              {pendingCoinPurchases > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-gold/15 text-gold border border-gold/25">
                  {pendingCoinPurchases}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <Tabs
          variant="solid"
          activeTab={activeTab}
          onChange={(id) => {
            const nextTab = id as AdminStoreTab;
            setActiveTab(nextTab);
            setLastTabBySection(prev => ({ ...prev, [SECTION_BY_TAB[nextTab]]: nextTab }));
          }}
          items={
            activeSection === 'catalog'
              ? [
                  { id: 'visual', label: 'Visuais' },
                  { id: 'usable', label: 'Utilizáveis' },
                  { id: 'coins', label: 'Pacotes' },
                ]
              : activeSection === 'operations'
              ? [
                  { id: 'queues', label: 'Filas' },
                  { id: 'redemptions', label: 'Resgates & Entregas' },
                  { id: 'metrics', label: 'Métricas' },
                ]
              : [
                  { id: 'review_purchases', label: 'Vendas', count: pendingCoinPurchases },
                  { id: 'audit_logs', label: 'Auditoria (Loja)' },
                ]
          }
          className="mb-0"
        />
      </div>

      <div className="animate-fade-in-up">
        {activeTab === 'visual' && (
          <Card className="bg-slate-dark border-white/5 shadow-lg">
            <Card.Header className="border-white/5">
                <Toolbar 
                    start={<h3 className="text-xl font-bold text-white font-chakra">Recompensas Visuais</h3>}
                    end={
                         <Button onClick={() => handleOpenStoreItemModal()} leftIcon={<span>+</span>} className="bg-[#FFD74B] text-[#00E6FF] font-bold border border-[#FFECAA]/40 shadow-[0_0_15px_rgba(255,215,72,0.35)] hover:brightness-105 rounded-[14px] transition-all">Adicionar Item</Button>
                    }
                />
            </Card.Header>
             <Card.Body noPadding>
                <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-300">
                      <thead className="text-xs text-gray-500 uppercase bg-navy-deep/80 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4">Nome</th>
                          <th className="px-6 py-4">Preço</th>
                          <th className="px-6 py-4">Raridade</th>
                          <th className="px-6 py-4">Resgates</th>
                          <th className="px-6 py-4">Estoque</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-navy-deep">
                        {normalizedStoreItems.map(item => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                              <td className="px-6 py-4 text-gold-cinematic font-bold">{item.price_coins.toLocaleString('pt-BR')}</td>
                              <td className="px-6 py-4"><Badge label={item.rarity} tier={item.rarity === 'Lendário' ? 'gold' : item.rarity === 'Épico' ? 'neon' : 'silver'} /></td>
                              <td className="px-6 py-4 text-gray-400">{item.exchanges}</td>
                              <td className="px-6 py-4">
                                <button onClick={() => onToggleStoreItemStock(item.id)}>
                                    <Badge 
                                        label={item.isOutOfStock ? 'Esgotado' : 'Em Estoque'} 
                                        className={item.isOutOfStock ? 'bg-red-900/20 text-red-400 border-red-500/30' : 'bg-green-900/20 text-green-400 border-green-500/30'} 
                                    />
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-60 hover:opacity-100 transition-opacity">
                                   <Button variant="ghost" size="sm" onClick={() => handleOpenStoreItemModal(item)} className="text-gold-cinematic hover:bg-gold-cinematic/10"><EditIcon className="w-4 h-4" /></Button>
                                   <Button variant="ghost" size="sm" onClick={() => requestDelete(item.id, 'visual')} className="text-red-500 hover:bg-red-500/10"><DeleteIcon className="w-4 h-4" /></Button>
                                </div>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                </TableResponsiveWrapper>
              </Card.Body>
          </Card>
        )}

         {activeTab === 'usable' && (
          <Card className="bg-slate-dark border-white/5 shadow-lg">
            <Card.Header className="border-white/5">
                <Toolbar 
                    start={<h3 className="text-xl font-bold text-white font-chakra">Itens Utilizáveis</h3>}
                    end={
                         <Button onClick={() => handleOpenUsableItemModal()} leftIcon={<span>+</span>} className="bg-[#FFD74B] text-[#00E6FF] font-bold border border-[#FFECAA]/40 shadow-[0_0_15px_rgba(255,215,72,0.35)] hover:brightness-105 rounded-[14px] transition-all">Adicionar Item</Button>
                    }
                />
            </Card.Header>
             <Card.Body noPadding>
                <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-300">
                       <thead className="text-xs text-gray-500 uppercase bg-navy-deep/80 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4">Nome</th>
                          <th className="px-6 py-4">Plataforma</th>
                          <th className="px-6 py-4">Preço</th>
                          <th className="px-6 py-4">Estoque</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-navy-deep">
                        {localUsableItems.map(item => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                      <PlatformIcon platform={item.platform} />
                                      <span className="text-xs capitalize text-gray-400">{item.platform || 'Geral'}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-gold-cinematic font-bold">{item.price}</td>
                               <td className="px-6 py-4">
                                <button onClick={() => onToggleUsableItemStock(item.id)}>
                                    <Badge 
                                        label={item.isOutOfStock ? 'Esgotado' : 'Em Estoque'} 
                                        className={item.isOutOfStock ? 'bg-red-900/20 text-red-400 border-red-500/30' : 'bg-green-900/20 text-green-400 border-green-500/30'} 
                                    />
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-60 hover:opacity-100 transition-opacity">
                                   <Button variant="ghost" size="sm" onClick={() => handleOpenUsableItemModal(item)} className="text-gold-cinematic hover:bg-gold-cinematic/10"><EditIcon className="w-4 h-4" /></Button>
                                   <Button variant="ghost" size="sm" onClick={() => requestDelete(item.id, 'usable')} className="text-red-500 hover:bg-red-500/10"><DeleteIcon className="w-4 h-4" /></Button>
                                </div>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                </TableResponsiveWrapper>
              </Card.Body>
          </Card>
        )}

        {/* ... Rest of the component (coins, review_purchases, etc) ... */}
        {activeTab === 'coins' && (
           <Card className="bg-slate-dark border-white/5 shadow-lg">
            <Card.Header className="border-white/5">
                <Toolbar 
                    start={<h3 className="text-xl font-bold text-white font-chakra">Pacotes de Moedas</h3>}
                    end={
                         <Button onClick={() => handleOpenCoinPackModal()} leftIcon={<span>+</span>} className="bg-navy-deep border border-gold-cinematic/50 text-gold-cinematic hover:bg-gold-cinematic hover:text-black font-bold">Adicionar Pacote</Button>
                    }
                />
            </Card.Header>
             <Card.Body noPadding>
                <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-300">
                       <thead className="text-xs text-gray-500 uppercase bg-navy-deep/80 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4">Nome</th>
                          <th className="px-6 py-4">Moedas</th>
                          <th className="px-6 py-4">Preço (R$)</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-navy-deep">
                        {localCoinPacks.map(pack => (
                            <tr key={pack.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-white">{pack.name}</td>
                              <td className="px-6 py-4 text-gold-cinematic font-bold">{pack.coins}</td>
                              <td className="px-6 py-4 text-gray-300">{pack.price.toFixed(2)}</td>
                               <td className="px-6 py-4">
                                <button onClick={() => onToggleCoinPackStock(pack.id)}>
                                    <Badge 
                                        label={pack.isOutOfStock ? 'Inativo' : 'Ativo'} 
                                        className={pack.isOutOfStock ? 'bg-gray-700 text-gray-400' : 'bg-green-900/20 text-green-400 border-green-500/30'} 
                                    />
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-60 hover:opacity-100 transition-opacity">
                                   <Button variant="ghost" size="sm" onClick={() => handleOpenCoinPackModal(pack)} className="text-gold-cinematic hover:bg-gold-cinematic/10"><EditIcon className="w-4 h-4" /></Button>
                                   <button
                                      title="Excluir"
                                      onClick={() => handleDeletePackage(pack.id)}
                                      className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                                    >
                                      <DeleteIcon className="w-5 h-5" />
                                    </button>
                                </div>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                </TableResponsiveWrapper>
              </Card.Body>
          </Card>
        )}

        {activeTab === 'review_purchases' && <ReviewCoinPurchases requests={coinPurchaseRequests} onReview={onReviewCoinPurchase} allUsers={allUsers} onAdminSubmitPaymentLink={onAdminSubmitPaymentLink} />}
        {activeTab === 'queues' && (
          <ManageQueues
            usableItemQueue={usableItemQueue as any}
            processedItemQueueHistory={processedItemQueueHistory as any}
            artistOfTheDayQueue={artistOfTheDayQueue as any}
            processedArtistOfTheDayQueue={processedArtistOfTheDayQueue as any}
            onProcessItemQueue={onProcessItemQueue}
            onProcessSpotlightQueue={onProcessSpotlightQueue}
            onConvertItemToMission={onConvertItemToMission}
            onCreateMissionFromQueue={onCreateMissionFromQueue}
            initialSubTab={'items' as any}
          />
        )}
        {activeTab === 'redemptions' && (
          isSupabase ? (
            <Card className="bg-slate-dark border-white/5 shadow-lg">
              <Card.Header className="border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Histórico Operacional (Supabase)</h3>
                    <p className="text-xs text-white/50">Fonte: production_requests (visual_reward + usable)</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={loadOpsRequests}>
                    Atualizar
                  </Button>
                </div>
              </Card.Header>
              <Card.Body noPadding>
                {opsLoading && <div className="p-4 text-sm text-gray-300">Carregando...</div>}
                {opsError && <div className="p-4 text-sm text-red-300">{opsError}</div>}

                <TableResponsiveWrapper>
                  <table className="w-full text-sm text-left text-[#B3B3B3]">
                    <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Usuário</th>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opsRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-600 italic">
                            Sem registros.
                          </td>
                        </tr>
                      ) : (
                        opsRequests.map((r: any) => {
                          const userLabel =
                            r?.profiles?.artistic_name ||
                            r?.profiles?.display_name ||
                            r?.profiles?.name ||
                            r?.user_id?.slice(0, 8);
                          const itemLabel = r?.store_items?.name || r?.store_item_id?.slice(0, 8);
                          const deadline = getDeadline(r);
                          return (
                            <tr key={r.id} className="border-b border-[#20242B] hover:bg-[#101216]">
                              <td className="px-4 py-3">{r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                              <td className="px-4 py-3">{userLabel}</td>
                              <td className="px-4 py-3">{itemLabel}</td>
                              <td className="px-4 py-3">{r.category}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded-full text-xs border border-white/10 bg-white/5">
                                  {statusPt(r.status)}
                                </span>
                                {isOverdue(r) && (
                                  <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-[#201018] text-[#FF8B8B] border-[#3A1F2C]">
                                    Atrasado
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {deadline ? deadline.toLocaleDateString('pt-BR') : <span className="text-white/50">—</span>}
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
          ) : (
            <RedeemedItemsLog redeemedItems={redeemedItems} allUsers={allUsers} onRefund={onRefund} onComplete={onComplete} />
          )
        )}

        {activeTab === 'metrics' && (
          isSupabase ? (
            <Card className="bg-slate-dark border-white/5 shadow-lg">
              <Card.Header className="border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Métricas Operacionais (Supabase)</h3>
                    <p className="text-xs text-white/50">Fonte: production_requests • cálculo client-only</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={loadOpsRequests}>
                    Atualizar
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {opsLoading && <div className="text-sm text-gray-300">Carregando...</div>}
                {opsError && <div className="text-sm text-red-300">{opsError}</div>}

                {opsMetrics && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/50 uppercase">Total concluído</div>
                      <div className="text-2xl font-bold text-white">{opsMetrics.totalCompleted}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/50 uppercase">Em produção</div>
                      <div className="text-2xl font-bold text-white">{opsMetrics.currentlyInProgress}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/50 uppercase">Tempo médio (dias)</div>
                      <div className="text-2xl font-bold text-white">{opsMetrics.averageProductionTimeDays}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/50 uppercase">Atrasados</div>
                      <div className="text-2xl font-bold text-white">{opsMetrics.overdueItems}</div>
                    </div>
                  </div>
                )}

                {/* Fila ativa (operacional) */}
                <div className="mt-6 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div>
                      <h4 className="text-sm font-bold text-white">Fila Ativa (com briefing)</h4>
                      <p className="text-xs text-white/50">
                        Fonte: production_requests • mostrando queued + in_progress (FIFO por created_at)
                      </p>
                    </div>
                  </div>

                  <div className="px-0 py-0">
                    <TableResponsiveWrapper>
                      <table className="w-full text-sm text-left text-[#B3B3B3]">
                        <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                          <tr>
                            <th className="px-4 py-3">Criado</th>
                            <th className="px-4 py-3">Categoria</th>
                            <th className="px-4 py-3">Artista</th>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Link</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Briefing</th>
                          </tr>
                        </thead>

                        <tbody>
                          {(() => {
                            const active = opsRequests
                              .filter((r: any) => r.status === 'queued' || r.status === 'in_progress')
                              .sort((a: any, b: any) => {
                                const ta = new Date(a.created_at).getTime();
                                const tb = new Date(b.created_at).getTime();
                                return ta - tb; // FIFO
                              });

                            const labelCategory = (c: string) =>
                              c === 'visual_reward' ? 'Produção' : c === 'usable' ? 'Utilizável' : c;

                            const statusPtLocal = (s: string) =>
                              s === 'queued' ? 'Na fila' : s === 'in_progress' ? 'Em produção' : s === 'delivered' ? 'Entregue' : s;

                            const briefKind = (r: any) => r?.briefing?.kind || r?.briefing?.usable_kind || '-';
                            const briefLink = (r: any) => r?.briefing?.link || '-';

                            const briefPreview = (r: any) => {
                              try {
                                const txt = JSON.stringify(r?.briefing ?? {}, null, 0);
                                return txt.length > 140 ? txt.slice(0, 140) + '…' : txt;
                              } catch {
                                return '-';
                              }
                            };

                            if (active.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="px-4 py-8 text-center text-gray-600 italic">
                                    Nada na fila agora.
                                  </td>
                                </tr>
                              );
                            }

                            return active.map((r: any) => {
                              const userLabel =
                                r?.profiles?.artistic_name ||
                                r?.profiles?.display_name ||
                                r?.profiles?.name ||
                                r?.user_id?.slice(0, 8);

                              const itemLabel = r?.store_items?.name || r?.store_item_id?.slice(0, 8);
                              const link = briefLink(r);

                              return (
                                <tr key={r.id} className="border-b border-[#20242B] hover:bg-[#101216]">
                                  <td className="px-4 py-3">
                                    {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '-'}
                                  </td>
                                  <td className="px-4 py-3">{labelCategory(r.category)}</td>
                                  <td className="px-4 py-3">{userLabel}</td>
                                  <td className="px-4 py-3">{itemLabel}</td>
                                  <td className="px-4 py-3">{briefKind(r)}</td>
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
                                    <span className="px-2 py-1 rounded-full text-xs border border-white/10 bg-white/5">
                                      {statusPtLocal(r.status)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-white/60">
                                    {briefPreview(r)}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </TableResponsiveWrapper>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ) : (
            <ProductionMetrics redeemedItems={redeemedItems} storeItems={initialStoreItems} onViewDetails={setViewingDetails} />
          )
        )}

        {activeTab === 'audit_logs' && <StoreAuditCenter />}
      </div>

       {viewingDetails && (
          <AdminRewardDetailsModal 
            item={viewingDetails} 
            onClose={() => setViewingDetails(null)} 
            onSetDeadline={onSetDeadline} 
          />
      )}
      {isStoreItemModalOpen && <AdminStoreItemModal item={editingStoreItem} onClose={() => setIsStoreItemModalOpen(false)} onSave={handleSaveStoreItem} />}
      {isUsableItemModalOpen && <AdminUsableItemModal item={editingUsableItem} onClose={() => setIsUsableItemModalOpen(false)} onSave={handleSaveUsableItemWrapper} />}
      {isCoinPackModalOpen && <AdminCoinPackModal pack={editingCoinPack} onClose={() => setIsCoinPackModalOpen(false)} onSave={handleSaveCoinPackWrapper} />}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDeleteWrapper}
        title="Confirmar Exclusão"
        message={<><p>Tem certeza que deseja excluir este item permanentemente?</p><p className="mt-2 font-bold text-red-400">Esta ação não pode ser desfeita.</p></>}
      />
    </>
  );
};

export default ManageStore;
