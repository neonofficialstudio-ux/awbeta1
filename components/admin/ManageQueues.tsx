
import React, { useState, useEffect } from 'react';
import type { UsableItemQueueEntry, ProcessedUsableItemQueueEntry, ArtistOfTheDayQueueEntry, ProcessedArtistOfTheDayQueueEntry, User, Mission } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';
import { CheckIcon, PromoteIcon, MissionIcon } from '../../constants';
import AdminMissionModal from './AdminMissionModal';

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

type QueueSubTab = 'items';

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

  const handleProcessItem = async (queueId: string) => {
    setProcessingId(queueId);
    await onProcessItemQueue(queueId);
    setProcessingId(null);
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
