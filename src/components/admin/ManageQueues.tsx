
import React, { useState, useEffect } from 'react';
import type { UsableItemQueueEntry, ProcessedUsableItemQueueEntry, ArtistOfTheDayQueueEntry, ProcessedArtistOfTheDayQueueEntry, User, Mission } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';
import { CheckIcon, PromoteIcon, MissionIcon } from '../../constants';
import AdminMissionModal from './AdminMissionModal';
import { getSupabase } from '../../api/supabase/client';
import { config } from '../../core/config';

// UI Components
import Card from '../ui/base/Card';
import Button from '../ui/base/Button';
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

const ManageQueues: React.FC<ManageQueuesProps> = ({
  usableItemQueue: propUsableItemQueue,
  onProcessItemQueue,
  processedItemQueueHistory: propProcessedItemQueueHistory,
  initialSubTab,
  allUsers,
  onConvertItemToMission,
  onCreateMissionFromQueue
}) => {
  const [activeSubTab, setActiveSubTab] = useState<QueueSubTab>('items');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isSupabase = config.backendProvider === 'supabase';

  const [productionQueue, setProductionQueue] = useState<any[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);
  
  // Defensively initialize queues to prevent undefined map errors
  const usableItemQueue = propUsableItemQueue || [];
  const processedItemQueueHistory = propProcessedItemQueueHistory || [];
  
  // Mission Modal State
  const [itemToConvert, setItemToConvert] = useState<UsableItemQueueEntry | null>(null);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [missionForModal, setMissionForModal] = useState<Mission | null>(null);

  useEffect(() => {
    if (initialSubTab === 'items') {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

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
          briefing,
          assets,
          result,
          admin_notes,
          created_at,
          updated_at,
          profiles:profiles(id,name,display_name,avatar_url),
          store_items:store_items(id,name,rarity,image_url)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProductionQueue(data || []);
    } catch (e: any) {
      setProdError(e?.message || 'Falha ao carregar fila de produção');
    } finally {
      setProdLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'production') {
      loadProductionQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, isSupabase]);

  const handleProcessItem = async (queueId: string) => {
    setProcessingId(queueId);
    await onProcessItemQueue(queueId);
    setProcessingId(null);
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
      await loadProductionQueue();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Falha ao iniciar produção');
    }
  };

  const handleNeedsInfo = async (req: any) => {
    try {
      const note = window.prompt('O que está faltando no briefing? (admin_notes)');
      await updateProductionRequest(req.id, { status: 'needs_info', admin_notes: note ?? null });
      await notifyUser(req.user_id, 'Precisamos de informações', 'Seu pedido precisa de mais informações. Abra e atualize o briefing.', { request_id: req.id });
      await loadProductionQueue();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Falha ao solicitar informações');
    }
  };

  const handleDeliver = async (req: any) => {
    try {
      const url = window.prompt('Cole o link da entrega (drive/youtube/etc):');
      if (!url) return;

      const result = {
        ...(req.result || {}),
        delivery_url: url,
        delivered_at: new Date().toISOString(),
      };

      await updateProductionRequest(req.id, { status: 'delivered', result });
      await notifyUser(req.user_id, 'Entrega disponível', 'Seu pedido foi entregue. Clique para acessar.', { request_id: req.id, delivery_url: url });
      await loadProductionQueue();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Falha ao marcar como entregue');
    }
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
            { id: 'items', label: 'Itens Utilizáveis', count: usableItemQueue.length },
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

        {activeSubTab === 'production' && (
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Fila de Produção</h3>
                <Button variant="secondary" size="sm" onClick={loadProductionQueue}>
                  Atualizar
                </Button>
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
                      <th className="px-4 py-3">Usuário</th>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {productionQueue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-600 italic">
                          Nenhum pedido na fila.
                        </td>
                      </tr>
                    ) : (
                      productionQueue.map((req: any) => {
                        const userLabel = req.profiles?.display_name || req.profiles?.name || req.user_id?.slice(0, 8);
                        const itemLabel = req.store_items?.name || req.store_item_id?.slice(0, 8);

                        return (
                          <tr key={req.id} className="border-b border-[#20242B] hover:bg-[#101216]">
                            <td className="px-4 py-3">
                              {req.created_at ? new Date(req.created_at).toLocaleString('pt-BR') : '-'}
                            </td>
                            <td className="px-4 py-3">{userLabel}</td>
                            <td className="px-4 py-3">{itemLabel}</td>
                            <td className="px-4 py-3">{req.status}</td>
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
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleNeedsInfo(req)}
                                  disabled={req.status === 'delivered' || req.status === 'cancelled'}
                                >
                                  Pedir info
                                </Button>

                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleDeliver(req)}
                                  disabled={req.status === 'delivered' || req.status === 'cancelled'}
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
        )}
      </div>
      
      {isMissionModalOpen && (
          <AdminMissionModal
              mission={missionForModal}
              onClose={handleCloseModal}
              onSave={handleSaveConvertedMission}
          />
      )}

    </div>
  );
};

export default ManageQueues;
