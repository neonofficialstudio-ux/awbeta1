
import React, { useState, useEffect, useMemo } from 'react';
import type { StoreItem, UsableItem, CoinPack, CoinPurchaseRequest, User, RedeemedItem, AdminStoreTab } from '../../types';
import AdminStoreItemModal from './AdminStoreItemModal';
import AdminUsableItemModal from './AdminUsableItemModal';
import AdminCoinPackModal from './AdminCoinPackModal';
import ConfirmationModal from './ConfirmationModal';
import ReviewCoinPurchases from './ReviewCoinPurchases';
import RedeemedItemsLog from './RedeemedItemsLog';
import AdminRewardDetailsModal from './AdminRewardDetailsModal';
import { EditIcon, DeleteIcon, CoinIcon, DetailsIcon, InstagramIcon, TikTokIcon, YoutubeIcon, GlobeIcon } from '../../constants'; // Added icons
import * as storeAPI from '../../api/admin/store';

// UI Components
import Tabs from '../ui/navigation/Tabs';
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
}) => {
  const [activeTab, setActiveTab] = useState<AdminStoreTab>(initialSubTab || 'visual');
  
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

  type StoreItemWithPriceCoins = StoreItem & { price_coins: number };

  const normalizedStoreItems = useMemo<StoreItemWithPriceCoins[]>(
      () => localStoreItems.map(item => ({
          ...item,
          price_coins: Number((item as any).price ?? (item as any).price_coins ?? (item as any).priceCoins ?? 0),
      })),
      [localStoreItems]
  );

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
      <Tabs 
        variant="solid"
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        items={[
            { id: 'visual', label: 'Visuais' },
            { id: 'usable', label: 'Utilizáveis' },
            { id: 'coins', label: 'Pacotes' },
            { id: 'review_purchases', label: 'Vendas', count: pendingCoinPurchases },
            { id: 'redemptions', label: 'Log' },
            { id: 'metrics', label: 'Métricas' },
        ]}
        className="mb-6"
      />

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
        {activeTab === 'redemptions' && <RedeemedItemsLog redeemedItems={redeemedItems} allUsers={allUsers} onRefund={onRefund} onComplete={onComplete} />}
        {activeTab === 'metrics' && <ProductionMetrics redeemedItems={redeemedItems} storeItems={initialStoreItems} onViewDetails={setViewingDetails} />}
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
