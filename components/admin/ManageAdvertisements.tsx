
import React, { useState, useEffect } from 'react';
import type { Advertisement } from '../../types';
import AdminAdvertisementModal from './AdminAdvertisementModal';
import ConfirmationModal from './ConfirmationModal';
import { EditIcon, DeleteIcon, TrendingUpIcon, SearchIcon } from '../../constants';
import { AdsAnalytics } from '../../api/admin/ads.analytics'; // V2.1
import AdsProAnalytics from './ads/AdsProAnalytics'; // Phase 12.2
import AdDetailsModal from './ads/AdDetailsModal'; // Phase 12.2

interface ManageAdvertisementsProps {
  advertisements: Advertisement[];
  onSave: (ad: Advertisement) => void;
  onDelete: (adId: string) => void;
}

const ActionButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; className?: string }> = ({ onClick, title, children, className = '' }) => (
    <button
        onClick={onClick}
        title={title}
        className={`p-2 rounded-md transition-colors ${className}`}
    >
        {children}
    </button>
);

// V2.1 Premium Analytics Component (Legacy Mini Panel - Kept for safety, but augmented by new PRO panel below)
const AdsAnalyticsPanel: React.FC = () => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const data = AdsAnalytics.getGlobalStats();
        setStats(data);
    }, []);

    if (!stats) return null;

    return (
        <div className="bg-[#181818] p-6 rounded-xl border border-blue-500/30 mb-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-900/20 rounded-lg border border-blue-500/40">
                    <TrendingUpIcon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white font-chakra">Resumo Rápido (V2.1)</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                     <p className="text-xs text-gray-400 uppercase font-bold">Total Views</p>
                     <p className="text-2xl font-black text-white">{stats.totalViews}</p>
                 </div>
                 <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                     <p className="text-xs text-gray-400 uppercase font-bold">Total Cliques</p>
                     <p className="text-2xl font-black text-green-400">{stats.totalClicks}</p>
                 </div>
                 <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                     <p className="text-xs text-gray-400 uppercase font-bold">CTR Médio</p>
                     <p className="text-2xl font-black text-yellow-400">{stats.averageCTR.toFixed(2)}%</p>
                 </div>
                 <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                     <p className="text-xs text-gray-400 uppercase font-bold">Anúncios Ativos</p>
                     <p className="text-2xl font-black text-white">{stats.totalAds}</p>
                 </div>
            </div>
        </div>
    );
};

const ManageAdvertisements: React.FC<ManageAdvertisementsProps> = ({ advertisements, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [adToDelete, setAdToDelete] = useState<Advertisement | null>(null);
  
  // Phase 12.2 State
  const [proDetailsAd, setProDetailsAd] = useState<Advertisement | null>(null);

  const handleOpenModal = (ad: Advertisement | null = null) => {
    setEditingAd(ad);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingAd(null);
    setIsModalOpen(false);
  };

  const handleSaveAndClose = (ad: Advertisement) => {
    onSave(ad);
    handleCloseModal();
  };

  const requestDelete = (ad: Advertisement) => {
    setAdToDelete(ad);
  };

  const handleConfirmDelete = () => {
    if (adToDelete) {
      onDelete(adToDelete.id);
      setAdToDelete(null);
    }
  };

  return (
    <>
      <AdsAnalyticsPanel />

      <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Gerenciar Anúncios do Dashboard</h3>
          <button onClick={() => handleOpenModal()} className="bg-goldenYellow-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-goldenYellow-400 transition-colors">
            Adicionar Anúncio
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
              <tr>
                <th scope="col" className="px-6 py-3">Imagem</th>
                <th scope="col" className="px-6 py-3">Título</th>
                <th scope="col" className="px-6 py-3">Link</th>
                <th scope="col" className="px-6 py-3">Duração</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {advertisements.map(ad => (
                <tr key={ad.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <img src={ad.imageUrl} alt={ad.title} className="w-24 h-12 object-cover rounded-md" />
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{ad.title}</td>
                  <td className="px-6 py-4">
                    <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block max-w-xs">{ad.linkUrl}</a>
                  </td>
                  <td className="px-6 py-4">{ad.duration}s</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ad.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {ad.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-1">
                        {/* New Phase 12.2: PRO Details Button */}
                        <ActionButton onClick={() => setProDetailsAd(ad)} title="Detalhes PRO" className="text-blue-400 hover:bg-blue-500/20">
                            <SearchIcon className="w-5 h-5" />
                        </ActionButton>

                        <ActionButton onClick={() => handleOpenModal(ad)} title="Editar" className="text-goldenYellow-400 hover:bg-goldenYellow-500/20">
                            <EditIcon className="w-5 h-5" />
                        </ActionButton>
                        <ActionButton onClick={() => requestDelete(ad)} title="Remover" className="text-red-500 hover:bg-red-500/20">
                            <DeleteIcon className="w-5 h-5" />
                        </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase 12.2: PRO Analytics Panel */}
      <AdsProAnalytics />

      {/* Phase 12.2: PRO Details Modal */}
      {proDetailsAd && (
          <AdDetailsModal 
              ad={proDetailsAd} 
              onClose={() => setProDetailsAd(null)} 
          />
      )}

      {isModalOpen && (
        <AdminAdvertisementModal
          ad={editingAd}
          onClose={handleCloseModal}
          onSave={handleSaveAndClose}
        />
      )}

      <ConfirmationModal
        isOpen={!!adToDelete}
        onClose={() => setAdToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão de Anúncio"
        message={
          <>
            <p>Você tem certeza que deseja excluir o anúncio <span className="font-bold text-white">"{adToDelete?.title}"</span>?</p>
            <p className="mt-2 font-bold text-red-400">Esta ação não pode ser desfeita.</p>
          </>
        }
      />
    </>
  );
};

export default ManageAdvertisements;
