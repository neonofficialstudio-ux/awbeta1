
import React, { useState } from 'react';
import type { RedeemedItem, User, RedemptionStatus } from '../../types';
import AdminRewardDetailsModal from './AdminRewardDetailsModal';
import AvatarWithFrame from '../AvatarWithFrame';
import { DetailsIcon, CheckIcon, RefundIcon } from '../../constants';
import { ModalPortal } from '../ui/overlays/ModalPortal';

interface RedeemedItemsLogProps {
  redeemedItems: RedeemedItem[];
  allUsers: User[];
  onRefund: (redeemedItemId: string) => Promise<void>;
  onComplete: (redeemedItemId: string, completionUrl?: string) => Promise<void>;
}

// Modal for delivering the final file link
const DeliveryModal: React.FC<{
    item: RedeemedItem;
    onClose: () => void;
    onConfirm: (url: string) => void;
}> = ({ item, onClose, onConfirm }) => {
    const [url, setUrl] = useState('');

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div 
                    className="bg-[#121212] border border-green-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-pop-in" 
                    onClick={e => e.stopPropagation()}
                >
                    <h3 className="text-xl font-bold text-white mb-2">Entregar Pedido</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        Finalizando: <span className="text-green-400 font-bold">{item.itemName}</span>
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Link do Arquivo Final (Drive, Dropbox, etc)</label>
                            <input 
                                type="url" 
                                placeholder="https://..." 
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 focus:outline-none transition-colors"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Opcional, mas recomendado para entrega digital.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => onConfirm(url)}
                                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-green-500 shadow-lg shadow-green-900/20 transition-all"
                            >
                                Confirmar Entrega
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

const Pagination: React.FC<{
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}> = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const pagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + pagesToShow - 1);
    
    if (endPage - startPage + 1 < pagesToShow) {
        startPage = Math.max(1, endPage - pagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="flex justify-center items-center space-x-2 mt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50"
            >
                Anterior
            </button>
            {startPage > 1 && (
                <>
                    <button onClick={() => onPageChange(1)} className="px-3 py-1 bg-gray-700 rounded-md">1</button>
                    {startPage > 2 && <span className="text-gray-500">...</span>}
                </>
            )}
            {pageNumbers.map(number => (
                <button
                    key={number}
                    onClick={() => onPageChange(number)}
                    className={`px-3 py-1 rounded-md ${currentPage === number ? 'bg-goldenYellow-500 text-black' : 'bg-gray-700'}`}
                >
                    {number}
                </button>
            ))}
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
                    <button onClick={() => onPageChange(totalPages)} className="px-3 py-1 bg-gray-700 rounded-md">{totalPages}</button>
                </>
            )}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50"
            >
                Próximo
            </button>
        </div>
    );
};

const StatusBadge: React.FC<{ status: RedemptionStatus }> = ({ status }) => {
    const styles = {
        Redeemed: 'bg-green-500/20 text-green-400',
        InProgress: 'bg-blue-500/20 text-blue-300',
        Used: 'bg-purple-500/20 text-purple-300',
        Refunded: 'bg-gray-500/20 text-gray-400',
    };
    const text = {
        Redeemed: 'Resgatado',
        InProgress: 'Em Andamento',
        Used: 'Concluído',
        Refunded: 'Reembolsado',
    }
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>
}

const ActionButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; className?: string, disabled?: boolean }> = ({ onClick, title, children, className = '', disabled = false }) => (
    <button
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`p-2 rounded-md transition-colors disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent ${className}`}
    >
        {children}
    </button>
);


const RedeemedItemsLog: React.FC<RedeemedItemsLogProps> = ({ redeemedItems, allUsers, onRefund, onComplete }) => {
  const [viewingDetailsFor, setViewingDetailsFor] = useState<RedeemedItem | null>(null);
  const [itemToDeliver, setItemToDeliver] = useState<RedeemedItem | null>(null); // For delivery modal
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;


  const handleRefund = async (itemId: string) => {
      setProcessingId(itemId);
      await onRefund(itemId);
      setProcessingId(null);
  }

  const handleDeliveryConfirm = async (url: string) => {
      if (!itemToDeliver) return;
      
      const itemId = itemToDeliver.id;
      setItemToDeliver(null); // Close modal
      setProcessingId(itemId);
      
      await onComplete(itemId, url);
      
      setProcessingId(null);
  };

  const getUserDetails = (userId: string) => {
    return allUsers.find(u => u.id === userId);
  };
  
  const sortedItems = [...redeemedItems].sort((a, b) => new Date(b.redeemedAtISO).getTime() - new Date(a.redeemedAtISO).getTime());

  const paginatedItems = sortedItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


  return (
    <>
    <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
      <h3 className="text-xl font-bold mb-6">Histórico de Itens Resgatados</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
            <tr>
              <th scope="col" className="px-6 py-3">Usuário</th>
              <th scope="col" className="px-6 py-3">Item</th>
              <th scope="col" className="px-6 py-3">Moedas (Antes/Depois)</th>
              <th scope="col" className="px-6 py-3">Data</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length > 0 ? (
                paginatedItems.map(item => {
                  const user = getUserDetails(item.userId);
                  const isProcessing = processingId === item.id;
                  return (
                    <tr key={item.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                            {user && (
                                <div className="flex items-center">
                                    <AvatarWithFrame user={user} sizeClass="w-10 h-10" className="mr-3" />
                                    <div>
                                        <div className="font-medium text-white">{item.userName}</div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                        <div className="text-xs text-gray-500">{user.phone}</div>
                                    </div>
                                </div>
                            )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{item.itemName}</div>
                          <div className="text-xs text-red-400">Custo: {item.itemPrice.toLocaleString('pt-BR')} Coins</div>
                        </td>
                        <td className="px-6 py-4">
                           <div>{item.coinsBefore.toLocaleString('pt-BR')} → <span className="font-semibold text-goldenYellow-400">{item.coinsAfter.toLocaleString('pt-BR')}</span></div>
                        </td>
                        <td className="px-6 py-4">{item.redeemedAt}</td>
                        <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                        <td className="px-6 py-4">
                           <div className="flex items-center justify-center space-x-0 w-24">
                               {isProcessing ? (
                                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div>
                               ) : (
                                <>
                                    {item.formData && (
                                            <ActionButton onClick={() => setViewingDetailsFor(item)} title="Ver Detalhes" className="text-yellow-400 hover:bg-yellow-500/20">
                                                <DetailsIcon className="w-5 h-5" />
                                            </ActionButton>
                                    )}
                                    {item.status === 'InProgress' && item.formData && (
                                        <ActionButton onClick={() => setItemToDeliver(item)} title="Entregar e Concluir" className="text-green-400 hover:bg-green-500/20">
                                                <CheckIcon className="w-5 h-5" />
                                        </ActionButton>
                                    )}
                                    <ActionButton 
                                        onClick={() => handleRefund(item.id)}
                                        disabled={item.status === 'Refunded' || item.status === 'Used'}
                                        title="Reembolsar"
                                        className="text-blue-400 hover:bg-blue-500/20"
                                    >
                                        <RefundIcon className="w-5 h-5" />
                                    </ActionButton>
                                </>
                               )}
                           </div>
                        </td>
                    </tr>
                  )
                })
            ) : (
                <tr><td colSpan={6} className="text-center py-8">Nenhum item foi resgatado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination 
        totalItems={sortedItems.length}
        itemsPerPage={ITEMS_PER_PAGE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>

    {viewingDetailsFor && (
        <AdminRewardDetailsModal
            item={viewingDetailsFor}
            onClose={() => setViewingDetailsFor(null)}
        />
    )}

    {itemToDeliver && (
        <DeliveryModal 
            item={itemToDeliver}
            onClose={() => setItemToDeliver(null)}
            onConfirm={handleDeliveryConfirm}
        />
    )}
    </>
  );
};

export default RedeemedItemsLog;
